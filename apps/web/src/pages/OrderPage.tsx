import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Order } from "../api/types";
import {
  Banner,
  BottomActionBar,
  EmptyState,
  Money,
  QuickChoice,
  StatusBadge,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "../session";

const paymentLabels: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
};
export function OrderPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const session = useSession();
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<Order>(`/orders/${id}`),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
  const reprint = useMutation({
    mutationFn: () => api(`/orders/${id}/reprint`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["order", id] });
      toast.success("Đã xếp hàng in lại");
    },
  });
  const returnOrder = useMutation({
    mutationFn: (method: string) =>
      api<Order>(`/orders/${id}/return`, {
        method: "POST",
        body: JSON.stringify({ method }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["order", id], data);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã trả đồ và cộng điểm");
    },
  });
  const cancel = useMutation({
    mutationFn: () =>
      api<Order>(`/orders/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["order", id], data);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setCancelOpen(false);
      setReason("");
      toast.success("Đã huỷ đơn");
    },
  });

  useEffect(() => {
    setPaymentMethod("CASH");
    setCancelOpen(false);
    setReason("");
    returnOrder.reset();
    reprint.reset();
    cancel.reset();
  }, [id]);

  if (order.isLoading)
    return (
      <div className="order-loading" role="status" aria-label="Đang tải đơn">
        <span />
        <span />
        <span />
      </div>
    );
  if (!order.data) {
    const notFound =
      !order.error ||
      (order.error instanceof ApiError && order.error.status === 404);
    return (
      <EmptyState
        description={
          notFound
            ? (order.error?.message ?? "Không tìm thấy đơn")
            : "Không tải được đơn. Kiểm tra mạng rồi thử lại."
        }
        action={
          notFound ? (
            <Button size="lg" asChild>
              <Link to="/scan">QUÉT LẠI / NHẬP MÃ</Link>
            </Button>
          ) : (
            <Button size="lg" onClick={() => void order.refetch()}>
              THỬ LẠI
            </Button>
          )
        }
      />
    );
  }
  const data = order.data;
  const needsCustomer = data.status === "READY_FOR_PICKUP" && !data.customer;
  const canReturn = data.status === "READY_FOR_PICKUP" && !!data.customer;
  const hasPrimaryAction =
    data.status === "PROCESSING" || needsCustomer || canReturn;

  return (
    <div className="order-page has-bottom-action">
      {data.printJobs[0]?.status === "FAILED" && (
        <Banner
          className="page-alert"
          tone="error"
          title="In bill thất bại sau 3 lần thử"
        >
          <p>{data.printJobs[0].lastError}</p>
        </Banner>
      )}
      {data.notifications[0]?.status === "ERROR" && (
        <Banner
          className="page-alert"
          tone="error"
          title="Gửi Zalo thất bại"
        >
          <p>{data.notifications[0].error}</p>
        </Banner>
      )}
      {returnOrder.error && (
        <Banner
          className="page-alert"
          tone="error"
          title={returnOrder.error.message}
          onClose={() => returnOrder.reset()}
        />
      )}
      {reprint.error && (
        <Banner
          className="page-alert"
          tone="error"
          title={reprint.error.message}
          onClose={() => reprint.reset()}
        />
      )}

      <section className="order-hero">
        <div className="oh-top">
          <div className="oh-title">
            <Link
              className="order-back-link"
              to="/orders"
              aria-label="Quay lại danh sách đơn"
            >
              <ArrowLeft aria-hidden="true" />
            </Link>
            <div>
              <span className="eyebrow">Chi tiết đơn hàng</span>
              <h1 className="oh-code">{data.code}</h1>
            </div>
          </div>
          <StatusBadge status={data.status} />
        </div>
        {data.customer ? (
          <div className="oh-customer">
            <span>Khách hàng</span>
            <strong>{data.customer.name ?? "Khách hàng"}</strong>
            <a href={`tel:${data.customer.phone}`}>{data.customer.phone}</a>
          </div>
        ) : (
          <div className="oh-unknown">
            <span className="unknown-badge">Chưa xác định khách</span>
            <small>Có thể gắn khách trước khi trả đồ</small>
          </div>
        )}
        {data.note && (
          <div className="note-callout">
            <small>Lưu ý quan trọng</small>
            <strong>{data.note}</strong>
          </div>
        )}
        <div className="order-metrics">
          <div className="order-metric">
            <span>Khối lượng</span>
            <strong>
              {data.weight && Number(data.weight) > 0
                ? `${data.weight} kg`
                : "Chưa cân"}
            </strong>
          </div>
          <div className="order-metric amount">
            <span>{canReturn ? "Cần thanh toán" : "Thành tiền"}</span>
            <Money className="money-hero" value={data.total} />
          </div>
        </div>
      </section>

      <section className="detail-list" aria-labelledby="order-timeline-title">
        <div className="detail-section-heading">
          <div>
            <span className="eyebrow">Theo dõi</span>
            <h2 id="order-timeline-title">Thời gian &amp; giao nhận</h2>
          </div>
        </div>
        <div className="detail-row">
          <span>Nhận lúc</span>
          <strong>{new Date(data.createdAt).toLocaleString("vi-VN")}</strong>
        </div>
        {data.status === "COMPLETED" && (
          <div className="detail-row">
            <span>Trả lúc</span>
            <strong>
              {data.completedAt
                ? new Date(data.completedAt).toLocaleString("vi-VN")
                : "—"}
            </strong>
          </div>
        )}
        {(data.dueDate || data.duePeriod) && (
          <div className="detail-row">
            <span>Hẹn trả</span>
            <strong>
              {[
                data.dueDate &&
                  new Date(data.dueDate).toLocaleDateString("vi-VN"),
                data.duePeriod === "MORNING"
                  ? "Sáng"
                  : data.duePeriod === "AFTERNOON"
                    ? "Chiều"
                    : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </strong>
          </div>
        )}
        {data.deliveryAddress && (
          <div className="detail-row detail-row-stack delivery-row">
            <span>Giao đến</span>
            <strong>{data.deliveryAddress}</strong>
          </div>
        )}
        <div className="detail-section-heading detail-section-heading-services">
          <div>
            <span className="eyebrow">Chi tiết tính tiền</span>
            <h2>Dịch vụ đã nhận</h2>
          </div>
        </div>
        <div className="detail-row detail-row-stack">
          <span>Dịch vụ</span>
          <div className="order-item-lines">
            {data.items.length ? (
              data.items.map((item) => (
                <div className="order-item-line" key={item.id}>
                  <span>
                    {item.serviceName} · {item.quantity}{" "}
                    {item.unit === "KG"
                      ? "kg"
                      : item.unit === "PAIR"
                        ? "đôi"
                        : "món"}
                  </span>
                  <strong>
                    <Money value={item.lineTotal} />
                  </strong>
                  {item.unitPrice !== item.baseUnitPrice && (
                    <small>
                      Giá bảng{" "}
                      {Number(item.baseUnitPrice).toLocaleString("vi-VN")}đ · áp
                      dụng {Number(item.unitPrice).toLocaleString("vi-VN")}đ
                    </small>
                  )}
                </div>
              ))
            ) : data.receivedServices.length ? (
              data.receivedServices.map((service) => (
                <div className="order-item-line" key={service.serviceId}>
                  <span>□ {service.serviceName}</span>
                  <small>Chưa cân / chưa tính giá</small>
                </div>
              ))
            ) : (
              <div className="order-item-empty">
                Chưa có dịch vụ hoặc chưa cập nhật giá
              </div>
            )}
          </div>
        </div>
        <div className="detail-row">
          <span>Tạm tính</span>
          <strong>
            <Money value={data.subtotal} />
          </strong>
        </div>
        {Number(data.discount ?? 0) > 0 && (
          <div className="detail-row">
            <span>Giảm giá</span>
            <strong>
              <Money value={data.discount} />
            </strong>
          </div>
        )}
        {data.payments[0] && (
          <div className="detail-row">
            <span>Đã thanh toán</span>
            <strong>
              {paymentLabels[data.payments[0].method] ??
                data.payments[0].method}{" "}
              · <Money value={data.payments[0].amount} />
            </strong>
          </div>
        )}
      </section>

      {canReturn && (
        <section className="payment-panel" aria-labelledby="payment-title">
          <div className="return-summary">
            <div>
              <span className="eyebrow">Sẵn sàng trả đồ</span>
              <h2 id="payment-title">Xác nhận thanh toán</h2>
              <small>Chọn cách khách thanh toán trước khi trả đồ</small>
            </div>
            <Money className="return-amount" value={data.total} />
          </div>
          <div className="return-points">
            <span>Điểm khách nhận được</span>
            <strong>+{data.pointsToEarn ?? 0} điểm</strong>
          </div>
          <QuickChoice
            className="payment-choice"
            ariaLabel="Cách thanh toán"
            value={paymentMethod}
            disabled={returnOrder.isPending}
            onChange={(value) => setPaymentMethod(value)}
            options={[
              { label: "Chuyển khoản", value: "BANK_TRANSFER" },
              { label: "Tiền mặt", value: "CASH" },
            ]}
          />
        </section>
      )}

      <div className="order-actions">
        {data.status === "READY_FOR_PICKUP" && !data.payments.length && (
          <Button size="lg" variant="outline" className="w-full" asChild>
            <Link to={`/orders/${data.code}/complete`}>
              CHỈNH DỊCH VỤ &amp; GIÁ
            </Link>
          </Button>
        )}
        {session.data?.role !== "STAFF" &&
          ["PROCESSING", "READY_FOR_PICKUP"].includes(data.status) &&
          !data.payments.length && (
            <Button
              variant="destructive"
              size="lg"
              className="w-full"
              onClick={() => setCancelOpen(true)}
            >
              HUỶ ĐƠN
            </Button>
          )}
      </div>

      <BottomActionBar>
        <div className="bottom-action-row">
          <Button
            className={hasPrimaryAction ? "bottom-action-side" : ""}
            size="lg"
            variant="outline"
            aria-label="In lại bill"
            title="In lại bill"
            disabled={reprint.isPending}
            onClick={() => reprint.mutate()}
          >
            <Printer />
            {hasPrimaryAction ? "" : " IN LẠI BILL"}
          </Button>
          {data.status === "PROCESSING" && (
            <Button size="lg" className="flex-1" asChild>
              <Link to={`/orders/${data.code}/complete`}>
                NHẬP DỊCH VỤ &amp; GIÁ
              </Link>
            </Button>
          )}
          {needsCustomer && (
            <Button size="lg" className="flex-1" asChild>
              <Link to={`/orders/${data.code}/attach-customer`}>GẮN KHÁCH</Link>
            </Button>
          )}
          {canReturn && (
            <Button
              size="lg"
              className="flex-1"
              disabled={returnOrder.isPending}
              onClick={() => returnOrder.mutate(paymentMethod)}
            >
              {returnOrder.isPending ? "ĐANG TRẢ ĐỒ..." : "TRẢ ĐỒ"}
            </Button>
          )}
        </div>
      </BottomActionBar>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Huỷ đơn</DialogTitle>
          </DialogHeader>
          <Label htmlFor="cancel-reason" className="sr-only">
            Lý do huỷ
          </Label>
          <Textarea
            id="cancel-reason"
            className="text-area"
            rows={3}
            placeholder="Lý do huỷ (tối thiểu 3 ký tự)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby="cancel-reason-hint"
          />
          <small id="cancel-reason-hint" className="cancel-reason-hint">
            Tối thiểu 3 ký tự
          </small>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Quay lại
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 3 || cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              Huỷ đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
