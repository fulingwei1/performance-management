import { memoryStore } from '../../config/database';
import { EmployeeModel } from '../../models/employee.model';

describe('EmployeeModel manager hierarchy', () => {
  beforeEach(() => {
    memoryStore.employees = new Map();
  });

  function addEmployee(employee: any) {
    memoryStore.employees.set(employee.id, {
      department: '工程技术中心',
      subDepartment: 'PLC 部',
      level: 'senior',
      status: 'active',
      ...employee,
    });
  }

  it('returns direct reports and indirect managed employees from manager_id tree', async () => {
    addEmployee({ id: 'gm001', name: '郑汝才', role: 'gm' });
    addEmployee({ id: 'm008', name: '王俊', role: 'manager', managerId: 'gm001' });
    addEmployee({ id: 'e124', name: '杨帮', role: 'manager', managerId: 'm008', subDepartment: 'PLC 部/PLC四组' });
    addEmployee({ id: 'e020', name: '黄亿豪', role: 'employee', managerId: 'e124', subDepartment: 'PLC 部/PLC四组' });
    addEmployee({ id: 'e110', name: '杜鹏', role: 'employee', managerId: 'e124', subDepartment: 'PLC 部/PLC四组' });
    addEmployee({ id: 'hr001', name: 'HR', role: 'hr', managerId: 'm008' });
    addEmployee({ id: 'e-disabled', name: '离职员工', role: 'employee', managerId: 'e124', status: 'disabled' });

    await expect(EmployeeModel.findDirectReportsForManager('m008')).resolves.toEqual([
      expect.objectContaining({ id: 'e124' }),
    ]);

    const wangScope = await EmployeeModel.findTeamForManager('m008');
    expect(wangScope.map((employee) => employee.id)).toEqual(['e124', 'e020', 'e110']);
    await expect(EmployeeModel.isInManagerTeam('m008', 'e020')).resolves.toBe(true);
    await expect(EmployeeModel.isInManagerTeam('gm001', 'e110')).resolves.toBe(true);
  });

  it('keeps department fallback when HR hierarchy has no direct reports yet', async () => {
    addEmployee({ id: 'e124', name: '杨帮', role: 'manager', subDepartment: 'PLC 部/PLC四组' });
    addEmployee({ id: 'e020', name: '黄亿豪', role: 'employee', managerId: 'm008', subDepartment: 'PLC 部/PLC四组' });
    addEmployee({ id: 'e110', name: '杜鹏', role: 'employee', managerId: 'm008', subDepartment: 'PLC 部/PLC四组' });
    addEmployee({ id: 'e-other', name: '其他组员', role: 'employee', managerId: 'm008', subDepartment: 'PLC 部/PLC三组' });

    const yangScope = await EmployeeModel.findTeamForManager('e124');

    expect(yangScope.map((employee) => employee.id)).toEqual(['e020', 'e110']);
  });
});
