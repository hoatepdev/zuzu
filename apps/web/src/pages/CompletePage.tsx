import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Collapse, Form, InputNumber, Radio } from "antd";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Order, Service } from "../api/types";
import {
  BottomActionBar,
  EmptyState,
  Money,
  PageHeader,
} from "../components/common";
import { useSession } from "../session";

export function CompletePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSession();
  const services = useQuery({
    queryKey: ["services"],
    queryFn: () => api<Service[]>("/services"),
  });
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<Order>(`/orders/${id}`),
    retry: false,
  });
  const complete = useMutation({
    mutationFn: (values: {
      serviceId: string;
      quantity: number;
      discount?: number;
    }) =>
      api<Order>(`/orders/${id}/complete`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order", id] });
      navigate(`/orders/${saved.code}`);
    },
  });
  const [form] = Form.useForm();
  const serviceId = Form.useWatch("serviceId", form) as string | undefined;
  const quantity = Form.useWatch("quantity", form) as number | undefined;
  const discount = (Form.useWatch("discount", form) as number | undefined) ?? 0;
  const selected = services.data?.find((service) => service.id === serviceId);
  const adjusting = order.data?.status === "READY_FOR_PICKUP";
  const unitLabel =
    selected?.unit === "KG" ? "kg" : selected?.unit === "PAIR" ? "đôi" : "món";

  useEffect(() => {
    const item = order.data?.items[0];
    if (item)
      form.setFieldsValue({
        serviceId: item.serviceId,
        quantity: Number(item.quantity),
        discount: Number(order.data?.discount ?? 0),
      });
  }, [order.data, form]);

  if (order.isLoading || services.isLoading)
    return (
      <div className="order-loading" role="status">
        <span />
        <span />
        <span />
      </div>
    );
  if (!order.data)
    return <EmptyState description={order.error?.message ?? "Không tìm thấy đơn"} />;

  return (
    <div className="has-bottom-action">
      <PageHeader sub={order.data?.code ? `Đơn ${order.data.code}` : undefined}>
        {adjusting ? "Sửa cân" : "Cân & hoàn thành"}
      </PageHeader>
      {services.error && (
        <Alert
          className="customer-match"
          type="error"
          message={services.error.message}
          showIcon
        />
      )}
      {complete.error && (
        <Alert
          className="customer-match"
          type="error"
          message={complete.error.message}
          showIcon
        />
      )}
      <Form
        className="task-form complete-form"
        form={form}
        layout="vertical"
        onFinish={(values) => complete.mutate(values)}
      >
        <section className="task-section service-section">
          <Form.Item
            name="serviceId"
            label="Chọn dịch vụ"
            rules={[{ required: true, message: "Chọn dịch vụ" }]}
          >
            <Radio.Group
              className="service-choice"
              disabled={complete.isPending}
            >
              {services.data?.map((service) => (
                <Radio key={service.id} value={service.id}>
                  <span className="sv-row">
                    <strong>{service.name}</strong>
                    <small>
                      {Number(service.price).toLocaleString("vi-VN")}đ/
                      {service.unit === "KG"
                        ? "kg"
                        : service.unit === "PAIR"
                          ? "đôi"
                          : "món"}
                    </small>
                  </span>
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        </section>

        <section className="quantity-panel">
          <Form.Item
            name="quantity"
            label={selected?.unit === "KG" ? "Khối lượng" : "Số lượng"}
            rules={[{ required: true, message: "Nhập khối lượng hoặc số lượng" }]}
          >
            <InputNumber
              className="quantity-input"
              inputMode="decimal"
              size="large"
              min={0.01}
              max={10000}
              step={selected?.unit === "KG" ? 0.1 : 1}
              disabled={complete.isPending}
              addonAfter={unitLabel}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </section>

        {session.data?.role !== "STAFF" && (
          <Collapse
            className="discount-control"
            ghost
            items={[
              {
                key: "discount",
                label: "Giảm giá cho đơn",
                children: (
                  <Form.Item name="discount" initialValue={0}>
                    <InputNumber
                      inputMode="numeric"
                      size="large"
                      min={0}
                      precision={0}
                      suffix="đ"
                      disabled={complete.isPending}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                ),
              },
            ]}
          />
        )}
        <section className="total-preview">
          <span>Thành tiền dự kiến</span>
          <Money
            className="money-hero"
            value={
              selected && quantity
                ? Math.max(Number(selected.price) * quantity - discount, 0)
                : undefined
            }
          />
          <small>Giá cuối cùng do hệ thống xác nhận.</small>
        </section>
        <BottomActionBar>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={complete.isPending}
            disabled={complete.isPending}
          >
            {complete.isPending
              ? "ĐANG HOÀN THÀNH..."
              : adjusting
                ? "LƯU SỬA"
                : "HOÀN THÀNH"}
          </Button>
        </BottomActionBar>
      </Form>
    </div>
  );
}
