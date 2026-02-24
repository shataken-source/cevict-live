package com.switchback.tv;

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
    private final AssetManager assets;

    public LocalServer(int port, AssetManager assets) {
        super(port);
        this.assets = assets;
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();

        // Proxy endpoint: /proxy?url=<encoded_url>
        if (uri.equals("/proxy")) {
            return handleProxy(session);
        }

        if (uri.equals("/")) uri = "/index.html";
        String path = uri.substring(1);

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

            InputStream is;
            if (code >= 200 && code < 400) {
                is = conn.getInputStream();
            } else {
                InputStream errStream = conn.getErrorStream();
                String errBody = "";
                if (errStream != null) {
                    byte[] buf = new byte[1024];
                    int n = errStream.read(buf);
                    if (n > 0) errBody = new String(buf, 0, n);
                }
                Log.e(TAG, "Proxy HTTP " + code + ": " + errBody);
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain",
                    "Remote server returned HTTP " + code + ": " + errBody);
            }

            String contentType = conn.getContentType();
            if (contentType == null) contentType = "text/plain";

            Response resp = newChunkedResponse(Response.Status.OK, contentType, is);
            resp.addHeader("Access-Control-Allow-Origin", "*");
            return resp;
        } catch (Exception e) {
            Log.e(TAG, "Proxy error: " + e.getMessage(), e);
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain",
                "Proxy error: " + e.getClass().getSimpleName() + ": " + e.getMessage());
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
        return "application/octet-stream";
    }
}
