'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
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

let memoryWatchlist: WatchlistItem[] = [];
let lastRawJson = '';
const listeners = new Set<() => void>();

function getGuestSnapshot(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
    if (saved !== lastRawJson) {
      lastRawJson = saved;
      memoryWatchlist = JSON.parse(saved);
    }
  } catch {
    memoryWatchlist = [];
  }
  return memoryWatchlist;
}

const emptySnapshot: WatchlistItem[] = [];
function getServerSnapshot(): WatchlistItem[] {
  return emptySnapshot;
}

function subscribeGuest(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function emitGuestChange(newItems: WatchlistItem[]) {
  try {
    const raw = JSON.stringify(newItems);
    lastRawJson = raw;
    memoryWatchlist = newItems;
    localStorage.setItem(LOCAL_STORAGE_KEY, raw);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const guestWatchlist = useSyncExternalStore(subscribeGuest, getGuestSnapshot, getServerSnapshot);
  const [firestoreWatchlist, setFirestoreWatchlist] = useState<WatchlistItem[]>([]);
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
        setFirestoreWatchlist(items);
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
              lastRawJson = '';
              memoryWatchlist = [];
              listeners.forEach((l) => l());
            }
          }
        } catch {
          // ignore
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, watchlistColPath);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const watchlist = currentUser ? firestoreWatchlist : guestWatchlist;

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
      const updated = [...guestWatchlist.filter((i) => i.id !== item.id), watchItem];
      emitGuestChange(updated);
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
      const updated = guestWatchlist.filter((i) => i.id !== itemId);
      emitGuestChange(updated);
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
