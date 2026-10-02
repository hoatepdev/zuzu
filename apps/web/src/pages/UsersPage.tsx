import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App as AntApp,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
} from "antd";
import { useState } from "react";
import { api } from "../api/client";
import { UserAccount } from "../api/types";
import { PageHeader } from "../components/common";

export function UsersPage() {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<UserAccount | null>(null);
  const [form] = Form.useForm();
  const [createForm] = Form.useForm();
  const [resetForm] = Form.useForm();
  const query = useQuery({
    queryKey: ["users"],
    queryFn: () => api<UserAccount[]>("/users"),
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["users"] });
  const save = useMutation({
    mutationFn: (values: {
      username: string;
      phone?: string;
      name: string;
      role: string;
      active: boolean;
    }) =>
      api(`/users/${editing!.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setEditing(null);
      refresh();
      message.success("Đã cập nhật nhân viên");
    },
  });
  const create = useMutation({
    mutationFn: (values: {
      username: string;
      phone?: string;
      name: string;
      role: string;
      password: string;
    }) =>
      api<UserAccount>("/users", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setCreating(false);
      refresh();
      message.success("Đã thêm nhân viên");
    },
  });
  const toggle = useMutation({
    mutationFn: (user: UserAccount) =>
      api(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !user.active }),
      }),
    onSuccess: () => {
      refresh();
      message.success("Đã cập nhật");
    },
    onError: (error) => message.error(error.message),
  });
  const reset = useMutation({
    mutationFn: (values: { password: string }) =>
      api(`/users/${resetting!.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setResetting(null);
      message.success("Đã đặt lại mật khẩu");
    },
  });
  const edit = (user: UserAccount) => {
    form.setFieldsValue(user);
    setEditing(user);
  };
  return (
    <>
      <PageHeader
        sub="Tài khoản đăng nhập của cửa hàng"
        extra={
          <Button
            type="primary"
            onClick={() => {
              createForm.resetFields();
              setCreating(true);
            }}
          >
            + NHÂN VIÊN
          </Button>
        }
      >
        Nhân viên
      </PageHeader>
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data}
        pagination={false}
        scroll={{ x: 820 }}
        columns={[
          { title: "Tên đăng nhập", dataIndex: "username" },
          { title: "Tên", dataIndex: "name" },
          {
            title: "SĐT",
            dataIndex: "phone",
            render: (value?: string) => value ?? "—",
          },
          {
            title: "Vai trò",
            dataIndex: "role",
            render: (role: string) => (
              <Tag
                color={
                  role === "OWNER"
                    ? "gold"
                    : role === "MANAGER"
                      ? "blue"
                      : undefined
                }
              >
                {role === "OWNER"
                  ? "Chủ cửa hàng"
                  : role === "MANAGER"
                    ? "Quản lý"
                    : "Nhân viên"}
              </Tag>
            ),
          },
          {
            title: "Trạng thái",
            render: (_, user) => (
              <Tag color={user.active ? "green" : "default"}>
                {user.active ? "Đang hoạt động" : "Đã khoá"}
              </Tag>
            ),
          },
          {
            title: "",
            render: (_, user) => (
              <>
                <Button size="small" onClick={() => edit(user)}>
                  Sửa
                </Button>
                {user.role !== "OWNER" && (
                  <Popconfirm
                    title={
                      user.active ? "Khoá tài khoản này?" : "Mở lại tài khoản?"
                    }
                    onConfirm={() => toggle.mutate(user)}
                  >
                    <Button
                      size="small"
                      danger={user.active}
                      style={{ marginLeft: 8 }}
                    >
                      {user.active ? "Khoá" : "Mở"}
                    </Button>
                  </Popconfirm>
                )}
                <Button
                  size="small"
                  style={{ marginLeft: 8 }}
                  onClick={() => {
                    resetForm.resetFields();
                    setResetting(user);
                  }}
                >
                  Đặt lại mật khẩu
                </Button>
              </>
            ),
          },
        ]}
      />
      <Modal
        title={`Sửa ${editing?.name ?? ""}`}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="Tên hiển thị"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="SĐT">
            <Input />
          </Form.Item>
          {editing?.role !== "OWNER" && (
            <Form.Item name="role" label="Vai trò">
              <Select options={[{ value: "STAFF" }, { value: "MANAGER" }]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
      <Modal
        title="Thêm nhân viên"
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={() => createForm.submit()}
        confirmLoading={create.isPending}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(values) => create.mutate(values)}
        >
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="Tên hiển thị"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="SĐT">
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="Vai trò"
            initialValue="STAFF"
            rules={[{ required: true }]}
          >
            <Select options={[{ value: "STAFF" }, { value: "MANAGER" }]} />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, min: 6, message: "Tối thiểu 6 ký tự" }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`Đặt lại mật khẩu cho ${resetting?.name ?? ""}`}
        open={!!resetting}
        onCancel={() => setResetting(null)}
        onOk={() => resetForm.submit()}
        confirmLoading={reset.isPending}
      >
        <Form
          form={resetForm}
          layout="vertical"
          onFinish={(values) => reset.mutate(values)}
        >
          <Form.Item
            name="password"
            label="Mật khẩu mới"
            rules={[{ required: true, min: 6, message: "Tối thiểu 6 ký tự" }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
