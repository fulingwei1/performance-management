import { Router } from 'express';
import { GoalProgressController } from '../controllers/goalProgress.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取目标进度列表（支持筛选）
router.get('/', GoalProgressController.getAll);

// 获取单个目标进度
router.get('/:id', GoalProgressController.getById);

// 获取特定目标的特定月份进度
router.get('/objective/:objectiveId/year/:year/month/:month', GoalProgressController.getByObjectiveAndMonth);

// 获取员工某月的所有目标进度
router.get('/employee/:employeeId/year/:year/month/:month', GoalProgressController.getEmployeeMonthlyProgress);

// 员工提交目标完成度
router.post('/submit', GoalProgressController.submitEmployeeProgress);

// 经理审核目标完成度
router.put('/:id/review', GoalProgressController.reviewProgress);

// 删除目标进度
router.delete('/:id', GoalProgressController.delete);

export default router;
