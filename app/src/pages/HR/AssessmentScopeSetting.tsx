"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Save, Target } from 'lucide-react';
import { organizationApi } from '@/services/api';
import { settingsApi } from '@/services/api';

type ScopeConfig = { rootDepts: string[]; subDeptsByRoot: Record<string, string[]> };

export function AssessmentScopeSetting() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<ScopeConfig>({ rootDepts: [], subDeptsByRoot: {} });
  const [roots, setRoots] = useState<{ id: string; name: string }[]>([]);
  const [childrenByRoot, setChildrenByRoot] = useState<Record<string, { id: string; name: string }[]>>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [scopeRes, deptRes] = await Promise.all([
        settingsApi.getAssessmentScope(),
        organizationApi.getAllDepartments()
      ]);
      if (scopeRes.success && scopeRes.data) {
        setScope({
          rootDepts: scopeRes.data.rootDepts ?? [],
          subDeptsByRoot: scopeRes.data.subDeptsByRoot ?? {}
        });
      }
      if (deptRes.success && Array.isArray(deptRes.data)) {
        const flat = deptRes.data as { id: string; name: string; parentId?: string | null }[];
        const rootList = flat.filter((d) => !d.parentId).map((d) => ({ id: d.id, name: d.name }));
        setRoots(rootList);
        const byRoot: Record<string, { id: string; name: string }[]> = {};
        rootList.forEach((r) => {
          byRoot[r.name] = flat
            .filter((d) => d.parentId === r.id)
            .map((d) => ({ id: d.id, name: d.name }));
        });
        setChildrenByRoot(byRoot);
      }
    } catch (e) {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleRoot = (name: string, checked: boolean) => {
    setScope((prev) => ({
      ...prev,
      rootDepts: checked
        ? [...prev.rootDepts, name]
        : prev.rootDepts.filter((x) => x !== name)
    }));
  };

  const toggleSub = (rootName: string, subName: string, checked: boolean) => {
    setScope((prev) => {
      const subs = prev.subDeptsByRoot[rootName] ?? [];
      const next = { ...prev.subDeptsByRoot };
      next[rootName] = checked ? [...subs, subName] : subs.filter((x) => x !== subName);
      return { ...prev, subDeptsByRoot: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await settingsApi.updateAssessmentScope(scope);
      if (res.success) {
        toast.success('考核范围已保存');
      } else {
        toast.error((res as { error?: string }).error ?? '保存失败');
      }
    } catch (e) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">考核范围设置</h2>
        <p className="text-gray-500 mt-1">由人力资源部设置参与绩效考核的部门，工作台「考核范围内」人数将按此统计。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            参与考核部门
          </CardTitle>
          <CardDescription>勾选整部门参与考核的一级部门，或勾选某一级部门下的部分二级部门。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 整部门参与考核（一级部门） */}
          <div>
            <Label className="text-base font-medium">整部门参与考核（一级部门）</Label>
            <p className="text-sm text-muted-foreground mb-3">勾选后，该一级部门下所有员工均参与考核。</p>
            <div className="flex flex-wrap gap-4">
              {roots.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={scope.rootDepts.includes(r.name)}
                    onCheckedChange={(checked) => toggleRoot(r.name, !!checked)}
                  />
                  <span>{r.name}</span>
                </label>
              ))}
              {roots.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无一级部门，请先在组织架构中维护部门。</p>
              )}
            </div>
          </div>

          {/* 部分二级部门参与考核 */}
          <div>
            <Label className="text-base font-medium">部分二级部门参与考核</Label>
            <p className="text-sm text-muted-foreground mb-3">仅勾选的二级部门参与考核，未勾选的一级部门不受影响。</p>
            <div className="space-y-4">
              {roots.map((root) => {
                const children = childrenByRoot[root.name] ?? [];
                if (children.length === 0) return null;
                return (
                  <div key={root.id} className="border rounded-lg p-4 space-y-2">
                    <div className="font-medium text-gray-700">{root.name}</div>
                    <div className="flex flex-wrap gap-4 pl-4">
                      {children.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={(scope.subDeptsByRoot[root.name] ?? []).includes(c.name)}
                            onCheckedChange={(checked) => toggleSub(root.name, c.name, !!checked)}
                          />
                          <span>{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {roots.every((r) => (childrenByRoot[r.name] ?? []).length === 0) && (
                <p className="text-sm text-muted-foreground">暂无二级部门，请先在组织架构中维护层级。</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AssessmentScopeSetting;
