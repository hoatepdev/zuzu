import { describe, expect, it } from "vitest";
import { isPhoneInput, normalizePhone } from "./receive-utils";
import { formatMoney, quickAmount } from "../components/common";

describe("receive utilities", () => {
  it("normalizes Vietnamese phone inputs", () => {
    expect(normalizePhone("+84 916 697 533")).toBe("0916697533");
    expect(isPhoneInput("0916697533")).toBe(true);
    expect(isPhoneInput("09xx")).toBe(false);
    expect(isPhoneInput("091669753")).toBe(false);
  });

  it("formats money and applies quick amount behavior", () => {
    expect(quickAmount(30)).toBe(30000);
    expect(quickAmount(999)).toBe(999000);
    expect(quickAmount(1000)).toBe(1000);
    expect(formatMoney(30000)).toBe("30.000đ");
  });
});
