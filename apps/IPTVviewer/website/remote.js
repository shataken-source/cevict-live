/* Switchback TV Remote – remote.js */
var method = 'ls';
var sock = null;
var muted = false;
var playing = true;
var nbuf = '';
var ntimer = null;
var toastTimer = null;

/* ── Command sender ── */
function send(action, extra) {
  var cmd = Object.assign({ action: action, ts: Date.now() }, extra || {});
  if (method === 'ws' && sock && sock.readyState === 1) {
    sock.send(JSON.stringify(cmd));
  } else {
    localStorage.setItem('sb_remote_cmd', JSON.stringify(cmd));
    setTimeout(function () { localStorage.removeItem('sb_remote_cmd'); }, 60);
  }
  feedback(action, extra);
}

/* ── Human-readable feedback labels ── */
var MSGS = {
  seek_back: '&#x23EA; -30s',
  seek_fwd: '&#x23E9; +30s',
  ch_up: 'Channel &#9650;',
  ch_down: 'Channel &#9660;',
  vol_up: '&#x1F50A; Vol Up',
  vol_down: '&#x1F509; Vol Down',
  sb_cycle: '&#x21C4; Cycling slots',
  nav_home: '&#x1F3E0; Home',
  nav_guide: '&#x1F4CB; Guide',
  nav_search: '&#x1F50D; Search',
  nav_back: '&#8592; Back',
  nav_favorites: '&#x2B50; Favorites',
  nav_recordings: '&#x23FA; DVR',
  nav_channels: '&#x1F4E1; Live TV',
  nav_settings: '&#x2699; Settings',
  nav_ok: '&#x2713; OK',
  nav_up: '&#9650;',
  nav_down: '&#9660;',
  nav_left: '&#9664;',
  nav_right: '&#9654;',
  sleep_cancel: 'Sleep cancelled'
};

/* ── Visual feedback after each button press ── */
function feedback(a, p) {
  if (a === 'play_pause') {
    playing = !playing;
    var ic = playing ? '&#x23F8;' : '&#x25B6;';
    document.getElementById('play-btn').innerHTML = ic;
    document.getElementById('mini-pp').innerHTML = ic;
    toast(playing ? '&#x25B6; Playing' : '&#x23F8; Paused');
  } else if (a === 'mute') {
    muted = !muted;
    var mb = document.getElementById('mute-btn');
    mb.innerHTML = muted ? '&#x1F507;' : '&#x1F50A;';
    mb.classList.toggle('muted', muted);
    toast(muted ? '&#x1F507; Muted' : '&#x1F50A; Unmuted');
  } else if (a === 'sb_jump') {
    toast('&#x21C4; Slot ' + ((p && p.slot !== undefined) ? p.slot + 1 : ''));
    setActiveSlot(p.slot);
  } else if (a === 'ch_goto') {
    toast('&#x1F4FA; Ch ' + (p && p.num));
  } else if (a === 'sleep') {
    toast('&#x1F634; Sleep in ' + (p && p.mins) + 'm');
  } else if (MSGS[a]) {
    toast(MSGS[a]);
  }
}

/* ── Switchback slot interaction ── */
function jumpSlot(i) {
  var el = document.getElementById('s' + i);
  if (el && el.classList.contains('locked')) {
    toast('&#x1F512; Pro feature \u2014 upgrade to unlock');
    return;
  }
  send('sb_jump', { slot: i });
}

function setActiveSlot(i) {
  for (var j = 0; j < 4; j++) {
    var s = document.getElementById('s' + j);
    if (s) s.classList.toggle('active', j === i);
  }
}

/* Called when state update arrives from TV app */
function refreshSlots(slots, isPro, cur) {
  if (!slots) return;
  for (var i = 0; i < 4; i++) {
    var el = document.getElementById('s' + i);
    var val = document.getElementById('sv' + i);
    if (!el || !val) continue;
    var locked = !isPro && i >= 2;
    el.classList.toggle('locked', locked);
    var lk = el.querySelector('.sb-lock');
    if (lk) lk.style.display = locked ? '' : 'none';
    if (slots[i] && slots[i].name) {
      val.innerHTML = '<span class="sb-name">' + slots[i].name + '</span>';
    } else {
      val.innerHTML = '<span class="sb-empty">+</span>';
    }
    el.classList.toggle('active', i === cur);
  }
}

/* ── Mute toggle ── */
function toggleMute() { send('mute'); }

