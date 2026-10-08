import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ReceivePage } from "./ReceivePage";

const apiMock = vi.fn();
let customerLookupMode: "error" | "empty" = "empty";
let servicesMode: "error" | "empty" = "empty";

vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReceivePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  customerLookupMode = "empty";
  servicesMode = "empty";
  apiMock.mockImplementation(async (path: string) => {
    if (path === "/services") {
      if (servicesMode === "error") throw new Error("service unavailable");
      return [];
    }
    if (path.startsWith("/customers/search")) {
      if (customerLookupMode === "error") throw new Error("lookup unavailable");
      return [];
    }
    throw new Error(`Unexpected API path: ${path}`);
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ReceivePage", () => {
  it("keeps customer API errors separate from an empty result", async () => {
    customerLookupMode = "error";
    renderPage();

    fireEvent.change(screen.getByLabelText("Số điện thoại hoặc tên"), {
      target: { value: "0916697533" },
    });

    await waitFor(() =>
      expect(screen.getByText("Không tìm được khách lúc này.")).toBeTruthy(),
    );
    expect(screen.queryByText("Không có khách phù hợp")).toBeNull();
    expect(screen.queryByText("+ Thêm khách mới")).toBeNull();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
  });

  it("offers a new customer only after a successful empty lookup", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Số điện thoại hoặc tên"), {
      target: { value: "0916697533" },
    });

    await waitFor(() =>
      expect(screen.getByText("Không có khách phù hợp")).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "+ Thêm khách mới" })).toBeTruthy();
  });

  it("shows an empty service state and recovers from a service error", async () => {
    renderPage();
    expect(
      await screen.findByText("Chưa có dịch vụ nào được cấu hình."),
    ).toBeTruthy();

    cleanup();
    servicesMode = "error";
    renderPage();
    expect(
      await screen.findByText("Không tải được danh sách dịch vụ."),
    ).toBeTruthy();

    servicesMode = "empty";
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(
      await screen.findByText("Chưa có dịch vụ nào được cấu hình."),
    ).toBeTruthy();
  });

  it("allows entering a freeform note without quick note choices", async () => {
    renderPage();
    await screen.findByText("Chưa có dịch vụ nào được cấu hình.");

    const note = screen.getByLabelText("Nội dung lưu ý");
    fireEvent.change(note, { target: { value: "Đồ dễ phai màu" } });
    expect((note as HTMLTextAreaElement).value).toBe("Đồ dễ phai màu");
    expect(screen.queryByRole("button", { name: "Không có" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Giặt riêng" })).toBeNull();
    expect(screen.getByRole("button", { name: "Sáng" })).toBeTruthy();
  });
});
