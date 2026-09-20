import { StremioMetaPreview, StremioMetaDetail, StremioStream } from '../types/stremio';

export interface OpenMediaItem {
  meta: StremioMetaDetail;
  streams: StremioStream[];
}

export const OPEN_MEDIA_CATALOG: OpenMediaItem[] = [
  {
    meta: {
      id: 'open_bbb',
      type: 'movie',
      name: 'Big Buck Bunny',
      year: 2008,
      releaseInfo: '2008',
      runtime: '10 min',
      genres: ['Animation', 'Short', 'Comedy'],
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      background: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
      imdbRating: '7.6',
      description: 'A large, lovable rabbit is relentlessly harassed by a mischievous gang of bullying woodland rodents—Frank the flying squirrel, Rinky the red squirrel, and Gimera the chinchilla. He finally hatches a hilarious revenge.',
      director: ['Sacha Goedegebure'],
      cast: ['Blender Foundation Open Movie'],
    },
    streams: [
      {
        name: 'WebTorrent Swarm 1080p',
        title: 'Big Buck Bunny (1080p WebTorrent P2P) | WebRTC Seeds',
        infoHash: '08a062f29cdd457ecd42c0c0f0f5dd7e34bc4db',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      },
      {
        name: 'Direct MP4 Stream 4K',
        title: 'Big Buck Bunny (High Bitrate Web Stream)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      },
    ],
  },
  {
    meta: {
      id: 'open_tos',
      type: 'movie',
      name: 'Tears of Steel',
      year: 2012,
      releaseInfo: '2012',
      runtime: '12 min',
      genres: ['Sci-Fi', 'Action', 'Short'],
      poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
      background: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
      imdbRating: '6.5',
      description: 'In a dystopian post-apocalyptic Amsterdam, a group of scientists and soldiers attempt to save the remaining world by using a time-travel consciousness machine to reconstruct an old memory with a robotic girl.',
      director: ['Ian Hubert'],
      cast: ['Derek de Lint', 'Sergio Hasselbaink', 'Rogier Schippers'],
    },
    streams: [
      {
        name: 'WebTorrent 1080p P2P',
        title: 'Tears of Steel (1080p MKV / MP4 WebTorrent Swarm)',
        infoHash: '209c8226b299e3c1d886b34c055230a40d419124',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      },
      {
        name: 'Direct Stream HD',
        title: 'Tears of Steel (Blender Open Movie Direct Stream)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      },
    ],
  },
  {
    meta: {
      id: 'open_sintel',
      type: 'movie',
      name: 'Sintel',
      year: 2010,
      releaseInfo: '2010',
      runtime: '15 min',
      genres: ['Animation', 'Fantasy', 'Adventure'],
      poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      background: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
      imdbRating: '7.4',
      description: 'A lonely young warrior girl named Sintel rescues an injured baby dragon whom she names Scales. When an adult dragon swoops in and kidnaps Scales, she embarks on an arduous, dangerous quest across the frozen wasteland.',
      director: ['Colin Levy'],
      cast: ['Halina Reijn', 'Thom Hoffman'],
    },
    streams: [
      {
        name: 'WebTorrent 1080p Swarm',
        title: 'Sintel (1080p Blender CC Swarm)',
        infoHash: '08a062f29cdd457ecd42c0c0f0f5dd7e34bc4db',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      },
      {
        name: 'Direct Stream 1080p',
        title: 'Sintel (Original Master Audio)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      },
    ],
  },
  {
    meta: {
      id: 'open_notld',
      type: 'movie',
      name: 'Night of the Living Dead',
      year: 1968,
      releaseInfo: '1968',
      runtime: '96 min',
      genres: ['Horror', 'Classic', 'Mystery'],
      poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=600&q=80',
      background: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
      imdbRating: '7.8',
      description: 'A ragtag group of Pennsylvanians barricade themselves in an old farmhouse to remain safe from a bloodthirsty, flesh-eating horde of the reanimated dead. George A. Romero’s legendary public domain masterpiece.',
      director: ['George A. Romero'],
      cast: ['Duane Jones', 'Judith O’Dea', 'Karl Hardman'],
    },
    streams: [
      {
        name: 'Public Domain WebTorrent',
        title: 'Night of the Living Dead (1968 Remastered WebTorrent Swarm)',
        infoHash: '3333333333333333333333333333333333333333',
        url: 'https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4',
      },
      {
        name: 'Internet Archive Direct Stream',
        title: 'Night of the Living Dead (Archive.org 720p)',
        url: 'https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4',
      },
    ],
  },
  {
    meta: {
      id: 'open_cosmos',
      type: 'movie',
      name: 'Cosmos Laundromat',
      year: 2015,
      releaseInfo: '2015',
      runtime: '12 min',
      genres: ['Animation', 'Fantasy', 'Sci-Fi'],
      poster: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
      background: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
      imdbRating: '7.2',
      description: 'On a desolate windswept island, a suicidal sheep named Franck meets Victor, an eccentric traveling salesman who offers Franck the gift of a lifetime: a chance to live any life he desires via the Cosmos Laundromat.',
      director: ['Mathieu Auvray'],
      cast: ['Pierre Bokma', 'Reinout Scholten van Aschat'],
    },
    streams: [
      {
        name: 'WebTorrent 4K P2P',
        title: 'Cosmos Laundromat (Cycle 1 - 4K UHD WebTorrent)',
        infoHash: 'c9e15763f722f23e98a29decd97d32699ecd4c44',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
      },
      {
        name: 'Direct Stream HD',
        title: 'Cosmos Laundromat (Direct Stream)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
      },
    ],
  },
  {
    meta: {
      id: 'open_elephants',
      type: 'movie',
      name: 'Elephants Dream',
      year: 2006,
      releaseInfo: '2006',
      runtime: '11 min',
      genres: ['Animation', 'Sci-Fi', 'Art'],
      poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      background: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
      imdbRating: '6.9',
      description: 'Proog and Emo journey through the surreal and mechanical belly of a giant, sentient mechanical world. Proog is fascinated by its clockwork complexities, while Emo is weary and wishes to escape.',
      director: ['Bassam Kurdali'],
      cast: ['Tygo Gernandt', 'Cas Jansen'],
    },
    streams: [
      {
        name: 'WebTorrent P2P Stream',
        title: 'Elephants Dream (1080p WebTorrent Swarm)',
        infoHash: 'ed42ae22972ecd43957823f2b45cb063870845a2',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      },
    ],
  },
  {
    meta: {
      id: 'open_direct_ita',
      type: 'movie',
      name: 'Cinema Italiano - Demo Flussi Diretti',
      year: 2024,
      releaseInfo: '2024',
      runtime: 'Speciale',
      genres: ['Documentary', 'Drama', 'Italiano'],
      poster: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80',
      background: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
      imdbRating: '8.4',
      description: 'Dimostrazione ad alte prestazioni per testare flussi diretti Stremio, HLS adaptive bitrate (.m3u8) e audio italiano ToastFlix senza necessità di swarm torrent o proxy.',
      director: ['Liquid Stremio Lab'],
      cast: ['ToastFlix Direct Engine', 'HLS.js Native Player'],
    },
    streams: [
      {
        name: '🥪 ToastFlix - 1080p Direct ITA',
        title: 'ToastFlix Direct | Audio Italiano HD | No Torrent',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      },
      {
        name: '🥪 ToastFlix - Dual Audio ITA / ENG',
        title: 'Direct Dual Audio 1080p | Traccia ITA + ENG',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      },
      {
        name: 'HLS Adaptive Multi-Bitrate (.m3u8)',
        title: 'HLS Live Stream (Multi-Quality 1080p/720p/480p)',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      },
    ],
  },
];
