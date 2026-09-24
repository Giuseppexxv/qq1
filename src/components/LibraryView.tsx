import React, { useState, useEffect } from 'react';
import { Bookmark, Clock, Play, Trash2, Film } from 'lucide-react';
import { StremioMetaPreview, StremioMetaDetail, StremioStream } from '../types/stremio';
import { stremioService } from '../services/stremioService';
import { MediaCard } from './MediaCard';

interface LibraryViewProps {
  onSelectMedia: (item: StremioMetaPreview) => void;
  onPlayStream: (media: StremioMetaDetail, stream?: StremioStream, video?: any) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onSelectMedia, onPlayStream }) => {
  const [library, setLibrary] = useState<StremioMetaPreview[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    setLibrary(stremioService.getLibrary());
    setHistory(stremioService.getHistory());
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('liquid_stremio_history_v1');
    setHistory([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-24 sm:pt-28 pb-12 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Bookmark className="w-4 h-4" />
          </span>
          <span className="text-xs uppercase font-bold tracking-widest text-cyan-400">
            Collezione Personale
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          La Mia Libreria & Cronologia
        </h1>
      </div>

      {/* Continue Watching History Section */}
      {history.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Continua a Guardare</span>
            </h3>
            <button
              onClick={clearHistory}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancella Cronologia</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {history.map((h, i) => (
              <div
                key={i}
                onClick={() => onSelectMedia({ id: h.id, type: h.type, name: h.name, poster: h.poster })}
                className="p-3 rounded-2xl liquid-glass hover:bg-white/[0.08] border border-white/10 flex items-center gap-3 cursor-pointer group transition-all"
              >
                <div className="w-12 h-16 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0">
                  <img
                    src={h.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'}
                    alt={h.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-rose-200 transition-colors truncate">
                    {h.name}
                  </h4>
                  {h.episodeTitle ? (
                    <p className="text-[11px] text-rose-300 truncate">
                      S{h.season}:E{h.episode} {h.episodeTitle}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 truncate">
                      {h.streamName || 'Riproduzione'}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(h.lastWatched).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-red-600/20 group-hover:bg-red-600 group-hover:text-white text-rose-300 flex items-center justify-center transition-all flex-shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Library Watchlist Items */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-rose-400" />
          <span>Salvati nella Libreria</span>
          <span className="text-xs text-slate-400 font-normal">({library.length})</span>
        </h3>

        {library.length === 0 ? (
          <div className="p-12 rounded-3xl liquid-glass border border-white/10 text-center space-y-3">
            <Film className="w-10 h-10 text-slate-500 mx-auto opacity-60" />
            <h4 className="text-base font-semibold text-slate-300">La tua libreria è vuota</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Esplora Scopri, Film o Serie TV e tocca l'icona '+' su qualsiasi locandina per salvarla qui per un accesso rapido.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {library.map((item, idx) => (
              <MediaCard
                key={`${item.id}-${idx}`}
                item={item}
                onSelect={onSelectMedia}
                onQuickPlay={(m) => {
                  onPlayStream(m as StremioMetaDetail);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
