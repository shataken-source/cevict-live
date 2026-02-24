// Switchback TV — app.js
// Self-contained IPTV player for Android WebView

const S = {
  playlists: [],
  channels: [],
  favorites: [],
  history: [],
  currentChannel: null,
  prevChannel: null,
  volume: 100,
  isMuted: false,
  adBlock: true,
  isAdMuted: false,
  epgData: [],
  settings: { server: 'http://cflike-cdn.com:8080', user: 'jesscadezediptv', pass: 'jxeeg93t76', alt: '', epg: 'http://cflike-cdn.com:8080/xmltv.php?username=jesscadezediptv&password=jxeeg93t76', m3u: 'http://cflike-cdn.com:8080/get.php?username=jesscadezediptv&password=jxeeg93t76&type=m3u_plus' },
  activeGroup: 'All',
  ovTimer: null,
};

// ── Helpers ──────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function $(id) { return document.getElementById(id); }
function setStat(text, color) {
  const el = $('ist');
  el.textContent = text;
  el.style.color = color || 'var(--mu)';
}

// ── Persistence ───────────────────────────────
function persist() {
  try {
    localStorage.setItem('sb_pl', JSON.stringify(S.playlists));
    localStorage.setItem('sb_fav', JSON.stringify(S.favorites));
    localStorage.setItem('sb_hist', JSON.stringify(S.history.slice(0, 50)));
    localStorage.setItem('sb_st', JSON.stringify(S.settings));
    localStorage.setItem('sb_vol', String(S.volume));
    localStorage.setItem('sb_ad', S.adBlock ? '1' : '0');
  } catch (e) { }
}

function restore() {
  try {
    const pl = localStorage.getItem('sb_pl'); if (pl) S.playlists = JSON.parse(pl);
    const fav = localStorage.getItem('sb_fav'); if (fav) S.favorites = JSON.parse(fav);
    const hist = localStorage.getItem('sb_hist'); if (hist) S.history = JSON.parse(hist);
    const st = localStorage.getItem('sb_st'); if (st) S.settings = { ...S.settings, ...JSON.parse(st) };
    const vol = localStorage.getItem('sb_vol'); if (vol) S.volume = parseInt(vol) || 100;
    const ad = localStorage.getItem('sb_ad'); if (ad !== null) S.adBlock = ad === '1';
  } catch (e) { }
}

// ── M3U Parser ────────────────────────────────
function parseM3U(text, pid) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const chs = [];
  let cur = {};
  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      const nm = line.match(/,(.+)$/);
      const lo = line.match(/tvg-logo="([^"]+)"/i);
      const gr = line.match(/group-title="([^"]+)"/i);
      const tid = line.match(/tvg-id="([^"]+)"/i);
      cur = {
        id: pid + '-' + chs.length,
        name: nm ? nm[1].trim() : 'Unknown',
        logo: lo ? lo[1] : '',
        group: gr ? gr[1] : 'Uncategorized',
        tvgId: tid ? tid[1] : '',
      };
    } else if (line && !line.startsWith('#') && cur.name) {
      cur.url = line;
      chs.push(cur);
      cur = {};
    }
  }
  return chs;
}

function proxyUrl(url) {
  return '/proxy?url=' + encodeURIComponent(url);
}

function fetchM3U(url, pid, name) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl(url), true);
    xhr.timeout = 30000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 400) {
        resolve({ id: pid, name: name, url: url, channels: parseM3U(xhr.responseText, pid) });
      } else {
        reject(new Error('HTTP ' + xhr.status));
      }
    };
    xhr.onerror = function () { reject(new Error('Network error')); };
    xhr.ontimeout = function () { reject(new Error('Timeout')); };
    xhr.send();
  });
}

// ── Channel management ────────────────────────
function mergeChannels() {
  S.channels = [];
  for (const pl of S.playlists) {
    for (const ch of pl.channels) {
      if (!S.channels.find(c => c.id === ch.id)) S.channels.push(ch);
    }
  }
}

function getGroups() {
  const groups = ['All', 'Favorites'];
  const seen = new Set();
  for (const ch of S.channels) {
    if (ch.group && !seen.has(ch.group)) { seen.add(ch.group); groups.push(ch.group); }
  }
  return groups;
}

function renderGroupFilter() {
  $('gf').innerHTML = getGroups().map(g =>
    `<button class="gb${g === S.activeGroup ? ' on' : ''}" onclick="setGroup(${JSON.stringify(g)})">${esc(g)}</button>`
  ).join('');
}

function setGroup(g) {
  S.activeGroup = g;
  renderGroupFilter();
  filterCh();
}

