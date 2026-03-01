import ExcelJS from 'exceljs';
import { MonthlyAssessmentModel } from '../models/monthlyAssessment.model';
import { AssessmentTemplateModel } from '../models/assessmentTemplate.model';
import logger from '../config/logger';

interface ExportOptions {
  month?: string;
  departmentType?: string;
  employeeIds?: string[];
}

/**
 * 导出月度评分记录为 Excel
 */
export async function exportMonthlyAssessments(options: ExportOptions = {}): Promise<ExcelJS.Buffer> {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Performance Management System';
    workbook.created = new Date();
    
    // Sheet 1: 评分明细
    const detailSheet = workbook.addWorksheet('评分明细', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });
    
    // 设置列
    detailSheet.columns = [
      { header: '评分ID', key: 'id', width: 20 },
      { header: '员工姓名', key: 'employeeName', width: 15 },
      { header: '部门', key: 'department', width: 20 },
      { header: '岗位', key: 'position', width: 20 },
      { header: '月份', key: 'month', width: 10 },
      { header: '部门类型', key: 'departmentType', width: 15 },
      { header: '模板名称', key: 'templateName', width: 30 },
      { header: '总分', key: 'totalScore', width: 10 },
      { header: '评分人', key: 'evaluatorName', width: 15 },
      { header: '评分时间', key: 'createdAt', width: 20 }
    ];
    
    // 样式设置
    detailSheet.getRow(1).font = { bold: true };
    detailSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // TODO: 从数据库加载数据
    // 这里先预留接口，实际使用时需要根据 options 筛选
    
    // Sheet 2: 指标评分详情
    const metricsSheet = workbook.addWorksheet('指标评分详情', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });
    
    metricsSheet.columns = [
      { header: '员工姓名', key: 'employeeName', width: 15 },
      { header: '月份', key: 'month', width: 10 },
      { header: '指标名称', key: 'metricName', width: 25 },
      { header: '指标编码', key: 'metricCode', width: 20 },
      { header: '权重', key: 'weight', width: 10 },
      { header: '评级', key: 'level', width: 10 },
      { header: '得分', key: 'score', width: 10 },
      { header: '加权得分', key: 'weightedScore', width: 12 },
      { header: '评价说明', key: 'comment', width: 40 }
    ];
    
    metricsSheet.getRow(1).font = { bold: true };
    metricsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    metricsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Sheet 3: 统计汇总
    const summarySheet = workbook.addWorksheet('统计汇总');
    
    summarySheet.mergeCells('A1:D1');
    summarySheet.getCell('A1').value = '差异化考核统计报表';
    summarySheet.getCell('A1').font = { size: 16, bold: true };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };
    
    summarySheet.getCell('A3').value = '生成时间:';
    summarySheet.getCell('B3').value = new Date().toLocaleString('zh-CN');
    
    summarySheet.getCell('A4').value = '统计月份:';
    summarySheet.getCell('B4').value = options.month || '全部';
    
    summarySheet.columns = [
      { width: 20 },
      { width: 30 },
      { width: 15 },
      { width: 15 }
    ];
    
    // 生成 Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    logger.error('Failed to export assessments: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

/**
 * 导出部门类型统计报表
 */
export async function exportDepartmentTypeStats(): Promise<ExcelJS.Buffer> {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('部门类型统计');
    
    // 标题
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = '部门类型考核统计报表';
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // 表头
    sheet.getRow(3).values = ['部门类型', '模板数量', '指标数量', '平均权重', '启用状态', '最后更新'];
    sheet.getRow(3).font = { bold: true };
    sheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    sheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // 获取所有模板
    const templates = await AssessmentTemplateModel.findAll();
    
    // 按部门类型分组统计
    const stats: Record<string, any> = {};
    
    templates.forEach(template => {
      if (!stats[template.departmentType]) {
        stats[template.departmentType] = {
          count: 0,
          totalMetrics: 0,
          templates: []
        };
      }
      
      stats[template.departmentType].count++;
      stats[template.departmentType].totalMetrics += template.metrics?.length || 0;
      stats[template.departmentType].templates.push(template);
    });
    
    // 填充数据
    let rowIndex = 4;
    const typeLabels: Record<string, string> = {
      sales: '销售类',
      engineering: '工程类',
      manufacturing: '生产类',
      support: '支持类',
      management: '管理类'
    };
    
    Object.entries(stats).forEach(([type, data]) => {
      const row = sheet.getRow(rowIndex++);
      row.values = [
        typeLabels[type] || type,
        data.count,
        data.totalMetrics,
        data.count > 0 ? (data.totalMetrics / data.count).toFixed(1) : 0,
        '启用',
        new Date().toLocaleDateString('zh-CN')
      ];
    });
    
    // 设置列宽
    sheet.columns = [
      { width: 15 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 20 }
    ];
    
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    logger.error('Failed to export department stats: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

/**
 * 导出评分趋势分析
 */
export async function exportScoreTrendAnalysis(employeeId: string): Promise<ExcelJS.Buffer> {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('评分趋势分析');
    
    // 获取员工历史评分
    const assessments = await MonthlyAssessmentModel.findByEmployee(employeeId);
    
    // 标题
    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = `员工评分趋势分析`;
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    
    if (assessments.length > 0) {
      sheet.getCell('A2').value = `员工: ${assessments[0].employeeName || ''}`;
    }
    
    // 表头
    sheet.getRow(4).values = ['月份', '总分', '评级水平', '模板名称', '评分时间'];
    sheet.getRow(4).font = { bold: true };
    sheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // 填充数据
    let rowIndex = 5;
    assessments.forEach(assessment => {
      const level = assessment.totalScore >= 1.4 ? 'L5' :
                   assessment.totalScore >= 1.1 ? 'L4' :
                   assessment.totalScore >= 0.9 ? 'L3' :
                   assessment.totalScore >= 0.7 ? 'L2' : 'L1';
      
      const row = sheet.getRow(rowIndex++);
      row.values = [
        assessment.month,
        assessment.totalScore.toFixed(2),
        level,
        assessment.templateName,
        new Date(assessment.createdAt).toLocaleString('zh-CN')
      ];
    });
    
    // 统计区
    const statsRow = rowIndex + 2;
    sheet.getCell(`A${statsRow}`).value = '统计指标';
    sheet.getCell(`A${statsRow}`).font = { bold: true };
    
    if (assessments.length > 0) {
      const scores = assessments.map(a => a.totalScore);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      
      sheet.getCell(`A${statsRow + 1}`).value = '平均分:';
      sheet.getCell(`B${statsRow + 1}`).value = avgScore.toFixed(2);
      
      sheet.getCell(`A${statsRow + 2}`).value = '最高分:';
      sheet.getCell(`B${statsRow + 2}`).value = maxScore.toFixed(2);
      
      sheet.getCell(`A${statsRow + 3}`).value = '最低分:';
      sheet.getCell(`B${statsRow + 3}`).value = minScore.toFixed(2);
      
      sheet.getCell(`A${statsRow + 4}`).value = '评分次数:';
      sheet.getCell(`B${statsRow + 4}`).value = assessments.length;
    }
    
    // 设置列宽
    sheet.columns = [
      { width: 12 },
      { width: 10 },
      { width: 12 },
      { width: 30 },
      { width: 20 }
    ];
    
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    logger.error('Failed to export trend analysis: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}
