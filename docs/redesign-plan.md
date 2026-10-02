# ZUZU Laundry — Redesign Plan

**Milestone 2 · 2026-10-01**

Nguồn chuẩn: `design-system/zuzu-laundry/MASTER.md` và `docs/ui-audit.md`.

## 1. Direction

ZUZU dùng **flat operational UI**: sáng, gọn, mật độ tương đối cao, ít shadow, blue primary, semantic status colors, chữ lớn vừa đủ và thao tác một tay. Ant Design 5 tiếp tục là foundation; redesign tập trung vào theme token, composition và vài primitive dùng lặp lại.

Không làm:

- dashboard template generic;
- glassmorphism hoặc gradient AI;
- green primary;
- mọi section đều là card;
- animation decorative;
- thêm dependency UI/chart khi AntD hoặc CSS/native đủ dùng.

## 2. Navigation

### STAFF mobile

Bottom nav giữ bốn mục: Home, Quét QR, Đơn hàng, Tài khoản. Home chỉ có hai CTA nổi bật nhất là Nhận đồ và Quét QR. Chi tiền chuyển xuống secondary action.

### MANAGER/OWNER desktop

Sidebar gom hai nhóm `Vận hành` và `Quản lý`. “Trang chủ” và “Dashboard” hợp nhất thành `Tổng quan`. Route và item render theo role hiện tại; backend guard không đổi.

### Tablet

Không bật sidebar đầy đủ ở 768px. Dùng compact header/drawer tới trước 1024px; data view dùng list/card.

## 3. Responsive rules

| Viewport | Layout |
|---|---|
| 375–430 | mobile task flow, 16px gutter, sticky bottom CTA |
| 768 | tablet content 24px, nav compact/drawer, list/card |
| 1024 | management sidebar + table bắt đầu |
| 1440 | wider data workspace, content không khóa ở 1100px cho table |

CSS viết mobile-first. Breakpoint chỉ dùng khi layout đổi, không tạo media query riêng cho mỗi screen.

## 4. Implementation sequence

### Foundation

Các file dự kiến chạm:

- `apps/web/src/main.tsx`: AntD tokens.
- `apps/web/src/styles.css`: CSS tokens, mobile-first shell, focus/reduced motion.
- `apps/web/src/App.tsx`: role/device-aware navigation.
- `apps/web/src/components/common.tsx`: mở rộng primitive hiện có thay vì tạo nhiều wrapper rỗng.

Primitive tối thiểu:

- `AppPage`, `PageHeader`, `BottomActionBar`;
- `PrimaryAction`, `StatusBadge`, `Money`;
- `OrderCard`, `OrderSummary`, `QuickChoice`;
- `EmptyState`, `ErrorState`;
- `ResponsiveDataView`, `FilterBar` khi bắt đầu management.

### Milestone 3 — Staff mobile

#### 3.1 Login

- Full-height clean surface, không gradient.
- Field 52px, label rõ, visible error.
- Pending text `ĐANG ĐĂNG NHẬP...`.
- Focus username khi vào trang.

#### 3.2 Home

- Hai CTA 56px+ theo đúng hierarchy.
- Counts compact, không ba card cao.
- Recent orders list; dùng query orders hiện có trước, chưa cần endpoint mới.
- Chi tiền là secondary action.

#### 3.3 Receive

- Phone first + autofocus + `inputMode="tel"`.
- Lookup dùng `useDeferredValue`; normalize phone nhất quán.
- Customer match rõ, customer new rõ.
- Unknown customer là large selectable row, không switch 24px.
- Note quick choice wrap grid.
- Sticky `NHẬN ĐỒ`; pending copy cụ thể.
- Success hiển thị order code và trạng thái in; lỗi in có `Thử lại`/`Tiếp tục không in` nếu dùng endpoint reprint hiện có.

#### 3.4 QR scanner

- Camera chiếm phần lớn viewport, bỏ card wrapper.
- Scan guide tối giản; camera error actionable.
- Fallback nhập code không cần confirm.
- Rung một lần khi scan thành công; reduced motion không ảnh hưởng rung vì đây là feedback thiết bị.

#### 3.5 Order detail

- Code/status/customer/note nhìn rõ trong first viewport.
- Weight và total là field riêng.
- CTA theo status trong sticky bar.
- Unknown customer có `GẮN KHÁCH`.
- Reprint là secondary action.

#### 3.6 Complete

- Service dùng quick choice/list, không dropdown khó bấm.
- Quantity autofocus + decimal keyboard; numeric centerpiece.
- Total preview luôn giữ chỗ, update ngay.
- Backend response quyết định total cuối.
- Discount manager-only, collapsed secondary control.

