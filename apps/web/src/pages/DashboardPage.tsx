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
  Spinner,
} from "../components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const todayVN = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
const formatDMY = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};
export function DashboardPage() {
  const today = todayVN();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const query = useQuery({
    queryKey: ["dashboard", from, to],
    queryFn: () => api<Dashboard>(`/dashboard/range?from=${from}&to=${to}`),
  });
  const d = query.data;
  const reduceMotion = useReducedMotion();
  const enter = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  };

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
            onChange={(event) => setFrom(event.target.value || today)}
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
            onChange={(event) => setTo(event.target.value || today)}
          />
        </Label>
      </div>
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
            <Metric label="Doanh thu" hero>
              <Money value={d?.revenue} />
            </Metric>
            <Metric label="Chi phí">
              <Money value={d?.expenses} />
            </Metric>
            <Metric label="Lợi nhuận tạm tính">
              <Money value={d?.estimatedProfit} />
            </Metric>
          </motion.section>
          <motion.section
            {...enter}
            className="dashboard-metrics list-card"
            aria-label="Vận hành"
          >
            <Metric label="Số đơn">{d?.orders ?? 0}</Metric>
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
            {/* TODO: /dashboard/range currently returns aggregates only; never invent chart points. */}
            <RevenueChart data={[]} />
          </motion.section>
        </>
      )}
    </>
  );
}
