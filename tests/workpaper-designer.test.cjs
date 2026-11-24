'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('workpaper-designer.html','utf8');
const KEY='hesabrasi.variance.designer.v1';
const settle=()=>new Promise(r=>setTimeout(r,20));
function setup(){const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));let blob;
 const dom=new JSDOM(html,{url:'https://designer.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.confirm=()=>true;w.Blob=global.Blob;w.URL.createObjectURL=b=>{blob=b;return 'blob:test'};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};}});
 return {w:dom.window,close:()=>dom.window.close(),errors,blob:()=>blob};}
const change=(w,id,value)=>{let x=w.document.getElementById(id);x.value=value;x.dispatchEvent(new w.Event('change',{bubbles:true}));};
const click=(w,id)=>w.document.getElementById(id).click();
const cell=(w,r,c)=>w.document.querySelector(`td[data-row="${r}"][data-column="${c}"]`);
test('editing geometry and cell style saves an exact versioned transferable JSON',async()=>{
 const t=setup();try{let {w}=t;assert.equal(t.errors.length,0,t.errors.join('\n'));assert.match(w.document.body.textContent,/نوسانات هزینه/);
 cell(w,5,2).click();change(w,'columnWidth','38.5');change(w,'rowHeight','11.5');change(w,'cellText','عنوان دلخواه');change(w,'fontSize','12.5');change(w,'textColor','#123456');change(w,'align','right');let bold=w.document.getElementById('bold');bold.checked=true;bold.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(cell(w,5,2).textContent,'عنوان دلخواه');assert.equal(cell(w,5,2).style.color,'rgb(18, 52, 86)');
 click(w,'saveFile');const saved=JSON.parse(await t.blob().text());assert.equal(saved.schema,'hesabrasi-variance-layout');assert.equal(saved.version,1);assert.equal(saved.columns[2].widthMm,38.5);assert.equal(saved.rows[5].heightMm,11.5);assert.equal(saved.cells[5][2].text,'عنوان دلخواه');assert.equal(saved.cells[5][2].style.fontSize,12.5);assert.equal(saved.cells[5][2].style.bold,true);assert.deepEqual(JSON.parse(w.localStorage.getItem(KEY)),saved);
 }finally{t.close()}
});
test('selection, merge/unmerge preserve hidden content; unsafe overlaps are rejected',()=>{
 const t=setup();try{const {w}=t;cell(w,5,0).click();click(w,'rangeBtn');cell(w,5,0).click();cell(w,5,1).click();click(w,'mergeBtn');assert.equal(cell(w,5,0).colSpan,2);assert.equal(cell(w,5,1),null);
 click(w,'unmergeBtn');assert.equal(cell(w,5,1).textContent,'۱۰۰۱');
 click(w,'rangeBtn');cell(w,4,0).click();cell(w,5,2).click();click(w,'mergeBtn');assert.match(w.document.getElementById('status').textContent,/هم‌پوشانی/);
 }finally{t.close()}
});
test('import validates input without injecting markup and preserves layout on failure',async()=>{
 const t=setup();try{const {w}=t;click(w,'saveFile');const state=JSON.parse(await t.blob().text());state.cells[5][2].text='<img src=x onerror=alert(1)>';const field=w.document.getElementById('fileInput');Object.defineProperty(field,'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify(state)}]});field.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();assert.equal(cell(w,5,2).textContent,'<img src=x onerror=alert(1)>');assert.equal(cell(w,5,2).querySelector('img'),null);
 state.cells[5][2].style.color='red;display:none';Object.defineProperty(field,'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify(state)}]});field.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();assert.match(w.document.getElementById('status').textContent,/معتبر/);assert.equal(cell(w,5,2).textContent,'<img src=x onerror=alert(1)>');assert.equal(t.errors.length,0,t.errors.join('\n'));
 }finally{t.close()}
});
test('print dimensions, page overflow, structural operations and isolated layout',()=>{
 const t=setup();try{const {w}=t;change(w,'orientation','portrait');assert.match(w.document.getElementById('printPageRule').textContent,/A4 portrait/);assert.doesNotMatch(w.document.getElementById('warn').textContent,/عرض جدول/);change(w,'columnWidth','200');assert.match(w.document.getElementById('status').textContent,/محدودهٔ امن/);click(w,'fitColumns');assert.doesNotMatch(w.document.getElementById('warn').textContent,/عرض جدول/);
 cell(w,5,2).click();change(w,'columnWidth','3');const before=w.document.querySelectorAll('#sheet tbody tr').length;click(w,'addRow');assert.equal(w.document.querySelectorAll('#sheet tbody tr').length,before+1);click(w,'removeRow');assert.equal(w.document.querySelectorAll('#sheet tbody tr').length,before);
 click(w,'addColumn');assert.equal(w.document.querySelectorAll('#sheet col').length,9);click(w,'removeColumn');assert.equal(w.document.querySelectorAll('#sheet col').length,8);
 assert.equal(t.errors.length,0,t.errors.join('\n'));assert(!html.includes('https://'));assert.match(html,/data:font\/woff2;base64/);
 }finally{t.close()}
});
test('row height is directly editable and page top/bottom stay fixed, colors remain manual',async()=>{
 const t=setup();try{const {w}=t;
 assert.equal(w.document.getElementById('marginTop').readOnly,true);assert.equal(w.document.getElementById('marginBottom').readOnly,true);
 cell(w,5,2).click();assert.equal(w.document.querySelector('[data-row-resize]').dataset.rowResize,'5');
 let handle=w.document.querySelector('[data-row-resize]');handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(w.document.getElementById('rowHeight').value,'9');
 handle=w.document.querySelector('[data-row-resize]');handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',shiftKey:true,bubbles:true}));assert.equal(w.document.getElementById('rowHeight').value,'8.9');
 change(w,'textColorHex','#12ab34');change(w,'backgroundHex','#f0e1d2');change(w,'borderColorHex','#112233');assert.equal(cell(w,5,2).style.color,'rgb(18, 171, 52)');change(w,'textColorHex','red');assert.match(w.document.getElementById('status').textContent,/کد رنگ/);
 let show=w.document.getElementById('showRowHandle');show.checked=false;show.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelector('.row-guide'),null);show.checked=true;show.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelectorAll('.row-resizer').length,1);
 click(w,'saveFile');let saved=JSON.parse(await t.blob().text());assert.equal(saved.page.margins.top,10);assert.equal(saved.page.margins.bottom,15);assert.equal(saved.rows[5].heightMm,8.9);assert.equal(saved.cells[5][2].style.background,'#f0e1d2');
 // An older custom top margin is preserved, but the bottom margin is fixed on import.
 saved.page.margins.top=21.3;saved.page.margins.bottom=19.2;const field=w.document.getElementById('fileInput');Object.defineProperty(field,'files',{configurable:true,value:[{size:200,text:async()=>JSON.stringify(saved)}]});field.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();
 assert.equal(w.document.getElementById('marginTop').value,'21.3');assert.equal(w.document.getElementById('marginBottom').value,'15');cell(w,5,2).click();change(w,'rowHeight','13.5');click(w,'saveFile');saved=JSON.parse(await t.blob().text());assert.equal(saved.page.margins.top,21.3);assert.equal(saved.page.margins.bottom,15);assert.equal(saved.rows[5].heightMm,13.5);
 }finally{t.close();}
});

test('orientation fitting preserves proportions, margins and explicit manual edits',async()=>{
 const t=setup();try{const {w}=t;cell(w,5,2).click();change(w,'columnWidth','52');click(w,'saveFile');let saved=JSON.parse(await t.blob().text());const before=saved.columns.map(c=>c.widthMm);
 change(w,'orientation','portrait');assert.match(w.document.getElementById('status').textContent,/متناسب/);click(w,'saveFile');saved=JSON.parse(await t.blob().text());const after=saved.columns.map(c=>c.widthMm);assert(after.reduce((a,b)=>a+b,0)<=178);assert(after.every(x=>x>=3));assert(Math.abs(after[2]/before[2]-after[3]/before[3])<.002);assert.equal(saved.page.margins.top,10);assert.equal(saved.page.margins.bottom,15);
 change(w,'orientation','landscape');click(w,'saveFile');saved=JSON.parse(await t.blob().text());assert.deepEqual(saved.columns.map(c=>c.widthMm),after);click(w,'fitColumns');click(w,'saveFile');saved=JSON.parse(await t.blob().text());assert(saved.columns.reduce((a,c)=>a+c.widthMm,0)<=265);
 change(w,'columnWidth','20');let handle=w.document.querySelector('[data-column-resize="2"]');const value=20;handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',shiftKey:true,bubbles:true}));assert.equal(Number(w.document.getElementById('columnWidth').value),Math.round((value+.1)*10)/10);
 change(w,'marginLeft','100');change(w,'marginRight','100');change(w,'orientation','portrait');assert.match(w.document.getElementById('status').textContent,/محدودهٔ امن|اندازه‌ها حفظ/);click(w,'saveFile');assert.ok(JSON.parse(await t.blob().text()).columns.every(c=>c.widthMm>=3));
 }finally{t.close()}
});
test('safe punch margins, dimension limits, and linked row types survive export and import',async()=>{
 const t=setup();try{const {w}=t;
 click(w,'saveFile');let data=JSON.parse(await t.blob().text());assert.equal(data.page.margins.left,20);assert.equal(data.page.margins.right,20);assert(data.columns.reduce((a,c)=>a+c.widthMm,0)<=265);
 change(w,'marginLeft','12');assert.equal(w.document.getElementById('marginLeft').value,'20');change(w,'marginRight','5');assert.equal(w.document.getElementById('marginRight').value,'20');
 cell(w,5,2).click();change(w,'rowHeight','20');click(w,'saveFile');data=JSON.parse(await t.blob().text());assert.deepEqual(data.rows.slice(5,8).map(r=>r.heightMm),[20,20,20]);assert.equal(data.rows[8].heightMm,8);
 change(w,'rowHeight','200');click(w,'saveFile');data=JSON.parse(await t.blob().text());assert(data.rows.reduce((a,r)=>a+r.heightMm,0)<=184+1e-7);assert.equal(data.rows[5].heightMm,data.rows[7].heightMm);
 change(w,'columnWidth','290');click(w,'saveFile');data=JSON.parse(await t.blob().text());assert(data.columns.reduce((a,c)=>a+c.widthMm,0)<=265+1e-7);
 data.page.margins.left=0;data.page.margins.top=0;data.page.margins.bottom=0;data.columns[2].widthMm=200;const f=w.document.getElementById('fileInput');Object.defineProperty(f,'files',{configurable:true,value:[{size:200,text:async()=>JSON.stringify(data)}]});f.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();click(w,'saveFile');data=JSON.parse(await t.blob().text());assert.equal(data.page.margins.left,20);assert.equal(data.page.margins.right,20);assert.equal(data.page.margins.top,10);assert.equal(data.page.margins.bottom,15);assert(data.columns.reduce((a,c)=>a+c.widthMm,0)<=265+1e-7);
 }finally{t.close()}
});

test('side margins stay equal on either input, orientation changes, and old imports',async()=>{
 const t=setup();try{const {w}=t;change(w,'marginLeft','28.5');assert.equal(w.document.getElementById('marginRight').value,'28.5');change(w,'marginRight','24.2');assert.equal(w.document.getElementById('marginLeft').value,'24.2');
 change(w,'orientation','portrait');click(w,'saveFile');let data=JSON.parse(await t.blob().text());assert.equal(data.page.margins.left,24.2);assert.equal(data.page.margins.right,24.2);assert(data.columns.reduce((a,c)=>a+c.widthMm,0)<=210-48.4-1+1e-7);
 data.page.margins.left=20;data.page.margins.right=35;let f=w.document.getElementById('fileInput'),asked='';w.confirm=msg=>{asked=msg;return false};Object.defineProperty(f,'files',{configurable:true,value:[{size:200,text:async()=>JSON.stringify(data)}]});f.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();assert.match(asked,/حاشیه/);assert.equal(w.document.getElementById('marginLeft').value,'24.2');w.confirm=()=>true;f.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();click(w,'saveFile');data=JSON.parse(await t.blob().text());assert.equal(data.page.margins.left,35);assert.equal(data.page.margins.right,35);assert(data.columns.reduce((a,c)=>a+c.widthMm,0)<=139+1e-7);
 }finally{t.close()}
});
test('bottom margin is frozen to 15 mm, including older files',async()=>{
 const t=setup();try{const {w}=t;assert.equal(w.document.getElementById('marginBottom').value,'15');assert.equal(w.document.getElementById('marginBottom').readOnly,true);change(w,'marginBottom','5');click(w,'saveFile');let data=JSON.parse(await t.blob().text());assert.equal(data.page.margins.bottom,15);cell(w,5,2).click();assert.equal(w.document.getElementById('marginBottom').value,'15');
 for(const previous of [5,30]){data.page.margins.bottom=previous;const input=w.document.getElementById('fileInput');let asked='';w.confirm=msg=>{asked=msg;return false};Object.defineProperty(input,'files',{configurable:true,value:[{size:200,text:async()=>JSON.stringify(data)}]});input.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();assert.match(asked,/حاشیه/);assert.equal(w.document.getElementById('marginBottom').value,'15');w.confirm=()=>true;input.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();click(w,'saveFile');data=JSON.parse(await t.blob().text());assert.equal(data.page.margins.bottom,15);}
 }finally{t.close()}
});
