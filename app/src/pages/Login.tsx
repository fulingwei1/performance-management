import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Login() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const envLabel = useMemo(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return '';
    return `本地开发版 · ${window.location.host}`;
  }, []);
  
  const [username, setUsername] = useState('');
  const [idCardLast6, setIdCardLast6] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const success = await login({
      username,
      idCardLast6
    });
    
    if (success) {
      const role = useAuthStore.getState().user?.role || 'employee';
      const redirectMap: Record<string, string> = {
        employee: '/employee/dashboard',
        manager: '/manager/dashboard',
        gm: '/gm/dashboard',
        hr: '/hr/dashboard',
        admin: '/admin/dashboard',
      };
      window.location.replace(redirectMap[role] || '/employee/dashboard');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4"
          >
            <BarChart3 className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900">ATE绩效管理平台</h1>
          <p className="text-gray-500 mt-1">Performance Management System</p>
          {envLabel && (
            <p className="text-xs text-gray-400 mt-2">{envLabel}</p>
          )}
        </div>
        
        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名（工号/姓名）</Label>
                <Input
                  id="username"
                  placeholder="请输入工号或姓名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret">身份证后六位（管理员可填密码）</Label>
                <div className="relative">
                  <Input
                    id="secret"
                    type={showSecret ? 'text' : 'password'}
                    placeholder="请输入身份证后六位"
                    value={idCardLast6}
                    onChange={(e) => setIdCardLast6(e.target.value)}
                    disabled={isLoading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400">演示环境默认后六位：123456</p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !username || !idCardLast6}
                className="w-full h-11 text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                登录即表示您同意我们的服务条款和隐私政策
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-400 mt-8"
        >
          © 2025 ATE Technology. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
}
