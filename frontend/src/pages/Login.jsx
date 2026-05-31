import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../utils/AuthContext';

// ─── tiny icon components (no external icon lib needed) ─────────────────────
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEye = ({ open }) => open ? (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconBadgeId = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/>
  </svg>
);

// ─── validation helpers ──────────────────────────────────────────────────────
function validateAdmin(username, password) {
  const errors = {};
  if (!username.trim())          errors.username = 'Username is required';
  else if (username.length < 3)  errors.username = 'Username too short';
  if (!password)                 errors.password = 'Password is required';
  else if (password.length < 6)  errors.password = 'Password must be at least 6 characters';
  return errors;
}

function validateEmployee(empId, password) {
  const errors = {};
  if (!empId.trim())             errors.empId = 'Employee ID is required';
  else if (!/^EMP\d{3,}$/i.test(empId.trim())) errors.empId = 'Enter a valid ID (e.g. EMP001)';
  if (!password)                 errors.password = 'Password is required';
  else if (password.length < 6)  errors.password = 'Must be at least 6 characters';
  return errors;
}

// ─── rate limiter (client-side soft lock) ───────────────────────────────────
function useRateLimiter(maxAttempts = 5, lockSeconds = 60) {
  const [attempts, setAttempts]   = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (secs <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setRemaining(0);
      } else {
        setRemaining(secs);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  function recordFailure() {
    const next = attempts + 1;
    setAttempts(next);
    if (next >= maxAttempts) {
      setLockedUntil(Date.now() + lockSeconds * 1000);
      setRemaining(lockSeconds);
    }
  }

  function reset() { setAttempts(0); setLockedUntil(null); setRemaining(0); }

  return {
    isLocked: !!lockedUntil,
    remaining,
    attemptsLeft: Math.max(0, maxAttempts - attempts),
    recordFailure,
    reset,
  };
}

// ─── Input field component ───────────────────────────────────────────────────
function Field({ label, icon, error, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', letterSpacing: '0.02em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 13, top: '50%',
          transform: 'translateY(-50%)',
          color: error ? '#dc2626' : '#9ca3af',
          display: 'flex', alignItems: 'center', pointerEvents: 'none',
        }}>
          {icon}
        </div>
        {children}
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#dc2626', fontSize: 12 }}>
          <IconAlert /> {error}
        </div>
      )}
      {hint && !error && (
        <div style={{ fontSize: 12, color: '#6b7280' }}>{hint}</div>
      )}
    </div>
  );
}

