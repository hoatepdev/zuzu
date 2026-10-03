import {
  CameraOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Spin } from "antd";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const navigate = useNavigate();
  const [receivedCode, setReceivedCode] = useState(
    (location.state as { receivedCode?: string } | null)?.receivedCode,
  );
  useEffect(() => {
    if (receivedCode) navigate("/", { replace: true });
  }, [receivedCode, navigate]);
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

  if (session.data && session.data.role !== "STAFF") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="home-page">
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

      {receivedCode && (
        <Alert
          className="receive-success"
          role="status"
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          closable
          onClose={() => setReceivedCode(undefined)}
          message={
            <>
              <strong>ĐÃ TẠO {receivedCode}</strong>
              <span className="receive-success-copy">
                Bill đang in. <b>Dán bill/QR lên túi đồ.</b>
              </span>
            </>
          }
        />
      )}

      <div className="home-workspace">
      <div className="home-primary">
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
        <Link to="/orders?status=PROCESSING">
          <strong>{summary.data?.processing ?? 0}</strong> đang xử lý
        </Link>
        <span className="dot-sep" aria-hidden="true">
          ·
        </span>
        <Link to="/orders?status=READY_FOR_PICKUP" className="warn">
          <strong>{summary.data?.ready ?? 0}</strong> chờ khách lấy
        </Link>
        <span className="dot-sep" aria-hidden="true">
          ·
        </span>
        <Link to="/orders" className="attention">
          <strong>{summary.data?.attention ?? 0}</strong> cần xử lý
        </Link>
      </div>
      </div>

      <section className="home-recent" aria-labelledby="recent-orders-title">
        <div className="home-recent-head">
          <h2 id="recent-orders-title">Đơn gần đây</h2>
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
      </section>
      </div>
    </div>
  );
}
