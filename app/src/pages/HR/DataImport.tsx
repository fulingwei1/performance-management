import { useState } from 'react';
import { Upload, Loader2, FileSpreadsheet, CheckCircle2, XCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { dataImportApi } from '@/services/api';

export function DataImport() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">数据导入</h1>
        <Users className="h-8 w-8 text-green-600" />
      </div>

      <HrArchiveImport />
    </div>
  );
}

interface HrArchiveImportProps {
  onImported?: () => void;
}

export function HrArchiveImport({ onImported }: HrArchiveImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<null | {
    success: boolean;
    totalRows?: number;
    imported?: number;
    activeCount?: number;
    assessmentEligibleCount?: number;
    nonAssessmentRoleCount?: number;
    disabledCount?: number;
    managerLinks?: number;
    departmentCounts?: Record<string, number>;
    message?: string;
    errors?: Array<{ name?: string; message?: string }>;
  }>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await dataImportApi.importHrArchive(formData);
      toast.success(response.message);
      setResult({ success: true, ...response.data });
      onImported?.();
    } catch (error: any) {
      const errData = error?.response?.data;
      toast.error(errData?.message || '导入失败');
      setResult({ success: false, ...errData });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          上传 ATE 人事行政档案系统 Excel
        </CardTitle>
        <CardDescription>
          上传《ATE-人事行政档案系统.xlsx》自动同步员工信息（身份证后6位、部门、状态等）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">1</div>
          <div className="flex-1">
            <p className="font-medium">选择人事档案 Excel 文件</p>
            <p className="text-sm text-muted-foreground">支持《ATE-人事行政档案系统.xlsx》，自动识别"员工信息表"</p>
          </div>
          <Input
            type="file"
            accept=".xlsx,.xls"
            className="max-w-xs"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
            }}
          />
        </div>

        <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-bold">2</div>
          <div className="flex-1">
            <p className="font-medium">执行同步</p>
            <p className="text-sm text-muted-foreground">
              {file ? `已选择: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` : '请先选择文件'}
            </p>
          </div>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {uploading ? '同步中...' : '开始同步'}
          </Button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success
                  ? '人事档案同步完成'
                  : '同步失败'}
              </span>
            </div>
            {result.success && (
              <div className="grid gap-3 md:grid-cols-4 mb-3">
                <div className="rounded-lg bg-white/80 p-3 border border-green-100">
                  <div className="text-xs text-gray-500">档案总人数</div>
                  <div className="text-xl font-semibold text-gray-900">{result.imported ?? 0}</div>
                </div>
                <div className="rounded-lg bg-white/80 p-3 border border-green-100">
                  <div className="text-xs text-gray-500">参与考核在职</div>
                  <div className="text-xl font-semibold text-gray-900">{result.activeCount ?? 0}</div>
                </div>
                <div className="rounded-lg bg-white/80 p-3 border border-green-100">
                  <div className="text-xs text-gray-500">参与考核人数</div>
                  <div className="text-xl font-semibold text-gray-900">{result.assessmentEligibleCount ?? 0}</div>
                </div>
                <div className="rounded-lg bg-white/80 p-3 border border-green-100">
                  <div className="text-xs text-gray-500">不参与考核角色</div>
                  <div className="text-xl font-semibold text-gray-900">{result.nonAssessmentRoleCount ?? 0}</div>
                </div>
              </div>
            )}
            {result.success && (
              <div className="space-y-1 text-sm text-green-800">
                <p>离职/非在职已停用：{result.disabledCount ?? 0} 人</p>
                <p>上下级关联匹配：{result.managerLinks ?? 0} 条</p>
                <p className="text-green-700">
                  说明：这里的在职人数口径，已经只保留真正参与绩效考核的人员，不再把虚拟权限账号算进来。
                </p>
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-medium text-red-600">详细信息：</p>
                <ul className="list-disc list-inside text-sm text-red-600 max-h-40 overflow-y-auto">
                  {result.errors.slice(0, 20).map((err: any, i: number) => (
                    <li key={i}>
                      {err.name ? `${err.name}: ` : ''}{err.message}
                    </li>
                  ))}
                  {result.errors.length > 20 && (
                    <li>...还有 {result.errors.length - 20} 条</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
