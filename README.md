# ZUZU Laundry

Phase 1 cho quy trình nhận đồ → cân/hoàn thành → thanh toán/trả đồ, cùng chi phí, dashboard, audit log và chốt ca.

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

## Assumptions Phase 1

- Print dùng `MockPrintProvider`: bill K80 được ghi vào API log, QR payload chỉ là order code.
- Zalo dùng `MockNotificationProvider`; provider thật sẽ thay qua DI mà không đổi order flow.
- Không có trạng thái washing/drying/folding; bill giấy quản lý luồng vật lý.
- Receipt hiện lưu URL, chưa upload file trực tiếp.
- Không hỗ trợ refund/void payment đã thu, sửa đơn đã COMPLETED hoặc restatement ca đã chốt.
- Dashboard nâng cao dạng biểu đồ chưa nằm trong Phase 1.
- Bảng giá dùng deactivate thay vì delete để giữ lịch sử đơn; mỗi đơn Phase 1 hiện có một service.
- Quản lý nhân viên chỉ dành cho Owner; khoá tài khoản có hiệu lực ngay ở request kế tiếp.
