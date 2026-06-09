// routes/overtime.js — custom amount, no fixed rate
const router = require('express').Router();
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

// GET all overtime records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { employee_id, month, year } = req.query;
    let query = `
      SELECT ot.*, e.name as employee_name, e.employee_id as emp_code
      FROM overtime ot
      JOIN employees e ON ot.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (employee_id) { query += ' AND ot.employee_id = ?'; params.push(employee_id); }
    if (month && year) {
      query += ' AND MONTH(ot.date) = ? AND YEAR(ot.date) = ?';
      params.push(month, year);
    }
    query += ' ORDER BY ot.date DESC';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add overtime
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { employee_id, date, hours, amount, notes } = req.body;
    if (!employee_id || !date || !amount) {
      return res.status(400).json({ success: false, message: 'Employee, date and amount are required' });
    }
    // Check for duplicate
    const [existing] = await pool.execute(
      'SELECT id FROM overtime WHERE employee_id=? AND date=?',
      [employee_id, date]
    );
    if (existing.length > 0) {
      await pool.execute(
        'UPDATE overtime SET hours=?, amount=?, notes=? WHERE employee_id=? AND date=?',
        [hours || 0, amount, notes || null, employee_id, date]
      );
      return res.json({ success: true, message: 'Overtime updated' });
    }
    const [result] = await pool.execute(
      'INSERT INTO overtime (employee_id, date, hours, amount, notes) VALUES (?,?,?,?,?)',
      [employee_id, date, hours || 0, amount, notes || null]
    );
    res.status(201).json({ success: true, message: 'Overtime added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update overtime
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { hours, amount, notes, date } = req.body;
    await pool.execute(
      'UPDATE overtime SET hours=?, amount=?, notes=?, date=? WHERE id=?',
      [hours || 0, amount, notes || null, date, req.params.id]
    );
    res.json({ success: true, message: 'Overtime updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE overtime
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM overtime WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Overtime deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
