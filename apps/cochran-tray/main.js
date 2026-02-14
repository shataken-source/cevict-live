/**
 * Cochran AI system tray app
 * - Icon: green/normal when Cochran is running, red-X when not
 * - Right-click: Turn on/off, Start task, Create task, Ask Cochran, What's wrong?, Exit
 */

const { app, Tray, Menu, nativeImage, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const COCHRAN_PORT = process.env.LOCAL_AGENT_PORT || 3847;
const COCHRAN_URL = `http://localhost:${COCHRAN_PORT}`;
const HEALTH_URL = `${COCHRAN_URL}/health`;
const REPO_ROOT = path.resolve(__dirname, '../..');
const LOCAL_AGENT_DIR = path.join(REPO_ROOT, 'apps', 'local-agent');
const SCRIPTS_DIR = path.join(REPO_ROOT, 'scripts');

let tray = null;
let isRunning = false;
let lastError = null;

function getAsset(name) {
  return path.join(__dirname, 'assets', name);
}

function loadIcon(name) {
  const p = getAsset(name);
  const img = nativeImage.createFromPath(p);
  if (img.isEmpty()) return nativeImage.createEmpty();
  return img.resize({ width: 16, height: 16 });
}

function setTrayIcon(running) {
  if (!tray) return;
  const icon = running ? loadIcon('icon-normal.png') : loadIcon('icon-error.png');
  tray.setImage(icon);
  tray.setToolTip(running ? 'Cochran AI – running' : 'Cochran AI – not running');
  isRunning = running;
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        lastError = null;
        try {
          const j = JSON.parse(data);
          resolve({ ok: true, status: res.statusCode, body: j });
        } catch {
          resolve({ ok: true, status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (err) => {
      lastError = err.message;
      resolve({ ok: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      lastError = 'Request timeout';
      resolve({ ok: false, error: 'Timeout' });
    });
  });
}

function pollHealth() {
  checkHealth().then((r) => {
    setTrayIcon(r.ok && r.status === 200);
  });
}

function startCochran() {
  const script = path.join(LOCAL_AGENT_DIR, 'start-agent.ps1');
  const node = process.execPath;
  const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], {
    cwd: LOCAL_AGENT_DIR,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  tray?.setToolTip('Cochran AI – starting…');
  setTimeout(pollHealth, 3000);
}

function stopCochran() {
  spawn('powershell', [
    '-NoProfile', '-Command',
    `Get-NetTCPConnection -LocalPort ${COCHRAN_PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`
  ], { stdio: 'ignore' });
  setTrayIcon(false);
  tray?.setToolTip('Cochran AI – stopped');
}

function openRefresher() {
  shell.openExternal(`${COCHRAN_URL}/refresher?last=10`);
}

function openScheduledTasks() {
  spawn('taskschd.msc', [], { detached: true, stdio: 'ignore' });
}

function runScheduleScript() {
  const script = path.join(SCRIPTS_DIR, 'cochran-ai-schedule-check.ps1');
  spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
}

async function showWhatsWrong() {
  const r = await checkHealth();
  if (r.ok && r.status === 200) {
    const msg = typeof r.body === 'object' ? JSON.stringify(r.body, null, 2) : String(r.body || '');
    const short = msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
    tray?.displayBalloon({ title: 'Cochran AI – running', content: short || 'OK', icon: getAsset('icon-normal.png') });
  } else {
    const reason = lastError || r.error || 'Not responding';
    tray?.displayBalloon({
      title: 'Cochran AI – not running',
      content: reason + '. Start from apps\\local-agent (pnpm start) or use "Turn Cochran On" in the tray menu.',
      icon: getAsset('icon-error.png'),
    });
  }
}

function buildContextMenu() {
  pollHealth(); // refresh state before showing menu
  return Menu.buildFromTemplate([
    { label: isRunning ? '● Cochran AI running' : '○ Cochran AI stopped', enabled: false },
    { type: 'separator' },
    { label: 'Turn Cochran On', click: startCochran },
    { label: 'Turn Cochran Off', click: stopCochran },
    { type: 'separator' },
    { label: 'Start schedule task…', click: runScheduleScript },
    { label: 'Create / edit scheduled tasks', click: openScheduledTasks },
    { type: 'separator' },
    { label: 'Ask Cochran (open Refresher)', click: openRefresher },
    { label: "What's wrong?", click: showWhatsWrong },
    { type: 'separator' },
    { label: 'Exit', role: 'quit' },
  ]);
}

function createTray() {
  const icon = loadIcon('icon-normal.png');
  tray = new Tray(icon);
  tray.setContextMenu(buildContextMenu());
  tray.on('right-click', () => tray.setContextMenu(buildContextMenu()));
  pollHealth();
  setInterval(pollHealth, 15000);
}

app.whenReady().then(createTray);
app.dock?.hide();
app.on('window-all-closed', () => {});
