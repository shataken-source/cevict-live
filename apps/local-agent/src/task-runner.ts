import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const TASKS_PATH = path.join(REPO_ROOT, 'COCHRAN_TASKS.json');
const STATE_PATH = path.join(REPO_ROOT, 'apps', 'local-agent', '.cochran-tasks-state.json');
/** Written when a task finishes so the tray can show "check for accuracy" notification */
const NOTIFICATION_PATH = path.join(REPO_ROOT, 'apps', 'local-agent', '.cochran-task-notification.json');

type TaskType = 'sql_migration' | 'script';

interface CochranTask {
  id: string;
  enabled?: boolean;
  type: TaskType;
  env?: string;
  /** App name under apps/ (e.g. wheretovacation, accu-solar) for loading .env.local */
  project?: string;
  description?: string;
  sql_file?: string;
  apply_with?: string;
  command?: string;
  args?: string[];
  depends_on?: string[];
  human_approval_required?: boolean;
}

interface TaskStateEntry {
  completed?: boolean;
  lastRun?: string;
  lastResult?: 'success' | 'error' | 'skipped';
  note?: string;
}

type TaskState = Record<string, TaskStateEntry>;

async function readJson<T>(p: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(p: string, data: unknown) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
}

async function loadTasks(): Promise<CochranTask[]> {
  const json = await readJson<{ tasks?: CochranTask[] }>(TASKS_PATH);
  return Array.isArray(json?.tasks) ? json!.tasks : [];
}

async function loadState(): Promise<TaskState> {
  const s = await readJson<TaskState>(STATE_PATH);
  return s || {};
}

async function saveState(state: TaskState) {
  await writeJson(STATE_PATH, state);
}

function getProjectRefForEnv(env: string | undefined, envOverrides: Record<string, string>): string | null {
  if (!env) return null;
  const key =
    'SUPABASE_PROJECT_REF_' +
    env
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/_+$/, '');
  return envOverrides[key] ?? process.env[key] ?? null;
}

/** Resolve project dir (apps/wheretovacation or apps/accu-solar) from task.project or sql_file path */
function getProjectDir(task: CochranTask): string | null {
  if (task.project) {
    return path.join(REPO_ROOT, 'apps', task.project);
  }
  const sql = task.sql_file ?? '';
  const match = sql.match(/apps[/\\]([^/\\]+)/);
  if (match) return path.join(REPO_ROOT, 'apps', match[1]!);
  return null;
}

/** KeyVault store path (same order as scripts/keyvault/KeyVault.psm1). */
function getKeyVaultStorePath(): string {
  const override = process.env.KEYVAULT_STORE_PATH;
  if (override && override.trim()) return override.trim();
  const vaultCandidates = [
    'C:\\Cevict_Vault\\env-store.json',
    'C:\\Cevict_Vault\\vault\\secrets\\env-store.json',
    'C:\\Cevict_Vault\\secrets\\env-store.json',
    path.join(REPO_ROOT, 'vault', 'secrets', 'env-store.json'),
  ];
  for (const p of vaultCandidates) {
    if (existsSync(p)) return p;
  }
  return path.join(REPO_ROOT, 'vault', 'secrets', 'env-store.json');
}

/** Load KeyVault store (scripts/keyvault). Merges store.secrets into env. Returns {} if missing. */
async function loadKeyVaultStore(): Promise<Record<string, string>> {
  const storePath = getKeyVaultStorePath();
  const data = await readJson<{ secrets?: Record<string, string> }>(storePath);
  if (!data?.secrets || typeof data.secrets !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data.secrets)) {
    if (k && v != null && typeof v === 'string') out[k] = v;
  }
  return out;
}

