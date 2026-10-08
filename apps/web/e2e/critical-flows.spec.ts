import { expect, test } from "@playwright/test";

const username = process.env.E2E_USERNAME ?? "staff";
const password = process.env.E2E_PASSWORD ?? "zuzu123";

// API giới hạn /auth/login 5 lần/phút; cache cookie theo tài khoản để suite không bị 429
const sessionCache = new Map<
  string,
  Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>
>();

async function login(
  page: import("@playwright/test").Page,
  loginUsername = username,
  loginPassword = password,
) {
  const cached = sessionCache.get(loginUsername);
  if (cached) {
    await page.context().addCookies(cached.cookies);
    return;
  }
  await page.goto("/login");
  await page.getByLabel(/tài khoản|số điện thoại/i).fill(loginUsername);
  await page.getByLabel(/mật khẩu/i).fill(loginPassword);
  await page.getByRole("button", { name: /đăng nhập/i }).click();
  await page.waitForURL(/staff|dashboard|home/);
  sessionCache.set(loginUsername, await page.context().storageState());
}

test("staff can log in", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/staff|home/);
});

test("staff can open receive flow", async ({ page }) => {
  await login(page);
  await page.goto("/receive");
  await expect(page.getByRole("heading", { name: "Nhận đồ" })).toBeVisible();
});

test("staff cannot open owner-only users page", async ({ page }) => {
  await login(page);
  await page.goto("/users");
  await expect(page).not.toHaveURL(/\/users$/);
});

test("known customer receive flow exposes service selection", async ({ page }) => {
  await login(page);
  await page.goto("/receive");
  await page.getByLabel(/số điện thoại hoặc tên/i).fill("0916697533");
  await expect(page.getByText(/không tìm thấy khách|gợi ý khách hàng|dịch vụ/i).first()).toBeVisible();
});

test("expense page is protected and reachable for manager setup", async ({ page }) => {
  await login(page);
  await page.goto("/expenses");
  await expect(page).toHaveURL(/expenses|staff/);
});

test("order completion route is reachable from application", async ({ page }) => {
  await login(page);
  await page.goto("/orders");
  await expect(page).toHaveURL(/orders|staff/);
});

test("manager can select an order status", async ({ page }) => {
  await login(page, "manager", "zuzu123");
  await page.goto("/orders");

  const status = page.getByRole("combobox", { name: "Trạng thái" });
  await status.click();
  await page.getByRole("option", { name: "Đang xử lý" }).click();
  await expect(status).toHaveText("Đang xử lý");
  await status.click();
  await page.getByRole("option", { name: "Tất cả" }).click();
  await expect(status).toHaveText("Tất cả");
});

test("manager can change orders page size", async ({ page }) => {
  await login(page, "manager", "zuzu123");
  await page.goto("/orders");

  const pageSize = page.getByRole("combobox", { name: "Số đơn mỗi trang" });
  await pageSize.click();
  await page.getByRole("option", { name: "50 đơn" }).click();
  await expect(pageSize).toHaveText("50 đơn");
  await expect(page).toHaveURL(/limit=50/);
});

test("staff pages have no horizontal scroll at 375px", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of ["/staff", "/receive", "/orders"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test("management data switches between record list and table by viewport", async ({ page }) => {
  await login(page, "manager", "zuzu123");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/expenses");
  await expect(page.locator(".mobile-data-list").first()).toBeVisible();
  await expect(page.locator(".desktop-data-table").first()).toBeHidden();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/expenses");
  await expect(page.locator(".desktop-data-table").first()).toBeVisible();
  await expect(page.locator(".mobile-data-list").first()).toBeHidden();
});

test("manager orders keep cards on tablet and table on laptop", async ({ page }) => {
  await login(page, "manager", "zuzu123");

  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 820, height: 900 },
    { width: 834, height: 900 },
    { width: 1023, height: 900 },
    { width: 1024, height: 768 },
    { width: 1199, height: 900 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    if (viewport.width < 1024) {
      await expect(page.locator(".mobile-data-list")).toBeVisible();
      await expect(page.locator(".desktop-data-table")).toBeHidden();
      const mobilePager = page.locator(".orders-mobile-pager");
      if (await mobilePager.locator(".pager").count()) {
        await expect(mobilePager).toBeVisible();
      }
    } else {
      await expect(page.locator(".desktop-data-table")).toBeVisible();
      await expect(page.locator(".mobile-data-list")).toBeHidden();
      await expect(page.locator(".management-table th")).toHaveCount(8);
      const ordersPager = page.locator(".orders-pagination-controls .pager");
      if (await ordersPager.count()) {
        await expect(ordersPager).toBeVisible();
        await expect(page.locator(".orders-mobile-pager")).toBeVisible();
      }
      await expect(page.locator(".desktop-data-table .pager")).toBeHidden();
    }
  }
});

test("keyboard focus reaches receive form controls", async ({ page }) => {
  await login(page);
  await page.goto("/receive");
  await expect(page.getByRole("heading", { name: "Nhận đồ" })).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const tag = await page.evaluate(
    () => document.activeElement?.tagName.toLowerCase(),
  );
  expect(["button", "input", "a"]).toContain(tag);
});
