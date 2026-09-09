'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Film,
  Tv,
  Flame,
  ChevronLeft,
  LayoutGrid,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import HeroSlider from '@/components/HeroSlider';
import MediaCard from '@/components/MediaCard';
import { MediaItem } from '@/lib/types';
import { CATEGORIES } from '@/lib/catalog-data';

export default function HomePage() {
  const [featured, setFeatured] = useState<MediaItem[]>([]);
  const [latestMovies, setLatestMovies] = useState<MediaItem[]>([]);
  const [latestSeries, setLatestSeries] = useState<MediaItem[]>([]);
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    async function loadHome() {
      try {
        setLoading(true);
        const res = await fetch('/api/home');
        const data = await res.json();
        if (data.success && data.data) {
          setFeatured(data.data.featured || []);
          setLatestMovies(data.data.latestMovies || []);
          setLatestSeries(data.data.latestSeries || []);
          setTrending(data.data.trending || []);
        }
      } catch (error) {
        console.error('Failed to load home content:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHome();
  }, []);

  return (
    <div className="w-full space-y-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6" dir="rtl">
      {/* 1. Hero Carousel Slider */}
      {loading ? (
        <div className="w-full h-[480px] sm:h-[580px] lg:h-[640px] rounded-2xl sm:rounded-3xl bg-neutral-900 animate-pulse border border-neutral-800"></div>
      ) : (
        <HeroSlider items={featured} />
      )}

      {/* 2. Category Quick Chips Bar */}
      <section id="home-categories-chips" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-300">
            <LayoutGrid className="w-4 h-4 text-red-500" />
            <span>تصفح حسب الأقسام السريعة</span>
          </div>
          <Link
            href="/catalog"
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 font-medium transition"
          >
            <span>عرض كل التصنيفات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={cat.id === 'all' ? '/catalog' : `/catalog?category=${cat.id}`}
              id={`quick-chip-${cat.id}`}
              className="flex-shrink-0 px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-semibold bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition active:scale-95 cursor-pointer"
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Section: Latest Movies */}
      <section id="section-latest-movies" className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-600/10 text-red-500 border border-red-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">أحدث الأفلام</h2>
              <p className="text-xs text-neutral-400">أفلام عربية وأجنبية حصرية بأعلى جودة</p>
            </div>
          </div>

          <Link
            href="/catalog?type=movie"
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition"
          >
            <span>شاهد المزيد</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {latestMovies.slice(0, 5).map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Section: Latest TV Series */}
      <section id="section-latest-series" className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-500 border border-emerald-500/20">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">أحدث المسلسلات والحلقات</h2>
              <p className="text-xs text-neutral-400">مسلسلات عربية وتركية وأجنبية مع مشغل الحلقات المباشر</p>
            </div>
          </div>

          <Link
            href="/catalog?type=series"
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition"
          >
            <span>شاهد المزيد</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {latestSeries.slice(0, 5).map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Section: Trending & Highly Rated */}
      <section id="section-trending" className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-600/10 text-amber-500 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">الأكثر مشاهدة والأعلى تقييماً</h2>
              <p className="text-xs text-neutral-400">أعمال نالت أعلى تقييمات الجمهور والنقاد</p>
            </div>
          </div>

          <Link
            href="/catalog?sort=rating"
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition"
          >
            <span>عرض الترتيب الكامل</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {trending.slice(0, 5).map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
