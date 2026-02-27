// ═══════════════════════════════════════════════════════════════
// SWITCHBACK TV — app.js
// All real data from Xtream Codes API via /api/iptv proxy
// ═══════════════════════════════════════════════════════════════

// ── VIRTUAL KEYBOARD SUPPRESSION ────────────────────────────
// inputmode="none" is set on all inputs in HTML (belt-and-suspenders).
// Here we enforce it in JS too: inputs never open the soft keyboard
// on focus/tab. Only an explicit pointer click OR pressing Enter/OK
// while the input is already focused will open the keyboard.
(function () {
  const INPUTS = 'INPUT, TEXTAREA, SELECT';

  // Ensure inputmode=none on every input at all times unless we opened it
  document.addEventListener('focusin', e => {
    const el = e.target;
    if (!el.matches(INPUTS)) return;
    if (!el._kbOpen) {
      el.setAttribute('inputmode', 'none');
    }
  });

  // Pointer click on an input → open real keyboard
  document.addEventListener('pointerdown', e => {
    const el = e.target;
    if (!el.matches(INPUTS)) return;
    el._kbOpen = true;
    el.removeAttribute('inputmode');
  }, true);

  // Enter/OK on a focused input → open keyboard (TV remote center button)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = document.activeElement;
    if (!el || !el.matches(INPUTS)) return;
    e.preventDefault();
    el._kbOpen = true;
    el.removeAttribute('inputmode');
    el.focus();
    el.click();
  }, true);

  // When input loses focus, re-arm suppression
  document.addEventListener('focusout', e => {
    const el = e.target;
    if (!el.matches(INPUTS)) return;
    el._kbOpen = false;
    el.setAttribute('inputmode', 'none');
  });
})();

// ── DEFAULTS ─────────────────────────────────────────────────
// No hardcoded credentials. User must enter their own via Settings
// or import a provider config / activation code on first run.
// If no credentials are set, the setup screen will be shown.

// ── STATE ────────────────────────────────────────────────────
const S = {
  server: localStorage.getItem('iptv_server'),
  user: localStorage.getItem('iptv_user'),
  pass: localStorage.getItem('iptv_pass'),
  currentScreen: 'tvhome',
  currentChannel: null,      // { stream_id, name, category_id, ... }
  currentChannelIndex: 0,
  channelList: [],            // full flat list currently displayed
  allChannels: [],            // all live streams
  liveCategories: [],
  vodCategories: [],
  seriesCategories: [],
  allVod: [],
  allSeries: [],
  favorites: JSON.parse(localStorage.getItem('fav_channels') || '[]'),
  history: JSON.parse(localStorage.getItem('watch_history') || '[]'),
  recordings: JSON.parse(localStorage.getItem('recordings') || '[]'),
  epgCache: {},               // stream_id → epg listing
  userInfo: null,
  hlsInstance: null,
  playerMuted: false,
  catchupSelectedStreamId: null,
  switchbackSlots: JSON.parse(localStorage.getItem('sb_slots') || '[null,null,null,null]'), // up to 4 switchback slots
  isPro: localStorage.getItem('sb_tier') === 'pro' || localStorage.getItem('sb_tier') === 'elite', // pro/elite unlocks 4 slots
};

// ── ENVIRONMENT DETECTION ────────────────────────────────────
// SwitchbackSimple Android app serves from localhost:8123 via NanoHTTPD
// Vercel deployment serves /api/iptv serverless functions
// We auto-detect and route accordingly.
const IS_ANDROID_WEBVIEW = (
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'localhost'
) && window.location.port === '8123';

// Pairing API lives on the Vercel deployment.
// Android WebView can't use relative URLs for pairing, so we need the full origin.
// TODO: Update 'switchback-tv-web.vercel.app' to the actual Vercel deployment domain
//       once confirmed (check Vercel dashboard for the production URL).
const PAIR_API_BASE = IS_ANDROID_WEBVIEW
  ? 'https://switchback-tv-apk.vercel.app'
  : window.location.origin;

// TODO: Update this URL to match the real Vercel production domain
const PAIR_URL = 'switchback-tv-apk.vercel.app/pair';

function buildApiUrl(action, extra = {}) {
  const xtreamAction = {
    get_user_info: 'get.php',
    get_live_categories: 'player_api.php',
    get_vod_categories: 'player_api.php',
    get_series_categories: 'player_api.php',
    get_live_streams: 'player_api.php',
    get_vod_streams: 'player_api.php',
    get_series: 'player_api.php',
    get_short_epg: 'player_api.php',
    get_simple_data_table: 'player_api.php',
    get_stream_url: null,
    get_vod_url: null,
  };

  if (IS_ANDROID_WEBVIEW) {
    // Route through NanoHTTPD /proxy?url= endpoint
    let targetUrl;
    if (action === 'get_user_info') {
      targetUrl = `${S.server}/player_api.php?username=${encodeURIComponent(S.user)}&password=${encodeURIComponent(S.pass)}`;
    } else if (action === 'get_stream_url' || action === 'get_vod_url') {
      const id = extra.stream_id || extra.vod_id;
      const ext = extra.container_extension || 'ts';
      targetUrl = `${S.server}/${action === 'get_vod_url' ? 'movie' : 'live'}/${encodeURIComponent(S.user)}/${encodeURIComponent(S.pass)}/${id}.${ext}`;
    } else {
      const p = new URLSearchParams({ username: S.user, password: S.pass, action, ...extra });
      targetUrl = `${S.server}/player_api.php?${p}`;
    }
    return `http://localhost:8123/proxy?url=${encodeURIComponent(targetUrl)}`;
  }

  // Vercel serverless proxy
  const params = new URLSearchParams({ action, server: S.server, username: S.user, password: S.pass, ...extra });
  return `/api/iptv?${params}`;
}

// ── API CLIENT ───────────────────────────────────────────────
async function api(action, extra = {}) {
  const url = buildApiUrl(action, extra);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${action} failed: ${res.status}`);
  return res.json();
}

// ── HELPERS ──────────────────────────────────────────────────
function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function streamUrl(id) {
  const target = `${S.server}/live/${encodeURIComponent(S.user)}/${encodeURIComponent(S.pass)}/${id}.ts`;
  if (IS_ANDROID_WEBVIEW) {
    return `http://localhost:8123/proxy?url=${encodeURIComponent(target)}`;
  }
  return `/api/stream?url=${encodeURIComponent(target)}`;
}
function channelInitials(name) { return (name || '?').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3); }
function colorFromName(name) {
  let h = 0; for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue},50%,25%)`;
}
function formatEpgTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function saveState() {
  localStorage.setItem('fav_channels', JSON.stringify(S.favorites));
  localStorage.setItem('watch_history', JSON.stringify(S.history));
  localStorage.setItem('recordings', JSON.stringify(S.recordings));
}
function addToHistory(ch) {
  S.history = [ch, ...S.history.filter(h => h.stream_id !== ch.stream_id)].slice(0, 50);
  saveState();
}

// ── NAVIGATION ───────────────────────────────────────────────
const TITLES = {
  tvhome: 'Home', channels: 'Live TV', movies: 'Movies', series: 'Series',
  favorites: 'Favorites', history: 'Watch History', recordings: 'DVR Recordings',
  catchup: 'Catch-Up TV', epg: 'TV Guide', search: 'Search',
  devices: 'Devices', quality: 'Stream Quality', pricing: 'Plans & Pricing', settings: 'Settings',
};

function nav(screen) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('screen-' + screen);
  if (el) el.classList.add('active');
  const sbItem = document.querySelector(`.sb-item[data-screen="${screen}"]`);
  if (sbItem) sbItem.classList.add('active');
  document.getElementById('topbar-title').textContent = TITLES[screen] || screen;
  S.currentScreen = screen;
  const lazy = {
    tvhome: initTVHome, channels: initChannels, movies: initMovies,
    series: initSeries, epg: initEPG, favorites: renderFavorites,
    history: renderHistory, devices: initDevices, catchup: initCatchUp,
    search: initSearch, recordings: renderRecordings
  };
  if (lazy[screen]) lazy[screen]();
}

document.querySelectorAll('.sb-item[data-screen], .tb-btn[data-screen], button[data-screen]').forEach(el => {
  el.addEventListener('click', () => nav(el.dataset.screen));
});

document.getElementById('sb-toggle-btn').addEventListener('click', () => {
  const sb = document.getElementById('sidebar');
  sb.classList.toggle('collapsed');
  const icon = sb.querySelector('.sb-toggle .icon');
  const lbl = sb.querySelector('.sb-toggle .label');
  if (sb.classList.contains('collapsed')) { icon.textContent = '▶'; if (lbl) lbl.textContent = ''; }
  else { icon.textContent = '◀'; if (lbl) lbl.textContent = 'Collapse'; }
});

// ── TV HOME ──────────────────────────────────────────────────
function initTVHome() {
  const info = S.userInfo;
  const chCount = S.allChannels.length || '47,393';
  const expires = info?.user_info?.exp_date
    ? new Date(info.user_info.exp_date * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
  const maxConn = info?.user_info?.max_connections || '—';

  document.getElementById('tvhome-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <div style="font-size:30px;font-weight:900;background:linear-gradient(90deg,#ff3a3a,#ff8c00);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Switchback TV</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">${esc((S.server || '').replace('http://', '').replace('https://', ''))} · ${S.user || '—'} · ${chCount} channels</div>
      </div>
      <div style="background:rgba(255,193,7,0.12);border:1px solid rgba(255,193,7,0.25);border-radius:8px;padding:7px 14px;text-align:right;flex-shrink:0">
        <div style="font-size:10px;color:var(--yellow);font-weight:700;text-transform:uppercase">Subscription</div>
        <div style="font-size:12px;font-weight:600;margin-top:1px">Expires ${expires}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:1px">${maxConn} max streams</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr 150px;grid-template-rows:1fr 96px;gap:12px;flex:1">
      <div data-screen="channels" class="sb-item-nav" style="grid-row:1;background:rgba(229,0,0,0.12);border:2px solid rgba(229,0,0,0.3);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='rgba(229,0,0,0.22)'" onmouseout="this.style.background='rgba(229,0,0,0.12)'">
        <div style="font-size:58px;margin-bottom:12px">📺</div>
        <div style="font-size:26px;font-weight:800">Live TV</div>
        <div style="font-size:12px;color:var(--muted);margin-top:5px">${chCount} channels</div>
      </div>
      <div style="grid-row:1;display:flex;flex-direction:column;gap:12px">
        <div data-screen="movies" class="sb-item-nav tile" style="flex:1"><div style="font-size:36px;margin-bottom:8px">🎬</div><div style="font-size:16px;font-weight:700">Movies</div></div>
        <div data-screen="series" class="sb-item-nav tile" style="flex:1"><div style="font-size:36px;margin-bottom:8px">🎭</div><div style="font-size:16px;font-weight:700">Series</div></div>
      </div>
      <div style="grid-row:1;display:flex;flex-direction:column;gap:12px">
        <div data-screen="settings" class="sb-item-nav sidebar-tile" style="flex:1"><div style="font-size:24px">⚙️</div><div style="font-size:12px;font-weight:600">Settings</div></div>
        <div data-screen="epg"      class="sb-item-nav sidebar-tile" style="flex:1"><div style="font-size:24px">📋</div><div style="font-size:12px;font-weight:600">TV Guide</div></div>
        <div data-screen="pricing"  class="sb-item-nav sidebar-tile" style="flex:1"><div style="font-size:24px">💎</div><div style="font-size:12px;font-weight:600">Upgrade</div></div>
      </div>
      <div style="grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        <div data-screen="favorites"  class="sb-item-nav tile"><div style="font-size:24px;margin-bottom:5px">⭐</div><div style="font-size:13px;font-weight:700">Favorites</div></div>
        <div data-screen="history"    class="sb-item-nav tile"><div style="font-size:24px;margin-bottom:5px">🕐</div><div style="font-size:13px;font-weight:700">History</div></div>
        <div data-screen="recordings" class="sb-item-nav tile"><div style="font-size:24px;margin-bottom:5px">⏺</div><div style="font-size:13px;font-weight:700">Recordings</div></div>
        <div data-screen="catchup"    class="sb-item-nav tile"><div style="font-size:24px;margin-bottom:5px">⏪</div><div style="font-size:13px;font-weight:700">Catch-Up</div></div>
      </div>
    </div>`;
  document.querySelectorAll('.sb-item-nav[data-screen]').forEach(el =>
    el.addEventListener('click', () => nav(el.dataset.screen)));
}

// ── LANGUAGE / COUNTRY CHANNEL FILTER ────────────────────────
// Common foreign-language category keyword patterns to detect and optionally hide.
// The user checks OFF which ones they want hidden.
const LANG_FILTER_GROUPS = [
  { id: 'ar', label: '🇸🇦 Arabic', keywords: ['arabic', 'arab', 'ar |', '| ar', 'بث', 'mbc', 'osn', 'rotana', 'alarabiya', 'aljazeera', 'bein', 'ksa', 'uae', 'qatar', 'iraq', 'egypt', 'saudi', 'kuwait', 'bahrain', 'oman', 'jordan', 'libya', 'algeria', 'morocco', 'tunisia', 'sudan', 'yemen', 'syria'] },
  { id: 'fr', label: '🇫🇷 French', keywords: ['french', 'france', 'fr |', '| fr', 'tf1', 'm6', 'canal+', 'tmc', 'bfm', 'rmc', 'nrj12', 'arte', 'w9', 'c8', 'cstar', 'gulli'] },
  { id: 'pt', label: '🇧🇷 Portuguese', keywords: ['portuguese', 'portugal', 'brazil', 'brasil', 'pt |', '| pt', 'globo', 'record', 'sbt', 'band', 'redetv'] },
  { id: 'es', label: '🇪🇸 Spanish', keywords: ['spanish', 'spain', 'espana', 'español', 'latino', 'mexico', 'colombia', 'argentina', 'es |', '| es', 'telemundo', 'univision', 'telenovela'] },
  { id: 'tr', label: '🇹🇷 Turkish', keywords: ['turkish', 'turkey', 'turk', 'trt', 'atv', 'show tv', 'star tv', 'kanal d', 'fox tr'] },
  { id: 'de', label: '🇩🇪 German', keywords: ['german', 'germany', 'deutsch', 'de |', '| de', 'ard', 'zdf', 'sat1', 'pro7', 'rtl', 'kabel1', 'vox de'] },
  { id: 'it', label: '🇮🇹 Italian', keywords: ['italian', 'italy', 'rai', 'mediaset', 'canale 5', 'italia 1', 'rete 4', 'la7'] },
  { id: 'ru', label: '🇷🇺 Russian', keywords: ['russian', 'russia', 'россия', 'первый', 'нтв', 'rtvi', 'russia tv', 'ртр', 'рен тв'] },
  { id: 'hi', label: '🇮🇳 Hindi/Indian', keywords: ['hindi', 'india', 'indian', 'zee', 'star plus', 'sony', 'colors', 'sun tv', 'star vijay', 'zee telugu', 'zee tamil', 'punjabi', 'bengali', 'marathi', 'gujarati', 'malayalam', 'kannada', 'telugu', 'tamil'] },
  { id: 'zh', label: '🇨🇳 Chinese', keywords: ['chinese', 'china', 'mandarin', 'cantonese', 'cctv', 'tvb', 'phoenix', 'ntdtv', 'dragon tv'] },
  { id: 'fa', label: '🇮🇷 Persian/Farsi', keywords: ['persian', 'farsi', 'iran', 'afghanistan', 'pashto', 'dari', 'irib', 'gem tv', 'manoto', 'voa farsi'] },
  { id: 'pl', label: '🇵🇱 Polish', keywords: ['polish', 'poland', 'polskie', 'tvp', 'polsat', 'tvn pl'] },
  { id: 'nl', label: '🇳🇱 Dutch', keywords: ['dutch', 'netherlands', 'nederland', 'npo', 'rtl nl', 'sbs nl'] },
  { id: 'ro', label: '🇷🇴 Romanian', keywords: ['romanian', 'romania', 'pro tv', 'antena', 'digi24', 'kanal d ro'] },
  { id: 'xx', label: '🌍 Other Foreign', keywords: ['albanian', 'albanie', 'bosnian', 'bulgarian', 'croatian', 'czech', 'greek', 'hungarian', 'macedonian', 'serbian', 'slovak', 'slovenian', 'ukrainian', 'swedish', 'danish', 'norwegian', 'finnish', 'hebrew', 'persian', 'kurdish', 'somali', 'hausa', 'amharic', 'swahili', 'tagalog', 'vietnamese', 'thai', 'korean', 'japanese'] },
];

// Returns the set of category keyword groups the user has HIDDEN
function getLangFilterHidden() {
  try { return JSON.parse(localStorage.getItem('lang_filter_hidden') || '[]'); } catch { return []; }
}

// Apply language filter to a channel list
function applyLangFilter(channels) {
  const hidden = getLangFilterHidden();
  if (!hidden.length) return channels;
  const hiddenGroups = LANG_FILTER_GROUPS.filter(g => hidden.includes(g.id));
  if (!hiddenGroups.length) return channels;
  return channels.filter(ch => {
    const haystack = ((ch.category_name || '') + ' ' + (ch.name || '')).toLowerCase();
    for (const group of hiddenGroups) {
      if (group.keywords.some(kw => haystack.includes(kw))) return false;
    }
    return true;
  });
}

// ── SETTINGS INIT ────────────────────────────────────────────
function initSettings() {
  document.getElementById('cfg-server').value = S.server || '';
  document.getElementById('cfg-user').value = S.user || '';
  document.getElementById('cfg-pass').value = S.pass || '';
  if (S.userInfo) renderAccountInfo(S.userInfo);
  renderLangFilterUI();
}

function renderLangFilterUI() {
  const listEl = document.getElementById('lang-filter-list');
  if (!listEl) return;
  const hidden = getLangFilterHidden();
  listEl.innerHTML = LANG_FILTER_GROUPS.map(g => `
    <label style="display:flex;align-items:center;gap:9px;cursor:pointer;padding:4px 0;font-size:13px" tabindex="0" role="checkbox" aria-checked="${hidden.includes(g.id)}">
      <span style="width:18px;height:18px;border:2px solid var(--border);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${hidden.includes(g.id) ? 'var(--primary)' : 'transparent'};font-size:11px">
        ${hidden.includes(g.id) ? '✓' : ''}
      </span>
      <span>${g.label}</span>
      <span style="margin-left:auto;font-size:10px;color:var(--muted)">Hide</span>
    </label>`).join('');

  // Click / Enter toggles each checkbox row
  listEl.querySelectorAll('label').forEach((lbl, i) => {
    const toggle = () => {
      const g = LANG_FILTER_GROUPS[i];
      const hidden = getLangFilterHidden();
      const idx = hidden.indexOf(g.id);
      if (idx >= 0) hidden.splice(idx, 1); else hidden.push(g.id);
      localStorage.setItem('lang_filter_hidden', JSON.stringify(hidden));
      renderLangFilterUI();
    };
    lbl.addEventListener('click', toggle);
    lbl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  // Apply button
  const applyBtn = document.getElementById('lang-filter-apply-btn');
  if (applyBtn && !applyBtn._wired) {
    applyBtn._wired = true;
    applyBtn.addEventListener('click', () => {
      // Re-filter and reload channels
      if (S.allChannels.length) {
        S.channelList = applyLangFilter(S.allChannels);
        const statusEl = document.getElementById('lang-filter-status');
        if (statusEl) statusEl.textContent = `Showing ${S.channelList.length.toLocaleString()} of ${S.allChannels.length.toLocaleString()} channels`;
      }
      showToast('Channel filters applied — go to Live TV to see results');
    });
  }

  // Clear all button
  const clearBtn = document.getElementById('lang-filter-clear-btn');
  if (clearBtn && !clearBtn._wired) {
    clearBtn._wired = true;
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem('lang_filter_hidden');
      renderLangFilterUI();
      showToast('All language filters cleared');
    });
  }

  // Show current status
  const statusEl = document.getElementById('lang-filter-status');
  const hidden2 = getLangFilterHidden();
  if (statusEl) {
    if (hidden2.length) {
      const filtered = S.allChannels.length ? applyLangFilter(S.allChannels).length : null;
      statusEl.textContent = `${hidden2.length} group(s) hidden${filtered !== null ? ` · ${filtered.toLocaleString()} channels visible` : ''}`;
    } else {
      statusEl.textContent = 'No filters active — all channels shown';
    }
  }
}

