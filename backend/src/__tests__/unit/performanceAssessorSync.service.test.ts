import { memoryStore } from '../../config/database';
import { EmployeeModel } from '../../models/employee.model';
import { syncPendingPerformanceAssessorsForEmployees } from '../../services/performanceAssessorSync.service';

describe('performanceAssessorSync service', () => {
  beforeEach(() => {
    memoryStore.employees = new Map();
    memoryStore.performanceRecords = new Map();
    memoryStore.todos = new Map();

    memoryStore.employees.set('m-old', {
      id: 'm-old',
      name: '旧上级',
      role: 'manager',
      status: 'active',
    } as any);
    memoryStore.employees.set('m-new', {
      id: 'm-new',
      name: '新上级',
      role: 'manager',
      status: 'active',
    } as any);
    memoryStore.employees.set('e001', {
      id: 'e001',
      name: '员工A',
      role: 'employee',
      department: '工程技术中心',
      subDepartment: '测试部',
      managerId: 'm-old',
      status: 'active',
    } as any);

    memoryStore.performanceRecords.set('rec-e001-2026-05', {
      id: 'rec-e001-2026-05',
      employeeId: 'e001',
      assessorId: 'm-old',
      month: '2026-05',
      status: 'submitted',
      frozen: false,
      groupType: 'low',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    memoryStore.performanceRecords.set('rec-e001-2026-04', {
      id: 'rec-e001-2026-04',
      employeeId: 'e001',
      assessorId: 'm-old',
      month: '2026-04',
      status: 'completed',
      frozen: false,
      groupType: 'low',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    memoryStore.todos!.set('todo-review-old', {
      id: 'todo-review-old',
      employeeId: 'm-old',
      type: 'performance_review',
      title: '评分员工A2026-05月绩效',
      status: 'pending',
      relatedId: 'performance-review-rec-e001-2026-05',
      createdAt: new Date(),
    });
  });

  it('syncs open performance records and review todos when employee manager changes', async () => {
    await EmployeeModel.update('e001', { managerId: 'm-new' } as any);

    expect(memoryStore.performanceRecords.get('rec-e001-2026-05')).toMatchObject({
      assessorId: 'm-new',
    });
    expect(memoryStore.todos!.get('todo-review-old')).toMatchObject({
      employeeId: 'm-new',
    });
    expect(memoryStore.performanceRecords.get('rec-e001-2026-04')).toMatchObject({
      assessorId: 'm-old',
    });
  });

  it('can sync a scoped employee set directly', async () => {
    memoryStore.employees.set('e001', {
      ...(memoryStore.employees.get('e001') as any),
      managerId: 'm-new',
    } as any);

    const result = await syncPendingPerformanceAssessorsForEmployees(['e001']);

    expect(result).toEqual({ updatedRecords: 1, movedTodos: 1 });
    expect(memoryStore.performanceRecords.get('rec-e001-2026-05')).toMatchObject({
      assessorId: 'm-new',
    });
  });
});
