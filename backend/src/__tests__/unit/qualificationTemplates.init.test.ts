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
      applicable_positions: expect.arrayContaining(['采购部', '采购组', '采购助理']),
    });
  });

  it('keeps every template to exactly five assessment metrics with total weight 100', () => {
    const templates = Array.from(memoryStore.assessmentTemplates!.values());

    for (const template of templates) {
      const metrics = metricsFor(template.id);
      expect(metrics).toHaveLength(5);
      expect(totalWeight(template.id)).toBe(100);
      expect(metrics.map((metric: any) => metric.sort_order)).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('has separate junior, intermediate and senior sales templates', () => {
    expect(memoryStore.assessmentTemplates!.get('template-sales-junior-001')).toMatchObject({
      applicable_levels: ['junior'],
    });
    expect(memoryStore.assessmentTemplates!.get('template-sales-inter-001')).toMatchObject({
      applicable_levels: ['intermediate'],
    });
    expect(memoryStore.assessmentTemplates!.get('template-sales-senior-001')).toMatchObject({
      applicable_levels: ['senior'],
    });
    expect(memoryStore.assessmentTemplates!.get('template-sales-mgr-001')).toMatchObject({
      applicable_levels: ['manager'],
    });
  });

  it.each([
    ['机械设计', ['template-mech-junior-001', 'template-mech-inter-001', 'template-mech-senior-001']],
    ['电气', ['template-elec-junior-001', 'template-elec-inter-001', 'template-elec-senior-001']],
    ['软件', ['template-sw-junior-001', 'template-sw-inter-001', 'template-sw-senior-001']],
    ['装配', ['template-assembly-junior-001', 'template-assembly-inter-001', 'template-assembly-senior-001']],
    ['调试', ['template-debug-junior-001', 'template-debug-inter-001', 'template-debug-senior-001']],
    ['项目', ['template-pm-junior-001', 'template-pm-inter-001', 'template-pm-senior-001']],
    ['采购', ['template-purch-junior-001', 'template-purch-inter-001', 'template-purch-senior-001']],
    ['质量', ['template-qa-junior-001', 'template-qa-inter-001', 'template-qa-senior-001']],
    ['售后', ['template-service-junior-001', 'template-service-inter-001', 'template-service-senior-001']],
    ['销售', ['template-sales-junior-001', 'template-sales-inter-001', 'template-sales-senior-001']],
  ])('has junior, intermediate and senior templates for %s', (_label, templateIds) => {
    const expectedLevels = ['junior', 'intermediate', 'senior'];
    templateIds.forEach((templateId, index) => {
      const template = memoryStore.assessmentTemplates!.get(templateId);
      expect(template).toBeDefined();
      expect(template).toMatchObject({ applicable_levels: [expectedLevels[index]] });
      expect(metricsFor(templateId)).toHaveLength(5);
    });
  });

  it('does not duplicate the same concrete position across templates', () => {
    const positionOwners = new Map<string, string[]>();

    for (const template of memoryStore.assessmentTemplates!.values()) {
      for (const position of template.applicable_positions || []) {
        const normalized = String(position || '').trim();
        if (!normalized) continue;
        positionOwners.set(normalized, [...(positionOwners.get(normalized) || []), template.id]);
      }
    }

    const duplicates = Array.from(positionOwners.entries())
      .filter(([, templateIds]) => templateIds.length > 1);

    expect(duplicates).toEqual([]);
  });
});
