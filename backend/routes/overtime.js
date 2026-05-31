const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { employee_id, month, year, date } = req.query;
    let sql = `
      SELECT o.*, e.name AS employee_name, e.employee_id AS emp_code,
             e.role, e.salary_type, e.base_pay
      FROM overtime o
      JOIN employees e ON o.employee_id=e.id
      WHERE 1=1`;
    const p = [];
    if (employee_id) { sql += ' AND o.employee_id=?'; p.push(employee_id); }
    if (date)        { sql += ' AND o.date=?';         p.push(date); }
    if (month && year) {
      sql += ' AND MONTH(o.date)=? AND YEAR(o.date)=?';
      p.push(month, year);
    }
    sql += ' ORDER BY o.date DESC, e.name ASC';
    const [rows] = await db.query(sql, p);
    return ok(res, rows);
  } catch (err) {
    console.error('[overtime GET]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.get('/summary', async (req, res) => {
  try {
    const m = req.query.month || new Date().getMonth() + 1;
    const y = req.query.year  || new Date().getFullYear();
    const [rows] = await db.query(
      `SELECT e.id, e.name, e.employee_id AS emp_code,
              e.salary_type, e.base_pay,
              COALESCE(SUM(o.hours),0)             AS total_ot_hours,
              COALESCE(SUM(o.pieces_completed),0)  AS total_ot_pieces,
              COALESCE(AVG(o.rate_multiplier),1.5) AS avg_rate_multiplier
       FROM employees e
       LEFT JOIN overtime o
         ON o.employee_id=e.id AND MONTH(o.date)=? AND YEAR(o.date)=?
       WHERE e.status='active'
       GROUP BY e.id
       ORDER BY total_ot_hours DESC`,
      [m, y]
    );
    return res.json({ success: true, data: rows, month: m, year: y });
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const { employee_id, date, hours, rate_multiplier = 1.5, pieces_completed = 0, notes } = req.body;
    if (!employee_id || !date)
      return fail(res, 'employee_id and date are required.');
    if (!hours && !pieces_completed)
      return fail(res, 'Provide hours or pieces_completed.');

    await db.query(
      `INSERT INTO overtime (employee_id,date,hours,rate_multiplier,pieces_completed,notes)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         hours=VALUES(hours), rate_multiplier=VALUES(rate_multiplier),
         pieces_completed=VALUES(pieces_completed), notes=VALUES(notes),
         updated_at=NOW()`,
      [employee_id, date, parseFloat(hours)||0,
       parseFloat(rate_multiplier)||1.5,
       parseInt(pieces_completed)||0,
       notes||null]
    );
    return ok(res, null, 'Overtime saved.');
  } catch (err) {
    console.error('[overtime POST]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { hours, rate_multiplier, pieces_completed, notes } = req.body;
    const [[existing]] = await db.query('SELECT id FROM overtime WHERE id=?', [req.params.id]);
    if (!existing) return fail(res, 'Record not found.', 404);
    await db.query(
      `UPDATE overtime SET hours=?,rate_multiplier=?,pieces_completed=?,notes=?,updated_at=NOW()
       WHERE id=?`,
      [parseFloat(hours)||0, parseFloat(rate_multiplier)||1.5,
       parseInt(pieces_completed)||0, notes||null, req.params.id]
    );
    return ok(res, null, 'Overtime updated.');
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM overtime WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return fail(res, 'Record not found.', 404);
    return ok(res, null, 'Record deleted.');
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

module.exports = router;