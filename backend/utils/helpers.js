function getWorkingDays(month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) count++;
  }
  return count;
}

function calculateSalary(employee, attendance, overtime, workingDays) {
  const bp = parseFloat(employee.base_pay);
  const {
    present_days = 0,
    half_days    = 0,
    leave_days   = 0,
    absent_days  = 0,
    total_hours  = 0,
    pieces_completed = 0,
  } = attendance;

  const {
    total_ot_hours      = 0,
    total_ot_pieces     = 0,
    avg_rate_multiplier = 1.5,
  } = overtime;

  let base_earned     = 0;
  let overtime_pay    = 0;
  let leave_deduction = 0;

  switch (employee.salary_type) {
    case 'monthly': {
      const daily  = bp / workingDays;
      const hourly = bp / (workingDays * 8);
      leave_deduction = absent_days * daily;
      const effective = present_days + half_days * 0.5 + leave_days;
      base_earned     = Math.min(bp, effective * daily);
      overtime_pay    = total_ot_hours * hourly * avg_rate_multiplier;
      break;
    }
    case 'daily': {
      const effective = present_days + half_days * 0.5;
      base_earned     = effective * bp;
      overtime_pay    = total_ot_hours * (bp / 8) * avg_rate_multiplier;
      break;
    }
    case 'hourly': {
      base_earned  = total_hours * bp;
      overtime_pay = total_ot_hours * bp * avg_rate_multiplier;
      break;
    }
    case 'piece': {
      base_earned  = pieces_completed * bp;
      overtime_pay = total_ot_pieces * bp * avg_rate_multiplier;
      break;
    }
    default:
      base_earned = bp;
  }

  const gross = base_earned + overtime_pay;
  const net   = Math.max(0, gross - leave_deduction);

  return {
    salary_type:      employee.salary_type,
    base_pay:         round2(bp),
    base_earned:      round2(base_earned),
    overtime_pay:     round2(overtime_pay),
    leave_deduction:  round2(leave_deduction),
    gross_salary:     round2(gross),
    net_salary:       round2(net),
    present_days,
    half_days,
    leave_days,
    absent_days,
    total_hours:      round2(total_hours),
    pieces_completed: parseInt(pieces_completed),
    total_ot_hours:   round2(total_ot_hours),
    total_ot_pieces:  parseInt(total_ot_pieces),
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