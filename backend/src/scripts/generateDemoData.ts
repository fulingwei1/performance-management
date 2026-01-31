/**
 * 生成模拟绩效数据脚本
 * 为所有员工生成过去5个月(2025-08到2025-12)的模拟绩效记录
 * 数据带有 isDemo: true 标记，方便后续删除
 */

import { memoryStore, USE_MEMORY_DB, query } from '../config/database';
import { PerformanceRecord } from '../types';
import { EmployeeModel } from '../models/employee.model';

// 模拟数据月份范围
const DEMO_MONTHS = ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];

// 员工成长类型
type GrowthType = 'improving' | 'stable' | 'declining';

// 根据员工ID生成一个确定性的成长类型
function getGrowthType(employeeId: string): GrowthType {
  const hash = employeeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mod = hash % 10;
  if (mod < 3) return 'improving'; // 30% 持续进步
  if (mod < 9) return 'stable';    // 60% 稳定
  return 'declining';              // 10% 下滑
}

// 根据员工级别获取基准分数范围
function getBaseScoreRange(level: string): { min: number; max: number } {
  switch (level) {
    case 'senior': return { min: 1.15, max: 1.40 };
    case 'mid':
    case 'intermediate': return { min: 1.00, max: 1.30 };
    case 'assistant': return { min: 0.70, max: 1.10 };
    case 'junior':
    default: return { min: 0.80, max: 1.20 };
  }
}

