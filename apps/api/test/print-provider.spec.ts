import { HttpPrintProvider } from '../src/printing/http-print.provider';

const bill = { code: 'ZU-0125', createdAt: new Date('2026-10-02T07:45:00.000Z'), customerName: 'Nguyễn Lan', phone: '0987654321', note: 'Ít thơm' };
const ok = () => new Response(JSON.stringify({ ok: true }), { status: 200 });

afterEach(() => jest.restoreAllMocks());

it('posts the bill to the print agent', async () => {
  const fetchMock = jest.fn().mockResolvedValue(ok());
  jest.spyOn(global, "fetch").mockImplementation(fetchMock);
  await new HttpPrintProvider().print(bill);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe('http://127.0.0.1:3210/print');
  expect(init.method).toBe('POST');
  expect(JSON.parse(String(init.body))).toMatchObject({ code: 'ZU-0125', phone: '0987654321', customerName: 'Nguyễn Lan', note: 'Ít thơm' });
  expect(init.signal).toBeInstanceOf(AbortSignal);
});

it('propagates the agent error message', async () => {
  jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false, message: 'Máy in đang ngoại tuyến' }), { status: 500 }));
  await expect(new HttpPrintProvider().print(bill)).rejects.toThrow('Máy in đang ngoại tuyến');
});

it('falls back to a generic message when the agent returns garbage', async () => {
  jest.spyOn(global, "fetch").mockResolvedValue(new Response('boom', { status: 500 }));
  await expect(new HttpPrintProvider().print(bill)).rejects.toThrow('Không thể in bill');
});

it('reports agent unavailable', async () => {
  jest.spyOn(global, "fetch").mockRejectedValue(new TypeError('fetch failed'));
  await expect(new HttpPrintProvider().print(bill)).rejects.toThrow('Không kết nối được ZUZU Print Agent');
});

it('maps agent timeout to a printer message', async () => {
  const timeout = new Error('aborted');
  timeout.name = 'TimeoutError';
  jest.spyOn(global, "fetch").mockRejectedValue(timeout);
  await expect(new HttpPrintProvider().print(bill)).rejects.toThrow('Máy in không phản hồi');
});
