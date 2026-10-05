import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Spin } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Order } from "../api/types";
import { BottomActionBar, PageHeader } from "../components/common";
import { isPhoneInput, normalizePhone } from "./ReceivePage";

export function AttachCustomerPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [phone, setPhone] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>();

  useEffect(() => {
    const value = phone.trim();
    const digits = normalizePhone(value).replace(/\D/g, "");
    if (!value || digits.length < 3) {
      setSearchQuery("");
      return;
    }
    const timer = window.setTimeout(
      () => setSearchQuery(normalizePhone(value)),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [phone]);

  const customers = useQuery({
    queryKey: ["customers", "lookup", searchQuery],
    queryFn: () =>
      api<Customer[]>(
        `/customers/search?q=${encodeURIComponent(searchQuery)}`,
      ),
    enabled: searchQuery.length > 0,
  });

  const attach = useMutation({
    mutationFn: (values: { phone: string; name?: string }) =>
      api<Order>(`/orders/${id}/attach-customer`, {
        method: "POST",
        body: JSON.stringify({
          phone: normalizePhone(values.phone),
          name: values.name?.trim() || undefined,
        }),
      }),
    onSuccess: (order) => navigate(`/orders/${order.code}`),
  });

  const chooseCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPhone(customer.phone);
    form.setFieldsValue({ phone: customer.phone });
  };
  const notFound =
    searchQuery &&
    !customers.isFetching &&
    !customers.data?.length &&
    isPhoneInput(phone) &&
    !selectedCustomer;

  return (
    <div className="has-bottom-action">
      <PageHeader sub={`Đơn ${id.toUpperCase()}`}>Gắn khách</PageHeader>
      {attach.error && (
        <Alert
          className="customer-match"
          type="error"
          message={attach.error.message}
          showIcon
        />
      )}
      <Form
        className="task-form"
        form={form}
        layout="vertical"
        onFinish={(values) => attach.mutate(values)}
      >
        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[{ required: true, message: "Nhập số điện thoại" }]}
        >
          <Input
            autoFocus
            autoComplete="tel"
            size="large"
            inputMode="tel"
            placeholder="09xxxxxxxx"
            onChange={(event) => {
              setPhone(event.target.value);
              if (
                selectedCustomer &&
                normalizePhone(event.target.value) !== selectedCustomer.phone
              )
                setSelectedCustomer(undefined);
            }}
          />
        </Form.Item>
        {customers.isFetching && (
          <div className="lookup-state" role="status">
            <Spin size="small" /> Đang tìm khách...
          </div>
        )}
        {searchQuery && customers.data?.length && !selectedCustomer ? (
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
        ) : notFound ? (
          <div className="new-customer-panel" role="status">
            <p>Không tìm thấy khách hàng.</p>
          </div>
        ) : null}
        {selectedCustomer ? (
          <Alert
            className="customer-match"
            type="success"
            message={`${selectedCustomer.name ?? "Khách cũ"} · ${selectedCustomer.totalOrders} đơn`}
            showIcon
          />
        ) : notFound ? (
          <Form.Item name="name" label="Tên khách mới (không bắt buộc)">
            <Input size="large" placeholder="Nguyễn Văn A" />
          </Form.Item>
        ) : null}
        <BottomActionBar>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={attach.isPending}
            disabled={attach.isPending}
          >
            {attach.isPending ? "ĐANG GẮN KHÁCH..." : "GẮN KHÁCH"}
          </Button>
        </BottomActionBar>
      </Form>
    </div>
  );
}
