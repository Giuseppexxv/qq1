import React, { useState } from 'react';
import { Play, Star, Plus, Check, Crown, Medal, Flame, Film, Tv } from 'lucide-react';
import { StremioMetaPreview } from '../types/stremio';
import { stremioService } from '../services/stremioService';
import { getReleaseYear } from '../utils/formatters';

interface MediaCardProps {
  item: StremioMetaPreview;
  rank?: number;
  onSelect: (item: StremioMetaPreview) => void;
  onQuickPlay: (item: StremioMetaPreview) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, rank, onSelect, onQuickPlay }) => {
  const [imgError, setImgError] = useState(false);
  const [inLibrary, setInLibrary] = useState(() => stremioService.isInLibrary(item.id));

  const handleLibraryToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const state = stremioService.toggleLibraryItem(item);
    setInLibrary(state);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickPlay(item);
  };

  // Fallback poster if item poster fails or is missing
  const posterSrc = !imgError && item.poster
    ? item.poster
    : `https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80`;

  const releaseYear = getReleaseYear(item.releaseInfo);
  const isMovie = item.type === 'movie';
  const typeLabel = isMovie ? 'Film' : 'Serie TV';
  const genreLabel = item.genres && item.genres.length > 0 ? item.genres.slice(0, 2).join(' • ') : null;

  return (
    <div
      id={`media-card-${item.id}`}
      onClick={() => onSelect(item)}
      onMouseEnter={() => stremioService.preloadStream(item.type, item.id)}
      className={`group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none transition-all duration-300 hover:-translate-y-2 bg-gradient-to-b from-[#181826]/85 via-[#0e0e18]/90 to-[#08080f] ${
        rank
          ? rank === 1
            ? 'border-2 border-amber-400/80 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(245,158,11,0.25)] hover:border-amber-300 hover:shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.45)]'
            : rank === 2
            ? 'border-2 border-slate-300/80 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.2)] hover:border-white hover:shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.35)]'
            : rank === 3
            ? 'border-2 border-amber-600/80 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(217,119,6,0.25)] hover:border-amber-500 hover:shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(217,119,6,0.4)]'
            : 'border-2 border-rose-500/70 shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_18px_rgba(244,63,94,0.2)] hover:border-rose-400 hover:shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(244,63,94,0.35)]'
          : 'border border-white/15 hover:border-rose-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(225,29,72,0.25)]'
      }`}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
        <img
          src={posterSrc}
          alt={item.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out filter brightness-95 group-hover:brightness-105"
          loading="lazy"
        />

        {/* Liquid Glass Convex Reflection Highlight */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent pointer-events-none" />

        {/* Smooth Dark Gradient from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-transparent to-transparent opacity-85 pointer-events-none" />

        {/* ================= TOP RANK BADGE ================= */}
        {rank !== undefined && rank <= 10 && (
          <div className="absolute top-2 left-2 z-20 pointer-events-none select-none">
            {rank === 1 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0a0a14]/92 backdrop-blur-2xl border-2 border-amber-400 shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_14px_rgba(245,158,11,0.55)]">
                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                <span className="text-xs font-black tracking-tight text-white font-cinematic">#1</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">TOP</span>
              </div>
            ) : rank === 2 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0a0a14]/92 backdrop-blur-2xl border-2 border-slate-200 shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_14px_rgba(255,255,255,0.4)]">
                <Medal className="w-3.5 h-3.5 text-slate-200 fill-slate-200" />
                <span className="text-xs font-black tracking-tight text-white font-cinematic">#2</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">TOP</span>
              </div>
            ) : rank === 3 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0a0a14]/92 backdrop-blur-2xl border-2 border-amber-500 shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_14px_rgba(217,119,6,0.45)]">
                <Medal className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-xs font-black tracking-tight text-white font-cinematic">#3</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">TOP</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0a0a14]/92 backdrop-blur-2xl border-2 border-rose-500/80 shadow-[0_6px_20px_rgba(0,0,0,0.95),0_0_12px_rgba(244,63,94,0.45)]">
                <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span className="text-xs font-black tracking-tight text-white font-cinematic">#{rank}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-300">TOP</span>
              </div>
            )}
          </div>
        )}

        {/* Top-Right Badges (Rating) */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 pointer-events-none z-10">
          {item.imdbRating && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full liquid-glass-transparent border border-amber-400/40 text-[11px] font-bold text-amber-300 shadow-lg">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{item.imdbRating}</span>
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

      {/* Media Details Footer in Liquid Glass */}
      <div className="p-3 flex flex-col justify-between flex-1 bg-gradient-to-b from-white/[0.04] to-transparent border-t border-white/[0.08] space-y-2">
        {/* Title */}
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-1 group-hover:text-rose-400 transition-colors drop-shadow-sm" title={item.name}>
            {item.name}
          </h3>
        </div>

        {/* Metadata Row: Voto, Anno, Tipo */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            {/* Voto */}
            {item.imdbRating && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                <span>{item.imdbRating}</span>
              </span>
            )}

            {/* Anno */}
            {releaseYear && (
              <span className="font-semibold text-slate-300 px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/15 text-[10px]">
                {releaseYear}
              </span>
            )}

            {/* Tipo */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1">
              {isMovie ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />}
              <span>{typeLabel}</span>
            </span>
          </div>

          {/* Categoria / Genere */}
          {genreLabel && (
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {genreLabel}
            </div>
          )}
        </div>

        {/* Bottom Quick Action Bar (Riproduci + Aggiungi alla Libreria) */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
          <button
            onClick={handlePlayClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-red-600/90 to-rose-600/90 hover:from-red-500 hover:to-rose-500 text-white text-[11px] font-bold shadow-md shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
            title="Riproduci ora"
          >
            <Play className="w-3 h-3 fill-current ml-0.5" />
            <span>Riproduci</span>
          </button>

          <button
            onClick={handleLibraryToggle}
            className={`p-1.5 rounded-xl liquid-glass-transparent border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              inLibrary
                ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300'
                : 'text-slate-300 hover:text-white border-white/20'
            }`}
            title={inLibrary ? 'In Libreria' : 'Aggiungi alla Libreria'}
          >
            {inLibrary ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
