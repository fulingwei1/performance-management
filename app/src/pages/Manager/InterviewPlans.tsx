import { useState, useEffect } from 'react';
import { Calendar, Plus, Users, Clock, CheckCircle, XCircle, Edit } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// 面谈计划管理（经理/HR视图）
export default function InterviewPlans() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user, filter]);

  const fetchPlans = async () => {
    try {
      let url = 'http://localhost:3001/api/interview-records/plans';
      
      // 根据角色和筛选条件构建URL
      if (user?.role === 'manager') {
        url += `?manager_id=${user.id}`;
      }
      
      if (filter !== 'all') {
        url += `${url.includes('?') ? '&' : '?'}status=${filter}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.data || []);
      }
    } catch (error) {
      console.error('获取面谈计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页头 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">面谈计划</h1>
          <p className="text-gray-600 mt-1">安排和管理绩效面谈计划</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          创建面谈计划
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
          label="已安排"
          value={plans.filter(p => p.status === 'scheduled').length}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-orange-600" />}
          label="本周"
          value={plans.filter(p => isThisWeek(p.scheduled_date)).length}
          bgColor="bg-orange-50"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          label="已完成"
          value={plans.filter(p => p.status === 'completed').length}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<XCircle className="w-6 h-6 text-red-600" />}
          label="已取消"
          value={plans.filter(p => p.status === 'cancelled').length}
          bgColor="bg-red-50"
        />
      </div>

      {/* 筛选器 */}
      <div className="mb-4">
        <div className="flex gap-2">
          {['all', 'scheduled', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? '全部' :
               status === 'scheduled' ? '已安排' :
               status === 'completed' ? '已完成' : '已取消'}
            </button>
          ))}
        </div>
      </div>

      {/* 面谈计划列表 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">暂无面谈计划</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              创建第一个面谈计划
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onRefresh={fetchPlans} />
            ))}
          </div>
        )}
      </div>

      {/* 创建面谈Modal */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchPlans();
          }}
        />
      )}
    </div>
  );
}

// 统计卡片
function StatCard({ icon, label, value, bgColor }: any) {
  return (
    <div className={`${bgColor} rounded-lg p-4`}>
      <div className="flex items-center gap-3">
        <div>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// 计划卡片
function PlanCard({ plan, onRefresh }: any) {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    rescheduled: 'bg-orange-100 text-orange-700'
  };

  const statusLabels = {
    scheduled: '已安排',
    completed: '已完成',
    cancelled: '已取消',
    rescheduled: '已改期'
  };

  const typeLabels = {
    regular: '常规面谈',
    probation: '试用期转正',
    promotion: '晋升评估',
    exit: '离职面谈'
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{plan.title}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[plan.status]}`}>
              {statusLabels[plan.status]}
            </span>
            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
              {typeLabels[plan.interview_type]}
            </span>
          </div>
          
          {plan.description && (
            <p className="text-gray-600 text-sm mb-2">{plan.description}</p>
          )}
          
          <div className="flex gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {plan.scheduled_date}
              {plan.scheduled_time && ` ${plan.scheduled_time}`}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {plan.duration_minutes}分钟
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              员工 #{plan.employee_id}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
            查看详情
          </button>
          <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 创建面谈Modal
function CreatePlanModal({ onClose, onSuccess }: any) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    interview_type: 'regular',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    employee_id: '',
    template_id: null
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:3001/api/interview-records/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          manager_id: user?.id,
          employee_id: parseInt(formData.employee_id)
        })
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <h2 className="text-xl font-bold text-gray-900">创建面谈计划</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              面谈主题 *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="例如: Q1绩效面谈"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              面谈类型 *
            </label>
            <select
              required
              value={formData.interview_type}
              onChange={(e) => setFormData({ ...formData, interview_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="regular">常规绩效面谈</option>
              <option value="probation">试用期转正</option>
              <option value="promotion">晋升评估</option>
              <option value="exit">离职面谈</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              被面谈员工ID *
            </label>
            <input
              type="number"
              required
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="输入员工ID"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                面谈日期 *
              </label>
              <input
                type="date"
                required
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                面谈时间
              </label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预计时长（分钟）
            </label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="15"
              step="15"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              面谈说明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="面谈的目的和重点"
            />
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

// 辅助函数：判断是否本周
function isThisWeek(dateString: string): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return date >= startOfWeek && date <= endOfWeek;
}
