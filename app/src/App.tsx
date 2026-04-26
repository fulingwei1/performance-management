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
// HIDDEN: const EmployeePerformanceAppeals = lazy(() => import('@/pages/Employee/PerformanceAppeals').then((module) => ({ default: module.EmployeePerformanceAppeals })));
const ManagerDashboard = lazy(() => import('@/pages/Manager/Dashboard').then((module) => ({ default: module.ManagerDashboard })));
const ScoringManagement = lazy(() => import('@/pages/Manager/Scoring').then((module) => ({ default: module.ScoringManagement })));
const DifferentiatedScoring = lazy(() => import('@/pages/Manager/DifferentiatedScoring').then((module) => ({ default: module.DifferentiatedScoring })));
const Analytics = lazy(() => import('@/pages/Manager/Analytics').then((module) => ({ default: module.Analytics })));
const QuarterlySummary = lazy(() => import('@/pages/Manager/QuarterlySummary').then((module) => ({ default: module.QuarterlySummary })));
const GMAnalytics = lazy(() => import('@/pages/GM/Analytics').then((module) => ({ default: module.GMAnalytics })));
const PerformanceAnalytics = lazy(() => import('@/pages/Analytics/PerformanceAnalytics').then((module) => ({ default: module.PerformanceAnalytics })));
const EmployeeTrend = lazy(() => import('@/pages/Analytics/EmployeeTrend').then((module) => ({ default: module.EmployeeTrend })));
const EmployeePerformanceHistory = lazy(() => import('@/pages/Manager/EmployeePerformanceHistory').then((module) => ({ default: module.EmployeePerformanceHistory })));
const TeamList = lazy(() => import('@/pages/Manager/TeamList').then((module) => ({ default: module.TeamList })));
const GMDashboard = lazy(() => import('@/pages/GM/Dashboard').then((module) => ({ default: module.GMDashboard })));
const GMScoring = lazy(() => import('@/pages/GM/Scoring').then((module) => ({ default: module.GMScoring })));
const GMDataExport = lazy(() => import('@/pages/GM/GMDataExport').then((module) => ({ default: module.GMDataExport })));
const HRDashboard = lazy(() => import('@/pages/HR/Dashboard').then((module) => ({ default: module.HRDashboard })));
const EmployeeInfo = lazy(() => import('@/pages/HR/EmployeeInfo').then((module) => ({ default: module.EmployeeInfo })));
const DataManagement = lazy(() => import('@/pages/HR/DataManagement').then((module) => ({ default: module.DataManagement })));
// HIDDEN: const HRAppealsManagement = lazy(() => import('@/pages/HR/AppealsManagement').then((module) => ({ default: module.HRAppealsManagement })));
const AssessmentPublication = lazy(() => import('@/pages/HR/AssessmentPublication').then((module) => ({ default: module.AssessmentPublication })));
// HIDDEN: const ObjectiveTree = lazy(() => import('@/pages/OKR/ObjectiveTree').then((module) => ({ default: module.ObjectiveTree })));
// HIDDEN: const MyObjectives = lazy(() => import('@/pages/OKR/MyObjectives').then((module) => ({ default: module.MyObjectives })));
const MyKPI = lazy(() => import('@/pages/Employee/MyKPI').then((module) => ({ default: module.MyKPI })));
const MonthlyReport = lazy(() => import('@/pages/Employee/MonthlyReport').then((module) => ({ default: module.MonthlyReport })));
// HIDDEN: const TeamObjectives = lazy(() => import('@/pages/Manager/TeamObjectives').then((module) => ({ default: module.TeamObjectives })));
const ReviewReports = lazy(() => import('@/pages/Manager/ReviewReports').then((module) => ({ default: module.ReviewReports })));
// HIDDEN: const InterviewSchedule = lazy(() => import('@/pages/Manager/InterviewSchedule').then((module) => ({ default: module.InterviewSchedule })));
const PeerReview = lazy(() => import('@/pages/Employee/PeerReview').then((module) => ({ default: module.PeerReview })));
// HIDDEN: const InterviewPlans = lazy(() => import('@/pages/Manager/InterviewPlans').then((module) => ({ default: module.InterviewPlans })));
// HIDDEN: const InterviewRecord = lazy(() => import('@/pages/Manager/InterviewRecord').then((module) => ({ default: module.InterviewRecord })));
// HIDDEN: const GoalApproval = lazy(() => import('@/pages/Manager/GoalApproval'));
// HIDDEN: const GoalDashboard = lazy(() => import('@/pages/Manager/GoalDashboard'));
// HIDDEN: const AppealsReview = lazy(() => import('@/pages/Manager/AppealsReview').then((module) => ({ default: module.AppealsReview })));
// HIDDEN: const MyGoalPlanning = lazy(() => import('@/pages/Employee/MyGoalPlanning').then((module) => ({ default: module.MyGoalPlanning })));
// HIDDEN: const DepartmentTree = lazy(() => import('@/pages/HR/DepartmentTree').then((module) => ({ default: module.DepartmentTree })));
const DepartmentClassification = lazy(() => import('@/pages/HR/DepartmentClassification').then((module) => ({ default: module.DepartmentClassification })));
const AssessmentTemplates = lazy(() => import('@/pages/HR/AssessmentTemplates').then((module) => ({ default: module.AssessmentTemplates })));
const MetricLibraryManagement = lazy(() => import('@/pages/HR/MetricLibraryManagement').then((module) => ({ default: module.MetricLibraryManagement })));
const AssessmentExport = lazy(() => import('@/pages/HR/AssessmentExport').then((module) => ({ default: module.AssessmentExport })));
// HIDDEN: const OrganizationChart = lazy(() => import('@/pages/HR/OrganizationChart').then((module) => ({ default: module.OrganizationChart })));
const DataImport = lazy(() => import('@/pages/HR/DataImport').then((module) => ({ default: module.DataImport })));
const DataExport = lazy(() => import('@/pages/HR/DataExport').then((module) => ({ default: module.DataExport })));
const PeerReviewManagement = lazy(() => import('@/pages/HR/PeerReviewManagement').then((module) => ({ default: module.PeerReviewManagement })));
const PeerReviewManage = lazy(() => import('@/pages/Manager/PeerReviewManage').then((module) => ({ default: module.PeerReviewManage })));
const TaskFreezeManagement = lazy(() => import('@/pages/HR/TaskFreezeManagement').then((module) => ({ default: module.TaskFreezeManagement })));
const PerformanceRankingConfig = lazy(() => import('@/pages/HR/PerformanceRankingConfig').then((module) => ({ default: module.PerformanceRankingConfig })));
const SystemSettings = lazy(() => import('@/pages/Admin/SystemSettings').then((module) => ({ default: module.SystemSettings })));
const UserManagement = lazy(() => import('@/pages/Admin/UserManagement').then((module) => ({ default: module.UserManagement })));
// HIDDEN: const GoalSetting = lazy(() => import('@/pages/Goals/GoalSetting').then((module) => ({ default: module.GoalSetting })));
// HIDDEN: const GoalConfirmation = lazy(() => import('@/pages/Goals/GoalConfirmation').then((module) => ({ default: module.GoalConfirmation })));
// HIDDEN: const GoalProgressPage = lazy(() => import('@/pages/Goals/GoalProgress').then((module) => ({ default: module.GoalProgressPage })));
const ProgressDashboard = lazy(() => import('@/pages/Dashboard/ProgressDashboard'));
const MobileDemo = lazy(() => import('@/pages/MobileDemo').then((module) => ({ default: module.MobileDemo })));
const AIInsights = lazy(() => import('@/pages/ai/AIInsights').then((module) => ({ default: module.AIInsights })));

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
  '/employee/contract',
  '/employee/related-okr',
  '/employee/promotion',
  '/employee/my-bonus',
  '/employee/my-objectives',
  '/employee/objectives',
  '/employee/goal-planning',
  '/employee/goal-setting',
  '/employee/goal-confirmation',
  '/employee/goal-progress',
  '/manager/promotion',
  '/manager/team-objectives',
  '/manager/goal-approval',
  '/manager/goal-dashboard',
  '/manager/goal-setting',
  '/manager/goal-progress',
  '/manager/objectives',
  '/gm/promotion-approvals',
  '/gm/strategic-overview',
  '/gm/strategic-goals',
  '/gm/objectives',
  '/gm/goal-setting',
  '/gm/goal-progress',
  '/hr/promotion-approvals',
  '/hr/strategic-objectives',
  '/hr/contract-management',
  '/hr/okr-dashboard',
  '/hr/bonus-management',
  '/hr/objectives',
  '/hr/goal-setting',
  '/hr/goal-progress',
  '/admin/strategic-objectives',
  '/admin/contract-management',
  '/admin/okr-dashboard',
  '/admin/promotion-approvals',
  '/admin/bonus-management',
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
  '/admin/department-tree',
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
          {/* <Route path="/employee/goal-planning" element={<MyGoalPlanning />} /> */}
          <Route path="/employee/scores" element={<MyScores />} />
          {/* <Route path="/employee/objectives" element={<ObjectiveTree />} /> */}
          {/* <Route path="/employee/my-objectives" element={<MyObjectives />} /> */}
          <Route path="/employee/kpi" element={<MyKPI />} />
          <Route path="/employee/monthly-report" element={<MonthlyReport />} />
          {/* <Route path="/employee/appeals" element={<EmployeePerformanceAppeals />} /> */}
          {/* <Route path="/employee/goal-confirmation" element={<GoalConfirmation />} /> */}
          <Route path="/employee/peer-review" element={<PeerReview />} />
          {/* <Route path="/employee/goal-progress" element={<GoalProgressPage />} /> */}
          <Route path="/employee/progress-dashboard" element={<ProgressDashboard />} />
        </Route>

        {/* Manager routes */}
        <Route element={<ProtectedLayout allowedRole="manager" />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/team" element={<TeamList />} />
          <Route path="/manager/scoring" element={<ScoringManagement />} />
          <Route path="/manager/differentiated-scoring" element={<DifferentiatedScoring />} />
          <Route path="/manager/employee/:employeeId" element={<EmployeePerformanceHistoryWrapper />} />
          <Route path="/manager/analytics" element={<Analytics />} />
          <Route path="/manager/performance-analytics" element={<PerformanceAnalytics />} />
          <Route path="/manager/employee-trend/:employeeId" element={<EmployeeTrend />} />
          <Route path="/manager/quarterly-summary" element={<QuarterlySummary />} />
          {/* <Route path="/manager/objectives" element={<ObjectiveTree />} /> */}
          {/* <Route path="/manager/team-objectives" element={<TeamObjectives />} /> */}
          {/* <Route path="/manager/goal-approval" element={<GoalApproval />} /> */}
          {/* <Route path="/manager/goal-dashboard" element={<GoalDashboard />} /> */}
          <Route path="/manager/review-reports" element={<ReviewReports />} />
          <Route path="/manager/peer-review-management" element={<PeerReviewManage />} />
          {/* <Route path="/manager/interviews" element={<InterviewSchedule />} /> */}
          {/* <Route path="/manager/interview-plans" element={<InterviewPlans />} /> */}
          {/* <Route path="/manager/interview-records" element={<InterviewRecord />} /> */}
          {/* <Route path="/manager/goal-setting" element={<GoalSetting />} /> */}
          {/* <Route path="/manager/goal-progress" element={<GoalProgressPage />} /> */}
          <Route path="/manager/progress-dashboard" element={<ProgressDashboard />} />
          {/* <Route path="/manager/appeals" element={<AppealsReview />} /> */}
        </Route>

        {/* GM routes */}
        <Route element={<ProtectedLayout allowedRole="gm" />}>
          <Route path="/gm/dashboard" element={<GMDashboard />} />
          <Route path="/gm/scoring" element={<GMScoring />} />
          <Route path="/gm/analytics" element={<GMAnalytics />} />
          <Route path="/gm/data-export" element={<GMDataExport />} />
          <Route path="/gm/performance-analytics" element={<PerformanceAnalytics />} />
          <Route path="/gm/employee-trend/:employeeId" element={<EmployeeTrend />} />
          {/* <Route path="/gm/objectives" element={<ObjectiveTree />} /> */}
          {/* <Route path="/gm/goal-setting" element={<GoalSetting />} /> */}
          {/* <Route path="/gm/goal-progress" element={<GoalProgressPage />} /> */}
          <Route path="/gm/progress-dashboard" element={<ProgressDashboard />} />
        </Route>

        {/* HR routes */}
        <Route element={<ProtectedLayout allowedRole="hr" />}>
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/employee-info" element={<EmployeeInfo />} />
          <Route path="/hr/data-management" element={<DataManagement />} />
          <Route path="/hr/performance-ranking-config" element={<PerformanceRankingConfig />} />
          {/* <Route path="/hr/appeals" element={<HRAppealsManagement />} /> */}
          <Route path="/hr/analytics" element={<GMAnalytics />} />
          <Route path="/hr/performance-analytics" element={<PerformanceAnalytics />} />
          <Route path="/hr/employee-trend/:employeeId" element={<EmployeeTrend />} />
          {/* <Route path="/hr/objectives" element={<ObjectiveTree />} /> */}
          <Route path="/hr/peer-review-management" element={<PeerReviewManagement />} />
          <Route path="/hr/task-freeze-management" element={<TaskFreezeManagement />} />
          {/* <Route path="/hr/department-tree" element={<DepartmentTree />} /> */}
          <Route path="/hr/department-classification" element={<DepartmentClassification />} />
          <Route path="/hr/assessment-templates" element={<AssessmentTemplates />} />
          <Route path="/hr/metric-library" element={<MetricLibraryManagement />} />
          <Route path="/hr/assessment-export" element={<AssessmentExport />} />
          {/* <Route path="/hr/organization-chart" element={<OrganizationChart />} /> */}
          <Route path="/hr/data-import" element={<DataImport />} />
          <Route path="/hr/data-export" element={<DataExport />} />
          <Route path="/hr/assessment-publication" element={<AssessmentPublication />} />
          {/* <Route path="/hr/goal-setting" element={<GoalSetting />} /> */}
          {/* <Route path="/hr/goal-progress" element={<GoalProgressPage />} /> */}
          <Route path="/hr/progress-dashboard" element={<ProgressDashboard />} />
          <Route path="/hr/ai-insights" element={<AIInsights />} />
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedLayout allowedRole="admin" />}>
          <Route path="/admin/dashboard" element={<HRDashboard />} />
          <Route path="/admin/user-management" element={<UserManagement />} />
          <Route path="/admin/system-settings" element={<SystemSettings />} />
          <Route path="/admin/performance-ranking-config" element={<PerformanceRankingConfig />} />
          <Route path="/admin/analytics" element={<GMAnalytics />} />
          <Route path="/admin/peer-review-management" element={<PeerReviewManagement />} />
          <Route path="/admin/task-freeze-management" element={<TaskFreezeManagement />} />
          {/* <Route path="/admin/department-tree" element={<DepartmentTree />} /> */}
          <Route path="/admin/assessment-publication" element={<AssessmentPublication />} />
          <Route path="/admin/scoring" element={<GMScoring />} />
          <Route path="/admin/data-export" element={<GMDataExport />} />
          {/* <Route path="/admin/objectives" element={<ObjectiveTree />} /> */}
          {/* <Route path="/admin/goal-setting" element={<GoalSetting />} /> */}
          {/* <Route path="/admin/goal-progress" element={<GoalProgressPage />} /> */}
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
