export function getAdminPasswordCandidates(): string[] {
  const raw = [
    process.env.PETREUNION_ADMIN_PASSWORD,
    process.env.ADMIN_PASSWORD,
    process.env.ADMIN_KEY, // allow using the same secret for cron/admin actions locally
  ];
  const out: string[] = [];
  for (const v of raw) {
    const s = (v || '').trim();
    if (s) out.push(s);
  }
  // De-dupe
  return Array.from(new Set(out));
}

