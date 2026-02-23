// Global console timestamp patcher
// Prefixes console output with [YYYY-MM-DD HH:mm:ss TZ]

function nowStamp(): string {
  const tz = (process.env.ALPHA_TIMEZONE || 'America/New_York').trim();
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
    const ts = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    return `[${ts} ${tz}]`;
  } catch {
    const d = new Date();
    const ts = d.toISOString().replace('T', ' ').replace('Z', 'Z');
    return `[${ts}]`;
  }
}

(function patchConsole() {
  const methods: Array<keyof Console> = ['log', 'info', 'warn', 'error', 'debug'];
  for (const m of methods) {
    const orig = (console as any)[m]?.bind(console) as (...args: any[]) => void;
    if (!orig) continue;
    (console as any)[m] = (...args: any[]) => {
      try {
        orig(nowStamp(), ...args);
      } catch {
        orig(...args);
      }
    };
  }
})();
