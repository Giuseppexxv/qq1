import React, { useState } from 'react';
import { Play, Star, Plus, Check } from 'lucide-react';
import { StremioMetaPreview } from '../types/stremio';
import { stremioService } from '../services/stremioService';

interface MediaCardProps {
  item: StremioMetaPreview;
  onSelect: (item: StremioMetaPreview) => void;
  onQuickPlay: (item: StremioMetaPreview) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onSelect, onQuickPlay }) => {
  const [imgError, setImgError] = useState(false);
  const [inLibrary, setInLibrary] = useState(() => stremioService.isInLibrary(item.id));

  const handleLibraryToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const state = stremioService.toggleLibraryItem(item);
    setInLibrary(state);
  };

  // Fallback poster if item poster fails or is missing
  const posterSrc = !imgError && item.poster
    ? item.poster
    : `https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80`;

  return (
    <div
      id={`media-card-${item.id}`}
      onClick={() => onSelect(item)}
      className="group relative flex flex-col rounded-2xl overflow-hidden liquid-glass-card cursor-pointer select-none"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
        <img
          src={posterSrc}
          alt={item.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Liquid Glass Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

        {/* Badges Top Bar */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {/* Rating */}
          {item.imdbRating ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/70 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-amber-300 shadow-sm">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{item.imdbRating}</span>
            </div>
          ) : (
            <div />
          )}

          {/* Type Badge */}
          <span className="px-2 py-0.5 rounded-md bg-slate-950/70 backdrop-blur-md border border-white/10 text-[10px] font-medium uppercase tracking-wider text-cyan-300">
            {item.type}
          </span>
        </div>

        {/* Quick Actions Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto">
          {/* Play Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickPlay(item);
            }}
            title="Stream Now"
            className="w-12 h-12 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/50 hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>

          {/* Add to Library Button */}
          <button
            onClick={handleLibraryToggle}
            title={inLibrary ? 'Remove from Library' : 'Add to Library'}
            className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-200 ${
              inLibrary
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-slate-950/60 hover:bg-slate-950/90 border-white/20 text-white'
            }`}
          >
            {inLibrary ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Media Details Footer */}
      <div className="p-3 flex flex-col justify-between flex-1">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight line-clamp-1 group-hover:text-cyan-200 transition-colors">
            {item.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
            {item.releaseInfo && <span>{item.releaseInfo}</span>}
            {item.genres && item.genres.length > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="truncate">{item.genres[0]}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
