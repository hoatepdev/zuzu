import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Banknote, Camera, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Order } from "../api/types";
import { Banner, EmptyState, OrderCard, Spinner } from "../components/common";
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
    if (receivedCode) navigate("/staff", { replace: true });
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
        <Banner
          className="receive-success"
          tone="success"
          onClose={() => setReceivedCode(undefined)}
          title={`ĐÃ TẠO ${receivedCode}`}
        >
          <span className="receive-success-copy">
            Bill đang in. <b>Dán bill/QR lên túi đồ.</b>
          </span>
        </Banner>
      )}

      <div className="home-workspace">
        <div className="home-primary">
          <section className="home-hero" aria-labelledby="home-actions-title">
            <h2 id="home-actions-title" className="sr-only">
              Tác vụ chính
            </h2>
            <Link to="/receive" className="op-action op-receive">
              <span className="op-icon" aria-hidden="true">
                <Plus />
              </span>
              <span className="op-copy">
                <b>Nhận đồ</b>
                <small>Tạo đơn cho khách trong vài giây</small>
              </span>
              <span className="op-arrow" aria-hidden="true">
                <ArrowRight />
              </span>
            </Link>
            <Link to="/scan" className="op-action op-scan">
              <span className="op-icon" aria-hidden="true">
                <Camera />
              </span>
              <span className="op-copy">
                <b>Quét QR</b>
                <small>Tra đơn bằng mã trên bill</small>
              </span>
              <span className="op-arrow" aria-hidden="true">
                <ArrowRight />
              </span>
            </Link>
          </section>

          <section className="home-status" aria-labelledby="home-status-title">
            <h2 id="home-status-title" className="sr-only">
              Tình trạng đơn hàng
            </h2>
            <Link to="/orders?status=PROCESSING">
              <strong>{summary.data?.processing ?? 0}</strong>
              <span>đang xử lý</span>
            </Link>
            <Link to="/orders?status=READY_FOR_PICKUP" className="warn">
              <strong>{summary.data?.ready ?? 0}</strong>
              <span>chờ khách lấy</span>
            </Link>
            <Link to="/orders" className="attention">
              <strong>{summary.data?.attention ?? 0}</strong>
              <span>cần chú ý</span>
            </Link>
          </section>
        </div>

        <section className="home-recent" aria-labelledby="recent-orders-title">
          <div className="home-recent-head">
            <h2 id="recent-orders-title">Đơn gần đây</h2>
            <div className="home-recent-links">
              <Link to="/orders">Xem tất cả</Link>
              <Link to="/expenses/new" className="home-utility">
                <Banknote /> <span>Chi tiền</span>
              </Link>
            </div>
          </div>
          {recent.isLoading ? (
            <div className="home-state" role="status" aria-live="polite">
              <Spinner className="size-4" />
              <span>Đang tải đơn gần đây…</span>
            </div>
          ) : recent.error ? (
            <EmptyState
              description={recent.error.message || "Không tải được đơn gần đây"}
              action={
                <Link className="text-link" to="/orders" onClick={() => recent.refetch()}>
                  Thử lại
                </Link>
              }
            />
          ) : recent.data?.length ? (
            <div className="order-list">
              {recent.data.slice(0, 4).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <EmptyState description="Chưa có đơn nào trong ngày" />
          )}
        </section>
      </div>
    </div>
  );
}
