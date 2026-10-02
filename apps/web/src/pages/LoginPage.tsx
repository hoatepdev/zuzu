import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { User } from '../api/types';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const login = useMutation({
    mutationFn: (values: { usernameOrPhone: string; password: string; remember?: boolean }) => api<User>('/auth/login', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: (user) => {
      queryClient.setQueryData(['session'], user);
      navigate('/');
    },
  });

  return <main className="login">
    <Card className="login-card">
      <div className="brand">ZUZU</div>
      <Typography.Title level={1} className="login-title">Đăng nhập cửa hàng</Typography.Title>
      {login.error && <Alert type="error" message={login.error.message} showIcon/>}
      <Form className="task-form" layout="vertical" onFinish={(values) => login.mutate(values)} initialValues={{ remember: true }}>
        <Form.Item name="usernameOrPhone" label="Tên đăng nhập hoặc SĐT" rules={[{ required: true, message: 'Nhập tên đăng nhập hoặc số điện thoại' }]}>
          <Input autoFocus autoComplete="username" size="large" prefix={<UserOutlined/>}/>
        </Form.Item>
        <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
          <Input.Password autoComplete="current-password" size="large" prefix={<LockOutlined/>}/>
        </Form.Item>
        <Form.Item name="remember" valuePropName="checked"><Checkbox>Ghi nhớ đăng nhập</Checkbox></Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={login.isPending}>
          {login.isPending ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
        </Button>
      </Form>
    </Card>
  </main>;
}
