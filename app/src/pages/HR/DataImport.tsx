import { useState } from 'react';
import { Download, Upload, Loader2, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { dataImportApi } from '@/services/api';

export function DataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleDownloadTemplate = async () => {
    try {
      await dataImportApi.getEmployeeTemplate();
      toast.success('模板下载成功');
    } catch {
      toast.error('模板下载失败');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await dataImportApi.importEmployees(formData);
      toast.success(response.message);
      setResult({ success: true, ...response.data });
    } catch (error: any) {
      const errData = error?.response?.data;
      toast.error(errData?.message || '导入失败');
      setResult({ success: false, ...errData });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">数据导入</h1>
        <Upload className="h-8 w-8 text-green-600" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            员工信息批量导入
          </CardTitle>
          <CardDescription>
            下载 Excel 模板 → 填写员工信息 → 上传文件批量导入
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Download template */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">1</div>
            <div className="flex-1">
              <p className="font-medium">下载导入模板</p>
              <p className="text-sm text-muted-foreground">模板包含填写说明和数据验证</p>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              下载模板
            </Button>
          </div>

          {/* Step 2: Upload file */}
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-bold">2</div>
            <div className="flex-1">
              <p className="font-medium">选择文件</p>
              <p className="text-sm text-muted-foreground">支持 .xlsx 格式</p>
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

          {/* Step 3: Import */}
          <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-bold">3</div>
            <div className="flex-1">
              <p className="font-medium">执行导入</p>
              <p className="text-sm text-muted-foreground">
                {file ? `已选择: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` : '请先选择文件'}
              </p>
            </div>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? '导入中...' : '开始导入'}
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? `成功导入 ${result.imported} 个员工` : '导入失败'}
                </span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-red-600">错误详情：</p>
                  <ul className="list-disc list-inside text-sm text-red-600">
                    {result.errors.slice(0, 10).map((err: any, i: number) => (
                      <li key={i}>
                        {err.row ? `第 ${err.row} 行: ` : ''}{err.message || err.name}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>...还有 {result.errors.length - 10} 个错误</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-800 text-base">注意事项</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-amber-700">
          <p>• 带 * 号的字段为必填项</p>
          <p>• 拼音将作为员工登录 ID</p>
          <p>• 初始密码为 pm + 身份证后4位（无身份证则为 pm + 拼音 + 123）</p>
          <p>• 导入前请确保部门已在系统中创建</p>
          <p>• 重复拼音 ID 的员工将导入失败</p>
        </CardContent>
      </Card>
    </div>
  );
}