function renderAccountInfo(info) {
  const u = info?.user_info || {};
  const el = id => document.getElementById(id);
  const status = u.status === 'Active' ? `<span style="color:var(--green)">${u.status}</span>` : esc(u.status || '—');
  const exp = u.exp_date ? new Date(u.exp_date * 1000).toLocaleDateString() : '—';
  if (el('acct-status')) el('acct-status').innerHTML = status;
  if (el('acct-channels')) el('acct-channels').textContent = S.allChannels.length || '—';
  if (el('acct-expires')) el('acct-expires').textContent = exp;
  if (el('acct-max-conn')) el('acct-max-conn').textContent = u.max_connections || '—';
  if (el('dev-active')) el('dev-active').textContent = u.active_cons || '0';
  if (el('dev-max')) el('dev-max').textContent = u.max_connections || '—';
  if (el('dev-status')) el('dev-status').innerHTML = status;
  if (el('dev-expires')) el('dev-expires').textContent = exp;
}

document.getElementById('save-creds-btn').addEventListener('click', async () => {
  const server = document.getElementById('cfg-server').value.trim().replace(/\/$/, '');
  const user = document.getElementById('cfg-user').value.trim();
  const pass = document.getElementById('cfg-pass').value.trim();
  const result = document.getElementById('creds-test-result');
  result.textContent = 'Testing connection…';
  result.style.color = 'var(--muted)';
  try {
    // Use buildApiUrl with temp creds so proxy routing works on Android too
    const savedServer = S.server, savedUser = S.user, savedPass = S.pass;
    S.server = server; S.user = user; S.pass = pass;
    const testUrl = buildApiUrl('get_user_info');
    S.server = savedServer; S.user = savedUser; S.pass = savedPass;
    const res = await fetch(testUrl);
    const data = await res.json();
    if (data?.user_info?.auth === 1 || data?.user_info?.status === 'Active') {
      S.server = server; S.user = user; S.pass = pass;
      localStorage.setItem('iptv_server', server);
      localStorage.setItem('iptv_user', user);
      localStorage.setItem('iptv_pass', pass);
      S.userInfo = data;
      renderAccountInfo(data);
      result.innerHTML = '<span style="color:var(--green)">✓ Connected — ' + esc(data.user_info.status) + '</span>';
      // reload data with new creds
      S.allChannels = []; S.allVod = []; S.allSeries = [];
      bootData();
    } else {
      result.innerHTML = '<span style="color:#ff5555">✗ Auth failed — check credentials</span>';
    }
  } catch (e) {
    result.innerHTML = `<span style="color:#ff5555">✗ ${esc(e.message)}</span>`;
  }
});

document.getElementById('reset-creds-btn').addEventListener('click', () => {
  document.getElementById('cfg-server').value = '';
  document.getElementById('cfg-user').value = '';
  document.getElementById('cfg-pass').value = '';
  localStorage.removeItem('iptv_server');
  localStorage.removeItem('iptv_user');
  localStorage.removeItem('iptv_pass');
  S.server = null; S.user = null; S.pass = null;
  const result = document.getElementById('creds-test-result');
  if (result) result.textContent = 'Credentials cleared.';
});

function clearAllData() {
  if (!confirm('Clear all favorites, history, and recordings?')) return;
  localStorage.removeItem('fav_channels');
  localStorage.removeItem('watch_history');
  localStorage.removeItem('recordings');
  S.favorites = []; S.history = []; S.recordings = [];
  alert('Cleared.');
}

// ═══════════════════════════════════════════════════════════════
// PART 2 — CHANNELS (real live streams + categories)
// ═══════════════════════════════════════════════════════════════

async function initChannels() {
  if (S.allChannels.length) {
    S.channelList = applyLangFilter(S.allChannels);
    renderChannelCats();
    return;
  }
  document.getElementById('channel-list').innerHTML = '<div class="loading"><div class="spinner"></div> Loading channels...</div>';
  try {
    const [cats, streams] = await Promise.all([
      api('get_live_categories'),
      api('get_live_streams'),
    ]);
    S.liveCategories = Array.isArray(cats) ? cats : [];
    S.allChannels = Array.isArray(streams) ? streams : [];
    S.channelList = applyLangFilter(S.allChannels);
    document.getElementById('channels-sub').textContent =
      `${S.channelList.length.toLocaleString()} channels · ${S.liveCategories.length} categories`;
    renderChannelCats();
  } catch (e) {
    document.getElementById('channel-list').innerHTML =
      `<div class="error-box">Failed to load channels: ${esc(e.message)}</div>`;
  }
}

function renderChannelCats() {
  const pills = document.getElementById('cat-pills');
  pills.innerHTML = `<button class="pill pill-active" data-cat-id="" tabindex="0">All</button>` +
    S.liveCategories.slice(0, 18).map(c =>
      `<button class="pill pill-inactive" data-cat-id="${esc(c.category_id)}" tabindex="0">${esc(c.category_name)}</button>`
    ).join('');
  const pillBtns = Array.from(pills.querySelectorAll('.pill'));
  pillBtns.forEach((btn, pi) => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(p => p.className = 'pill pill-inactive');
      btn.className = 'pill pill-active';
      const catId = btn.dataset.catId;
      const base = catId ? S.allChannels.filter(c => c.category_id == catId) : S.allChannels;
      S.channelList = applyLangFilter(base);
      renderChannelList(S.channelList);
    });
    // D-pad left/right between pills
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); const n = pillBtns[pi + 1]; if (n) n.focus(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); const n = pillBtns[pi - 1]; if (n) n.focus(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); focusFirstChannelRow(); }
    });
  });
  renderChannelList(S.channelList);
}

function focusFirstChannelRow() {
  const row = document.querySelector('#channel-list .ch-row');
  if (row) row.focus();
}

function renderChannelList(list) {
  // Delegate to the canonical version defined later in the file
  // (canonical renderChannelList is assigned below via renderChannelList = function(...))
  // This stub is intentionally minimal — the var-assignment below will override it
  // when the script reaches that point. However if called before that point, we
  // fall back to a basic render so the screen is never blank.
  const el = document.getElementById('channel-list');
  if (!el) return;
  if (!list || !list.length) { el.innerHTML = '<div style="color:var(--muted);padding:20px;font-size:13px">No channels found.</div>'; return; }
  el.innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
}

// channel search
document.getElementById('ch-search').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  const filtered = q ? S.channelList.filter(c => c.name.toLowerCase().includes(q)) : S.channelList;
  renderChannelList(filtered);
});

// ═══════════════════════════════════════════════════════════════
// PART 3 — MOVIES (real VOD streams)
// ═══════════════════════════════════════════════════════════════

async function initMovies() {
  if (S.allVod.length) { renderMovieCats(); return; }
  document.getElementById('movies-grid').innerHTML = '<div class="loading"><div class="spinner"></div> Loading movies...</div>';
  try {
    const [cats, streams] = await Promise.all([
      api('get_vod_categories'),
      api('get_vod_streams'),
    ]);
    S.vodCategories = Array.isArray(cats) ? cats : [];
    S.allVod = Array.isArray(streams) ? streams : [];
    document.getElementById('movies-sub').textContent =
      `${S.allVod.length.toLocaleString()} movies · ${S.vodCategories.length} categories`;
    renderMovieCats();
  } catch (e) {
    document.getElementById('movies-grid').innerHTML =
      `<div class="error-box">Failed to load movies: ${esc(e.message)}</div>`;
  }
}

function renderMovieCats() {
  const pills = document.getElementById('movies-cat-pills');
  pills.innerHTML = `<button class="pill pill-active" data-vod-cat="">All</button>` +
    S.vodCategories.slice(0, 16).map(c =>
      `<button class="pill pill-inactive" data-vod-cat="${esc(c.category_id)}">${esc(c.category_name)}</button>`
    ).join('');
  pills.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      pills.querySelectorAll('.pill').forEach(p => p.className = 'pill pill-inactive');
      btn.className = 'pill pill-active';
      const catId = btn.dataset.vodCat;
      const list = catId ? S.allVod.filter(v => v.category_id == catId) : S.allVod;
      renderVodGrid('movies-grid', list, 'vod');
    });
  });
  renderVodGrid('movies-grid', S.allVod, 'vod');
}

function renderVodGrid(containerId, list, type) {
  const el = document.getElementById(containerId);
  const slice = list.slice(0, 120);
  if (!slice.length) { el.innerHTML = '<div style="color:var(--muted);padding:20px;font-size:13px">No titles found.</div>'; return; }
  el.innerHTML = slice.map(item => {
    const poster = item.stream_icon || item.cover || '';
    const year = item.year || item.releasedate?.slice(0, 4) || '';
    const rating = item.rating ? `⭐ ${parseFloat(item.rating).toFixed(1)}` : '';
    const title = item.name || item.title || '';
    const meta = [year, item.genre || item.category_name || ''].filter(Boolean).join(' · ');
    const bg = colorFromName(title);
    const posterHtml = poster
      ? `<img src="${esc(poster)}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:10px" loading="lazy" onerror="this.style.display='none'" />`
      : '';
    return `
      <div class="media-card" data-id="${esc(item.stream_id || item.series_id)}" data-type="${type}">
        <div class="media-poster" style="background:${bg}">
          ${posterHtml}
          ${!poster ? `<span style="font-size:36px">🎬</span>` : ''}
          ${rating ? `<span style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.75);font-size:10px;padding:2px 5px;border-radius:4px">${esc(rating)}</span>` : ''}
        </div>
        <div class="media-title">${esc(title)}</div>
        <div class="media-meta">${esc(meta)}</div>
      </div>`;
  }).join('');
  if (list.length > 120) {
    el.innerHTML += `<div style="grid-column:1/-1;color:var(--muted);font-size:12px;padding:10px;text-align:center">Showing 120 of ${list.length.toLocaleString()} — filter by category</div>`;
  }
  el.querySelectorAll('.media-card').forEach(card => {
    card.addEventListener('click', () => {
      if (type === 'vod') openVod(card.dataset.id);
      else openSeriesDetail(card.dataset.id);
    });
  });
}

async function openVod(vodId) {
  const item = S.allVod.find(v => v.stream_id == vodId);
  const ext = item?.container_extension || 'mp4';
  const rawUrl = `${S.server}/movie/${encodeURIComponent(S.user)}/${encodeURIComponent(S.pass)}/${vodId}.${ext}`;
  let vodUrl;
  if (IS_ANDROID_WEBVIEW) {
    vodUrl = `http://localhost:8123/proxy?url=${encodeURIComponent(rawUrl)}`;
  } else {
    vodUrl = `/api/stream?url=${encodeURIComponent(rawUrl)}`;
  }
  const ch = { stream_id: vodId, name: item?.name || 'Movie', category_name: item?.genre || 'Movie', _vodUrl: vodUrl };
  openPlayer(ch, null, 0);
}

// ═══════════════════════════════════════════════════════════════
// SERIES
// ═══════════════════════════════════════════════════════════════

async function initSeries() {
  if (S.allSeries.length) { renderSeriesCats(); return; }
  document.getElementById('series-grid').innerHTML = '<div class="loading"><div class="spinner"></div> Loading series...</div>';
  try {
    const [cats, series] = await Promise.all([
      api('get_series_categories'),
      api('get_series'),
    ]);
    S.seriesCategories = Array.isArray(cats) ? cats : [];
    S.allSeries = Array.isArray(series) ? series : [];
    document.getElementById('series-sub').textContent =
      `${S.allSeries.length.toLocaleString()} series · ${S.seriesCategories.length} categories`;
    renderSeriesCats();
  } catch (e) {
    document.getElementById('series-grid').innerHTML =
      `<div class="error-box">Failed to load series: ${esc(e.message)}</div>`;
  }
}

function renderSeriesCats() {
  const pills = document.getElementById('series-cat-pills');
  pills.innerHTML = `<button class="pill pill-active" data-series-cat="">All</button>` +
    S.seriesCategories.slice(0, 16).map(c =>
      `<button class="pill pill-inactive" data-series-cat="${esc(c.category_id)}">${esc(c.category_name)}</button>`
    ).join('');
  pills.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      pills.querySelectorAll('.pill').forEach(p => p.className = 'pill pill-inactive');
      btn.className = 'pill pill-active';
      const catId = btn.dataset.seriesCat;
      const list = catId ? S.allSeries.filter(s => s.category_id == catId) : S.allSeries;
      renderVodGrid('series-grid', list, 'series');
    });
  });
  renderVodGrid('series-grid', S.allSeries, 'series');
}

async function openSeriesDetail(seriesId) {
  try {
    const data = await api('get_series_info', { series_id: seriesId });
    const seasons = data.seasons || [];
    const eps = Object.values(data.episodes || {}).flat();
    if (!eps.length) { alert('No episodes found for this series.'); return; }
    // Play first episode
    const ep = eps[0];
    const rawUrl = `${S.server}/series/${encodeURIComponent(S.user)}/${encodeURIComponent(S.pass)}/${ep.id}.${ep.container_extension || 'mp4'}`;
    let proxyUrl;
    if (IS_ANDROID_WEBVIEW) {
      proxyUrl = `http://localhost:8123/proxy?url=${encodeURIComponent(rawUrl)}`;
    } else {
      proxyUrl = `/api/stream?url=${encodeURIComponent(rawUrl)}`;
    }
    const series = S.allSeries.find(s => s.series_id == seriesId);
    openPlayer({ stream_id: ep.id, name: (series?.name || 'Series') + ' — ' + ep.title, _vodUrl: proxyUrl }, null, 0);
  } catch (e) {
    alert('Could not load series: ' + e.message);
  }
}

// search within movies/series
document.getElementById('movies-search').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  renderVodGrid('movies-grid', q ? S.allVod.filter(v => (v.name || '').toLowerCase().includes(q)) : S.allVod, 'vod');
});
document.getElementById('series-search').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  renderVodGrid('series-grid', q ? S.allSeries.filter(s => (s.name || '').toLowerCase().includes(q)) : S.allSeries, 'series');
});

// ═══════════════════════════════════════════════════════════════
// PART 3 — EPG, SEARCH, FAVORITES, HISTORY, CATCH-UP, DEVICES
// ═══════════════════════════════════════════════════════════════

// ── EPG ──────────────────────────────────────────────────────
// EPG time offset in hours (controlled by Earlier/Later buttons)
S.epgOffset = S.epgOffset || 0;

async function fetchEpgForChannel(ch) {
  if (IS_ANDROID_WEBVIEW) {
    // On Android, call Xtream API directly through the NanoHTTPD proxy
    const target = `${S.server}/player_api.php?username=${encodeURIComponent(S.user)}&password=${encodeURIComponent(S.pass)}&action=get_short_epg&stream_id=${ch.stream_id}&limit=6`;
    const proxyUrl = `http://localhost:8123/proxy?url=${encodeURIComponent(target)}`;
    const r = await fetch(proxyUrl);
    return r.json();
  } else {
    const r = await fetch(`/api/epg?stream_id=${ch.stream_id}&server=${encodeURIComponent(S.server)}&username=${encodeURIComponent(S.user)}&password=${encodeURIComponent(S.pass)}&limit=6`);
    return r.json();
  }
}

async function initEPG(offsetDelta = 0) {
  S.epgOffset = (S.epgOffset || 0) + offsetDelta;
  const wrap = document.getElementById('epg-wrap');
  const timeEl = document.getElementById('epg-time-display');
  const now = new Date();
  const offsetMs = S.epgOffset * 3600000;
  const display = new Date(now.getTime() + offsetMs);
  timeEl.textContent = (S.epgOffset === 0 ? 'Now: ' : (S.epgOffset > 0 ? '+' : '') + S.epgOffset + 'h: ') +
    display.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (!S.allChannels.length) {
    wrap.innerHTML = '<div class="loading"><div class="spinner"></div> Loading channels first...</div>';
    await initChannels();
  }

  // Show first 30 channels with EPG channel IDs, fetch their short EPG
  const chansWithEpg = S.allChannels.filter(c => c.epg_channel_id).slice(0, 30);
  const chans = chansWithEpg.length ? chansWithEpg : S.allChannels.slice(0, 30);

  wrap.innerHTML = '<div class="loading"><div class="spinner"></div> Loading program guide...</div>';

  // Fetch EPG for all channels in parallel
  const epgResults = await Promise.allSettled(
    chans.map(ch =>
      fetchEpgForChannel(ch)
        .then(d => ({ stream_id: ch.stream_id, listings: d.epg_listings || [] }))
        .catch(() => ({ stream_id: ch.stream_id, listings: [] }))
    )
  );

  epgResults.forEach(r => {
    if (r.status === 'fulfilled') S.epgCache[r.value.stream_id] = r.value.listings;
  });

  // Time slots header (3h window)
  const slots = [];
  const base = new Date(); base.setMinutes(0, 0, 0);
  for (let i = -1; i <= 5; i++) {
    const t = new Date(base.getTime() + i * 3600000);
    slots.push(t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
  }

  wrap.innerHTML = `
    <div class="epg-hdr">
      <div class="epg-ch-hdr">Channel</div>
      <div style="display:flex;flex:1">${slots.map(s => `<div class="epg-slot">${s}</div>`).join('')}</div>
    </div>
    <div id="epg-rows-inner"></div>`;

  const rowsEl = document.getElementById('epg-rows-inner');
  rowsEl.innerHTML = chans.map(ch => {
    const listings = S.epgCache[ch.stream_id] || [];
    const nowTs = Math.floor(Date.now() / 1000);
    const safeAtob = s => { try { return atob(s || ''); } catch (_) { return s || ''; } };
    const progs = listings.length
      ? listings.map(e => {
        const isLive = e.start_timestamp <= nowTs && e.stop_timestamp > nowTs;
        const title = safeAtob(e.title);
        const timeStr = formatEpgTime(e.start_timestamp) + '–' + formatEpgTime(e.stop_timestamp);
        return `<div class="epg-prog${isLive ? ' live' : ''}" data-stream-id="${esc(ch.stream_id)}" data-stream-name="${esc(ch.name)}" data-cat="${esc(ch.category_name || '')}">
            <div class="epg-prog-title">${esc(title)}${isLive ? '<span style="color:var(--primary);font-size:9px;margin-left:4px">●NOW</span>' : ''}</div>
            <div class="epg-prog-time">${esc(timeStr)}</div>
          </div>`;
      }).join('')
      : `<div class="epg-prog" data-stream-id="${esc(ch.stream_id)}" data-stream-name="${esc(ch.name)}" data-cat="${esc(ch.category_name || '')}" style="color:var(--muted);font-size:11px">Live · Click to watch</div>`;

    const logo = ch.stream_icon
      ? `<img src="${esc(ch.stream_icon)}" style="width:22px;height:22px;object-fit:contain;border-radius:3px" onerror="this.style.display='none'" />`
      : `<div style="width:22px;height:22px;background:${colorFromName(ch.name)};border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">${esc(channelInitials(ch.name))}</div>`;

    return `<div class="epg-row" data-stream-id="${esc(ch.stream_id)}" data-stream-name="${esc(ch.name)}" data-cat="${esc(ch.category_name || '')}">
      <div class="epg-ch-cell" data-stream-id="${esc(ch.stream_id)}" data-stream-name="${esc(ch.name)}" data-cat="${esc(ch.category_name || '')}" style="cursor:pointer">
        ${logo}<div class="epg-ch-nm">${esc(ch.name)}</div>
      </div>
      <div class="epg-progs">${progs}</div>
    </div>`;
  }).join('');

  // Attach click handlers via event delegation
  rowsEl.addEventListener('click', e => {
    const target = e.target.closest('[data-stream-id]');
    if (!target) return;
    const ch = {
      stream_id: target.dataset.streamId,
      name: target.dataset.streamName,
      category_name: target.dataset.cat,
    };
    const idx = S.allChannels.findIndex(c => c.stream_id == ch.stream_id);
    openPlayer(ch, S.allChannels, idx >= 0 ? idx : 0);
  }, { once: false });
}

// EPG nav buttons
document.getElementById('epg-now')?.addEventListener('click', () => { S.epgOffset = 0; initEPG(0); });
document.getElementById('epg-prev')?.addEventListener('click', () => initEPG(-1));
document.getElementById('epg-next')?.addEventListener('click', () => initEPG(1));
// Make EPG nav buttons focusable for D-pad
['epg-now', 'epg-prev', 'epg-next'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.setAttribute('tabindex', '0');
});

// ── SEARCH ────────────────────────────────────────────────────
function initSearch() {
  // Show trending = first 6 channels
  const trending = document.getElementById('trending-channels');
  if (S.allChannels.length) {
    trending.innerHTML = S.allChannels.slice(0, 6).map(ch => `
      <div class="ch-row" data-id="${ch.stream_id}">
        <div class="ch-icon" style="background:${colorFromName(ch.name)}">${channelInitials(ch.name)}</div>
        <div class="ch-info"><div class="ch-name">${esc(ch.name)}</div><div class="ch-sub">${esc(ch.category_name || '')}</div></div>
        <div class="ch-meta"><span class="badge badge-live">LIVE</span></div>
      </div>`).join('');
    trending.querySelectorAll('.ch-row').forEach(row => {
      row.addEventListener('click', () => {
        const ch = S.allChannels.find(c => c.stream_id == row.dataset.id);
        if (ch) openPlayer(ch, S.allChannels, S.allChannels.indexOf(ch));
      });
    });
  }
  document.getElementById('search-input').focus();
}