function filterCh() {
  const q = ($('srch').value || '').toLowerCase();
  let list = S.channels;
  if (S.activeGroup === 'Favorites') {
    list = list.filter(c => S.favorites.includes(c.id));
  } else if (S.activeGroup !== 'All') {
    list = list.filter(c => c.group === S.activeGroup);
  }
  if (q) list = list.filter(c =>
    c.name.toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q)
  );
  renderChList(list);
}

function renderChList(list) {
  const el = $('cl');
  if (!list.length) {
    el.innerHTML = '<div style="padding:20px;color:var(--mu);font-size:13px;text-align:center">No channels found</div>';
    $('icount').textContent = '';
    return;
  }
  el.innerHTML = list.map(ch => {
    const isFav = S.favorites.includes(ch.id);
    const isActive = S.currentChannel && S.currentChannel.id === ch.id;
    const abbr = esc(ch.name.substring(0, 3).toUpperCase());
    const logo = ch.logo
      ? `<img class="cl" src="${esc(ch.logo)}" onerror="this.style.display='none';this.nextSibling.style.display='flex'" loading="lazy"><div class="cp" style="display:none">${abbr}</div>`
      : `<div class="cp">${abbr}</div>`;
    return `<div class="ci${isActive ? ' on' : ''}" onclick="playCh(${JSON.stringify(ch.id)})">
      ${logo}
      <div class="ci-info">
        <div class="cn">${esc(ch.name)}</div>
        ${ch.group ? `<div class="cg">${esc(ch.group)}</div>` : ''}
      </div>
      <button class="cf" onclick="event.stopPropagation();togFav(${JSON.stringify(ch.id)})">${isFav ? '★' : '☆'}</button>
    </div>`;
  }).join('');
  $('icount').textContent = list.length + ' channels';
}

// ── Playback ──────────────────────────────────
function playCh(id) {
  const ch = S.channels.find(c => c.id === id);
  if (!ch) return;

  if (S.currentChannel && S.currentChannel.id !== id) {
    S.prevChannel = S.currentChannel;
    updatePrevBtn();
  }

  S.currentChannel = ch;
  addToHistory(ch);
  filterCh();

  const vid = $('vid');
  $('nc').style.display = 'none';
  vid.style.display = 'block';
  vid.src = ch.url;
  vid.volume = S.isMuted ? 0 : S.volume / 100;
  vid.play().catch(() => { });

  $('nch').textContent = ch.name;
  $('ngr').textContent = ch.group || '';
  $('ich').textContent = ch.name;
  $('eb').classList.remove('on');

  showOvTemp();
  updateEpgNow(ch);
}

function onErr() { $('eb').textContent = '⚠ Stream error — check URL or try another channel'; $('eb').classList.add('on'); setStat('● Error', 'var(--rd)'); }
function onPlay() { $('eb').classList.remove('on'); setStat('● Live', 'var(--gr)'); }
function onWait() { setStat('● Buffering…', '#FFD700'); }

function goBack(e) { if (e) e.stopPropagation(); $('ov').classList.remove('on'); }

function swPrev(e) {
  if (e) e.stopPropagation();
  if (S.prevChannel) playCh(S.prevChannel.id);
}

function updatePrevBtn() {
  const b = $('pvb');
  if (S.prevChannel) { b.style.display = 'block'; b.textContent = '⇄ ' + S.prevChannel.name; }
  else b.style.display = 'none';
}

// ── Volume / Mute ─────────────────────────────
function applyVol() {
  const vid = $('vid');
  vid.volume = S.isMuted ? 0 : S.volume / 100;
  $('vd').textContent = S.isMuted ? '🔇' : S.volume;
  $('mutb').textContent = S.isMuted ? '🔇 Unmute' : '🔊 Mute';
  persist();
}
function vUp(e) { if (e) e.stopPropagation(); S.volume = Math.min(100, S.volume + 10); S.isMuted = false; applyVol(); showOvTemp(); }
function vDown(e) { if (e) e.stopPropagation(); S.volume = Math.max(0, S.volume - 10); applyVol(); showOvTemp(); }
function togMute(e) { if (e) e.stopPropagation(); S.isMuted = !S.isMuted; applyVol(); showOvTemp(); }

// ── Overlay ───────────────────────────────────
function togOv() {
  const o = $('ov');
  if (o.classList.contains('on')) o.classList.remove('on');
  else showOvTemp();
}
function showOvTemp() {
  const o = $('ov');
  o.classList.add('on');
  if (S.ovTimer) clearTimeout(S.ovTimer);
  S.ovTimer = setTimeout(() => o.classList.remove('on'), 5000);
}

