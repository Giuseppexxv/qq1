import React, { useState, useEffect } from 'react';
import { Play, Star, Plus, Check, Crown, Medal, Flame, Film, Tv } from 'lucide-react';
import { StremioMetaPreview } from '../types/stremio';
import { stremioService } from '../services/stremioService';
import { getReleaseYear } from '../utils/formatters';
import { checkPosterLuminance } from '../utils/imageLuminance';
import { optimizeImageUrl } from '../utils/imageOptimizer';

interface MediaCardProps {
  item: StremioMetaPreview;
  rank?: number;
  onSelect: (item: StremioMetaPreview) => void;
  onQuickPlay: (item: StremioMetaPreview) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, rank, onSelect, onQuickPlay }) => {
  const [imgError, setImgError] = useState(false);
  const [inLibrary, setInLibrary] = useState(() => stremioService.isInLibrary(item.id));
  const [isLightCover, setIsLightCover] = useState(false);

  // Local meta enrichment state for missing ratings, categories, and HD posters
  const [extraMeta, setExtraMeta] = useState<{ imdbRating?: string | number; genres?: string[]; poster?: string }>({
    imdbRating: item.imdbRating,
    genres: item.genres,
    poster: item.poster,
  });

  useEffect(() => {
    setExtraMeta({
      imdbRating: item.imdbRating,
      genres: item.genres,
      poster: item.poster,
    });
  }, [item.id, item.imdbRating, item.genres, item.poster]);

  // If rating or genres are missing from the preview, load detailed meta in background
  useEffect(() => {
    const hasValidRating =
      !!item.imdbRating &&
      item.imdbRating !== 'N/A' &&
      item.imdbRating !== '' &&
      item.imdbRating !== '0';
    const hasValidGenres = Array.isArray(item.genres) && item.genres.length > 0;

    if (!hasValidRating || !hasValidGenres) {
      let isMounted = true;
      stremioService
        .fetchMeta(item.type, item.id)
        .then((detail) => {
          if (isMounted && detail) {
            setExtraMeta((prev) => {
              const genres =
                prev.genres && prev.genres.length > 0
                  ? prev.genres
                  : detail.genres || (detail as any).genre || [];
              const imdbRating = prev.imdbRating || detail.imdbRating;
              const poster = prev.poster || detail.poster;
              return {
                genres: Array.isArray(genres) ? genres : [genres],
                imdbRating,
                poster: optimizeImageUrl(poster, 'poster'),
              };
            });
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [item.id, item.type, item.imdbRating, item.genres]);

  const handleLibraryToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const state = stremioService.toggleLibraryItem(item);
    setInLibrary(state);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickPlay(item);
  };

  // High-Definition poster resolution optimization (upgrades small 180px images to crystal-clear 500px/750px HD)
  const rawPoster = extraMeta.poster || item.poster;
  const posterSrc = !imgError && rawPoster
    ? (optimizeImageUrl(rawPoster, 'poster') || rawPoster)
    : `https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=85`;

  // Detect if cover is light/bright in top badge area to dynamically darken/increase opacity
  useEffect(() => {
    let isMounted = true;
    checkPosterLuminance(posterSrc).then((isLight) => {
      if (isMounted) setIsLightCover(isLight);
    });
    return () => {
      isMounted = false;
    };
  }, [posterSrc]);

  const releaseYear = getReleaseYear(item.releaseInfo);
  const isMovie = item.type === 'movie';
  const typeLabel = isMovie ? 'Film' : 'Serie TV';

  const effectiveGenres =
    extraMeta.genres && extraMeta.genres.length > 0 ? extraMeta.genres : item.genres;
  const genreLabel =
    effectiveGenres && effectiveGenres.length > 0
      ? effectiveGenres.slice(0, 2).join(' • ')
      : (isMovie ? 'Cinema' : 'Serie TV');

  const effectiveRating = extraMeta.imdbRating || item.imdbRating;
  const displayRating =
    effectiveRating &&
    effectiveRating !== 'N/A' &&
    effectiveRating !== '' &&
    effectiveRating !== '0'
      ? typeof effectiveRating === 'number'
        ? effectiveRating.toFixed(1)
        : String(effectiveRating)
      : null;

  return (
    <div
      id={`media-card-${item.id}`}
      onClick={() => onSelect(item)}
      onMouseEnter={() => stremioService.preloadStream(item.type, item.id)}
      className={`group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none transition-all duration-300 hover:-translate-y-1.5 bg-gradient-to-b from-[#181826]/85 via-[#0e0e18]/90 to-[#08080f] ${
        rank
          ? rank === 1
            ? 'border-2 border-amber-400/80 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(245,158,11,0.25)] hover:border-amber-300 hover:shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.45)]'
            : rank === 2
            ? 'border-2 border-slate-300/80 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.2)] hover:border-white hover:shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.35)]'
            : rank === 3
            ? 'border-2 border-amber-600/80 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(217,119,6,0.25)] hover:border-amber-500 hover:shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(217,119,6,0.4)]'
            : isMovie
            ? 'border-2 border-rose-500/70 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_18px_rgba(244,63,94,0.2)] hover:border-rose-400 hover:shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(244,63,94,0.35)]'
            : 'border-2 border-purple-500/70 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_18px_rgba(168,85,247,0.2)] hover:border-purple-400 hover:shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(168,85,247,0.35)]'
          : isMovie
          ? 'border border-white/15 hover:border-rose-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(225,29,72,0.25)]'
          : 'border border-white/15 hover:border-purple-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(168,85,247,0.25)]'
      }`}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
        <img
          src={posterSrc}
          alt={item.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out filter brightness-95 group-hover:brightness-105 transform-gpu will-change-transform"
          loading="lazy"
          decoding="async"
        />

        {/* Solo se la copertina è chiara, aggiunge una morbida sfumatura scura superiore per non abbagliare */}
        {isLightCover && (
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/65 via-black/25 to-transparent pointer-events-none z-10 transition-opacity duration-300" />
        )}

        {/* Smooth Dark Gradient fading directly into the details below for a seamless unified look */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0e0e18] via-[#0e0e18]/80 to-transparent pointer-events-none z-10" />

        {/* ================= TOP-LEFT BADGES: TYPE BADGE & RANK ================= */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 flex-wrap pointer-events-none select-none">
          {/* Badge Film / Serie TV in liquid glass: colore differenziato per Film (Rosso/Rosa) e Serie TV (Viola/Porpora) */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-md backdrop-blur-xl transition-all ${
              isMovie
                ? isLightCover
                  ? 'liquid-glass-transparent-dark border border-rose-500/50 text-rose-300 shadow-[0_4px_16px_rgba(0,0,0,0.85)]'
                  : 'liquid-glass-transparent border border-rose-500/40 text-rose-300'
                : isLightCover
                  ? 'liquid-glass-transparent-dark border border-purple-500/50 text-purple-300 shadow-[0_4px_16px_rgba(0,0,0,0.85)]'
                  : 'liquid-glass-transparent border border-purple-500/40 text-purple-300'
            }`}
          >
            {isMovie ? (
              <Film className="w-3 h-3 text-rose-400" />
            ) : (
              <Tv className="w-3 h-3 text-purple-400" />
            )}
            <span>{typeLabel}</span>
          </div>

          {/* Rank Badge (#1, #2...) se presente */}
          {rank !== undefined && rank <= 10 && (
            <div>
              {rank === 1 ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#0a0a14]/92 backdrop-blur-2xl border-2 border-amber-400 shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_14px_rgba(245,158,11,0.55)]">
                  <Crown className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
                  <span className="text-[11px] font-black tracking-tight text-white font-cinematic">#1</span>
                </div>
              ) : rank === 2 ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#0a0a14]/92 backdrop-blur-2xl border-2 border-slate-200 shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_14px_rgba(255,255,255,0.4)]">
                  <Medal className="w-3 h-3 text-slate-200 fill-slate-200" />
                  <span className="text-[11px] font-black tracking-tight text-white font-cinematic">#2</span>
                </div>
              ) : rank === 3 ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#0a0a14]/92 backdrop-blur-2xl border-2 border-amber-500 shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_14px_rgba(217,119,6,0.45)]">
                  <Medal className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-black tracking-tight text-white font-cinematic">#3</span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-xl bg-[#0a0a14]/92 backdrop-blur-2xl border-2 ${
                    isMovie
                      ? 'border-rose-500/80 shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_12px_rgba(244,63,94,0.45)]'
                      : 'border-purple-500/80 shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_12px_rgba(168,85,247,0.45)]'
                  }`}
                >
                  <Flame
                    className={`w-3 h-3 ${
                      isMovie ? 'text-rose-400 fill-rose-400' : 'text-purple-400 fill-purple-400'
                    }`}
                  />
                  <span className="text-[11px] font-black tracking-tight text-white font-cinematic">#{rank}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Right Badges: Valutazione in liquid glass, più scura/opaca solo nelle copertine chiare */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none z-20">
          {displayRating && (
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-amber-300 shadow-lg backdrop-blur-xl ${
                isLightCover
                  ? 'liquid-glass-transparent-dark border border-amber-400/60 shadow-[0_4px_16px_rgba(0,0,0,0.85)]'
                  : 'liquid-glass-transparent border border-amber-400/40'
              }`}
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 drop-shadow-sm" />
              <span>{displayRating}</span>
            </div>
          )}
        </div>

        {/* Quick Actions Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto bg-black/45 backdrop-blur-[2px]">
          <button
            onClick={handlePlayClick}
            title="Riproduci ora"
            className="w-12 h-12 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-400 text-white flex items-center justify-center shadow-xl shadow-red-600/60 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border border-white/30"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>

          <button
            onClick={handleLibraryToggle}
            title={inLibrary ? 'Rimuovi dalla Libreria' : 'Aggiungi alla Libreria'}
            className={`w-10 h-10 rounded-full liquid-glass-transparent border flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg hover:scale-110 active:scale-95 ${
              inLibrary
                ? 'bg-emerald-500/30 border-emerald-400/60 text-emerald-300'
                : 'hover:bg-white/20 border-white/30 text-white'
            }`}
          >
            {inLibrary ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Media Details Footer: Fuso con la locandina (cosa tutta unica) con categoria sotto l'anno per altezze uniformi */}
      <div className="px-3.5 pb-3.5 pt-1.5 flex flex-col justify-between flex-1 bg-[#0e0e18] space-y-1 relative z-10">
        {/* Titolo */}
        <div>
          <h3
            className={`text-sm sm:text-[15px] font-bold text-white tracking-tight truncate transition-colors drop-shadow-sm ${
              isMovie ? 'group-hover:text-rose-400' : 'group-hover:text-purple-400'
            }`}
            title={item.name}
          >
            {item.name}
          </h3>
        </div>

        {/* Anno (prima riga) */}
        <div className="text-[11px] font-semibold text-slate-300 leading-tight">
          {releaseYear || '—'}
        </div>

        {/* Categoria / Genere (sotto l'anno, con truncate per garantire schede uniformate) */}
        <div className="text-[11px] text-slate-400 font-medium truncate leading-tight" title={genreLabel || ''}>
          {genreLabel || (isMovie ? 'Cinema' : 'Serie TV')}
        </div>
      </div>
    </div>
  );
};
