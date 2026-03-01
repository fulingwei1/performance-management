import { useState, useEffect } from 'react';
import { FileText, Plus, User, Calendar, TrendingUp, Target } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// 面谈记录页面（经理视图）
export default function InterviewRecord() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  const fetchRecords = async () => {
    try {
      const url = `http://localhost:3001/api/interview-records/records?manager_id=${user?.id}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setRecords(data.data || []);
      }
    } catch (error) {
      console.error('获取面谈记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页头 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">面谈记录</h1>
          <p className="text-gray-600 mt-1">记录和管理绩效面谈内容</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          新建面谈记录
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<FileText className="w-6 h-6 text-blue-600" />}
          label="总记录数"
          value={records.length}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<User className="w-6 h-6 text-green-600" />}
          label="本月面谈"
          value={records.filter(r => isThisMonth(r.interview_date)).length}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
          label="平均评分"
          value={calculateAverage(records).toFixed(1)}
          bgColor="bg-purple-50"
        />
      </div>

      {/* 记录列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">面谈记录列表</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">暂无面谈记录</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              创建第一条面谈记录
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {records.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>

      {/* 创建记录Modal */}
      {showCreateModal && (
        <CreateRecordModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchRecords();
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

// 记录卡片
function RecordCard({ record }: any) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setShowDetail(true)}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                员工 #{record.employee_id} 的面谈
              </h3>
              {record.overall_rating && (
                <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                  评分: {record.overall_rating}/5.0
                </span>
              )}
            </div>
            
            <div className="flex gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {record.interview_date}
              </span>
              {record.duration_minutes && (
                <span>{record.duration_minutes}分钟</span>
              )}
            </div>

            {record.achievements && (
              <p className="text-sm text-gray-700 line-clamp-2">
                <span className="font-medium">主要成就：</span>
                {record.achievements}
              </p>
            )}
          </div>
          
          <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
            查看详情
          </button>
        </div>
      </div>

      {showDetail && (
        <RecordDetailModal
          record={record}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}

// 创建记录Modal
function CreateRecordModal({ onClose, onSuccess }: any) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    employee_id: '',
    interview_date: new Date().toISOString().split('T')[0],
    interview_time: '',
    duration_minutes: 60,
    employee_summary: '',
    manager_feedback: '',
    achievements: '',
    challenges: '',
    strengths: '',
    improvements: '',
    overall_rating: 3.0,
    performance_score: 3.0,
    potential_score: 3.0,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:3001/api/interview-records/records', {
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
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <h2 className="text-xl font-bold text-gray-900">新建面谈记录</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                员工ID *
              </label>
              <input
                type="number"
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                面谈日期 *
              </label>
              <input
                type="date"
                required
                value={formData.interview_date}
                onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* 面谈内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              员工自我总结
            </label>
            <textarea
              value={formData.employee_summary}
              onChange={(e) => setFormData({ ...formData, employee_summary: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="员工对本周期工作的自我总结"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              主要成就 *
            </label>
            <textarea
              required
              value={formData.achievements}
              onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="本周期的主要成就和亮点"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              面临挑战
            </label>
            <textarea
              value={formData.challenges}
              onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="遇到的困难和挑战"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              优势
            </label>
            <textarea
              value={formData.strengths}
              onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="员工的优势和长处"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              改进点
            </label>
            <textarea
              value={formData.improvements}
              onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="需要改进的方面"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              经理反馈 *
            </label>
            <textarea
              required
              value={formData.manager_feedback}
              onChange={(e) => setFormData({ ...formData, manager_feedback: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="对员工的整体反馈和建议"
            />
          </div>

          {/* 评分 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                总体评分
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.overall_rating}
                onChange={(e) => setFormData({ ...formData, overall_rating: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                绩效得分
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.performance_score}
                onChange={(e) => setFormData({ ...formData, performance_score: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                潜力得分
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.potential_score}
                onChange={(e) => setFormData({ ...formData, potential_score: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              其他备注
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
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
              {submitting ? '保存中...' : '保存记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 详情Modal
function RecordDetailModal({ record, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">面谈记录详情</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="员工ID" value={`#${record.employee_id}`} />
            <DetailItem label="面谈日期" value={record.interview_date} />
            <DetailItem label="时长" value={`${record.duration_minutes || '-'}分钟`} />
            <DetailItem label="评分" value={record.overall_rating ? `${record.overall_rating}/5.0` : '-'} />
          </div>

          {/* 内容 */}
          {record.achievements && (
            <DetailSection title="主要成就" content={record.achievements} />
          )}
          {record.challenges && (
            <DetailSection title="面临挑战" content={record.challenges} />
          )}
          {record.strengths && (
            <DetailSection title="优势" content={record.strengths} />
          )}
          {record.improvements && (
            <DetailSection title="改进点" content={record.improvements} />
          )}
          {record.manager_feedback && (
            <DetailSection title="经理反馈" content={record.manager_feedback} />
          )}
          {record.notes && (
            <DetailSection title="其他备注" content={record.notes} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: any) {
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  );
}

function DetailSection({ title, content }: any) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-900 whitespace-pre-wrap">{content}</p>
    </div>
  );
}

// 辅助函数
function isThisMonth(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function calculateAverage(records: any[]): number {
  if (records.length === 0) return 0;
  const validScores = records
    .filter(r => r.overall_rating)
    .map(r => r.overall_rating);
  
  if (validScores.length === 0) return 0;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}
