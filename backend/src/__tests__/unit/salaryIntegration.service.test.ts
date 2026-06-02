import ExcelJS from 'exceljs';
import { SalaryIntegrationService } from '../../services/salaryIntegration.service';
import { EmployeeQuarterlyModel } from '../../models/employeeQuarterly.model';
import { EmployeeModel } from '../../models/employee.model';

jest.mock('../../models/employeeQuarterly.model');
jest.mock('../../models/employee.model');

describe('SalaryIntegrationService quarterly coefficients', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('builds payroll-ready quarterly coefficient rows from quarterly summaries', async () => {
    (EmployeeQuarterlyModel.findByQuarter as jest.Mock).mockResolvedValue([
      {
        employeeId: 'e-low',
        employeeName: '低分员工',
        department: '制造中心',
        subDepartment: '生产部',
        avgScore: 0.88,
        recordCount: 2,
        monthRecords: [
          { month: '2026-04', total_score: 0.86, level: 'L2' },
          { month: '2026-05', total_score: 0.90, level: 'L3' },
        ],
      },
      {
        employeeId: 'e-high',
        employeeName: '高分员工',
        department: '工程技术中心',
        subDepartment: 'PLC部',
        avgScore: 1.16,
        recordCount: 3,
        monthRecords: [
          { month: '2026-04', total_score: 1.10, level: 'L3' },
          { month: '2026-05', total_score: 1.20, level: 'L4' },
          { month: '2026-06', total_score: 1.18, level: 'L4' },
        ],
      },
    ]);

    const dataset = await SalaryIntegrationService.buildQuarterlyCoefficientDataset(2026, 2);

    expect(dataset.quarter).toBe('2026-Q2');
    expect(dataset.effectiveQuarter).toBe('2026-Q3');
    expect(dataset.results).toHaveLength(2);
    expect(dataset.results[0]).toMatchObject({
      employeeExternalId: 'e-high',
      employeeName: '高分员工',
      quarterScore: 1.16,
      monthsCount: 3,
      rank: 1,
      level: 'L4',
      coefficient: 1.2,
    });
    expect(dataset.results[1]).toMatchObject({
      employeeExternalId: 'e-low',
      quarterScore: 0.88,
      monthsCount: 2,
      rank: 2,
      level: 'L2',
      coefficient: 0.8,
    });
    expect(dataset.summary).toMatchObject({
      employeeCount: 2,
      avgQuarterScore: 1.02,
      avgCoefficient: 1,
      minCoefficient: 0.8,
      maxCoefficient: 1.2,
    });
  });

  it('falls back to employee archive fields and exports coefficient workbook', async () => {
    (EmployeeQuarterlyModel.findByQuarter as jest.Mock).mockResolvedValue([
      {
        employee_id: 'e-missing-name',
        avg_score: 1.42,
        record_count: 1,
        month_records: JSON.stringify([{ month: '2026-06', total_score: 1.42, level: 'L5' }]),
      },
    ]);
    (EmployeeModel.findById as jest.Mock).mockResolvedValue({
      id: 'e-missing-name',
      name: '档案员工',
      department: '工程技术中心',
      subDepartment: '测试部',
    });

    const buffer = await SalaryIntegrationService.exportQuarterlyCoefficientWorkbook(2026, 2);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('季度绩效系数');
    expect(sheet).toBeDefined();
    expect(sheet!.getRow(2).getCell(1).value).toBe('2026-Q2');
    expect(sheet!.getRow(2).getCell(3).value).toBe('e-missing-name');
    expect(sheet!.getRow(2).getCell(4).value).toBe('档案员工');
    expect(sheet!.getRow(2).getCell(9).value).toBe(1.42);
    expect(sheet!.getRow(2).getCell(11).value).toBe(1.5);
  });
});
