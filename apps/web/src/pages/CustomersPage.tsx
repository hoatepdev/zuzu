import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Customer, Page } from '../api/types';
import { Banner, EmptyState, ListSkeleton, Money, PageHeader } from '../components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CustomersPage() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const query = useQuery({ queryKey: ['customers', submitted], queryFn: () => api<Page<Customer>>(`/customers?q=${encodeURIComponent(submitted)}`) });
  return <>
    <PageHeader sub="Khách quen và lịch sử của họ">Khách hàng</PageHeader>
    <form
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(q);
      }}
    >
      <Input
        className="input-lg"
        placeholder="Tên hoặc số điện thoại"
        value={q}
        aria-label="Tìm khách hàng"
        onChange={(event) => setQ(event.target.value)}
      />
      <Button type="submit" size="lg">Tìm</Button>
    </form>
    {query.error && <Banner tone="error" title={query.error.message} />}
    <div className="panel">
      {query.isLoading
        ? <ListSkeleton rows={5} />
        : query.error
          ? null
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
          : <EmptyState description={submitted ? `Không tìm thấy khách “${submitted}”` : 'Chưa có khách hàng'}/>}
    </div>
  </>;
}
