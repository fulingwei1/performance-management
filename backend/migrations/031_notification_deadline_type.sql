-- 站内消息类型补齐：最后一天催办会写入 deadline 类型。
-- 旧库如果没有该枚举值，会导致定时催办失败。
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deadline';
