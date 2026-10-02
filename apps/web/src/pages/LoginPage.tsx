import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Form, Input } from "antd";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { User } from "../api/types";
import { ZuzuWordmark } from "../components/common";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const login = useMutation({
    mutationFn: (values: {
      usernameOrPhone: string;
      password: string;
      remember?: boolean;
    }) =>
      api<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(["session"], user);
      navigate(user.role === "STAFF" ? "/" : "/dashboard");
    },
  });

  return (
    <main className="login">
      <div className="login-brand" aria-hidden="true">
        <div className="login-brand-main">
          <ZuzuWordmark light sub="Laundry OS" />
          <div className="login-tagline">
            <h2>
              Nhận đồ nhanh,
              <br />
              chốt ca chắc.
            </h2>
            <p>Mọi thao tác trong ca, gọn trong một hệ thống.</p>
          </div>
        </div>
      </div>
      <div className="login-main">
        <div className="login-form">
          <div className="login-head">
            <ZuzuWordmark sub="" />
            <h1>Đăng nhập cửa hàng</h1>
            <p>Nhập tài khoản được chủ cửa hàng cấp để bắt đầu ca làm việc.</p>
          </div>
          {login.error && (
            <Alert
              className="customer-match"
              type="error"
              message={login.error.message}
              showIcon
            />
          )}
          <Form
            className="task-form"
            layout="vertical"
            onFinish={(values) => login.mutate(values)}
            initialValues={{ remember: true }}
          >
            <Form.Item
              name="usernameOrPhone"
              label="Tên đăng nhập hoặc SĐT"
              rules={[
                {
                  required: true,
                  message: "Nhập tên đăng nhập hoặc số điện thoại",
                },
              ]}
            >
              <Input
                autoFocus
                autoComplete="username"
                size="large"
                placeholder="Ví dụ: staff hoặc 0912 345 678"
                prefix={<UserOutlined />}
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: "Nhập mật khẩu" }]}
            >
              <Input.Password
                autoComplete="current-password"
                size="large"
                prefix={<LockOutlined />}
              />
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked">
              <Checkbox>Ghi nhớ đăng nhập</Checkbox>
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={login.isPending}
            >
              {login.isPending ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            </Button>
          </Form>
        </div>
      </div>
    </main>
  );
}
