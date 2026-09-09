import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { WatchlistProvider } from '@/contexts/WatchlistContext';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import TelemetryOptimization from '@/components/TelemetryOptimization';
import Link from 'next/link';
import { Film, Heart, Shield, Sparkles } from 'lucide-react';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: 'يمن فلکس YemenFlex - منصة مشاهدة أحدث الأفلام والمسلسلات',
  description:
    'يمن فلکس (YemenFlex) - منصة مشاهدة الأفلام والمسلسلات مع جودات متعددة وسيرفرات سريعة وقائمة مشاهدة سحابية متزامنة.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'يمن فلکس YemenFlex',
  },
  openGraph: {
    title: 'يمن فلکس YemenFlex - منصة مشاهدة أحدث الأفلام والمسلسلات',
    description:
      'يمن فلکس (YemenFlex) - منصة مشاهدة الأفلام والمسلسلات مع جودات متعددة وسيرفرات سريعة وقائمة مشاهدة سحابية متزامنة.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'يمن فلکس YemenFlex',
    description:
      'يمن فلکس (YemenFlex) - منصة مشاهدة الأفلام والمسلسلات مع جودات متعددة وسيرفرات سريعة.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark bg-neutral-950 text-neutral-100">
      <head>
        {/* Mobile & Web App optimization */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* Connection Warming for Media Delivery & CDN Domains */}
        <link rel="preconnect" href="https://downet.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://downet.net" />
        <link rel="preconnect" href="https://img.downet.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.downet.net" />
        <link rel="preconnect" href="https://akwam.ss" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://play.google.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://play.google.com" />
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-neutral-950 selection:bg-red-600 selection:text-white pb-[env(safe-area-inset-bottom,0px)]" suppressHydrationWarning>
        <TelemetryOptimization />
        <AuthProvider>
          <WatchlistProvider>
            <Navbar />
            <main className="flex-1 w-full pb-24 md:pb-16">{children}</main>
            <MobileBottomNav />
            <footer className="w-full bg-neutral-950 border-t border-neutral-800/80 py-10 px-4 sm:px-8 text-neutral-400 text-xs mb-16 md:mb-0" dir="rtl">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">يمن فلکس (YemenFlex)</span>
                    <p className="text-[11px] text-neutral-400">بث فائق الجودة، سيرفرات سريعة، وبدون إعلانات مزعجة.</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-neutral-400">
                  <Link href="/" className="hover:text-white transition">الرئيسية</Link>
                  <Link href="/catalog?type=movie" className="hover:text-white transition">الأفلام</Link>
                  <Link href="/catalog?type=series" className="hover:text-white transition">المسلسلات</Link>
                  <Link href="/watchlist" className="hover:text-white transition">قائمة المشاهدة</Link>
                </div>

                <div className="flex items-center gap-2 text-neutral-400">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>تزامن سحابي آمن عبر Firebase Firestore</span>
                </div>
              </div>
            </footer>
          </WatchlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
