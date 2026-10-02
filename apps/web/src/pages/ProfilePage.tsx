import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Descriptions } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { PageTitle } from '../components/common';
import { useSession } from '../session';
export function ProfilePage() { const session = useSession(); const navigate = useNavigate(); const queryClient = useQueryClient(); const logout = useMutation({ mutationFn: () => api('/auth/logout', { method: 'POST' }), onSuccess: () => { queryClient.clear(); navigate('/login'); } }); return <><PageTitle>Tài khoản</PageTitle><Card><Descriptions column={1}><Descriptions.Item label="Tên">{session.data?.name}</Descriptions.Item><Descriptions.Item label="Vai trò">{session.data?.role === 'OWNER' ? 'Chủ cửa hàng' : session.data?.role === 'MANAGER' ? 'Quản lý' : 'Nhân viên'}</Descriptions.Item></Descriptions><Button danger block size="large" loading={logout.isPending} onClick={() => logout.mutate()}>ĐĂNG XUẤT</Button></Card></>; }
