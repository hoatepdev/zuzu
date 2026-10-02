import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App as AntApp, Button, Card, Descriptions, Form, InputNumber, Table } from 'antd';
import { api } from '../api/client';
import { Page, Shift } from '../api/types';
import { Money, PageTitle } from '../components/common';

export function ShiftsPage() {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['shift', 'current'], queryFn: () => api<Shift | null>('/shifts/current') });
  const history = useQuery({ queryKey: ['shifts', 'history'], queryFn: () => api<Page<Shift>>('/shifts') });
  const open = useMutation({ mutationFn: () => api<Shift>('/shifts/open', { method: 'POST' }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['shift'] }); message.success('Đã mở ca'); } });
  const close = useMutation({ mutationFn: ({ actualCash }: { actualCash: number }) => api<Shift>(`/shifts/${query.data!.id}/close`, { method: 'POST', body: JSON.stringify({ actualCash }) }), onSuccess: (shift) => { qc.setQueryData(['shift', 'current'], null); void qc.invalidateQueries({ queryKey: ['shifts'] }); message.success(`Đã chốt ca, chênh lệch ${Number(shift.difference).toLocaleString('vi-VN')}đ`); } });
  return <>
    <PageTitle>Chốt ca</PageTitle>
    {(open.error || close.error) && <Alert type="error" message={(open.error || close.error)?.message}/>}
    <Card loading={query.isLoading}>{query.data ? <>
      <Descriptions column={1}>
        <Descriptions.Item label="Mở lúc">{new Date(query.data.openedAt).toLocaleString('vi-VN')}</Descriptions.Item>
        <Descriptions.Item label="Người mở">{query.data.openedBy.name}</Descriptions.Item>
        <Descriptions.Item label="Tiền mặt hệ thống"><Money value={query.data.systemCash ?? '0'}/></Descriptions.Item>
        <Descriptions.Item label="Chuyển khoản"><Money value={query.data.bankTransferRevenue ?? '0'}/></Descriptions.Item>
        <Descriptions.Item label="Chi tiền mặt"><Money value={query.data.cashExpenses ?? '0'}/></Descriptions.Item>
      </Descriptions>
      <Form layout="vertical" onFinish={(values) => close.mutate(values)}>
        <Form.Item name="actualCash" label="Tiền mặt thực tế" rules={[{ required: true }]}><InputNumber size="large" min={0} precision={0} addonAfter="đ" style={{ width: '100%' }}/></Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={close.isPending}>CHỐT CA</Button>
      </Form>
    </> : <Button type="primary" size="large" onClick={() => open.mutate()} loading={open.isPending}>MỞ CA</Button>}</Card>
    <Card title="Lịch sử ca" className="list-card">
      <Table rowKey="id" size="small" loading={history.isLoading} dataSource={history.data?.items} pagination={{ total: history.data?.total, pageSize: 20 }} scroll={{ x: 760 }} columns={[
        { title: 'Mở ca', render: (_, shift) => new Date(shift.openedAt).toLocaleString('vi-VN') },
        { title: 'Chốt ca', render: (_, shift) => shift.closedAt ? new Date(shift.closedAt).toLocaleString('vi-VN') : '—' },
        { title: 'Người chốt', render: (_, shift) => shift.closedBy?.name ?? '—' },
        { title: 'Doanh thu TM', dataIndex: 'cashRevenue', render: (value?: string) => <Money value={value ?? '0'}/> },
        { title: 'Chi phí TM', dataIndex: 'cashExpenses', render: (value?: string) => <Money value={value ?? '0'}/> },
        { title: 'Thực tế', dataIndex: 'actualCash', render: (value?: string) => <Money value={value ?? '0'}/> },
        { title: 'Chênh lệch', dataIndex: 'difference', render: (value?: string) => <span style={{ color: Number(value ?? 0) < 0 ? '#cf4c3c' : undefined }}><Money value={value ?? '0'}/></span> }
      ]}/>
    </Card>
  </>;
}
