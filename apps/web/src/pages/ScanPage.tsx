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
      <QrScanner onScan={open} />
      <div className="scanner-foot">
        <div className="divider">hoặc nhập mã đơn</div>
        <Form onFinish={({ code }) => open(code)}>
          <Form.Item
            name="code"
            rules={[{ required: true, message: "Nhập mã đơn" }]}
          >
            <Input
              size="large"
              placeholder="Ví dụ: ZU-0182"
              prefix={<SearchOutlined />}
            />
          </Form.Item>
          <Button htmlType="submit" size="large" block>
            TÌM ĐƠN
          </Button>
        </Form>
      </div>
    </div>
  );
}
