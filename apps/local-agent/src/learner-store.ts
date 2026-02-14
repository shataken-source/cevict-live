/**
 * Local persistence for the learner agent.
 * All data is stored in JSON files so the agent works fully offline.
 * Supports Context Pillars, phase/tags, tab snapshot, git-linked entries.
 * Default data dir: C:\Cevict_Vault\local-agent or ./data
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_DATA_DIR = process.env.LOCAL_AGENT_DATA
  || (process.platform === 'win32' ? 'C:\\Cevict_Vault\\local-agent' : `${process.env.HOME || '.'}/.local-agent`);

/** Project phase / category for filtering (e.g. #Bug, #Refactor, #Research). */
export type EntryPhase = 'setup' | 'feature' | 'refactor' | 'bughunt' | 'research';

export interface SessionEntry {
  id: string;
  startedAt: string; // ISO
  endedAt?: string;
  summary?: string;
  userQuery?: string;
  actions: { action: string; context?: string; success?: boolean }[];
  filesTouched?: string[];
  cursorSessionId?: string;
  /** Context Pillars (biographer / checkpoint) */
  objective?: string;
  logicChain?: string;
  gotchas?: string[];
  stateOfPlay?: { file: string; status: string }[] | string;
  breadcrumbs?: string;
  environmentSpecs?: { paths?: string[]; envKeys?: string[]; ports?: number[] };
  dependencyMappings?: { package: string; reason?: string }[];
  unfinishedRefactors?: string;
  legalComplianceContext?: string;
  /** Tab snapshot: files currently open when entry was created */
  tabSnapshot?: string[];
  /** Git hook: link to commit */
  gitCommitHash?: string;
  gitCommitMessage?: string;
  /** Categorization */
  phase?: EntryPhase;
  tags?: string[];
  /** Entry type: checkpoint (manual), session (end of session), git (post-commit hook) */
  type?: 'checkpoint' | 'session' | 'git';
}

export interface KnowledgeEntry {
  builtAt: string;
  roots: { path: string; label: string }[];
  apps: { name: string; path: string; root: string; readmes: string[] }[];
  docs: { path: string; root: string }[];
  treeSummary: string;
}

export interface SessionFilter {
  phase?: EntryPhase;
  tags?: string[];
  type?: SessionEntry['type'];
  last?: number;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDataDir(): string {
  const dir = path.resolve(DEFAULT_DATA_DIR);
  ensureDir(dir);
  return dir;
}

const SESSIONS_FILE = 'sessions.json';
const KNOWLEDGE_FILE = 'knowledge.json';

function sessionsPath(): string {
  return path.join(getDataDir(), SESSIONS_FILE);
}

function knowledgePath(): string {
  return path.join(getDataDir(), KNOWLEDGE_FILE);
}

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch (_) {}
  return defaultValue;
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function matchesFilter(entry: SessionEntry, filter: SessionFilter): boolean {
  if (filter.phase && entry.phase !== filter.phase) return false;
  if (filter.type && entry.type !== filter.type) return false;
  if (filter.tags?.length) {
    const entryTags = new Set(entry.tags ?? []);
    if (!filter.tags.some((t) => entryTags.has(t))) return false;
  }
  return true;
}

/** Append a session. Creates sessions.json if needed. */
export function appendSession(entry: SessionEntry): void {
  const file = sessionsPath();
  const existing = readJson<{ sessions: SessionEntry[] }>(file, { sessions: [] });
  existing.sessions.push(entry);
  if (existing.sessions.length > 500) {
    existing.sessions = existing.sessions.slice(-500);
  }
  writeJson(file, existing);
}

/** Get last N sessions (newest first), optionally filtered by phase/tags/type. */
export function getSessions(last: number = 10, filter?: SessionFilter): SessionEntry[] {
  const file = sessionsPath();
  const data = readJson<{ sessions: SessionEntry[] }>(file, { sessions: [] });
  let list = data.sessions.slice(-(filter?.last ?? last)).reverse();
  if (filter && (filter.phase || filter.tags?.length || filter.type)) {
    list = list.filter((e) => matchesFilter(e, filter));
  }
  return list;
}

/** Get a refresher: last N sessions with optional phase/tags filter. */
export function getRefresher(last: number = 5, filter?: SessionFilter): { sessions: SessionEntry[]; dataDir: string } {
  const sessions = getSessions(last, { ...filter, last: filter?.last ?? last });
  return { sessions, dataDir: getDataDir() };
}

/** Build searchable text from an entry (for embedding or keyword search). */
export function entryToSearchableText(entry: SessionEntry): string {
  const parts: string[] = [];
  if (entry.objective) parts.push(`Objective: ${entry.objective}`);
  if (entry.summary) parts.push(entry.summary);
  if (entry.logicChain) parts.push(`Logic: ${entry.logicChain}`);
  if (entry.gotchas?.length) parts.push(`Gotchas: ${entry.gotchas.join('; ')}`);
  if (entry.breadcrumbs) parts.push(`Next: ${entry.breadcrumbs}`);
  if (entry.unfinishedRefactors) parts.push(`Unfinished: ${entry.unfinishedRefactors}`);
  if (entry.userQuery) parts.push(`Query: ${entry.userQuery}`);
  if (entry.gitCommitMessage) parts.push(`Commit: ${entry.gitCommitMessage}`);
  return parts.join('\n');
}

/** Get all entries as array (for vector index). */
export function getAllSessions(): SessionEntry[] {
  const file = sessionsPath();
  const data = readJson<{ sessions: SessionEntry[] }>(file, { sessions: [] });
  return data.sessions;
}

/** Save knowledge index (from build-knowledge). */
export function saveKnowledge(entry: KnowledgeEntry): void {
  writeJson(knowledgePath(), entry);
}

/** Load knowledge index. */
export function loadKnowledge(): KnowledgeEntry | null {
  const file = knowledgePath();
  const data = readJson<KnowledgeEntry | null>(file, null);
  return data && data.apps ? data : null;
}

/** Get data directory path. */
export function getStorePath(): string {
  return getDataDir();
}
