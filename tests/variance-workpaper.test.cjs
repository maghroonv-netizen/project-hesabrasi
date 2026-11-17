#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
const cases=[
  ['No generated or local explanation is inserted before AI',()=>{assert.doesNotMatch(html,/V\.notes\[a\.id\]\|\|vLocalExplanation/);assert.doesNotMatch(html,/function vLocalExplanation/);assert.match(html,/const desc=String\(V\.notes\[a\.id\]\|\|''\)/);}],
  ['The explanation cell is a blank editable control before AI',()=>{assert.match(html,/<textarea class="variance-note-editor" data-vnote=/);assert.match(html,/aria-label="توضیحات حساب/);}],
  ['AI-generated text can be corrected in the visible paginated preview',()=>{assert.match(html,/preview\.querySelectorAll\('textarea\[data-vnote\]'\)/);assert.match(html,/V\.notes\[id\]=note/);}],
  ['AI failure leaves descriptions blank rather than inserting a local fallback',()=>{assert.match(html,/تولید توضیح برای \$\{failures\.length\} بخش ناموفق بود و خانه‌های مربوط خالی ماند/);assert.doesNotMatch(html,/توضیح محلی جایگزین شد/);}],
  ['Printed workpaper uses readable, consistent typography and measured widths',()=>{assert.match(html,/font:8\.1pt\/1\.45 variance-digits,variance-fa,serif/);assert.match(html,/font-size:8\.7pt!important/);assert.match(html,/min-height:8mm;max-height:24mm/);}],
  ['Variance columns fit the existing landscape printable width',()=>{const m=html.match(/<table class="variance-paper-table"><colgroup>([\s\S]*?)<\/colgroup>/);assert(m);const widths=[...m[1].matchAll(/width:([\d.]+)pt/g)].map(x=>Number(x[1]));assert.equal(widths.length,8);assert.equal(widths.reduce((a,b)=>a+b,0),768.1);}],
  ['Manual edits are persisted and AI reruns clear old notes before replacing them',()=>{assert.match(html,/rows\.forEach\(a=>delete V\.notes\[a\.id\]\)/);assert.match(html,/peer\.value=note/);}],
];
let failed=0;for(const [name,fn] of cases){try{fn();console.log('PASS — '+name);}catch(e){failed++;console.error('FAIL — '+name+': '+e.message);}}
console.log(`Variance workpaper checks: ${cases.length-failed}/${cases.length} PASS; ${failed} FAIL`);if(failed)process.exitCode=1;
