export interface Video {
  id: string;
  title: string;
  displayTitle: string;
  youtubeUrl: string;
  slug: string;
  description: string;
  isActive: boolean;
  redirectUrl?: string;
  logoUrl?: string;
  previousVideoId?: string;
  nextVideoId?: string;
  bannerDesktopUrl?: string;
  bannerMobileUrl?: string;
  bannerLink?: string;
  bannerActive: boolean;
  authorName?: string;
  authorPhotoUrl?: string;
  inactiveMode?: 'unavailable' | 'premiere';
  premiereDate?: Date;
  premiereThumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  videoId: string;
  username: string;
  email?: string;
  message: string;
  link?: string;
  isModerator?: boolean;
  timestamp: Date;
}

export interface SiteSettings {
  id: string;
  logoUrl?: string;
  updatedAt: Date;
}

export interface Analytics {
  id: string;
  videoId: string;
  timestamp: Date;
  country: string;
  countryCode: string;
  device: string;
  os: string;
  browser: string;
  ip: string;
  userAgent: string;
}

export interface ChatModeration {
  id: string;
  videoId: string;
  username: string;
  mutedUntil?: Date;
  permanentlyMuted: boolean;
  createdAt: Date;
}

export interface FeatureButton {
  id: string;
  videoId: string;
  text: string;
  link: string;
  isActive: boolean;
  backgroundColor: string;
  textColor: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoLike {
  id: string;
  videoId: string;
  userIdentifier: string;
  createdAt: Date;
}

export interface PinnedMessage {
  id: string;
  videoId: string;
  message: string;
  link?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}