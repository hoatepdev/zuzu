# ZUZU Print Agent

Dịch vụ Node.js chạy trên máy tính tại shop và chủ động lấy print job từ Cloud API qua HTTPS.

```
ZUZU Web → Cloud API → PostgreSQL PrintJob
                         ↑ outbound polling
                    Print Agent → ESC/POS → ZY908
```

Không mở port của shop ra internet. API không gọi `127.0.0.1:3210` trong production.

## Cài đặt

Từ thư mục gốc:

```bash
npm install
cp apps/print-agent/.env.example apps/print-agent/.env
npm start --workspace @zuzu/print-agent
```

Cấu hình production trong `apps/print-agent/.env`:

```bash
NODE_ENV=production
ZUZU_API_URL=https://api.example.com
PRINT_AGENT_TOKEN=<cùng secret với API>
PRINTER_CONNECTION=usb
PRINTER_VENDOR_ID=0x0483
PRINTER_PRODUCT_ID=0x5720
PRINTER_ENCODING=utf8
```

Agent lấy tối đa một job mỗi lần, chờ khoảng 2 giây khi rảnh, in rồi báo success/failure. Lỗi mạng, API restart, laptop sleep/wake hoặc máy in tháo/cắm lại không làm process dừng. Một job thử tự động tối đa 3 lần; sau đó staff dùng **IN LẠI BILL** để tạo job mới.

Production không chạy HTTP server cục bộ. Development vẫn có:

```bash
curl http://127.0.0.1:3210/health
curl -X POST http://127.0.0.1:3210/print -d '{"code":"ZU-0125"}'
```

## Tìm VID/PID

macOS:

```bash
system_profiler SPUSBDataType | grep -B3 -A8 -i "printer\|ZY"
```

Windows: Device Manager → máy in → Properties → Details → Hardware Ids. Ví dụ `USB\VID_04B8&PID_0202` tương ứng `0x04B8` và `0x0202`.

Máy in LAN dùng `PRINTER_CONNECTION=tcp`, `PRINTER_HOST`, `PRINTER_PORT=9100`.

## Tiếng Việt

Mặc định gửi UTF-8. Nếu firmware in lỗi dấu, đặt `PRINTER_ENCODING=ascii` để bỏ dấu an toàn.

## Xử lý sự cố

- `printer: disconnected`: kiểm tra nguồn, dây USB và VID/PID.
- `connection_error`: kiểm tra internet, `ZUZU_API_URL`, HTTPS và token ở hai phía.
- Job `FAILED`: sửa máy in rồi staff chọn **IN LẠI BILL**; job cũ vẫn giữ để audit.
- Có thể in trùng nếu giấy đã in nhưng agent tắt trước khi API nhận success. Đây là at-least-once delivery; kiểm tra mã đơn trên giấy trước khi xử lý bản trùng.

```bash
npm test --workspace @zuzu/print-agent
```

Xem quy trình production đầy đủ tại [docs/production.md](../../docs/production.md).
