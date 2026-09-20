import React, { useState, useEffect } from 'react';
import {
  Play,
  Info,
  Star,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  Film,
  Tv,
} from 'lucide-react';
import {
  StremioMetaPreview,
  StremioMetaDetail,
  StremioStream,
  ViewTab,
} from '../types/stremio';
import { stremioService } from '../services/stremioService';
import { OPEN_MEDIA_CATALOG } from '../data/openMediaCatalog';
import { MediaCard } from './MediaCard';

interface CatalogBrowserProps {
  tab: 'discover' | 'movies' | 'series';
  searchQuery: string;
  onSelectMedia: (item: StremioMetaPreview) => void;
  onPlayStream: (media: StremioMetaDetail, stream: StremioStream) => void;
}

const GENRES = ['All', 'Action', 'Comedy', 'Drama', 'Sci-Fi', 'Animation', 'Horror', 'Thriller'];

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({
  tab,
  searchQuery,
  onSelectMedia,
  onPlayStream,
}) => {
  const [selectedGenre, setSelectedGenre] = useState('All');

  // Catalogs initialized immediately from local persistent cache for 0ms startup
  const [popularMovies, setPopularMovies] = useState<StremioMetaPreview[]>(() => {
    return stremioService.getCachedCatalog('community.cinemeta', 'movie', 'top') || [];
  });
  const [popularSeries, setPopularSeries] = useState<StremioMetaPreview[]>(() => {
    return stremioService.getCachedCatalog('community.cinemeta', 'series', 'top') || [];
  });
  const [topRated, setTopRated] = useState<StremioMetaPreview[]>(() => {
    return stremioService.getCachedCatalog('community.cinemeta', 'movie', 'imdbRating') || [];
  });

  // Featured Item initialized immediately without waiting for network
  const [featuredItem, setFeaturedItem] = useState<StremioMetaPreview>(() => {
    const cached = stremioService.getCachedCatalog('community.cinemeta', 'movie', 'top');
    if (cached && cached.length > 0) return cached[0];
    return OPEN_MEDIA_CATALOG[0].meta;
  });

  const [searchResults, setSearchResults] = useState<StremioMetaPreview[]>([]);
  const [loading, setLoading] = useState(() => {
    const cached = stremioService.getCachedCatalog('community.cinemeta', 'movie', 'top');
    return !cached || cached.length === 0;
  });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadCatalogs();
  }, [tab, selectedGenre]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const delayDebounce = setTimeout(() => {
      stremioService
        .fetchCatalog('community.cinemeta', tab === 'series' ? 'series' : 'movie', 'top', {
          search: searchQuery.trim(),
        })
        .then((res) => {
          // Also search open catalog
          const localMatches = OPEN_MEDIA_CATALOG.filter((m) =>
            m.meta.name.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((m) => m.meta);
          setSearchResults([...localMatches, ...res]);
          setSearching(false);
        })
        .catch(() => {
          setSearching(false);
        });
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, tab]);

  const loadCatalogs = async () => {
    const genreParam = selectedGenre === 'All' ? undefined : selectedGenre;
    if (popularMovies.length === 0) {
      setLoading(true);
    }

    try {
      // Parallel concurrent fetching with fast 4s timeout
      const [movies, series, rated] = await Promise.all([
        stremioService.fetchCatalog('community.cinemeta', 'movie', 'top', { genre: genreParam }),
        stremioService.fetchCatalog('community.cinemeta', 'series', 'top', { genre: genreParam }),
        stremioService.fetchCatalog('community.cinemeta', 'movie', 'imdbRating', { genre: genreParam }),
      ]);

      if (movies.length > 0) {
        setPopularMovies(movies.slice(0, 20));
        setFeaturedItem(movies[0]);
      }
      if (series.length > 0) {
        setPopularSeries(series.slice(0, 20));
      }
      if (rated.length > 0) {
        setTopRated(rated.slice(0, 20));
      }
    } catch (e) {
      console.warn('Error fetching catalogs', e);
      if (popularMovies.length === 0) {
        setPopularMovies(OPEN_MEDIA_CATALOG.map((m) => m.meta));
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to pick the best stream prioritizing Direct/ToastFlix over Torrent
  const selectBestStream = (streams: StremioStream[]): StremioStream => {
    // 1. Prioritize ToastFlix
    const toast = streams.find(
      (s) =>
        s.name?.toLowerCase().includes('toastflix') ||
        s.title?.toLowerCase().includes('toastflix')
    );
    if (toast) return toast;

    // 2. Prioritize Direct Stream (has valid HTTP URL, not a torrent infoHash)
    const direct = streams.find(
      (s) => !s.infoHash && !!s.url && s.url.trim().length > 0 && !s.name?.toLowerCase().includes('torrent')
    );
    if (direct) return direct;

    // 3. Fallback to first available stream
    return streams[0];
  };

  const handleHeroPlay = async () => {
    if (!featuredItem) return;
    const streams = await stremioService.fetchStreams(featuredItem.type, featuredItem.id);
    if (streams.length > 0) {
      onPlayStream(featuredItem, selectBestStream(streams));
    } else {
      onSelectMedia(featuredItem);
    }
  };

  // Search Results View
  if (searchQuery.trim()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Results for "{searchQuery}"</span>
            <span className="text-xs text-slate-400 font-normal">
              ({searchResults.length} found)
            </span>
          </h2>
          {searching && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
        </div>

        {searchResults.length === 0 && !searching ? (
          <div className="p-16 rounded-3xl liquid-glass text-center text-slate-400 space-y-2">
            <Film className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">No results found on enabled add-ons.</p>
            <p className="text-xs text-slate-500">
              Try a different keyword or paste a Magnet link directly into the Torrent Client.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {searchResults.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onSelect={onSelectMedia}
                onQuickPlay={async (m) => {
                  const streams = await stremioService.fetchStreams(m.type, m.id);
                  if (streams.length > 0) onPlayStream(m, selectBestStream(streams));
                  else onSelectMedia(m);
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      
      {/* Featured Cinematic Hero Banner (Discover mode or top of Movies/Series) */}
      {featuredItem && (
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 pt-4">
          <div className="relative rounded-3xl overflow-hidden liquid-glass-elevated border border-white/15 h-[380px] sm:h-[460px] flex items-end p-6 sm:p-10 shadow-2xl">
            {/* Background Graphic */}
            <img
              src={
                featuredItem.banner ||
                featuredItem.background ||
                featuredItem.poster ||
                'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80'
              }
              alt={featuredItem.name}
              className="absolute inset-0 w-full h-full object-cover object-top opacity-55 filter brightness-90 saturate-125"
            />
            {/* Gradient Mask */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />

            {/* Hero Content */}
            <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold uppercase tracking-wider">
                  Featured {featuredItem.type}
                </span>
                {featuredItem.imdbRating && (
                  <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {featuredItem.imdbRating}
                  </span>
                )}
                {featuredItem.releaseInfo && (
                  <span className="text-xs text-slate-300 bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
                    {featuredItem.releaseInfo}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
                {featuredItem.name}
              </h1>

              {featuredItem.description && (
                <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed max-w-xl">
                  {featuredItem.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  id="hero-stream-btn"
                  onClick={handleHeroPlay}
                  className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Stream Now</span>
                </button>

                <button
                  onClick={() => onSelectMedia(featuredItem)}
                  className="px-5 py-3 rounded-2xl liquid-glass hover:bg-white/20 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all"
                >
                  <Info className="w-4 h-4" />
                  <span>Details & Streams</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Genre Filter Pills */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedGenre === g
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'liquid-glass text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Main Catalog Content - Always renders immediately */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
        {/* Row 1: Featured Open Source & WebTorrent Swarms (Instant 0ms) */}
        <CatalogRow
          title="Open Cinema & WebTorrent P2P Swarms"
          subtitle="4K & 1080p open films streaming directly via WebTorrent in your browser"
          items={OPEN_MEDIA_CATALOG.map((m) => m.meta)}
          badge="P2P Swarm"
          onSelect={onSelectMedia}
          onQuickPlay={async (m) => {
            const streams = await stremioService.fetchStreams(m.type, m.id);
            if (streams.length > 0) onPlayStream(m, selectBestStream(streams));
            else onSelectMedia(m);
          }}
        />

        {/* Row 2: Popular Movies (if on Discover or Movies) */}
        {(tab === 'discover' || tab === 'movies') && (
          <CatalogRow
            title="Trending Movies"
            subtitle="Aggregated by Cinemeta official catalog"
            items={popularMovies}
            loading={loading}
            onSelect={onSelectMedia}
            onQuickPlay={async (m) => {
              const streams = await stremioService.fetchStreams(m.type, m.id);
              if (streams.length > 0) onPlayStream(m, selectBestStream(streams));
              else onSelectMedia(m);
            }}
          />
        )}

        {/* Row 3: Popular TV Series (if on Discover or Series) */}
        {(tab === 'discover' || tab === 'series') && (
          <CatalogRow
            title="Popular TV Series"
            subtitle="Top serialized shows with episode selection"
            items={popularSeries}
            loading={loading}
            onSelect={onSelectMedia}
            onQuickPlay={async (m) => {
              const streams = await stremioService.fetchStreams(m.type, m.id);
              if (streams.length > 0) onPlayStream(m, selectBestStream(streams));
              else onSelectMedia(m);
            }}
          />
        )}

        {/* Row 4: Top Rated Classics */}
        <CatalogRow
          title="Top Rated Cinema"
          subtitle="Highest ranked titles on IMDb"
          items={topRated}
          loading={loading}
          onSelect={onSelectMedia}
          onQuickPlay={async (m) => {
            const streams = await stremioService.fetchStreams(m.type, m.id);
            if (streams.length > 0) onPlayStream(m, selectBestStream(streams));
            else onSelectMedia(m);
          }}
        />
      </div>
    </div>
  );
};

// Reusable Horizontal Scrollable Catalog Row
interface CatalogRowProps {
  title: string;
  subtitle?: string;
  items: StremioMetaPreview[];
  badge?: string;
  loading?: boolean;
  onSelect: (item: StremioMetaPreview) => void;
  onQuickPlay: (item: StremioMetaPreview) => void;
}

const CatalogRow: React.FC<CatalogRowProps> = ({
  title,
  subtitle,
  items,
  badge,
  loading,
  onSelect,
  onQuickPlay,
}) => {
  const rowRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const distance = 400;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -distance : distance,
        behavior: 'smooth',
      });
    }
  };

  if (items.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Row Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {title}
            </h3>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Scroll Arrows */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full liquid-glass hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full liquid-glass hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {items.length === 0 && loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-36 sm:w-44 flex-shrink-0 animate-pulse">
              <div className="aspect-[2/3] rounded-2xl liquid-glass border border-white/10 bg-white/[0.03]" />
              <div className="h-3.5 bg-white/10 rounded-md mt-2.5 w-3/4" />
              <div className="h-2.5 bg-white/5 rounded-md mt-1.5 w-1/2" />
            </div>
          ))
        ) : (
          items.map((item) => (
            <div key={item.id} className="w-36 sm:w-44 flex-shrink-0">
              <MediaCard
                item={item}
                onSelect={onSelect}
                onQuickPlay={onQuickPlay}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
