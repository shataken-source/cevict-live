// Switchback TV — app.js
// Self-contained IPTV player for Android WebView
var APP_VERSION = '3.2.0';

// ── Region / prefix definitions ──────────────
var REGION_PREFIXES = [
  { key: 'US', label: 'US', pattern: /^US[\s|:]/i },
  { key: 'UK', label: 'UK', pattern: /^UK[\s|:]/i },
  { key: 'CA', label: 'Canada', pattern: /^CA[\s|:]/i },
  { key: 'AU', label: 'Australia', pattern: /^AU[\s|:]/i },
  { key: 'IE', label: 'Ireland', pattern: /^IE[\s|:]/i },
  { key: 'MX', label: 'Mexico', pattern: /^MX[\s|:]/i },
  { key: 'DE', label: 'Germany', pattern: /^DE[\s|:]/i },
  { key: 'FR', label: 'France', pattern: /^FR[\s|:]/i },
  { key: 'ES', label: 'Spain', pattern: /^ES[\s|:]/i },
  { key: 'IT', label: 'Italy', pattern: /^IT[\s|:]/i },
  { key: 'PT', label: 'Portugal', pattern: /^PT[\s|:]/i },
  { key: 'NL', label: 'Netherlands', pattern: /^NL[\s|:]/i },
  { key: 'IN', label: 'India', pattern: /^IN[\s|:]/i },
  { key: 'PK', label: 'Pakistan', pattern: /^PK[\s|:]/i },
  { key: 'PH', label: 'Philippines', pattern: /^PH[\s|:]/i },
  { key: 'AR', label: 'Arabic', pattern: /^AR[\s|:]/i },
  { key: '4K', label: '4K/UHD', pattern: /^4K[\s|:]/i },
  { key: 'SPORTS', label: 'Sports', pattern: /SPORTS|PPV|ESPN|NFL|NBA|NHL|MLB|UFC|WWE|BOXING|FIGHT|DAZN/i },
  { key: 'NEWS', label: 'News', pattern: /NEWS|CNN|FOX NEWS|MSNBC|BBC NEWS/i },
  { key: 'KIDS', label: 'Kids', pattern: /KIDS|CARTOON|NICK|DISNEY/i },
];

var DEFAULT_PREFIXES = ['US', '4K', 'SPORTS'];

var PARALLEL_BATCH = 15;

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
  settings: { server: '', user: '', pass: '', alt: '', epg: '' },
  selectedPrefixes: DEFAULT_PREFIXES.slice(),
  activeGroup: 'All',
  ovTimer: null,
  provider: null,  // { name, logo, support, welcome, website }
  setupDone: false,
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
  var el = $('ist');
  el.textContent = text;
  el.style.color = color || 'var(--mu)';
}

// ── Loading bar ──────────────────────────────
function showLoadBar(pct) {
  var bar = $('load-bar');
  var fill = $('load-fill');
  bar.classList.add('on');
  fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
}
function hideLoadBar() {
  $('load-bar').classList.remove('on');
  $('load-fill').style.width = '0%';
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
    localStorage.setItem('sb_prefixes', JSON.stringify(S.selectedPrefixes));
    if (S.provider) localStorage.setItem('sb_provider', JSON.stringify(S.provider));
    if (S.setupDone) localStorage.setItem('sb_setup', '1');
  } catch (e) { }
}

function restore() {
  try {
    var savedVer = localStorage.getItem('sb_ver');
    if (savedVer !== APP_VERSION) {
      console.log('App updated ' + (savedVer || 'fresh') + ' -> ' + APP_VERSION + ', clearing playlist cache');
      localStorage.removeItem('sb_pl');
      localStorage.setItem('sb_ver', APP_VERSION);
    }
    var pl = localStorage.getItem('sb_pl'); if (pl) S.playlists = JSON.parse(pl);
    var fav = localStorage.getItem('sb_fav'); if (fav) S.favorites = JSON.parse(fav);
    var hist = localStorage.getItem('sb_hist'); if (hist) S.history = JSON.parse(hist);
    var st = localStorage.getItem('sb_st'); if (st) S.settings = Object.assign({}, S.settings, JSON.parse(st));
    var vol = localStorage.getItem('sb_vol'); if (vol) S.volume = parseInt(vol) || 100;
    var ad = localStorage.getItem('sb_ad'); if (ad !== null) S.adBlock = ad === '1';
    var pref = localStorage.getItem('sb_prefixes'); if (pref) S.selectedPrefixes = JSON.parse(pref);
    var prov = localStorage.getItem('sb_provider'); if (prov) S.provider = JSON.parse(prov);
    var setup = localStorage.getItem('sb_setup'); if (setup) S.setupDone = true;
  } catch (e) { }
}

