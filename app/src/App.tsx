import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { employeeApi } from '@/services/api';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';

const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })));
const ChangePassword = lazy(() => import('@/pages/ChangePassword').then((module) => ({ default: module.ChangePassword })));
const EmployeeDashboard = lazy(() => import('@/pages/Employee/Dashboard').then((module) => ({ default: module.EmployeeDashboard })));
const WorkSummary = lazy(() => import('@/pages/Employee/WorkSummary').then((module) => ({ default: module.WorkSummary })));
const EmployeeSatisfactionSurvey = lazy(() => import('@/pages/Employee/SatisfactionSurvey').then((module) => ({ default: module.SatisfactionSurvey })));
const ManagerDashboard = lazy(() => import('@/pages/Manager/Dashboard').then((module) => ({ default: module.ManagerDashboard })));
const Analytics = lazy(() => import('@/pages/Manager/Analytics').then((module) => ({ default: module.Analytics })));
const GMAnalytics = lazy(() => import('@/pages/GM/Analytics').then((module) => ({ default: module.GMAnalytics })));
const EmployeePerformanceHistory = lazy(() => import('@/pages/Manager/EmployeePerformanceHistory').then((module) => ({ default: module.EmployeePerformanceHistory })));
const TeamList = lazy(() => import('@/pages/Manager/TeamList').then((module) => ({ default: module.TeamList })));
const HRDashboard = lazy(() => import('@/pages/HR/Dashboard').then((module) => ({ default: module.HRDashboard })));
const AssessmentConfig = lazy(() => import('@/pages/HR/AssessmentConfig').then((module) => ({ default: module.AssessmentConfig })));
const DataImportExport = lazy(() => import('@/pages/HR/DataImportExport').then((module) => ({ default: module.DataImportExport })));
const UserManagement = lazy(() => import('@/pages/Admin/UserManagement').then((module) => ({ default: module.UserManagement })));
const MonthlyAutomation = lazy(() => import('@/pages/HR/MonthlyAutomation'));
const MonthlyStars = lazy(() => import('@/pages/HR/MonthlyStars'));
const LogManagement = lazy(() => import('@/pages/HR/LogManagement'));
const HRSatisfactionSurvey = lazy(() => import('@/pages/HR/SatisfactionSurvey'));
const MobileDemo = lazy(() => import('@/pages/MobileDemo').then((module) => ({ default: module.MobileDemo })));

const ROLE_HOME: Record<string, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  gm: '/gm/analytics',
  hr: '/hr/dashboard',
  admin: '/hr/dashboard',
};

const DISABLED_FEATURE_PATHS = [
  '/notifications',
  '/employee/assignments',
  '/employee/goal-planning',
  '/employee/goal-setting',
  '/employee/goal-confirmation',
  '/employee/goal-progress',
  '/manager/goal-approval',
  '/manager/goal-dashboard',
  '/manager/goal-setting',
  '/manager/goal-progress',
  '/gm/goal-setting',
  '/gm/goal-progress',
  '/hr/goal-setting',
  '/hr/goal-progress',
  '/admin/goal-setting',
  '/admin/goal-progress',
  '/employee/appeals',
  '/employee/kpi',
  '/employee/monthly-report',
  '/employee/unified-assessment',
  '/manager/unified-assessment',
  '/manager/review-reports',
  '/manager/differentiated-scoring',
  '/manager/quarterly-summary',
  '/manager/interviews',
  '/manager/interview-plans',
  '/manager/interview-records',
  '/manager/appeals',
  '/hr/appeals',
  '/hr/department-tree',
  '/hr/organization-chart',
  '/employee/peer-review',
  '/manager/peer-review-management',
  '/hr/data-management',
  '/hr/department-classification',
  '/hr/peer-review-management',
  '/hr/performance-ranking-config',
  '/hr/task-freeze',
  '/hr/template-assignment-rules',
  '/admin/assessment-publication',
  '/admin/scoring',
];

// Protected layout wrapper: checks auth + role, renders <Layout><Outlet /></Layout>
function ProtectedLayout({ allowedRoles }: { allowedRoles: Array<'employee' | 'manager' | 'gm' | 'hr' | 'admin'> }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  const effectiveRoles = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles
    : user?.role
      ? [user.role]
      : [];
  const hasAllowedRole = effectiveRoles.some((role) => allowedRoles.includes(role as any));
  if (!user?.role || !hasAllowedRole) return <Navigate to={ROLE_HOME[user?.role || 'employee']} replace />;

  return (
    <Layout role={user.role as any}>
      <Outlet />
    </Layout>
  );
}

// Public route: redirect authenticated users to their dashboard
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user?.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (isAuthenticated) return <Navigate to={ROLE_HOME[user?.role || 'employee']} replace />;
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
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
}

function DisabledFeatureRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={ROLE_HOME[user?.role || 'employee']} replace />;
}