// ── Ad block ─────────────────────────────────
function togAd(e) {
  if (e) e.stopPropagation();
  S.adBlock = !S.adBlock;
  const b = $('adt');
  b.textContent = 'AD: ' + (S.adBlock ? 'ON' : 'OFF');
  b.className = 'cb' + (S.adBlock ? ' on' : ' off');
  if (!S.adBlock && S.isAdMuted) restoreAdVol();
  persist();
}
let _savedVol = 100;
function muteForAd() { if (!S.adBlock || S.isAdMuted) return; _savedVol = S.volume; S.isAdMuted = true; $('vid').volume = 0; $('adb').classList.add('on'); }
function restoreAdVol() { S.isAdMuted = false; $('vid').volume = S.isMuted ? 0 : S.volume / 100; $('adb').classList.remove('on'); }

// ── Favorites ─────────────────────────────────
function togFav(id) {
  const i = S.favorites.indexOf(id);
  if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(id);
  persist();
  filterCh();
}

// ── History ───────────────────────────────────
function addToHistory(ch) {
  S.history = S.history.filter(h => h.id !== ch.id);
  S.history.unshift({ id: ch.id, name: ch.name, group: ch.group || '', ts: Date.now() });
  S.history = S.history.slice(0, 50);
  persist();
  renderHistory();
}

function renderHistory() {
  const el = $('histl');
  if (!S.history.length) {
    el.innerHTML = '<div style="padding:14px;color:var(--mu);font-size:12px">No history yet</div>';
    return;
  }
  el.innerHTML = S.history.map(h =>
    `<div class="hi" onclick="playCh(${JSON.stringify(h.id)})">
      <div style="flex:1;min-width:0">
        <div class="cn">${esc(h.name)}</div>
        <div class="cg">${esc(h.group)}</div>
      </div>
      <div style="font-size:10px;color:var(--mu);flex-shrink:0">${timeAgo(h.ts)}</div>
    </div>`
  ).join('');
}

function timeAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return d + 's ago';
  if (d < 3600) return Math.floor(d / 60) + 'm ago';
  if (d < 86400) return Math.floor(d / 3600) + 'h ago';
  return Math.floor(d / 86400) + 'd ago';
}

// ── Add playlist ──────────────────────────────
async function addPl() {
  const url = $('purl').value.trim();
  if (!url) return;
  const btn = $('addbtn');
  btn.innerHTML = '<span class="sp"></span>';
  btn.disabled = true;
  try {
    const pl = await fetchM3U(url, 'pl-' + Date.now(), 'Playlist ' + (S.playlists.length + 1));
    S.playlists.push(pl);
    mergeChannels();
    renderGroupFilter();
    filterCh();
    persist();
    $('purl').value = '';
    alert('Loaded ' + pl.channels.length + ' channels');
  } catch (e) {
    alert('Failed to load playlist: ' + e.message);
  } finally {
    btn.innerHTML = 'Add';
    btn.disabled = false;
  }
}

function loadSample() {
  // Public domain test stream
  const sampleM3U = `#EXTM3U
#EXTINF:-1 tvg-id="BigBuckBunny" tvg-logo="" group-title="Test",Big Buck Bunny
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
#EXTINF:-1 tvg-id="ElephantsDream" tvg-logo="" group-title="Test",Elephants Dream
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
#EXTINF:-1 tvg-id="ForBiggerBlazes" tvg-logo="" group-title="Test",For Bigger Blazes
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`;

  const pid = 'sample-' + Date.now();
  const pl = { id: pid, name: 'Sample Channels', url: '', channels: parseM3U(sampleM3U, pid) };
  S.playlists.push(pl);
  mergeChannels();
  renderGroupFilter();
  filterCh();
  persist();
}

// ── Settings modal ────────────────────────────
function openSettings() {
  // Populate playlist list
  const sec = $('plsec');
  if (S.playlists.length) {
    sec.innerHTML = '<label style="margin-top:0">Playlists</label>' +
      S.playlists.map(pl =>
        `<div class="pli">
          <div><div class="pln">${esc(pl.name)}</div><div class="plc">${pl.channels.length} channels</div></div>
          <button class="btn rd" style="font-size:11px;padding:4px 9px" onclick="delPl(${JSON.stringify(pl.id)})">Delete</button>
        </div>`
      ).join('') +
      '<div style="height:1px;background:var(--bd);margin:12px 0"></div>';
  } else {
    sec.innerHTML = '';
  }

  // Populate fields
  $('s-srv').value = S.settings.server;
  $('s-usr').value = S.settings.user;
  $('s-pw').value = S.settings.pass;
  $('s-alt').value = S.settings.alt;
  $('s-epg').value = S.settings.epg;

  $('mb').classList.add('on');
}

