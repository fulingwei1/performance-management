import { Router } from 'express';
import { getEmployeeTemplate, importEmployees, importHrArchive } from '../controllers/dataImport.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/template/employees', authenticate, requireRole('hr', 'admin'), getEmployeeTemplate);
router.post('/employees', authenticate, requireRole('hr', 'admin'), ...importEmployees);
router.post('/hr-archive', authenticate, requireRole('hr', 'admin'), ...importHrArchive);

export default router;
