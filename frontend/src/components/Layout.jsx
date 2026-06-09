import { useAuth } from '../utils/AuthContext';
import { C, Btn } from './ui';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: '🏠' },
  { id: 'employees',  label: 'Employees',  icon: '👥' },
  { id: 'attendance', label: 'Attendance', icon: '📅' },
  { id: 'leaves',     label: 'Leaves',     icon: '📋' },
  { id: 'overtime',   label: 'Overtime',   icon: '⏰' },
  { id: 'extratime',  label: 'Extra Time', icon: '⏱️' },
  { id: 'loans',      label: 'Loans',      icon: '💳' },
  { id: 'salary',     label: 'Salary',     icon: '💰' },
];

function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      width: 224, background: C.primary,
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh', flexShrink: 0,
    }}>
      <div style={{
        padding: '22px 20px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>🪡</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, lineHeight: 1 }}>
            Classic Register
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 3 }}>
            Embroidery ERP
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, paddingTop: 10 }}>
        {NAV.map(item => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '11px 20px',
                border: 'none',
                borderLeft: active ? '3px solid #fff' : '3px solid transparent',
                background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.62)',
                cursor: 'pointer', fontSize: 14,
                fontWeight: active ? 600 : 400,
                textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 17 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
        textAlign: 'center',
      }}>
        v1.1 · Classic Register ERP
      </div>
    </aside>
  );
}

export function Layout({ page, setPage, children }) {
  const { user, logout } = useAuth();

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric',
    month: 'long', year: 'numeric',
  });

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: C.bg,
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      <Sidebar page={page} setPage={setPage} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: '12px 24px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: C.muted }}>{dateStr}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 14, color: C.text }}>
              <span style={{ color: C.muted }}>Hello, </span>
              <strong>{user?.full_name || 'Admin'}</strong>
            </div>
            <Btn size="sm" variant="ghost" onClick={logout}>Sign out</Btn>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 40px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}