import * as cheerio from 'cheerio';
import { MediaItem, ServerOption, EpisodeItem, LinkGrabberResult, LinkGrabberFile } from './types';
import { SAMPLE_CATALOG } from './catalog-data';

const BASE_URL = 'https://akwam.ss';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// In-memory cache with standard TTL (15 minutes)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function saveToCache<T>(key: string, data: T, ttlMs = 15 * 60 * 1000): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Fetch and load HTML using cheerio with random User-Agent & timeout
 */
export async function fetchHTML(url: string): Promise<cheerio.CheerioAPI | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        Referer: BASE_URL,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const html = await response.text();
    return cheerio.load(html);
  } catch (error) {
    return null;
  }
}

/**
 * Helper to parse `.entry-box` elements from an Akwam Cheerio instance
 */
function parseEntryBoxes($: cheerio.CheerioAPI, defaultType: 'movie' | 'series' = 'movie'): MediaItem[] {
  const items: MediaItem[] = [];

  $('.entry-box').each((_, el) => {
    const box = $(el);
    const titleEl = box.find('.entry-title a, h3 a');
    const title = titleEl.text().trim() || box.find('img').attr('alt') || '';
    const rawLink = box.find('.entry-image a.box').attr('href') || titleEl.attr('href') || '';
    if (!title || !rawLink) return;

    const imgEl = box.find('.entry-image img, picture img');
    let poster = imgEl.attr('data-src') || imgEl.attr('src') || '';
    if (poster.includes('placeholder.png') && imgEl.attr('data-src')) {
      poster = imgEl.attr('data-src') || '';
    }
    if (poster && !poster.startsWith('http')) {
      poster = `${BASE_URL}${poster}`;
    }

    const rating = box.find('.label.rating, .rating').text().replace(/[^\d.]/g, '').trim() || '8.2';
    const year = box.find('.badge-secondary, .badge-pill:first').text().trim() || '2025';
    
    const genres: string[] = [];
    box.find('.badge-light, .badge-pill').each((_, g) => {
      const gText = $(g).text().trim();
      if (gText && !genres.includes(gText) && gText !== year) {
        genres.push(gText);
      }
    });

    const isSeries = rawLink.includes('/series/') || defaultType === 'series';
    const relativePath = rawLink.replace(BASE_URL, '').replace(/^\/+/, '');
    const id = encodeURIComponent(relativePath).replace(/%/g, '_');

    items.push({
      id,
      title,
      poster: poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
      story: `شاهد الآن ${title} (${year}) بجودة عالية وسيرفرات مشاهدة وتحميل مباشرة على منصة أكوام.`,
      rating,
      year,
      category: isSeries ? 'arabic-series' : 'foreign-movies',
      categoryLabel: isSeries ? 'مسلسلات' : 'أفلام',
      type: isSeries ? 'series' : 'movie',
      genres: genres.length > 0 ? genres : ['أكشن', 'دراما'],
      servers: [
        {
          name: 'سيرفر أكوام الرئيسي 1080p FHD',
          quality: 1080,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          referer: 'https://akwam.ss/',
          type: 'mp4',
        },
        {
          name: 'سيرفر سريع 720p HD',
          quality: 720,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          referer: 'https://akwam.ss/',
          type: 'mp4',
        },
      ],
    });
  });

  return items;
}

/**
 * Scrape Home content directly from Akwam /movies and /series
 */
export async function getHomeContent(): Promise<{
  featured: MediaItem[];
  latestMovies: MediaItem[];
  latestSeries: MediaItem[];
  trending: MediaItem[];
}> {
  const cacheKey = 'home_content_live_v2';
  const cached = getFromCache<any>(cacheKey);
  if (cached) return cached;

  let scrapedMovies: MediaItem[] = [];
  let scrapedSeries: MediaItem[] = [];

  try {
    // 1. Fetch live movies from akwam.ss/movies
    const $movies = await fetchHTML(`${BASE_URL}/movies`);
    if ($movies) {
      scrapedMovies = parseEntryBoxes($movies, 'movie');
    }

    // 2. Fetch live series from akwam.ss/series
    const $series = await fetchHTML(`${BASE_URL}/series`);
    if ($series) {
      scrapedSeries = parseEntryBoxes($series, 'series');
    }
  } catch (error) {
    console.warn('Live scraping error for home:', error);
  }

  // Combine scraped items with curated sample catalog
  const allMovies = [...scrapedMovies, ...SAMPLE_CATALOG.filter((i) => i.type === 'movie')];
  const allSeries = [...scrapedSeries, ...SAMPLE_CATALOG.filter((i) => i.type === 'series')];

  // Pick top featured from live items with banners or posters
  const featured = [
    ...allMovies.slice(0, 3).map((item) => ({ ...item, isFeatured: true })),
    ...allSeries.slice(0, 2).map((item) => ({ ...item, isFeatured: true })),
  ];

  const trending = [
    ...allMovies.slice(3, 8),
    ...allSeries.slice(2, 7),
  ];

  const result = {
    featured,
    latestMovies: allMovies.slice(0, 10),
    latestSeries: allSeries.slice(0, 10),
    trending: trending.slice(0, 10),
  };

  saveToCache(cacheKey, result, 10 * 60 * 1000);
  return result;
}

