import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  strategicObjectiveController,
  objectiveController,
  krController,
  kpiController,
  contractController,
  monthlyReportController,
  interviewController,
  assignmentController,
  relatedOkrController,
  feedbackController,
} from '../controllers/okr.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ Strategic Objectives ============
router.get('/strategic-objectives', strategicObjectiveController.getAll);
router.post('/strategic-objectives', requireRole('hr', 'gm'), strategicObjectiveController.create);
router.put('/strategic-objectives/:id', requireRole('hr', 'gm'), strategicObjectiveController.update);
router.delete('/strategic-objectives/:id', requireRole('hr', 'gm'), strategicObjectiveController.delete);

// ============ Objectives ============
router.get('/objectives', objectiveController.getAll);
router.get('/objectives/my', objectiveController.getMy);
router.get('/objectives/tree', objectiveController.getTree);
router.get('/objectives/related', relatedOkrController.getRelated);
router.post('/objectives', objectiveController.create);
router.put('/objectives/:id', objectiveController.update);
router.delete('/objectives/:id', objectiveController.delete);
router.get('/objectives/:id/krs', objectiveController.getKRs);
router.post('/objectives/:id/krs', objectiveController.createKR);
router.post('/objectives/:id/assign', requireRole('manager', 'gm'), assignmentController.assign);
router.get('/objectives/:id/feedbacks', feedbackController.getByObjective);

// ============ OKR Assignments ============
router.get('/assignments/my', assignmentController.getMy);
router.put('/assignments/:id/complete', assignmentController.complete);

// ============ Key Results (standalone) ============
router.put('/krs/:id', krController.update);
router.delete('/krs/:id', krController.delete);

// ============ KPI Assignments ============
router.get('/kpis/my', kpiController.getMy);
router.get('/kpis/employee/:employeeId', kpiController.getByEmployee);
router.get('/kpis/department/:department', kpiController.getByDepartment);
router.post('/kpis', requireRole('manager', 'hr', 'gm'), kpiController.create);
router.put('/kpis/:id/actual', kpiController.updateActual);
router.delete('/kpis/:id', requireRole('manager', 'hr', 'gm'), kpiController.delete);

// ============ Performance Contracts ============
router.get('/contracts/my', contractController.getMy);
router.get('/contracts', requireRole('hr', 'gm', 'manager'), contractController.getAll);
router.get('/contracts/:id', contractController.getById);
router.post('/contracts', requireRole('manager', 'hr'), contractController.create);
router.post('/contracts/:id/sign', contractController.sign);
router.post('/contracts/:id/approve', requireRole('hr', 'gm'), contractController.approve);

// ============ Monthly Reports ============
router.get('/monthly-reports/my', monthlyReportController.getMy);
router.get('/monthly-reports/employee/:employeeId', monthlyReportController.getByEmployee);
router.get('/monthly-reports/team', requireRole('manager', 'gm'), monthlyReportController.getTeam);
router.post('/monthly-reports', monthlyReportController.create);
router.post('/monthly-reports/:id/review', requireRole('manager', 'gm'), monthlyReportController.review);

// ============ Performance Interviews ============
router.get('/interviews/my', interviewController.getMy);
router.get('/interviews/team', requireRole('manager', 'gm'), interviewController.getTeam);
router.post('/interviews', requireRole('manager', 'gm'), interviewController.create);
router.put('/interviews/:id', interviewController.update);

export default router;