// 生成随机分数（在范围内）
function randomScore(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

// 根据总分拆分为四维分数
function splitToFourDimensions(totalScore: number): {
  taskCompletion: number;
  initiative: number;
  projectFeedback: number;
  qualityImprovement: number;
} {
  // 加一些随机波动，但保证加权计算后接近totalScore
  // 权重: taskCompletion 40%, initiative 30%, projectFeedback 20%, qualityImprovement 10%
  const base = totalScore;
  const variance = 0.1;
  
  const taskCompletion = Math.max(0.5, Math.min(1.5, base + (Math.random() - 0.5) * variance));
  const initiative = Math.max(0.5, Math.min(1.5, base + (Math.random() - 0.5) * variance));
  const projectFeedback = Math.max(0.5, Math.min(1.5, base + (Math.random() - 0.5) * variance));
  const qualityImprovement = Math.max(0.5, Math.min(1.5, base + (Math.random() - 0.5) * variance));
  
  return {
    taskCompletion: Math.round(taskCompletion * 100) / 100,
    initiative: Math.round(initiative * 100) / 100,
    projectFeedback: Math.round(projectFeedback * 100) / 100,
    qualityImprovement: Math.round(qualityImprovement * 100) / 100
  };
}

// 根据分数计算等级
function scoreToLevel(score: number): string {
  if (score >= 1.4) return 'L5';
  if (score >= 1.2) return 'L4';
  if (score >= 1.0) return 'L3';
  if (score >= 0.8) return 'L2';
  return 'L1';
}

// 生成单个员工的模拟数据
function generateEmployeeDemoData(employee: any): PerformanceRecord[] {
  const records: PerformanceRecord[] = [];
  const growthType = getGrowthType(employee.id);
  const { min, max } = getBaseScoreRange(employee.level);
  
  // 生成基准分数
  let baseScore = randomScore(min, max);
  
  DEMO_MONTHS.forEach((month, index) => {
    // 根据成长类型调整分数
    let adjustedScore = baseScore;
    if (growthType === 'improving') {
      adjustedScore = baseScore + index * 0.05;
    } else if (growthType === 'declining') {
      adjustedScore = baseScore - index * 0.04;
    } else {
      // 稳定型，小幅波动
      adjustedScore = baseScore + (Math.random() - 0.5) * 0.1;
    }
    
    // 限制在有效范围内
    adjustedScore = Math.max(0.5, Math.min(1.5, adjustedScore));
    adjustedScore = Math.round(adjustedScore * 100) / 100;
    
    const dimensions = splitToFourDimensions(adjustedScore);
    
    // 计算实际加权总分
    const totalScore = Math.round((
      dimensions.taskCompletion * 0.4 +
      dimensions.initiative * 0.3 +
      dimensions.projectFeedback * 0.2 +
      dimensions.qualityImprovement * 0.1
    ) * 100) / 100;
    
    const record: PerformanceRecord = {
      id: `demo-${employee.id}-${month}`,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      subDepartment: employee.subDepartment,
      employeeLevel: employee.level,
      assessorId: employee.managerId || 'gm001',
      assessorName: '',
      month,
      selfSummary: `[示例数据] ${month}月工作总结`,
      nextMonthPlan: `[示例数据] ${month}月下月计划`,
      ...dimensions,
      totalScore,
      groupType: employee.level === 'senior' || employee.level === 'mid' ? 'high' : 'low',
      groupRank: 0,
      crossDeptRank: 0,
      departmentRank: 0,
      companyRank: 0,
      managerComment: `[示例数据] ${month}月经理评价`,
      nextMonthWorkArrangement: `[示例数据] ${month}月工作安排`,
      status: 'completed',
      level: scoreToLevel(totalScore),
      isDemo: true, // 标记为模拟数据
      createdAt: new Date(`${month}-15T10:00:00Z`).toISOString(),
      updatedAt: new Date(`${month}-20T10:00:00Z`).toISOString()
    } as PerformanceRecord & { isDemo: boolean };
    
    records.push(record);
  });
  
  return records;
}

// 生成所有模拟数据
export function generateAllDemoData(): PerformanceRecord[] {
  const employees = Array.from(memoryStore.employees.values());
  return generateAllDemoDataFromEmployees(employees);
}

function generateAllDemoDataFromEmployees(employees: any[]): PerformanceRecord[] {
  const allRecords: PerformanceRecord[] = [];

  const validIds = new Set<string>(employees.map((e: any) => e.id));

  employees.forEach((employee: any) => {
    // 为员工和经理生成数据（排除总经理和HR）
    // 员工有 managerId；经理的 assessorId 是总经理
    if (employee.role === 'employee') {
      const managerId = employee.managerId && validIds.has(employee.managerId)
        ? employee.managerId
        : 'gm001';
      allRecords.push(...generateEmployeeDemoData({ ...employee, managerId }));
    } else if (employee.role === 'manager') {
      const managerAsEmployee = { ...employee, managerId: 'gm001' };
      allRecords.push(...generateEmployeeDemoData(managerAsEmployee));
    }
  });

  return allRecords;
}

// 插入模拟数据到内存数据库
export async function insertDemoData(): Promise<number> {
  if (USE_MEMORY_DB) {
    const demoRecords = generateAllDemoData();

    demoRecords.forEach(record => {
      memoryStore.performanceRecords.set(record.id, record);
    });

    console.log(`✅ 已生成 ${demoRecords.length} 条模拟绩效数据`);
    console.log(`   月份范围: ${DEMO_MONTHS[0]} 至 ${DEMO_MONTHS[DEMO_MONTHS.length - 1]}`);
    console.log(`   员工数量: ${demoRecords.length / DEMO_MONTHS.length}`);

    return demoRecords.length;
  }

  const employees = await EmployeeModel.findAll();
  const demoRecords = generateAllDemoDataFromEmployees(employees);

  // 先清理旧 demo 数据，确保可重复生成
  await query("DELETE FROM performance_records WHERE id LIKE 'demo-%'");

  if (demoRecords.length === 0) {
    return 0;
  }

  // 批量插入（避免 SQL 过长）
  const cols = [
    'id',
    'employee_id',
    'assessor_id',
    'month',
    'self_summary',
    'next_month_plan',
    'task_completion',
    'initiative',
    'project_feedback',
    'quality_improvement',
    'total_score',
    'level',
    'manager_comment',
    'next_month_work_arrangement',
    'group_type',
    'group_rank',
    'cross_dept_rank',
    'department_rank',
    'company_rank',
    'status',
    'created_at',
    'updated_at'
  ];

  const batchSize = 300;
  for (let i = 0; i < demoRecords.length; i += batchSize) {
    const batch = demoRecords.slice(i, i + batchSize);
    const placeholders = batch.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
    const sql = `INSERT INTO performance_records (${cols.join(',')}) VALUES ${placeholders}`;

    const params: any[] = [];
    for (const r of batch as any[]) {
      params.push(
        r.id,
        r.employeeId,
        r.assessorId,
        r.month,
        r.selfSummary,
        r.nextMonthPlan,
        r.taskCompletion,
        r.initiative,
        r.projectFeedback,
        r.qualityImprovement,
        r.totalScore,
        r.level,
        r.managerComment,
        r.nextMonthWorkArrangement,
        r.groupType,
        r.groupRank ?? 0,
        r.crossDeptRank ?? 0,
        r.departmentRank ?? 0,
        r.companyRank ?? 0,
        r.status,
        // created_at / updated_at: allow MySQL to parse timestamp
        r.createdAt ? new Date(r.createdAt) : new Date(),
        r.updatedAt ? new Date(r.updatedAt) : new Date()
      );
    }

    await query(sql, params);
  }

  console.log(`✅ 已生成并写入 ${demoRecords.length} 条模拟绩效数据 (MySQL)`);
  console.log(`   月份范围: ${DEMO_MONTHS[0]} 至 ${DEMO_MONTHS[DEMO_MONTHS.length - 1]}`);
  console.log(`   员工数量: ${demoRecords.length / DEMO_MONTHS.length}`);

  return demoRecords.length;
}

// 清除模拟数据
export async function clearDemoData(): Promise<number> {
  if (USE_MEMORY_DB) {
    let count = 0;
    const keysToDelete: string[] = [];

    memoryStore.performanceRecords.forEach((record: any, key: string) => {
      if (record.isDemo || key.startsWith('demo-')) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      memoryStore.performanceRecords.delete(key);
      count++;
    });

    console.log(`🗑️ 已清除 ${count} 条模拟数据`);
    return count;
  }

  const result = (await query("DELETE FROM performance_records WHERE id LIKE 'demo-%'")) as any;
  const affectedRows = typeof result?.affectedRows === 'number' ? result.affectedRows : 0;
  console.log(`🗑️ 已清除 ${affectedRows} 条模拟数据 (MySQL)`);
  return affectedRows;
}

// 检查是否有模拟数据
export async function hasDemoData(): Promise<boolean> {
  if (USE_MEMORY_DB) {
    for (const [key, record] of memoryStore.performanceRecords.entries()) {
      if ((record as any).isDemo || key.startsWith('demo-')) {
        return true;
      }
    }
    return false;
  }

  const results = (await query("SELECT id FROM performance_records WHERE id LIKE 'demo-%' LIMIT 1")) as any[];
  return Array.isArray(results) && results.length > 0;
}
