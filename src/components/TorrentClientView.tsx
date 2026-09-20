import React, { useState, useEffect } from 'react';
import {
  Radio,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Play,
  Pause,
  Trash2,
  Upload,
  Link,
  CheckCircle2,
  FileVideo,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ActiveTorrent, StremioMetaDetail, StremioStream } from '../types/stremio';
import { torrentService } from '../services/torrentService';
import { OPEN_MEDIA_CATALOG } from '../data/openMediaCatalog';

interface TorrentClientViewProps {
  onPlayStream: (media: StremioMetaDetail, stream: StremioStream) => void;
}

export const TorrentClientView: React.FC<TorrentClientViewProps> = ({ onPlayStream }) => {
  const [torrents, setTorrents] = useState<ActiveTorrent[]>([]);
  const [magnetInput, setMagnetInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const unsub = torrentService.subscribe((list) => {
      setTorrents(list);
    });
    return unsub;
  }, []);

  const handleAddMagnet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnetInput.trim()) return;

    setIsSubmitting(true);
    try {
      const active = await torrentService.addTorrent(magnetInput.trim(), customName.trim() || undefined);
      setMagnetInput('');
      setCustomName('');
      setIsSubmitting(false);

      // Auto play if it has files
      const firstFile = active.files?.[0];
      onPlayStream(
        {
          id: active.infoHash || 'tor-' + Date.now(),
          type: 'movie',
          name: active.name,
          description: 'Streamed via WebTorrent P2P Client',
        },
        {
          name: 'WebTorrent Swarm',
          title: active.name,
          infoHash: active.infoHash,
          fileIdx: active.selectedFileIndex || 0,
        }
      );
    } catch (err) {
      console.warn(err);
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (file) {
      torrentService.addTorrent(file, file.name.replace(/\.torrent$/i, ''));
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Radio className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
              In-Browser P2P Swarm Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Integrated Torrent Client
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Stream directly from WebTorrent peers and web seeds in your browser. Paste any Magnet link, infoHash, or upload a .torrent file.
          </p>
        </div>

        {/* Global Torrent Stats Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl liquid-glass border border-white/10 self-start">
          <div className="px-3 py-1.5 border-r border-white/10">
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Swarms</div>
            <div className="text-lg font-extrabold text-white font-mono">{torrents.length}</div>
          </div>
          <div className="px-3 py-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Speed</div>
            <div className="text-lg font-extrabold text-cyan-300 font-mono">
              {(torrents.reduce((acc, t) => acc + (t.downloadSpeed || 0), 0) / (1024 * 1024)).toFixed(1)} MB/s
            </div>
          </div>
        </div>
      </div>

      {/* Input & Drag & Drop Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 cols: Magnet Input Form */}
        <div className="lg:col-span-2 p-5 rounded-3xl liquid-glass-elevated border border-white/15 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Link className="w-4 h-4 text-cyan-400" />
            <span>Add Magnet Link or Torrent Hash</span>
          </h3>

          <form onSubmit={handleAddMagnet} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="magnet:?xt=urn:btih:... or infoHash"
                value={magnetInput}
                onChange={(e) => setMagnetInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 font-mono text-xs"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Optional custom title (e.g. My Movie 1080p)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
              <button
                type="submit"
                disabled={!magnetInput.trim() || isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all flex-shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Stream</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 col: Drag & Drop .torrent */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          className={`p-5 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-white/15 liquid-glass hover:border-white/30'
          }`}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.torrent';
            input.onchange = (e: any) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            };
            input.click();
          }}
        >
          <Upload className="w-8 h-8 text-cyan-400 mb-2 opacity-80" />
          <p className="text-xs font-semibold text-white">Drop .torrent file here</p>
          <p className="text-[11px] text-slate-400 mt-0.5">or click to browse from device</p>
        </div>
      </div>

      {/* Active Torrents Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>Active Swarms</span>
          <span className="text-xs text-slate-400 font-normal">({torrents.length})</span>
        </h3>

        {torrents.length === 0 ? (
          <div className="p-8 rounded-3xl liquid-glass border border-white/10 text-center space-y-2">
            <Radio className="w-8 h-8 text-slate-500 mx-auto opacity-60" />
            <p className="text-sm font-semibold text-slate-300">No active torrent swarms</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add a magnet link above or test one of the featured high-speed WebTorrent swarms below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {torrents.map((tor) => (
              <div
                key={tor.id}
                className="p-4 rounded-2xl liquid-glass-elevated border border-white/10 space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{tor.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      Hash: {tor.infoHash || 'Resolving...'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        onPlayStream(
                          {
                            id: tor.infoHash,
                            type: 'movie',
                            name: tor.name,
                          },
                          {
                            name: 'WebTorrent Stream',
                            title: tor.name,
                            infoHash: tor.infoHash,
                            fileIdx: tor.selectedFileIndex || 0,
                          }
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Stream</span>
                    </button>

                    {tor.paused ? (
                      <button
                        onClick={() => torrentService.resumeTorrent(tor.infoHash)}
                        className="p-1.5 rounded-lg liquid-glass text-slate-300 hover:text-white"
                        title="Resume"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => torrentService.pauseTorrent(tor.infoHash)}
                        className="p-1.5 rounded-lg liquid-glass text-slate-300 hover:text-white"
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => torrentService.removeTorrent(tor.infoHash)}
                      className="p-1.5 rounded-lg liquid-glass text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{(tor.progress * 100).toFixed(1)}% downloaded</span>
                    <span>
                      {formatBytes(tor.downloaded)} / {formatBytes(tor.length)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(3, tor.progress * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Telemetry pill row */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <ArrowDownCircle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{(tor.downloadSpeed / (1024 * 1024)).toFixed(2)} MB/s</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-300">
                    <ArrowUpCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span>{(tor.uploadSpeed / 1024).toFixed(0)} KB/s</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tor.numPeers} Peers</span>
                  </div>
                  {tor.files && tor.files.length > 1 && (
                    <div className="flex items-center gap-1.5 text-amber-300">
                      <FileVideo className="w-3.5 h-3.5 text-amber-400" />
                      <span>{tor.files.length} Files inside</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pre-configured High-Speed Open Swarms */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Featured Open Source & WebTorrent Swarms</span>
          </h3>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Instant Stream Tested</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {OPEN_MEDIA_CATALOG.map((item) => (
            <div
              key={item.meta.id}
              className="p-4 rounded-2xl liquid-glass hover:bg-white/[0.08] border border-white/10 flex items-center justify-between gap-3 group transition-all"
            >
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white group-hover:text-cyan-200 transition-colors truncate">
                  {item.meta.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                  <span>{item.meta.releaseInfo}</span>
                  <span>•</span>
                  <span className="text-emerald-300 font-mono">WebRTC Seeds</span>
                </div>
              </div>

              <button
                onClick={() => onPlayStream(item.meta, item.streams[0])}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-200 hover:text-slate-950 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition-all flex-shrink-0"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Test</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
