import { useQuery } from "@tanstack/react-query";
import { Alert, DatePicker, Spin } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useState } from "react";
import { api } from "../api/client";
import { Dashboard } from "../api/types";
import { Metric, Money, PageHeader } from "../components/common";

const todayVN = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
export function DashboardPage() {
  const today = todayVN();
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs(today),
    dayjs(today),
  ]);
  const from = dates[0]?.format("YYYY-MM-DD") ?? today;
  const to = dates[1]?.format("YYYY-MM-DD") ?? today;
  const query = useQuery({
    queryKey: ["dashboard", from, to],
    queryFn: () => api<Dashboard>(`/dashboard/range?from=${from}&to=${to}`),
  });
  const d = query.data;

  return (
    <>
      <PageHeader sub="Tổng quan tài chính và vận hành">
        {from === to
          ? "Hôm nay"
          : `${dates[0]?.format("DD/MM/YYYY")} → ${dates[1]?.format("DD/MM/YYYY")}`}
      </PageHeader>
      <DatePicker.RangePicker
        aria-label="Khoảng ngày dashboard"
        size="large"
        format="DD/MM/YYYY"
        value={dates}
        onChange={(value) => value && setDates(value)}
      />
      {query.error && (
        <Alert
          className="list-card"
          type="error"
          message={query.error.message}
          showIcon
        />
      )}
      {query.isLoading ? (
        <div className="center">
          <Spin />
        </div>
      ) : (
        <>
          <section
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
          </section>
          <section
            className="dashboard-metrics list-card"
            aria-label="Vận hành"
          >
            <Metric label="Số đơn">{d?.orders ?? 0}</Metric>
            <Metric label="Tổng khối lượng">{d?.kg ?? 0} kg</Metric>
            <Metric label="Đang xử lý">{d?.processing ?? 0}</Metric>
            <Metric label="Chờ khách lấy">{d?.ready ?? 0}</Metric>
          </section>
          <section className="panel detail-list" aria-label="Chi tiết">
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
          </section>
        </>
      )}
    </>
  );
}
