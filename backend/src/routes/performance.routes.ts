import { Router, Request, Response } from 'express';
import { performanceController } from '../controllers/performance.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { insertDemoData, clearDemoData, hasDemoData } from '../scripts/generateDemoData';

const router = Router();

// 获取当前用户的绩效记录（需要认证）
router.get('/my-records', authenticate, performanceController.getMyRecords);

// 获取当前用户某月的绩效记录（需要认证）
router.get('/my-record/:month', authenticate, performanceController.getMyRecordByMonth);

// 获取经理的评分记录（下属）（需要经理权限）
router.get('/team-records', authenticate, requireRole('manager'), performanceController.getTeamRecords);

// 获取某月份的所有记录（经理、总经理或HR）
router.get('/month/:month', authenticate, requireRole('manager', 'gm', 'hr'), performanceController.getRecordsByMonth);

// 删除某月份的所有绩效记录（HR）
router.delete('/month/:month', authenticate, requireRole('hr'), performanceController.deleteRecordsByMonth);

// 获取全公司所有记录（总经理或HR）支持 ?months=N 参数
router.get('/all-records', authenticate, requireRole('gm', 'hr'), performanceController.getAllRecords);

// 删除全公司所有绩效记录（HR）
router.delete('/all-records', authenticate, requireRole('hr'), performanceController.deleteAllRecords);

// 员工提交工作总结（需要员工权限）
router.post('/summary', authenticate, requireRole('employee'), performanceController.submitSummary);

// 创建空记录（经理给未提交的员工评分时使用）
router.post('/create-empty-record', authenticate, requireRole('manager'), performanceController.createEmptyRecord);

// 经理评分（需要经理权限）
router.post('/score', authenticate, requireRole('manager'), performanceController.submitScore);

// HR批量生成绩效任务
router.post('/generate-tasks', authenticate, requireRole('hr'), performanceController.generateTasks);

// 获取月度统计数据（用于导出）
router.get('/stats/:month', authenticate, requireRole('hr', 'gm'), performanceController.getStatsByMonth);

// 模拟数据管理（经理/HR/GM权限）
router.post('/demo-data/generate', authenticate, requireRole('manager', 'hr', 'gm'), async (req: Request, res: Response) => {
  try {
    if (await hasDemoData()) {
      return res.status(400).json({ success: false, message: '模拟数据已存在，请先清除' });
    }
    const count = await insertDemoData();
    res.json({ success: true, message: `成功生成 ${count} 条模拟数据`, count });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/demo-data', authenticate, requireRole('manager', 'hr', 'gm'), async (req: Request, res: Response) => {
  try {
    const count = await clearDemoData();
    res.json({ success: true, message: `成功清除 ${count} 条模拟数据`, count });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/demo-data/status', authenticate, async (req: Request, res: Response) => {
  try {
    const exists = await hasDemoData();
    res.json({ success: true, hasDemoData: exists });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 根据ID获取记录（需要认证）- 注意：通配符路由必须放在最后
router.get('/:id', authenticate, performanceController.getRecordById);

// 删除记录（需要HR权限）- 注意：通配符路由必须放在最后
router.delete('/:id', authenticate, requireRole('hr'), performanceController.deleteRecord);

export default router;
