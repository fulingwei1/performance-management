import ExcelJS from 'exceljs';
import { exportMonthlyAssessments } from '../../services/assessmentExport.service';
import { MonthlyAssessmentModel } from '../../models/monthlyAssessment.model';

describe('assessmentExport.service', () => {
  it('exports monthly assessment detail rows and metric score rows from stored assessments', async () => {
    await MonthlyAssessmentModel.create({
      employeeId: 'e-export-001',
      employeeName: '导出员工',
      month: '2026-03',
      templateId: 'template-export-001',
      templateName: '导出模板',
      departmentType: 'engineering',
      evaluatorId: 'm-export-001',
      evaluatorName: '导出经理',
      totalScore: 1.2,
      scores: [
        {
          metricName: '项目按时完成率',
          metricCode: 'PROJECT_ONTIME_RATE',
          weight: 40,
          level: 'L4',
          score: 1.2,
          comment: '按时完成'
        }
      ]
    });

    const buffer = await exportMonthlyAssessments({ month: '2026-03' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const detailSheet = workbook.getWorksheet('评分明细');
    const metricsSheet = workbook.getWorksheet('指标评分详情');

    expect(detailSheet).toBeDefined();
    expect(metricsSheet).toBeDefined();
    expect(detailSheet!.rowCount).toBeGreaterThan(1);
    expect(metricsSheet!.rowCount).toBeGreaterThan(1);
    expect(detailSheet!.getRow(2).getCell(2).value).toBe('导出员工');
    expect(detailSheet!.getRow(2).getCell(5).value).toBe('2026-03');
    expect(detailSheet!.getRow(2).getCell(7).value).toBe('导出模板');
    expect(detailSheet!.getRow(2).getCell(8).value).toBe(1.2);
    expect(metricsSheet!.getRow(2).getCell(3).value).toBe('项目按时完成率');
    expect(metricsSheet!.getRow(2).getCell(8).value).toBe(0.48);
  });

  it('applies department type and employee filters when exporting assessments', async () => {
    await MonthlyAssessmentModel.create({
      employeeId: 'e-export-filtered',
      employeeName: '应导出员工',
      month: '2026-04',
      templateId: 'template-export-002',
      templateName: '工程模板',
      departmentType: 'engineering',
      evaluatorId: 'm-export-001',
      evaluatorName: '导出经理',
      totalScore: 1.1,
      scores: []
    });
    await MonthlyAssessmentModel.create({
      employeeId: 'e-export-excluded',
      employeeName: '不应导出员工',
      month: '2026-04',
      templateId: 'template-export-003',
      templateName: '销售模板',
      departmentType: 'sales',
      evaluatorId: 'm-export-001',
      evaluatorName: '导出经理',
      totalScore: 1.0,
      scores: []
    });

    const buffer = await exportMonthlyAssessments({
      month: '2026-04',
      departmentType: 'engineering',
      employeeIds: ['e-export-filtered']
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const detailSheet = workbook.getWorksheet('评分明细');

    expect(detailSheet!.rowCount).toBe(2);
    expect(detailSheet!.getRow(2).getCell(2).value).toBe('应导出员工');
  });
});
