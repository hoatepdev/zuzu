import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { PageHeader, TextField } from "../components/common";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSession } from "../session";
import { User } from "../api/types";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const profileForm = useForm<ProfileValues>();
  const passwordForm = useForm<PasswordValues>();

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
      toast.success("Đã cập nhật thông tin");
    },
    onError: (error) => toast.error(error.message),
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
      passwordForm.reset();
      toast.success("Đã đổi mật khẩu");
    },
    onError: (error) => toast.error(error.message),
  });

  const startEdit = () => {
    setChangingPassword(false);
    profileForm.reset({ name: me?.name, phone: me?.phone });
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
            <form
              className="task-form"
              onSubmit={profileForm.handleSubmit((values) =>
                saveProfile.mutate(values),
              )}
            >
              <TextField
                control={profileForm.control}
                name="name"
                label="Tên hiển thị"
                className="input-lg"
                rules={{ required: "Nhập tên hiển thị" }}
              />
              <TextField
                control={profileForm.control}
                name="phone"
                label="Số điện thoại"
                className="input-lg"
                inputMode="tel"
                rules={{
                  pattern: {
                    value: /^0\d{9,10}$/,
                    message: "SĐT không hợp lệ (VD: 0912345678)",
                  },
                }}
              />
              <div className="profile-actions">
                <Button
                  size="lg"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  HUỶ
                </Button>
                <Button size="lg" type="submit" disabled={saveProfile.isPending}>
                  LƯU
                </Button>
              </div>
            </form>
          ) : (
            <>
              <InfoRow label="Tên hiển thị" value={me?.name} />
              <InfoRow label="Tên đăng nhập" value={me?.username} />
              <InfoRow label="Số điện thoại" value={me?.phone} />
              <InfoRow
                label="Vai trò"
                value={me?.role ? roleLabels[me.role] : undefined}
              />
              <div className="profile-actions" style={{ marginTop: 16 }}>
                <Button size="lg" onClick={startEdit}>
                  CHỈNH SỬA
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    passwordForm.reset();
                    setChangingPassword(true);
                  }}
                >
                  ĐỔI MẬT KHẨU
                </Button>
              </div>
              {changingPassword && (
                <form
                  className="task-form"
                  style={{ marginTop: 12 }}
                  onSubmit={passwordForm.handleSubmit((values) =>
                    changePassword.mutate(values),
                  )}
                >
                  <TextField
                    control={passwordForm.control}
                    name="currentPassword"
                    label="Mật khẩu hiện tại"
                    type="password"
                    className="input-lg"
                    rules={{ required: "Nhập mật khẩu hiện tại" }}
                  />
                  <TextField
                    control={passwordForm.control}
                    name="newPassword"
                    label="Mật khẩu mới"
                    type="password"
                    className="input-lg"
                    rules={{
                      required: "Nhập mật khẩu mới",
                      minLength: { value: 6, message: "Tối thiểu 6 ký tự" },
                    }}
                  />
                  <TextField
                    control={passwordForm.control}
                    name="confirm"
                    label="Nhập lại mật khẩu mới"
                    type="password"
                    className="input-lg"
                    rules={{
                      required: "Nhập lại mật khẩu mới",
                      validate: (value: string) =>
                        value === passwordForm.getValues("newPassword") ||
                        "Mật khẩu nhập lại không khớp",
                    }}
                  />
                  <div className="profile-actions">
                    <Button
                      size="lg"
                      type="button"
                      onClick={() => setChangingPassword(false)}
                    >
                      HUỶ
                    </Button>
                    <Button
                      size="lg"
                      type="submit"
                      disabled={changePassword.isPending}
                    >
                      LƯU
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div className="panel">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="lg" className="w-full">
                ĐĂNG XUẤT
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bạn muốn đăng xuất khỏi ZUZU?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cần đăng nhập lại để tiếp tục làm việc.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => logout.mutate()}
                >
                  Đăng xuất
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}
