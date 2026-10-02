import { CheckOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Order } from "../api/types";
import { BottomActionBar, PageHeader, QuickChoice } from "../components/common";

const notes = ["Không có", "Giặt riêng", "Ít thơm", "Không nước xả", "Khác"];
export function ReceivePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unknown, setUnknown] = useState(false);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("Không có");
  const deferredPhone = useDeferredValue(phone);
  const normalizedPhone = deferredPhone.replace(/\s/g, "");
  const customers = useQuery({
    queryKey: ["customers", "lookup", normalizedPhone],
    queryFn: () =>
      api<Customer[]>(
        `/customers/search?q=${encodeURIComponent(normalizedPhone)}`,
      ),
    enabled: normalizedPhone.length >= 8 && !unknown,
  });
  const found = customers.data?.find(
    (customer) => customer.phone.replace(/\s/g, "") === normalizedPhone,
  );
  const create = useMutation({
    mutationFn: (values: {
      phone?: string;
      customerName?: string;
      customNote?: string;
    }) =>
      api<Order>("/orders", {
        method: "POST",
        body: JSON.stringify({
          phone: unknown ? undefined : values.phone,
          customerName: values.customerName,
          note:
            note === "Không có"
              ? undefined
              : note === "Khác"
                ? values.customNote
                : note,
          customerUnknown: unknown,
        }),
      }),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate("/", { state: { receivedCode: order.code } });
    },
  });

  return (
    <div className="has-bottom-action">
      <PageHeader sub="Nhập số điện thoại của khách để bắt đầu">
        Nhận đồ
      </PageHeader>
      {create.error && (
        <Alert
          className="customer-match"
          type="error"
          message={create.error.message}
          showIcon
        />
      )}
      <Form
        className="task-form receive-form"
        layout="vertical"
        onFinish={(values) => create.mutate(values)}
      >
        <section className="task-section customer-section">
          {!unknown && (
            <>
              <Form.Item
                name="phone"
                label="Số điện thoại"
                rules={[{ required: true, message: "Nhập số điện thoại" }]}
              >
                <Input
                  autoFocus
                  autoComplete="tel"
                  inputMode="tel"
                  size="large"
                  placeholder="Nhập số điện thoại khách"
                  onChange={(event) => setPhone(event.target.value)}
                />
              </Form.Item>
              {customers.isFetching && (
                <div className="lookup-state" role="status">
                  Đang tìm khách...
                </div>
              )}
              {found ? (
                <div className="customer-result" role="status">
                  <span>Khách hàng</span>
                  <strong>{found.name ?? "Khách cũ"}</strong>
                  <small>{found.totalOrders} đơn đã nhận</small>
                </div>
              ) : normalizedPhone.length >= 8 && !customers.isFetching ? (
                <Form.Item
                  name="customerName"
                  label="Tên khách mới (không bắt buộc)"
                >
                  <Input size="large" placeholder="Nhập tên để dễ nhận biết" />
                </Form.Item>
              ) : null}
            </>
          )}
          {unknown && (
            <div className="unknown-banner" role="status">
              Đang nhận cho khách chưa xác định
            </div>
          )}
          <Button
            className={`unknown-toggle ${unknown ? "active" : ""}`}
            block
            aria-pressed={unknown}
            disabled={create.isPending}
            onClick={() => setUnknown((value) => !value)}
          >
            <span className="ut-box" aria-hidden="true">
              <CheckOutlined />
            </span>
            <span>
              Khách để đồ nhưng <em>chưa rõ thông tin</em>
            </span>
            <span className="ut-state">{unknown ? "Bỏ chọn" : "Chọn"}</span>
          </Button>
        </section>

        <section className="task-section note-section">
          <Form.Item label="Lưu ý cho đơn">
            <QuickChoice
              options={notes}
              value={note}
              disabled={create.isPending}
              onChange={(event) => setNote(event.target.value)}
            />
          </Form.Item>
          {note === "Khác" && (
            <Form.Item
              name="customNote"
              label="Lưu ý khác"
              rules={[{ required: true, message: "Nhập lưu ý" }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Ví dụ: đồ dễ phai màu"
              />
            </Form.Item>
          )}
        </section>
        <BottomActionBar>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={create.isPending}
            disabled={create.isPending}
          >
            {create.isPending ? "ĐANG TẠO ĐƠN..." : "NHẬN ĐỒ"}
          </Button>
        </BottomActionBar>
      </Form>
    </div>
  );
}
