'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Film, AlertCircle } from 'lucide-react';
import MediaCard from '@/components/MediaCard';
import { MediaItem } from '@/lib/types';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function performSearch(term: string) {
      if (!term.trim()) {
        setResults([]);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data || []);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }

    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8" dir="rtl">
      {/* Search Header & Bar */}
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          البحث في مكتبة أكوام
        </h1>
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب اسم الفيلم أو المسلسل..."
            className="w-full bg-neutral-900 text-white placeholder-neutral-500 pl-4 pr-12 py-3.5 rounded-2xl border border-neutral-800 focus:outline-none focus:border-red-600 shadow-xl transition"
          />
          <button
            type="submit"
            className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-white"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Results Header */}
      {initialQuery && (
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <p className="text-sm text-neutral-300">
            نتائج البحث عن: <span className="text-red-500 font-bold">&ldquo;{initialQuery}&rdquo;</span>
          </p>
          <span className="text-xs text-neutral-400 font-mono">
            {results.length} نتيجة
          </span>
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {results.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      ) : initialQuery ? (
        <div className="p-16 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800/60 space-y-3">
          <AlertCircle className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-neutral-300 font-medium">لم يتم العثور على نتائج مطابقة لكلمة البحث.</p>
          <p className="text-neutral-500 text-xs">تأكد من كتابة الكلمة بشكل صحيح أو جرب كلمات مفتاحية أخرى.</p>
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto p-12 text-center text-neutral-400">
          جاري التحميل...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
