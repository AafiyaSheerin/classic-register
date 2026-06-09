// routes/extratime.js
const router = require('express').Router();
const pool = require('../db/connection');
const { authenticate } = require('../middleware/auth');

// GET all extra time records
router.get('/', authenticate, async (req, res) => {
  try {
    const { employee_id, month, year } = req.query;
    let query = `
      SELECT et.*, e.name as employee_name, e.employee_id as emp_code
      FROM extra_time et
      JOIN employees e ON et.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (employee_id) { query += ' AND et.employee_id = ?'; params.push(employee_id); }
    if (month && year) {
      query += ' AND MONTH(et.date) = ? AND YEAR(et.date) = ?';
      params.push(month, year);
    }
    query += ' ORDER BY et.date DESC';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add extra time
router.post('/', authenticate, async (req, res) => {
  try {
    const { employee_id, date, hours, amount, notes } = req.body;
    if (!employee_id || !date || !amount) {
      return res.status(400).json({ success: false, message: 'Employee, date and amount are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO extra_time (employee_id, date, hours, amount, notes) VALUES (?,?,?,?,?)',
      [employee_id, date, hours || 0, amount, notes || null]
    );
    res.status(201).json({ success: true, message: 'Extra time added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update extra time
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { hours, amount, notes, date } = req.body;
    await pool.execute(
      'UPDATE extra_time SET hours=?, amount=?, notes=?, date=? WHERE id=?',
      [hours || 0, amount, notes || null, date, req.params.id]
    );
    res.json({ success: true, message: 'Extra time updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE extra time
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.execute('DELETE FROM extra_time WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Extra time deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;