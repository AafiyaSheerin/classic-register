import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { overtimeApi, employeeApi } from '../api/client';
import { DataTable } from '../components/DataTable';
import {
  C, Card, Btn, Badge, Input, Select, Modal, Spinner,
  PageHeader, StatCard, fmtDate, fmtMoney, MONTHS, TODAY, CUR_MONTH, CUR_YEAR,
} from '../components/ui';

const RATE_OPTS = [
  { value: '1.5',  label: '1.5× (Standard OT)' },
  { value: '2',    label: '2.0× (Double time)'  },
  { value: '1.25', label: '1.25× (Light OT)'    },
  { value: '1',    label: '1.0× (Normal rate)'  },
];

const EMPTY_FORM = {
  employee_id: '', date: TODAY,
  hours: '', rate_multiplier: '1.5',
  pieces_completed: '0', notes: '',
};

export function Overtime({ toast }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [month,     setMonth]     = useState(CUR_MONTH);
  const [year,      setYear]      = useState(CUR_YEAR);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const summaryQ = useQuery({
    queryKey: ['ot-summary', month, year],
    queryFn:  () => overtimeApi.summary(month, year),
    staleTime: 20_000,
  });

  const listQ = useQuery({
    queryKey: ['ot-list', month, year],
    queryFn:  () => overtimeApi.list({ month, year }),
    staleTime: 20_000,
  });

  const empsQ = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeApi.list({ status: 'active' }),
    staleTime: 60_000,
  });

  const employees = empsQ.data?.data   || [];
  const summary   = summaryQ.data?.data || [];
  const records   = listQ.data?.data    || [];

  const saveMut = useMutation({
    mutationFn: body => overtimeApi.save(body),
    onSuccess: r => {
      qc.invalidateQueries(['ot-summary']);
      qc.invalidateQueries(['ot-list']);
      setShowModal(false);
      setForm(EMPTY_FORM);
      toast(r.message || 'Overtime saved.', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  const delMut = useMutation({
    mutationFn: id => overtimeApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['ot-summary']);
      qc.invalidateQueries(['ot-list']);
      toast('Record deleted.', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  function handleSave() {
    if (!form.employee_id) return toast('Select an employee.', 'error');
    if (!form.hours && !parseInt(form.pieces_completed))
      return toast('Enter hours or pieces completed.', 'error');
    saveMut.mutate({
      employee_id:      parseInt(form.employee_id),
      date:             form.date,
      hours:            parseFloat(form.hours) || 0,
      rate_multiplier:  parseFloat(form.rate_multiplier) || 1.5,
      pieces_completed: parseInt(form.pieces_completed) || 0,
      notes:            form.notes || undefined,
    });
  }

  function otPay(emp) {
    const bp   = parseFloat(emp.base_pay);
    const rate = parseFloat(emp.avg_rate_multiplier) || 1.5;
    if (emp.salary_type === 'piece')  return emp.total_ot_pieces * bp * rate;
    if (emp.salary_type === 'hourly') return emp.total_ot_hours  * bp * rate;
    if (emp.salary_type === 'daily')  return emp.total_ot_hours  * (bp / 8) * rate;
    return emp.total_ot_hours * (bp / (26 * 8)) * rate;
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
      accessorKey: 'hours', header: 'OT Hours',
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600, color: getValue() > 0 ? C.primary : C.muted }}>
          {getValue() > 0 ? `${getValue()}h` : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'rate_multiplier', header: 'Rate',
      cell: ({ getValue }) => `${getValue()}×`,
    },
    {
      accessorKey: 'pieces_completed', header: 'Pieces',
      cell: ({ getValue }) => getValue() > 0 ? getValue() : '—',
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
        <Btn size="sm" variant="ghost"
          onClick={() => { if (confirm('Delete this record?')) delMut.mutate(r.id); }}>
          Delete
        </Btn>
      ),
    },
  ], []);

  const totalOtHours = summary.reduce((s, e) => s + parseFloat(e.total_ot_hours || 0), 0);
  const totalOtPay   = summary.reduce((s, e) => s + otPay(e), 0);

  const selEmp = employees.find(e => String(e.id) === form.employee_id);

  function previewPay() {
    if (!selEmp) return null;
    const bp   = parseFloat(selEmp.base_pay);
    const rate = parseFloat(form.rate_multiplier) || 1.5;
    const hrs  = parseFloat(form.hours) || 0;
    const pcs  = parseInt(form.pieces_completed) || 0;
    let est = 0;
    if (selEmp.salary_type === 'piece')  est = pcs * bp * rate;
    else if (selEmp.salary_type === 'hourly') est = hrs * bp * rate;
    else if (selEmp.salary_type === 'daily')  est = hrs * (bp / 8) * rate;
    else est = hrs * (bp / (26 * 8)) * rate;
    return est;
  }

  const estPay = previewPay();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Overtime Tracking"
        sub="Extra hours and piece-rate overtime"
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
            <Btn onClick={() => setShowModal(true)}>+ Add Overtime</Btn>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard label="Total OT Hours"   value={`${totalOtHours.toFixed(1)}h`}  color={C.primary} icon="⏰" />
        <StatCard label="Est. OT Pay"      value={fmtMoney(totalOtPay)}            color={C.success} icon="💰" />
        <StatCard label="Employees with OT" value={summary.filter(e => e.total_ot_hours > 0 || e.total_ot_pieces > 0).length} color={C.warning} icon="👥" />
        <StatCard label="OT Records"       value={records.length}                  color={C.purple}  icon="📝" />
      </div>

      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: C.text }}>
          Monthly Summary — {MONTHS[month - 1]} {year}
        </h3>
        {summaryQ.isLoading ? <Spinner /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Employee', 'Pay Type', 'OT Hours', 'OT Pieces', 'Rate', 'Est. OT Pay'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontWeight: 600, fontSize: 11.5, color: C.muted,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.map((emp, i) => {
                  const pay   = otPay(emp);
                  const hasOt = emp.total_ot_hours > 0 || emp.total_ot_pieces > 0;
                  return (
                    <tr key={emp.id} style={{ background: i % 2 === 0 ? C.surface : C.bg }}>
                      <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ fontWeight: 600 }}>{emp.name}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{emp.emp_code}</div>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                        <Badge status={emp.salary_type} />
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: hasOt ? C.primary : C.muted }}>
                        {emp.total_ot_hours > 0 ? `${emp.total_ot_hours}h` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                        {emp.total_ot_pieces > 0 ? emp.total_ot_pieces : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                        {hasOt ? `${parseFloat(emp.avg_rate_multiplier || 1.5).toFixed(1)}×` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: hasOt ? C.success : C.muted }}>
                        {hasOt ? fmtMoney(pay) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {summary.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: C.muted }}>
                      No data for this month
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: C.text }}>
          Overtime Records
        </h3>
        {listQ.isLoading ? <Spinner /> : (
          <DataTable data={records} columns={listCols} filterPlaceholder="Search records…" />
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Overtime Entry">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select
            label="Employee" required
            value={form.employee_id} onChange={set('employee_id')}
            options={[
              { value: '', label: '— Select employee —' },
              ...employees.map(e => ({
                value: String(e.id),
                label: `${e.name} (${e.employee_id}) · ${e.salary_type}`,
              })),
            ]}
          />
          <Input label="Date" type="date" value={form.date} onChange={set('date')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Overtime Hours"
              type="number" min="0" max="16" step="0.5"
              value={form.hours} onChange={set('hours')}
              placeholder="e.g. 2.5"
            />
            <Select
              label="Rate Multiplier"
              value={form.rate_multiplier} onChange={set('rate_multiplier')}
              options={RATE_OPTS}
            />
          </div>
          {selEmp?.salary_type === 'piece' && (
            <Input
              label="Pieces Completed (OT)"
              type="number" min="0"
              value={form.pieces_completed} onChange={set('pieces_completed')}
              placeholder="Number of pieces"
            />
          )}
          <Input
            label="Notes (optional)"
            value={form.notes} onChange={set('notes')}
            placeholder="e.g. Rush order completion"
          />
          {estPay !== null && estPay > 0 && (
            <div style={{
              background: C.successLight,
              border: '1px solid #9dd4b4',
              borderRadius: 8, padding: '10px 14px', fontSize: 14,
            }}>
              Estimated OT Pay: <strong style={{ color: C.success }}>{fmtMoney(estPay)}</strong>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save Overtime'}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}