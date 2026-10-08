import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '../api/client';
import { Page, Shift } from '../api/types';
import {
  Banner,
  ListSkeleton,
  Money,
  NumberField,
  PageHeader,
  Pager,
  TableSkeleton,
} from '../components/common';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ShiftsPage() {
  const qc = useQueryClient();
  const form = useForm<{ actualCash: number }>();
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['shift', 'current'], queryFn: () => api<Shift | null>('/shifts/current') });
  const history = useQuery({ queryKey: ['shifts', 'history'], queryFn: () => api<Page<Shift>>('/shifts') });
  const open = useMutation({ mutationFn: () => api<Shift>('/shifts/open', { method: 'POST' }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['shift'] }); toast.success('Đã mở ca'); } });
  const close = useMutation({ mutationFn: ({ actualCash }: { actualCash: number }) => api<Shift>(`/shifts/${query.data!.id}/close`, { method: 'POST', body: JSON.stringify({ actualCash }) }), onSuccess: (shift) => { qc.setQueryData(['shift', 'current'], null); void qc.invalidateQueries({ queryKey: ['shifts'] }); toast.success(`Đã chốt ca, chênh lệch ${Number(shift.difference).toLocaleString('vi-VN')}đ`); } });
  return <>
    <PageHeader sub="Đối soát tiền mặt cuối ngày">Chốt ca</PageHeader>
    {(query.error || open.error || close.error) && <Banner tone="error" title={(query.error || open.error || close.error)?.message} />}
    <div className="panel">
      {query.error ? null : query.isLoading ? <ListSkeleton rows={5} /> : query.data ? <>
        <div className="detail-list">
          <div className="detail-row"><span>Mở lúc</span><strong>{new Date(query.data.openedAt).toLocaleString('vi-VN')}</strong></div>
          <div className="detail-row"><span>Người mở</span><strong>{query.data.openedBy.name}</strong></div>
          <div className="detail-row"><span>Tiền mặt hệ thống</span><strong><Money value={query.data.systemCash ?? '0'}/></strong></div>
          <div className="detail-row"><span>Chuyển khoản</span><strong><Money value={query.data.bankTransferRevenue ?? '0'}/></strong></div>
          <div className="detail-row"><span>Chi tiền mặt</span><strong><Money value={query.data.cashExpenses ?? '0'}/></strong></div>
        </div>
        <form className="task-form shift-close-form" onSubmit={form.handleSubmit((values) => close.mutate(values))}>
          <NumberField
            control={form.control}
            name="actualCash"
            label="Tiền mặt thực tế"
            min={0}
            suffix="đ"
            rules={{ required: 'Nhập tiền mặt thực tế' }}
          />
          <Button type="submit" size="lg" className="w-full" disabled={close.isPending}>CHỐT CA</Button>
        </form>
      </> : <Button size="lg" onClick={() => open.mutate()} disabled={open.isPending}>MỞ CA</Button>}
    </div>
    <div className="panel">
      <h2 className="panel-title">Lịch sử ca</h2>
      {history.error && <Banner tone="error" title={history.error.message} />}
      {history.error ? null : history.isLoading ? (
        <TableSkeleton cols={7} rows={4} />
      ) : (
        <>
          <div className="desktop-data-table table-wrap">
            <Table className="management-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Mở ca</TableHead>
                  <TableHead>Chốt ca</TableHead>
                  <TableHead>Người chốt</TableHead>
                  <TableHead>Doanh thu TM</TableHead>
                  <TableHead>Chi phí TM</TableHead>
                  <TableHead>Thực tế</TableHead>
                  <TableHead>Chênh lệch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history.data?.items ?? []).map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{new Date(shift.openedAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{shift.closedAt ? new Date(shift.closedAt).toLocaleString('vi-VN') : '—'}</TableCell>
                    <TableCell>{shift.closedBy?.name ?? '—'}</TableCell>
                    <TableCell><Money value={shift.cashRevenue ?? '0'}/></TableCell>
                    <TableCell><Money value={shift.cashExpenses ?? '0'}/></TableCell>
                    <TableCell><Money value={shift.actualCash ?? '0'}/></TableCell>
                    <TableCell>
                      <span className={Number(shift.difference ?? 0) < 0 ? 'negative' : undefined}>
                        <Money value={shift.difference ?? '0'}/>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mobile-data-list record-list" aria-label="Lịch sử ca">
            {(history.data?.items ?? []).map((shift) => (
              <article className="record-card" key={shift.id}>
                <div className="record-card-top">
                  <span className="record-card-title">
                    {shift.closedAt
                      ? `Chốt ${new Date(shift.closedAt).toLocaleDateString('vi-VN')}`
                      : `Đang mở · ${new Date(shift.openedAt).toLocaleDateString('vi-VN')}`}
                  </span>
                  <span className={Number(shift.difference ?? 0) < 0 ? 'negative' : undefined}>
                    <Money value={shift.difference ?? '0'}/>
                  </span>
                </div>
                <p className="record-card-meta">
                  Mở {new Date(shift.openedAt).toLocaleString('vi-VN')} · {shift.closedBy?.name ?? 'chưa chốt'}
                </p>
                <p className="record-card-meta">
                  Doanh thu TM <b><Money value={shift.cashRevenue ?? '0'}/></b> · Chi <b><Money value={shift.cashExpenses ?? '0'}/></b> · Thực tế <b><Money value={shift.actualCash ?? '0'}/></b>
                </p>
              </article>
            ))}
          </div>
          <Pager page={page} total={history.data?.total} onChange={setPage} />
        </>
      )}
    </div>
  </>;
}
