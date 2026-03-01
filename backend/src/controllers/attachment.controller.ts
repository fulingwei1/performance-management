import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../middleware/errorHandler';
import { memoryStore } from '../config/memory-db';
import { USE_MEMORY_DB } from '../config/database';
import { Attachment } from '../types';

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const attachmentController = {
  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未上传文件' });
    }
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const { relatedType, relatedId } = req.body;
    const id = uuidv4();
    const attachment: Attachment = {
      id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      relatedType: relatedType || '',
      relatedId: relatedId || '',
      uploadedBy: req.user.userId,
      url: `/api/attachments/file/${req.file.filename}`,
      createdAt: new Date().toISOString(),
    };

    if (USE_MEMORY_DB) {
      memoryStore.attachments.set(id, attachment);
    }
    // TODO: PostgreSQL insert

    res.status(201).json({ success: true, data: attachment });
  }),

  getByRelated: asyncHandler(async (req: Request, res: Response) => {
    const relatedType = req.params.relatedType as string;
    const relatedId = req.params.relatedId as string;

    if (USE_MEMORY_DB) {
      const list = Array.from(memoryStore.attachments.values()).filter(
        a => a.relatedType === relatedType && a.relatedId === relatedId
      );
      return res.json({ success: true, data: list });
    }

    res.json({ success: true, data: [] });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    if (USE_MEMORY_DB) {
      const att = memoryStore.attachments.get(id);
      if (!att) return res.status(404).json({ success: false, message: '附件不存在' });
      // Delete file
      const filePath = path.join(uploadsDir, att.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      memoryStore.attachments.delete(id);
      return res.json({ success: true, message: '删除成功' });
    }

    res.status(404).json({ success: false, message: '附件不存在' });
  }),

  serveFile: (req: Request, res: Response) => {
    const filename = req.params.filename as string;
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }
    res.sendFile(filePath);
  },
};
