import { Router } from 'express';
import { metricLibraryController } from '../controllers/metricLibrary.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// 指标管理
router.get('/', authenticate, metricLibraryController.getAllMetrics);
router.get('/export', authenticate, requireRole('hr'), metricLibraryController.exportMetrics);
router.get('/:id', authenticate, metricLibraryController.getMetricById);
router.post('/', authenticate, requireRole('hr'), metricLibraryController.createMetric);
router.put('/:id', authenticate, requireRole('hr'), metricLibraryController.updateMetric);
router.delete('/:id', authenticate, requireRole('hr'), metricLibraryController.deleteMetric);
router.post('/import', authenticate, requireRole('hr'), metricLibraryController.importMetrics);
router.post('/initialize', authenticate, requireRole('hr'), metricLibraryController.initializeDefaultMetrics);

// 指标模板管理
router.get('/templates', authenticate, metricLibraryController.getAllTemplates);
router.get('/templates/position/:positionId', authenticate, metricLibraryController.getTemplateByPosition);
router.post('/templates', authenticate, requireRole('hr'), metricLibraryController.createTemplate);

export default router;
