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
import { EmployeePromotionRequest } from '@/pages/Employee/PromotionRequest';
import { ManagerDashboard } from '@/pages/Manager/Dashboard';
import { ScoringManagement } from '@/pages/Manager/Scoring';
import { Analytics } from '@/pages/Manager/Analytics';
import { QuarterlySummary } from '@/pages/Manager/QuarterlySummary';
import { ManagerPromotionRequest } from '@/pages/Manager/PromotionRequest';
import { GMAnalytics } from '@/pages/GM/Analytics';
import { EmployeePerformanceHistory } from '@/pages/Manager/EmployeePerformanceHistory';
import { TeamList } from '@/pages/Manager/TeamList';
import { GMDashboard } from '@/pages/GM/Dashboard';
import { GMScoring } from '@/pages/GM/Scoring';
import { GMDataExport } from '@/pages/GM/GMDataExport';
import { GMPromotionApprovals } from '@/pages/GM/PromotionApprovals';
import { HRDashboard } from '@/pages/HR/Dashboard';
import { EmployeeInfo } from '@/pages/HR/EmployeeInfo';
import { DataManagement } from '@/pages/HR/DataManagement';
import { HRPromotionApprovals } from '@/pages/HR/PromotionApprovals';
import { HRAppealsManagement } from '@/pages/HR/AppealsManagement';
import { AssessmentPublication } from '@/pages/HR/AssessmentPublication';
import { Toaster } from '@/components/ui/sonner';

// OKR/KPI pages
import { ObjectiveTree } from '@/pages/OKR/ObjectiveTree';
import { MyObjectives } from '@/pages/OKR/MyObjectives';
import { MyKPI } from '@/pages/Employee/MyKPI';
import { MonthlyReport } from '@/pages/Employee/MonthlyReport';
import { MyContract } from '@/pages/Employee/MyContract';
import { TeamObjectives } from '@/pages/Manager/TeamObjectives';
import { ReviewReports } from '@/pages/Manager/ReviewReports';
import { InterviewSchedule } from '@/pages/Manager/InterviewSchedule';
import GoalApproval from '@/pages/Manager/GoalApproval';
import { StrategicObjectives } from '@/pages/HR/StrategicObjectives';
import { ContractManagement } from '@/pages/HR/ContractManagement';
import { OKRDashboard } from '@/pages/HR/OKRDashboard';
import { StrategicOverview } from '@/pages/GM/StrategicOverview';
import { StrategicGoalsManagement } from '@/pages/GM/StrategicGoalsManagement';
import { MyGoalPlanning } from '@/pages/Employee/MyGoalPlanning';
import { MyAssignments } from '@/pages/OKR/MyAssignments';
import { RelatedOKR } from '@/pages/OKR/RelatedOKR';
import { MyBonus } from '@/pages/Employee/MyBonus';
import { BonusManagement } from '@/pages/HR/BonusManagement';
import { DepartmentTree } from '@/pages/HR/DepartmentTree';
import { PeerReviewManagement } from '@/pages/HR/PeerReviewManagement';
import { TaskFreezeManagement } from '@/pages/HR/TaskFreezeManagement';
import { SystemSettings } from '@/pages/Admin/SystemSettings';
import { UserManagement } from '@/pages/Admin/UserManagement';

// Goal Management pages
import { GoalSetting } from '@/pages/Goals/GoalSetting';
import { GoalConfirmation } from '@/pages/Goals/GoalConfirmation';
import { GoalProgressPage } from '@/pages/Goals/GoalProgress';

// Dashboard pages
import ProgressDashboard from '@/pages/Dashboard/ProgressDashboard';

// Notification page
import Notifications from '@/pages/Notifications';

