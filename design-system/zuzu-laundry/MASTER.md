# ZUZU Laundry Design System

**Version 1 · 2026-10-01**

Nguồn định hướng: UI UX Pro Max searches cho B2B/cleaning service, flat design, accessible UI, mobile operations, fast forms, navigation, status, React và time-series chart.

> Ghi chú tooling: bản `search.py` trong repo chỉ hỗ trợ `--domain`, `--stack`, `--max-results`; không hỗ trợ `--design-system`, `--persist`, `--variance`, `--motion`, `--density`. File này là bản persist thủ công từ output thật của CLI hiện có.

## 1. Product principles

1. **Hai tác vụ thống trị staff UI:** `NHẬN ĐỒ`, `QUÉT QR`.
2. **Một màn hình, một quyết định chính.** Secondary action không cạnh tranh primary CTA.
3. **Thông tin vận hành trước decoration.** Không dùng glassmorphism, gradient thương hiệu, neon hoặc shadow nặng.
4. **Mobile mặc định, desktop nâng cấp.** CSS base cho 375–430; chỉ thêm breakpoint khi layout thật sự đổi.
5. **Density 7/10.** Dày vừa đủ để thao tác nhanh, nhưng touch target luôn tối thiểu 44×44px.
6. **Motion 3/10.** Chỉ feedback trạng thái; 150–200ms, không transform gây dịch layout.
7. **Variance 4/10.** Brand rõ qua màu, type và spacing; component form/table giữ hình dạng quen thuộc.
8. **Backend giữ quyền và tiền.** UI phản ánh role/status; không tự tạo flow hoặc giá trị cuối cùng.

## 2. Foundation

### 2.1 Color tokens

```css
:root {
  --color-primary: #0369a1;
  --color-primary-hover: #075985;
  --color-primary-soft: #e0f2fe;

  --color-success: #166534;
  --color-success-bg: #f0fdf4;
  --color-warning: #92400e;
  --color-warning-bg: #fffbeb;
  --color-error: #b91c1c;
  --color-error-bg: #fef2f2;

  --color-text: #0f172a;
  --color-text-muted: #475569;
  --color-border: #cbd5e1;
  --color-border-subtle: #e2e8f0;
  --color-surface: #ffffff;
  --color-page: #f8fafc;
  --color-disabled: #94a3b8;
}
```

Rules:

- Blue là primary cho điều hướng và CTA.
- Green chỉ dùng completed/success/payment success.
- Amber dùng waiting/attention.
- Red dùng destructive/error.
- Mỗi state luôn có text; icon chỉ bổ trợ.
- Không dùng orange làm CTA vì dễ xung đột waiting state.
- Không dùng raw hex trong screen component; khai báo qua AntD token/CSS token.

Contrast đã kiểm tra:

| Pair | Ratio |
|---|---:|
| Primary hover `#075985` / white | 7.56:1 |
| Primary `#0369a1` / white | 5.93:1 |
| Text `#0f172a` / white | 17.85:1 |
| Muted `#475569` / page | 7.24:1 |
| Success text/background | 6.81:1 |
| Warning text/background | 6.84:1 |
| Error text/background | 5.91:1 |

### 2.2 Typography

