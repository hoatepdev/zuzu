import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentServer, createApiClient, runWorker } from '../src/index.js';
import { consoleTransport, createTransport, tcpTransport } from '../src/transports.js';

const okTransport = { health: async () => true, write: async () => {} };
const failingTransport = {
  health: async () => false,
  write: async () => {
    throw new Error('Không kết nối được máy in ZY908');
  }
};

async function withServer(transport, fn) {
  const server = createAgentServer(transport);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const post = (base, payload) =>
  fetch(`${base}/print`, { method: 'POST', body: JSON.stringify(payload) });

test('/health reports transport state without printing', async () => {
  await withServer(okTransport, async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, printer: 'connected' });
  });
  await withServer(failingTransport, async (base) => {
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: false, printer: 'disconnected' });
  });
});

test('/print prints a valid bill', async () => {
  let printed;
  const transport = { health: async () => true, write: async (data, preview) => { printed = { data, preview }; } };
  await withServer(transport, async (base) => {
    const res = await post(base, {
      code: 'ZU-0125',
      createdAt: '2026-10-02T07:45:00.000Z',
      customerName: 'Nguyễn Lan',
      phone: '0987654321',
      note: 'Ít thơm'
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.ok(printed.data.length > 0);
    assert.ok(printed.preview.includes('ZU-0125'));
    assert.ok(!printed.preview.includes('0987654321'), 'agent masks phone on the bill');
  });
});

test('/print rejects invalid payloads', async () => {
  await withServer(okTransport, async (base) => {
    assert.equal((await post(base, {})).status, 400);
    assert.equal((await post(base, { code: 'ZU-0001', createdAt: 'not-a-date' })).status, 400);
    assert.equal((await post(base, { code: 'ZU-0001', phone: 123 })).status, 400);
    const res = await fetch(`${base}/print`, { method: 'POST', body: 'not json' });
    assert.equal(res.status, 400);
  });
});

test('/print rejects oversized requests', async () => {
  await withServer(okTransport, async (base) => {
    const res = await post(base, { code: 'ZU-0001', note: 'x'.repeat(9000) });
    assert.equal(res.status, 413);
  });
});

test('/print returns 500 with message when the printer fails', async () => {
  await withServer(failingTransport, async (base) => {
    const res = await post(base, { code: 'ZU-0125' });
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { ok: false, message: 'Không kết nối được máy in ZY908' });
  });
});

test('prints one job at a time', async () => {
  const order = [];
  const transport = {
    health: async () => true,
    write: async () => {
      order.push('start');
      await new Promise((resolve) => setTimeout(resolve, 30));
      order.push('end');
    }
  };
  await withServer(transport, async (base) => {
    const [a, b] = await Promise.all([post(base, { code: 'ZU-0001' }), post(base, { code: 'ZU-0002' })]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.deepEqual(order, ['start', 'end', 'start', 'end']);
  });
});

test('console transport displays the receipt and reports success', async () => {
  const logs = [];
  const original = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    const transport = consoleTransport();
    assert.equal(await transport.health(), true);
    await transport.write(Buffer.from(''), 'GIẶT LÀ ZUZU\nZU-0125');
  } finally {
    console.log = original;
  }
  assert.ok(logs.join('\n').includes('ZU-0125'));
});

test('transports resolve from env; tcp health fails fast when unreachable', async () => {
  assert.equal(await createTransport({ PRINTER_CONNECTION: 'console' }).health(), true);
  assert.equal(await createTransport({ PRINTER_CONNECTION: 'tcp', PRINTER_HOST: '127.0.0.1', PRINTER_PORT: '1' }).health(), false);
  await assert.rejects(tcpTransport({ PRINTER_HOST: '127.0.0.1', PRINTER_PORT: '1' }).write(Buffer.from('x')), /Máy in đang ngoại tuyến|Máy in không phản hồi/);
});

test('usb transport reports disconnected when the device is absent', async () => {
  const transport = createTransport({ PRINTER_CONNECTION: 'usb', PRINTER_VENDOR_ID: '0xffff', PRINTER_PRODUCT_ID: '0xffff' });
  assert.equal(await transport.health(), false);
  await assert.rejects(transport.write(Buffer.from('x')), /Không kết nối được máy in ZY908|Cấu hình thiếu/);
});

test('API client sends bearer auth and claim token', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(url.endsWith('/next') ? JSON.stringify(null) : JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const api = createApiClient({ apiUrl: 'https://api.example.com/', token: 'secret', fetchImpl });
  await api.next();
  await api.success({ id: 'job-1', claimToken: 'claim-1' });
  assert.equal(calls[0].init.headers.authorization, 'Bearer secret');
  assert.equal(calls[0].url, 'https://api.example.com/print-jobs/next');
  assert.deepEqual(JSON.parse(calls[1].init.body), { claimToken: 'claim-1' });
});

test('worker prints and acknowledges a claimed job', async () => {
  const controller = new AbortController();
  let writes = 0;
  let successes = 0;
  const job = { id: 'job-1', orderId: 'order-1', claimToken: 'claim-1', payload: { code: 'ZU-1001' } };
  const api = {
    next: async () => job,
    success: async () => { successes += 1; controller.abort(); },
    failure: async () => assert.fail('must not report failure')
  };
  await runWorker({ transport: { write: async () => { writes += 1; } }, api, signal: controller.signal, sleepImpl: async () => {} });
  assert.equal(writes, 1);
  assert.equal(successes, 1);
});

test('worker reports printer failures without stopping permanently', async () => {
  const controller = new AbortController();
  let failure;
  const job = { id: 'job-2', orderId: 'order-2', claimToken: 'claim-2', payload: { code: 'ZU-1002' } };
  const api = {
    next: async () => job,
    success: async () => assert.fail('must not report success'),
    failure: async (_job, error) => { failure = error; controller.abort(); }
  };
  await runWorker({ transport: { write: async () => { throw new Error('Máy in đang ngoại tuyến'); } }, api, signal: controller.signal, sleepImpl: async () => {} });
  assert.equal(failure, 'Máy in đang ngoại tuyến');
});

test('worker retries a success acknowledgement without printing twice', async () => {
  const controller = new AbortController();
  let writes = 0;
  let acknowledgements = 0;
  const job = { id: 'job-3', orderId: 'order-3', claimToken: 'claim-3', payload: { code: 'ZU-1003' } };
  const api = {
    next: async () => job,
    failure: async () => assert.fail('must not report failure'),
    success: async () => {
      acknowledgements += 1;
      if (acknowledgements === 1) throw new Error('temporary outage');
      controller.abort();
    }
  };
  await runWorker({ transport: { write: async () => { writes += 1; } }, api, signal: controller.signal, sleepImpl: async () => {} });
  assert.equal(writes, 1);
  assert.equal(acknowledgements, 2);
});