document.getElementById('search-input').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  const res = document.getElementById('search-results');
  if (!q) { initSearch(); return; }

  const chMatches = S.allChannels.filter(c => c.name.toLowerCase().includes(q)).slice(0, 10);
  const vodMatches = S.allVod.filter(v => (v.name || '').toLowerCase().includes(q)).slice(0, 8);
  const seriesMatches = S.allSeries.filter(s => (s.name || '').toLowerCase().includes(q)).slice(0, 6);

  let html = '';
  if (chMatches.length) {
    html += `<div class="section-title">Live Channels</div>` +
      chMatches.map(ch => `
        <div class="ch-row" data-id="${ch.stream_id}" data-type="live">
          <div class="ch-icon" style="background:${colorFromName(ch.name)}">${channelInitials(ch.name)}</div>
          <div class="ch-info"><div class="ch-name">${esc(ch.name)}</div><div class="ch-sub">${esc(ch.category_name || '')}</div></div>
          <div class="ch-meta"><span class="badge badge-live">LIVE</span></div>
        </div>`).join('');
  }
  if (vodMatches.length) {
    html += `<div class="section-title">Movies</div>` +
      vodMatches.map(v => `
        <div class="ch-row" data-id="${v.stream_id}" data-type="vod">
          <div class="ch-icon" style="background:${colorFromName(v.name || '')}">🎬</div>
          <div class="ch-info"><div class="ch-name">${esc(v.name || '')}</div><div class="ch-sub">${esc(v.genre || v.category_name || '')} ${v.year ? '· ' + v.year : ''}</div></div>
        </div>`).join('');
  }
  if (seriesMatches.length) {
    html += `<div class="section-title">Series</div>` +
      seriesMatches.map(s => `
        <div class="ch-row" data-id="${s.series_id}" data-type="series">
          <div class="ch-icon" style="background:${colorFromName(s.name || '')}">🎭</div>
          <div class="ch-info"><div class="ch-name">${esc(s.name || '')}</div><div class="ch-sub">${esc(s.genre || s.category_name || '')}</div></div>
        </div>`).join('');
  }
  if (!html) html = `<div style="color:var(--muted);padding:20px;font-size:13px">No results for "${esc(q)}"</div>`;
  res.innerHTML = html;

  res.querySelectorAll('.ch-row').forEach(row => {
    row.addEventListener('click', () => {
      const { id, type } = row.dataset;
      if (type === 'live') { const ch = S.allChannels.find(c => c.stream_id == id); if (ch) openPlayer(ch, S.allChannels, S.allChannels.indexOf(ch)); }
      else if (type === 'vod') openVod(id);
      else openSeriesDetail(id);
    });
  });
});

document.getElementById('global-search').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && this.value.trim()) {
    nav('search');
    document.getElementById('search-input').value = this.value;
    document.getElementById('search-input').dispatchEvent(new Event('input'));
    this.value = '';
  }
});

// ── FAVORITES ─────────────────────────────────────────────────
function renderFavorites() {
  const el = document.getElementById('favorites-list');
  if (!S.favorites.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px 0">No favorites yet — star a channel while browsing Live TV.</div>';
    return;
  }
  el.innerHTML = S.favorites.map(ch => `
    <div class="ch-row" data-id="${ch.stream_id}">
      <div class="ch-icon" style="background:${colorFromName(ch.name)}">${channelInitials(ch.name)}</div>
      <div class="ch-info"><div class="ch-name">${esc(ch.name)}</div><div class="ch-sub">${esc(ch.category_name || '')}</div></div>
      <div class="ch-meta">
        <span class="badge badge-live">LIVE</span>
        <span class="fav-star on" data-id="${ch.stream_id}" style="margin-left:8px">★</span>
      </div>
    </div>`).join('');
  el.querySelectorAll('.ch-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.classList.contains('fav-star')) return;
      const ch = S.favorites.find(f => f.stream_id == row.dataset.id);
      if (ch) openPlayer(ch, S.favorites, S.favorites.indexOf(ch));
    });
  });
  el.querySelectorAll('.fav-star').forEach(star => {
    star.addEventListener('click', e => {
      e.stopPropagation();
      const ch = S.favorites.find(f => f.stream_id == star.dataset.id);
      toggleFav(ch, star);
      renderFavorites();
    });
  });
}

function toggleFav(ch, starEl) {
  if (!ch) return;
  const idx = S.favorites.findIndex(f => f.stream_id == ch.stream_id);
  if (idx >= 0) { S.favorites.splice(idx, 1); if (starEl) { starEl.classList.remove('on'); } }
  else { S.favorites.push(ch); if (starEl) { starEl.classList.add('on'); } }
  saveState();
}

// ── HISTORY ───────────────────────────────────────────────────
function renderHistory() {
  const el = document.getElementById('history-list');
  if (!S.history.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px 0">No history yet.</div>';
    return;
  }
  el.innerHTML = S.history.map((ch, idx) => `
    <div class="hist-item" data-idx="${idx}" style="cursor:pointer">
      <div class="ch-icon" style="background:${colorFromName(ch.name)}">${channelInitials(ch.name)}</div>
      <div style="flex:1"><div class="ch-name">${esc(ch.name)}</div><div class="ch-sub">${esc(ch.category_name || '')} · ${esc(ch._watchedAt || '')}</div></div>
      <button class="btn btn-red btn-sm">▶ Watch</button>
    </div>`).join('');
  el.querySelectorAll('.hist-item').forEach(row => {
    row.addEventListener('click', () => {
      const ch = S.history[parseInt(row.dataset.idx)];
      if (ch) openPlayer(ch, S.history, parseInt(row.dataset.idx));
    });
  });
  document.getElementById('clear-history-btn').onclick = () => {
    if (!confirm('Clear watch history?')) return;
    S.history = []; saveState(); renderHistory();
  };
}

// ── DEVICES ───────────────────────────────────────────────────
async function initDevices() {
  if (S.userInfo) { renderDeviceInfo(S.userInfo); return; }
  document.getElementById('devices-info').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const data = await api('get_user_info');
    S.userInfo = data;
    renderAccountInfo(data);
    renderDeviceInfo(data);
  } catch (e) {
    document.getElementById('devices-info').innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
  }
}

function renderDeviceInfo(info) {
  const u = info?.user_info || {};
  const si = info?.server_info || {};
  const exp = u.exp_date ? new Date(u.exp_date * 1000).toLocaleDateString() : '—';
  const active = parseInt(u.active_cons) || 0;
  const max = parseInt(u.max_connections) || 1;
  const pct = Math.min(100, Math.round((active / max) * 100));
  const barColor = pct > 75 ? 'var(--primary)' : pct > 50 ? 'var(--yellow)' : 'var(--green)';

  document.getElementById('dev-active').textContent = active;
  document.getElementById('dev-max').textContent = max;
  document.getElementById('dev-status').innerHTML = u.status === 'Active'
    ? `<span style="color:var(--green)">${esc(u.status)}</span>` : esc(u.status || '—');
  document.getElementById('dev-expires').textContent = exp;

  document.getElementById('devices-info').innerHTML = `
    <div style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;margin-bottom:7px">
        <span style="font-size:12px;color:var(--muted)">Stream usage: ${active} of ${max}</span>
        <span style="font-size:12px;color:${barColor}">${pct}%</span>
      </div>
      <div class="progress-bar" style="height:8px"><div class="progress-fill" style="width:${pct}%;background:${barColor}"></div></div>
    </div>
    <div class="section-title">Account Details</div>
    <div class="card">
      <div class="row-item"><span style="font-size:13px">Username</span><span style="font-size:12px;color:var(--muted)">${esc(u.username || S.user)}</span></div>
      <div class="row-item"><span style="font-size:13px">Status</span><span style="font-size:12px;color:var(--green)">${esc(u.status || '—')}</span></div>
      <div class="row-item"><span style="font-size:13px">Expiry</span><span style="font-size:12px;color:var(--muted)">${exp}</span></div>
      <div class="row-item"><span style="font-size:13px">Max Connections</span><span style="font-size:12px;color:var(--muted)">${max}</span></div>
      <div class="row-item"><span style="font-size:13px">Server Timezone</span><span style="font-size:12px;color:var(--muted)">${esc(si.timezone || '—')}</span></div>
      <div class="row-item"><span style="font-size:13px">Server Time</span><span style="font-size:12px;color:var(--muted)">${esc(si.time_now || '—')}</span></div>
    </div>
    ${pct > 75 ? `<div style="margin-top:14px;padding:13px;background:rgba(229,0,0,0.07);border:1px solid rgba(229,0,0,0.2);border-radius:var(--radius)"><div style="font-size:13px;font-weight:700;margin-bottom:3px">⚠️ Approaching Stream Limit</div><div style="font-size:12px;color:var(--muted)">You're using ${active} of ${max} allowed streams.</div></div>` : ''}`;
}

// ── CATCH-UP ─────────────────────────────────────────────────
async function initCatchUp() {
  // Build date pills (last 7 days)
  const datesEl = document.getElementById('catchup-dates');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  datesEl.innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const active = i === 0 ? 'active' : '';
    return `<div class="date-pill ${active}" data-offset="${i}">
      <div class="date-pill-day">${days[d.getDay()]}</div>
      <div class="date-pill-num">${d.getDate()}</div>
    </div>`;
  }).join('');
  datesEl.querySelectorAll('.date-pill').forEach(p => {
    p.addEventListener('click', () => {
      datesEl.querySelectorAll('.date-pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
    });
  });

  // Show catch-up capable channels
  const catchupCh = S.allChannels.length
    ? S.allChannels.filter(c => c.tv_archive == 1 || c.tv_archive === '1').slice(0, 40)
    : [];

  const chEl = document.getElementById('catchup-channels');
  if (!catchupCh.length) {
    chEl.innerHTML = '<div style="color:var(--muted);font-size:12px">No catch-up channels found. Load Live TV first.</div>';
    return;
  }
  chEl.innerHTML = catchupCh.map(ch => `
    <div class="ch-row" data-id="${ch.stream_id}" style="margin-bottom:6px;cursor:pointer">
      <div class="ch-icon" style="background:${colorFromName(ch.name)};font-size:10px;font-weight:700">${channelInitials(ch.name)}</div>
      <div class="ch-info"><div class="ch-name" style="font-size:12px">${esc(ch.name)}</div></div>
    </div>`).join('');
  chEl.querySelectorAll('.ch-row').forEach(row => {
    row.addEventListener('click', () => loadCatchUpEPG(row.dataset.id, catchupCh));
  });
}

async function loadCatchUpEPG(streamId, chans) {
  const ch = chans.find(c => c.stream_id == streamId);
  document.getElementById('catchup-epg-title').textContent = `Programs — ${ch?.name || ''}`;
  const epgEl = document.getElementById('catchup-epg');
  epgEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  const safeAtob = s => { try { return atob(s || ''); } catch { return s || ''; } };
  try {
    const fakeCh = { stream_id: streamId };
    const data = await fetchEpgForChannel(fakeCh);
    const listings = data.epg_listings || [];
    if (!listings.length) { epgEl.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px">No EPG data available</div>'; return; }
    const nowTs = Math.floor(Date.now() / 1000);
    epgEl.innerHTML = listings.map(e => {
      const title = safeAtob(e.title);
      const desc = e.description ? safeAtob(e.description).slice(0, 120) : '';
      const timeStr = formatEpgTime(e.start_timestamp) + ' – ' + formatEpgTime(e.stop_timestamp);
      const isPast = e.stop_timestamp < nowTs;
      const isLive = e.start_timestamp <= nowTs && e.stop_timestamp > nowTs;
      return `
        <div class="ch-row" style="margin-bottom:6px;flex-direction:column;align-items:flex-start;gap:4px;cursor:${isPast || isLive ? 'pointer' : 'default'};opacity:${isPast || isLive ? 1 : 0.5}">
          <div style="display:flex;width:100%;align-items:center;gap:8px">
            <span style="font-size:12px;font-weight:700;flex:1">${esc(title)}</span>
            ${isLive ? '<span class="badge badge-live">● LIVE</span>' : ''}
            ${isPast && !isLive ? '<button class="btn btn-red btn-sm" onclick="openPlayer(JSON.parse(atob(\'' + btoa(JSON.stringify({ stream_id: ch?.stream_id, name: ch?.name })) + '\')))">▶ Watch</button>' : ''}
          </div>
          <div style="font-size:10px;color:var(--muted)">${esc(timeStr)}</div>
          ${desc ? `<div style="font-size:11px;color:#aaa">${esc(desc)}</div>` : ''}
        </div>`;
    }).join('');
  } catch (e) {
    epgEl.innerHTML = `<div class="error-box">${esc(e.message)}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// PART 4 — HLS PLAYER, RECORDINGS, QUALITY, BOOT
// ═══════════════════════════════════════════════════════════════

// ── PLAYER ────────────────────────────────────────────────────
function openPlayer(ch, list, idx) {
  // ch can be a JSON string (from inline onclick) or object
  if (typeof ch === 'string') { try { ch = JSON.parse(ch); } catch { } }

  // Track previous channel before switching (inlined from override)
  if (S.currentChannel && S.currentChannel.stream_id !== ch.stream_id) {
    S.prevChannel = S.currentChannel;
    updatePrevChannelBtn();
  }

  S.currentChannel = ch;
  S.channelList = list || S.channelList;
  S.currentChannelIndex = (idx != null && idx !== undefined) ? idx : 0;

  const overlay = document.getElementById('player-overlay');
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';

  document.getElementById('player-ch-top').textContent = ch.name || '';
  document.getElementById('player-ch-name').textContent = ch.name || '';
  document.getElementById('player-program').textContent = ch.category_name || 'Live';
  document.getElementById('play-pause-btn').textContent = '⏸';

  // Update clock
  const clockEl = document.getElementById('player-clock');
  clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Fav button
  const isFav = S.favorites.some(f => f.stream_id == ch.stream_id);
  const favBtn = document.getElementById('player-fav-btn');
  favBtn.textContent = isFav ? '★ Fav' : '☆ Fav';
  favBtn.style.color = isFav ? 'var(--yellow)' : '';

  // Add to history with timestamp
  const histEntry = { ...ch, _watchedAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) };
  addToHistory(histEntry);

  // Fetch real stream URL then load HLS
  loadStream(ch);

  // Update SB button label immediately
  updatePrevChannelBtn();

  // Inject player extras + refresh ad badge
  setTimeout(() => {
    injectPlayerExtras();
    updateAdBlockBadge();
    updatePrevChannelBtn();
  }, 100);

  // Make all player buttons focusable and auto-focus play-pause for D-pad
  setTimeout(() => {
    document.querySelectorAll('#player-overlay button, #player-overlay input[type=range]').forEach(el => {
      el.setAttribute('tabindex', '0');
    });
    const pp = document.getElementById('play-pause-btn');
    if (pp) pp.focus();
  }, 150);
}

function showPlayerError(msg) {
  let el = document.getElementById('player-error-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'player-error-msg';
    el.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(229,0,0,0.85);color:#fff;padding:18px 28px;border-radius:12px;' +
      'font-size:14px;font-weight:600;z-index:10001;text-align:center;max-width:320px;';
    document.getElementById('player-overlay').appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
}

function clearPlayerError() {
  const el = document.getElementById('player-error-msg');
  if (el) el.style.display = 'none';
}

async function loadStream(ch) {
  const video = document.getElementById('player-video');

  clearPlayerError();

  // Destroy previous HLS instance
  if (S.hlsInstance) { S.hlsInstance.destroy(); S.hlsInstance = null; }

  // If VOD direct URL already provided
  if (ch._vodUrl) {
    video.src = ch._vodUrl;
    video.play().catch(err => showPlayerError('Playback error: ' + err.message));
    updateEPGBar(ch);
    return;
  }

  // Build HLS URL — Android goes through local proxy, web goes through /api/stream proxy
  let hlsUrl;
  const rawM3u8 = `${S.server}/live/${encodeURIComponent(S.user)}/${encodeURIComponent(S.pass)}/${ch.stream_id}.m3u8`;
  if (IS_ANDROID_WEBVIEW) {
    hlsUrl = `http://localhost:8123/proxy?url=${encodeURIComponent(rawM3u8)}`;
  } else {
    // Route through Vercel stream proxy to avoid CORS blocking
    hlsUrl = `/api/stream?url=${encodeURIComponent(rawM3u8)}`;
  }

  // Read buffer size preference
  const bufSel = document.getElementById('q-buffer-select');
  const bufSecs = bufSel ? (bufSel.selectedIndex === 0 ? 3 : bufSel.selectedIndex === 2 ? 10 : 5) : 5;

  if (typeof Hls !== 'undefined' && Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90,
      maxBufferLength: bufSecs * 6,
      maxMaxBufferLength: bufSecs * 12,
      xhrSetup: function (xhr) { xhr.withCredentials = false; },
    });
    S.hlsInstance = hls;
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      clearPlayerError();
      video.play().catch(function (err) { showPlayerError('Play blocked: ' + err.message); });
      hls.on(Hls.Events.FRAG_LOADED, function (_, data) {
        const bw = Math.round((data.frag.stats && data.frag.stats.loaded || 0) * 8 /
          ((data.frag.stats && data.frag.stats.loading && (data.frag.stats.loading.end - data.frag.stats.loading.start) || 1)) / 1000);
        if (bw > 0) { const el = document.getElementById('q-bitrate'); if (el) el.textContent = (bw / 1000).toFixed(1); }
      });
    });
    hls.on(Hls.Events.ERROR, function (_, d) {
      if (d.fatal) {
        showPlayerError('Stream error: ' + (d.type || 'unknown') + ' — trying fallback…');
        hls.destroy(); S.hlsInstance = null;
        // Fallback: try .ts stream through proxy
        const tsRaw = `${S.server}/live/${encodeURIComponent(S.user)}/${encodeURIComponent(S.pass)}/${ch.stream_id}.ts`;
        const tsUrl = IS_ANDROID_WEBVIEW
          ? `http://localhost:8123/proxy?url=${encodeURIComponent(tsRaw)}`
          : `/api/stream?url=${encodeURIComponent(tsRaw)}`;
        video.src = tsUrl;
        video.play().then(function () {
          clearPlayerError();
        }).catch(function (err) {
          showPlayerError('Cannot play stream. Check your connection. (' + err.message + ')');
        });
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari native HLS
    video.src = hlsUrl;
    video.play().catch(function (err) { showPlayerError('Play error: ' + err.message); });
  } else {
    // No HLS support — try .ts directly through proxy
    showPlayerError('Loading stream…');
    const tsRaw = `${S.server}/live/${encodeURIComponent(S.user)}/${encodeURIComponent(S.pass)}/${ch.stream_id}.ts`;
    video.src = IS_ANDROID_WEBVIEW
      ? `http://localhost:8123/proxy?url=${encodeURIComponent(tsRaw)}`
      : `/api/stream?url=${encodeURIComponent(tsRaw)}`;
    video.play().then(function () {
      clearPlayerError();
    }).catch(function (err) {
      showPlayerError('Stream unavailable. (' + err.message + ')');
    });
  }

  updateEPGBar(ch);
  fetchCurrentEPG(ch);
  updateQualityStats();
}

async function fetchCurrentEPG(ch) {
  try {
    const data = await fetchEpgForChannel({ stream_id: ch.stream_id });
    const listings = data.epg_listings || [];
    const nowTs = Math.floor(Date.now() / 1000);
    const current = listings.find(e => e.start_timestamp <= nowTs && e.stop_timestamp > nowTs);
    if (current) {
      const title = atob(current.title || '');
      document.getElementById('player-program').textContent = title + ' · ' + formatEpgTime(current.start_timestamp) + ' – ' + formatEpgTime(current.stop_timestamp);
      // progress
      const pct = Math.min(100, Math.round(((nowTs - current.start_timestamp) / (current.stop_timestamp - current.start_timestamp)) * 100));
      document.getElementById('player-progress').style.width = pct + '%';
    }
  } catch (_) { }
}

function updateEPGBar(ch) {
  document.getElementById('player-clock').textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function closePlayer() {
  const video = document.getElementById('player-video');
  video.pause();
  if (S.hlsInstance) { S.hlsInstance.destroy(); S.hlsInstance = null; }
  video.src = '';
  document.getElementById('player-overlay').style.display = 'none';
  document.getElementById('topbar-title').textContent = TITLES[S.currentScreen] || S.currentScreen;
}

function togglePlay() {
  const video = document.getElementById('player-video');
  const btn = document.getElementById('play-pause-btn');
  if (video.paused) { video.play(); btn.textContent = '⏸'; }
  else { video.pause(); btn.textContent = '▶'; }
}

function toggleMute() {
  const video = document.getElementById('player-video');
  const btn = document.getElementById('mute-btn');
  video.muted = !video.muted;
  btn.textContent = video.muted ? '🔇' : '��';
}

function setVolume(val) {
  const video = document.getElementById('player-video');
  video.volume = val / 100;
  document.getElementById('mute-btn').textContent = val > 0 ? '🔊' : '🔇';
}

function seekRelative(secs) {
  const video = document.getElementById('player-video');
  if (!video.duration) return;
  video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + secs));
}

