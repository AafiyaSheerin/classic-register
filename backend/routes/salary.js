const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { ok, fail, getWorkingDays, calculateSalary } = require('../utils/helpers');

router.use(authenticateToken);

async function fetchAttendance(empId, m, y) {
  const [[row]] = await db.query(
    `SELECT
       COALESCE(SUM(status='present'),0)  AS present_days,
       COALESCE(SUM(status='half_day'),0) AS half_days,
       COALESCE(SUM(status='on_leave'),0) AS leave_days,
       COALESCE(SUM(status='absent'),0)   AS absent_days,
       COALESCE(SUM(hours_worked),0)      AS total_hours
     FROM attendance
     WHERE employee_id=? AND MONTH(date)=? AND YEAR(date)=?`,
    [empId, m, y]
  );
  return row;
}

async function fetchOvertime(empId, m, y) {
  const [[row]] = await db.query(
    `SELECT
       COALESCE(SUM(hours),0)            AS total_ot_hours,
       COALESCE(SUM(pieces_completed),0) AS total_ot_pieces,
       COALESCE(SUM(amount),0)           AS total_ot_pay
     FROM overtime
     WHERE employee_id=? AND MONTH(date)=? AND YEAR(date)=?`,
    [empId, m, y]
  );
  return row;
}

async function fetchExtraTime(empId, m, y) {
  const [[row]] = await db.query(
    `SELECT
       COALESCE(SUM(hours),0)  AS total_et_hours,
       COALESCE(SUM(amount),0) AS total_et_pay
     FROM extra_time
     WHERE employee_id=? AND MONTH(date)=? AND YEAR(date)=?`,
    [empId, m, y]
  );
  return row;
}

async function fetchPieces(empId, m, y) {
  const [[row]] = await db.query(
    `SELECT COALESCE(SUM(pieces_completed),0) AS total_pieces
     FROM overtime
     WHERE employee_id=? AND MONTH(date)=? AND YEAR(date)=?`,
    [empId, m, y]
  );
  return parseInt(row.total_pieces) || 0;
}