function closeMod() { $('mb').classList.remove('on'); }
function closeMbg(e) { if (e.target === $('mb')) closeMod(); }

async function saveSettings() {
  S.settings.server = $('s-srv').value.trim();
  S.settings.user = $('s-usr').value.trim();
  S.settings.pass = $('s-pw').value;
  S.settings.alt = $('s-alt').value.trim();
  S.settings.epg = $('s-epg').value.trim();
  persist();
  closeMod();

  // If credentials provided, auto-load playlist
  if (S.settings.server && S.settings.user && S.settings.pass) {
    const url = `${S.settings.server}/get.php?username=${encodeURIComponent(S.settings.user)}&password=${encodeURIComponent(S.settings.pass)}&type=m3u_plus&output=ts`;
    const btn = $('ms');
    btn.innerHTML = '<span class="sp"></span> Loading…';
    btn.disabled = true;
    try {
      const pl = await fetchM3U(url, 'cred-' + Date.now(), S.settings.user + "'s Channels");
      // Replace any existing credential playlist
      S.playlists = S.playlists.filter(p => !p.id.startsWith('cred-'));
      S.playlists.push(pl);
      mergeChannels();
      renderGroupFilter();
      filterCh();
      persist();
      alert('Loaded ' + pl.channels.length + ' channels');
    } catch (e) {
      alert('Failed to load playlist: ' + e.message);
    } finally {
      btn.innerHTML = 'Save &amp; Load';
      btn.disabled = false;
    }
  }

  // Load EPG if URL provided
  if (S.settings.epg) loadEPG(S.settings.epg);
}

function delPl(id) {
  if (!confirm('Delete this playlist?')) return;
  S.playlists = S.playlists.filter(p => p.id !== id);
  mergeChannels();
  renderGroupFilter();
  filterCh();
  persist();
  openSettings(); // re-render modal
}

// ── Config Import ─────────────────────────────
function importConfig(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      applyConfig(JSON.parse(e.target.result));
      alert('Config imported! Click "Save & Load" to apply.');
    } catch (err) {
      alert('Invalid config file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function pasteConfig() {
  const raw = prompt('Paste your provider JSON config here:');
  if (!raw) return;
  try {
    applyConfig(JSON.parse(raw));
    alert('Config imported! Click "Save & Load" to apply.');
  } catch (err) {
    alert('Invalid JSON: ' + err.message);
  }
}

function applyConfig(config) {
  if (config.server) $('s-srv').value = config.server;
  if (config.username) $('s-usr').value = config.username;
  if (config.password) $('s-pw').value = config.password;
  if (config.alt) $('s-alt').value = config.alt;
  if (config.epg) $('s-epg').value = config.epg;
}

// ── EPG ───────────────────────────────────────
function parseXMLTVDate(s) {
  const t = s.trim();
  if (t.length < 14) return null;
  const yr = parseInt(t.substring(0, 4));
  const mo = parseInt(t.substring(4, 6)) - 1;
  const dy = parseInt(t.substring(6, 8));
  const hr = parseInt(t.substring(8, 10));
  const mn = parseInt(t.substring(10, 12));
  const sc = parseInt(t.substring(12, 14));
  let offMin = 0;
  const tz = t.substring(14).match(/\s*([+-])(\d{2})(\d{2})/);
  if (tz) offMin = (tz[1] === '+' ? 1 : -1) * (parseInt(tz[2]) * 60 + parseInt(tz[3]));
  const utc = Date.UTC(yr, mo, dy, hr, mn, sc) - offMin * 60000;
  return isNaN(utc) ? null : new Date(utc);
}

function parseXMLTV(xml) {
  const progs = [];
  let pos = 0;
  while (true) {
    const si = xml.indexOf('<programme', pos);
    if (si === -1) break;
    const ei = xml.indexOf('</programme>', si);
    if (ei === -1) break;
    const block = xml.substring(si, ei);
    pos = ei + 12;
    const sm = block.match(/start=["']([^"']+)["']/);
    const em = block.match(/stop=["']([^"']+)["']/);
    const cm = block.match(/channel=["']([^"']+)["']/);
    if (!sm || !em || !cm) continue;
    const start = parseXMLTVDate(sm[1]);
    const end = parseXMLTVDate(em[1]);
    if (!start || !end) continue;
    const bi = block.indexOf('>');
    if (bi === -1) continue;
    const body = block.substring(bi + 1);
    const tm = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const dm = body.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);
    const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim();
    progs.push({
      channelId: cm[1],
      title: tm ? decode(tm[1]) : 'Unknown',
      desc: dm ? decode(dm[1]) : '',
      start,
      end,
    });
  }
  return progs;
}

