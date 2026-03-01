import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function DifferentiatedScoringHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="w-4 h-4 mr-2" />
          使用说明
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>差异化考核评分 - 使用说明</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 text-sm">
          {/* 什么是差异化考核 */}
          <section>
            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              什么是差异化考核？
            </h3>
            <p className="text-gray-600 leading-relaxed">
              差异化考核根据员工所在部门的类型（销售、工程、生产、支持、管理），
              自动使用不同的考核指标和权重，确保评价标准符合岗位特性，更加公平合理。
            </p>
          </section>

          {/* 评分流程 */}
          <section>
            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              评分流程
            </h3>
            <ol className="space-y-2 list-decimal list-inside text-gray-600">
              <li>从列表中选择要评分的员工</li>
              <li>系统自动识别员工部门类型，加载对应考核模板</li>
              <li>对每个考核指标选择评级（L1-L5）</li>
              <li>可选填写具体评价说明</li>
              <li>查看实时计算的加权总分</li>
              <li>点击"保存评分"完成评分</li>
            </ol>
          </section>

          {/* 五级评分标准 */}
          <section>
            <h3 className="font-semibold text-base mb-2">五级评分标准</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                <span className="font-bold text-green-600">L5 (1.5)</span>
                <span className="text-gray-700">卓越 - 远超预期，成为标杆</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                <span className="font-bold text-blue-600">L4 (1.2)</span>
                <span className="text-gray-700">优秀 - 超出预期，表现出色</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <span className="font-bold text-gray-600">L3 (1.0)</span>
                <span className="text-gray-700">良好 - 达到预期，符合标准</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-orange-50 rounded">
                <span className="font-bold text-orange-600">L2 (0.8)</span>
                <span className="text-gray-700">待改进 - 低于预期，需要提升</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                <span className="font-bold text-red-600">L1 (0.5)</span>
                <span className="text-gray-700">不合格 - 严重不足，需要改进计划</span>
              </div>
            </div>
          </section>

          {/* 计分方式 */}
          <section>
            <h3 className="font-semibold text-base mb-2">计分方式</h3>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-gray-700 mb-2">加权总分 = Σ (指标得分 × 权重)</p>
              <p className="text-sm text-gray-600">
                <strong>示例：</strong><br />
                销售额完成率 (30%) × L5 (1.5) = 0.45<br />
                回款率 (20%) × L4 (1.2) = 0.24<br />
                新客户开发 (10%) × L3 (1.0) = 0.10<br />
                ...<br />
                <strong>总分 = 1.23</strong>
              </p>
            </div>
          </section>

          {/* 部门类型说明 */}
          <section>
            <h3 className="font-semibold text-base mb-2">部门类型考核重点</h3>
            <div className="space-y-2 text-gray-600">
              <div>
                <span className="font-medium">💰 销售类：</span>
                业绩导向（销售额、回款率、客户开发）
              </div>
              <div>
                <span className="font-medium">🔧 工程类：</span>
                项目交付和技术能力（按时率、质量、创新）
              </div>
              <div>
                <span className="font-medium">🏭 生产类：</span>
                效率和质量安全（产量、合格率、安全事故）
              </div>
              <div>
                <span className="font-medium">📋 支持类：</span>
                准确性和服务满意度（准确率、及时性、满意度）
              </div>
              <div>
                <span className="font-medium">👔 管理类：</span>
                综合管理能力和战略执行
              </div>
            </div>
          </section>

          {/* 注意事项 */}
          <section>
            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              注意事项
            </h3>
            <ul className="space-y-1 list-disc list-inside text-gray-600">
              <li>评分应基于客观事实和数据，避免主观臆断</li>
              <li>建议在评价说明中记录具体事例，便于后续沟通</li>
              <li>保存前会提示未完成的指标，建议全部评分后再保存</li>
              <li>已保存的评分可以修改，系统会自动更新</li>
              <li>评分结果将影响绩效奖金、调薪和晋升</li>
            </ul>
          </section>

          {/* 快捷键提示 */}
          <section className="bg-blue-50 border border-blue-200 rounded p-3">
            <h3 className="font-semibold text-sm mb-2 text-blue-900">💡 小贴士</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 完成度达到100%时，保存按钮会高亮提示</li>
              <li>• 可以先评分部分指标，随时保存，稍后继续</li>
              <li>• 同一月份同一员工的评分会自动覆盖更新</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
