import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
} from "antd";
import { useEffect } from "react";
import { api } from "../api/client";
import type { ZaloConnection } from "../api/types";
import { PageHeader } from "../components/common";
import { useSession } from "../session";

const pollingStatuses = new Set(["WAITING_QR", "SCANNED"]);

export function SettingsPage() {
  const { message } = AntApp.useApp();
  const session = useSession();
  const qc = useQueryClient();
  const [form] = Form.useForm();
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
      message.success("Đã lưu cài đặt");
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
      message.success("Đã ngắt kết nối Zalo");
    },
  });
  const test = useMutation({
    mutationFn: (phone: string) =>
      api("/notifications/zalo/test", {
        method: "POST",
        body: JSON.stringify({ phone }),
      }),
    onSuccess: () => message.success("Đã gửi tin thử"),
  });
  useEffect(() => {
    if (query.data) form.setFieldsValue(query.data);
  }, [query.data, form]);
  const status = zalo.data?.status;
  return (
    <>
      <PageHeader sub="Kết nối và thông báo">{session.data?.role === "OWNER" ? "Cài đặt" : "Kết nối Zalo"}</PageHeader>
      {query.error && (
        <Alert
          className="customer-match"
          type="error"
          message={query.error.message}
          showIcon
        />
      )}
      {session.data?.role === "OWNER" && (
        <div className="panel">
          <h2 className="panel-title">Điểm thưởng</h2>
          {save.error && (
            <Alert
              className="customer-match"
              type="error"
              message={save.error.message}
              showIcon
            />
          )}
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => save.mutate(values)}
        >
          <Form.Item
            name="vndPerPoint"
            label="Số tiền mỗi 1 điểm (VND)"
            rules={[{ required: true }]}
            help="Khách được 1 điểm cho mỗi mốc tiền này trên đơn đã trả."
          >
            <InputNumber
              min={1}
              precision={0}
              addonAfter="đ/điểm"
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            LƯU
          </Button>
          </Form>
        </div>
      )}
      <div className="panel zalo-settings">
        <h2 className="panel-title">Kết nối Zalo</h2>
        {zalo.error && (
          <Alert type="error" message={zalo.error.message} showIcon />
        )}
        {status === "CONNECTED" && zalo.data?.account ? (
          <>
            <Tag color="success">● Đã kết nối</Tag>
            <div className="zalo-account">
              {zalo.data.account.avatar && (
                <Avatar src={zalo.data.account.avatar} />
              )}
              <strong>{zalo.data.account.displayName}</strong>
            </div>
            <Form
              layout="inline"
              onFinish={(values: { phone: string }) =>
                test.mutate(values.phone)
              }
            >
              <Form.Item
                name="phone"
                rules={[{ required: true, message: "Nhập số điện thoại Zalo" }]}
              >
                <Input placeholder="Số điện thoại nhận tin thử" />
              </Form.Item>
              <Button htmlType="submit" loading={test.isPending}>
                Gửi tin thử
              </Button>
            </Form>
            <Button
              danger
              onClick={() => disconnect.mutate()}
              loading={disconnect.isPending}
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
          <Alert
            type="info"
            message="Đã quét QR"
            description="Vui lòng xác nhận đăng nhập trên điện thoại."
            showIcon
          />
        ) : status === "ERROR" || status === "EXPIRED" ? (
          <Space direction="vertical">
            <Alert
              type="error"
              message={zalo.data?.error ?? "Kết nối Zalo chưa thành công"}
              showIcon
            />
            <Button
              type="primary"
              onClick={() => connect.mutate()}
              loading={connect.isPending}
            >
              Thử kết nối lại
            </Button>
          </Space>
        ) : (
          <Space direction="vertical">
            <p>Chưa kết nối</p>
            <Button
              type="primary"
              onClick={() => connect.mutate()}
              loading={connect.isPending}
            >
              Kết nối Zalo
            </Button>
          </Space>
        )}
      </div>
    </>
  );
}
