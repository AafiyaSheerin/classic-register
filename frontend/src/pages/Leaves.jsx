import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi, employeeApi } from '../api/client';
import { DataTable } from '../components/DataTable';
import {
  C, Card, Btn, Badge, Input, Select, Textarea, Modal,
  Spinner, PageHeader, StatCard, ConfirmModal, fmtDate, TODAY,
} from '../components/ui';

const LEAVE_TYPES = [
  { value: 'sick',      label: '🤒 Sick Leave'     },
  { value: 'casual',    label: '🏖 Casual Leave'    },
  { value: 'emergency', label: '🆘 Emergency Leave' },
  { value: 'unpaid',    label: '💸 Unpaid Leave'    },
];

const EMPTY_FORM = {
  employee_id: '', type: 'sick',
  from_date: TODAY, to_date: TODAY, reason: '',
};

export function Leaves({ toast }) {
  const qc = useQueryClient();
  const [showApply,  setShowApply]  = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [rejectId,   setRejectId]   = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const leavesQ = useQuery({
    queryKey: ['leaves', filterStatus],
    queryFn:  () => leaveApi.list(filterStatus ? { status: filterStatus } : {}),
    staleTime: 20_000,
  });

  const empsQ = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeApi.list({ status: 'active' }),
    staleTime: 60_000,
  });

  const employees = empsQ.data?.data  || [];
  const leaves    = leavesQ.data?.data || [];

  const applyMut = useMutation({
    mutationFn: body => leaveApi.apply(body),
    onSuccess: r => {
      qc.invalidateQueries(['leaves']);
      qc.invalidateQueries(['dashboard']);
      setShowApply(false);
      setForm(EMPTY_FORM);
      toast(r.message || 'Leave applied.', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  const approveMut = useMutation({
    mutationFn: id => leaveApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries(['leaves']);
      qc.invalidateQueries(['attendance-today']);
      qc.invalidateQueries(['dashboard']);
      toast('Leave approved and attendance updated.', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note }) => leaveApi.reject(id, note),
    onSuccess: () => {
      qc.invalidateQueries(['leaves']);
      qc.invalidateQueries(['dashboard']);
      setRejectId(null);
      toast('Leave rejected.', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  function handleApply() {
    if (!form.employee_id) return toast('Select an employee.', 'error');
    if (!form.reason.trim()) return toast('Reason is required.', 'error');
    applyMut.mutate({ ...form, employee_id: parseInt(form.employee_id) });
  }

  const columns = useMemo(() => [
    {
      accessorKey: 'employee_name', header: 'Employee',
      cell: ({ getValue, row: { original: r } }) => (
        <div>
          <div style={{ fontWeight: 600 }}>{getValue()}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{r.emp_code}</div>
        </div>
      ),
    },
    {
      accessorKey: 'type', header: 'Type',
      cell: ({ getValue }) => <Badge status={getValue()} />,
    },
    {
      accessorKey: 'from_date', header: 'From',
      cell: ({ getValue }) => fmtDate(getValue()),
    },
    {
      accessorKey: 'to_date', header: 'To',
      cell: ({ getValue }) => fmtDate(getValue()),
    },
    {
      accessorKey: 'total_days', header: 'Days',
      cell: ({ getValue }) => (
        <strong>{getValue()} day{getValue() !== 1 ? 's' : ''}</strong>
      ),
    },
    {
      accessorKey: 'reason', header: 'Reason',
      cell: ({ getValue }) => (
        <span style={{
          fontSize: 13, color: C.muted,
          maxWidth: 180, display: 'block',
          overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => <Badge status={getValue()} />,
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row: { original: r } }) => {
        if (r.status !== 'pending')
          return <span style={{ fontSize: 12, color: C.muted }}>—</span>;
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="sm" variant="success"
              onClick={() => approveMut.mutate(r.id)}
              disabled={approveMut.isPending}>
              Approve
            </Btn>
            <Btn size="sm" variant="danger"
              onClick={() => { setRejectId(r.id); setRejectNote(''); }}>
              Reject
            </Btn>
          </div>
        );
      },
    },
  ], [approveMut.isPending]);

  const pending  = leaves.filter(l => l.status === 'pending').length;
  const approved = leaves.filter(l => l.status === 'approved').length;
  const rejected = leaves.filter(l => l.status === 'rejected').length;

  const statusFilter = (
    <select
      value={filterStatus}
      onChange={e => setFilterStatus(e.target.value)}
      style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 }}
    >
      <option value="">All statuses</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Leave Management"
        sub={`${pending} pending approval`}
        action={<Btn onClick={() => setShowApply(true)}>+ Apply Leave</Btn>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <StatCard label="Pending"  value={pending}       color={C.warning} icon="⏳" />
        <StatCard label="Approved" value={approved}      color={C.success} icon="✅" />
        <StatCard label="Rejected" value={rejected}      color={C.danger}  icon="❌" />
        <StatCard label="Total"    value={leaves.length} color={C.primary} icon="📋" />
      </div>

      <Card>
        {leavesQ.isLoading ? <Spinner /> : (
          <DataTable
            data={leaves}
            columns={columns}
            filterPlaceholder="Search employee, type…"
            extraFilters={statusFilter}
          />
        )}
      </Card>

      <Modal open={showApply} onClose={() => setShowApply(false)} title="Apply Leave">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select
            label="Employee" required
            value={form.employee_id} onChange={set('employee_id')}
            options={[
              { value: '', label: '— Select employee —' },
              ...employees.map(e => ({
                value: String(e.id),
                label: `${e.name} (${e.employee_id})`,
              })),
            ]}
          />
          <Select
            label="Leave Type"
            value={form.type} onChange={set('type')}
            options={LEAVE_TYPES}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="From Date" type="date" value={form.from_date} onChange={set('from_date')} />
            <Input label="To Date"   type="date" value={form.to_date}   onChange={set('to_date')}   />
          </div>
          {form.from_date && form.to_date && (
            <div style={{
              fontSize: 13, color: C.muted,
              background: C.bg, padding: '8px 12px', borderRadius: 8,
            }}>
              Duration: <strong>
                {Math.max(0, Math.round(
                  (new Date(form.to_date) - new Date(form.from_date)) / 86400000
                ) + 1)} day(s)
              </strong>
            </div>
          )}
          <Textarea
            label="Reason" required
            value={form.reason} onChange={set('reason')}
            placeholder="Reason for leave…"
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowApply(false)}>Cancel</Btn>
          <Btn onClick={handleApply} disabled={applyMut.isPending}>
            {applyMut.isPending ? 'Applying…' : 'Apply Leave'}
          </Btn>
        </div>
      </Modal>

      <Modal
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        title="Reject Leave" width={420}
      >
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 14 }}>
          Provide a reason for rejection (optional):
        </p>
        <Textarea
          value={rejectNote} onChange={setRejectNote}
          placeholder="e.g. Insufficient leave balance…" rows={3}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setRejectId(null)}>Cancel</Btn>
          <Btn variant="danger"
            onClick={() => rejectMut.mutate({ id: rejectId, note: rejectNote })}
            disabled={rejectMut.isPending}>
            {rejectMut.isPending ? 'Rejecting…' : 'Reject Leave'}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}