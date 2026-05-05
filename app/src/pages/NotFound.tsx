import { Link } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

const ROLE_HOME: Record<string, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  gm: '/gm/analytics',
  hr: '/hr/dashboard',
  admin: '/hr/dashboard',
};

export default function NotFound() {
  const { isAuthenticated, user } = useAuthStore();
  const home = isAuthenticated ? (ROLE_HOME[user?.role || 'employee'] || '/employee/dashboard') : '/login';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center shadow-sm border">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <SearchX className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold text-blue-600">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">页面不存在</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          你访问的地址不存在，可能是链接写错了，或者该功能已经下线。
        </p>
        <Button asChild className="mt-6">
          <Link to={home}>
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Link>
        </Button>
      </div>
    </div>
  );
}
