import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  X,
  PictureInPicture2,
  Loader2,
  Film,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Scan,
  Tv,
} from 'lucide-react';
import {
  StremioMetaDetail,
  StremioStream,
  StremioVideo,
  StremioSubtitle,
} from '../types/stremio';
import { stremioService } from '../services/stremioService';

interface LiquidPlayerProps {
  media: StremioMetaDetail;
  stream?: StremioStream | null;
  video?: StremioVideo;
  onClose: () => void;
}

interface AudioTrackInfo {
  id: number;
  name: string;
  lang?: string;
}

interface QualityLevelInfo {
  id: number;
  height: number;
  bitrate: number;
  name: string;
}

// Universal stream proxy URL builder
function getStreamProxyUrl(targetUrl: string, streamObj: StremioStream): string {
  if (!targetUrl || targetUrl.startsWith('blob:')) return targetUrl;
  if (targetUrl.startsWith('/api/stream-proxy')) return targetUrl;

  let customHeaders: Record<string, string> = {};
  if (streamObj.behaviorHints?.proxyHeaders) {
    const raw =
      (streamObj.behaviorHints.proxyHeaders as any).request ||
      streamObj.behaviorHints.proxyHeaders;
    if (typeof raw === 'object' && raw !== null) {
      customHeaders = { ...raw };
    }
  }

  const isHls = targetUrl.includes('.m3u8') || streamObj.name?.toLowerCase().includes('hls');
  const needsProxy =
    isHls ||
    Object.keys(customHeaders).length > 0 ||
    streamObj.behaviorHints?.notWebReady ||
    !targetUrl.startsWith(window.location.origin);

  if (needsProxy) {
    let proxied = `/api/stream-proxy?url=${encodeURIComponent(targetUrl)}`;
    if (Object.keys(customHeaders).length > 0) {
      proxied += `&headers=${encodeURIComponent(JSON.stringify(customHeaders))}`;
      if (customHeaders['Referer']) {
        proxied += `&referer=${encodeURIComponent(customHeaders['Referer'])}`;
      }
      if (customHeaders['Origin']) {
        proxied += `&origin=${encodeURIComponent(customHeaders['Origin'])}`;
      }
    }
    return proxied;
  }

  return targetUrl;
}

