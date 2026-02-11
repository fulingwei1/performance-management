CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(36) PRIMARY KEY,
  filename VARCHAR(255),
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  size INTEGER,
  related_type VARCHAR(50),
  related_id VARCHAR(36),
  uploaded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT NOW()
);
