import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { performanceController } from '../controllers/performance.controller';
import { authenticate, requireManagerCapability, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  submitSummaryValidation,
  submitScoreValidation,
  createRecordValidation,
  generateTasksValidation
} from '../validators/performance.validator';
import { insertDemoData, clearDemoData, hasDemoData } from '../scripts/generateDemoData';

const router = Router();

const interviewFormDir = path.join(__dirname, '../../uploads/interview-forms');
fs.mkdirSync(interviewFormDir, { recursive: true });
const allowedInterviewFormMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const interviewFormUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, interviewFormDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedInterviewFormMimeTypes.has(file.mimetype)) return cb(null, true);
    cb(new Error('只支持 PDF、Word、Excel、JPG、PNG 格式的面谈表'));
  },
});
const uploadInterviewFormMiddleware = (req: Request, res: Response, next: NextFunction) => {
  interviewFormUpload.single('file')(req, res, (error: unknown) => {
    if (!error) return next();
    const message = error instanceof Error ? error.message : '面谈表上传失败';
    return res.status(400).json({ success: false, message, error: message });
  });
};

// 获取当前用户的绩效记录（需要认证）
router.get('/my-records', authenticate, performanceController.getMyRecords);

// 获取当前用户某月的绩效记录（需要认证）
router.get('/my-record/:month', authenticate, performanceController.getMyRecordByMonth);

// 获取经理/兼任经理的评分记录（下属）
router.get('/team-records', authenticate, requireManagerCapability, performanceController.getTeamRecords);

  // 获取某月份的所有记录（经理、总经理或HR）
  router.get('/month/:month', authenticate, requireRole('gm', 'hr', 'admin'), performanceController.getRecordsByMonth);

  // 删除某月份的所有绩效记录（HR）
  router.delete('/month/:month', authenticate, requireRole('hr', 'admin'), performanceController.deleteRecordsByMonth);

  // 获取全公司所有记录（总经理或HR）支持 ?months=N 参数
  router.get('/all-records', authenticate, requireRole('gm', 'hr', 'admin'), performanceController.getAllRecords);

	  // 获取每月之星推荐汇总
	  router.get('/monthly-stars/:month', authenticate, requireRole('gm', 'hr', 'admin'), performanceController.getMonthlyStars);

		  // 获取员工合理化建议汇总：经理看管辖范围，HR/GM/Admin 可看全量，匿名建议不返回提交人
		  router.get('/improvement-suggestions', authenticate, requireRole('manager', 'gm', 'hr', 'admin'), performanceController.getImprovementSuggestions);

  // 删除全公司所有绩效记录（HR）
  router.delete('/all-records', authenticate, requireRole('hr', 'admin'), performanceController.deleteAllRecords);

// 参与考核人员提交工作总结：是否需要提交由“参与考核能力”统一判断，不再只按角色写死。
router.post('/summary', authenticate, validate(submitSummaryValidation), performanceController.submitSummary);

// 创建空记录（经理给未提交的员工评分时使用）
router.post('/create-empty-record', authenticate, requireManagerCapability, validate(createRecordValidation), performanceController.createEmptyRecord);

// 获取记录对应的评分模板（用于前端动态渲染评分表单）
router.get('/:id/template', authenticate, performanceController.getRecordTemplate);

// 经理评分（含 HR/管理员兼任经理视角）
router.post('/score', authenticate, requireManagerCapability, validate(submitScoreValidation), performanceController.submitScore);

// 2-7-1 末位人员绩效面谈表上传
router.post('/:id/interview-form', authenticate, uploadInterviewFormMiddleware, performanceController.uploadInterviewForm);

// HR批量生成绩效任务
router.post('/generate-tasks', authenticate, requireRole('hr'), validate(generateTasksValidation), performanceController.generateTasks);

  // 获取月度统计数据（用于导出）
  router.get('/stats/:month', authenticate, requireRole('hr', 'gm', 'admin'), performanceController.getStatsByMonth);

  // 演示数据管理（状态用于看板提示；生成/清除保留管理员权限）
  router.post('/demo-data/generate', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    if (await hasDemoData()) {
      return res.status(400).json({ success: false, message: '演示数据已存在，请先清除' });
    }
    const count = await insertDemoData();
    res.json({ success: true, message: `成功生成 ${count} 条演示数据`, count });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

  router.delete('/demo-data', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const count = await clearDemoData();
    res.json({ success: true, message: `成功清除 ${count} 条演示数据`, count });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/demo-data/status', authenticate, async (_req: Request, res: Response) => {
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
router.delete('/:id', authenticate, requireRole('hr', 'admin'), performanceController.deleteRecord);

export default router;
