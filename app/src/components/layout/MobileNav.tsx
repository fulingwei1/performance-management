import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bars3Icon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  HomeIcon,
  Squares2X2Icon,
  UserGroupIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';

type UserRole = 'employee' | 'manager' | 'gm' | 'hr' | 'admin';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  employee: [
    { name: '工作台', path: '/employee/dashboard', icon: HomeIcon },
    { name: '月度总结', path: '/employee/summary', icon: DocumentTextIcon },
  ],
  manager: [
    { name: '工作台', path: '/manager/dashboard', icon: HomeIcon },
    { name: '绩效看板', path: '/manager/analytics', icon: ChartBarIcon },
  ],
  gm: [
    { name: '工作台', path: '/gm/dashboard', icon: HomeIcon },
    { name: '绩效看板', path: '/gm/analytics', icon: ChartBarIcon },
    { name: '评分', path: '/gm/scoring', icon: DocumentTextIcon },
  ],
  hr: [
    { name: '工作台', path: '/hr/dashboard', icon: HomeIcon },
    { name: '部门评分', path: '/manager/dashboard', icon: UserGroupIcon },
    { name: '绩效看板', path: '/hr/analytics', icon: ChartBarIcon },
    { name: '数据管理', path: '/hr/data-io', icon: Squares2X2Icon },
    { name: '考核配置', path: '/hr/assessment-config', icon: Cog6ToothIcon },
  ],
  admin: [
    { name: '工作台', path: '/admin/dashboard', icon: HomeIcon },
    { name: '部门评分', path: '/manager/dashboard', icon: UserGroupIcon },
    { name: '绩效看板', path: '/admin/analytics', icon: ChartBarIcon },
    { name: '数据管理', path: '/hr/data-io', icon: Squares2X2Icon },
    { name: '考核配置', path: '/hr/assessment-config', icon: Cog6ToothIcon },
    { name: '用户管理', path: '/admin/user-management', icon: UsersIcon },
    { name: '系统设置', path: '/admin/system-settings', icon: Cog6ToothIcon },
  ],
};

export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuthStore();

  const role = (user?.role || 'employee') as UserRole;
  const filteredItems = useMemo(() => roleNavItems[role] || roleNavItems.employee, [role]);

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
        <h1 className="text-lg font-bold text-gray-900">绩效管理</h1>
        <button
          onClick={toggleMenu}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label={isOpen ? '关闭菜单' : '打开菜单'}
        >
          {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMenu}
        />
      )}

      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white shadow-lg transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">绩效管理</h2>
          {user && (
            <p className="text-sm text-gray-600 mt-1">
              {user.name} · {role === 'admin' ? '系统管理员' : role === 'hr' ? 'HR' : role === 'gm' ? '总经理' : role === 'manager' ? '经理' : '员工'}
            </p>
          )}
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={toggleMenu}
                    className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                      active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-30">
        {filteredItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full ${
                active ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[11px] mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
};
