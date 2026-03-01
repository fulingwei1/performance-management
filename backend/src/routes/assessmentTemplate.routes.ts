import express from 'express';
import * as templateController from '../controllers/assessmentTemplate.controller';

const router = express.Router();

// 模板管理
router.get('/', templateController.getAllTemplates);
router.get('/:id', templateController.getTemplateById);
router.get('/default/:departmentType', templateController.getDefaultTemplate);
router.post('/', templateController.createTemplate);
router.put('/:id', templateController.updateTemplate);
router.delete('/:id', templateController.deleteTemplate);

// 指标管理
router.get('/:id/metrics', templateController.getTemplateMetrics);
router.post('/:id/metrics', templateController.addMetric);
router.put('/metrics/:metricId', templateController.updateMetric);
router.delete('/metrics/:metricId', templateController.deleteMetric);

// 评分标准
router.post('/metrics/:metricId/scoring-criteria', templateController.addScoringCriteria);

export default router;
