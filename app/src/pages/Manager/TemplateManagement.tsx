import { motion } from 'framer-motion';
import { FileText, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateAssignment } from '@/pages/Manager/TemplateAssignment';
import { AssessmentTemplates } from '@/pages/HR/AssessmentTemplates';

export function TemplateManagement() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">模板配置</h2>
        <p className="text-gray-500 mt-1">
          经理可以为自己的团队选择模板规则，也可以复制标准模板后维护本部门使用的自定义模板。
        </p>
      </div>

      <Tabs defaultValue="assignment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assignment" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            模板选择
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            模板编辑
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignment">
          <TemplateAssignment embedded />
        </TabsContent>

        <TabsContent value="library">
          <AssessmentTemplates mode="manager" />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export default TemplateManagement;
