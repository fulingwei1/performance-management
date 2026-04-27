import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Target, FileText, Users, Lock, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PerformanceRankingConfig } from '@/pages/HR/PerformanceRankingConfig';
import { AssessmentTemplates } from '@/pages/HR/AssessmentTemplates';
import { MetricLibraryManagement } from '@/pages/HR/MetricLibraryManagement';
import { PeerReviewManagement } from '@/pages/HR/PeerReviewManagement';
import { TaskFreezeManagement } from '@/pages/HR/TaskFreezeManagement';

const TABS = [
  { key: 'ranking-config', label: '绩效范围', icon: SlidersHorizontal },
  { key: 'templates', label: '考核模板', icon: FileText },
  { key: 'metrics', label: '指标库', icon: Target },
  { key: 'peer-review', label: '360互评', icon: Users },
  { key: 'task-freeze', label: '任务冻结', icon: Lock },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function SystemSettings() {
  const [activeTab, setActiveTab] = useState<TabKey>('ranking-config');

  const renderContent = () => {
    switch (activeTab) {
      case 'ranking-config':
        return <PerformanceRankingConfig />;
      case 'templates':
        return <AssessmentTemplates />;
      case 'metrics':
        return <MetricLibraryManagement />;
      case 'peer-review':
        return <PeerReviewManagement />;
      case 'task-freeze':
        return <TaskFreezeManagement />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">系统设置</h2>
          <p className="text-sm text-gray-500">管理绩效范围、考核模板、指标库、互评和任务冻结</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {renderContent()}
      </div>
    </motion.div>
  );
}
