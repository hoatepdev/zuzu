import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Dashboard } from "../api/types";
import { RevenueChart } from "../components/charts/RevenueChart";
import {
  Banner,
  Metric,
  Money,
  PageHeader,
  QuickChoice,
  Spinner,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const vnDateKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    date,
  );
const todayVN = () => vnDateKey(new Date());
// ponytail: fixed 24h shift is safe because Vietnam has no DST
const shiftDays = (dateKey: string, days: number) =>
  vnDateKey(new Date(new Date(`${dateKey}T00:00:00+07:00`).getTime() + days * 86400000));

export type DashboardPreset = "today" | "7d" | "30d" | "month";

export function presetRange(preset: DashboardPreset, now = new Date()) {
  const today = vnDateKey(now);
  switch (preset) {
    case "today":
      return { today, from: today, to: today };
    case "7d":
      return { today, from: shiftDays(today, -6), to: today };
    case "30d":
      return { today, from: shiftDays(today, -29), to: today };
    case "month":
      return { today, from: `${today.slice(0, 7)}-01`, to: today };
  }
}

const formatDMY = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const compareText = (
  current: string | number,
  previous: string | number,
) => {
  const prev = Number(previous);
  if (!prev) return "Kỳ trước chưa có dữ liệu";
  const percent =
    ((Number(current) - prev) / Math.abs(prev)) * 100;
  const arrow = percent >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(percent).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% so với kỳ trước`;
};

const presetOptions: { label: string; value: DashboardPreset }[] = [
  { label: "Hôm nay", value: "today" },
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "Tháng này", value: "month" },
];

export function DashboardPage() {
  const initial = presetRange("today");
  const [from, setFrom] = useState(initial.today);
  const [to, setTo] = useState(initial.today);
  const [preset, setPreset] = useState<DashboardPreset | undefined>("today");
  const today = initial.today;
  const query = useQuery({
    queryKey: ["dashboard", from, to],
    queryFn: () =>
      api<Dashboard>(
        `/dashboard/range?${new URLSearchParams({ from, to })}`,
      ),
  });
  const d = query.data;
  const reduceMotion = useReducedMotion();
  const enter = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  };

  const applyPreset = (next: DashboardPreset) => {
    const range = presetRange(next);
    setPreset(next);
    setFrom(range.from);
    setTo(range.to);
  };
  const chartData = (d?.daily ?? []).map((point) => ({
    date: point.date,
    revenue: Number(point.revenue),
    expenses: Number(point.expenses),
  }));

  return (
    <>
      <PageHeader
        sub="Tổng quan tài chính và vận hành"
        extra={
          <Button size="lg">
            <Link to="/receive">NHẬN ĐỒ</Link>
          </Button>
        }
      >
        {from === to ? "Hôm nay" : `${formatDMY(from)} → ${formatDMY(to)}`}
      </PageHeader>
      <div className="range-picker" aria-label="Khoảng ngày dashboard">
        <Label htmlFor="dashboard-from">
          <span>Từ</span>
          <Input
            id="dashboard-from"
            type="date"
            className="date-input"
            value={from}
            max={to}
            onChange={(event) => {
              setFrom(event.target.value || today);
              setPreset(undefined);
            }}
          />
        </Label>
        <Label htmlFor="dashboard-to">
          <span>Đến</span>
          <Input
            id="dashboard-to"
            type="date"
            className="date-input"
            value={to}
            min={from}
            max={today}
            onChange={(event) => {
              setTo(event.target.value || today);
              setPreset(undefined);
            }}
          />
        </Label>
      </div>
      <QuickChoice
        className="range-presets"
        ariaLabel="Chọn nhanh khoảng ngày"
        options={presetOptions}
        value={preset}
        onChange={applyPreset}
      />
      {query.error && (
        <Banner
          className="list-card"
          tone="error"
          title={query.error.message}
        />
      )}
      {query.error ? null : query.isLoading ? (
        <div className="center">
          <Spinner className="size-6" />
        </div>
      ) : (
        <>
          <motion.section
            {...enter}
            className="dashboard-metrics list-card"
            aria-label="Tài chính"
          >
            <Metric
              label="Doanh thu"
              hero
              detail={d && compareText(d.revenue, d.previous.revenue)}
            >
              <Money value={d?.revenue} />
            </Metric>
            <Metric
              label="Chi phí"
              detail={d && compareText(d.expenses, d.previous.expenses)}
            >
              <Money value={d?.expenses} />
            </Metric>
            <Metric
              label="Lợi nhuận tạm tính"
              detail={d && compareText(d.estimatedProfit, d.previous.estimatedProfit)}
            >
              <Money value={d?.estimatedProfit} />
            </Metric>
          </motion.section>
          <motion.section
            {...enter}
            className="dashboard-metrics list-card"
            aria-label="Vận hành"
          >
            <Metric
              label="Số đơn"
              detail={d && compareText(d.orders, d.previous.orders)}
            >
              {d?.orders ?? 0}
            </Metric>
            <Metric label="Tổng khối lượng">{d?.kg ?? 0} kg</Metric>
            <Metric label="Đang xử lý">{d?.processing ?? 0}</Metric>
            <Metric label="Chờ khách lấy">{d?.ready ?? 0}</Metric>
          </motion.section>
          <motion.section {...enter} className="panel detail-list" aria-label="Chi tiết">
            <h2 className="panel-title">Dòng tiền</h2>
            <div className="detail-row">
              <span>Tiền mặt</span>
              <strong>
                <Money value={d?.cash} />
              </strong>
            </div>
            <div className="detail-row">
              <span>Chuyển khoản</span>
              <strong>
                <Money value={d?.bankTransfer} />
              </strong>
            </div>
            <div className="detail-row">
              <span>Chưa thu hiện tại</span>
              <strong>
                <Money value={d?.unpaid} />
              </strong>
            </div>
            <div className="detail-row">
              <span>Khách mới / quay lại</span>
              <strong>
                {d?.newCustomers ?? 0} / {d?.returningCustomers ?? 0}
              </strong>
            </div>
          </motion.section>
          <motion.section {...enter} className="panel dashboard-chart" aria-labelledby="revenue-chart-title">
            <h2 id="revenue-chart-title" className="panel-title">Doanh thu theo ngày</h2>
            <RevenueChart data={chartData} />
          </motion.section>
        </>
      )}
    </>
  );
}
