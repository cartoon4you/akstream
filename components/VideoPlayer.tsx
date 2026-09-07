'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Tv,
  Check,
  Radio,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import { ServerOption } from '@/lib/types';

interface VideoPlayerProps {
  servers: ServerOption[];
  title?: string;
  poster?: string;
  onServerChange?: (server: ServerOption) => void;
}

export default function VideoPlayer({
  servers,
  title,
  poster,
  onServerChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active server
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const activeServer = servers[selectedServerIndex] || servers[0];

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [proxyOverride, setProxyOverride] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute if proxy should be used: user manual toggle or auto-detected for akwam/downet
  const useProxy = useMemo(() => {
    if (proxyOverride !== null) return proxyOverride;
    const u = activeServer?.url || '';
    return u.includes('downet.net') || u.includes('akwam') || u.includes('ak.sv');
  }, [proxyOverride, activeServer]);

  // Compute final stream URL (either proxied or direct)
  const streamUrl = useMemo(() => {
    if (!activeServer) return '';
    if (useProxy) {
      return `/api/proxy/video?url=${encodeURIComponent(activeServer.url)}&referer=${encodeURIComponent(activeServer.referer || 'https://akwam.ss/')}`;
    }
    return activeServer.url;
  }, [activeServer, useProxy]);

  // Handle HLS or Native MP4 attachment
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setErrorMsg(null);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = streamUrl.includes('.m3u8') || activeServer?.type === 'hls';

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (isPlaying) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('HLS Fatal Error:', data.type);
          if (!useProxy) {
            // Auto switch to proxy to bypass CORS/referer restriction
            setProxyOverride(true);
          } else {
            setErrorMsg('تعذر تشغيل هذا السيرفر، يرجى تجربة سيرفر آخر من القائمة.');
          }
        }
      });
    } else {
      // Native Video (MP4/WebM or Safari Native HLS)
      video.src = streamUrl;
      video.load();

      const handleCanPlay = () => {
        setIsLoading(false);
        if (isPlaying) {
          video.play().catch(() => {});
        }
      };

      const handleError = () => {
        if (!useProxy) {
          // Attempt proxy automatically if direct fails
          setProxyOverride(true);
        } else {
          setErrorMsg('تعذر تشغيل الرابط المباشر، يمكنك اختيار سيرفر بديل أدناه.');
          setIsLoading(false);
        }
      };

      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, activeServer]);

  // Seamless Quality / Server switch preserving exact playback position
  const changeQuality = (index: number) => {
    if (index === selectedServerIndex || !servers[index]) return;
    const video = videoRef.current;
    const timeSaved = video ? video.currentTime : currentTime;
    const wasPlaying = video ? !video.paused : isPlaying;

    setSelectedServerIndex(index);
    setProxyOverride(null);
    if (onServerChange && servers[index]) {
      onServerChange(servers[index]);
    }

    // Attach one-time listener to restore position as soon as metadata is loaded
    if (video) {
      const onMetadataLoaded = () => {
        try {
          video.currentTime = timeSaved;
          if (wasPlaying) {
            video.play().catch(() => {});
          }
        } catch (e) {
          // ignore
        }
        video.removeEventListener('loadedmetadata', onMetadataLoaded);
      };
      video.addEventListener('loadedmetadata', onMetadataLoaded);

      // Fallback timer
      setTimeout(() => {
        if (video) {
          if (Math.abs(video.currentTime - timeSaved) > 1) {
            video.currentTime = timeSaved;
          }
          if (wasPlaying && video.paused) {
            video.play().catch(() => {});
          }
        }
      }, 250);
    }
  };

  const switchServer = (index: number) => {
    changeQuality(index);
  };

  // Video event handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // Calculate buffer
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBuffered((bufferedEnd / (video.duration || 1)) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const target = parseFloat(e.target.value);
    video.currentTime = target;
    setCurrentTime(target);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    video.volume = val;
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      video.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        // Forward 10s (in RTL, ArrowRight can be forward or backward)
        if (videoRef.current) videoRef.current.currentTime += 10;
      } else if (e.code === 'ArrowLeft') {
        if (videoRef.current) videoRef.current.currentTime -= 10;
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted]);

  // Auto-hide controls during mouse inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettingsMenu(false);
      }
    }, 3000);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!servers || servers.length === 0) {
    return (
      <div className="w-full aspect-video bg-neutral-900 rounded-2xl flex flex-col items-center justify-center text-neutral-500 border border-neutral-800 p-6 text-center">
        <Tv className="w-12 h-12 text-neutral-600 mb-3" />
        <p className="text-sm font-medium text-neutral-300">لم يتم العثور على سيرفرات تشغيل متاحة لهذه المادة.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isTheaterMode ? 'w-full' : 'max-w-6xl mx-auto'}`}>
      {/* Player Container */}
      <div
        ref={containerRef}
        id="cinematic-video-player"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className="relative group aspect-video w-full rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl select-none"
      >
        <video
          ref={videoRef}
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          poster={poster}
          playsInline
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="w-12 h-12 rounded-full border-4 border-red-600/30 border-t-red-600 animate-spin"></div>
          </div>
        )}

        {/* Error Notice */}
        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/92 backdrop-blur-xl p-6 sm:p-8 text-center z-30 border border-neutral-800/80 rounded-2xl shadow-2xl transition-all duration-300 select-none">
            <p className="text-sm sm:text-base font-semibold text-neutral-200 mb-4 max-w-md leading-relaxed drop-shadow">
              {errorMsg}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setProxyOverride(!useProxy)}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-xs sm:text-sm font-bold text-white shadow-xl shadow-red-950/60 transition-all duration-200 flex items-center justify-center gap-2 border border-red-500/30 cursor-pointer"
              >
                {useProxy ? 'إعادة المحاولة عبر البروكسي' : 'تفعيل وسيط البث المباشر (Stream Proxy)'}
              </button>
              {servers.length > 1 && (
                <button
                  type="button"
                  onClick={() => switchServer((selectedServerIndex + 1) % servers.length)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 active:scale-95 text-xs font-semibold text-neutral-200 hover:text-white border border-neutral-700/80 transition flex items-center gap-2 cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5 text-neutral-400" />
                  تجربة سيرفر بديل
                </button>
              )}
            </div>
          </div>
        )}

        {/* Overlay Title when paused */}
        {showControls && title && (
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
              <h2 className="text-sm font-semibold truncate drop-shadow-md">{title}</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
              <span className="px-2 py-0.5 rounded bg-neutral-800/80 border border-neutral-700 text-white font-bold">
                {activeServer.quality}p
              </span>
              {useProxy && (
                <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-400 text-[10px]">
                  PROXIED
                </span>
              )}
            </div>
          </div>
        )}

        {/* Center Big Play Button (when paused) */}
        {!isPlaying && !isLoading && !errorMsg && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="تشغيل"
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-600 hover:scale-110 active:scale-95 text-white flex items-center justify-center shadow-2xl transition duration-200 backdrop-blur-sm"
          >
            <Play className="w-8 h-8 fill-white translate-x-0.5" />
          </button>
        )}

        {/* Custom Video Controls Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          dir="ltr"
        >
          {/* Progress Timeline */}
          <div className="relative w-full flex items-center group/timeline mb-3">
            {/* Buffered Progress */}
            <div
              className="absolute left-0 h-1.5 rounded-full bg-neutral-700/80 pointer-events-none"
              style={{ width: `${buffered}%` }}
            ></div>
            {/* Played Progress */}
            <div
              className="absolute left-0 h-1.5 rounded-full bg-red-600 pointer-events-none"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            ></div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 appearance-none bg-neutral-800 rounded-full cursor-pointer accent-red-600 opacity-90 hover:opacity-100 transition"
            />
          </div>

          {/* Controls Bottom Row */}
          <div className="flex items-center justify-between gap-2 text-white">
            {/* Left Controls: Play, Volume, Time */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 rounded-lg hover:bg-neutral-800/80 text-white transition"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime -= 10;
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-800/80 text-neutral-300 hover:text-white transition"
                title="إرجاع 10 ثواني"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime += 10;
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-800/80 text-neutral-300 hover:text-white transition"
                title="تقديم 10 ثواني"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/volume">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-neutral-800/80 text-white transition"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-red-500" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 appearance-none bg-neutral-700 rounded-full cursor-pointer accent-red-600 hidden sm:block"
                />
              </div>

              {/* Timestamp */}
              <div className="text-xs text-neutral-300 font-mono tracking-wider">
                <span>{formatTime(currentTime)}</span>
                <span className="text-neutral-500 mx-1">/</span>
                <span className="text-neutral-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Quality, Speed, Theater, Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Dynamic Quality Selector Dropdown (Seamless Switching) */}
              {servers && servers.length > 0 && (
                <div className="flex items-center gap-1.5 bg-neutral-900/90 hover:bg-neutral-800/90 border border-neutral-700/80 hover:border-neutral-500 rounded-xl px-2.5 py-1 transition shadow-sm">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <label htmlFor="qualitySelect" className="sr-only">اختر الجودة</label>
                  <select
                    id="qualitySelect"
                    value={selectedServerIndex}
                    onChange={(e) => changeQuality(parseInt(e.target.value))}
                    className="bg-transparent text-white text-xs font-bold font-mono focus:outline-none cursor-pointer pr-1"
                    title="تغيير جودة الفيديو بسلاسة مع حفظ وقت المشاهدة"
                    dir="rtl"
                  >
                    {servers.map((srv, idx) => (
                      <option key={idx} value={idx} className="bg-neutral-900 text-white py-1">
                        {srv.quality ? `${srv.quality}p` : srv.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Settings Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="p-1.5 rounded-lg hover:bg-neutral-800/80 text-neutral-300 hover:text-white transition"
                  title="الإعدادات والجودة"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {showSettingsMenu && (
                  <div
                    className="absolute bottom-10 right-0 w-52 bg-neutral-900/98 backdrop-blur-xl border border-neutral-800 rounded-2xl p-2 shadow-2xl z-40 text-xs"
                    dir="rtl"
                  >
                    <div className="p-2 border-b border-neutral-800 font-semibold text-neutral-300">
                      إعدادات البث
                    </div>

                    {/* Speed options */}
                    <div className="p-2 border-b border-neutral-800">
                      <span className="text-neutral-400 block mb-1 text-[11px]">سرعة التشغيل</span>
                      <div className="grid grid-cols-4 gap-1 text-center font-mono">
                        {[0.75, 1, 1.25, 1.5].map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => changePlaybackSpeed(speed)}
                            className={`py-1 rounded-md text-[11px] font-bold ${
                              playbackSpeed === speed
                                ? 'bg-red-600 text-white'
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Proxy toggle */}
                    <button
                      type="button"
                      onClick={() => setUseProxy(!useProxy)}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-neutral-300 hover:bg-neutral-800 text-right mt-1"
                    >
                      <span>توجيه عبر البروكسي</span>
                      {useProxy ? (
                        <Check className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <span className="text-[10px] text-neutral-500">معطل</span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Theater Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                className="hidden md:block p-1.5 rounded-lg hover:bg-neutral-800/80 text-neutral-300 hover:text-white transition"
                title="نمط المسرح"
              >
                <Tv className="w-4 h-4" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-neutral-800/80 text-white transition"
                title="ملء الشاشة"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Server & Quality Selection Bar Below Video */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 space-y-3" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Radio className="w-4 h-4 text-red-500 animate-pulse" />
            <span>سيرفرات المشاهدة والجودات المتاحة:</span>
          </div>
          <span className="text-xs text-neutral-400">
            اختر السيرفر أو الجودة لتحديث البث تلقائياً دون إعادة تحميل الصفحة
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {servers.map((srv, idx) => {
            const isSelected = selectedServerIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => switchServer(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition border ${
                  isSelected
                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/30 scale-[1.02]'
                    : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800 hover:text-white hover:border-neutral-600'
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-black/40 text-[11px] font-mono font-bold">
                  {srv.quality}p
                </span>
                <span>{srv.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>

        {/* Direct Download Link Option */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span>رابط التشغيل المباشر: {activeServer?.name}</span>
          <a
            href={activeServer?.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium transition"
          >
            <span>تحميل مباشر للملف</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
