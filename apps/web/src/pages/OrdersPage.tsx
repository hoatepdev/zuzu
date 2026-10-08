import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Order, OrderStatus, Page } from "../api/types";
import { DataTable } from "../components/data-table/DataTable";
import {
  Banner,
  EmptyState,
  ListSkeleton,
  Money,
  OrderCard,
  PageHeader,
  Pager,
  QuickChoice,
  StatusBadge,
  TableSkeleton,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "../session";

const statusOptions = [
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "READY_FOR_PICKUP", label: "Chờ khách lấy" },
  { value: "COMPLETED", label: "Đã trả" },
  { value: "CANCELLED", label: "Đã huỷ" },
] as const;
const staffStatusOptions = [
  { value: "", label: "Tất cả" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "READY_FOR_PICKUP", label: "Chờ lấy" },
];
const pageSizeOptions = [10, 20, 50, 100];

const isOrderStatus = (value: string | null): value is OrderStatus =>
  value != null && statusOptions.some((option) => option.value === value);

const readPage = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const readPageSize = (value: string | null) => {
  const pageSize = Number(value);
  return pageSizeOptions.includes(pageSize) ? pageSize : 10;
};

export function OrdersPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const management = session.data?.role !== "STAFF";
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") ?? "",
  );
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [status, setStatus] = useState<OrderStatus | undefined>(() => {
    const value = searchParams.get("status");
    return isOrderStatus(value) ? value : undefined;
  });
  const [from, setFrom] = useState(() => searchParams.get("from") ?? "");
  const [to, setTo] = useState(() => searchParams.get("to") ?? "");
  const [page, setPage] = useState(() => readPage(searchParams.get("page")));
  const [pageSize, setPageSize] = useState(() =>
    readPageSize(searchParams.get("limit")),
  );

  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? "";
    const nextStatusValue = searchParams.get("status");
    const nextStatus = isOrderStatus(nextStatusValue)
      ? nextStatusValue
      : undefined;
    const nextFrom = searchParams.get("from") ?? "";
    const nextTo = searchParams.get("to") ?? "";
    const nextPage = readPage(searchParams.get("page"));
    const nextPageSize = readPageSize(searchParams.get("limit"));

    setSearchInput((current) =>
      current === nextSearch ? current : nextSearch,
    );
    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setStatus((current) => (current === nextStatus ? current : nextStatus));
    setFrom((current) => (current === nextFrom ? current : nextFrom));
    setTo((current) => (current === nextTo ? current : nextTo));
    setPage((current) => (current === nextPage ? current : nextPage));
    setPageSize((current) =>
      current === nextPageSize ? current : nextPageSize,
    );
  }, [searchParams]);

  const updateUrl = (next: {
    search?: string;
    status?: OrderStatus;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams(searchParams);
    const update = (key: string, value: string | undefined) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };

    if ("search" in next) update("search", next.search);
    if ("status" in next) update("status", next.status);
    if ("from" in next) update("from", next.from);
    if ("to" in next) update("to", next.to);
    if (next.page !== undefined) {
      next.page > 1
        ? params.set("page", String(next.page))
        : params.delete("page");
    }
    if (next.limit !== undefined) {
      next.limit === 10
        ? params.delete("limit")
        : params.set("limit", String(next.limit));
    }

    setSearchParams(params, { replace: true });
  };

  const updateStaffFilter = (next: {
    search?: string;
    status?: OrderStatus;
  }) => {
    updateUrl(next);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus(undefined);
    setFrom("");
    setTo("");
    setPage(1);
    const params = new URLSearchParams(searchParams);
    ["search", "status", "from", "to", "page"].forEach((key) =>
      params.delete(key),
    );
    setSearchParams(params, { replace: true });
  };

  const query = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
  });
  if (search) query.set("search", search);
  if (status) query.set("status", status);
  if (from) query.set("from", from);
  if (to) query.set("to", to);

  const orders = useQuery<Order[] | Page<Order>>({
    queryKey: [
      "orders",
      management ? "page" : "list",
      search,
      status,
      from,
      to,
      page,
      pageSize,
    ],
    queryFn: () =>
      management
        ? api<Page<Order>>(`/orders/page?${query}`)
        : api<Order[]>(
            `/orders?${new URLSearchParams({
              ...(search ? { search } : {}),
              ...(status ? { status } : {}),
            })}`,
          ),
  });
  const items = management
    ? (orders.data as Page<Order> | undefined)?.items
    : (orders.data as Order[] | undefined);
  const total = management
    ? (orders.data as Page<Order> | undefined)?.total
    : items?.length;
  const hasFilters = Boolean(search || status || from || to);

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "code",
      header: "Mã đơn",
      enableSorting: false,
      cell: ({ row }) => (
        <strong className="order-code">{row.original.code}</strong>
      ),
    },
    {
      id: "customer",
      accessorFn: (row) => row.customer?.name ?? "Chưa xác định",
      header: "Khách hàng",
      enableSorting: false,
    },
    {
      id: "phone",
      accessorFn: (row) => row.customer?.phone ?? "—",
      header: "SĐT",
      enableSorting: false,
    },
    {
      accessorKey: "weight",
      header: "Khối lượng",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.weight ? `${row.original.weight} kg` : "—",
    },
    {
      accessorKey: "total",
      header: "Thành tiền",
      enableSorting: false,
      cell: ({ row }) => <Money value={row.original.total} />,
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Nhận lúc",
      enableSorting: false,
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleString("vi-VN"),
    },
    {
      id: "createdBy",
      accessorFn: (row) => row.createdBy.name,
      header: "Nhân viên",
      enableSorting: false,
    },
  ];

  return (
    <div className="orders-page">
      <PageHeader
        sub={
          management
            ? "Tra cứu, lọc và mở đơn để tiếp tục xử lý."
            : "Tìm nhanh đơn cần xử lý hoặc trả đồ cho khách."
        }
      >
        Đơn hàng
      </PageHeader>

      <section
        className="filter-bar orders-filter-bar"
        aria-label="Tra cứu đơn hàng"
      >
        <div className="orders-filter-heading">
          <strong>Tra cứu đơn hàng</strong>
          <span>Mã đơn, số điện thoại hoặc tên khách</span>
        </div>
        <form
          className="search-form orders-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (management) {
              setSearch(searchInput);
              setPage(1);
              updateUrl({ search: searchInput, page: 1 });
            } else {
              updateStaffFilter({ search: searchInput });
            }
          }}
        >
          <Input
            className="input-lg"
            placeholder="Mã đơn, SĐT, tên khách"
            aria-label="Tìm đơn hàng"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" size="lg">
            Tìm đơn
          </Button>
        </form>
        <div className="orders-filter-controls">
          {!management && (
            <QuickChoice
              className="staff-status-filter"
              options={staffStatusOptions}
              value={status ?? ""}
              ariaLabel="Lọc theo trạng thái"
              onChange={(value) =>
                updateStaffFilter({
                  status: (value || undefined) as OrderStatus | undefined,
                })
              }
            />
          )}
          {management && (
            <>
              <div className="orders-status-control">
                <Label htmlFor="orders-status">Trạng thái</Label>
                <Select
                  value={status ?? "ALL"}
                  onValueChange={(value) => {
                    const nextStatus =
                      value === "ALL" ? undefined : (value as OrderStatus);
                    setStatus(nextStatus);
                    setPage(1);
                    updateUrl({ status: nextStatus, page: 1 });
                  }}
                >
                  <SelectTrigger
                    id="orders-status"
                    className="orders-status-trigger h-13.5 w-full text-base font-semibold"
                    aria-label="Trạng thái"
                  >
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="range-picker orders-range-picker">
                <Label>
                  <span>Từ ngày</span>
                  <Input
                    type="date"
                    className="date-input"
                    value={from}
                    max={to || undefined}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFrom(value);
                      setPage(1);
                      updateUrl({ from: value, page: 1 });
                    }}
                  />
                </Label>
                <Label>
                  <span>Đến ngày</span>
                  <Input
                    type="date"
                    className="date-input"
                    value={to}
                    min={from || undefined}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTo(value);
                      setPage(1);
                      updateUrl({ to: value, page: 1 });
                    }}
                  />
                </Label>
              </div>
            </>
          )}
        </div>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            className="orders-clear-filter"
            onClick={clearFilters}
          >
            Xoá bộ lọc
          </Button>
        )}
      </section>

      {orders.error && (
        <Banner
          className="list-card orders-error"
          tone="error"
          title={orders.error.message}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void orders.refetch()}
            >
              Thử lại
            </Button>
          }
        />
      )}
      {orders.error ? null : orders.isLoading ? (
        management ? (
          <>
            <div className="desktop-data-table">
              <TableSkeleton cols={8} />
            </div>
            <div className="mobile-data-list">
              <ListSkeleton rows={5} />
            </div>
          </>
        ) : (
          <ListSkeleton rows={5} />
        )
      ) : items?.length ? (
        <>
          <div className="orders-results-meta">
            <div>
              <h2>Kết quả tra cứu</h2>
              <p>
                {total ?? items.length} đơn
                {management ? " · mới nhất trước" : " · mở đơn để tiếp tục"}
              </p>
            </div>
            {hasFilters && (
              <span className="orders-filter-note">Đang áp dụng bộ lọc</span>
            )}
          </div>
          {management && (
            <div className="desktop-data-table">
              <DataTable
                columns={columns}
                data={items}
                manualPagination
                manualSorting
                page={page}
                pageSize={pageSize}
                total={(orders.data as Page<Order>).total}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  updateUrl({ page: nextPage });
                }}
                onRowClick={(order) => navigate(`/orders/${order.code}`)}
              />
            </div>
          )}
          <div className={`order-list ${management ? "mobile-data-list" : ""}`}>
            {items.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
          {management && (
            <div className="orders-pagination-controls">
              <div className="orders-mobile-pager">
                <Pager
                  page={page}
                  total={(orders.data as Page<Order>).total}
                  limit={pageSize}
                  onChange={(nextPage) => {
                    setPage(nextPage);
                    updateUrl({ page: nextPage });
                  }}
                />
              </div>
              <div className="orders-page-size-control">
                <Label htmlFor="orders-page-size">Số đơn/trang</Label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    const nextPageSize = Number(value);
                    setPageSize(nextPageSize);
                    setPage(1);
                    updateUrl({ limit: nextPageSize, page: 1 });
                  }}
                >
                  <SelectTrigger
                    id="orders-page-size"
                    className="orders-page-size-trigger"
                    aria-label="Số đơn mỗi trang"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option} đơn
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          description={
            search
              ? `Không tìm thấy đơn “${search}”`
              : from || to
                ? "Không có đơn trong khoảng ngày đã chọn"
                : status
                  ? `Không có đơn ${status === "PROCESSING" ? "đang xử lý" : status === "READY_FOR_PICKUP" ? "chờ lấy" : status === "COMPLETED" ? "đã trả" : "đã huỷ"}`
                  : "Chưa có đơn"
          }
          action={
            hasFilters ? (
              <Button type="button" variant="outline" onClick={clearFilters}>
                Xoá bộ lọc
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