function loadEPG(url) {
  $('epgs').innerHTML = '<span class="sp"></span>';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', proxyUrl(url), true);
  xhr.timeout = 30000;
  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 400) {
      S.epgData = parseXMLTV(xhr.responseText);
      renderEPG();
      $('epgs').textContent = '(' + S.epgData.length + ' programs)';
    } else {
      $('epgs').textContent = '⚠ HTTP ' + xhr.status;
    }
  };
  xhr.onerror = function () { $('epgs').textContent = '⚠ Failed'; };
  xhr.ontimeout = function () { $('epgs').textContent = '⚠ Timeout'; };
  xhr.send();
}

function renderEPG() {
  const el = $('epgl');
  const now = new Date();
  // Show current + next program per channel (matched by tvgId)
  const seen = new Map();
  for (const p of S.epgData) {
    if (p.end < now) continue;
    if (!seen.has(p.channelId)) seen.set(p.channelId, []);
    const arr = seen.get(p.channelId);
    if (arr.length < 2) arr.push(p);
  }
  if (!seen.size) { el.innerHTML = '<div style="padding:14px;color:var(--mu);font-size:12px">No EPG data for current time.</div>'; return; }

  // Match channels by tvgId
  const rows = [];
  for (const ch of S.channels) {
    const key = ch.tvgId || ch.id;
    const progs = seen.get(key);
    if (!progs) continue;
    for (const p of progs) {
      const isNow = p.start <= now && p.end > now;
      const fmt = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      rows.push(`<div class="ei${isNow ? ' now' : ''}" onclick="playCh(${JSON.stringify(ch.id)})">
        <div class="ech">${esc(ch.name)}</div>
        <div class="ep">${esc(p.title)}</div>
        <div class="et">${fmt(p.start)} – ${fmt(p.end)}${isNow ? ' <b style="color:var(--rd)">NOW</b>' : ''}</div>
      </div>`);
    }
  }
  el.innerHTML = rows.length ? rows.join('') : '<div style="padding:14px;color:var(--mu);font-size:12px">No matching channels in EPG.</div>';
}

function updateEpgNow(ch) {
  if (!S.epgData.length) return;
  const now = new Date();
  const key = ch.tvgId || ch.id;
  const cur = S.epgData.find(p => p.channelId === key && p.start <= now && p.end > now);
  $('nepg').textContent = cur ? '▶ ' + cur.title : '';
}

// ── Tab switching ─────────────────────────────
function showTab(name) {
  const panels = { ch: 'p-ch', epg: 'p-epg', hist: 'p-hist' };
  const tabs = { ch: 't-ch', epg: 't-epg', hist: 't-hist' };
  for (const [k, pid] of Object.entries(panels)) {
    $(pid).classList.toggle('on', k === name);
    $(tabs[k]).classList.toggle('on', k === name);
  }
  if (name === 'hist') renderHistory();
}

// ── Init ──────────────────────────────────────
function init() {
  restore();
  mergeChannels();
  renderGroupFilter();
  filterCh();
  renderHistory();
  applyVol();

  // Restore ad block button state
  const adt = $('adt');
  adt.textContent = 'AD: ' + (S.adBlock ? 'ON' : 'OFF');
  adt.className = 'cb' + (S.adBlock ? ' on' : ' off');

  // Auto-load playlist if no channels loaded yet
  if (!S.playlists.length) {
    const url = S.settings.m3u || `${S.settings.server}/get.php?username=${encodeURIComponent(S.settings.user)}&password=${encodeURIComponent(S.settings.pass)}&type=m3u_plus&output=ts`;
    setStat('● Loading playlist…', '#FFD700');
    fetchM3U(url, 'cred-' + Date.now(), S.settings.user + "'s Channels")
      .then(pl => {
        S.playlists.push(pl);
        mergeChannels();
        renderGroupFilter();
        filterCh();
        persist();
        setStat('● ' + pl.channels.length + ' channels loaded', 'var(--gr)');
      })
      .catch(e => setStat('● Failed to load: ' + e.message, 'var(--rd)'));
  }

  // Load EPG if saved
  if (S.settings.epg) loadEPG(S.settings.epg);
}

document.addEventListener('DOMContentLoaded', init);
