import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, USE_MEMORY_DB } from '../config/database';
import { cache } from '../config/cache';
import { syncDepartmentsFromEmployees } from '../config/local-schema';
import { syncWecomUserIdsForEmployees } from './wecomDirectory.service';

const JSZip = require('jszip');

const ACTIVE_ARCHIVE_STATUSES = new Set(['在职', '试用期', '实习期']);
const EMPTY_MARKERS = new Set(['', '/', '-', '—', '无', 'null', 'undefined']);

type WorksheetRow = Record<string, string>;

type ArchiveEmployee = {
  id: string;
  name: string;
  archiveStatus: string;
  status: 'active' | 'disabled';
  department: string;
  subDepartment: string;
  position: string;
  level: 'senior' | 'intermediate' | 'junior' | 'assistant';
  role: 'employee' | 'manager' | 'gm' | 'hr' | 'admin';
  managerName: string;
  idCardLast6: string;
};

type ExistingEmployee = {
  id: string;
  name: string;
  role: ArchiveEmployee['role'];
  manager_id?: string | null;
};

type OrgLevelValues = {
  department: string;
  secondDepartment: string;
  thirdDepartment: string;
};

const ORG_NAME_ALIASES: Record<string, string> = {
  海尔治县: '海尔治具',
};

const DEFAULT_ASSESSMENT_MANAGERS = [
  { keyword: '仓储部', managerName: '周念' },
  { keyword: '客服部', managerName: '王志红' },
  { keyword: '生产部', managerName: '高勇' },
] as const;

const THIRD_LEVEL_PARENT_OVERRIDES: Record<string, string> = {
  结构二组: '新能源技术部',
  海尔治具: '测试部',
};

function normalizeSubDepartmentPath(subDepartment: string): string {
  const normalized = normalizeText(subDepartment);
  if (!normalized) return '';

  const segments = normalized
    .split('/')
    .map((segment) => normalizeOrgValue(segment))
    .filter(Boolean);

  if (segments.length === 0) return '';

  if (segments.length === 1 && THIRD_LEVEL_PARENT_OVERRIDES[segments[0]]) {
    return `${THIRD_LEVEL_PARENT_OVERRIDES[segments[0]]}/${segments[0]}`;
  }

  if (segments.length >= 2) {
    let [secondDepartment, thirdDepartment] = segments;
    if (THIRD_LEVEL_PARENT_OVERRIDES[thirdDepartment] && !secondDepartment) {
      secondDepartment = THIRD_LEVEL_PARENT_OVERRIDES[thirdDepartment];
    }
    if (THIRD_LEVEL_PARENT_OVERRIDES[secondDepartment] && !thirdDepartment) {
      thirdDepartment = secondDepartment;
      secondDepartment = THIRD_LEVEL_PARENT_OVERRIDES[thirdDepartment];
    }
    return thirdDepartment ? `${secondDepartment}/${thirdDepartment}` : secondDepartment;
  }

  return segments[0];
}

function normalizeText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeOrgValue(value: unknown): string {
  const normalized = normalizeText(value);
  if (EMPTY_MARKERS.has(normalized)) return '';
  return ORG_NAME_ALIASES[normalized] || normalized;
}

function normalizeOrgLevels(row: WorksheetRow): OrgLevelValues {
  const department = normalizeOrgValue(row['一级部门']);
  let secondDepartment = normalizeOrgValue(row['二级部门']);
  let thirdDepartment = normalizeOrgValue(row['三级部门']);

  if (!thirdDepartment && secondDepartment && THIRD_LEVEL_PARENT_OVERRIDES[secondDepartment]) {
    thirdDepartment = secondDepartment;
    secondDepartment = THIRD_LEVEL_PARENT_OVERRIDES[secondDepartment];
  }

  if (thirdDepartment && !secondDepartment && THIRD_LEVEL_PARENT_OVERRIDES[thirdDepartment]) {
    secondDepartment = THIRD_LEVEL_PARENT_OVERRIDES[thirdDepartment];
  }

  if (secondDepartment === department) {
    secondDepartment = '';
  }

  if (thirdDepartment === secondDepartment || thirdDepartment === department) {
    thirdDepartment = '';
  }

  return {
    department,
    secondDepartment,
    thirdDepartment,
  };
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([\w:.-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(tag))) {
    attrs[match[1]] = decodeXml(match[2]);
  }
  return attrs;
}

function columnIndexFromCellRef(cellRef: string): number {
  const letters = (cellRef.match(/[A-Z]+/i)?.[0] || '').toUpperCase();
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return Math.max(index - 1, 0);
}

