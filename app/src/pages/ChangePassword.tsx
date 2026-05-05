import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const ROLE_HOME: Record<string, string> = {
  employee: '/employee/dashboard',
  manager: '/manager/dashboard',
  gm: '/gm/analytics',
  hr: '/hr/dashboard',
  admin: '/hr/dashboard',
};

export function ChangePassword() {
  const navigate = useNavigate();
  const { user, refreshCurrentUser } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error('新密码至少 8 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    if (oldPassword === newPassword) {
      toast.error('新密码不能和当前密码相同');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      await refreshCurrentUser();
      toast.success('密码已修改');
      navigate(ROLE_HOME[user?.role || 'employee'], { replace: true });
    } catch (error: any) {
      toast.error(error?.message || '密码修改失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle>请修改登录密码</CardTitle>
          <p className="text-sm text-gray-500">
            你可以在这里修改自己的登录密码；如果账号被要求改密，完成后才能继续使用绩效系统。
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">当前密码</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                disabled={saving}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={saving}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={saving}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={saving || !oldPassword || !newPassword || !confirmPassword}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '修改密码并进入系统'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