// ─── Main Login component ────────────────────────────────────────────────────
export function Login() {
  const { login, employeeLogin } = useAuth();

  // tab
  const [tab, setTab] = useState('admin'); // 'admin' | 'employee'

  // admin fields
  const [username, setUsername] = useState('');

  // employee fields
  const [empId, setEmpId] = useState('');

  // shared
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy]               = useState(false);
  const [mounted, setMounted]         = useState(false);

  const limiter    = useRateLimiter(5, 60);
  const firstRef   = useRef(null);

  // mount animation
  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  // focus first input on tab change
  useEffect(() => {
    setPassword('');
    setFieldErrors({});
    setServerError('');
    setShowPass(false);
    setTimeout(() => firstRef.current?.focus(), 100);
  }, [tab]);

  function switchTab(t) {
    if (t === tab) return;
    setTab(t);
    setUsername('');
    setEmpId('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (limiter.isLocked) return;

    // client-side validation
    const errors = tab === 'admin'
      ? validateAdmin(username, password)
      : validateEmployee(empId, password);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setServerError('');
    setBusy(true);

    try {
      let result;
      if (tab === 'admin') {
        result = await login(username.trim(), password);
      } else {
        result = await employeeLogin(empId.trim().toUpperCase(), password);
      }

      if (!result.success) {
        limiter.recordFailure();
        setServerError(result.message || 'Invalid credentials. Please try again.');
      } else {
        limiter.reset();
        // AuthContext will redirect on success
      }
    } catch (err) {
      limiter.recordFailure();
      setServerError(err.message || 'Cannot connect to server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // ── shared input style ──
  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '11px 42px 11px 42px',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`,
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    background: hasError ? '#fef2f2' : '#f9fafb',
    color: '#111827',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  });

  const isDisabled = busy || limiter.isLocked;

  return (
    <>
      {/* ── global styles injected inline (no external CSS file needed) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'DM Sans', sans-serif; }

        .cr-input:focus {
          border-color: #1d4ed8 !important;
          background: #fff !important;
          box-shadow: 0 0 0 3px rgba(29,78,216,0.12) !important;
        }

        .cr-input::placeholder { color: #9ca3af; }

        .cr-tab {
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
        }

        .cr-tab:hover:not(.cr-tab-active) {
          background: #f0f4ff !important;
          color: #1d4ed8 !important;
        }

        .cr-btn {
          transition: all 0.18s ease;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          border: none;
          font-weight: 700;
        }

        .cr-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(29,78,216,0.35) !important;
        }

        .cr-btn:not(:disabled):active {
          transform: translateY(0);
        }

        .cr-btn:disabled { cursor: not-allowed; opacity: 0.6; }

        .cr-eye {
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          align-items: center;
          padding: 0 2px;
          transition: color 0.15s;
        }
        .cr-eye:hover { color: #374151; }

        .cr-card {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .cr-card.mounted {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .cr-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        .cr-shake { animation: shake 0.4s ease; }

        @keyframes pulse-dot {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>

      {/* ── Background ── */}
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* decorative blobs */}
        <div style={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%', top: -100, right: -80,
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300,
          borderRadius: '50%', bottom: -60, left: -60,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* subtle grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />

        {/* ── Card ── */}
        <div
          className={`cr-card${mounted ? ' mounted' : ''}`}
          style={{
            background: '#ffffff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* ── Card header band ── */}
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
            padding: '32px 36px 28px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* embroidery decorative pattern */}
            <div style={{
              position: 'absolute', right: -10, top: -10,
              fontSize: 90, opacity: 0.08, lineHeight: 1,
              userSelect: 'none',
            }}>🪡</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                🪡
              </div>
              <div>
                <h1 style={{
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  Classic Register
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '3px 0 0' }}>
                  Embroidery Business ERP
                </p>
              </div>
            </div>
          </div>

          {/* ── Card body ── */}
          <div style={{ padding: '28px 36px 36px' }}>

            {/* ── Tab switcher ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              background: '#f1f5f9',
              borderRadius: 12,
              padding: 5,
              marginBottom: 26,
            }}>
              {[
                { key: 'admin',    label: '👨‍💼  Admin'    },
                { key: 'employee', label: '👷  Employee' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`cr-tab${tab === key ? ' cr-tab-active' : ''}`}
                  onClick={() => switchTab(key)}
                  style={{
                    padding: '9px 0',
                    borderRadius: 8,
                    background: tab === key ? '#1d4ed8' : 'transparent',
                    color:      tab === key ? '#fff'    : '#6b7280',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Rate-limit warning ── */}
            {limiter.isLocked && (
              <div style={{
                background: '#fff7ed',
                border: '1.5px solid #fed7aa',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18 }}>🔒</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#c2410c', fontSize: 13 }}>
                    Too many failed attempts
                  </div>
                  <div style={{ color: '#9a3412', fontSize: 13, marginTop: 2 }}>
                    Please wait <strong>{limiter.remaining}s</strong> before trying again.
                  </div>
                </div>
              </div>
            )}

            {/* ── Attempts warning ── */}
            {!limiter.isLocked && limiter.attemptsLeft <= 2 && limiter.attemptsLeft > 0 && (
              <div style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 18,
                fontSize: 13,
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                ⚠️ <strong>{limiter.attemptsLeft} attempt{limiter.attemptsLeft !== 1 ? 's' : ''}</strong> remaining before lockout
              </div>
            )}

            {/* ── Form ── */}
            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
            >
              {/* Identifier field */}
              {tab === 'admin' ? (
                <Field
                  label="Username"
                  icon={<IconUser />}
                  error={fieldErrors.username}
                >
                  <input
                    ref={firstRef}
                    className="cr-input"
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: '' })); }}
                    placeholder="e.g. admin"
                    autoComplete="username"
                    disabled={isDisabled}
                    maxLength={50}
                    style={inputStyle(!!fieldErrors.username)}
                  />
                </Field>
              ) : (
                <Field
                  label="Employee ID"
                  icon={<IconBadgeId />}
                  error={fieldErrors.empId}
                  hint="Format: EMP001"
                >
                  <input
                    ref={firstRef}
                    className="cr-input"
                    type="text"
                    value={empId}
                    onChange={e => { setEmpId(e.target.value.toUpperCase()); setFieldErrors(p => ({ ...p, empId: '' })); }}
                    placeholder="EMP001"
                    autoComplete="username"
                    disabled={isDisabled}
                    maxLength={20}
                    style={inputStyle(!!fieldErrors.empId)}
                  />
                </Field>
              )}

              {/* Password field */}
              <Field
                label="Password"
                icon={<IconLock />}
                error={fieldErrors.password}
                hint={tab === 'employee' ? '💡 Default: your registered phone number' : undefined}
              >
                <input
                  className="cr-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                  placeholder={tab === 'employee' ? 'Your phone number' : '••••••••'}
                  autoComplete="current-password"
                  disabled={isDisabled}
                  maxLength={100}
                  style={{ ...inputStyle(!!fieldErrors.password), paddingRight: 44 }}
                />
                {/* show/hide toggle */}
                <button
                  type="button"
                  className="cr-eye"
                  tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 13,
                    top: '50%', transform: 'translateY(-50%)',
                  }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  <IconEye open={showPass} />
                </button>
              </Field>

              {/* Server error */}
              {serverError && (
                <div
                  className="cr-shake"
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    color: '#991b1b',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <span style={{ marginTop: 1 }}><IconAlert /></span>
                  {serverError}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="cr-btn"
                disabled={isDisabled}
                style={{
                  marginTop: 4,
                  padding: '13px',
                  background: isDisabled
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                  color: '#fff',
                  borderRadius: 10,
                  fontSize: 15,
                  letterSpacing: '0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: isDisabled ? 'none' : '0 4px 14px rgba(29,78,216,0.3)',
                }}
              >
                {busy ? (
                  <>
                    <span className="cr-spinner" />
                    Signing in…
                  </>
                ) : limiter.isLocked ? (
                  `🔒 Locked (${limiter.remaining}s)`
                ) : (
                  `Sign In as ${tab === 'admin' ? 'Admin' : 'Employee'}`
                )}
              </button>
            </form>

            {/* ── Footer note ── */}
            <div style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              {tab === 'employee' ? (
                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                  Forgot password? Contact your HR administrator.
                </p>
              ) : (
                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                  Admin access only. Unauthorized login attempts are logged.
                </p>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
                marginTop: 4,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#22c55e',
                  animation: 'pulse-dot 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  Secure connection · Classic Register v1.0
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;