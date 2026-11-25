'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('audit-google-auto.html','utf8');
const engine={module:{exports:{}},console};vm.createContext(engine);
vm.runInContext(html.slice(html.indexOf('/* <<<SR-ENGINE-BEGIN>>> */'),html.indexOf('/* <<<SR-ENGINE-END>>> */')),engine);
const S=engine.module.exports;
const day=x=>S.parseDate(x).day;
const row=(doc,date,debit,credit)=>({doc:String(doc),row:String(doc),date,debit:String(debit),credit:String(credit),kol:'1',kolT:'حساب های دریافتنی',moein:'10',moeinT:'دریافتنی تجاری',taf:'500',tafT:'شخص',descDoc:'',descRow:''});
const year=(id,y,rows)=>({id,label:String(y),start:day(`${y}/01/01`),end:day(`${y}/12/${S.isLeap(y)?30:29}`),rows,keyFields:['taf'],openingDocs:['1'],closingDocs:[],hasOpening:true});
const history=year('history',1402,[row(1,'1402/01/01',100,0)]);
const prior=year('prior',1403,[row(1,'1403/01/01',100,0)]);
const audit=year('audit',1404,[row(1,'1404/01/01',100,0),row(2,'1404/02/01',0,30)]);
const next=year('next',1405,[row(1,'1405/01/01',70,0),row(2,'1405/02/01',0,20)]);
function run(withNext=false,workpaper=null){
 const files=[history,prior,audit,...(withNext?[next]:[])];
 const roles=new Map([['1|10',{role:'PERSON',confirmed:true,nature:'D'}]]);
 const SR={files:files.map(f=>({...f,periodRole:f.id==='history'?'history':f.id==='prior'?'prior':f.id==='next'?'next':'audit'})),auditId:'audit',roles,priorWorkpaper:workpaper,view:{},settings:{thresholds:[12],cutoffMethod:'months',inclusive:true}};
 SR.model=S.build({files,auditFileId:'audit'});
 const ctx={SRE:S,SR,console,e_:String,srSourceFiles:()=>files,srSettingsFor:model=>({accounts:new Set(model.accounts.keys()),roles,thresholds:[12],cutoffMethod:'months',inclusive:true})};
 vm.createContext(ctx);
 const start=html.indexOf('function workpaperRowsFor('),end=html.indexOf('\nfunction workpaperSubtotalGroups(',start);
 vm.runInContext(html.slice(start,end),ctx);
 const a=html.indexOf('function runAnalysis(){'),b=html.indexOf('\n/* ------------------------------------------------------ مرحلهٔ ۶:',a);
 vm.runInContext(html.slice(a,b),ctx);ctx.runAnalysis();return ctx;
}
{
 const ctx=run();const rows=ctx.finalWorkpaperRows();assert.equal(rows.length,1);
 assert.equal(ctx.SR.priorResult.audit.id,'prior');assert.ok(ctx.SR.priorResult.next);
 assert.equal(rows[0].priorAmount,70n,'1403 uses 1404 to follow up old 1403 balance');
 assert.equal(rows[0].auditAmount,70n);assert.equal(rows[0].finalAmount,null,'no 1405 is not a confirmed zero');
 assert.equal(rows[0].followUp,null);
}
{
 const ctx=run(true,{rows:[{groupKey:'P|500',amount:70n,sub:'',detail:''}]});
 const rows=ctx.finalWorkpaperRows();assert.equal(rows[0].priorAmount,70n);assert.equal(rows[0].finalAmount,50n);
 assert.equal(ctx.SR.priorComparison.matched,1);assert.equal(ctx.SR.priorComparison.different,0);
}
{
 const ctx=run();ctx.SR.priorResult=null;ctx.SR.priorWorkpaper=null;
 const rows=ctx.finalWorkpaperRows();assert.equal(rows.length,1);assert.equal(rows[0].priorAmount,null);assert.equal(rows[0].finalAmount,null);
}
console.log('PASS — prior raw year uses current-year follow-up independently, and unknown follow-up does not hide current items');
