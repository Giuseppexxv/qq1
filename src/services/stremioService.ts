import {
  InstalledAddon,
  StremioManifest,
  StremioMetaPreview,
  StremioMetaDetail,
  StremioStream,
  StremioSubtitle,
} from '../types/stremio';
import { OPEN_MEDIA_CATALOG } from '../data/openMediaCatalog';

const ADDONS_STORAGE_KEY = 'liquid_stremio_addons_v2';
const HISTORY_STORAGE_KEY = 'liquid_stremio_history_v1';
const LIBRARY_STORAGE_KEY = 'liquid_stremio_library_v1';

export const DEFAULT_ADDONS: InstalledAddon[] = [
  {
    id: 'community.cinemeta',
    name: 'Cinemeta (Official)',
    version: '3.0.12',
    description: 'Official IMDb/TheMovieDb metadata aggregator for movies and TV series catalog & search.',
    transportUrl: 'https://v3-cinemeta.strem.io',
    enabled: true,
    isOfficial: true,
    icon: 'https://v3-cinemeta.strem.io/favicon.ico',
    manifest: {
      id: 'community.cinemeta',
      name: 'Cinemeta',
      version: '3.0.12',
      description: 'Official IMDb and TV metadata catalog for Stremio',
      types: ['movie', 'series'],
      resources: ['catalog', 'meta'],
      catalogs: [
        { type: 'movie', id: 'top', name: 'Popular Movies' },
        { type: 'series', id: 'top', name: 'Popular TV Series' },
        { type: 'movie', id: 'year', name: 'New Releases' },
        { type: 'series', id: 'year', name: 'New Series' },
        { type: 'movie', id: 'imdbRating', name: 'Top Rated Movies' },
        { type: 'series', id: 'imdbRating', name: 'Top Rated Series' },
      ],
    },
  },
  {
    id: 'toastflix.addon.it',
    name: '🥪 ToastFlix (Direct ITA)',
    version: '3.0.0',
    description: 'Streaming diretto in Italiano e Dual Audio (Direct / Nuvio / No Torrent) da toastflix.stremio-italia.eu',
    transportUrl: 'https://toastflix.stremio-italia.eu/eyJzb2xvRGlyZWN0Ijp0cnVlLCJkaXJlY3REdWFsIjp0cnVlLCJudXZpb0ZyaWVuZGx5Ijp0cnVlfQ',
    enabled: true,
    isOfficial: false,
    icon: 'https://toastflix.stremio-italia.eu/toast-stream-logo.png',
    manifest: {
      id: 'toastflix.addon.it',
      name: '🥪ToastFlix🥪 4 🄺 + 🎯 + 🎯 + 🐌',
      version: '3.0.0',
      description: 'Streaming in Italiano (Direct Streams)',
      logo: 'https://toastflix.stremio-italia.eu/toast-stream-logo.png',
      types: ['movie', 'series'],
      resources: ['stream'],
      catalogs: [],
      idPrefixes: ['tt', 'kitsu'],
      behaviorHints: { configurable: true },
    },
  },
  {
    id: 'org.liquid.openwebtorrent',
    name: 'Open Cinema WebTorrent',
    version: '1.2.0',
    description: 'Built-in open torrent engine providing 4K/1080p Creative Commons & Public Domain media with WebRTC seeds.',
    transportUrl: 'local://openwebtorrent',
    enabled: true,
    isOfficial: true,
    manifest: {
      id: 'org.liquid.openwebtorrent',
      name: 'Open Cinema WebTorrent',
      version: '1.2.0',
      description: 'Open source media swarms with WebTorrent P2P streaming',
      types: ['movie'],
      resources: ['catalog', 'meta', 'stream'],
      catalogs: [
        { type: 'movie', id: 'open_swarms', name: 'WebTorrent P2P Classics' },
      ],
    },
  },
  {
    id: 'org.stremio.opensubtitles',
    name: 'OpenSubtitles v3',
    version: '3.0.0',
    description: 'Official multilingual subtitles provider directly from OpenSubtitles.org.',
    transportUrl: 'https://opensubtitles-v3.strem.io',
    enabled: true,
    isOfficial: true,
    manifest: {
      id: 'org.stremio.opensubtitles',
      name: 'OpenSubtitles v3',
      version: '3.0.0',
      description: 'Official subtitles for movies and series',
      types: ['movie', 'series'],
      resources: ['subtitles'],
      catalogs: [],
    },
  },
  {
    id: 'com.linvo.watchhub',
    name: 'WatchHub',
    version: '1.0.0',
    description: 'Aggregates official streaming providers and external stream destinations.',
    transportUrl: 'https://watchhub.strem.io',
    enabled: true,
    isOfficial: true,
    manifest: {
      id: 'com.linvo.watchhub',
      name: 'WatchHub',
      version: '1.0.0',
      description: 'Official provider streams aggregator',
      types: ['movie', 'series'],
      resources: ['stream'],
      catalogs: [],
    },
  },
];

