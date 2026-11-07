const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('hesabrasi-ai-hub.js', 'utf8');
function section(a, b) { const i = source.indexOf(a), j = source.indexOf(b, i); assert(i >= 0 && j > i); return source.slice(i, j); }
const fields = { enabled: { checked: true }, key: { value: 'test-only-key' }, model: { value: 'openai/gpt-4o-mini' } };
const card = { getAttribute: () => 'open_router', querySelector: s => fields[s.match(/"([^"]+)"/)[1]] };
const sandbox = {
  state: { slots: { open_router: { enabled: true, key: 'test-only-key', model: fields.model.value, lastOk: true, lastTestAt: 123 } } },
  BY_ID: { open_router: { id: 'open_router', model: 'openai/gpt-4o-mini', name: 'OpenRouter' } },
  document: { getElementById: () => ({ querySelector: () => card }) },
  emptySlot: () => { throw Error('unexpected'); }, isCool: () => false,
  save: () => {}, syncPrimary: () => {}, paintStatus: () => {}
};
vm.createContext(sandbox);
vm.runInContext(section('  var OPENROUTER_ANALYSIS_MODELS = [', '  function renderCards()'), sandbox);
vm.runInContext(section('  function readCard(id) {', '  function collectAll()'), sandbox);
vm.runInContext(section('  function onHubChange(ev) {', '  function mount()'), sandbox);
const markup = sandbox.cardHtml(sandbox.BY_ID.open_router);
for (const id of ['openai/gpt-6.1-terra-pro','anthropic/claude-opus-5.5','anthropic/claude-sonnet-5.5','google/gemini-4-argon','deepseek/deepseek-v4-pro']) assert(markup.includes(id));
assert(markup.includes('data-f="model-choice"'));
sandbox.onHubChange({ target: { value: 'google/gemini-4-argon', getAttribute: () => 'model-choice', closest: () => card } });
assert.equal(fields.model.value, 'google/gemini-4-argon');
assert.equal(sandbox.state.slots.open_router.model, 'google/gemini-4-argon');
assert.equal(sandbox.state.slots.open_router.key, 'test-only-key');
assert.equal(sandbox.state.slots.open_router.lastOk, false);
console.log('OpenRouter model picker tests passed');
