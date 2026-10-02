import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { buildReceipt } from './escpos.js';
import { createTransport } from './transports.js';

const MAX_BODY_BYTES = 8192;

const log = (order, result, error) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), order, result, ...(error ? { error } : {}) }));

function validate(payload) {
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
        return; // stop buffering; drain the rest so the 413 response can go out
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
      transport
        .health()
        .then((ok) => json(200, { ok, printer: ok ? 'connected' : 'disconnected' }))
        .catch(() => json(200, { ok: false, printer: 'disconnected' }));
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
          // One physical print job at a time; retries always print again.
          queue = queue
            .then(() => transport.write(receipt.data, receipt.text))
            .then(() => {
              log(body.code, 'ok');
              json(200, { ok: true });
            })
            .catch((error) => {
              log(body.code, 'error', error.message);
              json(500, { ok: false, message: error.message });
            });
        })
        .catch((error) => {
          if (body?.code) log(body.code, 'error', error.message);
          json(error.statusCode ?? (error instanceof SyntaxError ? 400 : 500), { ok: false, message: error.message });
        });
      return;
    }

    json(404, { ok: false, message: 'Không tìm thấy' });
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    process.loadEnvFile();
  } catch {}
  const port = Number(process.env.PORT ?? 3210);
  const host = process.env.BIND_HOST ?? '127.0.0.1';
  createAgentServer(createTransport()).listen(port, host, () => {
    console.log(`[print-agent] listening on http://${host}:${port} (${process.env.PRINTER_CONNECTION ?? 'console'})`);
  });
}
