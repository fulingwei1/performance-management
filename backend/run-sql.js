const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'performance_db',
  user: 'postgres',
});

async function run() {
  const client = await pool.connect();
  
  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'scripts', 'update-templates-nons-standard.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Execute
    console.log('Executing SQL...');
    await client.query(sql);
    
    // Verify
    const templateCount = await client.query('SELECT COUNT(*) FROM assessment_templates');
    const metricCount = await client.query('SELECT COUNT(*) FROM metric_definitions');
    
    console.log(`\n✅ Templates: ${templateCount.rows[0].count}`);
    console.log(`✅ Metrics: ${metricCount.rows[0].count}`);
    
    // Show template breakdown
    const breakdown = await client.query(`
      SELECT department_type, COUNT(*) as cnt 
      FROM assessment_templates 
      GROUP BY department_type 
      ORDER BY department_type
    `);
    console.log('\nTemplate breakdown by department:');
    breakdown.rows.forEach(r => console.log(`  ${r.department_type}: ${r.cnt}`));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
