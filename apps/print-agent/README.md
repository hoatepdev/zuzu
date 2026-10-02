# ZUZU Print Agent

Dịch vụ Node.js nhỏ chạy trên máy tính của shop, cắm máy in nhiệt ZY908 K80 (80mm, ESC/POS).

```
ZUZU Web → ZUZU API → Print Agent (dịch vụ này) → ESC/POS → ZY908
```

API không nói chuyện trực tiếp với USB; lỗi in không bao giờ rollback đơn (`printWarning` + staff in lại từ UI).

## Chạy agent

Từ thư mục gốc của repo (đã `npm install`):

```bash
# dev, không cần máy in: in ra console
npm run dev --workspace @zuzu/print-agent

# giống production
npm start --workspace @zuzu/print-agent
```

Copy `apps/print-agent/.env.example` → `apps/print-agent/.env` để cấu hình (chạy lệnh từ `apps/print-agent`, agent tự đọc `.env`).

Mặc định nghe `127.0.0.1:3210`, chỉ truy cập được từ chính máy đó.

## Cấu hình API

Trong `apps/api/.env`:

```
PRINT_PROVIDER=http
PRINT_AGENT_URL=http://127.0.0.1:3210
PRINT_AGENT_TIMEOUT_MS=3000
```

## Tìm máy in (VID/PID cho `PRINTER_CONNECTION=usb`)

macOS:

```bash
system_profiler SPUSBDataType | grep -B3 -A8 -i "printer\|ZY"
```

Windows: Device Manager → máy in → Properties → Details tab → Hardware Ids, thấy dạng `USB\VID_04B8&PID_0202` → `PRINTER_VENDOR_ID=0x04B8`, `PRINTER_PRODUCT_ID=0x0202`.

Gán 2 giá trị đó vào `.env` của agent và đổi `PRINTER_CONNECTION=usb`.

Máy in qua LAN/wifi sau này: `PRINTER_CONNECTION=tcp` + `PRINTER_HOST` + `PRINTER_PORT=9100`, không cần đổi gì phía API.

## Kiểm tra

```bash
# agent sống chưa (không in giấy)
curl http://127.0.0.1:3210/health
# → {"ok":true,"printer":"connected"}

# in thử 1 bill
curl -X POST http://127.0.0.1:3210/print -d '{
  "code": "ZU-0125",
  "createdAt": "2026-10-02T07:45:00.000Z",
  "customerName": "Nguyễn Lan",
  "phone": "0987654321",
  "note": "Ít thơm"
}'
# → {"ok":true}
```

## Tiếng Việt

Mặc định (`PRINTER_ENCODING=utf8`) gửi thẳng UTF-8. **In thử ngay khi lắp máy**: nếu chữ bị lỗi, đặt `PRINTER_ENCODING=ascii` trong `.env` của agent — bill sẽ bỏ dấu (`Nguyễn` → `Nguyen`) nhưng không lỗi font.

## Xử lý sự cố

- `{"ok":false,"printer":"disconnected"}` ở `/health`: sai VID/PID, dây USB, hoặc máy in chưa bật.
- API trả `Không kết nối được ZUZU Print Agent`: agent chưa chạy ở `PRINT_AGENT_URL`.
- `Máy in không phản hồi`: timeout — thử tăng `PRINT_AGENT_TIMEOUT_MS`.
- `Không kết nối được máy in ZY908`: USB mở/ghi thất bại — xem log agent để biết chi tiết.
- Agent ghi log mỗi lần in (order, thời điểm, kết quả) ra console.

## Lệnh

```bash
npm test --workspace @zuzu/print-agent
```
