import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { EXPENSE_CATEGORIES, Expense } from "../api/types";
import {
  AmountInput,
  Banner,
  BottomActionBar,
  Field,
  PageHeader,
  QuickChoice,
  SelectField,
  TextField,
} from "../components/common";
import { Button } from "@/components/ui/button";

const commonCategories = [
  "Nước giặt / nước xả",
  "Hóa chất",
  "Túi / bao bì",
  "Giấy bill",
];

type ExpenseValues = {
  amount: number;
  category: string;
  otherCategory?: string;
  description: string;
  paymentMethod: string;
};

export function ExpenseFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<ExpenseValues>({
    defaultValues: { paymentMethod: "CASH" },
  });
  const category = form.watch("category");
  const create = useMutation({
    mutationFn: (values: ExpenseValues) =>
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
      toast.success("Đã lưu khoản chi");
      navigate("/staff");
    },
  });

  return (
    <div className="has-bottom-action">
      <PageHeader sub="Ghi nhanh một khoản chi của cửa hàng">
        Chi tiền
      </PageHeader>
      {create.error && (
        <Banner
          className="customer-match"
          tone="error"
          title={create.error.message}
        />
      )}
      <form
        className="task-form"
        onSubmit={form.handleSubmit((values) => create.mutate(values))}
      >
        <Controller
          control={form.control}
          name="amount"
          rules={{ required: "Nhập số tiền" }}
          render={({ field, fieldState }) => (
            <Field label="Số tiền" htmlFor="amount" error={fieldState.error?.message}>
              <AmountInput
                id="amount"
                autoFocus
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </Field>
          )}
        />
        <Field label="Nhóm chi">
          <QuickChoice
            options={[...commonCategories, "Khác"].map((value) => ({
              label: value,
              value,
            }))}
            value={form.watch("category")}
            onChange={(value) => form.setValue("category", value)}
          />
        </Field>
        {category === "Khác" && (
          <SelectField
            control={form.control}
            name="otherCategory"
            label="Nhóm chi khác"
            placeholder="Chọn nhóm chi"
            options={EXPENSE_CATEGORIES.filter(
              (value) => !commonCategories.includes(value),
            ).map((value) => ({ value, label: value }))}
            rules={{ required: "Chọn nhóm chi" }}
          />
        )}
        <TextField
          control={form.control}
          name="description"
          label="Nội dung"
          className="input-lg"
          rules={{ required: "Nhập nội dung" }}
        />
        <Field label="Thanh toán">
          <QuickChoice
            options={[
              { label: "Tiền mặt", value: "CASH" },
              { label: "Chuyển khoản", value: "BANK_TRANSFER" },
            ]}
            value={form.watch("paymentMethod")}
            onChange={(value) => form.setValue("paymentMethod", value)}
          />
        </Field>
        <BottomActionBar>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={create.isPending}
          >
            {create.isPending ? "ĐANG LƯU..." : "LƯU"}
          </Button>
        </BottomActionBar>
      </form>
    </div>
  );
}
