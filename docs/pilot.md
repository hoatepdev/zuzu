# ZUZU P3 pilot

P3 is a real shop pilot, not a feature sprint.

**Rule:** observe first, modify second. Do not redesign the app, add speculative features, or build a telemetry dashboard during P3. Fix only P0, P1, or obvious repeated low-risk P2 issues.

Use production app, production API, real phones, real ZY908, and the real shop Print Agent. Do not record customer names or full phone numbers in pilot notes.

## Go-live checklist

Complete before the first real customer order.

### Accounts

- [ ] Change the temporary production `OWNER` password.
- [ ] Create real `MANAGER` and `STAFF` accounts.
- [ ] Disable/remove temporary accounts that should not remain.
- [ ] Confirm production does **not** use `zuzu123`.

### Real phones

Test on iPhone Safari and, if available, Android Chrome:

- [ ] Login works.
- [ ] Session stays logged in appropriately.
- [ ] Receive flow works.
- [ ] Scan page opens camera permission prompt.
- [ ] QR detection works.
- [ ] Manual order-code lookup works.
- [ ] Order page works.
- [ ] Multi-service completion works.
- [ ] Payment works.

Responsive desktop mode is not enough.

### ZY908 and receipts

- [ ] ZY908 is attached and USB is recognized.
- [ ] Print Agent sees the printer.
- [ ] One real K80 receipt prints.
- [ ] Receipt QR scans successfully.
- [ ] Vietnamese text is acceptable.
- [ ] If Vietnamese output is bad, document it and set the existing safe fallback (`PRINTER_ENCODING=ascii`).
- [ ] Phone masking is correct.
- [ ] Cutter works.
- [ ] Paper feed is sufficient.

### Print Agent

- [ ] Print Agent starts automatically on the shop computer.
- [ ] Restart computer → agent starts → connects to cloud → claims job → prints.
- [ ] Unplug printer → job errors/retries are visible.
- [ ] Reconnect printer → later printing works.

Print delivery is at-least-once. If a duplicate receipt prints, compare the order code and discard the duplicate.

### Backup

- [ ] Production backup cron exists.
- [ ] At least one dump file has been created.
- [ ] Dumps are copied off the VPS.
- [ ] Restore test is done before or early in the pilot.
- [ ] Schedule, retention, off-VPS location, and restore test result are recorded.

On-VPS-only dumps are not enough.

### Pilot data decision

Choose one before opening:

- [ ] **Option A — keep technical test data:** mark it clearly and exclude it from pilot analysis.
- [ ] **Option B — clean reset:** only if no real customer/business data exists yet.

Never wipe production after real data exists just to make order numbers pretty.

## Wave 0 checklist — 5 simulated shop orders

Staff uses the real production app, real phones, and real printer with fake customer data.

- [ ] Order 1: known customer, 1 `KG` service.
- [ ] Order 2: unknown customer, later attach customer.
- [ ] Order 3: three services: `KG` + `ITEM` + `PAIR`.
- [ ] Order 4: adjusted unit price.
- [ ] Order 5: `READY_FOR_PICKUP` → reopen → correct quantity → payment.

Do not continue to real orders if any critical financial/data bug appears.

## Wave 1 checklist — first ~10 real orders

Run with Owner/Manager nearby.

- [ ] Do not change the interface during every order.
- [ ] Record only operational observations.
- [ ] Do not copy customer names or full phone numbers into notes.
- [ ] Stop the affected workflow for any P0.
- [ ] Fix P1 before Wave 2.

## Wave 2 checklist — continue to 20–50 real orders

If Wave 1 has no blocker, continue normal shop operation.

- [ ] Target 20–50 real orders total.
- [ ] Do not require exactly 50.
- [ ] Stop when repeated operational patterns are clear enough for the next sprint decision.

## Pilot issue template

Copy one row per meaningful observation. Use order code only.

```text
Date:
Order code:
Device: iPhone / Android / laptop
Receive: easy / friction
Number of services:
Price adjusted: yes / no
Customer initially unknown: yes / no
Print: first attempt / reprint / failed / duplicate
QR lookup: successful / failed / manual code
Order correction after READY_FOR_PICKUP: yes / no
Payment: CASH / BANK_TRANSFER
Operational issue:
Severity: P0 / P1 / P2 / P3
Repeated evidence: first time / count / % of relevant orders
```

