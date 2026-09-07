import { NextRequest } from 'next/server';
import { Agent } from 'undici';

const insecureDispatcher = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

export async function GET(request: NextRequest) {
  const videoUrl = request.nextUrl.searchParams.get('url');
  const targetReferer = request.nextUrl.searchParams.get('referer') || 'https://akwam.ss/';

  if (!videoUrl) {
    return new Response(JSON.stringify({ error: 'Missing "url" query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rangeHeader = request.headers.get('range');
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Referer: targetReferer,
      'Accept-Language': 'ar,en;q=0.9',
    };

    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const targetResponse = await fetch(videoUrl, {
      method: 'GET',
      headers,
      // @ts-expect-error dispatcher is supported by Node undici fetch
      dispatcher: insecureDispatcher,
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Range'
    );
    responseHeaders.set(
      'Access-Control-Expose-Headers',
      'Content-Length, Content-Range, Accept-Ranges'
    );

    const contentType = targetResponse.headers.get('content-type') || 'video/mp4';
    responseHeaders.set('Content-Type', contentType);

    const contentLength = targetResponse.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = targetResponse.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    const acceptRanges = targetResponse.headers.get('accept-ranges') || 'bytes';
    responseHeaders.set('Accept-Ranges', acceptRanges);

    return new Response(targetResponse.body, {
      status: targetResponse.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Video proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to stream video from source server' }),
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
      'Access-Control-Allow-Headers':
        'Origin, X-Requested-With, Content-Type, Accept, Range',
    },
  });
}
