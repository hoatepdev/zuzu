import { Empty, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { Order, OrderStatus } from '../api/types';

const labels: Record<OrderStatus, string> = {
  PROCESSING: 'Đang xử lý',
  READY_FOR_PICKUP: 'Chờ khách lấy',
  COMPLETED: 'Đã trả',
  CANCELLED: 'Đã huỷ',
};
const colors: Record<OrderStatus, string> = {
  PROCESSING: 'blue',
  READY_FOR_PICKUP: 'gold',
  COMPLETED: 'green',
  CANCELLED: 'default',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Tag className="status-badge" color={colors[status]}>{labels[status]}</Tag>;
}
export function Money({ value, className = '' }: { value?: string | number; className?: string }) {
  return <span className={`money ${className}`.trim()}>{value == null ? '—' : `${Number(value).toLocaleString('vi-VN')}đ`}</span>;
}
export function PageTitle({ children }: { children: React.ReactNode }) {
  return <Typography.Title level={1} className="page-title">{children}</Typography.Title>;
}
export function BottomActionBar({ children }: { children: React.ReactNode }) {
  return <div className="bottom-action-bar">{children}</div>;
}
export function OrderCard({ order }: { order: Order }) {
  return <Link to={`/orders/${order.code}`} className="order-card">
    <div className="order-card-main">
      <strong className="order-code">{order.code}</strong>
      <StatusBadge status={order.status}/>
    </div>
    <div className="order-card-customer">
      {order.customer?.name ?? 'Chưa xác định khách'}
      {order.customer?.phone ? ` · ${order.customer.phone}` : ''}
    </div>
    <div className="order-card-meta">
      <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
      <Money value={order.total}/>
    </div>
  </Link>;
}
export function EmptyState({ description }: { description: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description}/>;
}
