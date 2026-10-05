import { CloseOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, DatePicker, Form, Input, Spin } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Order, Service } from "../api/types";
import { BottomActionBar, PageHeader, QuickChoice } from "../components/common";

const notes = ["Giặt riêng", "Ít thơm", "Không nước xả", "Khác"];
export const normalizePhone = (value: string) => {
  const compact = value.replace(/[\s().-]/g, "");
  return compact.startsWith("+84") ? `0${compact.slice(3)}` : compact;
};
export const isPhoneInput = (value: string) => {
  const compact = value.replace(/[\s().-]/g, "");
  return /^(?:0\d{9}|\+84\d{9})$/.test(compact);
};
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
const INVALID_DUE_DATE = "Ngày hẹn trả không hợp lệ";
const PAST_DUE_DATE = "Ngày hẹn trả phải là hôm nay hoặc ngày sau đó";
type DueDateResult =
  | { value: string; display: string }
  | { error: string }
  | null;

const calendarDate = (year: number, month: number, day: number) => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDay) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
const dueDateResult = (value: string, today = todayVN()): DueDateResult => {
  const input = value.trim();
  if (!input) return null;
  const [todayYear, todayMonth] = today.split("-").map(Number);
  let date: string | null = null;

  const full = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const compact = input.match(/^(\d{2})(\d{2})$/);
  const shortDay = input.match(/^(\d{1,2})$/);
  if (full) {
    date = calendarDate(Number(full[3]), Number(full[2]), Number(full[1]));
  } else if (iso) {
    date = calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  } else if (compact) {
    const day = Number(compact[1]);
    const month = Number(compact[2]);
    for (let yearOffset = 0; yearOffset <= 8 && !date; yearOffset += 1) {
      const candidate = calendarDate(todayYear + yearOffset, month, day);
      if (candidate && candidate >= today) date = candidate;
    }
  } else if (shortDay) {
    const day = Number(shortDay[1]);
    for (let monthOffset = 0; monthOffset <= 12 && !date; monthOffset += 1) {
      const monthIndex = todayMonth - 1 + monthOffset;
      const year = todayYear + Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      const candidate = calendarDate(year, month, day);
      if (candidate && candidate >= today) date = candidate;
    }
  } else {
    return { error: INVALID_DUE_DATE };
  }
  if (!date) return { error: INVALID_DUE_DATE };
  if (date < today) return { error: PAST_DUE_DATE };
  const [year, month, day] = date.split("-");
  return { value: date, display: `${day}/${month}/${year}` };
};

