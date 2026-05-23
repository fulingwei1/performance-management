import { Request, Response } from 'express';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';

function normalizeSegment(value: unknown): string {
  const text = String(value || '').trim();
  return text && text !== '-' && text !== '/' ? text : '';
}

function isActiveEmployee(employee: any): boolean {
  return !employee.status || employee.status === 'active';
}

function getDepartmentType(name: string): string {
  const text = String(name || '').toLowerCase();
  if (text.includes('营销') || text.includes('销售')) return 'sales';
  if (text.includes('项目管理')) return 'engineering';
  if (text.includes('工程') || text.includes('技术') || text.includes('研发')) return 'engineering';
  if (text.includes('制造') || text.includes('生产') || text.includes('品质') || text.includes('装配')) return 'manufacturing';
  if (text.includes('财务') || text.includes('人力') || text.includes('行政') || text.includes('采购')) return 'support';
  if (text.includes('总') || text.includes('管理')) return 'management';
  return 'support';
}

type OrgNode = {
  id: string;
  key: string;
  name: string;
  level: number;
  parentId: string | null;
  departmentType: string;
  employeeCount: number;
  employees: Array<{
    id: string;
    name: string;
    role: string;
    position?: string;
    managerId?: string;
    status?: string;
  }>;
  children: OrgNode[];
};

function createNode(key: string, name: string, level: number, parentId: string | null): OrgNode {
  return {
    id: key,
    key,
    name,
    level,
    parentId,
    departmentType: getDepartmentType(name),
    employeeCount: 0,
    employees: [],
    children: [],
  };
}

function ensureChild(parent: OrgNode, name: string, level: number): OrgNode {
  const key = parent.key ? `${parent.key}/${name}` : name;
  let child = parent.children.find((node) => node.name === name);
  if (!child) {
    child = createNode(key, name, level, parent.key || null);
    parent.children.push(child);
  }
  return child;
}

function sortTree(node: OrgNode): OrgNode {
  node.children.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  node.children = node.children.map(sortTree);
  node.employees.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  node.employeeCount = node.employees.length + node.children.reduce((sum, child) => sum + child.employeeCount, 0);
  return node;
}

async function buildOrgTree(includeDisabled = false): Promise<OrgNode[]> {
  const employees = (await EmployeeModel.findAll() as any[])
    .filter((employee) => includeDisabled || isActiveEmployee(employee));

  const roots: OrgNode[] = [];
  const getRoot = (name: string): OrgNode => {
    let root = roots.find((node) => node.name === name);
    if (!root) {
      root = createNode(name, name, 1, null);
      roots.push(root);
    }
    return root;
  };

  for (const employee of employees) {
    const department = normalizeSegment(employee.department) || '未分配部门';
    const subDepartment = normalizeSegment(employee.subDepartment || employee.sub_department);
    let node = getRoot(department);

    if (subDepartment) {
      const parts = subDepartment.split('/').map(normalizeSegment).filter(Boolean);
      for (const part of parts) {
        node = ensureChild(node, part, node.level + 1);
      }
    }

    node.employees.push({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      position: employee.position,
      managerId: employee.managerId,
      status: employee.status || 'active',
    });
  }

  return roots.map(sortTree).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

function flattenTree(nodes: OrgNode[]): Array<Omit<OrgNode, 'children' | 'employees'> & { path: string }> {
  const rows: Array<Omit<OrgNode, 'children' | 'employees'> & { path: string }> = [];
  const visit = (node: OrgNode) => {
    const { children, employees, ...rest } = node;
    rows.push({ ...rest, path: node.key });
    children.forEach(visit);
  };
  nodes.forEach(visit);
  return rows;
}

export const getOrganizationTree = asyncHandler(async (req: Request, res: Response) => {
  const includeDisabled = req.query.includeDisabled === 'true' && ['hr', 'gm', 'admin'].includes(req.user?.role || '');
  const tree = await buildOrgTree(includeDisabled);
  res.json({ success: true, data: tree });
});

export const getOrganizationDepartments = asyncHandler(async (req: Request, res: Response) => {
  const includeDisabled = req.query.includeDisabled === 'true' && ['hr', 'gm', 'admin'].includes(req.user?.role || '');
  const tree = await buildOrgTree(includeDisabled);
  res.json({ success: true, data: flattenTree(tree) });
});