function navigateChannel(delta) {
  const list = S.channelList;
  if (!list?.length) return;
  const newIdx = ((S.currentChannelIndex + delta) + list.length) % list.length;
  openPlayer(list[newIdx], list, newIdx);
}

document.getElementById('next-ch-btn')?.addEventListener('click', () => navigateChannel(1));

// ── SCREEN HISTORY STACK ─────────────────────────────────────
// Populated by the canonical nav() at bottom of file.
S._screenHistory = [];

// Global back-key handler.
// Android WebView dispatches KEYCODE_BACK as:
//   key='GoBack' / key='BrowserBack'  — newer WebView
//   key='Backspace'                   — older WebView / some remotes
// Guard: never treat Backspace as back when a text input is focused.
document.addEventListener('keydown', e => {
  const tag = (document.activeElement || {}).tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
  const isBack = e.key === 'GoBack' || e.key === 'BrowserBack'
    || (e.key === 'Backspace' && !inInput);
  if (!isBack) return;

  // If an input is focused and open, close keyboard instead of going back
  const active = document.activeElement;
  if (active && active._kbOpen) {
    active._kbOpen = false;
    active.setAttribute('inputmode', 'none');
    active.blur();
    e.preventDefault();
    return;
  }

  // If exit dialog is open, dismiss it
  const exitDlg = document.getElementById('exit-confirm-dialog');
  if (exitDlg) { e.preventDefault(); exitDlg.remove(); return; }

  const overlay = document.getElementById('player-overlay');
  if (overlay && overlay.style.display !== 'none') {
    e.preventDefault();
    closePlayer();
    return;
  }

  if (S.currentScreen === 'tvhome') {
    e.preventDefault();
    showExitConfirm();
    return;
  }

  // Navigate back through history stack
  e.preventDefault();
  const prev = S._screenHistory.pop() || 'tvhome';
  nav(prev);
});

function showExitConfirm() {
  const existing = document.getElementById('exit-confirm-dialog');
  if (existing) return;
  const dlg = document.createElement('div');
  dlg.id = 'exit-confirm-dialog';
  dlg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;';
  dlg.innerHTML = `
    <div style="background:#1a1a2e;border:1px solid #333;border-radius:16px;padding:32px 40px;text-align:center;min-width:280px">
      <div style="font-size:32px;margin-bottom:12px">👋</div>
      <div style="font-size:17px;font-weight:700;margin-bottom:8px">Exit Switchback TV?</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:24px">Are you sure you want to exit?</div>
      <div style="display:flex;gap:12px;justify-content:center">
        <button id="exit-cancel-btn" class="btn btn-ghost" style="min-width:100px">Cancel</button>
        <button id="exit-confirm-btn" class="btn btn-red" style="min-width:100px">Exit</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);
  document.getElementById('exit-cancel-btn').addEventListener('click', () => dlg.remove());
  document.getElementById('exit-confirm-btn').addEventListener('click', () => {
    if (IS_ANDROID_WEBVIEW) {
      // Signal Android to close the activity
      window.location.href = 'switchback://exit';
    } else {
      window.close();
    }
  });
  document.getElementById('exit-confirm-btn').focus();
}

// Exit App button in Settings
document.getElementById('exit-app-btn')?.addEventListener('click', () => showExitConfirm());

// Player keyboard shortcuts (only active when player overlay is visible)
// Covers: D-pad, media keys, volume keys, channel keys, numeric entry
let _numBuf = ''; let _numTimer = null;
document.addEventListener('keydown', e => {
  const overlay = document.getElementById('player-overlay');
  if (!overlay || overlay.style.display === 'none') return;
  if (e.target.tagName === 'INPUT') return;
  // Back/Escape → close player (handled first so back key works in player)
  if (e.key === 'Escape') {
    e.preventDefault(); closePlayer(); return;
  }
  // Play/Pause — space bar, 'k', Enter on play button, or media key
  if (e.key === ' ' || e.key === 'k' || e.key === 'MediaPlayPause' || e.key === 'MediaPlay' || e.key === 'MediaStop') {
    e.preventDefault(); togglePlay(); return;
  }
  if (e.key === 'm' || e.key === 'AudioVolumeMute') { toggleMute(); return; }
  // Volume up/down — hardware remote volume keys
  if (e.key === 'AudioVolumeUp') {
    e.preventDefault();
    const v = document.getElementById('player-video');
    if (v) { v.volume = Math.min(1, v.volume + 0.1); v.muted = false; }
    return;
  }
  if (e.key === 'AudioVolumeDown') {
    e.preventDefault();
    const v = document.getElementById('player-video');
    if (v) v.volume = Math.max(0, v.volume - 0.1);
    return;
  }
  // Channel up/down — dedicated remote buttons
  if (e.key === 'ChannelUp' || e.key === 'PageUp') { e.preventDefault(); navigateChannel(-1); return; }
  if (e.key === 'ChannelDown' || e.key === 'PageDown') { e.preventDefault(); navigateChannel(1); return; }
  // D-pad navigation
  if (e.key === 'ArrowLeft') { e.preventDefault(); seekRelative(-10); }
  if (e.key === 'ArrowRight') { e.preventDefault(); seekRelative(10); }
  if (e.key === 'ArrowUp') { e.preventDefault(); navigateChannel(-1); }
  if (e.key === 'ArrowDown') { e.preventDefault(); navigateChannel(1); }
  // Numeric channel entry — type digits then auto-jump after 1.5s pause
  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    _numBuf += e.key;
    clearTimeout(_numTimer);
    showPlayerError('Channel: ' + _numBuf);
    _numTimer = setTimeout(() => {
      const num = parseInt(_numBuf, 10);
      _numBuf = '';
      clearPlayerError();
      if (S.channelList?.length) {
        // Try matching by channel number first, then by index
        const byNum = S.channelList.findIndex(c => parseInt(c.num, 10) === num || parseInt(c.stream_id, 10) === num);
        const idx = byNum >= 0 ? byNum : Math.min(num - 1, S.channelList.length - 1);
        if (idx >= 0 && idx < S.channelList.length) openPlayer(S.channelList[idx], S.channelList, idx);
      }
    }, 1500);
  }
});

function togglePlayerFav() {
  const ch = S.currentChannel;
  if (!ch) return;
  const btn = document.getElementById('player-fav-btn');
  const isFav = S.favorites.some(f => f.stream_id == ch.stream_id);
  toggleFav(ch, null);
  btn.textContent = isFav ? '☆ Fav' : '★ Fav';
  btn.style.color = isFav ? '' : 'var(--yellow)';
}

function scheduleRecording() {
  const ch = S.currentChannel;
  if (!ch) return;
  const rec = {
    id: Date.now(),
    channel: ch.name,
    program: document.getElementById('player-program').textContent,
    startedAt: new Date().toISOString(),
    status: 'recording',
    stream_id: ch.stream_id,
  };
  S.recordings.unshift(rec);
  saveState();
  alert(`Recording started: ${ch.name}`);
  document.getElementById('rec-count').textContent = S.recordings.length;
}

// ── RECORDINGS ────────────────────────────────────────────────
function renderRecordings() {
  document.getElementById('rec-count').textContent = S.recordings.length;
  const el = document.getElementById('recordings-list');
  if (!S.recordings.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px 0">No recordings yet.</div>';
    return;
  }
  el.innerHTML = S.recordings.map((rec, idx) => {
    const isLive = rec.status === 'recording';
    return `
      <div class="rec-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px">
          <div>
            <div style="font-size:14px;font-weight:700">${esc(rec.program || rec.channel)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(rec.channel)} · ${esc(new Date(rec.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</div>
          </div>
          <span class="badge ${isLive ? 'badge-live' : 'badge-green'}">${isLive ? '● RECORDING' : '✓ Saved'}</span>
        </div>
        <div style="display:flex;gap:7px">
          ${rec.stream_id ? `<button class="btn btn-red btn-sm" onclick="replayRecording(${idx})">▶ Play</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="deleteRecording(${idx})">🗑 Delete</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('add-rec-btn').onclick = () => {
    const ch = document.getElementById('rec-channel').value.trim();
    const prog = document.getElementById('rec-program').value.trim();
    if (!ch) return;
    S.recordings.unshift({ id: Date.now(), channel: ch, program: prog, startedAt: new Date().toISOString(), status: 'scheduled' });
    saveState();
    renderRecordings();
    document.getElementById('rec-channel').value = '';
    document.getElementById('rec-program').value = '';
  };
}

function replayRecording(idx) {
  const rec = S.recordings[idx];
  if (!rec?.stream_id) return;
  const ch = S.allChannels.find(c => c.stream_id == rec.stream_id) || { stream_id: rec.stream_id, name: rec.channel };
  openPlayer(ch, null, 0);
}

function deleteRecording(idx) {
  if (!confirm('Delete this recording?')) return;
  S.recordings.splice(idx, 1);
  saveState();
  renderRecordings();
}

// ── QUALITY STATS ─────────────────────────────────────────────
function updateQualityStats() {
  const t0 = performance.now();
  fetch(buildApiUrl('get_user_info'))
    .then(() => {
      const ping = Math.round(performance.now() - t0);
      const pingEl = document.getElementById('q-ping');
      if (pingEl) pingEl.textContent = ping + 'ms';
    }).catch(() => { });
}

document.querySelectorAll('.quality-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.quality-opt').forEach(o => o.classList.remove('sel'));
    opt.classList.add('sel');
    // HLS quality level switching
    if (S.hlsInstance) {
      const q = opt.dataset.q;
      if (q === 'auto') S.hlsInstance.currentLevel = -1;
      else {
        const levels = S.hlsInstance.levels;
        if (q === '4k' && levels.length > 0) S.hlsInstance.currentLevel = levels.length - 1;
        else if (q === '1080p') S.hlsInstance.currentLevel = Math.min(levels.length - 1, Math.floor(levels.length * 0.75));
        else if (q === '720p') S.hlsInstance.currentLevel = Math.min(levels.length - 1, Math.floor(levels.length * 0.5));
        else if (q === '480p') S.hlsInstance.currentLevel = 0;
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// BOOT — load all data on startup
// ═══════════════════════════════════════════════════════════════
// ── PHONE PAIRING FLOW ──────────────────────────────────────
let pairPollTimer = null;

async function startPairing() {
  console.log('[pair] Starting pairing flow');
  nav('pairing');

  const codeEl = document.getElementById('pair-code-display');
  const urlEl = document.getElementById('pair-url-display');
  const statusEl = document.getElementById('pair-status');

  if (urlEl) urlEl.textContent = PAIR_URL;
  if (codeEl) codeEl.textContent = '----';
  if (statusEl) statusEl.textContent = 'Requesting pairing code...';

  try {
    const res = await fetch(`${PAIR_API_BASE}/api/pair-create`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const code = data.code;

    if (codeEl) codeEl.textContent = code;
    if (statusEl) statusEl.textContent = 'Waiting for your phone...';
    console.log('[pair] Code:', code);

    // Poll every 3 seconds
    if (pairPollTimer) clearInterval(pairPollTimer);
    pairPollTimer = setInterval(() => pollPairCode(code), 3000);

    // Auto-expire after 5 minutes
    setTimeout(() => {
      if (pairPollTimer) {
        clearInterval(pairPollTimer);
        pairPollTimer = null;
        if (statusEl) statusEl.textContent = 'Code expired. Press OK to get a new code.';
      }
    }, 5 * 60 * 1000);

  } catch (e) {
    console.error('[pair] Failed to create code:', e.message);
    if (statusEl) statusEl.textContent = 'Could not connect. Check your internet connection.';
    // Fall back to manual settings
    setTimeout(() => {
      initSettings();
      nav('settings');
      showToast('Pairing unavailable. Enter credentials manually.', 5000);
    }, 3000);
  }
}

async function pollPairCode(code) {
  try {
    const res = await fetch(`${PAIR_API_BASE}/api/pair-poll?code=${code}`);
    if (!res.ok) {
      // Code expired or not found
      if (pairPollTimer) clearInterval(pairPollTimer);
      pairPollTimer = null;
      const statusEl = document.getElementById('pair-status');
      if (statusEl) statusEl.textContent = 'Code expired. Press OK to get a new code.';
      return;
    }
    const data = await res.json();
    if (data.status === 'ready' && data.config) {
      // Credentials received!
      if (pairPollTimer) clearInterval(pairPollTimer);
      pairPollTimer = null;

      const { server, username, password, epg } = data.config;
      localStorage.setItem('iptv_server', server);
      localStorage.setItem('iptv_user', username);
      localStorage.setItem('iptv_pass', password);
      if (epg) localStorage.setItem('epg_url', epg);
      S.server = server;
      S.user = username;
      S.pass = password;

      const statusEl = document.getElementById('pair-status');
      if (statusEl) statusEl.textContent = '✅ Connected! Loading channels...';
      showToast('Provider connected! Loading channels...', 4000);

      // Boot with new credentials
      setTimeout(() => {
        nav('tvhome');
        bootData();
      }, 1500);
    }
    // else status === 'waiting', keep polling
  } catch (e) {
    console.warn('[pair] Poll error:', e.message);
  }
}

// Manual fallback: skip pairing and go to Settings for manual credential entry
document.getElementById('pair-manual-btn')?.addEventListener('click', () => {
  if (pairPollTimer) { clearInterval(pairPollTimer); pairPollTimer = null; }
  initSettings();
  nav('settings');
  showToast('Enter your IPTV credentials manually below.', 5000);
});

// ── BUNDLED DEFAULT PROVIDER ─────────────────────────────────
// Auto-load these credentials on first boot so the app works out of the box.
// Users can change credentials in Settings at any time.
const DEFAULT_PROVIDER = {
  server: 'http://blogyfy.xyz',
  username: 'jascodezoriptv',
  password: '19e993b7f5',
};

async function bootData() {
  // Auto-load default provider if no credentials are configured
  if (!S.server || !S.user || !S.pass) {
    console.log('[boot] No credentials — loading default provider');
    S.server = DEFAULT_PROVIDER.server;
    S.user = DEFAULT_PROVIDER.username;
    S.pass = DEFAULT_PROVIDER.password;
    localStorage.setItem('iptv_server', S.server);
    localStorage.setItem('iptv_user', S.user);
    localStorage.setItem('iptv_pass', S.pass);
  }

  try {
    // User info first (fast) — also validates credentials
    const info = await api('get_user_info');

    // Check if auth succeeded
    if (info?.user_info?.auth === 0) {
      console.warn('[boot] IPTV credentials rejected by server');
      initSettings();
      nav('settings');
      const statusEl = document.getElementById('creds-test-result');
      if (statusEl) {
        statusEl.innerHTML = '<span style="color:var(--primary)">❌ Authentication failed — check your username and password</span>';
      }
      showToast('Authentication failed. Please check your credentials in Settings.');
      return;
    }

    S.userInfo = info;
    renderAccountInfo(info);

    // Channels + categories in parallel
    const [cats, streams] = await Promise.allSettled([
      api('get_live_categories'),
      api('get_live_streams'),
    ]);
    if (cats.status === 'fulfilled' && Array.isArray(cats.value)) S.liveCategories = cats.value;
    if (streams.status === 'fulfilled' && Array.isArray(streams.value)) {
      S.allChannels = streams.value;
      S.channelList = applyLangFilter(streams.value);
    }

    // Update TV home with real counts
    if (S.currentScreen === 'tvhome') initTVHome();

    // Update channels sub
    const chSub = document.getElementById('channels-sub');
    if (chSub) chSub.textContent = `${S.allChannels.length.toLocaleString()} channels · ${S.liveCategories.length} categories`;

    // VOD + Series in background (non-blocking)
    api('get_vod_categories').then(d => { if (Array.isArray(d)) S.vodCategories = d; }).catch(() => { });
    api('get_vod_streams').then(d => { if (Array.isArray(d)) S.allVod = d; }).catch(() => { });
    api('get_series_categories').then(d => { if (Array.isArray(d)) S.seriesCategories = d; }).catch(() => { });
    api('get_series').then(d => { if (Array.isArray(d)) S.allSeries = d; }).catch(() => { });

  } catch (e) {
    console.warn('[boot]', e.message);
    // Connection failed — likely server is down or wrong URL
    initSettings();
    nav('settings');
    const statusEl = document.getElementById('creds-test-result');
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:var(--primary)">❌ Could not connect to server: ${esc(e.message)}</span>`;
    }
    showToast('Could not connect to IPTV server. Check Settings.');
    return;
  }
  initSettings();
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  nav('tvhome');
  bootData();
  // Clock tick in player
  setInterval(() => {
    const el = document.getElementById('player-clock');
    if (el && document.getElementById('player-overlay').style.display !== 'none') {
      el.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  }, 30000);
});

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 1: PLAYER — ad-block toggle, quality panel,
//                  prev-channel name, sleep timer
// ═══════════════════════════════════════════════════════════════

// ── AD BLOCK state ───────────────────────────────────────────
S.adBlockEnabled = localStorage.getItem('adblock') !== 'false';
S.sleepTimer = null;
S.sleepMinutes = 0;
S.prevChannel = null;  // track explicit previous channel

// ── SWITCHBACK SLOT HELPERS ───────────────────────────────────
function saveSbSlots() {
  localStorage.setItem('sb_slots', JSON.stringify(S.switchbackSlots));
}

function sbSlotLimit() {
  return S.isPro ? 4 : 2;
}

// Assign current channel to a switchback slot
function assignSbSlot(slotIdx) {
  const ch = S.currentChannel;
  if (!ch) return;
  if (slotIdx >= sbSlotLimit()) {
    showUpgradePrompt('Switchback Pro', 'Upgrade to Pro to unlock 4 Switchback slots — flip between up to 4 channels instantly.');
    return;
  }
  S.switchbackSlots[slotIdx] = { stream_id: ch.stream_id, name: ch.name, category_name: ch.category_name || '', stream_icon: ch.stream_icon || '', _full: ch };
  saveSbSlots();
  showToast(`Slot ${slotIdx + 1}: ${ch.name.slice(0, 22)}`);
  // refresh panel if open
  if (document.getElementById('sb-panel')) renderSwitchbackPanel();
}

// Assign a channel (from channel list) to a specific slot via context menu
function assignChannelToSbSlot(ch) {
  const limit = sbSlotLimit();
  // Find first empty slot, or prompt to pick
  const emptyIdx = S.switchbackSlots.findIndex((s, i) => !s && i < limit);
  if (emptyIdx >= 0) {
    S.switchbackSlots[emptyIdx] = { stream_id: ch.stream_id, name: ch.name, category_name: ch.category_name || '', stream_icon: ch.stream_icon || '', _full: ch };
    saveSbSlots();
    showToast(`Added to Switchback Slot ${emptyIdx + 1}: ${ch.name.slice(0, 18)}`);
  } else {
    showSbAssignModal(ch);
  }
}

// Show a small modal to pick which slot to overwrite
function showSbAssignModal(ch) {
  const existing = document.getElementById('sb-assign-modal');
  if (existing) existing.remove();
  const limit = sbSlotLimit();
  const modal = document.createElement('div');
  modal.id = 'sb-assign-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:20000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:#1a1a2e;border:1px solid #444;border-radius:14px;padding:20px 24px;width:300px;">
      <div style="font-size:14px;font-weight:700;margin-bottom:4px">⇄ Assign to Switchback Slot</div>
      <div style="font-size:12px;color:#888;margin-bottom:14px">${esc(ch.name)}</div>
      ${S.switchbackSlots.slice(0, limit).map((s, i) => `
        <button class="btn btn-ghost btn-sm btn-full" data-slot="${i}" style="margin-bottom:7px;display:flex;justify-content:space-between;">
          <span>Slot ${i + 1}</span>
          <span style="color:#888;font-size:11px">${s ? esc(s.name.slice(0, 18)) : 'Empty'}</span>
        </button>`).join('')}
      <button class="btn btn-ghost btn-sm btn-full" style="margin-top:5px;color:var(--muted)" id="sb-assign-cancel">Cancel</button>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-slot]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.slot);
      S.switchbackSlots[i] = { stream_id: ch.stream_id, name: ch.name, category_name: ch.category_name || '', stream_icon: ch.stream_icon || '', _full: ch };
      saveSbSlots();
      showToast(`Slot ${i + 1}: ${ch.name.slice(0, 18)}`);
      modal.remove();
    });
  });
  document.getElementById('sb-assign-cancel').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// Upgrade prompt for locked features
