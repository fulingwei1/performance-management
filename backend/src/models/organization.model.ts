import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { Department } from '../types';

const normalizeDepartmentName = (name: string | undefined): string => String(name || '').trim();

const departmentDedupeKey = (dept: Department): string => {
  const parentId = dept.parentId ? String(dept.parentId).trim() : '';
  return `${parentId}::${normalizeDepartmentName(dept.name)}`;
};

const compareDepartmentPriority = (left: Department, right: Department): number => {
  if (left.status !== right.status) {
    return left.status === 'active' ? -1 : 1;
  }
  const sortDiff = (left.sortOrder || 0) - (right.sortOrder || 0);
  if (sortDiff !== 0) return sortDiff;
  return String(left.createdAt || '').localeCompare(String(right.createdAt || ''));
};

export class OrganizationModel {
  static async findAllDepartments(): Promise<Department[]> {
    if (USE_MEMORY_DB) {
      return this.dedupeDepartments(Array.from(memoryStore.departments?.values() || []) as Department[]);
    }

    const rows = await query(`
      SELECT
        id,
        name,
        code,
        parent_id as "parentId",
        manager_id as "managerId",
        sort_order as "sortOrder",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM departments
      WHERE status = 'active'
      ORDER BY sort_order, name
    `);
    return this.dedupeDepartments(rows.map(this.formatDepartment));
  }

  private static dedupeDepartments(departments: Department[]): Department[] {
    const activeDepartments = departments
      .filter((dept) => !dept.status || dept.status === 'active')
      .map((dept) => ({ ...dept, name: normalizeDepartmentName(dept.name), children: undefined }));

    const chooseUnique = (items: Department[]): { unique: Department[]; alias: Map<string, string> } => {
      const grouped = new Map<string, Department[]>();
      for (const dept of items) {
        const key = departmentDedupeKey(dept);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(dept);
      }

      const unique: Department[] = [];
      const alias = new Map<string, string>();
      for (const group of grouped.values()) {
        const keeper = [...group].sort(compareDepartmentPriority)[0];
        unique.push(keeper);
        for (const dept of group) {
          if (dept.id !== keeper.id) alias.set(dept.id, keeper.id);
        }
      }
      return { unique, alias };
    };

    const firstPass = chooseUnique(activeDepartments);
    const canonicalized = activeDepartments.map((dept) => ({
      ...dept,
      parentId: dept.parentId && firstPass.alias.has(dept.parentId)
        ? firstPass.alias.get(dept.parentId)
        : dept.parentId,
    }));
    const secondPass = chooseUnique(canonicalized);

    return secondPass.unique.sort((a, b) => {
      const sortDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
      return sortDiff !== 0 ? sortDiff : a.name.localeCompare(b.name);
    });
  }

  private static formatDepartment(row: any): Department {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      parentId: row.parentId || row.parentid || row.parent_id,
      managerId: row.managerId || row.managerid || row.manager_id,
      managerName: row.managerName || row.managername || row.manager_name,
      sortOrder: row.sortOrder || row.sortorder || row.sort_order || 0,
      status: row.status,
      createdAt: row.createdAt || row.createdat || row.created_at,
      updatedAt: row.updatedAt || row.updatedat || row.updated_at,
    };
  }
}
