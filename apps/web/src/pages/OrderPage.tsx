import { PrinterOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App as AntApp, Button, Empty, Input, Modal, Radio } from 'antd';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Order } from '../api/types';
import { BottomActionBar, Money, PageTitle, StatusBadge } from '../components/common';
import { useSession } from '../session';

const maskPhone = (phone?: string) => phone ? `${phone.slice(0, 4)} *** ${phone.slice(-3)}` : '—';
export function OrderPage() {
  const { message } = AntApp.useApp();
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const session = useSession();
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api<Order>(`/orders/${id}`), retry: false });
  const reprint = useMutation({
    mutationFn: () => api(`/orders/${id}/reprint`, { method: 'POST' }),
    onSuccess: () => message.success('Đã gửi lệnh in'),
  });
  const returnOrder = useMutation({
    mutationFn: (method: string) => api<Order>(`/orders/${id}/return`, { method: 'POST', body: JSON.stringify({ method }) }),
    onSuccess: (data) => {
      queryClient.setQueryData(['order', id], data);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      message.success('Đã trả đồ và cộng điểm');
    },
  });
  const cancel = useMutation({
    mutationFn: () => api<Order>(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: (data) => {
      queryClient.setQueryData(['order', id], data);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setCancelOpen(false);
      message.success('Đã huỷ đơn');
    },
  });

  if (order.isLoading) return <div className="center">Đang tải...</div>;
  if (!order.data) return <Empty description={order.error?.message ?? 'Không tìm thấy đơn'}/>;
  const data = order.data;
  const item = data.items[0];
  const needsCustomer = data.status === 'READY_FOR_PICKUP' && !data.customer;
  const canReturn = data.status === 'READY_FOR_PICKUP' && !!data.customer;

  return <div className={data.status === 'PROCESSING' || data.status === 'READY_FOR_PICKUP' ? 'has-bottom-action' : ''}>
    <div className="title-row">
      <PageTitle>{data.code}</PageTitle>
      <StatusBadge status={data.status}/>
    </div>
    {data.notifications[0]?.status === 'ERROR' && <Alert className="customer-match" type="error" message="Gửi Zalo thất bại" description={data.notifications[0].error} showIcon/>}
    {returnOrder.error && <Alert className="customer-match" type="error" message={returnOrder.error.message} showIcon/>}
    {reprint.error && <Alert className="customer-match" type="error" message={reprint.error.message} showIcon/>}

    <section className="order-hero">
      {data.customer ? <div className="order-customer">{data.customer.name ?? 'Khách hàng'}<br/><small>{maskPhone(data.customer.phone)}</small></div>
        : <div><span className="unknown-badge">Chưa xác định khách</span></div>}
      {data.note && <div className="note-callout"><small>LƯU Ý</small><strong>{data.note.toUpperCase()}</strong></div>}
    </section>

    <div className="detail-list">
      <div className="detail-row"><span>Nhận lúc</span><strong>{new Date(data.createdAt).toLocaleString('vi-VN')}</strong></div>
      <div className="detail-row"><span>Khối lượng</span><strong>{data.weight ? `${data.weight} kg` : 'Chưa cân'}</strong></div>
      <div className="detail-row"><span>Dịch vụ</span><strong>{item?.serviceName ?? 'Chưa chọn'}</strong></div>
      <div className="detail-row"><span>Thành tiền</span><strong><Money value={data.total}/></strong></div>
    </div>

    {canReturn && <section className="payment-panel">
      <div className="detail-row"><span>Điểm được cộng</span><strong>+{data.pointsToEarn ?? 0}</strong></div>
      <label><strong>Thanh toán</strong></label>
      <Radio.Group
        className="quick-choice"
        optionType="button"
        buttonStyle="solid"
        value={paymentMethod}
        options={[{ label: 'Tiền mặt', value: 'CASH' }, { label: 'Chuyển khoản', value: 'BANK_TRANSFER' }]}
        onChange={(event) => setPaymentMethod(event.target.value)}
      />
    </section>}

    <div className="order-actions">
      {data.status === 'READY_FOR_PICKUP' && !data.payments.length && session.data?.role !== 'STAFF' && <Link to={`/orders/${data.code}/complete`}><Button size="large" block>SỬA CÂN</Button></Link>}
      {session.data?.role !== 'STAFF' && ['PROCESSING', 'READY_FOR_PICKUP'].includes(data.status) && !data.payments.length && <Button danger size="large" block onClick={() => setCancelOpen(true)}>HUỶ ĐƠN</Button>}
      <Button size="large" block icon={<PrinterOutlined/>} loading={reprint.isPending} onClick={() => reprint.mutate()}>IN LẠI BILL</Button>
    </div>

    {data.status === 'PROCESSING' && <BottomActionBar><Link to={`/orders/${data.code}/complete`}><Button type="primary" size="large" block>CÂN & HOÀN THÀNH</Button></Link></BottomActionBar>}
    {needsCustomer && <BottomActionBar><Link to={`/orders/${data.code}/attach-customer`}><Button type="primary" size="large" block>GẮN KHÁCH</Button></Link></BottomActionBar>}
    {canReturn && <BottomActionBar><Button type="primary" size="large" block loading={returnOrder.isPending} onClick={() => returnOrder.mutate(paymentMethod)}>{returnOrder.isPending ? 'ĐANG TRẢ ĐỒ...' : 'TRẢ ĐỒ'}</Button></BottomActionBar>}

    <Modal
      title="Huỷ đơn"
      open={cancelOpen}
      onCancel={() => setCancelOpen(false)}
      onOk={() => cancel.mutate()}
      okText="Huỷ đơn"
      cancelText="Quay lại"
      okButtonProps={{ danger: true, disabled: reason.trim().length < 3 }}
      confirmLoading={cancel.isPending}
    >
      <Input.TextArea rows={3} placeholder="Lý do huỷ" value={reason} onChange={(event) => setReason(event.target.value)}/>
    </Modal>
  </div>;
}
