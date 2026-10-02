# ZUZU Laundry — UI/UX Audit

**Milestone 1 · 2026-10-01**

## 1. Phạm vi và cách kiểm tra

Audit này chỉ ghi nhận UI/UX hiện tại. Chưa redesign, chưa thay business logic, schema hay API contract.

Đã kiểm tra:

- toàn bộ 29 file nguồn frontend trong `apps/web/src`;
- routing, role guard, layout, component dùng chung, theme và CSS;
- các API phục vụ đơn hàng, khách hàng, chi phí, dashboard, nhân viên, audit và cài đặt;
- giao diện thật sau khi đăng nhập bằng Chrome headless độc lập;
- viewport `375 × 812`, `430 × 932`, `768 × 1024`, `1024 × 768`, `1440 × 900`;
- overflow ngang, landmark, heading và kích thước control có thể bấm.

Không có horizontal overflow tại các viewport đã kiểm tra. Audit chưa kiểm tra camera thật, rung trên thiết bị thật, máy in, Zalo, trạng thái offline hoặc screen reader thực tế.

## 2. Stack hiện tại

| Hạng mục | Hiện trạng |
|---|---|
| Monorepo | npm workspaces, `apps/api`, `apps/web` |
| Frontend | React 19.1, TypeScript 5.9, Vite 7.1 |
| UI foundation | Ant Design 5.27, `@ant-design/icons` |
| Routing | React Router 7.9, `createBrowserRouter` |
| Server state | TanStack React Query 5.90 |
| QR | `qr-scanner` 1.4 |
| PWA | `vite-plugin-pwa`, standalone manifest |
| Backend | NestJS, Prisma, PostgreSQL |
| Styling | một `ConfigProvider` tối thiểu + một file CSS global 2 dòng nén |
| Test frontend | chưa có |
| Lint frontend | chưa có script |

Nguồn chính: `package.json`, `apps/web/package.json`, `apps/web/src/main.tsx`, `apps/web/vite.config.ts`.

## 3. Kiến trúc UI hiện tại

### Routing và quyền

- Public: `/login`.
- Authenticated cho mọi role: Home, Nhận đồ, Quét QR, Đơn hàng, Chi tiết đơn, Cân & hoàn thành, Gắn khách, Tạo khoản chi, Khách hàng, Hồ sơ.
- MANAGER/OWNER: Dashboard, Chi phí, Audit log, Chốt ca, Bảng giá.
- OWNER: Nhân viên, Cài đặt.
- Frontend redirect theo role trong `apps/web/src/session.tsx`; backend guard vẫn là source of truth.

### Layout và navigation

- `< 768px`: header nhỏ + bottom nav 4 mục.
- `>= 768px`: sidebar AntD chứa 5 mục staff, thêm 5 mục manager và thêm 2 mục owner.
- Content có `max-width: 1100px` dùng chung cho cả staff flow và management flow.
- Breakpoint duy nhất do CSS custom quản lý là `767px`; không có chiến lược riêng cho 430, 768, 1024 và 1440.

### Component dùng chung

Chỉ có:

- `StatusBadge`;
- `Money`;
- `PageTitle`;
- `QrScanner`.

Phần lớn screen tự ghép trực tiếp AntD `Card`, `Descriptions`, `List`, `Table`, `Form`, `Select`, `Radio`, `Statistic`.

## 4. Business flow hiện có — phải giữ

### Nhận đồ

`SĐT hoặc Chưa xác định khách → lưu ý → tạo đơn → backend in bill → quay Home`

- Chưa cân, chưa chọn dịch vụ, chưa tính tiền khi tạo đơn.
- Customer lookup tự chạy từ 8 ký tự.
- Khách mới được upsert theo SĐT.
- Backend trả `printWarning` thay vì rollback đơn khi in lỗi.

### Hoàn thành

`Mở đơn PROCESSING → service + quantity/kg → backend tính subtotal/discount/total → READY_FOR_PICKUP → gửi Zalo`

- Backend là source of truth cho tiền.
- Chỉ manager/owner thấy discount và sửa cân trong UI.
- Không có và không cần trạng thái theo từng bước giặt/sấy/gấp.

### Trả đồ

`Mở đơn READY_FOR_PICKUP → nếu thiếu khách thì gắn khách → chọn CASH/BANK_TRANSFER → trả đồ`

