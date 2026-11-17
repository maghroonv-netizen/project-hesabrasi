#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','..','audit-google-auto.html'),'utf8');
const start=html.indexOf('function importedPriorFor(row,used){');
const end=html.indexOf('\nfunction workpaperSubtotalGroups(',start);
assert(start>=0&&end>start,'final workpaper helpers must exist');
const code=html.slice(start,end);
function sandbox({priorRows=[],priorWorkpaper=null,hasPriorResult=true}={}){
  const context={
    SR:{result:{id:'audit'},model:{},priorResult:hasPriorResult?{id:'prior'}:null,priorModel:{},priorWorkpaper,view:{}},
    SRE:{normText:value=>String(value??'').trim().toLowerCase()},
    srNormMatch:value=>String(value??'').trim().toLowerCase(),
  };
  const priorResult=context.SR.priorResult;
  context.workpaperRowsFor=result=>result===priorResult?priorRows:[];
  vm.createContext(context);
  vm.runInContext(code,context);
  return context;
}
{
  const old={groupKey:'same-account',subPlain:'دریافتنی',detailPlain:'مشتری',kolCode:'1',kolTitle:'دارایی',moeinCode:'10',moeinTitle:'دریافتنی',combinedFinal:{min:100n,max:100n},combinedSide:'D'};
  const context=sandbox({priorRows:[old]});
  const rows=context.finalWorkpaperRows();
  assert.equal(rows.length,1,'a nonzero prior-year account with no current-year match remains visible');
  assert.equal(rows[0].priorAmount,100n);
  assert.equal(rows[0].finalRange,null,'prior-year evidence alone is not represented as a current-year final balance');
  console.log('PASS — Raw Y−1-only balances are visible without being misrepresented as current-year final amounts');
}
{
  const context=sandbox({hasPriorResult:false,priorWorkpaper:{rows:[{sub:'دریافتنی',detail:'مشتری الف',amount:250n,groupKey:'',sourceRow:4}]}});
  const rows=context.finalWorkpaperRows();
  assert.equal(rows.length,1,'unmatched imported prior workpaper rows remain visible');
  assert.equal(rows[0].priorAmount,250n);
  assert.equal(rows[0].unmatchedPrior,true);
  assert.equal(rows[0].finalAmount,null,'an unmatched prior workpaper does not fabricate a current-year final balance');
  console.log('PASS — Unmatched prior-workpaper balances are visible as historical evidence');
}
