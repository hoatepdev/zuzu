import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { PageHeader } from '../components/common';
import { useSession } from '../session';

const roleLabels: Record<string, string> = { OWNER: 'Chủ cửa hàng', MANAGER: 'Quản lý', STAFF: 'Nhân viên' };
const initials = (name = '') => name.trim().split(/\s+/).filter(Boolean).slice(-2).map((word) => word[0]!.toUpperCase()).join('');

export function ProfilePage() {
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => { queryClient.clear(); navigate('/login'); },
  });
  return <>
    <PageHeader>Tài khoản</PageHeader>
    <div className="panel" style={{ display: 'grid', justifyItems: 'center', gap: 6, padding: '32px 20px' }}>
      <span className="avatar" style={{ width: 64, height: 64, borderRadius: 20, fontSize: 22 }}>{initials(session.data?.name)}</span>
      <strong style={{ fontSize: 18, marginTop: 8 }}>{session.data?.name}</strong>
      <span style={{ color: 'var(--ink-2)' }}>{session.data?.role ? roleLabels[session.data.role] : ''}</span>
      <Button danger block size="large" style={{ marginTop: 18 }} loading={logout.isPending} onClick={() => logout.mutate()}>ĐĂNG XUẤT</Button>
    </div>
  </>;
}
