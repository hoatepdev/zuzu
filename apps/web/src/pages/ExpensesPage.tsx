import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App as AntApp, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Table, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { EXPENSE_CATEGORIES, Expense, Page } from '../api/types';
import { Money, PageTitle } from '../components/common';

export function ExpensesPage() {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Expense>();
  const [voiding, setVoiding] = useState<Expense>();
  const [category, setCategory] = useState<string>();
  const [paymentMethod, setPaymentMethod] = useState<string>();
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);
  const [form] = Form.useForm();
  const [voidForm] = Form.useForm();
  const params = new URLSearchParams({ includeVoided: 'true', page: String(page), limit: '20' });
  if (category) params.set('category', category);
  if (paymentMethod) params.set('paymentMethod', paymentMethod);
  if (dates?.[0]) params.set('from', dates[0].format('YYYY-MM-DD'));
  if (dates?.[1]) params.set('to', dates[1].format('YYYY-MM-DD'));
  const query = useQuery({ queryKey: ['expenses', page, category, paymentMethod, dates?.[0]?.format('YYYY-MM-DD'), dates?.[1]?.format('YYYY-MM-DD')], queryFn: () => api<Page<Expense>>(`/expenses?${params}`) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['expenses'] });
  const voidExpense = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api(`/expenses/${id}/void`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: () => { setVoiding(undefined); voidForm.resetFields(); refresh(); message.success('Đã huỷ khoản chi'); },
  });
  const update = useMutation({
    mutationFn: (values: { amount: number; description: string }) => api(`/expenses/${editing!.id}`, { method: 'PATCH', body: JSON.stringify(values) }),
    onSuccess: () => { setEditing(undefined); refresh(); message.success('Đã cập nhật'); },
  });
  const edit = (expense: Expense) => { setEditing(expense); form.setFieldsValue({ amount: Number(expense.amount), description: expense.description }); };

  return <>
    <div className="title-row"><PageTitle>Chi phí</PageTitle><Link to="/expenses/new"><Button type="primary" size="large">+ CHI TIỀN</Button></Link></div>
    <div className="filter-bar">
      <Select size="large" allowClear placeholder="Nhóm chi" options={EXPENSE_CATEGORIES.map((value) => ({ value, label: value }))} value={category} onChange={(value) => { setCategory(value); setPage(1); }}/>
      <Select size="large" allowClear placeholder="Thanh toán" options={[{ value: 'CASH', label: 'Tiền mặt' }, { value: 'BANK_TRANSFER', label: 'Chuyển khoản' }]} value={paymentMethod} onChange={(value) => { setPaymentMethod(value); setPage(1); }}/>
      <DatePicker.RangePicker size="large" format="DD/MM/YYYY" value={dates} onChange={(value) => { setDates(value); setPage(1); }}/>
    </div>
    {query.error && <Alert type="error" message={query.error.message} showIcon/>}
    <Table
      rowKey="id"
      loading={query.isLoading}
      dataSource={query.data?.items}
      pagination={{ current: page, total: query.data?.total, pageSize: 20, onChange: setPage, showSizeChanger: false }}
      scroll={{ x: 900 }}
      columns={[
        { title: 'Ngày', dataIndex: 'expenseDate', render: (value: string) => new Date(value).toLocaleDateString('vi-VN') },
        { title: 'Nhóm', dataIndex: 'category' },
        { title: 'Nội dung', dataIndex: 'description' },
        { title: 'Thanh toán', dataIndex: 'paymentMethod', render: (value: string) => value === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản' },
        { title: 'Số tiền', dataIndex: 'amount', render: (value: string) => <Money value={value}/> },
        { title: 'Trạng thái', render: (_, row) => row.voidedAt ? <Tag>Đã huỷ</Tag> : <Tag color="green">Hợp lệ</Tag> },
        { title: '', render: (_, row) => !row.voidedAt && <div className="table-actions"><Button size="small" onClick={() => edit(row)}>Sửa</Button><Button danger size="small" onClick={() => setVoiding(row)}>Huỷ</Button></div> },
      ]}
    />
    <Modal title="Sửa khoản chi" open={!!editing} onCancel={() => setEditing(undefined)} onOk={() => form.submit()} okText="Lưu" cancelText="Quay lại" confirmLoading={update.isPending}>
      {update.error && <Alert className="customer-match" type="error" message={update.error.message} showIcon/>}
      <Form form={form} layout="vertical" onFinish={(values) => update.mutate(values)}>
        <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}><InputNumber min={1} precision={0} suffix="đ" style={{ width: '100%' }}/></Form.Item>
        <Form.Item name="description" label="Nội dung" rules={[{ required: true }]}><Input/></Form.Item>
      </Form>
    </Modal>
    <Modal title="Huỷ khoản chi" open={!!voiding} onCancel={() => setVoiding(undefined)} onOk={() => voidForm.submit()} okText="Huỷ khoản chi" cancelText="Quay lại" okButtonProps={{ danger: true }} confirmLoading={voidExpense.isPending}>
      {voidExpense.error && <Alert className="customer-match" type="error" message={voidExpense.error.message} showIcon/>}
      <Form form={voidForm} layout="vertical" onFinish={({ reason }) => voidExpense.mutate({ id: voiding!.id, reason })}>
        <Form.Item name="reason" label="Lý do" rules={[{ required: true, min: 3, message: 'Nhập ít nhất 3 ký tự' }]}><Input.TextArea rows={3}/></Form.Item>
      </Form>
    </Modal>
  </>;
}
