import { memoryStore } from '../../config/database';
import { initializeDefaultTemplates } from '../../config/init-templates';

function metricsFor(templateId: string) {
  return Array.from(memoryStore.templateMetrics!.values())
    .filter((metric: any) => metric.template_id === templateId)
    .sort((a: any, b: any) => a.sort_order - b.sort_order);
}

function metricText(templateId: string): string {
  return metricsFor(templateId)
    .map((metric: any) => `${metric.metric_name} ${metric.metric_code} ${metric.description}`)
    .join('\n');
}

function totalWeight(templateId: string): number {
  return metricsFor(templateId).reduce((sum: number, metric: any) => sum + Number(metric.weight || 0), 0);
}

describe('qualification junior templates', () => {
  beforeEach(async () => {
    await initializeDefaultTemplates();
  });

  it.each([
    ['template-mech-junior-001', ['设计错误', 'BOM', '学习成长']],
    ['template-debug-junior-001', ['漏测', '误判', '学习成长']],
    ['template-elec-junior-001', ['程序错误', '接线图错误', '学习成长']],
    ['template-purch-junior-001', ['错采', '漏采', '流程学习']],
  ])('keeps hard error-control and learning metrics in %s', (templateId, keywords) => {
    const text = metricText(templateId);
    for (const keyword of keywords) {
      expect(text).toContain(keyword);
    }
    expect(totalWeight(templateId)).toBe(100);
  });

  it('contains department clues used to select templates when HR position is generic', () => {
    expect(memoryStore.assessmentTemplates!.get('template-mech-junior-001')).toMatchObject({
      applicable_positions: expect.arrayContaining(['结构一组', '结构二组', '结构三组']),
    });
    expect(memoryStore.assessmentTemplates!.get('template-debug-junior-001')).toMatchObject({
      applicable_positions: expect.arrayContaining(['测试部', '新能源组', '现场支持']),
    });
    expect(memoryStore.assessmentTemplates!.get('template-elec-junior-001')).toMatchObject({
      applicable_positions: expect.arrayContaining(['PLC 部', 'PLC一组', 'PLC二组', 'PLC三组', 'PLC四组']),
    });
    expect(memoryStore.assessmentTemplates!.get('template-purch-junior-001')).toMatchObject({
      applicable_positions: expect.arrayContaining(['采购部', '采购组', '采购工程师']),
    });
  });
});
