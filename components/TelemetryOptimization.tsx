'use client';

import { useEffect } from 'react';
import { SAMPLE_CATALOG } from '@/lib/catalog-data';
import { preloadImage, preloadMediaDetails } from '@/lib/preload-manager';

/**
 * Optimizes network performance and prevents resource contention by:
 * 1. Deferring background non-critical telemetry and network calls until browser idle state
 * 2. Performing connection warming (DNS prefetching and preconnect) during idle frames
 * 3. Preloading top featured items & backdrops for instant user responsiveness
 */
export default function TelemetryOptimization() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Helper for scheduling work during browser idle frames
    const scheduleOnIdle = (task: () => void, timeout = 3000) => {
      if ('requestIdleCallback' in window) {
        return (window as Window & { requestIdleCallback: any }).requestIdleCallback(task, { timeout });
      }
      return setTimeout(task, 1500);
    };

    // Idle-deferred connection warming
    const idleId = scheduleOnIdle(() => {
      const cdnEndpoints = [
        'https://downet.net',
        'https://img.downet.net',
        'https://akwam.ss',
        'https://images.unsplash.com',
        'https://play.google.com',
      ];

      cdnEndpoints.forEach((endpoint) => {
        try {
          if (!document.querySelector(`link[href="${endpoint}"][rel="preconnect"]`)) {
            const preconnect = document.createElement('link');
            preconnect.rel = 'preconnect';
            preconnect.href = endpoint;
            preconnect.crossOrigin = 'anonymous';
            document.head.appendChild(preconnect);
          }
          if (!document.querySelector(`link[href="${endpoint}"][rel="dns-prefetch"]`)) {
            const dnsPrefetch = document.createElement('link');
            dnsPrefetch.rel = 'dns-prefetch';
            dnsPrefetch.href = endpoint;
            document.head.appendChild(dnsPrefetch);
          }
        } catch {
          // Ignore DOM exceptions in sandboxed frames
        }
      });

      // Preload top 4 featured hero items in idle state
      const topItems = SAMPLE_CATALOG.slice(0, 4);
      topItems.forEach((item) => {
        if (item.poster) preloadImage(item.poster, 'auto');
        if (item.banner) preloadImage(item.banner, 'low');
        if (item.id) preloadMediaDetails(item.id);
      });
    }, 2000);

    return () => {
      if ('cancelIdleCallback' in window && typeof idleId === 'number') {
        (window as Window & { cancelIdleCallback: any }).cancelIdleCallback(idleId);
      }
    };
  }, []);

  return null;
}
