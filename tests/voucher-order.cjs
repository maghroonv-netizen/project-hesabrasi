const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('audit-google-auto.html','utf8');
function part(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>=0&&j>i);return html.slice(i,j);}
const box={};vm.createContext(box);
vm.runInContext(part('let CP_LAB_META=', 'function cpLabNumber('),box);
function row(n,d,c){return {'شماره سند':'45','تاریخ':'1404/01/01','ردیف سند':n,'بدهکار':d,'بستانکار':c};}
const rows=[row('۱',10,0),row('۲',20,0),row('۳',0,30),row('۴',40,0),row('۵',0,40)];
let ctx=box.cpLabContext(rows);
assert.equal(box.cpLabExamine(rows[0],ctx).counterpart[0],rows[2]);
assert.equal(box.cpLabExamine(rows[2],ctx).counterpart.length,2);
assert.equal(box.cpLabExamine(rows[3],ctx).counterpart[0],rows[4]);
assert.equal(box.cpLabExamine(rows[0],ctx).orderHint,true);
const shuffled=[rows[3],rows[1],rows[4],rows[0],rows[2]];ctx=box.cpLabContext(shuffled);
assert.equal(box.cpLabExamine(rows[0],ctx).counterpart[0],rows[2]);
for(const variant of ['missing','duplicate','gap','invalid']){
 const rs=rows.map(r=>({...r}));
 if(variant==='missing')delete rs[1]['ردیف سند'];
 if(variant==='duplicate')rs[1]['ردیف سند']='۱';
 if(variant==='gap')rs[1]['ردیف سند']='۱۰';
 if(variant==='invalid')rs[1]['ردیف سند']='x';
 const res=box.cpLabExamine(rs[0],box.cpLabContext(rs));
 assert.equal(res.orderHint,undefined,variant);
 assert.equal(res.counterpart.length,2,variant+' legacy fallback');
}
const compound=[row(1,10,0),row(2,20,0),row(3,0,15),row(4,0,15)];
const e=box.cpLabExamine(compound[0],box.cpLabContext(compound));
assert.equal(e.status,'compound');assert.equal(e.counterpart.length,2);
const unbalanced=[row(1,10,0),row(2,0,9)];assert.equal(box.cpLabExamine(unbalanced[0],box.cpLabContext(unbalanced)).status,'unresolved');
const expected=part('const EXPECTED = [','const drop =');assert(expected.includes('"ردیف سند"'));assert(expected.includes('new Set([\n  "ردیف سند"'));
const sheet=html.slice(html.indexOf('function sheetHTML('),html.indexOf('function sheetHTML(')+5000);
assert(!sheet.includes("r['ردیف سند']"));
console.log('Voucher order tests passed');
