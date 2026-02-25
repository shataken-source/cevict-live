package com.switchback.lite;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.KeyEvent;
import java.io.File;

public class MainActivity extends Activity {
    private static final String TAG = "SwitchbackLite";
    private static final int PORT = 8123;
    private WebView webView;
    private LocalServer server;

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

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && url.startsWith("switchback://exit")) {
                    finish();
                    return true;
                }
                return false;
            }
        });

        // Load from local HTTP server — no more file:// CORS issues
        webView.loadUrl("http://localhost:" + PORT + "/index.html");
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

            // Delete WebView cache directory
            File cacheDir = getCacheDir();
            if (cacheDir.exists()) deleteRecursive(cacheDir);

            // Delete WebView data directories
            File appDir = getFilesDir().getParentFile();
            String[] webViewDirs = {"app_webview", "app_webview_default", "cache", "code_cache"};
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
    public void onBackPressed() {
        // Dispatch GoBack key to JavaScript so the SPA handles navigation.
        // The JS handler shows exit confirm on home screen and closes player otherwise.
        webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_BACK));
        webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_BACK));
    }

    @Override
    protected void onDestroy() {
        if (server != null) {
            server.stop();
        }
        super.onDestroy();
    }
}