// ── M3U Parser ────────────────────────────────
function parseM3U(text, pid) {
  var lines = text.split('\n');
  var chs = [];
  var cur = {};
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    if (line.indexOf('#EXTINF:') === 0) {
      var nm = line.match(/,(.+)$/);
      var lo = line.match(/tvg-logo="([^"]+)"/i);
      var gr = line.match(/group-title="([^"]+)"/i);
      var tid = line.match(/tvg-id="([^"]+)"/i);
      cur = {
        id: pid + '-' + chs.length,
        name: nm ? nm[1].trim() : 'Unknown',
        logo: lo ? lo[1] : '',
        group: gr ? gr[1] : 'Uncategorized',
        tvgId: tid ? tid[1] : '',
      };
    } else if (line.charAt(0) !== '#' && cur.name) {
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

function proxyGet(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl(url), true);
    xhr.timeout = 60000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 400) {
        resolve(xhr.responseText);
      } else {
        reject(new Error('HTTP ' + xhr.status + ': ' + (xhr.responseText || '').substring(0, 200)));
      }
    };
    xhr.onerror = function () { reject(new Error('Network error')); };
    xhr.ontimeout = function () { reject(new Error('Timeout')); };
    xhr.send();
  });
}

function fetchM3U(url, pid, name) {
  return proxyGet(url).then(function (text) {
    return { id: pid, name: name, url: url, channels: parseM3U(text, pid) };
  });
}

// ── Xtream Codes API (parallel batched loading) ──
function fetchXtream(server, user, pass) {
  var base = server.replace(/\/$/, '');
  var api = base + '/player_api.php?username=' + encodeURIComponent(user) + '&password=' + encodeURIComponent(pass);
  var pid = 'xt-' + Date.now();

  setStat('Authenticating…', '#eab308');
  showLoadBar(2);
  return proxyGet(api).then(function (authText) {
    var auth;
    try { auth = JSON.parse(authText); } catch (e) { throw new Error('Auth response not JSON: ' + authText.substring(0, 100)); }
    if (!auth.user_info || auth.user_info.auth !== 1) {
      throw new Error('Authentication failed — check credentials');
    }
    setStat('Loading categories…', '#eab308');
    showLoadBar(5);
    return proxyGet(api + '&action=get_live_categories');
  }).then(function (catText) {
    var cats = JSON.parse(catText);
    var catMap = {};
    cats.forEach(function (c) { catMap[c.category_id] = c.category_name; });

    // Filter categories by selected region prefixes
    var filteredCats = filterCategoriesByPrefixes(cats);
    console.log('Categories: ' + filteredCats.length + ' matched out of ' + cats.length + ' total');
    showLoadBar(8);

    // Parallel batched loading — load PARALLEL_BATCH categories at a time
    var allChannels = [];
    var catIds = filteredCats.map(function (c) { return c.category_id; });
    var totalCats = catIds.length;
    var loaded = 0;

    function loadBatch(startIndex) {
      if (startIndex >= totalCats) {
        showLoadBar(100);
        return Promise.resolve({ id: pid, name: user + "'s Channels", url: base, channels: allChannels });
      }

      var batch = catIds.slice(startIndex, startIndex + PARALLEL_BATCH);
      var promises = batch.map(function (catId) {
        var catName = catMap[catId] || 'Uncategorized';
        return proxyGet(api + '&action=get_live_streams&category_id=' + catId).then(function (stText) {
          var streams = JSON.parse(stText);
          var chans = [];
          streams.forEach(function (s) {
            chans.push({
              id: pid + '-' + s.stream_id,
              name: s.name || 'Channel ' + s.stream_id,
              logo: s.stream_icon || '',
              group: catName,
              tvgId: s.epg_channel_id || '',
              url: base + '/' + encodeURIComponent(user) + '/' + encodeURIComponent(pass) + '/' + s.stream_id,
            });
          });
          return chans;
        }).catch(function (e) {
          console.warn('Failed to load category ' + catName + ': ' + e.message);
          return [];
        });
      });

      return Promise.all(promises).then(function (results) {
        for (var i = 0; i < results.length; i++) {
          for (var j = 0; j < results[i].length; j++) {
            allChannels.push(results[i][j]);
          }
        }
        loaded += batch.length;
        var pct = 8 + Math.round((loaded / totalCats) * 90);
        showLoadBar(pct);
        setStat('Loading ' + loaded + '/' + totalCats + ' (' + allChannels.length + ' channels)', '#eab308');

        // Small delay between batches to be gentle on the server
        return new Promise(function (r) { setTimeout(r, 50); }).then(function () {
          return loadBatch(startIndex + PARALLEL_BATCH);
        });
      });
    }

    return loadBatch(0);
  });
}

// ── Category prefix filtering ─────────────────
function filterCategoriesByPrefixes(cats) {
  var selected = S.selectedPrefixes;
  if (!selected || selected.length === 0) return cats;

  var patterns = [];
  for (var i = 0; i < REGION_PREFIXES.length; i++) {
    if (selected.indexOf(REGION_PREFIXES[i].key) >= 0) {
      patterns.push(REGION_PREFIXES[i].pattern);
    }
  }
  if (patterns.length === 0) return cats;

  var filtered = cats.filter(function (c) {
    var name = c.category_name || '';
    for (var j = 0; j < patterns.length; j++) {
      if (patterns[j].test(name)) return true;
    }
    return false;
  });

  // If filter matched fewer than 10% of categories, load all instead
  // This prevents the common case where provider category names don't
  // start with region codes, leaving users with almost no content
  if (filtered.length === 0 || filtered.length < cats.length * 0.1) {
    console.log('Prefix filter too narrow (' + filtered.length + '/' + cats.length + '), loading all categories');
    return cats;
  }
  return filtered;
}

