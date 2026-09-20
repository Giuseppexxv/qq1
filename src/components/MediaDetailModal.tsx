import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Play,
  Star,
  Clock,
  Calendar,
  Radio,
  ExternalLink,
  Plus,
  Check,
  Film,
  Loader2,
  Tv,
  Sparkles,
} from 'lucide-react';
import {
  StremioMetaPreview,
  StremioMetaDetail,
  StremioStream,
  StremioVideo,
} from '../types/stremio';
import { stremioService } from '../services/stremioService';

interface MediaDetailModalProps {
  item: StremioMetaPreview | null;
  onClose: () => void;
  onPlayStream: (
    media: StremioMetaDetail,
    stream: StremioStream,
    video?: StremioVideo
  ) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  onClose,
  onPlayStream,
}) => {
  const [detail, setDetail] = useState<StremioMetaDetail | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [streams, setStreams] = useState<StremioStream[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [streamFilter, setStreamFilter] = useState<'all' | 'direct' | 'torrent'>('direct');
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedVideo, setSelectedVideo] = useState<StremioVideo | null>(null);
  const [inLibrary, setInLibrary] = useState(false);

  useEffect(() => {
    if (!item) return;

    setLoadingMeta(true);
    setDetail(null);
    setStreams([]);
    setSelectedVideo(null);
    setInLibrary(stremioService.isInLibrary(item.id));

    stremioService
      .fetchMeta(item.type, item.id)
      .then((meta) => {
        const fullMeta: StremioMetaDetail = meta || { ...item };
        setDetail(fullMeta);
        setLoadingMeta(false);

        // If series, pick first episode
        if (fullMeta.type === 'series' && fullMeta.videos && fullMeta.videos.length > 0) {
          const firstEp = fullMeta.videos[0];
          setSelectedVideo(firstEp);
          setSelectedSeason(firstEp.season || 1);
          loadStreams(fullMeta.type, firstEp.id);
        } else {
          loadStreams(fullMeta.type, fullMeta.id);
        }
      })
      .catch(() => {
        const fallback = { ...item };
        setDetail(fallback);
        setLoadingMeta(false);
        loadStreams(fallback.type, fallback.id);
      });
  }, [item]);

  // Priority scoring helper
  const getStreamScore = (s: StremioStream): number => {
    const name = (s.name || '').toLowerCase();
    const title = (s.title || '').toLowerCase();
    const hasUrl = !!s.url && s.url.trim().length > 0;
    const isTorrent = !hasUrl || !!s.infoHash || name.includes('torrent');
    const isToastflix = name.includes('toastflix') || title.includes('toastflix');
    const isIta = isToastflix || title.includes('ita') || name.includes('ita');

    let score = 0;
    if (!isTorrent && hasUrl) score += 1000;
    if (isToastflix) score += 2000;
    if (isIta) score += 500;
    if (isTorrent) score -= 500;
    return score;
  };

  const loadStreams = (type: string, id: string) => {
    setLoadingStreams(true);
    setStreams([]);
    stremioService
      .fetchStreamsProgressive(type, id, (batch) => {
        setStreams((prev) => {
          const existing = new Set(prev.map((s) => s.url || s.infoHash || s.title));
          const newUnique = batch.filter((s) => !existing.has(s.url || s.infoHash || s.title));
          const combined = [...prev, ...newUnique];
          combined.sort((a, b) => getStreamScore(b) - getStreamScore(a));
          return combined;
        });
        setLoadingStreams(false);
      })
      .then((res) => {
        const sorted = [...res].sort((a, b) => getStreamScore(b) - getStreamScore(a));
        setStreams(sorted);
        setLoadingStreams(false);
      })
      .catch(() => {
        setLoadingStreams(false);
      });
  };

  // Filtered streams according to user choice (defaults to direct; if none and loading finished, falls back to all)
  const displayedStreams = useMemo(() => {
    const directStreams = streams.filter((s) => {
      const hasDirectUrl = !!s.url && s.url.trim().length > 0;
      const isTorrent = !hasDirectUrl && (!!s.infoHash || s.name?.toLowerCase().includes('torrent'));
      return !isTorrent && hasDirectUrl;
    });

    if (streamFilter === 'direct') {
      if (directStreams.length > 0 || loadingStreams) {
        return directStreams;
      }
      // If no direct streams exist and loading finished, fallback to all so user isn't stuck with empty list
      return streams;
    }
    if (streamFilter === 'torrent') {
      return streams.filter((s) => {
        const hasDirectUrl = !!s.url && s.url.trim().length > 0;
        return !hasDirectUrl && (!!s.infoHash || s.name?.toLowerCase().includes('torrent'));
      });
    }
    return streams;
  }, [streams, streamFilter, loadingStreams]);

  // First direct stream if available for quick 1-click play
  const primaryDirectStream = useMemo(() => {
    return streams.find((s) => {
      const hasDirectUrl = !!s.url && s.url.trim().length > 0;
      const isTorrent = !hasDirectUrl && (!!s.infoHash || s.name?.toLowerCase().includes('torrent'));
      return !isTorrent && hasDirectUrl;
    });
  }, [streams]);

  if (!item) return null;

  const handleLibraryToggle = () => {
    if (detail) {
      const state = stremioService.toggleLibraryItem(detail);
      setInLibrary(state);
    }
  };

  // Group series episodes by season
  const seasonsMap: Record<number, StremioVideo[]> = {};
  if (detail?.videos) {
    detail.videos.forEach((vid) => {
      const s = vid.season || 1;
      if (!seasonsMap[s]) seasonsMap[s] = [];
      seasonsMap[s].push(vid);
    });
  }
  const availableSeasons = Object.keys(seasonsMap).map(Number).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl rounded-3xl liquid-glass-elevated border border-white/15 overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col">
        {/* Backdrop Banner Header */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden flex-shrink-0 bg-slate-900">
          <img
            src={detail?.background || detail?.poster || item.poster}
            alt={detail?.name || item.name}
            className="w-full h-full object-cover object-top opacity-50 filter saturate-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950/60 hover:bg-slate-950/90 text-slate-300 hover:text-white border border-white/15 flex items-center justify-center backdrop-blur-md transition-all duration-200 z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title and Meta Info inside Banner */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold uppercase tracking-wider">
                  {detail?.type || item.type}
                </span>
                {detail?.releaseInfo && (
                  <span className="flex items-center gap-1 text-xs text-slate-300 bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {detail.releaseInfo}
                  </span>
                )}
                {detail?.runtime && (
                  <span className="flex items-center gap-1 text-xs text-slate-300 bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {detail.runtime}
                  </span>
                )}
                {detail?.imdbRating && (
                  <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25 font-bold">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {detail.imdbRating}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {detail?.name || item.name}
              </h2>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {primaryDirectStream && (
                <button
                  onClick={() => onPlayStream(detail!, primaryDirectStream, selectedVideo || undefined)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
                  title="Direct Stream without Torrent buffering"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Avvia Subito (Diretto)</span>
                </button>
              )}
              <button
                onClick={handleLibraryToggle}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all ${
                  inLibrary
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.08] hover:bg-white/[0.15] border-white/20 text-white'
                }`}
              >
                {inLibrary ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{inLibrary ? 'In Library' : 'Add to Library'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Overview Synopsis */}
          {detail?.description && (
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
                Synopsis
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                {detail.description}
              </p>
            </div>
          )}

          {/* Cast & Crew Pills */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            {detail?.director && detail.director.length > 0 && (
              <div>
                <span className="text-slate-500 font-medium">Director: </span>
                <span className="text-slate-200">{detail.director.join(', ')}</span>
              </div>
            )}
            {detail?.cast && detail.cast.length > 0 && (
              <div>
                <span className="text-slate-500 font-medium">Cast: </span>
                <span className="text-slate-200">{detail.cast.slice(0, 4).join(', ')}</span>
              </div>
            )}
            {detail?.genres && detail.genres.length > 0 && (
              <div>
                <span className="text-slate-500 font-medium">Genres: </span>
                <span className="text-cyan-300">{detail.genres.join(', ')}</span>
              </div>
            )}
          </div>

          {/* TV Series Season & Episode Selector */}
          {detail?.type === 'series' && availableSeasons.length > 0 && (
            <div className="p-4 rounded-2xl liquid-glass border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-cyan-400" />
                  <span>Episodes</span>
                </h4>
                {/* Season Tabs */}
                <div className="flex items-center gap-1">
                  {availableSeasons.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSeason(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        selectedSeason === s
                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                          : 'bg-white/[0.05] text-slate-400 hover:text-white'
                      }`}
                    >
                      Season {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Episodes List Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {(seasonsMap[selectedSeason] || []).map((ep) => {
                  const isSelected = selectedVideo?.id === ep.id;
                  return (
                    <div
                      key={ep.id}
                      onClick={() => {
                        setSelectedVideo(ep);
                        loadStreams('series', ep.id);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                          {ep.episode || 1}
                        </span>
                        <span className="text-xs font-medium truncate">
                          {ep.title || `Episode ${ep.episode}`}
                        </span>
                      </div>
                      <Play className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Streams Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Available Streams</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({displayedStreams.length} of {streams.length})
                </span>
              </h4>

              <div className="flex items-center gap-2">
                {/* Filter Pills */}
                {streams.length > 0 && (
                  <div className="flex items-center bg-white/[0.06] p-0.5 rounded-lg border border-white/10 text-xs">
                    <button
                      onClick={() => setStreamFilter('all')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        streamFilter === 'all'
                          ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tutti ({streams.length})
                    </button>
                    <button
                      onClick={() => setStreamFilter('direct')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                        streamFilter === 'direct'
                          ? 'bg-amber-500/20 text-amber-300 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🥪 Diretti / ITA</span>
                    </button>
                    <button
                      onClick={() => setStreamFilter('torrent')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                        streamFilter === 'torrent'
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Torrent P2P</span>
                    </button>
                  </div>
                )}

                {loadingStreams && (
                  <div className="flex items-center gap-1.5 text-xs text-cyan-400 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching...</span>
                  </div>
                )}
              </div>
            </div>

            {loadingStreams && streams.length === 0 ? (
              <div className="p-8 rounded-2xl liquid-glass border border-white/10 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                <p className="text-xs">Querying Cinemeta and P2P Torrent Add-ons...</p>
              </div>
            ) : displayedStreams.length === 0 ? (
              <div className="p-6 rounded-2xl liquid-glass border border-white/10 text-center">
                <p className="text-xs text-slate-400 mb-2">
                  {streamFilter === 'direct'
                    ? 'Nessun flusso diretto trovato per questo titolo (prova a selezionare "Tutti" o installa add-on aggiuntivi).'
                    : 'No streams found on current enabled add-ons for this title.'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Tip: You can paste a Magnet link in the Torrent Client or install community streaming add-ons in the Add-on Manager.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {displayedStreams.map((stream, idx) => {
                  const hasDirectUrl = !!stream.url && stream.url.trim().length > 0;
                  const isTorrent = !hasDirectUrl && (!!stream.infoHash || stream.name?.toLowerCase().includes('torrent'));
                  const isToastflix = stream.name?.toLowerCase().includes('toastflix') || stream.title?.toLowerCase().includes('toastflix');
                  const isDirect = hasDirectUrl;
                  const isItalian = isToastflix || stream.title?.toLowerCase().includes('ita') || stream.name?.toLowerCase().includes('ita');

                  return (
                    <div
                      key={idx}
                      onClick={() => onPlayStream(detail!, stream, selectedVideo || undefined)}
                      className={`group p-3.5 rounded-2xl liquid-glass hover:bg-white/[0.09] border flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 ${
                        isToastflix
                          ? 'border-amber-500/30 hover:border-amber-400/60 bg-amber-500/[0.03]'
                          : isTorrent
                          ? 'border-emerald-500/30 hover:border-emerald-400/60'
                          : 'border-white/10 hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Source Icon Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isToastflix
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isTorrent
                              ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                          }`}
                        >
                          {isToastflix ? (
                            <span className="text-base">🥪</span>
                          ) : isTorrent ? (
                            <Radio className="w-4 h-4" />
                          ) : (
                            <Film className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-white group-hover:text-cyan-200 transition-colors truncate">
                              {stream.name || 'Stream Source'}
                            </span>
                            {isToastflix && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                                <span>Direct ITA</span>
                              </span>
                            )}
                            {isItalian && !isToastflix && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                                ITA
                              </span>
                            )}
                            {isDirect && !isToastflix && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                                Direct Stream
                              </span>
                            )}
                            {isTorrent && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                P2P Swarm
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {stream.title || stream.url || 'High Definition Stream'}
                          </p>
                        </div>
                      </div>

                      {/* Play Stream Button */}
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 group-hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-all flex-shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
