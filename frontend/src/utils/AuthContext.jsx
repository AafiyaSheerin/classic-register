import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cr_token');
    if (!token) { setLoading(false); return; }

    authApi.me()
      .then(r => setUser(r.data))
      .catch(() => localStorage.removeItem('cr_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const r = await authApi.login({ username, password });
    if (r.success) {
      localStorage.setItem('cr_token', r.data.token);
      setUser(r.data.user);
    }
    return r;
  }

  async function employeeLogin(employee_id, password) {
    const r = await authApi.employeeLogin({ employee_id, password });
    if (r.success) {
      localStorage.setItem('cr_token', r.data.token);
      setUser(r.data.user);
    }
    return r;
  }

  function logout() {
    localStorage.removeItem('cr_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, employeeLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}