export const LiquidPlayer: React.FC<LiquidPlayerProps> = ({
  media,
  stream: initialStream,
  video: initialVideo,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Web Audio booster
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Active stream and video resolution state
  const [activeStream, setActiveStream] = useState<StremioStream | null>(
    initialStream && (initialStream.url || initialStream.externalUrl) ? initialStream : null
  );
  const [activeVideo, setActiveVideo] = useState<StremioVideo | undefined>(initialVideo);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [volumeBoost, setVolumeBoost] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [aspectFit, setAspectFit] = useState<'contain' | 'cover'>('contain');

  // Multi-Track info
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
  const [qualityLevels, setQualityLevels] = useState<QualityLevelInfo[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1);

  // Subtitles
  const [subtitles, setSubtitles] = useState<StremioSubtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);

  // Loading & Diagnostics
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState<string>('Connessione in corso...');
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Double-tap skip visual feedback
  const [skipRipple, setSkipRipple] = useState<'left' | 'right' | null>(null);
  const rippleTimerRef = useRef<any>(null);

  // Hover Scrubber Preview
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const controlsTimeoutRef = useRef<any>(null);

  // Setup Web Audio Booster
  const setupAudioBooster = useCallback(() => {
    if (!videoRef.current || audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaElementSource(videoRef.current);
      const gain = ctx.createGain();
      gain.gain.value = volumeBoost;
      source.connect(gain);
      gain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      gainNodeRef.current = gain;
      audioSourceRef.current = source;
    } catch {
      // AudioContext policy
    }
  }, [volumeBoost]);

  // Automatic stream resolution from ToastFlix if not provided
  useEffect(() => {
    let isCancelled = false;

    async function resolveStream() {
      setIsLoading(true);
      setLoadingText('Connessione in corso...');
      setPlaybackError(null);

      try {
        let streamTargetId = media.id;
        let resolvedVideo = activeVideo;

        // If series, ensure we have an episode target
        if (media.type === 'series') {
          if (!resolvedVideo) {
            if (media.videos && media.videos.length > 0) {
              resolvedVideo = media.videos[0];
              setActiveVideo(resolvedVideo);
              streamTargetId = resolvedVideo.id;
            } else {
              setLoadingText('Aspetta, connessione in corso...');
              const meta = await stremioService.fetchMeta('series', media.id);
              if (isCancelled) return;
              if (meta?.videos && meta.videos.length > 0) {
                resolvedVideo = meta.videos[0];
                setActiveVideo(resolvedVideo);
                streamTargetId = resolvedVideo.id;
              }
            }
          } else {
            streamTargetId = resolvedVideo.id;
          }
        }

        // Fetch streams from primary addon (ToastFlix / Vixsrc)
        let streams = await stremioService.fetchStreams(media.type, streamTargetId);
        if (isCancelled) return;

        // If primary addon has no streams or empty, try secondary addon with explicit user message
        if (!streams || streams.length === 0) {
          setLoadingText('Attendi, cambio sorgente...');
          try {
            const secondaryStreams = await stremioService.fetchSecondaryStreams(
              media.type,
              streamTargetId
            );
            if (isCancelled) return;
            if (secondaryStreams && secondaryStreams.length > 0) {
              streams = secondaryStreams;
            }
          } catch {
            // continue
          }
        }

        if (streams.length > 0) {
          // Select best stream (prefer direct url over extractor if available, or first available)
          const directStream = streams.find((s) => s.url && s.url.length > 0);
          const chosen = directStream || streams[0];
          setActiveStream(chosen);
        } else {
          setIsLoading(false);
          setPlaybackError(
            'Nessun flusso di riproduzione al momento disponibile per questo titolo. Riprova più tardi.'
          );
        }
      } catch (err: any) {
        if (isCancelled) return;
        // Fallback attempt on error
        setLoadingText('Attendi, cambio sorgente...');
        try {
          const streamTargetId = activeVideo?.id || media.id;
          const secondaryStreams = await stremioService.fetchSecondaryStreams(
            media.type,
            streamTargetId
          );
          if (isCancelled) return;
          if (secondaryStreams && secondaryStreams.length > 0) {
            const directStream = secondaryStreams.find((s) => s.url && s.url.length > 0);
            setActiveStream(directStream || secondaryStreams[0]);
            return;
          }
        } catch {
          // ignore
        }
        setIsLoading(false);
        setPlaybackError('Impossibile stabilire la connessione con la sorgente. Riprova più tardi.');
      }
    }

    if (!activeStream) {
      resolveStream();
    }

    return () => {
      isCancelled = true;
    };
  }, [media, activeVideo, activeStream]);

  // Mount Stream (Direct HLS / MP4 or Extractor)
  useEffect(() => {
    if (!activeStream) return;

    setIsLoading(true);
    setPlaybackError(null);
    setAudioTracks([]);
    setQualityLevels([]);

    // Save to watch history
    stremioService.saveHistoryItem({
      id: media.id,
      type: media.type,
      name: media.name,
      poster: media.poster,
      timestamp: Date.now(),
      streamName: activeStream.name,
      episodeTitle: activeVideo?.title,
      season: activeVideo?.season,
      episode: activeVideo?.episode,
    });

    // Fetch subtitles
    stremioService.fetchSubtitles(media.type, media.id).then((subs) => {
      setSubtitles(subs);
    });

    // Direct stream (MP4 / HLS)
    if (activeStream.url && videoRef.current) {
      const resolvedUrl = getStreamProxyUrl(activeStream.url, activeStream);
      const isHls =
        resolvedUrl.includes('.m3u8') ||
        activeStream.url.includes('.m3u8') ||
        activeStream.name?.toLowerCase().includes('hls');

      if (isHls && Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hls = new Hls({
          maxBufferLength: 25,
          maxMaxBufferLength: 50,
          enableWorker: true,
          lowLatencyMode: true,
          startFragPrefetch: true,
          capLevelToPlayerSize: true,
        });

        hls.loadSource(resolvedUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          if (data.levels && data.levels.length > 0) {
            const lvls: QualityLevelInfo[] = data.levels.map((lvl, index) => ({
              id: index,
              height: lvl.height,
              bitrate: lvl.bitrate,
              name: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`,
            }));
            setQualityLevels(lvls);
          }

          videoRef.current
            ?.play()
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
            })
            .catch(() => {
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                  })
                  .catch(() => {});
              }
              setIsLoading(false);
            });
        });

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
          if (data.audioTracks && data.audioTracks.length > 0) {
            const tracks: AudioTrackInfo[] = data.audioTracks.map((t) => ({
              id: t.id,
              name: t.name,
              lang: t.lang,
            }));
            setAudioTracks(tracks);
            setSelectedAudioTrack(hls.audioTrack);
          }
        });

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
          setSelectedAudioTrack(data.id);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setPlaybackError(
                  'Flusso momentaneamente non raggiungibile. Riprova più tardi.'
                );
                setIsLoading(false);
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else {
        videoRef.current.src = resolvedUrl;
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch(() => {
            setIsLoading(false);
          });
      }
    } else if (activeStream.externalUrl) {
      // Extractor stream in iframe
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [activeStream, media, activeVideo]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skipTime(-10);
          triggerSkipRipple('left');
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skipTime(10);
          triggerSkipRipple('right');
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume((v) => {
            const next = Math.min(1, v + 0.1);
            if (videoRef.current) videoRef.current.volume = next;
            return next;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume((v) => {
            const next = Math.max(0, v - 0.1);
            if (videoRef.current) videoRef.current.volume = next;
            return next;
          });
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume, duration]);

  const triggerSkipRipple = (direction: 'left' | 'right') => {
    if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current);
    setSkipRipple(direction);
    rippleTimerRef.current = setTimeout(() => setSkipRipple(null), 600);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMute = !isMuted;
    videoRef.current.muted = newMute;
    setIsMuted(newMute);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // PiP
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * (duration || 0));
  };

  const handleScrubberMouseLeave = () => {
    setHoverTime(null);
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * (duration || 0);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const isExtractorMode = !activeStream?.url && !!activeStream?.externalUrl;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Video Display Container */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {isExtractorMode ? (
          <iframe
            src={activeStream?.externalUrl}
            title={media.name}
            className="w-full h-full border-0 bg-black"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          />
        ) : (
          <video
            ref={videoRef}
            onClick={togglePlay}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                setDuration(videoRef.current.duration || 0);
              }
            }}
            onWaiting={() => setIsLoading(true)}
            onCanPlay={() => {
              setIsLoading(false);
              setPlaybackError(null);
            }}
            onError={() => {
              setIsLoading(false);
              setPlaybackError(
                'Impossibile riprodurre il flusso. Il server sorgente potrebbe essere temporaneamente occupato.'
              );
            }}
            onEnded={() => setIsPlaying(false)}
            className={`w-full h-full cursor-pointer transition-all duration-300 ${
              aspectFit === 'cover' ? 'object-cover' : 'object-contain'
            }`}
            playsInline
          >
            {selectedSubtitle && (
              <track
                kind="subtitles"
                src={selectedSubtitle}
                srcLang="it"
                label="Italiano"
                default
              />
            )}
          </video>
        )}

        {/* Double-tap Rewind Ripple Visual Feedback */}
        {skipRipple === 'left' && (
          <div className="absolute left-10 sm:left-24 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center gap-1.5 p-5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 animate-in fade-in zoom-in-75 duration-200">
            <RotateCcw className="w-8 h-8 text-cyan-400" />
            <span className="text-xs font-bold text-white font-mono">-10s</span>
          </div>
        )}

        {/* Double-tap Forward Ripple Visual Feedback */}
        {skipRipple === 'right' && (
          <div className="absolute right-10 sm:right-24 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center gap-1.5 p-5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 animate-in fade-in zoom-in-75 duration-200">
            <RotateCw className="w-8 h-8 text-cyan-400" />
            <span className="text-xs font-bold text-white font-mono">+10s</span>
          </div>
        )}
      </div>

      {/* Playback Error Modal */}
      {playbackError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="max-w-md w-full liquid-glass-elevated rounded-3xl p-6 border border-amber-500/40 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Avviso di Riproduzione</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{playbackError}</p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-red-600/30"
              >
                Torna al Catalogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner Overlay: 'Aspetta' o 'Connessione in corso...' */}
      {isLoading && !playbackError && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-4 bg-slate-950/75 backdrop-blur-md z-30">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
            <Film className="w-6 h-6 text-rose-400 absolute" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-bold text-white tracking-wide">
              {loadingText}
            </p>
            <p className="text-xs text-slate-400">
              {media.name} {activeVideo ? `• S${activeVideo.season || 1}:E${activeVideo.episode || 1}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Top Glass Header Bar */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 z-40 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full liquid-glass-transparent hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer border border-white/25 shadow-lg"
              title="Chiudi Player (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-1">
                  {media.name}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-red-600/20 text-rose-300 text-[10px] font-bold border border-red-500/30">
                  {media.type === 'series' ? 'Serie TV' : 'Film'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                {activeVideo ? (
                  <span className="text-rose-300 font-semibold">
                    Stagione {activeVideo.season || 1} • Episodio {activeVideo.episode || 1}
                    {activeVideo.title ? ` - ${activeVideo.title}` : ''}
                  </span>
                ) : (
                  <span>{media.releaseInfo || 'Cinema'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Top Right HUD Toggles */}
          <div className="flex items-center gap-2">
            {!isExtractorMode && (
              <button
                onClick={() => setAspectFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                className="px-2.5 py-1.5 rounded-xl liquid-glass-transparent hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/25 cursor-pointer shadow-lg"
                title="Adatta Schermo"
              >
                <Scan className="w-3.5 h-3.5" />
                <span className="hidden sm:inline capitalize">{aspectFit}</span>
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-xl liquid-glass-transparent hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/25 cursor-pointer shadow-lg"
              title="Schermo intero (F)"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Liquid Glass Player Controls (shown in direct video mode) */}
      {!isExtractorMode && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 z-40 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-w-4xl mx-auto liquid-glass-transparent rounded-2xl p-3 sm:p-4 border border-white/20 shadow-2xl space-y-3">
            {/* Custom Responsive Progress Bar Scrubber with Hover Time Bubble */}
            <div className="space-y-1">
              <div
                className="relative group/bar h-4 flex items-center cursor-pointer"
                onMouseMove={handleScrubberMouseMove}
                onMouseLeave={handleScrubberMouseLeave}
                onClick={handleScrubberClick}
              >
                {/* Background Track */}
                <div className="w-full h-1.5 group-hover/bar:h-2.5 bg-white/20 rounded-full overflow-hidden transition-all duration-150 relative">
                  {/* Played Progress */}
                  <div
                    className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-500 rounded-full"
                    style={{
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </div>

                {/* Hover Position Preview Line */}
                {hoverTime !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/70 pointer-events-none"
                    style={{ left: `${hoverPosition}%` }}
                  />
                )}

                {/* Hover Timestamp Bubble */}
                {hoverTime !== null && (
                  <div
                    className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900/90 text-rose-300 text-[10px] font-mono font-bold border border-white/20 pointer-events-none shadow-lg"
                    style={{ left: `${hoverPosition}%` }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
              </div>

              {/* Time Indicators */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-white font-semibold">{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between gap-3">
              {/* Left: Play/Pause, Skips, Volume */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play / Pause */}
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-transform active:scale-95 flex-shrink-0 cursor-pointer"
                  title="Riproduci / Pausa (Spazio)"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Skip -10s */}
                <button
                  onClick={() => {
                    skipTime(-10);
                    triggerSkipRipple('left');
                  }}
                  className="w-8 h-8 rounded-lg liquid-glass hover:bg-white/20 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                  title="Riavvolgi 10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Skip +10s */}
                <button
                  onClick={() => {
                    skipTime(10);
                    triggerSkipRipple('right');
                  }}
                  className="w-8 h-8 rounded-lg liquid-glass hover:bg-white/20 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                  title="Avanza 10s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-2 group/vol">
                  <button
                    onClick={toggleMute}
                    className="w-8 h-8 rounded-lg liquid-glass hover:bg-white/20 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                    title="Audio (M)"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (videoRef.current) {
                        videoRef.current.volume = v;
                        videoRef.current.muted = false;
                      }
                      setIsMuted(false);
                    }}
                    className="w-16 sm:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>
              </div>

              {/* Right: PiP, Fullscreen */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePiP}
                  className="w-8 h-8 rounded-lg liquid-glass hover:bg-white/20 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                  title="Picture in Picture"
                >
                  <PictureInPicture2 className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="w-8 h-8 rounded-lg liquid-glass hover:bg-white/20 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
                  title="Schermo intero (F)"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
