const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { date, employee_id, month, year, status } = req.query;
    let sql = `
      SELECT a.*, e.name AS employee_name, e.employee_id AS emp_code, e.role, e.salary_type
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1`;
    const p = [];
    if (date)        { sql += ' AND a.date = ?';        p.push(date); }
    if (employee_id) { sql += ' AND a.employee_id = ?'; p.push(employee_id); }
    if (status)      { sql += ' AND a.status = ?';      p.push(status); }
    if (month && year) {
      sql += ' AND MONTH(a.date)=? AND YEAR(a.date)=?';
      p.push(month, year);
    } else if (year) {
      sql += ' AND YEAR(a.date)=?'; p.push(year);
    }
    sql += ' ORDER BY a.date DESC, e.name ASC';
    const [rows] = await db.query(sql, p);
    return ok(res, rows);
  } catch (err) {
    console.error('[attendance GET]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.get('/today', async (req, res) => {
  try {
    const { date } = req.query;
    const d = date || new Date().toISOString().split('T')[0];
    const [rows] = await db.query(
      `SELECT e.id, e.employee_id AS emp_code, e.name, e.role, e.salary_type,
              a.status, a.id AS attendance_id, a.hours_worked, a.notes
       FROM employees e
       LEFT JOIN attendance a ON a.employee_id=e.id AND a.date=?
       WHERE e.status='active'
       ORDER BY e.name ASC`,
      [d]
    );
    const s = (v) => rows.filter(r => r.status === v).length;
    const summary = {
      total:      rows.length,
      present:    s('present'),
      absent:     s('absent'),
      half_day:   s('half_day'),
      on_leave:   s('on_leave'),
      not_marked: rows.filter(r => !r.status).length,
    };
    return res.json({ success: true, data: rows, summary, date: d });
  } catch (err) {
    console.error('[attendance/today]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.get('/monthly-summary', async (req, res) => {
  try {
    const m = req.query.month || new Date().getMonth() + 1;
    const y = req.query.year  || new Date().getFullYear();
    const [rows] = await db.query(
      `SELECT e.id, e.employee_id AS emp_code, e.name, e.role,
              e.salary_type, e.base_pay,
              COALESCE(SUM(a.status='present'),0)  AS present_days,
              COALESCE(SUM(a.status='absent'),0)   AS absent_days,
              COALESCE(SUM(a.status='half_day'),0) AS half_days,
              COALESCE(SUM(a.status='on_leave'),0) AS leave_days,
              COALESCE(SUM(a.hours_worked),0)      AS total_hours
       FROM employees e
       LEFT JOIN attendance a
         ON a.employee_id=e.id AND MONTH(a.date)=? AND YEAR(a.date)=?
       WHERE e.status='active'
       GROUP BY e.id
       ORDER BY e.name ASC`,
      [m, y]
    );
    return res.json({ success: true, data: rows, month: m, year: y });
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const m = new Date().getMonth() + 1;
    const y = new Date().getFullYear();
    const [rows] = await db.query(
      `SELECT e.id, e.name, e.employee_id AS emp_code, e.role,
              COUNT(*) AS absent_count
       FROM attendance a
       JOIN employees e ON a.employee_id=e.id
       WHERE a.status='absent' AND MONTH(a.date)=? AND YEAR(a.date)=?
         AND e.status='active'
       GROUP BY e.id HAVING absent_count >= ?
       ORDER BY absent_count DESC`,
      [m, y, threshold]
    );
    return ok(res, rows);
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const { employee_id, date, status, check_in, check_out, hours_worked, notes } = req.body;
    if (!employee_id || !date || !status)
      return fail(res, 'employee_id, date and status are required.');

    const VALID = ['present','absent','half_day','on_leave'];
    if (!VALID.includes(status))
      return fail(res, `status must be one of: ${VALID.join(', ')}`);

    let hours = parseFloat(hours_worked) || 0;
    if (!hours) {
      if (check_in && check_out) {
        const [ih, im] = check_in.split(':').map(Number);
        const [oh, om] = check_out.split(':').map(Number);
        hours = ((oh * 60 + om) - (ih * 60 + im)) / 60;
        if (status === 'half_day') hours = Math.min(hours, 4);
      } else {
        hours = status === 'present' ? 8 : status === 'half_day' ? 4 : 0;
      }
    }

    await db.query(
      `INSERT INTO attendance (employee_id,date,status,check_in,check_out,hours_worked,notes)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         status=VALUES(status), check_in=VALUES(check_in),
         check_out=VALUES(check_out), hours_worked=VALUES(hours_worked),
         notes=VALUES(notes), updated_at=NOW()`,
      [employee_id, date, status, check_in||null, check_out||null, hours, notes||null]
    );
    return ok(res, null, 'Attendance saved.');
  } catch (err) {
    console.error('[attendance POST]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records) || !records.length)
      return fail(res, 'date and records[] are required.');

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const r of records) {
        const hrs = r.status === 'present' ? 8 : r.status === 'half_day' ? 4 : 0;
        await conn.query(
          `INSERT INTO attendance (employee_id,date,status,hours_worked,notes)
           VALUES (?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
             status=VALUES(status), hours_worked=VALUES(hours_worked),
             notes=VALUES(notes), updated_at=NOW()`,
          [r.employee_id, date, r.status, hrs, r.notes||null]
        );
      }
      await conn.commit();
      return ok(res, null, `Attendance saved for ${records.length} employees.`);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[attendance/bulk]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM attendance WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return fail(res, 'Record not found.', 404);
    return ok(res, null, 'Record deleted.');
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

module.exports = router;