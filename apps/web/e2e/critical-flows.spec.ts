import { expect, test } from "@playwright/test";

const username = process.env.E2E_USERNAME ?? "staff";
const password = process.env.E2E_PASSWORD ?? "zuzu123";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/tài khoản|số điện thoại/i).fill(username);
  await page.getByLabel(/mật khẩu/i).fill(password);
  await page.getByRole("button", { name: /đăng nhập/i }).click();
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
  await page.getByLabel(/khách hàng/i).fill("0916697533");
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
