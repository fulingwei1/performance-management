import express from 'express';
import {
  getPublicSettings,
  getAllSettings,
  getSettingsByCategory,
  getSetting,
  updateSetting,
  updateSettings,
  createSetting,
  deleteSetting,
  get360ReviewConfig
} from '../controllers/systemSettings.controller';

const router = express.Router();

// 公开接口（所有登录用户可访问）
router.get('/public', getPublicSettings);
router.get('/360-review-config', get360ReviewConfig);

// 管理员接口（需要 HR/Admin 权限）
router.get('/', getAllSettings);
router.get('/category/:category', getSettingsByCategory);
router.get('/:key', getSetting);
router.put('/:key', updateSetting);
router.post('/batch', updateSettings);
router.post('/', createSetting);
router.delete('/:key', deleteSetting);

export default router;
