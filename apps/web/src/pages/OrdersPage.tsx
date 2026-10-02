import { useQuery } from "@tanstack/react-query";
import { Alert, DatePicker, Input, Select, Spin, Table } from "antd";
import type { Dayjs } from "dayjs";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Order, OrderStatus, Page } from "../api/types";
import {
  EmptyState,
  Money,
  OrderCard,
  PageHeader,
  StatusBadge,
} from "../components/common";
import { useSession } from "../session";

const statusOptions = [
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "READY_FOR_PICKUP", label: "Chờ khách lấy" },
  { value: "COMPLETED", label: "Đã trả" },
  { value: "CANCELLED", label: "Đã huỷ" },
];
export function OrdersPage() {
  const session = useSession();
  const navigate = useNavigate();
  const management = session.data?.role !== "STAFF";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus>();
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) query.set("search", search);
  if (status) query.set("status", status);
  if (dates?.[0]) query.set("from", dates[0].format("YYYY-MM-DD"));
  if (dates?.[1]) query.set("to", dates[1].format("YYYY-MM-DD"));
  const orders = useQuery<Order[] | Page<Order>>({
    queryKey: [
      "orders",
      management ? "page" : "list",
      search,
      status,
      dates?.[0]?.format("YYYY-MM-DD"),
      dates?.[1]?.format("YYYY-MM-DD"),
      page,
    ],
    queryFn: () =>
      management
        ? api<Page<Order>>(`/orders/page?${query}`)
        : api<Order[]>(`/orders?search=${encodeURIComponent(search)}`),
  });
  const items = management
    ? (orders.data as Page<Order> | undefined)?.items
    : (orders.data as Order[] | undefined);

  return (
    <>
      <PageHeader>Đơn hàng</PageHeader>
      <div className="filter-bar">
        <Input.Search
          size="large"
          placeholder="Mã đơn, SĐT, tên khách"
          allowClear
          enterButton="Tìm"
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        {management && (
          <>
            <Select
              size="large"
              allowClear
              placeholder="Trạng thái"
              options={statusOptions}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />
            <DatePicker.RangePicker
              size="large"
              format="DD/MM/YYYY"
              value={dates}
              onChange={(value) => {
                setDates(value);
                setPage(1);
              }}
            />
          </>
        )}
      </div>
      {orders.error && (
        <Alert
          className="list-card"
          type="error"
          message={orders.error.message}
          showIcon
        />
      )}
      {orders.isLoading ? (
        <div className="center">
          <Spin />
        </div>
      ) : items?.length ? (
        <>
          {management && (
            <Table<Order>
              className="desktop-data-table"
              rowKey="id"
              dataSource={items}
              onRow={(order) => ({
                onClick: () => navigate(`/orders/${order.code}`),
                onKeyDown: (event) => {
                  if (event.key === "Enter") navigate(`/orders/${order.code}`);
                },
                tabIndex: 0,
              })}
              pagination={{
                current: page,
                total: (orders.data as Page<Order>).total,
                pageSize: 20,
                onChange: setPage,
                showSizeChanger: false,
              }}
              scroll={{ x: 1100 }}
              columns={[
                {
                  title: "Mã đơn",
                  dataIndex: "code",
                  render: (value) => (
                    <strong className="order-code">{value}</strong>
                  ),
                },
                {
                  title: "Khách hàng",
                  render: (_, row) => row.customer?.name ?? "Chưa xác định",
                },
                {
                  title: "SĐT",
                  render: (_, row) => row.customer?.phone ?? "—",
                },
                {
                  title: "Khối lượng",
                  render: (_, row) => (row.weight ? `${row.weight} kg` : "—"),
                },
                {
                  title: "Thành tiền",
                  dataIndex: "total",
                  render: (value) => <Money value={value} />,
                },
                {
                  title: "Trạng thái",
                  dataIndex: "status",
                  render: (value) => <StatusBadge status={value} />,
                },
                {
                  title: "Nhận lúc",
                  dataIndex: "createdAt",
                  render: (value) => new Date(value).toLocaleString("vi-VN"),
                },
                { title: "Nhân viên", render: (_, row) => row.createdBy.name },
              ]}
            />
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
            search ? `Không tìm thấy đơn “${search}”` : "Chưa có đơn"
          }
        />
      )}
    </>
  );
}
