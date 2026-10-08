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

Nguồn sự thật là `apps/web/src/styles.css` (shadcn semantic tokens + brand tokens). Bản tóm tắt:

```css
:root {
  /* brand */
  --brand: #0e7c66;          /* ZUZU teal: CTA, link, active, focus */
  --brand-deep: #0a5f4f;
  --brand-ink: #084a3d;
  --brand-soft: #e1f0e9;
  --brand-mist: #eff7f2;
  --mint: #9fe3c6;           /* accent trên nền tối (panel, scanner) */

  /* page & ink */
  --page: #f7f3ea;           /* giấy ấm */
  --page-deep: #f0eadc;
  --surface: #ffffff;
  --surface-warm: #fbf8f1;
  --ink: #1a2420;
  --ink-2: #46534c;
  --ink-3: #68756d;

  /* status */
  --success: #217a43;  --success-bg: #e5f3e7;
  --warning: #805500;  --warning-bg: #fbf0d9;
  --error: #c0392b;    --error-bg: #fbe9e5;

  /* dark panel (side nav, scanner) */
  --panel-ink: #14251f;
  --panel-ink-2: #1c332b;
  --panel-text: #c6d5cd;
  --panel-line: #2a443a;

  /* line & chart */
  --line: #e7dfce;
  --line-soft: #efe9db;
  --chart-revenue: var(--brand);
  --chart-expenses: var(--error);
  --chart-grid: var(--line-soft);
}
```

Rules:

- Teal `--brand` là primary cho điều hướng, CTA, selected state và focus ring.
- Green chỉ dùng completed/success/payment success; amber dùng waiting/attention; red dùng destructive/error.
- Mỗi state luôn có text; icon và dot chỉ bổ trợ, không dùng màu làm tín hiệu duy nhất.
- Không dùng raw hex trong screen component; khai báo qua CSS token hoặc Tailwind semantic token map trong `@theme inline`.
- Text của chart/tooltip/legend luôn dùng ink tokens; màu series chỉ nằm trên mark/swatch.

### 2.2 Typography

App dùng **Be Vietnam Pro** (sans) và **Spline Sans Mono** (số/mã), tải qua Google Fonts với `display=swap` trong `apps/web/index.html`; fallback là system stack để PWA vẫn đọc được khi offline.

```css
--font-sans: "Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system,
  "Segoe UI", sans-serif;
--font-mono: "Spline Sans Mono", ui-monospace, "SFMono-Regular", Consolas,
  monospace;
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
--radius-xs: 9px    /* dòng con, callout, khối nhỏ trong card */
--radius-sm: 12px   /* control, badge vuông, list item */
--radius: 16px      /* card/panel/section */
--radius-xl: 18px   /* khối hero, viewport scanner */
--shadow-1: 0 1px 2px rgba(26, 36, 32, 0.05)
--shadow-2: 0 1px 2px rgba(26, 36, 32, 0.04), 0 10px 28px rgba(26, 36, 32, 0.09)
```

- Default control radius: 12px; card/panel: 16px; scanner/hero: 18px.
- Card không phải wrapper mặc định; danh sách dày ưu tiên divide/border.
- Shadow-1 cho card tĩnh, shadow-2 cho hover/floating; modal/drawer dùng shadow của overlay primitive.
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

## 3. shadcn/ui + Tailwind CSS mapping

Foundation: **Tailwind CSS v4 + shadcn/ui** (source-owned components trong `src/components/ui`), react-hook-form cho form, sonner cho toast, lucide-react cho icon. Không dùng thư viện component đóng như AntD.

Semantic token của shadcn map thẳng vào brand trong `apps/web/src/styles.css`:

```css
:root {
  --primary: #0e7c66;        /* ZUZU teal */
  --primary-foreground: #fffdf6;
  --background: #f7f3ea;     /* giấy ấm */
  --foreground: #1a2420;     /* deep ink */
  --destructive: #c0392b;
  --border: #e7dfce;
  --ring: #0e7c66;
}
```

Component policy:

- `Button` (shadcn): size lg = 54px cho mobile primary; mọi size tối thiểu 44px.
- `Input`/`Textarea` + class `.input-lg` (54px) trong staff flow; số tiền dùng `AmountInput` (mono, 64px, hậu tố đ).
- `Select`: Radix Select qua shadcn (`components/ui/select.tsx`), trigger full-width; height theo ngữ cảnh (44px compact, 54px filter/form).
- `DatePicker`: **native `<input type="date">`** (`.date-input`), cặp Từ/Đến cho range.
- `Table` (shadcn primitives + `.management-table`): management desktop ≥1024px; mobile/tablet dùng record card list (`.record-list`/`.record-card`) — không để table cuộn ngang dưới 1024px.
- `Dialog`/`AlertDialog` (Radix): admin edit/confirm; scroll an toàn trên mobile, label tiếng Việt.
- `Sheet` (Radix): drawer navigation tablet.
- `QuickChoice`: grid button + `aria-pressed`, không dùng radio ẩn.
- `Banner`: thay Alert — tone success/error/warning/info, có action + close.
- Toast: sonner `<Toaster position="top-center" richColors>`.
- Loading: skeleton theo hình final content (`TableSkeleton`, `ListSkeleton`, `.order-loading`); spinner chỉ cho inline lookup/action.
- Motion: `MotionConfig reducedMotion="user"` ở root; chỉ feedback/state 150–200ms, không entrance sequence, không animation vô hạn.

## 4. Interaction rules

### Touch and pointer

- Mọi target tối thiểu 44×44px.
- Primary mobile button 52–56px.
- Khoảng cách action tối thiểu 8px.
- `touch-action: manipulation` cho button/action.
- Không đặt hai destructive/primary action sát nhau.

### Keyboard and focus

- Focus ring 3px primary soft + 2px primary outline hoặc `--focus-ring` token.
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
| `PROCESSING` | Đang xử lý | brand teal (`--brand-soft`/`--brand-ink`) | text + dot |
| `READY_FOR_PICKUP` | Chờ khách lấy | warning amber | text + dot |
| `COMPLETED` | Đã trả | success green | text + dot |
| `CANCELLED` | Đã huỷ | neutral (`--page-deep`/`--ink-2`) | text + dot |
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
- wrapper một-một quanh mọi shadcn primitive;
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
5. Discount manager/owner-only under progressive disclosure.

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
- No new dependency unless existing shadcn/native platform cannot cover the need.