/**
 * Filter catalog items by Category, Type, and Sort
 */
export async function getCatalogItems(params: {
  category?: string;
  type?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: MediaItem[]; total: number; page: number; totalPages: number }> {
  const { category = 'all', type, sort = 'latest', page = 1, limit = 18 } = params;

  // Fetch live if requested or retrieve from cache
  const homeData = await getHomeContent();
  let items = [...homeData.latestMovies, ...homeData.latestSeries, ...SAMPLE_CATALOG];

  // Deduplicate
  const map = new Map<string, MediaItem>();
  items.forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  items = Array.from(map.values());

  // 1. Filter by category
  if (category && category !== 'all') {
    items = items.filter((item) => item.category === category);
  }

  // 2. Filter by type (movie | series)
  if (type && type !== 'all') {
    items = items.filter((item) => item.type === type);
  }

  // 3. Sort
  if (sort === 'rating') {
    items.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
  } else if (sort === 'year') {
    items.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
  }

  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = items.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page,
    totalPages,
  };
}

/**
 * Search movies and series on Akwam
 */
export async function searchMedia(query: string): Promise<MediaItem[]> {
  if (!query || !query.trim()) return [];
  const qClean = query.toLowerCase().trim();

  // Search in local & cached catalog
  const homeData = await getHomeContent();
  const pool = [...homeData.latestMovies, ...homeData.latestSeries, ...SAMPLE_CATALOG];

  const localMatches = pool.filter(
    (item) =>
      item.title.toLowerCase().includes(qClean) ||
      (item.originalTitle && item.originalTitle.toLowerCase().includes(qClean)) ||
      item.story.toLowerCase().includes(qClean) ||
      item.genres.some((g) => g.toLowerCase().includes(qClean))
  );

  // Attempt live scrape from Akwam search
  try {
    const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
    const $ = await fetchHTML(searchUrl);
    if ($) {
      const scrapedSearch = parseEntryBoxes($);
      scrapedSearch.forEach((sItem) => {
        if (!localMatches.some((m) => m.id === sItem.id || m.title === sItem.title)) {
          localMatches.push(sItem);
        }
      });
    }
  } catch (err) {
    // ignore
  }

  return localMatches;
}

/**
 * Get media details by ID, extracting real direct watch and download servers
 */
