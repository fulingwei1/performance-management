import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HrArchiveImport, EmployeeTemplateImport } from '@/pages/HR/DataImport';
import { AssessmentExport } from '@/pages/HR/AssessmentExport';
import { RelationshipManagementPanel } from '@/components/admin/RelationshipManagementPanel';

export function DataImportExport() {
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">数据管理</h2>
        <p className="text-gray-500 mt-1">统一处理人事档案上传、上下级/部门经理维护、员工模板导入和绩效数据导出。</p>
      </div>

      <Tabs defaultValue="archive" className="space-y-4">
        <TabsList>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            人事档案与组织关系
          </TabsTrigger>
          <TabsTrigger value="employee-template" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            员工模板导入
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            数据导出
          </TabsTrigger>
        </TabsList>

        <TabsContent value="archive" className="space-y-6">
          <HrArchiveImport onImported={() => setRefreshSignal((current) => current + 1)} />
          <RelationshipManagementPanel refreshSignal={refreshSignal} />
        </TabsContent>

        <TabsContent value="employee-template">
          <EmployeeTemplateImport />
        </TabsContent>

        <TabsContent value="export">
          <AssessmentExport />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export default DataImportExport;
