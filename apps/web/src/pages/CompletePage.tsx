import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Collapse,
  Form,
  Input,
  InputNumber,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Order, Service } from "../api/types";
import {
  AmountInput,
  BottomActionBar,
  EmptyState,
  Money,
  PageHeader,
} from "../components/common";
import { useSession } from "../session";

const unitLabel = (unit?: string) =>
  unit === "KG" ? "kg" : unit === "PAIR" ? "đôi" : "món";
const money = (value: string | number | undefined) =>
  Number(value ?? 0).toLocaleString("vi-VN");

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
  const services = useQuery({
    queryKey: ["services"],
    queryFn: () => api<Service[]>("/services"),
  });
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<Order>(`/orders/${id}`),
    retry: false,
  });
  const [form] = Form.useForm<{ items: ItemForm[]; discount?: number }>();
  const initialized = useRef(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const items = Form.useWatch("items", form) ?? [];
  const watchedDiscount = Form.useWatch("discount", form);
  const discount =
    session.data?.role === "STAFF"
      ? Number(order.data?.discount ?? 0)
      : Number(watchedDiscount ?? 0);
  const adjusting = order.data?.status === "READY_FOR_PICKUP";
  const serviceById = useMemo(
    () => new Map((services.data ?? []).map((service) => [service.id, service])),
    [services.data],
  );
  const preview = items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity ?? 0) *
        Number(
          item.unitPrice ?? serviceById.get(item.serviceId ?? "")?.price ?? 0,
        ),
    0,
  );

  const complete = useMutation({
    mutationFn: (values: {
      items: ItemForm[];
      discount?: number;
      expectedUpdatedAt: string;
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

  useEffect(() => {
    if (!order.data || !services.data || initialized.current) return;
    initialized.current = true;
    form.setFieldsValue({
      items: order.data.items.length
        ? order.data.items.map((item) => ({
            id: item.id,
            serviceId: item.serviceId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            priceAdjustmentReason: item.priceAdjustmentReason ?? undefined,
          }))
        : order.data.receivedServices.map(({ serviceId }) => ({
            serviceId,
            quantity:
              serviceById.get(serviceId)?.unit === "KG" ? undefined : 1,
            unitPrice: Number(serviceById.get(serviceId)?.price ?? 0),
          })),
      discount: Number(order.data.discount ?? 0),
    });
  }, [form, order.data, serviceById, services.data]);

  if (order.isLoading || services.isLoading)
    return (
      <div className="order-loading" role="status">
        <span />
        <span />
        <span />
      </div>
    );
  if (!order.data)
    return (
      <EmptyState description={order.error?.message ?? "Không tìm thấy đơn"} />
    );

  const addService = (serviceId: string, add: (item?: ItemForm) => void, nextIndex: number) => {
    const service = serviceById.get(serviceId);
    if (!service) return;
    add({
      serviceId,
      quantity: service.unit === "KG" ? undefined : 1,
      unitPrice: Number(service.price),
    });
    setShowServicePicker(false);
    setExpandedIndex(nextIndex);
  };

  return (
    <div className="has-bottom-action">
      <PageHeader sub={`Đơn ${order.data.code}`}>
        {adjusting ? "Chỉnh dịch vụ & giá" : "Dịch vụ & giá"}
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
          action={
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => void order.refetch()}
            >
              Tải lại đơn
            </Button>
          }
        />
      )}
      <Form
        className="task-form complete-form"
        form={form}
        layout="vertical"
        onFinish={(values) =>
          complete.mutate({
            ...values,
            items: values.items ?? [],
            ...(session.data?.role === "STAFF"
              ? {}
              : { discount: values.discount ?? 0 }),
            expectedUpdatedAt: order.data!.updatedAt,
          })
        }
        onFinishFailed={({ errorFields }) => {
          const itemIndex = errorFields[0]?.name[1];
          if (typeof itemIndex === "number") setExpandedIndex(itemIndex);
        }}
      >
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <section className="item-editor-list">
              <div className="section-heading">
                <small>Chạm một dòng để sửa</small>
              </div>
              {fields.map((field) => {
                const current = items[field.name] ?? {};
                const service = serviceById.get(current.serviceId ?? "");
                const original = order.data?.items.find(
                  (item) => item.id === current.id,
                );
                const unit = service?.unit ?? original?.unit;
                const base =
                  original && original.serviceId === current.serviceId
                    ? original.baseUnitPrice
                    : service?.price;
                const price = Number(current.unitPrice ?? base ?? 0);
                const quantity = Number(current.quantity ?? 0);
                const lineTotal = quantity * price;
                const adjusted = base !== undefined && price !== Number(base);
                const expanded = expandedIndex === field.name;

                return (
                  <article
                    className={`item-editor-card ${expanded ? "expanded" : ""}`}
                    key={field.key}
                  >
                    <Form.Item name={[field.name, "id"]} hidden>
                      <Input />
                    </Form.Item>
                    <button
                      hidden={expanded}
                      className="service-summary"
                        type="button"
                        onClick={() => setExpandedIndex(field.name)}
                        aria-label={`Sửa ${service?.name ?? "dịch vụ"}`}
                      >
                        <span className="service-summary-main">
                          <strong>{service?.name ?? "Chưa chọn dịch vụ"}</strong>
                          <small>
                            {quantity || "—"} {unitLabel(unit)} × {money(price)}đ
                          </small>
                          {adjusted && (
                            <em>Giá bảng {money(base)}đ · đã điều chỉnh</em>
                          )}
                        </span>
                        <Money value={lineTotal} />
                      </button>
                      <div className="item-editor-focus" hidden={!expanded}>
                        <Form.Item
                          name={[field.name, "serviceId"]}
                          label="Dịch vụ"
                          rules={[{ required: true, message: "Chọn dịch vụ" }]}
                        >
                          <select
                            className="service-select"
                            value={current.serviceId ?? ""}
                            onChange={(event) => {
                              const serviceId = event.target.value;
                              form.setFieldValue(
                                ["items", field.name, "serviceId"],
                                serviceId,
                              );
                              const selected = serviceById.get(serviceId);
                              if (selected) {
                                form.setFieldValue(
                                  ["items", field.name, "unitPrice"],
                                  Number(selected.price),
                                );
                              }
                            }}
                          >
                            {services.data?.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name} · {money(option.price)}đ/
                                {unitLabel(option.unit)}
                              </option>
                            ))}
                          </select>
                        </Form.Item>
                        <div className="item-editor-grid">
                          <Form.Item
                            name={[field.name, "quantity"]}
                            label={unit === "KG" ? "Khối lượng" : "Số lượng"}
                            rules={[
                              {
                                required: true,
                                type: "number",
                                min: unit === "KG" ? 0.1 : 1,
                                message: "Nhập số lượng hợp lệ",
                              },
                            ]}
                          >
                            <InputNumber
                              autoFocus={expanded}
                              className="quantity-input"
                              size="large"
                              min={unit === "KG" ? 0.1 : 1}
                              step={unit === "KG" ? 0.1 : 1}
                              precision={unit === "KG" ? 1 : 0}
                              inputMode={unit === "KG" ? "decimal" : "numeric"}
                              addonAfter={unitLabel(unit)}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, "unitPrice"]}
                            label="Giá áp dụng"
                            rules={[
                              {
                                required: true,
                                type: "number",
                                min: 0,
                                message: "Nhập giá hợp lệ",
                              },
                            ]}
                          >
                            <AmountInput min={0} />
                          </Form.Item>
                        </div>
                        <div className="editor-total">
                          <span>Thành tiền</span>
                          <Money className="money-hero" value={lineTotal} />
                        </div>
                        {adjusted && (
                          <div className="price-adjustment">
                            <div>
                              <span>Giá bảng {money(base)}đ</span>
                              <span>Giá áp dụng {money(price)}đ</span>
                              <strong>
                                Chênh lệch {price - Number(base) > 0 ? "+" : ""}
                                {money(price - Number(base))}đ
                              </strong>
                            </div>
                            <Button
                              type="link"
                              size="small"
                              onClick={() =>
                                form.setFieldValue(
                                  ["items", field.name, "unitPrice"],
                                  Number(base),
                                )
                              }
                            >
                              Đặt lại giá bảng
                            </Button>
                            <Form.Item
                              name={[field.name, "priceAdjustmentReason"]}
                              label="Lý do điều chỉnh (không bắt buộc)"
                            >
                              <Input placeholder="Ví dụ: Báo giá riêng" />
                            </Form.Item>
                          </div>
                        )}
                        <div className="item-editor-actions">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            aria-label="Xoá dịch vụ"
                            onClick={() => {
                              remove(field.name);
                              setExpandedIndex(null);
                            }}
                          />
                          <Button
                            type="primary"
                            onClick={async () => {
                              try {
                                await form.validateFields([
                                  ["items", field.name, "quantity"],
                                ]);
                                setExpandedIndex(null);
                              } catch {}
                            }}
                          >
                            XONG
                          </Button>
                        </div>
                      </div>
                  </article>
                );
              })}
              {showServicePicker && (
                <div className="service-picker" aria-label="Chọn dịch vụ">
                  <div className="section-heading">
                    <strong>Chọn dịch vụ</strong>
                    <small>Giá bảng sẽ được điền sẵn</small>
                  </div>
                  <div className="service-picker-list">
                    {services.data?.map((service) => (
                      <button
                        type="button"
                        className="service-picker-option"
                        key={service.id}
                        onClick={() => addService(service.id, add, fields.length)}
                      >
                        <strong>{service.name}</strong>
                        <span>
                          {money(service.price)}đ/{unitLabel(service.unit)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Button
                className="add-service-button"
                size="large"
                block
                icon={<PlusOutlined />}
                onClick={() => setShowServicePicker((visible) => !visible)}
              >
                {showServicePicker ? "ĐÓNG CHỌN DỊCH VỤ" : "THÊM DỊCH VỤ"}
              </Button>
            </section>
          )}
        </Form.List>

        {session.data?.role !== "STAFF" && (
          <Collapse
            className="discount-control"
            ghost
            items={[
              {
                key: "discount",
                label: "Giảm giá cho đơn",
                children: (
                  <Form.Item name="discount">
                    <InputNumber
                      inputMode="numeric"
                      size="large"
                      min={0}
                      precision={0}
                      suffix="đ"
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                ),
              },
            ]}
          />
        )}
        <section className="total-preview">
          <span>Tạm tính</span>
          <Money value={preview} />
          <span>Giảm giá</span>
          <Money value={discount} />
          <strong>TỔNG</strong>
          <Money
            className="money-hero"
            value={Math.max(preview - discount, 0)}
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
            disabled={complete.isPending || !items.length}
          >
            {complete.isPending
              ? "ĐANG LƯU..."
              : adjusting
                ? "LƯU SỬA"
                : "HOÀN THÀNH"}
          </Button>
        </BottomActionBar>
      </Form>
    </div>
  );
}
