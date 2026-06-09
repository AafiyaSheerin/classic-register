// routes/loans.js
const router = require('express').Router();
const pool   = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

// GET all loans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    let query = `
      SELECT l.*, e.name as employee_name, e.employee_id as emp_code
      FROM loans l
      JOIN employees e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (employee_id) { query += ' AND l.employee_id = ?'; params.push(employee_id); }
    if (status)      { query += ' AND l.status = ?';      params.push(status); }
    query += ' ORDER BY l.created_at DESC';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add new loan
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { employee_id, loan_amount, monthly_deduction, reason, given_date } = req.body;
    if (!employee_id || !loan_amount || !monthly_deduction || !given_date) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const [result] = await pool.execute(
      `INSERT INTO loans 
       (employee_id, loan_amount, monthly_deduction, remaining_balance, reason, given_date)
       VALUES (?,?,?,?,?,?)`,
      [employee_id, loan_amount, monthly_deduction, loan_amount, reason || null, given_date]
    );
    res.status(201).json({ success: true, message: 'Loan added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST deduct monthly loan payment
router.post('/:id/deduct', authenticateToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { month, year, amount } = req.body;

    const [[loan]] = await conn.execute('SELECT * FROM loans WHERE id=?', [req.params.id]);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.status === 'closed') return res.status(400).json({ success: false, message: 'Loan already closed' });

    const deductAmount = amount || loan.monthly_deduction;
    const newPaid      = parseFloat(loan.amount_paid) + parseFloat(deductAmount);
    const newRemaining = parseFloat(loan.loan_amount) - newPaid;
    const newStatus    = newRemaining <= 0 ? 'closed' : 'active';
    const closedDate   = newStatus === 'closed' ? new Date().toISOString().slice(0,10) : null;

    await conn.execute(
      'UPDATE loans SET amount_paid=?, remaining_balance=?, status=?, closed_date=? WHERE id=?',
      [newPaid, Math.max(0, newRemaining), newStatus, closedDate, req.params.id]
    );

    await conn.execute(
      'INSERT INTO loan_deductions (loan_id, employee_id, month, year, amount) VALUES (?,?,?,?,?)',
      [req.params.id, loan.employee_id, month, year, deductAmount]
    );

    await conn.commit();
    res.json({
      success: true,
      message: newStatus === 'closed' ? 'Loan fully paid and closed!' : 'Deduction recorded',
      remaining: Math.max(0, newRemaining),
      status: newStatus
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// PUT update loan
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { monthly_deduction, reason } = req.body;
    await pool.execute(
      'UPDATE loans SET monthly_deduction=?, reason=? WHERE id=?',
      [monthly_deduction, reason || null, req.params.id]
    );
    res.json({ success: true, message: 'Loan updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET loan deductions history
router.get('/:id/deductions', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM loan_deductions WHERE loan_id=? ORDER BY year DESC, month DESC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;