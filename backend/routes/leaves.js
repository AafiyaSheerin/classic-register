const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { employee_id, status, type, month, year } = req.query;
    let sql = `
      SELECT l.*, e.name AS employee_name, e.employee_id AS emp_code, e.role
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      WHERE 1=1`;
    const p = [];
    if (employee_id) { sql += ' AND l.employee_id=?'; p.push(employee_id); }
    if (status)      { sql += ' AND l.status=?';      p.push(status); }
    if (type)        { sql += ' AND l.type=?';         p.push(type); }
    if (month && year) {
      sql += ' AND (MONTH(l.from_date)=? OR MONTH(l.to_date)=?) AND YEAR(l.from_date)=?';
      p.push(month, month, year);
    }
    sql += ' ORDER BY l.created_at DESC';
    const [rows] = await db.query(sql, p);
    return ok(res, rows);
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.get('/balance/:employee_id', async (req, res) => {
  try {
    const y = new Date().getFullYear();
    const [rows] = await db.query(
      `SELECT type, SUM(total_days) AS days_taken
       FROM leaves
       WHERE employee_id=? AND status='approved' AND YEAR(from_date)=?
       GROUP BY type`,
      [req.params.employee_id, y]
    );
    const allowances = { sick: 12, casual: 12, emergency: 5, unpaid: 999 };
    const balance = {};
    for (const [type, allowed] of Object.entries(allowances)) {
      const used = Number(rows.find(r => r.type === type)?.days_taken || 0);
      balance[type] = { allowed, used, remaining: Math.max(0, allowed - used) };
    }
    return ok(res, balance);
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const { employee_id, type, from_date, to_date, reason } = req.body;
    if (!employee_id || !type || !from_date || !to_date || !reason?.trim())
      return fail(res, 'All fields are required.');

    const from = new Date(from_date);
    const to   = new Date(to_date);
    if (isNaN(from) || isNaN(to)) return fail(res, 'Invalid dates.');
    if (to < from) return fail(res, 'to_date cannot be before from_date.');

    const totalDays = Math.round((to - from) / 86400000) + 1;

    const [[overlap]] = await db.query(
      `SELECT id FROM leaves
       WHERE employee_id=? AND status!='rejected'
         AND NOT (to_date < ? OR from_date > ?)
       LIMIT 1`,
      [employee_id, from_date, to_date]
    );
    if (overlap) return fail(res, 'Dates overlap with an existing leave request.', 409);

    const [result] = await db.query(
      `INSERT INTO leaves (employee_id,type,from_date,to_date,total_days,reason)
       VALUES (?,?,?,?,?,?)`,
      [employee_id, type, from_date, to_date, totalDays, reason.trim()]
    );
    const [[leave]] = await db.query(
      `SELECT l.*, e.name AS employee_name
       FROM leaves l JOIN employees e ON l.employee_id=e.id
       WHERE l.id=?`,
      [result.insertId]
    );
    return ok(res, leave, 'Leave applied successfully.', 201);
  } catch (err) {
    console.error('[leaves POST]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.put('/:id/approve', async (req, res) => {
  try {
    const { approval_note } = req.body;
    const [[leave]] = await db.query('SELECT * FROM leaves WHERE id=?', [req.params.id]);
    if (!leave) return fail(res, 'Leave not found.', 404);
    if (leave.status !== 'pending')
      return fail(res, 'Only pending leaves can be approved.');

    await db.query(
      `UPDATE leaves SET status='approved', approved_by=?, approval_note=?, updated_at=NOW()
       WHERE id=?`,
      [req.user.id, approval_note||'Approved', req.params.id]
    );

    const from = new Date(leave.from_date);
    const to   = new Date(leave.to_date);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      await db.query(
        `INSERT INTO attendance (employee_id,date,status,hours_worked)
         VALUES (?,?,'on_leave',0)
         ON DUPLICATE KEY UPDATE status='on_leave', hours_worked=0, updated_at=NOW()`,
        [leave.employee_id, dateStr]
      );
    }
    return ok(res, null, 'Leave approved and attendance updated.');
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.put('/:id/reject', async (req, res) => {
  try {
    const { approval_note } = req.body;
    const [[leave]] = await db.query('SELECT id FROM leaves WHERE id=?', [req.params.id]);
    if (!leave) return fail(res, 'Leave not found.', 404);
    await db.query(
      `UPDATE leaves SET status='rejected', approved_by=?, approval_note=?, updated_at=NOW()
       WHERE id=?`,
      [req.user.id, approval_note||'Rejected', req.params.id]
    );
    return ok(res, null, 'Leave rejected.');
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [[leave]] = await db.query('SELECT * FROM leaves WHERE id=?', [req.params.id]);
    if (!leave) return fail(res, 'Leave not found.', 404);
    if (leave.status === 'approved')
      return fail(res, 'Cannot cancel an approved leave.', 400);
    await db.query('DELETE FROM leaves WHERE id=?', [req.params.id]);
    return ok(res, null, 'Leave request cancelled.');
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

module.exports = router;