import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { employeeApi } from '@/services/api';
import { Layout } from '@/components/layout/Layout';
import { Login } from '@/pages/Login';
import { EmployeeDashboard } from '@/pages/Employee/Dashboard';
import { WorkSummary } from '@/pages/Employee/WorkSummary';
import { MyScores } from '@/pages/Employee/MyScores';
import { EmployeePerformanceAppeals } from '@/pages/Employee/PerformanceAppeals';
import { ManagerDashboard } from '@/pages/Manager/Dashboard';
import { ScoringManagement } from '@/pages/Manager/Scoring';
import { DifferentiatedScoring } from '@/pages/Manager/DifferentiatedScoring';
import { Analytics } from '@/pages/Manager/Analytics';
import { QuarterlySummary } from '@/pages/Manager/QuarterlySummary';
import { GMAnalytics } from '@/pages/GM/Analytics';
import { PerformanceAnalytics } from '@/pages/Analytics/PerformanceAnalytics';
import { EmployeeTrend } from '@/pages/Analytics/EmployeeTrend';
import { EmployeePerformanceHistory } from '@/pages/Manager/EmployeePerformanceHistory';
import { TeamList } from '@/pages/Manager/TeamList';
import { GMDashboard } from '@/pages/GM/Dashboard';
import { GMScoring } from '@/pages/GM/Scoring';
import { GMDataExport } from '@/pages/GM/GMDataExport';
import { HRDashboard } from '@/pages/HR/Dashboard';
import { EmployeeInfo } from '@/pages/HR/EmployeeInfo';
import { DataManagement } from '@/pages/HR/DataManagement';
import { HRAppealsManagement } from '@/pages/HR/AppealsManagement';
import { AssessmentPublication } from '@/pages/HR/AssessmentPublication';
import { Toaster } from '@/components/ui/sonner';

// OKR/KPI pages
import { ObjectiveTree } from '@/pages/OKR/ObjectiveTree';
import { MyObjectives } from '@/pages/OKR/MyObjectives';
import { MyKPI } from '@/pages/Employee/MyKPI';
import { MonthlyReport } from '@/pages/Employee/MonthlyReport';
import { TeamObjectives } from '@/pages/Manager/TeamObjectives';
import { ReviewReports } from '@/pages/Manager/ReviewReports';
import { InterviewSchedule } from '@/pages/Manager/InterviewSchedule';
import { PeerReview } from '@/pages/Employee/PeerReview';
import { InterviewPlans } from '@/pages/Manager/InterviewPlans';
import { InterviewRecord } from '@/pages/Manager/InterviewRecord';
import GoalApproval from '@/pages/Manager/GoalApproval';
import GoalDashboard from '@/pages/Manager/GoalDashboard';
import { AppealsReview } from '@/pages/Manager/AppealsReview';
import { MyGoalPlanning } from '@/pages/Employee/MyGoalPlanning';
import { DepartmentTree } from '@/pages/HR/DepartmentTree';
import { DepartmentClassification } from '@/pages/HR/DepartmentClassification';
import { AssessmentTemplates } from '@/pages/HR/AssessmentTemplates';
import { AssessmentExport } from '@/pages/HR/AssessmentExport';
import { OrganizationChart } from '@/pages/HR/OrganizationChart';
import { DataImport } from '@/pages/HR/DataImport';
import { DataExport } from '@/pages/HR/DataExport';
import { PeerReviewManagement } from '@/pages/HR/PeerReviewManagement';
import { TaskFreezeManagement } from '@/pages/HR/TaskFreezeManagement';
import { PerformanceRankingConfig } from '@/pages/HR/PerformanceRankingConfig';
import { SystemSettings } from '@/pages/Admin/SystemSettings';
import { UserManagement } from '@/pages/Admin/UserManagement';

// Goal Management pages
import { GoalSetting } from '@/pages/Goals/GoalSetting';
import { GoalConfirmation } from '@/pages/Goals/GoalConfirmation';
import { GoalProgressPage } from '@/pages/Goals/GoalProgress';

// Dashboard pages
import ProgressDashboard from '@/pages/Dashboard/ProgressDashboard';

// Mobile Demo page
import { MobileDemo } from '@/pages/MobileDemo';

