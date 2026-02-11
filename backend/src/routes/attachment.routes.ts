import { Router } from 'express';
import { attachmentController, upload } from '../controllers/attachment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/upload', authenticate, upload.single('file'), attachmentController.upload);
router.get('/file/:filename', attachmentController.serveFile);
router.get('/:relatedType/:relatedId', authenticate, attachmentController.getByRelated);
router.delete('/:id', authenticate, attachmentController.delete);

export default router;
