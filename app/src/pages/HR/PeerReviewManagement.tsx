import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Calendar, TrendingUp, Filter, Trash2, X, UserPlus, Link2 } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api/peer-reviews';

// 360度互评管理（HR视图）
export default function PeerReviewManagement() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [configCycleId, setConfigCycleId] = useState<number | null>(null);
  const [relationshipCounts, setRelationshipCounts] = useState<Record<number, { total: number; completed: number }>>({});

  const fetchCycles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/cycles`);
      const data = await response.json();
      if (data.success) {
        setCycles(data.data || []);
        // Fetch relationship counts for each cycle
        for (const cycle of (data.data || [])) {
          fetchRelationshipCount(cycle.id);
        }
      }
    } catch (error) {
      console.error('获取互评周期失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRelationshipCount = async (cycleId: number) => {
    try {
      const response = await fetch(`${API_BASE}/relationships/${cycleId}`);
      const data = await response.json();
      if (data.success) {
        const rels = data.data || [];
        setRelationshipCounts(prev => ({
          ...prev,
          [cycleId]: {
            total: rels.length,
            completed: rels.filter((r: any) => r.status === 'completed').length
          }
        }));
      }
    } catch (error) {
      // silent
    }
  };

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // Compute stats
  const activeCycles = cycles.filter(c => c.status === 'active').length;
  const totalRelationships = Object.values(relationshipCounts).reduce((sum, c) => sum + c.total, 0);
  const completedRelationships = Object.values(relationshipCounts).reduce((sum, c) => sum + c.completed, 0);
  const completionRate = totalRelationships > 0 ? Math.round((completedRelationships / totalRelationships) * 100) : 0;
  const pendingRelationships = totalRelationships - completedRelationships;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页头 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">360度互评管理</h1>
          <p className="text-gray-600 mt-1">管理互评周期，配置评价关系，查看互评结果</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          创建互评周期
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
          title="进行中的周期"
          value={String(activeCycles)}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<Link2 className="w-6 h-6 text-green-600" />}
          title="评价关系总数"
          value={String(totalRelationships)}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
          title="完成率"
          value={`${completionRate}%`}
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={<Filter className="w-6 h-6 text-orange-600" />}
          title="待评价"
          value={String(pendingRelationships)}
          bgColor="bg-orange-50"
        />
      </div>

      {/* 互评周期列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">互评周期</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : cycles.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">暂无互评周期</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              创建第一个互评周期
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {cycles.map((cycle) => (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                relationshipCount={relationshipCounts[cycle.id]}
                onConfigureRelationships={() => setConfigCycleId(cycle.id)}
                onRefresh={fetchCycles}
              />
            ))}
          </div>
        )}
      </div>

      {/* 创建周期Modal */}
      {showCreateModal && (
        <CreateCycleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCycles();
          }}
        />
      )}

      {/* 配置关系Modal */}
      {configCycleId !== null && (
        <ConfigureRelationshipsModal
          cycleId={configCycleId}
          cycleName={cycles.find(c => c.id === configCycleId)?.name || ''}
          onClose={() => {
            setConfigCycleId(null);
            fetchCycles();
          }}
        />
      )}
    </div>
  );
}

// 统计卡片组件
function StatCard({ icon, title, value, bgColor }: any) {
  return (
    <div className={`${bgColor} rounded-lg p-4`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// 周期卡片组件
function CycleCard({ cycle, relationshipCount, onConfigureRelationships, onRefresh }: any) {
  const count = relationshipCount || { total: 0, completed: 0 };
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{cycle.name}</h3>
          {cycle.description && (
            <p className="text-gray-600 text-sm mt-1">{cycle.description}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-sm">
            <span className="text-gray-500">
              📅 {cycle.start_date} ~ {cycle.end_date}
            </span>
            <span className="text-gray-500">
              📊 类型: {cycle.review_type === 'peer' ? '同事互评' : cycle.review_type === 'upward' ? '下属评上级' : '跨部门协作'}
            </span>
            <span className="text-gray-500">
              🔗 关系: {count.total} 条 ({count.completed} 已完成)
            </span>
            <span className={`px-2 py-0.5 rounded ${
              cycle.status === 'active' ? 'bg-green-100 text-green-700' :
              cycle.status === 'draft' ? 'bg-gray-100 text-gray-700' :
              'bg-red-100 text-red-700'
            }`}>
              {cycle.status === 'active' ? '进行中' : 
               cycle.status === 'draft' ? '草稿' : '已结束'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onConfigureRelationships}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
          >
            <UserPlus className="w-4 h-4" />
            配置关系
          </button>
          <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
            查看详情
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 配置评价关系 Modal
// ============================================
function ConfigureRelationshipsModal({ cycleId, cycleName, onClose }: {
  cycleId: number;
  cycleName: string;
  onClose: () => void;
}) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loadingRels, setLoadingRels] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [selectedReviewers, setSelectedReviewers] = useState<number[]>([]);
  const [selectedReviewees, setSelectedReviewees] = useState<number[]>([]);
  const [relationshipType, setRelationshipType] = useState<string>('peer');

  // Search filters
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [revieweeSearch, setRevieweeSearch] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchRelationships();
  }, [cycleId]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await fetch('http://localhost:3001/api/hr/employees');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error('获取员工失败:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchRelationships = async () => {
    setLoadingRels(true);
    try {
      const response = await fetch(`${API_BASE}/relationships/${cycleId}`);
      const data = await response.json();
      if (data.success) {
        setRelationships(data.data || []);
      }
    } catch (err) {
      console.error('获取关系失败:', err);
    } finally {
      setLoadingRels(false);
    }
  };

  const handleCreate = async () => {
    if (selectedReviewers.length === 0) {
      setError('请至少选择一个评价人');
      return;
    }
    if (selectedReviewees.length === 0) {
      setError('请至少选择一个被评价人');
      return;
    }

    // Build relationships: each reviewer evaluates each reviewee
    const newRels = [];
    for (const reviewerId of selectedReviewers) {
      for (const revieweeId of selectedReviewees) {
        if (reviewerId === revieweeId) continue; // Skip self-review
        newRels.push({
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          relationship_type: relationshipType,
        });
      }
    }

    if (newRels.length === 0) {
      setError('没有有效的评价关系（评价人和被评价人不能相同）');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_BASE}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_id: cycleId, relationships: newRels })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMsg(`成功创建 ${newRels.length} 条评价关系`);
        setSelectedReviewers([]);
        setSelectedReviewees([]);
        fetchRelationships();
      } else {
        setError(data.message || '创建失败');
      }
    } catch (err: any) {
      setError('网络错误: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该评价关系？')) return;
    try {
      const response = await fetch(`${API_BASE}/relationships/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchRelationships();
      } else {
        setError(data.message || '删除失败');
      }
    } catch (err: any) {
      setError('删除失败: ' + err.message);
    }
  };

  const getEmployeeName = (id: number) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.name}${emp.department ? ` (${emp.department})` : ''}` : `ID:${id}`;
  };

  const filteredReviewerEmployees = employees.filter(e =>
    !reviewerSearch || e.name?.includes(reviewerSearch) || e.department?.includes(reviewerSearch)
  );
  const filteredRevieweeEmployees = employees.filter(e =>
    !revieweeSearch || e.name?.includes(revieweeSearch) || e.department?.includes(revieweeSearch)
  );

  const toggleSelection = (list: number[], setList: (v: number[]) => void, id: number) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const relationshipTypeLabel: Record<string, string> = {
    peer: '同事互评',
    subordinate: '下属评上级',
    cross_dept: '跨部门协作',
    manager: '上级评下属',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">配置评价关系</h2>
            <p className="text-sm text-gray-500 mt-1">周期: {cycleName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
              {error}
              <button onClick={() => setError('')} className="float-right text-red-500">✕</button>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded">
              {successMsg}
              <button onClick={() => setSuccessMsg('')} className="float-right text-green-500">✕</button>
            </div>
          )}

          {/* 创建关系区域 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              批量创建评价关系
            </h3>

            {loadingEmployees ? (
              <p className="text-gray-500">加载员工列表中...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* 评价人选择 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      评价人（谁来评价） *
                    </label>
                    <input
                      type="text"
                      placeholder="搜索员工..."
                      value={reviewerSearch}
                      onChange={e => setReviewerSearch(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded mb-2 text-sm"
                    />
                    <div className="border rounded max-h-40 overflow-y-auto">
                      {filteredReviewerEmployees.map(emp => (
                        <label
                          key={emp.id}
                          className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm ${
                            selectedReviewers.includes(emp.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedReviewers.includes(emp.id)}
                            onChange={() => toggleSelection(selectedReviewers, setSelectedReviewers, emp.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>{emp.name}</span>
                          {emp.department && <span className="text-gray-400 text-xs">({emp.department})</span>}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">已选 {selectedReviewers.length} 人</p>
                  </div>

                  {/* 被评价人选择 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      被评价人（被谁评价） *
                    </label>
                    <input
                      type="text"
                      placeholder="搜索员工..."
                      value={revieweeSearch}
                      onChange={e => setRevieweeSearch(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded mb-2 text-sm"
                    />
                    <div className="border rounded max-h-40 overflow-y-auto">
                      {filteredRevieweeEmployees.map(emp => (
                        <label
                          key={emp.id}
                          className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm ${
                            selectedReviewees.includes(emp.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedReviewees.includes(emp.id)}
                            onChange={() => toggleSelection(selectedReviewees, setSelectedReviewees, emp.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>{emp.name}</span>
                          {emp.department && <span className="text-gray-400 text-xs">({emp.department})</span>}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">已选 {selectedReviewees.length} 人</p>
                  </div>
                </div>

                {/* 关系类型 + 提交 */}
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">关系类型</label>
                    <select
                      value={relationshipType}
                      onChange={e => setRelationshipType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="peer">同事互评</option>
                      <option value="subordinate">下属评上级</option>
                      <option value="cross_dept">跨部门协作</option>
                    </select>
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={submitting || selectedReviewers.length === 0 || selectedReviewees.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting ? '创建中...' : (
                      <>
                        <Plus className="w-4 h-4" />
                        批量创建
                      </>
                    )}
                  </button>
                </div>

                {selectedReviewers.length > 0 && selectedReviewees.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    将创建 {selectedReviewers.length} × {selectedReviewees.length} = 最多 {selectedReviewers.length * selectedReviewees.length} 条关系
                    （排除自评）
                  </p>
                )}
              </>
            )}
          </div>

          {/* 已配置关系列表 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              已配置的评价关系 ({relationships.length})
            </h3>

            {loadingRels ? (
              <p className="text-gray-500">加载中...</p>
            ) : relationships.length === 0 ? (
              <p className="text-gray-400 text-center py-4">暂无评价关系，请在上方批量创建</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-600">
                      <th className="pb-2 pr-4">评价人</th>
                      <th className="pb-2 pr-4">被评价人</th>
                      <th className="pb-2 pr-4">关系类型</th>
                      <th className="pb-2 pr-4">状态</th>
                      <th className="pb-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relationships.map((rel: any) => (
                      <tr key={rel.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-4">{getEmployeeName(rel.reviewer_id)}</td>
                        <td className="py-2 pr-4">{getEmployeeName(rel.reviewee_id)}</td>
                        <td className="py-2 pr-4">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {relationshipTypeLabel[rel.relationship_type] || rel.relationship_type}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            rel.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {rel.status === 'completed' ? '已完成' : '待评价'}
                          </span>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleDelete(rel.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

// 创建周期Modal组件
function CreateCycleModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    review_type: 'peer',
    is_anonymous: false
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/cycles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        alert('创建失败: ' + data.message);
      }
    } catch (error) {
      console.error('创建失败:', error);
      alert('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">创建互评周期</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">周期名称 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如: 2026-Q1同事互评"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">周期说明</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="互评周期的目的和说明"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期 *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期 *</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">互评类型</label>
            <select
              value={formData.review_type}
              onChange={(e) => setFormData({ ...formData, review_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="peer">同事互评</option>
              <option value="upward">下属评上级</option>
              <option value="cross">跨部门协作评价</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_anonymous}
              onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">匿名评价（被评价人看不到谁评价的）</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
