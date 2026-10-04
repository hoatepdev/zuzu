import { SearchOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { QrScanner } from "../components/QrScanner";

export function ScanPage() {
  const navigate = useNavigate();
  const open = useCallback(
    (value: string) =>
      navigate(`/orders/${encodeURIComponent(value.trim().toUpperCase())}`),
    [navigate],
  );

  return (
    <div className="scanner-page">
      <h1 className="sr-only">Quét QR tra đơn</h1>
      <QrScanner onScan={open} />
      <section className="scanner-foot" aria-label="Tìm đơn bằng mã">
        <div className="divider">Hoặc nhập mã đơn</div>
        <Form className="manual-code-form" onFinish={({ code }) => open(code)}>
          <Form.Item
            name="code"
            rules={[{ required: true, message: "Nhập mã đơn" }]}
          >
            <Input
              autoCapitalize="characters"
              size="large"
              placeholder="Ví dụ: ZU-0182"
              prefix={<SearchOutlined />}
            />
          </Form.Item>
          <Button htmlType="submit" size="large" type="primary">
            TÌM ĐƠN
          </Button>
        </Form>
      </section>
    </div>
  );
}
