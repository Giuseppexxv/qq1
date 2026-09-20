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
  Radio,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Settings,
  MessageSquare,
  FileVideo,
  PictureInPicture2,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Languages,
  Sliders,
  Scan,
  Sparkles,
} from 'lucide-react';
import {
  StremioMetaDetail,
  StremioStream,
  StremioVideo,
  ActiveTorrent,
  StremioSubtitle,
} from '../types/stremio';
import { torrentService, buildMagnetURI } from '../services/torrentService';
import { stremioService } from '../services/stremioService';

interface LiquidPlayerProps {
  media: StremioMetaDetail;
  stream: StremioStream;
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

  // Extract proxyHeaders from behaviorHints
  let customHeaders: Record<string, string> = {};
  if (streamObj.behaviorHints?.proxyHeaders) {
    const raw =
      (streamObj.behaviorHints.proxyHeaders as any).request ||
      streamObj.behaviorHints.proxyHeaders;
    if (typeof raw === 'object' && raw !== null) {
      customHeaders = { ...raw };
    }
  }

  // Toastflix automatic referrer header
  if (targetUrl.includes('partite.cc') || streamObj.name?.toLowerCase().includes('toastflix')) {
    if (!customHeaders['Referer']) customHeaders['Referer'] = 'https://www.partite.cc/';
    if (!customHeaders['Origin']) customHeaders['Origin'] = 'https://www.partite.cc';
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
  stream,
  video,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Web Audio booster
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1); // 0.0 to 1.0 (standard slider)
  const [volumeBoost, setVolumeBoost] = useState(1.0); // 1.0 to 2.0 (extra gain boost)
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showTorrentHUD, setShowTorrentHUD] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [aspectFit, setAspectFit] = useState<'contain' | 'cover'>('contain');

  // Menus
  const [activeMenu, setActiveMenu] = useState<'speed' | 'audio' | 'quality' | 'subs' | null>(null);

  // HLS Multi-Track info
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
  const [qualityLevels, setQualityLevels] = useState<QualityLevelInfo[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 = Auto

  // Subtitles
  const [subtitles, setSubtitles] = useState<StremioSubtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);

  // Loading & Diagnostics
  const [isLoading, setIsLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [torrentInfo, setTorrentInfo] = useState<ActiveTorrent | null>(null);

  // Double-tap skip visual feedback
  const [skipRipple, setSkipRipple] = useState<'left' | 'right' | null>(null);
  const rippleTimerRef = useRef<any>(null);

  // Hover Scrubber Preview
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const controlsTimeoutRef = useRef<any>(null);

  // Direct vs Torrent detection
  // If stream has a direct URL, it is NEVER a torrent!
  const hasDirectUrl = !!stream.url && stream.url.trim().length > 0;
  const isTorrent = !hasDirectUrl && (!!stream.infoHash || stream.name?.toLowerCase().includes('torrent'));
  const isToastflix = stream.name?.toLowerCase().includes('toastflix');

  // Initialize Web Audio Booster
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
    } catch (e) {
      // AudioContext might already be bound or blocked by browser autoplay policy
    }
  }, [volumeBoost]);

  // Apply Volume Boost
  const handleBoostChange = (boost: number) => {
    setVolumeBoost(boost);
    if (!audioCtxRef.current) {
      setupAudioBooster();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = boost;
    }
  };

  // Initialize Stream (Direct HLS / MP4 or WebTorrent)
  useEffect(() => {
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
      streamName: stream.name,
      episodeTitle: video?.title,
      season: video?.season,
      episode: video?.episode,
    });

    // Fetch subtitles
    stremioService.fetchSubtitles(media.type, media.id).then((subs) => {
      setSubtitles(subs);
    });

    if (isTorrent && stream.infoHash) {
      // WebTorrent P2P playback
      const magnet = buildMagnetURI(stream.infoHash, stream.title || media.name);
      torrentService
        .addTorrent(magnet, stream.title || media.name)
        .then((tor) => {
          setTorrentInfo(tor);
          if (videoRef.current) {
            torrentService
              .renderFileToVideo(tor.infoHash, tor.selectedFileIndex || 0, videoRef.current)
              .then((rendered) => {
                if (!rendered && stream.url && videoRef.current) {
                  const resolvedUrl = getStreamProxyUrl(stream.url, stream);
                  videoRef.current.src = resolvedUrl;
                  videoRef.current.play().catch(() => {});
                }
                setIsLoading(false);
              });
          }
        });

      const unsub = torrentService.subscribe((list) => {
        const found = list.find((t) => t.infoHash === stream.infoHash);
        if (found) setTorrentInfo(found);
      });

      return () => {
        unsub();
      };
    } else if (hasDirectUrl && stream.url) {
      // Direct Stream (ToastFlix, HLS .m3u8, MP4, WebM)
      const resolvedUrl = getStreamProxyUrl(stream.url, stream);
      const isHls =
        resolvedUrl.includes('.m3u8') ||
        stream.url.includes('.m3u8') ||
        stream.name?.toLowerCase().includes('hls');

      if (videoRef.current) {
        if (isHls && Hls.isSupported()) {
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }

          // Responsive & Lightweight HLS configuration
          const hls = new Hls({
            maxBufferLength: 25, // Lightweight buffer (25s) to save memory & prevent tab freeze
            maxMaxBufferLength: 50,
            enableWorker: true,
            lowLatencyMode: true,
            startFragPrefetch: true,
            capLevelToPlayerSize: true, // Optimizes resolution to actual canvas
          });

          hls.loadSource(resolvedUrl);
          hls.attachMedia(videoRef.current);

          hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
            // Populate quality levels
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
                setIsLoading(false);
              });
          });

          // Detect audio tracks (e.g. Italian 5.1, Italian stereo, English Original)
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

          // Automatic error recovery
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.warn('[Hls] Network error, attempting recovery...', data);
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.warn('[Hls] Media error, recovering...', data);
                  hls.recoverMediaError();
                  break;
                default:
                  console.error('[Hls] Unrecoverable error:', data);
                  hls.destroy();
                  setPlaybackError(
                    'Errore nello stream. Il flusso potrebbe essere momentaneamente non disponibile.'
                  );
                  setIsLoading(false);
                  break;
              }
            }
          });

          hlsRef.current = hls;
        } else {
          // Standard HTML5 video element (MP4, WebM or native Safari HLS)
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
      }
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
  }, [media, stream, video, isTorrent, hasDirectUrl]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
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
          skipTime(e.shiftKey ? -5 : -10);
          triggerSkipRipple('left');
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skipTime(e.shiftKey ? 5 : 10);
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
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
        case 'c':
          e.preventDefault();
          if (subtitles.length > 0) {
            setSelectedSubtitle((prev) => (prev ? null : subtitles[0].url));
          }
          break;
        case 'escape':
          if (activeMenu) {
            setActiveMenu(null);
          } else {
            onClose();
          }
          break;
        default:
          // 0-9 seek percentages
          if (e.key >= '0' && e.key <= '9') {
            const pct = parseInt(e.key, 10) / 10;
            if (videoRef.current && duration > 0) {
              videoRef.current.currentTime = duration * pct;
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, subtitles, activeMenu]);

  // Handle user activity to toggle controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !activeMenu) {
        setShowControls(false);
      }
    }, 3200);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      // Resume audio context if suspended
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, videoRef.current.currentTime + seconds)
      );
    }
  };

  const triggerSkipRipple = (dir: 'left' | 'right') => {
    setSkipRipple(dir);
    if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current);
    rippleTimerRef.current = setTimeout(() => {
      setSkipRipple(null);
    }, 600);
  };

  // Double Click / Double Tap screen zones
  const handleVideoAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (e.detail === 2) {
      // Double click
      if (clickX < width * 0.35) {
        skipTime(-10);
        triggerSkipRipple('left');
      } else if (clickX > width * 0.65) {
        skipTime(10);
        triggerSkipRipple('right');
      } else {
        toggleFullscreen();
      }
    } else if (e.detail === 1) {
      // Single click in center pauses/plays
      if (clickX >= width * 0.35 && clickX <= width * 0.65) {
        togglePlay();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
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
    } catch (e) {
      console.warn('PiP error', e);
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

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes > 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Switch Audio Track
  const handleSelectAudioTrack = (trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
      setSelectedAudioTrack(trackId);
    }
    setActiveMenu(null);
  };

  // Switch Quality
  const handleSelectQuality = (levelId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
      setSelectedQuality(levelId);
    }
    setActiveMenu(null);
  };

  // Hover Scrubber
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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Video Display Container */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={handleVideoAreaClick}
      >
        <video
          ref={videoRef}
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
            if (!isTorrent && stream.url) {
              setPlaybackError(
                'Impossibile caricare il flusso. Il server sorgente potrebbe essere temporaneamente occupato.'
              );
            }
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
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full liquid-glass-elevated rounded-3xl p-6 border border-amber-500/40 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Avviso di Riproduzione</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{playbackError}</p>
            </div>

            {stream.url && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-cyan-300 truncate text-left">
                {stream.url}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              {stream.url && (
                <button
                  onClick={() => {
                    const resolved = getStreamProxyUrl(stream.url!, stream);
                    window.open(resolved, '_blank');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Apri flusso diretto</span>
                </button>
              )}

              {stream.url && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(stream.url || '');
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3.5 py-2 rounded-xl liquid-glass hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-1.5 border border-white/10 transition-all"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLink ? 'Copiato!' : 'Copia Link'}</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs transition-all"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner Overlay */}
      {isLoading && !playbackError && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm z-20">
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            <Radio className="w-5 h-5 text-cyan-200 absolute" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">
              {torrentInfo
                ? 'Connessione allo Swarm WebTorrent...'
                : isToastflix
                ? 'Caricamento Flusso Diretto ITA...'
                : 'Connessione allo Stream...'}
            </p>
            {torrentInfo && (
              <p className="text-xs text-cyan-300 font-mono mt-1">
                {torrentInfo.numPeers} Peer connessi •{' '}
                {(torrentInfo.downloadSpeed / (1024 * 1024)).toFixed(1)} MB/s
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top Glass Header Bar */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full liquid-glass hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200"
              title="Chiudi Player (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-1">
                  {media.name}
                </h2>
                {isToastflix ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                    🥪 ToastFlix ITA
                  </span>
                ) : hasDirectUrl ? (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                    Direct Stream
                  </span>
                ) : isTorrent ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    P2P Torrent
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                {video ? (
                  <span>
                    S{video.season || 1}:E{video.episode || 1} • {video.title}
                  </span>
                ) : (
                  <span>{media.releaseInfo || 'Movie'}</span>
                )}
                <span className="text-slate-500">•</span>
                <span className="text-cyan-300 font-mono text-[11px] truncate max-w-xs">
                  {stream.name || 'Stream'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Right HUD Toggles */}
          <div className="flex items-center gap-2">
            {/* Aspect Fit Mode Toggle */}
            <button
              onClick={() => setAspectFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
              className="px-2.5 py-1.5 rounded-xl liquid-glass hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10"
              title="Adatta Schermo / Aspect Ratio"
            >
              <Scan className="w-3.5 h-3.5" />
              <span className="hidden sm:inline capitalize">{aspectFit}</span>
            </button>

            {/* WebTorrent Live HUD toggle */}
            {torrentInfo && (
              <button
                onClick={() => setShowTorrentHUD(!showTorrentHUD)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  showTorrentHUD
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'liquid-glass text-slate-400 border-white/10'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>P2P HUD</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Torrent Swarm Stats HUD (Only if P2P torrent is active) */}
      {isTorrent && torrentInfo && showTorrentHUD && (
        <div
          className={`absolute top-20 right-4 sm:right-6 w-64 liquid-glass-elevated rounded-2xl p-3.5 border border-cyan-500/30 shadow-2xl transition-opacity duration-300 z-30 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>WebTorrent Swarm</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">P2P Live</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <ArrowDownCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>{(torrentInfo.downloadSpeed / (1024 * 1024)).toFixed(2)} MB/s</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-300">
              <ArrowUpCircle className="w-3.5 h-3.5 text-purple-400" />
              <span>{(torrentInfo.uploadSpeed / 1024).toFixed(0)} KB/s</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{torrentInfo.numPeers} Peer</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <FileVideo className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatBytes(torrentInfo.downloaded)}</span>
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Buffer Swarm</span>
              <span>{(torrentInfo.progress * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, Math.max(5, torrentInfo.progress * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Liquid Glass Player Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-4xl mx-auto liquid-glass-elevated rounded-2xl p-3 sm:p-4 border border-white/15 shadow-2xl space-y-3">
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
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
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
                  className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900/90 text-cyan-300 text-[10px] font-mono font-bold border border-white/20 pointer-events-none shadow-lg"
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
            {/* Left: Play/Pause, Skips, Volume & Boost */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/30 transition-transform active:scale-95 flex-shrink-0"
                title="Riproduci / Pausa (Spazio)"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Skip Back 10s */}
              <button
                onClick={() => {
                  skipTime(-10);
                  triggerSkipRipple('left');
                }}
                className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Indietro 10s (Freccia Sinistra)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Skip Forward 10s */}
              <button
                onClick={() => {
                  skipTime(10);
                  triggerSkipRipple('right');
                }}
                className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Avanti 10s (Freccia Destra)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume Slider & Audio Boost */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={toggleMute}
                  className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                  title="Muto (M)"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
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
                  onChange={handleVolumeChange}
                  className="w-14 sm:w-20 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-cyan-400"
                  title={`Volume: ${Math.round(volume * 100)}%`}
                />

                {/* Audio Booster Button (100% -> 150% -> 200%) for quiet movie dialogue */}
                <button
                  onClick={() => {
                    const nextBoost = volumeBoost === 1.0 ? 1.5 : volumeBoost === 1.5 ? 2.0 : 1.0;
                    handleBoostChange(nextBoost);
                  }}
                  className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all ${
                    volumeBoost > 1.0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white border-white/10'
                  }`}
                  title="Audio Boost: amplifica il volume dei dialoghi fino al 200%"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{Math.round(volumeBoost * 100)}%</span>
                </button>
              </div>
            </div>

            {/* Right: Audio Tracks, Quality, Subtitles, Speed, PiP, Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Audio Track Selector (Dual Audio / ITA / ENG) */}
              {audioTracks.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === 'audio' ? null : 'audio')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                      selectedAudioTrack !== -1
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'text-slate-300 hover:text-white border-transparent'
                    }`}
                    title="Traccia Audio (Italiano / Inglese)"
                  >
                    <Languages className="w-4 h-4" />
                    <span className="hidden md:inline text-[11px]">Audio</span>
                  </button>

                  {activeMenu === 'audio' && (
                    <div className="absolute bottom-full mb-2 right-0 w-48 liquid-glass-elevated rounded-xl p-1.5 border border-white/15 shadow-xl z-50">
                      <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">
                        Traccia Audio
                      </div>
                      {audioTracks.map((trk) => {
                        const isSelected = trk.id === selectedAudioTrack;
                        const isIta =
                          trk.name.toLowerCase().includes('ita') ||
                          trk.lang?.toLowerCase().includes('it');
                        return (
                          <button
                            key={trk.id}
                            onClick={() => handleSelectAudioTrack(trk.id)}
                            className={`w-full text-left px-2 py-1.5 text-xs rounded-lg flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                                : 'text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span className="truncate">
                              {isIta ? '🇮🇹 ' : '🌐 '}
                              {trk.name}
                            </span>
                            {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Quality Selector (Auto, 1080p, 720p, etc.) */}
              {qualityLevels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === 'quality' ? null : 'quality')}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white border border-white/10 hover:border-white/20"
                    title="Risoluzione Video"
                  >
                    {selectedQuality === -1
                      ? 'Auto'
                      : qualityLevels[selectedQuality]?.name || 'HD'}
                  </button>

                  {activeMenu === 'quality' && (
                    <div className="absolute bottom-full mb-2 right-0 w-36 liquid-glass-elevated rounded-xl p-1 border border-white/15 shadow-xl z-50">
                      <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">
                        Qualità Video
                      </div>
                      <button
                        onClick={() => handleSelectQuality(-1)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between ${
                          selectedQuality === -1
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span>Auto (Adattiva)</span>
                        {selectedQuality === -1 && <Check className="w-3 h-3 text-cyan-400" />}
                      </button>
                      {qualityLevels.map((lvl) => (
                        <button
                          key={lvl.id}
                          onClick={() => handleSelectQuality(lvl.id)}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between ${
                            selectedQuality === lvl.id
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                              : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span>{lvl.name}</span>
                          {selectedQuality === lvl.id && <Check className="w-3 h-3 text-cyan-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Subtitles Menu Button */}
              {subtitles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === 'subs' ? null : 'subs')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                      selectedSubtitle
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'text-slate-300 hover:text-white border-transparent'
                    }`}
                    title="Sottotitoli (C)"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {activeMenu === 'subs' && (
                    <div className="absolute bottom-full mb-2 right-0 w-44 liquid-glass-elevated rounded-xl p-1.5 border border-white/15 shadow-xl z-50">
                      <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">
                        Sottotitoli
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSubtitle(null);
                          setActiveMenu(null);
                        }}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-lg ${
                          selectedSubtitle === null
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        Disattivati
                      </button>
                      {subtitles.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubtitle(sub.url);
                            setActiveMenu(null);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded-lg truncate ${
                            selectedSubtitle === sub.url
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                              : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {sub.label || sub.lang}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Playback Speed Menu */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'speed' ? null : 'speed')}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white border border-white/10 hover:border-white/20"
                  title="Velocità Riproduzione"
                >
                  {playbackRate}x
                </button>
                {activeMenu === 'speed' && (
                  <div className="absolute bottom-full mb-2 right-0 w-24 liquid-glass-elevated rounded-xl p-1 border border-white/15 shadow-xl z-50">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (videoRef.current) videoRef.current.playbackRate = rate;
                          setActiveMenu(null);
                        }}
                        className={`w-full text-left px-2 py-1 text-xs rounded-md ${
                          playbackRate === rate
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture in Picture */}
              <button
                onClick={togglePiP}
                className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors hidden sm:block"
                title="Picture in Picture (P)"
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                title={isFullscreen ? 'Esci da schermo intero (F)' : 'Schermo Intero (F)'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
