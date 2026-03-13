package com.switchback.lite;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.KeyEvent;
import java.io.File;

public class MainActivity extends Activity {
    private static final String TAG = "SwitchbackLite";
    private static final int PORT = 8123;
    private static final int REMOTE_PORT = 8124;
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private WebView webView;
    private LocalServer server;
    private RemoteServer remoteServer;
    private ValueCallback<Uri[]> fileUploadCallback;
    private String pendingConfigCode = null;

    // TV state shared with RemoteServer
    private volatile String tvState = "{}";

    // ── Methods called by RemoteServer ────────────────────────

    /** Called by RemoteServer when WebView pushes state via /state-push */
    public void setTvState(String json) {
        tvState = json != null ? json : "{}";
    }

    /** Called by RemoteServer GET /state to return current TV state to phone */
    public String getTvState() {
        return tvState;
    }

    /** Called by RemoteServer to run arbitrary JS in the WebView (commands, config) */
    public void injectJs(final String js) {
        if (webView == null) return;
        new Handler(Looper.getMainLooper()).post(() ->
            webView.evaluateJavascript(js, null)
        );
    }

    /** Called by RemoteServer GET /key to send a D-pad key event into the WebView */
    public void dispatchRemoteKey(final int keyCode) {
        if (webView == null) return;
        new Handler(Looper.getMainLooper()).post(() -> {
            webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, keyCode));
            webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, keyCode));
        });
    }

    // ─────────────────────────────────────────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        nukeWebViewCacheIfNeeded();

        // Start local asset server (port 8123)
        try {
            server = new LocalServer(PORT, getAssets());
            server.start();
            Log.i(TAG, "Local server started on port " + PORT);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start local server", e);
        }

        // Start LAN remote server (port 8124)
        try {
            remoteServer = new RemoteServer(this);
            remoteServer.start();
            Log.i(TAG, "Remote server started on port " + REMOTE_PORT);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start remote server", e);
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);

        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileUploadCallback != null) fileUploadCallback.onReceiveValue(null);
                fileUploadCallback = callback;
                Intent intent = params.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    Log.e(TAG, "File chooser failed", e);
                    fileUploadCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && url.startsWith("switchback://exit")) {
                    finishAffinity();
                    System.exit(0);
                    return true;
                }
                return false;
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject remote PIN and network info for JS to display
                injectRemoteInfo();
                if (pendingConfigCode != null) {
                    String code = pendingConfigCode.replace("\\", "\\\\").replace("'", "\\'");
                    view.evaluateJavascript(
                        "if(typeof handleDeepLinkConfig==='function')handleDeepLinkConfig('" + code + "');",
                        null);
                    pendingConfigCode = null;
                }
            }
        });

        handleConfigIntent(getIntent());
        webView.loadUrl("http://localhost:" + PORT + "/index.html");
    }

    /** Inject LAN IP and remote port into WebView so JS can show the remote URL */
    private void injectRemoteInfo() {
        try {
            String ipStr = getLanIpAddress();
            String pin = (remoteServer != null) ? remoteServer.getPin() : "";
            String js = "window.REMOTE_IP='" + ipStr + "';" +
                        "window.REMOTE_PORT=" + REMOTE_PORT + ";" +
                        "window.REMOTE_PIN='" + pin + "';";
            webView.evaluateJavascript(js, null);
            Log.i(TAG, "Injected remote info: ip=" + ipStr + " pin=" + pin);
        } catch (Exception e) {
            Log.w(TAG, "Could not inject remote info: " + e.getMessage());
        }
    }

    /** Returns the device LAN IP. Tries WiFi first, falls back to NetworkInterface
     *  (covers Ethernet, USB tethering, etc. on Android TV boxes). */
    private String getLanIpAddress() {
        // 1. Try WiFi
        try {
            android.net.wifi.WifiManager wm = (android.net.wifi.WifiManager)
                getApplicationContext().getSystemService(WIFI_SERVICE);
            int ip = wm.getConnectionInfo().getIpAddress();
            if (ip != 0) {
                return String.format("%d.%d.%d.%d",
                    (ip & 0xff), (ip >> 8 & 0xff), (ip >> 16 & 0xff), (ip >> 24 & 0xff));
            }
        } catch (Exception e) {
            Log.w(TAG, "WiFi IP lookup failed: " + e.getMessage());
        }
        // 2. Fall back to NetworkInterface (covers Ethernet, USB tethering)
        try {
            java.util.Enumeration<java.net.NetworkInterface> ifaces =
                java.net.NetworkInterface.getNetworkInterfaces();
            while (ifaces != null && ifaces.hasMoreElements()) {
                java.net.NetworkInterface iface = ifaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) continue;
                java.util.Enumeration<java.net.InetAddress> addrs = iface.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    java.net.InetAddress addr = addrs.nextElement();
                    if (!addr.isLoopbackAddress() && addr instanceof java.net.Inet4Address) {
                        return addr.getHostAddress();
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "NetworkInterface IP lookup failed: " + e.getMessage());
        }
        return "";
    }

    private void nukeWebViewCacheIfNeeded() {
        int currentVersion = 0;
        try {
            currentVersion = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
        } catch (Exception e) { /* ignore */ }

        SharedPreferences prefs = getSharedPreferences("switchback_prefs", MODE_PRIVATE);
        int lastVersion = prefs.getInt("last_version_code", 0);

        if (currentVersion != lastVersion) {
            Log.i(TAG, "Version changed " + lastVersion + " -> " + currentVersion + ", nuking WebView cache");
            File cacheDir = getCacheDir();
            if (cacheDir.exists()) deleteRecursive(cacheDir);
            File appDir = getFilesDir().getParentFile();
            for (String dirName : new String[]{"app_webview", "app_webview_default", "cache", "code_cache"}) {
                File dir = new File(appDir, dirName);
                if (dir.exists()) deleteRecursive(dir);
            }
            prefs.edit().putInt("last_version_code", currentVersion).apply();
        }
    }

    private void deleteRecursive(File fileOrDir) {
        if (fileOrDir.isDirectory()) {
            File[] children = fileOrDir.listFiles();
            if (children != null) for (File child : children) deleteRecursive(child);
        }
        fileOrDir.delete();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleConfigIntent(intent);
        if (pendingConfigCode != null && webView != null) {
            String code = pendingConfigCode.replace("\\", "\\\\").replace("'", "\\'");
            webView.evaluateJavascript(
                "if(typeof handleDeepLinkConfig==='function')handleDeepLinkConfig('" + code + "');",
                null);
            pendingConfigCode = null;
        }
    }

    private void handleConfigIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri uri = intent.getData();
        if ("switchback".equals(uri.getScheme()) && "import".equals(uri.getHost())) {
            String path = uri.getPath();
            if (path != null && path.startsWith("/")) path = path.substring(1);
            if (path != null && !path.isEmpty()) {
                pendingConfigCode = path;
                Log.i(TAG, "Deep link config received");
            }
        }
    }

    @Override
    public void onBackPressed() {
        webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_BACK));
        webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_BACK));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    protected void onDestroy() {
        if (server != null) server.stop();
        if (remoteServer != null) remoteServer.stop();
        super.onDestroy();
    }
}
