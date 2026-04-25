const base = 'http://8.138.230.46/performance-management/api';
const secret = process.env.SMOKE_SECRET || '';
if (!secret) {
  console.error('SMOKE_SECRET is required');
  process.exit(2);
}
const users = ['admin','hr001','gm001','m011','e002'];
const endpoints = [
  ['GET','/auth/me'],
  ['GET','/dashboard/overview'],
  ['GET','/dashboard/my-progress'],
  ['GET','/dashboard/rankings'],
  ['GET','/dashboard/trends'],
  ['GET','/todos/summary'],
  ['GET','/employees'],
  ['GET','/organization/departments/tree'],
  ['GET','/assessment-templates?includeMetrics=true'],
  ['GET','/metrics/templates'],
  ['GET','/appeals'],
  ['GET','/peer-reviews/cycles'],
  ['GET','/interview-records/plans'],
];
async function req(path, opt={}) {
  const r = await fetch(base + path, { ...opt, headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  let body = null;
  try { body = await r.json(); } catch {}
  return { status: r.status, ok: r.ok, body };
}
(async () => {
  const out = [];
  for (const username of users) {
    const login = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username, password: secret }) });
    const token = login.body?.data?.token;
    const user = login.body?.data?.user || login.body?.data?.employee || {};
    out.push({ kind:'login', username, status:login.status, ok:!!token, role:user.role || null, err: login.body?.message || login.body?.error || null });
    if (!token) continue;
    for (const [method,path] of endpoints) {
      const res = await req(path, { method, headers: { Authorization: `Bearer ${token}` } });
      out.push({ kind:'api', as:username, role:user.role, method, path, status:res.status, ok:res.ok, err: res.ok ? null : (res.body?.message || res.body?.error || res.body?.code || null) });
    }
  }
  console.log(JSON.stringify(out, null, 2).replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]'));
})().catch(e => { console.error(e.message); process.exit(1); });
