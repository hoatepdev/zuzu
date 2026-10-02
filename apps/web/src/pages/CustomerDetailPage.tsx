import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App as AntApp,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Switch,
} from "antd";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { CustomerDetail } from "../api/types";
import { Money, PageTitle, StatusBadge } from "../components/common";
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
      api(`/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["customer", id] });
      message.success("Đã cập nhật khách");
    },
  });
  const adjust = useMutation({
    mutationFn: (values: { points: number; reason: string }) =>
      api(`/customers/${id}/loyalty-adjust`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setAdjustOpen(false);
      adjustForm.resetFields();
      void qc.invalidateQueries({ queryKey: ["customer", id] });
      message.success("Đã điều chỉnh điểm");
    },
  });
  const customer = query.data;
  if (!customer) return <div className="center">Đang tải…</div>;
  const edit = () => {
    form.setFieldsValue(customer);
    setOpen(true);
  };
  return (
    <>
      <div className="title-row">
        <PageTitle>{customer.name ?? customer.phone}</PageTitle>
        {session.data?.role !== "STAFF" && (
          <>
            <Button onClick={edit}>Sửa</Button>
            <Button
              style={{ marginLeft: 8 }}
              onClick={() => setAdjustOpen(true)}
            >
              Điểm
            </Button>
          </>
        )}
      </div>
      <Card>
        <Descriptions column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="SĐT">{customer.phone}</Descriptions.Item>
          <Descriptions.Item label="Tổng chi">
            <Money value={customer.totalSpent} />
          </Descriptions.Item>
          <Descriptions.Item label="Tổng đơn">
            {customer.totalOrders}
          </Descriptions.Item>
          <Descriptions.Item label="Tổng kg">
            {customer.totalKg}
          </Descriptions.Item>
          <Descriptions.Item label="Điểm">
            {customer.totalPoints}
          </Descriptions.Item>
          <Descriptions.Item label="Sở thích">
            {customer.laundryPreference ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Ghi chú">
            {customer.note ?? "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="Lịch sử đơn" className="list-card">
        <List
          dataSource={customer.orders}
          locale={{ emptyText: "Chưa có đơn" }}
          renderItem={(order) => (
            <List.Item extra={<Money value={order.total} />}>
              <List.Item.Meta
                title={
                  <Link to={`/orders/${order.code}`}>
                    {order.code} <StatusBadge status={order.status} />
                  </Link>
                }
                description={new Date(order.createdAt).toLocaleString("vi-VN")}
              />
            </List.Item>
          )}
        />
      </Card>
      <Card title="Lịch sử điểm" className="list-card">
        <List
          dataSource={customer.loyalty}
          locale={{ emptyText: "Chưa có điểm" }}
          renderItem={(item) => (
            <List.Item>
              <strong>
                {item.points > 0 ? `+${item.points}` : item.points}
              </strong>
              &nbsp;điểm ·{" "}
              {item.type === "ADJUSTMENT" ? "Điều chỉnh" : "Đơn"} ·{" "}
              {new Date(item.createdAt).toLocaleDateString("vi-VN")}
            </List.Item>
          )}
        />
      </Card>
      <Modal
        title="Sửa khách hàng"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
          <Form.Item name="name" label="Tên">
            <Input />
          </Form.Item>
          <Form.Item name="laundryPreference" label="Sở thích giặt">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea />
          </Form.Item>
          <Form.Item
            name="marketingOptIn"
            label="Nhận tin marketing"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Điều chỉnh điểm"
        open={adjustOpen}
        onCancel={() => setAdjustOpen(false)}
        onOk={() => adjustForm.submit()}
        confirmLoading={adjust.isPending}
      >
        <Form
          form={adjustForm}
          layout="vertical"
          onFinish={(values) => adjust.mutate(values)}
        >
          <Form.Item name="points" label="Điểm (số âm để trừ)" rules={[{ required: true }]}>
            <InputNumber precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do"
            rules={[{ required: true, min: 3, message: "Tối thiểu 3 ký tự" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
