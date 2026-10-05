import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App as AntApp,
  Button,
  Form,
  Input,
  Popconfirm,
} from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { PageHeader } from "../components/common";
import { useSession } from "../session";
import { User } from "../api/types";

const roleLabels: Record<string, string> = {
  OWNER: "Chủ cửa hàng",
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
};
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

type ProfileValues = { name: string; phone?: string };
type PasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirm: string;
};

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="profile-row">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

export function ProfilePage() {
  const session = useSession();
  const me = session.data;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileForm] = Form.useForm<ProfileValues>();
  const [passwordForm] = Form.useForm<PasswordValues>();

  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
  });

  const saveProfile = useMutation({
    mutationFn: (values: ProfileValues) =>
      api<User>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: values.name,
          phone: values.phone?.trim() || null,
        }),
      }),
    onSuccess: (user) => {
      setEditing(false);
      queryClient.setQueryData(["session"], user);
      void queryClient.invalidateQueries({ queryKey: ["session"] });
      message.success("Đã cập nhật thông tin");
    },
    onError: (error) => message.error(error.message),
  });

  const changePassword = useMutation({
    mutationFn: (values: PasswordValues) =>
      api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      }),
    onSuccess: () => {
      setChangingPassword(false);
      message.success("Đã đổi mật khẩu");
    },
    onError: (error) => message.error(error.message),
  });

  const startEdit = () => {
    setChangingPassword(false);
    profileForm.setFieldsValue({ name: me?.name, phone: me?.phone });
    setEditing(true);
  };

  return (
    <>
      <PageHeader>Tài khoản</PageHeader>
      <div className="profile-wrap">
        <div className="panel profile-identity">
          <span
            className="avatar"
            style={{ width: 64, height: 64, borderRadius: 20, fontSize: 22 }}
          >
            {initials(me?.name)}
          </span>
          <strong style={{ fontSize: 18, marginTop: 8 }}>{me?.name}</strong>
          <span style={{ color: "var(--ink-2)" }}>
            {me?.role ? roleLabels[me.role] : ""}
          </span>
        </div>

        <div className="panel">
          <h2 className="panel-title">Thông tin tài khoản</h2>
          {editing ? (
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={(values) => saveProfile.mutate(values)}
            >
              <Form.Item
                name="name"
                label="Tên hiển thị"
                rules={[{ required: true, message: "Nhập tên hiển thị" }]}
              >
                <Input size="large" />
              </Form.Item>
              <Form.Item
                name="phone"
                label="Số điện thoại"
                rules={[
                  {
                    pattern: /^0\d{9,10}$/,
                    message: "SĐT không hợp lệ (VD: 0912345678)",
                  },
                ]}
              >
                <Input size="large" inputMode="tel" />
              </Form.Item>
              <div className="profile-actions">
                <Button
                  size="large"
                  block
                  onClick={() => setEditing(false)}
                >
                  HUỶ
                </Button>
                <Button
                  type="primary"
                  size="large"
                  block
                  htmlType="submit"
                  loading={saveProfile.isPending}
                >
                  LƯU
                </Button>
              </div>
            </Form>
          ) : (
            <>
              <InfoRow label="Tên hiển thị" value={me?.name} />
              <InfoRow label="Tên đăng nhập" value={me?.username} />
              <InfoRow label="Số điện thoại" value={me?.phone} />
              <InfoRow label="Vai trò" value={me?.role ? roleLabels[me.role] : undefined} />
              <div className="profile-actions" style={{ marginTop: 16 }}>
                <Button size="large" onClick={startEdit}>
                  CHỈNH SỬA
                </Button>
                <Button
                  size="large"
                  onClick={() => {
                    passwordForm.resetFields();
                    setChangingPassword(true);
                  }}
                >
                  ĐỔI MẬT KHẨU
                </Button>
              </div>
              {changingPassword && (
                <Form
                  form={passwordForm}
                  layout="vertical"
                  style={{ marginTop: 12 }}
                  onFinish={(values) => changePassword.mutate(values)}
                >
                  <Form.Item
                    name="currentPassword"
                    label="Mật khẩu hiện tại"
                    rules={[{ required: true, message: "Nhập mật khẩu hiện tại" }]}
                  >
                    <Input.Password size="large" />
                  </Form.Item>
                  <Form.Item
                    name="newPassword"
                    label="Mật khẩu mới"
                    rules={[
                      { required: true, message: "Nhập mật khẩu mới" },
                      { min: 6, message: "Tối thiểu 6 ký tự" },
                    ]}
                  >
                    <Input.Password size="large" />
                  </Form.Item>
                  <Form.Item
                    name="confirm"
                    label="Nhập lại mật khẩu mới"
                    dependencies={["newPassword"]}
                    rules={[
                      { required: true, message: "Nhập lại mật khẩu mới" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || value === getFieldValue("newPassword"))
                            return Promise.resolve();
                          return Promise.reject(
                            new Error("Mật khẩu nhập lại không khớp"),
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password size="large" />
                  </Form.Item>
                  <div className="profile-actions">
                    <Button size="large" block onClick={() => setChangingPassword(false)}>
                      HUỶ
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      block
                      htmlType="submit"
                      loading={changePassword.isPending}
                    >
                      LƯU
                    </Button>
                  </div>
                </Form>
              )}
            </>
          )}
        </div>

        <div className="panel">
          <Popconfirm
            title="Bạn muốn đăng xuất khỏi ZUZU?"
            onConfirm={() => logout.mutate()}
            okText="Đăng xuất"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
          >
            <Button danger block size="large" loading={logout.isPending}>
              ĐĂNG XUẤT
            </Button>
          </Popconfirm>
        </div>
      </div>
    </>
  );
}
