import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../api/client';
import { DataTable } from '../components/DataTable';
import {
  C, Card, Badge, Btn, StatCard, Spinner,
  PageHeader, fmtDate, MONTHS, TODAY, CUR_MONTH, CUR_YEAR,
} from '../components/ui';

const STATUSES  = ['present', 'half_day', 'absent', 'on_leave'];
const STA_LABEL = { present: 'Present', half_day: 'Half Day', absent: 'Absent', on_leave: 'On Leave' };
const STA_COLOR = { present: C.success, half_day: C.warning, absent: C.danger, on_leave: C.primary };

export function Attendance({ toast }) {
  const qc = useQueryClient();
  const [view,    setView]    = useState('daily');
  const [selDate, setSelDate] = useState(TODAY);
  const [month,   setMonth]   = useState(CUR_MONTH);
  const [year,    setYear]    = useState(CUR_YEAR);
  const [localMap, setLocalMap] = useState({});

  const todayQ = useQuery({
    queryKey: ['attendance-today', selDate],
    queryFn:  () => attendanceApi.today(selDate),
    staleTime: 15_000,
  });

  const histQ = useQuery({
    queryKey: ['attendance-history', month, year],
    queryFn:  () => attendanceApi.list({ month, year }),
    enabled:  view === 'history',
    staleTime: 30_000,
  });

  const markMut = useMutation({
    mutationFn: body => attendanceApi.mark(body),
    onMutate: ({ employee_id, status }) =>
      setLocalMap(m => ({ ...m, [employee_id]: status })),
    onSuccess: () => {
      qc.invalidateQueries(['attendance-today']);
      qc.invalidateQueries(['dashboard']);
    },
    onError: err => toast(err.message, 'error'),
  });

  const bulkMut = useMutation({
    mutationFn: body => attendanceApi.bulkMark(body),
    onSuccess: r => {
      qc.invalidateQueries(['attendance-today']);
      qc.invalidateQueries(['dashboard']);
      toast(r.message || 'Attendance saved.', 'success');
      setLocalMap({});
    },
    onError: err => toast(err.message, 'error'),
  });

  const records = todayQ.data?.data    || [];
  const summary = todayQ.data?.summary || {};

  function markOne(empId, status) {
    setLocalMap(m => ({ ...m, [empId]: status }));
    markMut.mutate({ employee_id: empId, date: selDate, status });
  }

  function saveAll() {
    const toSave = records.map(r => ({
      employee_id: r.id,
      status: localMap[r.id] || r.status || 'absent',
    }));
    bulkMut.mutate({ date: selDate, records: toSave });
  }

  const histCols = useMemo(() => [
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
      accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => (
        <Badge status={getValue()} label={STA_LABEL[getValue()]} />
      ),
    },
    {
      accessorKey: 'hours_worked', header: 'Hours',
      cell: ({ getValue }) => getValue() ? `${getValue()}h` : '—',
    },
    { accessorKey: 'role', header: 'Role' },
  ], []);

  const extraHistFilters = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Attendance"
        sub="Mark and track daily attendance"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date" value={selDate}
              onChange={e => setSelDate(e.target.value)}
              style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 }}
            />
            <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
              {['daily', 'history'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  border: 'none',
                  background: view === v ? C.primary : C.surface,
                  color:      view === v ? '#fff'    : C.muted,
                  cursor: 'pointer',
                }}>
                  {v === 'daily' ? '📅 Daily Mark' : '📜 History'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {view === 'daily' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <StatCard label="Present"    value={summary.present    || 0} color={C.success} icon="✅" />
            <StatCard label="Absent"     value={summary.absent     || 0} color={C.danger}  icon="❌" />
            <StatCard label="Half Day"   value={summary.half_day   || 0} color={C.warning} icon="🌤" />
            <StatCard label="On Leave"   value={summary.on_leave   || 0} color={C.primary} icon="🏖" />
            <StatCard label="Not Marked" value={summary.not_marked || 0} color={C.muted}   icon="⏳" />
          </div>

          <Card>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 16,
            }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>
                {selDate === TODAY ? "Today's Attendance" : `Attendance for ${fmtDate(selDate)}`}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn size="sm" variant="ghost" onClick={() => {
                  setLocalMap({});
                  records.forEach(r =>
                    markMut.mutate({ employee_id: r.id, date: selDate, status: 'present' })
                  );
                }}>
                  ✅ Mark All Present
                </Btn>
                <Btn size="sm" onClick={saveAll} disabled={bulkMut.isPending}>
                  {bulkMut.isPending ? 'Saving…' : '💾 Save All'}
                </Btn>
              </div>
            </div>

            {todayQ.isLoading ? <Spinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {records.map((emp, i) => {
                  const curSta = localMap[emp.id] || emp.status;
                  return (
                    <div key={emp.id} style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: i < records.length - 1
                        ? `1px solid ${C.border}` : 'none',
                      flexWrap: 'wrap', gap: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: C.primaryLight,
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700, color: C.primary, flexShrink: 0,
                        }}>
                          {emp.name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{emp.name}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>{emp.emp_code} · {emp.role}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {STATUSES.map(sta => {
                          const active = curSta === sta;
                          return (
                            <button
                              key={sta}
                              onClick={() => markOne(emp.id, sta)}
                              style={{
                                padding: '6px 13px', fontSize: 12,
                                fontWeight: 500, borderRadius: 20,
                                cursor: 'pointer',
                                border: active ? 'none' : `1px solid ${C.border}`,
                                background: active ? STA_COLOR[sta] : C.surface,
                                color:      active ? '#fff'         : C.muted,
                                transition: 'all 0.15s',
                              }}
                            >
                              {STA_LABEL[sta]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {records.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
                    No active employees found
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card>
          {histQ.isLoading ? <Spinner /> : (
            <DataTable
              data={histQ.data?.data || []}
              columns={histCols}
              filterPlaceholder="Search employee, status…"
              extraFilters={extraHistFilters}
            />
          )}
        </Card>
      )}
    </div>
  );
}