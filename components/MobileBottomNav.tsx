'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Film, Tv, Search, Bookmark } from 'lucide-react';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { useIsMounted } from '@/hooks/use-mounted';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { watchlist } = useWatchlist();
  const mounted = useIsMounted();

  const navItems = [
    {
      id: 'bottom-nav-home',
      label: 'الرئيسية',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      id: 'bottom-nav-movies',
      label: 'الأفلام',
      href: '/catalog?type=movie',
      icon: Film,
      isActive: pathname === '/catalog' && typeof window !== 'undefined' && window.location.search.includes('type=movie'),
    },
    {
      id: 'bottom-nav-series',
      label: 'المسلسلات',
      href: '/catalog?type=series',
      icon: Tv,
      isActive: pathname === '/catalog' && typeof window !== 'undefined' && window.location.search.includes('type=series'),
    },
    {
      id: 'bottom-nav-search',
      label: 'البحث',
      href: '/catalog',
      icon: Search,
      isActive: pathname === '/search' || (pathname === '/catalog' && typeof window !== 'undefined' && !window.location.search.includes('type=')),
    },
    {
      id: 'bottom-nav-watchlist',
      label: 'قائمتي',
      href: '/watchlist',
      icon: Bookmark,
      isActive: pathname === '/watchlist',
      badge: mounted && watchlist.length > 0 ? watchlist.length : undefined,
    },
  ];

  return (
    <nav
      id="mobile-bottom-navbar"
      aria-label="التنقل السريع للجوال"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-[env(safe-area-inset-bottom,0px)]"
      dir="rtl"
    >
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <Link
              key={item.id}
              id={item.id}
              href={item.href}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-all select-none active:scale-90 ${
                active ? 'text-red-500 font-bold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    active ? 'scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''
                  }`}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono flex items-center justify-center border border-neutral-950">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 leading-none tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
