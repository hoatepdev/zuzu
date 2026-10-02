import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntApp, Button, Form, Input, InputNumber, Modal, Spin, Switch } from "antd";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { CustomerDetail } from "../api/types";
import { Money, PageHeader, StatusBadge, orderTime } from "../components/common";
import { useSession } from "../session";
export function CustomerDetailPage() {
  const { message } = AntApp.useApp();
  const { id = "" } = useParams();
  const session = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const query = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api<CustomerDetail>(`/customers/${id}`),
  });
  const save = useMutation({
    mutationFn: (values: Partial<CustomerDetail>) =>
      api(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["customer", id] });
      message.success("Đã cập nhật khách");
    },
  });
  const adjust = useMutation({
    mutationFn: (values: { points: number; reason: string }) =>
      api(`/customers/${id}/loyalty-adjust`, { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      setAdjustOpen(false);
      adjustForm.resetFields();
      void qc.invalidateQueries({ queryKey: ["customer", id] });
      message.success("Đã điều chỉnh điểm");
    },
  });
  const customer = query.data;
  if (query.isLoading) return <div className="center"><Spin/></div>;
  if (!customer) return <div className="center">Không tải được khách hàng</div>;
  const edit = () => {
    form.setFieldsValue(customer);
    setOpen(true);
  };
  return (
    <>
      <PageHeader
        sub={customer.phone}
        extra={session.data?.role !== "STAFF" ? (
          <>
            <Button onClick={edit}>Sửa</Button>
            <Button style={{ marginLeft: 8 }} onClick={() => setAdjustOpen(true)}>Điểm</Button>
          </>
        ) : undefined}
      >
        {customer.name ?? customer.phone}
      </PageHeader>
      <div className="panel detail-list">
        <div className="detail-row"><span>Tổng chi</span><strong><Money value={customer.totalSpent}/></strong></div>
        <div className="detail-row"><span>Tổng đơn</span><strong>{customer.totalOrders}</strong></div>
        <div className="detail-row"><span>Tổng kg</span><strong>{customer.totalKg}</strong></div>
        <div className="detail-row"><span>Điểm</span><strong>{customer.totalPoints}</strong></div>
        <div className="detail-row"><span>Sở thích</span><strong>{customer.laundryPreference ?? "—"}</strong></div>
        <div className="detail-row"><span>Ghi chú</span><strong>{customer.note ?? "—"}</strong></div>
      </div>
      <div className="panel">
        <h2 className="panel-title">Lịch sử đơn</h2>
        {customer.orders.length ? (
          <div className="order-list">
            {customer.orders.map((order) => (
              <Link key={order.id} to={`/orders/${order.code}`} className="order-card">
                <div className="oc-top">
                  <span className="oc-code">{order.code}</span>
                  <StatusBadge status={order.status}/>
                </div>
                <div className="oc-bottom">
                  <span className="oc-time">{orderTime(order.createdAt)}</span>
                  <span className="oc-total"><Money value={order.total}/></span>
                </div>
              </Link>
            ))}
          </div>
        ) : <p style={{ margin: 0, color: "var(--ink-2)" }}>Chưa có đơn</p>}
      </div>
      <div className="panel">
        <h2 className="panel-title">Lịch sử điểm</h2>
        {customer.loyalty.length ? (
          <div className="detail-list">
            {customer.loyalty.map((item) => (
              <div className="detail-row" key={item.id}>
                <span>{item.type === "ADJUSTMENT" ? "Điều chỉnh" : "Đơn"} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                <strong>{item.points > 0 ? `+${item.points}` : item.points} điểm</strong>
              </div>
            ))}
          </div>
        ) : <p style={{ margin: 0, color: "var(--ink-2)" }}>Chưa có điểm</p>}
      </div>
      <Modal
        title="Sửa khách hàng"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
          <Form.Item name="name" label="Tên"><Input/></Form.Item>
          <Form.Item name="laundryPreference" label="Sở thích giặt"><Input/></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea/></Form.Item>
          <Form.Item name="marketingOptIn" label="Nhận tin marketing" valuePropName="checked"><Switch/></Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Điều chỉnh điểm"
        open={adjustOpen}
        onCancel={() => setAdjustOpen(false)}
        onOk={() => adjustForm.submit()}
        confirmLoading={adjust.isPending}
      >
        <Form form={adjustForm} layout="vertical" onFinish={(values) => adjust.mutate(values)}>
          <Form.Item name="points" label="Điểm (số âm để trừ)" rules={[{ required: true }]}>
            <InputNumber precision={0} style={{ width: "100%" }}/>
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, min: 3, message: "Tối thiểu 3 ký tự" }]}>
            <Input/>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
