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

  // repo vault (preferred if present)
  const repoVault = path.resolve("C:\\cevict-live\\vault\\secrets\\alpha-hunter.secrets.json");
  if (fs.existsSync(repoVault)) return repoVault;

  // external vault (fallback)
  const externalVault = path.resolve("C:\\Cevict_Vault\\alpha-hunter.secrets.json");
  if (fs.existsSync(externalVault)) return externalVault;

  return null;
}

export function loadAlphaHunterSecrets(): AlphaHunterSecrets | null {
  const p = resolveAlphaHunterSecretsPath();
  if (!p) return null;
  return tryReadJsonFile(p);
}

