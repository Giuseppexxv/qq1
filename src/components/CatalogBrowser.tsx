import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Info,
  Star,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Film,
  Tv,
  Sparkles,
  Flame,
  Clapperboard,
  Trophy,
  Crown,
  Medal,
  Plus,
  Check,
} from 'lucide-react';
import {
  StremioMetaPreview,
  StremioMetaDetail,
  StremioStream,
  StremioVideo,
} from '../types/stremio';
import { stremioService } from '../services/stremioService';
import { MediaCard } from './MediaCard';
import { getReleaseYear } from '../utils/formatters';

interface CatalogBrowserProps {
  tab: 'discover' | 'movies' | 'series';
  searchQuery: string;
  onSelectMedia: (item: StremioMetaPreview) => void;
  onPlayStream: (media: StremioMetaDetail, stream?: StremioStream, video?: StremioVideo) => void;
}

// Movie Categories
const MOVIE_GENRES = [
  'Tutti i Film',
  'Commedia',
  'Azione',
  'Animazione',
  'Fantascienza',
  'Horror',
  'Thriller',
  'Dramma',
  'Crime',
  'Avventura',
  'Famiglia',
  'Fantasy',
  'Romantico',
  'Documentario',
];

// Series Categories
const SERIES_GENRES = [
  'Tutte le Serie',
  'Dramma',
  'Commedia',
  'Azione & Avventura',
  'Fantascienza & Fantasy',
  'Crime',
  'Animazione',
  'Mistero',
  'Documentario',
  'Famiglia',
  'Reality',
];

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({
  tab,
  searchQuery,
  onSelectMedia,
  onPlayStream,
}) => {
  // Category filter state per tab
  const [selectedMovieGenre, setSelectedMovieGenre] = useState('Tutti i Film');
  const [selectedSeriesGenre, setSelectedSeriesGenre] = useState('Tutte le Serie');

  // Shared / Discover Rows
  const [top10Movies, setTop10Movies] = useState<StremioMetaPreview[]>([]);
  const [top10Series, setTop10Series] = useState<StremioMetaPreview[]>([]);
  const [nowPlaying, setNowPlaying] = useState<StremioMetaPreview[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<StremioMetaPreview[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<StremioMetaPreview[]>([]);
  const [popularMovies, setPopularMovies] = useState<StremioMetaPreview[]>([]);
  const [popularSeries, setPopularSeries] = useState<StremioMetaPreview[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<StremioMetaPreview[]>([]);
  const [topRatedSeries, setTopRatedSeries] = useState<StremioMetaPreview[]>([]);

  // Platform rows
  const [netflixMovies, setNetflixMovies] = useState<StremioMetaPreview[]>([]);
  const [primeMovies, setPrimeMovies] = useState<StremioMetaPreview[]>([]);
  const [disneyMovies, setDisneyMovies] = useState<StremioMetaPreview[]>([]);
  const [netflixSeries, setNetflixSeries] = useState<StremioMetaPreview[]>([]);
  const [primeSeries, setPrimeSeries] = useState<StremioMetaPreview[]>([]);

  // Movie Genre Specific Rows
  const [comedyMovies, setComedyMovies] = useState<StremioMetaPreview[]>([]);
  const [actionMovies, setActionMovies] = useState<StremioMetaPreview[]>([]);
  const [animationMovies, setAnimationMovies] = useState<StremioMetaPreview[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<StremioMetaPreview[]>([]);
  const [sciFiMovies, setSciFiMovies] = useState<StremioMetaPreview[]>([]);
  const [thrillerMovies, setThrillerMovies] = useState<StremioMetaPreview[]>([]);
  const [dramaMovies, setDramaMovies] = useState<StremioMetaPreview[]>([]);

  // Series Genre Specific Rows
  const [crimeSeries, setCrimeSeries] = useState<StremioMetaPreview[]>([]);
  const [comedySeries, setComedySeries] = useState<StremioMetaPreview[]>([]);
  const [actionSeries, setActionSeries] = useState<StremioMetaPreview[]>([]);
  const [sciFiSeries, setSciFiSeries] = useState<StremioMetaPreview[]>([]);
  const [dramaSeries, setDramaSeries] = useState<StremioMetaPreview[]>([]);
  const [animeSeries, setAnimeSeries] = useState<StremioMetaPreview[]>([]);
  const [docuSeries, setDocuSeries] = useState<StremioMetaPreview[]>([]);

  // Filtered Genre Grid Results (when specific genre is picked)
  const [genreGridItems, setGenreGridItems] = useState<StremioMetaPreview[]>([]);
  const [genreGridLoading, setGenreGridLoading] = useState(false);

  // Featured Hero Carousel
  const [featuredList, setFeaturedList] = useState<StremioMetaPreview[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [heroProgress, setHeroProgress] = useState(0);

  const [searchResults, setSearchResults] = useState<StremioMetaPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const SLIDE_DURATION = 4000;

  // Auto advance featured hero carousel with continuous time progress in pill
  useEffect(() => {
    if (featuredList.length <= 1) return;
    if (isHeroHovered) return;

    const intervalMs = 50;
    const step = (intervalMs / SLIDE_DURATION) * 100;

    const timer = setInterval(() => {
      setHeroProgress((prev) => {
        if (prev >= 100) {
          setFeaturedIndex((current) => (current + 1) % featuredList.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [featuredList.length, isHeroHovered]);

  // Load Primary Catalogs based on Active Tab
  useEffect(() => {
    loadPrimaryData();
    setFeaturedIndex(0);
  }, [tab]);

  // Load Filtered Grid when a single genre is selected in Movies or Series
  useEffect(() => {
    if (tab === 'movies' && selectedMovieGenre !== 'Tutti i Film') {
      loadSpecificGenre('movie', selectedMovieGenre);
    } else if (tab === 'series' && selectedSeriesGenre !== 'Tutte le Serie') {
      loadSpecificGenre('series', selectedSeriesGenre);
    }
  }, [tab, selectedMovieGenre, selectedSeriesGenre]);

  // Search handling
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const delayDebounce = setTimeout(() => {
      const q = searchQuery.trim();
      if (tab === 'movies') {
        stremioService
          .fetchCatalog('official.catalog', 'movie', 'tmdb.movie.search', { search: q })
          .then((res) => {
            setSearchResults(res);
            setSearching(false);
          })
          .catch(() => setSearching(false));
      } else if (tab === 'series') {
        stremioService
          .fetchCatalog('official.catalog', 'series', 'tmdb.series.search', { search: q })
          .then((res) => {
            setSearchResults(res);
            setSearching(false);
          })
          .catch(() => setSearching(false));
      } else {
        // Discover: search both movies and series
        Promise.all([
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.search', { search: q }),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.search', { search: q }),
        ])
          .then(([mov, ser]) => {
            const combined = [...mov, ...ser];
            const seen = new Set<string>();
            const unique = combined.filter((it) => {
              if (!it || !it.id || seen.has(it.id)) return false;
              seen.add(it.id);
              return true;
            });
            setSearchResults(unique);
            setSearching(false);
          })
          .catch(() => setSearching(false));
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, tab]);

  const loadSpecificGenre = async (type: 'movie' | 'series', genre: string) => {
    setGenreGridLoading(true);
    try {
      const catId = type === 'movie' ? 'tmdb.movie.popular' : 'tmdb.series.popular';
      const items = await stremioService.fetchCatalog('official.catalog', type, catId, {
        genre,
      });
      setGenreGridItems(items);
    } catch (e) {
      console.warn('Failed to load genre items', e);
    } finally {
      setGenreGridLoading(false);
    }
  };

  const setAndEnrichFeaturedList = (items: StremioMetaPreview[]) => {
    setFeaturedList(items);
    // Fetch detailed meta in background to obtain transparent official logo if available
    Promise.all(
      items.slice(0, 8).map(async (item) => {
        try {
          const meta = await stremioService.fetchMeta(item.type, item.id);
          if (meta && meta.logo) {
            return { ...item, logo: meta.logo };
          }
        } catch {
          // ignore
        }
        return item;
      })
    ).then((enriched) => {
      setFeaturedList(enriched);
    }).catch(() => {});
  };

  const loadPrimaryData = async () => {
    setLoading(true);

    try {
      if (tab === 'discover') {
        const [t10m, t10s, nowPlay, trendM, trendS, topM, netM, primeM, disM] =
          await Promise.all([
            stremioService.fetchCatalog('official.catalog', 'movie', 't10.movie.top10'),
            stremioService.fetchCatalog('official.catalog', 'series', 't10.series.top10'),
            stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.now_playing'),
            stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.trending'),
            stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.trending'),
            stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.top_rated'),
            stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.netflix'),
            stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.amazon'),
            stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.disney'),
          ]);

        if (t10m.length > 0) {
          setTop10Movies(t10m);
        }
        if (t10s.length > 0) setTop10Series(t10s);
        if (nowPlay.length > 0) setNowPlaying(nowPlay);
        if (trendM.length > 0) setTrendingMovies(trendM);
        if (trendS.length > 0) setTrendingSeries(trendS);
        if (topM.length > 0) setTopRatedMovies(topM);
        if (netM.length > 0) setNetflixMovies(netM);
        if (primeM.length > 0) setPrimeMovies(primeM);
        if (disM.length > 0) setDisneyMovies(disM);

        // Featured carousel list for Discover (top movies & series combined)
        const combined = [...t10m.slice(0, 4), ...t10s.slice(0, 4)].filter(Boolean);
        if (combined.length > 0) {
          setAndEnrichFeaturedList(combined);
        }
      } else if (tab === 'movies') {
        // Load Core Movie rows first
        const [t10m, nowPlay, trendM, popM, topM] = await Promise.all([
          stremioService.fetchCatalog('official.catalog', 'movie', 't10.movie.top10'),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.now_playing'),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.trending'),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.popular'),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.top_rated'),
        ]);

        if (t10m.length > 0) {
          setTop10Movies(t10m);
          setAndEnrichFeaturedList(t10m.slice(0, 8));
        } else if (trendM.length > 0) {
          setAndEnrichFeaturedList(trendM.slice(0, 8));
        }
        if (nowPlay.length > 0) setNowPlaying(nowPlay);
        if (trendM.length > 0) setTrendingMovies(trendM);
        if (popM.length > 0) setPopularMovies(popM);
        if (topM.length > 0) setTopRatedMovies(topM);

        // Load Movie Categories
        Promise.all([
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.popular', { genre: 'Commedia' }),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.popular', { genre: 'Azione' }),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.popular', { genre: 'Animazione' }),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.popular', { genre: 'Horror' }),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.popular', { genre: 'Fantascienza' }),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.popular', { genre: 'Thriller' }),
          stremioService.fetchCatalog('official.catalog', 'movie', 'tmdb.movie.popular', { genre: 'Dramma' }),
        ]).then(([comedy, action, anim, horror, scifi, thriller, drama]) => {
          if (comedy.length > 0) setComedyMovies(comedy);
          if (action.length > 0) setActionMovies(action);
          if (anim.length > 0) setAnimationMovies(anim);
          if (horror.length > 0) setHorrorMovies(horror);
          if (scifi.length > 0) setSciFiMovies(scifi);
          if (thriller.length > 0) setThrillerMovies(thriller);
          if (drama.length > 0) setDramaMovies(drama);
        }).catch(() => {});
      } else if (tab === 'series') {
        // Load Core Series rows first
        const [t10s, trendS, popS, topS] = await Promise.all([
          stremioService.fetchCatalog('official.catalog', 'series', 't10.series.top10'),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.trending'),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.popular'),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.top_rated'),
        ]);

        if (t10s.length > 0) {
          setTop10Series(t10s);
          setAndEnrichFeaturedList(t10s.slice(0, 8));
        } else if (trendS.length > 0) {
          setAndEnrichFeaturedList(trendS.slice(0, 8));
        }
        if (trendS.length > 0) setTrendingSeries(trendS);
        if (popS.length > 0) setPopularSeries(popS);
        if (topS.length > 0) setTopRatedSeries(topS);

        // Load Series Categories & Platforms
        Promise.all([
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.popular', { genre: 'Crime' }),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.popular', { genre: 'Commedia' }),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.popular', { genre: 'Azione & Avventura' }),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.popular', { genre: 'Fantascienza & Fantasy' }),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.popular', { genre: 'Dramma' }),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.popular', { genre: 'Animazione' }),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.popular', { genre: 'Documentario' }),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.netflix'),
          stremioService.fetchCatalog('official.catalog', 'series', 'tmdb.series.amazon'),
        ]).then(([crime, comedy, action, scifi, drama, anime, docu, netS, primeS]) => {
          if (crime.length > 0) setCrimeSeries(crime);
          if (comedy.length > 0) setComedySeries(comedy);
          if (action.length > 0) setActionSeries(action);
          if (scifi.length > 0) setSciFiSeries(scifi);
          if (drama.length > 0) setDramaSeries(drama);
          if (anime.length > 0) setAnimeSeries(anime);
          if (docu.length > 0) setDocuSeries(docu);
          if (netS.length > 0) setNetflixSeries(netS);
          if (primeS.length > 0) setPrimeSeries(primeS);
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Error loading catalog rows', e);
    } finally {
      setLoading(false);
    }
  };

  const currentHero = featuredList[featuredIndex] || null;
  const [heroInLibrary, setHeroInLibrary] = useState(false);

  useEffect(() => {
    if (currentHero) {
      setHeroInLibrary(stremioService.isInLibrary(currentHero.id));
    }
  }, [currentHero]);

  const handleHeroLibraryToggle = () => {
    if (!currentHero) return;
    const state = stremioService.toggleLibraryItem(currentHero);
    setHeroInLibrary(state);
  };

  const handleHeroPlay = () => {
    if (!currentHero) return;
    onPlayStream(currentHero as StremioMetaDetail);
  };

  const handleSelectHeroSlide = (idx: number) => {
    setFeaturedIndex(idx);
    setHeroProgress(0);
  };

  const handlePrevHero = () => {
    if (featuredList.length <= 1) return;
    setFeaturedIndex((prev) => (prev === 0 ? featuredList.length - 1 : prev - 1));
    setHeroProgress(0);
  };

  const handleNextHero = () => {
    if (featuredList.length <= 1) return;
    setFeaturedIndex((prev) => (prev + 1) % featuredList.length);
    setHeroProgress(0);
  };

  const handleCardQuickPlay = (m: StremioMetaPreview) => {
    onPlayStream(m as StremioMetaDetail);
  };

  // Search Results View
  if (searchQuery.trim()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-24 sm:pt-28 pb-12 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Risultati per "{searchQuery}"</span>
            <span className="text-xs text-slate-400 font-normal">
              ({searchResults.length} trovati)
            </span>
          </h2>
          {searching && <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />}
        </div>

        {searchResults.length === 0 && !searching ? (
          <div className="p-16 rounded-3xl liquid-glass text-center text-slate-400 space-y-2">
            <Film className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium">Nessun titolo trovato nel catalogo.</p>
            <p className="text-xs text-slate-500">
              Prova con una parola chiave differente o cerca per genere.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {searchResults.map((item, idx) => (
              <MediaCard
                key={`${item.id}-${idx}`}
                item={item}
                onSelect={onSelectMedia}
                onQuickPlay={handleCardQuickPlay}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 bg-black min-h-screen">
      {/* ==================== FEATURED HERO CAROUSEL ==================== */}
      {currentHero && (
        <div
          className="relative w-full min-h-[82vh] sm:min-h-[88vh] md:min-h-[92vh] flex items-end pt-24 sm:pt-28 pb-10 sm:pb-14 select-none overflow-hidden"
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
        >
          {/* Full Screen Cinematic Backdrop (Starts at absolute top 0, Ultra Vivid) */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              key={currentHero.id}
              src={
                currentHero.background ||
                currentHero.poster ||
                'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=85'
              }
              alt={currentHero.name}
              className="w-full h-full object-cover object-center filter brightness-100 contrast-110 saturate-140 transition-all duration-1000 ease-out"
            />
            
            {/* Multilayer Dark Gradients for Liquid Transparency & AMOLED Seamless Fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent sm:w-3/4" />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none" />
          </div>

          {/* Hero Main Content Row */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8">
            <div className="max-w-2xl sm:max-w-3xl space-y-4">
              {/* Unified Media Information Row: Voto, Anno, Tipo, Categoria */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Voto */}
                {currentHero.imdbRating && (
                  <span className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/35 font-bold shadow-md">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{currentHero.imdbRating}</span>
                  </span>
                )}

                {/* Anno */}
                {currentHero.releaseInfo && (
                  <span className="text-[11px] font-semibold text-slate-200 liquid-glass-transparent px-3 py-1 rounded-full border border-white/25 shadow-md">
                    {getReleaseYear(currentHero.releaseInfo)}
                  </span>
                )}

                {/* Tipo */}
                <span className="px-3 py-1 rounded-full liquid-glass-transparent text-rose-300 border border-rose-500/35 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  {currentHero.type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                  <span>{currentHero.type === 'movie' ? 'Film' : 'Serie TV'}</span>
                </span>

                {/* Categoria / Genere */}
                {currentHero.genres && currentHero.genres.length > 0 && (
                  <span className="text-[11px] font-medium text-slate-300 liquid-glass-transparent px-3 py-1 rounded-full border border-white/20 shadow-md">
                    {currentHero.genres.slice(0, 3).join(' • ')}
                  </span>
                )}
              </div>

              {/* Title / Poster Logo: Transparent PNG logo or Movie Poster Typography */}
              {currentHero.logo ? (
                <div className="py-1">
                  <img
                    src={currentHero.logo}
                    alt={currentHero.name}
                    className="h-16 sm:h-24 md:h-32 max-w-[85vw] sm:max-w-xl object-contain object-left drop-shadow-[0_10px_25px_rgba(0,0,0,0.95)]"
                  />
                </div>
              ) : (
                <h1 className="font-poster-logo text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter drop-shadow-[0_8px_30px_rgba(0,0,0,0.95)] uppercase leading-none">
                  {currentHero.name}
                </h1>
              )}

              {currentHero.description && (
                <p className="text-sm sm:text-base text-slate-200/90 line-clamp-3 leading-relaxed max-w-2xl font-normal drop-shadow-md">
                  {currentHero.description}
                </p>
              )}

              {/* Action Buttons: Riproduci, Aggiungi alla Libreria, Scheda & Trama */}
              <div className="flex items-center gap-3.5 pt-2 flex-wrap">
                <button
                  onClick={handleHeroPlay}
                  className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm tracking-wide transition-all duration-200 shadow-xl shadow-red-600/40 hover:shadow-red-500/60 active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Guarda Ora</span>
                </button>

                <button
                  onClick={handleHeroLibraryToggle}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
                    heroInLibrary
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/20'
                      : 'liquid-glass-transparent hover:bg-white/20 text-white border border-white/25'
                  }`}
                  title={heroInLibrary ? 'Rimuovi dalla Libreria' : 'Aggiungi alla Libreria'}
                >
                  {heroInLibrary ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{heroInLibrary ? 'In Libreria' : 'Aggiungi alla Libreria'}</span>
                </button>

                <button
                  onClick={() => onSelectMedia(currentHero)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl liquid-glass-transparent hover:bg-white/20 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm transition-all duration-200 active:scale-95 cursor-pointer border border-white/25 shadow-lg"
                >
                  <Info className="w-4 h-4 text-rose-300" />
                  <span>Scheda & Trama</span>
                </button>
              </div>
            </div>
          </div>

          {/* Integrated Liquid Glass Carousel Controller Pill (Arrows + Time Progress Indicator) */}
          {featuredList.length > 1 && (
            <div className="absolute bottom-2.5 sm:bottom-3 right-4 sm:right-8 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-transparent border border-white/25 shadow-2xl">
              <button
                type="button"
                onClick={handlePrevHero}
                className="w-8 h-8 rounded-full text-white/90 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Titolo precedente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-1.5">
                {featuredList.map((item, idx) => {
                  const isCurrent = idx === featuredIndex;
                  return (
                    <button
                      key={`${item.id}-${idx}`}
                      onClick={() => handleSelectHeroSlide(idx)}
                      className={`relative h-2 rounded-full transition-all duration-300 cursor-pointer overflow-hidden ${
                        isCurrent
                          ? 'w-10 sm:w-12 bg-white/20'
                          : 'w-2 bg-white/30 hover:bg-white/60'
                      }`}
                      title={`Slide ${idx + 1}`}
                    >
                      {isCurrent && (
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 via-rose-500 to-red-500 rounded-full transition-all duration-75 ease-linear shadow-[0_0_8px_rgba(225,29,72,0.8)]"
                          style={{ width: `${heroProgress}%` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleNextHero}
                className="w-8 h-8 rounded-full text-white/90 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Titolo successivo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* AMOLED Black transition spacer */}
      <div className="h-2" />

      {/* Categories Bar for Movies */}
      {tab === 'movies' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-rose-400" />
                <span>Cinema & Film</span>
              </h2>
              <p className="text-xs text-slate-400">
                Esplora per categorie, prime visioni e grandi successi internazionali
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {MOVIE_GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedMovieGenre(g)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedMovieGenre === g
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/40 border border-rose-400/40 font-bold'
                    : 'liquid-glass-transparent text-slate-300 hover:text-white border-white/20'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories Bar for Series */}
      {tab === 'series' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Tv className="w-5 h-5 text-rose-400" />
                <span>Serie TV & Show</span>
              </h2>
              <p className="text-xs text-slate-400">
                Tutte le stagioni, serie di tendenza e uscite divise per genere
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SERIES_GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedSeriesGenre(g)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedSeriesGenre === g
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/40 border border-rose-400/40 font-bold'
                    : 'liquid-glass-transparent text-slate-300 hover:text-white border-white/20'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CATALOG CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
        {/* ==================== TAB 1: SCOPRI (DISCOVER) ==================== */}
        {tab === 'discover' && (
          <>
            {/* Top 10 Italia - Film */}
            <CatalogRow
              title="Top 10 Italia - Film"
              subtitle="I 10 film più visti e di maggior successo in Italia"
              items={top10Movies}
              badge="Top 10"
              showRank
              loading={loading}
              onSelect={onSelectMedia}
              onQuickPlay={handleCardQuickPlay}
            />

            {/* Top 10 Italia - Serie TV */}
            <CatalogRow
              title="Top 10 Italia - Serie TV"
              subtitle="Le 10 serie televisive più seguite e discusse del momento"
              items={top10Series}
              badge="Top 10"
              showRank
              loading={loading}
              onSelect={onSelectMedia}
              onQuickPlay={handleCardQuickPlay}
            />

            {/* Al Cinema & Prime Visioni */}
            <CatalogRow
              title="Prime Visioni al Cinema"
              subtitle="I film attualmente in programmazione nelle sale cinematografiche"
              items={nowPlaying}
              badge="Al Cinema"
              loading={loading}
              onSelect={onSelectMedia}
              onQuickPlay={handleCardQuickPlay}
            />

            {/* Film di Tendenza */}
            <CatalogRow
              title="Film di Tendenza"
              subtitle="I titoli con la crescita più rapida nelle preferenze del pubblico"
              items={trendingMovies}
              loading={loading}
              onSelect={onSelectMedia}
              onQuickPlay={handleCardQuickPlay}
            />

            {/* Serie TV di Tendenza */}
            <CatalogRow
              title="Serie TV di Tendenza"
              subtitle="Nuovi episodi e uscite imperdibili sul piccolo schermo"
              items={trendingSeries}
              loading={loading}
              onSelect={onSelectMedia}
              onQuickPlay={handleCardQuickPlay}
            />

            {/* I Più Votati di Sempre */}
            <CatalogRow
              title="I Più Votati di Sempre"
              subtitle="Capolavori universali acclamati da pubblico e critica cinematografica"
              items={topRatedMovies}
              badge="Top Rating"
              loading={loading}
              onSelect={onSelectMedia}
              onQuickPlay={handleCardQuickPlay}
            />

            {/* Piattaforme in evidenza */}
            {netflixMovies.length > 0 && (
              <CatalogRow
                title="Produzioni Originali Netflix"
                subtitle="Film e progetti esclusivi del catalogo Netflix"
                items={netflixMovies}
                badge="Netflix"
                loading={loading}
                onSelect={onSelectMedia}
                onQuickPlay={handleCardQuickPlay}
              />
            )}

            {primeMovies.length > 0 && (
              <CatalogRow
                title="Amazon Prime Video"
                subtitle="I migliori titoli disponibili su Amazon Prime"
                items={primeMovies}
                badge="Prime Video"
                loading={loading}
                onSelect={onSelectMedia}
                onQuickPlay={handleCardQuickPlay}
              />
            )}

            {disneyMovies.length > 0 && (
              <CatalogRow
                title="Disney+ & Marvel"
                subtitle="Animazione per tutta la famiglia, Pixar e saghe Marvel"
                items={disneyMovies}
                badge="Disney+"
                loading={loading}
                onSelect={onSelectMedia}
                onQuickPlay={handleCardQuickPlay}
              />
            )}
          </>
        )}

        {/* ==================== TAB 2: FILM (MOVIES) ==================== */}
        {tab === 'movies' && (
          <>
            {/* Se è selezionata una categoria specifica: visualizzazione Griglia per quel genere */}
            {selectedMovieGenre !== 'Tutti i Film' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clapperboard className="w-5 h-5 text-cyan-400" />
                    <span>Categoria: {selectedMovieGenre}</span>
                  </h3>
                  <button
                    onClick={() => setSelectedMovieGenre('Tutti i Film')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                  >
                    Torna a Tutti i Film &rarr;
                  </button>
                </div>

                {genreGridLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <span className="text-xs text-slate-400">Caricamento titoli {selectedMovieGenre}...</span>
                  </div>
                ) : genreGridItems.length === 0 ? (
                  <div className="p-12 rounded-3xl liquid-glass text-center text-slate-400">
                    <p className="text-sm">Nessun film trovato per la categoria {selectedMovieGenre}.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {genreGridItems.map((item, idx) => (
                      <MediaCard
                        key={`${item.id}-${idx}`}
                        item={item}
                        onSelect={onSelectMedia}
                        onQuickPlay={handleCardQuickPlay}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Sezione Tutti i Film con tutte le categorie ricche */
              <>
                {/* 1. Top Movie */}
                <CatalogRow
                  title="Top 10 Film - Italia"
                  subtitle="I 10 film con il maggior numero di visualizzazioni"
                  items={top10Movies}
                  badge="Top 10"
                  showRank
                  loading={loading}
                  onSelect={onSelectMedia}
                  onQuickPlay={handleCardQuickPlay}
                />

                {/* 2. Al Cinema */}
                <CatalogRow
                  title="Al Cinema & Prime Visioni"
                  subtitle="I titoli attualmente nelle sale e appena usciti"
                  items={nowPlaying}
                  badge="Al Cinema"
                  loading={loading}
                  onSelect={onSelectMedia}
                  onQuickPlay={handleCardQuickPlay}
                />

                {/* 3. Film di Tendenza */}
                <CatalogRow
                  title="Film di Tendenza"
                  subtitle="Cosa stanno guardando gli appassionati di cinema in questo momento"
                  items={trendingMovies}
                  loading={loading}
                  onSelect={onSelectMedia}
                  onQuickPlay={handleCardQuickPlay}
                />

                {/* 4. Film Popolari */}
                <CatalogRow
                  title="Film Popolari & Più Visti"
                  subtitle="I successi planetari più amati di sempre"
                  items={popularMovies}
                  loading={loading}
                  onSelect={onSelectMedia}
                  onQuickPlay={handleCardQuickPlay}
                />

                {/* 5. Film Più Votati */}
                <CatalogRow
                  title="Film Più Votati (Migliori di Sempre)"
                  subtitle="I film con le valutazioni IMDb e della critica più alte"
                  items={topRatedMovies}
                  badge="Capolavori"
                  loading={loading}
                  onSelect={onSelectMedia}
                  onQuickPlay={handleCardQuickPlay}
                />

                {/* 6. Categoria: Commedie */}
                {comedyMovies.length > 0 && (
                  <CatalogRow
                    title="Commedie da non Perdere"
                    subtitle="Risate, divertimento e commedie brillanti per ogni serata"
                    items={comedyMovies}
                    badge="Commedia"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 7. Categoria: Azione */}
                {actionMovies.length > 0 && (
                  <CatalogRow
                    title="Azione & Avventura ad Alto Tasso d'Adrenalina"
                    subtitle="Inseguimenti, combattimenti e saghe d'azione mozzafiato"
                    items={actionMovies}
                    badge="Azione"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 8. Categoria: Animazione */}
                {animationMovies.length > 0 && (
                  <CatalogRow
                    title="Animazione & Cinema per Famiglie"
                    subtitle="Capolavori d'animazione digitale, classici e storie emozionanti"
                    items={animationMovies}
                    badge="Animazione"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 9. Categoria: Horror */}
                {horrorMovies.length > 0 && (
                  <CatalogRow
                    title="Brividi & Horror"
                    subtitle="Tensione psicologica, creature misteriose e notti di terrore"
                    items={horrorMovies}
                    badge="Horror"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 10. Categoria: Fantascienza */}
                {sciFiMovies.length > 0 && (
                  <CatalogRow
                    title="Fantascienza & Viaggi nel Tempo"
                    subtitle="Futuri distopici, intelligenza artificiale ed esplorazioni spaziali"
                    items={sciFiMovies}
                    badge="Sci-Fi"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 11. Categoria: Thriller */}
                {thrillerMovies.length > 0 && (
                  <CatalogRow
                    title="Thriller & Mistero ad Alta Suspense"
                    subtitle="Trame intricate, colpi di scena e indagini psicologiche"
                    items={thrillerMovies}
                    badge="Thriller"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 12. Categoria: Drammatici */}
                {dramaMovies.length > 0 && (
                  <CatalogRow
                    title="Grandi Drammi & Storie Vere"
                    subtitle="Film d'autore intensi, biografie e racconti commoventi"
                    items={dramaMovies}
                    badge="Dramma"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* ==================== TAB 3: SERIE TV (SERIES) ==================== */}
        {tab === 'series' && (
          <>
            {/* Se è selezionata una categoria specifica: visualizzazione Griglia per quel genere */}
            {selectedSeriesGenre !== 'Tutte le Serie' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Tv className="w-5 h-5 text-cyan-400" />
                    <span>Categoria Serie TV: {selectedSeriesGenre}</span>
                  </h3>
                  <button
                    onClick={() => setSelectedSeriesGenre('Tutte le Serie')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                  >
                    Torna a Tutte le Serie &rarr;
                  </button>
                </div>

                {genreGridLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <span className="text-xs text-slate-400">Caricamento serie {selectedSeriesGenre}...</span>
                  </div>
                ) : genreGridItems.length === 0 ? (
                  <div className="p-12 rounded-3xl liquid-glass text-center text-slate-400">
                    <p className="text-sm">Nessuna serie trovata per la categoria {selectedSeriesGenre}.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {genreGridItems.map((item, idx) => (
                      <MediaCard
                        key={`${item.id}-${idx}`}
                        item={item}
                        onSelect={onSelectMedia}
                        onQuickPlay={handleCardQuickPlay}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Sezione Tutte le Serie TV con categorie dettagliate */
              <>
                {/* 1. Top 10 Serie TV Italia */}
                <CatalogRow
                  title="Top 10 Serie TV - Italia"
                  subtitle="Le 10 serie televisive più viste in Italia questa settimana"
                  items={top10Series}
                  badge="Top 10"
                  showRank
                  loading={loading}
                  onSelect={onSelectMedia}
                  onQuickPlay={handleCardQuickPlay}
                />

                {/* 2. Serie TV di Tendenza */}
                <CatalogRow
                  title="Serie TV di Tendenza"
                  subtitle="Le uscite e i nuovi episodi più chiacchierati sul web"
                  items={trendingSeries}
                  loading={loading}
                  onSelect={onSelectMedia}
                  onQuickPlay={handleCardQuickPlay}
                />

                {/* 3. Serie TV Popolari */}
                <CatalogRow
                  title="Serie TV Più Popolari"
                  subtitle="I franchise e le serie cult con le community più vaste"
                  items={popularSeries}
                  loading={loading}
                  onSelect={onSelectMedia}
                  onQuickPlay={handleCardQuickPlay}
                />

                {/* 4. Serie TV Più Votate */}
                <CatalogRow
                  title="Serie TV Acclamate dalla Critica"
                  subtitle="Le produzioni con i punteggi e i voti più alti"
                  items={topRatedSeries}
                  badge="Top Rated"
                  loading={loading}
                  onSelect={onSelectMedia}
                  onQuickPlay={handleCardQuickPlay}
                />

                {/* 5. Categoria: Crime & Poliziesco */}
                {crimeSeries.length > 0 && (
                  <CatalogRow
                    title="Crime, Indagini & Misteri"
                    subtitle="Detective, indagini forensi, mafia e serie crime ad alto impatto"
                    items={crimeSeries}
                    badge="Crime"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 6. Categoria: Commedie */}
                {comedySeries.length > 0 && (
                  <CatalogRow
                    title="Commedie & Sitcom Esilaranti"
                    subtitle="Episodi brillanti, risate e serie perfette per rilassarsi"
                    items={comedySeries}
                    badge="Commedia"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 7. Categoria: Azione & Avventura */}
                {actionSeries.length > 0 && (
                  <CatalogRow
                    title="Azione, Supereroi & Avventura"
                    subtitle="Grandi epopee, conflitti spettacolari e battaglie epiche"
                    items={actionSeries}
                    badge="Azione"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 8. Categoria: Fantascienza & Fantasy */}
                {sciFiSeries.length > 0 && (
                  <CatalogRow
                    title="Fantascienza, Universi Paralleli & Fantasy"
                    subtitle="Mondi immaginari, viaggi nello spazio ed elementi magici"
                    items={sciFiSeries}
                    badge="Sci-Fi & Fantasy"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 9. Categoria: Serie Drammatiche */}
                {dramaSeries.length > 0 && (
                  <CatalogRow
                    title="Grandi Serie Drammatiche"
                    subtitle="Intrighi politici, saghe familiari e relazioni complesse"
                    items={dramaSeries}
                    badge="Dramma"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 10. Categoria: Animazione & Anime */}
                {animeSeries.length > 0 && (
                  <CatalogRow
                    title="Animazione & Serie Anime"
                    subtitle="Serie animate giapponesi, animazione occidentale e produzioni d'autore"
                    items={animeSeries}
                    badge="Animazione"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 11. Categoria: Documentari */}
                {docuSeries.length > 0 && (
                  <CatalogRow
                    title="Documentari & Docuserie"
                    subtitle="Scienza, natura, cronaca reale e storie che cambiano la prospettiva"
                    items={docuSeries}
                    badge="Documentario"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 12. Netflix Serie */}
                {netflixSeries.length > 0 && (
                  <CatalogRow
                    title="Originali Netflix - Serie TV"
                    subtitle="Le serie TV create e distribuite da Netflix"
                    items={netflixSeries}
                    badge="Netflix"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}

                {/* 13. Prime Video Serie */}
                {primeSeries.length > 0 && (
                  <CatalogRow
                    title="Originali Amazon Prime Video"
                    subtitle="Le grandi serie esclusive targate Amazon Studios"
                    items={primeSeries}
                    badge="Prime Video"
                    loading={loading}
                    onSelect={onSelectMedia}
                    onQuickPlay={handleCardQuickPlay}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Reusable Horizontal Scrollable Catalog Row with optional Top 10 Rank Badge
interface CatalogRowProps {
  title: string;
  subtitle?: string;
  items: StremioMetaPreview[];
  badge?: string;
  showRank?: boolean;
  loading?: boolean;
  onSelect: (item: StremioMetaPreview) => void;
  onQuickPlay: (item: StremioMetaPreview) => void;
}

const CatalogRow: React.FC<CatalogRowProps> = ({
  title,
  subtitle,
  items,
  badge,
  showRank,
  loading,
  onSelect,
  onQuickPlay,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  // Deduplicate items safely by ID to prevent any duplicate key errors from API feeds
  const uniqueItems = React.useMemo(() => {
    const seen = new Set<string>();
    return items.filter((it) => {
      if (!it || !it.id) return false;
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const distance = 460;
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
    <div className="space-y-3 relative group/row">
      {/* Row Header with Title on Left and Navigation Controls on Right */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {showRank && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-amber-500/25 flex-shrink-0">
                <Trophy className="w-3.5 h-3.5 fill-current" />
              </div>
            )}
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {title}
            </h3>
            {showRank ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/35 shadow-sm">
                TOP 10
              </span>
            ) : (
              badge && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-rose-300 border border-red-500/30 shadow-sm">
                  {badge}
                </span>
              )
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Scroll Controls on the Right side */}
        <div className="flex items-center gap-1 p-1 rounded-full liquid-glass-transparent border border-white/25 shadow-md flex-shrink-0">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full text-white/90 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Scorri a sinistra"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/20" />
          <button
            type="button"
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full text-white/90 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Scorri a destra"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div className="relative">
        <div
          ref={rowRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1.5 scroll-smooth scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {uniqueItems.length === 0 && loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-36 sm:w-44 flex-shrink-0 animate-pulse">
                <div className="aspect-[2/3] rounded-2xl liquid-glass border border-white/10 bg-white/[0.03]" />
                <div className="h-3.5 bg-white/10 rounded-md mt-2.5 w-3/4" />
                <div className="h-2.5 bg-white/5 rounded-md mt-1.5 w-1/2" />
              </div>
            ))
          ) : (
            uniqueItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className="relative w-36 sm:w-44 flex-shrink-0">
                <MediaCard
                  item={item}
                  rank={showRank && index < 10 ? index + 1 : undefined}
                  onSelect={onSelect}
                  onQuickPlay={onQuickPlay}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
