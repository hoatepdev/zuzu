import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Order, Service } from "../api/types";
import {
  AmountInput,
  BottomActionBar,
  EmptyState,
  Field,
  Money,
  NumberInput,
  PageHeader,
  Banner,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
type CompleteValues = { items: ItemForm[]; discount?: number };

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
  const form = useForm<CompleteValues>({
    defaultValues: { items: [], discount: 0 },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const initialized = useRef(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const items = form.watch("items") ?? [];
  const watchedDiscount = form.watch("discount");
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
    mutationFn: (values: CompleteValues & { expectedUpdatedAt: string }) =>
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
    form.reset({
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
  if (order.error || services.error)
    return (
      <>
        <PageHeader sub={`Đơn ${id}`}>Dịch vụ & giá</PageHeader>
        <Banner
          tone="error"
          title={(order.error ?? services.error)?.message}
          action={
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                void order.refetch();
                void services.refetch();
              }}
            >
              <RotateCw /> Thử lại
            </Button>
          }
        />
      </>
    );
  if (!order.data)
    return (
      <EmptyState description="Không tìm thấy đơn" />
    );

  const addService = (serviceId: string, nextIndex: number) => {
    const service = serviceById.get(serviceId);
    if (!service) return;
    append({
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
      {complete.error && (
        <Banner
          className="customer-match"
          tone="error"
          title={complete.error.message}
          action={
            <Button type="button" variant="ghost" onClick={() => void order.refetch()}>
              <RotateCw /> Tải lại đơn
            </Button>
          }
        />
      )}
      <form
        className="task-form complete-form"
        onSubmit={form.handleSubmit(
          (values) =>
            complete.mutate({
              ...values,
              items: values.items ?? [],
              ...(session.data?.role === "STAFF"
                ? {}
                : { discount: values.discount ?? 0 }),
              expectedUpdatedAt: order.data!.updatedAt,
            }),
          (errors) => {
            const index = Number(
              Object.keys(errors.items ?? {})[0]?.split(".")[1],
            );
            if (!Number.isNaN(index)) setExpandedIndex(index);
          },
        )}
      >
        <section className="item-editor-list">
          <div className="section-heading">
            <strong>Dịch vụ của đơn</strong>
            <small>Chạm một dòng để sửa số lượng hoặc giá</small>
          </div>
          {fields.map((field, index) => {
            const current = items[index] ?? {};
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
            const expanded = expandedIndex === index;

            return (
              <article
                className={`item-editor-card ${expanded ? "expanded" : ""}`}
                key={field.id}
              >
                <input type="hidden" {...form.register(`items.${index}.id`)} />
                <Button
                  hidden={expanded}
                  className="service-summary"
                  type="button"
                  variant="ghost"
                  onClick={() => setExpandedIndex(index)}
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
                </Button>
                <div className="item-editor-focus" hidden={!expanded}>
                  <Controller
                    control={form.control}
                    name={`items.${index}.serviceId`}
                    rules={{ required: "Chọn dịch vụ" }}
                    render={({ field: serviceField, fieldState }) => (
                      <Field
                        label="Dịch vụ"
                        htmlFor={serviceField.name}
                        error={fieldState.error?.message}
                      >
                        <Select
                          value={serviceField.value}
                          onValueChange={(value) => {
                            const selected = serviceById.get(value);
                            serviceField.onChange(value);
                            if (selected)
                              form.setValue(
                                `items.${index}.unitPrice`,
                                Number(selected.price),
                              );
                          }}
                        >
                          <SelectTrigger
                            id={serviceField.name}
                            className="h-11 w-full"
                          >
                            <SelectValue placeholder="Chọn dịch vụ" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.data?.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name} · {money(option.price)}đ/
                                {unitLabel(option.unit)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <div className="item-editor-grid">
                    <Controller
                      control={form.control}
                      name={`items.${index}.quantity`}
                      rules={{
                        required: "Nhập số lượng hợp lệ",
                        min:
                          unit === "KG"
                            ? { value: 0.1, message: "Nhập số lượng hợp lệ" }
                            : { value: 1, message: "Nhập số lượng hợp lệ" },
                      }}
                      render={({ field: quantityField, fieldState }) => (
                        <Field
                          label={unit === "KG" ? "Khối lượng" : "Số lượng"}
                          htmlFor={quantityField.name}
                          error={fieldState.error?.message}
                        >
                          <NumberInput
                            id={quantityField.name}
                            autoFocus={expanded}
                            decimal={unit === "KG"}
                            quickThousand={false}
                            min={unit === "KG" ? 0.1 : 1}
                            suffix={unitLabel(unit)}
                            value={quantityField.value}
                            onChange={quantityField.onChange}
                            onBlur={quantityField.onBlur}
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      rules={{
                        required: "Nhập giá hợp lệ",
                        min: { value: 0, message: "Nhập giá hợp lệ" },
                      }}
                      render={({ field: priceField, fieldState }) => (
                        <Field
                          label="Giá áp dụng"
                          htmlFor={priceField.name}
                          error={fieldState.error?.message}
                        >
                          <AmountInput
                            id={priceField.name}
                            min={0}
                            value={priceField.value}
                            onChange={priceField.onChange}
                            onBlur={priceField.onBlur}
                          />
                        </Field>
                      )}
                    />
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
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() =>
                          form.setValue(
                            `items.${index}.unitPrice`,
                            Number(base),
                          )
                        }
                      >
                        Đặt lại giá bảng
                      </Button>
                      <Controller
                        control={form.control}
                        name={`items.${index}.priceAdjustmentReason`}
                        render={({ field: reasonField }) => (
                          <Field
                            label="Lý do điều chỉnh (không bắt buộc)"
                            htmlFor={reasonField.name}
                          >
                            <Input
                              id={reasonField.name}
                              placeholder="Ví dụ: Báo giá riêng"
                              onKeyDown={(event) => {
                                if (event.key === "Enter") event.preventDefault();
                              }}
                              {...reasonField}
                              value={reasonField.value ?? ""}
                            />
                          </Field>
                        )}
                      />
                    </div>
                  )}
                  <div className="item-editor-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Xoá dịch vụ"
                      onClick={() => {
                        remove(index);
                        setExpandedIndex(null);
                      }}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        const valid = await form.trigger([
                          `items.${index}.quantity`,
                        ]);
                        if (valid) setExpandedIndex(null);
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
                  <Button
                    type="button"
                    variant="ghost"
                    className="service-picker-option"
                    key={service.id}
                    onClick={() => addService(service.id, fields.length)}
                  >
                    <strong>{service.name}</strong>
                    <span>
                      {money(service.price)}đ/{unitLabel(service.unit)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
          <Button
            type="button"
            className="add-service-button"
            size="lg"
            variant="outline"
            onClick={() => setShowServicePicker((visible) => !visible)}
          >
            <Plus />
            {showServicePicker ? "ĐÓNG CHỌN DỊCH VỤ" : "THÊM DỊCH VỤ"}
          </Button>
        </section>

        {session.data?.role !== "STAFF" && (
          <details className="discount-control">
            <summary>Giảm giá cho đơn</summary>
            <Controller
              control={form.control}
              name="discount"
              render={({ field: discountField }) => (
                <AmountInput
                  id="discount"
                  min={0}
                  value={discountField.value}
                  onChange={discountField.onChange}
                  onBlur={discountField.onBlur}
                />
              )}
            />
          </details>
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
            type="submit"
            size="lg"
            className="w-full"
            disabled={complete.isPending || !items.length}
          >
            {complete.isPending
              ? "ĐANG LƯU..."
              : adjusting
                ? "LƯU SỬA"
                : "HOÀN THÀNH"}
          </Button>
        </BottomActionBar>
      </form>
    </div>
  );
}
