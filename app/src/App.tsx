import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { employeeApi } from '@/services/api';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';

const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })));
const EmployeeDashboard = lazy(() => import('@/pages/Employee/Dashboard').then((module) => ({ default: module.EmployeeDashboard })));
const WorkSummary = lazy(() => import('@/pages/Employee/WorkSummary').then((module) => ({ default: module.WorkSummary })));
const ManagerDashboard = lazy(() => import('@/pages/Manager/Dashboard').then((module) => ({ default: module.ManagerDashboard })));
const Analytics = lazy(() => import('@/pages/Manager/Analytics').then((module) => ({ default: module.Analytics })));
const GMAnalytics = lazy(() => import('@/pages/GM/Analytics').then((module) => ({ default: module.GMAnalytics })));
const EmployeePerformanceHistory = lazy(() => import('@/pages/Manager/EmployeePerformanceHistory').then((module) => ({ default: module.EmployeePerformanceHistory })));
const TeamList = lazy(() => import('@/pages/Manager/TeamList').then((module) => ({ default: module.TeamList })));
const HRDashboard = lazy(() => import('@/pages/HR/Dashboard').then((module) => ({ default: module.HRDashboard })));
const AssessmentConfig = lazy(() => import('@/pages/HR/AssessmentConfig').then((module) => ({ default: module.AssessmentConfig })));
const DataImportExport = lazy(() => import('@/pages/HR/DataImportExport').then((module) => ({ default: module.DataImportExport })));
const MonthlyAutomation = lazy(() => import('@/pages/HR/MonthlyAutomation'));
const MonthlyStars = lazy(() => import('@/pages/HR/MonthlyStars'));
const LogManagement = lazy(() => import('@/pages/HR/LogManagement'));
const HRSatisfactionSurvey = lazy(() => import('@/pages/HR/SatisfactionSurvey'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const ROLE_HOME: Record<string, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  gm: '/gm/analytics',
  hr: '/hr/dashboard',
  admin: '/hr/dashboard',
};

function getHomeForUser(user: any): string {
  if (!user?.role) return '/employee/dashboard';
  const canManageTeam = Boolean(user?.capabilities?.canManageTeam);
  if ((user.role === 'employee' || user.role === 'manager') && canManageTeam) {
    return '/manager/dashboard';
  }
  if (user.role === 'manager' && !canManageTeam) {
    return '/employee/dashboard';
  }
  return ROLE_HOME[user.role] || '/employee/dashboard';
}

// Protected layout wrapper: checks auth + role, renders <Layout><Outlet /></Layout>
function ProtectedLayout({ allowedRoles }: { allowedRoles: Array<'employee' | 'manager' | 'gm' | 'hr' | 'admin'> }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  const canManageTeam = Boolean(user?.capabilities?.canManageTeam);
  const effectiveRoles = Array.isArray(user?.roles) && user.roles.length > 0
    ? [...user.roles]
    : user?.role
      ? [user.role]
      : [];
  if (canManageTeam && !effectiveRoles.includes('manager')) effectiveRoles.push('manager');
  if ((user?.role === 'manager' || user?.capabilities?.canSubmitSelfSummary) && !effectiveRoles.includes('employee')) {
    effectiveRoles.push('employee');
  }
  if (location.pathname.startsWith('/manager') && !canManageTeam) {
    return <Navigate to={getHomeForUser(user)} replace />;
  }
  const hasAllowedRole = effectiveRoles.some((role) => allowedRoles.includes(role as any));
  if (!user?.role || !hasAllowedRole) return <Navigate to={getHomeForUser(user)} replace />;

  return (
    <Layout role={user.role as any}>
      <Outlet />
    </Layout>
  );
}

// Public route: redirect authenticated users to their dashboard
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) return <Navigate to={getHomeForUser(user)} replace />;
  return <>{children}</>;
}

// Protected route: redirect non-authenticated users to login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
}

// Wrapper: fetch employee info from route params for performance history
function EmployeePerformanceHistoryWrapper() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<{ name: string; level: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    employeeApi.getById(employeeId)
      .then((response) => {
        if (response.success && response.data) {
          setEmployee({ name: response.data.name, level: response.data.level || 'intermediate' });
        } else {
          setError('员工信息加载失败');
        }
      })
      .catch((err) => setError(err.message || '网络错误'))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (!employeeId) return <div className="p-4 text-center text-gray-500">员工ID未找到</div>;
  if (loading) return <div className="p-4 text-center text-gray-500">加载中...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!employee) return <div className="p-4 text-center text-gray-500">员工不存在</div>;

  return (
    <EmployeePerformanceHistory
      employeeId={employeeId}
      employeeName={employee.name}
      employeeLevel={employee.level}
    />
  );
}

function App() {
  const { isAuthenticated, token, refreshCurrentUser, logout } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setAuthChecked(true);
      return;
    }

    refreshCurrentUser()
      .catch(() => {
        logout();
      })
      .finally(() => setAuthChecked(true));
  }, [isAuthenticated, token, refreshCurrentUser, logout]);

  if (!authChecked) {
    return <div className="p-4 text-center text-gray-500">正在校验登录状态...</div>;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<div className="p-4 text-center text-gray-500">页面加载中...</div>}>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        {/* Employee routes */}
        <Route element={<ProtectedLayout allowedRoles={['employee']} />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        </Route>

        {/* 参与考核人员月度总结：入口按 canSubmitSelfSummary 能力控制，路由本身允许已登录角色进入并在页面内兜底提示 */}
        <Route element={<ProtectedLayout allowedRoles={['employee', 'manager', 'gm', 'hr', 'admin']} />}>
          <Route path="/employee/summary" element={<WorkSummary />} />
        </Route>

        {/* Manager routes */}
        <Route element={<ProtectedLayout allowedRoles={['manager', 'gm']} />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/team" element={<TeamList />} />
          <Route path="/manager/employee/:employeeId" element={<EmployeePerformanceHistoryWrapper />} />
          <Route path="/manager/analytics" element={<Analytics />} />
        </Route>

        {/* GM routes */}
        <Route element={<ProtectedLayout allowedRoles={['gm']} />}>
          <Route path="/gm/analytics" element={<GMAnalytics />} />
        </Route>

        {/* HR routes */}
        <Route element={<ProtectedLayout allowedRoles={['hr', 'admin']} />}>
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/analytics" element={<GMAnalytics />} />
          <Route path="/hr/data-io" element={<DataImportExport />} />
          <Route path="/hr/assessment-config" element={<AssessmentConfig />} />
          <Route path="/hr/assessment-scope" element={<AssessmentConfig defaultTab="scope" />} />
          <Route path="/hr/assessment-templates" element={<AssessmentConfig defaultTab="templates" />} />
          <Route path="/hr/monthly-stars" element={<MonthlyStars />} />
          <Route path="/hr/satisfaction-survey" element={<HRSatisfactionSurvey />} />
          <Route path="/hr/monthly-automation" element={<MonthlyAutomation />} />
          <Route path="/hr/logs" element={<LogManagement />} />
        </Route>

        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
