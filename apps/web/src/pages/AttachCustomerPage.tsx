import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import { useDeferredValue, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Order } from "../api/types";
import { BottomActionBar, PageHeader } from "../components/common";

export function AttachCustomerPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const deferredPhone = useDeferredValue(phone);
  const normalizedPhone = deferredPhone.replace(/\s/g, "");
  const customers = useQuery({
    queryKey: ["customers", "lookup", normalizedPhone],
    queryFn: () =>
      api<Customer[]>(
        `/customers/search?q=${encodeURIComponent(normalizedPhone)}`,
      ),
    enabled: normalizedPhone.length >= 8,
  });
  const found = customers.data?.find(
    (customer) => customer.phone.replace(/\s/g, "") === normalizedPhone,
  );
  const attach = useMutation({
    mutationFn: (values: { phone: string; name?: string }) =>
      api<Order>(`/orders/${id}/attach-customer`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (order) => navigate(`/orders/${order.code}`),
  });

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
            onChange={(event) => setPhone(event.target.value)}
          />
        </Form.Item>
        {customers.isFetching && (
          <div className="customer-match">Đang tìm khách...</div>
        )}
        {found ? (
          <Alert
            className="customer-match"
            type="success"
            message={`${found.name ?? "Khách cũ"} · ${found.totalOrders} đơn`}
            showIcon
          />
        ) : normalizedPhone.length >= 8 && !customers.isFetching ? (
          <Form.Item name="name" label="Tên khách mới (không bắt buộc)">
            <Input size="large" />
          </Form.Item>
        ) : null}
        <BottomActionBar>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={attach.isPending}
          >
            {attach.isPending ? "ĐANG GẮN KHÁCH..." : "GẮN KHÁCH"}
          </Button>
        </BottomActionBar>
      </Form>
    </div>
  );
}
