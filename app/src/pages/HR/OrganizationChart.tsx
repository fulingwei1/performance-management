import { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { organizationApi, employeeApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Download, Users, History, Building2 } from 'lucide-react';
import html2canvas from 'html2canvas';

// ============ Layout Helper ============

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 60 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 40,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// ============ Build Flow Data ============

const buildFlowData = (treeData: any[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const traverse = (items: any[], parentId: string | null = null) => {
    items.forEach((item: any) => {
      if (item.type === 'department') {
        const empCount = item.employees?.length || 0;
        nodes.push({
          id: item.id,
          type: 'default',
          data: {
            label: (
              <div className="p-3 bg-blue-50 border-2 border-blue-400 rounded-lg min-w-[160px] text-center">
                <div className="font-bold text-blue-900 text-sm">
                  <Building2 className="inline-block w-4 h-4 mr-1 mb-0.5" />
                  {item.name}
                </div>
                {empCount > 0 && (
                  <div className="text-xs text-blue-600 mt-1">{empCount} 人</div>
                )}
              </div>
            ),
          },
          position: { x: 0, y: 0 },
        });

        if (parentId) {
          edges.push({
            id: `${parentId}-${item.id}`,
            source: parentId,
            target: item.id,
            type: 'smoothstep',
            style: { stroke: '#3b82f6', strokeWidth: 2 },
          });
        }

        // Add employees as nodes
        if (item.employees) {
          item.employees.forEach((emp: any) => {
            const isManager = emp.role === 'manager' || emp.role === 'gm';
            nodes.push({
              id: emp.id,
              type: 'default',
              data: {
                label: (
                  <div className={`p-2 rounded text-center min-w-[120px] ${
                    isManager 
                      ? 'bg-amber-50 border-2 border-amber-400' 
                      : 'bg-gray-50 border border-gray-300'
                  }`}>
                    <div className={`font-medium text-sm ${isManager ? 'text-amber-900' : ''}`}>
                      {emp.name}
                    </div>
                    <div className="text-xs text-gray-500">{emp.position || '员工'}</div>
                  </div>
                ),
              },
              position: { x: 0, y: 0 },
            });

            edges.push({
              id: `${item.id}-${emp.id}`,
              source: item.id,
              target: emp.id,
              type: 'smoothstep',
              style: { stroke: '#9ca3af', strokeWidth: 1 },
            });
          });
        }

        // Recurse children
        if (item.children) {
          traverse(item.children, item.id);
        }
      }
    });
  };

  traverse(treeData);
  return { nodes, edges };
};

// ============ Transfer Dialog ============

function TransferDialog({
  open,
  onClose,
  onSuccess,
  employees,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: any[];
  departments: string[];
}) {
  const [form, setForm] = useState({
    employeeId: '',
    toDepartment: '',
    toPosition: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.employeeId || !form.toDepartment) {
      toast.error('请选择员工和目标部门');
      return;
    }
    setLoading(true);
    try {
      const response = await organizationApi.transferEmployee(form);
      if (response.success) {
        toast.success('调动成功');
        setForm({ employeeId: '', toDepartment: '', toPosition: '', reason: '' });
        onSuccess();
        onClose();
      } else {
        toast.error(response.message || '调动失败');
      }
    } catch (err) {
      toast.error('调动失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>人员调动</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>员工</Label>
            <Select
              value={form.employeeId}
              onValueChange={(v) => setForm({ ...form, employeeId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择员工" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>调入部门</Label>
            <Select
              value={form.toDepartment}
              onValueChange={(v) => setForm({ ...form, toDepartment: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择部门" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>新岗位</Label>
            <Input
              value={form.toPosition}
              onChange={(e) => setForm({ ...form, toPosition: e.target.value })}
              placeholder="可选"
            />
          </div>
          <div>
            <Label>调动原因</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="请填写调动原因"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '处理中...' : '确认调动'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main Component ============

export function OrganizationChart() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('chart');
  const flowRef = useRef<HTMLDivElement>(null);

  const loadOrgTree = useCallback(async () => {
    try {
      const response = await organizationApi.getOrgTree();
      if (response.success && response.data) {
        const { nodes: flowNodes, edges: flowEdges } = buildFlowData(response.data);
        const layouted = getLayoutedElements(flowNodes, flowEdges);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);

        // Extract department names
        const deptNames = new Set<string>();
        const extractDepts = (items: any[]) => {
          items.forEach((item: any) => {
            if (item.type === 'department') {
              deptNames.add(item.name);
              if (item.children) extractDepts(item.children);
            }
          });
        };
        extractDepts(response.data);
        setDepartments(Array.from(deptNames));
      }
    } catch (err) {
      console.error('Failed to load org tree', err);
    }
  }, [setNodes, setEdges]);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await employeeApi.getAllEmployees();
      if (response.success) {
        setEmployees(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  }, []);

  const loadTransfers = useCallback(async () => {
    try {
      const response = await organizationApi.getTransferHistory();
      if (response.success) {
        setTransfers(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load transfers', err);
    }
  }, []);

  useEffect(() => {
    loadOrgTree();
    loadEmployees();
    loadTransfers();
  }, [loadOrgTree, loadEmployees, loadTransfers]);

  const handleExportImage = async () => {
    const element = flowRef.current?.querySelector('.react-flow') as HTMLElement;
    if (element) {
      try {
        const canvas = await html2canvas(element, { useCORS: true, scale: 2 });
        const link = document.createElement('a');
        link.download = '组织架构图.png';
        link.href = canvas.toDataURL();
        link.click();
        toast.success('导出成功');
      } catch (err) {
        toast.error('导出失败');
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-white border-b flex items-center justify-between">
        <h1 className="text-2xl font-bold">组织架构图</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportImage}>
            <Download className="mr-2 h-4 w-4" />
            导出图片
          </Button>
          <Button onClick={() => setShowTransferDialog(true)}>
            <Users className="mr-2 h-4 w-4" />
            人员调动
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 border-b bg-white">
          <TabsList>
            <TabsTrigger value="chart">
              <Building2 className="mr-1 h-4 w-4" />
              架构图
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-1 h-4 w-4" />
              调动历史
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chart" className="flex-1 m-0" ref={flowRef}>
          <div style={{ height: 'calc(100vh - 180px)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              attributionPosition="bottom-left"
            >
              <Background color="#e5e7eb" gap={20} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  if (node.id.startsWith('dept-') || node.id.startsWith('subdept-')) return '#3b82f6';
                  if (node.id.startsWith('m') || node.id.startsWith('gm')) return '#f59e0b';
                  return '#9ca3af';
                }}
                maskColor="rgba(255, 255, 255, 0.7)"
              />
            </ReactFlow>
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 m-0 p-6 overflow-auto">
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>员工</TableHead>
                  <TableHead>原部门</TableHead>
                  <TableHead>新部门</TableHead>
                  <TableHead>原岗位</TableHead>
                  <TableHead>新岗位</TableHead>
                  <TableHead>原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      暂无调动记录
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.transfer_date}</TableCell>
                      <TableCell>{t.employee_name}</TableCell>
                      <TableCell>{t.from_department}</TableCell>
                      <TableCell>{t.to_department}</TableCell>
                      <TableCell>{t.from_position || '-'}</TableCell>
                      <TableCell>{t.to_position || '-'}</TableCell>
                      <TableCell>{t.reason || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <TransferDialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        onSuccess={() => {
          loadOrgTree();
          loadTransfers();
        }}
        employees={employees}
        departments={departments}
      />
    </div>
  );
}