/** Load KEY=VALUE from project .env.local (no quotes/escaping). Returns record for merge into spawn env. */
async function loadEnvLocal(projectDir: string): Promise<Record<string, string>> {
  const filePath = path.join(projectDir, '.env.local');
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.replace(/#.*$/, '').trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

function runSupabaseMigration(
  task: CochranTask,
  absSql: string,
  envOverrides: Record<string, string>
): Promise<{ ok: boolean; note?: string }> {
  return new Promise((resolve) => {
    const ref = getProjectRefForEnv(task.env, envOverrides);
    if (!ref) {
      const key =
        'SUPABASE_PROJECT_REF_' +
        (task.env ?? '')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/_+$/, '');
      resolve({
        ok: false,
        note: `Missing ${key} in project .env.local (or env). Set it to your Supabase project ref.`,
      });
      return;
    }

    const args = ['db', 'execute', '--project-ref', ref, '--file', absSql];
    const spawnEnv = { ...process.env, ...envOverrides };
    const child = spawn('supabase', args, {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: spawnEnv,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ ok: true });
      } else {
        resolve({ ok: false, note: `supabase exited with code ${code}` });
      }
    });
    child.on('error', (err) => {
      resolve({ ok: false, note: `spawn error: ${err.message}` });
    });
  });
}

function runScriptTask(task: CochranTask): Promise<{ ok: boolean; note?: string }> {
  return new Promise((resolve) => {
    if (!task.command) {
      resolve({ ok: false, note: 'No command specified' });
      return;
    }
    const args = task.args || [];
    const child = spawn(task.command, args, {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve({ ok: true });
      else resolve({ ok: false, note: `command exited with code ${code}` });
    });
    child.on('error', (err) => {
      resolve({ ok: false, note: `spawn error: ${err.message}` });
    });
  });
}

export async function runPendingTasks(): Promise<TaskState> {
  const [tasks, state] = await Promise.all([loadTasks(), loadState()]);

  const byId = new Map<string, CochranTask>();
  for (const t of tasks) {
    if (t.id) byId.set(t.id, t);
  }

  const now = new Date().toISOString();

  for (const task of tasks) {
    if (!task.id) continue;
    if (task.enabled === false) continue;
    const s = state[task.id];
    if (s?.completed) continue;

    // Simple dependency check
    const deps = task.depends_on || [];
    const blocked = deps.some((depId) => !state[depId]?.completed);
    if (blocked) continue;

    // Resolve project and load env: KeyVault store first (scripts/keyvault), then project .env.local overrides
    const keyvaultSecrets = await loadKeyVaultStore();
    const projectDir = getProjectDir(task);
    const projectEnv = projectDir ? await loadEnvLocal(projectDir) : {};
    const envOverrides: Record<string, string> = { ...keyvaultSecrets, ...projectEnv };
    const runMode = (envOverrides.COCHRAN_RUN_MODE ?? 'test').toLowerCase();
    const ref = getProjectRefForEnv(task.env, envOverrides);

    if (!ref) {
      const key =
        'SUPABASE_PROJECT_REF_' +
        (task.env ?? '')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/_+$/, '');
      state[task.id] = {
        completed: false,
        lastRun: now,
        lastResult: 'skipped',
        note: `Skipped – no ${key} in ${projectDir ? path.join(projectDir, '.env.local') : 'project .env.local'}. Set COCHRAN_RUN_MODE=test|prod and ${key}=<ref>.`,
      };
      continue;
    }

    let result: { ok: boolean; note?: string } = { ok: false, note: 'Unknown' };

    try {
      if (task.type === 'sql_migration' && task.sql_file) {
        const absSql = path.isAbsolute(task.sql_file)
          ? task.sql_file
          : path.join(REPO_ROOT, task.sql_file.replace(/^[.\\/]+/, ''));
        result = await runSupabaseMigration(task, absSql, envOverrides);
      } else if (task.type === 'script') {
        result = await runScriptTask(task);
      } else {
        result = { ok: false, note: `Unsupported task type or missing file: ${task.type}` };
      }
    } catch (err) {
      const e = err instanceof Error ? err.message : String(err);
      result = { ok: false, note: e };
    }

    state[task.id] = {
      completed: result.ok,
      lastRun: now,
      lastResult: result.ok ? 'success' : 'error',
      note: result.note,
    };

    // So tray can show "Cochran finished – check for accuracy"
    await writeJson(NOTIFICATION_PATH, {
      taskId: task.id,
      description: task.description || task.id,
      result: result.ok ? 'success' : 'error',
      note: result.note,
      runMode,
      finishedAt: now,
    });
  }

  await saveState(state);
  return state;
}

