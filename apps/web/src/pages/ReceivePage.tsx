import { CloseOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Order, Service } from "../api/types";
import { BottomActionBar, PageHeader, QuickChoice } from "../components/common";

const notes = ["Không có", "Giặt riêng", "Ít thơm", "Không nước xả", "Khác"];
const normalizePhone = (value: string) => value.replace(/\s/g, "");
const todayVN = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
};

export function ReceivePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [unknown, setUnknown] = useState(false);
  const [phone, setPhone] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [note, setNote] = useState("Không có");
  const [duePeriod, setDuePeriod] = useState<"" | "MORNING" | "AFTERNOON">("");
  const normalizedPhone = normalizePhone(phone);
  const services = useQuery({
    queryKey: ["services"],
    queryFn: () => api<Service[]>("/services"),
  });
  const customers = useQuery({
    queryKey: ["customers", "receive-lookup", lookupPhone],
    queryFn: () => api<Customer[]>(`/customers/search?q=${encodeURIComponent(lookupPhone)}`),
    enabled: !unknown && lookupPhone.length >= 4,
  });

  useEffect(() => {
    const normalized = normalizedPhone.replace(/\D/g, "");
    if (normalized.length < 4 || unknown) {
      setLookupPhone("");
      return;
    }
    const timer = window.setTimeout(() => setLookupPhone(normalized), 350);
    return () => window.clearTimeout(timer);
  }, [normalizedPhone, unknown]);

  const serviceById = useMemo(
    () => new Map((services.data ?? []).map((service) => [service.id, service])),
    [services.data],
  );
  const create = useMutation({
    mutationFn: (values: { phone?: string; customerName?: string; customNote?: string; dueDate: string; deliveryAddress?: string }) =>
      api<Order>("/orders", {
        method: "POST",
        body: JSON.stringify({
          phone: unknown ? undefined : normalizePhone(values.phone ?? ""),
          customerId: selectedCustomer?.id,
          customerName: values.customerName,
          customerAddress: selectedCustomer?.address,
          note: note === "Không có" ? undefined : note === "Khác" ? values.customNote : note,
          customerUnknown: unknown,
          dueDate: values.dueDate,
          duePeriod: duePeriod || undefined,
          deliveryAddress: values.deliveryAddress?.trim() || undefined,
          serviceIds: selectedServices,
        }),
      }),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate("/", { state: { receivedCode: order.code } });
    },
  });

  const chooseCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPhone(customer.phone);
    form.setFieldsValue({ phone: customer.phone, customerName: customer.name, deliveryAddress: customer.address });
    setLookupPhone("");
  };
  const toggleService = (serviceId: string) => {
    setSelectedServices((current) => current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId]);
  };
  const dueDefault = addDays(todayVN(), 1);

  return (
    <div className="has-bottom-action">
      <PageHeader sub="SĐT → tên → dịch vụ → hẹn trả → tạo đơn">Nhận đồ</PageHeader>
      {(create.error || services.error) && (
        <Alert className="customer-match" type="error" message={(create.error ?? services.error)?.message} showIcon />
      )}
      <Form className="task-form receive-form" form={form} layout="vertical" initialValues={{ dueDate: dueDefault }} onFinish={(values) => create.mutate(values)}>
        <section className="task-section customer-section">
          <div className="customer-mode" role="group" aria-label="Thông tin khách">
            <Button className={!unknown ? "active" : ""} type={!unknown ? "primary" : "default"} aria-pressed={!unknown} onClick={() => setUnknown(false)} disabled={create.isPending}>Có SĐT khách</Button>
            <Button className={unknown ? "active" : ""} type={unknown ? "primary" : "default"} aria-pressed={unknown} onClick={() => { setUnknown(true); setSelectedCustomer(undefined); }} disabled={create.isPending}>Chưa rõ khách</Button>
          </div>
          {!unknown ? (
            <>
              <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: "Nhập số điện thoại" }]}>
                <Input autoFocus autoComplete="tel" inputMode="tel" size="large" placeholder="Nhập từ 4 số để tìm khách" onChange={(event) => { setPhone(event.target.value); if (selectedCustomer && normalizePhone(event.target.value) !== selectedCustomer.phone) setSelectedCustomer(undefined); }} />
              </Form.Item>
              {customers.isFetching && <div className="lookup-state" role="status"><Spin size="small" /> Đang tìm khách...</div>}
              {customers.data?.length && !selectedCustomer ? (
                <div className="customer-suggestions" role="listbox" aria-label="Gợi ý khách hàng">
                  {customers.data.map((customer) => <button type="button" className="customer-suggestion" role="option" key={customer.id} onClick={() => chooseCustomer(customer)}><strong>{customer.name ?? "Khách cũ"}</strong><span>{customer.phone}</span></button>)}
                </div>
              ) : null}
              <Form.Item name="customerName" label="Tên khách">
                <Input size="large" placeholder="Nam, Chị Hoa..." />
              </Form.Item>
            </>
          ) : <div className="unknown-banner" role="status">Đang nhận cho khách chưa xác định</div>}
        </section>

        <section className="task-section service-section">
          <div className="section-heading"><strong>Dịch vụ dự kiến</strong><small>Chỉ đánh dấu để theo dõi, chưa nhập số lượng hay giá</small></div>
          {services.isLoading ? <div className="lookup-state"><Spin size="small" /> Đang tải dịch vụ...</div> : <div className="receive-services">{(services.data ?? []).map((service) => { const selected = selectedServices.includes(service.id); return <button type="button" key={service.id} className={`receive-service ${selected ? "selected" : ""}`} aria-pressed={selected} onClick={() => toggleService(service.id)}><span>{service.name}</span>{selected && <CloseOutlined aria-hidden="true" />}</button>; })}</div>}
        </section>

        <section className="task-section schedule-section">
          <Form.Item name="dueDate" label="Hẹn trả" rules={[{ required: true, message: "Chọn ngày hẹn trả" }]}>
            <Input type="date" size="large" />
          </Form.Item>
          <div className="date-shortcuts" aria-label="Ngày hẹn trả nhanh">
            {[{ label: "Hôm nay", value: todayVN() }, { label: "Ngày mai", value: dueDefault }, { label: "+2 ngày", value: addDays(todayVN(), 2) }].map((option) => <Button key={option.label} type={form.getFieldValue("dueDate") === option.value ? "primary" : "default"} onClick={() => form.setFieldValue("dueDate", option.value)}>{option.label}</Button>)}
          </div>
          <Form.Item label="Buổi hẹn trả">
            <QuickChoice
              value={duePeriod}
              onChange={(event) => setDuePeriod(event.target.value as "" | "MORNING" | "AFTERNOON")}
              options={[{ label: "Không chọn", value: "" }, { label: "Sáng", value: "MORNING" }, { label: "Chiều", value: "AFTERNOON" }]}
            />
          </Form.Item>
          <Form.Item name="deliveryAddress" label="Địa chỉ giao hàng">
            <Input.TextArea rows={3} placeholder="Nhập địa chỉ nếu cần giao tận nơi" />
          </Form.Item>
        </section>

        <section className="task-section note-section">
          <Form.Item label="Lưu ý cho đơn"><QuickChoice options={notes} value={note} disabled={create.isPending} onChange={(event) => setNote(event.target.value)} /></Form.Item>
          {note === "Khác" && <Form.Item name="customNote" label="Lưu ý khác" rules={[{ required: true, message: "Nhập lưu ý" }]}><Input.TextArea rows={3} placeholder="Ví dụ: đồ dễ phai màu" /></Form.Item>}
        </section>
        <BottomActionBar><Button type="primary" htmlType="submit" size="large" block loading={create.isPending} disabled={create.isPending}>{create.isPending ? "ĐANG TẠO ĐƠN..." : "TẠO ĐƠN"}</Button></BottomActionBar>
      </Form>
    </div>
  );
}