Không tải webfont ở operational app. Dùng system stack để PWA hiển thị ngay khi mạng yếu/offline và tránh thêm request/font dependency.

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", "Noto Sans", Arial, sans-serif;
--font-mono: ui-monospace, "SFMono-Regular", Consolas, monospace;
```

| Role | Size / line | Weight | Dùng cho |
|---|---|---:|---|
| Display | 32/38 mobile, 36/44 desktop | 750 | Home primary action context, không dùng đại trà |
| Page title | 24/32 mobile, 28/36 desktop | 700 | H1 duy nhất mỗi page |
| Order code | 24/30 | 750 | `ZU-0182`, mono/tabular |
| Money hero | 32/38 | 750 | thành tiền/amount |
| Section title | 16/24 | 700 | block heading |
| Body | 16/24 | 400 | default mobile/desktop body |
| Label | 14/20 | 600 | form/metadata label |
| Metadata | 14/20 | 400 | secondary info; không nhỏ hơn 14px |

Rules:

- Số tiền, kg, order code dùng `font-variant-numeric: tabular-nums`.
- Không uppercase body copy; uppercase chỉ CTA ngắn nếu giúp scan.
- Vietnamese phải wrap; không fixed-height text container.

### 2.3 Spacing

Base unit 4px.

```text
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
```

- Mobile page gutter: 16px.
- Tablet: 24px.
- Desktop content: 32px.
- Touch target gap: tối thiểu 8px.
- Form field vertical gap: 16px; compact metadata row: 8–12px.

### 2.4 Radius, border, shadow

```text
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px
--shadow-raised: 0 8px 24px rgb(15 23 42 / 8%)
```

- Default component radius: 8–10px.
- Card không phải wrapper mặc định.
- Shadow chỉ cho modal/drawer/floating bottom bar; content block dùng border/surface.
- Không pill mọi thứ; pill chỉ status badge/compact choice.

### 2.5 Motion

```text
--motion-fast: 150ms
--motion-base: 200ms
--ease-standard: ease-out
```

Cho phép:

- pressed/hover/focus color;
- drawer/modal enter/exit;
- loading → success/error;
- scan success + vibration một lần;
- status transition confirmation.

Không cho phép:

- scale hover;
- page entrance sequence;
- animation liên tục;
- motion dài hơn 250ms;
- animation decorative.

`prefers-reduced-motion: reduce` tắt transition không thiết yếu.

### 2.6 Breakpoints

```text
base: 375–767px  staff mobile layout
md:   768px      tablet split/layout adjustment
lg:   1024px     management sidebar + data table
xl:   1440px     wider management workspace
```

- Không chuyển sang sidebar 12 mục tại đúng 768px.
- Mobile/bottom navigation tới `< 1024px` cho staff flow.
- Management tablet có drawer/sidebar collapsed; full sidebar từ 1024px.
- Table chỉ từ 1024px; mobile/tablet dùng card/list.
- Không fixed width lớn hơn viewport.

## 3. Ant Design mapping

Giữ AntD 5 làm foundation; không rewrite component primitives.

```ts
const theme = {
  token: {
    colorPrimary: "#0369a1",
    colorSuccess: "#166534",
    colorWarning: "#92400e",
    colorError: "#b91c1c",
    colorText: "#0f172a",
    colorTextSecondary: "#475569",
    colorBorder: "#cbd5e1",
    colorBgLayout: "#f8fafc",
    colorBgContainer: "#ffffff",
    borderRadius: 10,
    fontSize: 16,
    controlHeight: 44,
    controlHeightLG: 52,
    controlHeightSM: 36
  }
};
```

Component policy:

- `Button`: mobile primary cao 52–56px; default action tối thiểu 44px.
- `Input`, `InputNumber`, `Select`: 48–52px trong staff flow.
- `Table`: dùng cho management desktop; action compact vẫn có hit area 44px.
- `Card`: chỉ metric/entity cần boundary; form page không bọc card trên mobile.
- `Descriptions`: không dùng cho operational order detail; dùng label/value layout riêng.
- `Segmented`: payment 2 lựa chọn; quick choice dài dùng wrap grid, không horizontal scroll.
- `Modal`: destructive/admin edit; không dùng cho core mobile flow.
- `Drawer`: tablet navigation/filter, không dùng thay full page staff task.

## 4. Interaction rules

### Touch and pointer

- Mọi target tối thiểu 44×44px.
- Primary mobile button 52–56px.
- Khoảng cách action tối thiểu 8px.
- `touch-action: manipulation` cho button/action.
- Không đặt hai destructive/primary action sát nhau.

### Keyboard and focus

- Focus ring 3px primary soft + 2px primary outline hoặc equivalent AntD token.
- DOM order trùng visual order.
- Skip link tới `main` trên layout có sidebar.
- Drawer/modal trả focus về trigger.
- Không custom tab order trừ khi framework cần.

### Form

- Label luôn hiển thị; placeholder chỉ là ví dụ.
- Error ngay dưới field, tiếng Việt, actionable.
- Numeric field dùng `inputMode="decimal"`/`numeric` phù hợp.
- Autofocus chỉ tại task page: phone Receive, quantity Complete, code fallback khi camera lỗi.
- Search lookup dùng `useDeferredValue` hoặc debounce nhẹ; không request mỗi keystroke.
- Pending copy mô tả việc đang làm: `ĐANG TẠO ĐƠN...`, `ĐANG HOÀN THÀNH...`.
- Pending khóa duplicate submit nhưng không xóa input.

### Feedback

- <300ms: pressed state đủ.
- >300ms: loading indicator + pending label.
- Success: confirmation rõ, sau đó navigation có chủ đích.
- Error: giữ dữ liệu, nêu nguyên nhân và action retry/continue.
- Offline: banner persistent; mutation không giả success.

## 5. Navigation

### STAFF mobile

Bottom nav 4 mục:

1. Trang chủ
2. Quét QR
3. Đơn hàng
4. Tài khoản

- `NHẬN ĐỒ` là Home primary action, không cần fifth nav item.
- `CHI TIỀN` là secondary quick action dưới operational status/recent orders.
- Active state dùng icon + text + primary color.
- Bottom nav target cao tối thiểu 56px + safe-area.

### OWNER/MANAGER desktop

Group sidebar:

```text
Vận hành
  Tổng quan
  Đơn hàng
  Khách hàng
  Chi phí
  Chốt ca

