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
      if (targetUrl.includes("/video/") || targetUrl.includes("/audio/") || targetUrl.includes(".ts")) {
        res.setHeader("Content-Type", "video/mp2t");
      } else if (contentType) {
        res.setHeader("Content-Type", contentType);
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

  // Dedicated hidden official catalog route with high-performance in-memory cache
  const INTERNAL_CATALOG_BASE = "https://easycatalogs.realbestia.com/ad49acf3-15c8-4151-94f3-0630eeba1dce";
  const catalogMemoryCache = new Map<string, { body: string; contentType: string; expires: number }>();

  app.use("/api/addon/catalog", async (req, res) => {
    try {
      const subPath = req.url; // e.g. /manifest.json, /catalog/..., /meta/...
      const cacheKey = `cat_${subPath}`;
      const cached = catalogMemoryCache.get(cacheKey);
      const now = Date.now();

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Content-Type", "application/json");

      if (cached && cached.expires > now) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Cache-Control", "public, max-age=1800");
        return res.send(cached.body);
      }

      const targetUrl = `${INTERNAL_CATALOG_BASE}${subPath}`;
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        signal: AbortSignal.timeout(18000),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch from catalog" });
      }

      if (subPath === "/manifest.json" || subPath.startsWith("/manifest.json")) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          json.id = "official.catalog";
          json.name = "Catalogo Cinema & Serie TV";
          json.description = "Catalogo ufficiale con schede informative e trame in lingua italiana.";
          const modifiedText = JSON.stringify(json);
          catalogMemoryCache.set(cacheKey, {
            body: modifiedText,
            contentType: "application/json",
            expires: now + 24 * 60 * 60 * 1000,
          });
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.send(modifiedText);
        } catch {
          return res.send(text);
        }
      }

      const data = await response.text();
      // Cache meta and catalog responses
      const ttl = subPath.includes("/meta/") ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
      catalogMemoryCache.set(cacheKey, {
        body: data,
        contentType: "application/json",
        expires: now + ttl,
      });

      res.setHeader("Cache-Control", "public, max-age=1800");
      res.send(data);
    } catch (err: any) {
      console.warn(`[Catalog Proxy Error] for ${req.url}:`, err.message);
      res.status(502).json({ error: "Catalog fetch failed", message: err.message });
    }
  });

  // Dedicated hidden official stream addon route with in-memory caching
  const INTERNAL_STREAM_BASE = "https://toastflix.stremio-italia.eu/eyJhaW9zdHJlYW1zTW9kZSI6dHJ1ZX0";
  const streamMemoryCache = new Map<string, { body: string; expires: number }>();

  // Server-Side direct extractor for Vixsrc (StreamingCommunity) HD Italian streams
  // Bypasses the need for Stremio Desktop local proxy (127.0.0.1:11470)
  async function resolveVixsrcStream(type: string, id: string): Promise<any | null> {
    try {
      let apiPath = "";
      if (type === "series") {
        const parts = id.split(":");
        const imdbId = parts[0];
        const season = parts[1] || "1";
        const episode = parts[2] || "1";
        apiPath = `/api/tv/${imdbId}/${season}/${episode}?lang=it`;
      } else {
        const imdbId = id.split(":")[0];
        apiPath = `/api/movie/${imdbId}?lang=it`;
      }

      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://vixsrc.to/",
        Origin: "https://vixsrc.to",
      };

      const r1 = await fetch(`https://vixsrc.to${apiPath}`, {
        headers,
        signal: AbortSignal.timeout(9000),
      });
      if (!r1.ok) return null;
      const data = await r1.json();
      if (!data.src) return null;

      const r2 = await fetch(`https://vixsrc.to${data.src}`, {
        headers,
        signal: AbortSignal.timeout(9000),
      });
      if (!r2.ok) return null;
      const html = await r2.text();

      let tokenV: string | null = null;
      let expiresV: string | null = null;
      let urlV: string | null = null;

      const mp = html.match(
        /window\.masterPlaylist\s*=\s*\{[\s\S]*?params\s*:\s*\{([\s\S]*?)\}\s*,\s*url\s*:\s*['"]([^'"]+)['"]/
      );
      if (mp) {
        const params = mp[1];
        urlV = mp[2].replace(/\\/g, "");
        const tM = params.match(/['"]token['"]\s*:\s*['"]([^'"]+)['"]/);
        const eM = params.match(/['"]expires['"]\s*:\s*['"]([^'"]+)['"]/);
        if (tM) tokenV = tM[1];
        if (eM) expiresV = eM[1];
      }

      if (!tokenV) {
        const t = html.match(/'token'\s*:\s*'([^']+)'/) || html.match(/"token"\s*:\s*"([^"]+)"/);
        if (t) tokenV = t[1];
      }
      if (!expiresV) {
        const e = html.match(/'expires'\s*:\s*'([^']+)'/) || html.match(/"expires"\s*:\s*"([^"]+)"/);
        if (e) expiresV = e[1];
      }
      if (!urlV) {
        const u = html.match(/url\s*:\s*'([^']+)'/) || html.match(/url\s*:\s*"([^"]+)"/);
        if (u) urlV = u[1].replace(/\\/g, "");
      }

      const canPlayFHD = /window\.canPlayFHD\s*=\s*true/.test(html);

      if (!urlV || !tokenV || !expiresV) {
        return null;
      }

      let playlistUrl = urlV.includes("?")
        ? `${urlV}&token=${tokenV}&expires=${expiresV}${canPlayFHD ? "&h=1" : ""}`
        : `${urlV}?token=${tokenV}&expires=${expiresV}${canPlayFHD ? "&h=1" : ""}`;
      playlistUrl = playlistUrl.replace("?", ".m3u8?");

      return {
        name: "ToastFlix HD 1080p",
        title: "🎬 Streaming HD 1080p • Audio Italiano 🇮🇹",
        url: playlistUrl,
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: {
            request: {
              "User-Agent": headers["User-Agent"],
              Accept: "*/*",
              "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
              Referer: "https://vixsrc.to/",
              Origin: "https://vixsrc.to",
            },
          },
        },
      };
    } catch (err: any) {
      console.warn(`[Vixsrc Resolver Error] for ${type}/${id}:`, err.message);
      return null;
    }
  }

  app.use("/api/addon/stream", async (req, res) => {
    try {
      let subPath = req.url;
      if (!subPath.startsWith("/")) subPath = `/${subPath}`;

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Content-Type", "application/json");

      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }

      if (subPath === "/manifest.json" || subPath.startsWith("/manifest.json")) {
        return res.json({
          id: "official.stream",
          version: "3.0.0",
          name: "Flussi Video Ufficiali",
          description: "Flussi di riproduzione video in lingua italiana",
          types: ["movie", "series"],
          catalogs: [],
          resources: ["stream"],
          idPrefixes: ["tt", "kitsu", "tmdb"]
        });
      }

      const cacheKey = `str_${subPath}`;
      const cached = streamMemoryCache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expires > now) {
        res.setHeader("X-Cache", "HIT");
        return res.send(cached.body);
      }

      const streamMatch = subPath.match(/^\/stream\/([^/]+)\/([^.]+)\.json$/);
      let targetType = "";
      let targetId = "";
      if (streamMatch) {
        targetType = streamMatch[1];
        targetId = streamMatch[2];
      }

      const targetUrl = `${INTERNAL_STREAM_BASE}${subPath}`;

      // Start Vixsrc resolution immediately
      const vixsrcPromise = targetType && targetId ? resolveVixsrcStream(targetType, targetId) : Promise.resolve(null);

      // Fetch upstream ToastFlix with a fast 2500ms timeout
      const upstreamPromise = fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        signal: AbortSignal.timeout(2500),
      }).catch(() => null);

      // Race/settle: If Vixsrc resolves quickly, or when both settle
      const [vixsrcResult, upstreamResult] = await Promise.allSettled([
        vixsrcPromise,
        upstreamPromise,
      ]);

      const streams: any[] = [];

      // 1. If direct Vixsrc stream resolved, place it as primary high-priority stream
      if (vixsrcResult.status === "fulfilled" && vixsrcResult.value) {
        streams.push(vixsrcResult.value);
      }

      // 2. Parse upstream ToastFlix streams if available
      if (upstreamResult.status === "fulfilled" && upstreamResult.value && upstreamResult.value.ok) {
        try {
          const upstreamData = await upstreamResult.value.json();
          if (Array.isArray(upstreamData.streams)) {
            for (const s of upstreamData.streams) {
              if (s.url && s.url.length > 0) {
                streams.push(s);
              } else if (s.externalUrl && !s.externalUrl.includes("/extractor/css")) {
                streams.push(s);
              }
            }
          }
        } catch {
          // ignore json parse error
        }
      }

      const responsePayload = JSON.stringify({ streams });

      if (streams.length > 0) {
        streamMemoryCache.set(cacheKey, {
          body: responsePayload,
          expires: now + 30 * 60 * 1000,
        });
      }

      res.send(responsePayload);
    } catch (err: any) {
      console.warn(`[Stream Proxy Error] for ${req.url}:`, err.message);
      res.json({ streams: [] });
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

      const response = await fetch(targetUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(20000),
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
    console.log(`[IStream] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
