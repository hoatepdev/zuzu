import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
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

const notes = ["Giặt riêng", "Ít thơm", "Không nước xả", "Khác"];
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
  const [note, setNote] = useState("Không có");
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
  }, [customerInput, unknown, newCustomer]);

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
          note:
            note === "Không có"
              ? undefined
              : note === "Khác"
                ? values.customNote
                : note,
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
    setSelectedCustomer(customer);
    setNewCustomer(false);
    setCustomerInput(customer.phone);
    form.setValue("customerLookup", customer.phone);
    form.setValue("customerName", customer.name);
    form.setValue("deliveryAddress", customer.address);
    setCustomerSearchQuery("");
  };
  const toggleService = (serviceId: string) => {
    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };
  const dueDefault = addDays(todayVN(), 1);

  return (
    <div className="has-bottom-action">
      <PageHeader sub="SĐT → tên → dịch vụ → hẹn trả → tạo đơn">
        Nhận đồ
      </PageHeader>
      {(create.error || services.error) && (
        <Banner
          className="customer-match"
          tone="error"
          title={(create.error ?? services.error)?.message}
        />
      )}
      <form
        className="task-form receive-form"
        onSubmit={form.handleSubmit((values) => create.mutate(values))}
      >
        <section className="task-section customer-section">
          <div className="step-heading">
            <span className="step-chip" aria-hidden="true">1</span>
            <div>
              <strong>Khách hàng</strong>
              <small>Nhập SĐT hoặc tên, chọn gợi ý nếu có</small>
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
              Có SĐT khách
            </Button>
            <Button
              type="button"
              variant={unknown ? "default" : "outline"}
              aria-pressed={unknown}
              onClick={() => {
                setUnknown(true);
                setNewCustomer(false);
                setSelectedCustomer(undefined);
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
                    required: "Nhập số điện thoại hoặc tên khách",
                  }}
                  render={({ field, fieldState }) => (
                    <Field
                      label="Khách hàng"
                      htmlFor="customerLookup"
                      error={fieldState.error?.message}
                    >
                      <Input
                        id="customerLookup"
                        className="input-lg"
                        autoFocus
                        autoComplete="off"
                        placeholder="Nhập số điện thoại hoặc tên khách"
                        disabled={newCustomer || create.isPending}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.preventDefault();
                        }}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) => {
                          field.onChange(event.target.value);
                          setCustomerInput(event.target.value);
                          setNewCustomer(false);
                          if (
                            selectedCustomer &&
                            normalizePhone(event.target.value) !==
                              selectedCustomer.phone
                          )
                            setSelectedCustomer(undefined);
                        }}
                      />
                    </Field>
                  )}
                />
              </div>

              {customers.isFetching && (
                <div className="lookup-state" role="status">
                  <Spinner className="size-4" /> Đang tìm khách...
                </div>
              )}
              {customerSearchQuery &&
              customers.data?.length &&
              !selectedCustomer ? (
                <div
                  className="customer-suggestions"
                  role="listbox"
                  aria-label="Gợi ý khách hàng"
                >
                  {customers.data.map((customer) => (
                    <Button
                      type="button"
                      variant="ghost"
                      className="customer-suggestion"
                      role="option"
                      key={customer.id}
                      onClick={() => chooseCustomer(customer)}
                    >
                      <strong>
                        {customer.name ?? "Khách cũ"} - {customer.phone}
                      </strong>
                    </Button>
                  ))}
                </div>
              ) : customerSearchQuery &&
                !customers.isFetching &&
                !customers.data?.length &&
                (addingPhone || addingName) ? (
                <div className="new-customer-panel">
                  <p>Không tìm thấy khách hàng.</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setNewCustomer(true);
                      form.setValue(
                        "newCustomerPhone",
                        addingPhone ? normalizePhone(customerInput) : undefined,
                      );
                      form.setValue(
                        "customerName",
                        addingPhone ? undefined : customerInput.trim(),
                      );
                    }}
                  >
                    + Thêm mới khách hàng
                  </Button>
                </div>
              ) : null}
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
                            placeholder="Nguyễn Văn A"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.preventDefault();
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
                              if (event.key === "Enter") event.preventDefault();
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

        <section className="task-section service-section">
          <div className="step-heading">
            <span className="step-chip" aria-hidden="true">2</span>
            <div>
              <strong>Dịch vụ dự kiến</strong>
              <small>Chỉ đánh dấu để theo dõi, chưa nhập số lượng hay giá</small>
            </div>
          </div>
          {services.isLoading ? (
            <div className="lookup-state">
              <Spinner className="size-4" /> Đang tải dịch vụ...
            </div>
          ) : (
            <div className="receive-services">
              {(services.data ?? []).map((service) => {
                const selected = selectedServices.includes(service.id);
                return (
                  <Button
                    type="button"
                    variant="ghost"
                    key={service.id}
                    className={`receive-service ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => toggleService(service.id)}
                  >
                    <span>{service.name}</span>
                    {selected && <X aria-hidden="true" />}
                  </Button>
                );
              })}
            </div>
          )}
        </section>

        <section className="task-section schedule-section">
          <div className="step-heading">
            <span className="step-chip" aria-hidden="true">3</span>
            <div>
              <strong>Hẹn trả</strong>
              <small>Ngày, buổi và địa chỉ giao nếu cần</small>
            </div>
          </div>
          <div className="schedule-grid">
            <Controller
              control={form.control}
              name="dueDate"
              rules={{ required: "Chọn ngày hẹn trả" }}
              render={({ field, fieldState }) => (
                <Field
                  label="Hẹn trả"
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
                { label: "Ngày mai", value: dueDefault },
                { label: "+2 ngày", value: addDays(todayVN(), 2) },
              ].map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  variant={selectedDueDate === option.value ? "default" : "outline"}
                  onClick={() => form.setValue("dueDate", option.value, { shouldValidate: true })}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Field label="Buổi hẹn trả">
              <QuickChoice
                value={duePeriod}
                onChange={(value) => setDuePeriod(value)}
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

        <section className="task-section note-section">
          <Field label="Lưu ý cho đơn">
            <QuickChoice
              options={notes.map((value) => ({ label: value, value }))}
              value={note}
              disabled={create.isPending}
              onChange={(value) => setNote(value)}
            />
          </Field>
          {note === "Khác" && (
            <TextareaField
              control={form.control}
              name="customNote"
              label="Lưu ý khác"
              rows={3}
              placeholder="Ví dụ: đồ dễ phai màu"
              rules={{ required: "Nhập lưu ý" }}
            />
          )}
        </section>
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
