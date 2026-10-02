import {
  CameraOutlined,
  DollarOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Order } from "../api/types";
import { EmptyState, OrderCard } from "../components/common";
import { useSession } from "../session";

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
};

export function HomePage() {
  const session = useSession();
  const summary = useQuery({
    queryKey: ["orders", "summary"],
    queryFn: () =>
      api<{ processing: number; ready: number; attention: number }>(
        "/orders/summary",
      ),
  });
  const recent = useQuery({
    queryKey: ["orders", "recent"],
    queryFn: () => api<Order[]>("/orders"),
  });
  const who = session.data?.name;

  return (
    <>
      <div className="home-greet">
        <p className="home-date">
          {new Date().toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="home-hello">
          {greeting()}
          {who ? `, ${who}` : ""}
        </h1>
      </div>

      <div className="home-hero">
        <Link to="/receive" className="op-action op-receive">
          <span className="op-icon" aria-hidden="true">
            <PlusOutlined />
          </span>
          <span className="op-copy">
            <b>Nhận đồ</b>
            <small>Tạo đơn cho khách trong vài giây</small>
          </span>
          <span className="op-arrow" aria-hidden="true">
            <RightOutlined />
          </span>
        </Link>
        <Link to="/scan" className="op-action op-scan">
          <span className="op-icon" aria-hidden="true">
            <CameraOutlined />
          </span>
          <span className="op-copy">
            <b>Quét QR</b>
            <small>Tra đơn bằng mã trên bill</small>
          </span>
          <span className="op-arrow" aria-hidden="true">
            <RightOutlined />
          </span>
        </Link>
      </div>

      <div
        className="home-status"
        role="status"
        aria-label="Tình trạng đơn hàng"
      >
        <Link to="/orders">
          <strong>{summary.data?.processing ?? 0}</strong> đang xử lý
        </Link>
        <span className="dot-sep" aria-hidden="true">
          ·
        </span>
        <Link to="/orders" className="warn">
          <strong>{summary.data?.ready ?? 0}</strong> chờ khách lấy
        </Link>
        <span className="dot-sep" aria-hidden="true">
          ·
        </span>
        <Link to="/orders" className="ok">
          <strong>{summary.data?.attention ?? 0}</strong> cần xử lý
        </Link>
      </div>

      <div className="home-recent-head">
        <h2>Đơn gần đây</h2>
        <Link to="/orders">Xem tất cả</Link>
      </div>
      {recent.isLoading ? (
        <div className="center">
          <Spin />
        </div>
      ) : recent.error ? (
        <EmptyState description={recent.error.message} />
      ) : recent.data?.length ? (
        <div className="order-list">
          {recent.data.slice(0, 4).map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <EmptyState description="Chưa có đơn nào trong ngày" />
      )}

      <Link to="/expenses/new" className="home-utility">
        <DollarOutlined /> Chi tiền
      </Link>
    </>
  );
}
