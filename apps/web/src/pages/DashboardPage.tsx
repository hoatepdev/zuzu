import { useQuery } from '@tanstack/react-query';
import { Alert, DatePicker, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api } from '../api/client';
import { Dashboard } from '../api/types';
import { Money, PageTitle } from '../components/common';

const todayVN = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="metric"><span className="metric-label">{label}</span><strong className="metric-value">{children}</strong></div>;
}
export function DashboardPage() {
  const today = todayVN();
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null]>([dayjs(today), dayjs(today)]);
  const from = dates[0]?.format('YYYY-MM-DD') ?? today;
  const to = dates[1]?.format('YYYY-MM-DD') ?? today;
  const query = useQuery({ queryKey: ['dashboard', from, to], queryFn: () => api<Dashboard>(`/dashboard/range?from=${from}&to=${to}`) });
  const d = query.data;

  return <>
    <div className="title-row"><PageTitle>{from === to ? 'Hôm nay' : `${dates[0]?.format('DD/MM/YYYY')} → ${dates[1]?.format('DD/MM/YYYY')}`}</PageTitle></div>
    <DatePicker.RangePicker aria-label="Khoảng ngày dashboard" size="large" format="DD/MM/YYYY" value={dates} onChange={(value) => value && setDates(value)}/>
    {query.error && <Alert className="list-card" type="error" message={query.error.message} showIcon/>}
    {query.isLoading ? <div className="center"><Spin/></div> : <>
      <section className="dashboard-metrics list-card" aria-label="Tài chính">
        <Metric label="Doanh thu"><Money value={d?.revenue}/></Metric>
        <Metric label="Chi phí"><Money value={d?.expenses}/></Metric>
        <Metric label="Lợi nhuận tạm tính"><Money value={d?.estimatedProfit}/></Metric>
      </section>
      <section className="dashboard-metrics list-card" aria-label="Vận hành">
        <Metric label="Số đơn">{d?.orders ?? 0}</Metric>
        <Metric label="Tổng khối lượng">{d?.kg ?? 0} kg</Metric>
        <Metric label="Đang xử lý">{d?.processing ?? 0}</Metric>
        <Metric label="Chờ khách lấy">{d?.ready ?? 0}</Metric>
      </section>
      <section className="management-section detail-list" aria-label="Chi tiết">
        <div className="detail-row"><span>Tiền mặt</span><strong><Money value={d?.cash}/></strong></div>
        <div className="detail-row"><span>Chuyển khoản</span><strong><Money value={d?.bankTransfer}/></strong></div>
        <div className="detail-row"><span>Chưa thu hiện tại</span><strong><Money value={d?.unpaid}/></strong></div>
        <div className="detail-row"><span>Khách mới / quay lại</span><strong>{d?.newCustomers ?? 0} / {d?.returningCustomers ?? 0}</strong></div>
      </section>
    </>}
  </>;
}
