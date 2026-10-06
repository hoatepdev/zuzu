import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useRef } from "react";
import { NumericFormat } from "react-number-format";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Link } from "react-router-dom";
import { Order, OrderStatus } from "../api/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusMeta: Record<OrderStatus, { label: string }> = {
  PROCESSING: { label: "Đang xử lý" },
  READY_FOR_PICKUP: { label: "Chờ khách lấy" },
  COMPLETED: { label: "Đã trả" },
  CANCELLED: { label: "Đã huỷ" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge className={`status-badge st-${status}`}>
      {statusMeta[status].label}
    </Badge>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <Loader2
      aria-hidden={true}
      className={`inline-block animate-spin align-[-2px] ${className}`.trim()}
    />
  );
}

export function quickAmount(value: number): number {
  return value < 1000 ? value * 1000 : value;
}

export function formatMoney(value: string | number): string {
  return `${Number(value).toLocaleString("vi-VN")}đ`;
}

// Nhập <1000 hiểu là nghìn đồng; chỉ chuyển khi blur/Enter để không gián đoạn lúc gõ
export function NumberInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
  min,
  decimal = false,
  quickThousand = true,
  suffix,
  className = "",
  ...props
}: {
  value?: number;
  onChange?: (value: number | undefined) => void;
  min?: number;
  decimal?: boolean;
  quickThousand?: boolean;
  suffix?: string;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange" | "min" | "suffix">) {
  const inputRef = useRef<HTMLInputElement>(null);
  const readValue = () => {
    const raw = inputRef.current?.value.trim();
    return raw
      ? Number(raw.replace(/\./g, "").replace(",", "."))
      : undefined;
  };
  const commit = (next?: number) => {
    if (next != null) {
      if (quickThousand && next > 0 && next < 1000) next = quickAmount(next);
      if (min != null && next < min) next = min;
    }
    onChange?.(next);
    return next;
  };
  return (
    <span className={`amount-shell ${className}`.trim()}>
      <NumericFormat
        {...props}
        getInputRef={inputRef}
        customInput={Input}
        inputMode={decimal ? "decimal" : "numeric"}
        value={value ?? ""}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={decimal ? 2 : 0}
        allowNegative={false}
        allowLeadingZeros={false}
        onValueChange={({ floatValue }, sourceInfo) => {
          if (sourceInfo.source === "event") onChange?.(floatValue);
        }}
        onBlur={(event) => {
          commit(readValue());
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(readValue());
          }
          onKeyDown?.(event);
        }}
      />
      {suffix && <b aria-hidden="true">{suffix}</b>}
    </span>
  );
}

export function AmountInput(props: ComponentProps<typeof NumberInput>) {
  return <NumberInput quickThousand suffix="đ" {...props} />;
}

export function Money({
  value,
  className = "",
}: {
  value?: string | number;
  className?: string;
}) {
  return (
    <span className={`money ${className}`.trim()}>
      {value == null ? "-" : formatMoney(value)}
    </span>
  );
}

export function ZuzuMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="zuzu-mark"
    >
      <rect width="48" height="48" rx="14" fill="#0E7C66" />
      <circle cx="18.5" cy="18" r="7.8" fill="#FFFDF6" />
      <circle cx="32" cy="27" r="5" fill="#9FE3C6" />
      <circle cx="21.5" cy="33.5" r="3" fill="#5BC49C" />
    </svg>
  );
}

export function ZuzuWordmark({
  light = false,
  sub = "Laundry OS",
}: {
  light?: boolean;
  sub?: string;
}) {
  return (
    <span className={`wordmark ${light ? "wordmark-light" : ""}`.trim()}>
      <ZuzuMark />
      <span className="wordmark-text">
        <b>ZUZU</b>
        {sub && <small>{sub}</small>}
      </span>
    </span>
  );
}

export function PageHeader({
  children,
  sub,
  extra,
}: {
  children: ReactNode;
  sub?: string;
  extra?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{children}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {extra}
    </header>
  );
}

export function BottomActionBar({ children }: { children: ReactNode }) {
  return <div className="bottom-action-bar">{children}</div>;
}

