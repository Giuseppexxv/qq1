import React, { useState } from 'react';
import {
  Blocks,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { InstalledAddon } from '../types/stremio';
import {
  stremioService,
  POPULAR_COMMUNITY_ADDONS,
} from '../services/stremioService';

interface AddonManagerViewProps {
  onAddonsUpdated: () => void;
}

export const AddonManagerView: React.FC<AddonManagerViewProps> = ({ onAddonsUpdated }) => {
  const [addons, setAddons] = useState<InstalledAddon[]>(() =>
    stremioService.getInstalledAddons()
  );
  const [customUrl, setCustomUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const refreshList = () => {
    setAddons(stremioService.getInstalledAddons());
    onAddonsUpdated();
  };

  const handleToggle = (id: string, current: boolean) => {
    stremioService.toggleAddon(id, !current);
    refreshList();
  };

  const handleRemove = (id: string) => {
    stremioService.removeAddon(id);
    refreshList();
  };

  const handleInstallCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    setInstalling(true);
    setStatusMessage(null);

    try {
      const added = await stremioService.addAddonByUrl(customUrl.trim());
      setStatusMessage({
        type: 'success',
        text: `Successfully installed "${added.name}" (v${added.version})!`,
      });
      setCustomUrl('');
      refreshList();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to install add-on manifest.',
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallPopular = async (manifestUrl: string) => {
    setInstalling(true);
    setStatusMessage(null);
    try {
      const added = await stremioService.addAddonByUrl(manifestUrl);
      setStatusMessage({
        type: 'success',
        text: `Successfully installed "${added.name}"!`,
      });
      refreshList();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to install community add-on.',
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleResetDefaults = () => {
    stremioService.resetToDefaults();
    refreshList();
    setStatusMessage({
      type: 'success',
      text: 'Restored default official add-ons.',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Blocks className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-widest text-cyan-400">
              Stremio Addon Protocol v3
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Add-ons & Extensions Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Liquid Stremio conforms to the open Stremio v3 protocol. Catalogs, metadata, torrent streams, and subtitles are aggregated seamlessly from your enabled add-ons.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold liquid-glass text-slate-300 hover:text-white border border-white/10 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Add Custom Add-on Input Box */}
      <div className="p-6 rounded-3xl liquid-glass-elevated border border-white/15 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>Install Custom Add-on Manifest</span>
        </h3>

        <form onSubmit={handleInstallCustom} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="https://my-addon.example.com/manifest.json or stremio://..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 font-mono"
            />
            <button
              type="submit"
              disabled={!customUrl.trim() || installing}
              className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all flex-shrink-0"
            >
              {installing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Install Add-on</span>
            </button>
          </div>
        </form>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Installed Add-ons List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <span>Installed Add-ons ({addons.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addons.map((addon) => {
            const isInstalled = true;
            return (
              <div
                key={addon.id}
                className={`p-5 rounded-2xl liquid-glass border transition-all ${
                  addon.enabled
                    ? 'border-white/15 bg-white/[0.04]'
                    : 'border-white/5 opacity-60 bg-white/[0.01]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-cyan-300 flex-shrink-0">
                      <Blocks className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{addon.name}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                          v{addon.version}
                        </span>
                        {addon.isOfficial && (
                          <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Official
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {addon.description}
                      </p>
                    </div>
                  </div>

                  {/* Enable / Disable toggle */}
                  <button
                    onClick={() => handleToggle(addon.id, addon.enabled)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title={addon.enabled ? 'Disable add-on' : 'Enable add-on'}
                  >
                    {addon.enabled ? (
                      <ToggleRight className="w-7 h-7 text-cyan-400" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Resource badges and transport URL */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {addon.manifest.resources.map((r, i) => {
                      const name = typeof r === 'string' ? r : r.name;
                      return (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] text-slate-300 font-mono"
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>

                  {!addon.isOfficial && (
                    <button
                      onClick={() => handleRemove(addon.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs p-1"
                      title="Uninstall add-on"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Community Add-ons Catalog */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Popular Community Add-ons</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {POPULAR_COMMUNITY_ADDONS.map((p) => {
            const alreadyInstalled = addons.some((a) => a.id === p.id);
            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl liquid-glass border border-white/10 flex flex-col justify-between space-y-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">{p.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                </div>

                <div className="pt-2">
                  {alreadyInstalled ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Installed</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleInstallPopular(p.manifestUrl)}
                      disabled={installing}
                      className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-200 hover:text-slate-950 font-bold text-xs border border-cyan-500/30 transition-all"
                    >
                      Install 1-Click
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
