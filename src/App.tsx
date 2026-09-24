import React, { useState } from 'react';
import { ViewTab, StremioMetaPreview, StremioMetaDetail, StremioStream, StremioVideo } from './types/stremio';
import { LiquidBackground } from './components/LiquidBackground';
import { Navbar } from './components/Navbar';
import { CatalogBrowser } from './components/CatalogBrowser';
import { LibraryView } from './components/LibraryView';
import { MediaDetailModal } from './components/MediaDetailModal';
import { LiquidPlayer } from './components/LiquidPlayer';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('discover');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected media for detail modal
  const [selectedMedia, setSelectedMedia] = useState<StremioMetaPreview | null>(null);

  // Active playing stream session
  const [activePlayback, setActivePlayback] = useState<{
    media: StremioMetaDetail;
    stream?: StremioStream | null;
    video?: StremioVideo;
  } | null>(null);

  const handlePlayStream = (
    media: StremioMetaDetail,
    stream?: StremioStream,
    video?: StremioVideo
  ) => {
    setActivePlayback({ media, stream: stream || null, video });
  };

  return (
    <div className="relative min-h-screen bg-black text-slate-100 flex flex-col selection:bg-red-600/30 selection:text-rose-200">
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
      />

      {/* Main Viewport */}
      <main className="relative z-10 flex-1">
        {(currentTab === 'discover' || currentTab === 'movies' || currentTab === 'series') && (
          <CatalogBrowser
            key={currentTab}
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

      {/* Integrated Liquid Video Player */}
      {activePlayback && (
        <LiquidPlayer
          media={activePlayback.media}
          stream={activePlayback.stream}
          video={activePlayback.video}
          onClose={() => setActivePlayback(null)}
        />
      )}
    </div>
  );
}
