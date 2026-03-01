import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Shield, Users, Crown, User, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ROLES = [
  { key: 'admin', label: '系统管理员', icon: ShieldCheck, color: 'bg-red-100 text-red-700', desc: '拥有所有权限，可管理用户和系统设置' },
  { key: 'hr', label: '人力资源', icon: Users, color: 'bg-blue-100 text-blue-700', desc: '管理员工、绩效周期、晋升审批等' },
  { key: 'gm', label: '总经理', icon: Crown, color: 'bg-purple-100 text-purple-700', desc: '查看全公司数据、评分经理、审批晋升' },
  { key: 'manager', label: '部门经理', icon: Shield, color: 'bg-green-100 text-green-700', desc: '管理团队绩效、评分下属、提交季度总结' },
  { key: 'employee', label: '普通员工', icon: User, color: 'bg-gray-100 text-gray-700', desc: '提交工作总结、查看个人绩效、申请晋升' },
];

interface SystemSettings {
  company_name?: { value: string };
  score_scale?: { value: string };
  enable_360_review?: { value: boolean };
  '360_review_mode'?: { value: string };
  '360_review_min_reviewers'?: { value: number };
  '360_review_max_reviewers'?: { value: number };
  '360_review_frequency'?: { value: string };
  auto_assign_360_tasks?: { value: boolean };
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 加载配置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/system-settings/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 转换为 settings 对象
          const settingsMap: SystemSettings = {};
          result.data.forEach((item: any) => {
            let value = item.settingValue;
            // 类型转换
            if (item.settingType === 'boolean') {
              value = value === 'true' || value === true;
            } else if (item.settingType === 'number') {
              value = parseInt(value);
            }
            settingsMap[item.settingKey as keyof SystemSettings] = { value };
          });
          setSettings(settingsMap);
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key: string, value: any) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/system-settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ value: String(value) })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('设置已保存');
        await loadSettings(); // 重新加载
      } else {
        toast.error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handle360ReviewToggle = async (enabled: boolean) => {
    await handleSaveSetting('enable_360_review', enabled);
  };

  const handle360ReviewModeChange = async (mode: string) => {
    await handleSaveSetting('360_review_mode', mode);
  };

  const handle360FrequencyChange = async (frequency: string) => {
    await handleSaveSetting('360_review_frequency', frequency);
  };

  const handleAutoAssignToggle = async (enabled: boolean) => {
    await handleSaveSetting('auto_assign_360_tasks', enabled);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const is360Enabled = settings.enable_360_review?.value === true;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">系统设置</h2>
        <p className="text-gray-500 mt-1">管理系统基础配置和功能开关</p>
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
              <Input 
                value={settings.company_name?.value || ''} 
                onChange={(e) => {
                  setSettings({ ...settings, company_name: { value: e.target.value } });
                }}
                onBlur={(e) => handleSaveSetting('company_name', e.target.value)}
              />
            </div>
            <div>
              <Label>评分制度</Label>
              <Input value={settings.score_scale?.value || ''} disabled />
              <p className="text-xs text-gray-400 mt-1">L1(0.5) → L5(1.5)，五级评分制</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 360 Review Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              360度评价设置
            </div>
            <Switch
              checked={is360Enabled}
              onCheckedChange={handle360ReviewToggle}
              disabled={saving}
            />
          </CardTitle>
          <p className="text-sm text-gray-500">
            {is360Enabled ? '✅ 360度评价已启用' : '❌ 360度评价已禁用'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {is360Enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>评价模式</Label>
                  <Select
                    value={settings['360_review_mode']?.value || 'optional'}
                    onValueChange={handle360ReviewModeChange}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">必填（强制参与）</SelectItem>
                      <SelectItem value="optional">可选（自愿参与）</SelectItem>
                      <SelectItem value="disabled">禁用</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    {settings['360_review_mode']?.value === 'required' && '所有员工必须参与360评价'}
                    {settings['360_review_mode']?.value === 'optional' && '员工可自主选择是否参与'}
                    {settings['360_review_mode']?.value === 'disabled' && '完全关闭360评价功能'}
                  </p>
                </div>

                <div>
                  <Label>评价频率</Label>
                  <Select
                    value={settings['360_review_frequency']?.value || 'quarterly'}
                    onValueChange={handle360FrequencyChange}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">每月</SelectItem>
                      <SelectItem value="quarterly">每季度</SelectItem>
                      <SelectItem value="yearly">每年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>最少评价人数</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings['360_review_min_reviewers']?.value || 2}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setSettings({ 
                        ...settings, 
                        '360_review_min_reviewers': { value } 
                      });
                    }}
                    onBlur={(e) => handleSaveSetting('360_review_min_reviewers', e.target.value)}
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-400 mt-1">每人需被几个同事评价</p>
                </div>

                <div>
                  <Label>最多评价人数</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={settings['360_review_max_reviewers']?.value || 5}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setSettings({ 
                        ...settings, 
                        '360_review_max_reviewers': { value } 
                      });
                    }}
                    onBlur={(e) => handleSaveSetting('360_review_max_reviewers', e.target.value)}
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-400 mt-1">最多被几个同事评价</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">自动分配评价任务</Label>
                  <p className="text-sm text-gray-500">系统自动随机分配同事互评任务</p>
                </div>
                <Switch
                  checked={settings.auto_assign_360_tasks?.value === true}
                  onCheckedChange={handleAutoAssignToggle}
                  disabled={saving}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">360度评价说明</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• 360度评价帮助员工从多角度了解自己的表现</li>
                      <li>• 评价结果仅供参考，不直接影响绩效得分</li>
                      <li>• 可根据公司文化和管理需求灵活开启/关闭</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {!is360Enabled && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-gray-600">360度评价功能已禁用</p>
              <p className="text-sm text-gray-500 mt-1">打开开关以启用此功能</p>
            </div>
          )}
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
            <div><span className="text-gray-500">版本：</span>v2.1.0</div>
            <div><span className="text-gray-500">运行模式：</span>Memory DB</div>
            <div><span className="text-gray-500">认证方式：</span>JWT</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
