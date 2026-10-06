import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { CustomerDetail } from "../api/types";
import {
  Money,
  NumberField,
  PageHeader,
  Spinner,
  StatusBadge,
  SwitchField,
  TextField,
  TextareaField,
  orderTime,
} from "../components/common";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { useSession } from "../session";

type EditValues = {
  name?: string;
  phone: string;
  laundryPreference?: string;
  note?: string;
  marketingOptIn?: boolean;
};

export function CustomerDetailPage() {
  const { id = "" } = useParams();
  const session = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const form = useForm<EditValues>();
  const adjustForm = useForm<{ points: number; reason: string }>();
  const query = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api<CustomerDetail>(`/customers/${id}`),
  });
  const save = useMutation({
    mutationFn: (values: EditValues) =>
      api(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: () => {
      setOpen(false);
      setConfirming(false);
      void qc.invalidateQueries({ queryKey: ["customer", id] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Đã cập nhật khách");
    },
    onError: (error) => toast.error(error.message),
  });
  const adjust = useMutation({
    mutationFn: (values: { points: number; reason: string }) =>
      api(`/customers/${id}/loyalty-adjust`, { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      setAdjustOpen(false);
      adjustForm.reset();
      void qc.invalidateQueries({ queryKey: ["customer", id] });
      toast.success("Đã điều chỉnh điểm");
    },
  });
  const customer = query.data;
  if (query.isLoading) return <div className="center"><Spinner className="size-6" /></div>;
  if (!customer) return <div className="center">Không tải được khách hàng</div>;
  const edit = () => {
    form.reset({
      name: customer.name,
      phone: customer.phone,
      laundryPreference: customer.laundryPreference,
      note: customer.note,
      marketingOptIn: customer.marketingOptIn,
    });
    setOpen(true);
  };
  return (
    <>
      <PageHeader
        sub={customer.phone}
        extra={(
          <div className="header-actions">
            <Button variant="outline" onClick={edit}>Sửa</Button>
            {session.data?.role !== "STAFF" && (
              <Button variant="outline" onClick={() => setAdjustOpen(true)}>Điểm</Button>
            )}
          </div>
        )}
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
        ) : <p className="muted-p">Chưa có đơn</p>}
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
        ) : <p className="muted-p">Chưa có điểm</p>}
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            setConfirming(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa khách hàng</DialogTitle>
          </DialogHeader>
          <form
            className="task-form"
            onSubmit={form.handleSubmit(() => setConfirming(true))}
          >
            <TextField
              control={form.control}
              name="name"
              label="Tên"
              className="input-lg"
            />
            <TextField
              control={form.control}
              name="phone"
              label="Số điện thoại"
              className="input-lg"
              autoComplete="tel"
              inputMode="tel"
              rules={{ required: "Nhập số điện thoại" }}
            />
            <TextField
              control={form.control}
              name="laundryPreference"
              label="Sở thích giặt"
              className="input-lg"
            />
            <TextareaField
              control={form.control}
              name="note"
              label="Ghi chú"
            />
            <SwitchField
              control={form.control}
              name="marketingOptIn"
              label="Nhận tin marketing"
            />
            <DialogFooter>
              <Button type="submit">Tiếp tục</Button>
            </DialogFooter>
          </form>
          <AlertDialog open={confirming} onOpenChange={setConfirming}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận lưu thông tin?</AlertDialogTitle>
                <AlertDialogDescription>
                  {form.getValues("name") || "Chưa có tên"} · {form.getValues("phone")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Để sau</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => save.mutate(form.getValues())}
                >
                  Lưu
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
      <Dialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Điều chỉnh điểm</DialogTitle>
          </DialogHeader>
          <form
            className="task-form"
            onSubmit={adjustForm.handleSubmit((values) => adjust.mutate(values))}
          >
            <NumberField
              control={adjustForm.control}
              name="points"
              label="Điểm (số âm để trừ)"
              quickThousand={false}
              rules={{ required: "Nhập điểm" }}
            />
            <TextField
              control={adjustForm.control}
              name="reason"
              label="Lý do"
              className="input-lg"
              rules={{
                required: "Nhập lý do",
                minLength: { value: 3, message: "Tối thiểu 3 ký tự" },
              }}
            />
            <DialogFooter>
              <Button type="submit" disabled={adjust.isPending}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
