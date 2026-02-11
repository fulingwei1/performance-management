CREATE TABLE IF NOT EXISTS peer_review_cycles (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255),
  year INTEGER,
  quarter INTEGER,
  start_date DATE,
  end_date DATE,
  participants TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS peer_review_tasks (
  id VARCHAR(36) PRIMARY KEY,
  cycle_id VARCHAR(36) REFERENCES peer_review_cycles(id),
  reviewer_id VARCHAR(36),
  reviewee_id VARCHAR(36),
  scores JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
