import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function OrgTree({ nodes, level = 0 }: { nodes: any[]; level?: number }) {
  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <div key={node.id} style={{ marginLeft: level * 20 }}>
          <div className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{node.name}</span>
            <Badge variant="outline" className="text-xs">{node.employees?.length || 0}人</Badge>
          </div>
          {node.children?.length > 0 && <OrgTree nodes={node.children} level={level + 1} />}
        </div>
      ))}
    </div>
  );
}
