import { Request, Response } from 'express';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';
import { asyncHandler } from '../middleware/errorHandler';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../config/logger';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

const formatScore = (score: number) => {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  return parseFloat(score.toFixed(2));
};

export const exportController = {
  exportMonthlyPerformance: [
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未认证'
        });
      }

      const { month, format = 'excel', includeAnalysis = 'true' } = req.query;
      
      if (!month || typeof month !== 'string') {
        return res.status(400).json({
          success: false,
          error: '请提供月份参数，格式：YYYY-MM'
        });
      }

      try {
        const records = await PerformanceModel.findByMonth(month);
        const employees = await EmployeeModel.findAll();
        
        const employeeMap = new Map<string, any>();
        employees.forEach((emp: any) => employeeMap.set(emp.id, emp));

        const exportData = records.map((record: any) => {
          const employee = employeeMap.get(record.employeeId);
          return {
            '员工ID': record.employeeId,
            '员工姓名': employee?.name || record.employeeName,
            '部门': employee?.department || '',
            '子部门': employee?.subDepartment || '',
            '职级': employee?.level || '',
            '角色': employee?.role || '',
            '月份': record.month,
            '状态': record.status === 'completed' ? '已完成' : 
                   record.status === 'scored' ? '已评分' :
                   record.status === 'submitted' ? '已提交' : '草稿',
            '自我总结': record.selfSummary || '',
            '下月计划': record.nextMonthPlan || '',
            '任务完成': formatScore(record.taskCompletion),
            '主动性': formatScore(record.initiative),
            '项目反馈': formatScore(record.projectFeedback),
            '质量改进': formatScore(record.qualityImprovement),
            '总分': formatScore(record.totalScore),
            '等级': record.level || '',
            '组内排名': record.groupRank || 0,
            '跨部门排名': record.crossDeptRank || 0,
            '经理评语': record.managerComment || '',
            '工作安排': record.nextMonthWorkArrangement || '',
            '创建时间': formatDate(record.createdAt),
            '更新时间': formatDate(record.updatedAt)
          };
        });

        if (format === 'excel') {
          const wb = XLSX.utils.book_new();
          
          const ws1 = XLSX.utils.json_to_sheet(exportData);
          XLSX.utils.book_append_sheet(wb, ws1, `${month}绩效数据`);

          if (includeAnalysis === 'true') {
            const deptStats = new Map<string, any[]>();
            exportData.forEach(item => {
              const dept = item['部门'];
              if (!deptStats.has(dept)) {
                deptStats.set(dept, []);
              }
              deptStats.get(dept)!.push(item);
            });

            const analysisData = Array.from(deptStats.entries()).map(([dept, records]) => {
              const scores = records.filter(r => r['总分'] > 0).map(r => r['总分']);
              return {
                '部门': dept,
                '总人数': records.length,
                '已评分人数': scores.length,
                '平均分': scores.length > 0 ? formatScore(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0,
                '最高分': scores.length > 0 ? Math.max(...scores) : 0,
                '最低分': scores.length > 0 ? Math.min(...scores) : 0,
                '优秀人数(>=1.2)': scores.filter(s => s >= 1.2).length,
                '良好人数(1.0-1.2)': scores.filter(s => s >= 1.0 && s < 1.2).length,
                '合格人数(0.8-1.0)': scores.filter(s => s >= 0.8 && s < 1.0).length,
                '待改进人数(<0.8)': scores.filter(s => s < 0.8).length,
                '完成率': `${((scores.length / records.length) * 100).toFixed(1)}%`
              };
            });

            const ws2 = XLSX.utils.json_to_sheet(analysisData);
            XLSX.utils.book_append_sheet(wb, ws2, `${month}分析报告`);
          }

          const fileName = `绩效数据导出_${month}.xlsx`;
          const filePath = path.join(__dirname, '../../temp', fileName);
          
          const tempDir = path.dirname(filePath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          XLSX.writeFile(wb, filePath);

          res.download(filePath, fileName, (err) => {
            if (err) {
              logger.error('下载文件失败:', err);
            }
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
        } else {
          res.json({
            success: true,
            data: {
              month,
              exportTime: new Date().toISOString(),
              totalRecords: exportData.length,
              data: exportData
            }
          });
        }
      } catch (error: any) {
        logger.error('导出绩效数据失败:', error);
        res.status(500).json({
          success: false,
          error: '导出失败: ' + error.message
        });
      }
    })
  ],

  exportAnnualPerformance: [
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未认证'
        });
      }

      const { year, format = 'excel' } = req.query;
      
      if (!year || typeof year !== 'string') {
        return res.status(400).json({
          success: false,
          error: '请提供年份参数，格式：YYYY'
        });
      }

      try {
        const allRecords = await PerformanceModel.findAll();
        const yearRecords = allRecords.filter((record: any) => 
          record.month.startsWith(year)
        );

        const employees = await EmployeeModel.findAll();
        const employeeMap = new Map<string, any>();
        employees.forEach((emp: any) => employeeMap.set(emp.id, emp));

        const employeeSummary = new Map<string, any>();
        
        yearRecords.forEach((record: any) => {
          const employee = employeeMap.get(record.employeeId);
          if (!employee) return;

          if (!employeeSummary.has(record.employeeId)) {
            employeeSummary.set(record.employeeId, {
              '员工ID': record.employeeId,
              '员工姓名': employee.name,
              '部门': employee.department,
              '子部门': employee.subDepartment,
              '职级': employee.level,
              '角色': employee.role,
              '年度': year,
              '月份列表': [],
              '总分列表': [],
              '平均分': 0,
              '最高分': 0,
              '最低分': 0,
              '评分次数': 0,
              '优秀次数': 0,
              '良好次数': 0,
              '合格次数': 0,
              '待改进次数': 0
            });
          }

          const summary = employeeSummary.get(record.employeeId);
          summary['月份列表'].push(record.month);
          
          if (record.totalScore > 0) {
            summary['总分列表'].push(record.totalScore);
            summary['评分次数']++;
            
            if (record.totalScore >= 1.2) summary['优秀次数']++;
            else if (record.totalScore >= 1.0) summary['良好次数']++;
            else if (record.totalScore >= 0.8) summary['合格次数']++;
            else summary['待改进次数']++;
          }
        });

        const finalData = Array.from(employeeSummary.values()).map(summary => {
          const scores = summary['总分列表'];
          if (scores.length > 0) {
            summary['平均分'] = formatScore(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
            summary['最高分'] = formatScore(Math.max(...scores));
            summary['最低分'] = formatScore(Math.min(...scores));
          }
          summary['完成率'] = `${((summary['评分次数'] / 12) * 100).toFixed(1)}%`;
          
          delete summary['总分列表'];
          return summary;
        });

        if (format === 'excel') {
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(finalData);
          XLSX.utils.book_append_sheet(wb, ws, `${year}年度绩效汇总`);
          
          const fileName = `年度绩效汇总_${year}.xlsx`;
          const filePath = path.join(__dirname, '../../temp', fileName);
          
          const tempDir = path.dirname(filePath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          XLSX.writeFile(wb, filePath);

          res.download(filePath, fileName, (err) => {
            if (err) {
              logger.error('下载文件失败:', err);
            }
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
        } else {
          res.json({
            success: true,
            data: {
              year,
              exportTime: new Date().toISOString(),
              totalEmployees: finalData.length,
              data: finalData
            }
          });
        }
      } catch (error: any) {
        logger.error('导出年度绩效失败:', error);
        res.status(500).json({
          success: false,
          error: '导出失败: ' + error.message
        });
      }
    })
  ],

  exportEmployees: [
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未认证'
        });
      }

      const { department, format = 'excel' } = req.query;

      try {
        let employees = await EmployeeModel.findAll();
        
        if (department && typeof department === 'string') {
          employees = employees.filter((emp: any) => emp.department === department);
        }

        const exportData = employees.map((emp: any) => ({
          '员工ID': emp.id,
          '姓名': emp.name,
          '部门': emp.department,
          '子部门': emp.subDepartment || '',
          '职级': emp.level,
          '角色': emp.role,
          '经理ID': emp.managerId || '',
          '入职日期': formatDate(emp.joinDate),
          '状态': emp.status || 'active',
          '工作状态': emp.workStatus || 'active',
          '职位': emp.position || '',
          '电话': emp.phone || '',
          '邮箱': emp.email || ''
        }));

        if (format === 'excel') {
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(exportData);
          XLSX.utils.book_append_sheet(wb, ws, `员工信息_${new Date().toLocaleDateString('zh-CN')}`);
          
          const fileName = `员工信息_${new Date().toISOString().split('T')[0]}.xlsx`;
          const filePath = path.join(__dirname, '../../temp', fileName);
          
          const tempDir = path.dirname(filePath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          XLSX.writeFile(wb, filePath);

          res.download(filePath, fileName, (err) => {
            if (err) {
              logger.error('下载文件失败:', err);
            }
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
        } else {
          res.json({
            success: true,
            data: {
              exportTime: new Date().toISOString(),
              totalRecords: exportData.length,
              data: exportData
            }
          });
        }
      } catch (error: any) {
        logger.error('导出员工信息失败:', error);
        res.status(500).json({
          success: false,
          error: '导出失败: ' + error.message
        });
      }
    })
  ]
};