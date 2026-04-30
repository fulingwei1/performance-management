import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { employeeApi } from '@/services/api';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';

const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })));
const EmployeeDashboard = lazy(() => import('@/pages/Employee/Dashboard').then((module) => ({ default: module.EmployeeDashboard })));
const WorkSummary = lazy(() => import('@/pages/Employee/WorkSummary').then((module) => ({ default: module.WorkSummary })));
const MyScores = lazy(() => import('@/pages/Employee/MyScores').then((module) => ({ default: module.MyScores })));
const ManagerDashboard = lazy(() => import('@/pages/Manager/Dashboard').then((module) => ({ default: module.ManagerDashboard })));
const ScoringManagement = lazy(() => import('@/pages/Manager/Scoring').then((module) => ({ default: module.ScoringManagement })));
const DifferentiatedScoring = lazy(() => import('@/pages/Manager/DifferentiatedScoring').then((module) => ({ default: module.DifferentiatedScoring })));
const UnifiedAssessment = lazy(() => import('@/pages/Manager/UnifiedAssessment').then((module) => ({ default: module.UnifiedAssessment })));
const Analytics = lazy(() => import('@/pages/Manager/Analytics').then((module) => ({ default: module.Analytics })));
const QuarterlySummary = lazy(() => import('@/pages/Manager/QuarterlySummary').then((module) => ({ default: module.QuarterlySummary })));
const GMAnalytics = lazy(() => import('@/pages/GM/Analytics').then((module) => ({ default: module.GMAnalytics })));
const EmployeePerformanceHistory = lazy(() => import('@/pages/Manager/EmployeePerformanceHistory').then((module) => ({ default: module.EmployeePerformanceHistory })));
const TeamList = lazy(() => import('@/pages/Manager/TeamList').then((module) => ({ default: module.TeamList })));
const GMDashboard = lazy(() => import('@/pages/GM/Dashboard').then((module) => ({ default: module.GMDashboard })));
const GMScoring = lazy(() => import('@/pages/GM/Scoring').then((module) => ({ default: module.GMScoring })));
const GMDataExport = lazy(() => import('@/pages/GM/GMDataExport').then((module) => ({ default: module.GMDataExport })));
const HRDashboard = lazy(() => import('@/pages/HR/Dashboard').then((module) => ({ default: module.HRDashboard })));
const AssessmentPublication = lazy(() => import('@/pages/HR/AssessmentPublication').then((module) => ({ default: module.AssessmentPublication })));
const MyKPI = lazy(() => import('@/pages/Employee/MyKPI').then((module) => ({ default: module.MyKPI })));
const MonthlyReport = lazy(() => import('@/pages/Employee/MonthlyReport').then((module) => ({ default: module.MonthlyReport })));
const ReviewReports = lazy(() => import('@/pages/Manager/ReviewReports').then((module) => ({ default: module.ReviewReports })));
const AssessmentConfig = lazy(() => import('@/pages/HR/AssessmentConfig').then((module) => ({ default: module.AssessmentConfig })));
const DataImportExport = lazy(() => import('@/pages/HR/DataImportExport').then((module) => ({ default: module.DataImportExport })));
const MonthlyAutomation = lazy(() => import('@/pages/HR/MonthlyAutomation'));
const HRSystemSettings = lazy(() => import('@/pages/HR/SystemSettings').then((module) => ({ default: module.SystemSettings })));
const UserManagement = lazy(() => import('@/pages/Admin/UserManagement').then((module) => ({ default: module.UserManagement })));
const MobileDemo = lazy(() => import('@/pages/MobileDemo').then((module) => ({ default: module.MobileDemo })));

const ROLE_HOME: Record<string, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  gm: '/gm/dashboard',
  hr: '/hr/dashboard',
  admin: '/admin/dashboard',
};

const DISABLED_FEATURE_PATHS = [
  '/notifications',
  '/employee/assignments',
  '/employee/related-okr',
  '/employee/my-objectives',
  '/employee/objectives',
  '/employee/goal-planning',
  '/employee/goal-setting',
  '/employee/goal-confirmation',
  '/employee/goal-progress',
  '/manager/team-objectives',
  '/manager/goal-approval',
  '/manager/goal-dashboard',
  '/manager/goal-setting',
  '/manager/goal-progress',
  '/manager/objectives',
  '/gm/strategic-overview',
  '/gm/strategic-goals',
  '/gm/objectives',
  '/gm/goal-setting',
  '/gm/goal-progress',
  '/hr/strategic-objectives',
  '/hr/okr-dashboard',
  '/hr/objectives',
  '/hr/goal-setting',
  '/hr/goal-progress',
  '/admin/strategic-objectives',
  '/admin/okr-dashboard',
  '/admin/objectives',
  '/admin/goal-setting',
  '/admin/goal-progress',
  '/employee/appeals',
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
  '/manager/template-assignment',
];

