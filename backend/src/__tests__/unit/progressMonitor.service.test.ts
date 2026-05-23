import { memoryStore } from '../../config/database';
import { ProgressMonitorService } from '../../services/progressMonitor.service';

describe('ProgressMonitorService assessment scope counts', () => {
  beforeEach(() => {
    memoryStore.employees = new Map();
    memoryStore.performanceRecords = new Map();
    memoryStore.systemSettings = new Map();
    memoryStore.todos = new Map();
    memoryStore.notifications = new Map();

    memoryStore.employees.set('gm001', {
      id: 'gm001',
      name: '总经理',
      role: 'gm',
      department: '总经办',
      status: 'active',
    } as any);
    memoryStore.employees.set('hr001', {
      id: 'hr001',
      name: 'HR',
      role: 'hr',
      department: '人力行政部',
      status: 'active',
    } as any);
    memoryStore.employees.set('m001', {
      id: 'm001',
      name: '经理A',
      role: 'manager',
      department: '工程技术中心',
      subDepartment: '测试部',
      managerId: 'gm001',
      status: 'active',
    } as any);
    memoryStore.employees.set('e001', {
      id: 'e001',
      name: '员工A',
      role: 'employee',
      department: '工程技术中心',
      subDepartment: '测试部',
      managerId: 'm001',
      status: 'active',
    } as any);
    memoryStore.employees.set('e-no-manager', {
      id: 'e-no-manager',
      name: '无上级员工',
      role: 'employee',
      department: '工程技术中心',
      subDepartment: '测试部',
      status: 'active',
    } as any);
    memoryStore.employees.set('e-disabled', {
      id: 'e-disabled',
      name: '离职员工',
      role: 'employee',
      department: '工程技术中心',
      subDepartment: '测试部',
      managerId: 'm001',
      status: 'disabled',
    } as any);
  });

  it('reports total active archive employees separately from assessment-eligible employees', async () => {
    const snapshot = await ProgressMonitorService.getMonthProgress('2026-04');

    expect(snapshot.totalEmployees).toBe(5);
    expect(snapshot.eligibleEmployees).toBe(2);
  });
});
