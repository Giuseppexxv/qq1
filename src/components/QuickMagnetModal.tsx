import React, { useState } from 'react';
import { X, Play, Radio, Link, Upload, Loader2 } from 'lucide-react';
import { torrentService } from '../services/torrentService';
import { StremioMetaDetail, StremioStream } from '../types/stremio';

interface QuickMagnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayStream: (media: StremioMetaDetail, stream: StremioStream) => void;
}

export const QuickMagnetModal: React.FC<QuickMagnetModalProps> = ({
  isOpen,
  onClose,
  onPlayStream,
}) => {
  const [magnetInput, setMagnetInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnetInput.trim()) return;

    setLoading(true);
    try {
      const active = await torrentService.addTorrent(
        magnetInput.trim(),
        titleInput.trim() || undefined
      );
      setLoading(false);
      onClose();

      onPlayStream(
        {
          id: active.infoHash || 'tor-' + Date.now(),
          type: 'movie',
          name: active.name,
          description: 'Instant stream via WebTorrent P2P',
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
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    setLoading(true);
    torrentService.addTorrent(file, file.name.replace(/\.torrent$/i, '')).then((active) => {
      setLoading(false);
      onClose();
      onPlayStream(
        {
          id: active.infoHash || 'tor-' + Date.now(),
          type: 'movie',
          name: active.name,
        },
        {
          name: 'WebTorrent Stream',
          title: active.name,
          infoHash: active.infoHash,
        }
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl liquid-glass-elevated border border-white/15 p-6 shadow-2xl z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Radio className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white">Stream Any Torrent Instantly</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-glass hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Magnet Link or InfoHash
            </label>
            <input
              type="text"
              placeholder="magnet:?xt=urn:btih:..."
              value={magnetInput}
              onChange={(e) => setMagnetInput(e.target.value)}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. My Movie 1080p"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <label className="cursor-pointer text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Or upload .torrent</span>
              <input
                type="file"
                accept=".torrent"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />
            </label>

            <button
              type="submit"
              disabled={!magnetInput.trim() || loading}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 transition-all"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Stream</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
