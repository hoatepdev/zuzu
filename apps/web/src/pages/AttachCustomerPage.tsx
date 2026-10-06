import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Order } from "../api/types";
import {
  Banner,
  BottomActionBar,
  Field,
  PageHeader,
  Spinner,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPhoneInput, normalizePhone } from "./receive-utils";

type AttachValues = { phone: string; name?: string };

export function AttachCustomerPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const form = useForm<AttachValues>();
  const [phone, setPhone] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>();

  useEffect(() => {
    const value = phone.trim();
    const digits = normalizePhone(value).replace(/\D/g, "");
    if (!value || digits.length < 3) {
      setSearchQuery("");
      return;
    }
    const timer = window.setTimeout(
      () => setSearchQuery(normalizePhone(value)),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [phone]);

  const customers = useQuery({
    queryKey: ["customers", "lookup", searchQuery],
    queryFn: () =>
      api<Customer[]>(
        `/customers/search?q=${encodeURIComponent(searchQuery)}`,
      ),
    enabled: searchQuery.length > 0,
  });

  const attach = useMutation({
    mutationFn: (values: AttachValues) =>
      api<Order>(`/orders/${id}/attach-customer`, {
        method: "POST",
        body: JSON.stringify({
          phone: normalizePhone(values.phone),
          name: values.name?.trim() || undefined,
        }),
      }),
    onSuccess: (order) => navigate(`/orders/${order.code}`),
  });

  const chooseCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPhone(customer.phone);
    form.setValue("phone", customer.phone);
  };
  const notFound =
    searchQuery &&
    !customers.isFetching &&
    !customers.data?.length &&
    isPhoneInput(phone) &&
    !selectedCustomer;

  return (
    <div className="has-bottom-action">
      <PageHeader sub={`Đơn ${id.toUpperCase()}`}>Gắn khách</PageHeader>
      {attach.error && (
        <Banner
          className="customer-match"
          tone="error"
          title={attach.error.message}
        />
      )}
      <form
        className="task-form"
        onSubmit={form.handleSubmit((values) => attach.mutate(values))}
      >
        <Controller
          control={form.control}
          name="phone"
          rules={{ required: "Nhập số điện thoại" }}
          render={({ field, fieldState }) => (
            <Field
              label="Số điện thoại"
              htmlFor="phone"
              error={fieldState.error?.message}
            >
              <Input
                id="phone"
                className="input-lg"
                autoFocus
                autoComplete="tel"
                inputMode="tel"
                placeholder="09xxxxxxxx"
                {...field}
                value={field.value ?? ""}
                onChange={(event) => {
                  field.onChange(event.target.value);
                  setPhone(event.target.value);
                  if (
                    selectedCustomer &&
                    normalizePhone(event.target.value) !== selectedCustomer.phone
                  )
                    setSelectedCustomer(undefined);
                }}
              />
            </Field>
          )}
        />
        {customers.isFetching && (
          <div className="lookup-state" role="status">
            <Spinner className="size-4" /> Đang tìm khách...
          </div>
        )}
        {searchQuery && customers.data?.length && !selectedCustomer ? (
          <div
            className="customer-suggestions"
            role="listbox"
            aria-label="Gợi ý khách hàng"
          >
            {customers.data.map((customer) => (
              <Button
                type="button"
                variant="ghost"
                className="customer-suggestion"
                role="option"
                key={customer.id}
                onClick={() => chooseCustomer(customer)}
              >
                <strong>
                  {customer.name ?? "Khách cũ"} - {customer.phone}
                </strong>
              </Button>
            ))}
          </div>
        ) : notFound ? (
          <div className="new-customer-panel" role="status">
            <p>Không tìm thấy khách hàng.</p>
          </div>
        ) : null}
        {selectedCustomer ? (
          <Banner
            className="customer-match"
            tone="success"
            title={`${selectedCustomer.name ?? "Khách cũ"} · ${selectedCustomer.totalOrders} đơn`}
          />
        ) : notFound ? (
          <Controller
            control={form.control}
            name="name"
            render={({ field }) => (
              <Field label="Tên khách mới (không bắt buộc)" htmlFor="name">
                <Input
                  id="name"
                  className="input-lg"
                  placeholder="Nguyễn Văn A"
                  {...field}
                  value={field.value ?? ""}
                />
              </Field>
            )}
          />
        ) : null}
        <BottomActionBar>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={attach.isPending}
          >
            {attach.isPending ? "ĐANG GẮN KHÁCH..." : "GẮN KHÁCH"}
          </Button>
        </BottomActionBar>
      </form>
    </div>
  );
}
