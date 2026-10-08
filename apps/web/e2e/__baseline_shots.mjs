import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:5173";
const API = process.env.API ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "/tmp/zuzu-shots";
const STAGE = process.env.STAGE ?? "before";
const USERS = {
  staff: { usernameOrPhone: "staff", password: "zuzu123" },
  manager: { usernameOrPhone: "manager", password: "zuzu123" },
};

const VIEWPORTS = [
  { name: "w375", width: 375, height: 812 },
  { name: "w430", width: 430, height: 932 },
  { name: "w768", width: 768, height: 1024 },
  { name: "w834", width: 834, height: 900 },
  { name: "w1023", width: 1023, height: 900 },
  { name: "w1024", width: 1024, height: 768 },
  { name: "w1199", width: 1199, height: 900 },
  { name: "w1280", width: 1280, height: 800 },
  { name: "w1440", width: 1440, height: 900 },
];

async function login(page, user) {
  const res = await page.request.post(`${API}/auth/login`, { data: user });
  if (!res.ok()) throw new Error(`login failed for ${user.usernameOrPhone}: ${res.status()}`);
  const cookies = res.headers()["set-cookie"] ?? [];
  const list = Array.isArray(cookies) ? cookies : [cookies];
  await page.context().addCookies(
    list
      .filter(Boolean)
      .map((c) => {
        const [nameValue] = c.split(";");
        const idx = nameValue.indexOf("=");
        return {
          name: nameValue.slice(0, idx),
          value: nameValue.slice(idx + 1),
          url: BASE,
        };
      }),
  );
}

async function shot(page, route, file, { fullPage = true } = {}) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: file, fullPage });
  console.log(`shot ${path.relative(OUT, file)}`);
}

const run = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  // Staff mobile/tablet: home, receive, scan, orders
  const staff = await browser.newContext({ viewport: VIEWPORTS[0] });
  const staffPage = await staff.newPage();
  await login(staffPage, USERS.staff);
  await staffPage.goto(`${BASE}/staff`, { waitUntil: "networkidle" });
  await staffPage.waitForTimeout(600);
  await staffPage.screenshot({ path: `${OUT}/${STAGE}-staff-home-w375.png`, fullPage: true });
  console.log("shot staff-home w375");
  await shot(staffPage, "/receive", `${OUT}/${STAGE}-receive-w375.png`);
  await shot(staffPage, "/scan", `${OUT}/${STAGE}-scan-w375.png`, { fullPage: false });
  await shot(staffPage, "/orders", `${OUT}/${STAGE}-orders-w375.png`);
  await staff.close();

  // Manager: dashboard + orders responsive sweep + order detail
  const mgr = await browser.newContext({ viewport: VIEWPORTS[4] });
  const mgrPage = await mgr.newPage();
  await login(mgrPage, USERS.manager);
  await shot(mgrPage, "/dashboard", `${OUT}/${STAGE}-dashboard-w1440.png`);
  for (const vp of VIEWPORTS.slice(2)) {
    await mgrPage.setViewportSize({ width: vp.width, height: vp.height });
    await shot(mgrPage, "/orders", `${OUT}/${STAGE}-orders-mgr-${vp.name}.png`);
  }

  // Grab a real order code for detail + complete
  const api = await mgrPage.request.get(`${API}/orders?limit=1`);
  const detailCode = (await api.json())?.[0]?.code;
  if (detailCode) {
    await shot(mgrPage, `/orders/${detailCode}`, `${OUT}/${STAGE}-order-detail-w375.png`, { fullPage: true });
  } else {
    console.log("WARN: no order code found for detail shot");
  }
  await mgr.close();

  // Order detail + complete on staff mobile
  if (detailCode) {
    const ctx = await browser.newContext({ viewport: VIEWPORTS[0] });
    const page = await ctx.newPage();
    await login(page, USERS.staff);
    await shot(page, `/orders/${detailCode}`, `${OUT}/${STAGE}-order-detail-w375.png`);
    await shot(page, `/orders/${detailCode}/complete`, `${OUT}/${STAGE}-complete-w375.png`);
    await ctx.close();
  }

  // Dashboard responsive sweep
  const ctx2 = await browser.newContext({ viewport: VIEWPORTS[4] });
  const p2 = await ctx2.newPage();
  await login(p2, USERS.manager);
  for (const vp of VIEWPORTS.slice(0, 4)) {
    await p2.setViewportSize({ width: vp.width, height: vp.height });
    await shot(p2, "/dashboard", `${OUT}/${STAGE}-dashboard-${vp.name}.png`);
  }
  await ctx2.close();

  await browser.close();
  console.log("DONE");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