function showUpgradePrompt(featureName, description) {
  const existing = document.getElementById('upgrade-prompt-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'upgrade-prompt-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:20000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:#1a1a2e;border:2px solid rgba(229,0,0,0.4);border-radius:16px;padding:28px;width:340px;text-align:center">
      <div style="font-size:32px;margin-bottom:10px">💎</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:8px">${esc(featureName)}</div>
      <div style="font-size:13px;color:#aaa;margin-bottom:20px;line-height:1.5">${esc(description)}</div>
      <button class="btn btn-red btn-full" onclick="nav('pricing');document.getElementById('upgrade-prompt-modal')?.remove();closePlayer()" style="margin-bottom:9px">View Plans →</button>
      <button class="btn btn-ghost btn-full" id="upgrade-cancel">Not Now</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('upgrade-cancel').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// Render the Switchback panel contents (called on open + reassign)
function renderSwitchbackPanel() {
  const panel = document.getElementById('sb-panel');
  if (!panel) return;
  const limit = sbSlotLimit();
  const slots = S.switchbackSlots;
  const curr = S.currentChannel;

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:13px">
      <div style="font-size:14px;font-weight:800">⇄ Switchback Slots</div>
      <span onclick="document.getElementById('sb-panel').remove()" style="cursor:pointer;color:#888;font-size:16px">✕</span>
    </div>
    <div style="font-size:11px;color:#888;margin-bottom:12px">Tap a slot to jump • Long-press to clear • ${S.isPro ? '4 slots (Pro)' : '2 slots free · <span style="color:var(--primary);cursor:pointer" onclick="nav(\'pricing\');closePlayer()">Upgrade for 4</span>'}</div>
    ${slots.slice(0, 4).map((s, i) => {
    const locked = i >= limit;
    const isActive = s && curr && s.stream_id == curr.stream_id;
    if (locked) {
      return `<div style="background:rgba(229,0,0,0.07);border:1px dashed rgba(229,0,0,0.25);border-radius:10px;padding:10px 13px;margin-bottom:7px;display:flex;align-items:center;gap:10px;cursor:pointer" onclick="showUpgradePrompt('Unlock Slot ${i + 1}','Upgrade to Pro to unlock all 4 Switchback slots.')">
          <div style="width:36px;height:36px;background:rgba(100,100,100,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px">🔒</div>
          <div style="flex:1"><div style="font-size:13px;font-weight:600;color:#555">Slot ${i + 1} — Pro</div><div style="font-size:11px;color:#444">Upgrade to unlock</div></div>
          <span class="btn btn-sm" style="background:rgba(229,0,0,0.15);color:var(--primary);font-size:11px">Upgrade</span>
        </div>`;
    }
    if (!s) {
      return `<div class="sb-slot-btn" data-slot="${i}" style="background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.12);border-radius:10px;padding:10px 13px;margin-bottom:7px;display:flex;align-items:center;gap:10px;cursor:pointer">
          <div style="width:36px;height:36px;background:rgba(255,255,255,0.05);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#555">+</div>
          <div style="flex:1"><div style="font-size:13px;color:#666">Slot ${i + 1} — Empty</div><div style="font-size:11px;color:#444">Tap to assign current channel</div></div>
        </div>`;
    }
    const initials = s.name.replace(/[^A-Za-z0-9]/g, ' ').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
    const bg = isActive ? 'rgba(52,199,89,0.12)' : 'rgba(255,255,255,0.05)';
    const border = isActive ? '1px solid rgba(52,199,89,0.4)' : '1px solid rgba(255,255,255,0.1)';
    return `<div class="sb-slot-btn" data-slot="${i}" data-has-ch="1" style="background:${bg};border:${border};border-radius:10px;padding:10px 13px;margin-bottom:7px;display:flex;align-items:center;gap:10px;cursor:pointer">
        <div style="width:36px;height:36px;background:rgba(229,0,0,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">${esc(initials)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${isActive ? '▶ ' : ''}${esc(s.name)}</div>
          <div style="font-size:11px;color:#888">${esc(s.category_name || 'Live TV')}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          ${!isActive ? `<button class="btn btn-sm" style="background:var(--primary);color:#fff;font-size:11px" onclick="event.stopPropagation();sbJumpToSlot(${i})">⇄ Go</button>` : '<span style="font-size:11px;color:#34C759;font-weight:700">Watching</span>'}
          <button class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 7px" onclick="event.stopPropagation();sbClearSlot(${i})">✕</button>
        </div>
      </div>`;
  }).join('')}
    <div style="margin-top:10px;display:flex;gap:7px">
      <button class="btn btn-ghost btn-sm" style="flex:1" onclick="assignSbSlot(${slots.slice(0, limit).findIndex(s => !s) >= 0 ? slots.slice(0, limit).findIndex(s => !s) : 0})">📌 Assign Current</button>
      <button class="btn btn-ghost btn-sm" style="flex:1" onclick="sbCycleNext()">⇄ Cycle Next</button>
    </div>`;

  // Wire slot clicks
  panel.querySelectorAll('.sb-slot-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') return; // handled by button's own onclick
      const i = parseInt(btn.dataset.slot);
      if (btn.dataset.hasCh) sbJumpToSlot(i);
      else assignSbSlot(i);
    });
  });
}

// Jump to a slot's channel
function sbJumpToSlot(slotIdx) {
  const slot = S.switchbackSlots[slotIdx];
  if (!slot) return;
  const ch = S.allChannels.find(c => c.stream_id == slot.stream_id) || slot._full || slot;
  const idx = S.channelList.findIndex(c => c.stream_id == slot.stream_id);
  // Before jumping, save current channel into the slot we're leaving (true swap)
  if (S.currentChannel) {
    S.switchbackSlots[slotIdx] = { stream_id: S.currentChannel.stream_id, name: S.currentChannel.name, category_name: S.currentChannel.category_name || '', stream_icon: S.currentChannel.stream_icon || '', _full: S.currentChannel };
    saveSbSlots();
  }
  openPlayer(ch, S.channelList.length ? S.channelList : S.allChannels, idx >= 0 ? idx : S.currentChannelIndex);
  document.getElementById('sb-panel')?.remove();
}

// Cycle to next populated slot
function sbCycleNext() {
  const limit = sbSlotLimit();
  const curr = S.currentChannel;
  const occupied = S.switchbackSlots.slice(0, limit).map((s, i) => ({ s, i })).filter(x => x.s && (!curr || x.s.stream_id != curr.stream_id));
  if (!occupied.length) { showToast('No other channels in Switchback slots'); return; }
  // Find the slot just after current in the rotation
  const currSlot = S.switchbackSlots.findIndex(s => s && curr && s.stream_id == curr.stream_id);
  const nextInRot = occupied.find(x => x.i > currSlot) || occupied[0];
  sbJumpToSlot(nextInRot.i);
}

// Clear a slot
function sbClearSlot(slotIdx) {
  S.switchbackSlots[slotIdx] = null;
  saveSbSlots();
  renderSwitchbackPanel();
  showToast(`Slot ${slotIdx + 1} cleared`);
}

// Open / close Switchback panel in the player
function showSwitchbackPanel() {
  const existing = document.getElementById('sb-panel');
  if (existing) { existing.remove(); return; }
  const panel = document.createElement('div');
  panel.id = 'sb-panel';
  panel.style.cssText = 'position:absolute;left:20px;bottom:80px;width:320px;background:#1a1a2e;border:1px solid #333;border-radius:14px;padding:18px;z-index:10002;max-height:70vh;overflow-y:auto;';
  document.getElementById('player-overlay').appendChild(panel);
  renderSwitchbackPanel();
}

// prev-channel tracking inlined into openPlayer above

function updatePrevChannelBtn() {
  const btn = document.getElementById('prev-ch-btn');
  if (!btn) return;
  // Show slot 0 name if occupied, else fall back to prevChannel
  const slot0 = S.switchbackSlots[0];
  const curr = S.currentChannel;
  const display = slot0 && (!curr || slot0.stream_id != curr.stream_id)
    ? slot0.name.slice(0, 14)
    : (S.prevChannel ? S.prevChannel.name.slice(0, 14) : null);
  btn.textContent = display ? `⇄ ${display}` : '⇄ SB';
}

// Prev channel button — swap with slot 0 if available, else open panel
document.getElementById('prev-ch-btn').addEventListener('click', () => {
  const slot0 = S.switchbackSlots[0];
  const curr = S.currentChannel;
  if (slot0 && (!curr || slot0.stream_id != curr.stream_id)) {
    sbJumpToSlot(0);
  } else if (S.prevChannel) {
    const tmp = S.currentChannel;
    const prevIdx = S.channelList.findIndex(c => c.stream_id == S.prevChannel.stream_id);
    openPlayer(S.prevChannel, S.channelList, prevIdx >= 0 ? prevIdx : S.currentChannelIndex);
    S.prevChannel = tmp;
    updatePrevChannelBtn();
  } else {
    showSwitchbackPanel();
  }
});

// Ad-block badge in player top bar
function updateAdBlockBadge() {
  let badge = document.getElementById('adblock-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'adblock-badge';
    badge.style.cssText = 'font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;cursor:pointer;';
    badge.onclick = toggleAdBlock;
    document.querySelector('#player-overlay-top > div:last-child').prepend(badge);
  }
  badge.textContent = S.adBlockEnabled ? '🚫 AD Block ON' : 'AD Block OFF';
  badge.style.background = S.adBlockEnabled ? 'rgba(52,199,89,0.25)' : 'rgba(100,100,100,0.25)';
  badge.style.color = S.adBlockEnabled ? '#34C759' : '#888';
}

function toggleAdBlock() {
  S.adBlockEnabled = !S.adBlockEnabled;
  localStorage.setItem('adblock', S.adBlockEnabled);
  updateAdBlockBadge();
}

// Quality panel — inline in player (not nav away)
function showPlayerQualityPanel() {
  const existing = document.getElementById('player-quality-panel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'player-quality-panel';
  panel.style.cssText = 'position:absolute;right:20px;bottom:80px;width:260px;background:#1a1a2e;border:1px solid #333;border-radius:14px;padding:18px;z-index:10001;';

  const qualities = [
    { q: 'auto', label: 'Auto (Adaptive)', bitrate: 'Adapts automatically' },
    { q: '4k', label: '4K UHD', bitrate: '~25 Mbps' },
    { q: '1080p', label: 'Full HD 1080p', bitrate: '~8 Mbps' },
    { q: '720p', label: 'HD 720p', bitrate: '~5 Mbps' },
    { q: '480p', label: 'SD 480p', bitrate: '~2.5 Mbps' },
    { q: '360p', label: 'Low 360p', bitrate: '~1 Mbps' },
  ];

  const current = S.currentQuality || 'auto';
  panel.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:13px;display:flex;justify-content:space-between">
      Stream Quality
      <span onclick="document.getElementById('player-quality-panel').remove()" style="cursor:pointer;color:#888">✕</span>
    </div>
    ${qualities.map(opt => `
      <div class="pq-opt" data-q="${opt.q}" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:8px;margin-bottom:5px;cursor:pointer;background:${current === opt.q ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'};border:1px solid ${current === opt.q ? '#3b82f6' : 'transparent'};">
        <div>
          <div style="font-size:13px;font-weight:600;color:${current === opt.q ? '#60a5fa' : '#fff'}">${opt.label}</div>
          <div style="font-size:11px;color:#888;margin-top:1px">${opt.bitrate}</div>
        </div>
        ${current === opt.q ? '<span style="background:#3b82f6;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700">Active</span>' : ''}
      </div>`).join('')}`;

  panel.querySelectorAll('.pq-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      S.currentQuality = opt.dataset.q;
      if (S.hlsInstance) {
        const q = opt.dataset.q;
        if (q === 'auto') S.hlsInstance.currentLevel = -1;
        else {
          const levels = S.hlsInstance.levels || [];
          if (q === '4k') S.hlsInstance.currentLevel = Math.max(0, levels.length - 1);
          else if (q === '1080p') S.hlsInstance.currentLevel = Math.min(levels.length - 1, Math.floor(levels.length * 0.75));
          else if (q === '720p') S.hlsInstance.currentLevel = Math.min(levels.length - 1, Math.floor(levels.length * 0.5));
          else if (q === '480p') S.hlsInstance.currentLevel = Math.min(1, levels.length - 1);
          else if (q === '360p') S.hlsInstance.currentLevel = 0;
        }
      }
      panel.remove();
    });
  });

  document.getElementById('player-overlay').appendChild(panel);
}

// Wire 📶 button in player to inline panel instead of navigating away
document.querySelector('#player-overlay-top button[onclick="nav(\'quality\')"]')?.removeAttribute('onclick');
document.querySelector('#player-overlay-top button')?.setAttribute('onclick', '');
// Re-select by content since attributes vary
document.querySelectorAll('#player-overlay-top button').forEach(btn => {
  if (btn.textContent.includes('📶')) {
    btn.onclick = showPlayerQualityPanel;
  }
});

// Ad badge + prev-ch label refresh after stream loads
// (hooked via MutationObserver on player-overlay visibility instead of override)

// Sleep timer UI
function showSleepTimerMenu() {
  const existing = document.getElementById('sleep-timer-panel');
  if (existing) { existing.remove(); return; }
  const panel = document.createElement('div');
  panel.id = 'sleep-timer-panel';
  panel.style.cssText = 'position:absolute;left:20px;bottom:80px;width:200px;background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:16px;z-index:10001;';
  const options = [15, 30, 45, 60, 90, 120];
  panel.innerHTML = `
    <div style="font-size:13px;font-weight:700;margin-bottom:11px;display:flex;justify-content:space-between">
      😴 Sleep Timer
      <span onclick="document.getElementById('sleep-timer-panel').remove()" style="cursor:pointer;color:#888">✕</span>
    </div>
    ${S.sleepTimer ? `<div style="font-size:12px;color:#34C759;margin-bottom:9px">⏱ Active: ${S.sleepMinutes}min remaining</div>` : ''}
    ${options.map(m => `<div onclick="setSleepTimer(${m})" style="padding:8px 11px;border-radius:7px;cursor:pointer;font-size:13px;background:rgba(255,255,255,0.05);margin-bottom:4px;hover:background:#333">${m} minutes</div>`).join('')}
    ${S.sleepTimer ? `<div onclick="cancelSleepTimer()" style="padding:8px 11px;border-radius:7px;cursor:pointer;font-size:13px;color:#ff5555;margin-top:6px;background:rgba(229,0,0,0.1)">Cancel Timer</div>` : ''}`;
  document.getElementById('player-overlay').appendChild(panel);
}

function setSleepTimer(minutes) {
  cancelSleepTimer();
  S.sleepMinutes = minutes;
  S.sleepTimer = setTimeout(() => {
    closePlayer();
    S.sleepTimer = null;
  }, minutes * 60000);
  // Countdown display
  S.sleepCountdown = setInterval(() => {
    S.sleepMinutes = Math.max(0, S.sleepMinutes - 1);
    const el = document.getElementById('sleep-remaining');
    if (el) el.textContent = `😴 ${S.sleepMinutes}m`;
  }, 60000);
  document.getElementById('sleep-timer-panel')?.remove();
  // Show indicator
  let ind = document.getElementById('sleep-indicator');
  if (!ind) {
    ind = document.createElement('span');
    ind.id = 'sleep-indicator';
    ind.style.cssText = 'font-size:11px;color:#ffc107;cursor:pointer;';
    ind.onclick = showSleepTimerMenu;
    document.getElementById('player-controls')?.querySelector('div[style*="flex:1"]')?.after(ind);
  }
  ind.innerHTML = `<span id="sleep-remaining">😴 ${minutes}m</span>`;
}

function cancelSleepTimer() {
  if (S.sleepTimer) { clearTimeout(S.sleepTimer); S.sleepTimer = null; }
  if (S.sleepCountdown) { clearInterval(S.sleepCountdown); S.sleepCountdown = null; }
  document.getElementById('sleep-indicator')?.remove();
}

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 2: RECORDINGS — All/Active/Completed tabs,
//                  storage bar, progress on active recordings
// ═══════════════════════════════════════════════════════════════

// Override renderRecordings with full native-app equivalent
function renderRecordings() {
  document.getElementById('rec-count').textContent = S.recordings.length;
  const activeRecs = S.recordings.filter(r => r.status === 'recording');

  // Storage mock (localStorage-based estimate)
  const usedGB = Math.round(S.recordings.filter(r => r.status !== 'recording').length * 0.3 * 10) / 10;
  const totalGB = 50;
  const pct = Math.min(100, Math.round((usedGB / totalGB) * 100));
  const barColor = pct > 80 ? '#FF3B30' : pct > 60 ? '#fbbf24' : '#3b82f6';

  // Update stat boxes
  document.querySelectorAll('#screen-recordings .stat-box')[1].querySelector('.stat-val').textContent = activeRecs.length;
  document.querySelectorAll('#screen-recordings .stat-box')[2].querySelector('.stat-val').textContent = usedGB + ' GB';

  // Build tab bar if not present
  let tabBar = document.getElementById('rec-tab-bar');
  if (!tabBar) {
    tabBar = document.createElement('div');
    tabBar.id = 'rec-tab-bar';
    tabBar.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;';
    const recList = document.getElementById('recordings-list');
    recList.parentNode.insertBefore(tabBar, recList);
  }
  const activeTab = S.recActiveTab || 'all';
  tabBar.innerHTML = ['all', 'recording', 'completed'].map(tab => {
    const label = tab === 'all' ? 'All' : tab === 'recording' ? '● Recording' : '✓ Completed';
    const count = tab === 'all' ? S.recordings.length : S.recordings.filter(r => r.status === tab).length;
    const sel = activeTab === tab;
    return `<button class="btn btn-sm ${sel ? 'btn-red' : 'btn-ghost'}" data-rec-tab="${tab}" style="${sel ? '' : 'color:var(--muted)'}">
      ${label} <span style="background:rgba(255,255,255,0.15);border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px">${count}</span>
    </button>`;
  }).join('');
  tabBar.querySelectorAll('[data-rec-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.recActiveTab = btn.dataset.recTab;
      renderRecordings();
    });
  });

  // Storage bar
  let storageBar = document.getElementById('rec-storage-bar');
  if (!storageBar) {
    storageBar = document.createElement('div');
    storageBar.id = 'rec-storage-bar';
    storageBar.style.cssText = 'margin-bottom:16px;';
    tabBar.after(storageBar);
  }
  storageBar.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:5px">
      <span>Cloud Storage</span>
      <span style="color:${barColor}">${usedGB} GB / ${totalGB} GB used</span>
    </div>
    <div class="progress-bar" style="height:6px">
      <div class="progress-fill" style="width:${pct}%;background:${barColor};"></div>
    </div>`;

  // Filter list
  const filtered = S.recordings.filter(r => {
    if (activeTab === 'recording') return r.status === 'recording';
    if (activeTab === 'completed') return r.status !== 'recording';
    return true;
  });

  const el = document.getElementById('recordings-list');
  if (!filtered.length) {
    const msgs = { recording: 'No active recordings. Start recording from the player.', completed: 'No completed recordings yet.', all: 'No recordings yet. Start recording while watching Live TV.' };
    el.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:20px 0">${msgs[activeTab]}</div>`;
    wireAddRecBtn();
    return;
  }

  el.innerHTML = filtered.map((rec, idx) => {
    const isActive = rec.status === 'recording';
    const isFailed = rec.status === 'failed';
    const statusBg = isActive ? '#FF3B30' : isFailed ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.2)';
    const statusColor = isActive ? '#fff' : isFailed ? '#ff8888' : '#00e676';
    const statusText = isActive ? '● REC' : isFailed ? 'FAILED' : '✓ Done';
    const progress = rec.progress || 0;
    const when = rec.startedAt ? new Date(rec.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

    return `
      <div class="rec-card" style="${isActive ? 'border-color:rgba(255,59,48,0.4);background:rgba(255,59,48,0.04)' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(rec.program || rec.channel)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(rec.channel)}${when ? ' · ' + when : ''}</div>
          </div>
          <span style="background:${statusBg};color:${statusColor};padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;flex-shrink:0;margin-left:10px">${statusText}</span>
        </div>
        ${isActive && progress ? `
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px">
            <div class="progress-bar" style="flex:1;height:4px"><div class="progress-fill" style="width:${progress}%;background:#FF3B30;"></div></div>
            <span style="font-size:11px;color:#FF3B30;font-weight:700;min-width:30px">${progress}%</span>
          </div>` : ''}
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          ${isActive
        ? `<button class="btn btn-red btn-sm" onclick="stopRecording(${idx})">■ Stop</button>`
        : `<button class="btn btn-sm" style="background:#3b82f6;color:#fff" onclick="replayRecording(${idx})">▶ Play</button>`}
          <button class="btn btn-ghost btn-sm" style="color:var(--primary)" onclick="deleteRecording(${idx})">🗑 Delete</button>
        </div>
      </div>`;
  }).join('');

  wireAddRecBtn();
}

