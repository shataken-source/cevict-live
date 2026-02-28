/**
 * Run daily-results cron for Feb 20-27 to grade predictions
 * Usage: node grade-week.cjs
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, 'apps', 'progno', '.env.local'), 'utf8');
const secretLine = envFile.split('\n').find(l => l.startsWith('CRON_SECRET='));
const SECRET = secretLine ? secretLine.split('=').slice(1).join('=').trim() : '';

const DATES = ['2026-02-20','2026-02-21','2026-02-22','2026-02-23','2026-02-24','2026-02-25','2026-02-26','2026-02-27'];
const PORT = 3008;

async function gradeDate(date) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api/cron/daily-results?date=' + date,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + SECRET },
      timeout: 120000,
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ error: 'Parse error', raw: data.substring(0, 200) });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

(async () => {
  console.log('Grading predictions for Feb 20-27...\n');
  const results = [];

  for (const date of DATES) {
    process.stdout.write(date + ': ');
    try {
      const r = await gradeDate(date);
      const s = r.summary || {};
      console.log(
        'total=' + (s.total || 0) +
        ' correct=' + (s.correct || 0) +
        ' pending=' + (s.pending || 0) +
        ' winRate=' + (s.winRate || 0) + '%' +
        ' gameOutcomes=' + (r.gameOutcomesStored || 0) +
        ' dbInserted=' + (r.dbInserted || 0)
      );
      results.push({ date, ...s, gameOutcomes: r.gameOutcomesStored, dbInserted: r.dbInserted });
    } catch (e) {
      console.log('ERROR: ' + e.message);
      results.push({ date, error: e.message });
    }
  }

  console.log('\n=== SUMMARY ===');
  let totalPicks = 0, totalCorrect = 0, totalGraded = 0, totalPending = 0;
  for (const r of results) {
    if (r.total) {
      totalPicks += r.total;
      totalCorrect += r.correct || 0;
      totalGraded += r.graded || 0;
      totalPending += r.pending || 0;
    }
  }
  console.log('Total picks: ' + totalPicks);
  console.log('Graded: ' + totalGraded);
  console.log('Correct: ' + totalCorrect);
  console.log('Pending: ' + totalPending);
  console.log('Win rate: ' + (totalGraded > 0 ? (totalCorrect / totalGraded * 100).toFixed(1) + '%' : 'N/A'));

  fs.writeFileSync(path.join(__dirname, 'apps', 'progno', 'grading-results.json'), JSON.stringify(results, null, 2));
  console.log('\nWritten to apps/progno/grading-results.json');
})();
