import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

export type RevenuePoint = {
  date: string;
  revenue: number;
  expenses?: number;
};

type RevenueChartProps = {
  data: RevenuePoint[];
};

const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const fullDate = (date: string) => `${dayMonth(date)}/${date.slice(0, 4)}`;

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <b>{fullDate(String(label))}</b>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatMoney(Number(entry.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  const reduceMotion = useReducedMotion();
  if (!data.length) {
    return (
      <div className="chart-empty" role="status">
        Chưa có dữ liệu doanh thu theo ngày để biểu diễn.
      </div>
    );
  }

  const hasExpenses = data.some((point) => point.expenses != null);
  return (
    <div className="revenue-chart" aria-label="Doanh thu theo ngày">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-revenue)" stopOpacity={0.26} />
              <stop offset="95%" stopColor="var(--chart-revenue)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={dayMonth} interval="preserveStartEnd" minTickGap={24} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatMoney} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
          <Tooltip content={(props) => <ChartTooltip {...props} />} cursor={{ stroke: "var(--chart-grid)" }} />
          <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="var(--chart-revenue)" fill="url(#revenue-fill)" strokeWidth={2} isAnimationActive={!reduceMotion} />
          {hasExpenses && <Area type="monotone" dataKey="expenses" name="Chi phí" stroke="var(--chart-expenses)" fill="none" strokeWidth={2} isAnimationActive={!reduceMotion} />}
        </AreaChart>
      </ResponsiveContainer>
      {hasExpenses && <div className="chart-legend"><span><i className="chart-dot revenue" />Doanh thu</span><span><i className="chart-dot expenses" />Chi phí</span></div>}
    </div>
  );
}
