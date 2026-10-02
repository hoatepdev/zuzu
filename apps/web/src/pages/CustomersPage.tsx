import { useQuery } from '@tanstack/react-query';
import { Card, Input, List } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Customer, Page } from '../api/types';
import { Money, PageTitle } from '../components/common';
export function CustomersPage() { const [q,setQ]=useState(''); const query=useQuery({queryKey:['customers',q],queryFn:()=>api<Page<Customer>>(`/customers?q=${encodeURIComponent(q)}`)}); return <><PageTitle>Khách hàng</PageTitle><Input.Search size="large" placeholder="Tên hoặc số điện thoại" allowClear onSearch={setQ}/><Card className="list-card"><List loading={query.isLoading} dataSource={query.data?.items} renderItem={(customer)=><List.Item extra={<><strong><Money value={customer.totalSpent}/></strong><br/>{customer.totalPoints} điểm</>}><List.Item.Meta title={<Link to={`/customers/${customer.id}`}>{customer.name??'Chưa có tên'}</Link>} description={`${customer.phone} · ${customer.totalOrders} đơn · ${customer.totalKg} kg`}/></List.Item>}/></Card></>; }
