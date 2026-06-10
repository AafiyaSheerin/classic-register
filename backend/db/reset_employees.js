require('dotenv').config();
const pool = require('./connection');

const employees = [
  { employee_id: 'EMP001', name: 'Devaraj', role: 'Embroiderer', department: 'Embroidery', salary_type: 'monthly', base_pay: 23000.00, join_date: '2022-01-15' },
  { employee_id: 'EMP002', name: 'Hari', role: 'Worker', department: 'Embroidery', salary_type: 'monthly', base_pay: 18500.00, join_date: '2022-03-20' },
  { employee_id: 'EMP003', name: 'Meganathan', role: 'worker', department: 'Embroidery', salary_type: 'monthly', base_pay: 20500.00, join_date: '2022-06-01' },
  { employee_id: 'EMP004', name: 'Venkatesan', role: 'embroiderer', department: 'Embroidery', salary_type: 'monthly', base_pay: 18500.00, join_date: '2023-01-10' },
  { employee_id: 'EMP005', name: 'Nanda kumar', role: 'Embroiderer', department: 'Embroidery', salary_type: 'monthly', base_pay: 18500.00, join_date: '2021-11-05' },
  { employee_id: 'EMP006', name: 'Santha', role: 'Embroidere', department: 'Embroidery', salary_type: 'monthly', base_pay: 14000.00, join_date: '2026-06-09' },
  { employee_id: 'EMP007', name: 'Dhas', role: 'Embroiderer', department: 'Embroidery', salary_type: 'monthly', base_pay: 16000.00, join_date: '2026-06-09' }
];

async function resetDatabase() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting database reset...');
    await connection.beginTransaction();

    // Disable foreign key checks temporarily to safely truncate/delete
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Truncate tables to clear all dummy/existing data
    const tablesToTruncate = [
      'loan_deductions',
      'loans',
      'extra_time',
      'overtime',
      'leaves',
      'attendance',
      'salary_logs',
      'employees'
    ];

    for (const table of tablesToTruncate) {
      console.log(`Truncating table ${table}...`);
      await connection.query(`TRUNCATE TABLE ${table}`);
    }

    // Insert the new employees
    console.log('Inserting new employees...');
    const insertQuery = `
      INSERT INTO employees (employee_id, name, role, department, salary_type, base_pay, join_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    for (const emp of employees) {
      await connection.query(insertQuery, [
        emp.employee_id,
        emp.name,
        emp.role,
        emp.department,
        emp.salary_type,
        emp.base_pay,
        emp.join_date
      ]);
      console.log(`Inserted: ${emp.employee_id} - ${emp.name}`);
    }

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.commit();
    console.log('🎉 Database reset completed successfully!');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error resetting database:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

resetDatabase();
