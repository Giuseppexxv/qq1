import React, { useState } from 'react';
import { ViewTab, StremioMetaPreview, StremioMetaDetail, StremioStream, StremioVideo } from './types/stremio';
import { LiquidBackground } from './components/LiquidBackground';
import { Navbar } from './components/Navbar';
import { CatalogBrowser } from './components/CatalogBrowser';
import { TorrentClientView } from './components/TorrentClientView';
import { AddonManagerView } from './components/AddonManagerView';
import { LibraryView } from './components/LibraryView';
import { MediaDetailModal } from './components/MediaDetailModal';
import { LiquidPlayer } from './components/LiquidPlayer';
import { QuickMagnetModal } from './components/QuickMagnetModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('discover');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected media for detail modal
  const [selectedMedia, setSelectedMedia] = useState<StremioMetaPreview | null>(null);

  // Active playing stream session
  const [activePlayback, setActivePlayback] = useState<{
    media: StremioMetaDetail;
    stream: StremioStream;
    video?: StremioVideo;
  } | null>(null);

  // Quick Magnet modal state
  const [isQuickMagnetOpen, setIsQuickMagnetOpen] = useState(false);

  // Reload trigger for addons
  const [addonsRefreshKey, setAddonsRefreshKey] = useState(0);

  const handlePlayStream = (
    media: StremioMetaDetail,
    stream: StremioStream,
    video?: StremioVideo
  ) => {
    setActivePlayback({ media, stream, video });
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Liquid Ambient Background */}
      <LiquidBackground />

      {/* Floating Glass Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSearchQuery('');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenQuickMagnet={() => setIsQuickMagnetOpen(true)}
      />

      {/* Main Viewport */}
      <main className="relative z-10 flex-1">
        {(currentTab === 'discover' || currentTab === 'movies' || currentTab === 'series') && (
          <CatalogBrowser
            key={`${currentTab}-${addonsRefreshKey}`}
            tab={currentTab}
            searchQuery={searchQuery}
            onSelectMedia={(item) => setSelectedMedia(item)}
            onPlayStream={handlePlayStream}
          />
        )}

        {currentTab === 'library' && (
          <LibraryView
            onSelectMedia={(item) => setSelectedMedia(item)}
            onPlayStream={handlePlayStream}
          />
        )}

        {currentTab === 'torrents' && (
          <TorrentClientView onPlayStream={handlePlayStream} />
        )}

        {currentTab === 'addons' && (
          <AddonManagerView
            onAddonsUpdated={() => setAddonsRefreshKey((prev) => prev + 1)}
          />
        )}
      </main>

      {/* Media Detail & Streams Modal */}
      {selectedMedia && (
        <MediaDetailModal
          item={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onPlayStream={(media, stream, video) => {
            setSelectedMedia(null);
            handlePlayStream(media, stream, video);
          }}
        />
      )}

      {/* Integrated Liquid Video Player with WebTorrent HUD */}
      {activePlayback && (
        <LiquidPlayer
          media={activePlayback.media}
          stream={activePlayback.stream}
          video={activePlayback.video}
          onClose={() => setActivePlayback(null)}
        />
      )}

      {/* Quick Magnet Modal */}
      <QuickMagnetModal
        isOpen={isQuickMagnetOpen}
        onClose={() => setIsQuickMagnetOpen(false)}
        onPlayStream={handlePlayStream}
      />
    </div>
  );
}
