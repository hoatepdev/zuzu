import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Order, Service } from "../api/types";
import {
  Banner,
  BottomActionBar,
  Field,
  PageHeader,
  QuickChoice,
  Spinner,
  TextareaField,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPhoneInput, normalizePhone } from "./receive-utils";

const isPhoneLike = (value: string) => /^[\d\s().+\-]+$/.test(value.trim());
const isValidCustomerName = (value: string) =>
  (value.match(/[\p{L}]/gu) ?? []).length >= 2;
const todayVN = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};

type ReceiveValues = {
  customerLookup: string;
  customerName?: string;
  newCustomerPhone?: string;
  customNote?: string;
  dueDate: string;
  deliveryAddress?: string;
};

export function ReceivePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lookupRef = useRef<HTMLInputElement>(null);
  const form = useForm<ReceiveValues>({
    defaultValues: { dueDate: addDays(todayVN(), 1) },
  });
  const [unknown, setUnknown] = useState(false);
  const [customerInput, setCustomerInput] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>();
  const [newCustomer, setNewCustomer] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [duePeriod, setDuePeriod] = useState<"" | "MORNING" | "AFTERNOON">("");
  const selectedDueDate = form.watch("dueDate");
  const services = useQuery({
    queryKey: ["services"],
    queryFn: () => api<Service[]>("/services"),
  });

  const customers = useQuery({
    queryKey: ["customers", "receive-lookup", customerSearchQuery],
    queryFn: () =>
      api<Customer[]>(
        `/customers/search?q=${encodeURIComponent(customerSearchQuery)}`,
      ),
    enabled: !unknown && customerSearchQuery.length > 0,
  });

  useEffect(() => {
    const value = customerInput.trim();
    const digits = normalizePhone(value).replace(/\D/g, "");
    if (
      unknown ||
      newCustomer ||
      selectedCustomer ||
      !value ||
      (isPhoneLike(value) && digits.length < 3)
    ) {
      setCustomerSearchQuery("");
      return;
    }
    const timer = window.setTimeout(
      () =>
        setCustomerSearchQuery(
          isPhoneLike(value) ? normalizePhone(value) : value,
        ),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [customerInput, unknown, newCustomer, selectedCustomer]);

  const addingPhone = isPhoneInput(customerInput);
  const addingName = isValidCustomerName(customerInput) && !addingPhone;

  useEffect(() => {
    if (!services.data || defaultApplied) return;
    setSelectedServices(
      services.data
        .filter((service) => service.isDefault)
        .map((service) => service.id),
    );
    setDefaultApplied(true);
  }, [services.data, defaultApplied]);

  const create = useMutation({
    mutationFn: (values: ReceiveValues) =>
      api<Order>("/orders", {
        method: "POST",
        body: JSON.stringify({
          phone: unknown
            ? undefined
            : (selectedCustomer?.phone ??
              (newCustomer
                ? addingPhone
                  ? normalizePhone(values.customerLookup ?? "")
                  : normalizePhone(values.newCustomerPhone ?? "")
                : isPhoneLike(values.customerLookup?.trim() ?? "")
                  ? normalizePhone(values.customerLookup ?? "")
                  : undefined)),
          customerId: newCustomer ? undefined : selectedCustomer?.id,
          customerName: newCustomer
            ? addingPhone
              ? values.customerName
              : values.customerLookup
            : undefined,
          customerAddress: selectedCustomer?.address,
          note: values.customNote?.trim() || undefined,
          customerUnknown: unknown,
          dueDate: values.dueDate,
          duePeriod: duePeriod || undefined,
          deliveryAddress: values.deliveryAddress?.trim() || undefined,
          serviceIds: selectedServices,
        }),
      }),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate("/staff", { state: { receivedCode: order.code } });
    },
  });

  const chooseCustomer = (customer: Customer) => {
    const customerLabel = `${customer.name ?? "Khách cũ"} - ${customer.phone}`;
    setSelectedCustomer(customer);
    setNewCustomer(false);
    setCustomerInput(customerLabel);
    form.setValue("customerLookup", customerLabel);
    form.setValue("customerName", customer.name);
    form.setValue("deliveryAddress", customer.address);
    setCustomerSearchQuery("");
  };
  const changeCustomer = () => {
    setSelectedCustomer(undefined);
    setCustomerInput("");
    setCustomerSearchQuery("");
    form.setValue("customerLookup", "");
    form.setValue("customerName", undefined);
    form.setValue("deliveryAddress", undefined);
    window.setTimeout(() => lookupRef.current?.focus(), 0);
  };
  const toggleService = (serviceId: string) => {
    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };
  return (
    <div className="has-bottom-action receive-page">
      <PageHeader>Nhận đồ</PageHeader>
      {create.error && (
        <Banner
          className="receive-submit-error"
          tone="error"
          title={create.error.message}
        />
      )}
      <form
        className="task-form receive-form"
        onSubmit={form.handleSubmit((values) => create.mutate(values))}
      >
        <div className="receive-main-column">
          <section className="receive-block customer-section">
            <div className="step-heading">
              <div>
                <strong>Khách hàng</strong>
                <small>Tìm theo số điện thoại hoặc tên khách</small>
              </div>
            </div>
            <div
              className="customer-mode"
              role="group"
              aria-label="Thông tin khách"
            >
              <Button
                type="button"
                variant={unknown ? "outline" : "default"}
                aria-pressed={!unknown}
                onClick={() => {
                  setUnknown(false);
                  setNewCustomer(false);
                }}
                disabled={create.isPending}
              >
                Có thông tin khách
              </Button>
              <Button
                type="button"
                variant={unknown ? "default" : "outline"}
                aria-pressed={unknown}
                onClick={() => {
                  setUnknown(true);
                  setNewCustomer(false);
                  setSelectedCustomer(undefined);
                  setCustomerInput("");
                  setCustomerSearchQuery("");
                  form.setValue("customerLookup", "");
                }}
                disabled={create.isPending}
              >
                Chưa rõ khách
              </Button>
            </div>
            {!unknown ? (
              <>
                <div className="customer-lookup">
                  <Controller
                    control={form.control}
                    name="customerLookup"
                    rules={{
                      required:
                        !unknown && !newCustomer
                          ? "Nhập số điện thoại hoặc tên khách"
                          : false,
                    }}
                    render={({ field, fieldState }) => (
                      <Field
                        label="Số điện thoại hoặc tên"
                        htmlFor="customerLookup"
                        error={fieldState.error?.message}
                      >
                        <Input
                          id="customerLookup"
                          className="input-lg"
                          autoFocus
                          autoComplete="off"
                          placeholder="Nhập SĐT hoặc tên khách"
                          disabled={
                            newCustomer ||
                            !!selectedCustomer ||
                            create.isPending
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.preventDefault();
                          }}
                          {...field}
                          ref={(element) => {
                            field.ref(element);
                            lookupRef.current = element;
                          }}
                          value={field.value ?? ""}
                          onChange={(event) => {
                            field.onChange(event.target.value);
                            setCustomerInput(event.target.value);
                            setNewCustomer(false);
                            if (
                              selectedCustomer &&
                              normalizePhone(event.target.value) !==
                                selectedCustomer.phone
                            ) {
                              setSelectedCustomer(undefined);
                            }
                          }}
                        />
                      </Field>
                    )}
                  />
                </div>

                {selectedCustomer && (
                  <div className="customer-resolved" role="status">
                    <div>
                      <strong>{selectedCustomer.name ?? "Khách cũ"}</strong>
                      <span className="mono">{selectedCustomer.phone}</span>
                      <small>Khách đã chọn</small>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      onClick={changeCustomer}
                      disabled={create.isPending}
                    >
                      Đổi khách
                    </Button>
                  </div>
                )}
                {customers.isFetching && !selectedCustomer && (
                  <div className="lookup-state" role="status">
                    <Spinner className="size-4" /> Đang tìm khách...
                  </div>
                )}
                {customerSearchQuery &&
                  customers.isError &&
                  !customers.isFetching && (
                    <div className="lookup-feedback lookup-error" role="alert">
                      <span>Không tìm được khách lúc này.</span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void customers.refetch()}
                      >
                        Thử lại
                      </Button>
                    </div>
                  )}
                {customerSearchQuery &&
                  customers.isSuccess &&
                  customers.data.length > 0 &&
                  !selectedCustomer && (
                    <div
                      className="customer-suggestions"
                      aria-label="Gợi ý khách hàng"
                    >
                      {customers.data.map((customer) => (
                        <Button
                          type="button"
                          variant="ghost"
                          className="customer-suggestion"
                          key={customer.id}
                          onClick={() => chooseCustomer(customer)}
                        >
                          <span className="customer-suggestion-copy">
                            <strong>{customer.name ?? "Khách cũ"}</strong>
                            <small>{customer.phone}</small>
                          </span>
                          <span className="customer-suggestion-action">
                            Chọn
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}
                {customerSearchQuery &&
                  customers.isSuccess &&
                  customers.data.length === 0 &&
                  !selectedCustomer &&
                  (addingPhone || addingName) && (
                    <div className="new-customer-panel" role="status">
                      <span>Không có khách phù hợp</span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setNewCustomer(true);
                          form.setValue(
                            "newCustomerPhone",
                            addingPhone
                              ? normalizePhone(customerInput)
                              : undefined,
                          );
                          form.setValue(
                            "customerName",
                            addingPhone ? undefined : customerInput.trim(),
                          );
                        }}
                      >
                        + Thêm khách mới
                      </Button>
                    </div>
                  )}
                {newCustomer && (
                  <div className="new-customer-fields">
                    {addingPhone ? (
                      <Controller
                        control={form.control}
                        name="customerName"
                        rules={{
                          required: "Nhập tên khách hàng",
                          validate: (value) =>
                            isValidCustomerName(value ?? "") ||
                            "Nhập tên khách hàng hợp lệ",
                        }}
                        render={({ field, fieldState }) => (
                          <Field
                            label="Tên khách hàng"
                            htmlFor="customerName"
                            error={fieldState.error?.message}
                          >
                            <Input
                              id="customerName"
                              className="input-lg"
                              placeholder="Ví dụ: Nam"
                              onKeyDown={(event) => {
                                if (event.key === "Enter")
                                  event.preventDefault();
                              }}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </Field>
                        )}
                      />
                    ) : (
                      <Controller
                        control={form.control}
                        name="newCustomerPhone"
                        rules={{
                          required: "Nhập số điện thoại",
                          validate: (value) =>
                            isPhoneInput(value ?? "") ||
                            "Số điện thoại không hợp lệ",
                        }}
                        render={({ field, fieldState }) => (
                          <Field
                            label="Số điện thoại"
                            htmlFor="newCustomerPhone"
                            error={fieldState.error?.message}
                          >
                            <Input
                              id="newCustomerPhone"
                              className="input-lg"
                              inputMode="tel"
                              placeholder="09xxxxxxxx"
                              onKeyDown={(event) => {
                                if (event.key === "Enter")
                                  event.preventDefault();
                              }}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </Field>
                        )}
                      />
                    )}
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setNewCustomer(false);
                        form.setValue("customerName", undefined);
                        form.setValue("newCustomerPhone", undefined);
                      }}
                    >
                      Nhập lại
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="unknown-banner" role="status">
                Đang nhận cho khách chưa xác định
              </div>
            )}
          </section>

          <section className="receive-block service-section">
            <div className="step-heading">
              <div>
                <strong>Dịch vụ dự kiến</strong>
                <small>Đánh dấu để theo dõi</small>
              </div>
            </div>
            {services.isLoading ? (
              <div className="lookup-state" role="status">
                <Spinner className="size-4" /> Đang tải dịch vụ...
              </div>
            ) : services.isError ? (
              <div className="lookup-feedback lookup-error" role="alert">
                <span>Không tải được danh sách dịch vụ.</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void services.refetch()}
                >
                  Thử lại
                </Button>
              </div>
            ) : !services.data?.length ? (
              <p className="receive-empty">
                Chưa có dịch vụ nào được cấu hình.
              </p>
            ) : (
              <div
                className="receive-services"
                role="group"
                aria-label="Dịch vụ dự kiến"
              >
                {services.data.map((service) => {
                  const selected = selectedServices.includes(service.id);
                  return (
                    <Button
                      type="button"
                      variant="ghost"
                      key={service.id}
                      className={`receive-service ${selected ? "selected" : ""}`}
                      aria-pressed={selected}
                      disabled={create.isPending}
                      onClick={() => toggleService(service.id)}
                    >
                      <span
                        className="receive-service-check"
                        aria-hidden="true"
                      >
                        {selected && <Check />}
                      </span>
                      <span className="receive-service-index">
                        {service.stt}
                      </span>
                      <span className="receive-service-name">
                        {service.name}
                      </span>
                      <span className="receive-service-meta">
                        {service.isDefault && <small>Mặc định</small>}
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="receive-side-column">
          <section className="receive-block note-section">
            <div className="step-heading">
              <div>
                <strong>Lưu ý</strong>
                <small>Ghi chú để nhân viên xử lý đơn</small>
              </div>
            </div>
            <TextareaField
              control={form.control}
              name="customNote"
              label="Nội dung lưu ý"
              rows={3}
              placeholder="Nhập lưu ý cho đơn"
              disabled={create.isPending}
              rules={{
                maxLength: { value: 500, message: "Lưu ý tối đa 500 ký tự" },
              }}
            />
          </section>

          <section className="receive-block schedule-section">
            <div className="step-heading">
              <div>
                <strong>Hẹn trả</strong>
                <small>Ngày, buổi và giao hàng</small>
              </div>
            </div>
            <div className="schedule-grid">
              <Controller
                control={form.control}
                name="dueDate"
                rules={{ required: "Chọn ngày hẹn trả" }}
                render={({ field, fieldState }) => (
                  <Field
                    label="Ngày hẹn"
                    htmlFor="dueDate"
                    error={fieldState.error?.message}
                  >
                    <Input
                      id="dueDate"
                      type="date"
                      className="date-input"
                      min={todayVN()}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </Field>
                )}
              />
              <div className="date-shortcuts" aria-label="Ngày hẹn trả nhanh">
                {[
                  { label: "Hôm nay", value: todayVN() },
                  { label: "Ngày mai", value: addDays(todayVN(), 1) },
                  { label: "+2 ngày", value: addDays(todayVN(), 2) },
                ].map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    variant={
                      selectedDueDate === option.value ? "default" : "outline"
                    }
                    aria-pressed={selectedDueDate === option.value}
                    onClick={() =>
                      form.setValue("dueDate", option.value, {
                        shouldValidate: true,
                      })
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <Field label="Buổi hẹn trả">
                <QuickChoice
                  value={duePeriod}
                  onChange={(value) => setDuePeriod(value)}
                  ariaLabel="Buổi hẹn trả"
                  options={[
                    { label: "Sáng", value: "MORNING" },
                    { label: "Chiều", value: "AFTERNOON" },
                  ]}
                />
              </Field>
            </div>
            <TextareaField
              control={form.control}
              name="deliveryAddress"
              label="Địa chỉ giao hàng"
              rows={3}
              placeholder="Nhập địa chỉ nếu cần giao tận nơi"
            />
          </section>
        </div>

        <BottomActionBar>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={create.isPending}
          >
            {create.isPending ? "ĐANG TẠO ĐƠN..." : "TẠO ĐƠN"}
          </Button>
        </BottomActionBar>
      </form>
    </div>
  );
}
