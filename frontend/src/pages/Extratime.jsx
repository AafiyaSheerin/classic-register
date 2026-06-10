import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/client';
import { api } from '../api/client';
import { DataTable } from '../components/DataTable';
import {
  C, Card, Btn, Input, Select, Modal, Spinner,
  PageHeader, StatCard, fmtDate, fmtMoney, MONTHS, TODAY, CUR_MONTH, CUR_YEAR,
} from '../components/ui';

const EMPTY_FORM = {
  employee_id: '', date: TODAY,
  hours: '', amount: '', notes: '',
};

export function ExtraTime({ toast }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [editForm,  setEditForm]  = useState(null);
  const [month,     setMonth]     = useState(CUR_MONTH);
  const [year,      setYear]      = useState(CUR_YEAR);
  const set     = k => v => setForm(f => ({ ...f, [k]: v }));
  const setEdit = k => v => setEditForm(f => ({ ...f, [k]: v }));

  const listQ = useQuery({
    queryKey: ['extratime-list', month, year],
    queryFn:  () => api.get(`/extratime?month=${month}&year=${year}`).then(r => r.data),
    staleTime: 0,
  });

  const empsQ = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeApi.list({ status: 'active' }),
    staleTime: 60_000,
  });

  const employees = empsQ.data?.data || [];
  const records   = listQ.data       || [];

  const addMut = useMutation({
    mutationFn: body => api.post('/extratime', body),
    onSuccess: r => {
      // ✅ FIXED: use object syntax so React Query v5 does partial key invalidation
      qc.invalidateQueries({ queryKey: ['extratime-list'], refetchType: 'all' });
      setShowModal(false);
      setForm(EMPTY_FORM);
      toast(r.data?.message || 'Extra time added.', 'success');
    },
    onError: err => toast(err.response?.data?.message || err.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/extratime/${id}`, body),
    onSuccess: () => {
      // ✅ FIXED: use object syntax so React Query v5 does partial key invalidation
      qc.invalidateQueries({ queryKey: ['extratime-list'], refetchType: 'all' });
      setEditModal(false);
      setEditForm(null);
      toast('Extra time updated.', 'success');
    },
    onError: err => toast(err.response?.data?.message || err.message, 'error'),
  });

  const delMut = useMutation({
    mutationFn: id => api.delete(`/extratime/${id}`),
    onSuccess: () => {
      // ✅ FIXED: use object syntax so React Query v5 does partial key invalidation
      qc.invalidateQueries({ queryKey: ['extratime-list'], refetchType: 'all' });
      toast('Record deleted.', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  function handleAdd() {
    if (!form.employee_id) return toast('Select an employee.', 'error');
    if (!form.amount)      return toast('Enter the pay amount.', 'error');
    addMut.mutate({
      employee_id: parseInt(form.employee_id),
      date:        form.date,
      hours:       parseFloat(form.hours) || 0,
      amount:      parseFloat(form.amount),
      notes:       form.notes || undefined,
    });
  }

  function handleUpdate() {
    if (!editForm.amount) return toast('Enter the pay amount.', 'error');
    updateMut.mutate({
      id:     editForm.id,
      date:   editForm.date,
      hours:  parseFloat(editForm.hours) || 0,
      amount: parseFloat(editForm.amount),
      notes:  editForm.notes || undefined,
    });
  }

  function openEdit(r) {
    setEditForm({
      id:     r.id,
      date:   r.date?.slice(0, 10) || TODAY,
      hours:  r.hours || '',
      amount: r.amount || '',
      notes:  r.notes || '',
    });
    setEditModal(true);
  }

  const listCols = useMemo(() => [
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
      accessorKey: 'date', header: 'Date',
      cell: ({ getValue }) => fmtDate(getValue()),
    },
    {
      accessorKey: 'hours', header: 'Hours',
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600, color: getValue() > 0 ? C.primary : C.muted }}>
          {getValue() > 0 ? `${getValue()}h` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'amount', header: 'Amount',
      cell: ({ getValue }) => (
        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
          {fmtMoney(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'notes', header: 'Notes',
      cell: ({ getValue }) => (
        <span style={{ color: C.muted, fontSize: 13 }}>{getValue() || '—'}</span>
      ),
    },
    {
      id: 'actions', header: '',
      cell: ({ row: { original: r } }) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Btn>
          <Btn size="sm" variant="ghost"
            onClick={() => { if (confirm('Delete this record?')) delMut.mutate(r.id); }}>
            Delete
          </Btn>
        </div>
      ),
    },
  ], []);

  const totalHours  = records.reduce((s, r) => s + parseFloat(r.hours  || 0), 0);
  const totalAmount = records.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const uniqueEmps  = new Set(records.map(r => r.employee_id)).size;

  const FormFields = ({ values, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input label="Date" type="date" value={values.date} onChange={onChange('date')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input
          label="Hours Worked"
          type="number" min="0" max="24" step="0.5"
          value={values.hours} onChange={onChange('hours')}
          placeholder="e.g. 2"
        />
        <Input
          label="Pay Amount (₹)" required
          type="number" min="0"
          value={values.amount} onChange={onChange('amount')}
          placeholder="e.g. 300"
        />
      </div>
      <Input
        label="Notes (optional)"
        value={values.notes} onChange={onChange('notes')}
        placeholder="e.g. Special order, weekend work"
      />
      {parseFloat(values.amount) > 0 && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #9dd4b4',
          borderRadius: 8, padding: '10px 14px', fontSize: 14,
        }}>
          Extra Time Pay: <strong style={{ color: C.success }}>{fmtMoney(parseFloat(values.amount))}</strong>
          {parseFloat(values.hours) > 0 && (
            <span style={{ color: C.muted, marginLeft: 8 }}>for {values.hours}h</span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Extra Time"
        sub="Track extra hours with admin-set pay amounts"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={month} onChange={e => setMonth(+e.target.value)}
              style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 }}
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <input
              type="number" value={year} onChange={e => setYear(+e.target.value)}
              style={{ padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: 80 }}
            />
            <Btn onClick={() => setShowModal(true)}>+ Add Extra Time</Btn>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard label="Total Hours"          value={`${totalHours.toFixed(1)}h`} color={C.primary} icon="⏱️" />
        <StatCard label="Total Pay"            value={fmtMoney(totalAmount)}        color={C.success} icon="💰" />
        <StatCard label="Employees"            value={uniqueEmps}                   color={C.warning} icon="👥" />
        <StatCard label="Extra Time Records"   value={records.length}               color={C.purple}  icon="📝" />
      </div>

      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: C.text }}>
          Extra Time Records — {MONTHS[month - 1]} {year}
        </h3>
        {listQ.isLoading ? <Spinner /> : (
          <DataTable data={records} columns={listCols} filterPlaceholder="Search records…" />
        )}
      </Card>

      {/* Add Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setForm(EMPTY_FORM); }} title="Add Extra Time Entry">
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
          <FormFields values={form} onChange={set} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}>Cancel</Btn>
          <Btn onClick={handleAdd} disabled={addMut.isPending}>
            {addMut.isPending ? 'Saving…' : 'Save Extra Time'}
          </Btn>
        </div>
      </Modal>

      {/* Edit Modal */}
      {editForm && (
        <Modal open={editModal} onClose={() => { setEditModal(false); setEditForm(null); }} title="Edit Extra Time Entry">
          <FormFields values={editForm} onChange={setEdit} />
          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setEditModal(false); setEditForm(null); }}>Cancel</Btn>
            <Btn onClick={handleUpdate} disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Saving…' : 'Update'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ExtraTime;