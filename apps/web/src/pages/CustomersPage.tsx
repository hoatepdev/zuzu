import { useQuery } from '@tanstack/react-query';
import { Input, Spin } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Customer, Page } from '../api/types';
import { EmptyState, Money, PageHeader } from '../components/common';

export function CustomersPage() {
  const [q, setQ] = useState('');
  const query = useQuery({ queryKey: ['customers', q], queryFn: () => api<Page<Customer>>(`/customers?q=${encodeURIComponent(q)}`) });
  return <>
    <PageHeader sub="Khách quen và lịch sử của họ">Khách hàng</PageHeader>
    <Input.Search size="large" placeholder="Tên hoặc số điện thoại" allowClear onSearch={setQ}/>
    <div className="panel">
      {query.isLoading
        ? <div className="center"><Spin/></div>
        : query.data?.items.length
          ? query.data.items.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className="cust-row">
              <span className="cust-main">
                <b>{customer.name ?? 'Chưa có tên'}</b>
                <small>{customer.phone} · {customer.totalOrders} đơn · {customer.totalKg} kg</small>
              </span>
              <span className="cust-side">
                <b><Money value={customer.totalSpent}/></b>
                <small>{customer.totalPoints} điểm</small>
              </span>
            </Link>
          ))
          : <EmptyState description={q ? `Không tìm thấy khách “${q}”` : 'Chưa có khách hàng'}/>}
    </div>
  </>;
}
