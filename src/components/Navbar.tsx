import React, { useState, useEffect } from 'react';
import {
  Film,
  Tv,
  Compass,
  Bookmark,
  Blocks,
  Zap,
  Search,
  X,
  Radio,
  ArrowDownCircle,
  PlusCircle,
} from 'lucide-react';
import { ViewTab, ActiveTorrent } from '../types/stremio';
import { torrentService } from '../services/torrentService';
import { stremioService } from '../services/stremioService';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenQuickMagnet: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  onOpenQuickMagnet,
}) => {
  const [torrents, setTorrents] = useState<ActiveTorrent[]>([]);
  const [installedCount, setInstalledCount] = useState<number>(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const unsub = torrentService.subscribe((list) => {
      setTorrents(list);
    });
    setInstalledCount(stremioService.getInstalledAddons().filter((a) => a.enabled).length);
    return unsub;
  }, []);

  const totalDownloadSpeed = torrents.reduce((acc, t) => acc + (t.downloadSpeed || 0), 0);
  const activeTorrentCount = torrents.length;

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec > 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  };

  const navLinks: { id: ViewTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'discover', label: 'Discover', icon: <Compass className="w-4 h-4" /> },
    { id: 'movies', label: 'Movies', icon: <Film className="w-4 h-4" /> },
    { id: 'series', label: 'Series', icon: <Tv className="w-4 h-4" /> },
    { id: 'library', label: 'Library', icon: <Bookmark className="w-4 h-4" /> },
    {
      id: 'torrents',
      label: 'Torrents',
      icon: <Radio className="w-4 h-4" />,
      badge: activeTorrentCount > 0 ? activeTorrentCount : undefined,
    },
    {
      id: 'addons',
      label: 'Add-ons',
      icon: <Blocks className="w-4 h-4" />,
      badge: installedCount > 0 ? installedCount : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 px-4 sm:px-8 py-3 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6 liquid-glass-elevated rounded-2xl px-4 sm:px-6 py-2.5">
        
        {/* Brand Logo with Liquid Glass holographic styling */}
        <div
          id="nav-logo"
          onClick={() => onSelectTab('discover')}
          className="flex items-center gap-3 cursor-pointer group select-none flex-shrink-0"
        >
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition-all duration-300">
            <div className="w-full h-full rounded-[11px] bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-300 fill-cyan-400/30 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
                Liquid Stremio
              </span>
              <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                v3 Addon
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Desktop */}
        <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
          {navLinks.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white bg-white/[0.12] shadow-sm shadow-black/20 border border-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Search & Quick Magnet Action */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 lg:flex-none justify-end">
          {/* Search Box */}
          <div
            className={`relative flex items-center transition-all duration-200 ${
              isSearchFocused
                ? 'w-full sm:w-64 ring-2 ring-cyan-500/40'
                : 'w-40 sm:w-56'
            } rounded-xl bg-white/[0.05] border border-white/[0.1] px-2.5 py-1.5`}
          >
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
            <input
              id="search-input"
              type="text"
              placeholder="Search movies, series..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-slate-200 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Magnet / Torrent Button */}
          <button
            id="quick-magnet-btn"
            onClick={onOpenQuickMagnet}
            title="Paste Magnet link or load .torrent"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 text-cyan-200 hover:text-white transition-all duration-200 flex-shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Magnet</span>
          </button>

          {/* Live Torrent Speed indicator pill if active */}
          {totalDownloadSpeed > 0 && (
            <div
              onClick={() => onSelectTab('torrents')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono cursor-pointer hover:bg-emerald-500/20 transition-colors"
              title="Active WebTorrent Download Speed"
            >
              <ArrowDownCircle className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>{formatSpeed(totalDownloadSpeed)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Bar (Horizontal scroll below main nav) */}
      <div className="flex lg:hidden overflow-x-auto py-2 gap-1.5 scrollbar-none mt-1">
        {navLinks.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-1 py-0.2 rounded-full text-[9px] bg-cyan-500/30 text-cyan-100">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
