import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8787;
const APP_FILE = resolve(HERE, 'audit-google-auto.html');
const MAX_BODY_BYTES = 20 * 1024 * 1024;

function replyJson(res, status, value) {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(value));
}

async function readRequestBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Request body too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function createTookenProxyServer({
  apiKey,
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  appFile = APP_FILE,
  fetchImpl = globalThis.fetch
} = {}) {
  const secret = String(apiKey || '').trim();
  if (!secret) throw new Error('TOOKEN_API_KEY is required');
  if (typeof fetchImpl !== 'function') throw new Error('Node.js fetch is required (Node 20 or newer)');

  const server = createServer(async (req, res) => {
    try {
      const address = server.address();
      const actualPort = address && typeof address === 'object' ? address.port : port;
      const expectedHost = `${host}:${actualPort}`;
      const appOrigin = `http://${expectedHost}`;
      if (req.headers.host !== expectedHost) return replyJson(res, 403, { error: 'Unexpected Host' });

      const origin = req.headers.origin;
      const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
      if (origin ? origin !== appOrigin : !['same-origin', 'none'].includes(fetchSite)) {
        return replyJson(res, 403, { error: 'Forbidden origin' });
      }

      const pathname = new URL(req.url || '/', appOrigin).pathname;
      if (req.method === 'GET' && pathname === '/') {
        let html = await readFile(appFile, 'utf8');
        const bootstrap = '<script>window.HESABRASI_TOOKEN_LOCAL_PROXY = true;</script>';
        if (/<head\b[^>]*>/i.test(html)) html = html.replace(/<head\b[^>]*>/i, match => `${match}${bootstrap}`);
        else return replyJson(res, 500, { error: 'Application HTML has no head element' });
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        return res.end(html);
      }

      const isModels = req.method === 'GET' && pathname === '/api/tooken/models';
      const isChat = req.method === 'POST' && pathname === '/api/tooken/chat/completions';
      if (!isModels && !isChat) return replyJson(res, 404, { error: 'Not found' });

      let body;
      if (isChat) {
        const contentType = String(req.headers['content-type'] || '').toLowerCase();
        if (!contentType.includes('application/json')) return replyJson(res, 415, { error: 'Expected application/json' });
        body = await readRequestBody(req);
        try {
          const parsed = JSON.parse(body.toString('utf8'));
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected JSON object');
        } catch {
          return replyJson(res, 400, { error: 'Invalid JSON request body' });
        }
      }

      const upstreamUrl = isModels
        ? 'https://tooken.club/v1/models'
        : 'https://tooken.club/v1/chat/completions';
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(new Error('Upstream request timed out')), 120000);
      let clientGone = false;
      const cancelUpstream = () => {
        if (clientGone || res.writableEnded) return;
        clientGone = true;
        controller.abort(new Error('Browser client disconnected'));
      };
      req.once('aborted', cancelUpstream);
      res.once('close', cancelUpstream);
      try {
        const upstream = await fetchImpl(upstreamUrl, {
          method: isModels ? 'GET' : 'POST',
          headers: {
            Authorization: `Bearer ${secret}`,
            Accept: req.headers.accept || 'application/json',
            ...(isChat ? { 'Content-Type': 'application/json' } : {})
          },
          ...(isChat ? { body } : {}),
          signal: controller.signal
        });

        if (clientGone || res.destroyed) {
          await upstream.body?.cancel().catch(() => {});
          return;
        }
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (!upstream.body) return res.end();
        for await (const chunk of upstream.body) {
          if (clientGone || res.destroyed) {
            await upstream.body.cancel().catch(() => {});
            return;
          }
          if (!res.write(chunk)) await new Promise((resolveDrain, reject) => {
            const onDrain = () => { cleanup(); resolveDrain(); };
            const onClose = () => { cleanup(); reject(new Error('Browser client disconnected')); };
            const cleanup = () => { res.off('drain', onDrain); res.off('close', onClose); };
            res.once('drain', onDrain);res.once('close', onClose);
          });
        }
        if (!clientGone && !res.destroyed) res.end();
      } finally {
        clearTimeout(deadline);
        req.off('aborted', cancelUpstream);
        res.off('close', cancelUpstream);
      }
    } catch (error) {
      if (res.destroyed) return;
      const status = Number(error && error.statusCode) || 502;
      if (status === 502) console.error('Tooken proxy upstream/network failure:', String(error && error.message || 'unknown error'));
      replyJson(res, status, { error: status === 413 ? 'Request body too large' : 'Could not reach Tooken API' });
    }
  });

  server.listen(port, host);
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const apiKey = process.env.TOOKEN_API_KEY;
  if (!apiKey) {
    console.error('Set TOOKEN_API_KEY in this PowerShell session, then run this file again.');
    process.exitCode = 1;
  } else {
    const port = Number(process.env.HESABRASI_PORT || DEFAULT_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('HESABRASI_PORT must be between 1 and 65535');
    const server = createTookenProxyServer({ apiKey, port });
    server.on('listening', () => console.log(`Hesabrasi local proxy: http://${DEFAULT_HOST}:${port}/`));
    process.on('SIGINT', () => server.close(() => process.exit(0)));
  }
}
