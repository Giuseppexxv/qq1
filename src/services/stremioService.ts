import {
  InstalledAddon,
  StremioManifest,
  StremioMetaPreview,
  StremioMetaDetail,
  StremioStream,
  StremioSubtitle,
} from '../types/stremio';
import { optimizeImageUrl } from '../utils/imageOptimizer';

const ADDONS_STORAGE_KEY = 'liquid_stremio_addons_v5';
const HISTORY_STORAGE_KEY = 'liquid_stremio_history_v1';
const LIBRARY_STORAGE_KEY = 'liquid_stremio_library_v1';
const CATALOG_CACHE_KEY = 'liquid_stremio_catalog_cache_v6';

export const DEFAULT_ADDONS: InstalledAddon[] = [
  {
    id: 'topstreaming.italy',
    name: 'TOP Streaming 🇮🇹',
    version: '4.2.2',
    description: 'Classifiche Top 10 ufficiali Italia da Netflix, Prime Video, Disney+, Apple TV+, NOW, Paramount+ e globali.',
    transportUrl: '/api/addon/topstreaming',
    enabled: true,
    isOfficial: true,
    icon: 'https://top-streaming.stream/logo.png',
    manifest: {
      id: 'topstreaming.italy',
      name: 'TOP Streaming 🇮🇹',
      version: '4.2.2',
      description: 'Classifiche Top 10 ufficiali Italia: Netflix, Prime Video, Disney+, Apple TV+, NOW, Paramount+ e globali.',
      types: ['movie', 'series'],
      resources: ['catalog', 'meta'],
      catalogs: [
        { type: 'movie', id: 'popular-movie-global', name: 'Popolare - Top 10' },
        { type: 'series', id: 'popular-series-global', name: 'Popolare - Top 10' },
        { type: 'movie', id: 'netflix-movies-italy', name: 'Netflix - Top 10' },
        { type: 'series', id: 'netflix-series-italy', name: 'Netflix - Top 10' },
        { type: 'movie', id: 'amazon-prime-movies-italy', name: 'Amazon Prime Video - Top 10' },
        { type: 'series', id: 'amazon-prime-series-italy', name: 'Amazon Prime Video - Top 10' },
        { type: 'movie', id: 'disney-movies-italy', name: 'Disney+ - Top 10' },
        { type: 'series', id: 'disney-series-italy', name: 'Disney+ - Top 10' },
        { type: 'movie', id: 'apple-tv-movies-italy', name: 'Apple TV - Top 10' },
        { type: 'series', id: 'apple-tv-series-italy', name: 'Apple TV - Top 10' },
        { type: 'movie', id: 'now-movies-italy', name: 'NOW - Top 10' },
        { type: 'series', id: 'now-series-italy', name: 'NOW - Top 10' },
        { type: 'movie', id: 'paramount-plus-movies-italy', name: 'Paramount+ - Top 10' },
        { type: 'series', id: 'paramount-plus-series-italy', name: 'Paramount+ - Top 10' },
        { type: 'movie', id: 'hbo-max-movies-italy', name: 'HBO Max - Top 10' },
        { type: 'series', id: 'hbo-max-series-italy', name: 'HBO Max - Top 10' },
      ],
      idPrefixes: ['tt', 'tmdb:', 'mal:'],
    },
  },
  {
    id: 'official.catalog',
    name: 'Cinemeta (Ufficiale)',
    version: '3.0.14',
    description: 'Catalogo mondiale ufficiale Stremio (Cinemeta) per film, serie TV e generi.',
    transportUrl: '/api/addon/catalog',
    enabled: true,
    isOfficial: true,
    manifest: {
      id: 'official.catalog',
      name: 'Cinemeta (Ufficiale)',
      version: '3.0.14',
      description: 'Catalogo mondiale ufficiale Stremio (Cinemeta) per film, serie TV e generi.',
      types: ['movie', 'series'],
      resources: [
        'catalog',
        { name: 'meta', types: ['movie', 'series'], idPrefixes: ['tt'] },
      ],
      catalogs: [
        { type: 'movie', id: 'top', name: 'Film Popolari' },
        { type: 'series', id: 'top', name: 'Serie TV Popolari' },
        { type: 'movie', id: 'imdbRating', name: 'Film in Evidenza' },
        { type: 'series', id: 'imdbRating', name: 'Serie TV in Evidenza' },
        { type: 'movie', id: 'year', name: 'Nuove Uscite' },
        { type: 'series', id: 'year', name: 'Nuove Uscite' },
      ],
      idPrefixes: ['tt'],
    },
  },
  {
    id: 'official.stream',
    name: 'Flussi Video Ufficiali',
    version: '3.0.0',
    description: 'Flussi video streaming in lingua italiana ad alta definizione.',
    transportUrl: '/api/addon/stream',
    enabled: true,
    isOfficial: true,
    manifest: {
      id: 'official.stream',
      name: 'Flussi Video Ufficiali',
      version: '3.0.0',
      description: 'Flussi video streaming in lingua italiana',
      types: ['movie', 'series'],
      resources: ['stream'],
      catalogs: [],
      idPrefixes: ['tt', 'kitsu', 'tmdb'],
    },
  },
  {
    id: 'org.stremio.opensubtitles',
    name: 'OpenSubtitles v3',
    version: '3.0.0',
    description: 'Sottotitoli multilingua ufficiali da OpenSubtitles.org.',
    transportUrl: 'https://opensubtitles-v3.strem.io',
    enabled: true,
    isOfficial: true,
    manifest: {
      id: 'org.stremio.opensubtitles',
      name: 'OpenSubtitles v3',
      version: '3.0.0',
      description: 'Sottotitoli per film e serie TV',
      types: ['movie', 'series'],
      resources: ['subtitles'],
      catalogs: [],
    },
  },
];

