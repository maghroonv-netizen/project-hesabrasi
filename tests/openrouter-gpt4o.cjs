const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('hesabrasi-ai-hub.js', 'utf8');
function section(a,b){const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i);return source.slice(i,j);}
const input={value:'another-model'}, key={value:'test-only-key'}, enabled={checked:true};
const card={getAttribute:()=> 'open_router',querySelector:s=>s.includes('model')?input:s.includes('key')?key:enabled};
let saves=0,syncs=0;
const sandbox={state:{slots:{open_router:{model:'another-model',key:key.value,enabled:true,lastOk:true,lastTestAt:1}}},BY_ID:{open_router:{model:'openai/gpt-4o-mini',name:'OpenRouter'}},document:{getElementById:()=>({querySelector:()=>card})},save:()=>saves++,syncPrimary:()=>syncs++,paintStatus:()=>{},logLine:()=>{}};
vm.createContext(sandbox);
vm.runInContext(section('  function readCard(id) {','  function collectAll()'),sandbox);
vm.runInContext(section('  function onHubClick(ev) {','  function onHubChange(ev)'),sandbox);
const btn={closest:()=>card,getAttribute:()=> 'select-gpt4o-mini'};
sandbox.onHubClick({target:{closest:()=>btn},preventDefault:()=>{}});
assert.equal(sandbox.state.slots.open_router.model,'openai/gpt-4o-mini');
assert.equal(sandbox.state.slots.open_router.key,'test-only-key');
assert.equal(sandbox.state.slots.open_router.lastOk,false);
assert.equal(saves,1);assert.equal(syncs,1);
assert(source.includes('انتخاب GPT-4o mini'));
console.log('GPT-4o mini selector test passed');
