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
 const t=setup();try{const {w}=t;change(w,'orientation','portrait');assert.match(w.document.getElementById('printPageRule').textContent,/A4 portrait/);assert.match(w.document.getElementById('warn').textContent,/عرض جدول/);
 const before=w.document.querySelectorAll('#sheet tbody tr').length;click(w,'addRow');assert.equal(w.document.querySelectorAll('#sheet tbody tr').length,before+1);click(w,'removeRow');assert.equal(w.document.querySelectorAll('#sheet tbody tr').length,before);
 click(w,'addColumn');assert.equal(w.document.querySelectorAll('#sheet col').length,9);click(w,'removeColumn');assert.equal(w.document.querySelectorAll('#sheet col').length,8);
 assert.equal(t.errors.length,0,t.errors.join('\n'));assert(!html.includes('https://'));assert.match(html,/data:font\/woff2;base64/);
 }finally{t.close()}
});
test('manual margins, exact colors and keyboard guides persist in the exported design',async()=>{
 const t=setup();try{const {w}=t;
 change(w,'marginTop','52.4');change(w,'marginRight','18.7');
 assert.equal(w.document.getElementById('sheet').style.paddingTop,'52.4mm');
 assert.equal(w.document.querySelector('[data-margin="right"]').getAttribute('aria-valuenow'),'18.7');
 const handle=w.document.querySelector('[data-margin="right"]');handle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
 assert.equal(w.document.getElementById('marginRight').value,'19.7');
 cell(w,5,2).click();change(w,'textColorHex','#12ab34');change(w,'backgroundHex','#f0e1d2');change(w,'borderColorHex','#112233');
 assert.equal(cell(w,5,2).style.color,'rgb(18, 171, 52)');change(w,'textColorHex','red');assert.match(w.document.getElementById('status').textContent,/کد رنگ/);assert.equal(w.document.getElementById('textColorHex').value,'#12ab34');
 let show=w.document.getElementById('showMargins');show.checked=false;show.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelector('.margin-guides'),null);show.checked=true;show.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelectorAll('.margin-handle').length,4);
 click(w,'saveFile');const saved=JSON.parse(await t.blob().text());assert.equal(saved.page.margins.top,52.4);assert.equal(saved.page.margins.right,19.7);assert.equal(saved.cells[5][2].style.background,'#f0e1d2');assert.equal(saved.cells[5][2].style.borderColor,'#112233');
 }finally{t.close();}
});
