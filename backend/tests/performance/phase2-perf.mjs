/**
 * Phase 2 Performance Test - Lightweight benchmark using native fetch
 * Tests: peer-review cycles, relationships, reviews, interview plans/records, statistics
 */

const BASE = 'http://localhost:3001/api';
const results = [];

async function bench(name, fn, { count = 100, concurrency = 10 } = {}) {
  const latencies = [];
  let errors = 0;
  let completed = 0;
  const start = Date.now();

  async function worker() {
    while (completed < count) {
      const idx = completed++;
      if (idx >= count) break;
      const t0 = Date.now();
      try {
        await fn(idx);
        latencies.push(Date.now() - t0);
      } catch (e) {
        errors++;
        latencies.push(Date.now() - t0);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, count) }, () => worker());
  await Promise.all(workers);
  const elapsed = Date.now() - start;

  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = ((count - errors) / elapsed) * 1000;

  const result = { name, count, concurrency, elapsed, rps: rps.toFixed(1), avg: avg.toFixed(1), p95, p99, errors };
  results.push(result);
  const status = errors === count ? '❌' : errors > 0 ? '⚠️' : '✅';
  console.log(`${status} ${name}: ${rps.toFixed(1)} req/s | avg=${avg.toFixed(1)}ms p95=${p95}ms p99=${p99}ms | errors=${errors}/${count} | ${elapsed}ms`);
  return result;
}

async function json(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts.headers } });
  return res.json();
}

// ---- Tests ----

console.log('\n🚀 Phase 2 Performance Tests\n' + '='.repeat(60));
console.log(`Time: ${new Date().toISOString()}\n`);

// 1. GET cycles list
await bench('GET /peer-reviews/cycles', () => fetch(`${BASE}/peer-reviews/cycles`), { count: 300, concurrency: 20 });

// 2. GET cycle by id
await bench('GET /peer-reviews/cycles/1', () => fetch(`${BASE}/peer-reviews/cycles/1`), { count: 300, concurrency: 20 });

// 3. POST create cycle
let cycleCounter = 0;
await bench('POST /peer-reviews/cycles', (i) => json(`${BASE}/peer-reviews/cycles`, {
  method: 'POST',
  body: JSON.stringify({
    name: `Perf Test Cycle ${Date.now()}-${i}`,
    start_date: '2026-04-01', end_date: '2026-06-30',
    review_type: 'peer', is_anonymous: false
  })
}), { count: 50, concurrency: 5 });

// 4. POST create relationships (batch)
await bench('POST /peer-reviews/relationships', (i) => json(`${BASE}/peer-reviews/relationships`, {
  method: 'POST',
  body: JSON.stringify({
    cycle_id: 1,
    relationships: [
      { reviewer_id: 1, reviewee_id: 2, relationship_type: 'peer' },
      { reviewer_id: 2, reviewee_id: 1, relationship_type: 'peer' }
    ]
  })
}), { count: 50, concurrency: 5 });

// 5. GET relationships
await bench('GET /peer-reviews/relationships/1', () => fetch(`${BASE}/peer-reviews/relationships/1`), { count: 300, concurrency: 20 });

// 6. POST submit review
await bench('POST /peer-reviews/reviews', (i) => json(`${BASE}/peer-reviews/reviews`, {
  method: 'POST',
  body: JSON.stringify({
    cycle_id: 1, reviewer_id: 1, reviewee_id: 2,
    scores: { communication: 4, teamwork: 5, technical: 4 },
    comments: `Performance review comment ${i}`, overall_score: 4.3
  })
}), { count: 100, concurrency: 10 });

// 7. GET reviews
await bench('GET /peer-reviews/reviews/1', () => fetch(`${BASE}/peer-reviews/reviews/1`), { count: 300, concurrency: 20 });

// 8. GET statistics
await bench('GET /peer-reviews/statistics/1', () => fetch(`${BASE}/peer-reviews/statistics/1`), { count: 200, concurrency: 10 });

// 9. POST interview plan
await bench('POST /interview-records/plans', (i) => json(`${BASE}/interview-records/plans`, {
  method: 'POST',
  body: JSON.stringify({
    title: `Perf Plan ${i}`, interview_type: 'quarterly',
    scheduled_date: '2026-04-15', scheduled_time: '14:00',
    duration_minutes: 60, manager_id: 1, employee_id: 2
  })
}), { count: 50, concurrency: 5 });

// 10. GET interview plans
await bench('GET /interview-records/plans', () => fetch(`${BASE}/interview-records/plans`), { count: 300, concurrency: 20 });

// 11. POST interview record
await bench('POST /interview-records/records', (i) => json(`${BASE}/interview-records/records`, {
  method: 'POST',
  body: JSON.stringify({
    plan_id: 1, manager_id: 1, employee_id: 2,
    interview_date: '2026-04-15', duration_minutes: 45,
    content: `Interview content ${i}`, summary: `Summary ${i}`,
    action_items: ['Item 1', 'Item 2']
  })
}), { count: 50, concurrency: 5 });

// 12. GET interview records
await bench('GET /interview-records/records', () => fetch(`${BASE}/interview-records/records`), { count: 300, concurrency: 20 });

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Summary\n');
console.log('| Test | RPS | Avg(ms) | P95(ms) | P99(ms) | Errors |');
console.log('|------|-----|---------|---------|---------|--------|');
for (const r of results) {
  console.log(`| ${r.name} | ${r.rps} | ${r.avg} | ${r.p95} | ${r.p99} | ${r.errors}/${r.count} |`);
}

// Write JSON results
const fs = await import('fs');
fs.writeFileSync('tests/performance/results.json', JSON.stringify(results, null, 2));
console.log('\n✅ Results saved to tests/performance/results.json');