// AI Insights page
import { AIInsights } from '@/pages/ai/AIInsights';

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
  '/manager/promotion',
  '/gm/promotion-approvals',
  '/gm/strategic-overview',
  '/gm/strategic-goals',
  '/hr/promotion-approvals',
  '/hr/strategic-objectives',
  '/hr/contract-management',
  '/hr/okr-dashboard',
  '/hr/bonus-management',
  '/admin/strategic-objectives',
  '/admin/contract-management',
  '/admin/okr-dashboard',
  '/admin/promotion-approvals',
  '/admin/bonus-management',
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
    <BrowserRouter>
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
          <Route path="/employee/goal-planning" element={<MyGoalPlanning />} />
          <Route path="/employee/scores" element={<MyScores />} />
          <Route path="/employee/objectives" element={<ObjectiveTree />} />
          <Route path="/employee/my-objectives" element={<MyObjectives />} />
          <Route path="/employee/kpi" element={<MyKPI />} />
          <Route path="/employee/monthly-report" element={<MonthlyReport />} />
          <Route path="/employee/appeals" element={<EmployeePerformanceAppeals />} />
          <Route path="/employee/goal-confirmation" element={<GoalConfirmation />} />
          <Route path="/employee/peer-review" element={<PeerReview />} />
          <Route path="/employee/goal-progress" element={<GoalProgressPage />} />
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
          <Route path="/manager/objectives" element={<ObjectiveTree />} />
          <Route path="/manager/team-objectives" element={<TeamObjectives />} />
          <Route path="/manager/goal-approval" element={<GoalApproval />} />
          <Route path="/manager/goal-dashboard" element={<GoalDashboard />} />
          <Route path="/manager/review-reports" element={<ReviewReports />} />
          <Route path="/manager/interviews" element={<InterviewSchedule />} />
          <Route path="/manager/interview-plans" element={<InterviewPlans />} />
          <Route path="/manager/interview-records" element={<InterviewRecord />} />
          <Route path="/manager/goal-setting" element={<GoalSetting />} />
          <Route path="/manager/goal-progress" element={<GoalProgressPage />} />
          <Route path="/manager/progress-dashboard" element={<ProgressDashboard />} />
          <Route path="/manager/appeals" element={<AppealsReview />} />
        </Route>

        {/* GM routes */}
        <Route element={<ProtectedLayout allowedRole="gm" />}>
          <Route path="/gm/dashboard" element={<GMDashboard />} />
          <Route path="/gm/scoring" element={<GMScoring />} />
          <Route path="/gm/analytics" element={<GMAnalytics />} />
          <Route path="/gm/data-export" element={<GMDataExport />} />
          <Route path="/gm/performance-analytics" element={<PerformanceAnalytics />} />
          <Route path="/gm/employee-trend/:employeeId" element={<EmployeeTrend />} />
          <Route path="/gm/objectives" element={<ObjectiveTree />} />
          <Route path="/gm/goal-setting" element={<GoalSetting />} />
          <Route path="/gm/goal-progress" element={<GoalProgressPage />} />
          <Route path="/gm/progress-dashboard" element={<ProgressDashboard />} />
        </Route>

        {/* HR routes */}
        <Route element={<ProtectedLayout allowedRole="hr" />}>
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/hr/employee-info" element={<EmployeeInfo />} />
          <Route path="/hr/data-management" element={<DataManagement />} />
          <Route path="/hr/performance-ranking-config" element={<PerformanceRankingConfig />} />
          <Route path="/hr/appeals" element={<HRAppealsManagement />} />
          <Route path="/hr/analytics" element={<GMAnalytics />} />
          <Route path="/hr/performance-analytics" element={<PerformanceAnalytics />} />
          <Route path="/hr/employee-trend/:employeeId" element={<EmployeeTrend />} />
          <Route path="/hr/objectives" element={<ObjectiveTree />} />
          <Route path="/hr/peer-review-management" element={<PeerReviewManagement />} />
          <Route path="/hr/task-freeze-management" element={<TaskFreezeManagement />} />
          <Route path="/hr/department-tree" element={<DepartmentTree />} />
          <Route path="/hr/department-classification" element={<DepartmentClassification />} />
          <Route path="/hr/assessment-templates" element={<AssessmentTemplates />} />
          <Route path="/hr/assessment-export" element={<AssessmentExport />} />
          <Route path="/hr/organization-chart" element={<OrganizationChart />} />
          <Route path="/hr/data-import" element={<DataImport />} />
          <Route path="/hr/data-export" element={<DataExport />} />
          <Route path="/hr/assessment-publication" element={<AssessmentPublication />} />
          <Route path="/hr/goal-setting" element={<GoalSetting />} />
          <Route path="/hr/goal-progress" element={<GoalProgressPage />} />
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
          <Route path="/admin/department-tree" element={<DepartmentTree />} />
          <Route path="/admin/assessment-publication" element={<AssessmentPublication />} />
          <Route path="/admin/scoring" element={<GMScoring />} />
          <Route path="/admin/data-export" element={<GMDataExport />} />
          <Route path="/admin/objectives" element={<ObjectiveTree />} />
          <Route path="/admin/goal-setting" element={<GoalSetting />} />
          <Route path="/admin/goal-progress" element={<GoalProgressPage />} />
        </Route>

        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
