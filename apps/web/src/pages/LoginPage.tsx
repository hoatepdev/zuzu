import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { User } from "../api/types";
import { Banner, CheckboxField, ZuzuWordmark } from "../components/common";
import { Button } from "@/components/ui/button";
import { TextField } from "../components/common";
import { useSession } from "../session";

type LoginValues = {
  usernameOrPhone: string;
  password: string;
  remember?: boolean;
};

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSession();
  const form = useForm<LoginValues>({
    defaultValues: { usernameOrPhone: "", password: "", remember: true },
  });
  const login = useMutation({
    mutationFn: (values: LoginValues) =>
      api<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(["session"], user);
      navigate(user.role === "STAFF" ? "/staff" : "/dashboard");
    },
  });
  if (session.data)
    return (
      <Navigate
        to={session.data.role === "STAFF" ? "/staff" : "/dashboard"}
        replace
      />
    );

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
            <Banner
              className="customer-match"
              tone="error"
              title={login.error.message}
            />
          )}
          <form
            className="task-form"
            onSubmit={form.handleSubmit((values) => login.mutate(values))}
          >
            <TextField
              control={form.control}
              name="usernameOrPhone"
              label="Tên đăng nhập hoặc số điện thoại"
              autoFocus
              autoComplete="username"
              className="input-lg"
              placeholder="Ví dụ: staff hoặc 0912 345 678"
              rules={{ required: "Nhập tên đăng nhập hoặc số điện thoại" }}
            />
            <TextField
              control={form.control}
              name="password"
              label="Mật khẩu"
              type="password"
              autoComplete="current-password"
              className="input-lg"
              rules={{ required: "Nhập mật khẩu" }}
            />
            <CheckboxField
              control={form.control}
              name="remember"
              label="Ghi nhớ đăng nhập"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={login.isPending}
            >
              {login.isPending ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
