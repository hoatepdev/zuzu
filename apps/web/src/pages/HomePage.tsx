import { CameraOutlined, DollarOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Order } from '../api/types';
import { EmptyState, OrderCard } from '../components/common';

export function HomePage() {
  const summary = useQuery({ queryKey: ['orders', 'summary'], queryFn: () => api<{ processing: number; ready: number; attention: number }>('/orders/summary') });
  const recent = useQuery({ queryKey: ['orders', 'recent'], queryFn: () => api<Order[]>('/orders') });

  return <>
    <div className="home-actions">
      <Link to="/receive"><Button className="home-primary" type="primary" size="large" icon={<PlusOutlined/>}>NHẬN ĐỒ</Button></Link>
      <Link to="/scan"><Button className="home-secondary" size="large" icon={<CameraOutlined/>}>QUÉT QR</Button></Link>
    </div>

    <div className="home-counts" aria-label="Tình trạng đơn hàng">
      <div className="home-count"><strong>{summary.data?.processing ?? 0}</strong><span>Đang xử lý</span></div>
      <div className="home-count"><strong>{summary.data?.ready ?? 0}</strong><span>Chờ khách lấy</span></div>
      <div className="home-count"><strong>{summary.data?.attention ?? 0}</strong><span>Cần xử lý</span></div>
    </div>

    <div className="section-heading">
      <h1>Đơn gần đây</h1>
      <Link to="/orders">Xem tất cả</Link>
    </div>
    {recent.isLoading ? <div className="center"><Spin/></div> : recent.error ? <EmptyState description={recent.error.message}/> : recent.data?.length
      ? <div className="order-list">{recent.data.slice(0, 4).map((order) => <OrderCard key={order.id} order={order}/>)}</div>
      : <EmptyState description="Chưa có đơn"/>}

    <Link to="/expenses/new" className="secondary-action"><Button block size="large" icon={<DollarOutlined/>}>CHI TIỀN</Button></Link>
  </>;
}
