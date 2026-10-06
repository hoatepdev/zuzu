import { describe, expect, it } from "vitest";
import { calendarDate, dueDateResult, isPhoneInput, normalizePhone } from "./receive-utils";
import { formatMoney, quickAmount } from "../components/common";

describe("receive utilities", () => {
  it("normalizes Vietnamese phone inputs", () => {
    expect(normalizePhone("+84 916 697 533")).toBe("0916697533");
    expect(isPhoneInput("0916697533")).toBe(true);
    expect(isPhoneInput("09xx")).toBe(false);
    expect(isPhoneInput("091669753")).toBe(false);
  });

  it("validates calendar dates", () => {
    expect(calendarDate(2026, 2, 28)).toBe("2026-02-28");
    expect(calendarDate(2026, 2, 29)).toBeNull();
    expect(calendarDate(2026, 12, 31)).toBe("2026-12-31");
  });

  it("parses due dates without changing current rules", () => {
    expect(dueDateResult("31/12/2026", "2026-10-06")).toMatchObject({ value: "2026-12-31" });
    expect(dueDateResult("3112", "2026-10-06")).toMatchObject({ value: "2026-12-31" });
    expect(dueDateResult("7", "2026-10-06")).toMatchObject({ value: "2026-10-07" });
    expect(dueDateResult("31/02/2026", "2026-10-06")).toMatchObject({ error: "Ngày hẹn trả không hợp lệ" });
    expect(dueDateResult("01/10/2026", "2026-10-06")).toMatchObject({ error: "Ngày hẹn trả phải là hôm nay hoặc ngày sau đó" });
  });

  it("formats money and applies quick amount behavior", () => {
    expect(quickAmount(30)).toBe(30000);
    expect(quickAmount(999)).toBe(999000);
    expect(quickAmount(1000)).toBe(1000);
    expect(formatMoney(30000)).toBe("30.000đ");
  });
});
