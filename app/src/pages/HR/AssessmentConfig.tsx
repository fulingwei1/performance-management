import { motion } from 'framer-motion';
import { Building2, FileText, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssessmentTemplates } from '@/pages/HR/AssessmentTemplates';
import { MetricLibraryManagement } from '@/pages/HR/MetricLibraryManagement';
import AssessmentScopeSettings from '@/pages/HR/AssessmentScopeSettings';

interface AssessmentConfigProps {
  title?: string;
  description?: string;
  defaultTab?: 'scope' | 'templates' | 'metrics';
}

export function AssessmentConfig({
  title = '考核配置',
  description = '统一管理考核范围、考核模板和指标库：先确定谁参与，再确定怎么考、考什么。',
  defaultTab = 'scope',
}: AssessmentConfigProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-500 mt-1">{description}</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="scope" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            考核范围
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            考核模板
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            指标库
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scope">
          <AssessmentScopeSettings />
        </TabsContent>

        <TabsContent value="templates">
          <AssessmentTemplates />
        </TabsContent>

        <TabsContent value="metrics">
          <MetricLibraryManagement />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export default AssessmentConfig;
