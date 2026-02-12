import { query, USE_MEMORY_DB, memoryDB } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'reminder' | 'approval' | 'system' | 'freeze';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  link?: string;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
}

export class NotificationModel {
  // 创建通知
  static async create(input: CreateNotificationInput): Promise<Notification> {
    const id = uuidv4();
    
    if (USE_MEMORY_DB) {
      const notification: Notification = {
        id,
        userId: input.userId,
        type: input.type,
        title: input.title,
        content: input.content,
        read: false,
        link: input.link,
        createdAt: new Date(),
      };
      (memoryDB as any).notifications = (memoryDB as any).notifications || [];
      (memoryDB as any).notifications.push(notification);
      return notification;
    }

    const sql = `
      INSERT INTO notifications (id, user_id, type, title, content, link)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id as "userId", type, title, content, read, link, created_at as "createdAt"
    `;
    
    const results = await query(sql, [
      id,
      input.userId,
      input.type,
      input.title,
      input.content,
      input.link || null,
    ]);
    
    return results[0] as Notification;
  }

  // 批量创建通知
  static async createBatch(inputs: CreateNotificationInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    if (USE_MEMORY_DB) {
      (memoryDB as any).notifications = (memoryDB as any).notifications || [];
      for (const input of inputs) {
        const notification: Notification = {
          id: uuidv4(),
          userId: input.userId,
          type: input.type,
          title: input.title,
          content: input.content,
          read: false,
          link: input.link,
          createdAt: new Date(),
        };
        (memoryDB as any).notifications.push(notification);
      }
      return inputs.length;
    }

    const values = inputs.map((input) => {
      const id = uuidv4();
      return `('${id}', '${input.userId}', '${input.type}', '${input.title.replace(/'/g, "''")}', '${input.content.replace(/'/g, "''")}', ${input.link ? `'${input.link}'` : 'NULL'})`;
    }).join(',');

    const sql = `
      INSERT INTO notifications (id, user_id, type, title, content, link)
      VALUES ${values}
    `;
    
    await query(sql, []);
    return inputs.length;
  }

  // 获取用户通知列表
  static async findByUserId(userId: string, readStatus?: boolean): Promise<Notification[]> {
    if (USE_MEMORY_DB) {
      (memoryDB as any).notifications = (memoryDB as any).notifications || [];
      let filtered = (memoryDB as any).notifications.filter(n => n.userId === userId);
      if (readStatus !== undefined) {
        filtered = filtered.filter(n => n.read === readStatus);
      }
      return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    let sql = `
      SELECT 
        id, user_id as "userId", type, title, content, read, link, created_at as "createdAt"
      FROM notifications
      WHERE user_id = $1
    `;
    
    const params: any[] = [userId];
    
    if (readStatus !== undefined) {
      sql += ` AND read = $2`;
      params.push(readStatus);
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    const results = await query(sql, params);
    return results as Notification[];
  }

  // 获取未读数量
  static async getUnreadCount(userId: string): Promise<number> {
    if (USE_MEMORY_DB) {
      (memoryDB as any).notifications = (memoryDB as any).notifications || [];
      return (memoryDB as any).notifications.filter(n => n.userId === userId && !n.read).length;
    }

    const sql = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND read = false
    `;
    
    const results = await query(sql, [userId]);
    return parseInt((results[0] as any).count, 10);
  }

  // 标记为已读
  static async markAsRead(id: string, userId: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      (memoryDB as any).notifications = (memoryDB as any).notifications || [];
      const notification = (memoryDB as any).notifications.find(n => n.id === id && n.userId === userId);
      if (notification) {
        notification.read = true;
        return true;
      }
      return false;
    }

    const sql = `
      UPDATE notifications
      SET read = true
      WHERE id = $1 AND user_id = $2
    `;
    
    await query(sql, [id, userId]);
    return true;
  }

  // 全部标记为已读
  static async markAllAsRead(userId: string): Promise<number> {
    if (USE_MEMORY_DB) {
      (memoryDB as any).notifications = (memoryDB as any).notifications || [];
      let count = 0;
      for (const notification of (memoryDB as any).notifications) {
        if (notification.userId === userId && !notification.read) {
          notification.read = true;
          count++;
        }
      }
      return count;
    }

    const sql = `
      UPDATE notifications
      SET read = true
      WHERE user_id = $1 AND read = false
    `;
    
    const result = await query(sql, [userId]);
    return (result as any).rowCount || 0;
  }

  // 根据ID查找通知
  static async findById(id: string): Promise<Notification | null> {
    if (USE_MEMORY_DB) {
      (memoryDB as any).notifications = (memoryDB as any).notifications || [];
      return (memoryDB as any).notifications.find(n => n.id === id) || null;
    }

    const sql = `
      SELECT 
        id, user_id as "userId", type, title, content, read, link, created_at as "createdAt"
      FROM notifications
      WHERE id = $1
    `;
    
    const results = await query(sql, [id]);
    return results.length > 0 ? (results[0] as Notification) : null;
  }

  // 删除旧通知（超过30天）
  static async deleteOldNotifications(days: number = 30): Promise<number> {
    if (USE_MEMORY_DB) {
      (memoryDB as any).notifications = (memoryDB as any).notifications || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const beforeCount = (memoryDB as any).notifications.length;
      (memoryDB as any).notifications = (memoryDB as any).notifications.filter(
        n => n.createdAt > cutoffDate
      );
      return beforeCount - (memoryDB as any).notifications.length;
    }

    const sql = `
      DELETE FROM notifications
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;
    
    const result = await query(sql, []);
    return (result as any).rowCount || 0;
  }
}