// ── Prefix picker UI ──────────────────────────
function renderPrefixGrid() {
  var grid = $('prefix-grid');
  if (!grid) return;
  var html = '';
  for (var i = 0; i < REGION_PREFIXES.length; i++) {
    var p = REGION_PREFIXES[i];
    var isOn = S.selectedPrefixes.indexOf(p.key) >= 0;
    html += '<div class="prefix-chip' + (isOn ? ' on' : '') + '" tabindex="0" onclick="togglePrefix(\'' + p.key + '\')" data-prefix="' + p.key + '">' + esc(p.label) + '</div>';
  }
  grid.innerHTML = html;
}

function togglePrefix(key) {
  var idx = S.selectedPrefixes.indexOf(key);
  if (idx >= 0) {
    S.selectedPrefixes.splice(idx, 1);
  } else {
    S.selectedPrefixes.push(key);
  }
  renderPrefixGrid();
  persist();
}

function selectAllPrefixes() {
  S.selectedPrefixes = REGION_PREFIXES.map(function (p) { return p.key; });
  renderPrefixGrid();
  persist();
}

function selectNonePrefixes() {
  S.selectedPrefixes = [];
  renderPrefixGrid();
  persist();
}

// ── Channel management ────────────────────────
function mergeChannels() {
  S.channels = [];
  for (var p = 0; p < S.playlists.length; p++) {
    var pl = S.playlists[p];
    for (var c = 0; c < pl.channels.length; c++) {
      var ch = pl.channels[c];
      var dup = false;
      for (var d = 0; d < S.channels.length; d++) {
        if (S.channels[d].id === ch.id) { dup = true; break; }
      }
      if (!dup) S.channels.push(ch);
    }
  }
}

function getGroups() {
  var groups = ['All', 'Favorites'];
  var seen = {};
  for (var i = 0; i < S.channels.length; i++) {
    var g = S.channels[i].group;
    if (g && !seen[g]) { seen[g] = true; groups.push(g); }
  }
  return groups;
}

function renderGroupFilter() {
  var groups = getGroups();
  var html = '';
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    html += '<button class="gb' + (g === S.activeGroup ? ' on' : '') + '" tabindex="0" onclick="setGroup(' + JSON.stringify(g) + ')">' + esc(g) + '</button>';
  }
  $('gf').innerHTML = html;
}

function setGroup(g) {
  S.activeGroup = g;
  renderGroupFilter();
  filterCh();
}

