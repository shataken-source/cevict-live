/**
 * Build knowledge index of C:\gcc and C:\cevict-live.
 * Scans folder structure and key docs (README, *.md) for offline refresher.
 * Run: pnpm run build-knowledge or node dist/build-knowledge.js
 */

import fs from 'fs';
import path from 'path';
import { saveKnowledge, type KnowledgeEntry } from './learner-store.js';

const ROOTS = [
  { path: 'C:\\cevict-live', label: 'cevict-live' },
  { path: 'C:\\gcc', label: 'gcc' },
];

const MAX_DEPTH = 4;
const MAX_README_PER_APP = 5;
const MAX_DOCS_PER_ROOT = 200;

function safeReaddir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function safeStat(p: string): fs.Stats | null {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function collectApps(rootPath: string, rootLabel: string): KnowledgeEntry['apps'] {
  const apps: KnowledgeEntry['apps'] = [];
  const appsDir = path.join(rootPath, 'apps');
  const stat = safeStat(appsDir);
  if (!stat?.isDirectory()) return apps;

  const names = safeReaddir(appsDir);
  for (const name of names) {
    if (name.startsWith('.')) continue;
    const appPath = path.join(appsDir, name);
    const st = safeStat(appPath);
    if (!st) continue;
    const readmes: string[] = [];
    if (st.isDirectory()) {
      const walk = (dir: string, depth: number) => {
        if (depth > 2) return;
        for (const f of safeReaddir(dir)) {
          const full = path.join(dir, f);
          const s = safeStat(full);
          if (!s) continue;
          if (s.isDirectory() && f !== 'node_modules' && f !== '.next' && f !== '.git') {
            walk(full, depth + 1);
          } else if (f === 'README.md' || (f.endsWith('.md') && f.toUpperCase().includes('README'))) {
            readmes.push(path.relative(rootPath, full));
            if (readmes.length >= MAX_README_PER_APP) return;
          }
        }
      };
      walk(appPath, 0);
    }
    apps.push({
      name,
      path: path.relative(rootPath, appPath),
      root: rootLabel,
      readmes,
    });
  }
  return apps;
}

function collectDocs(rootPath: string, rootLabel: string): KnowledgeEntry['docs'] {
  const docs: { path: string; root: string }[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > MAX_DEPTH || docs.length >= MAX_DOCS_PER_ROOT) return;
    for (const f of safeReaddir(dir)) {
      const full = path.join(dir, f);
      const s = safeStat(full);
      if (!s) continue;
      if (s.isDirectory()) {
        if (f === 'node_modules' || f === '.next' || f === '.git' || f === 'dist') continue;
        walk(full, depth + 1);
      } else if (f.endsWith('.md') || f.endsWith('.mdx')) {
        docs.push({ path: path.relative(rootPath, full), root: rootLabel });
      }
    }
  };
  walk(rootPath, 0);
  return docs;
}

function treeSummary(rootPath: string, maxDepth: number = 2): string {
  const lines: string[] = [];
  function walk(dir: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;
    const entries = safeReaddir(dir)
      .filter((f) => f !== 'node_modules' && f !== '.next' && f !== '.git' && f !== 'dist')
      .sort();
    const dirs: string[] = [];
    const files: string[] = [];
    for (const e of entries) {
      const full = path.join(dir, e);
      const s = safeStat(full);
      if (s?.isDirectory()) dirs.push(e);
      else files.push(e);
    }
    for (let i = 0; i < dirs.length; i++) {
      const isLast = i === dirs.length - 1 && files.length === 0;
      const name = dirs[i];
      lines.push(`${prefix}${isLast ? '└──' : '├──'} ${name}/`);
      walk(path.join(dir, name), prefix + (isLast ? '   ' : '│  '), depth + 1);
    }
    for (let i = 0; i < Math.min(files.length, 15); i++) {
      const isLast = i === files.length - 1 || i === 14;
      lines.push(`${prefix}${isLast ? '└──' : '├──'} ${files[i]}`);
    }
    if (files.length > 15) lines.push(`${prefix}└── ... and ${files.length - 15} more files`);
  }
  walk(rootPath, '', 0);
  return lines.join('\n');
}

export function buildKnowledge(): KnowledgeEntry {
  const roots = ROOTS.filter((r) => fs.existsSync(r.path)).map((r) => ({ path: r.path, label: r.label }));
  const apps: KnowledgeEntry['apps'] = [];
  const docs: KnowledgeEntry['docs'] = [];
  const treeParts: string[] = [];

  for (const root of roots) {
    apps.push(...collectApps(root.path, root.label));
    docs.push(...collectDocs(root.path, root.label));
    treeParts.push(`--- ${root.label} (${root.path}) ---\n${treeSummary(root.path)}`);
  }

  const entry: KnowledgeEntry = {
    builtAt: new Date().toISOString(),
    roots,
    apps,
    docs,
    treeSummary: treeParts.join('\n\n'),
  };

  saveKnowledge(entry);
  return entry;
}

// Run when executed directly (e.g. node dist/build-knowledge.js)
const scriptPath = process.argv[1] ?? '';
if (scriptPath.endsWith('build-knowledge.js') || scriptPath.endsWith('build-knowledge.ts') || process.argv.includes('--run')) {
  const result = buildKnowledge();
  console.log('Knowledge built at', result.builtAt);
  console.log('Roots:', result.roots.length);
  console.log('Apps:', result.apps.length);
  console.log('Docs:', result.docs.length);
}
