'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Bookmark, Star, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import { MediaItem } from '@/lib/types';
import { useWatchlist } from '@/contexts/WatchlistContext';

interface HeroSliderProps {
  items: MediaItem[];
}

export default function HeroSlider({ items }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const slides = items && items.length > 0 ? items : [];

  // Auto rotate slides every 6 seconds unless paused
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  if (slides.length === 0) return null;

  const current = slides[currentIndex];
  const saved = isInWatchlist(current.id);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleWatchlistToggle = () => {
    if (saved) {
      removeFromWatchlist(current.id);
    } else {
      addToWatchlist(current);
    }
  };

  return (
    <div
      id="hero-carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full h-[520px] sm:h-[580px] lg:h-[640px] rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800/80 shadow-2xl select-none"
      dir="rtl"
    >
      {/* Background Backdrop Image with smooth fade */}
      <div className="absolute inset-0">
        <img
          key={current.id}
          src={current.banner || current.poster}
          alt={current.title}
          className="w-full h-full object-cover object-center scale-105 transition-all duration-1000 ease-out brightness-90 animate-in fade-in zoom-in-95 duration-700"
        />
        {/* Layered Cinematic Dark Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/50 to-transparent"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-12 flex flex-col justify-end pb-16 pt-24">
        <div className="max-w-2xl space-y-4">
          {/* Top Badges */}
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold shadow-lg shadow-red-900/40">
              <Sparkles className="w-3.5 h-3.5" />
              أحدث العروض الحصرية
            </span>

            {current.rating && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-neutral-700 text-xs font-bold text-amber-400 font-mono">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {current.rating} IMDb
              </span>
            )}

            <span className="px-2.5 py-1 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-700 text-xs text-neutral-300 font-mono">
              {current.year}
            </span>

            {current.duration && (
              <span className="px-2.5 py-1 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-700 text-xs text-neutral-300">
                {current.duration}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
            {current.title}
          </h1>

          {/* Genres Chips */}
          {current.genres && current.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {current.genres.map((g, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-lg bg-neutral-800/80 text-xs text-neutral-300 border border-neutral-700/50"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed line-clamp-3 max-w-xl drop-shadow">
            {current.story}
          </p>

          {/* Actions: Watch Now & Add to Watchlist */}
          <div className="pt-2 flex items-center flex-wrap gap-3">
            <Link
              href={`/watch?id=${encodeURIComponent(current.id)}`}
              id="hero-watch-now-btn"
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm shadow-xl shadow-red-950/40 transition"
            >
              <Play className="w-5 h-5 fill-white translate-x-0.5" />
              <span>مشاهدة الآن</span>
            </Link>

            <button
              type="button"
              id="hero-watchlist-btn"
              onClick={handleWatchlistToggle}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl backdrop-blur-md border font-medium text-sm transition active:scale-95 ${
                saved
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border-neutral-700/70 hover:text-white'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>في قائمتك</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 text-red-500" />
                  <span>إضافة لقائمتي</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Controls: Arrows & Indicators */}
      <div className="absolute bottom-6 left-6 sm:left-12 z-20 flex items-center gap-3">
        {/* Indicators */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`شريحة ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx ? 'w-8 bg-red-600' : 'w-2 bg-neutral-700 hover:bg-neutral-500'
              }`}
            />
          ))}
        </div>

        {/* Previous / Next Arrow Buttons */}
        <div className="flex items-center gap-1.5 mr-2">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="السابق"
            className="p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-800 backdrop-blur-md transition active:scale-90"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="التالي"
            className="p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-800 backdrop-blur-md transition active:scale-90"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
