// ============================================
// CEVICT COMMAND CENTER v3 — REAL DATA
// ============================================

const API = window.location.origin + '/api';
const REFRESH_MS = 30000;
const SCORES_MS = 20000;
const SOUND_THROTTLE = 15000;

const ESPN_SPORTS = {
  NBA: 'basketball/nba',
  NFL: 'football/nfl',
  NHL: 'hockey/nhl',
  MLB: 'baseball/mlb',
  NCAAB: 'basketball/mens-college-basketball',
  NCAA: 'basketball/mens-college-basketball',
  CBB: 'baseball/college-baseball',
  NCAAF: 'football/college-football',
};

const state = {
  games: [], picks: [], selectedGame: null,
  bankroll: 0, todayPnl: 0, wins: 0, losses: 0,
  roi: 0, muted: false, lastSound: 0,
  alertCount: 0, intelIndex: 0, intelTimer: null,
  ws: null, picksTimer: null, scoresTimer: null,
  kalshiPrices: {}, // ticker -> last known price
  kalshiTimer: null,
  myBets: [], myBetsSummary: null, myBetsTimer: null
};

// ============================================
// INIT
// ============================================

async function init() {
  startClock();
  loadSounds();
  connectWebSocket();
  await loadPicks();
  await loadStats();
  await loadMyBets();
  startPolling();
  startIntelRotator();
  startKalshiPriceWatch();
  setupKeyboard();
  pushAlert('green', 'Command Center Online', 'Connected to Progno engine');
}

// ============================================
// CLOCK
// ============================================

function startClock() {
  function tick() {
    const now = new Date();
    const el = document.getElementById('clockDisplay');
    if (el) el.textContent =
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');
  }
  tick();
  setInterval(tick, 1000);
}

// ============================================
// SOUNDS
// ============================================

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  // Play and immediately pause both tracks to satisfy browser autoplay policy
  ['cheerSound', 'booSound'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.volume = 0;
    el.play().then(() => { el.pause(); el.currentTime = 0; el.volume = id === 'cheerSound' ? 0.6 : 0.65; }).catch(() => { });
  });
}

function loadSounds() {
  const cheer = document.getElementById('cheerSound');
  const boo = document.getElementById('booSound');
  if (cheer) { cheer.src = 'crowd-cheer.mp3'; cheer.volume = 0.6; cheer.load(); }
  if (boo) { boo.src = 'crowd-disappointment.mp3'; boo.volume = 0.65; boo.load(); }
  // Unlock on first interaction
  ['click', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, unlockAudio, { once: false, passive: true })
  );
}

function playSound(type) {
  if (state.muted) return;
  const now = Date.now();
  if (now - state.lastSound < SOUND_THROTTLE) return;
  state.lastSound = now;
  const el = document.getElementById(type === 'cheer' ? 'cheerSound' : 'booSound');
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(err => {
    // If blocked, try unlocking then retry once
    if (!audioUnlocked) return;
    console.warn('Sound play failed:', err);
  });
}

// ============================================
// WEBSOCKET
// ============================================