// Popular Community Add-ons for 1-Click Install
export const POPULAR_COMMUNITY_ADDONS = [
  {
    id: 'org.stremio.anime-kitsu',
    name: 'Anime Kitsu',
    description: 'Scopri anime di tendenza, serie animate e film powered by Kitsu.io.',
    manifestUrl: 'https://anime-kitsu.strem.fun/manifest.json',
    types: ['series', 'movie'],
  },
  {
    id: 'com.stremio.youtube',
    name: 'YouTube Channels',
    description: 'Guarda feed di canali pubblici YouTube e video di tendenza.',
    manifestUrl: 'https://youtube.strem.io/manifest.json',
    types: ['other', 'channel'],
  },
];

class StremioService {
  private addons: InstalledAddon[] = [];

  // High-performance caches
  private catalogCache = new Map<string, { data: StremioMetaPreview[]; expires: number }>();
  private metaCache = new Map<string, { data: StremioMetaDetail; expires: number }>();
  private streamCache = new Map<string, { data: StremioStream[]; expires: number }>();

  constructor() {
    this.loadAddons();
    this.loadPersistentCatalogCache();
  }

  private loadPersistentCatalogCache() {
    try {
      const stored = localStorage.getItem(CATALOG_CACHE_KEY);
      if (stored) {
        const parsed: Record<string, { data: StremioMetaPreview[]; expires: number }> = JSON.parse(stored);
        const now = Date.now();
        for (const [key, val] of Object.entries(parsed)) {
          if (val.expires > now) {
            this.catalogCache.set(key, val);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load persistent catalog cache', e);
    }
  }

  private savePersistentCatalogCache() {
    try {
      const obj: Record<string, { data: StremioMetaPreview[]; expires: number }> = {};
      const now = Date.now();
      this.catalogCache.forEach((val, key) => {
        if (val.expires > now) {
          obj[key] = val;
        }
      });
      localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }

  public getCachedCatalog(
    addonId: string,
    type: string,
    catalogId: string,
    genre?: string
  ): StremioMetaPreview[] | null {
    const cacheKey = `${addonId}_${type}_${catalogId}__${genre || ''}_0`;
    const cached = this.catalogCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private loadAddons() {
    try {
      const stored = localStorage.getItem(ADDONS_STORAGE_KEY);
      if (stored) {
        const parsed: InstalledAddon[] = JSON.parse(stored);
        // Exclude removed legacy addons
        const filtered = parsed.filter(
          (a) =>
            a.id !== 'community.cinemeta' &&
            a.id !== 'toastflix.addon.it' &&
            a.id !== 'com.linvo.watchhub'
        );

        // Ensure TOP Streaming Italia is present and configured
        const topStreamingDef = DEFAULT_ADDONS.find((a) => a.id === 'topstreaming.italy')!;
        const hasTopStreaming = filtered.some((a) => a.id === 'topstreaming.italy');
        if (!hasTopStreaming) {
          filtered.unshift(topStreamingDef);
        } else {
          const idx = filtered.findIndex((a) => a.id === 'topstreaming.italy');
          filtered[idx] = {
            ...topStreamingDef,
            enabled: true,
          };
        }

        // Ensure Cinemeta catalog is present and configured
        const cinemetaDef = DEFAULT_ADDONS.find((a) => a.id === 'official.catalog')!;
        const hasOfficial = filtered.some((a) => a.id === 'official.catalog');
        if (!hasOfficial) {
          filtered.splice(1, 0, cinemetaDef);
        } else {
          const idx = filtered.findIndex((a) => a.id === 'official.catalog');
          filtered[idx] = {
            ...cinemetaDef,
            enabled: true,
          };
        }

        // Ensure official stream addon is present and configured
        const streamAddonDef = DEFAULT_ADDONS.find((a) => a.id === 'official.stream')!;
        const hasOfficialStream = filtered.some((a) => a.id === 'official.stream');
        if (!hasOfficialStream) {
          filtered.push(streamAddonDef);
        } else {
          const idx = filtered.findIndex((a) => a.id === 'official.stream');
          filtered[idx] = {
            ...streamAddonDef,
            enabled: true,
          };
        }

        this.addons = filtered;
        this.saveAddons();
      } else {
        this.addons = DEFAULT_ADDONS;
        this.saveAddons();
      }
    } catch (e) {
      console.warn('Failed to load addons from localStorage, using defaults', e);
      this.addons = DEFAULT_ADDONS;
    }
  }

  private saveAddons() {
    try {
      localStorage.setItem(ADDONS_STORAGE_KEY, JSON.stringify(this.addons));
    } catch (e) {
      console.warn('Failed to save addons to localStorage', e);
    }
  }

  public getInstalledAddons(): InstalledAddon[] {
    return [...this.addons];
  }

  public async addAddonByUrl(rawUrl: string): Promise<InstalledAddon> {
    let normalized = rawUrl.trim();
    if (normalized.startsWith('stremio://')) {
      normalized = normalized.replace('stremio://', 'https://');
    }
    if (!normalized.endsWith('/manifest.json')) {
      normalized = normalized.replace(/\/$/, '') + '/manifest.json';
    }

    const transportUrl = normalized.replace(/\/manifest\.json$/, '');

    let manifest: StremioManifest;
    try {
      const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(normalized)}`;
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`Proxy responded with ${resp.status}`);
      manifest = await resp.json();
    } catch (err: any) {
      try {
        const resp = await fetch(normalized, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) throw new Error(`Direct fetch responded with ${resp.status}`);
        manifest = await resp.json();
      } catch {
        throw new Error(`Unable to fetch manifest: ${err.message || 'Network/CORS error'}`);
      }
    }

    if (!manifest.id || !manifest.name || !manifest.resources) {
      throw new Error('Invalid Stremio manifest format: missing required fields (id, name, resources)');
    }

    const newAddon: InstalledAddon = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version || '1.0.0',
      description: manifest.description || 'Custom Stremio Add-on',
      transportUrl,
      manifest,
      enabled: true,
      isOfficial: false,
      icon: manifest.logo || manifest.icon,
    };

    this.addons = this.addons.filter((a) => a.id !== newAddon.id);
    this.addons.push(newAddon);
    this.saveAddons();
    return newAddon;
  }

  public toggleAddon(id: string, enabled: boolean) {
    this.addons = this.addons.map((a) => (a.id === id ? { ...a, enabled } : a));
    this.saveAddons();
  }

  public removeAddon(id: string) {
    this.addons = this.addons.filter((a) => a.id !== id);
    this.saveAddons();
  }

  public resetToDefaults() {
    this.addons = DEFAULT_ADDONS;
    this.saveAddons();
  }

  // Fetch Catalog items with in-memory caching
  public async fetchCatalog(
    addonId: string,
    type: string,
    catalogId: string,
    extra?: { search?: string; genre?: string; skip?: number }
  ): Promise<StremioMetaPreview[]> {
    const cacheKey = `${addonId}_${type}_${catalogId}_${extra?.search || ''}_${extra?.genre || ''}_${extra?.skip || 0}`;
    const cached = this.catalogCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expires > now) {
      return cached.data;
    }

    const addon = this.addons.find((a) => a.id === addonId && a.enabled) || DEFAULT_ADDONS[0];
    if (!addon) return [];

    let url = `${addon.transportUrl}/catalog/${type}/${catalogId}`;
    if (extra?.search) {
      url += `/search=${encodeURIComponent(extra.search)}`;
    } else if (extra?.genre) {
      url += `/genre=${encodeURIComponent(extra.genre)}`;
    }
    url += '.json';

    try {
      let resp: Response | null = null;
      if (url.startsWith('/api/') || url.startsWith('http://localhost') || (typeof window !== 'undefined' && url.startsWith(window.location.origin))) {
        resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      } else {
        try {
          const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(url)}`;
          resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
        } catch {
          resp = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
        }
      }

      if (!resp || !resp.ok) return [];
      const data = await resp.json();
      const rawMetas = Array.isArray(data.metas) ? data.metas : [];
      const seen = new Set<string>();
      const results: StremioMetaPreview[] = [];
      for (const m of rawMetas) {
        if (!m) continue;
        const metaId = m.id || m.imdb_id;
        if (!metaId) continue;
        if (!seen.has(metaId)) {
          seen.add(metaId);

          // Extract genres: m.genres, m.genre or from m.links
          let genres: string[] = [];
          if (Array.isArray(m.genres) && m.genres.length > 0) {
            genres = m.genres;
          } else if (Array.isArray(m.genre) && m.genre.length > 0) {
            genres = m.genre;
          } else if (typeof m.genre === 'string' && m.genre.trim()) {
            genres = [m.genre.trim()];
          } else if (Array.isArray(m.links)) {
            genres = m.links
              .filter((l: any) => l && (l.category === 'Genres' || l.category === 'genre'))
              .map((l: any) => l.name)
              .filter(Boolean);
          }

          // Extract rating: m.imdbRating, m.rating, or from m.links
          let rating = m.imdbRating || (m as any).rating;
          if ((!rating || rating === 'N/A' || rating === '') && Array.isArray(m.links)) {
            const imdbLink = m.links.find(
              (l: any) =>
                l &&
                l.category === 'imdb' &&
                l.name &&
                l.name !== 'IMDb' &&
                !isNaN(parseFloat(l.name))
            );
            if (imdbLink) {
              rating = imdbLink.name;
            }
          }

          // Extract releaseInfo: m.releaseInfo, m.year, or m.released
          const releaseInfo =
            m.releaseInfo || (m as any).year || (m as any).released?.slice(0, 4);

          results.push({
            ...m,
            id: metaId,
            type: m.type || type,
            poster: optimizeImageUrl(m.poster, 'poster'),
            background: optimizeImageUrl(m.background, 'background'),
            logo: optimizeImageUrl(m.logo, 'logo'),
            genres,
            releaseInfo: releaseInfo ? String(releaseInfo) : undefined,
            imdbRating:
              rating && rating !== 'N/A' && rating !== '' && rating !== '0'
                ? rating
                : undefined,
          });
        }
      }

      this.catalogCache.set(cacheKey, { data: results, expires: now + 30 * 60 * 1000 });
      this.savePersistentCatalogCache();
      return results;
    } catch (err) {
      console.warn(`[StremioService] Catalog fetch failed for ${url}`, err);
      return [];
    }
  }

  // Fetch detailed meta for a movie or series with caching
  public async fetchMeta(type: string, id: string): Promise<StremioMetaDetail | null> {
    const cacheKey = `${type}_${id}`;
    const cached = this.metaCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expires > now) {
      return cached.data;
    }

    const metaAddons = this.addons.filter(
      (a) =>
        a.enabled &&
        a.manifest.resources.some((r) =>
          typeof r === 'string' ? r === 'meta' : r.name === 'meta'
        )
    );

    if (metaAddons.length === 0) {
      metaAddons.push(DEFAULT_ADDONS[0]);
    }

    for (const addon of metaAddons) {
      try {
        const url = `${addon.transportUrl}/meta/${type}/${id}.json`;
        let resp: Response | null = null;
        if (url.startsWith('/api/') || (typeof window !== 'undefined' && url.startsWith(window.location.origin))) {
          resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
        } else {
          try {
            const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(url)}`;
            resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
          } catch {
            resp = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
          }
        }

        if (resp && resp.ok) {
          const data = await resp.json();
          if (data.meta) {
            const meta = data.meta;
            if (!meta.genres && meta.genre) {
              meta.genres = Array.isArray(meta.genre) ? meta.genre : [meta.genre];
            }
            if (!meta.genres && Array.isArray(meta.links)) {
              meta.genres = meta.links
                .filter((l: any) => l && (l.category === 'Genres' || l.category === 'genre'))
                .map((l: any) => l.name)
                .filter(Boolean);
            }
            meta.poster = optimizeImageUrl(meta.poster, 'poster');
            meta.background = optimizeImageUrl(meta.background, 'background');
            meta.logo = optimizeImageUrl(meta.logo, 'logo');
            this.metaCache.set(cacheKey, { data: meta, expires: now + 60 * 60 * 1000 });
            return meta;
          }
        }
      } catch (e) {
        console.warn(`[StremioService] Meta fetch failed from ${addon.name}`, e);
      }
    }

    return null;
  }

  // Progressive and concurrent stream fetching
  public async fetchStreamsProgressive(
    type: string,
    id: string,
    onBatch?: (newStreams: StremioStream[], addonName: string) => void
  ): Promise<StremioStream[]> {
    const cacheKey = `${type}_${id}`;
    const cached = this.streamCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expires > now && cached.data.length > 0) {
      if (onBatch) onBatch(cached.data, 'Cached Streams');
      return cached.data;
    }

    const allStreams: StremioStream[] = [];

    // Query all active addons that declare 'stream' resource
    const streamAddons = this.addons.filter(
      (a) =>
        a.enabled &&
        a.manifest.resources.some((r) =>
          typeof r === 'string' ? r === 'stream' : r.name === 'stream'
        )
    );

    const promises = streamAddons.map(async (addon) => {
      try {
        const url = `${addon.transportUrl}/stream/${type}/${id}.json`;
        let resp: Response | null = null;
        if (url.startsWith('/api/') || (typeof window !== 'undefined' && url.startsWith(window.location.origin))) {
          resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
        } else {
          try {
            const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(url)}`;
            resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
          } catch {
            resp = await fetch(url, { signal: AbortSignal.timeout(7000) }).catch(() => null);
          }
        }

        if (resp && resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.streams) && data.streams.length > 0) {
            const formattedStreams: StremioStream[] = data.streams.map((s: any) => ({
              ...s,
              name: s.name ? `${addon.name} - ${s.name}` : addon.name,
            }));
            allStreams.push(...formattedStreams);
            if (onBatch) {
              onBatch(formattedStreams, addon.name);
            }
            return formattedStreams;
          }
        }
      } catch (err) {
        // Silently skip addons without streams
      }
      return [];
    });

    await Promise.allSettled(promises);

    const getStreamScore = (s: StremioStream): number => {
      const name = (s.name || '').toLowerCase();
      const title = (s.title || '').toLowerCase();
      const hasUrl = !!s.url && s.url.trim().length > 0;
      const isIta = title.includes('ita') || name.includes('ita') || title.includes('italiano');
      const isHD = title.includes('1080p') || title.includes('4k') || title.includes('2160p') || name.includes('1080p');

      let score = 0;
      if (hasUrl) score += 1000;
      if (isIta) score += 500;
      if (isHD) score += 200;
      return score;
    };

    allStreams.sort((a, b) => getStreamScore(b) - getStreamScore(a));

    if (allStreams.length > 0) {
      this.streamCache.set(cacheKey, { data: allStreams, expires: now + 30 * 60 * 1000 });
    }

    return allStreams;
  }

  // Preload stream in background to ensure zero-wait instant playback
  public preloadStream(type: string, id: string): void {
    const cacheKey = `${type}_${id}`;
    const cached = this.streamCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return;
    this.fetchStreams(type, id).catch(() => {});
  }

  public async fetchStreams(type: string, id: string): Promise<StremioStream[]> {
    return this.fetchStreamsProgressive(type, id);
  }

  // Secondary stream fallback from StreamViX addon
  public async fetchSecondaryStreams(type: string, id: string): Promise<StremioStream[]> {
    const secondaryBase =
      'https://streamvix.hayd.uk/eyJkaXNhYmxlVml4c3JjIjp0cnVlLCJjYjAxRW5hYmxlZCI6ZmFsc2UsImd1YXJkYWhkRW5hYmxlZCI6dHJ1ZSwiZ3VhcmRhc2VyaWVFbmFibGVkIjpmYWxzZSwiZ3VhcmRvc2VyaWVFbmFibGVkIjp0cnVlLCJndWFyZGFmbGl4RW5hYmxlZCI6dHJ1ZSwiZGlzYWJsZUxpdmVUdiI6dHJ1ZSwiYW5pbWV1bml0eUVuYWJsZWQiOmZhbHNlLCJhbmltZXNhdHVybkVuYWJsZWQiOmZhbHNlLCJhbmltZXdvcmxkRW5hYmxlZCI6ZmFsc2UsImV1cm9zdHJlYW1pbmdFbmFibGVkIjpmYWxzZSwidG9vbml0YWxpYUVuYWJsZWQiOmZhbHNlLCJ0b29uRW5hYmxlZCI6ZmFsc2UsInZhdm9vTm9NZnBFbmFibGVkIjpmYWxzZSwibWVkaWFmbG93TWFzdGVyIjpmYWxzZSwidHJhaWxlckVuYWJsZWQiOmZhbHNlLCJmYXN0TW9kZSI6dHJ1ZX0=';
    const targetUrl = `${secondaryBase}/stream/${type}/${id}.json`;
    const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(targetUrl)}`;

    try {
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.streams) && data.streams.length > 0) {
          return data.streams.map((s: any) => ({
            ...s,
            name: s.name ? `StreamViX - ${s.name}` : 'StreamViX HD',
          }));
        }
      }
    } catch {
      // Direct fetch fallback if proxy has issues
      try {
        const directResp = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
        if (directResp.ok) {
          const data = await directResp.json();
          if (Array.isArray(data.streams)) {
            return data.streams.map((s: any) => ({
              ...s,
              name: s.name ? `StreamViX - ${s.name}` : 'StreamViX HD',
            }));
          }
        }
      } catch {
        // Silently skip
      }
    }
    return [];
  }

  public async fetchSubtitles(type: string, id: string): Promise<StremioSubtitle[]> {
    const subAddons = this.addons.filter(
      (a) =>
        a.enabled &&
        a.manifest.resources.some((r) =>
          typeof r === 'string' ? r === 'subtitles' : r.name === 'subtitles'
        )
    );

    const subs: StremioSubtitle[] = [];
    for (const addon of subAddons) {
      try {
        const url = `${addon.transportUrl}/subtitles/${type}/${id}.json`;
        let resp: Response | null = null;
        if (url.startsWith('/api/') || (typeof window !== 'undefined' && url.startsWith(window.location.origin))) {
          resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
        } else {
          try {
            const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(url)}`;
            resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
          } catch {
            resp = await fetch(url, { signal: AbortSignal.timeout(6000) }).catch(() => null);
          }
        }
        if (resp && resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.subtitles)) {
            subs.push(...data.subtitles);
          }
        }
      } catch (err) {
        // Skip
      }
    }
    return subs;
  }

  // Watch History & Library Management
  public getHistory(): any[] {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveHistoryItem(item: any) {
    try {
      const history = this.getHistory().filter((h: any) => h.id !== item.id);
      history.unshift({ ...item, lastWatched: Date.now() });
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 30)));
    } catch (e) {
      console.warn(e);
    }
  }

  public getLibrary(): StremioMetaPreview[] {
    try {
      const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public toggleLibraryItem(item: StremioMetaPreview): boolean {
    try {
      const lib = this.getLibrary();
      const exists = lib.some((x) => x.id === item.id);
      let updated: StremioMetaPreview[];
      if (exists) {
        updated = lib.filter((x) => x.id !== item.id);
      } else {
        updated = [item, ...lib];
      }
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(updated));
      return !exists;
    } catch {
      return false;
    }
  }

  public isInLibrary(id: string): boolean {
    return this.getLibrary().some((x) => x.id === id);
  }
}

export const stremioService = new StremioService();
