import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Shield, Users, Crown, User, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const ROLES = [
  { key: 'admin', label: '系统管理员', icon: ShieldCheck, color: 'bg-red-100 text-red-700', desc: '拥有所有权限，可管理用户和系统设置' },
  { key: 'hr', label: '人力资源', icon: Users, color: 'bg-blue-100 text-blue-700', desc: '管理员工、绩效周期、晋升审批等' },
  { key: 'gm', label: '总经理', icon: Crown, color: 'bg-purple-100 text-purple-700', desc: '查看全公司数据、评分经理、审批晋升' },
  { key: 'manager', label: '部门经理', icon: Shield, color: 'bg-green-100 text-green-700', desc: '管理团队绩效、评分下属、提交季度总结' },
  { key: 'employee', label: '普通员工', icon: User, color: 'bg-gray-100 text-gray-700', desc: '提交工作总结、查看个人绩效、申请晋升' },
];

export function SystemSettings() {
  const [companyName, setCompanyName] = useState('ATE Technology');
  const [scoreScale, setScoreScale] = useState('L1-L5');

  const handleSave = () => {
    toast.success('系统设置已保存');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">系统设置</h2>
        <p className="text-gray-500 mt-1">管理系统基础配置和角色权限</p>
      </div>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            基础设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>公司名称</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <Label>评分制度</Label>
              <Input value={scoreScale} onChange={(e) => setScoreScale(e.target.value)} disabled />
              <p className="text-xs text-gray-400 mt-1">L1(0.5) → L5(1.5)，五级评分制</p>
            </div>
          </div>
          <Button onClick={handleSave}>保存设置</Button>
        </CardContent>
      </Card>

      {/* Role List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            角色权限列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ROLES.map(role => {
              const Icon = role.icon;
              return (
                <div key={role.key} className="flex items-center gap-4 p-4 rounded-lg border">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.label}</span>
                      <Badge variant="outline">{role.key}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{role.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader><CardTitle>系统信息</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">版本：</span>v1.0.0</div>
            <div><span className="text-gray-500">运行模式：</span>Memory DB</div>
            <div><span className="text-gray-500">认证方式：</span>JWT</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
