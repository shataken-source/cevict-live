package com.switchback.lite;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.util.Log;
import android.view.KeyEvent;
import fi.iki.elonen.NanoHTTPD;
import java.io.InputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;

/**
 * HTTP server on port 8124 (LAN) for remote control and config provisioning.
 *
 * Endpoints:
 *   GET  /                   — serves remote.html (phone remote UI)
 *   GET  /pin?pin=XXXX       — verify PIN
 *   GET  /key?name=X&pin=XXXX — inject D-pad key into WebView
 *   POST /cmd?pin=XXXX       — high-level command (vol, ch, nav, switchback, sleep)
 *   POST /config?pin=XXXX    — push IPTV credentials from phone to TV
 *   POST /state-push          — TV WebView pushes state (localhost only, no PIN)
 *   GET  /state?pin=XXXX     — get current TV state (playing channel, slots, etc.)
 */
public class RemoteServer extends NanoHTTPD {
    private static final String TAG = "RemoteServer";
    private static final int REMOTE_PORT = 8124;

    private final MainActivity activity;
    private final AssetManager assets;
    private final String pin;

    public RemoteServer(MainActivity activity) {
        super("0.0.0.0", REMOTE_PORT);
        this.activity = activity;
        this.assets = activity.getAssets();
        this.pin = loadOrGeneratePin(activity);
        Log.i(TAG, "Remote server PIN: " + this.pin);
    }

    public static int getPort() {
        return REMOTE_PORT;
    }

    public String getPin() {
        return pin;
    }

    private static String loadOrGeneratePin(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences("remote_server", Context.MODE_PRIVATE);
        String saved = prefs.getString("pin", null);
        if (saved != null && saved.length() == 4) return saved;
        String generated = String.format("%04d", new SecureRandom().nextInt(10000));
        prefs.edit().putString("pin", generated).apply();
        return generated;
    }

    private Response cors(Response resp) {
        resp.addHeader("Access-Control-Allow-Origin", "*");
        resp.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        resp.addHeader("Access-Control-Allow-Headers", "Content-Type");
        return resp;
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        String remoteIp = session.getRemoteIpAddress();
        String method = session.getMethod().name().toUpperCase();

        if (remoteIp != null && !isLanAddress(remoteIp)) {
            Log.w(TAG, "Rejected non-LAN request from " + remoteIp);
            return cors(newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "LAN only"));
        }

        // CORS preflight for all endpoints
        if ("OPTIONS".equals(method)) {
            return cors(newFixedLengthResponse(Response.Status.OK, "text/plain", ""));
        }

