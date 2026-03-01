package com.switchback.lite;

import android.util.Log;
import android.view.KeyEvent;
import fi.iki.elonen.NanoHTTPD;
import java.util.Map;

/**
 * HTTP server on port 8124 (LAN) for remote control. UniRemote or any phone app can send
 * GET /key?name=Up|Down|Left|Right|Select|Back|PlayPause|Menu to inject D-pad/back keys into the WebView.
 */
public class RemoteServer extends NanoHTTPD {
    private static final String TAG = "RemoteServer";
    private static final int REMOTE_PORT = 8124;

    private final MainActivity activity;

    public RemoteServer(MainActivity activity) {
        super("0.0.0.0", REMOTE_PORT);
        this.activity = activity;
    }

    public static int getPort() {
        return REMOTE_PORT;
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        String remoteIp = session.getRemoteIpAddress();

        if (remoteIp != null && !isLanAddress(remoteIp)) {
            Log.w(TAG, "Rejected non-LAN request from " + remoteIp);
            return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "LAN only");
        }

        if (!"/key".equals(uri)) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found");
        }

        Map<String, String> params = session.getParms();
        String name = params.get("name");
        if (name == null) name = params.get("key");
        if (name == null || name.isEmpty()) {
            return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Missing name= or key=");
        }

        int keyCode = nameToKeyCode(name.trim());
        if (keyCode == 0) {
            return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Unknown key: " + name);
        }

        activity.dispatchRemoteKey(keyCode);
        return newFixedLengthResponse(Response.Status.OK, "text/plain", "OK");
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
            case "back":       return KeyEvent.KEYCODE_BACK;
            case "up":         return KeyEvent.KEYCODE_DPAD_UP;
            case "down":       return KeyEvent.KEYCODE_DPAD_DOWN;
            case "left":       return KeyEvent.KEYCODE_DPAD_LEFT;
            case "right":      return KeyEvent.KEYCODE_DPAD_RIGHT;
            case "select":
            case "enter":
            case "ok":         return KeyEvent.KEYCODE_DPAD_CENTER;
            case "playpause":
            case "play_pause": return KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
            case "menu":       return KeyEvent.KEYCODE_MENU;
            default:           return 0;
        }
    }
}
