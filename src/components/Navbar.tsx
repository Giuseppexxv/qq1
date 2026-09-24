import React, { useState } from 'react';
import {
  Film,
  Tv,
  Compass,
  Bookmark,
  Zap,
  Search,
  X,
} from 'lucide-react';
import { ViewTab } from '../types/stremio';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'discover', label: 'Scopri', icon: <Compass className="w-4 h-4" /> },
    { id: 'movies', label: 'Film', icon: <Film className="w-4 h-4" /> },
    { id: 'series', label: 'Serie TV', icon: <Tv className="w-4 h-4" /> },
    { id: 'library', label: 'La Mia Libreria', icon: <Bookmark className="w-4 h-4" /> },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-3 sm:px-6 md:px-8 py-3.5 transition-all duration-300 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4 pointer-events-auto">
        
        {/* Brand Logo with Liquid Water Droplet Hologram */}
        <div
          id="nav-logo"
          onClick={() => onSelectTab('discover')}
          className="flex items-center gap-3 cursor-pointer group select-none flex-shrink-0"
        >
          <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center p-[1.5px] bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 shadow-lg shadow-red-600/25 group-hover:shadow-red-500/50 transition-all duration-300 group-hover:scale-105">
            {/* Water bubble convex reflection */}
            <div className="w-full h-full rounded-[14px] bg-black/60 backdrop-blur-xl flex items-center justify-center relative overflow-hidden border border-white/20">
              <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 via-transparent to-white/20 pointer-events-none" />
              <Zap className="w-5 h-5 text-red-400 fill-red-500/40 drop-shadow-[0_0_8px_rgba(225,29,72,0.8)] group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-xl sm:text-2xl font-cinematic font-black tracking-tight bg-gradient-to-r from-white via-rose-100 to-rose-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              IStream
            </span>
          </div>
        </div>

        {/* Central Liquid Bubble Glass Navigation Menu */}
        <nav className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass-transparent border border-white/20 shadow-2xl shadow-black/80">
          {navLinks.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'text-white bg-gradient-to-r from-red-600 to-rose-600 border border-rose-400/40 shadow-lg shadow-red-600/30 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.1]'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Floating Detached Search Bar on the Right */}
        <div className="flex items-center flex-shrink-0">
          <div
            className={`relative flex items-center transition-all duration-300 liquid-glass-transparent rounded-full px-3.5 py-2 border border-white/20 shadow-2xl shadow-black/80 ${
              isSearchFocused
                ? 'w-64 sm:w-72 ring-2 ring-red-500/50 shadow-red-600/20'
                : 'w-48 sm:w-56'
            }`}
          >
            <Search className="w-4 h-4 text-rose-400 mr-2.5 flex-shrink-0" />
            <input
              id="search-input"
              type="text"
              placeholder="Cerca film, serie TV..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-400/80 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-white ml-1 p-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden overflow-x-auto py-2.5 gap-2 scrollbar-none mt-2 justify-center pointer-events-auto">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full liquid-glass-transparent border border-white/20">
          {navLinks.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold border border-rose-400/40 shadow-md shadow-red-600/20'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
