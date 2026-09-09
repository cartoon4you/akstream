'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4" dir="rtl">
      <h1 className="text-5xl font-extrabold text-red-500 mb-4">حدث خطأ ما</h1>
      <p className="text-neutral-300 mb-6 max-w-md">
        حدث خطأ غير متوقع أثناء تحميل هذه الصفحة. يرجى المحاولة مرة أخرى.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
        >
          إعادة المحاولة
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
        >
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
