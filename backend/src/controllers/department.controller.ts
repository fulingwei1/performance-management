import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../middleware/errorHandler';
import { memoryStore } from '../config/memory-db';
import { USE_MEMORY_DB } from '../config/database';
import { Department } from '../types';

function buildTree(departments: Department[]): Department[] {
  const map = new Map<string, Department>();
  departments.forEach(d => map.set(d.id, { ...d, children: [] }));

  const roots: Department[] = [];
  map.forEach(d => {
    if (d.parentId && map.has(d.parentId)) {
      map.get(d.parentId)!.children!.push(d);
    } else if (!d.parentId) {
      roots.push(d);
    } else {
      roots.push(d);
    }
  });

  return roots;
}

export const departmentController = {
  getTree: asyncHandler(async (_req: Request, res: Response) => {
    if (USE_MEMORY_DB) {
      const all = Array.from(memoryStore.departments.values());
      const tree = buildTree(all);
      return res.json({ success: true, data: tree });
    }
    res.json({ success: true, data: [] });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, parentId, managerId, code } = req.body;
    const id = uuidv4();
    const dept: Department = {
      id, name, code: code || '', parentId, managerId,
      sortOrder: memoryStore.departments.size,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (USE_MEMORY_DB) {
      memoryStore.departments.set(id, dept);
      return res.status(201).json({ success: true, data: dept });
    }
    res.status(201).json({ success: true, data: dept });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    if (USE_MEMORY_DB) {
      const existing = memoryStore.departments.get(id);
      if (!existing) return res.status(404).json({ success: false, message: '部门不存在' });
      const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
      memoryStore.departments.set(id, updated);
      return res.json({ success: true, data: updated });
    }
    res.status(404).json({ success: false, message: '部门不存在' });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    if (USE_MEMORY_DB) {
      const hasChildren = Array.from(memoryStore.departments.values()).some(d => d.parentId === id);
      if (hasChildren) return res.status(400).json({ success: false, message: '该部门有子部门，无法删除' });
      const hasEmployees = Array.from(memoryStore.employees.values()).some(e => e.department === id);
      if (hasEmployees) return res.status(400).json({ success: false, message: '该部门有员工，无法删除' });
      memoryStore.departments.delete(id);
      return res.json({ success: true, message: '删除成功' });
    }
    res.status(404).json({ success: false, message: '部门不存在' });
  }),

  getMembers: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    if (USE_MEMORY_DB) {
      const dept = memoryStore.departments.get(id);
      if (!dept) return res.status(404).json({ success: false, message: '部门不存在' });
      const members = Array.from(memoryStore.employees.values())
        .filter(e => e.department === dept.name || e.department === id);
      return res.json({ success: true, data: members });
    }
    res.json({ success: true, data: [] });
  }),

  setManager: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { managerId } = req.body;
    if (USE_MEMORY_DB) {
      const dept = memoryStore.departments.get(id);
      if (!dept) return res.status(404).json({ success: false, message: '部门不存在' });
      dept.managerId = managerId;
      const emp = memoryStore.employees.get(managerId);
      if (emp) dept.managerName = emp.name;
      dept.updatedAt = new Date().toISOString();
      memoryStore.departments.set(id, dept);
      return res.json({ success: true, data: dept });
    }
    res.status(404).json({ success: false, message: '部门不存在' });
  }),
};
