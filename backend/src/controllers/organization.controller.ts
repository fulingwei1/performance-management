import { Request, Response } from 'express';
import { OrganizationModel } from '../models/organization.model';
import { EmployeeModel } from '../models/employee.model';
import { Department, Position } from '../types';

// 生成唯一ID
const generateId = () => `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Transfer record interface
interface TransferRecord {
  id: string;
  employee_id: string;
  from_department: string;
  to_department: string;
  from_position: string;
  to_position: string;
  transfer_date: string;
  reason: string;
  created_by: string;
  created_at: string;
  employee_name?: string;
}

// In-memory transfer store
const transferStore: Map<string, TransferRecord> = new Map();

export const organizationController = {
  // ============ 部门管理 ============
  
  getDepartmentTree: async (_req: Request, res: Response) => {
    try {
      const departments = await OrganizationModel.getDepartmentTree();
      res.json({ success: true, data: departments });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  getAllDepartments: async (_req: Request, res: Response) => {
    try {
      const departments = await OrganizationModel.findAllDepartments();
      res.json({ success: true, data: departments });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  getDepartmentById: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const department = await OrganizationModel.findDepartmentById(id);
      if (!department) {
        return res.status(404).json({ success: false, message: '部门不存在' });
      }
      res.json({ success: true, data: department });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  createDepartment: async (req: Request, res: Response) => {
    try {
      const { name, code, parentId, managerId, sortOrder = 0 } = req.body;
      if (!name || !code) {
        return res.status(400).json({ success: false, message: '部门名称和编码不能为空' });
      }
      const department: Omit<Department, 'createdAt' | 'updatedAt'> = {
        id: generateId(), name, code, parentId, managerId, sortOrder, status: 'active'
      };
      const newDept = await OrganizationModel.createDepartment(department);
      res.status(201).json({ success: true, data: newDept });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  updateDepartment: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const department = await OrganizationModel.updateDepartment(id, req.body);
      if (!department) {
        return res.status(404).json({ success: false, message: '部门不存在' });
      }
      res.json({ success: true, data: department });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  deleteDepartment: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const success = await OrganizationModel.deleteDepartment(id);
      if (!success) {
        return res.status(404).json({ success: false, message: '部门不存在' });
      }
      res.json({ success: true, message: '部门已删除' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // ============ 岗位管理 ============
  
  getAllPositions: async (_req: Request, res: Response) => {
    try {
      const positions = await OrganizationModel.findAllPositions();
      res.json({ success: true, data: positions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  getPositionsByDepartment: async (req: Request, res: Response) => {
    try {
      const departmentId = req.params.departmentId as string;
      const positions = await OrganizationModel.findPositionsByDepartment(departmentId);
      res.json({ success: true, data: positions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  createPosition: async (req: Request, res: Response) => {
    try {
      const { name, code, departmentId, level, category, description, requirements } = req.body;
      if (!name || !code || !departmentId) {
        return res.status(400).json({ success: false, message: '岗位名称、编码和所属部门不能为空' });
      }
      const position: Omit<Position, 'createdAt' | 'updatedAt'> = {
        id: generateId(), name, code, departmentId,
        level: level || 'intermediate', category: category || 'technical',
        description, requirements, status: 'active'
      };
      const newPos = await OrganizationModel.createPosition(position);
      res.status(201).json({ success: true, data: newPos });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  updatePosition: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const position = await OrganizationModel.updatePosition(id, req.body);
      if (!position) {
        return res.status(404).json({ success: false, message: '岗位不存在' });
      }
      res.json({ success: true, data: position });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  deletePosition: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const success = await OrganizationModel.deletePosition(id);
      if (!success) {
        return res.status(404).json({ success: false, message: '岗位不存在' });
      }
      res.json({ success: true, message: '岗位已删除' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  // ============ 组织架构树（含员工） ============
  
  getOrgTree: async (_req: Request, res: Response) => {
    try {
      const departments = await OrganizationModel.getDepartmentTree();
      const positions = await OrganizationModel.findAllPositions();
      const allEmployees = await EmployeeModel.findAll();
      
      const buildTree = (depts: any[]): any[] => {
        return depts.map(dept => {
          const deptPositions = positions.filter(p => p.departmentId === dept.id);
          const deptEmployees = allEmployees.filter((e: any) => e.department === dept.name);
          return {
            ...dept,
            type: 'department',
            positions: deptPositions,
            employees: deptEmployees.map((emp: any) => ({
              id: emp.id, name: emp.name, type: 'employee',
              position: emp.position || emp.subDepartment || '',
              department: emp.department, managerId: emp.managerId, role: emp.role
            })),
            children: dept.children ? buildTree(dept.children) : []
          };
        });
      };
      
      let orgTree = buildTree(departments);
      
      // If no departments exist, build tree from employee data
      if (orgTree.length === 0 && allEmployees.length > 0) {
        const deptMap = new Map<string, any>();
        allEmployees.forEach((emp: any) => {
          const deptName = emp.department || '未分配';
          if (!deptMap.has(deptName)) {
            deptMap.set(deptName, {
              id: `dept-${deptName}`, name: deptName, type: 'department',
              employees: [], children: []
            });
          }
          deptMap.get(deptName).employees.push({
            id: emp.id, name: emp.name, type: 'employee',
            position: emp.position || emp.subDepartment || '',
            department: emp.department, role: emp.role, managerId: emp.managerId
          });
        });
        
        // Group sub-departments
        deptMap.forEach((dept) => {
          const subDepts = new Map<string, any>();
          dept.employees.forEach((emp: any) => {
            if (emp.position && emp.position !== dept.name) {
              if (!subDepts.has(emp.position)) {
                subDepts.set(emp.position, {
                  id: `subdept-${dept.name}-${emp.position}`,
                  name: emp.position, type: 'department',
                  parentName: dept.name, employees: [], children: []
                });
              }
              subDepts.get(emp.position).employees.push(emp);
            }
          });
          if (subDepts.size > 0) {
            dept.children = Array.from(subDepts.values());
            dept.employees = dept.employees.filter((emp: any) =>
              !emp.position || emp.position === dept.name || emp.role === 'manager'
            );
          }
        });
        
        orgTree = Array.from(deptMap.values());
      }
      
      res.json({ success: true, data: orgTree });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ 人员调动 ============
  
  transferEmployee: async (req: Request, res: Response) => {
    try {
      const { employeeId, toDepartment, toPosition, reason } = req.body;
      const userId = (req as any).userId || (req as any).user?.id || 'system';
      
      if (!employeeId || !toDepartment) {
        return res.status(400).json({ success: false, message: '员工ID和目标部门不能为空' });
      }
      
      const employee = await EmployeeModel.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ success: false, message: '员工不存在' });
      }
      
      const transferId = generateId();
      const now = new Date().toISOString();
      
      const record: TransferRecord = {
        id: transferId,
        employee_id: employeeId,
        from_department: employee.department || '',
        to_department: toDepartment,
        from_position: (employee as any).position || (employee as any).subDepartment || '',
        to_position: toPosition || '',
        transfer_date: now.split('T')[0],
        reason: reason || '',
        created_by: userId,
        created_at: now,
        employee_name: employee.name
      };
      
      transferStore.set(transferId, record);
      
      await EmployeeModel.update(employeeId, {
        department: toDepartment,
        ...(toPosition ? { position: toPosition } : {})
      } as any);
      
      res.json({ success: true, message: '调动成功', data: { id: transferId } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  getTransferHistory: async (req: Request, res: Response) => {
    try {
      const { employeeId, startDate, endDate } = req.query;
      let transfers = Array.from(transferStore.values());
      
      if (employeeId) transfers = transfers.filter(t => t.employee_id === employeeId);
      if (startDate) transfers = transfers.filter(t => t.transfer_date >= (startDate as string));
      if (endDate) transfers = transfers.filter(t => t.transfer_date <= (endDate as string));
      
      transfers.sort((a, b) => b.transfer_date.localeCompare(a.transfer_date));
      res.json({ success: true, data: transfers });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};
