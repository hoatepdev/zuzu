import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Collapse, Form, Input, InputNumber, Select, Space } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Order, Service } from "../api/types";
import { BottomActionBar, EmptyState, Money, PageHeader } from "../components/common";
import { useSession } from "../session";

const unitLabel = (unit?: string) => unit === "KG" ? "kg" : unit === "PAIR" ? "đôi" : "món";
const money = (value: string | number | undefined) => Number(value ?? 0).toLocaleString("vi-VN");

type ItemForm = {
  id?: string;
  serviceId?: string;
  quantity?: number;
  unitPrice?: number;
  priceAdjustmentReason?: string;
};

export function CompletePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSession();
  const services = useQuery({ queryKey: ["services"], queryFn: () => api<Service[]>("/services") });
  const order = useQuery({ queryKey: ["order", id], queryFn: () => api<Order>(`/orders/${id}`), retry: false });
  const [form] = Form.useForm<{ items: ItemForm[]; discount?: number }>();
  const initialized = useRef(false);
  const items = Form.useWatch("items", form) ?? [];
  const discount = session.data?.role === "STAFF" ? Number(order.data?.discount ?? 0) : Number(Form.useWatch("discount", form) ?? 0);
  const complete = useMutation({
    mutationFn: (values: { items: ItemForm[]; discount?: number; expectedUpdatedAt: string }) =>
      api<Order>(`/orders/${id}/complete`, { method: "POST", body: JSON.stringify(values) }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order", id] });
      navigate(`/orders/${saved.code}`);
    },
  });
  const adjusting = order.data?.status === "READY_FOR_PICKUP";
  const serviceById = useMemo(() => new Map((services.data ?? []).map((service) => [service.id, service])), [services.data]);
  const preview = items.reduce((sum, item) => sum + Number(item.quantity ?? 0) * Number(item.unitPrice ?? serviceById.get(item.serviceId ?? "")?.price ?? 0), 0);

  useEffect(() => {
    if (!order.data || initialized.current) return;
    initialized.current = true;
    form.setFieldsValue({
      items: order.data.items.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        priceAdjustmentReason: item.priceAdjustmentReason ?? undefined,
      })),
      discount: Number(order.data.discount ?? 0),
    });
  }, [form, order.data]);

  if (order.isLoading || services.isLoading) return <div className="order-loading" role="status"><span /><span /><span /></div>;
  if (!order.data) return <EmptyState description={order.error?.message ?? "Không tìm thấy đơn"} />;

  return (
    <div className="has-bottom-action">
      <PageHeader sub={`Đơn ${order.data.code}`}>{adjusting ? "Sửa đơn" : "Cân & hoàn thành"}</PageHeader>
      {services.error && <Alert className="customer-match" type="error" message={services.error.message} showIcon />}
      {complete.error && <Alert className="customer-match" type="error" message={complete.error.message} showIcon />}
      <Form
        className="task-form complete-form"
        form={form}
        layout="vertical"
        onFinish={(values) => complete.mutate({ ...values, items: values.items ?? [], ...(session.data?.role === "STAFF" ? {} : { discount: values.discount ?? 0 }), expectedUpdatedAt: order.data!.updatedAt })}
      >
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <section className="item-editor-list">
              <div className="section-heading"><strong>Dịch vụ</strong><small>Mỗi dịch vụ là một dòng giá riêng</small></div>
              {fields.map((field) => {
                const current = items[field.name] ?? {};
                const service = serviceById.get(current.serviceId ?? "");
                const original = order.data?.items.find((item) => item.id === current.id);
                const unit = service?.unit ?? original?.unit;
                const base = original && original.serviceId === current.serviceId ? original.baseUnitPrice : service?.price;
                return (
                  <article className="item-editor-card" key={field.key}>
                    <Form.Item name={[field.name, "id"]} hidden><Input /></Form.Item>
                    <Form.Item name={[field.name, "serviceId"]} label="Dịch vụ" rules={[{ required: true, message: "Chọn dịch vụ" }]}>
                      <Select
                        size="large"
                        placeholder="Chọn dịch vụ"
                        options={services.data?.map((option) => ({ value: option.id, label: `${option.name} · ${money(option.price)}đ/${unitLabel(option.unit)}` }))}
                        onChange={(serviceId) => {
                          const selected = serviceById.get(serviceId);
                          if (selected) form.setFieldValue(["items", field.name, "unitPrice"], Number(selected.price));
                        }}
                      />
                    </Form.Item>
                    <div className="item-editor-grid">
                      <Form.Item name={[field.name, "quantity"]} label={unit === "KG" ? "Khối lượng" : "Số lượng"} rules={[{ required: true, type: "number", min: unit === "KG" ? 0.01 : 1, message: "Nhập số lượng hợp lệ" }]}>
                        <InputNumber className="amount-input" size="large" min={unit === "KG" ? 0.01 : 1} step={unit === "KG" ? 0.1 : 1} precision={unit === "KG" ? 2 : 0} inputMode={unit === "KG" ? "decimal" : "numeric"} addonAfter={unitLabel(unit)} style={{ width: "100%" }} />
                      </Form.Item>
                      <Form.Item name={[field.name, "unitPrice"]} label="Giá áp dụng" rules={[{ required: true, type: "number", min: 0, message: "Nhập giá hợp lệ" }]}>
                        <InputNumber className="amount-input" size="large" min={0} precision={0} inputMode="numeric" addonAfter="đ" style={{ width: "100%" }} />
                      </Form.Item>
                    </div>
                    {base !== undefined && Number(current.unitPrice) !== Number(base) && <small className="price-adjusted">Giá bảng: {money(base)}đ · Chênh lệch: {money(Number(current.unitPrice) - Number(base))}đ</small>}
                    <Form.Item name={[field.name, "priceAdjustmentReason"]} label="Lý do điều chỉnh (không bắt buộc)">
                      <Input placeholder="Ví dụ: Báo giá riêng" />
                    </Form.Item>
                    <Space><Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>Xoá dịch vụ</Button></Space>
                  </article>
                );
              })}
              <Button type="dashed" size="large" block icon={<PlusOutlined />} onClick={() => add({ serviceId: services.data?.[0]?.id, quantity: 1, unitPrice: Number(services.data?.[0]?.price ?? 0) })}>THÊM DỊCH VỤ</Button>
            </section>
          )}
        </Form.List>

        {session.data?.role !== "STAFF" && <Collapse className="discount-control" ghost items={[{ key: "discount", label: "Giảm giá cho đơn", children: <Form.Item name="discount"><InputNumber inputMode="numeric" size="large" min={0} precision={0} suffix="đ" style={{ width: "100%" }} /></Form.Item> }]} />}
        <section className="total-preview">
          <span>Tạm tính</span><Money value={preview} />
          <span>Giảm giá</span><Money value={discount} />
          <strong>TỔNG</strong><Money className="money-hero" value={Math.max(preview - discount, 0)} />
          <small>Giá cuối cùng do hệ thống xác nhận.</small>
        </section>
        <BottomActionBar><Button type="primary" htmlType="submit" size="large" block loading={complete.isPending} disabled={complete.isPending || !items.length}>{complete.isPending ? "ĐANG LƯU..." : adjusting ? "LƯU SỬA" : "HOÀN THÀNH"}</Button></BottomActionBar>
      </Form>
    </div>
  );
}
