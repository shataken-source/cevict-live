import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const htmlPath = path.join(process.cwd(), 'cevict-probability-analyzer', 'index.html')

  let html: string
  try {
    html = fs.readFileSync(htmlPath, 'utf-8')
  } catch {
    return new Response(
      `<!DOCTYPE html><html><body style="background:#050a0f;color:#ef5350;font-family:monospace;padding:40px">
        <h2>✗ Analyzer not found</h2>
        <p>Expected: ${htmlPath}</p>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  const injection = `
  <script>
    window.__prognoDate = '${date}';
    window.__prognoApiBase = window.location.origin;
    document.addEventListener('DOMContentLoaded', function() {
      var di = document.getElementById('pickDate');
      if (di) di.value = '${date}';
    });
    async function loadPredictionsFromAPI(date) {
      var statusEl = document.createElement('div');
      statusEl.style.cssText = 'position:fixed;top:12px;right:12px;background:#0a1422;border:1px solid #29b6f644;color:#29b6f6;padding:8px 14px;border-radius:6px;font-family:monospace;font-size:12px;z-index:9999';
      statusEl.textContent = '⟳ Loading picks from API...';
      document.body.appendChild(statusEl);
      try {
        var url = window.__prognoApiBase + '/api/picks/today?date=' + date + '&limit=25';
        var res = await fetch(url);
        var data = await res.json();
        var picks = data.picks || data.results || (Array.isArray(data) ? data : []);
        if (!Array.isArray(picks)) picks = [];
        window.allPicks = picks;
        if (typeof renderPicksList === 'function') renderPicksList();
        statusEl.style.borderColor = '#00e67644';
        statusEl.style.color = '#00e676';
        statusEl.textContent = '✓ Loaded ' + picks.length + ' picks for ' + date;
        setTimeout(function(){ statusEl.remove(); }, 3000);
        return picks;
      } catch(e) {
        statusEl.style.borderColor = '#ef535044';
        statusEl.style.color = '#ef5350';
        statusEl.textContent = '✗ API failed — use file picker';
        setTimeout(function(){ statusEl.remove(); }, 4000);
        document.getElementById('jsonFileInput') && document.getElementById('jsonFileInput').click();
      }
    }
  </script>`

  html = html.replace('</head>', injection + '\n</head>')

  html = html.replace(
    /function loadPredictions\(\)\s*\{[\s\S]*?document\.getElementById\("jsonFileInput"\)\.click\(\);[\s\S]*?\}/,
    `function loadPredictions() {
      var date = (document.getElementById('pickDate') || {}).value || window.__prognoDate;
      if (date) { loadPredictionsFromAPI(date); } else { document.getElementById("jsonFileInput").click(); }
    }`
  )

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
