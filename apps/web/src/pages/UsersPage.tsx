import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "../api/client";
import { UserAccount } from "../api/types";
import {
  Banner,
  PageHeader,
  SelectField,
  TableSkeleton,
  TextField,
} from "../components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type EditValues = {
  username: string;
  name: string;
  phone?: string;
  role: string;
};
type CreateValues = EditValues & { password: string };
type ResetValues = { password: string };

const roleLabels: Record<string, string> = {
  OWNER: "Chủ cửa hàng",
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
};

function UserRowActions({
  user,
  onEdit,
  onToggle,
  onReset,
}: {
  user: UserAccount;
  onEdit: (user: UserAccount) => void;
  onToggle: (user: UserAccount) => void;
  onReset: (user: UserAccount) => void;
}) {
  return (
    <div className="table-actions">
      <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
        Sửa
      </Button>
      {user.role !== "OWNER" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant={user.active ? "destructive" : "outline"}
            >
              {user.active ? "Khoá" : "Mở"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {user.active ? "Khoá tài khoản này?" : "Mở lại tài khoản?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {user.name} · {user.username}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Để sau</AlertDialogCancel>
              <AlertDialogAction onClick={() => onToggle(user)}>
                Xác nhận
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Button size="sm" variant="ghost" onClick={() => onReset(user)}>
        Đặt lại mật khẩu
      </Button>
    </div>
  );
}

export function UsersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<UserAccount | null>(null);
  const form = useForm<EditValues>();
  const createForm = useForm<CreateValues>();
  const resetForm = useForm<ResetValues>();
  const query = useQuery({
    queryKey: ["users"],
    queryFn: () => api<UserAccount[]>("/users"),
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["users"] });
  const save = useMutation({
    mutationFn: (values: EditValues) =>
      api(`/users/${editing!.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setEditing(null);
      refresh();
      toast.success("Đã cập nhật nhân viên");
    },
  });
  const create = useMutation({
    mutationFn: (values: CreateValues) =>
      api<UserAccount>("/users", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setCreating(false);
      refresh();
      toast.success("Đã thêm nhân viên");
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
      toast.success("Đã cập nhật");
    },
    onError: (error) => toast.error(error.message),
  });
  const reset = useMutation({
    mutationFn: (values: ResetValues) =>
      api(`/users/${resetting!.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setResetting(null);
      toast.success("Đã đặt lại mật khẩu");
    },
  });
  const edit = (user: UserAccount) => {
    form.reset({
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
    });
    setEditing(user);
  };
  return (
    <>
      <PageHeader
        sub="Tài khoản đăng nhập của cửa hàng"
        extra={
          <Button
            onClick={() => {
              createForm.reset({
                username: "",
                name: "",
                phone: "",
                role: "STAFF",
                password: "",
              });
              setCreating(true);
            }}
          >
            + NHÂN VIÊN
          </Button>
        }
      >
        Nhân viên
      </PageHeader>
      {query.error && <Banner tone="error" title={query.error.message} />}
      {(save.error || create.error || reset.error) && (
        <Banner
          tone="error"
          title={(save.error ?? create.error ?? reset.error)?.message}
        />
      )}
      {query.error ? null : query.isLoading ? (
        <TableSkeleton cols={6} />
      ) : (
        <>
          <div className="desktop-data-table table-wrap">
            <Table className="management-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Tên đăng nhập</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data ?? []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={`status-badge ${
                          user.role === "OWNER"
                            ? "st-READY_FOR_PICKUP"
                            : user.role === "MANAGER"
                              ? "st-PROCESSING"
                              : "st-CANCELLED"
                        }`}
                      >
                        {roleLabels[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`status-badge ${user.active ? "st-COMPLETED" : "st-CANCELLED"}`}
                      >
                        {user.active ? "Đang hoạt động" : "Đã khoá"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UserRowActions
                        user={user}
                        onEdit={edit}
                        onToggle={(target) => toggle.mutate(target)}
                        onReset={(target) => {
                          resetForm.reset({ password: "" });
                          setResetting(target);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mobile-data-list record-list" aria-label="Danh sách nhân viên">
            {(query.data ?? []).map((user) => (
              <article className="record-card" key={user.id}>
                <div className="record-card-top">
                  <span className="record-card-title">{user.name}</span>
                  <Badge
                    className={`status-badge ${user.active ? "st-COMPLETED" : "st-CANCELLED"}`}
                  >
                    {user.active ? "Đang hoạt động" : "Đã khoá"}
                  </Badge>
                </div>
                <p className="record-card-meta">
                  {user.username} · {user.phone ?? "chưa có SĐT"}
                </p>
                <div className="record-card-top">
                  <Badge
                    className={`status-badge ${
                      user.role === "OWNER"
                        ? "st-READY_FOR_PICKUP"
                        : user.role === "MANAGER"
                          ? "st-PROCESSING"
                          : "st-CANCELLED"
                    }`}
                  >
                    {roleLabels[user.role] ?? user.role}
                  </Badge>
                </div>
                <div className="record-card-actions">
                  <UserRowActions
                    user={user}
                    onEdit={edit}
                    onToggle={(target) => toggle.mutate(target)}
                    onReset={(target) => {
                      resetForm.reset({ password: "" });
                      setResetting(target);
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa {editing?.name ?? ""}</DialogTitle>
          </DialogHeader>
          <form
            className="task-form"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
          >
            <TextField
              control={form.control}
              name="username"
              label="Tên đăng nhập"
              className="input-lg"
              rules={{ required: "Nhập tên đăng nhập" }}
            />
            <TextField
              control={form.control}
              name="name"
              label="Tên hiển thị"
              className="input-lg"
              rules={{ required: "Nhập tên hiển thị" }}
            />
            <TextField
              control={form.control}
              name="phone"
              label="SĐT"
              className="input-lg"
            />
            {editing?.role !== "OWNER" && (
              <SelectField
                control={form.control}
                name="role"
                label="Vai trò"
                options={[
                  { value: "STAFF", label: "Nhân viên" },
                  { value: "MANAGER", label: "Quản lý" },
                ]}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!open) setCreating(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm nhân viên</DialogTitle>
          </DialogHeader>
          <form
            className="task-form"
            onSubmit={createForm.handleSubmit((values) => create.mutate(values))}
          >
            <TextField
              control={createForm.control}
              name="username"
              label="Tên đăng nhập"
              className="input-lg"
              rules={{ required: "Nhập tên đăng nhập" }}
            />
            <TextField
              control={createForm.control}
              name="name"
              label="Tên hiển thị"
              className="input-lg"
              rules={{ required: "Nhập tên hiển thị" }}
            />
            <TextField
              control={createForm.control}
              name="phone"
              label="SĐT"
              className="input-lg"
            />
            <SelectField
              control={createForm.control}
              name="role"
              label="Vai trò"
              options={[
                { value: "STAFF", label: "Nhân viên" },
                { value: "MANAGER", label: "Quản lý" },
              ]}
              rules={{ required: "Chọn vai trò" }}
            />
            <TextField
              control={createForm.control}
              name="password"
              label="Mật khẩu"
              type="password"
              className="input-lg"
              rules={{
                required: "Nhập mật khẩu",
                minLength: { value: 6, message: "Tối thiểu 6 ký tự" },
              }}
            />
            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                Thêm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!resetting}
        onOpenChange={(open) => {
          if (!open) setResetting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Đặt lại mật khẩu cho {resetting?.name ?? ""}
            </DialogTitle>
          </DialogHeader>
          <form
            className="task-form"
            onSubmit={resetForm.handleSubmit((values) => reset.mutate(values))}
          >
            <TextField
              control={resetForm.control}
              name="password"
              label="Mật khẩu mới"
              type="password"
              className="input-lg"
              rules={{
                required: "Nhập mật khẩu mới",
                minLength: { value: 6, message: "Tối thiểu 6 ký tự" },
              }}
            />
            <DialogFooter>
              <Button type="submit" disabled={reset.isPending}>
                Đặt lại
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
