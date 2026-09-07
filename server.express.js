/**
 * Akwam Video Proxy Server (Node.js & Express.js)
 * Fixed: Dynamic Host header on redirects & memory leak cleanups.
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const app = express();
const PORT = process.env.PROXY_PORT || 4000;

// Enable CORS for frontend players
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Range'],
    exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Type'],
  })
);

/**
 * Recursive request helper that handles 301/302 redirects while updating Host & Referer
 */
function fetchUpstreamStream(targetUrl, baseHeaders, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;

      // تحديث هيدر الـ Host ديناميكياً ليتوافق مع السيرفر الجديد
      const activeHeaders = {
        ...baseHeaders,
        Host: parsed.host,
      };

      const req = client.request(
        targetUrl,
        {
          method: 'GET',
          headers: activeHeaders,
          rejectUnauthorized: false, // Prevents SSL failures on Akwam CDN mirrors
          timeout: 30000,
        },
        (res) => {
          // Handle 301/302 redirects
          if (
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location &&
            maxRedirects > 0
          ) {
            const redirectTarget = new URL(res.headers.location, targetUrl).toString();
            
            // تحرير المقبس (Socket) فوراً لمنع تسريب الذاكرة أثناء التحويل المتكرر
            res.resume();

            const updatedHeaders = { ...baseHeaders };
            updatedHeaders['Referer'] = targetUrl; // تحديث الـ Referer إلى الرابط السابق

            return fetchUpstreamStream(redirectTarget, updatedHeaders, maxRedirects - 1)
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
        req.destroy(new Error('Upstream video timeout'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Video Streaming & Range Proxy Endpoint
 */
app.get('/api/proxy/video', async (req, res) => {
  const videoUrl = req.query.url;
  const defaultReferer = process.env.AKWAM_BASE_URL ? `${process.env.AKWAM_BASE_URL}/` : 'https://akwam.ss/';
  const referer = req.query.referer || defaultReferer;

  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  // Validate host against STREAM_ALLOWED_HOSTS if configured
  const allowedHostsStr = process.env.STREAM_ALLOWED_HOSTS;
  if (allowedHostsStr) {
    try {
      const parsedUrl = new URL(videoUrl);
      const targetHost = parsedUrl.hostname.toLowerCase();
      const allowedHosts = allowedHostsStr
        .split(',')
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean);

      if (allowedHosts.length > 0) {
        const isAllowed = allowedHosts.some((allowed) => {
          if (allowed.startsWith('.')) {
            return targetHost.endsWith(allowed) || targetHost === allowed.slice(1);
          }
          return targetHost === allowed || targetHost.endsWith(`.${allowed}`);
        });

        if (!isAllowed) {
          return res.status(403).json({
            error: `Host ${targetHost} is not permitted by STREAM_ALLOWED_HOSTS`,
          });
        }
      }
    } catch {
      return res.status(400).json({ error: 'Invalid video URL' });
    }
  }

  try {
    const rangeHeader = req.headers.range;
    const userAgent =
      process.env.SCRAPER_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

    const upstreamHeaders = {
      'User-Agent': userAgent,
      Referer: referer,
      Accept: '*/*',
      'Accept-Language': 'ar,en;q=0.9',
      'Accept-Encoding': 'identity', // Crucial for Byte Ranges
      Connection: 'keep-alive',
    };

    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const { statusCode, headers: sourceHeaders, stream } = await fetchUpstreamStream(
      videoUrl,
      upstreamHeaders
    );

    // Format content-type correctly
    let contentType = sourceHeaders['content-type'];
    const lower = videoUrl.toLowerCase();
    if (!contentType || contentType === 'application/octet-stream') {
      if (lower.includes('.mp4')) contentType = 'video/mp4';
      else if (lower.includes('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
      else if (lower.includes('.mkv')) contentType = 'video/x-matroska';
      else contentType = 'video/mp4';
    }

    // Set headers
    res.status(statusCode);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // يفضل منع الكاش للروابط المؤقتة

    if (sourceHeaders['content-length']) {
      res.setHeader('Content-Length', sourceHeaders['content-length']);
    }

    if (sourceHeaders['content-range']) {
      res.setHeader('Content-Range', sourceHeaders['content-range']);
    }

    // تنظيف الاتصال في حال إغلاق المتصفح أو تقديم الفيديو
    req.on('close', () => {
      if (stream && !stream.destroyed) {
        stream.destroy();
      }
    });

    stream.on('error', (streamErr) => {
      console.error('Upstream stream error:', streamErr.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Stream interrupted from upstream server' });
      }
    });

    // Pipe stream to client
    stream.pipe(res);
  } catch (err) {
    console.error('Proxy handler error:', err.message);
    if (!res.headersSent) {
      return res.status(502).json({
        error: 'Failed to proxy video from source server',
        details: err.message,
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', proxy: 'Akwam Video Proxy Express' });
});

app.listen(PORT, () => {
  console.log(`[+] Akwam Video Proxy running on http://localhost:${PORT}`);
});