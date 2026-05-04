import { Router } from 'express';
import { PredictionController } from '../controllers/prediction.controller';

const router = Router();

// 销售数据相关路由
router.get('/sales-data', PredictionController.getSalesData);
router.get('/time-series/:interval', PredictionController.getTimeSeries);

// 毛利率预测相关路由
router.post('/predict', PredictionController.predictGrossMargin);
router.get('/models', PredictionController.getModels);
router.get('/models/active', PredictionController.getActiveModel);
router.get('/predictions/:modelId', PredictionController.getPredictions);
router.put('/predictions/:id/actual', PredictionController.updateActualMargin);
router.get('/models/:modelId/performance', PredictionController.getModelPerformance);

// 报告导出路由
router.get('/export', PredictionController.exportReport);

export default router;