Backend tự:

- chuyển `COMPLETED`;
- tạo payment;
- gắn payment vào ca đang mở nếu có;
- cộng điểm;
- cập nhật customer totals;
- ghi audit.

### Quyền hiện tại

- STAFF được tạo chi phí, nhận/trả đồ, cân hoàn thành, gắn khách, xem đơn và khách.
- MANAGER/OWNER quản lý dashboard, chi phí, audit, ca và bảng giá.
- OWNER quản lý nhân viên và loyalty setting.
- Huỷ đơn chỉ MANAGER/OWNER.

## 5. Những điểm đang làm đúng

1. **Flow nghiệp vụ ngắn và đúng domain.** Không có thao tác “bắt đầu giặt/sấy/gấp” thừa.
2. **QR là route cấp cao.** Có Home action và bottom-nav action; scan thành công rung, dừng camera và mở thẳng chi tiết đơn, không có confirm screen.
3. **Có fallback nhập mã đơn.** Camera permission error có hướng dẫn nhập mã.
4. **Nhận đồ hỗ trợ khách chưa xác định.** Không chặn flow vận hành thực tế.
5. **Backend bảo vệ cạnh tranh thao tác.** Complete/return dùng atomic claim; không nên làm yếu đi khi redesign.
6. **Role guard có cả frontend và backend.** Không chỉ hide bằng CSS.
7. **Đã có loading trên hầu hết mutation button.** AntD tự khóa nút khi pending, giảm double submit.
8. **Status luôn có text.** Không truyền đạt trạng thái chỉ bằng màu.
9. **PWA có `viewport-fit=cover`.** Bottom nav đã dùng safe-area inset.
10. **Không có overflow ngang** tại 375, 430, 768, 1024, 1440 trong các màn hình đã đo.

## 6. Phát hiện ưu tiên

### P0 — Chặn mục tiêu vận hành hoặc Definition of Done

#### P0.1 — Không thể trả đồ cho khách chưa xác định nếu không có SĐT Việt Nam hợp lệ

- UI chỉ cho nhập SĐT và tên tại `apps/web/src/pages/AttachCustomerPage.tsx:8-11`.
- API bắt buộc `@IsPhoneNumber('VN')` tại `apps/api/src/orders/orders.dto.ts:16-19`.
- Backend chặn trả đồ nếu chưa có `customerId` tại `apps/api/src/orders/orders.service.ts:96-100`.

**Tác động:** case “khách tới nhưng không có/không cung cấp SĐT” không thể hoàn tất, dù đơn được phép tạo ở trạng thái chưa xác định. Đây là business constraint cần được xác nhận trước Milestone 3; không nên lách bằng UI.

#### P0.2 — Orders desktop thiếu table và filter vận hành

- `apps/web/src/pages/OrdersPage.tsx:9-12` luôn render `List` cho mọi viewport.
- UI chỉ có search submit; không có status filter, date range, staff column, weight, received time hay responsive table/card split.
- API đã hỗ trợ `status` nhưng UI không dùng: `apps/api/src/orders/orders.dto.ts:22-25`.
- API chưa hỗ trợ date range/pagination và giới hạn cứng 100 bản ghi: `apps/api/src/orders/orders.service.ts:37-50`.

**Tác động:** OWNER/MANAGER không có màn hình Orders đáp ứng Definition of Done; danh sách lớn không thể quản lý đáng tin cậy.

#### P0.3 — Loading/error state có thể hiển thị sai thành “không tìm thấy” hoặc loading vô hạn

- `CustomerDetailPage` trả “Đang tải…” cho mọi trường hợp không có data, kể cả API error: `apps/web/src/pages/CustomerDetailPage.tsx:58-60`.
- `OrderPage` dùng cùng một `Empty` cho lỗi API và not found: `apps/web/src/pages/OrderPage.tsx:65-67`.
- `RequireAuth` xem mọi lỗi `/auth/me` như chưa login và redirect, không phân biệt network/server error: `apps/web/src/session.tsx:7-12`.

**Tác động:** nhân viên không biết lỗi mạng, lỗi server hay dữ liệu không tồn tại; không có hành động retry đúng ngữ cảnh.

