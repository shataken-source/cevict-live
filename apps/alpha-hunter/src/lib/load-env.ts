// Load .env.local in addition to default .env for alpha-hunter
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

function tryLoad(p: string) {
  try {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: true });
      return true;
    }
  } catch { }
  return false;
}

// 1) Prefer CWD/.env.local when running from apps/alpha-hunter
const cwdEnv = path.join(process.cwd(), '.env.local');
if (!tryLoad(cwdEnv)) {
  // 2) Walk up from __dirname to find app root containing env.manifest.json
  try {
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
      const manifest = path.join(dir, 'env.manifest.json');
      const pkg = path.join(dir, 'package.json');
      if (fs.existsSync(manifest) || fs.existsSync(pkg)) {
        const envLocal = path.join(dir, '.env.local');
        if (tryLoad(envLocal)) break;
      }
      const parent = path.dirname(dir);
      if (!parent || parent === dir) break;
      dir = parent;
    }
  } catch { }
}
