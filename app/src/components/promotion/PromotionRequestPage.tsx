import { useEffect, useMemo, useState } from 'react';
import type { Employee, EmployeeLevel, PerformanceRecord } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { usePromotionStore } from '@/stores/promotionStore';
import { employeeApi, performanceApi } from '@/services/api';
import { employeeLevels, getLevelLabel } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PromotionApprovalsList } from '@/components/promotion/PromotionApprovalsList';
import { toast } from 'sonner';

const statusLabel: Record<string, string> = {
  draft: '草稿',
  submitted: '待经理审批',
  manager_approved: '待总经理审批',
  gm_approved: '待HR审批',
  hr_approved: '已通过',
  rejected: '已拒绝'
};

const nextRoleLabel = (role: string) => {
  if (role === 'manager') return '待经理审批';
  if (role === 'gm') return '待总经理审批';
  if (role === 'hr') return '待HR审批';
  return '';
};

const getStatusLabel = (req: { status: string; nextRole?: string | null }) => {
  if (req.status === 'draft') return statusLabel.draft;
  if (req.status === 'rejected') return statusLabel.rejected;
  if (req.nextRole === null) return '已通过';
  if (req.nextRole) return nextRoleLabel(req.nextRole);
  return statusLabel[req.status] || req.status;
};

interface PromotionRequestPageProps {
  allowEmployeeSelect: boolean;
  showPendingApprovals?: boolean;
}

const formatPerformanceSummary = (record: PerformanceRecord) => {
  const score = typeof record.totalScore === 'number' ? record.totalScore.toFixed(2) : '-';
  return `最近绩效（${record.month}）：总分${score}，等级${record.level || '-'}，组内排名${record.groupRank || '-'}，跨部门排名${record.crossDeptRank || '-'}`;
};