function connectWebSocket() {
  try {
    const ws = new WebSocket((window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws');
    ws.onopen = () => setStreamStatus(true);
    ws.onmessage = (msg) => {
      try {
        const d = JSON.parse(msg.data);
        if (d.type === 'score_update') handleScoreUpdate(d.payload);
        if (d.type === 'odds_update') handleOddsUpdate(d.payload);
        if (d.type === 'steam_alert') handleSteamAlert(d.payload);
      } catch (e) { }
    };
    ws.onclose = () => { setStreamStatus(false); setTimeout(connectWebSocket, 8000); };
    ws.onerror = () => setStreamStatus(false);
    state.ws = ws;
  } catch (e) { setStreamStatus(false); }
}

function setStreamStatus(connected) {
  const el = document.getElementById('streamStatus');
  if (el) el.className = 'stream-dot ' + (connected ? 'connected' : 'disconnected');
}

// ============================================
// LOAD PICKS
// ============================================

async function loadKalshiPicks(date) {
  // Kalshi-matched picks are not available via a separate endpoint yet.
  // The main /progno/picks endpoint returns all picks (including any with _kalshi fields).
  return [];
}

async function loadPicks() {
  // Try today AND yesterday — picks generated overnight (CST evening = UTC next day)
  // may have created_at from yesterday UTC
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let raw = [];

  // Try Kalshi matched picks first
  raw = await loadKalshiPicks(today);
  if (raw.length === 0) raw = await loadKalshiPicks(yesterday);

  for (const date of [today, yesterday]) {
    if (raw.length > 0) break;
    try {
      const res = await fetch(API + '/progno/picks?date=' + date);
      if (res.ok) {
        const data = await res.json();
        console.log('[Picks] date=' + date + ' count=' + (data.picks?.length || 0) + ' source=' + data.source);
        if (data.picks && data.picks.length > 0) {
          raw = data.picks;
          pushAlert('green', 'Picks Loaded', raw.length + ' picks · ' + (data.source || 'db') + ' (' + date + ')');
        }
      }
    } catch (e) { console.warn('[Picks] Failed for ' + date + ':', e.message); }
  }

  if (raw.length === 0) {
    for (const date of [today, yesterday]) {
      if (raw.length > 0) break;
      try {
        const res = await fetch(API + '/progno/predictions?date=' + date);
        if (res.ok) {
          const data = await res.json();
          console.log('[Predictions] date=' + date + ' count=' + (data.picks?.length || 0));
          if (data.picks && data.picks.length > 0) {
            raw = data.picks.map(p => ({
              id: p.id,
              home_team: p.homeTeam || p.home_team,
              away_team: p.awayTeam || p.away_team,
              pick: p.prediction?.winner || p.pick,
              confidence: (p.prediction?.confidence || 0) * 100,
              value_bet_edge: p.prediction?.edge || 0,
              sport: p.sport || p.league,
              game_time: p.gameTime || p.game_time,
              odds: p.odds?.moneyline?.home || null,
              tier: p.tier,
            }));
          }
        }
      } catch (e) { console.warn('[Predictions] Failed for ' + date + ':', e.message); }
    }
  }

  if (raw.length === 0) {
    pushAlert('red', 'No Picks Found', 'No picks available for today yet');
    renderAll();
    return;
  }

  state.picks = raw;
  state.games = transformPicks(raw);
  await loadLiveScores();
  renderAll();
}

// ============================================
// TRANSFORM PICKS
// ============================================

function transformPicks(picks) {
  return picks.map((p, i) => {
    const home = p.home_team || p.homeTeam || 'HOME';
    const away = p.away_team || p.awayTeam || 'AWAY';
    const sport = (p.sport || p.league || 'SPORT').toUpperCase();
    const conf = parseFloat(p.confidence) || 65;

    let marketProb = 50;
    const ml = p.odds;
    const toImpl = (o) => o > 0 ? 100 / (o + 100) : Math.abs(o) / (Math.abs(o) + 100);
    if (ml && typeof ml === 'object' && ml.home != null && ml.away != null) {
      // Both sides available — remove vig by normalizing
      const rH = toImpl(ml.home), rA = toImpl(ml.away);
      const total = rH + rA;
      const pickIsH = (p.pick || home) === home;
      marketProb = total > 0 ? ((pickIsH ? rH : rA) / total) * 100 : 50;
    } else if (ml && typeof ml === 'object' && ml.home != null) {
      const h = ml.home;
      marketProb = toImpl(h) * 100;
    } else if (ml && typeof ml === 'number') {
      marketProb = toImpl(ml) * 100;
    }

    const edge = p.value_bet_edge != null
      ? parseFloat(p.value_bet_edge).toFixed(1)
      : (conf - marketProb).toFixed(1);

    const gt = p.game_time ? new Date(p.game_time) : null;
    const clockStr = gt
      ? gt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : '--';

    return {
      id: String(p.id || 'game_' + i),
      away, home, sport,
      league: (p.league || sport).toUpperCase(),
      tier: p.tier || null,
      awayScore: 0, homeScore: 0,
      period: '--', clock: clockStr,
      status: 'UPCOMING',
      modelProb: conf.toFixed(1),
      marketProb: marketProb.toFixed(1),
      edge,
      confidence: Math.round(conf),
      pick: p.pick || home,
      pickIsHome: (p.pick || home) === home,
      stake: p.recommended_wager || p.stake || 0, // 0 = no real bet placed
      _dryRun: !(p.recommended_wager || p.stake), // true unless a real wager was explicitly set
      winPct: Math.round(conf),
      gameTime: gt,
      espnId: null,
      result: null,
      // Kalshi fields
      _kalshi: p._kalshi || false,
      _ticker: p._ticker || null,
      _marketTitle: p._marketTitle || null,
      _side: p._side || null,
      _price: p._price || null,
    };
  });
}

function tierToStake(tier, conf) {
  if (tier === 'elite' || conf >= 80) return 500;
  if (tier === 'strong' || conf >= 70) return 300;
  if (tier === 'value' || conf >= 60) return 150;
  return 100;
}

// ============================================
// LIVE SCORES — ESPN public API
// ============================================

async function loadLiveScores() {
  const sports = [...new Set(state.games.map(g => g.sport))];
  for (const sport of sports) {
    const path = ESPN_SPORTS[sport];
    if (!path) continue;
    try {
      const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/' + path + '/scoreboard');
      if (!res.ok) continue;
      const data = await res.json();
      for (const event of (data.events || [])) {
        const comp = event.competitions?.[0];
        if (!comp) continue;
        const homeComp = comp.competitors?.find(c => c.homeAway === 'home');
        const awayComp = comp.competitors?.find(c => c.homeAway === 'away');
        if (!homeComp || !awayComp) continue;

        const game = state.games.find(g =>
          g.sport === sport &&
          (fuzzyMatch(g.home, homeComp.team?.abbreviation) || fuzzyMatch(g.home, homeComp.team?.displayName)) &&
          (fuzzyMatch(g.away, awayComp.team?.abbreviation) || fuzzyMatch(g.away, awayComp.team?.displayName))
        );
        if (!game) continue;

        const statusType = event.status?.type;
        const isLive = statusType?.state === 'in';
        const isFinal = statusType?.state === 'post';
        const oldAway = game.awayScore;
        const oldHome = game.homeScore;

        game.espnId = event.id;
        game.awayScore = parseInt(awayComp.score || '0') || 0;
        game.homeScore = parseInt(homeComp.score || '0') || 0;
        game.period = statusType?.shortDetail || '--';
        game.status = isLive ? 'LIVE' : isFinal ? 'FINAL' : 'UPCOMING';

        if (isLive) {
          const wp = comp.situation?.lastPlay?.probability;
          if (wp) {
            const homeWp = Math.round(wp.homeWinPercentage * 100);
            // winPct = our pick's live win chance (flip if we picked away)
            game.winPct = game.pickIsHome ? homeWp : (100 - homeWp);
            // Do NOT overwrite modelProb — that stays as original model confidence for edge calc
          }
          if (game.awayScore !== oldAway || game.homeScore !== oldHome) {
            handleScoreChange(game, oldAway, oldHome);
          }
        }

        if (isFinal && !game.result) {
          const pickType = (game.pickType || game.pick_type || 'moneyline').toLowerCase();
          let weWon = false;
          if (pickType === 'spread' && game.spreadLine != null) {
            // Spread pick: home team covers if homeScore + spreadLine > awayScore
            const pickIsHome = game.pick === game.home;
            const line = Number(game.spreadLine);
            if (pickIsHome) {
              weWon = (game.homeScore + line) > game.awayScore;
            } else {
              weWon = (game.awayScore - line) > game.homeScore;
            }
          } else if (pickType === 'total' && game.totalLine != null) {
            // Total pick: over/under
            const total = game.homeScore + game.awayScore;
            const line = Number(game.totalLine);
            const side = (game.pick || '').toLowerCase();
            weWon = side.includes('over') ? total > line : total < line;
          } else {
            // Moneyline: simple score comparison
            weWon = game.pick === game.home
              ? game.homeScore > game.awayScore
              : game.awayScore > game.homeScore;
          }
          game.result = weWon ? 'WIN' : 'LOSS';
        }
      }
    } catch (e) { console.warn('[ESPN]', sport, e.message); }
  }

  // ESPN-derived win/loss only used if no actual bets data is available
  const espnWins = state.games.filter(g => g.result === 'WIN').length;
  const espnLosses = state.games.filter(g => g.result === 'LOSS').length;
  if (!state.myBetsSummary) {
    state.wins = espnWins;
    state.losses = espnLosses;
    // Only compute P&L from picks that had real stakes (not dry runs)
    state.todayPnl = state.games.reduce((sum, g) => {
      if (!g.result || !g.stake || g._dryRun) return sum;
      return sum + (g.result === 'WIN' ? g.stake * (100 / 110) : -g.stake);
    }, 0);
  }
}

function fuzzyMatch(a, b) {
  if (!a || !b) return false;
  const clean = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ca = clean(a), cb = clean(b);
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}

function handleScoreChange(game, oldAway, oldHome) {
  const awayScored = game.awayScore > oldAway;
  const homeScored = game.homeScore > oldHome;
  const weScored = (homeScored && game.pick === game.home) || (awayScored && game.pick === game.away);

  const scorer = homeScored ? game.home : game.away;
  const scorerPts = homeScored ? game.homeScore : game.awayScore;
  const oppPts = homeScored ? game.awayScore : game.homeScore;
  const scoreStr = game.away + ' ' + game.awayScore + ' – ' + game.homeScore + ' ' + game.home;
  const period = game.period || '';

  // Is our pick currently winning?
  const pickIsHome = game.pick === game.home;
  const pickScore = pickIsHome ? game.homeScore : game.awayScore;
  const oppScore = pickIsHome ? game.awayScore : game.homeScore;
  const pickLeading = pickScore > oppScore ? 'LEADING +' + (pickScore - oppScore) : pickScore === oppScore ? 'TIED' : 'TRAILING -' + (oppScore - pickScore);

  if (weScored) {
    playSound('cheer');
    pushAlert('green',
      ' ' + scorer + ' SCORES! (' + period + ')',
      scoreStr + ' · Pick ' + pickLeading);
    flashElement('game-hero', 'flash-green');
  } else {
    playSound('boo');
    pushAlert('red',
      ' ' + scorer + ' scores (' + period + ')',
      scoreStr + ' · Pick ' + pickLeading);
    flashElement('game-hero', 'flash-red');
  }
  // Always bring the scoring game into the center column
  selectGame(game);
}

// ============================================
// LOAD STATS
// ============================================

async function loadStats() {
  try {
    const res = await fetch(API + '/progno/predictions/stats');
    if (!res.ok) return;
    const data = await res.json();
    if (data.stats) {
      // Only pull ROI from historical stats — wins/losses come from today's
      // live ESPN score matching (loadLiveScores), not the historical
      // progno_predictions table which was producing the wrong 7-7 record.
      state.roi = data.stats.roi || 0;
      renderStats();
    }
  } catch (e) { console.warn('[Stats]', e.message); }
}

// ============================================
// POLLING
// ============================================

function startPolling() {
  state.scoresTimer = setInterval(async () => {
    await loadLiveScores();
    renderTicker();
    renderStats();
    if (state.selectedGame) {
      const fresh = state.games.find(g => g.id === state.selectedGame.id);
      if (fresh) { renderGameHero(fresh); renderEdgePanel(fresh); renderPositionPanel(fresh); }
    }
  }, SCORES_MS);

  // Picks only load once at startup (or on manual 'L' key reload).
  // Polling only refreshes live scores + stats to avoid wiping game state.
  state.picksTimer = setInterval(async () => {
    await loadStats();
  }, REFRESH_MS);

  // Poll actual bets every 60s
  state.myBetsTimer = setInterval(async () => {
    await loadMyBets();
  }, 60000);
}

// ============================================
// RENDER ALL
// ============================================

function renderAll() {
  renderTicker();
  renderPicks();
  renderStats();
  const live = state.games.find(g => g.status === 'LIVE');
  selectGame(live || state.games[0]);
}

// ============================================
// TICKER
// ============================================

function renderTicker() {
  const scroll = document.getElementById('tickerScroll');
  if (!scroll || state.games.length === 0) return;
  const items = [...state.games, ...state.games].map(g => {
    const edgeNum = parseFloat(g.edge);
    const scoreStr = g.status === 'UPCOMING' ? g.clock : g.awayScore + '-' + g.homeScore;
    const edgeStr = edgeNum !== 0 ? '<span class="ticker-edge ' + (edgeNum > 0 ? 'pos' : 'neg') + '">' + (edgeNum > 0 ? '+' : '') + g.edge + '%</span>' : '';
    return '<div class="ticker-game ' + (edgeNum > 3 ? 'edge-high' : edgeNum > 1 ? 'edge-med' : '') + ' ' + (g.status === 'LIVE' ? 'has-pick' : '') + '" onclick="selectGameById(\'' + g.id + '\')">'
      + '<span class="ticker-teams">' + g.away + ' @ ' + g.home + '</span>'
      + '<span class="ticker-score">' + scoreStr + '</span>'
      + '<span class="ticker-time">' + g.period + ' · ' + g.sport + '</span>'
      + edgeStr
      + '</div>';
  }).join('');
  scroll.innerHTML = items;
}

// ============================================
// PICKS LIST
// ============================================

function renderPicks() {
  const list = document.getElementById('picksList');
  const count = document.getElementById('picksCount');
  if (!list) return;
  if (count) count.textContent = state.games.length;

  if (state.games.length === 0) {
    list.innerHTML = '<div class="no-picks">No picks today. Press L to reload.</div>';
    return;
  }

  list.innerHTML = state.games.map(g => {
    const edgeNum = parseFloat(g.edge);
    const edgeClass = edgeNum > 3 ? 'edge-high' : edgeNum > 0 ? 'edge-med' : 'edge-neg';
    const isActive = state.selectedGame && state.selectedGame.id === g.id;
    const statusColor = g.status === 'LIVE' ? 'var(--green)' : g.status === 'FINAL' ? 'var(--muted)' : 'var(--cyan)';
    const tierBadge = g._kalshi ? '' : (g.tier ? ' · ' + g.tier.toUpperCase() : '');
    const resultBadge = g.result
      ? ' <span style="color:' + (g.result === 'WIN' ? 'var(--green)' : 'var(--red)') + '">● ' + g.result + '</span>'
      : '';
    const liveScore = g.status === 'LIVE' ? ' · ' + g.awayScore + '-' + g.homeScore : '';
    const gameDate = g.gameTime
      ? g.gameTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      + ' ' + g.gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : g.clock;
    const kalshiBadge = g._kalshi
      ? ' <span style="color:' + (g._side === 'yes' ? 'var(--green)' : 'var(--cyan)') + ';font-size:0.75em">KALSHI ' + (g._side || '').toUpperCase() + ' @' + (g._price || '') + '¢</span>'
      : '';
    const marketLine = g._kalshi && g._marketTitle
      ? '<div style="font-size:0.72em;opacity:0.6;margin-top:2px">' + g._marketTitle + '</div>'
      : '';
    return '<div class="pick-card ' + edgeClass + ' ' + (isActive ? 'active' : '') + '" onclick="selectGameById(\'' + g.id + '\')">'
      + '<div class="pick-game">' + g.away + ' @ ' + g.home + ' · ' + g.sport + tierBadge + '</div>'
      + '<div class="pick-pick">' + g.pick + kalshiBadge + resultBadge + '</div>'
      + marketLine
      + '<div class="pick-meta">'
      + '<span style="color:' + statusColor + '">' + g.status + liveScore + '</span>'
      + '<span class="pick-edge ' + (edgeNum > 0 ? 'pos' : 'neg') + '">' + (g._kalshi ? g.confidence + '% conf' : (edgeNum > 0 ? '+' : '') + g.edge + '%') + '</span>'
      + '</div>'
      + '<div style="font-size:0.72em;opacity:0.5;margin-top:2px">' + gameDate + '</div>'
      + '</div>';
  }).join('');
}

// ============================================
// STATS
// ============================================

function renderStats() {
  const sum = state.myBetsSummary;
  const avgEdge = state.games.length > 0
    ? (state.games.reduce((s, g) => s + parseFloat(g.edge || 0), 0) / state.games.length).toFixed(1)
    : '0.0';

  // Use actual bets data for financial stats when available
  if (sum) {
    const pnl = sum.totalProfitCents / 100;
    const staked = sum.totalStakeCents / 100;
    state.wins = sum.wins;
    state.losses = sum.losses;
    state.todayPnl = pnl;

    setText('statRecord', sum.wins + '-' + sum.losses + (sum.pending > 0 ? ' (' + sum.pending + 'P)' : ''));
    setText('todayPnl', (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2));
    setText('exposure', '$' + staked.toFixed(2) + ' (' + sum.total + ' bets)');
    setText('winRate', sum.winRate > 0 ? sum.winRate + '%' : '--%');

    const pnlEl = document.getElementById('todayPnl');
    if (pnlEl) pnlEl.style.color = pnl >= 0 ? 'var(--green)' : 'var(--red)';

    const riskPct = staked > 0 ? Math.min((staked / 500) * 100, 100) : 5;
    const fill = document.getElementById('riskFill');
    if (fill) fill.style.width = riskPct + '%';
  } else {
    // Fallback to ESPN-derived stats (no actual bets loaded yet)
    setText('statRecord', state.wins + '-' + state.losses);
    setText('todayPnl', (state.todayPnl >= 0 ? '+$' : '-$') + Math.abs(Math.round(state.todayPnl)).toLocaleString());
    const totalStake = state.games.reduce((s, g) => s + (g.stake || 0), 0);
    setText('exposure', totalStake > 0 ? '$' + totalStake.toLocaleString() + ' (' + state.games.length + ' picks)' : state.games.length + ' picks (model only)');
    setText('winRate', (state.wins + state.losses) > 0
      ? Math.round(state.wins / (state.wins + state.losses) * 100) + '%' : '--%');

    const pnlEl = document.getElementById('todayPnl');
    if (pnlEl) pnlEl.style.color = state.todayPnl >= 0 ? 'var(--green)' : 'var(--red)';

    const totalStakeRisk = state.games.reduce((s, g) => s + (g.stake || 0), 0);
    const riskPct = totalStakeRisk > 0 ? Math.min((totalStakeRisk / 5000) * 100, 100) : 5;
    const fill = document.getElementById('riskFill');
    if (fill) fill.style.width = riskPct + '%';
  }

  setText('statROI', (state.roi >= 0 ? '+' : '') + state.roi.toFixed(1) + '%');
  setText('statAvgEdge', (parseFloat(avgEdge) > 0 ? '+' : '') + avgEdge + '%');
  const liveCount = state.games.filter(g => g.status === 'LIVE').length;
  setText('statOpenBets', liveCount > 0 ? liveCount + ' LIVE' : state.games.filter(g => g.status === 'UPCOMING').length + ' upcoming');
  setText('bankrollValue', 'CEVICT');

  const riskLabel = document.getElementById('riskLabel');
  const riskFill = document.getElementById('riskFill');
  const riskPctVal = riskFill ? parseFloat(riskFill.style.width) || 0 : 0;
  if (riskLabel) {
    if (riskPctVal > 50) { riskLabel.textContent = 'RISK: HIGH'; riskLabel.style.color = 'var(--red)'; }
    else if (riskPctVal > 25) { riskLabel.textContent = 'RISK: MEDIUM'; riskLabel.style.color = 'var(--yellow)'; }
    else { riskLabel.textContent = 'RISK: LOW'; riskLabel.style.color = 'var(--green)'; }
  }
}

// ============================================
// SELECT GAME
// ============================================

function selectGame(game) {
  if (!game) return;
  state.selectedGame = game;
  renderGameHero(game);
  renderEdgePanel(game);
  renderPositionPanel(game);
  renderPicks();
}

function selectGameById(id) {
  const g = state.games.find(g => g.id === id);
  if (g) selectGame(g);
}

// ============================================
// GAME HERO
// ============================================

function renderGameHero(g) {
  setText('gameSport', g.tier ? g.sport + ' · ' + g.tier.toUpperCase() : g.sport);
  setText('gameStatus', g.status);
  setText('gameClock', g.status === 'UPCOMING' ? g.clock : g.period);
  setText('awayAbbr', g.away);
  setText('homeAbbr', g.home);
  setText('awayScore', g.status === 'UPCOMING' ? '--' : g.awayScore);
  setText('homeScore', g.status === 'UPCOMING' ? '--' : g.homeScore);
  setText('gamePeriod', g.period);
  setText('momentumAway', g.away);
  setText('momentumHome', g.home);

  // winPct is always OUR PICK's win chance (already flipped for away picks)
  const wp = g.winPct || 50;
  // Display: left = away %, right = home %
  // If we picked home, wp = home win chance directly
  // If we picked away, wp = away win chance, so home = 100 - wp
  const homeWp = g.pickIsHome ? wp : (100 - wp);
  setText('awayWinPct', (100 - homeWp) + '%');
  setText('homeWinPct', homeWp + '%');

  const probFill = document.getElementById('probFill');
  if (probFill) probFill.style.width = homeWp + '%';

  const marker = document.getElementById('momentumMarker');
  if (marker) marker.style.left = homeWp + '%';

  const mFill = document.getElementById('momentumFill');
  if (mFill) {
    if (wp > 50) {
      mFill.style.left = '50%'; mFill.style.width = (wp - 50) + '%';
      mFill.style.background = 'var(--green)';
    } else {
      mFill.style.left = wp + '%'; mFill.style.width = (50 - wp) + '%';
      mFill.style.background = 'var(--red)';
    }
  }

  const statusEl = document.getElementById('gameStatus');
  if (statusEl) {
    statusEl.style.color = g.status === 'LIVE' ? 'var(--green)'
      : g.status === 'FINAL' ? 'var(--muted)' : 'var(--cyan)';
    statusEl.style.animation = g.status === 'LIVE' ? 'blink 1.5s infinite' : 'none';
  }
}

// ============================================
// EDGE PANEL
// ============================================

function renderEdgePanel(g) {
  const edgeNum = parseFloat(g.edge);
  setText('modelProb', g.modelProb + '%');
  setText('marketProb', g.marketProb + '%');
  setText('edgeValue', (edgeNum > 0 ? '+' : '') + g.edge + '%');
  setText('confidenceValue', g.confidence + '%');

  const badge = document.getElementById('edgeBadge');
  if (badge) {
    badge.textContent = (edgeNum > 0 ? '+' : '') + g.edge + '%';
    badge.className = 'edge-badge ' + (edgeNum > 0 ? 'pos' : 'neg');
  }

  const edgeEl = document.getElementById('edgeValue');
  if (edgeEl) edgeEl.style.color = edgeNum > 3 ? 'var(--green)' : edgeNum > 0 ? 'var(--yellow)' : 'var(--red)';

  const meterFill = document.getElementById('edgeMeterFill');
  if (meterFill) {
    meterFill.style.width = Math.min(Math.max(edgeNum * 5, 0), 100) + '%';
    meterFill.style.background = edgeNum > 3
      ? 'linear-gradient(90deg, var(--green), var(--cyan))'
      : edgeNum > 0 ? 'linear-gradient(90deg, var(--yellow), var(--cyan))' : 'var(--red)';
  }

  const panel = document.getElementById('edgePanel');
  if (panel) panel.style.borderColor = edgeNum > 3
    ? 'rgba(0,255,157,0.4)' : edgeNum > 0 ? 'rgba(255,170,0,0.3)' : 'rgba(255,50,80,0.3)';
}

// ============================================
// POSITION PANEL
// ============================================

function renderPositionPanel(g) {
  const details = document.getElementById('positionDetails');
  const noPos = document.getElementById('noPosition');
  const pickLabel = document.getElementById('positionPick');

  if (pickLabel) {
    pickLabel.textContent = g.pick || '—';
    if (g._kalshi) {
      pickLabel.style.color = g._side === 'yes' ? 'var(--green)' : 'var(--cyan)';
    } else {
      pickLabel.style.color = '';
    }
  }

  // Always show position details for any selected pick (stake=0 means dry run, not no position)
  if (!g) {
    if (details) details.style.display = 'none';
    if (noPos) noPos.style.display = 'block';
    return;
  }

  if (details) details.style.display = 'block';
  if (noPos) noPos.style.display = 'none';

  if (g._kalshi) {
    const price = parseFloat(g._price) || 50;
    const entryEl = document.getElementById('posEntry');
    setText('posEntry', (g._side || 'YES').toUpperCase() + ' @ ' + price + '¢');
    if (entryEl) entryEl.style.color = g._side === 'yes' ? 'var(--green)' : 'var(--cyan)';

    if (g._dryRun || !g.stake) {
      // No real bet placed — show analysis only
      setText('posStake', 'DRY RUN — not placed');
      const stakeEl = document.getElementById('posStake');
      if (stakeEl) stakeEl.style.color = 'var(--yellow)';
      setText('posLiveEv', g.confidence + '% conf');
      setText('posIfWins', price <= 50 ? '+' + Math.round((100 - price) / price * 100) + '% ROI' : '+' + Math.round((100 / price - 1) * 100) + '% ROI');
      const evEl = document.getElementById('posLiveEv');
      if (evEl) evEl.style.color = 'var(--cyan)';
    } else {
      // Real bet placed
      const stake = g.stake;
      const contracts = Math.round((stake / price) * 100);
      const profit = contracts - stake;
      const mp = parseFloat(g.modelProb) / 100;
      const liveEv = ((mp * profit) - ((1 - mp) * stake)).toFixed(0);
      setText('posStake', '$' + stake + ' · ' + contracts + ' contracts');
      setText('posLiveEv', (liveEv >= 0 ? '+$' : '-$') + Math.abs(liveEv));
      setText('posIfWins', '+$' + profit.toFixed(0));
      const evEl = document.getElementById('posLiveEv');
      if (evEl) evEl.style.color = parseFloat(liveEv) >= 0 ? 'var(--green)' : 'var(--red)';
    }
  } else {
    // Standard sportsbook pick
    const entryEl = document.getElementById('posEntry');
    if (g.result) {
      setText('posEntry', g.result);
      if (entryEl) entryEl.style.color = g.result === 'WIN' ? 'var(--green)' : 'var(--red)';
    } else {
      setText('posEntry', g.confidence + '% conf');
      if (entryEl) entryEl.style.color = 'var(--cyan)';
    }

    if (g._dryRun || !g.stake) {
      setText('posStake', 'MODEL PICK — not placed');
      const stakeEl = document.getElementById('posStake');
      if (stakeEl) stakeEl.style.color = 'var(--yellow)';
      const edgeNum = parseFloat(g.edge);
      setText('posLiveEv', (edgeNum > 0 ? '+' : '') + g.edge + '% edge');
      setText('posIfWins', g.tier ? g.tier.toUpperCase() + ' tier' : 'STANDARD');
      const evEl = document.getElementById('posLiveEv');
      if (evEl) evEl.style.color = edgeNum > 0 ? 'var(--green)' : 'var(--red)';
    } else {
      const stake = g.stake;
      const profit = stake * (100 / 110);
      const mp = parseFloat(g.modelProb) / 100;
      const liveEv = ((mp * profit) - ((1 - mp) * stake)).toFixed(0);
      setText('posStake', '$' + stake);
      setText('posLiveEv', (liveEv >= 0 ? '+$' : '-$') + Math.abs(liveEv));
      setText('posIfWins', '+$' + profit.toFixed(0));
      const evEl = document.getElementById('posLiveEv');
      if (evEl) evEl.style.color = parseFloat(liveEv) >= 0 ? 'var(--green)' : 'var(--red)';
    }
  }
}

// ============================================
// INTEL ROTATOR
// ============================================

const intelData = [
  { title: 'MODEL STATUS', rows: [{ key: 'ENGINE', val: 'Progno v3' }, { key: 'PICKS TODAY', val: '0' }, { key: 'AVG EDGE', val: '0%' }] },
  { title: 'SHARP ACTION', rows: [{ key: 'MOVEMENT', val: 'Monitoring...' }, { key: 'STEAM', val: 'None detected' }] },
  { title: 'PERFORMANCE', rows: [{ key: 'RECORD', val: '0-0' }, { key: 'ROI', val: '0%' }, { key: 'TODAY P&L', val: '$0' }] },
];

function startIntelRotator() {
  updateIntelData();
  renderIntel();
  state.intelTimer = setInterval(() => {
    state.intelIndex = (state.intelIndex + 1) % intelData.length;
    updateIntelData();
    renderIntel();
  }, 8000);
}

function updateIntelData() {
  const avgEdge = state.games.length > 0
    ? (state.games.reduce((s, g) => s + parseFloat(g.edge || 0), 0) / state.games.length).toFixed(1)
    : '0.0';
  intelData[0].rows[1].val = state.games.length + ' today';
  intelData[0].rows[2].val = (parseFloat(avgEdge) > 0 ? '+' : '') + avgEdge + '%';
  intelData[2].rows[0].val = state.wins + '-' + state.losses;
  intelData[2].rows[1].val = (state.roi >= 0 ? '+' : '') + state.roi.toFixed(1) + '%';
  intelData[2].rows[2].val = (state.todayPnl >= 0 ? '+$' : '-$') + Math.abs(Math.round(state.todayPnl)).toLocaleString();
}

function renderIntel() {
  const item = intelData[state.intelIndex];
  const title = document.getElementById('intelTitle');
  const cont = document.getElementById('intelContent');
  if (title) title.textContent = item.title;
  if (cont) {
    cont.innerHTML = item.rows.map(r =>
      '<div class="intel-row"><span class="intel-key">' + r.key + '</span><span class="intel-value">' + r.val + '</span></div>'
    ).join('');
  }
}

// ============================================
// ALERTS
// ============================================

function pushAlert(type, title, desc) {
  const feed = document.getElementById('alertsFeed');
  if (!feed) return;
  state.alertCount++;
  const countEl = document.getElementById('alertCount');
  if (countEl) countEl.textContent = state.alertCount;

  const now = new Date();
  const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  const item = document.createElement('div');
  item.className = 'alert-item ' + type;
  item.innerHTML = '<div class="alert-dot"></div>'
    + '<div style="flex:1"><div class="alert-title">' + title + '</div>'
    + '<div class="alert-desc">' + desc + '</div></div>'
    + '<div class="alert-time">' + time + '</div>';
  feed.insertBefore(item, feed.firstChild);
  while (feed.children.length > 12) feed.removeChild(feed.lastChild);
}

// ============================================
// WS EVENT HANDLERS
// ============================================

function handleScoreUpdate(payload) {
  const game = state.games.find(g => g.id === String(payload.gameId));
  if (!game) return;
  const oldAway = game.awayScore, oldHome = game.homeScore;
  game.awayScore = payload.awayScore;
  game.homeScore = payload.homeScore;
  game.period = payload.period || game.period;
  game.status = 'LIVE';
  if (game.awayScore !== oldAway || game.homeScore !== oldHome) handleScoreChange(game, oldAway, oldHome);
  renderTicker();
  if (state.selectedGame && state.selectedGame.id === game.id) renderGameHero(game);
}

// ============================================
// KALSHI PRICE WATCH — SHARP ACTION
// ============================================

async function pollKalshiPrices() {
  const kalshiPicks = state.games.filter(g => g._kalshi && g._ticker && g.status !== 'FINAL');
  if (kalshiPicks.length === 0) return;

  for (const g of kalshiPicks) {
    try {
      const res = await fetch(API + '/progno/kalshi/market?ticker=' + encodeURIComponent(g._ticker));
      if (!res.ok) continue;
      const data = await res.json();
      const market = data.market || data;

      const currentPrice = market.yes_bid ?? market.last_price ?? market.yes_ask;
      if (currentPrice == null) continue;

      const prev = state.kalshiPrices[g._ticker];
      state.kalshiPrices[g._ticker] = currentPrice;

      if (prev === undefined) continue; // first read, no comparison yet

      const move = currentPrice - prev;
      if (Math.abs(move) < 3) continue; // less than 3¢ — not significant

      const dir = move > 0 ? '▲' : '▼';
      const color = move > 0 ? 'var(--green)' : 'var(--red)';
      const label = g._side === 'yes'
        ? (move > 0 ? 'FAVORABLE MOVE' : 'ADVERSE MOVE')
        : (move < 0 ? 'FAVORABLE MOVE' : 'ADVERSE MOVE');

      // Update steam indicator
      const ind = document.getElementById('steamIndicator');
      if (ind) {
        ind.textContent = Math.abs(move) >= 8 ? 'STEAM' : 'MOVE';
        ind.className = 'steam-indicator ' + (Math.abs(move) >= 8 ? 'hot' : 'warm');
      }

      // Add to steam feed
      const feed = document.getElementById('steamFeed');
      if (feed) {
        const item = document.createElement('div');
        item.className = 'steam-item';
        item.style.color = color;
        item.innerHTML = dir + ' <strong>' + g.pick + '</strong> ' + prev + '¢ → ' + currentPrice + '¢'
          + ' <span style="opacity:0.6;font-size:0.85em">' + label + '</span>';
        feed.insertBefore(item, feed.firstChild);
        while (feed.children.length > 6) feed.removeChild(feed.lastChild);
      }

      // Push alert for big moves
      if (Math.abs(move) >= 5) {
        pushAlert(
          move > 0 ? 'green' : 'yellow',
          dir + ' KALSHI PRICE MOVE ' + dir,
          g.pick + ': ' + prev + '¢ → ' + currentPrice + '¢ (' + (move > 0 ? '+' : '') + move + '¢)'
        );
      }
    } catch (e) { /* silent */ }
  }
}

function startKalshiPriceWatch() {
  // Seed initial prices from loaded picks
  for (const g of state.games) {
    if (g._kalshi && g._ticker && g._price) {
      state.kalshiPrices[g._ticker] = parseFloat(g._price);
    }
  }
  // Poll every 60 seconds
  state.kalshiTimer = setInterval(pollKalshiPrices, 60000);
  // Also run once after 10s to populate feed quickly
  setTimeout(pollKalshiPrices, 10000);
}

function handleOddsUpdate(payload) {
  const game = state.games.find(g => g.id === String(payload.gameId));
  if (!game || !payload.movement || Math.abs(payload.movement) < 3) return;
  pushAlert('yellow', 'LINE MOVE', game.away + ' @ ' + game.home + ' moved ' + payload.movement + ' pts');
  const ind = document.getElementById('steamIndicator');
  if (ind) { ind.textContent = 'STEAM'; ind.className = 'steam-indicator hot'; }
  const feed = document.getElementById('steamFeed');
  if (feed) {
    const item = document.createElement('div');
    item.className = 'steam-item';
    item.textContent = game.away + ' @ ' + game.home + ': ' + (payload.movement > 0 ? '+' : '') + payload.movement + ' pts';
    feed.insertBefore(item, feed.firstChild);
    while (feed.children.length > 5) feed.removeChild(feed.lastChild);
  }
}

function handleSteamAlert(payload) {
  pushAlert('red', 'SHARP STEAM', (payload.game || 'Unknown') + ' — heavy action detected');
  const ind = document.getElementById('steamIndicator');
  if (ind) { ind.textContent = 'STEAM'; ind.className = 'steam-indicator hot'; }
}

// ============================================
// KEYBOARD + BUTTON ACTIONS
// ============================================

function toggleMute() {
  state.muted = !state.muted;
  const btn = document.getElementById('muteBtn');
  if (btn) btn.style.color = state.muted ? 'var(--red)' : '';
  pushAlert(state.muted ? 'red' : 'green', state.muted ? 'Muted' : 'Unmuted', 'Audio ' + (state.muted ? 'off' : 'on'));
}

function reloadPicks() {
  pushAlert('green', 'Refreshing', 'Reloading picks from Progno...');
  loadPicks().then(() => loadStats());
}

function nextPick() {
  if (state.games.length === 0) return;
  const idx = state.selectedGame ? state.games.findIndex(g => g.id === state.selectedGame.id) : -1;
  const next = state.games[(idx + 1) % state.games.length];
  selectGame(next);
}

function prevPick() {
  if (state.games.length === 0) return;
  const idx = state.selectedGame ? state.games.findIndex(g => g.id === state.selectedGame.id) : 0;
  const prev = state.games[(idx - 1 + state.games.length) % state.games.length];
  selectGame(prev);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => { });
  } else {
    document.documentElement.requestFullscreen().catch(() => { });
  }
}

function setupKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key.toLowerCase()) {
      case 'f': toggleFullscreen(); break;
      case 'm': toggleMute(); break;
      case 'l': reloadPicks(); break;
      case 't': pushAlert('yellow', 'Test Alert', 'Alert system working'); break;
      case 'c': playSound('cheer'); break;
      case 'arrowright': case 'arrowdown': e.preventDefault(); nextPick(); break;
      case 'arrowleft': case 'arrowup': e.preventDefault(); prevPick(); break;
      case 'enter': {
        const active = document.querySelector('.pick-card.active');
        if (active) selectGameById(active.getAttribute('onclick').match(/'([^']+)'/)[1]);
        break;
      }
    }
  });
}

// ============================================
// MY BETS (actual_bets table)
// ============================================

async function loadMyBets() {
  try {
    const res = await fetch(API + '/progno/wallboard/bets');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success) return;
    state.myBets = data.bets || [];
    state.myBetsSummary = data.summary || null;
    renderMyBets();
  } catch (e) { console.warn('[MyBets]', e.message); }
}

function renderMyBets() {
  const list = document.getElementById('myBetsList');
  const sum = state.myBetsSummary;
  if (!sum) return;

  // Summary stats
  setText('myBetsCount', sum.total);
  setText('myBetsStaked', '$' + (sum.totalStakeCents / 100).toFixed(2));
  const pnl = sum.totalProfitCents / 100;
  const pnlEl = document.getElementById('myBetsPnl');
  if (pnlEl) {
    pnlEl.textContent = (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2);
    pnlEl.style.color = pnl >= 0 ? 'var(--green)' : 'var(--red)';
  }

  // Record badge (W-L-P)
  const recEl = document.getElementById('myBetsRecord');
  if (recEl) {
    recEl.textContent = sum.wins + 'W-' + sum.losses + 'L-' + sum.pending + 'P';
    recEl.style.color = sum.wins > sum.losses ? 'var(--green)' : sum.losses > sum.wins ? 'var(--red)' : 'var(--cyan)';
  }

  // PERFORMANCE panel RECORD is now updated by renderStats() using myBetsSummary

  if (!list) return;

  if (state.myBets.length === 0) {
    list.innerHTML = '<div class="no-bets">No bets placed today</div>';
    return;
  }

  list.innerHTML = state.myBets.map(b => {
    const matchup = (b.away_team || '?') + ' @ ' + (b.home_team || '?');
    const sport = (b.sport || b.league || '').toUpperCase();
    const stake = b.stake_cents ? '$' + (b.stake_cents / 100).toFixed(2) : '--';
    const price = b.price_cents ? b.price_cents + '¢' : '';
    const sideLabel = b.side ? b.side.toUpperCase() : '';
    const conf = b.confidence ? b.confidence + '%' : '';

    let resultClass = '';
    let resultLabel = '';
    if (b.result === 'win') { resultClass = 'bet-won'; resultLabel = ' WIN'; }
    else if (b.result === 'loss') { resultClass = 'bet-lost'; resultLabel = ' LOSS'; }
    else if (b.status === 'cancelled' || b.status === 'error') { resultClass = 'bet-cancelled'; resultLabel = ' ' + b.status.toUpperCase(); }
    else { resultClass = 'bet-pending'; resultLabel = ' PENDING'; }

    const profitStr = b.profit_cents != null && b.result
      ? ' · ' + (b.profit_cents >= 0 ? '+' : '') + '$' + (b.profit_cents / 100).toFixed(2)
      : '';

    return '<div class="my-bet-row ' + resultClass + '">'
      + '<div class="my-bet-pick">' + b.pick + ' <span class="my-bet-result">' + resultLabel + '</span></div>'
      + '<div class="my-bet-details">'
      + '<span>' + matchup + '</span>'
      + '<span>' + sport + (conf ? ' · ' + conf : '') + '</span>'
      + '</div>'
      + '<div class="my-bet-money">'
      + (b.ticker ? '<span class="my-bet-ticker">' + sideLabel + ' @ ' + price + '</span>' : '')
      + '<span>' + stake + profitStr + '</span>'
      + '</div>'
      + '</div>';
  }).join('');
}

// ============================================
// UTILS
// ============================================

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function flashElement(cls, flashCls) {
  const el = document.querySelector('.' + cls);
  if (!el) return;
  el.classList.remove(flashCls);
  void el.offsetWidth;
  el.classList.add(flashCls);
  setTimeout(() => el.classList.remove(flashCls), 1200);
}

// ============================================
// START
// ============================================

document.addEventListener('DOMContentLoaded', init);