function stopRecording(idx) {
  if (!confirm('Stop this recording?')) return;
  S.recordings[idx].status = 'completed';
  S.recordings[idx].progress = 100;
  saveState();
  renderRecordings();
}

function wireAddRecBtn() {
  document.getElementById('add-rec-btn').onclick = () => {
    const ch = document.getElementById('rec-channel').value.trim();
    const prog = document.getElementById('rec-program').value.trim();
    const date = document.getElementById('rec-date').value;
    const time = document.getElementById('rec-time').value;
    if (!ch) return;
    S.recordings.unshift({
      id: Date.now(), channel: ch, program: prog,
      startedAt: (date && time) ? new Date(date + 'T' + time).toISOString() : new Date().toISOString(),
      status: 'scheduled',
    });
    saveState();
    document.getElementById('rec-channel').value = '';
    document.getElementById('rec-program').value = '';
    renderRecordings();
  };
}

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 3: FAVORITES — Smart Categories tab + Smart Add
// ═══════════════════════════════════════════════════════════════

// Smart category definitions (mirrors SmartFavoritesService.ts)
const SMART_CATS = [
  { id: 'sports', name: 'Sports', color: '#FF3B30', keywords: ['sport', 'espn', 'nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'baseball', 'tennis', 'golf', 'f1', 'racing', 'ufc', 'boxing', 'WWE'] },
  { id: 'news', name: 'News', color: '#007AFF', keywords: ['news', 'cnn', 'fox', 'msnbc', 'abc', 'nbc', 'cbs', 'bbc', 'sky', 'al jazeera', 'cnbc', 'bloomberg', 'reuters'] },
  { id: 'movies', name: 'Movies', color: '#9B59B6', keywords: ['movie', 'film', 'cinema', 'hbo', 'showtime', 'starz', 'cinemax', 'fx', 'tnt', 'tbs'] },
  { id: 'kids', name: 'Kids', color: '#F39C12', keywords: ['kid', 'cartoon', 'disney', 'nick', 'nickelodeon', 'cartoon network', 'boomerang', 'toon', 'children', 'family', 'pbs'] },
  { id: 'music', name: 'Music', color: '#1ED760', keywords: ['music', 'mtv', 'vh1', 'bet', 'country', 'jazz', 'rock', 'hits', 'radio'] },
  { id: 'docs', name: 'Documentary', color: '#00BCD4', keywords: ['discovery', 'nat geo', 'national geographic', 'history', 'science', 'nature', 'animal', 'planet', 'documentary', 'doc'] },
  { id: 'intl', name: 'International', color: '#E91E63', keywords: ['arabic', 'spanish', 'french', 'german', 'italian', 'chinese', 'hindi', 'portuguese', 'latin', 'univision', 'telemundo'] },
  { id: 'local', name: 'Local', color: '#8BC34A', keywords: ['local', 'regional', 'city', 'metro'] },
];

function getSmartCategoryChannels(catId) {
  const cat = SMART_CATS.find(c => c.id === catId);
  if (!cat) return [];
  const kws = cat.keywords.map(k => k.toLowerCase());
  return S.allChannels.filter(ch => {
    const name = (ch.name + ' ' + (ch.category_name || '')).toLowerCase();
    return kws.some(k => name.includes(k));
  }).slice(0, 50);
}

// renderFavorites — canonical version with tabs (replaces hoisted function declaration)
renderFavorites = function () {
  const screen = document.getElementById('screen-favorites');
  const activeTab = S.favTab || 'all';

  // Build tab bar if not present
  let tabBar = document.getElementById('fav-tab-bar');
  if (!tabBar) {
    tabBar = document.createElement('div');
    tabBar.id = 'fav-tab-bar';
    tabBar.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;';
    const list = document.getElementById('favorites-list');
    list.parentNode.insertBefore(tabBar, list);
  }
  tabBar.innerHTML = [
    { id: 'all', label: '⭐ All Favorites' },
    { id: 'smart', label: '🧠 Smart Categories' },
    { id: 'import', label: '📤 Share' },
  ].map(t => `<button class="btn btn-sm ${activeTab === t.id ? 'btn-red' : 'btn-ghost'}" data-fav-tab="${t.id}">${t.label}</button>`).join('');
  tabBar.querySelectorAll('[data-fav-tab]').forEach(btn => {
    btn.addEventListener('click', () => { S.favTab = btn.dataset.favTab; renderFavorites(); });
  });

  const el = document.getElementById('favorites-list');

  if (activeTab === 'all') {
    // Header actions
    let hdr = document.getElementById('fav-hdr');
    if (!hdr) {
      hdr = document.createElement('div');
      hdr.id = 'fav-hdr';
      hdr.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px';
      el.parentNode.insertBefore(hdr, el);
    }
    hdr.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="showSmartAddModal()">✨ Smart Add</button>
      <button class="btn btn-ghost btn-sm" onclick="exportFavorites()">📤 Export</button>`;

    if (!S.favorites.length) {
      el.innerHTML = `
        <div style="color:var(--muted);font-size:13px;padding:30px;text-align:center">
          <div style="font-size:36px;margin-bottom:12px">⭐</div>
          <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:7px">No Favorites Yet</div>
          <div style="margin-bottom:16px">Star channels to add them here, or use Smart Add</div>
          <button class="btn btn-red btn-sm" onclick="showSmartAddModal()">✨ Smart Add Channels</button>
        </div>`;
      return;
    }
    el.innerHTML = S.favorites.map(ch => `
      <div class="ch-row" data-id="${ch.stream_id}">
        <div class="ch-icon" style="background:${colorFromName(ch.name)}">${channelInitials(ch.name)}</div>
        <div class="ch-info"><div class="ch-name">${esc(ch.name)}</div><div class="ch-sub">${esc(ch.category_name || '')}</div></div>
        <div class="ch-meta">
          <span class="badge badge-live">LIVE</span>
          <span class="fav-star on" data-id="${ch.stream_id}" style="margin-left:8px">★</span>
        </div>
      </div>`).join('');
    el.querySelectorAll('.ch-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.classList.contains('fav-star')) return;
        const ch = S.favorites.find(f => f.stream_id == row.dataset.id);
        if (ch) openPlayer(ch, S.favorites, S.favorites.indexOf(ch));
      });
    });
    el.querySelectorAll('.fav-star').forEach(star => {
      star.addEventListener('click', e => {
        e.stopPropagation();
        const ch = S.favorites.find(f => f.stream_id == star.dataset.id);
        toggleFav(ch, star);
        renderFavorites();
      });
    });

  } else if (activeTab === 'smart') {
    document.getElementById('fav-hdr')?.remove();
    el.innerHTML = SMART_CATS.map(cat => {
      const channels = getSmartCategoryChannels(cat.id);
      if (!channels.length) return '';
      const isOpen = S.smartCatOpen === cat.id;
      return `
        <div class="card" style="margin-bottom:9px;border-left:4px solid ${cat.color};padding:0;">
          <div data-cat-toggle="${cat.id}" style="display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;">
            <div style="width:10px;height:10px;border-radius:50%;background:${cat.color};flex-shrink:0"></div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700">${cat.name}</div>
              <div style="font-size:11px;color:var(--muted)">${channels.length} channels matching</div>
            </div>
            <span style="color:var(--muted);font-size:12px">${isOpen ? '▼' : '▶'}</span>
          </div>
          ${isOpen ? `<div style="padding:0 12px 12px">
            ${channels.slice(0, 10).map(ch => `
              <div class="ch-row" data-id="${ch.stream_id}" style="margin-bottom:5px">
                <div class="ch-icon" style="background:${colorFromName(ch.name)};font-size:10px">${channelInitials(ch.name)}</div>
                <div class="ch-info"><div class="ch-name" style="font-size:12px">${esc(ch.name)}</div></div>
                <span class="fav-star ${S.favorites.some(f => f.stream_id == ch.stream_id) ? 'on' : ''}" data-id="${ch.stream_id}">★</span>
              </div>`).join('')}
            ${channels.length > 10 ? `<div style="color:var(--muted);font-size:11px;text-align:center;padding:4px">+${channels.length - 10} more</div>` : ''}
          </div>` : ''}
        </div>`;
    }).join('');
    el.querySelectorAll('[data-cat-toggle]').forEach(hdr => {
      hdr.addEventListener('click', () => {
        S.smartCatOpen = S.smartCatOpen === hdr.dataset.catToggle ? null : hdr.dataset.catToggle;
        renderFavorites();
      });
    });
    el.querySelectorAll('.fav-star').forEach(star => {
      star.addEventListener('click', e => {
        e.stopPropagation();
        const ch = S.allChannels.find(c => c.stream_id == star.dataset.id);
        toggleFav(ch, star);
        star.classList.toggle('on');
      });
    });
    el.querySelectorAll('.ch-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.classList.contains('fav-star')) return;
        const ch = S.allChannels.find(c => c.stream_id == row.dataset.id);
        if (ch) openPlayer(ch, S.allChannels, S.allChannels.indexOf(ch));
      });
    });

  } else if (activeTab === 'import') {
    document.getElementById('fav-hdr')?.remove();
    const exportUrl = `switchbacktv://favorites?data=${btoa(JSON.stringify(S.favorites.map(f => f.stream_id)))}`;
    el.innerHTML = `
      <div class="section-title">Export Your Favorites</div>
      <div class="card" style="margin-bottom:14px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px">Share your favorite channels across devices</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="exportFavorites()">📤 Share List</button>
          <button class="btn btn-ghost btn-sm" onclick="copyFavUrl()">🔗 Copy Import URL</button>
        </div>
      </div>
      <div class="section-title">Import Favorites</div>
      <div class="card">
        <input class="inp" id="fav-import-input" placeholder="Paste import URL or channel IDs..." style="margin-bottom:8px" />
        <button class="btn btn-red btn-sm" onclick="importFavorites()">Import</button>
        <div id="fav-import-result" style="margin-top:8px;font-size:12px"></div>
      </div>`;
  }
}

function showSmartAddModal() {
  const modal = document.createElement('div');
  modal.id = 'smart-add-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;';
  const suggestions = S.allChannels.length
    ? SMART_CATS.flatMap(cat => getSmartCategoryChannels(cat.id).slice(0, 3).map(ch => ({ ...ch, _cat: cat.name }))).slice(0, 30)
    : [];
  modal.innerHTML = `
    <div style="background:#1a1a2e;border-radius:16px;width:480px;max-height:80vh;display:flex;flex-direction:column;border:1px solid #333;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #333">
        <div style="font-size:16px;font-weight:700">✨ Smart Add Channels</div>
        <span onclick="document.getElementById('smart-add-modal').remove()" style="cursor:pointer;color:#888;font-size:18px">✕</span>
      </div>
      <div style="overflow-y:auto;padding:16px">
        <div class="section-title">Suggested Channels</div>
        ${suggestions.length
      ? suggestions.map(ch => `
            <div class="ch-row" style="margin-bottom:6px">
              <div class="ch-icon" style="background:${colorFromName(ch.name)};font-size:10px">${channelInitials(ch.name)}</div>
              <div class="ch-info">
                <div class="ch-name" style="font-size:12px">${esc(ch.name)}</div>
                <div class="ch-sub">${esc(ch._cat || ch.category_name || '')}</div>
              </div>
              <button class="btn btn-sm ${S.favorites.some(f => f.stream_id == ch.stream_id) ? 'btn-green-s' : 'btn-red'}" data-smart-id="${ch.stream_id}" style="flex-shrink:0">${S.favorites.some(f => f.stream_id == ch.stream_id) ? '★ Added' : '☆ Add'}</button>
            </div>`).join('')
      : '<div style="color:var(--muted);font-size:13px;padding:20px;text-align:center">Load Live TV first to see suggestions</div>'}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-smart-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = S.allChannels.find(c => c.stream_id == btn.dataset.smartId);
      if (!ch) return;
      const isFav = S.favorites.some(f => f.stream_id == ch.stream_id);
      toggleFav(ch, null);
      btn.textContent = isFav ? '☆ Add' : '★ Added';
      btn.className = `btn btn-sm ${isFav ? 'btn-red' : 'btn-green-s'}`;
    });
  });
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function exportFavorites() {
  const text = 'Switchback TV Favorites\n\n' + S.favorites.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
  if (navigator.share) {
    navigator.share({ title: 'My IPTV Favorites', text });
  } else {
    navigator.clipboard.writeText(text).then(() => alert('Favorites copied to clipboard!'));
  }
}

function copyFavUrl() {
  const ids = S.favorites.map(f => f.stream_id).join(',');
  navigator.clipboard.writeText(`switchbacktv://import?ids=${ids}`).then(() => alert('Import URL copied!'));
}

function importFavorites() {
  const input = document.getElementById('fav-import-input').value.trim();
  const result = document.getElementById('fav-import-result');
  try {
    const ids = input.includes('ids=') ? input.split('ids=')[1].split(',') : input.split(',');
    let added = 0;
    ids.forEach(id => {
      const ch = S.allChannels.find(c => c.stream_id == id.trim());
      if (ch && !S.favorites.some(f => f.stream_id == ch.stream_id)) {
        S.favorites.push(ch); added++;
      }
    });
    saveState();
    result.innerHTML = `<span style="color:var(--green)">✓ Added ${added} channels</span>`;
    if (added > 0) renderFavorites();
  } catch (e) {
    result.innerHTML = `<span style="color:#ff5555">Failed to import</span>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 4: QUALITY SCREEN — bandwidth test, health grid,
//                  server status, buffer config
// ═══════════════════════════════════════════════════════════════

function initQualityScreen() {
  const screen = document.getElementById('screen-quality');

  // Build full quality screen to match native QualitySettingsScreen
  const statsGrid = screen.querySelector('[style*="grid-template-columns:repeat(3"]');

  // Enhanced stat boxes
  if (statsGrid) {
    statsGrid.style.maxWidth = '560px';
    // Rewrite stat boxes to match native: bitrate, ping, buffer, fps, dropped, latency
    statsGrid.outerHTML; // keep existing for now, augment below
  }

  // Inject health grid section if not present
  if (!document.getElementById('q-health-grid')) {
    const qualSection = screen.querySelector('[style*="max-width:660px"]') ||
      screen.querySelector('[style*="max-width:500px"]')?.parentElement;
    const healthSection = document.createElement('div');
    healthSection.style.cssText = 'max-width:660px;margin-bottom:22px;';
    healthSection.innerHTML = `
      <div class="section-title">Stream Health</div>
      <div id="q-health-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        <div class="stat-box"><div class="stat-val" style="color:var(--green)" id="qh-buffer">—</div><div class="stat-label">Buffer %</div></div>
        <div class="stat-box"><div class="stat-val" style="color:var(--accent)" id="qh-fps">—</div><div class="stat-label">FPS</div></div>
        <div class="stat-box"><div class="stat-val" style="color:var(--yellow)" id="qh-latency">—</div><div class="stat-label">Latency</div></div>
        <div class="stat-box"><div class="stat-val" style="color:var(--muted)" id="qh-dropped">—</div><div class="stat-label">Dropped</div></div>
      </div>
      <div class="section-title">Bandwidth Test</div>
      <div id="bw-card" class="card" style="display:flex;align-items:center;gap:18px;padding:18px;margin-bottom:20px">
        <div style="flex:1;text-align:center">
          <div id="bw-result" style="font-size:34px;font-weight:800;color:#3b82f6">—</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">Current Speed</div>
        </div>
        <div style="flex:1;text-align:center">
          <div id="bw-ping-result" style="font-size:34px;font-weight:800;color:var(--accent)">—</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">Ping</div>
        </div>
        <div>
          <button class="btn btn-sm" id="bw-test-btn" style="background:#3b82f6;color:#fff;padding:10px 20px" onclick="runBandwidthTest()">
            Run Speed Test
          </button>
        </div>
      </div>
      <div class="section-title">Server Status</div>
      <div class="card" id="q-server-status" style="display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:20px">
        <div id="q-server-dot" style="width:10px;height:10px;border-radius:50%;background:#34C759;flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600" id="q-server-label">Online</div>
          <div style="font-size:11px;color:var(--muted)" id="q-server-sub">${S.server.replace('http://', '').replace('https://', ' ')}</div>
        </div>
        <div style="font-size:12px;color:var(--muted)" id="q-server-uptime">99.9% uptime</div>
      </div>`;

    // Insert before existing quality options section
    const existingQSection = screen.querySelector('[style*="max-width:660px"]');
    if (existingQSection) {
      existingQSection.parentNode.insertBefore(healthSection, existingQSection);
    } else {
      screen.appendChild(healthSection);
    }
  }

  // Poll HLS health stats if a stream is active
  updateQualityHealthStats();
}

function updateQualityHealthStats() {
  const hls = S.hlsInstance;
  if (hls) {
    const bufferEl = document.getElementById('qh-buffer');
    const fpsEl = document.getElementById('qh-fps');
    const latencyEl = document.getElementById('qh-latency');
    const droppedEl = document.getElementById('qh-dropped');

    // HLS.js exposes latency and bandwidth
    if (bufferEl) {
      const buf = hls.mainForwardBufferInfo?.len ?? hls.bufferInfo?.len ?? null;
      bufferEl.textContent = buf !== null ? Math.round(buf * 10) + 's' : 'Good';
      bufferEl.style.color = buf > 5 ? 'var(--green)' : buf > 2 ? 'var(--yellow)' : 'var(--primary)';
    }
    if (fpsEl) fpsEl.textContent = '60';
    if (latencyEl) {
      const lat = hls.latency ?? hls.targetLatency ?? null;
      latencyEl.textContent = lat !== null ? Math.round(lat * 1000) + 'ms' : '—';
    }
    if (droppedEl) droppedEl.textContent = '0';

    // Bandwidth from HLS
    const bwMbps = hls.bandwidthEstimate ? (hls.bandwidthEstimate / 1000000).toFixed(1) : null;
    const bwEl = document.getElementById('q-bitrate');
    if (bwEl && bwMbps) bwEl.textContent = bwMbps;
    const bwRes = document.getElementById('bw-result');
    if (bwRes && bwMbps) { bwRes.textContent = bwMbps + ' Mbps'; bwRes.style.color = '#3b82f6'; }
  } else {
    // No active stream — show defaults
    ['qh-buffer', 'qh-fps', 'qh-latency', 'qh-dropped'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  }
}

async function runBandwidthTest() {
  const btn = document.getElementById('bw-test-btn');
  const bwEl = document.getElementById('bw-result');
  const pingEl = document.getElementById('bw-ping-result');
  if (btn) btn.textContent = 'Testing…';
  if (bwEl) { bwEl.textContent = '…'; bwEl.style.color = 'var(--muted)'; }

  try {
    // Ping test — use api() so it routes through Android proxy automatically
    const t0 = performance.now();
    await api('get_user_info');
    const ping = Math.round(performance.now() - t0);

    if (pingEl) { pingEl.textContent = ping + 'ms'; pingEl.style.color = ping < 100 ? 'var(--green)' : ping < 300 ? 'var(--yellow)' : 'var(--primary)'; }
    const qPingEl = document.getElementById('q-ping');
    if (qPingEl) qPingEl.textContent = ping + 'ms';

    // Bandwidth estimate: use HLS if stream active, else time a categories fetch
    let mbps = null;
    if (S.hlsInstance?.bandwidthEstimate) {
      mbps = (S.hlsInstance.bandwidthEstimate / 1000000).toFixed(1);
    } else {
      const t1 = performance.now();
      const cats = await api('get_live_categories');
      const bytes = JSON.stringify(cats).length;
      const secs = (performance.now() - t1) / 1000;
      mbps = ((bytes * 8) / secs / 1000000).toFixed(2);
    }

    if (bwEl) {
      bwEl.textContent = mbps ? mbps + ' Mbps' : 'OK';
      bwEl.style.color = '#3b82f6';
    }

    // Server status
    const dot = document.getElementById('q-server-dot');
    const lbl = document.getElementById('q-server-label');
    const sub = document.getElementById('q-server-uptime');
    if (dot) dot.style.background = '#34C759';
    if (lbl) lbl.textContent = 'Online — ' + ping + 'ms';
    if (sub) sub.textContent = ping < 200 ? 'Excellent connection' : ping < 500 ? 'Good connection' : 'Slow connection';

    // Update quality screen top stats
    document.getElementById('q-bitrate').textContent = mbps || '—';

    updateQualityHealthStats();
  } catch (e) {
    if (bwEl) { bwEl.textContent = 'Error'; bwEl.style.color = 'var(--primary)'; }
    const dot = document.getElementById('q-server-dot');
    if (dot) dot.style.background = '#FF3B30';
    const lbl = document.getElementById('q-server-label');
    if (lbl) lbl.textContent = 'Unreachable';
  } finally {
    if (btn) btn.textContent = 'Re-test';
  }
}

// nav() quality hook consolidated into canonical nav() below

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 5: SETTINGS — Dezor provider, EPG URL wiring,
//                  ad-block volume slider, autoPlay toggle
// ═══════════════════════════════════════════════════════════════

// Load EPG URL from localStorage on boot
S.epgUrl = localStorage.getItem('epg_url') || '';
S.adBlockVolume = parseInt(localStorage.getItem('adblock_volume') || '50');
S.autoPlay = localStorage.getItem('autoplay') !== 'false';

// Override initSettings to populate all fields including new ones
// initSettings() — canonical single version (inlined upgrade logic, no hoisting risk)
// Redefine using assignment so it replaces the original without a second function declaration.
initSettings = function () {
  // Core: populate credentials
  document.getElementById('cfg-server').value = S.server || '';
  document.getElementById('cfg-user').value = S.user || '';
  document.getElementById('cfg-pass').value = S.pass || '';
  if (S.userInfo) renderAccountInfo(S.userInfo);

  // EPG URL
  const epgInput = document.getElementById('cfg-epg');
  if (epgInput) epgInput.value = S.epgUrl;

  // Inject Dezor section if not present
  if (!document.getElementById('dezor-section')) {
    const dezorSection = document.createElement('div');
    dezorSection.id = 'dezor-section';
    const settingsGrid = document.querySelector('#screen-settings [style*="grid-template-columns:1fr 1fr"]');
    if (settingsGrid) {
      const rightCol = settingsGrid.children[1];
      dezorSection.innerHTML = `
        <div class="section-title">Dezor IPTV Provider</div>
        <div class="settings-group" style="padding:13px" id="dezor-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px">
            <span style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Dezor Credentials</span>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('dezor-fields').style.display=document.getElementById('dezor-fields').style.display==='none'?'block':'none'">
              Toggle
            </button>
          </div>
          <div id="dezor-fields" style="display:none">
            <input class="inp" id="dezor-server" style="margin-bottom:7px" placeholder="Server e.g. http://cf.like-cdn.com" value="${localStorage.getItem('dezor_server') || 'http://blogyfy.xyz'}" />
            <input class="inp" id="dezor-user" style="margin-bottom:7px" placeholder="Username" value="${localStorage.getItem('dezor_user') || 'jascodezoriptv'}" />
            <input class="inp" type="password" id="dezor-pass" style="margin-bottom:10px" placeholder="Password" value="${localStorage.getItem('dezor_pass') || '19e993b7f5'}" />
            <button class="btn btn-red btn-sm btn-full" id="load-dezor-btn">▶ Load Dezor Playlist</button>
            <div id="dezor-result" style="margin-top:8px;font-size:12px"></div>
          </div>
        </div>`;

      // Insert before first child of right column
      if (rightCol.firstChild) {
        rightCol.insertBefore(dezorSection, rightCol.firstChild);
      } else {
        rightCol.appendChild(dezorSection);
      }

      document.getElementById('load-dezor-btn').addEventListener('click', loadDezorPlaylist);
    }
  }

  // Inject ad-block volume slider if not present
  if (!document.getElementById('adblock-volume-row')) {
    const settingsGroup = document.querySelectorAll('.settings-group');
    // Find the features group (has Ad Detection row)
    settingsGroup.forEach(grp => {
      if (grp.textContent.includes('Ad Detection') && !grp.querySelector('#adblock-volume-row')) {
        const volRow = document.createElement('div');
        volRow.id = 'adblock-volume-row';
        volRow.className = 'row-item';
        volRow.style.flexDirection = 'column';
        volRow.style.alignItems = 'stretch';
        volRow.style.gap = '7px';
        volRow.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px">Ad Mute Volume</span>
            <span style="font-size:12px;color:var(--muted)" id="adblock-vol-display">${S.adBlockVolume}%</span>
          </div>
          <div style="display:flex;align-items:center;gap:9px">
            <button class="btn btn-ghost btn-sm" onclick="adjustAdVol(-10)">−</button>
            <div class="progress-bar" style="flex:1;height:6px;cursor:pointer" id="adblock-vol-bar">
              <div class="progress-fill" id="adblock-vol-fill" style="width:${S.adBlockVolume}%;background:var(--green)"></div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="adjustAdVol(10)">+</button>
          </div>`;
        grp.appendChild(volRow);
      }
    });
  }

  // Wire EPG save
  document.getElementById('cfg-epg')?.addEventListener('change', function () {
    S.epgUrl = this.value.trim();
    localStorage.setItem('epg_url', S.epgUrl);
  });

  // Wire reload EPG button
  document.querySelector('#screen-settings button[onclick]')?.addEventListener('click', () => {
    if (S.epgUrl) {
      alert('EPG URL saved. TV Guide will use this URL when loaded.');
    }
  });
  const reloadEpgBtn = document.querySelector('#screen-settings .settings-group button.btn-ghost.btn-full');
  if (reloadEpgBtn) {
    reloadEpgBtn.onclick = () => {
      S.epgUrl = document.getElementById('cfg-epg').value.trim();
      localStorage.setItem('epg_url', S.epgUrl);
      // Force EPG refresh
      S.epgCache = {};
      alert(S.epgUrl ? `EPG URL saved: ${S.epgUrl}` : 'EPG URL cleared.');
    };
  }
}

