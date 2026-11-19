const UPSTREAM = 'https://1xai.ir/v1';
const MAX_BODY_BYTES = 10 * 1024 * 1024;

function corsHeaders(origin, env) {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin'
  });
  if (origin && origin === env.ALLOWED_ORIGIN) {
    headers.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

function jsonResponse(value, status, headers) {
  const out = new Headers(headers);
  out.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(value), { status, headers: out });
}

function authorized(request, env) {
  const token = String(env.APP_ACCESS_TOKEN || '');
  const header = request.headers.get('Authorization') || '';
  return token.length >= 32 && header === `Bearer ${token}`;
}

export async function handleRequest(request, env, fetchImpl = fetch) {
  const origin = request.headers.get('Origin') || '';
  const headers = corsHeaders(origin, env);
  const url = new URL(request.url);
  const path = url.pathname;

  if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, headers);
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (path === '/health' && request.method === 'GET') {
    return jsonResponse({ ok: true, service: '1xAi relay' }, 200, headers);
  }
  if (path !== '/v1/models' && path !== '/v1/chat/completions') {
    return jsonResponse({ error: 'Not found' }, 404, headers);
  }
  const isModels = path === '/v1/models' && request.method === 'GET';
  const isChat = path === '/v1/chat/completions' && request.method === 'POST';
  if (!isModels && !isChat) {
    headers.set('Allow', 'GET, POST, OPTIONS');
    return jsonResponse({ error: 'Method not allowed' }, 405, headers);
  }
  if (!env.ONE_XAI_API_KEY || !env.APP_ACCESS_TOKEN) {
    return jsonResponse({ error: 'Worker secrets are not configured' }, 500, headers);
  }
  if (!authorized(request, env)) {
    return jsonResponse({ error: 'Invalid proxy access token' }, 401, headers);
  }

  let body;
  if (isChat) {
    const contentType = String(request.headers.get('Content-Type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return jsonResponse({ error: 'Expected application/json' }, 415, headers);
    }
    const declaredSize = Number(request.headers.get('Content-Length') || 0);
    if (declaredSize > MAX_BODY_BYTES) return jsonResponse({ error: 'Request body too large' }, 413, headers);
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return jsonResponse({ error: 'Request body too large' }, 413, headers);
    try {
      const parsed = JSON.parse(new TextDecoder().decode(body));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof parsed.model !== 'string' || !Array.isArray(parsed.messages)) {
        return jsonResponse({ error: 'Invalid chat-completions payload' }, 400, headers);
      }
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400, headers);
    }
  }

  const upstreamUrl = isModels ? `${UPSTREAM}/models` : `${UPSTREAM}/chat/completions`;
  try {
    const upstream = await fetchImpl(upstreamUrl, {
      method: isModels ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${env.ONE_XAI_API_KEY}`,
        Accept: request.headers.get('Accept') || 'application/json',
        ...(isChat ? { 'Content-Type': 'application/json' } : {})
      },
      ...(isChat ? { body } : {})
    });
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return jsonResponse({ error: 'Could not reach 1xAi API from the Worker' }, 502, headers);
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
