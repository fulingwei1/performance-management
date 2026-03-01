import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

// GET /api/data-import/template/employees
export const getEmployeeTemplate = asyncHandler(async (req: Request, res: Response) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '绩效管理系统';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('员工信息');

  sheet.columns = [
    { header: '姓名*', key: 'name', width: 15 },
    { header: '拼音*', key: 'pinyin', width: 15 },
    { header: '身份证后4位', key: 'idLast4', width: 14 },
    { header: '部门*', key: 'department', width: 20 },
    { header: '岗位*', key: 'position', width: 20 },
    { header: '职级', key: 'level', width: 12 },
    { header: '角色*', key: 'role', width: 12 },
    { header: '手机号', key: 'phone', width: 15 },
    { header: '邮箱', key: 'email', width: 25 },
  ];

  sheet.addRow({
    name: '张三', pinyin: 'zhangsan', idLast4: '1234',
    department: '技术部', position: '高级工程师', level: 'senior',
    role: 'employee', phone: '13800138000', email: 'zhangsan@example.com',
  });

  (sheet as any).dataValidations.add('G2:G1000', {
    type: 'list',
    formulae: ['"employee,manager,hr,gm,admin"'],
    showErrorMessage: true, errorTitle: '角色错误',
    error: '请选择: employee, manager, hr, gm, admin',
  });

  (sheet as any).dataValidations.add('F2:F1000', {
    type: 'list',
    formulae: ['"senior,intermediate,junior,assistant"'],
    showErrorMessage: true, errorTitle: '职级错误',
    error: '请选择: senior, intermediate, junior, assistant',
  });

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF333333' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  const helpSheet = workbook.addWorksheet('填写说明');
  helpSheet.columns = [
    { header: '字段', key: 'field', width: 15 },
    { header: '是否必填', key: 'required', width: 10 },
    { header: '说明', key: 'desc', width: 50 },
  ];
  helpSheet.getRow(1).font = { bold: true };
  helpSheet.addRows([
    { field: '姓名', required: '是', desc: '员工真实姓名' },
    { field: '拼音', required: '是', desc: '姓名拼音，用作登录ID（如 zhangsan）' },
    { field: '身份证后4位', required: '否', desc: '用于初始密码生成' },
    { field: '部门', required: '是', desc: '所属部门名称' },
    { field: '岗位', required: '是', desc: '岗位名称' },
    { field: '职级', required: '否', desc: 'senior/intermediate/junior/assistant，默认 intermediate' },
    { field: '角色', required: '是', desc: 'employee/manager/hr/gm/admin' },
    { field: '手机号', required: '否', desc: '11位手机号' },
    { field: '邮箱', required: '否', desc: '邮箱地址' },
  ]);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

// POST /api/data-import/employees
export const importEmployees = [
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(file.path);
      const sheet = workbook.getWorksheet('员工信息') || workbook.getWorksheet(1);

      if (!sheet) {
        return res.status(400).json({ success: false, message: '无法读取工作表' });
      }

      const employees: any[] = [];
      const errors: any[] = [];
      const validRoles = ['employee', 'manager', 'hr', 'gm', 'admin'];
      const validLevels = ['senior', 'intermediate', 'junior', 'assistant'];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const getCellValue = (cell: ExcelJS.Cell): string => {
          const v = cell.value;
          if (v === null || v === undefined) return '';
          if (typeof v === 'object' && 'text' in v) return (v as any).text;
          return String(v).trim();
        };

        const data = {
          name: getCellValue(row.getCell(1)),
          pinyin: getCellValue(row.getCell(2)),
          idLast4: getCellValue(row.getCell(3)),
          department: getCellValue(row.getCell(4)),
          position: getCellValue(row.getCell(5)),
          level: getCellValue(row.getCell(6)) || 'intermediate',
          role: getCellValue(row.getCell(7)),
          phone: getCellValue(row.getCell(8)),
          email: getCellValue(row.getCell(9)),
        };

        if (!data.name && !data.pinyin) return;

        const rowErrors: string[] = [];
        if (!data.name) rowErrors.push('姓名为空');
        if (!data.pinyin) rowErrors.push('拼音为空');
        if (!data.department) rowErrors.push('部门为空');
        if (!data.position) rowErrors.push('岗位为空');
        if (!data.role) rowErrors.push('角色为空');
        if (data.role && !validRoles.includes(data.role)) rowErrors.push(`角色无效: ${data.role}`);
        if (data.level && !validLevels.includes(data.level)) rowErrors.push(`职级无效: ${data.level}`);
        if (data.phone && !/^1\d{10}$/.test(data.phone)) rowErrors.push('手机号格式错误');
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) rowErrors.push('邮箱格式错误');

        if (rowErrors.length > 0) {
          errors.push({ row: rowNumber, message: rowErrors.join('；'), data });
          return;
        }
        employees.push(data);
      });

      if (employees.length === 0 && errors.length === 0) {
        return res.status(400).json({ success: false, message: '文件中没有数据' });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: `发现 ${errors.length} 个错误`,
          errors,
          validCount: employees.length,
        });
      }

      const results: any[] = [];
      const createErrors: any[] = [];
      for (const emp of employees) {
        try {
          const password = emp.idLast4 ? `pm${emp.idLast4}` : `pm${emp.pinyin}123`;
          const id = emp.pinyin || uuidv4();
          const created = await EmployeeModel.create({
            id,
            name: emp.name,
            department: emp.department,
            subDepartment: emp.position,
            role: emp.role,
            level: emp.level,
            password,
          });
          results.push(created);
        } catch (err: any) {
          createErrors.push({ name: emp.name, message: err.message });
        }
      }

      res.json({
        success: true,
        message: `成功导入 ${results.length} 个员工${createErrors.length > 0 ? `，${createErrors.length} 个失败` : ''}`,
        data: { imported: results.length, failed: createErrors.length, errors: createErrors },
      });
    } finally {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }),
];