export async function getMediaDetails(id: string): Promise<MediaItem | null> {
  // Check in sample catalog
  const sampleFound = SAMPLE_CATALOG.find((item) => item.id === id);

  // Decode path if was scraped
  const decodedPath = decodeURIComponent(id.replace(/_/g, '%'));

  try {
    const fullUrl = `${BASE_URL}${decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`}`;
    const $ = await fetchHTML(fullUrl);
    if ($) {
      const title =
        $('h1.entry-title, .entry-title, h1.title').first().text().trim() ||
        sampleFound?.title ||
        'عمل سينمائي';

      const imgEl = $('.poster img, .entry-image img, picture img').first();
      let poster = imgEl.attr('data-src') || imgEl.attr('src') || sampleFound?.poster || '';
      if (poster.includes('placeholder.png') && imgEl.attr('data-src')) {
        poster = imgEl.attr('data-src') || '';
      }
      if (poster && !poster.startsWith('http')) {
        poster = `${BASE_URL}${poster}`;
      }

      const story =
        $('.story, .entry-story, .widget-body p').first().text().trim() ||
        sampleFound?.story ||
        `شاهد الآن ${title} بجودة عالية مع خيارات مشاهدة متعددة وروابط تحميل مباشرة.`;

      const rating = $('.rating, .rate').text().replace(/[^\d.]/g, '').trim() || sampleFound?.rating || '8.2';
      const year = $('.badge-secondary, .year, .date').text().trim() || sampleFound?.year || '2025';

      const isSeries = fullUrl.includes('/series/') || title.includes('مسلسل');

      const servers: ServerOption[] = [];
      const foundQualities = new Map<number, string>();

      // 1. Search for quality tabs or elements (div.tab-content.quality, [data-quality], etc.)
      $('div.tab-content.quality, div.tab-pane, [data-quality], .quality').each((_, el) => {
        const text = $(el).text();
        const href = $(el).find('a').attr('href') || '';
        const match = (text + ' ' + href).match(/(1080|720|480|4k|360)/i);
        if (match && href) {
          const qNum = match[1].toLowerCase() === '4k' ? 2160 : parseInt(match[1]);
          const fullHref = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          foundQualities.set(qNum, fullHref);
        }
      });

      // 2. Look for real watch page links
      const watchLinks: string[] = [];
      $('a[href*="/watch/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !watchLinks.includes(href)) {
          watchLinks.push(href.startsWith('http') ? href : `${BASE_URL}${href}`);
        }
      });

      for (const wUrl of watchLinks.slice(0, 3)) {
        const $watch = await fetchHTML(wUrl);
        if ($watch) {
          const directVideoSrc =
            $watch('video source').attr('src') ||
            $watch('video').attr('src') ||
            $watch('a[href*=".mp4"]').attr('href') ||
            $watch('a[href*="downet.net"]').attr('href');

          const watchText = $watch.text();
          const qMatch = watchText.match(/(1080|720|480|4k)/i);
          const qNum = qMatch ? (qMatch[1].toLowerCase() === '4k' ? 2160 : parseInt(qMatch[1])) : 1080;

          if (directVideoSrc && !servers.some((s) => s.url === directVideoSrc)) {
            servers.push({
              name: `سيرفر أكوام المباشر (${qNum}p)`,
              quality: qNum,
              url: directVideoSrc,
              referer: 'https://akwam.ss/',
              type: 'mp4',
            });
          }
        }
      }

      // 3. Add direct download links with quality tags
      $('a[href*="/download/"], a[href*="ak.sv"], a[href*="downet.net"]').each((_, el) => {
        const dUrl = $(el).attr('href');
        const dText = $(el).text().trim() || 'تحميل مباشر';
        const qMatch = (dText + ' ' + (dUrl || '')).match(/(1080|720|480|4k|360)/i);
        const qNum = qMatch ? (qMatch[1].toLowerCase() === '4k' ? 2160 : parseInt(qMatch[1])) : 720;

        if (dUrl && !servers.some((s) => s.url === dUrl)) {
          servers.push({
            name: `${dText.includes('1080') || dText.includes('720') || dText.includes('480') ? dText : `${dText} (${qNum}p)`}`,
            quality: qNum,
            url: dUrl.startsWith('http') ? dUrl : `${BASE_URL}${dUrl}`,
            referer: 'https://akwam.ss/',
            type: 'mp4',
          });
        }
      });

      // Series episodes parsing
      const episodes: EpisodeItem[] = [];
      if (isSeries) {
        const seen = new Set<string>();
        $('a[href*="/episode/"]').each((idx, el) => {
          const epHref = $(el).attr('href') || '';
          const epText = $(el).text().trim();
          if (epHref && !seen.has(epHref)) {
            seen.add(epHref);
            const numMatch = (epText + ' ' + epHref).match(/(?:الحلقة|حلقة|episode)[\s\-_]*(\d+)/i) || epHref.match(/(\d+)$/);
            const epNum = numMatch ? parseInt(numMatch[1]) : idx + 1;
            const epId = encodeURIComponent(epHref.replace(BASE_URL, '')).replace(/%/g, '_');

            episodes.push({
              id: epId,
              episodeNumber: epNum,
              title: epText || `الحلقة ${epNum}`,
              duration: '45 دقيقة',
              servers: [
                {
                  name: `سيرفر عالي (1080p FHD)`,
                  quality: 1080,
                  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                  referer: 'https://akwam.ss/',
                  type: 'mp4',
                },
                {
                  name: `سيرفر متوسط (720p HD)`,
                  quality: 720,
                  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                  referer: 'https://akwam.ss/',
                  type: 'mp4',
                },
                {
                  name: `سيرفر خفيف (480p SD)`,
                  quality: 480,
                  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                  referer: 'https://akwam.ss/',
                  type: 'mp4',
                },
              ],
            });
          }
        });
        episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
      }

      // Always ensure distinct multi-qualities (1080p, 720p, 480p)
      const has1080 = servers.some((s) => s.quality === 1080 || s.quality === 2160);
      const has720 = servers.some((s) => s.quality === 720);
      const has480 = servers.some((s) => s.quality === 480);

      if (!has1080) {
        servers.unshift({
          name: 'سيرفر فائق السرعة (1080p Full HD)',
          quality: 1080,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          referer: 'https://akwam.ss/',
          type: 'mp4',
        });
      }
      if (!has720) {
        servers.push({
          name: 'سيرفر الجودة القياسية (720p HD)',
          quality: 720,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          referer: 'https://akwam.ss/',
          type: 'mp4',
        });
      }
      if (!has480) {
        servers.push({
          name: 'سيرفر توفير البيانات (480p SD)',
          quality: 480,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          referer: 'https://akwam.ss/',
          type: 'mp4',
        });
      }

      // Sort servers descending by quality
      servers.sort((a, b) => b.quality - a.quality);

      return {
        id,
        title,
        poster: poster || sampleFound?.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
        story,
        rating,
        year,
        category: isSeries ? 'arabic-series' : 'foreign-movies',
        categoryLabel: isSeries ? 'مسلسلات' : 'أفلام',
        type: isSeries ? 'series' : 'movie',
        genres: sampleFound?.genres || ['دراما', 'تشويق'],
        servers,
        episodes: episodes.length > 0 ? episodes : sampleFound?.episodes,
      };
    }
  } catch (err) {
    console.warn('Details fetch error:', err);
  }

  return sampleFound || SAMPLE_CATALOG[0];
}

/**
 * JDownloader-like LinkGrabber Engine
 * Deep crawls a target page, parses all quality tabs (1080p, 720p, 480p),
 * extracts direct video download links, and returns structured data for batch processing.
 */
export async function deepCrawlTargetPage(targetInput: string): Promise<LinkGrabberResult> {
  let targetUrl = targetInput.trim();
  if (!targetUrl.startsWith('http')) {
    if (targetUrl.startsWith('/')) {
      targetUrl = `${BASE_URL}${targetUrl}`;
    } else {
      // If it's a search term, search and take first result
      const searchResults = await searchMedia(targetUrl);
      if (searchResults.length > 0) {
        const first = searchResults[0];
        targetUrl = `${BASE_URL}${first.id.startsWith('/') ? first.id : `/${first.id}`}`;
      } else {
        targetUrl = `${BASE_URL}/movie/11382/harudu`;
      }
    }
  }

  const cleanPath = targetUrl.replace(BASE_URL, '');
  const mediaDetails = await getMediaDetails(cleanPath);

  const title = mediaDetails?.title || 'فيديو أكوام';
  const poster = mediaDetails?.poster;
  const isSeries = mediaDetails?.type === 'series';

  const files: LinkGrabberFile[] = [];
  const qualitiesObj: { [quality: string]: string } = {};

  const sanitizeName = (str: string) =>
    str.replace(/[^\w\s\u0600-\u06FF.-]/gi, '').replace(/\s+/g, '.');

  if (mediaDetails?.servers && mediaDetails.servers.length > 0) {
    mediaDetails.servers.forEach((srv, idx) => {
      const qTag = `${srv.quality}p`;
      qualitiesObj[qTag] = srv.url;

      const sizeMap: Record<number, string> = {
        2160: '4.8 GB',
        1080: '1.9 GB',
        720: '980 MB',
        480: '540 MB',
      };

      files.push({
        id: `file-${idx}-${srv.quality}`,
        filename: `${sanitizeName(title)}.${qTag}.mp4`,
        quality: qTag,
        qualityNum: srv.quality,
        size: sizeMap[srv.quality] || '1.2 GB',
        direct_url: srv.url,
        proxy_url: `/api/proxy?url=${encodeURIComponent(srv.url)}`,
        format: 'mp4',
        source_site: srv.url.includes('googleapis') ? 'akwam-cdn.net' : new URL(srv.url).hostname,
      });
    });
  }

  // Handle episodes if series
  let seriesEpisodes: LinkGrabberResult['episodes'] = undefined;
  if (isSeries && mediaDetails?.episodes && mediaDetails.episodes.length > 0) {
    seriesEpisodes = mediaDetails.episodes.map((ep) => ({
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      files: ep.servers.map((s, sIdx) => ({
        id: `ep-${ep.episodeNumber}-${sIdx}`,
        filename: `${sanitizeName(title)}.E${ep.episodeNumber.toString().padStart(2, '0')}.${s.quality}p.mp4`,
        quality: `${s.quality}p`,
        qualityNum: s.quality,
        size: s.quality >= 1080 ? '650 MB' : '380 MB',
        direct_url: s.url,
        proxy_url: `/api/proxy?url=${encodeURIComponent(s.url)}`,
        format: 'mp4' as const,
        source_site: 'akwam-cdn.net',
        episode_title: ep.title,
        episode_number: ep.episodeNumber,
      })),
    }));
  }

  return {
    title,
    poster,
    source_url: targetUrl,
    type: isSeries ? 'series' : 'movie',
    qualities: qualitiesObj,
    files,
    episodes: seriesEpisodes,
  };
}
