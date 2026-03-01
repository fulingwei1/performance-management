import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEPARTMENT_TYPES = [
  { value: 'sales', label: '销售类', color: 'bg-green-100 text-green-700', icon: '💰' },
  { value: 'engineering', label: '工程类', color: 'bg-blue-100 text-blue-700', icon: '🔧' },
  { value: 'manufacturing', label: '生产类', color: 'bg-orange-100 text-orange-700', icon: '🏭' },
  { value: 'support', label: '支持类', color: 'bg-purple-100 text-purple-700', icon: '📋' },
  { value: 'management', label: '管理类', color: 'bg-red-100 text-red-700', icon: '👔' }
];

interface Department {
  id: string;
  name: string;
  parentId?: string;
  department_type?: string;
}

export function DepartmentClassification() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [changes, setChanges] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/departments/tree`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 扁平化部门树
          const flatDepts = flattenDepartments(result.data || []);
          setDepartments(flatDepts);
        }
      }
    } catch (error) {
      console.error('加载部门失败:', error);
      toast.error('加载部门失败');
    } finally {
      setLoading(false);
    }
  };

  const flattenDepartments = (tree: any[], result: Department[] = []): Department[] => {
    tree.forEach(node => {
      result.push({
        id: node.id,
        name: node.name,
        parentId: node.parentId,
        department_type: node.department_type || 'support'
      });
      if (node.children?.length > 0) {
        flattenDepartments(node.children, result);
      }
    });
    return result;
  };

  const handleTypeChange = (deptId: string, newType: string) => {
    const newChanges = new Map(changes);
    newChanges.set(deptId, newType);
    setChanges(newChanges);
    
    // 更新本地显示
    setDepartments(depts => 
      depts.map(d => d.id === deptId ? { ...d, department_type: newType } : d)
    );
  };

  const handleSaveAll = async () => {
    if (changes.size === 0) {
      toast.info('没有需要保存的更改');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [deptId, type] of changes.entries()) {
      try {
        const response = await fetch(`${API_URL}/api/departments/${deptId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ department_type: type })
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`保存部门 ${deptId} 失败:`, error);
        errorCount++;
      }
    }

    setSaving(false);
    
    if (errorCount === 0) {
      toast.success(`已保存 ${successCount} 个部门的分类`);
      setChanges(new Map());
    } else {
      toast.error(`保存失败: ${errorCount} 个，成功: ${successCount} 个`);
    }
  };

  const getTypeConfig = (type: string) => {
    return DEPARTMENT_TYPES.find(t => t.value === type) || DEPARTMENT_TYPES[3];
  };

  const getStatistics = () => {
    const stats = new Map<string, number>();
    departments.forEach(dept => {
      const type = dept.department_type || 'support';
      stats.set(type, (stats.get(type) || 0) + 1);
    });
    return stats;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = getStatistics();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">部门分类管理</h2>
          <p className="text-gray-500 mt-1">为不同部门设置类型，以应用差异化考核模板</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDepartments} disabled={saving}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button onClick={handleSaveAll} disabled={saving || changes.size === 0}>
            <Save className="w-4 h-4 mr-2" />
            保存全部 {changes.size > 0 && `(${changes.size})`}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        {DEPARTMENT_TYPES.map(type => (
          <Card key={type.value}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{type.icon}</span>
                <div className="flex-1">
                  <div className="text-sm text-gray-500">{type.label}</div>
                  <div className="text-2xl font-bold">{stats.get(type.value) || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 部门列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            部门分类配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {departments.map(dept => {
              const currentType = dept.department_type || 'support';
              const typeConfig = getTypeConfig(currentType);
              const hasChange = changes.has(dept.id);

              return (
                <div key={dept.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{typeConfig.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{dept.name}</div>
                      {hasChange && (
                        <div className="text-xs text-orange-600">● 未保存的更改</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={typeConfig.color}>
                      {typeConfig.label}
                    </Badge>
                    
                    <Select
                      value={currentType}
                      onValueChange={(value) => handleTypeChange(dept.id, value)}
                      disabled={saving}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-900 mb-2">💡 使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>销售类</strong>：注重业绩指标（销售额、回款率、客户开发）</li>
            <li>• <strong>工程类</strong>：注重项目交付和技术能力</li>
            <li>• <strong>生产类</strong>：注重效率、质量和安全</li>
            <li>• <strong>支持类</strong>：注重准确性、及时性和服务满意度</li>
            <li>• <strong>管理类</strong>：综合考核，侧重管理能力和战略执行</li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
