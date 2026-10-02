import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api } from './api/client';
import { User } from './api/types';

export function useSession() { return useQuery({ queryKey: ['session'], queryFn: () => api<User>('/auth/me'), retry: false }); }
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();
  if (session.isLoading) return <div className="center">Đang tải…</div>;
  if (!session.data) return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
  return <Outlet/>;
}
export function RequireManager() {
  const session = useSession();
  if (session.isLoading) return <div className="center">Đang tải…</div>;
  if (session.data?.role === 'STAFF') return <Navigate to="/" replace/>;
  return <Outlet/>;
}
export function RequireOwner() {
  const session = useSession();
  if (session.isLoading) return <div className="center">Đang tải…</div>;
  if (session.data?.role !== 'OWNER') return <Navigate to="/" replace/>;
  return <Outlet/>;
}
