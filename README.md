# ZUZU Laundry

ZUZU hỗ trợ quy trình nhận đồ → cân/hoàn thành → thanh toán/trả đồ, quản lý vận hành và hàng đợi in bill bền vững cho Print Agent tại shop.

## Chạy local

Yêu cầu Node.js 22+, Docker.

```bash
cp .env.example apps/api/.env
docker compose up -d
npm install
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3100
- Development users: `owner`, `manager`, `staff`
- Development password: `zuzu123`

Camera QR hoạt động trên localhost hoặc HTTPS. Nếu camera không khả dụng, dùng ô nhập mã đơn.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run build
```

## In bill thật (ZY908 K80)

API lưu `PrintJob` cùng transaction tạo đơn. [Print Agent](apps/print-agent/README.md) tại shop chủ động poll API qua HTTPS rồi xuất ESC/POS; cloud không cần truy cập LAN và lỗi máy in không làm mất đơn.

Triển khai, migration, backup và checklist production: [docs/production.md](docs/production.md).

## Zalo notifications

1. Owner mở **Cài đặt** → **Kết nối Zalo**.
2. Chọn **Kết nối Zalo**, quét QR và xác nhận trên điện thoại.
3. Khi trạng thái là **Đã kết nối**, ZUZU tự gửi thông báo Zalo khi đơn sẵn sàng nhận.

ZUZU dùng `zca-js`, một unofficial API cho tài khoản Zalo cá nhân. Zalo có thể vô hiệu hoá session; khi đó Owner cần quét QR lại. Cookie và thông tin đăng nhập chỉ được lưu mã hoá trên server.

## Assumptions Phase 1

- Mặc định local dùng `MockNotificationProvider`; đặt `ZALO_PROVIDER=zca` để gửi Zalo thật.
- Không có trạng thái washing/drying/folding; bill giấy quản lý luồng vật lý.
- Receipt hiện lưu URL, chưa upload file trực tiếp.
- Không hỗ trợ refund/void payment đã thu, sửa đơn đã COMPLETED hoặc restatement ca đã chốt.
- Dashboard nâng cao dạng biểu đồ chưa nằm trong Phase 1.
- Bảng giá dùng deactivate thay vì delete để giữ lịch sử đơn; mỗi đơn Phase 1 hiện có một service.
- Owner hiện dùng được toàn bộ tính năng vận hành và quản lý; giới hạn Staff/Manager giữ nguyên để dùng lại khi có thêm người vận hành.
- Quản lý nhân viên chỉ dành cho Owner; khoá tài khoản có hiệu lực ngay ở request kế tiếp.
