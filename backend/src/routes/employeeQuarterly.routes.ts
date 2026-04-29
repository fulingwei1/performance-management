import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { employeeQuarterlyController } from '../controllers/employeeQuarterly.controller';

const router = Router();

// 全部需要认证
router.use(authenticate);

// POST /api/employee-quarterly/generate — 生成季度汇总
router.post('/generate', employeeQuarterlyController.generate);

// GET /api/employee-quarterly/my — 查看自己的季度汇总
router.get('/my', employeeQuarterlyController.getMyQuarterly);

// GET /api/employee-quarterly/:year/:quarter — 查看某季度汇总
router.get('/:year/:quarter', employeeQuarterlyController.getByQuarter);

// GET /api/employee-quarterly/stats/:year/:quarter — 季度统计
router.get('/stats/:year/:quarter', employeeQuarterlyController.getStats);

export default router;
