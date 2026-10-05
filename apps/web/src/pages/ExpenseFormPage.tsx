import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App as AntApp,
  Button,
  Form,
  Input,
  Radio,
  Select,
} from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { EXPENSE_CATEGORIES, Expense } from "../api/types";
import { AmountInput, BottomActionBar, PageHeader } from "../components/common";

const commonCategories = [
  "Nước giặt / nước xả",
  "Hóa chất",
  "Túi / bao bì",
  "Giấy bill",
];
export function ExpenseFormPage() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const create = useMutation({
    mutationFn: (values: {
      amount: number;
      category?: string;
      otherCategory?: string;
      description: string;
      paymentMethod: string;
    }) =>
      api<Expense>("/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount: values.amount,
          category:
            values.category === "Khác" ? values.otherCategory : values.category,
          description: values.description,
          expenseDate: new Date().toISOString().slice(0, 10),
          paymentMethod: values.paymentMethod,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      message.success("Đã lưu khoản chi");
      navigate("/staff");
    },
  });

  return (
    <div className="has-bottom-action">
      <PageHeader sub="Ghi nhanh một khoản chi của cửa hàng">
        Chi tiền
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
        className="task-form"
        layout="vertical"
        initialValues={{ paymentMethod: "CASH" }}
        onFinish={(values) => create.mutate(values)}
      >
        <Form.Item
          name="amount"
          label="Số tiền"
          rules={[{ required: true, message: "Nhập số tiền" }]}
        >
          <AmountInput autoFocus />
        </Form.Item>
        <Form.Item
          name="category"
          label="Nhóm chi"
          rules={[{ required: true, message: "Chọn nhóm chi" }]}
        >
          <Radio.Group
            className="quick-choice"
            options={[...commonCategories, "Khác"]}
            onChange={(event) => setCategory(event.target.value)}
          />
        </Form.Item>
        {category === "Khác" && (
          <Form.Item
            name="otherCategory"
            label="Nhóm chi khác"
            rules={[{ required: true, message: "Chọn nhóm chi" }]}
          >
            <Select
              size="large"
              options={EXPENSE_CATEGORIES.filter(
                (value) => !commonCategories.includes(value),
              ).map((value) => ({ value, label: value }))}
            />
          </Form.Item>
        )}
        <Form.Item
          name="description"
          label="Nội dung"
          rules={[{ required: true, message: "Nhập nội dung" }]}
        >
          <Input size="large" />
        </Form.Item>
        <Form.Item name="paymentMethod" label="Thanh toán">
          <Radio.Group
            className="quick-choice"
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: "Tiền mặt", value: "CASH" },
              { label: "Chuyển khoản", value: "BANK_TRANSFER" },
            ]}
          />
        </Form.Item>
        <BottomActionBar>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={create.isPending}
          >
            {create.isPending ? "ĐANG LƯU..." : "LƯU"}
          </Button>
        </BottomActionBar>
      </Form>
    </div>
  );
}
