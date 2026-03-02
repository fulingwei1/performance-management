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
  TrendingUp,
  Target,
  Crosshair,
  FileSignature,
  Calendar,
  MessageSquare,
  Users,
  ClipboardList,
  Link2,
  DollarSign,
  Building2,
  Settings,
  ShieldCheck,
  Lock,
  Send,
  Bell,
  AlertCircle,
  ClipboardCheck
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { NotificationBell } from '../NotificationBell';

interface SidebarProps {
  role: 'employee' | 'manager' | 'gm' | 'hr' | 'admin';
}

const employeeNavItems = [
  { path: '/employee/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/employee/scores', label: '我的绩效', icon: BarChart3 },
  { path: '/employee/my-objectives', label: '我的目标', icon: Target },
  { path: '/employee/kpi', label: '我的KPI', icon: Crosshair },
  { path: '/employee/monthly-report', label: '月度汇报', icon: FileText },
  { path: '/employee/contract', label: '绩效合约', icon: FileSignature },
  { path: '/employee/assignments', label: '待拆解任务', icon: ClipboardList },
  { path: '/employee/related-okr', label: '关联OKR', icon: Link2 },
  { path: '/employee/peer-review', label: '360度互评', icon: Users },
  { path: '/employee/appeals', label: '绩效申诉', icon: AlertCircle },
  { path: '/employee/promotion', label: '晋升加薪', icon: TrendingUp },
  { path: '/employee/my-bonus', label: '我的奖金', icon: DollarSign },
];

const managerNavItems = [
  { path: '/manager/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/manager/analytics', label: '绩效看板', icon: BarChart3 },
  { path: '/manager/differentiated-scoring', label: '差异化评分', icon: Award },
  { path: '/manager/team-objectives', label: '团队目标', icon: Target },
  { path: '/manager/goal-approval', label: '目标审批', icon: ClipboardCheck },
  { path: '/manager/goal-dashboard', label: '进度仪表板', icon: BarChart3 },
  { path: '/manager/review-reports', label: '月报审阅', icon: MessageSquare },
  { path: '/manager/interview-plans', label: '面谈计划', icon: Calendar },
  { path: '/manager/interview-records', label: '面谈记录', icon: FileText },
  { path: '/manager/quarterly-summary', label: '季度总结', icon: FileText },
  { path: '/manager/promotion', label: '晋升加薪', icon: TrendingUp },
  { path: '/manager/appeals', label: '申诉审核', icon: AlertCircle },
];

const gmNavItems = [
  { path: '/gm/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/gm/scoring', label: '总经理评分', icon: Award },
  { path: '/gm/analytics', label: '绩效看板', icon: BarChart3 },
  { path: '/gm/data-export', label: '数据导出', icon: LogOut },
];

const hrNavItems = [
  { path: '/hr/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/hr/peer-review-management', label: '360互评管理', icon: Users },
  { path: '/hr/analytics', label: '绩效看板', icon: BarChart3 },
  { path: '/hr/appeals', label: '申诉管理', icon: AlertCircle },
  { path: '/hr/assessment-publication', label: '结果发布', icon: Send },
  { path: '/hr/assessment-templates', label: '考核模板', icon: FileText },
  { path: '/hr/department-tree', label: '组织架构', icon: Building2 },
  { path: '/hr/data-import', label: '数据导入', icon: Upload },
  { path: '/hr/data-export', label: '数据导出', icon: Download },
];

const adminNavItems = [
  { path: '/admin/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/admin/user-management', label: '用户管理', icon: Users },
  { path: '/admin/system-settings', label: '系统设置', icon: Settings },
  { path: '/admin/analytics', label: '绩效看板', icon: BarChart3 },
  { path: '/admin/assessment-publication', label: '结果发布', icon: Send },
  { path: '/admin/peer-review-management', label: '360互评管理', icon: ShieldCheck },
  { path: '/admin/department-tree', label: '组织架构', icon: Building2 },
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
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/[0.06] bg-[#09090b] text-white">
      {/* Logo */}
      <div className="border-b border-white/[0.06] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">ATE绩效</h1>
            <p className="text-xs text-slate-400">Performance Mgmt</p>
          </div>
        </div>
      </div>
      
      {/* User Info */}
      <div className="border-b border-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold">
            {user?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{getRoleLabel()}</p>
          </div>
          <NotificationBell />
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
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
              )}
            </NavLink>
          );
        })}
      </nav>
      
      {/* Logout */}
      <div className="border-t border-white/[0.06] p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-white/[0.05] hover:text-white"
        >
          <LogOut className="w-5 h-5" />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}