Quản lý
  Nhân viên      OWNER
  Bảng giá
  Audit log
  Cài đặt        OWNER
```

- Không có cả “Trang chủ” và “Dashboard” trong cùng sidebar.
- `Quét QR` là utility action ở header hoặc quick action, không phải primary management nav.
- Chỉ render item role được phép; API guard vẫn quyết định quyền thật.

## 6. Status system

| Status | Label | Tone | Form ngoài màu |
|---|---|---|---|
| `PROCESSING` | Đang xử lý | primary blue | text + progress/open-circle icon |
| `READY_FOR_PICKUP` | Chờ khách lấy | warning amber | text + clock/bag icon |
| `COMPLETED` | Đã trả | success green | text + check icon |
| `CANCELLED` | Đã huỷ | neutral/error depending context | text + stop icon |
| Unknown customer | Chưa xác định khách | neutral warning | outlined badge + person-question icon |
| Notification error | Gửi Zalo lỗi | error | alert stripe + retry action |
| Print error | Không in được bill | error | alert block + retry/continue |

Badge:

- height 28–32px;
- radius 6px, không full pill nếu text dài;
- 14px semibold;
- không dùng color alone.

## 7. Core components

Chỉ tạo khi reuse thực tế:

- `AppPage`: responsive gutter, max width, safe-area.
- `PageHeader`: H1 + back/secondary action.
- `BottomActionBar`: sticky primary action, safe-area, loading/error context.
- `PrimaryAction`: 52–56px operational CTA.
- `StatusBadge`: mapping duy nhất cho status.
- `Money`: tabular digits, `đ`, size variants.
- `OrderSummary`: code, status, customer, note, kg, money.
- `OrderCard`: recent/mobile list/customer history.
- `QuickChoice`: note/service/category/payment selection.
- `Metric`: compact count/value, không bắt buộc card.
- `SearchField`, `FilterBar`.
- `ResponsiveDataView`: table >=1024, list/card nhỏ hơn.
- `EmptyState`, `ErrorState`, `FormFeedback`.

Không tạo:

- interface/factory cho một component;
- wrapper một-một quanh mọi AntD primitive;
- chart abstraction trước khi có chart thứ hai;
- animation utility riêng.

## 8. Screen hierarchy

### Home mobile

1. Brand/header.
2. `NHẬN ĐỒ` primary filled.
3. `QUÉT QR` primary-equivalent outlined/high contrast.
4. Compact operational counts in one row/list.
5. Recent orders.
6. `CHI TIỀN` secondary.

### Receive

1. Phone autofocus.
2. Customer result inline.
3. Unknown customer option.
4. Quick note wrap grid.
5. Sticky `NHẬN ĐỒ`.
6. Print result state before leaving.

### QR

1. Camera edge-to-edge below header, majority viewport.
2. Minimal scan guide.
3. Camera error inline.
4. Fallback `Nhập mã đơn` always available but secondary.
5. Successful scan opens order directly.

### Order detail

1. Order code + status.
2. Customer/unknown customer.
3. Note callout.
4. Received time, weight, total in aligned rows.
5. Status-specific sticky primary CTA.
6. `In lại bill` secondary.

### Complete

1. Service quick choice.
2. Quantity/kg numeric centerpiece + autofocus.
3. Live estimated total.
4. Sticky `HOÀN THÀNH`.
5. Discount manager-only under progressive disclosure.

### Return

1. Order/customer summary.
2. kg + money + points.
3. Two large payment choices.
4. Sticky `TRẢ ĐỒ`.

### Expense create

1. Large numeric amount.
2. Common category quick choices + `Khác`.
3. Description.
4. Payment choice.
5. Optional receipt only after storage API exists.
6. Sticky `LƯU`.

### Management dashboard

Priority:

1. Revenue, expenses, temporary profit.
2. Orders, kg.
3. Processing, ready.
4. Payment split/unpaid/customer counts.
5. No chart for “Hôm nay”. Optional two-line revenue/expense chart only for multi-day range and only when API provides daily series.

## 9. Responsive and content checks

Verify at 375, 430, 768, 1024, 1440:

- no body horizontal scroll;
- sticky CTA does not cover content/nav;
- safe-area bottom respected;
- long Vietnamese name/note wraps;
- phone/order code remain scannable;
- large money uses tabular digits and does not clip;
- status badge wraps only as last resort;
- table becomes cards below 1024;
- zoom 200% keeps content/actions reachable.

## 10. Acceptance checks

- Staff golden path requires no unnecessary confirmation screen.
- Every mutation has pending, success and actionable error state.
- Every task can be completed one-handed at 375px.
- Every important target >=44×44px.
- Body text contrast >=4.5:1.
- Status is never color-only.
- Keyboard reaches every desktop action with visible focus.
- Reduced motion works.
- No new dependency unless existing AntD/native platform cannot cover the need.
