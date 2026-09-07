'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Film,
  Search,
  Bookmark,
  ChevronDown,
  Globe,
  Tv,
  Sparkles,
  Flame,
  Clapperboard,
  Video,
  LayoutGrid,
  LogIn,
  LogOut,
  User,
  X,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { CATEGORIES } from '@/lib/catalog-data';
import { useIsMounted } from '@/hooks/use-mounted';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const { watchlist } = useWatchlist();
  const mounted = useIsMounted();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target as Node)
      ) {
        setIsCategoriesOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Film':
        return <Film className="w-4 h-4 text-red-500" />;
      case 'Globe':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'Tv':
        return <Tv className="w-4 h-4 text-emerald-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'Flame':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'Clapperboard':
        return <Clapperboard className="w-4 h-4 text-purple-400" />;
      case 'Video':
        return <Video className="w-4 h-4 text-cyan-400" />;
      default:
        return <LayoutGrid className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-50 w-full bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 transition-all"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo & Main Nav */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            id="brand-logo"
            className="flex items-center gap-2.5 group transition-transform active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/30 group-hover:shadow-red-600/40 transition">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-wide text-white group-hover:text-red-500 transition">
                أكوام <span className="text-red-500">سينما</span>
              </span>
              <span className="text-[10px] text-neutral-400 -mt-1 font-mono tracking-wider">
                AKWAM STREAM
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/"
              id="nav-link-home"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                pathname === '/'
                  ? 'text-white bg-neutral-900 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              الرئيسية
            </Link>

            <Link
              href="/catalog?type=movie"
              id="nav-link-movies"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                pathname.includes('type=movie')
                  ? 'text-white bg-neutral-900 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              الأفلام
            </Link>

            <Link
              href="/catalog?type=series"
              id="nav-link-series"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                pathname.includes('type=series')
                  ? 'text-white bg-neutral-900 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              المسلسلات
            </Link>

            {/* DEDICATED CATEGORIES DROPDOWN */}
            <div className="relative" ref={categoriesRef}>
              <button
                type="button"
                id="categories-dropdown-btn"
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${
                  isCategoriesOpen || pathname.startsWith('/catalog')
                    ? 'text-red-500 bg-neutral-900/90 font-semibold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-red-500" />
                <span>التصنيفات</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isCategoriesOpen ? 'rotate-180 text-red-500' : 'text-neutral-400'
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isCategoriesOpen && (
                <div
                  id="categories-dropdown-menu"
                  className="absolute right-0 mt-2 w-64 bg-neutral-900/98 backdrop-blur-xl border border-neutral-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="px-3 py-2 text-xs font-semibold text-neutral-400 border-b border-neutral-800/80 mb-1">
                    تصفح حسب القسم
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {CATEGORIES.map((cat) => (
                      <Link
                        key={cat.id}
                        href={cat.id === 'all' ? '/catalog' : `/catalog?category=${cat.id}`}
                        id={`category-item-${cat.id}`}
                        onClick={() => setIsCategoriesOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          {getCategoryIcon(cat.icon)}
                          <span>{cat.label}</span>
                        </div>
                        <span className="text-[11px] text-neutral-500 group-hover:text-red-400 transition">
                          عرض
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Watchlist Link */}
            <Link
              href="/watchlist"
              id="nav-link-watchlist"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                pathname === '/watchlist'
                  ? 'text-white bg-neutral-900 font-semibold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <Bookmark className="w-4 h-4 text-red-500" />
              <span>قائمتي</span>
              {mounted && watchlist.length > 0 && (
                <span
                  id="watchlist-badge-count"
                  className="px-1.5 py-0.2 text-[11px] rounded-full bg-red-600 text-white font-bold"
                >
                  {watchlist.length}
                </span>
              )}
            </Link>

            {/* LinkGrabber Tool Link */}
            <Link
              href="/linkgrabber"
              id="nav-link-linkgrabber"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                pathname === '/linkgrabber'
                  ? 'text-white bg-red-600/20 text-red-400 font-semibold border border-red-500/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <Layers className="w-4 h-4 text-red-500" />
              <span>محلل الروابط (LinkGrabber)</span>
            </Link>
          </nav>
        </div>

        {/* Right Side: Search & User Account */}
        <div className="flex items-center gap-3">
          {/* Search Form (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            id="search-form-desktop"
            className="relative hidden md:block w-64 lg:w-72"
          >
            <input
              type="text"
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن فيلم أو مسلسل..."
              className="w-full bg-neutral-900/90 text-sm text-white placeholder-neutral-500 pl-4 pr-10 py-2 rounded-full border border-neutral-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition"
            />
            <button
              type="submit"
              id="search-submit-btn"
              className="absolute right-3 top-2.5 text-neutral-400 hover:text-white transition"
              aria-label="بحث"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* User Profile / Firebase Auth Button */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                id="user-profile-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-neutral-800/80 border border-neutral-800 transition"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-red-500/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-700 flex items-center justify-center text-white text-xs font-bold border border-neutral-700">
                    {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                  </div>
                )}
                <span className="hidden sm:block text-xs font-medium text-neutral-200 max-w-[100px] truncate">
                  {currentUser.displayName || 'حسابي'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {isUserMenuOpen && (
                <div
                  id="user-profile-dropdown"
                  className="absolute left-0 mt-2 w-56 bg-neutral-900/98 backdrop-blur-xl border border-neutral-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="px-3 py-2.5 border-b border-neutral-800/80">
                    <p className="text-sm font-semibold text-white truncate">
                      {currentUser.displayName || 'المستخدم'}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {currentUser.email}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      متزامن مع Firestore
                    </div>
                  </div>

                  <div className="mt-1 space-y-1">
                    <Link
                      href="/watchlist"
                      id="dropdown-user-watchlist"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
                    >
                      <span className="flex items-center gap-2">
                        <Bookmark className="w-3.5 h-3.5 text-red-500" />
                        قائمة المشاهدة السحابية
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                        {watchlist.length}
                      </span>
                    </Link>

                    <button
                      type="button"
                      id="dropdown-logout-btn"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              id="sign-in-btn"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-red-900/20 transition disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{authLoading ? 'جاري الاتصال...' : 'تسجيل الدخول'}</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            id="mobile-menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800"
            aria-label="القائمة"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu-drawer"
          className="lg:hidden bg-neutral-950/98 border-b border-neutral-800 px-4 pt-3 pb-6 space-y-4"
        >
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              id="search-input-mobile"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن فيلم أو مسلسل..."
              className="w-full bg-neutral-900 text-sm text-white placeholder-neutral-500 pl-4 pr-10 py-2 rounded-xl border border-neutral-800 focus:outline-none focus:border-red-600"
            />
            <button
              type="submit"
              className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Mobile Nav Links */}
          <div className="grid grid-cols-2 gap-2 text-center text-sm font-medium">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-neutral-900 text-neutral-200"
            >
              الرئيسية
            </Link>
            <Link
              href="/catalog?type=movie"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-neutral-900 text-neutral-200"
            >
              الأفلام
            </Link>
            <Link
              href="/catalog?type=series"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-neutral-900 text-neutral-200"
            >
              المسلسلات
            </Link>
            <Link
              href="/watchlist"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-neutral-900 text-neutral-200 flex items-center justify-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5 text-red-500" />
              <span>قائمتي {mounted && watchlist.length > 0 ? `(${watchlist.length})` : ''}</span>
            </Link>
            <Link
              href="/linkgrabber"
              onClick={() => setIsMobileMenuOpen(false)}
              className="col-span-2 p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center gap-2 font-semibold"
            >
              <Layers className="w-4 h-4 text-red-500" />
              <span>محلل الروابط (LinkGrabber)</span>
            </Link>
          </div>

          {/* Mobile Categories Accordion */}
          <div className="border-t border-neutral-900 pt-3">
            <div className="text-xs font-semibold text-neutral-400 mb-2">
              التصنيفات المتاحة
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.id === 'all' ? '/catalog' : `/catalog?category=${cat.id}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/60 text-xs text-neutral-300 hover:text-white"
                >
                  {getCategoryIcon(cat.icon)}
                  <span className="truncate">{cat.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