function filterCh() {
  var q = ($('srch').value || '').toLowerCase();
  var list = S.channels;
  if (S.activeGroup === 'Favorites') {
    list = list.filter(function (c) { return S.favorites.indexOf(c.id) >= 0; });
  } else if (S.activeGroup !== 'All') {
    list = list.filter(function (c) { return c.group === S.activeGroup; });
  }
  if (q) {
    list = list.filter(function (c) {
      return c.name.toLowerCase().indexOf(q) >= 0 || (c.group || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  renderChList(list);
}

function renderChList(list) {
  var el = $('cl');
  if (!list.length) {
    el.innerHTML = '<div style="padding:24px;color:var(--mu);font-size:14px;text-align:center">No channels found</div>';
    $('icount').textContent = '';
    return;
  }
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var ch = list[i];
    var isFav = S.favorites.indexOf(ch.id) >= 0;
    var isActive = S.currentChannel && S.currentChannel.id === ch.id;
    var abbr = esc(ch.name.substring(0, 3).toUpperCase());
    var logo;
    if (ch.logo) {
      logo = '<img class="cl" src="' + esc(ch.logo) + '" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'" loading="lazy"><div class="cp" style="display:none">' + abbr + '</div>';
    } else {
      logo = '<div class="cp">' + abbr + '</div>';
    }
    html += '<div class="ci' + (isActive ? ' on' : '') + '" tabindex="0" data-chid="' + esc(ch.id) + '" onclick="playCh(' + JSON.stringify(ch.id) + ')">';
    html += logo;
    html += '<div class="ci-info"><div class="cn">' + esc(ch.name) + '</div>';
    if (ch.group) html += '<div class="cg">' + esc(ch.group) + '</div>';
    html += '</div>';
    html += '<button class="cf" tabindex="0" onclick="event.stopPropagation();togFav(' + JSON.stringify(ch.id) + ')">' + (isFav ? '\u2605' : '\u2606') + '</button>';
    html += '</div>';
  }
  el.innerHTML = html;
  $('icount').textContent = list.length + ' channels';
}

// ── Playback ──────────────────────────────────
function playCh(id) {
  var ch = null;
  for (var i = 0; i < S.channels.length; i++) {
    if (S.channels[i].id === id) { ch = S.channels[i]; break; }
  }
  if (!ch) return;

  if (S.currentChannel && S.currentChannel.id !== id) {
    S.prevChannel = S.currentChannel;
    updatePrevBtn();
  }

  S.currentChannel = ch;
  addToHistory(ch);
  filterCh();

  var vid = $('vid');
  $('nc').style.display = 'none';
  vid.style.display = 'block';
  vid.src = ch.url;
  vid.volume = S.isMuted ? 0 : S.volume / 100;
  vid.play().catch(function () { });

  $('nch').textContent = ch.name;
  $('ngr').textContent = ch.group || '';
  $('ich').textContent = ch.name;
  $('eb').classList.remove('on');

  showOvTemp();
  updateEpgNow(ch);
}

function onErr() { $('eb').textContent = 'Stream error — check URL or try another channel'; $('eb').classList.add('on'); setStat('Error', 'var(--rd)'); }
function onPlay() { $('eb').classList.remove('on'); setStat('Live', 'var(--gr)'); }
function onWait() { setStat('Buffering…', '#eab308'); }

function goBack(e) { if (e) e.stopPropagation(); $('ov').classList.remove('on'); }

function swPrev(e) {
  if (e) e.stopPropagation();
  if (S.prevChannel) playCh(S.prevChannel.id);
}

function updatePrevBtn() {
  var b = $('pvb');
  if (S.prevChannel) { b.style.display = 'block'; b.textContent = 'Prev: ' + S.prevChannel.name; }
  else b.style.display = 'none';
}

// ── Volume / Mute ─────────────────────────────
function applyVol() {
  var vid = $('vid');
  vid.volume = S.isMuted ? 0 : S.volume / 100;
  $('vd').textContent = S.isMuted ? 'MUTE' : S.volume;
  $('mutb').textContent = S.isMuted ? 'Unmute' : 'Mute';
  persist();
}
function vUp(e) { if (e) e.stopPropagation(); S.volume = Math.min(100, S.volume + 10); S.isMuted = false; applyVol(); showOvTemp(); }
function vDown(e) { if (e) e.stopPropagation(); S.volume = Math.max(0, S.volume - 10); applyVol(); showOvTemp(); }
function togMute(e) { if (e) e.stopPropagation(); S.isMuted = !S.isMuted; applyVol(); showOvTemp(); }

// ── Overlay ───────────────────────────────────
function togOv() {
  var o = $('ov');
  if (o.classList.contains('on')) o.classList.remove('on');
  else showOvTemp();
}
function showOvTemp() {
  var o = $('ov');
  o.classList.add('on');
  if (S.ovTimer) clearTimeout(S.ovTimer);
  S.ovTimer = setTimeout(function () { o.classList.remove('on'); }, 5000);
}

// ── Ad block ─────────────────────────────────
function togAd(e) {
  if (e) e.stopPropagation();
  S.adBlock = !S.adBlock;
  var b = $('adt');
  b.textContent = 'AD: ' + (S.adBlock ? 'ON' : 'OFF');
  b.className = 'cb' + (S.adBlock ? ' on' : ' off');
  if (!S.adBlock && S.isAdMuted) restoreAdVol();
  persist();
}
var _savedVol = 100;
function muteForAd() { if (!S.adBlock || S.isAdMuted) return; _savedVol = S.volume; S.isAdMuted = true; $('vid').volume = 0; $('adb').classList.add('on'); }
function restoreAdVol() { S.isAdMuted = false; $('vid').volume = S.isMuted ? 0 : S.volume / 100; $('adb').classList.remove('on'); }

// ── Favorites ─────────────────────────────────
function togFav(id) {
  var i = S.favorites.indexOf(id);
  if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(id);
  persist();
  filterCh();
}

// ── History ───────────────────────────────────
function addToHistory(ch) {
  S.history = S.history.filter(function (h) { return h.id !== ch.id; });
  S.history.unshift({ id: ch.id, name: ch.name, group: ch.group || '', ts: Date.now() });
  S.history = S.history.slice(0, 50);
  persist();
  renderHistory();
}

function renderHistory() {
  var el = $('histl');
  if (!S.history.length) {
    el.innerHTML = '<div style="padding:14px;color:var(--mu);font-size:13px">No history yet</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < S.history.length; i++) {
    var h = S.history[i];
    html += '<div class="hi" tabindex="0" onclick="playCh(' + JSON.stringify(h.id) + ')">';
    html += '<div style="flex:1;min-width:0"><div class="cn">' + esc(h.name) + '</div><div class="cg">' + esc(h.group) + '</div></div>';
    html += '<div style="font-size:10px;color:var(--mu);flex-shrink:0">' + timeAgo(h.ts) + '</div>';
    html += '</div>';
  }
  el.innerHTML = html;
}

function timeAgo(ts) {
  var d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return d + 's ago';
  if (d < 3600) return Math.floor(d / 60) + 'm ago';
  if (d < 86400) return Math.floor(d / 3600) + 'h ago';
  return Math.floor(d / 86400) + 'd ago';
}

// ── Add playlist ──────────────────────────────
function addPl() {
  var url = $('purl').value.trim();
  if (!url) return;
  var btn = $('addbtn');
  btn.innerHTML = '<span class="sp"></span>';
  btn.disabled = true;
  fetchM3U(url, 'pl-' + Date.now(), 'Playlist ' + (S.playlists.length + 1))
    .then(function (pl) {
      S.playlists.push(pl);
      mergeChannels();
      renderGroupFilter();
      filterCh();
      persist();
      $('purl').value = '';
      alert('Loaded ' + pl.channels.length + ' channels');
    })
    .catch(function (e) {
      alert('Failed to load playlist: ' + e.message);
    })
    .then(function () {
      btn.innerHTML = 'Add M3U';
      btn.disabled = false;
    });
}

function loadSample() {
  var sampleM3U = '#EXTM3U\n#EXTINF:-1 tvg-id="BigBuckBunny" tvg-logo="" group-title="Test",Big Buck Bunny\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\n#EXTINF:-1 tvg-id="ElephantsDream" tvg-logo="" group-title="Test",Elephants Dream\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4\n#EXTINF:-1 tvg-id="ForBiggerBlazes" tvg-logo="" group-title="Test",For Bigger Blazes\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  var pid = 'sample-' + Date.now();
  var pl = { id: pid, name: 'Sample Channels', url: '', channels: parseM3U(sampleM3U, pid) };
  S.playlists.push(pl);
  mergeChannels();
  renderGroupFilter();
  filterCh();
  persist();
}

// ── Settings modal ────────────────────────────
function openSettings() {
  var sec = $('plsec');
  if (S.playlists.length) {
    var html = '<div class="s-section"><div class="s-section-title">Loaded Playlists</div>';
    for (var i = 0; i < S.playlists.length; i++) {
      var pl = S.playlists[i];
      html += '<div class="pli"><div><div class="pln">' + esc(pl.name) + '</div><div class="plc">' + pl.channels.length + ' channels</div></div>';
      html += '<button class="btn rd" tabindex="0" style="font-size:11px;padding:5px 10px" onclick="delPl(' + JSON.stringify(pl.id) + ')">Delete</button></div>';
    }
    html += '</div>';
    sec.innerHTML = html;
  } else {
    sec.innerHTML = '';
  }

  $('s-srv').value = S.settings.server;
  $('s-usr').value = S.settings.user;
  $('s-pw').value = S.settings.pass;
  $('s-alt').value = S.settings.alt;
  $('s-epg').value = S.settings.epg;

  renderPrefixGrid();
  var verEl = $('s-ver');
  if (verEl) verEl.textContent = APP_VERSION;

  $('mb').classList.add('on');
  setTimeout(function () {
    var first = document.querySelector('#mbd .s-input, #mbd [tabindex]');
    if (first) first.focus();
  }, 100);
}

function closeMod() { $('mb').classList.remove('on'); }
function closeMbg(e) { if (e.target === $('mb')) closeMod(); }

function saveSettings() {
  S.settings.server = $('s-srv').value.trim();
  S.settings.user = $('s-usr').value.trim();
  S.settings.pass = $('s-pw').value;
  S.settings.alt = $('s-alt').value.trim();
  S.settings.epg = $('s-epg').value.trim();
  persist();
  closeMod();

  if (S.settings.server && S.settings.user && S.settings.pass) {
    fetchXtream(S.settings.server, S.settings.user, S.settings.pass)
      .then(function (pl) {
        S.playlists = S.playlists.filter(function (p) { return p.id.indexOf('xt-') !== 0; });
        S.playlists.push(pl);
        mergeChannels();
        renderGroupFilter();
        filterCh();
        persist();
        hideLoadBar();
        setStat(pl.channels.length + ' channels loaded', 'var(--gr)');
      })
      .catch(function (e) {
        hideLoadBar();
        setStat('Failed: ' + e.message, 'var(--rd)');
        console.error('fetchXtream error:', e);
      });
  }

  if (S.settings.epg) loadEPG(S.settings.epg);
}

function delPl(id) {
  if (!confirm('Delete this playlist?')) return;
  S.playlists = S.playlists.filter(function (p) { return p.id !== id; });
  mergeChannels();
  renderGroupFilter();
  filterCh();
  persist();
  openSettings();
}

// ── Provider Config System ────────────────────
// Provider config format (.switchback or .json):
// {
//   "_switchback": 1,               // magic marker
//   "provider": {
//     "name": "SuperTV",             // provider brand name
//     "logo": "https://...",        // logo URL (optional)
//     "support": "https://...",     // support page URL (optional)
//     "website": "https://...",     // main website (optional)
//     "welcome": "Welcome to SuperTV! Enjoy 10,000+ channels."
//   },
//   "server": "http://yourserver.com:80",
//   "username": "user123",
//   "password": "pass456",
//   "alt": "http://altserver.com:80",   // optional
//   "epg": "http://yourserver.com/xmltv.php?...",
//   "prefixes": ["US", "UK", "SPORTS", "4K"],  // optional recommended regions
//   "autoLoad": true                            // optional: auto-load channels immediately
// }

function importConfig(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var config = JSON.parse(e.target.result);
      applyProviderConfig(config, true);
    } catch (err) {
      alert('Invalid config file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function pasteConfig() {
  var raw = prompt('Paste your provider config or activation code:');
  if (!raw) return;
  raw = raw.trim();

  // Check if it's an activation code (short alphanumeric, no braces)
  if (raw.length <= 40 && /^[A-Za-z0-9_-]+$/.test(raw)) {
    loadActivationCode(raw);
    return;
  }

  // Check if it's a URL
  if (raw.indexOf('http') === 0) {
    loadConfigFromUrl(raw);
    return;
  }

  // Try JSON
  try {
    var config = JSON.parse(raw);
    applyProviderConfig(config, true);
  } catch (err) {
    alert('Invalid config. Expected JSON, URL, or activation code.');
  }
}

function loadActivationCode(code) {
  // Activation codes are base64url-encoded config URLs
  // Provider generates these with the generator tool
  setStat('Activating…', '#eab308');
  try {
    var url = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    if (url.indexOf('http') !== 0) throw new Error('Invalid code');
    loadConfigFromUrl(url);
  } catch (e) {
    alert('Invalid activation code. Please check and try again.');
  }
}

function loadConfigFromUrl(url) {
  setStat('Loading config…', '#eab308');
  showLoadBar(10);
  proxyGet(url).then(function (text) {
    hideLoadBar();
    var config = JSON.parse(text);
    applyProviderConfig(config, true);
  }).catch(function (e) {
    hideLoadBar();
    setStat('Config load failed', 'var(--rd)');
    alert('Failed to load config: ' + e.message);
  });
}

function applyProviderConfig(config, autoLoad) {
  // Apply provider branding
  if (config.provider) {
    S.provider = {
      name: config.provider.name || '',
      logo: config.provider.logo || '',
      support: config.provider.support || '',
      website: config.provider.website || '',
      welcome: config.provider.welcome || '',
    };
    applyProviderBranding();
  }

  // Apply connection settings
  if (config.server) S.settings.server = config.server;
  if (config.username) S.settings.user = config.username;
  if (config.password) S.settings.pass = config.password;
  if (config.alt) S.settings.alt = config.alt;
  if (config.epg) S.settings.epg = config.epg;

  // Apply recommended prefixes
  if (config.prefixes && config.prefixes.length) {
    S.selectedPrefixes = config.prefixes.slice();
  }

  S.setupDone = true;
  persist();

  // Update settings form if open
  var srv = $('s-srv');
  if (srv) {
    srv.value = S.settings.server;
    $('s-usr').value = S.settings.user;
    $('s-pw').value = S.settings.pass;
    $('s-alt').value = S.settings.alt || '';
    $('s-epg').value = S.settings.epg || '';
    renderPrefixGrid();
  }

  // Hide setup screen
  hideSetupScreen();

  // Auto-load channels
  if ((autoLoad || config.autoLoad) && S.settings.server && S.settings.user && S.settings.pass) {
    closeMod();
    fetchXtream(S.settings.server, S.settings.user, S.settings.pass)
      .then(function (pl) {
        S.playlists = S.playlists.filter(function (p) { return p.id.indexOf('xt-') !== 0; });
        S.playlists.push(pl);
        mergeChannels();
        renderGroupFilter();
        filterCh();
        persist();
        hideLoadBar();
        var msg = pl.channels.length + ' channels loaded';
        if (S.provider && S.provider.name) msg = S.provider.name + ': ' + msg;
        setStat(msg, 'var(--gr)');
      })
      .catch(function (e) {
        hideLoadBar();
        setStat('Failed: ' + e.message, 'var(--rd)');
        console.error('Auto-load error:', e);
      });

    if (S.settings.epg) loadEPG(S.settings.epg);
  }
}

function applyProviderBranding() {
  if (!S.provider) return;
  var titleEl = document.querySelector('#hdr h1');
  if (titleEl && S.provider.name) {
    titleEl.innerHTML = '<span>' + esc(S.provider.name) + '</span>';
  }
  var logoEl = $('provider-logo');
  if (logoEl && S.provider.logo) {
    logoEl.src = S.provider.logo;
    logoEl.style.display = 'block';
  }
  var supportEl = $('provider-support');
  if (supportEl && S.provider.support) {
    supportEl.href = S.provider.support;
    supportEl.style.display = 'inline';
  }
}

// ── Setup Screen (first run) ──────────────────
function showSetupScreen() {
  var el = $('setup-screen');
  if (el) el.classList.add('on');
}

function hideSetupScreen() {
  var el = $('setup-screen');
  if (el) el.classList.remove('on');
}

function setupImportFile() {
  var input = $('setup-file-input');
  if (input) input.click();
}

function setupHandleFile(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var config = JSON.parse(e.target.result);
      applyProviderConfig(config, true);
    } catch (err) {
      alert('Invalid config file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function setupActivationCode() {
  var raw = prompt('Enter your activation code:');
  if (!raw) return;
  raw = raw.trim();
  if (raw.length <= 40 && /^[A-Za-z0-9_-]+$/.test(raw)) {
    loadActivationCode(raw);
  } else if (raw.indexOf('http') === 0) {
    loadConfigFromUrl(raw);
  } else {
    try {
      applyProviderConfig(JSON.parse(raw), true);
    } catch (e) {
      alert('Invalid code. Please try again.');
    }
  }
}

function setupManual() {
  hideSetupScreen();
  S.setupDone = true;
  persist();
  openSettings();
}

function setupSkip() {
  hideSetupScreen();
  S.setupDone = true;
  persist();
}

// ── EPG ───────────────────────────────────────
function parseXMLTVDate(s) {
  var t = s.trim();
  if (t.length < 14) return null;
  var yr = parseInt(t.substring(0, 4));
  var mo = parseInt(t.substring(4, 6)) - 1;
  var dy = parseInt(t.substring(6, 8));
  var hr = parseInt(t.substring(8, 10));
  var mn = parseInt(t.substring(10, 12));
  var sc = parseInt(t.substring(12, 14));
  var offMin = 0;
  var tz = t.substring(14).match(/\s*([+-])(\d{2})(\d{2})/);
  if (tz) offMin = (tz[1] === '+' ? 1 : -1) * (parseInt(tz[2]) * 60 + parseInt(tz[3]));
  var utc = Date.UTC(yr, mo, dy, hr, mn, sc) - offMin * 60000;
  return isNaN(utc) ? null : new Date(utc);
}

function parseXMLTV(xml) {
  var progs = [];
  var pos = 0;
  while (true) {
    var si = xml.indexOf('<programme', pos);
    if (si === -1) break;
    var ei = xml.indexOf('</programme>', si);
    if (ei === -1) break;
    var block = xml.substring(si, ei);
    pos = ei + 12;
    var sm = block.match(/start=["']([^"']+)["']/);
    var em = block.match(/stop=["']([^"']+)["']/);
    var cm = block.match(/channel=["']([^"']+)["']/);
    if (!sm || !em || !cm) continue;
    var start = parseXMLTVDate(sm[1]);
    var end = parseXMLTVDate(em[1]);
    if (!start || !end) continue;
    var bi = block.indexOf('>');
    if (bi === -1) continue;
    var body = block.substring(bi + 1);
    var tm = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    var dm = body.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);
    function decode(s) { return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim(); }
    progs.push({
      channelId: cm[1],
      title: tm ? decode(tm[1]) : 'Unknown',
      desc: dm ? decode(dm[1]) : '',
      start: start,
      end: end,
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
      $('epgs').textContent = 'HTTP ' + xhr.status;
    }
  };
  xhr.onerror = function () { $('epgs').textContent = 'Failed'; };
  xhr.ontimeout = function () { $('epgs').textContent = 'Timeout'; };
  xhr.send();
}

function renderEPG() {
  var el = $('epgl');
  var now = new Date();
  var seen = {};
  for (var i = 0; i < S.epgData.length; i++) {
    var p = S.epgData[i];
    if (p.end < now) continue;
    if (!seen[p.channelId]) seen[p.channelId] = [];
    if (seen[p.channelId].length < 2) seen[p.channelId].push(p);
  }
  var hasData = false;
  for (var k in seen) { hasData = true; break; }
  if (!hasData) { el.innerHTML = '<div style="padding:14px;color:var(--mu);font-size:13px">No EPG data for current time.</div>'; return; }

  var rows = '';
  for (var ci = 0; ci < S.channels.length; ci++) {
    var ch = S.channels[ci];
    var key = ch.tvgId || ch.id;
    var progs = seen[key];
    if (!progs) continue;
    for (var pi = 0; pi < progs.length; pi++) {
      var prog = progs[pi];
      var isNow = prog.start <= now && prog.end > now;
      var fmt = function (d) { return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); };
      rows += '<div class="ei' + (isNow ? ' now' : '') + '" tabindex="0" onclick="playCh(' + JSON.stringify(ch.id) + ')">';
      rows += '<div class="ech">' + esc(ch.name) + '</div>';
      rows += '<div class="ep">' + esc(prog.title) + '</div>';
      rows += '<div class="et">' + fmt(prog.start) + ' – ' + fmt(prog.end) + (isNow ? ' <b style="color:var(--rd)">NOW</b>' : '') + '</div>';
      rows += '</div>';
    }
  }
  el.innerHTML = rows || '<div style="padding:14px;color:var(--mu);font-size:13px">No matching channels in EPG.</div>';
}

function updateEpgNow(ch) {
  if (!S.epgData.length) return;
  var now = new Date();
  var key = ch.tvgId || ch.id;
  var cur = null;
  for (var i = 0; i < S.epgData.length; i++) {
    var p = S.epgData[i];
    if (p.channelId === key && p.start <= now && p.end > now) { cur = p; break; }
  }
  $('nepg').textContent = cur ? cur.title : '';
}

// ── Tab switching ─────────────────────────────
function showTab(name) {
  var panels = { ch: 'p-ch', epg: 'p-epg', hist: 'p-hist' };
  var tabs = { ch: 't-ch', epg: 't-epg', hist: 't-hist' };
  var names = ['ch', 'epg', 'hist'];
  for (var i = 0; i < names.length; i++) {
    var k = names[i];
    var isActive = k === name;
    $(panels[k]).classList.toggle('on', isActive);
    $(tabs[k]).classList.toggle('on', isActive);
  }
  if (name === 'hist') renderHistory();
}

// ── D-pad / Remote Navigation ─────────────────
function setupDpadNav() {
  document.addEventListener('keydown', function (e) {
    var key = e.key || e.keyCode;
    var active = document.activeElement;
    var modal = $('mb');
    var isModalOpen = modal && modal.classList.contains('on');

    // Handle Enter/OK on focused channel items
    if (key === 'Enter' || key === 13) {
      if (active && active.classList.contains('ci')) {
        var chid = active.getAttribute('data-chid');
        if (chid) { playCh(chid); e.preventDefault(); return; }
      }
      if (active && (active.classList.contains('hi') || active.classList.contains('ei'))) {
        active.click();
        e.preventDefault();
        return;
      }
      if (active && active.classList.contains('prefix-chip')) {
        active.click();
        e.preventDefault();
        return;
      }
      return;
    }

    // Arrow navigation
    if (key === 'ArrowDown' || key === 40 || key === 'ArrowUp' || key === 38) {
      var isDown = key === 'ArrowDown' || key === 40;

      // Channel list navigation
      var container = null;
      if (!isModalOpen) {
        if (active && active.closest('#cl')) {
          container = $('cl');
        } else if (active && active.closest('#histl')) {
          container = $('histl');
        } else if (active && active.closest('#epgl')) {
          container = $('epgl');
        }
      }

      if (container) {
        var items = container.querySelectorAll('[tabindex]');
        var idx = -1;
        for (var i = 0; i < items.length; i++) {
          if (items[i] === active) { idx = i; break; }
        }
        var next = isDown ? idx + 1 : idx - 1;
        if (next >= 0 && next < items.length) {
          items[next].focus();
          items[next].scrollIntoView({ block: 'nearest' });
          e.preventDefault();
        }
        return;
      }

      // Modal navigation — cycle through focusable elements
      if (isModalOpen) {
        var focusable = $('md').querySelectorAll('[tabindex], input, button, .prefix-chip');
        var fArr = [];
        for (var fi = 0; fi < focusable.length; fi++) {
          if (focusable[fi].offsetParent !== null) fArr.push(focusable[fi]);
        }
        var fIdx = -1;
        for (var fj = 0; fj < fArr.length; fj++) {
          if (fArr[fj] === active) { fIdx = fj; break; }
        }
        var fNext = isDown ? fIdx + 1 : fIdx - 1;
        if (fNext >= 0 && fNext < fArr.length) {
          fArr[fNext].focus();
          fArr[fNext].scrollIntoView({ block: 'nearest' });
          e.preventDefault();
        }
        return;
      }

      // Default: focus first channel item
      if (!isModalOpen) {
        var firstCi = $('cl').querySelector('.ci[tabindex]');
        if (firstCi) { firstCi.focus(); e.preventDefault(); }
      }
      return;
    }

    // Left/Right for group filter, tabs, or prefix grid
    if (key === 'ArrowLeft' || key === 37 || key === 'ArrowRight' || key === 39) {
      var isRight = key === 'ArrowRight' || key === 39;

      if (active && active.classList.contains('gb')) {
        var sibling = isRight ? active.nextElementSibling : active.previousElementSibling;
        if (sibling && sibling.classList.contains('gb')) {
          sibling.focus();
          sibling.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          e.preventDefault();
        }
        return;
      }

      if (active && active.classList.contains('tab')) {
        var tabSibling = isRight ? active.nextElementSibling : active.previousElementSibling;
        if (tabSibling && tabSibling.classList.contains('tab')) {
          tabSibling.focus();
          tabSibling.click();
          e.preventDefault();
        }
        return;
      }

      // Prefix grid left/right
      if (active && active.classList.contains('prefix-chip')) {
        var chipSibling = isRight ? active.nextElementSibling : active.previousElementSibling;
        if (chipSibling && chipSibling.classList.contains('prefix-chip')) {
          chipSibling.focus();
          e.preventDefault();
        }
        return;
      }
    }

    // Back / Escape
    if (key === 'Escape' || key === 27 || key === 'GoBack' || key === 4) {
      if (isModalOpen) { closeMod(); e.preventDefault(); return; }
      if ($('ov').classList.contains('on')) { $('ov').classList.remove('on'); e.preventDefault(); return; }
    }
  });
}

// ── Init ──────────────────────────────────────
function init() {
  restore();
  mergeChannels();
  renderGroupFilter();
  filterCh();
  renderHistory();
  applyVol();
  setupDpadNav();

  // Restore provider branding
  if (S.provider) applyProviderBranding();

  var adt = $('adt');
  adt.textContent = 'AD: ' + (S.adBlock ? 'ON' : 'OFF');
  adt.className = 'cb' + (S.adBlock ? ' on' : ' off');

  // First run — show setup screen if no config and not previously set up
  if (!S.setupDone && !S.playlists.length && !S.settings.server) {
    showSetupScreen();
    return;
  }

  // Auto-load via Xtream API if no channels loaded yet
  if (!S.playlists.length && S.settings.server && S.settings.user && S.settings.pass) {
    fetchXtream(S.settings.server, S.settings.user, S.settings.pass)
      .then(function (pl) {
        S.playlists.push(pl);
        mergeChannels();
        renderGroupFilter();
        filterCh();
        persist();
        hideLoadBar();
        var msg = pl.channels.length + ' channels loaded';
        if (S.provider && S.provider.name) msg = S.provider.name + ': ' + msg;
        setStat(msg, 'var(--gr)');
      })
      .catch(function (e) { hideLoadBar(); setStat('Failed: ' + e.message, 'var(--rd)'); console.error('fetchXtream error:', e); });
  }

  if (S.settings.epg) loadEPG(S.settings.epg);
}

document.addEventListener('DOMContentLoaded', init);
