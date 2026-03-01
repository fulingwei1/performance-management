import express from 'express';
import * as exportController from '../controllers/assessmentExport.controller';

const router = express.Router();

// 导出月度评分记录
router.get('/monthly-assessments', exportController.exportMonthlyAssessments);

// 导出部门类型统计
router.get('/department-stats', exportController.exportDepartmentStats);

// 导出员工评分趋势
router.get('/score-trend/:employeeId', exportController.exportScoreTrend);

export default router;
