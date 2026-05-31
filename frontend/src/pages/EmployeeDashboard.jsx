import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, leaveApi, salaryApi } from '../api/client';
import { useAuth } from '../utils/AuthContext';
import {
  C, Card, Btn, Badge, StatCard, Modal,
  Input, Select, Textarea, Spinner,
  fmtDate, fmtMoney, MONTHS_LG, MONTHS,
  CUR_MONTH, CUR_YEAR, TODAY,
} from '../components/ui';

const LEAVE_TYPES = [
  { value: 'sick',      label: '🤒 Sick Leave'     },
  { value: 'casual',    label: '🏖 Casual Leave'    },
  { value: 'emergency', label: '🆘 Emergency Leave' },
  { value: 'unpaid',    label: '💸 Unpaid Leave'    },
];

const STA_LABEL = {
  present:  'Present',
  absent:   'Absent',
  half_day: 'Half Day',
  on_leave: 'On Leave',
};

const EMPTY_FORM = {
  type: 'sick',
  from_date: TODAY,
  to_date: TODAY,
  reason: '',
};

export function EmployeeDashboard({ toast }) {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [tab,       setTab]       = useState('attendance');
  const [showLeave, setShowLeave] = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [month,     setMonth]     = useState(CUR_MONTH);
  const [year,      setYear]      = useState(CUR_YEAR);
  const [passForm,  setPassForm]  = useState({ current: '', newPass: '', confirm: '' });

  const set  = k => v => setForm(f => ({ ...f, [k]: v }));
  const setP = k => v => setPassForm(f => ({ ...f, [k]: v }));

  const attQ = useQuery({
    queryKey: ['emp-attendance', user.id, month, year],
    queryFn:  () => attendanceApi.list({ employee_id: user.id, month, year }),
    staleTime: 20_000,
  });

  const leavesQ = useQuery({
    queryKey: ['emp-leaves', user.id],
    queryFn:  () => leaveApi.list({ employee_id: user.id }),
    staleTime: 20_000,
  });

  const balanceQ = useQuery({
    queryKey: ['emp-balance', user.id],
    queryFn:  () => leaveApi.balance(user.id),
    staleTime: 30_000,
  });

  const salaryQ = useQuery({
    queryKey: ['emp-salary', user.id, month, year],
    queryFn:  () => salaryApi.calculate(user.id, month, year),
    staleTime: 30_000,
  });

  const attendance = attQ.data?.data     || [];
  const leaves     = leavesQ.data?.data  || [];
  const balance    = balanceQ.data?.data || {};
  const salary     = salaryQ.data?.data?.salary || {};

  const presentCount  = attendance.filter(a => a.status === 'present').length;
  const absentCount   = attendance.filter(a => a.status === 'absent').length;
  const halfCount     = attendance.filter(a => a.status === 'half_day').length;
  const leaveCount    = attendance.filter(a => a.status === 'on_leave').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

  const applyMut = useMutation({
    mutationFn: body => leaveApi.apply(body),
    onSuccess: r => {
      qc.invalidateQueries(['emp-leaves']);
      qc.invalidateQueries(['emp-balance']);
      setShowLeave(false);
      setForm(EMPTY_FORM);
      toast(r.message || 'Leave applied!', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: id => leaveApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries(['emp-leaves']);
      toast('Leave cancelled.', 'success');
    },
    onError: err => toast(err.message, 'error'),
  });

  function handleApply() {
    if (!form.reason.trim()) return toast('Reason is required.', 'error');
    applyMut.mutate({ employee_id: user.id, ...form });
  }

  const MonthPicker = () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <select value={month} onChange={e => setMonth(+e.target.value)}
        style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <input type="number" value={year} onChange={e => setYear(+e.target.value)}
        style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, width: 75 }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div style={{
        background: C.primary, padding: '0 24px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🪡</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Classic Register</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>👷 {user.name}</span>
          <Btn size="sm" variant="ghost"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            onClick={() => setShowPass(true)}>
            🔑 Password
          </Btn>
          <Btn size="sm" variant="ghost"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            onClick={logout}>
            Sign out
          </Btn>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>

        {/* Welcome card */}
        <div style={{
          background: `linear-gradient(135deg, ${C.primary}, #2d5a8e)`,
          borderRadius: 14, padding: '20px 24px',
          marginBottom: 20, color: '#fff',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Welcome, {user.name}! 👋</div>
            <div style={{ opacity: 0.8, fontSize: 14, marginTop: 4 }}>
              {user.employee_id} · {user.role} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <Btn onClick={() => setShowLeave(true)}
            style={{ background: '#fff', color: C.primary, fontWeight: 700 }}>
            + Apply Leave
          </Btn>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Present"        value={presentCount}  color={C.success} icon="✅" />
          <StatCard label="Absent"         value={absentCount}   color={C.danger}  icon="❌" />
          <StatCard label="Half Days"      value={halfCount}     color={C.warning} icon="🌤" />
          <StatCard label="On Leave"       value={leaveCount}    color={C.primary} icon="🏖" />
          <StatCard label="Pending Leaves" value={pendingLeaves} color={C.warning} icon="⏳" />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', border: `1px solid ${C.border}`,
          borderRadius: 10, overflow: 'hidden',
          marginBottom: 16, background: C.surface,
        }}>
          {[
            { id: 'attendance', label: '📅 Attendance' },
            { id: 'leaves',     label: '📋 My Leaves'  },
            { id: 'salary',     label: '💰 My Salary'  },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '12px', border: 'none', fontSize: 14, fontWeight: 500,
              background: tab === t.id ? C.primary : 'transparent',
              color:      tab === t.id ? '#fff'    : C.muted,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Attendance Tab */}
        {tab === 'attendance' && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                Attendance — {MONTHS_LG[month - 1]} {year}
              </h3>
              <MonthPicker />
            </div>
            {attQ.isLoading ? <Spinner /> : attendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                <p>No attendance records for this month</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {['Date', 'Day', 'Status', 'Hours'].map(h => (
                        <th key={h} style={{
                          padding: '10px 14px', textAlign: 'left',
                          fontWeight: 600, fontSize: 12, color: C.muted,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          borderBottom: `1px solid ${C.border}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a, i) => (
                      <tr key={a.id} style={{ background: i % 2 === 0 ? C.surface : C.bg }}>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                          {fmtDate(a.date)}
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, color: C.muted }}>
                          {new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                          <Badge status={a.status} label={STA_LABEL[a.status]} />
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                          {a.hours_worked ? `${a.hours_worked}h` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Leaves Tab */}
        {tab === 'leaves' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>
                Leave Balance (This Year)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {Object.entries(balance).map(([type, b]) => (
                  <div key={type} style={{
                    padding: '12px 16px', borderRadius: 10,
                    border: `1px solid ${C.border}`, background: C.bg,
                  }}>
                    <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                      {type}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{b.remaining}</span>
                      <span style={{ fontSize: 12, color: C.muted }}>of {b.allowed === 999 ? '∞' : b.allowed}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{b.used} used</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>My Leave Requests</h3>
                <Btn size="sm" onClick={() => setShowLeave(true)}>+ Apply Leave</Btn>
              </div>
              {leavesQ.isLoading ? <Spinner /> : leaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                  <p>No leave requests yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {leaves.map(l => (
                    <div key={l.id} style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 10,
                      border: `1px solid ${C.border}`,
                      background: C.bg, flexWrap: 'wrap', gap: 10,
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Badge status={l.type} />
                          <Badge status={l.status} />
                        </div>
                        <div style={{ fontSize: 13, color: C.muted }}>
                          {fmtDate(l.from_date)} → {fmtDate(l.to_date)} · {l.total_days} day(s)
                        </div>
                        <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{l.reason}</div>
                        {l.approval_note && (
                          <div style={{ fontSize: 12, color: C.danger, marginTop: 2 }}>
                            Note: {l.approval_note}
                          </div>
                        )}
                      </div>
                      {l.status === 'pending' && (
                        <Btn size="sm" variant="ghost"
                          onClick={() => { if (confirm('Cancel this leave?')) cancelMut.mutate(l.id); }}>
                          Cancel
                        </Btn>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Salary Tab */}
        {tab === 'salary' && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                My Salary — {MONTHS_LG[month - 1]} {year}
              </h3>
              <MonthPicker />
            </div>
            {salaryQ.isLoading ? <Spinner /> : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
                  <StatCard label="Base Pay"    value={fmtMoney(salary.base_pay       || 0)} color={C.primary} icon="💼" />
                  <StatCard label="Base Earned" value={fmtMoney(salary.base_earned    || 0)} color={C.success} icon="✅" />
                  <StatCard label="Overtime"    value={fmtMoney(salary.overtime_pay   || 0)} color={C.warning} icon="⏰" />
                  <StatCard label="Deductions"  value={fmtMoney(salary.leave_deduction|| 0)} color={C.danger}  icon="📉" />
                </div>
                <div style={{
                  background: C.primary, color: '#fff',
                  borderRadius: 12, padding: '20px 24px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 13, opacity: 0.8 }}>Net Salary</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{fmtMoney(salary.net_salary || 0)}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, opacity: 0.8 }}>
                    <div>Days Present: {salary.present_days || 0}</div>
                    <div>Working Days: {salary.working_days || 0}</div>
                    <div>OT Hours: {salary.total_ot_hours || 0}h</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal open={showLeave} onClose={() => setShowLeave(false)} title="Apply for Leave">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select label="Leave Type" value={form.type} onChange={set('type')} options={LEAVE_TYPES} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="From Date" type="date" value={form.from_date} onChange={set('from_date')} />
            <Input label="To Date"   type="date" value={form.to_date}   onChange={set('to_date')}   />
          </div>
          {form.from_date && form.to_date && (
            <div style={{ background: C.primaryLight, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.primary }}>
              Duration: <strong>
                {Math.max(0, Math.round((new Date(form.to_date) - new Date(form.from_date)) / 86400000) + 1)} day(s)
              </strong>
            </div>
          )}
          <Textarea label="Reason" required value={form.reason} onChange={set('reason')} placeholder="Reason for leave…" />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowLeave(false)}>Cancel</Btn>
          <Btn onClick={handleApply} disabled={applyMut.isPending}>
            {applyMut.isPending ? 'Applying…' : 'Apply Leave'}
          </Btn>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal open={showPass} onClose={() => setShowPass(false)} title="Change Password" width={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Current Password" type="password" value={passForm.current} onChange={setP('current')} placeholder="Your phone number or current password" />
          <Input label="New Password"     type="password" value={passForm.newPass} onChange={setP('newPass')} placeholder="New password" />
          <Input label="Confirm Password" type="password" value={passForm.confirm} onChange={setP('confirm')} placeholder="Confirm new password" />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowPass(false)}>Cancel</Btn>
          <Btn onClick={() => {
            if (passForm.newPass !== passForm.confirm) return toast('Passwords do not match!', 'error');
            if (passForm.newPass.length < 6) return toast('Password must be at least 6 characters.', 'error');
            toast('Password change coming soon!', 'info');
            setShowPass(false);
          }}>
            Change Password
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
