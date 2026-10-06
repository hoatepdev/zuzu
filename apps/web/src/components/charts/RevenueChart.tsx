import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RevenuePoint = {
  label: string;
  revenue: number;
  expenses?: number;
};

type RevenueChartProps = {
  data: RevenuePoint[];
};

const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

export function RevenueChart({ data }: RevenueChartProps) {
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
          <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatMoney} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
          <Tooltip formatter={(value) => formatMoney(Number(value))} />
          <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="var(--chart-revenue)" fill="url(#revenue-fill)" strokeWidth={2} />
          {hasExpenses && <Area type="monotone" dataKey="expenses" name="Chi phí" stroke="var(--chart-expenses)" fill="none" strokeWidth={2} />}
        </AreaChart>
      </ResponsiveContainer>
      {hasExpenses && <div className="chart-legend"><span><i className="chart-dot revenue" />Doanh thu</span><span><i className="chart-dot expenses" />Chi phí</span></div>}
    </div>
  );
}
