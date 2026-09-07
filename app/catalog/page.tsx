'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Filter,
  ArrowUpDown,
  Film,
  Tv,
  Globe,
  Sparkles,
  Flame,
  Clapperboard,
  Video,
} from 'lucide-react';
import MediaCard from '@/components/MediaCard';
import { MediaItem, CategoryOption } from '@/lib/types';
import { CATEGORIES } from '@/lib/catalog-data';

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get('category') || 'all';
  const activeType = searchParams.get('type') || 'all';
  const activeSort = searchParams.get('sort') || 'latest';
  const activePage = parseInt(searchParams.get('page') || '1', 10);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchFilteredCatalog() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (activeCategory && activeCategory !== 'all') {
          params.set('category', activeCategory);
        }
        if (activeType && activeType !== 'all') {
          params.set('type', activeType);
        }
        if (activeSort) {
          params.set('sort', activeSort);
        }
        params.set('page', activePage.toString());

        const res = await fetch(`/api/catalog?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setItems(data.data || []);
          setTotalCount(data.pagination?.total || 0);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch (error) {
        console.error('Catalog fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFilteredCatalog();
  }, [activeCategory, activeType, activeSort, activePage]);

  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === 'all' || !val) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    // Reset to page 1 on filter change
    params.set('page', '1');
    router.push(`/catalog?${params.toString()}`);
  };

  const getActiveCategoryTitle = () => {
    const found = CATEGORIES.find((c) => c.id === activeCategory);
    return found ? found.label : 'جميع التصنيفات';
  };

  return (
    <div className="w-full space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6" dir="rtl">
      {/* Category Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800/90 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-red-500 font-mono">
            <LayoutGrid className="w-4 h-4" />
            <span>تصفح الكتالوج وفلترة الأقسام</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {getActiveCategoryTitle()}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            استعرض الأفلام والمسلسلات بحسب التصنيف والجودة وسنة الإصدار
          </p>
        </div>
      </div>

      {/* Categories Filter Tabs (Desktop & Mobile Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              id={`cat-filter-${cat.id}`}
              onClick={() => updateFilters({ category: cat.id })}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition border active:scale-95 ${
                isSelected
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/40'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Filters: Type (Movies / Series) and Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800/80">
        {/* Type Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-400 ml-2">النوع:</span>
          {[
            { id: 'all', label: 'الكل' },
            { id: 'movie', label: 'أفلام فقط' },
            { id: 'series', label: 'مسلسلات فقط' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              id={`type-filter-${t.id}`}
              onClick={() => updateFilters({ type: t.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeType === t.id
                  ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort Filter */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-xs text-neutral-400">الترتيب:</span>
          <select
            value={activeSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="bg-neutral-950 text-xs text-neutral-200 border border-neutral-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-red-600"
          >
            <option value="latest">الأحدث إضافة</option>
            <option value="rating">الأعلى تقييماً (IMDb)</option>
            <option value="year">سنة الإنتاج</option>
          </select>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800/60 space-y-3">
          <p className="text-neutral-400 text-sm">لم يتم العثور على أي أعمال في هذا التصنيف حالياً.</p>
          <button
            type="button"
            onClick={() => updateFilters({ category: 'all', type: 'all' })}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto p-8 text-center text-neutral-400">
          جاري تحميل التصنيفات...
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
