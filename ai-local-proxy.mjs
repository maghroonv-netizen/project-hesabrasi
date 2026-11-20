/** Local-only, fixed-destination bridge for the browser AI hub (Node 20+). */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const root = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(await readFile(path.join(root, 'ai-provider-registry.json'), 'utf8'));
const builtins = {
  open_router: 'https://openrouter.ai/api/v1', one_x_ai: 'https://1xai.ir/v1',
  iranrouter: 'https://iranrouter.net/api/v1', openai_api: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta', anthropic: 'https://api.anthropic.com/v1',
  groq: 'https://api.groq.com/openai/v1', deepseek: 'https://api.deepseek.com/v1',
  mistral: 'https://api.mistral.ai/v1', cerebras: 'https://api.cerebras.ai/v1',
  nvidia_nim: 'https://integrate.api.nvidia.com/v1'
};
const providers = Object.freeze({...Object.fromEntries(registry.providers.map(p => [p.id, p.base])), ...builtins});
const MAX_BODY = 8 * 1024 * 1024;
const forwardedHeaders = ['authorization', 'x-goog-api-key', 'x-api-key', 'anthropic-version', 'content-type', 'x-title'];
const responseHeaders = ['content-type', 'retry-after', 'retry-after-ms', 'x-ratelimit-limit-requests', 'x-ratelimit-limit-tokens', 'x-ratelimit-remaining-requests', 'x-ratelimit-remaining-tokens', 'x-ratelimit-reset-requests', 'x-ratelimit-reset-tokens', 'ratelimit-limit-requests', 'ratelimit-limit-tokens', 'ratelimit-remaining-requests', 'ratelimit-remaining-tokens', 'ratelimit-reset-requests', 'ratelimit-reset-tokens'];
function error(res, status, message) {
  if (res.headersSent) return res.destroy();
  res.writeHead(status, {'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff'});
  res.end(JSON.stringify({error:{message}}));
}
function trustedRequest(req) {
  const host = (req.headers.host || '').toLowerCase();
  if (!/^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(host)) return false;
  const origin = req.headers.origin;
  if (origin && origin.toLowerCase() !== 'http://' + host) return false;
  const site = req.headers['sec-fetch-site'];
  return !site || site === 'same-origin' || site === 'none';
}
function upstreamFor(id, action, params) {
  let base = providers[id];
  if (!base) throw new Error('unknown provider');
  if (action === 'quota' && id !== 'open_router') return null;
  if (id === 'cloudflare') {
    const account = params.get('account') || '';
    if (!/^[a-f\d]{32}$/i.test(account)) throw new Error('invalid account');
    base = 'https://api.cloudflare.com/client/v4/accounts/' + account + '/ai';
    const page = params.get('page');
    if (page && (!/^\d{1,2}$/.test(page) || Number(page) < 1 || Number(page) > 20)) throw new Error('invalid page');
    return action === 'models' ? base + '/models/search?per_page=100' + (page ? '&page=' + page : '') : action === 'chat' ? base + '/v1/chat/completions' : null;
  }
  if (id === 'gemini') {
    if (action === 'models') {
      const token = params.get('pageToken');
      if (token && !/^[a-zA-Z0-9_=-]{1,512}$/.test(token)) throw new Error('invalid page token');
      return base + '/models?pageSize=1000' + (token ? '&pageToken=' + encodeURIComponent(token) : '');
    }
    const model = params.get('model') || '';
    if (!/^[a-zA-Z0-9._:-]{1,200}$/.test(model)) throw new Error('invalid model');
    return base + '/models/' + encodeURIComponent(model) + (action === 'chat' ? ':generateContent' : '');
  }
  if (id === 'cohere' && action === 'models') {
    const token = params.get('page_token');
    if (token && !/^[a-zA-Z0-9._~+\/=-]{1,512}$/.test(token)) throw new Error('invalid page token');
    return 'https://api.cohere.com/v1/models' + (token ? '?page_token=' + encodeURIComponent(token) : '');
  }
  if (id === 'anthropic' && action === 'models') {
    const cursor = params.get('after_id');
    if (cursor && !/^[a-zA-Z0-9._:-]{1,200}$/.test(cursor)) throw new Error('invalid cursor');
    return base + '/models' + (cursor ? '?after_id=' + encodeURIComponent(cursor) : '');
  }
  if (id === 'kilo' && action === 'models') return 'https://api.kilo.ai/api/gateway/models';
  if (action === 'quota') return id === 'open_router' ? base.replace(/\/+$/, '') + '/key' : null;
  if (action === 'model') return null;
  if (action === 'models') return base.replace(/\/+$/, '') + '/models';
  if (action === 'chat') return base.replace(/\/+$/, '') + (id === 'anthropic' ? '/messages' : '/chat/completions');
  return null;
}
async function bodyFor(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('request too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export function createLocalProxy({fetchImpl = fetch} = {}) {
  return http.createServer(async (req, res) => {
    try {
      if (!trustedRequest(req)) return error(res, 403, 'Local access only.');
      const u = new URL(req.url, 'http://localhost');
      const match = /^\/api\/ai\/([a-z0-9_]+)\/(models|model|chat|quota)$/.exec(u.pathname);
      if (match) {
        if (req.headers['x-hesabrasi-proxy'] !== '1') return error(res, 403, 'Missing local application header.');
        const [, id, action] = match;
        if (!Object.hasOwn(providers, id)) return error(res, 404, 'Unknown provider.');
        if ((action === 'chat' && req.method !== 'POST') || (action !== 'chat' && req.method !== 'GET')) return error(res, 405, 'Method not allowed.');
        const target = upstreamFor(id, action, u.searchParams);
        if (!target) return error(res, 404, 'Unsupported operation.');
        const headers = {};
        for (const name of forwardedHeaders) if (req.headers[name]) headers[name] = req.headers[name];
        if (action === 'chat' && !/^application\/json(?:\s*;|$)/i.test(headers['content-type'] || '')) return error(res, 415, 'JSON required.');
        const body = action === 'chat' ? await bodyFor(req) : undefined;
        const abort = AbortSignal.timeout(125000);
        const upstream = await fetchImpl(target, {method:req.method, headers, body, redirect:'manual', signal:abort});
        if (upstream.status >= 300 && upstream.status < 400) return error(res, 599, 'Upstream redirect refused.');
        const outgoing = {'cache-control':'no-store', 'x-content-type-options':'nosniff'};
        for (const name of responseHeaders) { const val = upstream.headers.get(name); if (val) outgoing[name] = val; }
        res.writeHead(upstream.status, outgoing);
        if (upstream.body) await pipeline(Readable.fromWeb(upstream.body), res); else res.end();
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return error(res, 405, 'Method not allowed.');
      let filename, mime;
      if (u.pathname === '/' || u.pathname === '/index.html') { filename = 'index.html'; mime = 'text/html; charset=utf-8'; }
      else if (u.pathname === '/audit-google-auto.html') { filename = 'audit-google-auto.html'; mime = 'text/html; charset=utf-8'; }
      else if (u.pathname === '/assets/fonts/Lotus.regular.woff2') { filename = 'assets/fonts/Lotus.regular.woff2'; mime = 'font/woff2'; }
      else if (u.pathname === '/assets/fonts/Vazirmatn-variable.woff2') { filename = 'assets/fonts/Vazirmatn-variable.woff2'; mime = 'font/woff2'; }
      else return error(res, 404, 'Not found.');
      let content = await readFile(path.join(root, filename));
      if (filename === 'audit-google-auto.html') content = Buffer.from(content.toString('utf8').replace('<head>', '<head><script>window.HESABRASI_AI_PROXY=true;</script>'));
      res.writeHead(200, {'content-type':mime, 'cache-control':'no-store', 'x-content-type-options':'nosniff'});
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (err) {
      error(res, err?.message === 'request too large' ? 413 : 599, 'Local bridge could not complete the request. Check the provider, account, and network.');
    }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.HESABRASI_AI_PORT || 8788);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid HESABRASI_AI_PORT');
  createLocalProxy().listen(port, '127.0.0.1', () => console.log(`Hesabrasi local AI bridge: http://127.0.0.1:${port}/`));
}
