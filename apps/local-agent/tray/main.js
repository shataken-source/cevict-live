/**
 * Cochran AI system tray (in-app)
 * - Icon: green/normal when Cochran is running, red-X when not
 * - Right-click: Turn on/off, Start task, Create task, Ask Cochran, What's wrong?, Exit
 */

import { app, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COCHRAN_PORT = process.env.LOCAL_AGENT_PORT || 3847;
const COCHRAN_URL = `http://localhost:${COCHRAN_PORT}`;
const HEALTH_URL = `${COCHRAN_URL}/health`;
// tray/main.js lives in apps/local-agent/tray → repo root is 3 levels up
const REPO_ROOT = path.resolve(__dirname, '../../..');
const LOCAL_AGENT_DIR = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(REPO_ROOT, 'scripts');
const TASK_NOTIFICATION_PATH = path.join(LOCAL_AGENT_DIR, '.cochran-task-notification.json');
const COCHRAN_TASKS_PATH = path.join(REPO_ROOT, 'COCHRAN_TASKS.json');

let tray = null;
let isRunning = false;
let lastError = null;
/** Last task finishedAt we showed a balloon for (so we don't re-notify) */
let lastNotifiedTaskFinishedAt = null;

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

function checkTaskNotification() {
  try {
    const raw = fs.readFileSync(TASK_NOTIFICATION_PATH, 'utf8');
    const data = JSON.parse(raw);
    const finishedAt = data.finishedAt;
    if (!finishedAt) return;
    if (lastNotifiedTaskFinishedAt === finishedAt) return;
    lastNotifiedTaskFinishedAt = finishedAt;
    const desc = data.description || data.taskId || 'Task';
    const result = data.result === 'success' ? 'completed' : 'finished with errors';
    const mode = data.runMode ? ` (${data.runMode})` : '';
    if (!tray) return;
    tray.displayBalloon({
      title: 'Cochran finished a task',
      content: `${desc} – ${result}${mode}. Check for accuracy.`,
      icon: data.result === 'success' ? getAsset('icon-normal.png') : getAsset('icon-error.png'),
    });
  } catch {
    // no file or invalid json – ignore
  }
}

function startCochran() {
  const script = path.join(LOCAL_AGENT_DIR, 'start-agent.ps1');
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
      content: reason + '. Run "pnpm start" here or use "Turn Cochran On" in the tray menu.',
      icon: getAsset('icon-error.png'),
    });
  }
}

function sendWakeCommand() {
  // Read COCHRAN_TASKS.json (if present) and send a checkpoint session to Cochran
  let actions = [];
  let breadcrumbs = 'Wake command from tray – resend startup tasks so the next session can pick up from COCHRAN_TASKS.json.';
  try {
    if (fs.existsSync(COCHRAN_TASKS_PATH)) {
      const raw = fs.readFileSync(COCHRAN_TASKS_PATH, 'utf8');
      const data = JSON.parse(raw);
      const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
      actions = tasks.map((t) => ({
        action: `task:${t.id || t.description || 'unnamed'}`,
        context: t.description || t.note || '',
        success: false,
      }));
      if (tasks.length > 0) {
        breadcrumbs = `Wake command – ${tasks.length} task(s) loaded from COCHRAN_TASKS.json. Next: continue pending tasks or review in GCC_WTV_TODO.md.`;
      }
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }

  const body = JSON.stringify({
    type: 'checkpoint',
    summary: 'Wake command from system tray – resend startup/task context to Cochran.',
    userQuery: 'Wake Cochran and refresh startup/task context.',
    breadcrumbs,
    environmentSpecs: { paths: [COCHRAN_TASKS_PATH], ports: [Number(COCHRAN_PORT)] },
    actions,
    filesTouched: fs.existsSync(COCHRAN_TASKS_PATH) ? ['COCHRAN_TASKS.json'] : [],
    phase: 'setup',
    tags: ['wake', 'startup', 'cochran'],
  });

  const req = http.request(
    `${COCHRAN_URL}/session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 5000,
    },
    (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
        if (!tray) return;
        if (ok) {
          tray.displayBalloon({
            title: 'Cochran wake sent',
            content: 'Startup/task context was resent to Cochran AI.',
            icon: getAsset('icon-normal.png'),
          });
        } else {
          const msg = data ? String(data).slice(0, 200) : `HTTP ${res.statusCode}`;
          tray.displayBalloon({
            title: 'Wake failed',
            content: `Cochran responded with ${msg}`,
            icon: getAsset('icon-error.png'),
          });
        }
      });
    },
  );

  req.on('error', (err) => {
    lastError = err.message;
    if (tray) {
      tray.displayBalloon({
        title: 'Wake failed',
        content: `Could not reach Cochran at ${COCHRAN_URL}/session: ${err.message}`,
        icon: getAsset('icon-error.png'),
      });
    }
  });

  req.write(body);
  req.end();
}

function buildContextMenu() {
  pollHealth(); // refresh state before showing menu
  return Menu.buildFromTemplate([
    { label: isRunning ? '● Cochran AI running' : '○ Cochran AI stopped', enabled: false },
    { type: 'separator' },
    { label: 'Turn Cochran On', click: startCochran },
    { label: 'Turn Cochran Off', click: stopCochran },
    { type: 'separator' },
    { label: 'Wake Cochran (resend startup)', click: sendWakeCommand },
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
  setInterval(checkTaskNotification, 20000); // every 20s check for new task completion
}

app.whenReady().then(createTray);
app.dock?.hide();
app.on('window-all-closed', () => {});
