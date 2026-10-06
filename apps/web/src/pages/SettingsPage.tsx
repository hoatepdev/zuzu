import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "../api/client";
import type { ZaloConnection } from "../api/types";
import {
  Banner,
  NumberField,
  PageHeader,
} from "../components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "../session";

const pollingStatuses = new Set(["WAITING_QR", "SCANNED"]);

export function SettingsPage() {
  const session = useSession();
  const qc = useQueryClient();
  const [testPhone, setTestPhone] = useState("");
  const form = useForm<{ vndPerPoint: number }>();
  const query = useQuery({
    queryKey: ["settings", "loyalty"],
    queryFn: () => api<{ vndPerPoint: number }>("/settings/loyalty"),
    enabled: session.data?.role === "OWNER",
  });
  const zalo = useQuery({
    queryKey: ["notifications", "zalo"],
    queryFn: () => api<ZaloConnection>("/notifications/zalo/status"),
    refetchInterval: (current) =>
      current.state.data && pollingStatuses.has(current.state.data.status)
        ? 2000
        : false,
  });
  const save = useMutation({
    mutationFn: (values: { vndPerPoint: number }) =>
      api("/settings/loyalty", { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Đã lưu cài đặt");
    },
  });
  const connect = useMutation({
    mutationFn: () =>
      api<ZaloConnection>("/notifications/zalo/connect", { method: "POST" }),
    onSuccess: (data) => {
      qc.setQueryData(["notifications", "zalo"], data);
    },
  });
  const disconnect = useMutation({
    mutationFn: () =>
      api<ZaloConnection>("/notifications/zalo/disconnect", { method: "POST" }),
    onSuccess: (data) => {
      qc.setQueryData(["notifications", "zalo"], data);
      toast.success("Đã ngắt kết nối Zalo");
    },
  });
  const test = useMutation({
    mutationFn: (phone: string) =>
      api("/notifications/zalo/test", {
        method: "POST",
        body: JSON.stringify({ phone }),
      }),
    onSuccess: () => toast.success("Đã gửi tin thử"),
  });
  useEffect(() => {
    if (query.data) form.reset(query.data);
  }, [query.data, form]);
  const status = zalo.data?.status;
  return (
    <>
      <PageHeader sub="Kết nối và thông báo">
        {session.data?.role === "OWNER" ? "Cài đặt" : "Kết nối Zalo"}
      </PageHeader>
      {query.error && (
        <Banner
          className="customer-match"
          tone="error"
          title={query.error.message}
        />
      )}
      {session.data?.role === "OWNER" && (
        <div className="panel">
          <h2 className="panel-title">Điểm thưởng</h2>
          {save.error && (
            <Banner
              className="customer-match"
              tone="error"
              title={save.error.message}
            />
          )}
          <form
            className="task-form"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
          >
            <NumberField
              control={form.control}
              name="vndPerPoint"
              label="Số tiền mỗi 1 điểm (VND)"
              min={1}
              quickThousand={false}
              suffix="đ/điểm"
              hint="Khách được 1 điểm cho mỗi mốc tiền này trên đơn đã trả."
              rules={{ required: "Nhập số tiền mỗi điểm" }}
            />
            <Button type="submit" disabled={save.isPending}>
              LƯU
            </Button>
          </form>
        </div>
      )}
      <div className="panel zalo-settings">
        <h2 className="panel-title">Kết nối Zalo</h2>
        {zalo.error && (
          <Banner tone="error" title={zalo.error.message} />
        )}
        {zalo.error ? null : zalo.isLoading ? (
          <div className="center" role="status">Đang tải trạng thái kết nối...</div>
        ) : status === "CONNECTED" && zalo.data?.account ? (
          <>
            <Badge className="status-badge st-COMPLETED">● Đã kết nối</Badge>
            <div className="zalo-account">
              {zalo.data.account.avatar && (
                <img
                  src={zalo.data.account.avatar}
                  alt=""
                  width={36}
                  height={36}
                  className="avatar"
                />
              )}
              <strong>{zalo.data.account.displayName}</strong>
            </div>
            <form
              className="zalo-test-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (testPhone.trim()) test.mutate(testPhone.trim());
              }}
            >
              <Input
                className="input-lg"
                placeholder="Số điện thoại nhận tin thử"
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
                aria-label="Số điện thoại nhận tin thử"
              />
              <Button type="submit" disabled={test.isPending}>
                Gửi tin thử
              </Button>
            </form>
            <Button
              type="button"
              variant="destructive"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
            >
              Ngắt kết nối
            </Button>
          </>
        ) : status === "WAITING_QR" && zalo.data?.qrImage ? (
          <div className="zalo-qr">
            <img src={zalo.data.qrImage} alt="Mã QR kết nối Zalo" />
            <p>Mở Zalo trên điện thoại và quét mã QR để kết nối.</p>
          </div>
        ) : status === "SCANNED" ? (
          <Banner
            tone="info"
            title="Đã quét QR"
          >
            <p>Vui lòng xác nhận đăng nhập trên điện thoại.</p>
          </Banner>
        ) : status === "ERROR" || status === "EXPIRED" ? (
          <div className="stack">
            <Banner
              tone="error"
              title={zalo.data?.error ?? "Kết nối Zalo chưa thành công"}
            />
            <Button type="button" onClick={() => connect.mutate()} disabled={connect.isPending}>
              Thử kết nối lại
            </Button>
          </div>
        ) : (
          <div className="stack">
            <p>Chưa kết nối</p>
            <Button type="button" onClick={() => connect.mutate()} disabled={connect.isPending}>
              Kết nối Zalo
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
