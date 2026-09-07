'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { WatchlistItem, MediaItem } from '@/lib/types';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  addToWatchlist: (item: MediaItem | WatchlistItem) => Promise<void>;
  removeFromWatchlist: (itemId: string) => Promise<void>;
  isInWatchlist: (itemId: string) => boolean;
  isCloudSynced: boolean;
  loading: boolean;
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchlist: [],
  addToWatchlist: async () => {},
  removeFromWatchlist: async () => {},
  isInWatchlist: () => false,
  isCloudSynced: false,
  loading: false,
});

const LOCAL_STORAGE_KEY = 'akwam_guest_watchlist_v1';

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);

  // 1. Sync from Firestore when user is logged in
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const watchlistColPath = `users/${currentUser.uid}/watchlist`;
    const watchlistRef = collection(db, 'users', currentUser.uid, 'watchlist');

    const unsubscribe = onSnapshot(
      watchlistRef,
      (snapshot) => {
        const items: WatchlistItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as WatchlistItem);
        });
        setWatchlist(items);
        setLoading(false);

        // Also if guest had items in localStorage, offer to sync them to Firestore
        try {
          const guestSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (guestSaved) {
            const guestItems: WatchlistItem[] = JSON.parse(guestSaved);
            if (guestItems.length > 0) {
              guestItems.forEach(async (gItem) => {
                const itemRef = doc(db, 'users', currentUser.uid, 'watchlist', gItem.id);
                await setDoc(itemRef, {
                  ...gItem,
                  userId: currentUser.uid,
                });
              });
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
          }
        } catch {
          // ignore
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, watchlistColPath);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addToWatchlist = async (item: MediaItem | WatchlistItem) => {
    const watchItem: WatchlistItem = {
      id: item.id,
      title: item.title,
      poster: item.poster,
      rating: item.rating || 'N/A',
      year: item.year || '',
      type: item.type || 'movie',
      userId: currentUser ? currentUser.uid : 'guest',
      addedAt: new Date().toISOString(),
    };

    if (currentUser) {
      const docPath = `users/${currentUser.uid}/watchlist/${item.id}`;
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'watchlist', item.id);
        await setDoc(docRef, watchItem);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, docPath);
      }
    } else {
      // Local storage fallback
      const updated = [...watchlist.filter((i) => i.id !== item.id), watchItem];
      setWatchlist(updated);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage error
      }
    }
  };

  const removeFromWatchlist = async (itemId: string) => {
    if (currentUser) {
      const docPath = `users/${currentUser.uid}/watchlist/${itemId}`;
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'watchlist', itemId);
        await deleteDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    } else {
      const updated = watchlist.filter((i) => i.id !== itemId);
      setWatchlist(updated);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const isInWatchlist = (itemId: string) => {
    return watchlist.some((i) => i.id === itemId);
  };

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        isCloudSynced: !!currentUser,
        loading,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
