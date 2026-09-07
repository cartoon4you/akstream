import { NextRequest } from 'next/server';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UpstreamResult {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  stream: Readable;
}

/**
 * Robust Upstream Fetcher (Optimized for Akwam / Downet CDNs)
 */
function fetchUpstream(
  targetUrl: string,
  baseHeaders: Record<string, string>,
  maxRedirects = 5
): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      // تحديث هيدر Host ليتطابق دائماً مع الخادم الهدف
      const activeHeaders = { 
        ...baseHeaders,
        Host: parsedUrl.host 
      };

      const req = client.request(
        targetUrl,
        {
          method: 'GET',
          headers: activeHeaders,
          rejectUnauthorized: false, // تجاوز مشاكل SSL على الخوادم الفرعية
          timeout: 35000,
        },
        (res) => {
          // التعامل مع إعادة التوجيه (Redirects)
          if (
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location &&
            maxRedirects > 0
          ) {
            const redirectUrl = new URL(res.headers.location, targetUrl).toString();
            
            // تحرير مقبس الاتصال (Socket) لتجنب تسريب الذاكرة
            res.resume();

            const updatedHeaders = { ...baseHeaders };
            updatedHeaders['Referer'] = targetUrl;

            return fetchUpstream(redirectUrl, updatedHeaders, maxRedirects - 1)
              .then(resolve)
              .catch(reject);
          }

          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers,
            stream: res,
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error('انتهت مهلة جلب الفيديو من السيرفر المصدر (Timeout)'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

export async function GET(request: NextRequest) {
  const videoUrl = request.nextUrl.searchParams.get('url');

  if (!videoUrl) {
    return new Response(JSON.stringify({ error: 'المعامل url مفقود' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(videoUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'صيغة الرابط غير صحيحة' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // التحقق من النطاقات المسموح بها إذا تم تحديد STREAM_ALLOWED_HOSTS
  const allowedHostsStr = process.env.STREAM_ALLOWED_HOSTS;
  if (allowedHostsStr) {
    const allowedHosts = allowedHostsStr
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);

    if (allowedHosts.length > 0) {
      const targetHost = parsedTarget.hostname.toLowerCase();
      const isAllowed = allowedHosts.some((allowed) => {
        if (allowed.startsWith('.')) {
          return targetHost.endsWith(allowed) || targetHost === allowed.slice(1);
        }
        return targetHost === allowed || targetHost.endsWith(`.${allowed}`);
      });

      if (!isAllowed) {
        return new Response(
          JSON.stringify({
            error: `النطاق ${targetHost} غير مسموح به في إعدادات البث (STREAM_ALLOWED_HOSTS)`,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
  }

  try {
    const rangeHeader = request.headers.get('range');

    const userAgent =
      process.env.SCRAPER_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

    const baseUrl = process.env.AKWAM_BASE_URL || 'https://akwam.ss';
    let origin = 'https://akwam.ss';
    try {
      origin = new URL(baseUrl).origin;
    } catch {
      // fallback
    }

    // بناء الهيدرز المطلوبة للمطابقة مع طلبات المتصفح الشائعة
    const headersToSend: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity', // إلغاء الضغط لضبط حسابات Byte Ranges
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Referer': `${origin}/`,
      'Origin': origin,
    };

    if (rangeHeader) {
      headersToSend['Range'] = rangeHeader;
    }

    const { statusCode, headers: upstreamHeaders, stream } = await fetchUpstream(
      videoUrl,
      headersToSend
    );

    // إلغاء الدفق فور إغلاق المستخدم للمشغل أو الخروج من الصفحة
    if (request.signal) {
      if (request.signal.aborted) {
        stream.destroy();
      } else {
        request.signal.addEventListener('abort', () => {
          try {
            stream.destroy();
          } catch {
            // Ignore stream destruction error
          }
        });
      }
    }

    // تحديد نوع المحتوى تلقائياً (دعم كامل لمشغل المتصفح HTML5)
    let contentType = upstreamHeaders['content-type'] as string | undefined;
    const lowerUrl = videoUrl.toLowerCase();
    if (!contentType || contentType === 'application/octet-stream' || contentType === 'video/x-matroska') {
      if (lowerUrl.includes('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
      else if (lowerUrl.includes('.webm')) contentType = 'video/webm';
      else contentType = 'video/mp4'; // تمرير video/mp4 ليتمكن محرك المتصفح من تشغيل وفك ترميز الفيديو مباشرة
    }

    // تجهيز الهيدرز المتوافقة مع CORS والـ HTML5 Players
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (upstreamHeaders['content-length']) {
      responseHeaders.set('Content-Length', String(upstreamHeaders['content-length']));
    }

    if (upstreamHeaders['content-range']) {
      responseHeaders.set('Content-Range', String(upstreamHeaders['content-range']));
    }

    // تحويل ReadableStream من Node.js إلى Web Readable Stream
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new Response(webStream, {
      status: statusCode,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Video proxy error:', error?.message || error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'تعذر دفق الفيديو من السيرفر المصدر (أكوام/داونيت)',
        details: error?.message || 'Upstream connection failed',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
    },
  });
}