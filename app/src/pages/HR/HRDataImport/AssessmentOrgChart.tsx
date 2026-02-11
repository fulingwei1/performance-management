import { Users, Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Employee, Department } from '@/types';

interface AssessmentOrgChartProps {
  departments: Department[];
  employees: Employee[];
}

export function AssessmentOrgChart({ departments, employees }: AssessmentOrgChartProps) {
  const managers = employees.filter(e => e.role === 'manager' || e.role === 'gm');
  const hierarchy = managers.map(manager => ({
    manager,
    subordinates: employees.filter(e => e.managerId === manager.id),
    department: departments.find((d: Department) => d.id === manager.subDepartment || d.name === manager.department)
  }));

  return (
    <div className="space-y-6">
      {hierarchy.map(({ manager, subordinates, department }) => (
        <div key={manager.id} className="border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-lg">{manager.name}</h4>
              <p className="text-sm text-gray-500">{department?.name || manager.department} · {manager.role === 'manager' ? '部门经理' : '总经理'}</p>
            </div>
            <Badge className="ml-auto">考核 {subordinates.length} 人</Badge>
          </div>
          {subordinates.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {subordinates.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">{emp.name.charAt(0)}</div>
                  <div className="overflow-hidden">
                    <p className="font-medium text-sm truncate">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.level}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">暂无下属员工</p>
          )}
        </div>
      ))}
      {hierarchy.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Network className="w-16 h-16 mx-auto mb-4" />
          <p>暂无组织架构数据</p>
          <p className="text-sm mt-2">请先导入部门和员工数据</p>
        </div>
      )}
    </div>
  );
}
