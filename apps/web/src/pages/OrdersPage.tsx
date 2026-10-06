import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Order, OrderStatus, Page } from "../api/types";
import {
  Banner,
  EmptyState,
  Money,
  OrderCard,
  PageHeader,
  Pager,
  QuickChoice,
  Spinner,
  StatusBadge,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
];
const staffStatusOptions = [
  { value: "", label: "Tất cả" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "READY_FOR_PICKUP", label: "Chờ lấy" },
];
export function OrdersPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const management = session.data?.role !== "STAFF";
  const initialStatus = searchParams.get("status") as OrderStatus | null;
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") ?? "",
  );
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [status, setStatus] = useState<OrderStatus | undefined>(() =>
    initialStatus && statusOptions.some((option) => option.value === initialStatus)
      ? initialStatus
      : undefined,
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? "";
    const nextStatus = searchParams.get("status") as OrderStatus | null;
    setSearchInput((current) => (current === nextSearch ? current : nextSearch));
    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setStatus((current) => (current === nextStatus ? current : nextStatus ?? undefined));
  }, [searchParams]);

  const updateStaffFilter = (next: { search?: string; status?: OrderStatus }) => {
    const params = new URLSearchParams(searchParams);
    if (next.search !== undefined) {
      next.search ? params.set("search", next.search) : params.delete("search");
    }
    if (next.status !== undefined) {
      next.status ? params.set("status", next.status) : params.delete("status");
    }
    setSearchParams(params, { replace: true });
    setPage(1);
  };
  const query = new URLSearchParams({ page: String(page), limit: "20" });
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
    ],
    queryFn: () =>
      management
        ? api<Page<Order>>(`/orders/page?${query}`)
        : api<Order[]>(`/orders?${new URLSearchParams({
            ...(search ? { search } : {}),
            ...(status ? { status } : {}),
          })}`),
  });
  const items = management
    ? (orders.data as Page<Order> | undefined)?.items
    : (orders.data as Order[] | undefined);

  return (
    <>
      <PageHeader>Đơn hàng</PageHeader>
      <div className="filter-bar">
        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (management) {
              setSearch(searchInput);
              setPage(1);
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
        {!management && (
          <QuickChoice
            className="staff-status-filter"
            options={staffStatusOptions}
            value={status ?? ""}
            onChange={(value) => updateStaffFilter({ status: (value || undefined) as OrderStatus | undefined })}
          />
        )}
        {management && (
          <>
            <Select
              value={status ?? "ALL"}
              onValueChange={(value) => {
                setStatus(
                  value === "ALL" ? undefined : (value as OrderStatus),
                );
                setPage(1);
              }}
            >
              <SelectTrigger
                className="h-13.5 w-full text-base font-semibold"
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
            <div className="range-picker">
              <Label>
                <span>Từ ngày</span>
                <Input
                  type="date"
                  className="date-input"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    setPage(1);
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
                    setTo(event.target.value);
                    setPage(1);
                  }}
                />
              </Label>
            </div>
          </>
        )}
      </div>
      {orders.error && (
        <Banner
          className="list-card"
          tone="error"
          title={orders.error.message}
        />
      )}
      {orders.error ? null : orders.isLoading ? (
        <div className="center">
          <Spinner className="size-6" />
        </div>
      ) : items?.length ? (
        <>
          {management && (
            <div className="table-wrap desktop-data-table">
              <Table className="management-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>SĐT</TableHead>
                    <TableHead>Khối lượng</TableHead>
                    <TableHead>Thành tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Nhận lúc</TableHead>
                    <TableHead>Nhân viên</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((order) => (
                    <TableRow
                      key={order.id}
                      className="row-click"
                      role="link"
                      aria-label={`Xem đơn ${order.code}`}
                      tabIndex={0}
                      onClick={() => navigate(`/orders/${order.code}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/orders/${order.code}`);
                        }
                      }}
                    >
                      <TableCell>
                        <strong className="order-code">{order.code}</strong>
                      </TableCell>
                      <TableCell>{order.customer?.name ?? "Chưa xác định"}</TableCell>
                      <TableCell>{order.customer?.phone ?? "—"}</TableCell>
                      <TableCell>{order.weight ? `${order.weight} kg` : "—"}</TableCell>
                      <TableCell>
                        <Money value={order.total} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleString("vi-VN")}</TableCell>
                      <TableCell>{order.createdBy.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pager
                page={page}
                total={(orders.data as Page<Order>).total}
                onChange={setPage}
              />
            </div>
          )}
          <div className={`order-list ${management ? "mobile-data-list" : ""}`}>
            {items.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          description={
            search
              ? `Không tìm thấy đơn “${search}”`
              : status
                ? `Không có đơn ${status === "PROCESSING" ? "đang xử lý" : status === "READY_FOR_PICKUP" ? "chờ lấy" : "phù hợp"}`
                : "Chưa có đơn"
          }
        />
      )}
    </>
  );
}
