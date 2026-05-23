import { Router } from 'express';
import { getEmployeeTemplate, importEmployees, importHrArchive } from '../controllers/dataImport.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const DATA_IMPORT_TIMEOUT_MS = 5 * 60 * 1000;

const extendUploadTimeout = (req: any, res: any, next: any) => {
  req.setTimeout?.(DATA_IMPORT_TIMEOUT_MS);
  res.setTimeout?.(DATA_IMPORT_TIMEOUT_MS);
  next();
};

router.get('/template/employees', authenticate, requireRole('hr', 'admin'), getEmployeeTemplate);
router.post('/employees', authenticate, requireRole('hr', 'admin'), extendUploadTimeout, ...importEmployees);
router.post('/hr-archive', authenticate, requireRole('hr', 'admin'), extendUploadTimeout, ...importHrArchive);

export default router;
