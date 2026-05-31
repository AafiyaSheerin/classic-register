const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('cr_token');
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  delete: (path)       => request('DELETE', path),
};

export const authApi = {
  login:                 (creds) => api.post('/auth/login', creds),
  employeeLogin:         (creds) => api.post('/auth/employee-login', creds),
  me:                    ()      => api.get('/auth/me'),
  changePassword:        (body)  => api.post('/auth/change-password', body),
  changeEmpPassword:     (body)  => api.post('/auth/change-employee-password', body),
};

export const employeeApi = {
  list:   (params = {}) => api.get('/employees?' + new URLSearchParams(params)),
  get:    (id)          => api.get(`/employees/${id}`),
  create: (body)        => api.post('/employees', body),
  update: (id, body)    => api.put(`/employees/${id}`, body),
  remove: (id)          => api.delete(`/employees/${id}`),
};

export const attendanceApi = {
  list:           (params = {}) => api.get('/attendance?' + new URLSearchParams(params)),
  today:          (date)        => api.get('/attendance/today' + (date ? `?date=${date}` : '')),
  monthlySummary: (m, y)        => api.get(`/attendance/monthly-summary?month=${m}&year=${y}`),
  alerts:         ()            => api.get('/attendance/alerts'),
  mark:           (body)        => api.post('/attendance', body),
  bulkMark:       (body)        => api.post('/attendance/bulk', body),
  remove:         (id)          => api.delete(`/attendance/${id}`),
};

export const leaveApi = {
  list:    (params = {}) => api.get('/leaves?' + new URLSearchParams(params)),
  balance: (empId)       => api.get(`/leaves/balance/${empId}`),
  apply:   (body)        => api.post('/leaves', body),
  approve: (id, note)    => api.put(`/leaves/${id}/approve`, { approval_note: note }),
  reject:  (id, note)    => api.put(`/leaves/${id}/reject`,  { approval_note: note }),
  cancel:  (id)          => api.delete(`/leaves/${id}`),
};

export const overtimeApi = {
  list:    (params = {}) => api.get('/overtime?' + new URLSearchParams(params)),
  summary: (m, y)        => api.get(`/overtime/summary?month=${m}&year=${y}`),
  save:    (body)        => api.post('/overtime', body),
  update:  (id, body)    => api.put(`/overtime/${id}`, body),
  remove:  (id)          => api.delete(`/overtime/${id}`),
};

export const salaryApi = {
  dashboard:  ()         => api.get('/salary/dashboard'),
  calculate:  (id, m, y) => api.get(`/salary/calculate/${id}?month=${m}&year=${y}`),
  payroll:    (m, y)     => api.get(`/salary/payroll?month=${m}&year=${y}`),
  log:        (body)     => api.post('/salary/log', body),
  logs:       (params)   => api.get('/salary/logs?' + new URLSearchParams(params)),
};