/* ── Number pad ── */
function np(d) {
  clearTimeout(ntimer);
  if (nbuf.length >= 4) return;
  nbuf += d;
  document.getElementById('num-display').textContent = nbuf;
  ntimer = setTimeout(function () { if (nbuf.length > 0) npGo(); }, 3000);
}

function npClear() {
  clearTimeout(ntimer);
  nbuf = nbuf.slice(0, -1);
  document.getElementById('num-display').textContent = nbuf;
}

function npGo() {
  if (!nbuf) return;
  send('ch_goto', { num: parseInt(nbuf, 10) });
  nbuf = '';
  setTimeout(function () { document.getElementById('num-display').textContent = ''; }, 600);
}

/* ── Connect modal ── */
function showModal() { document.getElementById('modal').classList.remove('hide'); }
function hideModal() { document.getElementById('modal').classList.add('hide'); }

function setMethod(m) {
  method = m;
  document.getElementById('tab-ls').classList.toggle('on', m === 'ls');
  document.getElementById('tab-ws').classList.toggle('on', m === 'ws');
  document.getElementById('ui-ls').style.display = m === 'ls' ? '' : 'none';
  document.getElementById('ui-ws').style.display = m === 'ws' ? '' : 'none';
}

function doConnect() {
  hideModal();
  if (method === 'ls') {
    setConn(true, 'Same device');
    toast('&#x2713; Same-device mode active');
  } else {
    var ip = document.getElementById('ws-ip').value.trim();
    if (!ip) { toast('Enter an IP address'); showModal(); return; }
    localStorage.setItem('remote_ws_host', ip);
    connectWS('ws://' + ip + ':8765');
  }
}

/* ── WebSocket ── */
function connectWS(url) {
  setConn(false, 'Connecting\u2026');
  if (sock) { try { sock.close(); } catch (e) { } }
  sock = new WebSocket(url);
  sock.onopen = function () {
    setConn(true, url.replace('ws://', ''));
    toast('&#x2713; Connected!');
  };
  sock.onclose = function () {
    setConn(false, 'Disconnected');
    sock = null;
  };
  sock.onerror = function () {
    setConn(false, 'Connection failed');
    toast('&#x274C; Could not connect');
  };
  sock.onmessage = function (e) {
    try { handleState(JSON.parse(e.data)); } catch (x) { }
  };
}

function setConn(on, label) {
  document.getElementById('cdot').classList.toggle('on', on);
  document.getElementById('clbl').textContent = (on ? '\u2713 ' : '') + label;
}

/* ── State update from TV app ── */
function handleState(s) {
  if (!s) return;
  if (s.channel) {
    document.getElementById('np-name').textContent = s.channel;
    document.getElementById('mini-name').textContent = s.channel;
  }
  if (s.program) {
    document.getElementById('np-prog').textContent = s.program;
    document.getElementById('mini-prog').textContent = s.program;
  }
  if (s.icon) {
    document.getElementById('np-icon').textContent = s.icon;
    document.getElementById('mini-icon').textContent = s.icon;
  }
  if (typeof s.playing === 'boolean') {
    playing = s.playing;
    var ic = playing ? '&#x23F8;' : '&#x25B6;';
    document.getElementById('play-btn').innerHTML = ic;
    document.getElementById('mini-pp').innerHTML = ic;
  }
  if (s.live !== undefined) {
    document.getElementById('np-live').style.display = s.live ? 'block' : 'none';
  }
  if (s.slots) {
    refreshSlots(s.slots, s.isPro, s.currentSlot);
  }
  if (typeof s.muted === 'boolean') {
    muted = s.muted;
    var mb = document.getElementById('mute-btn');
    if (mb) {
      mb.innerHTML = muted ? '&#x1F507;' : '&#x1F50A;';
      mb.classList.toggle('muted', muted);
    }
  }
}

/* ── Poll localStorage for state (same-device mode) ── */
setInterval(function () {
  var raw = localStorage.getItem('sb_state');
  if (raw) {
    try { handleState(JSON.parse(raw)); } catch (e) { }
  }
}, 500);

/* ── Toast notification ── */
function toast(msg) {
  var el = document.getElementById('toast');
  el.innerHTML = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
}

/* ── Init on load ── */
window.addEventListener('DOMContentLoaded', function () {
  setConn(true, 'Same device');
  var h = localStorage.getItem('remote_ws_host');
  if (h) document.getElementById('ws-ip').value = h;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('remote-sw.js').catch(function () { });
  }
});
