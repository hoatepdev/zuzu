import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Input, Radio } from 'antd';
import { useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Customer, Order } from '../api/types';
import { BottomActionBar, PageTitle } from '../components/common';

const notes = ['Không có', 'Giặt riêng', 'Ít thơm', 'Không nước xả', 'Khác'];
export function ReceivePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unknown, setUnknown] = useState(false);
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('Không có');
  const [printFailedOrder, setPrintFailedOrder] = useState<Order>();
  const deferredPhone = useDeferredValue(phone);
  const normalizedPhone = deferredPhone.replace(/\s/g, '');
  const customers = useQuery({
    queryKey: ['customers', 'lookup', normalizedPhone],
    queryFn: () => api<Customer[]>(`/customers/search?q=${encodeURIComponent(normalizedPhone)}`),
    enabled: normalizedPhone.length >= 8 && !unknown,
  });
  const found = customers.data?.find((customer) => customer.phone.replace(/\s/g, '') === normalizedPhone);
  const create = useMutation({
    mutationFn: (values: { phone?: string; customerName?: string; customNote?: string }) => api<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        phone: unknown ? undefined : values.phone,
        customerName: values.customerName,
        note: note === 'Không có' ? undefined : note === 'Khác' ? values.customNote : note,
        customerUnknown: unknown,
      }),
    }),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (order.printWarning) setPrintFailedOrder(order);
      else navigate('/', { state: { receivedCode: order.code } });
    },
  });
  const reprint = useMutation({
    mutationFn: () => api(`/orders/${printFailedOrder!.code}/reprint`, { method: 'POST' }),
    onSuccess: () => navigate('/'),
  });

  if (printFailedOrder) return <>
    <PageTitle>Đã tạo {printFailedOrder.code}</PageTitle>
    <Alert
      type="error"
      showIcon
      message="Không thể kết nối máy in"
      description={printFailedOrder.printWarning}
    />
    {reprint.error && <Alert className="list-card" type="error" message={reprint.error.message} showIcon/>}
    <div className="order-actions">
      <Button type="primary" size="large" block loading={reprint.isPending} onClick={() => reprint.mutate()}>
        {reprint.isPending ? 'ĐANG THỬ LẠI...' : 'THỬ IN LẠI'}
      </Button>
      <Button size="large" block onClick={() => navigate('/')}>TIẾP TỤC KHÔNG IN</Button>
    </div>
  </>;

  return <div className="has-bottom-action">
    <PageTitle>Nhận đồ</PageTitle>
    {create.error && <Alert className="customer-match" type="error" message={create.error.message} showIcon/>}
    <Form className="task-form" layout="vertical" onFinish={(values) => create.mutate(values)}>
      <Form.Item>
        <Button className={`unknown-toggle ${unknown ? 'active' : ''}`} block aria-pressed={unknown} onClick={() => setUnknown((value) => !value)}>
          <span><strong>Chưa xác định khách</strong><br/><small>Khách để túi đồ nhưng chưa rõ thông tin</small></span>
          <span>{unknown ? 'Đã chọn' : 'Chọn'}</span>
        </Button>
      </Form.Item>
      {!unknown && <>
        <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
          <Input autoFocus autoComplete="tel" inputMode="tel" size="large" onChange={(event) => setPhone(event.target.value)}/>
        </Form.Item>
        {customers.isFetching && <div className="customer-match">Đang tìm khách...</div>}
        {found ? <Alert className="customer-match" type="success" message={`${found.name ?? 'Khách cũ'} · ${found.totalOrders} đơn`} showIcon/>
          : normalizedPhone.length >= 8 && !customers.isFetching ? <Form.Item name="customerName" label="Tên khách mới (không bắt buộc)"><Input size="large"/></Form.Item> : null}
      </>}
      <Form.Item label="Lưu ý">
        <Radio.Group className="quick-choice" options={notes} value={note} onChange={(event) => setNote(event.target.value)}/>
      </Form.Item>
      {note === 'Khác' && <Form.Item name="customNote" label="Lưu ý khác" rules={[{ required: true, message: 'Nhập lưu ý' }]}><Input.TextArea rows={3}/></Form.Item>}
      <BottomActionBar>
        <Button type="primary" htmlType="submit" size="large" block loading={create.isPending}>
          {create.isPending ? 'ĐANG TẠO ĐƠN...' : 'NHẬN ĐỒ'}
        </Button>
      </BottomActionBar>
    </Form>
  </div>;
}
