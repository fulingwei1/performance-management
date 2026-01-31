import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { employeeApi } from '@/services/api';
import { Layout } from '@/components/layout/Layout';
import { Login } from '@/pages/Login';
import { EmployeeDashboard } from '@/pages/Employee/Dashboard';
import { WorkSummary } from '@/pages/Employee/WorkSummary';
import { MyScores } from '@/pages/Employee/MyScores';
import { EmployeePeerReview } from '@/pages/Employee/PeerReview';
import { ManagerDashboard } from '@/pages/Manager/Dashboard';
import { ScoringManagement } from '@/pages/Manager/Scoring';
import { PeerReviewManage } from '@/pages/Manager/PeerReviewManage';
import { Analytics } from '@/pages/Manager/Analytics';
import { GMAnalytics } from '@/pages/GM/Analytics';
import { EmployeePerformanceHistory } from '@/pages/Manager/EmployeePerformanceHistory';
import { TeamList } from '@/pages/Manager/TeamList';
import { GMDashboard } from '@/pages/GM/Dashboard';
import { GMScoring } from '@/pages/GM/Scoring';
import { HRDashboard } from '@/pages/HR/Dashboard';
import { EmployeeInfo } from '@/pages/HR/EmployeeInfo';
import { DataManagement } from '@/pages/HR/DataManagement';
import { Toaster } from '@/components/ui/sonner';

// 受保护路由组件
function ProtectedRoute({ 
  children, 
  allowedRole 
}: { 
  children: React.ReactNode; 
  allowedRole: 'employee' | 'manager' | 'gm' | 'hr';
}) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role !== allowedRole) {
    const redirectMap: Record<string, string> = {
      'employee': '/employee/dashboard',
      'manager': '/manager/dashboard',
      'gm': '/gm/dashboard',
      'hr': '/hr/dashboard'
    };
    return <Navigate to={redirectMap[user?.role || 'employee']} replace />;
  }
  
  return <>{children}</>;
}

// 公共路由 - 已登录用户重定向
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (isAuthenticated) {
    const redirectMap: Record<string, string> = {
      'employee': '/employee/dashboard',
      'manager': '/manager/dashboard',
      'gm': '/gm/dashboard',
      'hr': '/hr/dashboard'
    };
    return <Navigate to={redirectMap[user?.role || 'employee']} replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录页面 */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* 员工路由 */}
        <Route 
          path="/employee/dashboard" 
          element={
            <ProtectedRoute allowedRole="employee">
              <Layout role="employee">
                <EmployeeDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/employee/summary" 
          element={
            <ProtectedRoute allowedRole="employee">
              <Layout role="employee">
                <WorkSummary />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/employee/scores" 
          element={
            <ProtectedRoute allowedRole="employee">
              <Layout role="employee">
                <MyScores />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/employee/peer-review" 
          element={
            <ProtectedRoute allowedRole="employee">
              <Layout role="employee">
                <EmployeePeerReview />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* 经理路由 */}
        <Route 
          path="/manager/dashboard" 
          element={
            <ProtectedRoute allowedRole="manager">
              <Layout role="manager">
                <ManagerDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/manager/team" 
          element={
            <ProtectedRoute allowedRole="manager">
              <Layout role="manager">
                <TeamList />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/manager/scoring" 
          element={
            <ProtectedRoute allowedRole="manager">
              <Layout role="manager">
                <ScoringManagement />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/manager/employee/:employeeId"
          element={
            <ProtectedRoute allowedRole="manager">
              <Layout role="manager">
                <EmployeePerformanceHistoryWrapper />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route 
          path="/manager/peer-review" 
          element={
            <ProtectedRoute allowedRole="manager">
              <Layout role="manager">
                <PeerReviewManage />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/manager/analytics" 
          element={
            <ProtectedRoute allowedRole="manager">
              <Layout role="manager">
                <Analytics />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* GM 总经理路由 */}
        <Route 
          path="/gm/dashboard" 
          element={
            <ProtectedRoute allowedRole="gm">
              <Layout role="gm">
                <GMDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/gm/scoring" 
          element={
            <ProtectedRoute allowedRole="gm">
              <Layout role="gm">
                <GMScoring />
              </Layout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/gm/analytics" 
          element={
            <ProtectedRoute allowedRole="gm">
              <Layout role="gm">
                <GMAnalytics />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* HR路由 */}
         <Route 
           path="/hr/dashboard" 
           element={
             <ProtectedRoute allowedRole="hr">
               <Layout role="hr">
                 <HRDashboard />
               </Layout>
             </ProtectedRoute>
           } 
         />
         <Route 
           path="/hr/employee-info" 
           element={
             <ProtectedRoute allowedRole="hr">
               <Layout role="hr">
                 <EmployeeInfo />
               </Layout>
             </ProtectedRoute>
           } 
         />
         <Route 
           path="/hr/data-management" 
           element={
             <ProtectedRoute allowedRole="hr">
               <Layout role="hr">
                 <DataManagement />
               </Layout>
             </ProtectedRoute>
           } 
         />
         <Route 
           path="/hr/analytics" 
           element={
             <ProtectedRoute allowedRole="hr">
               <Layout role="hr">
                 <GMAnalytics />
               </Layout>
             </ProtectedRoute>
           } 
         />
        
        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

// 包装组件：从路由参数获取员工信息
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
          setEmployee({
            name: response.data.name,
            level: response.data.level || 'intermediate'
          });
        } else {
          setError('员工信息加载失败');
        }
      })
      .catch((err) => {
        setError(err.message || '网络错误');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [employeeId]);

  if (!employeeId) {
    return <div className="p-4 text-center text-gray-500">员工ID未找到</div>;
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">加载中...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (!employee) {
    return <div className="p-4 text-center text-gray-500">员工不存在</div>;
  }

  return (
    <EmployeePerformanceHistory
      employeeId={employeeId}
      employeeName={employee.name}
      employeeLevel={employee.level}
    />
  );
}

export default App;
