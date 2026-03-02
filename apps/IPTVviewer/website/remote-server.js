#!/usr/bin/env node
/**
 * Switchback TV Remote – WebSocket server for LAN mode
 * Run on a machine reachable by both the phone (remote) and the TV app.
 * Phone connects and registers as 'remote'; TV app connects and registers as 'tv'.
 * Commands from remote are forwarded to tv; state from tv is forwarded to remote(s).
 *
 * Usage: node remote-server.js [port]
 * Default port: 8765
 */

const WebSocket = require('ws');

const PORT = parseInt(process.env.REMOTE_SERVER_PORT || process.argv[2] || '8765', 10);

const wss = new WebSocket.Server({ port: PORT });

const clients = { tv: null, remotes: [] };

function roleOf(ws) {
  if (clients.tv === ws) return 'tv';
  if (clients.remotes.includes(ws)) return 'remote';
  return null;
}

wss.on('connection', (ws, req) => {
  let role = null;
  const ip = req.socket.remoteAddress;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'register' && msg.role) {
        if (role) return;
        if (msg.role === 'tv') {
          if (clients.tv) clients.tv.close();
          clients.tv = ws;
          role = 'tv';
          console.log('[remote-server] TV registered from', ip);
        } else if (msg.role === 'remote') {
          clients.remotes.push(ws);
          role = 'remote';
          console.log('[remote-server] Remote registered from', ip);
        }
        return;
      }
      if (!role) return;
      if (role === 'remote') {
        if (clients.tv && clients.tv.readyState === WebSocket.OPEN) {
          clients.tv.send(data.toString());
        }
      } else if (role === 'tv') {
        clients.remotes.forEach((r) => {
          if (r !== ws && r.readyState === WebSocket.OPEN) r.send(data.toString());
        });
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on('close', () => {
    if (role === 'tv') clients.tv = null;
    if (role === 'remote') {
      const i = clients.remotes.indexOf(ws);
      if (i >= 0) clients.remotes.splice(i, 1);
    }
  });
});

wss.on('listening', () => {
  console.log('[remote-server] Switchback Remote WS server on port', PORT);
  console.log('[remote-server] Phone: connect and register as "remote". TV app: connect and register as "tv".');
});
