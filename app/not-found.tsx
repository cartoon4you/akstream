import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4" dir="rtl">
      <h1 className="text-6xl font-extrabold text-red-500 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-neutral-100 mb-2">الصفحة غير موجودة</h2>
      <p className="text-neutral-400 mb-6 max-w-md">
        عذراً، الصفحة أو المحتوى الذي تبحث عنه غير متوفر أو تم نقله.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
