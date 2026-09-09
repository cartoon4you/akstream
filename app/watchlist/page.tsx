'use client';

import React from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Trash2,
  Play,
  Star,
  Cloud,
  CloudOff,
  LogIn,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMounted } from '@/hooks/use-mounted';

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist, isCloudSynced, loading } = useWatchlist();
  const { currentUser, signInWithGoogle } = useAuth();
  const mounted = useIsMounted();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20">
              <Bookmark className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              قائمة المشاهدة الخاصة بي
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400">
            احفظ أفلامك ومسلسلاتك المفضلة لمشاهدتها في أي وقت
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>متزامن سحابياً مع Firestore</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>سجّل الدخول للمزامنة عبر أجهزتك</span>
            </button>
          )}
        </div>
      </div>

      {/* Cloud Sync Information Box */}
      {!currentUser && watchlist.length > 0 && (
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-300">
          <div className="flex items-center gap-2.5">
            <CloudOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              أنت الآن في وضع الزائر وتُحفظ قائمتك محلياً. اضغط لتسجيل الدخول بحساب Google لمزامنة القائمة في السحابة واستعادتها من أي جهاز!
            </span>
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition"
          >
            مزامنة الآن
          </button>
        </div>
      )}

      {/* Watchlist Items Grid */}
      {loading || !mounted ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : watchlist.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {watchlist.map((item) => (
            <div
              key={item.id}
              id={`watchlist-card-${item.id}`}
              className="group relative flex flex-col rounded-2xl overflow-hidden bg-neutral-900/80 border border-neutral-800/80 transition hover:-translate-y-1.5 hover:border-red-600/50 hover:shadow-xl"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950">
                <img
                  src={item.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600'}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/30"></div>

                {/* Rating Badge */}
                {item.rating && (
                  <span className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 border border-neutral-700 text-xs font-bold text-amber-400 font-mono">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {item.rating}
                  </span>
                )}

                {/* Remove from Watchlist Button with Touch Target */}
                <button
                  type="button"
                  onClick={() => removeFromWatchlist(item.id)}
                  title="حذف من قائمتي"
                  className="absolute top-2.5 left-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 rounded-xl bg-black/70 hover:bg-red-600 text-neutral-300 hover:text-white border border-neutral-700 transition cursor-pointer active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Play Button Overlay */}
                <Link
                  href={`/watch?id=${encodeURIComponent(item.id)}`}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  </div>
                </Link>
              </div>

              <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 gap-1">
                <Link
                  href={`/watch?id=${encodeURIComponent(item.id)}`}
                  className="text-xs sm:text-sm font-bold text-neutral-100 hover:text-red-500 line-clamp-1 transition"
                >
                  {item.title}
                </Link>

                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400 pt-1 border-t border-neutral-800">
                  <span>{item.year || '2024'}</span>
                  <Link
                    href={`/watch?id=${encodeURIComponent(item.id)}`}
                    className="text-red-500 hover:underline font-semibold"
                  >
                    شاهد الآن
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 sm:p-16 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800/60 space-y-4">
          <Bookmark className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-neutral-200">قائمة المشاهدة فارغة حالياً</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            تصفح مكتبة الأفلام والمسلسلات واضغط على أيقونة الإشارة المرجعية لحفظ الأعمال المفضلة هنا.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition"
          >
            <span>استكشاف الكتالوج الآن</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
