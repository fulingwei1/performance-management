import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getOrganizationDepartments, getOrganizationTree } from '../controllers/organization.controller';

const router = Router();

router.get('/', authenticate, getOrganizationDepartments);
router.get('/tree', authenticate, getOrganizationTree);
router.get('/departments', authenticate, getOrganizationDepartments);

export default router;
