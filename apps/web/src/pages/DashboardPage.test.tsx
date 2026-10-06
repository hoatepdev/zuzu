import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage, presetRange } from "./DashboardPage";

vi.mock("../components/charts/RevenueChart", () => ({
  RevenueChart: (props: { data: unknown[] }) => (
    <div data-testid="revenue-chart" data-points={JSON.stringify(props.data)} />
  ),
}));

const dashboardPayload = {
  revenue: "1250000",
  expenses: "320000",
  estimatedProfit: "930000",
  orders: 3,
  kg: "4.5",
  processing: 1,
  ready: 0,
  cash: "250000",
  bankTransfer: "1000000",
  unpaid: "0",
  newCustomers: 1,
  returningCustomers: 2,
  daily: [
    { date: "2026-10-05", revenue: "1250000", expenses: "320000", estimatedProfit: "930000", orders: 2, kg: "3" },
    { date: "2026-10-06", revenue: "0", expenses: "0", estimatedProfit: "0", orders: 0, kg: "0" },
  ],
  previous: { revenue: "0", expenses: "0", estimatedProfit: "0", orders: 0 },
};

// 2026-10-06T03:00Z = 10:00 VN → "today" is 2026-10-06 in Vietnam
const NOW = new Date("2026-10-06T03:00:00Z");

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const stubDashboardApi = () =>
  vi.fn(async () => new Response(JSON.stringify(dashboardPayload), { status: 200 }));

const lastCallUrl = () => {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
  return String(calls[calls.length - 1]?.[0]);
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("presetRange", () => {
  it("computes inclusive Vietnam-day presets", () => {
    expect(presetRange("today", NOW)).toEqual({ today: "2026-10-06", from: "2026-10-06", to: "2026-10-06" });
    expect(presetRange("7d", NOW).from).toBe("2026-09-30");
    expect(presetRange("30d", NOW).from).toBe("2026-09-07");
    expect(presetRange("month", NOW)).toMatchObject({ from: "2026-10-01", to: "2026-10-06" });
  });
});

describe("DashboardPage", () => {
  it("queries today by default and feeds exact daily points to the chart", async () => {
    vi.stubGlobal("fetch", stubDashboardApi());

    renderPage();

    await waitFor(() => expect(screen.getByTestId("revenue-chart")).toBeTruthy());
    expect(lastCallUrl()).toContain("from=2026-10-06&to=2026-10-06");
    // exact API daily, zero-valued day included, nothing invented
    expect(JSON.parse(screen.getByTestId("revenue-chart").dataset.points!)).toEqual([
      { date: "2026-10-05", revenue: 1250000, expenses: 320000 },
      { date: "2026-10-06", revenue: 0, expenses: 0 },
    ]);
    expect(screen.getAllByText("Kỳ trước chưa có dữ liệu").length).toBeGreaterThan(0);
  });

  it("applies the 7-day and 30-day presets", async () => {
    vi.stubGlobal("fetch", stubDashboardApi());

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "7 ngày" }));
    await waitFor(() => expect(lastCallUrl()).toContain("from=2026-09-30&to=2026-10-06"));
    expect(screen.getByRole("button", { name: "7 ngày" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "30 ngày" }));
    await waitFor(() => expect(lastCallUrl()).toContain("from=2026-09-07&to=2026-10-06"));
  });

  it("clears the preset on custom range", async () => {
    vi.stubGlobal("fetch", stubDashboardApi());

    renderPage();

    fireEvent.change(screen.getByLabelText(/Từ/i), { target: { value: "2026-10-02" } });

    await waitFor(() => expect(lastCallUrl()).toContain("from=2026-10-02&to=2026-10-06"));
    for (const label of ["Hôm nay", "7 ngày", "30 ngày", "Tháng này"]) {
      expect(screen.getByRole("button", { name: label }).getAttribute("aria-pressed")).not.toBe("true");
    }
  });
});