export function QuickChoice<T extends string>({
  options,
  value,
  onChange,
  className = "",
  ariaLabel,
  disabled,
}: {
  options: { label: string; value: T }[];
  value: T | undefined;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`quick-choice ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export function Banner({
  tone = "info",
  title,
  children,
  action,
  onClose,
  className = "",
}: {
  tone?: "success" | "error" | "warning" | "info";
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <Alert
      className={`banner bn-${tone} ${className}`.trim()}
      role={tone === "error" ? "alert" : "status"}
    >
      <div className="banner-body">
        {title && <strong>{title}</strong>}
        {children}
      </div>
      {(action || onClose) && (
        <div className="banner-side">
          {action}
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="banner-close"
              aria-label="Đóng thông báo"
              onClick={onClose}
            >
              ×
            </Button>
          )}
        </div>
      )}
    </Alert>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = "",
}: {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${className}`.trim()}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type Rule = Record<string, unknown>;

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  rules,
  ...props
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  hint?: ReactNode;
  rules?: Rule;
} & Omit<ComponentProps<typeof Input>, "id" | "name">) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          htmlFor={name}
          error={fieldState.error?.message}
          hint={hint}
        >
          <Input
            id={name}
            aria-invalid={!!fieldState.error}
            {...props}
            {...field}
            value={(field.value as string) ?? ""}
          />
        </Field>
      )}
    />
  );
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  rules,
  ...props
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  hint?: ReactNode;
  rules?: Rule;
} & Omit<ComponentProps<typeof NumberInput>, "id" | "name" | "value" | "onChange" | "onBlur">) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          htmlFor={name}
          error={fieldState.error?.message}
          hint={hint}
        >
          <NumberInput
            id={name}
            aria-invalid={!!fieldState.error}
            {...props}
            value={(field.value as number) ?? undefined}
            onChange={(value) => field.onChange(value)}
            onBlur={field.onBlur}
          />
        </Field>
      )}
    />
  );
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  rules,
  options,
  placeholder,
  className = "",
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  hint?: ReactNode;
  rules?: Rule;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          htmlFor={name}
          error={fieldState.error?.message}
          hint={hint}
        >
          <Select
            name={name}
            value={field.value as string | undefined}
            onValueChange={field.onChange}
          >
            <SelectTrigger
              id={name}
              className={`h-13.5 w-full text-base font-semibold ${className}`.trim()}
              aria-invalid={!!fieldState.error}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  rules,
  ...props
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  hint?: ReactNode;
  rules?: Rule;
} & Omit<ComponentProps<typeof Textarea>, "id" | "name" | "value" | "onChange" | "onBlur">) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          htmlFor={name}
          error={fieldState.error?.message}
          hint={hint}
        >
          <Textarea
            id={name}
            className="text-area"
            aria-invalid={!!fieldState.error}
            {...props}
            {...field}
            value={(field.value as string) ?? ""}
          />
        </Field>
      )}
    />
  );
}

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Label className="check-row" htmlFor={name}>
          <Checkbox
            id={name}
            checked={!!field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
          />
          <span>{label}</span>
        </Label>
      )}
    />
  );
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Label className="switch-row" htmlFor={name}>
          <span>{label}</span>
          <Switch
            id={name}
            className="switch"
            checked={!!field.value}
            onCheckedChange={field.onChange}
          />
        </Label>
      )}
    />
  );
}

export function Pager({
  page,
  total,
  limit = 20,
  onChange,
}: {
  page: number;
  total?: number;
  limit?: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil((total ?? 0) / limit));
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Phân trang">
      <Button
        type="button"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Trước
      </Button>
      <span>
        Trang {page}/{pages}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </Button>
    </nav>
  );
}

export function Metric({
  label,
  hero = false,
  children,
}: {
  label: string;
  hero?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`metric ${hero ? "metric-hero" : ""}`.trim()}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{children}</strong>
    </div>
  );
}

const sameDay = (iso: string) =>
  new Date(iso).toDateString() === new Date().toDateString();
export function orderTime(iso: string) {
  const date = new Date(iso);
  return sameDay(iso)
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) +
        " " +
        date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
}

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link to={`/orders/${order.code}`} className="order-card">
      <div className="oc-top">
        <span className="oc-code">{order.code}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="oc-customer">
        {order.customer?.name ?? "Chưa xác định khách"}
        {order.customer?.phone && <small> · {order.customer.phone}</small>}
      </div>
      <div className="oc-bottom">
        <span className="oc-time">{orderTime(order.createdAt)}</span>
        {order.weight && (
          <span className="oc-kg">
            {Number(order.weight).toLocaleString("vi-VN")} kg
          </span>
        )}
        <span className="oc-total">
          <Money value={order.total} />
        </span>
      </div>
    </Link>
  );
}

export function EmptyState({
  description,
  action,
}: {
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-bubbles" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <p>{description}</p>
      {action}
    </div>
  );
}
