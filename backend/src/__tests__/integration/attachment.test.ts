import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('Attachment API', () => {
  let hrToken: string;
  let employeeToken: string;
  let uploadedAttachmentId: string;

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
    employeeToken = await TestHelper.getAuthToken('employee');
  });

  describe('POST /api/attachments/upload', () => {
    it('should upload a file successfully', async () => {
      // Create a temp file
      const tmpFile = path.join(__dirname, 'test-upload.txt');
      fs.writeFileSync(tmpFile, 'test file content');

      const res = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${hrToken}`)
        .field('relatedType', 'objective')
        .field('relatedId', 'obj-001')
        .attach('file', tmpFile);

      fs.unlinkSync(tmpFile);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('originalName', 'test-upload.txt');
      expect(res.body.data.relatedType).toBe('objective');
      expect(res.body.data.relatedId).toBe('obj-001');
      uploadedAttachmentId = res.body.data.id;
    });

    it('should reject upload without authentication', async () => {
      const tmpFile = path.join(__dirname, 'test-upload2.txt');
      fs.writeFileSync(tmpFile, 'test');

      const res = await request(app)
        .post('/api/attachments/upload')
        .attach('file', tmpFile);

      fs.unlinkSync(tmpFile);
      expect(res.status).toBe(401);
    });

    it('should reject upload without file', async () => {
      const res = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${hrToken}`)
        .field('relatedType', 'objective')
        .field('relatedId', 'obj-001');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/attachments/:relatedType/:relatedId', () => {
    it('should return attachments for a related entity', async () => {
      const res = await request(app)
        .get('/api/attachments/objective/obj-001')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].relatedType).toBe('objective');
    });

    it('should return empty array for non-existent related entity', async () => {
      const res = await request(app)
        .get('/api/attachments/objective/non-existent')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('DELETE /api/attachments/:id', () => {
    it('should delete an attachment', async () => {
      const res = await request(app)
        .delete(`/api/attachments/${uploadedAttachmentId}`)
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent attachment', async () => {
      const res = await request(app)
        .delete('/api/attachments/non-existent-id')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(404);
    });
  });
});
