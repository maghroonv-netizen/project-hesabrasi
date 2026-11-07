/* Hesabrasi AI Core — FCC/OpenClaw-aligned multi-provider gateway.
   Catalog IDs, default bases and credential URLs follow
   Alishahryar1/free-claude-code src/free_claude_code/config/provider_catalog.py.
   Browser-direct: OpenAI-compatible POST {base}/chat/completions,
   Gemini native generateContent, Anthropic /v1/messages, Azure api-key.
   Keys live in localStorage (hesabrasi.aicore.v1) — never in the HTML source. */
(function (global) {
  'use strict';

  var STORE_KEY = 'hesabrasi.aicore.v1';
  var COOL_DEFAULT = 60000;
  var TEST_PROMPT = 'Reply with exactly OK.';

  function iranChat() {
    return typeof AI_ENDPOINT === 'string' && AI_ENDPOINT
      ? AI_ENDPOINT
      : 'https://iranrouter.net/api/v1/chat/completions';
  }

  /* kind: openai | gemini | anthropic | azure | iranrouter
     extra: 'account' Cloudflare account id, 'base' Azure/custom base */
  var CATALOG = [
    { id: 'nvidia_nim', name: 'NVIDIA NIM', base: 'https://integrate.api.nvidia.com/v1', kind: 'openai', site: 'https://build.nvidia.com/', keys: 'https://build.nvidia.com/settings/api-keys', model: 'meta/llama-3.1-8b-instruct', featured: true },
    { id: 'open_router', name: 'OpenRouter', base: 'https://openrouter.ai/api/v1', kind: 'openai', site: 'https://openrouter.ai/', keys: 'https://openrouter.ai/keys', model: 'openai/gpt-4o-mini', featured: true, hdr: 'openrouter' },
    { id: 'tokenrouter', name: 'TokenRouter', base: 'https://api.tokenrouter.com/v1', kind: 'openai', site: 'https://tokenrouter.com/', keys: 'https://tokenrouter.com/', model: 'openai/gpt-4o-mini', featured: true },
    { id: 'groq', name: 'Groq', base: 'https://api.groq.com/openai/v1', kind: 'openai', site: 'https://groq.com/', keys: 'https://console.groq.com/keys', model: 'llama-3.1-8b-instant', featured: true },
    { id: 'gemini', name: 'Google Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/', kind: 'gemini', site: 'https://ai.google.dev/', keys: 'https://aistudio.google.com/apikey', model: 'gemini-2.0-flash', featured: true },
    { id: 'iranrouter', name: 'ایران‌روتر', base: '', kind: 'iranrouter', site: 'https://iranrouter.net/', keys: 'https://iranrouter.net/', model: 'openai/gpt-4o-mini', featured: true },
    { id: 'openai_api', name: 'OpenAI API', base: 'https://api.openai.com/v1', kind: 'openai', site: 'https://platform.openai.com/', keys: 'https://platform.openai.com/api-keys', model: 'gpt-4o-mini', featured: true },
    { id: 'anthropic', name: 'Anthropic', base: 'https://api.anthropic.com/v1', kind: 'anthropic', site: 'https://www.anthropic.com/', keys: 'https://platform.claude.com/settings/keys', model: 'claude-3-5-haiku-latest', featured: true },
    { id: 'deepseek', name: 'DeepSeek', base: 'https://api.deepseek.com', kind: 'openai', site: 'https://www.deepseek.com/', keys: 'https://platform.deepseek.com/api_keys', model: 'deepseek-chat', featured: true },
    { id: 'cerebras', name: 'Cerebras', base: 'https://api.cerebras.ai/v1', kind: 'openai', site: 'https://www.cerebras.ai/', keys: 'https://cloud.cerebras.ai/', model: 'llama-3.3-70b', featured: true },
    { id: 'xai', name: 'xAI (Grok)', base: 'https://api.x.ai/v1', kind: 'openai', site: 'https://x.ai/', keys: 'https://console.x.ai/', model: 'grok-2-latest', featured: true },
    { id: 'mistral', name: 'Mistral', base: 'https://api.mistral.ai/v1', kind: 'openai', site: 'https://mistral.ai/', keys: 'https://console.mistral.ai/api-keys/', model: 'mistral-small-latest' },
    { id: 'mistral_codestral', name: 'Mistral Codestral', base: 'https://codestral.mistral.ai/v1', kind: 'openai', site: 'https://mistral.ai/', keys: 'https://console.mistral.ai/codestral', model: 'codestral-latest' },
    { id: 'together', name: 'Together AI', base: 'https://api.together.ai/v1', kind: 'openai', site: 'https://www.together.ai/', keys: 'https://api.together.ai/settings/api-keys', model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo' },
    { id: 'fireworks', name: 'Fireworks', base: 'https://api.fireworks.ai/inference/v1', kind: 'openai', site: 'https://fireworks.ai/', keys: 'https://fireworks.ai/account/api-keys', model: 'accounts/fireworks/models/llama-v3p1-8b-instruct' },
    { id: 'novita', name: 'Novita AI', base: 'https://api.novita.ai/openai/v1', kind: 'openai', site: 'https://novita.ai/', keys: 'https://novita.ai/settings/key-management', model: 'meta-llama/llama-3.1-8b-instruct' },
    { id: 'deepinfra', name: 'DeepInfra', base: 'https://api.deepinfra.com/v1/openai', kind: 'openai', site: 'https://deepinfra.com/', keys: 'https://deepinfra.com/dash/api_keys', model: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
    { id: 'siliconflow', name: 'SiliconFlow', base: 'https://api.siliconflow.com/v1', kind: 'openai', site: 'https://siliconflow.com/', keys: 'https://cloud.siliconflow.com/account/ak', model: 'Qwen/Qwen2.5-7B-Instruct' },
    { id: 'huggingface', name: 'Hugging Face', base: 'https://router.huggingface.co/v1', kind: 'openai', site: 'https://huggingface.co/', keys: 'https://huggingface.co/settings/tokens', model: 'Qwen/Qwen2.5-7B-Instruct' },
    { id: 'cohere', name: 'Cohere', base: 'https://api.cohere.ai/compatibility/v1', kind: 'openai', site: 'https://cohere.com/', keys: 'https://dashboard.cohere.com/api-keys', model: 'command-r' },
    { id: 'kimi', name: 'Kimi', base: 'https://api.moonshot.ai/v1', kind: 'openai', site: 'https://www.moonshot.ai/', keys: 'https://platform.moonshot.ai/console/api-keys', model: 'moonshot-v1-8k' },
    { id: 'kimi_code', name: 'Kimi Code', base: 'https://api.kimi.com/coding/v1', kind: 'openai', site: 'https://www.kimi.com/', keys: 'https://platform.moonshot.ai/console/api-keys', model: 'kimi-k2' },
    { id: 'minimax', name: 'MiniMax', base: 'https://api.minimax.io/v1', kind: 'openai', site: 'https://www.minimax.io/', keys: 'https://platform.minimax.io/', model: 'MiniMax-Text-01' },
    { id: 'sambanova', name: 'SambaNova', base: 'https://api.sambanova.ai/v1', kind: 'openai', site: 'https://sambanova.ai/', keys: 'https://cloud.sambanova.ai/', model: 'Meta-Llama-3.1-8B-Instruct' },
    { id: 'alibaba_cloud', name: 'Alibaba Cloud', base: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', kind: 'openai', site: 'https://www.alibabacloud.com/', keys: 'https://modelstudio.console.alibabacloud.com/', model: 'qwen-plus' },
    { id: 'qwencloud', name: 'QwenCloud Token Plan', base: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1', kind: 'openai', site: 'https://www.alibabacloud.com/', keys: 'https://modelstudio.console.alibabacloud.com/', model: 'qwen-plus' },
    { id: 'qwencloud_coding', name: 'QwenCloud Coding Plan', base: 'https://coding-intl.dashscope.aliyuncs.com/v1', kind: 'openai', site: 'https://www.alibabacloud.com/', keys: 'https://modelstudio.console.alibabacloud.com/', model: 'qwen3-coder-plus' },
    { id: 'nebius', name: 'Nebius Token Factory', base: 'https://api.tokenfactory.nebius.com/v1', kind: 'openai', site: 'https://nebius.com/', keys: 'https://tokenfactory.nebius.com/', model: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
    { id: 'chutes', name: 'Chutes', base: 'https://llm.chutes.ai/v1', kind: 'openai', site: 'https://chutes.ai/', keys: 'https://chutes.ai/', model: 'unsloth/Llama-3.1-8B-Instruct' },
    { id: 'featherless', name: 'Featherless AI', base: 'https://api.featherless.ai/v1', kind: 'openai', site: 'https://featherless.ai/', keys: 'https://featherless.ai/', model: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
    { id: 'agnes', name: 'Agnes AI', base: 'https://apihub.agnes-ai.com/v1', kind: 'openai', site: 'https://agnes-ai.com/', keys: 'https://agnes-ai.com/', model: 'agnes-default' },
    { id: 'zenmux', name: 'ZenMux', base: 'https://zenmux.ai/api/v1', kind: 'openai', site: 'https://zenmux.ai/', keys: 'https://zenmux.ai/', model: 'openai/gpt-4o-mini' },
    { id: 'wandb', name: 'W&B Inference', base: 'https://api.inference.wandb.ai/v1', kind: 'openai', site: 'https://wandb.ai/', keys: 'https://wandb.ai/authorize', model: 'meta-llama/Llama-3.1-8B-Instruct' },
    { id: 'opencode_zen', name: 'OpenCode Zen', base: 'https://opencode.ai/zen/v1', kind: 'openai', site: 'https://opencode.ai/', keys: 'https://opencode.ai/', model: 'gpt-4o-mini' },
    { id: 'opencode_go', name: 'OpenCode Go', base: 'https://opencode.ai/zen/go/v1', kind: 'openai', site: 'https://opencode.ai/', keys: 'https://opencode.ai/', model: 'gpt-4o-mini' },
    { id: 'vercel', name: 'Vercel AI Gateway', base: 'https://ai-gateway.vercel.sh/v1', kind: 'openai', site: 'https://vercel.com/ai', keys: 'https://vercel.com/account/tokens', model: 'openai/gpt-4o-mini' },
    { id: 'bedrock', name: 'Amazon Bedrock', base: 'https://bedrock-mantle.us-east-1.api.aws/v1', kind: 'openai', site: 'https://aws.amazon.com/bedrock/', keys: 'https://console.aws.amazon.com/bedrock/', model: 'amazon.nova-micro-v1:0' },
    { id: 'wafer', name: 'Wafer', base: 'https://pass.wafer.ai/v1', kind: 'openai', site: 'https://wafer.ai/', keys: 'https://wafer.ai/', model: 'default' },
    { id: 'kilo', name: 'Kilo.ai', base: 'https://api.kilo.ai/api/gateway', kind: 'openai', site: 'https://kilo.ai/', keys: 'https://kilo.ai/', model: 'default' },
    { id: 'cline_pass', name: 'ClinePass', base: 'https://api.cline.bot/api/v1', kind: 'openai', site: 'https://cline.bot/', keys: 'https://app.cline.bot', model: 'default' },
    { id: 'zai', name: 'Z.ai Coding Plan', base: 'https://api.z.ai/api/coding/paas/v4', kind: 'openai', site: 'https://z.ai/', keys: 'https://z.ai/', model: 'glm-4.5' },
    { id: 'zai_api', name: 'Z.ai API', base: 'https://api.z.ai/api/paas/v4', kind: 'openai', site: 'https://z.ai/', keys: 'https://z.ai/', model: 'glm-4.5' },
    { id: 'nararoute', name: 'NaraRoute', base: 'https://router.bynara.id/v1', kind: 'openai', site: 'https://bynara.id/', keys: 'https://bynara.id/', model: 'openai/gpt-4o-mini' },
    { id: 'poolside', name: 'Poolside AI', base: 'https://inference.poolside.ai/v1', kind: 'openai', site: 'https://poolside.ai/', keys: 'https://poolside.ai/', model: 'default' },
    { id: 'llm7', name: 'LLM7.io', base: 'https://api.llm7.io/v1', kind: 'openai', site: 'https://llm7.io/', keys: 'https://llm7.io/', model: 'gpt-4o-mini' },
    { id: 'scaleway', name: 'Scaleway', base: 'https://api.scaleway.ai/v1', kind: 'openai', site: 'https://www.scaleway.com/', keys: 'https://console.scaleway.com/', model: 'llama-3.1-8b-instruct' },
    { id: 'lightning', name: 'Lightning AI', base: 'https://lightning.ai/api/v1', kind: 'openai', site: 'https://lightning.ai/', keys: 'https://lightning.ai/', model: 'default' },
    { id: 'experiential', name: 'Experiential Labs', base: 'https://api.experientiallabs.ai/v1', kind: 'openai', site: 'https://experientiallabs.ai/', keys: 'https://experientiallabs.ai/', model: 'default' },
    { id: 'cheaperinference', name: 'Cheaper Inference', base: 'https://api.cheaperinference.com/v1', kind: 'openai', site: 'https://cheaperinference.com/', keys: 'https://cheaperinference.com/', model: 'default' },
    { id: 'orcarouter', name: 'OrcaRouter', base: 'https://api.orcarouter.ai/v1', kind: 'openai', site: 'https://orcarouter.ai/', keys: 'https://orcarouter.ai/', model: 'openai/gpt-4o-mini' },
    { id: 'atlascloud', name: 'Atlas Cloud', base: 'https://api.atlascloud.ai/v1', kind: 'openai', site: 'https://atlascloud.ai/', keys: 'https://atlascloud.ai/', model: 'openai/gpt-4o-mini' },
    { id: 'xkiro', name: 'xKiro', base: 'https://api.xkiro.com/v1', kind: 'openai', site: 'https://xkiro.com/', keys: 'https://xkiro.com/', model: 'openai/gpt-4o-mini' },
    { id: 'opper', name: 'Opper', base: 'https://api.opper.ai/v3/compat', kind: 'openai', site: 'https://opper.ai/', keys: 'https://opper.ai/', model: 'default' },
    { id: 'ollama_cloud', name: 'Ollama Cloud', base: 'https://ollama.com/v1', kind: 'openai', site: 'https://ollama.com/', keys: 'https://ollama.com/', model: 'llama3.1' },
    { id: 'azure_openai', name: 'Azure OpenAI', base: '', kind: 'azure', site: 'https://azure.microsoft.com/en-us/products/ai-services/openai-service/', keys: 'https://ai.azure.com/', model: 'gpt-4o-mini', extra: 'base' },
    { id: 'cloudflare', name: 'Cloudflare Workers AI', base: 'https://api.cloudflare.com/client/v4', kind: 'openai', site: 'https://developers.cloudflare.com/workers-ai/', keys: 'https://dash.cloudflare.com/profile/api-tokens', model: '@cf/meta/llama-3.1-8b-instruct', extra: 'account' },
    { id: 'lmstudio', name: 'LM Studio', base: 'http://localhost:1234/v1', kind: 'openai', site: 'https://lmstudio.ai/', keys: '', model: 'local-model', local: true },
    { id: 'llamacpp', name: 'LLaMA.cpp', base: 'http://localhost:8080/v1', kind: 'openai', site: 'https://github.com/ggerganov/llama.cpp', keys: '', model: 'local-model', local: true },
    { id: 'ollama', name: 'Ollama', base: 'http://localhost:11434/v1', kind: 'openai', site: 'https://ollama.com/', keys: '', model: 'llama3.1', local: true }
  ];

  var BY_ID = {};
  CATALOG.forEach(function (p) { BY_ID[p.id] = p; });

  var coolUntil = {};
  var lastSwitch = '';
  var mounted = false;

  function emptySlot(id) {
    var spec = BY_ID[id];
    return {
      enabled: false,
      key: '',
      model: spec ? spec.model : '',
      extra: {},
      lastOk: false,
      lastError: '',
      lastTestAt: 0
    };
  }

  function defaultState() {
    var slots = {};
    var order = CATALOG.map(function (p) { return p.id; });
    order.forEach(function (id) { slots[id] = emptySlot(id); });
    return { v: 1, slots: slots, order: order, cooldownMs: COOL_DEFAULT };
  }

  var state = defaultState();

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1 || !parsed.slots) return;
      var next = defaultState();
      next.cooldownMs = typeof parsed.cooldownMs === 'number' ? parsed.cooldownMs : COOL_DEFAULT;
      if (Array.isArray(parsed.order)) {
        var seen = {};
        next.order = [];
        parsed.order.forEach(function (id) {
          if (BY_ID[id] && !seen[id]) { next.order.push(id); seen[id] = 1; }
        });
        CATALOG.forEach(function (p) {
          if (!seen[p.id]) next.order.push(p.id);
        });
      }
      Object.keys(parsed.slots).forEach(function (id) {
        if (!BY_ID[id]) return;
        var s = parsed.slots[id] || {};
        next.slots[id] = {
          enabled: !!s.enabled,
          key: typeof s.key === 'string' ? s.key : '',
          model: typeof s.model === 'string' && s.model ? s.model : BY_ID[id].model,
          extra: s.extra && typeof s.extra === 'object' ? s.extra : {},
          lastOk: !!s.lastOk,
          lastError: typeof s.lastError === 'string' ? s.lastError : '',
          lastTestAt: typeof s.lastTestAt === 'number' ? s.lastTestAt : 0
        };
      });
      state = next;
    } catch (e) { /* keep defaults */ }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        v: 1,
        slots: state.slots,
        order: state.order,
        cooldownMs: state.cooldownMs
      }));
    } catch (e) {
      logLine('ذخیره در این مرورگر ممکن نشد: حافظهٔ محلی پر یا مسدود است.');
    }
  }

  function specOf(id) { return BY_ID[id] || null; }

  function wireProvider(id) {
    if (id === 'gemini') return 'google';
    if (id === 'iranrouter') return 'iranrouter';
    return id;
  }

  function trimSlash(u) { return String(u || '').replace(/\/+$/, ''); }

  function joinUrl(base, path) {
    var b = trimSlash(base);
    var p = path.charAt(0) === '/' ? path : '/' + path;
    if (p === '/chat/completions' && /\/chat\/completions$/.test(b)) return b;
    return b + p;
  }

  function slotBase(spec, slot) {
    if (slot && slot.extra && slot.extra.base) return trimSlash(slot.extra.base);
    if (spec.kind === 'iranrouter') return iranChat();
    if (spec.id === 'cloudflare') {
      var acc = slot && slot.extra && slot.extra.account;
      if (!acc) return trimSlash(spec.base);
      return 'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(acc) + '/ai/v1';
    }
    return trimSlash(spec.base);
  }

  function isGemini(s) {
    return s && (s.provider === 'google' || s.slotId === 'gemini' || s.kind === 'gemini');
  }
  function isAnthropic(s) {
    return s && (s.provider === 'anthropic' || s.slotId === 'anthropic' || s.kind === 'anthropic');
  }
  function isAzure(s) {
    return s && (s.provider === 'azure_openai' || s.slotId === 'azure_openai' || s.kind === 'azure');
  }

  function resolveSpec(s) {
    if (s && s.slotId && BY_ID[s.slotId]) return BY_ID[s.slotId];
    if (s && s.provider === 'google') return BY_ID.gemini;
    if (s && BY_ID[s.provider]) return BY_ID[s.provider];
    return null;
  }

  function chatUrl(s) {
    var spec = resolveSpec(s);
    var slot = s && s.slotId ? state.slots[s.slotId] : null;
    if (!spec) {
      if (s && s.provider === 'google' && typeof AD_GOOGLE_ROOT === 'string') {
        return AD_GOOGLE_ROOT + 'models/' + (typeof adGoogleModelId === 'function' ? adGoogleModelId(s.model) : s.model) + ':generateContent';
      }
      return iranChat();
    }
    if (spec.kind === 'gemini') {
      var root = typeof AD_GOOGLE_ROOT === 'string' ? AD_GOOGLE_ROOT : spec.base;
      var mid = typeof adGoogleModelId === 'function' ? adGoogleModelId(s.model) : String(s.model || '').replace(/^models\//, '');
      return root + 'models/' + mid + ':generateContent';
    }
    if (spec.kind === 'anthropic') return joinUrl(slotBase(spec, slot), '/messages');
    if (spec.kind === 'iranrouter') return iranChat();
    if (spec.kind === 'azure') {
      var b = slotBase(spec, slot);
      if (/[?&]api-version=/.test(b)) return b;
      if (/\/chat\/completions$/.test(b)) return b + '?api-version=2024-06-01';
      return joinUrl(b, '/chat/completions') + '?api-version=2024-06-01';
    }
    return joinUrl(slotBase(spec, slot), '/chat/completions');
  }

  function chatHeaders(s) {
    var spec = resolveSpec(s);
    var key = s && s.key ? s.key : '';
    var headers = { 'Content-Type': 'application/json' };
    var skipAuth = !key || key === 'local';
    if (!spec || spec.kind === 'openai' || spec.kind === 'iranrouter') {
      if (!skipAuth) headers.Authorization = 'Bearer ' + key;
      if (spec && spec.hdr === 'openrouter') {
        headers['HTTP-Referer'] = (typeof location !== 'undefined' && location.origin && location.origin !== 'null') ? location.origin : 'https://hesabrasi.local';
        headers['X-Title'] = 'Hesabrasi';
      }
      return headers;
    }
    if (spec.kind === 'gemini') {
      if (!skipAuth) headers['x-goog-api-key'] = key;
      return headers;
    }
    if (spec.kind === 'anthropic') {
      if (!skipAuth) headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
      return headers;
    }
    if (spec.kind === 'azure') {
      if (!skipAuth) headers['api-key'] = key;
      return headers;
    }
    if (!skipAuth) headers.Authorization = 'Bearer ' + key;
    return headers;
  }

  function modelsUrl(info) {
    var provider = info && info.provider;
    var model = info && info.model;
    if (provider === 'google') {
      var root = typeof AD_GOOGLE_ROOT === 'string' ? AD_GOOGLE_ROOT : 'https://generativelanguage.googleapis.com/v1beta/';
      var mid = typeof adGoogleModelId === 'function' ? adGoogleModelId(model) : String(model || '').replace(/^models\//, '');
      return root + 'models/' + mid;
    }
    if (provider === 'iranrouter') {
      return iranChat().replace(/\/chat\/completions$/, '/models');
    }
    var spec = BY_ID[provider];
    if (!spec) return iranChat().replace(/\/chat\/completions$/, '/models');
    if (spec.kind === 'gemini') {
      var r = typeof AD_GOOGLE_ROOT === 'string' ? AD_GOOGLE_ROOT : spec.base;
      var m = typeof adGoogleModelId === 'function' ? adGoogleModelId(model) : String(model || '').replace(/^models\//, '');
      return r + 'models/' + m;
    }
    if (spec.kind === 'anthropic' || spec.kind === 'azure') return null;
    var slot = state.slots[spec.id];
    var base = slotBase(spec, slot);
    if (!base) return null;
    return joinUrl(base, '/models');
  }

  function modelsHeaders(info) {
    var provider = info && info.provider;
    var key = info && info.key ? info.key : '';
    if (provider === 'google' || provider === 'gemini') return { 'x-goog-api-key': key };
    var spec = BY_ID[provider];
    if (spec && spec.kind === 'gemini') return { 'x-goog-api-key': key };
    if (spec && spec.kind === 'azure') return { 'api-key': key };
    if (spec && spec.hdr === 'openrouter') {
      return {
        Authorization: 'Bearer ' + key,
        'HTTP-Referer': (typeof location !== 'undefined' && location.origin && location.origin !== 'null') ? location.origin : 'https://hesabrasi.local',
        'X-Title': 'Hesabrasi'
      };
    }
    return key ? { Authorization: 'Bearer ' + key } : {};
  }

  function anthropicPayload(messages, output, model) {
    var system = (messages || []).filter(function (m) { return m.role === 'system'; }).map(function (m) { return m.content; }).join('\n\n');
    var rest = (messages || []).filter(function (m) { return m.role !== 'system'; }).map(function (m) {
      return { role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') };
    });
    var body = { model: model, max_tokens: Math.max(1, output || 256), messages: rest };
    if (system) body.system = system;
    return body;
  }

  function anthropicResponse(raw) {
    var text = '';
    if (raw && Array.isArray(raw.content)) {
      text = raw.content.filter(function (p) { return p && p.type === 'text' && typeof p.text === 'string'; }).map(function (p) { return p.text; }).join('');
    }
    var stop = raw && raw.stop_reason;
    var finish = stop === 'max_tokens' ? 'length' : (stop === 'end_turn' || stop === 'stop_sequence' ? 'stop' : (stop || 'stop'));
    var u = raw && raw.usage || {};
    return {
      error: raw && raw.error,
      choices: [{ finish_reason: finish, message: { content: text } }],
      usage: {
        prompt_tokens: u.input_tokens,
        completion_tokens: u.output_tokens,
        total_tokens: (u.input_tokens || 0) + (u.output_tokens || 0)
      }
    };
  }

  function isCool(id) {
    return !!(id && coolUntil[id] && Date.now() < coolUntil[id]);
  }

  function shouldSwitch(status, message) {
    if ([429, 402, 502, 503, 500, 529, 408].indexOf(status) >= 0) return true;
    var m = String(message || '').toLowerCase();
    return /rate.?limit|too many requests|quota|insufficient.?quota|resource exhausted|capacity|overloaded|unavailable|payment required|timeout|مهلت/.test(m);
  }

  function noteFail(id, detail) {
    if (!id || !state.slots[id]) return;
    coolUntil[id] = Date.now() + (state.cooldownMs || COOL_DEFAULT);
    state.slots[id].lastError = String(detail || '').slice(0, 400);
    lastSwitch = (specOf(id) ? specOf(id).name : id) + ' موقتاً کنار گذاشته شد' + (detail ? ' — ' + String(detail).slice(0, 160) : '');
    save();
    paintStatus();
  }

  function noteOk(id) {
    if (!id || !state.slots[id]) return;
    delete coolUntil[id];
    state.slots[id].lastOk = true;
    state.slots[id].lastError = '';
    state.slots[id].lastTestAt = Date.now();
    save();
    paintStatus();
  }

  function hydrate(id) {
    var spec = BY_ID[id];
    var slot = state.slots[id] || emptySlot(id);
    return {
      id: id,
      name: spec ? spec.name : id,
      kind: spec ? spec.kind : 'openai',
      wireProvider: wireProvider(id),
      key: slot.key,
      model: slot.model || (spec && spec.model) || '',
      extra: slot.extra || {},
      lastOk: !!slot.lastOk
    };
  }

  function enabledIds() {
    return state.order.filter(function (id) {
      var sl = state.slots[id];
      return sl && sl.enabled && sl.key;
    });
  }

  function readySlots() {
    var ids = enabledIds();
    var hot = ids.filter(function (id) { return !isCool(id); });
    return (hot.length ? hot : ids).map(hydrate);
  }

  function stampFrom(slot, s) {
    return {
      p: s && s.p,
      key: slot.key,
      model: slot.model || (s && s.model) || '',
      provider: slot.wireProvider,
      failover: true,
      slotId: slot.id,
      kind: slot.kind,
      extra: slot.extra || {}
    };
  }

  function fallbackProfile() {
    var model = (typeof ROUTER_MODEL === 'string' && ROUTER_MODEL) ? ROUTER_MODEL : 'openai/gpt-4o-mini';
    var slots = readySlots();
    if (slots.length) model = slots[0].model || model;
    if (typeof adManualProfile === 'function') {
      try { return adManualProfile(model, 128000, 480000); } catch (e) { /* fall through */ }
    }
    return {
      model: model,
      contextTokens: 128000,
      inputTokens: null,
      outputTokens: null,
      charLimit: 480000,
      source: 'user_declared_not_provider_verified',
      retrievedAt: new Date().toISOString(),
      inputPrice: null,
      outputPrice: null,
      parameters: ['max_tokens', 'temperature'],
      tokenMethod: 'UTF8_byte_conservative_est'
    };
  }

  function hasReady() { return enabledIds().length > 0; }

  function badgeText() {
    var n = enabledIds().length;
    var ok = enabledIds().filter(function (id) { return state.slots[id].lastOk; }).length;
    if (!n) return 'تنظیم نشده';
    if (ok) return ok + ' سرویس تأییدشده';
    return n + ' سرویس ذخیره‌شده';
  }

  function syncPrimary() {
    var slots = readySlots();
    var primary = slots[0];
    if (!primary) return;
    try {
      if (typeof ROUTER_KEY !== 'undefined') ROUTER_KEY = primary.key;
      if (typeof ROUTER_MODEL !== 'undefined') ROUTER_MODEL = primary.model;
      if (typeof AD_PROVIDER !== 'undefined') AD_PROVIDER = primary.wireProvider;
    } catch (e) { /* ignore */ }
    var keyEl = document.getElementById('routerKey');
    var modelEl = document.getElementById('routerModel');
    var provEl = document.getElementById('aiProvider');
    if (modelEl) modelEl.value = primary.model;
    if (keyEl && !keyEl.value) keyEl.value = primary.key;
    if (provEl) {
      if (primary.wireProvider === 'google' || primary.wireProvider === 'iranrouter') {
        try { provEl.value = primary.wireProvider; } catch (e2) { /* ignore */ }
      }
    }
    var badge = document.getElementById('routerBadge');
    if (badge) badge.textContent = badgeText();
  }

  function logLine(text) {
    lastSwitch = text || lastSwitch;
    var el = document.getElementById('aihubSwitchLog');
    if (el) el.textContent = lastSwitch || '';
  }

  function paintStatus() {
    var badge = document.getElementById('routerBadge');
    if (badge) badge.textContent = badgeText();
    logLine(lastSwitch);
    var root = document.getElementById('hesabrasiAiHub');
    if (!root) return;
    root.querySelectorAll('[data-aihub-card]').forEach(function (card) {
      var id = card.getAttribute('data-aihub-card');
      var sl = state.slots[id];
      if (!sl) return;
      card.classList.toggle('ok', !!sl.lastOk);
      card.classList.toggle('cool', isCool(id));
      var mark = card.querySelector('.aihub-mark');
      if (mark) mark.textContent = sl.lastOk ? '✓ متصل' : (sl.enabled && sl.key ? 'ذخیره شد' : '');
      var log = card.querySelector('.aihub-log');
      if (log) {
        if (isCool(id)) log.textContent = 'در انتظار رفع محدودیت نرخ… ' + (sl.lastError || '');
        else log.textContent = sl.lastError || (sl.lastOk ? 'آزمایش اتصال موفق بود.' : '');
      }
    });
  }

  function readCard(id) {
    var root = document.getElementById('hesabrasiAiHub');
    if (!root) return;
    var card = root.querySelector('[data-aihub-card="' + id + '"]');
    if (!card) return;
    var spec = BY_ID[id];
    var sl = state.slots[id] || emptySlot(id);
    var en = card.querySelector('[data-f="enabled"]');
    var key = card.querySelector('[data-f="key"]');
    var model = card.querySelector('[data-f="model"]');
    sl.enabled = !!(en && en.checked);
    if (key && key.value) sl.key = key.value.trim();
    if (model) {
      var nextModel = model.value.trim() || spec.model;
      if (nextModel !== sl.model) { sl.lastOk = false; sl.lastError = ''; sl.lastTestAt = 0; }
      sl.model = nextModel;
    }
    if (spec.extra === 'base') {
      var b = card.querySelector('[data-f="base"]');
      sl.extra = sl.extra || {};
      if (b) sl.extra.base = b.value.trim();
    }
    if (spec.extra === 'account') {
      var a = card.querySelector('[data-f="account"]');
      sl.extra = sl.extra || {};
      if (a) sl.extra.account = a.value.trim();
    }
    state.slots[id] = sl;
  }

  function collectAll() {
    state.order.forEach(readCard);
  }

  async function testSlot(id) {
    readCard(id);
    var spec = BY_ID[id];
    var sl = state.slots[id];
    if (!sl.key && spec.local) sl.key = 'local';
    if (!sl.key && !spec.local) {
      sl.lastOk = false;
      sl.lastError = 'کلید API وارد نشده است.';
      save(); paintStatus();
      return { ok: false, detail: sl.lastError };
    }
    if (spec.extra === 'base' && !(sl.extra && sl.extra.base)) {
      sl.lastOk = false; sl.lastError = 'نشانی پایهٔ Azure لازم است.';
      save(); paintStatus();
      return { ok: false, detail: sl.lastError };
    }
    if (spec.extra === 'account' && !(sl.extra && sl.extra.account)) {
      sl.lastOk = false; sl.lastError = 'Account ID کلادفلر لازم است.';
      save(); paintStatus();
      return { ok: false, detail: sl.lastError };
    }
    sl.enabled = true;
    save();
    var sx = stampFrom(hydrate(id), { p: null });
    var gemini = isGemini(sx);
    var payload;
    if (gemini && typeof adGooglePayload === 'function') payload = adGooglePayload([{ role: 'user', content: TEST_PROMPT }], 16);
    else if (isAnthropic(sx)) payload = anthropicPayload([{ role: 'user', content: TEST_PROMPT }], 16, sx.model);
    else payload = { model: sx.model, messages: [{ role: 'user', content: TEST_PROMPT }], max_tokens: 16, temperature: 0 };
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 20000);
    try {
      var response = await fetch(chatUrl(sx), {
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: chatHeaders(sx),
        body: JSON.stringify(payload),
        signal: ctl.signal
      });
      var data = {};
      try { data = await response.json(); } catch (e1) { data = {}; }
      if (gemini && typeof adGoogleResponse === 'function') data = adGoogleResponse(data);
      else if (isAnthropic(sx)) data = anthropicResponse(data);
      if (!response.ok) {
        var message = (data && data.error && (data.error.message || data.error)) || data.message || '';
        sl.lastOk = false;
        sl.lastError = 'HTTP ' + response.status + (message ? ' — ' + String(message).slice(0, 240) : '');
        save(); paintStatus();
        return { ok: false, detail: sl.lastError };
      }
      var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (typeof text !== 'string' || !text.trim()) {
        sl.lastOk = false;
        sl.lastError = 'پاسخ متنی معتبر نیامد.';
        save(); paintStatus();
        return { ok: false, detail: sl.lastError };
      }
      noteOk(id);
      syncPrimary();
      logLine('اتصال ' + spec.name + ' تأیید شد.');
      return { ok: true, text: text.trim() };
    } catch (err) {
      sl.lastOk = false;
      sl.lastError = err && err.name === 'AbortError' ? 'مهلت آزمایش تمام شد (یا CORS مانع شد).' : ('خطای شبکه/CORS: ' + (err && err.message ? err.message : err));
      save(); paintStatus();
      return { ok: false, detail: sl.lastError };
    } finally {
      clearTimeout(timer);
    }
  }

  async function testChain() {
    collectAll();
    save();
    syncPrimary();
    var slots = readySlots();
    var status = document.getElementById('routerStatus');
    if (!slots.length) {
      if (status) status.textContent = 'ابتدا حداقل یک سرویس را فعال و کلید آن را ذخیره کنید.';
      return;
    }
    if (status) status.textContent = 'در حال آزمایش زنجیره به ترتیب سوییچ…';
    var lines = [];
    for (var i = 0; i < slots.length; i++) {
      var r = await testSlot(slots[i].id);
      lines.push((r.ok ? '✓ ' : '✗ ') + slots[i].name + (r.ok ? (' → ' + String(r.text).slice(0, 80)) : (' — ' + r.detail)));
      if (r.ok) break;
    }
    if (status) status.textContent = lines.join('\n');
    syncPrimary();
  }

  function move(id, dir) {
    var i = state.order.indexOf(id);
    if (i < 0) return;
    var j = i + dir;
    if (j < 0 || j >= state.order.length) return;
    var t = state.order[i];
    state.order[i] = state.order[j];
    state.order[j] = t;
    save();
    renderCards();
    syncPrimary();
  }

  // Curated from OpenRouter model pages; this is a convenience list, not a
  // guarantee of account access, pricing, or audit accuracy.
  var OPENROUTER_ANALYSIS_MODELS = [
    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'رایگان — NVIDIA Nemotron 3 Ultra' },
    { id: 'deepseek/deepseek-v4-flash:free', name: 'رایگان — DeepSeek V4 Flash' },
    { id: 'deepseek/deepseek-r1-0528:free', name: 'رایگان — DeepSeek R1 0528' },
    { id: 'deepseek/deepseek-v4-flash-0731', name: 'پولی اقتصادی — DeepSeek V4 Flash 0731' },
    { id: 'qwen/qwen3.5-flash-02-23', name: 'پولی اقتصادی — Qwen 3.5 Flash' },
    { id: 'openai/gpt-6.1-terra-pro', name: 'پولی — GPT-6.1 Terra Pro' },
    { id: 'anthropic/claude-opus-5.5', name: 'پولی — Claude Opus 5.5' },
    { id: 'anthropic/claude-sonnet-5.5', name: 'پولی — Claude Sonnet 5.5' },
    { id: 'google/gemini-4-argon', name: 'پولی — Gemini 4 Argon' },
    { id: 'deepseek/deepseek-v4-pro', name: 'پولی — DeepSeek V4 Pro' }
  ];

  function cardHtml(spec) {
    var sl = state.slots[spec.id] || emptySlot(spec.id);
    var extra = '';
    if (spec.extra === 'base') {
      extra = '<label>نشانی پایه Azure (deployments/… )<input data-f="base" dir="ltr" placeholder="https://RESOURCE.openai.azure.com/openai/deployments/DEPLOYMENT" value="' + esc(sl.extra && sl.extra.base || '') + '"></label>';
    }
    if (spec.extra === 'account') {
      extra = '<label>Cloudflare Account ID<input data-f="account" dir="ltr" value="' + esc(sl.extra && sl.extra.account || '') + '"></label>';
    }
    var keyPh = spec.local ? 'اختیاری — اگر سرور محلی کلید نمی‌خواهد خالی بگذارید' : 'کلید API';
    var links = '';
    if (spec.keys) links += '<a href="' + esc(spec.keys) + '" target="_blank" rel="noopener">دریافت کلید</a>';
    if (spec.site) links += (links ? ' · ' : '') + '<a href="' + esc(spec.site) + '" target="_blank" rel="noopener">سایت</a>';
    return (
      '<article class="aihub-card' + (sl.lastOk ? ' ok' : '') + (isCool(spec.id) ? ' cool' : '') + '" data-aihub-card="' + spec.id + '">' +
        '<div class="aihub-head">' +
          '<div class="aihub-order"><button type="button" data-act="up" title="اولویت بالاتر">▲</button><button type="button" data-act="down" title="اولویت پایین‌تر">▼</button></div>' +
          '<label class="aihub-en"><input type="checkbox" data-f="enabled"' + (sl.enabled ? ' checked' : '') + '> فعال</label>' +
          '<span class="aihub-name">' + esc(spec.name) + '</span>' +
          '<span class="aihub-mark">' + (sl.lastOk ? '✓ متصل' : '') + '</span>' +
        '</div>' +
        '<div class="aihub-grid">' +
          '<label>کلید API<input data-f="key" type="password" autocomplete="off" dir="ltr" placeholder="' + esc(keyPh) + '" value="' + esc(sl.key) + '"></label>' +
          (spec.id === 'open_router' ? '<label>مدل‌های پیشنهادی برای تحلیل<select data-f="model-choice"><option value="">انتخاب مدل یا ورود دستی</option>' + OPENROUTER_ANALYSIS_MODELS.map(function (m) { return '<option value="' + esc(m.id) + '"' + (sl.model === m.id ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></label>' : '') +
          '<label>شناسهٔ مدل<input data-f="model" dir="ltr" value="' + esc(sl.model) + '">' + (spec.id === 'open_router' ? '<small>گزینه‌های رایگان محدودیت درخواست و دسترسی متغیر دارند؛ گزینه‌های پولی هزینه دارند. تعرفه و دسترسی را در OpenRouter بررسی کنید. در صورت فعال‌بودن سرویس‌های دیگر، سوییچ به آن‌ها ممکن است هزینه داشته باشد.</small>' : '') + '</label>' +
        '</div>' + extra +
        '<div class="aihub-links">' + links + '</div>' +
        '<div class="aihub-actions">' +
          '<button type="button" data-act="save">ذخیره</button>' +
          '<button type="button" data-act="test">آزمایش اتصال</button>' +
          '<button type="button" data-act="clear">پاک‌کردن کلید</button>' +
        '</div>' +
        '<p class="aihub-log">' + esc(sl.lastError || (sl.lastOk ? 'آزمایش اتصال موفق بود.' : '')) + '</p>' +
      '</article>'
    );
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function renderCards() {
    var feat = document.getElementById('aihubFeatured');
    var rest = document.getElementById('aihubRest');
    if (!feat || !rest) return;
    var featured = [], other = [];
    state.order.forEach(function (id) {
      var spec = BY_ID[id];
      if (!spec) return;
      (spec.featured ? featured : other).push(spec);
    });
    feat.innerHTML = featured.map(cardHtml).join('');
    rest.innerHTML = other.map(cardHtml).join('');
  }

  function onHubClick(ev) {
    var btn = ev.target.closest('[data-act]');
    if (!btn) return;
    var card = btn.closest('[data-aihub-card]');
    if (!card) return;
    var id = card.getAttribute('data-aihub-card');
    var act = btn.getAttribute('data-act');
    ev.preventDefault();
    if (act === 'up') move(id, -1);
    else if (act === 'down') move(id, 1);
    else if (act === 'save') {
      readCard(id);
      state.slots[id].enabled = true;
      if (BY_ID[id].local && !state.slots[id].key) state.slots[id].key = 'local';
      save();
      syncPrimary();
      paintStatus();
      logLine(BY_ID[id].name + ' ذخیره شد. برای تأیید، آزمایش اتصال را بزنید.');
    } else if (act === 'test') {
      btn.disabled = true;
      testSlot(id).finally(function () { btn.disabled = false; });
    } else if (act === 'clear') {
      state.slots[id] = emptySlot(id);
      save();
      renderCards();
      syncPrimary();
    }
  }

  function onHubChange(ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    var card = t.closest('[data-aihub-card]');
    if (!card) return;
    var field = t.getAttribute('data-f');
    if (field === 'model-choice') {
      if (!t.value) return;
      var input = card.querySelector('[data-f="model"]');
      if (input) input.value = t.value;
    }
    readCard(card.getAttribute('data-aihub-card'));
    save();
    if (field === 'enabled' || field === 'model-choice') { syncPrimary(); paintStatus(); }
  }

  function mount() {
    var form = document.getElementById('routerForm');
    if (!form || mounted) return;
    load();
    var style = document.createElement('style');
    style.textContent =
      '#hesabrasiAiHub{margin:0 0 12px;text-align:right}' +
      '#hesabrasiAiHub h3{margin:0 0 4px;font-size:14px}' +
      '.aihub-note{font-size:11px;color:var(--muted);line-height:1.7;margin:0 0 10px}' +
      '.aihub-card{border:1px solid var(--line);border-radius:10px;padding:10px;margin:0 0 8px;background:var(--bg,#f7f7f5)}' +
      '.aihub-card.ok{border-color:#1a7f37}' +
      '.aihub-card.cool{opacity:.78}' +
      '.aihub-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
      '.aihub-name{font-weight:700;font-size:13px}' +
      '.aihub-mark{color:#1a7f37;font-weight:700;font-size:12px}' +
      '.aihub-en{font-size:12px}' +
      '.aihub-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}' +
      '@media(max-width:640px){.aihub-grid{grid-template-columns:1fr}}' +
      '.aihub-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
      '.aihub-actions button,.aihub-toolbar button{font-size:12px;padding:5px 8px}' +
      '.aihub-order{display:flex;flex-direction:column}' +
      '.aihub-order button{padding:0 6px;line-height:1.2;font-size:10px}' +
      '.aihub-log{font-size:11px;min-height:1.4em;color:var(--muted);margin:6px 0 0}' +
      '.aihub-links{font-size:11px;margin-top:4px}' +
      '.aihub-toolbar{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}' +
      '#aihubSwitchLog{font-size:11px;color:var(--muted);white-space:pre-wrap}' +
      '#aiProvider,#googleSetup{display:none!important}';
    document.head.appendChild(style);

    var box = document.createElement('div');
    box.id = 'hesabrasiAiHub';
    box.innerHTML =
      '<h3>هستهٔ هوش مصنوعی · الگوی FCC / OpenClaw</h3>' +
      '<p class="aihub-note">NVIDIA، OpenRouter، TokenRouter و بقیهٔ سکوهای فهرست FCC. کلید فقط در همین مرورگر ذخیره می‌شود (نه داخل فایل پروژه). ترتیب کارت‌ها = ترتیب سوییچ هنگام HTTP ۴۲۹ / ۴۰۲ / ۵۰۲ / ۵۰۳ و مهلت. تحلیل دفتر از اولین سرویس تأییدشده ارسال می‌شود.</p>' +
      '<div id="aihubFeatured"></div>' +
      '<details><summary>سایر سکوهای سازگار با FCC</summary><div id="aihubRest"></div></details>' +
      '<div class="aihub-toolbar">' +
        '<button type="button" id="aihubSaveAll">ذخیرهٔ همه</button>' +
        '<button type="button" id="aihubTestChain">آزمایش زنجیره</button>' +
        '<button type="button" id="aihubExport">خروجی تنظیمات</button>' +
        '<button type="button" id="aihubImport">ورود تنظیمات</button>' +
        '<button type="button" id="aihubWipe">پاک‌کردن همهٔ کلیدها</button>' +
      '</div>' +
      '<input id="aihubImportFile" type="file" accept="application/json" hidden>' +
      '<p id="aihubSwitchLog" role="status"></p>' +
      '<details class="router-advanced"><summary>ورود دستی سازگار با نسخهٔ قبل</summary></details>';

    form.insertBefore(box, form.firstChild);
    var legacy = box.querySelector('details.router-advanced');
    var keyLabel = form.querySelector('label > #routerKey') ? form.querySelector('label > #routerKey').parentElement : document.getElementById('routerKey') && document.getElementById('routerKey').closest('label');
    var modelLabel = form.querySelector('label > #routerModel') ? form.querySelector('label > #routerModel').parentElement : document.getElementById('routerModel') && document.getElementById('routerModel').closest('label');
    if (legacy) {
      if (keyLabel) legacy.appendChild(keyLabel);
      if (modelLabel) legacy.appendChild(modelLabel);
    }

    var gsetup = document.getElementById('googleSetup');
    if (gsetup) gsetup.hidden = true;
    var pbox = document.getElementById('aiProvider');
    if (pbox) {
      var wrap = pbox.closest('div') || pbox.closest('label');
      if (wrap) wrap.hidden = true;
    }

    renderCards();
    box.addEventListener('click', onHubClick);
    box.addEventListener('change', onHubChange);

    document.getElementById('aihubSaveAll').onclick = function () {
      collectAll();
      enabledIds();
      save();
      syncPrimary();
      logLine('تنظیمات در این مرورگر ذخیره شد.');
    };
    document.getElementById('aihubTestChain').onclick = function () { testChain(); };
    document.getElementById('aihubWipe').onclick = function () {
      if (!confirm('همهٔ کلیدهای ذخیره‌شده در این مرورگر پاک شوند؟')) return;
      state = defaultState();
      coolUntil = {};
      save();
      renderCards();
      try { ROUTER_KEY = ''; } catch (e) { /* ignore */ }
      var badge = document.getElementById('routerBadge');
      if (badge) badge.textContent = 'تنظیم نشده';
      logLine('کلیدها از این مرورگر پاک شدند.');
    };
    document.getElementById('aihubExport').onclick = function () {
      collectAll();
      save();
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'hesabrasi-ai-core.json';
      a.click();
      URL.revokeObjectURL(a.href);
    };
    document.getElementById('aihubImport').onclick = function () {
      document.getElementById('aihubImportFile').click();
    };
    document.getElementById('aihubImportFile').onchange = function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          localStorage.setItem(STORE_KEY, String(reader.result));
          load();
          renderCards();
          syncPrimary();
          logLine('تنظیمات وارد شد.');
        } catch (e) {
          logLine('ورود تنظیمات نامعتبر بود.');
        }
      };
      reader.readAsText(f);
      ev.target.value = '';
    };

    var title = document.getElementById('routerDialogTitle');
    if (title) title.textContent = 'هستهٔ هوش مصنوعی · نسخهٔ ۹٫۱۹';

    mounted = true;
    syncPrimary();
    paintStatus();
  }

  function install() {
    var testBtn = document.getElementById('routerTest');
    if (testBtn) {
      testBtn.onclick = function () { testChain(); };
      testBtn.hidden = false;
      testBtn.disabled = false;
    }
    var forget = document.getElementById('routerForget');
    if (forget) {
      forget.addEventListener('click', function () {
        setTimeout(syncPrimary, 0);
      });
    }
  }

  load();

  global.HesabrasiAI = {
    catalog: CATALOG,
    readySlots: readySlots,
    stampFrom: stampFrom,
    isGemini: isGemini,
    isAnthropic: isAnthropic,
    isAzure: isAzure,
    chatUrl: chatUrl,
    chatHeaders: chatHeaders,
    modelsUrl: modelsUrl,
    modelsHeaders: modelsHeaders,
    anthropicPayload: anthropicPayload,
    anthropicResponse: anthropicResponse,
    shouldSwitch: shouldSwitch,
    isCool: isCool,
    noteFail: noteFail,
    noteOk: noteOk,
    fallbackProfile: fallbackProfile,
    hasReady: hasReady,
    badgeText: badgeText,
    syncPrimary: syncPrimary,
    mount: mount,
    install: install,
    testSlot: testSlot,
    testChain: testChain
  };

  function boot() {
    try {
      mount();
      install();
      syncPrimary();
    } catch (e) {
      if (typeof console !== 'undefined') console.error('HesabrasiAI', e);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : this);