function collectTextNodes(xml: string): string {
  const values: string[] = [];
  const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let match: RegExpExecArray | null;
  while ((match = textPattern.exec(xml))) {
    values.push(decodeXml(match[1]));
  }
  return normalizeText(values.join(''));
}

function readCellValue(cellXml: string, attrs: Record<string, string>, sharedStrings: string[]): string {
  if (attrs.t === 'inlineStr') return collectTextNodes(cellXml);

  const valueMatch = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
  const rawValue = valueMatch ? decodeXml(valueMatch[1]) : '';
  if (attrs.t === 's') return sharedStrings[Number(rawValue)] || '';
  return normalizeText(rawValue);
}

function normalizeWorkbookTarget(target: string): string {
  return target.startsWith('/')
    ? target.slice(1)
    : path.posix.normalize(path.posix.join('xl', target));
}

async function readWorksheetRows(filePath: string, worksheetName: string): Promise<WorksheetRow[]> {
  const fileBuffer = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(fileBuffer);

  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !relsXml) throw new Error('无法读取工作簿结构');

  const relMap = new Map<string, string>();
  const relPattern = /<Relationship\b[^>]*>/g;
  let relMatch: RegExpExecArray | null;
  while ((relMatch = relPattern.exec(relsXml))) {
    const attrs = parseAttributes(relMatch[0]);
    if (attrs.Id && attrs.Target) relMap.set(attrs.Id, normalizeWorkbookTarget(attrs.Target));
  }

  let sheetPath = '';
  const sheetPattern = /<sheet\b[^>]*>/g;
  let sheetMatch: RegExpExecArray | null;
  while ((sheetMatch = sheetPattern.exec(workbookXml))) {
    const attrs = parseAttributes(sheetMatch[0]);
    const relId = attrs['r:id'];
    if (attrs.name === worksheetName && relId) {
      sheetPath = relMap.get(relId) || '';
      break;
    }
  }
  if (!sheetPath) throw new Error(`未找到工作表：${worksheetName}`);

  const sharedStrings: string[] = [];
  const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  if (sharedStringsXml) {
    const sharedStringPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let sharedMatch: RegExpExecArray | null;
    while ((sharedMatch = sharedStringPattern.exec(sharedStringsXml))) {
      sharedStrings.push(collectTextNodes(sharedMatch[1]));
    }
  }

  const sheetXml = await zip.file(sheetPath)?.async('string');
  if (!sheetXml) throw new Error(`无法读取工作表文件：${sheetPath}`);

  const sheetData = sheetXml.match(/<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>/)?.[1] || '';
  const matrix: string[][] = [];
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(sheetData))) {
    const rowValues: string[] = [];
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      const attrs = parseAttributes(cellMatch[1]);
      const cellIndex = columnIndexFromCellRef(attrs.r || '');
      rowValues[cellIndex] = readCellValue(cellMatch[2], attrs, sharedStrings);
    }
    matrix.push(rowValues.map((value) => value || ''));
  }

  const headers = (matrix[0] || []).map((header) => normalizeText(header).replace(/\s+/g, ''));
  return matrix.slice(1).map((row) => {
    const result: WorksheetRow = {};
    headers.forEach((header, index) => {
      if (header) result[header] = normalizeText(row[index]);
    });
    return result;
  });
}

function resolveLevel(levelText: string, position: string): ArchiveEmployee['level'] {
  const text = `${levelText} ${position}`;
  if (/高级|专家|总监|副总|常务副总|经理|主管/.test(text)) return 'senior';
  if (/中级/.test(text)) return 'intermediate';
  if (/助理|实习/.test(text)) return 'assistant';
  return 'junior';
}

function resolveRole(row: WorksheetRow, existing?: ExistingEmployee): ArchiveEmployee['role'] {
  const name = normalizeText(row['姓名']);
  const { department } = normalizeOrgLevels(row);
  const position = normalizeText(row['岗位']);

  if (name === '符凌维') return 'admin';
  if (name === '林作倩') return 'hr';
  if (existing && ['admin', 'hr', 'gm'].includes(existing.role)) return existing.role;
  if (name === '郑汝才') return 'gm';
  if (department === '人力行政部' && /人事|行政/.test(position) && !/保洁/.test(position)) return 'hr';
  if (/总经理|副总|常务副总|部门经理|经理|主管|主任|部长/.test(position)) return 'manager';
  return existing?.role === 'manager' ? 'manager' : 'employee';
}

