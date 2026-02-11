import { useState } from 'react';
import { Building2, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface OrgNode {
  id: string;
  name: string;
  type: 'department' | 'subDepartment' | 'employee';
  managerId?: string;
  children?: OrgNode[];
}

export function OrgConfigPanel({ orgStructure }: { orgStructure: OrgNode[] }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        <p className="font-medium text-gray-900">组织架构说明</p>
        <p className="mt-2 text-gray-500 leading-relaxed">当前展示部门层级结构，点击节点可展开/折叠查看下属部门或员工</p>
      </div>
      <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 min-h-[300px]">
        {orgStructure.map(node => <OrgTreeNode key={node.id} node={node} level={0} />)}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={() => window.location.reload()}>重置默认</Button>
        <Button className="bg-blue-600 hover:bg-blue-700">保存架构</Button>
      </div>
    </div>
  );
}

function OrgTreeNode({ node, level }: { node: OrgNode; level: number }) {
  const [expanded, setExpanded] = useState(true);
  const levelBgColors = [
    'bg-blue-50 hover:bg-blue-100', 'bg-purple-50 hover:bg-purple-100',
    'bg-green-50 hover:bg-green-100', 'bg-orange-50 hover:bg-orange-100', 'bg-pink-50 hover:bg-pink-100'
  ];

  return (
    <div className="relative" style={{ paddingLeft: `${level * 20}px` }}>
      {level > 0 && (
        <div className="absolute left-0 top-1/2 w-[20px] h-px border-t-2 border-dashed border-gray-300" style={{ marginLeft: `-${level * 20}px` }} />
      )}
      <div
        className={`flex items-center gap-2 py-3 px-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${levelBgColors[level % levelBgColors.length]} ${expanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}
        onClick={() => setExpanded(!expanded)}
      >
        {node.children && (
          <div className={`w-5 h-5 flex items-center justify-center rounded-full transition-transform duration-200 ${expanded ? 'bg-blue-600' : 'bg-gray-400'}`}>
            <ChevronRight className={`w-3 h-3 text-white transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
          </div>
        )}
        {node.type === 'department' && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white"><Building2 className="w-4 h-4" /></div>
        )}
        {node.type === 'subDepartment' && (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white"><Users className="w-3 h-3" /></div>
        )}
        {node.type === 'employee' && (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white"><span className="text-xs font-bold">{node.name.charAt(0)}</span></div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{node.name}</span>
            {node.type === 'department' && <Badge className="bg-blue-100 text-blue-700 text-xs font-medium">部门</Badge>}
            {node.type === 'subDepartment' && <Badge className="bg-purple-100 text-purple-700 text-xs font-medium">子部门</Badge>}
            {node.type === 'employee' && node.managerId && <Badge className="bg-green-100 text-green-700 text-xs font-medium">员工</Badge>}
          </div>
          {node.type === 'subDepartment' && node.managerId && <div className="text-xs text-gray-500">经理: {node.managerId}</div>}
        </div>
      </div>
      {expanded && node.children && (
        <div className="mt-2 pl-4 border-l-2 border-gray-200">
          {node.children.map(child => <OrgTreeNode key={child.id} node={child} level={level + 1} />)}
        </div>
      )}
    </div>
  );
}