function RedirectToManagerDashboard() {
  const location = useLocation();
  const search = location.search || '';
  return <Navigate to={`/manager/dashboard${search}`} replace />;
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
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<div className="p-4 text-center text-gray-500">页面加载中...</div>}>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        } />
        
        {/* Mobile Demo - accessible to all authenticated users */}
        <Route path="/mobile-demo" element={
          <ProtectedRoute>
            <Layout>
              <MobileDemo />
            </Layout>
          </ProtectedRoute>
        } />

        {DISABLED_FEATURE_PATHS.map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute>
                <DisabledFeatureRedirect />
              </ProtectedRoute>
            }
          />
        ))}

        {/* Employee routes */}
        <Route element={<ProtectedLayout allowedRoles={['employee']} />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/scores" element={<Navigate to="/employee/dashboard" replace />} />
        </Route>

        {/* 参与考核人员月度总结：入口按 canSubmitSelfSummary 能力控制，路由本身允许已登录角色进入并在页面内兜底提示 */}
        <Route element={<ProtectedLayout allowedRoles={['employee', 'manager', 'gm', 'hr', 'admin']} />}>
          <Route path="/employee/summary" element={<WorkSummary />} />
        </Route>

        {/* 半年度满意度调查：所有已登录员工角色都可填写自己的答卷 */}
        <Route element={<ProtectedLayout allowedRoles={['employee', 'manager', 'gm', 'hr', 'admin']} />}>
          <Route path="/employee/satisfaction-survey" element={<EmployeeSatisfactionSurvey />} />
        </Route>

        {/* Manager routes */}
        <Route element={<ProtectedLayout allowedRoles={['manager', 'gm']} />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/team" element={<TeamList />} />
          <Route path="/manager/scoring" element={<RedirectToManagerDashboard />} />
          <Route path="/manager/template-config" element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="/manager/template-assignment" element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="/manager/assessment-templates" element={<Navigate to="/manager/dashboard" replace />} />
          <Route path="/manager/employee/:employeeId" element={<EmployeePerformanceHistoryWrapper />} />
          <Route path="/manager/analytics" element={<Analytics />} />
        </Route>

        {/* GM routes */}
        <Route element={<ProtectedLayout allowedRoles={['gm']} />}>
          <Route path="/gm/dashboard" element={<Navigate to="/gm/analytics" replace />} />
          <Route path="/gm/scoring" element={<Navigate to="/gm/analytics" replace />} />
          <Route path="/gm/analytics" element={<GMAnalytics />} />
          <Route path="/gm/data-export" element={<Navigate to="/gm/analytics" replace />} />
        </Route>

        {/* HR routes */}
        <Route element={<ProtectedLayout allowedRoles={['hr', 'admin']} />}>
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/system-settings" element={<Navigate to="/hr/assessment-config" replace />} />
          <Route path="/hr/analytics" element={<GMAnalytics />} />
          <Route path="/hr/data-io" element={<DataImportExport />} />
          <Route path="/hr/user-management" element={<UserManagement />} />
          <Route path="/hr/data-import" element={<Navigate to="/hr/data-io" replace />} />
          <Route path="/hr/assessment-export" element={<Navigate to="/hr/data-io" replace />} />
          <Route path="/hr/assessment-config" element={<AssessmentConfig />} />
          <Route path="/hr/assessment-scope" element={<AssessmentConfig defaultTab="scope" />} />
          <Route path="/hr/assessment-templates" element={<AssessmentConfig defaultTab="templates" />} />
          <Route path="/hr/monthly-stars" element={<MonthlyStars />} />
          <Route path="/hr/satisfaction-survey" element={<HRSatisfactionSurvey />} />
          <Route path="/hr/metric-library" element={<Navigate to="/hr/assessment-config" replace />} />
          <Route path="/hr/monthly-automation" element={<MonthlyAutomation />} />
          <Route path="/hr/logs" element={<LogManagement />} />
        </Route>

        <Route element={<ProtectedLayout allowedRoles={['hr', 'admin']} />}>
          <Route path="/hr/assessment-publication" element={<Navigate to="/hr/monthly-automation" replace />} />
        </Route>

        {/* HR/Admin merged routes */}
        <Route element={<ProtectedLayout allowedRoles={['hr', 'admin']} />}>
          <Route path="/admin/dashboard" element={<Navigate to="/hr/dashboard" replace />} />
          <Route path="/admin/user-management" element={<Navigate to="/hr/user-management" replace />} />
          <Route path="/admin/system-settings" element={<Navigate to="/hr/assessment-config" replace />} />
          <Route path="/admin/analytics" element={<Navigate to="/hr/analytics" replace />} />
          <Route path="/admin/data-export" element={<Navigate to="/hr/data-io" replace />} />
          <Route path="/admin/logs" element={<Navigate to="/hr/logs" replace />} />
        </Route>

        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