function makeStableId(row: WorksheetRow, rowIndex: number): string {
  const name = normalizeText(row['姓名']);
  const idCard = normalizeText(row['身份证号']).toUpperCase();
  const seed = `${name}|${idCard || rowIndex}`;
  return `hr-${crypto.createHash('sha1').update(seed).digest('hex').slice(0, 12)}`;
}

function buildNameIndex(existingEmployees: ExistingEmployee[]): Map<string, ExistingEmployee> {
  const grouped = new Map<string, ExistingEmployee[]>();
  for (const employee of existingEmployees) {
    if (!employee.name) continue;
    const list = grouped.get(employee.name) || [];
    list.push(employee);
    grouped.set(employee.name, list);
  }

  const unique = new Map<string, ExistingEmployee>();
  for (const [name, list] of grouped) {
    if (list.length === 1) unique.set(name, list[0]);
  }
  return unique;
}

async function loadExistingEmployees(): Promise<ExistingEmployee[]> {
  if (USE_MEMORY_DB) return [];
  return await query('SELECT id, name, role, manager_id FROM employees');
}

function parseArchiveEmployees(rows: WorksheetRow[], existingEmployees: ExistingEmployee[]): ArchiveEmployee[] {
  const existingByName = buildNameIndex(existingEmployees);
  return rows
    .map((row, rowIndex): ArchiveEmployee | null => {
      const name = normalizeText(row['姓名']);
      if (!name) return null;

      const existing = existingByName.get(name);
      const archiveStatus = normalizeText(row['在职离职状态']);
      const idCard = normalizeText(row['身份证号']).toUpperCase();
      let { department, secondDepartment, thirdDepartment } = normalizeOrgLevels(row);
      const position = normalizeText(row['岗位']);
      const levelText = normalizeText(row['级别']);
      if (name === '符凌维') {
        department = '人力行政部';
        secondDepartment = '';
        thirdDepartment = '';
      }
      const subDepartment = normalizeSubDepartmentPath(
        thirdDepartment ? `${secondDepartment || department}/${thirdDepartment}` : secondDepartment
      );

      return {
        id: existing?.id || makeStableId(row, rowIndex + 2),
        name,
        archiveStatus,
        status: ACTIVE_ARCHIVE_STATUSES.has(archiveStatus) ? 'active' : 'disabled',
        department,
        subDepartment,
        position,
        level: resolveLevel(levelText, position),
        role: resolveRole(row, existing),
        managerName: normalizeText(row['直接上级']),
        idCardLast6: idCard.length >= 6 ? idCard.slice(-6) : '',
      };
    })
    .filter((employee): employee is ArchiveEmployee => Boolean(employee));
}

function resolveManagerIds(employees: ArchiveEmployee[], existingEmployees: ExistingEmployee[]): Map<string, string> {
  const activeByName = new Map<string, ArchiveEmployee>();
  for (const employee of employees) {
    if (employee.status === 'active') activeByName.set(employee.name, employee);
  }

  const existingByName = buildNameIndex(existingEmployees);
  const managerIds = new Map<string, string>();
  for (const employee of employees) {
    if (!employee.managerName) continue;
    const manager = activeByName.get(employee.managerName) || existingByName.get(employee.managerName);
    if (manager) managerIds.set(employee.id, manager.id);
  }

  const hrManager = activeByName.get('符凌维') || existingByName.get('符凌维');
  if (hrManager) {
    for (const employee of employees) {
      if (
        employee.status === 'active' &&
        employee.department === '人力行政部' &&
        employee.name !== '符凌维' &&
        !managerIds.has(employee.id)
      ) {
        managerIds.set(employee.id, hrManager.id);
      }
    }
  }

  for (const rule of DEFAULT_ASSESSMENT_MANAGERS) {
    const manager = activeByName.get(rule.managerName) || existingByName.get(rule.managerName);
    if (!manager) continue;

    for (const employee of employees) {
      const orgPath = `${employee.department}/${employee.subDepartment}`;
      if (
        employee.status === 'active' &&
        employee.name !== rule.managerName &&
        orgPath.includes(rule.keyword)
      ) {
        managerIds.set(employee.id, manager.id);
      }
    }
  }

  return managerIds;
}