router.get('/dashboard', async (req, res) => {
  try {
    const m = new Date().getMonth() + 1;
    const y = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM employees WHERE status='active'"
    );

    const [[todayAtt]] = await db.query(
      `SELECT
         COALESCE(SUM(status='present'),0)  AS present,
         COALESCE(SUM(status='absent'),0)   AS absent,
         COALESCE(SUM(status='half_day'),0) AS half_day,
         COALESCE(SUM(status='on_leave'),0) AS on_leave
       FROM attendance WHERE date=?`,
      [today]
    );

    const [activeEmps] = await db.query(
      "SELECT * FROM employees WHERE status='active'"
    );
    const wd = getWorkingDays(m, y);
    let monthlyExpense = 0;
    for (const emp of activeEmps) {
      const att    = await fetchAttendance(emp.id, m, y);
      const ot     = await fetchOvertime(emp.id, m, y);
      const et     = await fetchExtraTime(emp.id, m, y);
      const pieces = await fetchPieces(emp.id, m, y);
      const sal    = calculateSalary(emp, { ...att, pieces_completed: pieces }, ot, wd, et);
      monthlyExpense += sal.net_salary;
    }

    const [alerts] = await db.query(
      `SELECT e.name, e.employee_id AS emp_code, COUNT(*) AS absent_count
       FROM attendance a JOIN employees e ON a.employee_id=e.id
       WHERE a.status='absent' AND MONTH(a.date)=? AND YEAR(a.date)=?
         AND e.status='active'
       GROUP BY e.id HAVING absent_count>=5
       ORDER BY absent_count DESC`,
      [m, y]
    );

    const [[{ count: pending_leaves }]] = await db.query(
      "SELECT COUNT(*) AS count FROM leaves WHERE status='pending'"
    );

    return ok(res, {
      total_employees:  total,
      today_attendance: todayAtt,
      monthly_expense:  Math.round(monthlyExpense * 100) / 100,
      absence_alerts:   alerts,
      pending_leaves,
    });
  } catch (err) {
    console.error('[salary/dashboard]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.get('/calculate/:employee_id', async (req, res) => {
  try {
    const m = parseInt(req.query.month) || new Date().getMonth() + 1;
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const [[emp]] = await db.query('SELECT * FROM employees WHERE id=?', [req.params.employee_id]);
    if (!emp) return fail(res, 'Employee not found.', 404);
    const att    = await fetchAttendance(emp.id, m, y);
    const ot     = await fetchOvertime(emp.id, m, y);
    const et     = await fetchExtraTime(emp.id, m, y);
    const pieces = await fetchPieces(emp.id, m, y);
    const wd     = getWorkingDays(m, y);
    const salary = calculateSalary(emp, { ...att, pieces_completed: pieces }, ot, wd, et);
    return ok(res, {
      employee: { id: emp.id, name: emp.name, employee_id: emp.employee_id, role: emp.role },
      month: m, year: y, working_days_in_month: wd, salary,
    });
  } catch (err) {
    console.error('[salary/calculate]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.get('/payroll', async (req, res) => {
  try {
    const m = parseInt(req.query.month) || new Date().getMonth() + 1;
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const [employees] = await db.query("SELECT * FROM employees WHERE status='active'");
    const wd = getWorkingDays(m, y);
    const payroll = [];
    let totalExpense = 0;
    for (const emp of employees) {
      const att    = await fetchAttendance(emp.id, m, y);
      const ot     = await fetchOvertime(emp.id, m, y);
      const et     = await fetchExtraTime(emp.id, m, y);
      const pieces = await fetchPieces(emp.id, m, y);
      const salary = calculateSalary(emp, { ...att, pieces_completed: pieces }, ot, wd, et);
      totalExpense += salary.net_salary;
      payroll.push({
        employee: {
          id: emp.id, name: emp.name, employee_id: emp.employee_id,
          role: emp.role, salary_type: emp.salary_type,
        },
        salary,
      });
    }
    return ok(res, {
      month: m, year: y, working_days: wd,
      total_employees: payroll.length,
      total_expense: Math.round(totalExpense * 100) / 100,
      payroll,
    });
  } catch (err) {
    console.error('[salary/payroll]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.post('/log', async (req, res) => {
  try {
    const { employee_id, month, year, salary_data, notes } = req.body;
    if (!employee_id || !month || !year || !salary_data)
      return fail(res, 'employee_id, month, year, salary_data are required.');
    const s = salary_data;
    await db.query(
      `INSERT INTO salary_logs
         (employee_id,month,year,base_pay,days_worked,hours_worked,
          pieces_completed,overtime_pay,extratime_pay,leave_deduction,
          gross_salary,net_salary,status,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'paid',?)
       ON DUPLICATE KEY UPDATE
         base_pay=VALUES(base_pay), days_worked=VALUES(days_worked),
         overtime_pay=VALUES(overtime_pay), extratime_pay=VALUES(extratime_pay),
         leave_deduction=VALUES(leave_deduction),
         gross_salary=VALUES(gross_salary), net_salary=VALUES(net_salary),
         status='paid', notes=VALUES(notes)`,
      [employee_id, month, year, s.base_pay, s.present_days,
       s.total_hours, s.pieces_completed, s.overtime_pay, s.extratime_pay,
       s.leave_deduction, s.gross_salary, s.net_salary, notes||null]
    );
    return ok(res, null, 'Salary marked as paid.');
  } catch (err) {
    console.error('[salary/log]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { employee_id, month, year } = req.query;
    let sql = `
      SELECT sl.*, e.name AS employee_name, e.employee_id AS emp_code
      FROM salary_logs sl JOIN employees e ON sl.employee_id=e.id
      WHERE 1=1`;
    const p = [];
    if (employee_id) { sql += ' AND sl.employee_id=?'; p.push(employee_id); }
    if (month)       { sql += ' AND sl.month=?';        p.push(month); }
    if (year)        { sql += ' AND sl.year=?';         p.push(year); }
    sql += ' ORDER BY sl.year DESC, sl.month DESC';
    const [rows] = await db.query(sql, p);
    return ok(res, rows);
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

module.exports = router;