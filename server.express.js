/**
 * Akwam Video Proxy Server (Node.js & Express.js)
 *
 * This Express server resolves the two main streaming issues:
 * 1. 500 Internal Server Error & Range handling:
 *    - Passes HTTP Range requests to the source (Status 206 Partial Content).
 *    - Forwards exact Referer (https://akwam.ss/) and User-Agent expected by Akwam/Downet.
 *    - Pipes the video stream directly to the client without loading into RAM.
 *    - Listens to client socket closes to avoid ECONNRESET and server crashes.
 *    - Enforces 'Accept-Encoding: identity' so gzip does not corrupt byte offsets.
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const app = express();
const PORT = process.env.PROXY_PORT || 4000;

// Enable CORS for frontend players (Video.js, Plyr, native HTML5)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Range'],
    exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Type'],
  })
);

/**
 * Recursive request helper that handles 301/302 redirects while preserving Referer
 */
function fetchUpstreamStream(targetUrl, headers, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.request(
        targetUrl,
        {
          method: 'GET',
          headers,
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
            res.resume(); // Clean up unused sockets
            return fetchUpstreamStream(redirectTarget, headers, maxRedirects - 1)
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
 * Example: GET /api/proxy/video?url=https://downet.net/download/xyz.mp4&referer=https://akwam.ss/
 */
app.get('/api/proxy/video', async (req, res) => {
  const videoUrl = req.query.url;
  const referer = req.query.referer || 'https://akwam.ss/';

  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  try {
    const rangeHeader = req.headers.range;

    // Headers required by Akwam / Downet CDN
    const upstreamHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Referer: referer,
      Accept: '*/*',
      'Accept-Language': 'ar,en;q=0.9',
      'Accept-Encoding': 'identity', // Crucial: prevents gzip corruption on Range queries
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

    // Set streaming and Range headers
    res.status(statusCode);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (sourceHeaders['content-length']) {
      res.setHeader('Content-Length', sourceHeaders['content-length']);
    }

    if (sourceHeaders['content-range']) {
      res.setHeader('Content-Range', sourceHeaders['content-range']);
    }

    // Prevent server crash if client disconnects / seeks ahead
    req.on('close', () => {
      try {
        stream.destroy();
      } catch (e) {
        // ignore
      }
    });

    stream.on('error', (streamErr) => {
      console.error('Upstream stream error:', streamErr.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Stream interrupted from upstream server' });
      }
    });

    // Pipe directly to client response
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