// Popular Community Add-ons for 1-Click Install
export const POPULAR_COMMUNITY_ADDONS = [
  {
    id: 'toastflix.addon.it',
    name: '🥪 ToastFlix (Direct ITA)',
    description: 'Flussi diretti in lingua Italiana e Dual Audio (No Torrent/No Proxy) da toastflix.stremio-italia.eu',
    manifestUrl: 'https://toastflix.stremio-italia.eu/eyJzb2xvRGlyZWN0Ijp0cnVlLCJkaXJlY3REdWFsIjp0cnVlLCJudXZpb0ZyaWVuZGx5Ijp0cnVlfQ/manifest.json',
    types: ['movie', 'series'],
  },
  {
    id: 'org.stremio.anime-kitsu',
    name: 'Anime Kitsu',
    description: 'Discover trending anime series, OVAs, and movies powered by Kitsu.io.',
    manifestUrl: 'https://anime-kitsu.strem.fun/manifest.json',
    types: ['series', 'movie'],
  },
  {
    id: 'com.stremio.youtube',
    name: 'YouTube Channels',
    description: 'Watch public YouTube channel feeds and trending video streams in Stremio.',
    manifestUrl: 'https://youtube.strem.io/manifest.json',
    types: ['other', 'channel'],
  },
  {
    id: 'org.stremio.public-domain',
    name: 'Public Domain Movies',
    description: 'Curated public domain and archive cinema collection with legal streams.',
    manifestUrl: 'https://v3-cinemeta.strem.io/manifest.json',
    types: ['movie'],
  },
];

class StremioService {
  private addons: InstalledAddon[] = [];

  // High-performance caches (in-memory + local storage for instant cold starts)
  private catalogCache = new Map<string, { data: StremioMetaPreview[]; expires: number }>();
  private metaCache = new Map<string, { data: StremioMetaDetail; expires: number }>();
  private streamCache = new Map<string, { data: StremioStream[]; expires: number }>();

  constructor() {
    this.loadAddons();
    this.loadPersistentCatalogCache();
  }

