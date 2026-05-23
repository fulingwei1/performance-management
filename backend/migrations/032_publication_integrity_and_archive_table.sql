-- 发布流程完整性：防止同月重复发布，并补齐归档表。

-- 旧数据如存在重复发布记录，只保留最新一条，避免唯一索引创建失败。
DELETE FROM monthly_assessment_publications older
USING monthly_assessment_publications newer
WHERE older.month = newer.month
  AND older.id <> newer.id
  AND COALESCE(older.published_at, older.created_at, TIMESTAMP '1970-01-01')
      < COALESCE(newer.published_at, newer.created_at, TIMESTAMP '1970-01-01');

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_assessment_publications_month_unique
  ON monthly_assessment_publications(month);

CREATE TABLE IF NOT EXISTS performance_archives (
  id VARCHAR(50) PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  archive_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  archived_by VARCHAR(50),
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_performance_archives_month ON performance_archives(month);
CREATE INDEX IF NOT EXISTS idx_performance_archives_archived_at ON performance_archives(archived_at DESC);
