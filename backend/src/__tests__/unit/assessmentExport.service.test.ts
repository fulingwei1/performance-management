import ExcelJS from 'exceljs';
import { exportMonthlyAssessments } from '../../services/assessmentExport.service';
import { memoryStore } from '../../config/database';

describe('assessmentExport.service', () => {
  beforeEach(() => {
    memoryStore.performanceRecords = new Map();
    memoryStore.employees = new Map([
      ['m-export-001', {
        id: 'm-export-001',
        name: '导出经理',
        role: 'manager',
        department: '工程技术中心',
        level: 'senior',
        status: 'active'
      } as any],
    ]);
  });

  const createPerformanceRecord = (data: {
    employeeId: string;
    employeeName: string;
    month: string;
    departmentType: string;
    templateId: string;
    templateName: string;
    totalScore: number;
    scores?: any[];
  }) => {
    memoryStore.employees.set(data.employeeId, {
      id: data.employeeId,
      name: data.employeeName,
      role: 'employee',
      department: data.departmentType,
      position: '工程师',
      level: 'junior',
      managerId: 'm-export-001',
      status: 'active'
    } as any);

    memoryStore.performanceRecords.set(`record-${data.employeeId}-${data.month}`, {
      id: `record-${data.employeeId}-${data.month}`,
      employeeId: data.employeeId,
      assessorId: 'm-export-001',
      month: data.month,
      selfSummary: '工作总结',
      nextMonthPlan: '下月计划',
      taskCompletion: data.totalScore,
      initiative: data.totalScore,
      projectFeedback: data.totalScore,
      qualityImprovement: data.totalScore,
      totalScore: data.totalScore,
      managerComment: '评价',
      nextMonthWorkArrangement: '安排',
      groupType: 'low',
      groupRank: 0,
      crossDeptRank: 0,
      departmentRank: 0,
      companyRank: 0,
      status: 'completed',
      departmentType: data.departmentType,
      templateId: data.templateId,
      templateName: data.templateName,
      scores: data.scores || [],
      createdAt: new Date(),
      updatedAt: new Date()
    } as any);
  };

  it('exports monthly assessment detail rows and metric score rows from stored assessments', async () => {
    createPerformanceRecord({
      employeeId: 'e-export-001',
      employeeName: '导出员工',
      month: '2026-03',
      templateId: 'template-export-001',
      templateName: '导出模板',
      departmentType: 'engineering',
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
    createPerformanceRecord({
      employeeId: 'e-export-filtered',
      employeeName: '应导出员工',
      month: '2026-04',
      templateId: 'template-export-002',
      templateName: '工程模板',
      departmentType: 'engineering',
      totalScore: 1.1,
      scores: []
    });
    createPerformanceRecord({
      employeeId: 'e-export-excluded',
      employeeName: '不应导出员工',
      month: '2026-04',
      templateId: 'template-export-003',
      templateName: '销售模板',
      departmentType: 'sales',
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
