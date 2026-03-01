import { useState, useEffect } from 'react';
import { Plus, Users, Calendar, TrendingUp, Filter } from 'lucide-react';

// 360度互评管理（HR视图）
export default function PeerReviewManagement() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/peer-reviews/cycles');
      const data = await response.json();
      if (data.success) {
        setCycles(data.data || []);
      }
    } catch (error) {
      console.error('获取互评周期失败:', error);
    } finally {
      setLoading(false);
    }
  };

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
          value="0"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-green-600" />}
          title="参与人数"
          value="0"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
          title="完成率"
          value="0%"
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={<Filter className="w-6 h-6 text-orange-600" />}
          title="待评价"
          value="0"
          bgColor="bg-orange-50"
        />
      </div>

      {/* 互评周期列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">互评周期</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            加载中...
          </div>
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
              <CycleCard key={cycle.id} cycle={cycle} onRefresh={fetchCycles} />
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
function CycleCard({ cycle, onRefresh }: any) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{cycle.name}</h3>
          {cycle.description && (
            <p className="text-gray-600 text-sm mt-1">{cycle.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-gray-500">
              📅 {cycle.start_date} ~ {cycle.end_date}
            </span>
            <span className="text-gray-500">
              📊 类型: {cycle.review_type === 'peer' ? '同事互评' : cycle.review_type}
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
          <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
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
      const response = await fetch('http://localhost:3001/api/peer-reviews/cycles', {
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              周期名称 *
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              周期说明
            </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始日期 *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束日期 *
              </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              互评类型
            </label>
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
            <label className="ml-2 text-sm text-gray-700">
              匿名评价（被评价人看不到谁评价的）
            </label>
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
