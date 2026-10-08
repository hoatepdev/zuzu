# Orders redesign direction

- Scope: `/orders` visual redesign for Staff and Management users.
- Direction source: the three Huashu prototypes in `design-demos/`.
- Chosen direction: a deliberate mix of **Operations cockpit**, **Warm editorial**, and a restrained **Status-first** treatment.
- Selection rationale: keep the cockpit's rapid scan and clear workspace, carry ZUZU's warm paper/editorial rhythm, and use status as a quiet operational filter rather than inventing dashboard metrics.
- User instruction on direction: “bạn tự quyết” (the assistant decides the visual direction).
- Reference screenshots:
  - `design-demos/screenshots/01-operations-375.png`
  - `design-demos/screenshots/01-operations-1440.png`
  - `design-demos/screenshots/02-editorial-375.png`
  - `design-demos/screenshots/02-editorial-1440.png`
  - `design-demos/screenshots/03-status-375.png`
  - `design-demos/screenshots/03-status-1440.png`

Implementation remains frontend-only. Existing role/API/query contracts, permissions, money, status transitions, and detail-page operations remain authoritative.