#### P0.4 — Trạng thái lỗi in sau nhận đồ không actionable và biến mất quá nhanh

- `ReceivePage` chỉ đưa `printWarning` vào toast success rồi tự về Home sau 500 ms: `apps/web/src/pages/ReceivePage.tsx:18-19`.
- Không có “Thử lại” hoặc “Tiếp tục không in” tại thời điểm lỗi.

**Tác động:** trong flow cầm đồ, nhân viên dễ bỏ lỡ lỗi và túi đồ không có bill theo cùng.

### P1 — Gây chậm thao tác hoặc làm sai hierarchy chính

#### P1.1 — Staff Home chưa ưu tiên tuyệt đối hai tác vụ chính

- `CHI TIỀN` đứng cùng nhóm CTA với `NHẬN ĐỒ` và `QUÉT QR`: `apps/web/src/pages/HomePage.tsx:7-9`.
- `QUÉT QR` là button default, yếu hơn `NHẬN ĐỒ` dù cùng mức ưu tiên nghiệp vụ.
- Không có “Đơn gần đây”.
- Ba metric được tách thành ba card cao, chiếm gần hết first viewport trên 375px.
- Home không có page heading semantic.

**Tác động:** Home có hình dạng dashboard thu nhỏ thay vì bàn thao tác nhanh.

#### P1.2 — QR camera không phải first-class mobile interaction

- Scanner bị bọc trong `Card`, video cố định `aspect-ratio: 4/3`: `apps/web/src/pages/ScanPage.tsx:8-11`, `apps/web/src/styles.css:1`.
- Tại 375px camera chỉ rộng khoảng 293px và không chiếm phần lớn viewport.
- “Mở lại camera” chỉ cao 32px; field nhập mã hiển thị khoảng 26px ở phần input nội bộ.
- Không có scan overlay tối giản do app kiểm soát, không có trạng thái invalid QR riêng.

#### P1.3 — Receive chưa tối ưu nhập một tay và CTA không sticky

- Toàn bộ form nằm trong card; CTA ở cuối luồng và cuộn theo nội dung: `apps/web/src/pages/ReceivePage.tsx:19`.
- “Chưa xác định khách” là switch cao 24px, không đạt touch target 44px.
- Phone lookup so khớp exact giữa giá trị đã bỏ space và dữ liệu trả về nhưng không normalize phía customer tại dòng so sánh: `ReceivePage.tsx:16-17`; input có dấu cách có thể lookup được nhưng không hiển thị đúng `found`.
- Search query chạy theo mỗi keystroke từ ký tự thứ 8, không debounce.
- Quick note dùng horizontal `Segmented` overflow; các target không đảm bảo 44px và label “Không” thiếu ngữ cảnh khi scan nhanh.
- Submit copy chỉ hiện spinner AntD, không đổi rõ thành “ĐANG TẠO ĐƠN...”.

#### P1.4 — Cân & hoàn thành có thứ tự và control chưa phù hợp vận hành nhanh

- Service dùng dropdown `Select`; quantity là `InputNumber` generic: `apps/web/src/pages/CompletePage.tsx:22`.
- Không autofocus quantity, không khai báo `inputMode="decimal"` rõ ràng.
- Control đo được khoảng 38px; nút tăng/giảm nội bộ chỉ khoảng 1×19px trong DOM và không phải large touch action.
- Service chưa được ưu tiên bằng selectable card/list; kg không phải numeric centerpiece.
- Thành tiền preview chỉ xuất hiện khi quantity truthy, làm layout nhảy.
- Owner/manager thấy discount trên flow chính, tăng độ dài form.
- “Backend source of truth” là đúng, nhưng preview đang nhân trực tiếp `Number(price) * quantity`; cần ghi rõ đây chỉ là preview.

#### P1.5 — Order detail không truyền trạng thái trong khoảng một giây

- Dùng `Descriptions` phẳng cho toàn bộ dữ liệu: `apps/web/src/pages/OrderPage.tsx:83-124`.
- Note, trạng thái, khách, nhận lúc, dịch vụ và tiền có trọng số thị giác gần nhau.
- SĐT hiển thị đầy đủ, không mask ở màn hình thao tác chung.
- “Chưa cân” nằm trong field “Dịch vụ”; không có field “Khối lượng” riêng.
- Note quan trọng không được nhấn mạnh.
- Primary CTA không sticky; anchor bao button đo chỉ 18px theo DOM, làm vùng semantic không phản ánh button.
- Return form bị nhúng ngay trong Order Detail thay vì hierarchy trả đồ tối giản có số tiền, kg, điểm cộng và payment cards rõ.