  private loadPersistentCatalogCache() {
    try {
      const stored = localStorage.getItem('liquid_stremio_catalog_cache_v2');
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
      localStorage.setItem('liquid_stremio_catalog_cache_v2', JSON.stringify(obj));
    } catch (e) {
      // Quota exceeded or private browsing
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
      const stored = localStorage.getItem(ADDONS_STORAGE_KEY) || localStorage.getItem('liquid_stremio_addons_v1');
      if (stored) {
        const parsed: InstalledAddon[] = JSON.parse(stored);
        // Automatically merge new default addons like Toastflix and update outdated configurations
        const merged = [...parsed];
        for (const def of DEFAULT_ADDONS) {
          const existingIdx = merged.findIndex((m) => m.id === def.id);
          if (existingIdx === -1) {
            merged.push(def);
          } else if (def.id === 'toastflix.addon.it') {
            // Always ensure ToastFlix has the working transportUrl, is enabled, and official-styled
            merged[existingIdx] = {
              ...merged[existingIdx],
              name: def.name,
              transportUrl: def.transportUrl,
              enabled: true,
              manifest: def.manifest,
            };
          }
        }
        this.addons = merged;
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
      // Try internal proxy first
      const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(normalized)}`;
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`Proxy responded with ${resp.status}`);
      manifest = await resp.json();
    } catch (err: any) {
      try {
        const resp = await fetch(normalized, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) throw new Error(`Direct fetch responded with ${resp.status}`);
        manifest = await resp.json();
      } catch (directErr) {
        // Try with allorigins as last fallback
        try {
          const publicProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(normalized)}`;
          const resp = await fetch(publicProxy, { signal: AbortSignal.timeout(8000) });
          if (!resp.ok) throw new Error('Public proxy failed');
          manifest = await resp.json();
        } catch (proxyErr) {
          throw new Error(`Unable to fetch manifest: ${err.message || 'Network/CORS error'}`);
        }
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

    // Remove existing if replacing
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

    const addon = this.addons.find((a) => a.id === addonId && a.enabled);
    if (!addon) return [];

    // Handle internal Open Media WebTorrent addon
    if (addon.transportUrl === 'local://openwebtorrent') {
      let items = OPEN_MEDIA_CATALOG.map((m) => m.meta);
      if (extra?.search) {
        const q = extra.search.toLowerCase();
        items = items.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.genres?.some((g) => g.toLowerCase().includes(q))
        );
      }
      this.catalogCache.set(cacheKey, { data: items, expires: now + 15 * 60 * 1000 });
      return items;
    }

    // Build URL according to Stremio Addon Protocol v3:
    // GET /catalog/{type}/{id}[/{extraProps}].json
    let url = `${addon.transportUrl}/catalog/${type}/${catalogId}`;
    if (extra?.search) {
      url += `/search=${encodeURIComponent(extra.search)}`;
    } else if (extra?.genre) {
      url += `/genre=${encodeURIComponent(extra.genre)}`;
    }
    url += '.json';

    try {
      let resp: Response | null = null;
      try {
        const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(url)}`;
        resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
      } catch {
        resp = await fetch(url, { signal: AbortSignal.timeout(6000) }).catch(() => null);
      }

      if (!resp || !resp.ok) return [];
      const data = await resp.json();
      const results = (data.metas || []).map((m: any) => ({
        ...m,
        type: m.type || type,
      }));

      // Cache for 30 minutes in memory and persistent storage
      this.catalogCache.set(cacheKey, { data: results, expires: now + 30 * 60 * 1000 });
      this.savePersistentCatalogCache();
      return results;
    } catch (err) {
      console.warn(`[StremioService] Catalog fetch timed out/failed for ${url}`);
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

    // Check local catalog first
    const local = OPEN_MEDIA_CATALOG.find((m) => m.meta.id === id);
    if (local) {
      this.metaCache.set(cacheKey, { data: local.meta, expires: now + 60 * 60 * 1000 });
      return local.meta;
    }

    // Query Cinemeta or any addon supporting 'meta'
    const metaAddons = this.addons.filter(
      (a) =>
        a.enabled &&
        a.manifest.resources.some((r) =>
          typeof r === 'string' ? r === 'meta' : r.name === 'meta'
        ) &&
        a.transportUrl.startsWith('http')
    );

    for (const addon of metaAddons) {
      try {
        const url = `${addon.transportUrl}/meta/${type}/${id}.json`;
        let resp: Response | null = null;
        try {
          const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(url)}`;
          resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
        } catch {
          resp = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
        }