async function upsertArchiveEmployees(employees: ArchiveEmployee[], managerIds: Map<string, string>) {
  for (const employee of employees) {
    const passwordHash = employee.idCardLast6
      ? await bcrypt.hash(employee.idCardLast6, 10)
      : null;
    const idCardLast6Hash = employee.idCardLast6
      ? await bcrypt.hash(employee.idCardLast6, 10)
      : null;
    const managerId = managerIds.get(employee.id) || null;

    await query(
      `INSERT INTO employees (
        id, name, department, sub_department, position, role, level,
        manager_id, password, id_card_last6_hash, status, must_change_password, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        department = EXCLUDED.department,
        sub_department = EXCLUDED.sub_department,
        position = EXCLUDED.position,
        role = EXCLUDED.role,
        level = EXCLUDED.level,
        manager_id = COALESCE(EXCLUDED.manager_id, employees.manager_id),
        password = CASE
          WHEN EXCLUDED.id_card_last6_hash IS NOT NULL THEN EXCLUDED.password
          ELSE employees.password
        END,
        id_card_last6_hash = COALESCE(EXCLUDED.id_card_last6_hash, employees.id_card_last6_hash),
        status = EXCLUDED.status,
        must_change_password = CASE
          WHEN EXCLUDED.id_card_last6_hash IS NOT NULL THEN FALSE
          ELSE employees.must_change_password
        END,
        updated_at = CURRENT_TIMESTAMP`,
      [
        employee.id,
        employee.name,
        employee.department,
        employee.subDepartment,
        employee.position,
        employee.role,
        employee.level,
        managerId,
        passwordHash,
        idCardLast6Hash,
        employee.status,
        !employee.idCardLast6,
      ]
    );
  }
}

async function disableEmployeesMissingFromArchive(importedIds: string[]) {
  if (importedIds.length === 0) return;
  await query(
    `UPDATE employees
     SET status = 'disabled', updated_at = CURRENT_TIMESTAMP
     WHERE role <> 'admin' AND id <> ALL($1::text[])`,
    [importedIds]
  );
}

async function normalizeEmployeeOrgPaths() {
  if (USE_MEMORY_DB) return;

  for (const [thirdDepartment, parentDepartment] of Object.entries(THIRD_LEVEL_PARENT_OVERRIDES)) {
    const normalizedThirdDepartment = normalizeOrgValue(thirdDepartment);
    const normalizedParentDepartment = normalizeOrgValue(parentDepartment);
    const legacyThirdDepartment = Object.entries(ORG_NAME_ALIASES)
      .find(([, alias]) => alias === normalizedThirdDepartment)?.[0];

    await query(
      `UPDATE employees
       SET sub_department = $1, updated_at = CURRENT_TIMESTAMP
       WHERE sub_department = $2`,
      [`${normalizedParentDepartment}/${normalizedThirdDepartment}`, normalizedThirdDepartment]
    );

    if (legacyThirdDepartment) {
      await query(
        `UPDATE employees
         SET sub_department = $1, updated_at = CURRENT_TIMESTAMP
         WHERE sub_department = $2 OR sub_department = $3`,
        [
          `${normalizedParentDepartment}/${normalizedThirdDepartment}`,
          `${normalizedParentDepartment}/${legacyThirdDepartment}`,
          legacyThirdDepartment,
        ]
      );
    }
  }
}

export async function importHrArchive(filePath: string) {
  const rows = await readWorksheetRows(filePath, '员工信息表');
  const existingEmployees = await loadExistingEmployees();
  const employees = parseArchiveEmployees(rows, existingEmployees);
  const managerIds = resolveManagerIds(employees, existingEmployees);
  const upsertOrder = [...employees].sort((left, right) => {
    if (left.status === right.status) return 0;
    return left.status === 'active' ? 1 : -1;
  });

  await upsertArchiveEmployees(upsertOrder, managerIds);
  await normalizeEmployeeOrgPaths();
  await disableEmployeesMissingFromArchive(employees.map((employee) => employee.id));
  await syncDepartmentsFromEmployees();
  const wecomSyncResult = await syncWecomUserIdsForEmployees(
    employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      status: employee.status,
    }))
  );
  cache.invalidateByPrefix('employee:');

  const activeEmployees = employees.filter((employee) => employee.status === 'active');
  const assessmentEligibleEmployees = activeEmployees.filter((employee) => (
    employee.role === 'employee' || employee.role === 'manager'
  ));
  const departmentCounts = assessmentEligibleEmployees.reduce<Record<string, number>>((acc, employee) => {
    const department = employee.department || '未分配部门';
    acc[department] = (acc[department] || 0) + 1;
    return acc;
  }, {});

  return {
    totalRows: rows.length,
    imported: employees.length,
    activeCount: assessmentEligibleEmployees.length,
    assessmentEligibleCount: assessmentEligibleEmployees.length,
    nonAssessmentRoleCount: 0,
    disabledCount: employees.length - activeEmployees.length,
    managerLinks: managerIds.size,
    wecomMappedCount: wecomSyncResult.updated,
    departmentCounts,
  };
}
