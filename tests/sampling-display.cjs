const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('audit-google-auto.html','utf8');
function part(a,b){const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i);return html.slice(i,j);}
const box={samplePrintLayout:()=>({orientation:'portrait',width:196,height:282,table:187,columns:[6,10,18,39,37,12,25,25],controls:40}),SHEET_CFG:{ctrl:10,company:'آزمایشی'},cpWorksheetContext:()=>({}),CP_REPORT:{},rowsForWorksheetAccount:()=>[],parseAmount:Number,fmt:String,fmtSignedBalance:String,samplePercentCell:()=>'',faNum:String,sampleDisplayDigits:String,esc:s=>String(s),ACCOUNT_LEVELS:[],cpLabNumber:String};
vm.createContext(box);
vm.runInContext(part('function sheetHTML(', '// متن‌های واردشده'),box);
const content=box.sheetHTML({keyPath:['11|موجودی نقد','1101|بانک','110101|حساب جاری']},[]);
assert(content.includes('کاربرگ نمونه‌گیری — موجودی نقد (<bdi>11</bdi>)'));
assert(content.includes('حساب جاری (<bdi>110101</bdi>)'));
assert(!content.includes('مسیر حساب :'));
vm.runInContext(part('function cpWorksheetCell(row,ctx){','function cpWorksheetDecision('),box);
box.cpWorksheetModel=()=>({names:['اول','دوم'],kind:'automatic',badge:'پیشنهاد'});
box.samplePathText=s=>s;
let cell=box.cpWorksheetCell({}, {rowIds:new Map(),wsToken:0});assert.equal((cell.match(/cp-path-end/g)||[]).length,2);
box.cpWorksheetModel=()=>({names:['اول'],kind:'automatic',badge:'پیشنهاد'});
cell=box.cpWorksheetCell({}, {rowIds:new Map(),wsToken:0});assert(!cell.includes('cp-path-end'));
assert(html.includes("p.querySelector('.sample-page-number').textContent='صفحه '+faNum(i+1)+' از '+faNum(pages.length)"));
assert(html.includes("['.cp-txt',9,4.2,9]"));
console.log('Sampling display tests passed');
