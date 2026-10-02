import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App as AntApp, Button, Form, InputNumber } from 'antd';
import { useEffect } from 'react';
import { api } from '../api/client';
import { PageHeader } from '../components/common';

export function SettingsPage() {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const query = useQuery({ queryKey: ['settings', 'loyalty'], queryFn: () => api<{ vndPerPoint: number }>('/settings/loyalty') });
  const save = useMutation({ mutationFn: (values: { vndPerPoint: number }) => api('/settings/loyalty', { method: 'PUT', body: JSON.stringify(values) }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['settings'] }); message.success('Đã lưu cài đặt'); } });
  useEffect(() => { if (query.data) form.setFieldsValue(query.data); }, [query.data, form]);
  return <>
    <PageHeader sub="Cấu hình chung của cửa hàng">Cài đặt</PageHeader>
    {query.error && <Alert className="customer-match" type="error" message={query.error.message} showIcon/>}
    <div className="panel">
      <h2 className="panel-title">Điểm thưởng</h2>
      {save.error && <Alert className="customer-match" type="error" message={save.error.message} showIcon/>}
      <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
        <Form.Item name="vndPerPoint" label="Số tiền mỗi 1 điểm (VND)" rules={[{ required: true }]} help="Khách được 1 điểm cho mỗi mốc tiền này trên đơn đã trả.">
          <InputNumber min={1} precision={0} addonAfter="đ/điểm" style={{ width: '100%' }}/>
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={save.isPending}>LƯU</Button>
      </Form>
    </div>
  </>;
}