#### 3.7 Attach customer + Return

- Attach lookup customer trước submit.
- Không hiển thị name field như thể sẽ update customer cũ.
- Return state hiển thị kg, money, points và hai payment cards.
- Sticky `TRẢ ĐỒ` với pending/error state.
- Blocker cần business decision: khách không có SĐT hợp lệ hiện không thể trả đồ.

#### 3.8 Expense create

- Amount first, large numeric.
- Category quick choices cho nhóm phổ biến, `Khác` mở full list.
- Payment two-card/segmented.
- Sticky `LƯU`.
- Receipt image deferred tới khi có storage/upload API.

### Milestone 4 — Management desktop

#### 4.1 Dashboard

- Revenue/expenses/profit first; orders/kg next; operational counts next.
- Date range có label/accessibility.
- Không chart cho single day.
- Nếu range nhiều ngày và API trả daily series, thêm line chart revenue/expense; không thêm chart dependency trước nhu cầu này.

#### 4.2 Orders

- Desktop table columns: code, customer, phone, kg, total, status, received at, staff.
- Search + status + date range.
- Row click opens detail; keyboard operable.
- <1024 dùng OrderCard.
- API nhỏ cần bổ sung: `page`, `limit`, `from`, `to`; bỏ hard limit 100.

#### 4.3 Customers / Expenses / Users / Services / Audit / Settings / Shifts

- Dùng cùng `PageHeader`, `FilterBar`, `ResponsiveDataView`.
- Tận dụng filter API đã có cho Expenses/Audit.
- Translate role/unit labels.
- Destructive action có reason thật, không hard-code.
- Settings hydrate form sau query.
- Table action giữ visual compact nhưng hit area >=44px.

## 5. State matrix

Mọi screen/data view cần đủ:

| State | Yêu cầu |
|---|---|
| Initial loading | skeleton/spinner giữ layout |
| Empty | nói rõ không có gì và action tiếp theo nếu có |
| Search empty | hiển thị query/filter và clear action |
| Pending mutation | khóa duplicate submit, giữ input, pending label |
| Success | xác nhận cụ thể object/action |
| API error | message tiếng Việt + retry hoặc cách sửa |
| Offline | persistent banner; không báo success giả |
| Permission denied | giải thích role không có quyền |

Special cases:

- camera denied → hướng dẫn permission + nhập code;
- invalid QR → giữ scanner mở + nhập code;
- print failed → retry/continue;
- Zalo failed → alert trên order; retry cần endpoint mới;
- unknown customer → badge neutral + attach action.

## 6. API changes tối thiểu có thể cần

Không đổi schema/order state lớn.

1. Orders list: thêm pagination/date range cho management table.
2. Notification retry: chỉ nếu Zalo retry được xác nhận là yêu cầu.
3. Receipt upload/storage: chỉ trước khi implement ảnh hóa đơn.
4. Unknown customer without phone: cần business decision, không tự đổi validation.

## 7. Accessibility checklist

- một H1 mỗi page, heading không nhảy cấp;
- skip link ở desktop shell;
- nav active state có text/form ngoài màu;
- control có label hoặc accessible name;
- focus ring 3px rõ;
- target >=44×44px, gap >=8px;
- body >=16px mobile, metadata >=14px;
- contrast >=4.5:1;
- keyboard order theo visual order;
- modal/drawer restore focus;
- `prefers-reduced-motion`;
- không disable zoom;
- test zoom 200% và Vietnamese wrapping.

## 8. Validation sau mỗi milestone

Repo hiện có:

```bash
npm run typecheck
npm test
npm run build
```

Repo chưa có lint script; không báo lint pass cho tới khi script tồn tại.

Ngoài automated checks:

- chạy app thật;
- test golden path mobile;
- viewport 375, 430, 768, 1024, 1440;
- kiểm tra console/network;
- test long content và failure states.

Baseline hiện tại: typecheck/build pass; API tests có 2 failure do database local đang giữ một ca mở (`Đã có ca đang mở`), không do UI docs.

## 9. Milestone 2 Definition of Done

- [x] Audit UI hiện tại.
- [x] Chạy UI UX Pro Max theo các domain phù hợp.
- [x] Chốt direction từ kết quả search.
- [x] Persist design system tại `design-system/zuzu-laundry/MASTER.md`.
- [x] Ghi kế hoạch màn hình/component/responsive/API tại file này.
- [x] Không sửa business flow.

Bước tiếp theo là Foundation + Login/Home trong Milestone 3, sau đó chạy app và kiểm tra mobile trước khi đi tiếp Receive/QR.