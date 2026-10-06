import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import { AuditLog, Page } from "../api/types";
import { Banner, PageHeader, Pager } from "../components/common";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const entityLabels: Record<string, string> = {
  ORDER: "Đơn hàng",
  CUSTOMER: "Khách hàng",
  EXPENSE: "Chi phí",
  USER: "Nhân viên",
  SERVICE: "Dịch vụ",
  SHIFT: "Ca",
  STORE_SETTING: "Cài đặt",
};
const actionLabels: Record<string, string> = {
  ORDER_CREATED: "Tạo đơn",
  ORDER_COMPLETED: "Hoàn thành đơn",
  ORDER_ADJUSTED: "Điều chỉnh đơn",
  CUSTOMER_ATTACHED: "Gắn khách hàng",
  ORDER_RETURNED: "Trả lại đơn",
  ORDER_CANCELLED: "Huỷ đơn",
  ORDER_REPRINTED: "In lại đơn",
  CUSTOMER_UPDATED: "Cập nhật khách hàng",
  LOYALTY_ADJUSTED: "Điều chỉnh điểm",
  EXPENSE_CREATED: "Tạo khoản chi",
  EXPENSE_UPDATED: "Cập nhật khoản chi",
  EXPENSE_VOIDED: "Huỷ khoản chi",
  SERVICE_CREATED: "Tạo dịch vụ",
  SERVICE_UPDATED: "Cập nhật dịch vụ",
  SHIFT_OPENED: "Mở ca",
  SHIFT_CLOSED: "Chốt ca",
  USER_CREATED: "Tạo nhân viên",
  USER_UPDATED: "Cập nhật nhân viên",
  PROFILE_UPDATED: "Cập nhật hồ sơ",
  PASSWORD_CHANGED: "Đổi mật khẩu",
  PASSWORD_RESET: "Đặt lại mật khẩu",
  SETTING_UPDATED: "Cập nhật cài đặt",
};
const entityOptions = Object.entries(entityLabels).map(([value, label]) => ({
  value,
  label,
}));
export function AuditLogPage() {
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (entityType) params.set("entityType", entityType);
  if (from)
    params.set("from", new Date(`${from}T00:00:00+07:00`).toISOString());
  if (to) params.set("to", new Date(`${to}T23:59:59+07:00`).toISOString());
  const query = useQuery({
    queryKey: ["audit-logs", page, entityType, from, to],
    queryFn: () => api<Page<AuditLog>>(`/audit-logs?${params}`),
  });

  return (
    <>
      <PageHeader sub="Lịch sử thao tác trên hệ thống">Audit log</PageHeader>
      <div className="filter-bar">
        <Select
          value={entityType || "ALL"}
          onValueChange={(value) => {
            setEntityType(value === "ALL" ? "" : value);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-13.5 w-full text-base font-semibold"
            aria-label="Loại dữ liệu"
          >
            <SelectValue placeholder="Loại dữ liệu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            {entityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="range-picker">
          <Label htmlFor="audit-from">
            <span>Từ ngày</span>
            <Input
              id="audit-from"
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
          <Label htmlFor="audit-to">
            <span>Đến ngày</span>
            <Input
              id="audit-to"
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
        <div className="table-wrap">
          <Table className="management-table">
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người thao tác</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Mã dữ liệu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton className="skeleton-line" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="table-wrap">
          <Table className="management-table">
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người thao tác</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Mã dữ liệu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data?.items ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.createdAt).toLocaleString("vi-VN")}</TableCell>
                  <TableCell>{row.user.name}</TableCell>
                  <TableCell>
                    <Badge className="status-badge st-CANCELLED">
                      {entityLabels[row.entityType] ?? "Khác"}
                    </Badge>
                  </TableCell>
                  <TableCell>{actionLabels[row.action] ?? "Khác"}</TableCell>
                  <TableCell>{row.entityId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={page} total={query.data?.total} onChange={setPage} />
        </div>
      )}
    </>
  );
}
