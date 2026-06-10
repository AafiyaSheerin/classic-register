// pages/Loans.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const today = new Date().toISOString().slice(0, 10);
const currentMonth = new Date().getMonth() + 1;
const currentYear  = new Date().getFullYear();

export function Loans({ toast }) {
  const qc = useQueryClient();
  const [form, setForm]         = useState({ employee_id: '', loan_amount: '', monthly_deduction: '', reason: '', given_date: today });
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [deductModal, setDeductModal]   = useState(null); // loan object
  const [deductAmount, setDeductAmount] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then(r => r.data),
  });

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans', statusFilter],
    queryFn: () => api.get(`/loans${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.post('/loans', data),
    onSuccess: () => {
      qc.invalidateQueries(['loans']);
      setForm({ employee_id: '', loan_amount: '', monthly_deduction: '', reason: '', given_date: today });
      setShowForm(false);
      toast?.('Loan added successfully!', 'success');
    },
    onError: (e) => toast?.(e.response?.data?.message || 'Error adding loan', 'error'),
  });

  const deductMutation = useMutation({
    mutationFn: ({ id, amount }) => api.post(`/loans/${id}/deduct`, {
      month: currentMonth, year: currentYear, amount
    }),
    onSuccess: (res) => {
      qc.invalidateQueries(['loans']);
      setDeductModal(null);
      setDeductAmount('');
      toast?.(res.data.message, 'success');
    },
    onError: (e) => toast?.(e.response?.data?.message || 'Error processing deduction', 'error'),
  });

  const handleSubmit = () => {
    if (!form.employee_id || !form.loan_amount || !form.monthly_deduction || !form.given_date) {
      toast?.('All fields are required', 'error'); return;
    }
    addMutation.mutate(form);
  };

  const handleDeduct = () => {
    if (!deductAmount) { toast?.('Enter deduction amount', 'error'); return; }
    deductMutation.mutate({ id: deductModal.id, amount: deductAmount });
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 14, outline: 'none', background: '#f8fafc',
    boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };

  const totalActive   = loans.filter(l => l.status === 'active').reduce((s, l) => s + parseFloat(l.remaining_balance || 0), 0);
  const totalGiven    = loans.reduce((s, l) => s + parseFloat(l.loan_amount || 0), 0);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>💳 Loans</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Manage employee loans and deductions</p>
        </div>
        <button
          onClick={() => setShowForm(p => !p)}
          style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ New Loan'}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Loans Given', value: `₹${totalGiven.toLocaleString('en-IN')}`, color: '#1d4ed8', bg: '#dbeafe' },
          { label: 'Total Outstanding', value: `₹${totalActive.toLocaleString('en-IN')}`, color: '#dc2626', bg: '#fee2e2' },
          { label: 'Active Loans', value: loans.filter(l => l.status === 'active').length, color: '#ea580c', bg: '#fef3c7' },
          { label: 'Closed Loans', value: loans.filter(l => l.status === 'closed').length, color: '#16a34a', bg: '#dcfce7' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: card.color, fontWeight: 600, marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Add Loan Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>New Loan</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Employee *</label>
              <select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))} style={inputStyle}>
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Loan Amount (₹) *</label>
              <input type="number" min="0" placeholder="e.g. 5000" value={form.loan_amount} onChange={e => setForm(p => ({ ...p, loan_amount: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Monthly Deduction (₹) *</label>
              <input type="number" min="0" placeholder="e.g. 500" value={form.monthly_deduction} onChange={e => setForm(p => ({ ...p, monthly_deduction: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Given Date *</label>
              <input type="date" value={form.given_date} onChange={e => setForm(p => ({ ...p, given_date: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Reason</label>
              <input type="text" placeholder="e.g. Medical emergency" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={addMutation.isPending}
            style={{ marginTop: 16, padding: '10px 24px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            {addMutation.isPending ? 'Adding...' : 'Add Loan'}
          </button>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'active', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s === 'all' ? '' : s)}
            style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: (statusFilter === s || (s === 'all' && !statusFilter)) ? '#1d4ed8' : '#fff',
              color:      (statusFilter === s || (s === 'all' && !statusFilter)) ? '#fff'    : '#475569' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Loans Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : loans.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No loans found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Employee', 'Loan Amount', 'Monthly Deduction', 'Paid', 'Remaining', 'Status', 'Reason', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, i) => (
                <tr key={loan.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{loan.employee_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>₹{parseFloat(loan.loan_amount).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>₹{parseFloat(loan.monthly_deduction).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#16a34a', fontWeight: 600 }}>₹{parseFloat(loan.amount_paid).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#dc2626', fontWeight: 600 }}>₹{parseFloat(loan.remaining_balance).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: loan.status === 'active' ? '#fef3c7' : '#dcfce7',
                      color:      loan.status === 'active' ? '#ea580c' : '#16a34a',
                    }}>{loan.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{loan.reason || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {loan.status === 'active' && (
                      <button
                        onClick={() => { setDeductModal(loan); setDeductAmount(loan.monthly_deduction); }}
                        style={{ padding: '4px 12px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        Deduct
                      </button>
                    )}
                    {loan.status === 'closed' && (
                      <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✅ Paid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deduct Modal */}
      {deductModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Deduct Loan Payment</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>
              Employee: <strong>{deductModal.employee_name}</strong><br />
              Remaining: <strong style={{ color: '#dc2626' }}>₹{parseFloat(deductModal.remaining_balance).toLocaleString('en-IN')}</strong>
            </p>
            <label style={labelStyle}>Deduction Amount (₹)</label>
            <input
              type="number" min="0"
              value={deductAmount}
              onChange={e => setDeductAmount(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDeduct}
                disabled={deductMutation.isPending}
                style={{ flex: 1, padding: '10px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                {deductMutation.isPending ? 'Processing...' : 'Confirm Deduction'}
              </button>
              <button
                onClick={() => { setDeductModal(null); setDeductAmount(''); }}
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Loans;