import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Collapse, Form, InputNumber, Radio } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Order, Service } from '../api/types';
import { BottomActionBar, Money, PageTitle } from '../components/common';
import { useSession } from '../session';

export function CompletePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSession();
  const services = useQuery({ queryKey: ['services'], queryFn: () => api<Service[]>('/services') });
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api<Order>(`/orders/${id}`), retry: false });
  const complete = useMutation({
    mutationFn: (values: { serviceId: string; quantity: number; discount?: number }) => api<Order>(`/orders/${id}/complete`, { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order', id] });
      navigate(`/orders/${saved.code}`);
    },
  });
  const [form] = Form.useForm();
  const serviceId = Form.useWatch('serviceId', form) as string | undefined;
  const quantity = Form.useWatch('quantity', form) as number | undefined;
  const discount = (Form.useWatch('discount', form) as number | undefined) ?? 0;
  const selected = services.data?.find((service) => service.id === serviceId);
  const adjusting = order.data?.status === 'READY_FOR_PICKUP';

  useEffect(() => {
    const item = order.data?.items[0];
    if (item) form.setFieldsValue({ serviceId: item.serviceId, quantity: Number(item.quantity), discount: Number(order.data?.discount ?? 0) });
  }, [order.data, form]);

  return <div className="has-bottom-action">
    <PageTitle>{adjusting ? 'Sửa cân' : 'Cân & hoàn thành'}</PageTitle>
    {order.error && <Alert className="customer-match" type="error" message={order.error.message} showIcon/>}
    {complete.error && <Alert className="customer-match" type="error" message={complete.error.message} showIcon/>}
    <Form className="task-form" form={form} layout="vertical" onFinish={(values) => complete.mutate(values)}>
      <Form.Item name="serviceId" label="Dịch vụ" rules={[{ required: true, message: 'Chọn dịch vụ' }]}>
        <Radio.Group className="service-choice">
          {services.data?.map((service) => <Radio key={service.id} value={service.id}>
            <strong>{service.name}</strong>
            <small>{Number(service.price).toLocaleString('vi-VN')}đ/{service.unit === 'KG' ? 'kg' : service.unit === 'PAIR' ? 'đôi' : 'món'}</small>
          </Radio>)}
        </Radio.Group>
      </Form.Item>
      <Form.Item name="quantity" label={selected?.unit === 'KG' ? 'Khối lượng (kg)' : 'Số lượng'} rules={[{ required: true, message: 'Nhập khối lượng hoặc số lượng' }]}>
        <InputNumber className="quantity-input" autoFocus inputMode="decimal" size="large" min={0.01} step={selected?.unit === 'KG' ? 0.1 : 1} style={{ width: '100%' }}/>
      </Form.Item>
      {session.data?.role !== 'STAFF' && <Collapse ghost items={[{
        key: 'discount',
        label: 'Giảm giá',
        children: <Form.Item name="discount" initialValue={0}><InputNumber inputMode="numeric" size="large" min={0} precision={0} suffix="đ" style={{ width: '100%' }}/></Form.Item>,
      }]}/>}
      <div className="total-preview">
        <span>Thành tiền dự kiến</span>
        <Money className="money-hero" value={selected && quantity ? Math.max(Number(selected.price) * quantity - discount, 0) : undefined}/>
      </div>
      <small>Giá trị cuối cùng do hệ thống xác nhận khi hoàn thành.</small>
      <BottomActionBar>
        <Button type="primary" htmlType="submit" size="large" block loading={complete.isPending}>
          {complete.isPending ? 'ĐANG HOÀN THÀNH...' : adjusting ? 'LƯU SỬA' : 'HOÀN THÀNH'}
        </Button>
      </BottomActionBar>
    </Form>
  </div>;
}
