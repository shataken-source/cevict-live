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
                    if (contentType == null) contentType = "application/octet-stream";
                    long contentLength = conn.getContentLengthLong();

                    // Always buffer m3u8 playlists so we can rewrite segment URLs
                    boolean isM3u8 = contentType.contains("mpegurl") || contentType.contains("m3u")
                        || targetUrl.contains(".m3u8") || targetUrl.contains(".m3u");

                    if (isM3u8) {
                        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = is.read(buf)) != -1) baos.write(buf, 0, n);
                        is.close();
                        conn.disconnect();
                        conn = null;

                        String playlist = baos.toString("UTF-8");
                        String rewritten = rewriteM3u8(playlist, targetUrl);
                        byte[] body = rewritten.getBytes("UTF-8");
                        Log.i(TAG, "M3U8 rewritten: " + body.length + " bytes");
                        InputStream bodyStream = new java.io.ByteArrayInputStream(body);
                        Response resp = newFixedLengthResponse(Response.Status.OK,
                            "application/vnd.apple.mpegurl", bodyStream, body.length);
                        resp.addHeader("Access-Control-Allow-Origin", "*");
                        resp.addHeader("Cache-Control", "no-cache");
                        return resp;
                    }

                    // For live streams (no content-length or video/audio types), use chunked streaming
                    // to avoid buffering an infinite stream into memory
                    boolean isStream = contentLength < 0
                        || contentType.startsWith("video/")
                        || contentType.startsWith("audio/")
                        || contentType.contains("mpegts")
                        || contentType.contains("octet-stream")
                        || contentType.contains("mp2t");

                    if (isStream) {
                        Log.i(TAG, "Proxy streaming: " + contentType + " for " + targetUrl);
                        // Do NOT disconnect conn here — NanoHTTPD will read from the InputStream
                        // The connection stays alive until the client stops reading
                        final HttpURLConnection streamConn = conn;
                        conn = null; // prevent finally block from disconnecting
                        Response resp = newChunkedResponse(Response.Status.OK, contentType, is);
                        resp.addHeader("Access-Control-Allow-Origin", "*");
                        return resp;
                    }

                    // For small API responses, buffer into memory as before
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

    /**
     * Rewrites an M3U8 playlist so every URI line (segment .ts, sub-playlist .m3u8, etc.)
     * is converted to an absolute URL and then wrapped as:
     *   http://localhost:8123/proxy?url=<encoded_absolute_url>
     *
     * This is required because HLS.js resolves segment URLs relative to the m3u8 base URL
     * and fetches them directly — which fails inside the Android WebView sandbox since the
     * IPTV server is an external host. Routing everything through the local proxy fixes it.
     */
    private String rewriteM3u8(String playlist, String baseUrl) {
        // Derive the base for resolving relative URLs
        String base = baseUrl;
        int lastSlash = base.lastIndexOf('/');
        if (lastSlash > 8) base = base.substring(0, lastSlash + 1); // keep trailing slash

        StringBuilder sb = new StringBuilder();
        for (String line : playlist.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                // Pass-through comment/tag lines unchanged, but rewrite URI= attributes
                String out = trimmed;
                // Rewrite URI="..." inside EXT-X-KEY and EXT-X-MAP tags
                if (out.contains("URI=\"")) {
                    StringBuilder rewritten = new StringBuilder();
                    int pos = 0;
                    while (pos < out.length()) {
                        int start = out.indexOf("URI=\"", pos);
                        if (start < 0) { rewritten.append(out.substring(pos)); break; }
                        int valStart = start + 5; // after URI="
                        int valEnd = out.indexOf("\"", valStart);
                        if (valEnd < 0) { rewritten.append(out.substring(pos)); break; }
                        String inner = out.substring(valStart, valEnd);
                        String abs = resolveUrl(inner, base);
                        rewritten.append(out, pos, start);
                        try {
                            rewritten.append("URI=\"http://localhost:8123/proxy?url=")
                                     .append(java.net.URLEncoder.encode(abs, "UTF-8"))
                                     .append("\"");
                        } catch (Exception enc) {
                            rewritten.append("URI=\"").append(inner).append("\"");
                        }
                        pos = valEnd + 1;
                    }
                    out = rewritten.toString();
                }
                sb.append(out).append("\n");
            } else {
                // Non-comment, non-empty lines are URLs (segments or sub-playlists)
                String abs = resolveUrl(trimmed, base);
                try {
                    String proxied = "http://localhost:8123/proxy?url=" + java.net.URLEncoder.encode(abs, "UTF-8");
                    sb.append(proxied).append("\n");
                } catch (Exception e) {
                    sb.append(trimmed).append("\n");
                }
            }
        }
        return sb.toString();
    }

    private String resolveUrl(String url, String base) {
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        if (url.startsWith("//")) return "http:" + url;
        if (url.startsWith("/")) {
            // Absolute path — extract scheme + host from base
            try {
                URL b = new URL(base);
                return b.getProtocol() + "://" + b.getHost() + (b.getPort() != -1 ? ":" + b.getPort() : "") + url;
            } catch (Exception e) { return url; }
        }
        // Relative path
        return base + url;
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
