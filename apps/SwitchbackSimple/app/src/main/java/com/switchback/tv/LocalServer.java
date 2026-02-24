package com.switchback.tv;

import android.content.res.AssetManager;
import java.io.IOException;
import java.io.InputStream;
import fi.iki.elonen.NanoHTTPD;

public class LocalServer extends NanoHTTPD {
    private final AssetManager assets;

    public LocalServer(int port, AssetManager assets) {
        super(port);
        this.assets = assets;
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        if (uri.equals("/")) uri = "/index.html";
        // Strip leading slash
        String path = uri.substring(1);

        try {
            InputStream is = assets.open(path);
            String mime = getMimeType(path);
            return newChunkedResponse(Response.Status.OK, mime, is);
        } catch (IOException e) {
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found: " + path);
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