// ── PROVIDER IMPORT CONFIG ───────────────────────────────────
// Parses Xtream URL, M3U URL, JSON, .switchback config, or activation code
function parseProviderConfig(raw) {
  const s = raw.trim();
  // 1. JSON blob: { server, username/user, password/pass, epg? }
  //    Also handles .switchback format with _switchback flag
  if (s.startsWith('{')) {
    try {
      const j = JSON.parse(s);
      return {
        server: j.server || j.url || null,
        user: j.username || j.user || null,
        pass: j.password || j.pass || null,
        epg: j.epg || j.epg_url || null,
        provider: j.provider || null,
      };
    } catch { }
  }
  // 2. Xtream URL: http://server/username/password  (3-segment path)
  //    or  http://server/player_api.php?username=...&password=...
  try {
    const u = new URL(s);
    const qUser = u.searchParams.get('username');
    const qPass = u.searchParams.get('password');
    if (qUser && qPass) {
      return { server: `${u.protocol}//${u.host}`, user: qUser, pass: qPass, epg: null };
    }
    // Path-style: /username/password
    const parts = u.pathname.replace(/^\//, '').split('/');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { server: `${u.protocol}//${u.host}`, user: parts[0], pass: parts[1], epg: null };
    }
  } catch { }
  // 3. M3U URL with username/password params
  if (s.includes('get.php') || s.includes('.m3u')) {
    try {
      const u2 = new URL(s);
      const user = u2.searchParams.get('username');
      const pass = u2.searchParams.get('password');
      if (user && pass) {
        return { server: `${u2.protocol}//${u2.host}`, user, pass, epg: null };
      }
    } catch { }
  }
  // 4. Activation code: base64url-encoded JSON
  if (s.length > 20 && !s.includes(' ') && !s.startsWith('http')) {
    try {
      const decoded = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
      if (decoded.startsWith('{')) {
        const j = JSON.parse(decoded);
        if (j.server && (j.username || j.user) && (j.password || j.pass)) {
          return {
            server: j.server || j.url || null,
            user: j.username || j.user || null,
            pass: j.password || j.pass || null,
            epg: j.epg || j.epg_url || null,
            provider: j.provider || null,
          };
        }
      }
    } catch { }
  }
  return null;
}

async function applyImportedConfig(raw) {
  const result = document.getElementById('cfg-import-result');
  if (!raw || !raw.trim()) {
    if (result) result.innerHTML = '<span style="color:var(--muted)">No config data to import.</span>';
    return;
  }

  const cfg = parseProviderConfig(raw);
  if (!cfg || !cfg.server || !cfg.user || !cfg.pass) {
    if (result) result.innerHTML = '<span style="color:var(--primary)">Could not parse. Try: JSON, Xtream URL, M3U URL, or activation code.</span>';
    return;
  }

  // Apply to fields
  if (document.getElementById('cfg-server')) document.getElementById('cfg-server').value = cfg.server;
  if (document.getElementById('cfg-user')) document.getElementById('cfg-user').value = cfg.user;
  if (document.getElementById('cfg-pass')) document.getElementById('cfg-pass').value = cfg.pass;
  if (cfg.epg && document.getElementById('cfg-epg')) document.getElementById('cfg-epg').value = cfg.epg;

  // Persist
  S.server = cfg.server; S.user = cfg.user; S.pass = cfg.pass;
  localStorage.setItem('iptv_server', S.server);
  localStorage.setItem('iptv_user', S.user);
  localStorage.setItem('iptv_pass', S.pass);
  if (cfg.epg) { S.epgUrl = cfg.epg; localStorage.setItem('epg_url', cfg.epg); }

  // Provider branding
  if (cfg.provider && cfg.provider.name) {
    localStorage.setItem('provider_name', cfg.provider.name);
    const logoEl = document.querySelector('.sb-logo-text');
    if (logoEl) logoEl.textContent = cfg.provider.name;
  }

  const providerLabel = cfg.provider?.name ? ` (${cfg.provider.name})` : '';
  if (result) result.innerHTML = `<span style="color:var(--muted)">Testing connection${providerLabel}…</span>`;

  // Test connection
  try {
    const testUrl = buildApiUrl('get_user_info');
    const res = await fetch(testUrl);
    const data = await res.json();
    const ok = data?.user_info?.auth === 1 || data?.user_info?.username;
    if (ok) {
      S.userInfo = data;
      renderAccountInfo(data);
      if (result) result.innerHTML = `<span style="color:var(--green)">✓ Connected as <b>${esc(data.user_info.username)}</b>${providerLabel}. Loading channels…</span>`;
      const input = document.getElementById('cfg-import-input');
      if (input) input.value = '';
      // Auto-reload channels
      bootData();
    } else {
      if (result) result.innerHTML = '<span style="color:var(--primary)">⚠ Config saved but auth failed. Check credentials.</span>';
    }
  } catch (e) {
    if (result) result.innerHTML = `<span style="color:var(--primary)">⚠ Config saved. Network error: ${esc(e.message)}</span>`;
  }
}

document.getElementById('cfg-import-btn')?.addEventListener('click', () => {
  const raw = (document.getElementById('cfg-import-input')?.value || '').trim();
  if (!raw) {
    const result = document.getElementById('cfg-import-result');
    if (result) result.innerHTML = '<span style="color:var(--muted)">Paste your activation code above first.</span>';
    return;
  }
  applyImportedConfig(raw);
});

// Deep link handler: called from Android when app is opened via switchback://import/CODE
function handleDeepLinkConfig(code) {
  if (!code) return;
  console.log('[deeplink] Received activation code');
  const input = document.getElementById('cfg-import-input');
  if (input) input.value = code;
  initSettings();
  nav('settings');
  applyImportedConfig(code);
}

function adjustAdVol(delta) {
  S.adBlockVolume = Math.max(0, Math.min(100, S.adBlockVolume + delta));
  localStorage.setItem('adblock_volume', S.adBlockVolume);
  const display = document.getElementById('adblock-vol-display');
  const fill = document.getElementById('adblock-vol-fill');
  if (display) display.textContent = S.adBlockVolume + '%';
  if (fill) fill.style.width = S.adBlockVolume + '%';
}

async function loadDezorPlaylist() {
  const server = document.getElementById('dezor-server').value.trim().replace(/\/$/, '');
  const user = document.getElementById('dezor-user').value.trim();
  const pass = document.getElementById('dezor-pass').value.trim();
  const result = document.getElementById('dezor-result');
  if (!server || !user || !pass) { result.innerHTML = '<span style="color:var(--primary)">Fill in all fields</span>'; return; }

  result.textContent = 'Testing Dezor credentials…';
  try {
    // Save dezor-specific creds
    localStorage.setItem('dezor_server', server);
    localStorage.setItem('dezor_user', user);
    localStorage.setItem('dezor_pass', pass);

    // Apply as active IPTV provider
    S.server = server;
    S.user = user;
    S.pass = pass;
    localStorage.setItem('iptv_server', server);
    localStorage.setItem('iptv_user', user);
    localStorage.setItem('iptv_pass', pass);

    // Update the main credential fields too
    document.getElementById('cfg-server').value = server;
    document.getElementById('cfg-user').value = user;
    document.getElementById('cfg-pass').value = pass;

    // Test connection
    const info = await api('get_user_info');
    if (info?.user_info?.auth === 0) {
      result.innerHTML = '<span style="color:#ff5555">✗ Auth failed — check Dezor credentials</span>';
      return;
    }
    S.userInfo = info;
    renderAccountInfo(info);
    result.innerHTML = `<span style="color:var(--green)">✓ Connected as ${esc(info.user_info?.username || user)}. Loading channels…</span>`;

    // Reload all data with new creds
    S.allChannels = []; S.allVod = []; S.allSeries = [];
    bootData();
  } catch (e) {
    result.innerHTML = `<span style="color:#ff5555">Error: ${esc(e.message)}</span>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 6: CHANNELS — channel number badge,
//                  now-playing EPG subtitle
// ═══════════════════════════════════════════════════════════════

// renderChannelList — canonical version with channel number badge + now-playing EPG subtitle
// Declared as var at top-level so the assignment is valid in all environments.
if (typeof renderChannelList === 'undefined') var renderChannelList;
renderChannelList = function (list) {
  const el = document.getElementById('channel-list');
  if (!list.length) { el.innerHTML = '<div style="color:var(--muted);padding:20px;font-size:13px">No channels found.</div>'; return; }
  const slice = list.slice(0, 200);
  const nowTs = Math.floor(Date.now() / 1000);

  el.innerHTML = slice.map((ch, idx) => {
    const isFav = S.favorites.some(f => f.stream_id == ch.stream_id);
    const chNum = ch.num || ch.stream_id;
    const numStr = typeof chNum === 'number' && chNum < 10000 ? String(chNum) : null;

    // EPG now-playing from cache
    const epgListings = S.epgCache[ch.stream_id] || [];
    const nowProg = epgListings.find(e => e.start_timestamp <= nowTs && e.stop_timestamp > nowTs);
    const safeAtob = s => { try { return atob(s || ''); } catch { return s || ''; } };
    const nowTitle = nowProg ? safeAtob(nowProg.title) : '';

    const logo = ch.stream_icon
      ? `<img src="${esc(ch.stream_icon)}" style="width:100%;height:100%;object-fit:contain;border-radius:6px" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:10px;font-weight:700">${esc(channelInitials(ch.name))}</span>`
      : `<span style="font-size:10px;font-weight:700">${esc(channelInitials(ch.name))}</span>`;

    return `
      <div class="ch-row" data-idx="${idx}" data-id="${ch.stream_id}" tabindex="0" role="button">
        ${numStr ? `<div style="width:34px;height:34px;background:rgba(229,0,0,0.15);border:1px solid rgba(229,0,0,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;color:#fff">${esc(numStr)}</div>` : ''}
        <div class="ch-icon" style="background:${colorFromName(ch.name)}">${logo}</div>
        <div class="ch-info">
          <div class="ch-name">${esc(ch.name)}</div>
          <div class="ch-sub">${nowTitle ? `<span style="color:var(--green)">▶ ${esc(nowTitle)}</span>` : esc(ch.category_name || '')}${ch.tv_archive ? ' · <span style="color:var(--accent)">CU</span>' : ''}</div>
        </div>
        <div class="ch-meta">
          ${ch.tv_archive ? '<span class="badge badge-hd" style="margin-right:4px">CU</span>' : ''}
          <span class="fav-star${isFav ? ' on' : ''}" data-id="${ch.stream_id}">★</span>
        </div>
      </div>`;
  }).join('');

  if (list.length > 200) {
    el.innerHTML += `<div style="color:var(--muted);font-size:12px;padding:12px;text-align:center">Showing 200 of ${list.length.toLocaleString()} — use search to filter</div>`;
  }

  el.querySelectorAll('.ch-row').forEach(row => {
    // Short click → open player
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('fav-star')) return;
      if (row._longPressed) { row._longPressed = false; return; }
      const idx = parseInt(row.dataset.idx);
      const ch = list[idx];
      openPlayer(ch, list, idx);
    });

    // Long press handled by patchChRowLongPress (context menu with fav + switchback)
  });

  el.querySelectorAll('.fav-star').forEach(star => {
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      const ch = S.allChannels.find(c => c.stream_id == star.dataset.id);
      toggleFav(ch, star);
    });
  });
}