const ROLE_HOME: Record<string, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  gm: '/gm/dashboard',
  hr: '/hr/dashboard',
  admin: '/admin/dashboard',
};

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

        {/* Employee routes */}
        <Route element={<ProtectedLayout allowedRole="employee" />}>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/employee/summary" element={<WorkSummary />} />
          <Route path="/employee/goal-planning" element={<MyGoalPlanning />} />
          <Route path="/employee/scores" element={<MyScores />} />
          <Route path="/employee/promotion" element={<EmployeePromotionRequest />} />
          <Route path="/employee/objectives" element={<ObjectiveTree />} />
          <Route path="/employee/my-objectives" element={<MyObjectives />} />
          <Route path="/employee/kpi" element={<MyKPI />} />
          <Route path="/employee/monthly-report" element={<MonthlyReport />} />
          <Route path="/employee/contract" element={<MyContract />} />
          <Route path="/employee/assignments" element={<MyAssignments />} />
          <Route path="/employee/related-okr" element={<RelatedOKR />} />
          <Route path="/employee/my-bonus" element={<MyBonus />} />
          <Route path="/employee/appeals" element={<EmployeePerformanceAppeals />} />
          <Route path="/employee/goal-confirmation" element={<GoalConfirmation />} />
          <Route path="/employee/goal-progress" element={<GoalProgressPage />} />
          <Route path="/employee/progress-dashboard" element={<ProgressDashboard />} />
        </Route>

        {/* Manager routes */}
        <Route element={<ProtectedLayout allowedRole="manager" />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/manager/team" element={<TeamList />} />
          <Route path="/manager/scoring" element={<ScoringManagement />} />
          <Route path="/manager/employee/:employeeId" element={<EmployeePerformanceHistoryWrapper />} />
          <Route path="/manager/analytics" element={<Analytics />} />
          <Route path="/manager/quarterly-summary" element={<QuarterlySummary />} />
          <Route path="/manager/promotion" element={<ManagerPromotionRequest />} />
          <Route path="/manager/objectives" element={<ObjectiveTree />} />
          <Route path="/manager/team-objectives" element={<TeamObjectives />} />
          <Route path="/manager/goal-approval" element={<GoalApproval />} />
          <Route path="/manager/review-reports" element={<ReviewReports />} />
          <Route path="/manager/interviews" element={<InterviewSchedule />} />
          <Route path="/manager/goal-setting" element={<GoalSetting />} />
          <Route path="/manager/goal-progress" element={<GoalProgressPage />} />
          <Route path="/manager/progress-dashboard" element={<ProgressDashboard />} />
        </Route>

        {/* GM routes */}
        <Route element={<ProtectedLayout allowedRole="gm" />}>
          <Route path="/gm/dashboard" element={<GMDashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/gm/scoring" element={<GMScoring />} />
          <Route path="/gm/analytics" element={<GMAnalytics />} />
          <Route path="/gm/data-export" element={<GMDataExport />} />
          <Route path="/gm/promotion-approvals" element={<GMPromotionApprovals />} />
          <Route path="/gm/strategic-overview" element={<StrategicOverview />} />
          <Route path="/gm/strategic-goals" element={<StrategicGoalsManagement />} />
          <Route path="/gm/objectives" element={<ObjectiveTree />} />
          <Route path="/gm/goal-setting" element={<GoalSetting />} />
          <Route path="/gm/goal-progress" element={<GoalProgressPage />} />
          <Route path="/gm/progress-dashboard" element={<ProgressDashboard />} />
        </Route>

        {/* HR routes */}
        <Route element={<ProtectedLayout allowedRole="hr" />}>
          <Route path="/hr/dashboard" element={<HRDashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/hr/employee-info" element={<EmployeeInfo />} />
          <Route path="/hr/data-management" element={<DataManagement />} />
          <Route path="/hr/promotion-approvals" element={<HRPromotionApprovals />} />
          <Route path="/hr/appeals" element={<HRAppealsManagement />} />
          <Route path="/hr/analytics" element={<GMAnalytics />} />
          <Route path="/hr/strategic-objectives" element={<StrategicObjectives />} />
          <Route path="/hr/contract-management" element={<ContractManagement />} />
          <Route path="/hr/okr-dashboard" element={<OKRDashboard />} />
          <Route path="/hr/objectives" element={<ObjectiveTree />} />
          <Route path="/hr/bonus-management" element={<BonusManagement />} />
          <Route path="/hr/peer-review-management" element={<PeerReviewManagement />} />
          <Route path="/hr/task-freeze-management" element={<TaskFreezeManagement />} />
          <Route path="/hr/department-tree" element={<DepartmentTree />} />
          <Route path="/hr/assessment-publication" element={<AssessmentPublication />} />
          <Route path="/hr/goal-setting" element={<GoalSetting />} />
          <Route path="/hr/goal-progress" element={<GoalProgressPage />} />
          <Route path="/hr/progress-dashboard" element={<ProgressDashboard />} />
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedLayout allowedRole="admin" />}>
          <Route path="/admin/dashboard" element={<HRDashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin/user-management" element={<UserManagement />} />
          <Route path="/admin/system-settings" element={<SystemSettings />} />
          <Route path="/admin/analytics" element={<GMAnalytics />} />
          <Route path="/admin/strategic-objectives" element={<StrategicObjectives />} />
          <Route path="/admin/contract-management" element={<ContractManagement />} />
          <Route path="/admin/okr-dashboard" element={<OKRDashboard />} />
          <Route path="/admin/promotion-approvals" element={<HRPromotionApprovals />} />
          <Route path="/admin/bonus-management" element={<BonusManagement />} />
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
