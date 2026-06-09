import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './utils/AuthContext';
import { Layout }            from './components/Layout';
import { ToastContainer }    from './components/ui';
import { Spinner }           from './components/ui';
import { useToast }          from './hooks/useToast';
import { Login }             from './pages/Login';
import { Dashboard }         from './pages/Dashboard';
import { Employees }         from './pages/Employees';
import { Attendance }        from './pages/Attendance';
import { Leaves }            from './pages/Leaves';
import { Overtime }          from './pages/Overtime';
import { Salary }            from './pages/Salary';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { ExtraTime }         from './pages/ExtraTime';
import { Loans }             from './pages/Loans';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const ADMIN_PAGES = {
  dashboard:  Dashboard,
  employees:  Employees,
  attendance: Attendance,
  leaves:     Leaves,
  overtime:   Overtime,
  salary:     Salary,
  extratime:  ExtraTime,
  loans:      Loans,
};

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage]   = useState('dashboard');
  const { toasts, toast, remove } = useToast();

  if (loading) return <Spinner fullPage />;
  if (!user)   return <Login />;

  if (user.type === 'employee') {
    return (
      <>
        <EmployeeDashboard toast={toast} />
        <ToastContainer toasts={toasts} remove={remove} />
      </>
    );
  }

  const PageComponent = ADMIN_PAGES[page] || Dashboard;
  return (
    <>
      <Layout page={page} setPage={setPage}>
        <PageComponent toast={toast} setPage={setPage} />
      </Layout>
      <ToastContainer toasts={toasts} remove={remove} />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}