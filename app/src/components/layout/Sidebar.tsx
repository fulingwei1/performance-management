import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  LogOut,
  Upload,
  Download,
  Award,
  FileText,
  Target,
  Crosshair,
  Calendar,
  MessageSquare,
  Users,
  Building2,
  Settings,
  ShieldCheck,
  Lock,
  Send,
  AlertCircle,
  ClipboardCheck
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface SidebarProps {
  role: 'employee' | 'manager' | 'gm' | 'hr' | 'admin';
}

const employeeNavItems = [
  { path: '/employee/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/employee/scores', label: '我的绩效', icon: BarChart3 },
  // HIDDEN: { path: '/employee/my-objectives', label: '我的目标', icon: Target },
  { path: '/employee/kpi', label: '我的KPI', icon: Crosshair },
  { path: '/employee/monthly-report', label: '月度汇报', icon: FileText },
  { path: '/employee/peer-review', label: '360度互评', icon: Users },
  // HIDDEN: { path: '/employee/appeals', label: '绩效申诉', icon: AlertCircle },
];

const managerNavItems = [
  { path: '/manager/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/manager/analytics', label: '绩效看板', icon: BarChart3 },
  { path: '/manager/differentiated-scoring', label: '差异化评分', icon: Award },
  // HIDDEN: { path: '/manager/team-objectives', label: '团队目标', icon: Target },
  // HIDDEN: { path: '/manager/goal-approval', label: '目标审批', icon: ClipboardCheck },
  // HIDDEN: { path: '/manager/goal-dashboard', label: '进度仪表板', icon: BarChart3 },
  { path: '/manager/review-reports', label: '月报审阅', icon: MessageSquare },
  { path: '/manager/peer-review-management', label: '360互评统计', icon: Users },
  // HIDDEN: { path: '/manager/interview-plans', label: '面谈计划', icon: Calendar },
  // HIDDEN: { path: '/manager/interview-records', label: '面谈记录', icon: FileText },
  { path: '/manager/quarterly-summary', label: '季度总结', icon: FileText },
  // HIDDEN: { path: '/manager/appeals', label: '申诉审核', icon: AlertCircle },
];

const gmNavItems = [
  { path: '/gm/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/gm/scoring', label: '总经理评分', icon: Award },
  { path: '/gm/analytics', label: '绩效看板', icon: BarChart3 },
  { path: '/gm/data-export', label: '数据导出', icon: LogOut },
];

const hrNavItems = [
  { path: '/hr/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/hr/analytics', label: '绩效看板', icon: BarChart3 },
  { path: '/hr/system-settings', label: '系统设置', icon: Settings },
  { path: '/hr/department-classification', label: '部门分类', icon: Building2 },
  { path: '/hr/assessment-export', label: '考核数据导出', icon: Download },
  { path: '/hr/assessment-publication', label: '考核结果发布', icon: Send },
  // HIDDEN: { path: '/hr/appeals', label: '申诉管理', icon: AlertCircle },
  { path: '/hr/data-import', label: '数据导入', icon: Upload },
  { path: '/hr/data-export', label: '数据导出', icon: Download },
];

const adminNavItems = [
  { path: '/admin/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/admin/user-management', label: '用户管理', icon: Users },
  { path: '/admin/system-settings', label: '系统设置', icon: Settings },
  { path: '/admin/analytics', label: '绩效看板', icon: BarChart3 },
  { path: '/admin/assessment-publication', label: '考核结果发布', icon: Send },
  { path: '/admin/scoring', label: '总经理评分', icon: Award },
  { path: '/admin/data-export', label: '数据导出', icon: LogOut },
];

export function Sidebar({ role }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  const navItems = role === 'employee' 
    ? employeeNavItems 
    : role === 'manager' 
    ? managerNavItems 
    : role === 'gm'
    ? gmNavItems
    : role === 'admin'
    ? adminNavItems
    : hrNavItems;
  
  const getRoleLabel = () => {
    switch (role) {
      case 'employee': return '员工';
      case 'manager': return '部门经理';
      case 'gm': return '总经理';
      case 'hr': return '人力资源';
      case 'admin': return '系统管理员';
      default: return '';
    }
  };
  
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">ATE绩效</h1>
            <p className="text-xs text-gray-400">Performance Mgmt</p>
          </div>
        </div>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
            {user?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{getRoleLabel()}</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="w-1.5 h-1.5 bg-white rounded-full"
                />
              )}
            </NavLink>
          );
        })}
      </nav>
      
      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200 w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}
