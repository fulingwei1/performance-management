import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, User, Shield, Crown, Users, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'employee' | 'manager' | 'gm' | 'hr' | 'admin'>('employee');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const success = await login({
      username,
      password,
      role: activeTab
    });
    
    if (success) {
      const redirectMap: Record<string, string> = {
        'employee': '/employee/dashboard',
        'manager': '/manager/dashboard',
        'gm': '/gm/dashboard',
        'hr': '/hr/dashboard',
        'admin': '/admin/dashboard'
      };
      navigate(redirectMap[activeTab]);
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
        </div>
        
        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-5 rounded-none h-14">
              <TabsTrigger value="employee" className="gap-1 text-xs">
                <User className="w-4 h-4" />
                员工
              </TabsTrigger>
              <TabsTrigger value="manager" className="gap-1 text-xs">
                <Shield className="w-4 h-4" />
                经理
              </TabsTrigger>
              <TabsTrigger value="gm" className="gap-1 text-xs">
                <Crown className="w-4 h-4" />
                总经理
              </TabsTrigger>
              <TabsTrigger value="hr" className="gap-1 text-xs">
                <Users className="w-4 h-4" />
                HR
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-1 text-xs">
                <ShieldCheck className="w-4 h-4" />
                管理员
              </TabsTrigger>
            </TabsList>
            
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
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    placeholder="请输入姓名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">默认密码: 123456</p>
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading || !username || !password}
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
          </Tabs>
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
