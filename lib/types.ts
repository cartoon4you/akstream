export interface ServerOption {
  name: string;
  quality: number; // 1080, 720, 480, 360
  url: string;
  referer?: string;
  type?: 'mp4' | 'hls' | 'embed';
}

export interface EpisodeItem {
  id: string;
  episodeNumber: number;
  title: string;
  duration?: string;
  servers: ServerOption[];
}

export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  poster: string;
  banner?: string;
  story: string;
  rating: string;
  year: string;
  duration?: string;
  category: string;
  categoryLabel?: string;
  type: 'movie' | 'series';
  genres: string[];
  servers?: ServerOption[];
  episodes?: EpisodeItem[];
  isFeatured?: boolean;
  isTrending?: boolean;
}

export interface WatchlistItem {
  id: string;
  title: string;
  poster: string;
  rating: string;
  year: string;
  type: string;
  userId: string;
  addedAt: string;
}

export interface CategoryOption {
  id: string;
  label: string;
  icon: string;
  type: 'all' | 'movie' | 'series' | 'anime';
}

export interface LinkGrabberFile {
  id: string;
  filename: string;
  quality: string;
  qualityNum: number;
  size?: string;
  direct_url: string;
  proxy_url: string;
  format: 'mp4' | 'm3u8' | 'mkv' | 'unknown';
  source_site: string;
  episode_title?: string;
  episode_number?: number;
}

export interface LinkGrabberResult {
  title: string;
  poster?: string;
  source_url: string;
  type: 'movie' | 'series';
  qualities: {
    [quality: string]: string; // e.g. "1080p": "https://..."
  };
  files: LinkGrabberFile[];
  episodes?: {
    episodeNumber: number;
    title: string;
    files: LinkGrabberFile[];
  }[];
}
