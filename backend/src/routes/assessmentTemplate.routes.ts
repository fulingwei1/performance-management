import express from 'express';
import * as templateController from '../controllers/assessmentTemplate.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// 模板管理
router.get('/', templateController.getAllTemplates);
router.get('/default/:departmentType', templateController.getDefaultTemplate);
router.post('/', requireRole('hr', 'admin'), templateController.createTemplate);
router.put('/:id', requireRole('hr', 'admin'), templateController.updateTemplate);
router.delete('/:id', requireRole('hr', 'admin'), templateController.deleteTemplate);

// 指标管理
router.get('/:id/metrics', templateController.getTemplateMetrics);
router.post('/:id/metrics', requireRole('hr', 'admin'), templateController.addMetric);
router.put('/metrics/:metricId', requireRole('hr', 'admin'), templateController.updateMetric);
router.delete('/metrics/:metricId', requireRole('hr', 'admin'), templateController.deleteMetric);

// 评分标准
router.post('/metrics/:metricId/scoring-criteria', requireRole('hr', 'admin'), templateController.addScoringCriteria);

// 模板匹配（新增）
router.get('/match', templateController.matchTemplate);
router.post('/preview-assignments', requireRole('hr', 'admin'), templateController.previewTemplateAssignments);

router.get('/:id', templateController.getTemplateById);

export default router;
