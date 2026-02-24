package com.switchback.lite;

import android.content.res.AssetManager;
import android.util.Log;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import fi.iki.elonen.NanoHTTPD;

public class LocalServer extends NanoHTTPD {
    private static final String TAG = "LocalServer";
    private static final int MAX_REDIRECTS = 5;
    private final AssetManager assets;

    public LocalServer(int port, AssetManager assets) {
        super("127.0.0.1", port);
        this.assets = assets;
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();

        // Only allow requests from localhost
        String remoteIp = session.getRemoteIpAddress();
        if (remoteIp != null && !remoteIp.equals("127.0.0.1") && !remoteIp.equals("::1") && !remoteIp.equals("0:0:0:0:0:0:0:1")) {
            Log.w(TAG, "Blocked non-local request from: " + remoteIp);
            return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Forbidden");
        }

        // Proxy endpoint: /proxy?url=<encoded_url>
        if (uri.equals("/proxy")) {
            return handleProxy(session);
        }

        if (uri.equals("/")) uri = "/index.html";
        // Strip query string before asset lookup
        int qIdx = uri.indexOf('?');
        if (qIdx >= 0) uri = uri.substring(0, qIdx);
        String path = uri.substring(1);

        // Prevent path traversal
        if (path.contains("..") || path.startsWith("/")) {
            return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Forbidden");
        }

        try {
            InputStream is = assets.open(path);
            String mime = getMimeType(path);
            return newChunkedResponse(Response.Status.OK, mime, is);
        } catch (IOException e) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found: " + path);
        }
    }

    private Response handleProxy(IHTTPSession session) {
        String rawQuery = session.getQueryParameterString();
        String targetUrl = null;

        // Extract url= parameter from raw query to avoid double-decoding
        if (rawQuery != null && rawQuery.startsWith("url=")) {
            try {
                targetUrl = java.net.URLDecoder.decode(rawQuery.substring(4), "UTF-8");
            } catch (Exception e) {
                targetUrl = rawQuery.substring(4);
            }
        }

        if (targetUrl == null || targetUrl.isEmpty()) {
            // Fallback to parsed params
            Map<String, String> params = session.getParms();
            targetUrl = params.get("url");
        }

        if (targetUrl == null || targetUrl.isEmpty()) {
            return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Missing url parameter");
        }

        // SSRF protection: only allow http/https schemes
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Only http/https URLs allowed");
        }

        // SSRF protection: block requests to private/loopback addresses
        try {
            URL parsedUrl = new URL(targetUrl);
            String host = parsedUrl.getHost();
            if (isPrivateHost(host)) {
                Log.w(TAG, "Blocked proxy to private host: " + host);
                return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Proxy to private addresses not allowed");
            }
        } catch (Exception e) {
            return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Invalid URL");
        }

        // Retry up to 2 times for transient errors (e.g. HTTP 513)
        int maxRetries = 2;
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            HttpURLConnection conn = null;
            try {
                Log.i(TAG, "Proxy fetch (attempt " + (attempt + 1) + "): " + targetUrl);
                URL url = new URL(targetUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 12; Streaming Box) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                conn.setRequestProperty("Accept", "*/*");
                conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
                conn.setRequestProperty("Connection", "keep-alive");
                conn.setRequestProperty("Accept-Encoding", "identity");

                int code = conn.getResponseCode();
                Log.i(TAG, "Proxy response: " + code + " for " + targetUrl);

                if (code >= 200 && code < 400) {
                    InputStream is = conn.getInputStream();
                    String contentType = conn.getContentType();
                    if (contentType == null) contentType = "text/plain";

                    // Read full response into memory before disconnecting
                    // (NanoHTTPD reads async — if we use chunked response,
                    //  the finally block disconnects conn and closes the stream)
                    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = is.read(buf)) != -1) {
                        baos.write(buf, 0, n);
                    }
                    is.close();
                    conn.disconnect();
                    conn = null;

                    byte[] body = baos.toByteArray();
                    Log.i(TAG, "Proxy OK: " + body.length + " bytes for " + targetUrl);
                    InputStream bodyStream = new java.io.ByteArrayInputStream(body);
                    Response resp = newFixedLengthResponse(Response.Status.OK, contentType, bodyStream, body.length);
                    resp.addHeader("Access-Control-Allow-Origin", "*");
                    return resp;
                } else {
                    String errBody = "";
                    InputStream errStream = conn.getErrorStream();
                    if (errStream != null) {
                        try {
                            byte[] buf = new byte[1024];
                            int n = errStream.read(buf);
                            if (n > 0) errBody = new String(buf, 0, n, "UTF-8");
                        } finally {
                            errStream.close();
                        }
                    }
                    conn.disconnect();
                    conn = null;

                    // Retry on server errors (5xx) including non-standard 513
                    if (code >= 500 && attempt < maxRetries) {
                        Log.w(TAG, "Retrying after HTTP " + code + " (attempt " + (attempt + 1) + ")");
                        try { Thread.sleep(1000 * (attempt + 1)); } catch (InterruptedException ie) { /* ignore */ }
                        continue;
                    }

                    Log.e(TAG, "Proxy HTTP " + code + ": " + errBody);
                    return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain",
                        "Remote server returned HTTP " + code + ": " + errBody);
                }
            } catch (Exception e) {
                if (conn != null) { conn.disconnect(); conn = null; }

                // Retry on connection errors
                if (attempt < maxRetries) {
                    Log.w(TAG, "Retrying after error: " + e.getMessage() + " (attempt " + (attempt + 1) + ")");
                    try { Thread.sleep(1000 * (attempt + 1)); } catch (InterruptedException ie) { /* ignore */ }
                    continue;
                }

                Log.e(TAG, "Proxy error: " + e.getMessage(), e);
                return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain",
                    "Proxy error: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }
        return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Proxy: max retries exceeded");
    }

    private boolean isPrivateHost(String host) {
        if (host == null || host.isEmpty()) return true;
        String h = host.toLowerCase().trim();
        // Block localhost variants
        if (h.equals("localhost") || h.equals("127.0.0.1") || h.equals("::1") || h.equals("0.0.0.0")) {
            return true;
        }
        // Block private IP ranges by pattern (no DNS lookup — avoids hangs on Android TV)
        if (h.startsWith("10.") || h.startsWith("192.168.") || h.startsWith("169.254.")) return true;
        if (h.startsWith("172.")) {
            try {
                int second = Integer.parseInt(h.split("\\.")[1]);
                if (second >= 16 && second <= 31) return true;
            } catch (Exception e) { /* not an IP, allow */ }
        }
        return false;
    }

    private String getMimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".woff") || path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }
}
