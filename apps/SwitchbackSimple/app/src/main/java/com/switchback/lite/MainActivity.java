package com.switchback.lite;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.KeyEvent;
import java.io.File;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;

public class MainActivity extends Activity {
    private static final String TAG = "SwitchbackLite";
    private static final int PORT = 8123;
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private WebView webView;
    private LocalServer server;
    private RemoteServer remoteServer;
    private ValueCallback<Uri[]> fileUploadCallback;
    private String pendingConfigCode = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Nuke WebView cache on every version upgrade so fresh assets load
        nukeWebViewCacheIfNeeded();

        // Start local web server to serve assets over HTTP
        try {
            server = new LocalServer(PORT, getAssets());
            server.start();
            Log.i(TAG, "Local server started on port " + PORT);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start local server", e);
        }

        try {
            remoteServer = new RemoteServer(this);
            remoteServer.start();
            Log.i(TAG, "Remote server started on port " + RemoteServer.getPort());
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

        // Disable WebView cache — always load fresh assets from local server
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);

        // Android TV: ensure WebView can receive D-pad focus
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();

        // Expose native data to JS synchronously via Android.getDeviceId() etc.
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public String getDeviceId() {
                return getAndroidId();
            }

            @android.webkit.JavascriptInterface
            public String getLanIp() {
                String ip = MainActivity.this.getLanIp();
                return ip != null ? ip : "";
            }

            @android.webkit.JavascriptInterface
            public String getRemotePin() {
                return remoteServer != null ? remoteServer.getPin() : "";
            }

            @android.webkit.JavascriptInterface
            public int getRemotePort() {
                return RemoteServer.getPort();
            }
        }, "Android");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
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
                // Inject remote server PIN + port so Settings screen can display it
                if (remoteServer != null) {
                    String rPin = remoteServer.getPin();
                    int rPort = RemoteServer.getPort();
                    String lanIp = getLanIp();
                    String ipJs = lanIp != null ? "window.__LAN_IP='" + lanIp + "';" : "";
                    String deviceId = getAndroidId();
                    String devJs = deviceId != null ? "window.__DEVICE_ID='" + deviceId + "';" : "";
                    view.evaluateJavascript(
                            "window.__REMOTE_PIN='" + rPin + "';window.__REMOTE_PORT=" + rPort + ";" + ipJs + devJs,
                            null);
                }
                if (pendingConfigCode != null) {
                    String code = pendingConfigCode.replace("\\", "\\\\")
                            .replace("'", "\\'");
                    view.evaluateJavascript(
                            "if(typeof handleDeepLinkConfig==='function')handleDeepLinkConfig('" + code + "');",
                            null);
                    pendingConfigCode = null;
                }
            }
        });

        // Check for deep link intent: switchback://import/CODE
        handleConfigIntent(getIntent());

        // Load from local HTTP server — no more file:// CORS issues
        webView.loadUrl("http://localhost:" + PORT + "/index.html");
    }

    private void nukeWebViewCacheIfNeeded() {
        int currentVersion = 0;
        try {
            currentVersion = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
        } catch (Exception e) {
            /* ignore */ }

        SharedPreferences prefs = getSharedPreferences("switchback_prefs", MODE_PRIVATE);
        int lastVersion = prefs.getInt("last_version_code", 0);

        if (currentVersion != lastVersion) {
            Log.i(TAG, "Version changed " + lastVersion + " -> " + currentVersion + ", nuking WebView cache");

            // Delete WebView cache directory
            File cacheDir = getCacheDir();
            if (cacheDir.exists())
                deleteRecursive(cacheDir);

            // Delete WebView data directories
            File appDir = getFilesDir().getParentFile();
            String[] webViewDirs = { "app_webview", "app_webview_default", "cache", "code_cache" };
            for (String dirName : webViewDirs) {
                File dir = new File(appDir, dirName);
                if (dir.exists()) {
                    Log.i(TAG, "Deleting " + dir.getAbsolutePath());
                    deleteRecursive(dir);
                }
            }

            prefs.edit().putInt("last_version_code", currentVersion).apply();
            Log.i(TAG, "WebView cache nuked");
        }
    }

    private void deleteRecursive(File fileOrDir) {
        if (fileOrDir.isDirectory()) {
            File[] children = fileOrDir.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        fileOrDir.delete();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleConfigIntent(intent);
        // If WebView is already loaded, inject immediately
        if (pendingConfigCode != null && webView != null) {
            String code = pendingConfigCode.replace("\\", "\\\\")
                    .replace("'", "\\'");
            webView.evaluateJavascript(
                    "if(typeof handleDeepLinkConfig==='function')handleDeepLinkConfig('" + code + "');",
                    null);
            pendingConfigCode = null;
        }
    }

    private void handleConfigIntent(Intent intent) {
        if (intent == null || intent.getData() == null)
            return;
        Uri uri = intent.getData();
        if ("switchback".equals(uri.getScheme()) && "import".equals(uri.getHost())) {
            String path = uri.getPath();
            if (path != null && path.startsWith("/"))
                path = path.substring(1);
            if (path != null && !path.isEmpty()) {
                pendingConfigCode = path;
                Log.i(TAG, "Deep link config received");
            }
        }
    }

    /**
     * Get unique device identifier (ANDROID_ID — 64-bit hex, unique per
     * device+app).
     */
    private String getAndroidId() {
        try {
            String id = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
            if (id != null && !id.isEmpty()) {
                Log.i(TAG, "Device ID: " + id);
                return id;
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to get device ID", e);
        }
        return null;
    }

    /**
     * Get the device's LAN IPv4 address using NetworkInterface (reliable on Android
     * TV).
     */
    private String getLanIp() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (ni.isLoopback() || !ni.isUp())
                    continue;
                Enumeration<InetAddress> addrs = ni.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress addr = addrs.nextElement();
                    if (addr instanceof Inet4Address && !addr.isLoopbackAddress()) {
                        String ip = addr.getHostAddress();
                        if (ip != null
                                && (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172."))) {
                            Log.i(TAG, "Detected LAN IP: " + ip);
                            return ip;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to detect LAN IP", e);
        }
        return null;
    }

    /**
     * Called by RemoteServer to inject JavaScript into the WebView (e.g. config
     * push).
     */
    public void injectJs(String js) {
        runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    /** Called by RemoteServer to get current TV state as JSON. */
    private volatile String lastTvState = "{}";

    public String getTvState() {
        return lastTvState;
    }

    public void setTvState(String state) {
        if (state != null)
            lastTvState = state;
    }

    /** Called by RemoteServer when a phone sends GET /key?name=Up etc. */
    public void dispatchRemoteKey(int keyCode) {
        runOnUiThread(() -> {
            if (webView != null) {
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, keyCode));
                webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, keyCode));
            }
        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            // Inject JS directly — dispatchKeyEvent gets swallowed by WebView
            if (webView != null) {
                webView.evaluateJavascript(
                        "document.dispatchEvent(new KeyboardEvent('keydown',{key:'GoBack',bubbles:true}));",
                        null);
            }
            return true; // consume so Android doesn't finish the activity
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                    results = new Uri[] { data.getData() };
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
        if (server != null)
            server.stop();
        if (remoteServer != null)
            remoteServer.stop();
        super.onDestroy();
    }
}
