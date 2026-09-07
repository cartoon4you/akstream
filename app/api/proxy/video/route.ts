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
 * Robust Upstream Fetcher (Fixed for Akwam / Downet CDNs)
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

      // استنساخ الهيدرز لتجنب التعديل على الكائن الأصلي أثناء التوجيه المتكرر
      const activeHeaders = { ...baseHeaders };
      
      // ضروري جداً: تحديث حقل الـ Host ليتوافق مع السيرفر الحالي الذي يتم جلب البيانات منه
      activeHeaders['Host'] = parsedUrl.host;

      const req = client.request(
        targetUrl,
        {
          method: 'GET',
          headers: activeHeaders,
          rejectUnauthorized: false, // لتخطي مشاكل شهادات الـ SSL في السيرفرات الفرعية
          timeout: 35000,
        },
        (res) => {
          // التعامل الصحيح مع الـ Redirects وتحديث الرابط
          if (
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location &&
            maxRedirects > 0
          ) {
            const redirectUrl = new URL(res.headers.location, targetUrl).toString();
            res.resume(); // تحرير المقابس (Sockets) لعدم تجميد السيرفر
            
            // عند الانتقال لرابط جديد، نحدث الـ Referer والـ Origin إذا لزم الأمر
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
        req.destroy(new Error('انتهت مهلة جلب الفيديو من سيرفر أكوام (Timeout)'));
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

  try {
    new URL(videoUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'صيغة الرابط غير صحيحة' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rangeHeader = request.headers.get('range');
    const parsedTarget = new URL(videoUrl);

    // بناء هيدرز مطابقة تماماً للمتصفح الحقيقي لإقناع الـ CDN بأن الطلب شرعي
    const headersToSend: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity', // تمنع السيرفر من ضغط الملف بالـ Gzip لكي تعمل حسابات الـ Byte Ranges بدقة
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Referer': 'https://akwam.ss/', // ضروري لتخطي حماية أكوام وسيرفر داونيت
      'Origin': 'https://akwam.ss'
    };

    if (rangeHeader) {
      headersToSend['Range'] = rangeHeader;
    }

    const { statusCode, headers: upstreamHeaders, stream } = await fetchUpstream(
      videoUrl,
      headersToSend
    );

    // إلغاء عملية الدفق من السيرفر الأصلي فوراً إذا قام المستخدم بقفل الصفحة أو تقديم الفيديو
    if (request.signal) {
      request.signal.addEventListener('abort', () => {
        try {
          stream.destroy();
        } catch {
          // ignore
        }
      });
    }

    // تحديد نوع محتوى الفيديو (Mime-Type) تلقائياً
    let contentType = upstreamHeaders['content-type'] as string | undefined;
    const lowerUrl = videoUrl.toLowerCase();
    if (!contentType || contentType === 'application/octet-stream') {
      if (lowerUrl.includes('.mp4')) contentType = 'video/mp4';
      else if (lowerUrl.includes('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
      else if (lowerUrl.includes('.mkv')) contentType = 'video/x-matroska';
      else if (lowerUrl.includes('.webm')) contentType = 'video/webm';
      else contentType = 'video/mp4';
    }

    // بناء هيدرز الاستجابة المتوافقة مع CORS والـ المشغلات الحديثة (HTML5 Players)
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // يفضل عدم عمل كاش لروابط التحميل المؤقتة

    if (upstreamHeaders['content-length']) {
      responseHeaders.set('Content-Length', String(upstreamHeaders['content-length']));
    }

    if (upstreamHeaders['content-range']) {
      responseHeaders.set('Content-Range', String(upstreamHeaders['content-range']));
    }

    // تحويل الـ Node Stream إلى Web Readable Stream متوافق مع Next.js Edge response
    // @ts-expect-error Node.js Readable.toWeb supported
    const webStream = Readable.toWeb(stream);

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