#### P1.6 — Attach customer không lookup trước khi submit

- Screen chỉ có SĐT + tên; không hiển thị customer match, lịch sử đơn hoặc tạo nhanh có điều kiện: `apps/web/src/pages/AttachCustomerPage.tsx:8-11`.
- Nếu SĐT đã tồn tại, backend bỏ qua tên gửi kèm vì `upsert update: {}`: `apps/api/src/orders/orders.service.ts:85-93`.

**Tác động:** UI có thể tạo kỳ vọng sai rằng tên vừa nhập sẽ cập nhật khách cũ.

#### P1.7 — Expense create dùng dropdown dài và thiếu ảnh hóa đơn

- Category có 13 lựa chọn nhưng dùng `Select`: `apps/web/src/pages/ExpenseFormPage.tsx:55-67`.
- Số tiền không đứng đầu form và không có numeric visual priority.
- Không có receipt upload dù API model có `receiptUrl`: `apps/web/src/api/types.ts:48-60`, `apps/api/src/expenses/expenses.dto.ts:7-14`.
- CTA không sticky; payment target phụ thuộc radio button compact.

#### P1.8 — Touch target không đạt yêu cầu tại nhiều màn hình

Đo trên UI thật:

- bottom nav link mobile: cao 41px;
- switch: 48×24px;
- scanner retry: cao 32px;
- nhiều input/select nội bộ: 26–40px;
- sidebar link: cao khoảng 18px theo anchor;
- table actions “Sửa/Huỷ/Khoá”: cao 24px;
- pagination: 30–32px.

Các action vận hành quan trọng cần vùng bấm 44×44px tối thiểu; primary mobile nên 48–56px.

#### P1.9 — Role-aware navigation chưa đúng ngữ cảnh thiết bị

- Owner trên mobile vẫn chỉ thấy bottom nav staff 4 mục; management routes không có đường đi trực tiếp trên mobile: `apps/web/src/App.tsx:19-40, 80-91`.
- Tại đúng 768px, UI chuyển đột ngột sang sidebar 12 mục và bỏ bottom nav.
- STAFF desktop thấy 5 mục gồm Customers/Profile nhưng Home primary actions vẫn giống owner.
- Route `expenses/new` mở cho STAFF nhưng không có trong nav; chỉ đi qua Home `CHI TIỀN`.

### P2 — Consistency, accessibility và polish

#### P2.1 — Theme token quá ít, raw color rải rác

- `ConfigProvider` chỉ có `colorPrimary`, `borderRadius`, `fontSize`, button height: `apps/web/src/main.tsx:11-12`.
- CSS hard-code nhiều màu và gradient; component có inline raw color: `apps/web/src/styles.css`, `HomePage.tsx:9`, `ShiftsPage.tsx:38`.
- Primary hiện tại là xanh lá `#126b5d`, trái brand direction yêu cầu green dành cho success/completed.
- Không có token riêng cho surface, border, text muted, warning, error, typography, spacing, shadow, breakpoint.

#### P2.2 — Contrast muted/error không đạt 4.5:1

Đo với palette hiện tại:

- `#6c827e` trên trắng: **4.09:1**; trên page background: **3.82:1**.
- `#cf4c3c` trên trắng: **4.42:1**; trên page background: **4.13:1**.

Hai màu đang dùng cho nav muted và attention/error không đạt body-text contrast 4.5:1.

#### P2.3 — Typography và hierarchy chưa có system

- Global khai báo `Inter` nhưng không load font; thực tế có thể rơi về system sans: `apps/web/src/styles.css:1`.
- Chỉ có `PageTitle` H2 dùng inline style; không có hierarchy riêng cho order code, money, operational label, metadata.
- Money không dùng tabular numerals.
- Role hiển thị raw enum `STAFF/MANAGER/OWNER` trong Profile và Users.

#### P2.4 — Card được dùng như wrapper mặc định cho gần mọi màn hình

