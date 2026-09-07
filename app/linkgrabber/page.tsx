'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Copy,
  Check,
  Search,
  FileDown,
  Layers,
  Sparkles,
  Play,
  Terminal,
  CheckSquare,
  Square,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { LinkGrabberResult, LinkGrabberFile } from '@/lib/types';

export default function LinkGrabberPage() {
  const [targetInput, setTargetInput] = useState('https://akwam.ss/movie/11382/harudu');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LinkGrabberResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPythonCode, setShowPythonCode] = useState(false);

  // Sequential batch download state
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentFilename: '' });

  // Quick preset links
  const presets = [
    { label: 'فيلم هارودو (Harudu 2026)', url: 'https://akwam.ss/movie/11382/harudu' },
    { label: 'مسلسل الحشاشين', url: 'https://akwam.ss/series/1120/al-hashashin' },
    { label: 'فيلم The Batman', url: 'The Batman' },
    { label: 'فيلم سبايدرمان', url: 'Spider-Man' },
  ];

  const handleAnalyze = useCallback(async (inputToUse?: string) => {
    const input = (inputToUse || targetInput).trim();
    if (!input) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/linkgrabber?url=${encodeURIComponent(input)}`);
      const data = await res.json();

      if (data.success && data.data) {
        setResult(data.data);
        setSelectedFileIds(data.data.files.map((f: LinkGrabberFile) => f.id));
      } else {
        setError(data.error || 'تعذر استخراج روابط الصفحة المستهدفة');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ في الاتصال بالسيرفر';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [targetInput]);

  // Initial load on mount
  useEffect(() => {
    let mounted = true;

    async function initialFetch() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/linkgrabber?url=${encodeURIComponent('https://akwam.ss/movie/11382/harudu')}`);
        const data = await res.json();
        if (mounted) {
          if (data.success && data.data) {
            setResult(data.data);
            setSelectedFileIds(data.data.files.map((f: LinkGrabberFile) => f.id));
          } else {
            setError(data.error || 'تعذر استخراج روابط الصفحة المستهدفة');
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'حدث خطأ في الاتصال بالسيرفر';
          setError(msg);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initialFetch();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleSelectAll = () => {
    if (!result) return;
    if (selectedFileIds.length === result.files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(result.files.map((f) => f.id));
    }
  };

  const toggleFileSelection = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Copy all direct links for JDownloader / IDM
  const handleCopyAllLinks = () => {
    if (!result) return;
    const selectedFiles = result.files.filter((f) => selectedFileIds.includes(f.id));
    const linksToCopy = (selectedFiles.length > 0 ? selectedFiles : result.files)
      .map((f) => f.direct_url)
      .join('\n');

    navigator.clipboard.writeText(linksToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Copy single link
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export links as .txt file
  const handleExportTxt = () => {
    if (!result) return;
    const selectedFiles = result.files.filter((f) => selectedFileIds.includes(f.id));
    const filesToExport = selectedFiles.length > 0 ? selectedFiles : result.files;

    const content = [
      `# ========================================================`,
      `# Akwam LinkGrabber Export - ${result.title}`,
      `# Source: ${result.source_url}`,
      `# Generated: ${new Date().toLocaleString('ar-EG')}`,
      `# Compatible with JDownloader, IDM, wget, curl`,
      `# ========================================================`,
      ``,
      ...filesToExport.map((f) => `# ${f.filename} (${f.quality} - ${f.size || 'N/A'})\n${f.direct_url}\n`),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.title.replace(/\s+/g, '_')}_links.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Automated Sequential Batch Downloader (emulates JDownloader sequence)
  const handleSequentialBatchDownload = async () => {
    if (!result) return;
    const selectedFiles = result.files.filter((f) => selectedFileIds.includes(f.id));
    const filesToDownload = selectedFiles.length > 0 ? selectedFiles : result.files;

    if (filesToDownload.length === 0) return;

    setIsBatchDownloading(true);
    setBatchProgress({ current: 0, total: filesToDownload.length, currentFilename: '' });

    for (let i = 0; i < filesToDownload.length; i++) {
      const file = filesToDownload[i];
      setBatchProgress({
        current: i + 1,
        total: filesToDownload.length,
        currentFilename: file.filename,
      });

      // Trigger download via anchor
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = file.proxy_url;
      downloadAnchor.download = file.filename;
      downloadAnchor.target = '_blank';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      // Wait 1.8 seconds between downloads so browser doesn't throttle or block popup
      if (i < filesToDownload.length - 1) {
        await new Promise((res) => setTimeout(res, 1800));
      }
    }

    setIsBatchDownloading(false);
  };

  // Python code snippet matching user's architecture
  const pythonCodeSnippet = `import requests
from bs4 import BeautifulSoup
import re
import os

def link_grabber(target_url):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    print(f"[*] Analyzing target page: {target_url}")
    response = requests.get(target_url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')

    qualities = {}
    
    # Extract quality tabs (1080p, 720p, 480p)
    for link in soup.find_all('a', href=True):
        href = link['href']
        text = link.get_text().strip()
        
        if '/watch/' in href or '/download/' in href or 'downet.net' in href:
            match = re.search(r'(1080p|720p|480p|4k)', text + ' ' + href, re.IGNORECASE)
            quality = match.group(1).lower() if match else '720p'
            if quality not in qualities:
                qualities[quality] = href

    print(f"[+] Found {len(qualities)} video qualities:")
    for q, url in qualities.items():
        print(f"  - [{q.upper()}]: {url}")

    return qualities

# Usage example
if __name__ == '__main__':
    url = "${result?.source_url || 'https://akwam.ss/movie/11382/harudu'}"
    links = link_grabber(url)
`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" dir="rtl">
      {/* 1. Page Header */}
      <section className="bg-gradient-to-l from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              محلل الروابط واستخراج الملفات دفعة واحدة (LinkGrabber)
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              يعمل مثل برنامج JDownloader: يفحص صفحة أكوام، يكتشف جميع الجودات (1080p, 720p, 480p)، ويستخرج الروابط المباشرة لتحميلها متتالياً.
            </p>
          </div>
        </div>

        {/* Search / Target URL Bar */}
        <div className="pt-2 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="أدخل رابط صفحة أكوام (مثال: https://akwam.ss/movie/11382/harudu) أو اسم الفيلم/المسلسل..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition pl-10"
              />
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition shadow-lg shadow-red-950/40 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الفحص العميق...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>فحص واستخراج الروابط</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-400 pt-1">
            <span className="font-semibold text-neutral-300">أمثلة سريعة:</span>
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTargetInput(preset.url);
                  handleAnalyze(preset.url);
                }}
                className="px-3 py-1 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60 hover:border-neutral-600 transition"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Error Message */}
      {error && (
        <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-4 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => handleAnalyze()}
            className="text-xs font-bold underline hover:text-white"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* 3. Batch Download Progress Bar (When Active) */}
      {isBatchDownloading && (
        <div className="bg-neutral-900/90 border border-amber-500/40 rounded-2xl p-4 space-y-2 text-neutral-200">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-amber-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              جاري التحميل المتتالي التلقائي ({batchProgress.current} من {batchProgress.total})
            </span>
            <span className="font-mono text-neutral-400">{batchProgress.currentFilename}</span>
          </div>
          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-neutral-400">
            يتم إرسال الملفات تباعاً إلى متصفحك أو برنامج التحميل لتفادي حظر التنزيلات المتزامنة.
          </p>
        </div>
      )}

      {/* 4. LinkGrabber Results */}
      {result && (
        <div className="space-y-6">
          {/* Media Header Card */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {result.poster && (
                <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-2xl overflow-hidden border border-neutral-800 shadow-md shrink-0">
                  <Image
                    src={result.poster}
                    alt={result.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-red-600/90 text-xs font-bold text-white font-mono">
                    {result.type === 'series' ? 'مسلسل كامل' : 'فيلم'}
                  </span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    تم التحقق من الروابط
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {result.title}
                </h2>
                <p className="text-xs text-neutral-400 truncate max-w-md font-mono" dir="ltr">
                  Source: {result.source_url}
                </p>
                <div className="flex items-center gap-3 text-xs text-neutral-400 pt-1">
                  <span>الملفات المكتشفة: <strong className="text-white font-mono">{result.files.length}</strong></span>
                  <span>الجودات المتوفرة: <strong className="text-white font-mono">{Object.keys(result.qualities).join(', ')}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Link to Watch in Player */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Link
                href={`/watch?id=${encodeURIComponent(result.source_url.replace('https://akwam.ss', ''))}`}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 w-full md:w-auto transition"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>فتح في المشغل المدمج</span>
              </Link>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
              >
                {selectedFileIds.length === result.files.length ? (
                  <CheckSquare className="w-4 h-4 text-red-500" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-500" />
                )}
                <span>تحديد الكل ({result.files.length})</span>
              </button>

              <span className="text-neutral-600">|</span>
              <span className="text-xs text-neutral-400">
                المحدد: <strong className="text-white font-mono">{selectedFileIds.length}</strong> ملف
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Copy All Links */}
              <button
                type="button"
                onClick={handleCopyAllLinks}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition active:scale-95"
                title="نسخ الروابط المباشرة دفعة واحدة للبرامج كـ JDownloader / IDM"
              >
                {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-neutral-400" />}
                <span>{copiedAll ? 'تم نسخ الروابط بنجاح!' : 'نسخ الروابط دفعة واحدة (JDownloader)'}</span>
              </button>

              {/* Sequential Batch Download */}
              <button
                type="button"
                onClick={handleSequentialBatchDownload}
                disabled={isBatchDownloading || selectedFileIds.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-red-950/40 active:scale-95"
                title="بدء تحميل الملفات المختارة واحداً تلو الآخر تلقائياً"
              >
                <Download className="w-4 h-4" />
                <span>تحميل متتالي تلقائي</span>
              </button>

              {/* Export to .txt */}
              <button
                type="button"
                onClick={handleExportTxt}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition"
                title="تصدير الروابط كملف نصي .txt"
              >
                <FileDown className="w-4 h-4 text-neutral-400" />
                <span>تصدير .txt</span>
              </button>

              {/* Toggle Python Code Snippet */}
              <button
                type="button"
                onClick={() => setShowPythonCode(!showPythonCode)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition"
              >
                <Terminal className="w-4 h-4 text-neutral-400" />
                <span>كود بايثون</span>
              </button>
            </div>
          </div>

          {/* Python Code Viewer (Optional inspection) */}
          {showPythonCode && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-mono text-amber-400">Python Automation Script (BeautifulSoup + Requests)</span>
                <button
                  onClick={() => navigator.clipboard.writeText(pythonCodeSnippet)}
                  className="text-xs text-neutral-300 hover:text-white flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الكود</span>
                </button>
              </div>
              <pre className="text-xs text-emerald-400 font-mono overflow-x-auto p-3 bg-neutral-900/60 rounded-xl leading-relaxed" dir="ltr">
                {pythonCodeSnippet}
              </pre>
            </div>
          )}

          {/* 5. Extracted Files Table (JDownloader Style) */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-500" />
                <span>قائمة الملفات والجودات المستخرجة</span>
              </h3>
              <span className="text-xs text-neutral-400">
                انقر على تحميل لحفظ الملف أو انسخ الرابط المباشر
              </span>
            </div>

            <div className="divide-y divide-neutral-800/80">
              {result.files.map((file) => {
                const isSelected = selectedFileIds.includes(file.id);
                return (
                  <div
                    key={file.id}
                    className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                      isSelected ? 'bg-neutral-900/40' : 'bg-transparent opacity-85'
                    }`}
                  >
                    {/* Checkbox & File Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleFileSelection(file.id)}
                        className="mt-1 text-neutral-400 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-red-500" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-600" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-xs font-extrabold ${
                              file.qualityNum >= 1080
                                ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                                : file.qualityNum >= 720
                                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {file.quality.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-white truncate font-mono" dir="ltr">
                            {file.filename}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                          {file.size && (
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3 text-neutral-500" />
                              {file.size}
                            </span>
                          )}
                          <span>صيغة: {file.format.toUpperCase()}</span>
                          <span className="text-neutral-500 truncate max-w-xs" dir="ltr">
                            {file.source_site}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {/* Copy link */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(file.direct_url, file.id)}
                        className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition"
                        title="نسخ الرابط المباشر"
                      >
                        {copiedId === file.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {/* Direct Download */}
                      <a
                        href={file.proxy_url}
                        download={file.filename}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-red-600 hover:border-red-500 text-neutral-200 hover:text-white text-xs font-semibold border border-neutral-700 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Series Episodes Batch Download (If Series) */}
          {result.episodes && result.episodes.length > 0 && (
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-base font-bold text-white">
                  <Tv className="w-5 h-5 text-red-500" />
                  <h3>حلقات المسلسل المكتشفة ({result.episodes.length} حلقة)</h3>
                </div>
                <span className="text-xs text-neutral-400">
                  يمكنك نسخ جميع روابط الحلقات بضغطة واحدة لأي جودة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.episodes.map((ep, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{ep.title}</span>
                      <span className="text-neutral-500 font-mono">#{ep.episodeNumber}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {ep.files.map((epFile, fIdx) => (
                        <a
                          key={fIdx}
                          href={epFile.proxy_url}
                          download={epFile.filename}
                          className="flex-1 text-center py-1.5 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono font-semibold text-neutral-200 border border-neutral-700/60 transition"
                        >
                          {epFile.quality} ({epFile.size || 'تحميل'})
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
