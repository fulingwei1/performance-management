type RecordLike = Record<string, any>;

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
};

export const topTagEntries = (
  records: RecordLike[],
  field: string,
  limit = 6
): Array<[string, number]> => {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    toArray(record[field]).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
};