Receive, Scan, Order detail, Complete, Login, Profile, Dashboard, Customer detail và Shifts đều dựa nhiều vào `Card`. Card không còn tạo hierarchy; đặc biệt trên mobile nó làm hẹp camera/form và tăng padding không cần thiết.

#### P2.5 — Empty/error/loading state không nhất quán

- Orders có empty state; Customers, Audit, Services, Users, Expenses phần lớn dùng mặc định AntD hoặc không khai báo.
- Dashboard không có error state.
- Nhiều mutation trong Users, Services, Expenses, Settings không render error cạnh form; có action chỉ toast trong `onError`.
- Không có offline state, retry pattern chung, invalid QR, Zalo retry, empty recent orders hoặc permission-denied action.
- Auth/lazy loading chỉ là chữ “Đang tải…” giữa trang; không giữ context.

#### P2.6 — Accessibility còn thiếu

- Visible focus hoàn toàn phụ thuộc AntD; custom nav/link không có focus style riêng.
- `prefers-reduced-motion` chưa có.
- Switch “Chưa xác định khách” không có accessible name trực tiếp; control được đo là unnamed.
- Nhiều input nội bộ của Select/InputNumber/Radio được phép kế thừa association của AntD nhưng DOM measurement cho thấy accessible name không rõ; cần audit screen reader thực tế.
- Scanner `<video>` không có accessible description/fallback landmark.
- Icon-only search button không có tên hiển thị trong DOM measurement.
- Không có skip link; sidebar/bottom nav cùng tồn tại trong DOM và chỉ ẩn bằng CSS.

#### P2.7 — Desktop information architecture lẫn staff và management

Sidebar owner hiện có 12 mục phẳng:

`Trang chủ, Quét QR, Đơn hàng, Khách hàng, Tài khoản, Dashboard, Chi phí, Audit log, Chốt ca, Bảng giá, Nhân viên, Cài đặt`.

- Không nhóm “Vận hành” và “Quản lý”.
- Có cả “Trang chủ” và “Dashboard” không giải thích khác nhau.
- Audit log và Settings ngang cấp với task thường xuyên.
- Content max-width 1100px làm bảng management hẹp ở 1440px.

#### P2.8 — Management screen chưa khai thác API filter đã có

- Expenses API hỗ trợ from/to/category/paymentMethod/page/limit nhưng UI luôn gọi `includeVoided=true`: `ExpensesPage.tsx:12-17`.
- Audit API hỗ trợ action/entityType/user/date/page nhưng UI không có filter/pagination: `AuditLogPage.tsx:6`, backend `audit.controller.ts:11-14`.
- Orders API hỗ trợ status nhưng UI không dùng.

#### P2.9 — Action destructive có dữ liệu audit không đúng ý người dùng

- Huỷ expense luôn gửi reason hard-code “Nhập sai”: `apps/web/src/pages/ExpensesPage.tsx:14`.

Đây không chỉ là copy issue; audit log không phản ánh lý do thật. UI redesign phải cho nhập lý do hoặc xác nhận business rule cố định.

#### P2.10 — Settings form có nguy cơ không hydrate giá trị async

- `initialValues={query.data}` chỉ áp dụng khi Form mount lần đầu: `apps/web/src/pages/SettingsPage.tsx:14-20`.
- Query data thường đến sau mount nên input có thể rỗng dù setting tồn tại.

## 7. Inconsistency cụ thể

- Label dùng lẫn tiếng Việt và tiếng Anh: `Dashboard`, `Audit log`, `STAFF`, `MANAGER`, `OWNER`, `KG/ITEM/PAIR`.
- Heading có screen có H2, Home không có heading.
- Success dùng cả green status tag và green primary brand, làm mất semantic distinction.
- Search chỉ trigger khi Enter/button; customer lookup lại trigger mỗi keystroke.
- Một số mutation dùng inline Alert, một số toast, một số không có error UI.
- Mobile Home button cao 82px nhưng scanner retry 32px và action management 24px.
- Table chỉ có ở Expenses/Users/Services/Shifts; Orders quan trọng nhất lại chỉ là List.
- Một số page được lazy-load, staff pages không; quy tắc bundle chưa rõ theo role/task.

## 8. Cơ hội component reuse cho redesign

Chỉ tạo primitive khi ít nhất hai flow dùng chung. Bộ tối thiểu có giá trị:

