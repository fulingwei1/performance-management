/**
 * 差异化考核测试数据种子
 * 用于快速测试差异化考核功能
 */

import { USE_MEMORY_DB, memoryStore } from './database';
import { MonthlyAssessmentModel, MonthlyAssessment } from '../models/monthlyAssessment.model';
import logger from './logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * 生成测试评分数据
 */
export async function seedAssessmentTestData() {
  try {
    logger.info('🌱 开始生成差异化考核测试数据...');
    
    if (!USE_MEMORY_DB) {
      logger.info('⚠️  仅在 Memory DB 模式下生成测试数据');
      return;
    }
    
    // 模拟员工数据
    const testEmployees = [
      { id: 'emp001', name: '张三', department: '销售部', departmentType: 'sales' },
      { id: 'emp002', name: '李四', department: '研发部', departmentType: 'engineering' },
      { id: 'emp003', name: '王五', department: '生产部', departmentType: 'manufacturing' },
      { id: 'emp004', name: '赵六', department: 'HR部', departmentType: 'support' }
    ];
    
    // 模拟模板ID（需要先运行 init-templates.ts）
    const templateMapping: Record<string, string> = {
      sales: 'template-sales-001',
      engineering: 'template-engineering-001',
      manufacturing: 'template-manufacturing-001',
      support: 'template-support-001'
    };
    
    // 生成最近3个月的评分记录
    const months = ['2025-12', '2026-01', '2026-02'];
    let createdCount = 0;
    
    for (const emp of testEmployees) {
      for (const month of months) {
        // 随机生成评分（模拟真实场景）
        const scores = generateRandomScores(emp.departmentType);
        const totalScore = calculateTotalScore(scores);
        
        const assessment: Omit<MonthlyAssessment, 'id' | 'createdAt' | 'updatedAt'> = {
          employeeId: emp.id,
          employeeName: emp.name,
          month,
          templateId: templateMapping[emp.departmentType],
          templateName: getTemplateName(emp.departmentType),
          departmentType: emp.departmentType,
          scores,
          totalScore,
          evaluatorId: 'm001',
          evaluatorName: '张经理'
        };
        
        await MonthlyAssessmentModel.create(assessment);
        createdCount++;
      }
    }
    
    logger.info(`✅ 成功生成 ${createdCount} 条评分记录`);
    logger.info(`   - 员工数: ${testEmployees.length}`);
    logger.info(`   - 月份数: ${months.length}`);
    logger.info(`   - 平均每人: ${months.length} 条记录`);
    
  } catch (error) {
    logger.error('Failed to seed assessment test data: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

/**
 * 根据部门类型生成随机评分
 */
function generateRandomScores(departmentType: string) {
  const templates: Record<string, any[]> = {
    sales: [
      { metricName: '销售额完成率', metricCode: 'SALES_COMPLETION', weight: 30 },
      { metricName: '回款率', metricCode: 'PAYMENT_RATE', weight: 20 },
      { metricName: '新客户开发', metricCode: 'NEW_CUSTOMERS', weight: 10 },
      { metricName: '客户满意度', metricCode: 'CUSTOMER_SATISFACTION', weight: 15 },
      { metricName: '销售活动参与度', metricCode: 'ACTIVITY_PARTICIPATION', weight: 10 },
      { metricName: '团队协作', metricCode: 'TEAMWORK', weight: 10 },
      { metricName: '市场拓展能力', metricCode: 'MARKET_EXPANSION', weight: 5 }
    ],
    engineering: [
      { metricName: '项目按时交付率', metricCode: 'ON_TIME_DELIVERY', weight: 25 },
      { metricName: '代码质量', metricCode: 'CODE_QUALITY', weight: 20 },
      { metricName: '技术创新', metricCode: 'INNOVATION', weight: 15 },
      { metricName: 'Bug修复率', metricCode: 'BUG_FIX_RATE', weight: 15 },
      { metricName: '文档完整性', metricCode: 'DOCUMENTATION', weight: 10 },
      { metricName: '技术分享', metricCode: 'KNOWLEDGE_SHARING', weight: 10 },
      { metricName: '团队协作', metricCode: 'TEAMWORK', weight: 5 }
    ],
    manufacturing: [
      { metricName: '产量完成率', metricCode: 'OUTPUT_COMPLETION', weight: 25 },
      { metricName: '产品合格率', metricCode: 'QUALITY_RATE', weight: 25 },
      { metricName: '安全事故次数', metricCode: 'SAFETY_INCIDENTS', weight: 20 },
      { metricName: '设备利用率', metricCode: 'EQUIPMENT_UTILIZATION', weight: 15 },
      { metricName: '成本控制', metricCode: 'COST_CONTROL', weight: 10 },
      { metricName: '5S管理', metricCode: 'FIVE_S', weight: 5 }
    ],
    support: [
      { metricName: '工作准确率', metricCode: 'ACCURACY_RATE', weight: 25 },
      { metricName: '及时响应率', metricCode: 'RESPONSE_RATE', weight: 20 },
      { metricName: '服务满意度', metricCode: 'SERVICE_SATISFACTION', weight: 20 },
      { metricName: '流程优化', metricCode: 'PROCESS_OPTIMIZATION', weight: 15 },
      { metricName: '跨部门协作', metricCode: 'CROSS_TEAM_COLLABORATION', weight: 10 },
      { metricName: '主动性', metricCode: 'INITIATIVE', weight: 10 }
    ]
  };
  
  const metrics = templates[departmentType] || templates.support;
  const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const levelScores: Record<string, number> = {
    L1: 0.5,
    L2: 0.8,
    L3: 1.0,
    L4: 1.2,
    L5: 1.5
  };
  
  return metrics.map(metric => {
    // 大部分评分在L3-L4之间，偶尔有L5和L2
    const rand = Math.random();
    let level: string;
    if (rand < 0.1) level = 'L5';
    else if (rand < 0.4) level = 'L4';
    else if (rand < 0.85) level = 'L3';
    else level = 'L2';
    
    return {
      metricName: metric.metricName,
      metricCode: metric.metricCode,
      weight: metric.weight,
      level,
      score: levelScores[level],
      comment: generateComment(metric.metricName, level)
    };
  });
}

/**
 * 计算加权总分
 */
function calculateTotalScore(scores: any[]) {
  let total = 0;
  scores.forEach(s => {
    total += (s.score * s.weight) / 100;
  });
  return parseFloat(total.toFixed(2));
}

/**
 * 获取模板名称
 */
function getTemplateName(departmentType: string): string {
  const names: Record<string, string> = {
    sales: '销售部门标准模板',
    engineering: '工程技术部门标准模板',
    manufacturing: '生产制造部门标准模板',
    support: '支持部门标准模板'
  };
  return names[departmentType] || '通用模板';
}

/**
 * 生成评价说明
 */
function generateComment(metricName: string, level: string): string {
  const comments: Record<string, Record<string, string[]>> = {
    L5: {
      default: ['超额完成目标，表现卓越', '远超预期，成为团队标杆', '持续创新，带来显著价值']
    },
    L4: {
      default: ['表现优秀，超出预期', '工作质量高，效率突出', '积极主动，成效明显']
    },
    L3: {
      default: ['达到预期目标', '工作稳定，符合要求', '按时完成任务']
    },
    L2: {
      default: ['有待提升', '部分环节需要改进', '建议加强相关能力']
    }
  };
  
  const levelComments = comments[level]?.default || ['无'];
  return levelComments[Math.floor(Math.random() * levelComments.length)];
}

/**
 * 清除测试数据
 */
export async function clearAssessmentTestData() {
  try {
    logger.info('🧹 清除差异化考核测试数据...');
    
    if (USE_MEMORY_DB && memoryStore.monthlyAssessments) {
      memoryStore.monthlyAssessments.clear();
      logger.info('✅ 测试数据已清除');
    }
  } catch (error) {
    logger.error('Failed to clear test data: ' + (error instanceof Error ? error.message : String(error)));
  }
}
