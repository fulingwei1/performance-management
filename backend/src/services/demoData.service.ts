import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { Employee, PerformanceRecord } from '../types';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';

const DEMO_PREFIX = 'demo-perf-';
const DEMO_MARKER = '[演示数据]';
const LEGACY_DEMO_MARKER = '[示例数据]';

type DemoOptions = {
  endMonth?: string;
  monthCount?: number;
};

type DemoGenerateResult = {
  months: string[];
  employeeCount: number;
  createdCount: number;
  skippedCount: number;
  clearedOldDemoCount: number;
};

type DemoClearResult = {
  performanceRecordsDeleted: number;
  quarterlySummariesDeleted: number;
  todosDeleted: number;
  notificationsDeleted: number;
  totalDeleted: number;
};

type DemoStatusResult = {
  performanceRecords: number;
  quarterlySummaries: number;
  todos: number;
  notifications: number;
  total: number;
};

function normalizeMonth(month?: string): string {
  const value = typeof month === 'string' ? month.trim() : '';
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(month: string, delta: number): string {
  const [yearText, monthText] = month.split('-');
  const date = new Date(Number(yearText), Number(monthText) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function resolveMonths(endMonth?: string, monthCount?: number): string[] {
  const normalizedEndMonth = normalizeMonth(endMonth);
  const count = Math.max(1, Math.min(Number(monthCount) || 3, 12));
  return Array.from({ length: count }, (_, index) => addMonths(normalizedEndMonth, index - count + 1));
}

function isAssessableEmployee(employee: Employee): boolean {
  if (employee.status && employee.status !== 'active') return false;
  return employee.role === 'employee' || employee.role === 'manager';
}

function resolveAssessorId(employee: Employee, activeIds: Set<string>): string | null {
  const managerId = String(employee.managerId || '').trim();
  if (managerId && managerId !== employee.id && activeIds.has(managerId)) return managerId;
  if (employee.role === 'manager' && activeIds.has('gm001')) return 'gm001';
  if (employee.role === 'employee' && activeIds.has('gm001')) return 'gm001';
  return null;
}

function seededNumber(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash / 0xffffffff;
}

function scoreToLevel(score: number): 'L1' | 'L2' | 'L3' | 'L4' | 'L5' {
  if (score >= 1.35) return 'L5';
  if (score >= 1.18) return 'L4';
  if (score >= 1.0) return 'L3';
  if (score >= 0.82) return 'L2';
  return 'L1';
}

function groupTypeForLevel(level: Employee['level']): 'high' | 'low' {
  return level === 'senior' || level === 'intermediate' ? 'high' : 'low';
}

function buildDemoRecord(employee: Employee, assessorId: string, month: string): PerformanceRecord {
  const base = 0.82 + seededNumber(`${employee.id}-${month}`) * 0.58;
  const trend = (seededNumber(`${employee.id}-trend`) - 0.5) * 0.08;
  const totalScore = Math.round(Math.max(0.7, Math.min(1.45, base + trend)) * 100) / 100;
  const dimension = (suffix: string) => (
    Math.round(Math.max(0.7, Math.min(1.5, totalScore + (seededNumber(`${employee.id}-${month}-${suffix}`) - 0.5) * 0.12)) * 100) / 100
  );

  return {
    id: `${DEMO_PREFIX}${employee.id}-${month}`,
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    subDepartment: employee.subDepartment,
    employeeLevel: employee.level,
    assessorId,
    month,
    selfSummary: `${DEMO_MARKER} ${employee.name} ${month} 完成重点项目推进、跨部门协作和日常任务闭环，过程记录用于演示系统流转。`,
    nextMonthPlan: `${DEMO_MARKER} ${employee.name} 下月计划继续推进重点事项，补齐风险项并沉淀标准化经验。`,
    employeeIssueTags: ['流程协同', '资源排期'],
    resourceNeedTags: ['跨部门支持'],
    improvementSuggestion: `${DEMO_MARKER} 建议持续优化绩效填报和评分节奏。`,
    suggestionAnonymous: false,
    taskCompletion: dimension('task'),
    initiative: dimension('initiative'),
    projectFeedback: dimension('feedback'),
    qualityImprovement: dimension('quality'),
    totalScore,
    normalizedScore: totalScore,
    level: scoreToLevel(totalScore),
    managerComment: `${DEMO_MARKER} 整体表现稳定，任务完成度和协作意识符合演示预期。`,
    nextMonthWorkArrangement: `${DEMO_MARKER} 下月重点关注项目交付、质量复盘和经验沉淀。`,
    evaluationKeywords: ['稳定交付', '主动协作'],
    issueTypeTags: ['流程协同'],
    highlightTags: ['按期完成'],
    workTypeTags: ['项目推进'],
    improvementActionTags: ['复盘沉淀'],
    issueAttributionTags: ['资源协调'],
    workloadTags: ['正常'],
    managerSuggestionTags: ['持续改进'],
    scoreEvidence: `${DEMO_MARKER} 仅用于系统演示，不作为真实绩效依据。`,
    monthlyStarRecommended: totalScore >= 1.32,
    monthlyStarCategory: totalScore >= 1.32 ? '协作之星' : '',
    monthlyStarReason: totalScore >= 1.32 ? `${DEMO_MARKER} 演示数据：跨部门协作表现突出。` : '',
    monthlyStarPublic: true,
    groupType: groupTypeForLevel(employee.level),
    groupRank: 0,
    crossDeptRank: 0,
    departmentRank: 0,
    companyRank: 0,
    status: 'completed',
    isDemo: true,
    createdAt: new Date(`${month}-05T09:00:00+08:00`),
    updatedAt: new Date(`${month}-07T18:00:00+08:00`),
  };
}

function isDemoRecord(record: PerformanceRecord): boolean {
  return Boolean(
    record.isDemo ||
    record.id.startsWith('demo-') ||
    record.selfSummary?.includes(DEMO_MARKER) ||
    record.selfSummary?.includes(LEGACY_DEMO_MARKER) ||
    record.managerComment?.includes(DEMO_MARKER) ||
    record.managerComment?.includes(LEGACY_DEMO_MARKER)
  );
}

function eligibleEmployees(employees: Employee[]): Array<{ employee: Employee; assessorId: string }> {
  const activeIds = new Set(
    employees
      .filter((employee) => !employee.status || employee.status === 'active')
      .map((employee) => employee.id)
  );

  return employees
    .filter(isAssessableEmployee)
    .map((employee) => ({ employee, assessorId: resolveAssessorId(employee, activeIds) }))
    .filter((item): item is { employee: Employee; assessorId: string } => Boolean(item.assessorId));
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await query(`SELECT to_regclass($1) AS table_name`, [`public.${tableName}`]);
  return Boolean(rows?.[0]?.table_name);
}

export class DemoDataService {
  static async generatePerformanceDemoData(options: DemoOptions = {}): Promise<DemoGenerateResult> {
    const months = resolveMonths(options.endMonth, options.monthCount);
    const cleared = await this.clearDemoData();

    const employees = USE_MEMORY_DB
      ? Array.from(memoryStore.employees.values()) as Employee[]
      : await EmployeeModel.findAll();
    const targets = eligibleEmployees(employees);
    const records = targets.flatMap(({ employee, assessorId }) => months.map((month) => buildDemoRecord(employee, assessorId, month)));

    if (USE_MEMORY_DB) {
      let createdCount = 0;
      let skippedCount = 0;
      const existingPairs = new Set(
        Array.from(memoryStore.performanceRecords.values())
          .map((record: PerformanceRecord) => `${record.employeeId}:${record.month}`)
      );
      for (const record of records) {
        const pair = `${record.employeeId}:${record.month}`;
        if (existingPairs.has(pair)) {
          skippedCount += 1;
          continue;
        }
        memoryStore.performanceRecords.set(record.id, record);
        existingPairs.add(pair);
        createdCount += 1;
      }
      return {
        months,
        employeeCount: targets.length,
        createdCount,
        skippedCount,
        clearedOldDemoCount: cleared.totalDeleted,
      };
    }

    if (records.length === 0) {
      return {
        months,
        employeeCount: 0,
        createdCount: 0,
        skippedCount: 0,
        clearedOldDemoCount: cleared.totalDeleted,
      };
    }

    const columns = [
      'id',
      'employee_id',
      'assessor_id',
      'month',
      'self_summary',
      'next_month_plan',
      'employee_issue_tags',
      'resource_need_tags',
      'improvement_suggestion',
      'suggestion_anonymous',
      'task_completion',
      'initiative',
      'project_feedback',
      'quality_improvement',
      'total_score',
      'normalized_score',
      'level',
      'manager_comment',
      'next_month_work_arrangement',
      'evaluation_keywords',
      'issue_type_tags',
      'highlight_tags',
      'work_type_tags',
      'improvement_action_tags',
      'issue_attribution_tags',
      'workload_tags',
      'manager_suggestion_tags',
      'score_evidence',
      'monthly_star_recommended',
      'monthly_star_category',
      'monthly_star_reason',
      'monthly_star_public',
      'group_type',
      'group_rank',
      'cross_dept_rank',
      'department_rank',
      'company_rank',
      'status',
      'created_at',
      'updated_at',
    ];

    let createdCount = 0;
    const batchSize = 200;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const params: any[] = [];
      const placeholders = batch.map((record) => {
        params.push(
          record.id,
          record.employeeId,
          record.assessorId,
          record.month,
          record.selfSummary,
          record.nextMonthPlan,
          JSON.stringify(record.employeeIssueTags || []),
          JSON.stringify(record.resourceNeedTags || []),
          record.improvementSuggestion || '',
          record.suggestionAnonymous === true,
          record.taskCompletion,
          record.initiative,
          record.projectFeedback,
          record.qualityImprovement,
          record.totalScore,
          record.normalizedScore || record.totalScore,
          record.level || 'L3',
          record.managerComment,
          record.nextMonthWorkArrangement,
          JSON.stringify(record.evaluationKeywords || []),
          JSON.stringify(record.issueTypeTags || []),
          JSON.stringify(record.highlightTags || []),
          JSON.stringify(record.workTypeTags || []),
          JSON.stringify(record.improvementActionTags || []),
          JSON.stringify(record.issueAttributionTags || []),
          JSON.stringify(record.workloadTags || []),
          JSON.stringify(record.managerSuggestionTags || []),
          record.scoreEvidence || '',
          record.monthlyStarRecommended === true,
          record.monthlyStarCategory || '',
          record.monthlyStarReason || '',
          record.monthlyStarPublic !== false,
          record.groupType,
          record.groupRank,
          record.crossDeptRank,
          record.departmentRank,
          record.companyRank,
          record.status,
          record.createdAt,
          record.updatedAt
        );
        const baseIndex = params.length - columns.length + 1;
        return `(${columns.map((_, columnIndex) => `$${baseIndex + columnIndex}`).join(', ')})`;
      }).join(', ');

      const inserted = await query(`
        INSERT INTO performance_records (${columns.join(', ')})
        VALUES ${placeholders}
        ON CONFLICT (employee_id, month) DO NOTHING
        RETURNING id
      `, params);
      createdCount += inserted.length;
    }

    for (const month of months) {
      await PerformanceModel.updateRanks(month);
    }

    return {
      months,
      employeeCount: targets.length,
      createdCount,
      skippedCount: records.length - createdCount,
      clearedOldDemoCount: cleared.totalDeleted,
    };
  }

  static async clearDemoData(): Promise<DemoClearResult> {
    if (USE_MEMORY_DB) {
      const beforeRecords = memoryStore.performanceRecords.size;
      for (const [id, record] of memoryStore.performanceRecords.entries()) {
        if (isDemoRecord(record)) memoryStore.performanceRecords.delete(id);
      }
      const quarterly = (memoryStore as any).employeeQuarterlySummaries as Map<string, any> | undefined;
      const beforeQuarterly = quarterly?.size || 0;
      if (quarterly) {
        for (const [id, summary] of quarterly.entries()) {
          const text = JSON.stringify(summary);
          if (id.startsWith('demo-') || text.includes(DEMO_MARKER) || text.includes(LEGACY_DEMO_MARKER) || text.includes('E2E测试-')) {
            quarterly.delete(id);
          }
        }
      }
      const result = {
        performanceRecordsDeleted: beforeRecords - memoryStore.performanceRecords.size,
        quarterlySummariesDeleted: beforeQuarterly - (quarterly?.size || 0),
        todosDeleted: 0,
        notificationsDeleted: 0,
        totalDeleted: 0,
      };
      result.totalDeleted = result.performanceRecordsDeleted + result.quarterlySummariesDeleted;
      return result;
    }

    const performanceRecordsDeleted = (await query(`
      DELETE FROM performance_records
      WHERE id LIKE 'demo-%'
        OR self_summary LIKE $1
        OR self_summary LIKE $2
        OR manager_comment LIKE $1
        OR manager_comment LIKE $2
    `, [`%${DEMO_MARKER}%`, `%${LEGACY_DEMO_MARKER}%`]) as any).affectedRows || 0;

    let quarterlySummariesDeleted = 0;
    if (await tableExists('employee_quarterly_summaries')) {
      quarterlySummariesDeleted = (await query(`
        DELETE FROM employee_quarterly_summaries
        WHERE id LIKE 'demo-%'
          OR monthly_summaries LIKE $1
          OR monthly_summaries LIKE $2
          OR monthly_summaries LIKE '%E2E测试-%'
          OR monthly_plans LIKE $1
          OR monthly_plans LIKE $2
          OR month_records::text LIKE $1
          OR month_records::text LIKE $2
      `, [`%${DEMO_MARKER}%`, `%${LEGACY_DEMO_MARKER}%`]) as any).affectedRows || 0;
    }

    const todosDeleted = (await query(`
      DELETE FROM todos
      WHERE related_id LIKE 'demo-%'
        OR title LIKE $1
        OR description LIKE $1
    `, [`%${DEMO_MARKER}%`]) as any).affectedRows || 0;

    const notificationsDeleted = (await query(`
      DELETE FROM notifications
      WHERE title LIKE $1
        OR content LIKE $1
    `, [`%${DEMO_MARKER}%`]) as any).affectedRows || 0;

    return {
      performanceRecordsDeleted,
      quarterlySummariesDeleted,
      todosDeleted,
      notificationsDeleted,
      totalDeleted: performanceRecordsDeleted + quarterlySummariesDeleted + todosDeleted + notificationsDeleted,
    };
  }

  static async getDemoDataStatus(): Promise<DemoStatusResult> {
    if (USE_MEMORY_DB) {
      const performanceRecords = Array.from(memoryStore.performanceRecords.values()).filter(isDemoRecord).length;
      const quarterly = (memoryStore as any).employeeQuarterlySummaries as Map<string, any> | undefined;
      const quarterlySummaries = quarterly
        ? Array.from(quarterly.entries()).filter(([id, summary]) => {
          const text = JSON.stringify(summary);
          return id.startsWith('demo-') || text.includes(DEMO_MARKER) || text.includes(LEGACY_DEMO_MARKER) || text.includes('E2E测试-');
        }).length
        : 0;
      return { performanceRecords, quarterlySummaries, todos: 0, notifications: 0, total: performanceRecords + quarterlySummaries };
    }

    const performanceRecords = Number((await query(`
      SELECT COUNT(*) AS count
      FROM performance_records
      WHERE id LIKE 'demo-%'
        OR self_summary LIKE $1
        OR self_summary LIKE $2
        OR manager_comment LIKE $1
        OR manager_comment LIKE $2
    `, [`%${DEMO_MARKER}%`, `%${LEGACY_DEMO_MARKER}%`]))[0]?.count || 0);

    let quarterlySummaries = 0;
    if (await tableExists('employee_quarterly_summaries')) {
      quarterlySummaries = Number((await query(`
        SELECT COUNT(*) AS count
        FROM employee_quarterly_summaries
        WHERE id LIKE 'demo-%'
          OR monthly_summaries LIKE $1
          OR monthly_summaries LIKE $2
          OR monthly_summaries LIKE '%E2E测试-%'
          OR monthly_plans LIKE $1
          OR monthly_plans LIKE $2
          OR month_records::text LIKE $1
          OR month_records::text LIKE $2
      `, [`%${DEMO_MARKER}%`, `%${LEGACY_DEMO_MARKER}%`]))[0]?.count || 0);
    }

    const todos = Number((await query(`
      SELECT COUNT(*) AS count
      FROM todos
      WHERE related_id LIKE 'demo-%'
        OR title LIKE $1
        OR description LIKE $1
    `, [`%${DEMO_MARKER}%`]))[0]?.count || 0);

    const notifications = Number((await query(`
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE title LIKE $1
        OR content LIKE $1
    `, [`%${DEMO_MARKER}%`]))[0]?.count || 0);

    return {
      performanceRecords,
      quarterlySummaries,
      todos,
      notifications,
      total: performanceRecords + quarterlySummaries + todos + notifications,
    };
  }
}
