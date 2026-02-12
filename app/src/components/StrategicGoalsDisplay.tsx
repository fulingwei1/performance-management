/**
 * 战略目标展示组件
 * 所有员工都能看到：公司战略 + 公司重点工作 + 部门重点工作
 */

import { useEffect, useState } from 'react';
import { Target, Briefcase, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';

interface StrategicGoal {
  id: string;
  title: string;
  description?: string;
  content?: string;
  year: number;
  type: 'company-strategy' | 'company-key-work' | 'department-key-work';
  department?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
}

interface StrategicGoalsDisplayProps {
  compact?: boolean; // 紧凑模式
  showDepartment?: boolean; // 是否显示部门目标
}

export function StrategicGoalsDisplay({ compact = false, showDepartment = true }: StrategicGoalsDisplayProps) {
  const { user } = useAuthStore();
  const [companyStrategies, setCompanyStrategies] = useState<StrategicGoal[]>([]);
  const [companyKeyWorks, setCompanyKeyWorks] = useState<StrategicGoal[]>([]);
  const [departmentKeyWorks, setDepartmentKeyWorks] = useState<StrategicGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategicGoals();
  }, [user]);

  const fetchStrategicGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentYear = new Date().getFullYear();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${API_BASE_URL}/strategic-objectives?year=${currentYear}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch strategic goals');
        return;
      }

      const result = await response.json();
      const goals: StrategicGoal[] = result.data || [];

      // 分类
      const strategies = goals.filter(g => g.type === 'company-strategy' && g.status === 'active');
      const keyWorks = goals.filter(g => g.type === 'company-key-work' && g.status === 'active');
      
      // 部门重点工作：经理/GM/Admin看全部，员工只看自己部门
      let deptWorks;
      if (user?.role === 'manager' || user?.role === 'gm' || user?.role === 'admin') {
        // 经理、GM、Admin：看所有部门的重点工作
        deptWorks = goals.filter(g => g.type === 'department-key-work' && g.status === 'active');
      } else {
        // 员工：只看自己部门的
        deptWorks = goals.filter(g => 
          g.type === 'department-key-work' && 
          g.status === 'active' && 
          g.department === user?.department
        );
      }

      setCompanyStrategies(strategies);
      setCompanyKeyWorks(keyWorks);
      setDepartmentKeyWorks(deptWorks);
    } catch (error) {
      console.error('Error fetching strategic goals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-400">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  // 紧凑模式 - 单卡片
  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            战略目标
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {companyStrategies.length > 0 && (
            <div>
              <p className="font-medium text-blue-900 mb-1">公司战略</p>
              <ul className="text-xs text-blue-700 space-y-1">
                {companyStrategies.map(s => (
                  <li key={s.id}>• {s.title}</li>
                ))}
              </ul>
            </div>
          )}
          
          {companyKeyWorks.length > 0 && (
            <div>
              <p className="font-medium text-purple-900 mb-1">年度重点工作</p>
              <ul className="text-xs text-purple-700 space-y-1">
                {companyKeyWorks.slice(0, 3).map(kw => (
                  <li key={kw.id}>• {kw.title}</li>
                ))}
              </ul>
            </div>
          )}

          {showDepartment && departmentKeyWorks.length > 0 && (
            <div>
              <p className="font-medium text-green-900 mb-1">
                {(user?.role === 'manager' || user?.role === 'gm' || user?.role === 'admin') 
                  ? '部门重点工作' 
                  : `${user?.department} 重点工作`}
              </p>
              <ul className="text-xs text-green-700 space-y-1">
                {departmentKeyWorks.slice(0, 2).map(dw => (
                  <li key={dw.id}>
                    • {dw.title}
                    {(user?.role === 'manager' || user?.role === 'gm' || user?.role === 'admin') && dw.department && (
                      <span className="text-green-600 ml-1">({dw.department})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {companyStrategies.length === 0 && companyKeyWorks.length === 0 && departmentKeyWorks.length === 0 && (
            <p className="text-center text-gray-400 text-xs py-2">暂无战略目标</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // 完整模式 - 多卡片
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 公司战略 */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              公司战略
            </CardTitle>
            <Badge variant="outline" className="bg-white text-blue-700 border-blue-300">
              {companyStrategies.length}项
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {companyStrategies.length > 0 ? (
            <ul className="space-y-3">
              {companyStrategies.map((strategy, idx) => (
                <li key={strategy.id} className="pb-3 border-b border-blue-100 last:border-0 last:pb-0">
                  <div className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 text-sm">{strategy.title}</h3>
                      {strategy.description && (
                        <p className="text-xs text-blue-700 mt-1">{strategy.description}</p>
                      )}
                      {strategy.content && (
                        <p className="text-xs text-blue-600 whitespace-pre-wrap mt-2 p-2 bg-white/50 rounded">
                          {strategy.content}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">暂未设置</p>
          )}
        </CardContent>
      </Card>

      {/* 公司重点工作 */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              年度重点工作
            </CardTitle>
            <Badge variant="outline" className="bg-white text-purple-700 border-purple-300">
              {companyKeyWorks.length}项
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {companyKeyWorks.length > 0 ? (
            <ul className="space-y-2">
              {companyKeyWorks.map((kw, idx) => (
                <li key={kw.id} className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-900">{kw.title}</p>
                    {kw.description && (
                      <p className="text-xs text-purple-700 mt-0.5">{kw.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">暂未设置</p>
          )}
        </CardContent>
      </Card>

      {/* 部门重点工作 */}
      {showDepartment && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                {(user?.role === 'manager' || user?.role === 'gm' || user?.role === 'admin') 
                  ? '部门重点工作' 
                  : `${user?.department} 重点工作`}
              </CardTitle>
              <Badge variant="outline" className="bg-white text-green-700 border-green-300">
                {departmentKeyWorks.length}项
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {departmentKeyWorks.length > 0 ? (
              <ul className="space-y-2">
                {departmentKeyWorks.map((dw, idx) => (
                  <li key={dw.id} className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-green-900 flex-1">{dw.title}</p>
                        {(user?.role === 'manager' || user?.role === 'gm' || user?.role === 'admin') && dw.department && (
                          <Badge variant="outline" className="text-xs bg-white text-green-700 border-green-300">
                            {dw.department}
                          </Badge>
                        )}
                      </div>
                      {dw.description && (
                        <p className="text-xs text-green-700 mt-0.5">{dw.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">暂未设置</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
