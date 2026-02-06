/**
 * Secret Store (local-only)
 *
 * Goal: avoid fragile multi-line env vars.
 * Supports loading a local secrets JSON file from a vault location that is NOT committed.
 *
 * Precedence:
 * 1) ALPHA_HUNTER_SECRETS_PATH (explicit)
 * 2) C:\cevict-live\vault\secrets\alpha-hunter.secrets.json (repo vault, gitignored)
 * 3) C:\Cevict_Vault\alpha-hunter.secrets.json (external vault)
 */

import * as fs from "fs";
import * as path from "path";

export type AlphaHunterSecrets = {
  kalshi?: {
    env?: "demo" | "production";
    apiKeyId?: string;
    privateKey?: string; // single-line with \n escapes OR multi-line PEM
    privateKeyPath?: string; // path to .pem/.txt file
  };
  supabase?: {
    url?: string;
    serviceRoleKey?: string;
  };
};

function tryReadJsonFile(p: string): AlphaHunterSecrets | null {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as AlphaHunterSecrets;
  } catch {
    return null;
  }
}

export function resolveAlphaHunterSecretsPath(): string | null {
  const explicit = (process.env.ALPHA_HUNTER_SECRETS_PATH || "").trim();
  if (explicit) return explicit;

  // alpha-hunter app root (src/lib -> .. -> .. = alpha-hunter/)
  const appRoot = path.resolve(__dirname, "..", "..");
  // repo vault: alpha-hunter/../../vault/secrets (works from monorepo root)
  const repoVault = path.resolve(appRoot, "..", "..", "vault", "secrets", "alpha-hunter.secrets.json");
  if (fs.existsSync(repoVault)) return repoVault;

  // same repo vault when run from repo root (cwd = cevict-live)
  const cwdVault = path.resolve(process.cwd(), "vault", "secrets", "alpha-hunter.secrets.json");
  if (fs.existsSync(cwdVault)) return cwdVault;

  // external vault (Windows fallback; Linux can set ALPHA_HUNTER_SECRETS_PATH)
  const externalVault = path.resolve("/opt/cevict/vault/alpha-hunter.secrets.json");
  if (fs.existsSync(externalVault)) return externalVault;

  return null;
}

export function loadAlphaHunterSecrets(): AlphaHunterSecrets | null {
  const p = resolveAlphaHunterSecretsPath();
  if (!p) return null;
  return tryReadJsonFile(p);
}

