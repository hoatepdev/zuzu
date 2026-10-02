import { Radio } from "antd";
import { Link } from "react-router-dom";
import { Order, OrderStatus } from "../api/types";

const statusMeta: Record<OrderStatus, { label: string }> = {
  PROCESSING: { label: "Đang xử lý" },
  READY_FOR_PICKUP: { label: "Chờ khách lấy" },
  COMPLETED: { label: "Đã trả" },
  CANCELLED: { label: "Đã huỷ" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status-badge st-${status}`}>
      {statusMeta[status].label}
    </span>
  );
}

export function Money({
  value,
  className = "",
}: {
  value?: string | number;
  className?: string;
}) {
  return (
    <span className={`money ${className}`.trim()}>
      {value == null ? "—" : `${Number(value).toLocaleString("vi-VN")}đ`}
    </span>
  );
}

export function ZuzuMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="zuzu-mark"
    >
      <rect width="48" height="48" rx="14" fill="#0E7C66" />
      <circle cx="18.5" cy="18" r="7.8" fill="#FFFDF6" />
      <circle cx="32" cy="27" r="5" fill="#9FE3C6" />
      <circle cx="21.5" cy="33.5" r="3" fill="#5BC49C" />
    </svg>
  );
}

export function ZuzuWordmark({
  light = false,
  sub = "Laundry OS",
}: {
  light?: boolean;
  sub?: string;
}) {
  return (
    <span className={`wordmark ${light ? "wordmark-light" : ""}`.trim()}>
      <ZuzuMark />
      <span className="wordmark-text">
        <b>ZUZU</b>
        {sub && <small>{sub}</small>}
      </span>
    </span>
  );
}

export function PageHeader({
  children,
  sub,
  extra,
}: {
  children: React.ReactNode;
  sub?: string;
  extra?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{children}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {extra}
    </header>
  );
}

export function BottomActionBar({ children }: { children: React.ReactNode }) {
  return <div className="bottom-action-bar">{children}</div>;
}

export function QuickChoice({
  ...props
}: React.ComponentProps<typeof Radio.Group>) {
  return (
    <Radio.Group
      className={`quick-choice ${(props.className ?? "").trim()}`.trim()}
      {...props}
    />
  );
}

export function Metric({
  label,
  hero = false,
  children,
}: {
  label: string;
  hero?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`metric ${hero ? "metric-hero" : ""}`.trim()}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{children}</strong>
    </div>
  );
}

const sameDay = (iso: string) =>
  new Date(iso).toDateString() === new Date().toDateString();
export function orderTime(iso: string) {
  const date = new Date(iso);
  return sameDay(iso)
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) +
        " " +
        date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
}

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link to={`/orders/${order.code}`} className="order-card">
      <div className="oc-top">
        <span className="oc-code">{order.code}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="oc-customer">
        {order.customer?.name ?? "Chưa xác định khách"}
        {order.customer?.phone && <small> · {order.customer.phone}</small>}
      </div>
      <div className="oc-bottom">
        <span className="oc-time">{orderTime(order.createdAt)}</span>
        {order.weight && (
          <span className="oc-kg">
            {Number(order.weight).toLocaleString("vi-VN")} kg
          </span>
        )}
        <span className="oc-total">
          <Money value={order.total} />
        </span>
      </div>
    </Link>
  );
}

export function EmptyState({ description }: { description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-bubbles" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <p>{description}</p>
    </div>
  );
}
