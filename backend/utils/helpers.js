function getWorkingDays(month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) count++;
  }
  return count;
}

function calculateSalary(employee, attendance, overtime, workingDays, extratime = { total_et_pay: 0, total_et_hours: 0 }) {
  const bp = parseFloat(employee.base_pay);
  const {
    present_days = 0,
    half_days    = 0,
    leave_days   = 0,
    absent_days  = 0,
    total_hours  = 0,
    pieces_completed = 0,
  } = attendance;

  // Use direct user-entered amounts from overtime and extratime records
  const overtime_pay = parseFloat(overtime.total_ot_pay) || 0;
  const extratime_pay = parseFloat(extratime.total_et_pay) || 0;

  let base_earned     = 0;
  let leave_deduction = 0;

  switch (employee.salary_type) {
    case 'monthly': {
      const daily  = bp / workingDays;
      leave_deduction = absent_days * daily;
      const effective = present_days + half_days * 0.5 + leave_days;
      base_earned     = Math.min(bp, effective * daily);
      break;
    }
    case 'daily': {
      const effective = present_days + half_days * 0.5;
      base_earned     = effective * bp;
      break;
    }
    case 'hourly': {
      base_earned  = total_hours * bp;
      break;
    }
    case 'piece': {
      base_earned  = pieces_completed * bp;
      break;
    }
    default:
      base_earned = bp;
  }

  const gross = base_earned + overtime_pay + extratime_pay;
  const net   = Math.max(0, gross - leave_deduction);

  return {
    salary_type:      employee.salary_type,
    base_pay:         round2(bp),
    base_earned:      round2(base_earned),
    overtime_pay:     round2(overtime_pay),
    extratime_pay:    round2(extratime_pay),
    leave_deduction:  round2(leave_deduction),
    gross_salary:     round2(gross),
    net_salary:       round2(net),
    present_days,
    half_days,
    leave_days,
    absent_days,
    total_hours:      round2(total_hours),
    pieces_completed: parseInt(pieces_completed),
    total_ot_hours:   round2(overtime.total_ot_hours || 0),
    total_ot_pieces:  parseInt(overtime.total_ot_pieces || 0),
    total_et_hours:   round2(extratime.total_et_hours || 0),
    working_days:     workingDays,
  };
}

function round2(n) {
  return Math.round((parseFloat(n) || 0) * 100) / 100;
}

function ok(res, data, msg = 'Success', code = 200) {
  return res.status(code).json({ success: true, message: msg, data });
}

function fail(res, msg = 'Error', code = 400) {
  return res.status(code).json({ success: false, message: msg });
}

module.exports = { getWorkingDays, calculateSalary, ok, fail };