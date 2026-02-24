package com.switchback.tv;

import android.content.res.AssetManager;
import android.util.Log;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
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

        HttpURLConnection conn = null;
        try {
            Log.i(TAG, "Proxy fetch: " + targetUrl);
            URL url = new URL(targetUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(60000);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

            int code = conn.getResponseCode();
            Log.i(TAG, "Proxy response: " + code + " for " + targetUrl);

            if (code >= 200 && code < 400) {
                InputStream is = conn.getInputStream();
                String contentType = conn.getContentType();
                if (contentType == null) contentType = "text/plain";

                Response resp = newChunkedResponse(Response.Status.OK, contentType, is);
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
                Log.e(TAG, "Proxy HTTP " + code + ": " + errBody);
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain",
                    "Remote server returned HTTP " + code + ": " + errBody);
            }
        } catch (Exception e) {
            Log.e(TAG, "Proxy error: " + e.getMessage(), e);
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain",
                "Proxy error: " + e.getClass().getSimpleName() + ": " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private boolean isPrivateHost(String host) {
        if (host == null || host.isEmpty()) return true;
        // Block localhost variants
        if (host.equals("localhost") || host.equals("127.0.0.1") || host.equals("::1") || host.equals("0.0.0.0")) {
            return true;
        }
        // Block common private IP ranges
        try {
            InetAddress addr = InetAddress.getByName(host);
            return addr.isLoopbackAddress() || addr.isLinkLocalAddress() || addr.isSiteLocalAddress();
        } catch (Exception e) {
            return false;
        }
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