export function PromotionRequestPage({
  allowEmployeeSelect,
  showPendingApprovals = false
}: PromotionRequestPageProps) {
  const { user } = useAuthStore();
  const {
    myRequests,
    pendingRequests,
    loading,
    fetchMyRequests,
    fetchPendingRequests,
    createRequest,
    approveRequest,
    rejectRequest
  } = usePromotionStore();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [targetLevel, setTargetLevel] = useState<EmployeeLevel>('junior');
  const [targetPosition, setTargetPosition] = useState('');
  const [raisePercentage, setRaisePercentage] = useState<number>(5);
  const [performanceSummary, setPerformanceSummary] = useState('');
  const [skillSummary, setSkillSummary] = useState('');
  const [competencySummary, setCompetencySummary] = useState('');
  const [workSummary, setWorkSummary] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchMyRequests();
    if (showPendingApprovals) {
      fetchPendingRequests();
    }
  }, [user, fetchMyRequests, fetchPendingRequests, showPendingApprovals]);

  useEffect(() => {
    if (!user) return;
    const loadEmployees = async () => {
      if (!allowEmployeeSelect) {
        setEmployees([]);
        setSelectedEmployeeId(user.id);
        return;
      }
      try {
        const response = await employeeApi.getSubordinates();
        const list = (response.data || []) as Employee[];
        const self: Employee = {
          id: user.id,
          name: user.name,
          department: user.department || '',
          subDepartment: user.subDepartment || '',
          role: user.role as Employee['role'],
          level: user.level as Employee['level'],
          managerId: user.managerId
        };
        const merged = [self, ...list.filter(emp => emp.id !== user.id)];
        setEmployees(merged);
        setSelectedEmployeeId(prev => prev || self.id || merged[0]?.id || '');
      } catch (error: any) {
        toast.error(error.message || '获取下属失败');
      }
    };
    loadEmployees();
  }, [user, allowEmployeeSelect]);

  useEffect(() => {
    if (!user) return;
    const loadRecords = async () => {
      try {
        const response = allowEmployeeSelect
          ? await performanceApi.getTeamRecords()
          : await performanceApi.getMyRecords();
        setRecords(response.data || []);
      } catch (error: any) {
        toast.error(error.message || '获取绩效记录失败');
      }
    };
    loadRecords();
  }, [user, allowEmployeeSelect]);

  const selectedEmployee = useMemo(() => {
    if (allowEmployeeSelect) {
      return employees.find(emp => emp.id === selectedEmployeeId);
    }
    if (!user) return undefined;
    return {
      id: user.id,
      name: user.name,
      department: user.department || '',
      subDepartment: user.subDepartment || '',
      role: user.role as Employee['role'],
      level: user.level as Employee['level'],
      managerId: user.managerId
    } as Employee;
  }, [allowEmployeeSelect, employees, selectedEmployeeId, user]);

  useEffect(() => {
    if (selectedEmployee?.level) {
      setTargetLevel(selectedEmployee.level);
    }
  }, [selectedEmployee?.id, selectedEmployee?.level]);

  const latestRecord = useMemo(() => {
    if (!selectedEmployeeId && !selectedEmployee?.id) return undefined;
    const empId = selectedEmployeeId || selectedEmployee?.id;
    if (!empId) return undefined;
    const list = records.filter(r => r.employeeId === empId);
    if (list.length === 0) return undefined;
    return [...list].sort((a, b) => b.month.localeCompare(a.month))[0];
  }, [records, selectedEmployeeId, selectedEmployee?.id]);

  const handleFillPerformance = () => {
    if (!latestRecord) {
      toast.error('暂无绩效记录');
      return;
    }
    setPerformanceSummary(formatPerformanceSummary(latestRecord));
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId && allowEmployeeSelect) {
      toast.error('请选择员工');
      return;
    }
    if (!targetPosition.trim()) {
      toast.error('请填写目标岗位');
      return;
    }
    if (!raisePercentage || raisePercentage <= 0) {
      toast.error('请填写正确的调薪比例');
      return;
    }
    if (!performanceSummary.trim() || !skillSummary.trim() || !competencySummary.trim() || !workSummary.trim()) {
      toast.error('请完整填写申请内容');
      return;
    }

    const payload = {
      employeeId: allowEmployeeSelect ? selectedEmployeeId : undefined,
      targetLevel,
      targetPosition: targetPosition.trim(),
      raisePercentage,
      performanceSummary: performanceSummary.trim(),
      skillSummary: skillSummary.trim(),
      competencySummary: competencySummary.trim(),
      workSummary: workSummary.trim()
    };

    const ok = await createRequest(payload);
    if (ok) {
      toast.success('申请已提交');
      setTargetPosition('');
      setRaisePercentage(5);
      setPerformanceSummary('');
      setSkillSummary('');
      setCompetencySummary('');
      setWorkSummary('');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">晋升/加薪申请</CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">发起申请</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {allowEmployeeSelect && (
            <div className="space-y-2">
              <Label>选择员工</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择员工" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}（{emp.department}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedEmployee && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <Badge variant="outline">当前职级：{getLevelLabel(selectedEmployee.level)}</Badge>
              <Badge variant="outline">部门：{selectedEmployee.subDepartment || selectedEmployee.department}</Badge>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>目标职级</Label>
              <Select value={targetLevel} onValueChange={(value) => setTargetLevel(value as EmployeeLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(employeeLevels).map(level => (
                    <SelectItem key={level} value={level}>
                      {getLevelLabel(level as EmployeeLevel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>目标岗位名称</Label>
              <Input
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                placeholder="例如：高级工程师/项目经理"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>调薪比例（%）</Label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={raisePercentage}
              onChange={(e) => setRaisePercentage(Number(e.target.value))}
              placeholder="例如：8"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>绩效考核数据</Label>
              <Button size="sm" variant="outline" onClick={handleFillPerformance}>
                填充最近绩效
              </Button>
            </div>
            <Textarea
              value={performanceSummary}
              onChange={(e) => setPerformanceSummary(e.target.value)}
              placeholder="请填写日常绩效考核数据总结"
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label>技能水平总结</Label>
            <Textarea
              value={skillSummary}
              onChange={(e) => setSkillSummary(e.target.value)}
              placeholder="请填写技能水平总结"
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label>能力素质总结</Label>
            <Textarea
              value={competencySummary}
              onChange={(e) => setCompetencySummary(e.target.value)}
              placeholder="请填写能力素质总结"
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label>工作总结</Label>
            <Textarea
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              placeholder="请填写工作总结"
              className="min-h-[120px]"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={loading}>
              提交申请
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPendingApprovals && (
        <PromotionApprovalsList
          title="待我审批"
          requests={pendingRequests}
          loading={loading}
          onApprove={approveRequest}
          onReject={rejectRequest}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">我的申请</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myRequests.length === 0 && (
            <div className="text-sm text-gray-500">暂无申请记录</div>
          )}
          {myRequests.map(req => (
            <div key={req.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="font-medium">
                  {req.employeeName || selectedEmployee?.name || '员工'} → {getLevelLabel(req.targetLevel)}
                </div>
                <div className="text-sm text-gray-500">
                  目标岗位：{req.targetPosition} · 调薪 {req.raisePercentage}%
                </div>
              </div>
              <Badge variant="outline">{getStatusLabel(req)}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
