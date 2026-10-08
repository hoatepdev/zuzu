import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { EXPENSE_CATEGORIES, Expense, Page } from "../api/types";
import {
  Banner,
  Money,
  NumberField,
  PageHeader,
  Pager,
  TableSkeleton,
  TextField,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExpensesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Expense>();
  const [voiding, setVoiding] = useState<Expense>();
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const form = useForm<{ amount: number; description: string }>();
  const voidForm = useForm<{ reason: string }>();
  const params = new URLSearchParams({
    includeVoided: "true",
    page: String(page),
    limit: "20",
  });
  if (category) params.set("category", category);
  if (paymentMethod) params.set("paymentMethod", paymentMethod);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = useQuery({
    queryKey: ["expenses", page, category, paymentMethod, from, to],
    queryFn: () => api<Page<Expense>>(`/expenses?${params}`),
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["expenses"] });
  const voidExpense = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/expenses/${id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setVoiding(undefined);
      voidForm.reset();
      refresh();
      toast.success("Đã huỷ khoản chi");
    },
  });
  const update = useMutation({
    mutationFn: (values: { amount: number; description: string }) =>
      api(`/expenses/${editing!.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setEditing(undefined);
      form.reset();
      refresh();
      toast.success("Đã cập nhật");
    },
  });
  const edit = (expense: Expense) => {
    form.reset({
      amount: Number(expense.amount),
      description: expense.description,
    });
    setEditing(expense);
  };

  return (
    <>
      <PageHeader
        sub="Các khoản chi của cửa hàng"
        extra={
          <Button size="lg" asChild>
            <Link to="/expenses/new">+ CHI TIỀN</Link>
          </Button>
        }
      >
        Chi phí
      </PageHeader>
      <div className="filter-bar">
        <Select
          value={category || "ALL"}
          onValueChange={(value) => {
            setCategory(value === "ALL" ? "" : value);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-13.5 w-full text-base font-semibold"
            aria-label="Nhóm chi"
          >
            <SelectValue placeholder="Nhóm chi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            {EXPENSE_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={paymentMethod || "ALL"}
          onValueChange={(value) => {
            setPaymentMethod(value === "ALL" ? "" : value);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-13.5 w-full text-base font-semibold"
            aria-label="Thanh toán"
          >
            <SelectValue placeholder="Thanh toán" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="CASH">Tiền mặt</SelectItem>
            <SelectItem value="BANK_TRANSFER">Chuyển khoản</SelectItem>
          </SelectContent>
        </Select>
        <div className="range-picker">
          <Label htmlFor="expenses-from">
            <span>Từ ngày</span>
            <Input
              id="expenses-from"
              type="date"
              className="date-input"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </Label>
          <Label htmlFor="expenses-to">
            <span>Đến ngày</span>
            <Input
              id="expenses-to"
              type="date"
              className="date-input"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </Label>
        </div>
      </div>
      {query.error && (
        <Banner tone="error" title={query.error.message} />
      )}
      {query.isLoading ? (
        <TableSkeleton cols={7} />
      ) : (
        <>
          <div className="desktop-data-table table-wrap">
            <Table className="management-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Nhóm</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.items ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {new Date(row.expenseDate).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>
                      {row.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}
                    </TableCell>
                    <TableCell>
                      <Money value={row.amount} />
                    </TableCell>
                    <TableCell>
                      {row.voidedAt ? (
                        <Badge className="status-badge st-CANCELLED">Đã huỷ</Badge>
                      ) : (
                        <Badge className="status-badge st-COMPLETED">Hợp lệ</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!row.voidedAt && (
                        <div className="table-actions">
                          <Button size="sm" variant="outline" onClick={() => edit(row)}>
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setVoiding(row)}
                          >
                            Huỷ
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div
            className="mobile-data-list record-list"
            aria-label="Danh sách khoản chi"
          >
            {(query.data?.items ?? []).map((row) => (
              <article className="record-card" key={row.id}>
                <div className="record-card-top">
                  <span className="record-card-title">{row.description}</span>
                  <Money value={row.amount} />
                </div>
                <p className="record-card-meta">
                  {new Date(row.expenseDate).toLocaleDateString("vi-VN")} ·{" "}
                  {row.category} ·{" "}
                  {row.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}
                </p>
                <div className="record-card-top">
                  {row.voidedAt ? (
                    <Badge className="status-badge st-CANCELLED">Đã huỷ</Badge>
                  ) : (
                    <Badge className="status-badge st-COMPLETED">Hợp lệ</Badge>
                  )}
                  {!row.voidedAt && (
                    <div className="table-actions">
                      <Button size="sm" variant="outline" onClick={() => edit(row)}>
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setVoiding(row)}
                      >
                        Huỷ
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          <Pager page={page} total={query.data?.total} onChange={setPage} />
        </>
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa khoản chi</DialogTitle>
          </DialogHeader>
          {update.error && (
            <Banner tone="error" title={update.error.message} />
          )}
          <form
            className="task-form"
            onSubmit={form.handleSubmit((values) => update.mutate(values))}
          >
            <NumberField
              control={form.control}
              name="amount"
              label="Số tiền"
              rules={{ required: "Nhập số tiền" }}
            />
            <TextField
              control={form.control}
              name="description"
              label="Nội dung"
              className="input-lg"
              rules={{ required: "Nhập nội dung" }}
            />
            <DialogFooter>
              <Button type="submit" disabled={update.isPending}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!voiding}
        onOpenChange={(open) => {
          if (!open) setVoiding(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Huỷ khoản chi</DialogTitle>
          </DialogHeader>
          {voidExpense.error && (
            <Banner tone="error" title={voidExpense.error.message} />
          )}
          <form
            className="task-form"
            onSubmit={voidForm.handleSubmit(({ reason }) =>
              voidExpense.mutate({ id: voiding!.id, reason }),
            )}
          >
            <TextField
              control={voidForm.control}
              name="reason"
              label="Lý do"
              className="input-lg"
              rules={{
                required: "Nhập lý do",
                minLength: { value: 3, message: "Nhập ít nhất 3 ký tự" },
              }}
            />
            <DialogFooter>
              <Button
                type="submit"
                variant="destructive"
                disabled={voidExpense.isPending}
              >
                Huỷ khoản chi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
