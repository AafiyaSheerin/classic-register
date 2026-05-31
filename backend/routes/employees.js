const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status, salary_type } = req.query;
    let sql = 'SELECT * FROM employees WHERE 1=1';
    const p = [];
    if (search) {
      sql += ' AND (name LIKE ? OR employee_id LIKE ? OR role LIKE ?)';
      const like = `%${search}%`;
      p.push(like, like, like);
    }
    if (status)      { sql += ' AND status = ?';      p.push(status); }
    if (salary_type) { sql += ' AND salary_type = ?'; p.push(salary_type); }
    sql += ' ORDER BY name ASC';
    const [rows] = await db.query(sql, p);
    return ok(res, rows);
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [[emp]] = await db.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!emp) return fail(res, 'Employee not found.', 404);
    return ok(res, emp);
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      employee_id, name, role, department = 'Embroidery',
      phone, email, address, salary_type, base_pay, join_date,
    } = req.body;

    if (!employee_id || !name || !role || !salary_type || !base_pay || !join_date)
      return fail(res, 'employee_id, name, role, salary_type, base_pay, join_date are required.');

    const [[dup]] = await db.query(
      'SELECT id FROM employees WHERE employee_id = ?', [employee_id]
    );
    if (dup) return fail(res, 'Employee ID already exists.', 409);

    const [result] = await db.query(
      `INSERT INTO employees
        (employee_id,name,role,department,phone,email,address,salary_type,base_pay,join_date)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [employee_id, name, role, department,
       phone||null, email||null, address||null,
       salary_type, base_pay, join_date]
    );
    const [[emp]] = await db.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    return ok(res, emp, 'Employee created.', 201);
  } catch (err) {
    console.error('[employees POST]', err.message);
    return fail(res, 'Server error.', 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const [[existing]] = await db.query('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return fail(res, 'Employee not found.', 404);

    const {
      name, role, department, phone, email,
      address, salary_type, base_pay, join_date, status,
    } = req.body;

    await db.query(
      `UPDATE employees
       SET name=?,role=?,department=?,phone=?,email=?,address=?,
           salary_type=?,base_pay=?,join_date=?,status=?,updated_at=NOW()
       WHERE id=?`,
      [name, role, department, phone||null, email||null, address||null,
       salary_type, base_pay, join_date, status||'active', req.params.id]
    );
    const [[emp]] = await db.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    return ok(res, emp, 'Employee updated.');
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [[existing]] = await db.query('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) return fail(res, 'Employee not found.', 404);
    await db.query("UPDATE employees SET status='inactive' WHERE id=?", [req.params.id]);
    return ok(res, null, 'Employee deactivated.');
  } catch (err) {
    return fail(res, 'Server error.', 500);
  }
});

module.exports = router;