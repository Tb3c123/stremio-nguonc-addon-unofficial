import express from 'express';
import { Readable } from 'stream';

const proxyRouter = express.Router();

const DEFAULT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Proxy HLS Playlist (.m3u8)
 */
proxyRouter.get('/hls', async (req, res) => {
  const { url: targetUrl, referer } = req.query;

  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const targetOrigin = parsedTarget.origin;
    const refHeader = referer || targetOrigin;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': DEFAULT_UA,
        'Referer': refHeader
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch HLS playlist: ${response.statusText}`);
    }

    const playlistText = await response.text();
    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    // Base path for resolving relative segment URLs inside m3u8
    const playlistBasePath = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

    // Rewrite lines in m3u8
    const lines = playlistText.split(/\r?\n/);
    const rewrittenLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      // Absolute or relative URL
      let absoluteSegUrl = trimmed;
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        if (trimmed.startsWith('/')) {
          absoluteSegUrl = `${targetOrigin}${trimmed}`;
        } else {
          absoluteSegUrl = `${playlistBasePath}${trimmed}`;
        }
      }

      return `${baseUrl}/proxy/segment?url=${encodeURIComponent(absoluteSegUrl)}&referer=${encodeURIComponent(refHeader)}`;
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache');

    return res.send(rewrittenLines.join('\n'));
  } catch (err) {
    console.error('[HLS Proxy Error]:', err.message);
    return res.status(500).send(`Proxy error: ${err.message}`);
  }
});

/**
 * Proxy Video Segment (.png, .ts, .m4s, etc.)
 */
proxyRouter.get('/segment', async (req, res) => {
  const { url: targetUrl, referer } = req.query;

  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const targetOrigin = parsedTarget.origin;
    const refHeader = referer || targetOrigin;

    const reqHeaders = {
      'User-Agent': DEFAULT_UA,
      'Referer': refHeader
    };
    if (req.headers.range) {
      reqHeaders['Range'] = req.headers.range;
    }

    const response = await fetch(targetUrl, { headers: reqHeaders });

    res.status(response.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    const passHeaders = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
    passHeaders.forEach((h) => {
      const val = response.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    if (!response.body) {
      return res.end();
    }

    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);
  } catch (err) {
    console.error('[Segment Proxy Error]:', err.message);
    return res.status(500).send(`Segment proxy error: ${err.message}`);
  }
});

export default proxyRouter;
