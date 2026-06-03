import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/client';
import { DataTable } from '../components/DataTable';
import {
  C, Card, Btn, Badge, Input, Select, Modal, Spinner,
  PageHeader, ConfirmModal, fmtDate, fmtMoney,
} from '../components/ui';

const SALARY_OPTS = [
  { value: 'monthly', label: 'Monthly Salary' },
  { value: 'daily',   label: 'Daily Wage'     },
  { value: 'hourly',  label: 'Hourly Rate'    },
  { value: 'piece',   label: 'Per Piece'      },
];
const DEPT_OPTS = ['Embroidery','Quality','Production','Admin','Design','Finishing']
  .map(d => ({ value: d, label: d }));
const STATUS_OPTS = [
  { value: 'active',   label: 'Active'   },
  { value: 'inactive', label: 'Inactive' },
];
const PAY_LABEL = { monthly: '/month', daily: '/day', hourly: '/hr', piece: '/piece' };
const EMPTY_FORM = {
  employee_id: '', name: '', role: '', department: 'Embroidery',
  phone: '', email: '', address: '',
  salary_type: 'monthly', base_pay: '', join_date: '', status: 'active',
  login_enabled: false,
};

export function Employees({ toast }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeApi.list(),
    staleTime: 30_000,
  });
  const employees = data?.data || [];

  const saveMut = useMutation({
    mutationFn: body => editing
      ? employeeApi.update(editing.id, body)
      : employeeApi.create(body),
    onSuccess: r => {
      qc.invalidateQueries(['employees']);
      setShowModal(false);
      toast(r.message || 'Employee saved.', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  const delMut = useMutation({
    mutationFn: id => employeeApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['employees']);
      toast('Employee deactivated.', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  function openNew() {
    const nextId = `EMP${String(employees.length + 1).padStart(3, '0')}`;
    setEditing(null);
    setForm({ ...EMPTY_FORM, employee_id: nextId, join_date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  }

  function openEdit(emp) {
    setEditing(emp);
    setForm({
      employee_id: emp.employee_id, name: emp.name,
      role: emp.role, department: emp.department || 'Embroidery',
      phone: emp.phone || '', email: emp.email || '',
      address: emp.address || '',
      salary_type: emp.salary_type,
      base_pay: String(emp.base_pay),
      join_date: emp.join_date?.split('T')[0] || '',
      status: emp.status,
      login_enabled: !!emp.login_enabled,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name || !form.employee_id || !form.role || !form.base_pay || !form.join_date)
      return toast('Please fill all required fields.', 'error');
    saveMut.mutate({ ...form, base_pay: parseFloat(form.base_pay) });
  }

  const columns = useMemo(() => [
    {
      accessorKey: 'employee_id', header: 'ID',
      cell: ({ getValue }) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.primary, fontSize: 13 }}>
          {getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'name', header: 'Name',
      cell: ({ getValue, row: { original: r } }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: C.primaryLight, flexShrink: 0,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: C.primary,
          }}>
            {getValue().charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{getValue()}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{r.role}</div>
          </div>
        </div>
      ),
    },
    { accessorKey: 'department', header: 'Department' },
    {
      accessorKey: 'salary_type', header: 'Pay Type',
      cell: ({ getValue }) => <Badge status={getValue()} />,
    },
    {
      accessorKey: 'base_pay', header: 'Base Pay',
      cell: ({ getValue, row: { original: r } }) => (
        <span>
          <strong>{fmtMoney(getValue())}</strong>
          <span style={{ color: C.muted, fontSize: 12 }}>{PAY_LABEL[r.salary_type]}</span>
        </span>
      ),
    },
    {
      accessorKey: 'join_date', header: 'Joined',
      cell: ({ getValue }) => fmtDate(getValue()),
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => <Badge status={getValue()} />,
    },
    {
      accessorKey: 'login_enabled', header: 'Login',
      cell: ({ getValue }) => (
        <Badge status={getValue() ? 'active' : 'inactive'} label={getValue() ? 'Enabled' : 'Disabled'} />
      ),
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row: { original: r } }) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Btn>
          <Btn size="sm" variant="ghost"   onClick={() => setDelTarget(r)}>Remove</Btn>
        </div>
      ),
    },
  ], [employees.length]);

  const active = employees.filter(e => e.status === 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Employees"
        sub={`${active} active employees`}
        action={<Btn onClick={openNew}>+ Add Employee</Btn>}
      />

      <Card>
        {isLoading
          ? <Spinner />
          : <DataTable data={employees} columns={columns} filterPlaceholder="Search name, ID, role…" />
        }
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        width={580}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label="Employee ID" value={form.employee_id} onChange={set('employee_id')} required placeholder="EMP001" />
          <Input label="Full Name"   value={form.name}        onChange={set('name')}        required placeholder="Enter name" />
          <Input label="Role"        value={form.role}        onChange={set('role')}        required placeholder="Lead Embroiderer" />
          <Select label="Department" value={form.department}  onChange={set('department')}  options={DEPT_OPTS} />
          <Input label="Phone"       value={form.phone}       onChange={set('phone')}       placeholder="9876543210" />
          <Input label="Email"       value={form.email}       onChange={set('email')}       type="email" placeholder="name@example.com" />
          <Select label="Pay Type"   value={form.salary_type} onChange={set('salary_type')} options={SALARY_OPTS} />
          <Input
            label={`Base Pay (₹ per ${
              form.salary_type === 'piece'  ? 'piece'  :
              form.salary_type === 'hourly' ? 'hour'   :
              form.salary_type === 'daily'  ? 'day'    : 'month'
            })`}
            value={form.base_pay}
            onChange={set('base_pay')}
            type="number" min="0" step="0.01"
            required placeholder="e.g. 18000"
          />
          <Input label="Join Date" value={form.join_date} onChange={set('join_date')} type="date" required />
          {editing && (
            <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTS} />
          )}
        </div>

        {/* Login Enable Toggle — shown for both new and edit */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginTop: 16, padding: '12px 14px',
          background: C.primaryLight, borderRadius: 8,
        }}>
          <div
            onClick={() => setForm(f => ({ ...f, login_enabled: !f.login_enabled }))}
            style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
              background: form.login_enabled ? C.primary : '#ccc',
              position: 'relative', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: form.login_enabled ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Enable Employee Login</div>
            <div style={{ fontSize: 12, color: C.muted }}>
              {form.login_enabled
                ? 'Employee can log in using their ID and phone number'
                : 'Employee cannot log in to the portal'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save Employee'}
          </Btn>
        </div>
      </Modal>

      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={() => delMut.mutate(delTarget.id)}
        title="Deactivate Employee"
        msg={`Deactivate ${delTarget?.name}? They will no longer appear in attendance or payroll.`}
        confirmLabel="Deactivate"
      />
    </div>
  );
}