// Protected layout wrapper: checks auth + role, renders <Layout><Outlet /></Layout>
function ProtectedLayout({ allowedRole }: { allowedRole: 'employee' | 'manager' | 'gm' | 'hr' | 'admin' }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== allowedRole) return <Navigate to={ROLE_HOME[user?.role || 'employee']} replace />;

  return (
    <Layout role={allowedRole}>
      <Outlet />
    </Layout>
  );
}

// Public route: redirect authenticated users to their dashboard
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) return <Navigate to={ROLE_HOME[user?.role || 'employee']} replace />;
  return <>{children}</>;
}

// Protected route: redirect non-authenticated users to login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DisabledFeatureRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={ROLE_HOME[user?.role || 'employee']} replace />;
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
        <Route element={<ProtectedLayout allowedRole="employee" />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/summary" element={<WorkSummary />} />
          <Route path="/employee/scores" element={<MyScores />} />
          <Route path="/employee/unified-assessment" element={<UnifiedAssessment />} />
          <Route path="/employee/kpi" element={<MyKPI />} />
          <Route path="/employee/monthly-report" element={<MonthlyReport />} />
        </Route>

        {/* Manager routes */}
        <Route element={<ProtectedLayout allowedRole="manager" />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/team" element={<TeamList />} />
          <Route path="/manager/scoring" element={<ScoringManagement />} />
          <Route path="/manager/differentiated-scoring" element={<DifferentiatedScoring />} />
          <Route path="/manager/unified-assessment" element={<UnifiedAssessment />} />
          <Route path="/manager/employee/:employeeId" element={<EmployeePerformanceHistoryWrapper />} />
          <Route path="/manager/analytics" element={<Analytics />} />
          <Route path="/manager/quarterly-summary" element={<QuarterlySummary />} />
          <Route path="/manager/review-reports" element={<ReviewReports />} />
        </Route>

        {/* GM routes */}
        <Route element={<ProtectedLayout allowedRole="gm" />}>
          <Route path="/gm/dashboard" element={<GMDashboard />} />
          <Route path="/gm/scoring" element={<GMScoring />} />
          <Route path="/gm/analytics" element={<GMAnalytics />} />
          <Route path="/gm/data-export" element={<GMDataExport />} />
        </Route>

        {/* HR routes */}
        <Route element={<ProtectedLayout allowedRole="hr" />}>
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/system-settings" element={<Navigate to="/hr/assessment-config" replace />} />
          <Route path="/hr/analytics" element={<GMAnalytics />} />
          <Route path="/hr/data-io" element={<DataImportExport />} />
          <Route path="/hr/data-import" element={<Navigate to="/hr/data-io" replace />} />
          <Route path="/hr/assessment-export" element={<Navigate to="/hr/data-io" replace />} />
          <Route path="/hr/assessment-publication" element={<AssessmentPublication />} />
          <Route path="/hr/assessment-config" element={<AssessmentConfig />} />
          <Route path="/hr/assessment-scope" element={<AssessmentConfig defaultTab="scope" />} />
          <Route path="/hr/assessment-templates" element={<Navigate to="/hr/assessment-config" replace />} />
          <Route path="/hr/metric-library" element={<Navigate to="/hr/assessment-config" replace />} />
          <Route path="/hr/monthly-automation" element={<MonthlyAutomation />} />
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedLayout allowedRole="admin" />}>
          <Route path="/admin/dashboard" element={<HRDashboard />} />
          <Route path="/admin/user-management" element={<UserManagement />} />
          <Route path="/admin/system-settings" element={<HRSystemSettings />} />
          <Route path="/admin/analytics" element={<GMAnalytics />} />
          <Route path="/admin/assessment-publication" element={<AssessmentPublication />} />
          <Route path="/admin/scoring" element={<GMScoring />} />
          <Route path="/admin/data-export" element={<GMDataExport />} />
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