export function ReceivePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [unknown, setUnknown] = useState(false);
  const [customerInput, setCustomerInput] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>();
  const [newCustomer, setNewCustomer] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [note, setNote] = useState("Không có");
  const [duePeriod, setDuePeriod] = useState<"" | "MORNING" | "AFTERNOON">("");
  const selectedDueDate = Form.useWatch("dueDate", form);
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
    mutationFn: (values: {
      customerLookup?: string;
      customerName?: string;
      newCustomerPhone?: string;
      customNote?: string;
      dueDate: string;
      deliveryAddress?: string;
    }) =>
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
    form.setFieldsValue({
      customerLookup: customer.phone,
      customerName: customer.name,
      deliveryAddress: customer.address,
    });
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
  const normalizeDueDate = (raw: string) => {
    const result = dueDateResult(raw);
    if (!result) {
      form.setFields([{ name: "dueDate", value: undefined, errors: [] }]);
    } else if ("error" in result) {
      form.setFields([
        { name: "dueDate", value: undefined, errors: [result.error] },
      ]);
    } else {
      form.setFields([{ name: "dueDate", value: result.value, errors: [] }]);
    }
    return result;
  };

  return (
    <div className="has-bottom-action">
      <PageHeader sub="SĐT → tên → dịch vụ → hẹn trả → tạo đơn">
        Nhận đồ
      </PageHeader>
      {(create.error || services.error) && (
        <Alert
          className="customer-match"
          type="error"
          message={(create.error ?? services.error)?.message}
          showIcon
        />
      )}
      <Form
        className="task-form receive-form"
        form={form}
        layout="vertical"
        initialValues={{ dueDate: dueDefault }}
        onFinish={(values) => create.mutate(values)}
      >
        <section className="task-section customer-section">
          <div
            className="customer-mode"
            role="group"
            aria-label="Thông tin khách"
          >
            <Button
              className={!unknown ? "active" : ""}
              type={!unknown ? "primary" : "default"}
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
              className={unknown ? "active" : ""}
              type={unknown ? "primary" : "default"}
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
                <Form.Item
                  name="customerLookup"
                  label="Khách hàng"
                  rules={[
                    {
                      required: true,
                      message: "Nhập số điện thoại hoặc tên khách",
                    },
                  ]}
                >
                  <Input
                    autoFocus
                    autoComplete="off"
                    size="large"
                    placeholder="Nhập số điện thoại hoặc tên khách"
                    disabled={newCustomer || create.isPending}
                    onChange={(event) => {
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
                </Form.Item>
              </div>

              {customers.isFetching && (
                <div className="lookup-state" role="status">
                  <Spin size="small" /> Đang tìm khách...
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
                    <button
                      type="button"
                      className="customer-suggestion"
                      role="option"
                      key={customer.id}
                      onClick={() => chooseCustomer(customer)}
                    >
                      <strong>
                        {customer.name ?? "Khách cũ"} - {customer.phone}
                      </strong>
                    </button>
                  ))}
                </div>
              ) : customerSearchQuery &&
                !customers.isFetching &&
                !customers.data?.length &&
                (addingPhone || addingName) ? (
                <div className="new-customer-panel">
                  <p>Không tìm thấy khách hàng.</p>
                  <Button
                    type="dashed"
                    block
                    onClick={() => {
                      setNewCustomer(true);
                      form.setFieldsValue({
                        newCustomerPhone: addingPhone
                          ? normalizePhone(customerInput)
                          : undefined,
                        customerName: addingPhone
                          ? undefined
                          : customerInput.trim(),
                      });
                    }}
                  >
                    + Thêm mới khách hàng
                  </Button>
                </div>
              ) : null}
              {newCustomer && (
                <div className="new-customer-fields">
                  {addingPhone ? (
                    <Form.Item
                      name="customerName"
                      label="Tên khách hàng"
                      rules={[
                        { required: true, message: "Nhập tên khách hàng" },
                        {
                          validator: (_, value) =>
                            isValidCustomerName(value ?? "")
                              ? Promise.resolve()
                              : Promise.reject(
                                  new Error("Nhập tên khách hàng hợp lệ"),
                                ),
                        },
                      ]}
                    >
                      <Input size="large" placeholder="Nguyễn Văn A" />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      name="newCustomerPhone"
                      label="Số điện thoại"
                      rules={[
                        { required: true, message: "Nhập số điện thoại" },
                        {
                          validator: (_, value) =>
                            isPhoneInput(value ?? "")
                              ? Promise.resolve()
                              : Promise.reject(
                                  new Error("Số điện thoại không hợp lệ"),
                                ),
                        },
                      ]}
                    >
                      <Input
                        size="large"
                        inputMode="tel"
                        placeholder="09xxxxxxxx"
                      />
                    </Form.Item>
                  )}
                  <Button
                    type="link"
                    onClick={() => {
                      setNewCustomer(false);
                      form.resetFields(["customerName", "newCustomerPhone"]);
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
          <div className="section-heading">
            <strong>Dịch vụ dự kiến</strong>
            <small>Chỉ đánh dấu để theo dõi, chưa nhập số lượng hay giá</small>
          </div>
          {services.isLoading ? (
            <div className="lookup-state">
              <Spin size="small" /> Đang tải dịch vụ...
            </div>
          ) : (
            <div className="receive-services">
              {(services.data ?? []).map((service) => {
                const selected = selectedServices.includes(service.id);
                return (
                  <button
                    type="button"
                    key={service.id}
                    className={`receive-service ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => toggleService(service.id)}
                  >
                    <span>{service.name}</span>
                    {selected && <CloseOutlined aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="task-section schedule-section">
          <div className="schedule-grid">
            <Form.Item
              name="dueDate"
              label="Hẹn trả"
              getValueProps={(value: string) => ({
                value: value ? dayjs(value) : undefined,
              })}
              normalize={(value) => value?.format("YYYY-MM-DD")}
              rules={[{ required: true, message: "Chọn ngày hẹn trả" }]}
            >
              <DatePicker
                size="large"
                format={["DD/MM/YYYY", "DDMM", "D/M/YYYY"]}
                placeholder="DD/MM/YYYY hoặc DDMM hoặc ngày"
                preserveInvalidOnBlur
                disabledDate={(current) =>
                  current.format("YYYY-MM-DD") < todayVN()
                }
                onBlur={(event) => {
                  const input = event.target;
                  if (!(input instanceof HTMLInputElement)) return;
                  const result = normalizeDueDate(input.value);
                  if (result && "display" in result) input.value = result.display;
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  const input = event.target;
                  if (!(input instanceof HTMLInputElement)) return;
                  const result = normalizeDueDate(input.value);
                  if (result && "display" in result) input.value = result.display;
                  event.preventDefault();
                }}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <div className="date-shortcuts" aria-label="Ngày hẹn trả nhanh">
              {[
                { label: "Hôm nay", value: todayVN() },
                { label: "Ngày mai", value: dueDefault },
                { label: "+2 ngày", value: addDays(todayVN(), 2) },
              ].map((option) => (
                <Button
                  key={option.label}
                  type={selectedDueDate === option.value ? "primary" : "default"}
                  onClick={() => {
                    form.setFields([
                      { name: "dueDate", value: option.value, errors: [] },
                    ]);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Form.Item label="Buổi hẹn trả">
              <QuickChoice
                value={duePeriod}
                onChange={(event) =>
                  setDuePeriod(event.target.value as "" | "MORNING" | "AFTERNOON")
                }
                options={[
                  { label: "Sáng", value: "MORNING" },
                  { label: "Chiều", value: "AFTERNOON" },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="deliveryAddress" label="Địa chỉ giao hàng">
            <Input.TextArea
              rows={3}
              placeholder="Nhập địa chỉ nếu cần giao tận nơi"
            />
          </Form.Item>
        </section>

        <section className="task-section note-section">
          <Form.Item label="Lưu ý cho đơn">
            <QuickChoice
              options={notes}
              value={note}
              disabled={create.isPending}
              onChange={(event) => setNote(event.target.value)}
            />
          </Form.Item>
          {note === "Khác" && (
            <Form.Item
              name="customNote"
              label="Lưu ý khác"
              rules={[{ required: true, message: "Nhập lưu ý" }]}
            >
              <Input.TextArea rows={3} placeholder="Ví dụ: đồ dễ phai màu" />
            </Form.Item>
          )}
        </section>
        <BottomActionBar>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={create.isPending}
            disabled={create.isPending}
          >
            {create.isPending ? "ĐANG TẠO ĐƠN..." : "TẠO ĐƠN"}
          </Button>
        </BottomActionBar>
      </Form>
    </div>
  );
}
