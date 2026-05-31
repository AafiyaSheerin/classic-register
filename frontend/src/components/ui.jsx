import { useEffect, useState } from 'react';

export const C = {
  primary:      '#1e3a5f',
  primaryLight: '#e8f0fb',
  success:      '#2a7a50',
  successLight: '#e6f5ed',
  warning:      '#b57c12',
  warningLight: '#fdf5e6',
  danger:       '#b83030',
  dangerLight:  '#fdf0f0',
  purple:       '#5c3da0',
  purpleLight:  '#f1eeff',
  text:         '#12182b',
  muted:        '#64748b',
  border:       '#e2e8f0',
  bg:           '#f5f7fb',
  surface:      '#ffffff',
};

const STATUS = {
  present:   { bg: '#e6f5ed', text: '#1a5c3a', bd: '#9dd4b4' },
  absent:    { bg: '#fdf0f0', text: '#8b2020', bd: '#f5aaaa' },
  half_day:  { bg: '#fdf5e6', text: '#7a5010', bd: '#f0c870' },
  on_leave:  { bg: '#e8f0fb', text: '#1a3a6c', bd: '#a8c4f5' },
  pending:   { bg: '#fdf5e6', text: '#7a5010', bd: '#f0c870' },
  approved:  { bg: '#e6f5ed', text: '#1a5c3a', bd: '#9dd4b4' },
  rejected:  { bg: '#fdf0f0', text: '#8b2020', bd: '#f5aaaa' },
  monthly:   { bg: '#e8f0fb', text: '#1e3a5f', bd: '#a8c4f5' },
  daily:     { bg: '#f1eeff', text: '#5c3da0', bd: '#c4adf5' },
  hourly:    { bg: '#fff4e6', text: '#7a4f10', bd: '#f5c870' },
  piece:     { bg: '#fdf0ee', text: '#8b3020', bd: '#f5b4a8' },
  active:    { bg: '#e6f5ed', text: '#2a7a50', bd: '#9dd4b4' },
  inactive:  { bg: '#f1f3f5', text: '#64748b', bd: '#cbd5e1' },
  sick:      { bg: '#fdf0f0', text: '#8b2020', bd: '#f5aaaa' },
  casual:    { bg: '#e8f0fb', text: '#1e3a5f', bd: '#a8c4f5' },
  emergency: { bg: '#fdf5e6', text: '#7a5010', bd: '#f0c870' },
  unpaid:    { bg: '#f1f3f5', text: '#64748b', bd: '#cbd5e1' },
};

export function Badge({ status, label }) {
  const s = STATUS[status] || STATUS.inactive;
  return (
    <span style={{
      background: s.bg, color: s.text,
      border: `1px solid ${s.bd}`,
      padding: '2px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 500,
      whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {label ?? status?.replace(/_/g, ' ')}
    </span>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '20px 24px', ...style,
    }}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, color = C.primary, icon }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '16px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      {icon && (
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: color + '18',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20, flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 12, color: C.muted, marginBottom: 2,
          fontWeight: 500, textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

const BTN_VARIANTS = {
  primary: { background: C.primary,  color: '#fff', border: 'none' },
  danger:  { background: C.danger,   color: '#fff', border: 'none' },
  success: { background: C.success,  color: '#fff', border: 'none' },
  warning: { background: C.warning,  color: '#fff', border: 'none' },
  outline: { background: 'transparent', color: C.primary, border: `1.5px solid ${C.primary}` },
  ghost:   { background: 'transparent', color: C.muted,   border: `1px solid ${C.border}` },
};
const BTN_SIZES = {
  sm: { padding: '5px 12px', fontSize: 12 },
  md: { padding: '8px 18px', fontSize: 14 },
  lg: { padding: '11px 26px', fontSize: 15 },
};

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style = {}, type = 'button' }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...BTN_VARIANTS[variant], ...BTN_SIZES[size],
        borderRadius: 8, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : hov ? 0.88 : 1,
        transition: 'opacity 0.15s',
        whiteSpace: 'nowrap', ...style,
      }}
    >
      {children}
    </button>
  );
}

const FIELD_STYLE = {
  width: '100%', padding: '8px 12px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, outline: 'none',
  background: C.surface, color: C.text,
  boxSizing: 'border-box',
};

export function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
          {label}{required && <span style={{ color: C.danger }}> *</span>}
        </label>
      )}
      {children}
    </div>
  );
}

export function Input({ label, value, onChange, type = 'text', placeholder, required, min, max, step, style = {} }) {
  return (
    <Field label={label} required={required}>
      <input
        type={type} value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        min={min} max={max} step={step}
        style={{ ...FIELD_STYLE, ...style }}
      />
    </Field>
  );
}

export function Select({ label, value, onChange, options = [], required, style = {} }) {
  return (
    <Field label={label} required={required}>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={{ ...FIELD_STYLE, ...style }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function Textarea({ label, value, onChange, placeholder, rows = 3, required }) {
  return (
    <Field label={label} required={required}>
      <textarea
        value={value ?? ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{ ...FIELD_STYLE, resize: 'vertical' }}
      />
    </Field>
  );
}

export function Modal({ open, onClose, title, children, width = 520 }) {
  useEffect(() => {
    if (!open) return;
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)', zIndex: 1000,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: C.surface, borderRadius: 16,
        width: '100%', maxWidth: width,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 22,
            color: C.muted, lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}

export function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  const colors = {
    success: { bg: '#e6f5ed', text: '#1a5c3a', bd: '#9dd4b4' },
    error:   { bg: '#fdf0f0', text: '#8b2020', bd: '#f5aaaa' },
    info:    { bg: '#e8f0fb', text: '#1e3a5f', bd: '#a8c4f5' },
  };
  const c = colors[type] || colors.success;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.bd}`,
      color: c.text, padding: '12px 18px',
      borderRadius: 10, fontWeight: 500, fontSize: 14,
      maxWidth: 340, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      {msg}
    </div>
  );
}

export function ToastContainer({ toasts, remove }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 3000, display: 'flex',
      flexDirection: 'column', gap: 8,
    }}>
      {toasts.map(t => (
        <Toast key={t.id} msg={t.msg} type={t.type} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

export function Spinner({ fullPage = false }) {
  const inner = (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: 48,
    }}>
      <div style={{
        width: 36, height: 36,
        border: `3px solid ${C.border}`,
        borderTopColor: C.primary,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ color: C.muted, fontSize: 14 }}>Loading…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!fullPage) return inner;
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: C.bg,
    }}>
      {inner}
    </div>
  );
}

export function PageHeader({ title, sub, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12, marginBottom: 20,
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>{title}</h2>
        {sub && <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 14 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, msg, confirmLabel = 'Confirm', variant = 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={400}>
      <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px' }}>{msg}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Btn>
      </div>
    </Modal>
  );
}

export const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtMoney = n => `₹${(+n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
export const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const MONTHS_LG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const TODAY     = new Date().toISOString().split('T')[0];
export const CUR_MONTH = new Date().getMonth() + 1;
export const CUR_YEAR  = new Date().getFullYear();