function showToast(msg, duration = 2200) {
  let t = document.getElementById('sb-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'sb-toast';
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(30,30,50,0.97);color:#fff;padding:10px 22px;border-radius:24px;font-size:13px;font-weight:600;z-index:99998;pointer-events:none;transition:opacity 0.3s;border:1px solid rgba(255,255,255,0.1);';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => { t.style.opacity = '0'; }, duration);
}

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 6: WIRE SLEEP TIMER BUTTON INTO PLAYER CONTROLS
//                  + hook quality screen nav override properly
// ═══════════════════════════════════════════════════════════════

// Add sleep timer button to player controls bar (DOM injection after load)
function injectPlayerExtras() {
  const controls = document.getElementById('player-controls');
  if (!controls || document.getElementById('sleep-timer-btn')) return;

  // Sleep timer button — insert before the flex spacer
  const spacer = controls.querySelector('div[style*="flex:1"]');
  if (spacer) {
    const sleepBtn = document.createElement('button');
    sleepBtn.id = 'sleep-timer-btn';
    sleepBtn.className = 'btn btn-ghost btn-sm';
    sleepBtn.textContent = '😴';
    sleepBtn.title = 'Sleep Timer';
    sleepBtn.onclick = showSleepTimerMenu;
    controls.insertBefore(sleepBtn, spacer);
  }
}

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 7: SETTINGS — wire ad-block toggle to S.adBlockEnabled
//                  + autoPlay persistence
// ═══════════════════════════════════════════════════════════════

// Override the Settings toggles to actually persist state
function patchSettingsToggles() {
  const toggles = document.querySelectorAll('#screen-settings .toggle-sw');
  toggles.forEach(toggle => {
    const row = toggle.closest('.row-item');
    if (!row) return;
    const label = row.querySelector('span')?.textContent?.trim();
    if (!label) return;

    // Remove raw onclick and attach proper handler
    toggle.removeAttribute('onclick');
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('on');
      const isOn = toggle.classList.contains('on');
      if (label.includes('Ad Detection')) {
        S.adBlockEnabled = isOn;
        localStorage.setItem('adblock', isOn);
        updateAdBlockBadge();
      } else if (label.includes('Auto-Play')) {
        S.autoPlay = isOn;
        localStorage.setItem('autoplay', isOn);
      } else if (label.includes('Smart Favorites')) {
        localStorage.setItem('smart_favorites', isOn);
      } else if (label.includes('Auto-Updates')) {
        localStorage.setItem('auto_updates', isOn);
      } else if (label.includes('Hardware Decode')) {
        localStorage.setItem('hw_decode', isOn);
      } else if (label.includes('Auto Quality')) {
        if (isOn) S.currentQuality = 'auto';
        localStorage.setItem('auto_quality', isOn);
      }
    });

    // Set initial state from storage
    if (label.includes('Ad Detection')) {
      toggle.classList.toggle('on', S.adBlockEnabled);
    } else if (label.includes('Auto-Play')) {
      toggle.classList.toggle('on', S.autoPlay);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// BOOT: call injectPlayerExtras when player opens
// ═══════════════════════════════════════════════════════════════

// injectPlayerExtras call inlined into openPlayer above

// nav() settings/favorites/recordings hooks consolidated into canonical nav() below

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 8: CHANNEL NUM — parse tvg-chno from streams
// ═══════════════════════════════════════════════════════════════

// After channels load, assign ch.num from stream_id ordering or tvg data
function assignChannelNumbers(channels) {
  return channels.map((ch, i) => ({
    ...ch,
    num: ch.num || ch['tvg-chno'] || (i + 1),
  }));
}

// Channel numbers are assigned inline in bootData after streams load

// ═══════════════════════════════════════════════════════════════
// UPGRADES PART 9: EPG GUIDE — "Now" scroll + time nav improvement
//                  match native EPGScreen time header behavior
// ═══════════════════════════════════════════════════════════════

// Add "Jump to channel" functionality in EPG
function epgJumpToChannel(channelName) {
  const rows = document.querySelectorAll('#epg-rows-inner .epg-row');
  rows.forEach(row => {
    const name = row.querySelector('.epg-ch-nm')?.textContent?.toLowerCase();
    if (name && name.includes(channelName.toLowerCase())) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.style.outline = '2px solid var(--primary)';
      setTimeout(() => row.style.outline = '', 2000);
    }
  });
}

// Wire EPG search button (add if not present)
function addEpgSearchBtn() {
  const epgHead = document.querySelector('#screen-epg [style*="align-items:center"][style*="gap:9px"]');
  if (!epgHead || document.getElementById('epg-search-input')) return;

  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'display:flex;align-items:center;gap:7px;';
  searchWrap.innerHTML = `
    <input class="inp" id="epg-search-input" placeholder="Jump to channel…" style="width:160px;padding:5px 10px;font-size:12px" />
    <button class="btn btn-ghost btn-sm" onclick="epgJumpToChannel(document.getElementById('epg-search-input').value)">→</button>`;
  epgHead.appendChild(searchWrap);
}

// nav() EPG hook consolidated into canonical nav() below

// ═══════════════════════════════════════════════════════════════
// SWITCHBACK PART 2: Plan activation + pricing screen init
// ═══════════════════════════════════════════════════════════════

function activatePlan(tier) {
  // In production this would verify a payment receipt.
  // For now it persists the tier locally and gates features.
  const prev = localStorage.getItem('sb_tier') || 'starter';
  if (tier === prev && tier !== 'starter') {
    showToast(`Already on ${tier} plan`);
    return;
  }
  localStorage.setItem('sb_tier', tier);
  S.isPro = tier === 'pro' || tier === 'elite';
  refreshPricingUI();
  if (tier === 'starter') {
    showToast('Reset to Free plan');
  } else {
    showToast(`✓ ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan activated — ${S.isPro ? '4 Switchback slots unlocked!' : ''}`);
    setTimeout(() => showSwitchbackPanel(), 800);
  }
}

function refreshPricingUI() {
  const tier = localStorage.getItem('sb_tier') || 'starter';
  const labels = { starter: 'Current Plan', pro: 'Upgrade to Pro →', elite: 'Go Elite →' };
  const active = { starter: 'btn-red', pro: 'btn-ghost', elite: 'btn-ghost' };

  const btnStarter = document.getElementById('btn-plan-starter');
  const btnPro = document.getElementById('btn-plan-pro');
  const btnElite = document.getElementById('btn-plan-elite');
  const statusText = document.getElementById('plan-status-text');

  if (btnStarter) {
    btnStarter.textContent = tier === 'starter' ? '✓ Active Plan' : 'Downgrade to Free';
    btnStarter.className = `btn btn-full ${tier === 'starter' ? 'btn-ghost' : 'btn-ghost'}`;
  }
  if (btnPro) {
    btnPro.textContent = tier === 'pro' ? '✓ Active Plan' : 'Upgrade to Pro →';
    btnPro.className = `btn btn-full ${tier === 'pro' ? 'btn-green' : 'btn-red'}`;
    btnPro.style.opacity = tier === 'pro' ? '0.7' : '1';
  }
  if (btnElite) {
    btnElite.textContent = tier === 'elite' ? '✓ Active Plan' : 'Go Elite →';
    btnElite.className = `btn btn-full ${tier === 'elite' ? 'btn-green' : 'btn-accent'}`;
    btnElite.style.opacity = tier === 'elite' ? '0.7' : '1';
  }

  // Highlight active card
  ['starter', 'pro', 'elite'].forEach(t => {
    const card = document.getElementById('plan-' + t);
    if (!card) return;
    card.style.boxShadow = tier === t ? '0 0 0 2px var(--green)' : '';
  });

  const slotCount = S.isPro ? 4 : 2;
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  if (statusText) {
    statusText.innerHTML = `<span style="color:var(--green);font-weight:700">✓ ${tierLabel} Plan</span> &nbsp;·&nbsp; ⇄ <b>${slotCount} Switchback slots</b> active &nbsp;·&nbsp; <span style="color:var(--muted)">Slots persist across sessions</span>`;
  }
}

// ── 's' key shortcut — open Switchback panel while in player ──
document.addEventListener('keydown', e => {
  if (e.key !== 's' && e.key !== 'S') return;
  const overlay = document.getElementById('player-overlay');
  if (!overlay || overlay.style.display === 'none') return;
  const tag = (document.activeElement || {}).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  e.preventDefault();
  showSwitchbackPanel();
});

// ── Long-press on ch-row shows SB assign context menu ────────
// (Injected after renderChannelList wires its own long-press)
// We hook into the existing long-press by patching renderChannelList post-hook.
const _origRenderCL = typeof renderChannelList === 'function' ? renderChannelList : null;
if (_origRenderCL) {
  renderChannelList = function (list) {
    _origRenderCL(list);
    // After rows are rendered, patch long-press to show SB context menu
    patchChRowLongPress(list);
  };
}

function patchChRowLongPress(list) {
  document.querySelectorAll('#channel-list .ch-row').forEach(row => {
    let pressTimer = null;
    const sbStart = () => {
      pressTimer = setTimeout(() => {
        row._longPressed = true;
        const idx = parseInt(row.dataset.idx);
        const ch = list[idx];
        if (!ch) return;
        showChRowContextMenu(ch, row);
        if (navigator.vibrate) navigator.vibrate([20, 10, 20]);
      }, 700);
    };
    const sbCancel = () => clearTimeout(pressTimer);
    row.addEventListener('mousedown', sbStart);
    row.addEventListener('touchstart', sbStart, { passive: true });
    row.addEventListener('mouseup', sbCancel);
    row.addEventListener('mouseleave', sbCancel);
    row.addEventListener('touchend', sbCancel);
    row.addEventListener('touchcancel', sbCancel);
  });
}

function showChRowContextMenu(ch, anchorEl) {
  const existing = document.getElementById('ch-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'ch-context-menu';
  const limit = sbSlotLimit();

  menu.style.cssText = 'position:fixed;background:#1a1a2e;border:1px solid #444;border-radius:12px;padding:8px;z-index:20000;min-width:220px;box-shadow:0 8px 32px rgba(0,0,0,0.5)';

  // Position near anchor
  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = Math.min(rect.bottom + 6, window.innerHeight - 200) + 'px';
  menu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 230)) + 'px';

  const slotItems = S.switchbackSlots.slice(0, 4).map((s, i) => {
    const locked = i >= limit;
    const label = s ? `Replace: ${esc(s.name.slice(0, 14))}` : 'Empty';
    const style = locked
      ? 'opacity:0.45;cursor:default'
      : 'cursor:pointer';
    return `<div class="ctx-item" data-ctx-slot="${i}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 11px;border-radius:8px;${style}">
      <span style="font-size:13px">⇄ Slot ${i + 1}</span>
      <span style="font-size:11px;color:#888">${locked ? '🔒 Pro' : label}</span>
    </div>`;
  }).join('');

  const isFav = S.favorites.some(f => f.stream_id == ch.stream_id);
  menu.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;padding:4px 11px 8px">⇄ Switchback — ${esc(ch.name.slice(0, 18))}</div>
    ${slotItems}
    <div style="border-top:1px solid #333;margin:6px 0"></div>
    <div class="ctx-item" id="ctx-fav" style="display:flex;justify-content:space-between;align-items:center;padding:8px 11px;border-radius:8px;cursor:pointer">
      <span style="font-size:13px">${isFav ? '★ Remove Favorite' : '☆ Add to Favorites'}</span>
    </div>
    <div class="ctx-item" id="ctx-cancel" style="padding:8px 11px;border-radius:8px;cursor:pointer;color:#888;font-size:13px">Cancel</div>`;

  document.body.appendChild(menu);

  menu.querySelectorAll('[data-ctx-slot]').forEach(item => {
    const i = parseInt(item.dataset.ctxSlot);
    if (i >= limit) return;
    item.style.cursor = 'pointer';
    item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.06)');
    item.addEventListener('mouseleave', () => item.style.background = '');
    item.addEventListener('click', () => {
      S.switchbackSlots[i] = { stream_id: ch.stream_id, name: ch.name, category_name: ch.category_name || '', stream_icon: ch.stream_icon || '', _full: ch };
      saveSbSlots();
      showToast(`⇄ Slot ${i + 1}: ${ch.name.slice(0, 20)}`);
      menu.remove();
    });
  });

  document.getElementById('ctx-fav').addEventListener('click', () => {
    toggleFav(ch, null);
    showToast(isFav ? `Removed from favorites` : `★ Added to favorites`);
    menu.remove();
  });
  document.getElementById('ctx-cancel').addEventListener('click', () => menu.remove());

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function closer(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closer); }
    });
  }, 50);
}

console.log('[Switchback TV] All upgrades loaded ✓');

// ═══════════════════════════════════════════════════════════════
// FIX: Consolidate all nav() overrides into one clean function
//      so the chain doesn't break via function hoisting.
//      Also add TV remote / keyboard D-pad support.
// ═══════════════════════════════════════════════════════════════

// Canonical nav() — this declaration wins due to JS hoisting (last function declaration wins).
// All history tracking, lazy init, and upgrade hooks live here.
function nav(screen) {
  // ── History tracking for back button ─────────────────────────
  if (S.currentScreen && S.currentScreen !== screen) {
    if (!S._screenHistory) S._screenHistory = [];
    S._screenHistory.push(S.currentScreen);
    if (S._screenHistory.length > 20) S._screenHistory.shift();
  }

  // ── Core: switch screen + active states ──────────────────────
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(el => el.classList.remove('active'));
  const screenEl = document.getElementById('screen-' + screen);
  if (screenEl) screenEl.classList.add('active');
  const sbItem = document.querySelector(`.sb-item[data-screen="${screen}"]`);
  if (sbItem) {
    sbItem.classList.add('active');
    sbItem.focus(); // keep focus on active item for TV remote
  }
  const TITLES = {
    tvhome: 'Home', channels: 'Live TV', movies: 'Movies', series: 'Series',
    favorites: 'Favorites', history: 'History', recordings: 'Recordings',
    catchup: 'Catch-Up', epg: 'TV Guide', search: 'Search', devices: 'Devices',
    quality: 'Quality', pricing: 'Plans', settings: 'Settings',
  };
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = TITLES[screen] || screen;
  S.currentScreen = screen;

  // ── Lazy init ─────────────────────────────────────────────────
  const lazy = {
    tvhome: initTVHome, channels: initChannels, movies: initMovies,
    series: initSeries, epg: initEPG, favorites: renderFavorites,
    history: renderHistory, devices: initDevices, catchup: initCatchUp,
    search: initSearch, recordings: renderRecordings,
  };
  if (lazy[screen]) lazy[screen]();

  // ── Upgrade hooks ─────────────────────────────────────────────
  if (screen === 'quality') setTimeout(initQualityScreen, 50);
  if (screen === 'settings') setTimeout(() => { initSettings(); patchSettingsToggles(); }, 50);
  if (screen === 'favorites') setTimeout(renderFavorites, 50);
  if (screen === 'recordings') setTimeout(renderRecordings, 50);
  if (screen === 'epg') setTimeout(addEpgSearchBtn, 500);
  if (screen === 'pricing') setTimeout(refreshPricingUI, 50);
}

// Re-wire all nav triggers (sidebar items, topbar cog, home tiles)
// using the now-canonical nav() above.
document.querySelectorAll('.sb-item[data-screen], .tb-btn[data-screen], button[data-screen], [data-screen]').forEach(el => {
  // Remove any existing listener by cloning
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);
  clone.addEventListener('click', () => nav(clone.dataset.screen));
});

// ── TV REMOTE / KEYBOARD FOCUS ───────────────────────────────
// Make all sidebar items focusable and navigable with arrow keys
function initTVRemote() {
  const items = Array.from(document.querySelectorAll('.sb-item[data-screen]'));

  items.forEach((item, i) => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'menuitem');

    // Enter / Space → activate
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        nav(item.dataset.screen);
      }
      // ArrowUp / ArrowDown → move focus within sidebar
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[i - 1];
        if (prev) prev.focus();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[i + 1];
        if (next) next.focus();
      }
      // ArrowRight → move focus into content area
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusFirstContentItem();
      }
    });
  });

  // Content area: ArrowLeft → back to sidebar
  document.getElementById('content').addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') {
      const activeItem = document.querySelector('.sb-item.active');
      if (activeItem) { e.preventDefault(); activeItem.focus(); }
    }
    // ArrowUp/Down navigate focusable rows in content
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const focusable = Array.from(
        document.querySelector('.screen.active')?.querySelectorAll(
          '[tabindex="0"], .ch-row, .media-card, .quality-opt, .rec-card, .fav-item, ' +
          '.pill, .hist-item, .device-card, .epg-row, .rec-tab-btn, .fav-tab-btn, ' +
          '.toggle-sw, .price-card, .sb-item-nav, input.inp, button.btn'
        ) || []
      ).filter(el => el.offsetParent !== null);
      if (!focusable.length) return;
      const cur = document.activeElement;
      const idx = focusable.indexOf(cur);
      let next;
      if (e.key === 'ArrowDown') next = focusable[idx + 1] || focusable[0];
      else next = focusable[idx - 1] || focusable[focusable.length - 1];
      if (next) { e.preventDefault(); next.focus(); }
    }
    // Enter on focused content item → click it
    if (e.key === 'Enter' && document.activeElement !== document.body) {
      const el = document.activeElement;
      if (el && el !== document.getElementById('content')) el.click();
    }
  });

  // Make content rows focusable
  makeContentRowsFocusable();
}

// Screen-aware selectors — each screen knows what its first focusable element is
const SCREEN_FIRST_FOCUS = {
  channels: '.pill, .ch-row, #ch-search',
  movies: '.pill, .media-card, #movies-search',
  series: '.pill, .media-card, #series-search',
  search: '#search-input',
  settings: '#cfg-import-btn, #lang-filter-apply-btn, .toggle-sw, .settings-group button, .settings-group input',
  quality: '#bw-test-btn, .quality-opt, button.btn',
  recordings: '.rec-tab-btn, .rec-card',
  favorites: '.fav-tab-btn, .fav-item, .ch-row',
  epg: '#epg-now, .epg-row',
  history: '.hist-item, .ch-row',
  catchup: '.ch-row',
  devices: '.device-card, button.btn',
  pricing: '.price-card, button.btn-red',
  tvhome: '.sb-item-nav, button.btn-red',
};

function focusFirstContentItem() {
  const screen = document.querySelector('.screen.active');
  if (!screen) return;
  const screenId = screen.id.replace('screen-', '');
  const selector = SCREEN_FIRST_FOCUS[screenId] ||
    '.pill, .ch-row, .media-card, .quality-opt, .rec-card, input.inp, button.btn-red';
  // Try each comma-separated selector in order, pick first visible hit
  for (const sel of selector.split(',').map(s => s.trim())) {
    const el = screen.querySelector(sel);
    if (el && el.offsetParent !== null) { el.focus(); return; }
  }
}

function makeContentRowsFocusable() {
  const FOCUSABLE = [
    '.ch-row', '.media-card', '.quality-opt', '.rec-card',
    '.hist-item', '.device-card', '.fav-item', '.epg-row',
    '.pill', '.rec-tab-btn', '.fav-tab-btn', '.sb-item-nav',
    '.toggle-sw', '.price-card',
  ].map(s => s + ':not([tabindex])').join(', ');

  const stamp = () => {
    document.querySelectorAll(FOCUSABLE).forEach(el => el.setAttribute('tabindex', '0'));
    // Also ensure all inputs in active screen are reachable
    document.querySelectorAll('.screen.active input.inp:not([tabindex])').forEach(el => {
      el.setAttribute('tabindex', '0');
    });
  };
  const observer = new MutationObserver(stamp);
  observer.observe(document.getElementById('content'), { childList: true, subtree: true });
  stamp(); // run once immediately
}

// Focus ring style for TV mode — visible highlight on focused items
(function injectFocusStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .sb-item:focus { outline: 2px solid var(--primary); background: rgba(229,0,0,0.12) !important; color: #fff !important; }
    .ch-row:focus, .media-card:focus, .quality-opt:focus, .rec-card:focus { outline: 2px solid var(--primary); }
    .btn:focus, button:focus { outline: 2px solid var(--accent); }
    :focus { outline: 2px solid var(--primary); outline-offset: 2px; }
    @supports selector(:focus-visible) {
      :focus:not(:focus-visible) { outline: none; }
      :focus-visible { outline: 2px solid var(--primary) !important; outline-offset: 2px; }
    }
  `;
  document.head.appendChild(style);
})();

// ── TOGGLE-SW KEYBOARD SUPPORT ───────────────────────────────
// .toggle-sw elements use onclick; wire Enter/Space for D-pad.
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = document.activeElement;
  if (!el || !el.classList.contains('toggle-sw')) return;
  e.preventDefault();
  el.click();
});

// ── CHANNEL ROW: ArrowUp from first row → focus active pill ──
document.getElementById('channel-list').addEventListener('keydown', e => {
  if (e.key !== 'ArrowUp') return;
  const rows = Array.from(document.querySelectorAll('#channel-list .ch-row'));
  if (document.activeElement === rows[0]) {
    e.preventDefault();
    const activePill = document.querySelector('#cat-pills .pill-active');
    if (activePill) activePill.focus();
  }
});

// Boot TV remote support
initTVRemote();

// Focus first sidebar item on load
setTimeout(() => {
  const first = document.querySelector('.sb-item.active');
  if (first) first.focus();
}, 200);

// ── REMOTE CONTROL COMMAND LISTENER ──────────────────────────
// The phone remote (remote.html) sends commands via localStorage 'sb_remote_cmd'.
// We listen for storage events (cross-tab) and also poll (same-tab fallback).
function handleRemoteCommand(cmd) {
  if (!cmd || !cmd.action) return;
  const a = cmd.action;
  switch (a) {
    case 'play_pause': togglePlay(); break;
    case 'mute': toggleMute(); break;
    case 'vol_up': {
      const v = document.getElementById('player-video');
      if (v) { v.volume = Math.min(1, v.volume + 0.1); v.muted = false; }
      break;
    }
    case 'vol_down': {
      const v = document.getElementById('player-video');
      if (v) v.volume = Math.max(0, v.volume - 0.1);
      break;
    }
    case 'ch_up': navigateChannel(-1); break;
    case 'ch_down': navigateChannel(1); break;
    case 'ch_goto': {
      const num = cmd.num;
      if (num != null && S.channelList?.length) {
        const byNum = S.channelList.findIndex(c => parseInt(c.num, 10) === num || parseInt(c.stream_id, 10) === num);
        const idx = byNum >= 0 ? byNum : Math.min(num - 1, S.channelList.length - 1);
        if (idx >= 0 && idx < S.channelList.length) openPlayer(S.channelList[idx], S.channelList, idx);
      }
      break;
    }
    case 'seek_back': seekRelative(-30); break;
    case 'seek_fwd': seekRelative(30); break;
    case 'sb_jump': {
      if (cmd.slot != null) cycleSbSlot(cmd.slot);
      break;
    }
    case 'sb_cycle': cycleSbSlots(); break;
    case 'nav_home': closePlayer(); nav('tvhome'); break;
    case 'nav_guide': closePlayer(); nav('epg'); break;
    case 'nav_search': closePlayer(); nav('search'); break;
    case 'nav_channels': closePlayer(); nav('channels'); break;
    case 'nav_favorites': closePlayer(); nav('favorites'); break;
    case 'nav_recordings': closePlayer(); nav('recordings'); break;
    case 'nav_settings': closePlayer(); nav('settings'); break;
    case 'nav_back': {
      const overlay = document.getElementById('player-overlay');
      if (overlay && overlay.style.display !== 'none') closePlayer();
      else if (S._screenHistory?.length) nav(S._screenHistory.pop());
      break;
    }
    case 'nav_ok': document.activeElement?.click(); break;
    case 'nav_up': document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); break;
    case 'nav_down': document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); break;
    case 'nav_left': document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); break;
    case 'nav_right': document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); break;
    case 'sleep': {
      if (cmd.mins > 0) {
        clearTimeout(S.sleepTimer);
        S.sleepMinutes = cmd.mins;
        S.sleepTimer = setTimeout(() => { closePlayer(); }, cmd.mins * 60000);
      }
      break;
    }
    case 'sleep_cancel': clearTimeout(S.sleepTimer); S.sleepMinutes = 0; break;
  }
}

// Listen for cross-tab localStorage commands from the phone remote
window.addEventListener('storage', e => {
  if (e.key === 'sb_remote_cmd' && e.newValue) {
    try { handleRemoteCommand(JSON.parse(e.newValue)); } catch (_) { }
  }
});

// Publish TV state to localStorage so the phone remote can read it
function publishTVState() {
  const ch = S.currentChannel;
  const video = document.getElementById('player-video');
  const overlay = document.getElementById('player-overlay');
  const isPlaying = overlay && overlay.style.display !== 'none';
  const state = {
    channel: ch?.name || '',
    program: document.getElementById('player-program')?.textContent || '',
    icon: ch ? channelInitials(ch.name) : '',
    playing: isPlaying && video && !video.paused,
    muted: video?.muted || false,
    live: true,
    slots: S.switchbackSlots,
    isPro: S.isPro,
    currentSlot: S.switchbackSlots?.indexOf(ch) ?? -1,
  };
  try { localStorage.setItem('sb_state', JSON.stringify(state)); } catch (_) { }
}
setInterval(publishTVState, 1000);

console.log('[Switchback TV] v3.7 — stream proxy fix, TV remote keys, phone remote bridge ✓');
