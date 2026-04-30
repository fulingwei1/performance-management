import { motion } from 'framer-motion';
import { Download, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataImport } from '@/pages/HR/DataImport';
import { AssessmentExport } from '@/pages/HR/AssessmentExport';

export function DataImportExport() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">数据导入导出</h2>
        <p className="text-gray-500 mt-1">统一处理人事档案上传、员工模板导入和绩效数据导出。</p>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            数据导入
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            数据导出
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <DataImport />
        </TabsContent>

        <TabsContent value="export">
          <AssessmentExport />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export default DataImportExport;