| Primitive | Nơi dùng |
|---|---|
| `AppPage` / `MobilePage` | toàn bộ page, gutter/safe-area/max-width |
| `PageHeader` | staff và management heading/action |
| `BottomActionBar` | Receive, Complete, Return, Attach Customer, Expense |
| `PrimaryAction` | Home, state CTA, form submit |
| `StatusBadge` mở rộng | Order card/detail/table, customer history |
| `Money` mở rộng | preview, detail, dashboard, table; tabular numerals |
| `OrderSummary` | detail, return, complete context |
| `OrderCard` | recent orders, mobile orders, customer history |
| `QuickChoice` | note, service, payment, expense category |
| `FormFeedback` | pending/success/error/retry |
| `EmptyState` / `ErrorState` | list, search, scanner, network/API |
| `ResponsiveDataView` | table desktop → card/list mobile |
| `SearchField` / `FilterBar` | Orders, Customers, Expenses, Audit |
| `Metric` | Home compact counts, Dashboard figures |

Không cần tạo wrapper riêng cho mọi AntD component. Nên dùng AntD theme token + composition; custom CSS chỉ cho operational hierarchy và responsive layout.

## 9. Ràng buộc cần mang sang Milestone 2–4

1. Không thêm order state hoặc bước cập nhật giặt/sấy/gấp.
2. Không tính tiền cuối cùng ở frontend; preview chỉ để phản hồi tức thì.
3. Giữ atomic claim complete/return và backend role guard.
4. Print failure không được làm mất đơn; UI phải cho retry hoặc tiếp tục rõ ràng.
5. Zalo failure cần action retry nếu backend bổ sung endpoint; hiện API chỉ expose error, chưa có retry notification endpoint.
6. Orders desktop muốn date range/pagination phải mở rộng API nhỏ, không đổi state/schema.
7. Receipt upload hiện chưa có upload/storage API; “ảnh hóa đơn optional” cần quyết định storage riêng trước khi implement.
8. Case attach customer không có SĐT hợp lệ cần business decision vì backend hiện chặn trả đồ.
9. Management sidebar chỉ nên render route role được phép; backend tiếp tục là source of truth.
10. Dữ liệu test/polish phải gồm tên dài, note dài, mã đơn, số tiền lớn, order unknown customer và Zalo/print failure.

## 10. Thứ tự xử lý đề xuất theo milestone đã chốt

### Milestone 2 — Design system

- Chạy UI UX Pro Max design-system generation và targeted searches.
- Chốt blue primary, semantic status colors, type scale, spacing, radius, surface và breakpoint.
- Persist `design-system/zuzu-laundry/MASTER.md`.
- Ghi `docs/redesign-plan.md`.

### Milestone 3 — Staff mobile

Ưu tiên theo dependency thực tế:

1. token/theme + mobile shell + shared feedback/action primitives;
2. Login + Home;
3. Receive + print result;
4. QR scanner + fallback/error;
5. Order Detail shell;
6. Complete;
7. Attach Customer;
8. Return state;
9. Expense create.

### Milestone 4 — Management desktop

1. role-aware grouped navigation;
2. Dashboard;
3. Orders table/filter/pagination;
4. Customers;
5. Expenses;
6. Employees/roles;
7. Services;
8. Audit log;
9. Settings/shift.

### Milestone 5 — Polish

- Real-device mobile test cho camera, vibration, keyboard, sticky CTA và safe area.
- Keyboard + screen reader pass.
- Empty/error/offline/print/Zalo cases.
- Long Vietnamese content và zoom 200%.
- Verify 375, 430, 768, 1024, 1440.

## 11. Kết luận

Business core hiện tại gọn, đúng mô hình vận hành và nên được giữ. UI hiện tại là một lớp Ant Design chức năng nhưng chưa đạt operational quality: staff flow vẫn mang cấu trúc form/card generic, còn management flow thiếu Orders table/filter và feedback state đủ rõ.

Milestone 2 có thể bắt đầu mà không cần rewrite frontend hoặc thay order state. Ba điểm cần quyết định trước khi hoàn tất Milestone 3–4 là: trả đồ cho khách không có SĐT, API pagination/date filter cho Orders, và storage cho ảnh hóa đơn.