        if (resp && resp.ok) {
          const data = await resp.json();
          if (data.meta) {
            this.metaCache.set(cacheKey, { data: data.meta, expires: now + 60 * 60 * 1000 });
            return data.meta;
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

    // 1. Check local catalog immediately (instant 0ms)
    const local = OPEN_MEDIA_CATALOG.find((m) => m.meta.id === id);
    if (local && local.streams.length > 0) {
      allStreams.push(...local.streams);
      if (onBatch) onBatch(local.streams, 'Local Open WebTorrent');
    }

    // 2. Query all active addons that declare 'stream' resource concurrently
    const streamAddons = this.addons.filter(
      (a) =>
        a.enabled &&
        a.manifest.resources.some((r) =>
          typeof r === 'string' ? r === 'stream' : r.name === 'stream'
        ) &&
        a.transportUrl.startsWith('http')
    );

    const promises = streamAddons.map(async (addon) => {
      try {
        const url = `${addon.transportUrl}/stream/${type}/${id}.json`;
        let resp: Response | null = null;
        try {
          // Prefer local Express proxy to bypass browser CORS & origin headers
          const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(url)}`;
          resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(26000) });
        } catch {
          // Fallback to direct fetch
          resp = await fetch(url, { signal: AbortSignal.timeout(26000) }).catch(() => null);
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
        // Silently skip addons that fail or have no streams for this item
      }
      return [];
    });

    await Promise.allSettled(promises);

    // Helper to evaluate stream priority score (Higher score = Top priority)
    const getStreamScore = (s: StremioStream): number => {
      const name = (s.name || '').toLowerCase();
      const title = (s.title || '').toLowerCase();
      const hasUrl = !!s.url && s.url.trim().length > 0;
      const isTorrent = !hasUrl || !!s.infoHash || name.includes('torrent');
      const isToastflix = name.includes('toastflix') || title.includes('toastflix');
      const isIta = isToastflix || title.includes('ita') || name.includes('ita');

      let score = 0;
      // Direct stream has highest baseline
      if (!isTorrent && hasUrl) {
        score += 1000;
      }
      // Toastflix specifically requested by user
      if (isToastflix) {
        score += 2000;
      }
      // Italian language flag
      if (isIta) {
        score += 500;
      }
      // Torrents receive lower score
      if (isTorrent) {
        score -= 500;
      }
      return score;
    };

    // Sort streams: ToastFlix & Direct ITA streams come FIRST, Torrents come second
    allStreams.sort((a, b) => getStreamScore(b) - getStreamScore(a));

    // 3. If it's an IMDb id and no streams were found from addons or local, provide sample video stream
    if (allStreams.length === 0 && id.startsWith('tt')) {
      const fallbackStream: StremioStream = {
        name: 'Demo Video Stream',
        title: 'Sample Direct Stream for Preview',
        url: 'https://vjs.zencdn.net/v/oceans.mp4',
      };
      allStreams.push(fallbackStream);
      if (onBatch) onBatch([fallbackStream], 'Demo Stream');
    }

    // Cache streams for 5 minutes
    if (allStreams.length > 0) {
      this.streamCache.set(cacheKey, { data: allStreams, expires: now + 5 * 60 * 1000 });
    }

    return allStreams;
  }

  // Fetch streams from all active addons (alias)
  public async fetchStreams(type: string, id: string): Promise<StremioStream[]> {
    return this.fetchStreamsProgressive(type, id);
  }

  // Fetch subtitles
  public async fetchSubtitles(type: string, id: string): Promise<StremioSubtitle[]> {
    const subAddons = this.addons.filter(
      (a) =>
        a.enabled &&
        a.manifest.resources.some((r) =>
          typeof r === 'string' ? r === 'subtitles' : r.name === 'subtitles'
        ) &&
        a.transportUrl.startsWith('http')
    );

    const subs: StremioSubtitle[] = [];
    for (const addon of subAddons) {
      try {
        const url = `${addon.transportUrl}/subtitles/${type}/${id}.json`;
        let resp: Response | null = null;
        try {
          const proxyUrl = `/api/stremio-proxy?url=${encodeURIComponent(url)}`;
          resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
        } catch {
          resp = await fetch(url, { signal: AbortSignal.timeout(6000) }).catch(() => null);
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
