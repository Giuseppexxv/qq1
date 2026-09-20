import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON
  app.use(express.json());

  // CORS Preflight for all API routes
  app.options("/api/*", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Authorization, X-Requested-With, Origin, Accept");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");
    res.status(204).end();
  });

  // API: Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Liquid Stremio Core" });
  });

  // Helper to parse custom headers from query
  function extractCustomHeaders(req: express.Request): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    };

    // Extract headers parameter if present
    if (req.query.headers && typeof req.query.headers === "string") {
      try {
        let parsed: any = null;
        if (req.query.headers.startsWith("{")) {
          parsed = JSON.parse(req.query.headers);
        } else {
          // base64 check
          const decoded = Buffer.from(req.query.headers, "base64").toString("utf-8");
          if (decoded.startsWith("{")) parsed = JSON.parse(decoded);
        }
        if (parsed) {
          const reqObj = parsed.request || parsed;
          for (const [k, v] of Object.entries(reqObj)) {
            if (typeof v === "string") headers[k] = v;
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (req.query.referer && typeof req.query.referer === "string") {
      headers["Referer"] = req.query.referer;
    }
    if (req.query.origin && typeof req.query.origin === "string") {
      headers["Origin"] = req.query.origin;
    }

    return headers;
  }

  // API: Universal Video Stream & HLS Proxy
  // Supports Range requests (seeking), header spoofing (Referer/Origin/User-Agent),
  // and rewrites HLS .m3u8 playlists so all chunks are automatically proxied
  app.all("/api/stream-proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter" });
    }

    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return res.status(400).json({ error: "Invalid protocol" });
      }

      const headers = extractCustomHeaders(req);

      // Forward Range request for progressive video loading / seeking
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }

      const controller = new AbortController();
      req.on("close", () => {
        controller.abort();
      });

      const response = await fetch(targetUrl, {
        method: req.method === "HEAD" ? "HEAD" : "GET",
        headers,
        signal: controller.signal,
      });

      // Set permissive CORS headers for HTML5 video & Hls.js
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Authorization, X-Requested-With, Origin, Accept");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");
      res.setHeader("Accept-Ranges", "bytes");

      const contentType = response.headers.get("content-type") || "";
      const isM3u8 =
        targetUrl.includes(".m3u8") ||
        contentType.includes("mpegurl") ||
        contentType.includes("application/x-mpegURL");

      if (req.method === "HEAD") {
        res.status(response.status);
        if (contentType) res.setHeader("Content-Type", contentType);
        const cl = response.headers.get("content-length");
        if (cl) res.setHeader("Content-Length", cl);
        return res.end();
      }

      // If it's an HLS playlist, rewrite segment and sub-playlist URLs to point through stream-proxy
      if (isM3u8) {
        const text = await response.text();
        if (text.startsWith("#EXTM3U") || text.includes("#EXTINF") || text.includes("#EXT-X-")) {
          res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");

          // Keep headers param string for nested requests
          const headersParam = req.query.headers ? `&headers=${encodeURIComponent(req.query.headers as string)}` : "";
          const refererParam = headers["Referer"] ? `&referer=${encodeURIComponent(headers["Referer"])}` : "";

          const rewritten = text
            .split("\n")
            .map((line) => {
              const trimmed = line.trim();
              if (!trimmed) return line;

              // Handle URI attributes in tags like #EXT-X-MEDIA, #EXT-X-KEY, #EXT-X-MAP
              if (trimmed.startsWith("#") && trimmed.includes('URI="')) {
                return trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
                  try {
                    const resolved = new URL(uri, targetUrl).href;
                    return `URI="/api/stream-proxy?url=${encodeURIComponent(resolved)}${headersParam}${refererParam}"`;
                  } catch {
                    return `URI="${uri}"`;
                  }
                });
              }

              // Handle playlist / segment URI lines (don't start with #)
              if (!trimmed.startsWith("#")) {
                try {
                  const resolved = new URL(trimmed, targetUrl).href;
                  return `/api/stream-proxy?url=${encodeURIComponent(resolved)}${headersParam}${refererParam}`;
                } catch {
                  return line;
                }
              }

              return line;
            })
            .join("\n");

          return res.status(response.status).send(rewritten);
        }
      }

      // For binary media (TS segments, MP4, WebM, audio chunks), stream directly
      res.status(response.status);
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      } else if (targetUrl.includes(".ts")) {
        res.setHeader("Content-Type", "video/mp2t");
      } else {
        res.setHeader("Content-Type", "video/mp4");
      }

      const cl = response.headers.get("content-length");
      if (cl) res.setHeader("Content-Length", cl);

      const cr = response.headers.get("content-range");
      if (cr) res.setHeader("Content-Range", cr);

      if (response.body) {
        const { Readable } = await import("node:stream");
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      console.warn(`[Stream Proxy Error] for ${targetUrl}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({
          error: "Stream proxy failed",
          message: err.message,
          url: targetUrl,
        });
      }
    }
  });

  // API: Stremio Add-on Server-Side Proxy
  // Bypasses browser CORS restrictions, Cloudflare preflight 405s, and rate limits
  app.get("/api/stremio-proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter" });
    }

    try {
      // Validate that it's an HTTP/HTTPS URL
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return res.status(400).json({ error: "Invalid protocol" });
      }

      const headers: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Stremio/4.4.168",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      };

      // Timeout set to 25s for slow scrapers like ToastFlix, with fallback handling
      const isToastflix = targetUrl.includes("toastflix");
      const timeoutMs = isToastflix ? 25000 : 15000;

      const response = await fetch(targetUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });

      // Forward status and CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      const contentType = response.headers.get("content-type") || "application/json";
      res.setHeader("Content-Type", contentType);

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Upstream returned status ${response.status}`,
          url: targetUrl,
        });
      }

      const data = await response.text();
      res.send(data);
    } catch (err: any) {
      const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout") || err.name === "AbortError";
      if (isTimeout) {
        console.warn(`[Proxy Timeout] for ${targetUrl} (Upstream took > 25s): Returning empty streams`);
        // If an add-on times out on /stream/ queries, return empty streams array with 200 OK so client doesn't crash or trigger 502 error
        if (targetUrl.includes("/stream/")) {
          return res.status(200).json({ streams: [] });
        }
      } else {
        console.warn(`[Proxy Error] for ${targetUrl}:`, err.message);
      }

      if (!res.headersSent) {
        res.status(504).json({
          error: "Failed to fetch from addon upstream",
          message: err.message,
          url: targetUrl,
        });
      }
    }
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Liquid Stremio] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