        // Serve remote.html on root or /remote.html
        if ("/".equals(uri) || "/remote.html".equals(uri)) {
            try {
                InputStream is = assets.open("remote.html");
                Response resp = newChunkedResponse(Response.Status.OK, "text/html", is);
                resp.addHeader("Cache-Control", "no-cache");
                return cors(resp);
            } catch (IOException e) {
                return cors(newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "remote.html not found"));
            }
        }

        // PIN verification
        if ("/pin".equals(uri)) {
            Map<String, String> p = session.getParms();
            String attempt = p.get("pin");
            if (pin.equals(attempt)) {
                return cors(newFixedLengthResponse(Response.Status.OK, "application/json", "{\"ok\":true,\"pin\":\"" + pin + "\"}"));
            }
            return cors(newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Wrong PIN"));
        }

        // ── /state-push — TV WebView pushes its state here (localhost only, no PIN needed) ──
        if ("/state-push".equals(uri) && "POST".equals(method)) {
            if (remoteIp != null && (remoteIp.equals("127.0.0.1") || remoteIp.equals("::1") || remoteIp.equals("localhost"))) {
                try {
                    Map<String, String> bodyMap = new HashMap<>();
                    session.parseBody(bodyMap);
                    String jsonBody = bodyMap.get("postData");
                    if (jsonBody != null && !jsonBody.isEmpty()) {
                        activity.setTvState(jsonBody);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed to parse state-push body", e);
                }
                return cors(newFixedLengthResponse(Response.Status.OK, "application/json", "{\"ok\":true}"));
            }
            return cors(newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Localhost only"));
        }

        // All remaining endpoints require PIN
        Map<String, String> params = session.getParms();

        // For POST requests, parse body params
        if ("POST".equals(method)) {
            try {
                Map<String, String> body = new HashMap<>();
                session.parseBody(body);
                // NanoHTTPD puts URL-encoded POST params into getParms()
                params = session.getParms();
            } catch (Exception e) {
                Log.w(TAG, "Failed to parse POST body", e);
            }
        }

        String reqPin = params.get("pin");
        if (!pin.equals(reqPin)) {
            Log.w(TAG, "Rejected request with wrong/missing PIN from " + remoteIp);
            return cors(newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Invalid PIN"));
        }

        // ── /key — inject D-pad key ──
        if ("/key".equals(uri)) {
            String name = params.get("name");
            if (name == null) name = params.get("key");
            if (name == null || name.isEmpty()) {
                return cors(newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Missing name="));
            }
            int keyCode = nameToKeyCode(name.trim());
            if (keyCode == 0) {
                return cors(newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Unknown key: " + name));
            }
            activity.dispatchRemoteKey(keyCode);
            return cors(newFixedLengthResponse(Response.Status.OK, "text/plain", "OK"));
        }

        // ── /config — push IPTV credentials from phone to TV ──
        if ("/config".equals(uri) && "POST".equals(method)) {
            String server = params.get("server");
            String username = params.get("username");
            String password = params.get("password");
            if (server == null || server.isEmpty() || username == null || username.isEmpty() || password == null || password.isEmpty()) {
                return cors(newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                    "{\"ok\":false,\"error\":\"Missing server, username, or password\"}"));
            }
            // Sanitize for JS injection
            String safeServer = server.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"");
            String safeUser = username.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"");
            String safePass = password.replace("\\", "\\\\").replace("'", "\\'").replace("\"", "\\\"");

            String js = "if(typeof handleRemoteConfig==='function')handleRemoteConfig('" +
                safeServer + "','" + safeUser + "','" + safePass + "');";
            activity.injectJs(js);
            Log.i(TAG, "Config pushed from remote: server=" + server + " user=" + username);
            return cors(newFixedLengthResponse(Response.Status.OK, "application/json",
                "{\"ok\":true,\"message\":\"Config applied\"}"));
        }

        // ── /cmd — high-level command from phone remote ──
        // Injects handleRemoteCommand({action:'...', ...}) into WebView
        if ("/cmd".equals(uri) && "POST".equals(method)) {
            String action = params.get("action");
            if (action == null || action.isEmpty()) {
                return cors(newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json",
                    "{\"ok\":false,\"error\":\"Missing action\"}"));
            }
            // Build JSON object from all params except pin
            StringBuilder json = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<String, String> entry : params.entrySet()) {
                if ("pin".equals(entry.getKey())) continue;
                if (!first) json.append(",");
                json.append("\"")
                    .append(entry.getKey().replace("\"", "\\\""))
                    .append("\":");
                // Try to parse as number
                try {
                    int num = Integer.parseInt(entry.getValue());
                    json.append(num);
                } catch (NumberFormatException e) {
                    json.append("\"")
                        .append(entry.getValue().replace("\\", "\\\\").replace("\"", "\\\""))
                        .append("\"");
                }
                first = false;
            }
            json.append("}");
            String js = "if(typeof handleRemoteCommand==='function')handleRemoteCommand(" + json.toString() + ");";
            activity.injectJs(js);
            Log.d(TAG, "Remote cmd: " + action);
            return cors(newFixedLengthResponse(Response.Status.OK, "application/json", "{\"ok\":true}"));
        }

        // ── /state — get current TV state ──
        if ("/state".equals(uri)) {
            String state = activity.getTvState();
            return cors(newFixedLengthResponse(Response.Status.OK, "application/json", state != null ? state : "{}"));
        }

        return cors(newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found"));
    }

    private static boolean isLanAddress(String ip) {
        if (ip == null) return false;
        if (ip.equals("127.0.0.1") || ip.equals("::1")) return true;
        if (ip.startsWith("192.168.") || ip.startsWith("10.")) return true;
        if (ip.startsWith("172.")) {
            try {
                int second = Integer.parseInt(ip.split("\\.")[1]);
                if (second >= 16 && second <= 31) return true;
            } catch (Exception e) { /* ignore */ }
        }
        return false;
    }

    private static int nameToKeyCode(String name) {
        switch (name.toLowerCase()) {
            case "back":           return KeyEvent.KEYCODE_BACK;
            case "up":             return KeyEvent.KEYCODE_DPAD_UP;
            case "down":           return KeyEvent.KEYCODE_DPAD_DOWN;
            case "left":           return KeyEvent.KEYCODE_DPAD_LEFT;
            case "right":          return KeyEvent.KEYCODE_DPAD_RIGHT;
            case "select":
            case "enter":
            case "ok":             return KeyEvent.KEYCODE_DPAD_CENTER;
            case "playpause":
            case "play_pause":     return KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
            case "play":           return KeyEvent.KEYCODE_MEDIA_PLAY;
            case "pause":          return KeyEvent.KEYCODE_MEDIA_PAUSE;
            case "stop":           return KeyEvent.KEYCODE_MEDIA_STOP;
            case "rewind":
            case "rew":            return KeyEvent.KEYCODE_MEDIA_REWIND;
            case "forward":
            case "fwd":
            case "fastforward":    return KeyEvent.KEYCODE_MEDIA_FAST_FORWARD;
            case "menu":           return KeyEvent.KEYCODE_MENU;
            case "home":           return KeyEvent.KEYCODE_HOME;
            case "info":           return KeyEvent.KEYCODE_INFO;
            case "guide":          return KeyEvent.KEYCODE_GUIDE;
            case "volup":
            case "vol_up":         return KeyEvent.KEYCODE_VOLUME_UP;
            case "voldown":
            case "vol_down":       return KeyEvent.KEYCODE_VOLUME_DOWN;
            case "mute":           return KeyEvent.KEYCODE_VOLUME_MUTE;
            case "chup":
            case "ch_up":          return KeyEvent.KEYCODE_CHANNEL_UP;
            case "chdown":
            case "ch_down":        return KeyEvent.KEYCODE_CHANNEL_DOWN;
            case "0":              return KeyEvent.KEYCODE_0;
            case "1":              return KeyEvent.KEYCODE_1;
            case "2":              return KeyEvent.KEYCODE_2;
            case "3":              return KeyEvent.KEYCODE_3;
            case "4":              return KeyEvent.KEYCODE_4;
            case "5":              return KeyEvent.KEYCODE_5;
            case "6":              return KeyEvent.KEYCODE_6;
            case "7":              return KeyEvent.KEYCODE_7;
            case "8":              return KeyEvent.KEYCODE_8;
            case "9":              return KeyEvent.KEYCODE_9;
            default:               return 0;
        }
    }
}
