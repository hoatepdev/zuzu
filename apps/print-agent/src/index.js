import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { buildReceipt } from './escpos.js';
import { createTransport } from './transports.js';

const MAX_BODY_BYTES = 8192;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (fields) => console.log(JSON.stringify({ ts: new Date().toISOString(), ...fields }));

export function validate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 'Dữ liệu không hợp lệ';
  if (typeof payload.code !== 'string' || !payload.code.trim() || payload.code.length > 64) return 'Thiếu hoặc sai mã đơn';
  if (payload.createdAt !== undefined && Number.isNaN(new Date(payload.createdAt).getTime())) return 'Ngày nhận không hợp lệ';
  for (const [key, max] of [['customerName', 200], ['phone', 32], ['note', 500]]) {
    if (payload[key] !== undefined && (typeof payload[key] !== 'string' || payload[key].length > max)) return `${key} không hợp lệ`;
  }
  return null;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let rejected = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        if (!rejected) {
          rejected = true;
          reject(Object.assign(new Error('Yêu cầu quá lớn'), { statusCode: 413 }));
        }
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', (error) => reject(Object.assign(error, { statusCode: error.statusCode ?? 400 })));
  });
}

export function createAgentServer(transport, opts = {}) {
  const encoding = opts.encoding ?? process.env.PRINTER_ENCODING ?? 'utf8';
  let queue = Promise.resolve();
  return createServer((req, res) => {
    const json = (statusCode, body) => {
      res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };

    if (req.method === 'GET' && req.url === '/health') {
      transport.health().then((ok) => json(200, { ok, printer: ok ? 'connected' : 'disconnected' })).catch(() => json(200, { ok: false, printer: 'disconnected' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/print') {
      let body;
      readBody(req, MAX_BODY_BYTES)
        .then((raw) => {
          body = JSON.parse(raw);
          const invalid = validate(body);
          if (invalid) throw Object.assign(new Error(invalid), { statusCode: 400 });
          return buildReceipt(body, { encoding });
        })
        .then((receipt) => {
          queue = queue.then(() => transport.write(receipt.data, receipt.text)).then(() => {
            log({ order: body.code, result: 'ok' });
            json(200, { ok: true });
          }).catch((error) => {
            log({ order: body.code, result: 'error', error: error.message });
            json(500, { ok: false, message: error.message });
          });
        })
        .catch((error) => {
          if (body?.code) log({ order: body.code, result: 'error', error: error.message });
          json(error.statusCode ?? (error instanceof SyntaxError ? 400 : 500), { ok: false, message: error.message });
        });
      return;
    }

    json(404, { ok: false, message: 'Không tìm thấy' });
  });
}

export function createApiClient({ apiUrl, token, fetchImpl = fetch }) {
  const request = async (path, init = {}) => {
    const response = await fetchImpl(`${apiUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw Object.assign(new Error(`API ${response.status}`), { status: response.status });
    const body = await response.text();
    return body ? JSON.parse(body) : null;
  };
  return {
    next: () => request('/print-jobs/next'),
    success: (job) => request(`/print-jobs/${job.id}/success`, { method: 'POST', body: JSON.stringify({ claimToken: job.claimToken }) }),
    failure: (job, error) => request(`/print-jobs/${job.id}/failure`, { method: 'POST', body: JSON.stringify({ claimToken: job.claimToken, error: String(error).slice(0, 500) }) })
  };
}

export async function runWorker({ transport, api, encoding = 'utf8', pollMs = 2000, sleepImpl = sleep, signal } = {}) {
  const message = (error) => (error instanceof Error ? error.message : String(error));
  let backoffMs = pollMs;
  while (!signal?.aborted) {
    let job = null;
    try {
      job = await api.next();
      backoffMs = pollMs;
    } catch (error) {
      log({ result: 'connection_error', error: message(error) });
      await sleepImpl(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 30_000);
      continue;
    }

    if (!job) {
      await sleepImpl(pollMs);
      continue;
    }

    const invalid = validate(job.payload);
    let printError = invalid;
    if (!printError) {
      try {
        const receipt = buildReceipt(job.payload, { encoding });
        await transport.write(receipt.data, receipt.text);
      } catch (error) {
        printError = message(error);
      }
    }

    if (printError) {
      try {
        await api.failure(job, printError);
        log({ printJob: job.id, order: job.orderId, result: 'error', error: printError });
      } catch (error) {
        // Lease server-side sẽ hết hạn và job được thử lại; không được crash.
        log({ printJob: job.id, result: 'failure_report_error', error: message(error) });
        await sleepImpl(pollMs);
      }
      continue;
    }

    // Đã in giấy — báo success bền bỉ để không in trùng; bỏ qua khi job không còn của mình (409).
    for (let ackBackoff = pollMs; !signal?.aborted; ) {
      try {
        await api.success(job);
        log({ printJob: job.id, order: job.orderId, result: 'ok' });
        break;
      } catch (error) {
        if (error?.status === 409) {
          log({ printJob: job.id, result: 'ack_conflict' });
          break;
        }
        log({ printJob: job.id, result: 'ack_error', error: message(error) });
        await sleepImpl(ackBackoff);
        ackBackoff = Math.min(ackBackoff * 2, 30_000);
      }
    }
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try { process.loadEnvFile(); } catch {}
  const transport = createTransport();
  transport.health().then((ok) => log({ result: 'startup', printer: ok ? 'connected' : 'disconnected' }));

  if (process.env.NODE_ENV !== 'production') {
    const port = Number(process.env.PORT ?? 3210);
    const host = process.env.BIND_HOST ?? '127.0.0.1';
    createAgentServer(transport).listen(port, host, () => console.log(`[print-agent] development server http://${host}:${port}`));
  }

  const apiUrl = process.env.ZUZU_API_URL;
  const token = process.env.PRINT_AGENT_TOKEN;
  if (!apiUrl || !token) {
    if (process.env.NODE_ENV === 'production') throw new Error('ZUZU_API_URL và PRINT_AGENT_TOKEN là bắt buộc');
  } else {
    void runWorker({
      transport,
      api: createApiClient({ apiUrl, token }),
      encoding: process.env.PRINTER_ENCODING ?? 'utf8',
      pollMs: Number(process.env.POLL_INTERVAL_MS ?? 2000)
    });
  }
}
