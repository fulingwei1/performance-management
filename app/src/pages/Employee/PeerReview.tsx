import { useState, useEffect } from 'react';
import { Users, Star, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// 员工互评页面
export default function PeerReview() {
  const { user } = useAuthStore();
  const [activeCycles, setActiveCycles] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // 获取进行中的周期
      const cyclesRes = await fetch('http://localhost:3001/api/peer-reviews/cycles?status=active');
      const cyclesData = await cyclesRes.json();
      
      if (cyclesData.success) {
        setActiveCycles(cyclesData.data || []);
        
        // 如果有周期，获取我需要评价的人
        if (cyclesData.data && cyclesData.data.length > 0) {
          const cycle = cyclesData.data[0];
          setSelectedCycle(cycle);
          await fetchMyReviews(cycle.id);
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyReviews = async (cycleId: number) => {
    try {
      // 获取我作为评价人的关系
      const res = await fetch(
        `http://localhost:3001/api/peer-reviews/relationships/${cycleId}?reviewer_id=${user?.id}`
      );
      const data = await res.json();
      
      if (data.success) {
        setMyReviews(data.data || []);
      }
    } catch (error) {
      console.error('获取评价列表失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (activeCycles.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">暂无进行中的互评</h2>
          <p className="text-gray-600">当前没有需要您参与的360度互评活动</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">360度互评</h1>
        <p className="text-gray-600 mt-1">评价您的同事，帮助团队共同成长</p>
      </div>

      {/* 周期选择 */}
      {activeCycles.length > 1 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择互评周期
          </label>
          <select
            value={selectedCycle?.id || ''}
            onChange={(e) => {
              const cycle = activeCycles.find(c => c.id === parseInt(e.target.value));
              setSelectedCycle(cycle);
              if (cycle) fetchMyReviews(cycle.id);
            }}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg"
          >
            {activeCycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} ({cycle.start_date} ~ {cycle.end_date})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 进度统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          label="需要评价"
          value={myReviews.length}
          color="blue"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          label="已完成"
          value={myReviews.filter(r => r.status === 'completed').length}
          color="green"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          label="待完成"
          value={myReviews.filter(r => r.status === 'pending').length}
          color="orange"
        />
      </div>

      {/* 评价列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">我需要评价的同事</h2>
        </div>

        {myReviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无需要评价的同事
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {myReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                cycleId={selectedCycle?.id}
                onComplete={() => fetchMyReviews(selectedCycle?.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 统计卡片
function StatCard({ icon, label, value, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700'
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4`}>
      <div className="flex items-center gap-3">
        <div>{icon}</div>
        <div>
          <p className="text-sm opacity-80">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

// 评价卡片
function ReviewCard({ review, cycleId, onComplete }: any) {
  const [showModal, setShowModal] = useState(false);
  const isCompleted = review.status === 'completed';

  return (
    <>
      <div className="p-4 hover:bg-gray-50 transition-colors">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                被评价人 #{review.reviewee_id}
              </h3>
              <p className="text-sm text-gray-600">
                {review.relationship_type === 'peer' ? '同事关系' : 
                 review.relationship_type === 'subordinate' ? '您的下属' : 
                 review.relationship_type === 'cross_dept' ? '跨部门协作' : '其他'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isCompleted ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                已完成
              </span>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Star className="w-4 h-4" />
                开始评价
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ReviewModal
          review={review}
          cycleId={cycleId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onComplete();
          }}
        />
      )}
    </>
  );
}

// 评价Modal
function ReviewModal({ review, cycleId, onClose, onSuccess }: any) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    teamwork_score: 3.0,
    communication_score: 3.0,
    professional_score: 3.0,
    responsibility_score: 3.0,
    innovation_score: 3.0,
    strengths: '',
    improvements: '',
    overall_comment: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const scoreLabels = ['较差', '一般', '良好', '优秀', '卓越'];
  const scoreValues = [1.0, 2.0, 3.0, 4.0, 5.0];

  const calculateTotal = () => {
    const scores = [
      formData.teamwork_score,
      formData.communication_score,
      formData.professional_score,
      formData.responsibility_score,
      formData.innovation_score
    ];
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:3001/api/peer-reviews/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship_id: review.id,
          cycle_id: cycleId,
          reviewer_id: user?.id,
          reviewee_id: review.reviewee_id,
          ...formData,
          total_score: parseFloat(calculateTotal())
        })
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        alert('提交失败: ' + data.message);
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <h2 className="text-xl font-bold text-gray-900">360度互评</h2>
          <p className="text-sm text-gray-600 mt-1">被评价人 #{review.reviewee_id}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 评分维度 */}
          <div className="space-y-4">
            <ScoreSlider
              label="团队协作"
              value={formData.teamwork_score}
              onChange={(v) => setFormData({ ...formData, teamwork_score: v })}
            />
            <ScoreSlider
              label="沟通能力"
              value={formData.communication_score}
              onChange={(v) => setFormData({ ...formData, communication_score: v })}
            />
            <ScoreSlider
              label="专业能力"
              value={formData.professional_score}
              onChange={(v) => setFormData({ ...formData, professional_score: v })}
            />
            <ScoreSlider
              label="责任心"
              value={formData.responsibility_score}
              onChange={(v) => setFormData({ ...formData, responsibility_score: v })}
            />
            <ScoreSlider
              label="创新能力"
              value={formData.innovation_score}
              onChange={(v) => setFormData({ ...formData, innovation_score: v })}
            />
          </div>

          {/* 总分 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">综合评分</span>
              <span className="text-2xl font-bold text-blue-600">{calculateTotal()}</span>
            </div>
          </div>

          {/* 文字评价 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              优点/亮点 *
            </label>
            <textarea
              required
              value={formData.strengths}
              onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="请写出同事的优点和值得学习的地方"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              改进建议
            </label>
            <textarea
              value={formData.improvements}
              onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="有什么可以改进的地方？"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              综合评价
            </label>
            <textarea
              value={formData.overall_comment}
              onChange={(e) => setFormData({ ...formData, overall_comment: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="整体评价和其他想说的话"
            />
          </div>

          {/* 按钮 */}
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={submitting}
            >
              <Send className="w-4 h-4" />
              {submitting ? '提交中...' : '提交评价'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 评分滑块
function ScoreSlider({ label, value, onChange }: any) {
  const scoreLabels = ['较差', '一般', '良好', '优秀', '卓越'];
  const scoreValues = [1.0, 2.0, 3.0, 4.0, 5.0];
  
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-blue-600">
          {value.toFixed(1)} - {scoreLabels[scoreValues.indexOf(value)]}
        </span>
      </div>
      <div className="flex gap-2">
        {scoreValues.map((score, index) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              value === score
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {scoreLabels[index]}
          </button>
        ))}
      </div>
    </div>
  );
}