## Severity definitions

### P0 — stop pilot

Stop using the affected workflow until fixed.

Examples:

- Wrong payment amount charged.
- Order lost.
- Payment duplicated.
- One customer gets another customer's order.
- Serious permission/auth failure.
- Production data corruption.
- Financial calculation incorrect.
- Security/privacy exposure.

### P1 — fix before next wave

Examples:

- Cannot create order.
- Cannot complete order.
- Cannot return clothes.
- QR regularly fails.
- Printer workflow unusable.
- `PrintJob` permanently stuck.
- Mobile keyboard blocks required action.
- Staff frequently cannot find the next action.

### P2 — important friction

Collect repeated evidence. Do not patch after one minor occurrence.

Examples:

- Too many taps.
- Confusing wording.
- Repeated wrong service selection.
- Price edit difficult.
- Add-service interaction slow.
- Staff repeatedly needs help.

### P3 — polish

Do not interrupt the pilot for P3.

Examples:

- Spacing.
- Cosmetic styling.
- Animation.
- Icon preference.
- Non-blocking copy preference.

## Daily close checklist

At the end of each pilot day:

- [ ] All physical bags correspond to active orders.
- [ ] `READY_FOR_PICKUP` count looks plausible.
- [ ] Completed payments match operation.
- [ ] No unexpected `FAILED` PrintJobs.
- [ ] No order is stuck due to UI/API error.
- [ ] Backup ran.
- [ ] Pilot issues are recorded.

## Pilot analysis metrics

Use existing data: `Order`, `OrderItem`, `Payment`, `AuditLog`, `PrintJob`, timestamps, plus the manual operational log. Read-only queries/scripts are OK. Do not add a pilot analytics table unless clearly necessary.

Measure:

### Usage

- Total orders.
- Completed orders.
- Cancelled orders.
- Still `PROCESSING`.
- Still `READY_FOR_PICKUP`.
- Average items/order.
- Orders with 2+ services.

### Flexible pricing

- Items where `unitPrice != baseUnitPrice`.
- Percentage of adjusted items.
- Average VND adjustment.
- Reasons where recorded.
- Any confusion between `Giá bảng` and `Giá áp dụng`.

### Discounts

- Orders using order discount.
- Total discount amount.
- Confirm `STAFF` does not see/edit order-level discount.

### Corrections

- Orders edited again after `READY_FOR_PICKUP`.
- Common correction reasons.

### Printing

- Total PrintJobs.
- First-attempt success.
- Failed PrintJobs.
- Manual reprints.
- Duplicate physical receipts.
- QR readability.
- Vietnamese rendering.
- Printer reconnection issues.

### Customers

- Known customer orders.
- Initially unknown customer orders.
- Whether attaching customer later feels natural.

### Payments

- `CASH` vs `BANK_TRANSFER` mix.
- Any duplicate-payment attempt or incorrect amount.

### Speed

Use medians where useful:

- Receive → `READY_FOR_PICKUP`.
- `READY_FOR_PICKUP` → `COMPLETED`.

## Finding repeated problems

Recommend changes only when there is evidence:

- Repeated at least 3 times.
- Repeated in at least 10% of relevant orders.
- Financial/safety issue even once.

Do nothing for one-off polish preferences.

## Final P3 report outline

After enough real usage, report exactly:

1. **PILOT VOLUME** — total, completed, cancelled, processing, ready.
2. **STAFF FLOW** — repeated workflow friction.
3. **MULTI-SERVICE** — usage and problems.
4. **PRICING** — adjusted-price behavior and mistakes.
5. **PRINTING** — ZY908 / Print Agent reliability.
6. **QR** — scan reliability.
7. **PAYMENTS** — correctness and payment-method usage.
8. **BUGS** — P0/P1/P2/P3 grouped separately.
9. **METRICS** — key pilot metrics.
10. **NEXT SPRINT** — at most three product changes, ranked by evidence.

Do not automatically implement the next sprint. Stop and let the Owner decide.
