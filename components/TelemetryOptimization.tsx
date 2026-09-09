'use client';

import { useEffect } from 'react';

/**
 * Optimizes network performance and prevents resource contention by:
 * 1. Deferring background non-critical telemetry and network calls until browser idle state
 * 2. Performing connection warming (DNS prefetching and preconnect) during idle frames
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
      ];

      cdnEndpoints.forEach((endpoint) => {
        try {
          if (!document.querySelector(`link[href="${endpoint}"]`)) {
            const preconnect = document.createElement('link');
            preconnect.rel = 'preconnect';
            preconnect.href = endpoint;
            preconnect.crossOrigin = 'anonymous';
            document.head.appendChild(preconnect);
          }
        } catch {
          // Ignore DOM exceptions in sandboxed frames
        }
      });
    }, 2500);

    return () => {
      if ('cancelIdleCallback' in window && typeof idleId === 'number') {
        (window as Window & { cancelIdleCallback: any }).cancelIdleCallback(idleId);
      }
    };
  }, []);

  return null;
}
