'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  Bookmark,
  Check,
  Share2,
  Download,
  Tv,
  Film,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Copy,
  Layers,
} from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import EpisodesGrid from '@/components/EpisodesGrid';
import { MediaItem, EpisodeItem, ServerOption } from '@/lib/types';
import { useWatchlist } from '@/contexts/WatchlistContext';

function WatchContent() {
  const searchParams = useSearchParams();
  const mediaId = searchParams.get('id') || searchParams.get('path') || '';

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeItem | null>(null);
  const [activeServers, setActiveServers] = useState<ServerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAllLinks, setCopiedAllLinks] = useState(false);
  const [loadingEpisode, setLoadingEpisode] = useState(false);

  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  useEffect(() => {
    async function loadMediaDetails() {
      if (!mediaId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/details?id=${encodeURIComponent(mediaId)}`);
        const json = await res.json();
        if (json.success && json.data) {
          const item: MediaItem = json.data;
          setMedia(item);

          if (item.episodes && item.episodes.length > 0) {
            // Select first episode by default for series
            const firstEp = item.episodes[0];
            setSelectedEpisode(firstEp);
            setActiveServers(firstEp.servers && firstEp.servers.length > 0 ? firstEp.servers : item.servers || []);
          } else {
            setActiveServers(item.servers || []);
          }
        }
      } catch (error) {
        console.error('Failed to load media details:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMediaDetails();
  }, [mediaId]);

  // When user picks an episode in TV series
  const handleSelectEpisode = async (ep: EpisodeItem) => {
    setSelectedEpisode(ep);

    // If this episode already has extracted direct servers
    if (ep.servers && ep.servers.length > 0) {
      setActiveServers(ep.servers);
    } else {
      try {
        setLoadingEpisode(true);
        const res = await fetch(`/api/details?id=${encodeURIComponent(ep.id)}`);
        const json = await res.json();
        if (json.success && json.data?.servers && json.data.servers.length > 0) {
          ep.servers = json.data.servers;
          setActiveServers(json.data.servers);
        } else {
          setActiveServers(ep.servers || []);
        }
      } catch (err) {
        console.warn('Failed to fetch episode details:', err);
        setActiveServers(ep.servers || []);
      } finally {
        setLoadingEpisode(false);
      }
    }

    // Scroll smoothly to player
    const playerEl = document.getElementById('cinematic-video-player');
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Refresh temporary streaming links when expired
  const handleRefreshCurrentMedia = async () => {
    const targetId = selectedEpisode?.id || media?.id;
    if (!targetId) return false;
    try {
      const res = await fetch(`/api/details?id=${encodeURIComponent(targetId)}`);
      const json = await res.json();
      if (json.success && json.data?.servers && json.data.servers.length > 0) {
        setActiveServers(json.data.servers);
        setSelectedEpisode((prev) => (prev ? { ...prev, servers: json.data.servers } : null));
        return true;
      }
    } catch (e) {
      console.error('Failed to refresh media link:', e);
    }
    return false;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6 animate-pulse" dir="rtl">
        <div className="aspect-video w-full rounded-2xl bg-neutral-900 border border-neutral-800" />
        <div className="h-8 w-1/3 bg-neutral-900 rounded-lg" />
        <div className="h-20 w-full bg-neutral-900 rounded-xl" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4" dir="rtl">
        <p className="text-neutral-400 text-lg">لم يتم العثور على المادة المطلوبة.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
        >
          <span>العودة للرئيسية</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const saved = isInWatchlist(media.id);
  const isSeries = media.type === 'series' && media.episodes && media.episodes.length > 0;

  const currentPlayingTitle = selectedEpisode
    ? `${media.title} - ${selectedEpisode.title}`
    : media.title;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8" dir="rtl">
      {/* 1. Cinematic Video Player */}
      <section id="watch-player-section">
        <VideoPlayer
          servers={activeServers}
          title={currentPlayingTitle}
          poster={media.banner || media.poster}
          onRefreshLink={handleRefreshCurrentMedia}
        />
      </section>

      {/* 2. Media Header & Controls */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-red-600/90 text-xs font-bold text-white font-mono">
              {media.type === 'series' ? 'مسلسل' : 'فيلم'}
            </span>
            {media.rating && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs font-bold text-amber-400 font-mono">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {media.rating}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-mono">
              {media.year}
            </span>
            {media.duration && (
              <span className="px-2.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
                {media.duration}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {media.title}
          </h1>

          {selectedEpisode && (
            <p className="text-sm font-semibold text-red-500 font-mono">
              تشاهد الآن: {selectedEpisode.title}
            </p>
          )}
        </div>

        {/* Action buttons: Watchlist & Share */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="watch-toggle-watchlist-btn"
            onClick={() => {
              if (saved) {
                removeFromWatchlist(media.id);
              } else {
                addToWatchlist(media);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition active:scale-95 ${
              saved
                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/40'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4 text-red-500" />}
            <span>{saved ? 'في قائمتك' : 'إضافة لقائمتي'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition"
          >
            <Share2 className="w-4 h-4 text-neutral-400" />
            <span>{copiedLink ? 'تم نسخ الرابط!' : 'مشاركة'}</span>
          </button>
        </div>
      </section>

      {/* 3. Episodes Grid (For TV Series) */}
      {isSeries && media.episodes && (
        <EpisodesGrid
          episodes={media.episodes}
          selectedEpisode={selectedEpisode}
          onSelectEpisode={handleSelectEpisode}
        />
      )}

      {/* 4. Story / Synopsis & Meta Card */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-neutral-900/60 p-6 rounded-3xl border border-neutral-800/80">
        <div className="md:col-span-1">
          <img
            src={media.poster}
            alt={media.title}
            className="w-48 md:w-full rounded-2xl object-cover shadow-2xl mx-auto border border-neutral-800"
          />
        </div>

        <div className="md:col-span-3 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">قصة العمل</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {media.story}
            </p>
          </div>

          {/* Genres Chips */}
          {media.genres && media.genres.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-neutral-800/60">
              <span className="text-xs text-neutral-400">التصنيفات:</span>
              <div className="flex flex-wrap gap-2">
                {media.genres.map((genre, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-neutral-800/90 text-xs text-neutral-200 border border-neutral-700/60"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>فحص الأمان: روابط البث والتحميل مباشرة ومحمية بدون إعلانات منبثقة</span>
          </div>
        </div>
      </section>

      {/* 5. Direct Download Links & LinkGrabber Section */}
      <section className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Download className="w-5 h-5 text-red-500" />
            <h3>روابط التحميل المباشر حسب الجودة</h3>
          </div>

          {/* Quick Batch Actions for JDownloader */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const links = activeServers.map((s) => s.url).join('\n');
                navigator.clipboard.writeText(links);
                setCopiedAllLinks(true);
                setTimeout(() => setCopiedAllLinks(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition"
              title="نسخ جميع الروابط لـ JDownloader أو IDM"
            >
              {copiedAllLinks ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تم نسخ جميع الروابط!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>نسخ دفعة واحدة (JDownloader)</span>
                </>
              )}
            </button>

            <Link
              href={`/linkgrabber?url=${encodeURIComponent(mediaId)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-semibold border border-red-500/30 transition"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>أداة LinkGrabber المتطورة</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeServers.map((srv, idx) => (
            <a
              key={idx}
              href={srv.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-700 text-neutral-200 transition group"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded-lg bg-red-600/20 text-red-400 font-mono text-xs font-bold border border-red-500/30">
                  {srv.quality}p
                </span>
                <span className="text-xs font-semibold group-hover:text-white truncate">
                  {srv.name}
                </span>
              </div>
              <Download className="w-4 h-4 text-neutral-400 group-hover:text-red-500 transition" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-12 text-center text-neutral-400">
          جاري تجهيز مشغل الفيديو...
        </div>
      }
    >
      <WatchContent />
    </Suspense>
  );
}
