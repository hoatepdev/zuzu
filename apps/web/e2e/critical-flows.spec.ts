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
