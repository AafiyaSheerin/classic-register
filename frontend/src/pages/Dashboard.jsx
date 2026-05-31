import { useQuery } from '@tanstack/react-query';
import { salaryApi } from '../api/client';
import { C, Card, StatCard, Spinner, Badge, fmtMoney, MONTHS_LG, CUR_MONTH, CUR_YEAR } from '../components/ui';

function AttBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ fontWeight: 600, color }}>
          {value} <span style={{ color: C.muted, fontWeight: 400 }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: 7, background: C.bg, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 4,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

export function Dashboard({ setPage }) {
  const { data, isLoading, error } = useQuery({
    queryKey:  ['dashboard'],
    queryFn:   salaryApi.dashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const stats  = data?.data || {};
  const att    = stats.today_attendance || {};
  const alerts = stats.absence_alerts   || [];
  const total  = stats.total_employees  || 0;

  if (isLoading) return <Spinner />;
  if (error) return (
    <div style={{ padding: 40, color: C.danger, textAlign: 'center' }}>
      Failed to load dashboard: {error.message}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Dashboard</h2>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 14 }}>
          Overview for {MONTHS_LG[CUR_MONTH - 1]} {CUR_YEAR}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        <StatCard label="Total Employees" value={total}                              icon="👥" color={C.primary} sub="Active workforce" />
        <StatCard label="Present Today"   value={att.present  ?? 0}                 icon="✅" color={C.success} sub="Today" />
        <StatCard label="Absent Today"    value={att.absent   ?? 0}                 icon="❌" color={C.danger}  sub="Unplanned" />
        <StatCard label="Monthly Payroll" value={fmtMoney(stats.monthly_expense||0)} icon="💰" color={C.purple} sub={MONTHS_LG[CUR_MONTH-1]} />
        <StatCard label="Pending Leaves"  value={stats.pending_leaves ?? 0}         icon="📋" color={C.warning} sub="Awaiting approval" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: C.text }}>
            Today's Attendance
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AttBar label="Present"  value={att.present  || 0} total={total} color={C.success} />
            <AttBar label="Absent"   value={att.absent   || 0} total={total} color={C.danger}  />
            <AttBar label="Half Day" value={att.half_day || 0} total={total} color={C.warning} />
            <AttBar label="On Leave" value={att.on_leave || 0} total={total} color={C.primary} />
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: C.text }}>
            🔔 Absence Alerts
          </h3>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <p style={{ margin: 0, fontSize: 14 }}>No frequent absentees this month</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#fdf0f0', borderRadius: 8,
                  border: '1px solid #f5aaaa',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{a.emp_code}</div>
                  </div>
                  <Badge status="absent" label={`${a.absent_count} absences`} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: C.text }}>
          Quick Actions
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: C.muted }}>
          Jump to a common task
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {[
            ['Mark Attendance', 'attendance', '📅'],
            ['Manage Leaves',   'leaves',     '📋'],
            ['View Payroll',    'salary',     '💰'],
            ['Add Overtime',    'overtime',   '⏰'],
            ['Add Employee',    'employees',  '👤'],
          ].map(([label, pg, icon]) => (
            <div
              key={pg}
              onClick={() => setPage(pg)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8,
                padding: '20px 12px', background: C.bg,
                borderRadius: 10, border: `1px solid ${C.border}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background   = C.primaryLight;
                e.currentTarget.style.borderColor  = C.primary;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background   = C.bg;
                e.currentTarget.style.borderColor  = C.border;
              }}
            >
              <span style={{ fontSize: 28 }}>{icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.text, textAlign: 'center' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}