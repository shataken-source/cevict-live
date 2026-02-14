/**
 * Optional semantic search over session entries using LanceDB + Transformers.js.
 * We compute embeddings locally and store vectors; LanceDB 0.12 does not take
 * an embedding function in createTable, so we pass a "vector" column.
 */

import path from 'path';
import type { SessionEntry } from './learner-store.js';
import { entryToSearchableText, getStorePath } from './learner-store.js';

const LANCEDB_DIR = 'lancedb';
const TABLE_NAME = 'sessions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipe: any = null;

async function getPipeline() {
  if (pipe) return pipe;
  try {
    const { pipeline } = await import('@xenova/transformers');
    pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    return pipe;
  } catch (e) {
    console.warn('[vector-search] Transformers.js not available:', (e as Error).message);
    return null;
  }
}

/** Embed a single text; returns float array. */
async function embedText(text: string): Promise<number[]> {
  const p = await getPipeline();
  if (!p) return [];
  const res = await p(text, { pooling: 'mean', normalize: true });
  return Array.from(res.data as Float32Array);
}

/** Embed multiple texts. */
async function embedBatch(texts: string[]): Promise<number[][]> {
  const result: number[][] = [];
  for (const text of texts) {
    result.push(await embedText(text));
  }
  return result;
}

type VectorRow = Record<string, unknown> & {
  id: string;
  sessionId: string;
  text: string;
  vector: number[];
};

export async function isVectorSearchAvailable(): Promise<boolean> {
  try {
    const p = await getPipeline();
    if (!p) return false;
    await import('@lancedb/lancedb');
    return true;
  } catch {
    return false;
  }
}

/** Ensure DB and table exist; re-index all given sessions (overwrite). */
export async function ensureVectorIndex(entries: SessionEntry[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const p = await getPipeline();
    if (!p) return { ok: false, error: 'Embedding pipeline not available' };
    const filtered = entries.filter((e) => entryToSearchableText(e).trim().length > 0);
    if (filtered.length === 0) return { ok: true };
    const texts = filtered.map((e) => entryToSearchableText(e));
    const vectors = await embedBatch(texts);
    const rows: VectorRow[] = filtered.map((e, i) => ({
      id: e.id,
      sessionId: e.id,
      text: texts[i],
      vector: vectors[i],
    }));
    const lancedb = await import('@lancedb/lancedb').then((m) => m.connect(path.join(getStorePath(), LANCEDB_DIR)));
    await lancedb.createTable(TABLE_NAME, rows as Record<string, unknown>[], { mode: 'overwrite' });
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, error: err };
  }
}

/** Add one entry to the vector table (append). Creates table if missing. */
export async function indexSession(entry: SessionEntry): Promise<{ ok: boolean; error?: string }> {
  try {
    const text = entryToSearchableText(entry);
    if (!text.trim()) return { ok: true };
    const vector = await embedText(text);
    if (vector.length === 0) return { ok: false, error: 'Embedding failed' };
    const lancedb = await import('@lancedb/lancedb').then((m) => m.connect(path.join(getStorePath(), LANCEDB_DIR)));
    try {
      const tbl = await lancedb.openTable(TABLE_NAME);
      await tbl.add([{ id: entry.id, sessionId: entry.id, text, vector }]);
    } catch {
      await lancedb.createTable(TABLE_NAME, [{ id: entry.id, sessionId: entry.id, text, vector }]);
    }
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, error: err };
  }
}

/** Semantic search; returns session ids and relevance score (1 = best). */
export async function searchSessions(query: string, limit: number = 10): Promise<{ id: string; score: number }[]> {
  try {
    const queryVector = await embedText(query);
    if (queryVector.length === 0) return [];
    const lancedb = await import('@lancedb/lancedb').then((m) => m.connect(path.join(getStorePath(), LANCEDB_DIR)));
    const tbl = await lancedb.openTable(TABLE_NAME);
    const results = await tbl.vectorSearch(queryVector).limit(limit).toArray() as { sessionId?: string; id?: string; _distance?: number }[];
    return results.map((r) => ({ id: r.sessionId || r.id || '', score: 1 - (r._distance ?? 0) }));
  } catch {
    return [];
  }
}
