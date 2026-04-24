import express from 'express';
import * as statsController from '../controllers/assessmentStats.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(authenticate, requireRole('manager', 'gm', 'hr', 'admin'));

// 部门类型统计
router.get('/department-types', statsController.getDepartmentStats);

// 员工绩效趋势
router.get('/employee-trend/:employeeId', statsController.getEmployeeTrend);

// 评分分布
router.get('/score-distribution', statsController.getScoreDistribution);

export default router;
