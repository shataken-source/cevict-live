/**
 * Cochran AI (Cochran Bot) - Learner & Refresher
 * Persists session summaries and knowledge; fights AI amnesia.
 * Offline-first; run whenever the laptop is on.
 * Supports Context Pillars, phase/tags, tab snapshot, git hook, semantic search.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {
  appendSession,
  getRefresher,
  getSessions,
  getAllSessions,
  loadKnowledge,
  getStorePath,
  type SessionEntry,
  type EntryPhase,
  type SessionFilter,
} from './learner-store.js';
import { buildKnowledge } from './build-knowledge.js';
import {
  isVectorSearchAvailable,
  searchSessions,
  indexSession,
  ensureVectorIndex,
} from './vector-search.js';
import { runPendingTasks } from './task-runner.js';

const PORT = parseInt(process.env.LOCAL_AGENT_PORT || '3847', 10);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'running',
    service: 'cochran-ai',
    uptime: process.uptime(),
    dataDir: getStorePath(),
  });
});

function parsePhase(s: unknown): EntryPhase | undefined {
  const v = String(s || '').toLowerCase();
  if (['setup', 'feature', 'refactor', 'bughunt', 'research'].includes(v)) return v as EntryPhase;
  return undefined;
}

// Ingest a session (Cursor, checkpoint, or git hook)
app.post('/session', (req, res) => {
  try {
    const body = req.body as Partial<SessionEntry>;
    const id = body.id || `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const entry: SessionEntry = {
      id,
      startedAt: body.startedAt || new Date().toISOString(),
      endedAt: body.endedAt || new Date().toISOString(),
      summary: body.summary,
      userQuery: body.userQuery,
      actions: Array.isArray(body.actions) ? body.actions : [],
      filesTouched: body.filesTouched,
      cursorSessionId: body.cursorSessionId,
      objective: body.objective,
      logicChain: body.logicChain,
      gotchas: body.gotchas,
      stateOfPlay: body.stateOfPlay,
      breadcrumbs: body.breadcrumbs,
      environmentSpecs: body.environmentSpecs,
      dependencyMappings: body.dependencyMappings,
      unfinishedRefactors: body.unfinishedRefactors,
      legalComplianceContext: body.legalComplianceContext,
      tabSnapshot: body.tabSnapshot,
      gitCommitHash: body.gitCommitHash,
      gitCommitMessage: body.gitCommitMessage,
      phase: body.phase,
      tags: body.tags,
      type: body.type ?? 'session',
    };
    appendSession(entry);
    indexSession(entry).catch((e) => console.warn('[vector] indexSession failed', e));
    res.json({ success: true, id, message: 'Session stored' });
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    res.status(400).json({ success: false, error: err });
  }
});

// Refresher: last N sessions, optional filter by phase / tags / type
app.get('/refresher', (req, res) => {
  const last = Math.min(parseInt(String(req.query.last || '5'), 10) || 5, 50);
  const phase = parsePhase(req.query.phase);
  const type = req.query.type as SessionEntry['type'] | undefined;
  const tags = req.query.tags ? String(req.query.tags).split(',').map((t) => t.trim()).filter(Boolean) : undefined;
  const filter: SessionFilter | undefined = (phase || type || (tags?.length)) ? { last, phase, type, tags } : { last };
  const data = getRefresher(last, filter);
  res.json(data);
});

// List sessions with optional filter
app.get('/sessions', (req, res) => {
  const last = Math.min(parseInt(String(req.query.last || '20'), 10) || 20, 100);
  const phase = parsePhase(req.query.phase);
  const type = req.query.type as SessionEntry['type'] | undefined;
  const tags = req.query.tags ? String(req.query.tags).split(',').map((t) => t.trim()).filter(Boolean) : undefined;
  const filter: SessionFilter | undefined = (phase || type || (tags?.length)) ? { last, phase, type, tags } : undefined;
  const sessions = getSessions(last, filter);
  res.json({ sessions, count: sessions.length });
});

// Knowledge index (built by build-knowledge script)
app.get('/knowledge', (_req, res) => {
  const knowledge = loadKnowledge();
  if (!knowledge) {
    return res.status(404).json({
      success: false,
      error: 'Knowledge not built yet. Run: pnpm run build-knowledge',
    });
  }
  res.json(knowledge);
});

// Rebuild knowledge (can be slow)
app.post('/knowledge/rebuild', (_req, res) => {
  try {
    const entry = buildKnowledge();
    res.json({ success: true, builtAt: entry.builtAt, apps: entry.apps.length, docs: entry.docs.length });
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, error: err });
  }
});

// Store path (so Cursor knows where data lives)
app.get('/store', (_req, res) => {
  res.json({ path: getStorePath() });
});

// Semantic search (vector embeddings; requires @lancedb/lancedb + @xenova/transformers)
app.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(parseInt(String(req.query.limit || '10'), 10) || 10, 50);
  if (!q) {
    return res.status(400).json({ success: false, error: 'Missing query parameter q' });
  }
  const available = await isVectorSearchAvailable();
  if (!available) {
    return res.status(503).json({
      success: false,
      error: 'Vector search not available. Install: pnpm add @lancedb/lancedb @xenova/transformers',
    });
  }
  try {
    const hits = await searchSessions(q, limit);
    const allSessions = getAllSessions();
    const byId = new Map(allSessions.map((s) => [s.id, s]));
    const sessions = hits.map((h) => byId.get(h.id)).filter(Boolean) as SessionEntry[];
    res.json({ query: q, sessions, scores: hits });
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, error: err });
  }
});

app.get('/search/status', async (_req, res) => {
  const available = await isVectorSearchAvailable();
  res.json({ available });
});

app.post('/search/rebuild', async (_req, res) => {
  try {
    const entries = getAllSessions();
    const result = await ensureVectorIndex(entries);
    if (!result.ok) {
      return res.status(503).json({ success: false, error: result.error });
    }
    res.json({ success: true, indexed: entries.length });
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, error: err });
  }
});

// Run COCHRAN_TASKS.json tasks on demand
app.post('/tasks/run', async (_req, res) => {
  try {
    const state = await runPendingTasks();
    res.json({ success: true, state });
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    res.status(500).json({ success: false, error: err });
  }
});

app.listen(PORT, () => {
  console.log(`
Cochran AI running
  Port:    ${PORT}
  Data:    ${getStorePath()}
  Endpoints:
    POST /session              - ingest session (pillars, tabSnapshot, phase, tags, type, gitCommitHash)
    GET  /refresher?last=5      - last N sessions (?phase= &tags= &type=)
    GET  /sessions?last=20      - list (?phase= &tags= &type=)
    GET  /search?q=...&limit=10 - semantic search (vector)
    GET  /search/status        - vector search available?
    POST /search/rebuild       - re-index all sessions for vector search
    GET  /knowledge            - index of C:\\\\gcc + cevict-live
    POST /knowledge/rebuild
    GET  /store
    GET  /health
    POST /tasks/run           - run pending COCHRAN_TASKS.json entries (test env only)
`);

  // Start system tray when agent runs (set COCHRAN_START_TRAY=0 to disable)
  if (process.env['COCHRAN_START_TRAY'] !== '0') {
    const root = path.join(__dirname, '..');
    const trayMain = path.join(root, 'tray', 'main.js');
    const electronCli = path.join(root, 'node_modules', 'electron', 'cli.js');
    try {
      const child = spawn(process.execPath, [electronCli, trayMain], {
        cwd: root,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, LOCAL_AGENT_PORT: String(PORT) },
      });
      child.unref();
      console.log('Tray started (system tray icon).');
    } catch (e) {
      console.warn('Tray not started (electron may be missing):', e instanceof Error ? e.message : e);
    }
  }
});

// Background: periodically run pending tasks (test env only)
setTimeout(() => {
  runPendingTasks().catch((e) => console.warn('[tasks] initial run failed', e));
}, 15_000);
setInterval(() => {
  runPendingTasks().catch((e) => console.warn('[tasks] periodic run failed', e));
}, 10 * 60 * 1000);
