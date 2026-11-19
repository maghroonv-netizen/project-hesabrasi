#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
const cases=[
  ['No generated or local explanation is inserted before AI',()=>{assert.doesNotMatch(html,/V\.notes\[a\.id\]\|\|vLocalExplanation/);assert.doesNotMatch(html,/function vLocalExplanation/);assert.match(html,/const desc=String\(V\.notes\[a\.id\]\|\|''\)/);}],
  ['The explanation cell is a blank editable control before AI',()=>{assert.match(html,/<textarea class="variance-note-editor" data-vnote=/);assert.match(html,/aria-label="توضیحات حساب/);}],
  ['AI-generated text can be corrected in the visible paginated preview',()=>{assert.match(html,/preview\.querySelectorAll\('textarea\[data-vnote\]'\)/);assert.match(html,/V\.notes\[id\]=note/);}],
  ['AI failure leaves descriptions blank rather than inserting a local fallback',()=>{assert.match(html,/تولید توضیح برای \$\{failures\.length\} بخش ناموفق بود و خانه‌های مربوط خالی ماند/);assert.doesNotMatch(html,/توضیح محلی جایگزین شد/);}],
  ['Printed workpaper uses readable, consistent typography and measured widths',()=>{assert.match(html,/font:8\.5pt\/1\.3 variance-digits,variance-fa,serif/);assert.match(html,/font-size:8\.7pt!important/);assert.match(html,/font-size:8\.5pt!important/);assert.match(html,/padding:1\.8pt 4\.2pt!important;font-size:8\.5pt!important/);assert.match(html,/min-height:6mm;max-height:20mm/);assert.match(html,/variance-page-full \.variance-paper-table\{height:auto!important;flex:0 0 auto!important\}/);}],
  ['Description column is optional and is omitted from rows and headings when disabled',()=>{assert.match(html,/data-vdesc/);assert.match(html,/colCount=hasDesc\?8:7/);assert(html.includes("V.includeDescriptions?'<td></td>':''"));assert(html.includes("hasDesc?'<th>توضیحات</th>':''"));}],
  ['Portrait and landscape print layouts use matching paper dimensions and responsive columns',()=>{assert.match(html,/data-vorientation/);assert.match(html,/orientation==='portrait'\?841\.89:595\.28/);assert.match(html,/orientation==='portrait'\?595\.28:841\.89/);assert.match(html,/variance-print-page\[data-orientation="portrait"\]/);assert.match(html,/size:A4 \$\{orientation\}/);assert.match(html,/vWorkpaperWidths\(orientation,hasDesc\)/);assert.match(html,/variance-paper-table,\.variance-summary-table\{width:100%!important/);}],
  ['Manual edits are persisted and AI reruns clear old notes before replacing them',()=>{assert.match(html,/rows\.forEach\(a=>delete V\.notes\[a\.id\]\)/);assert.match(html,/peer\.value=note/);}],
];
let failed=0;for(const [name,fn] of cases){try{fn();console.log('PASS — '+name);}catch(e){failed++;console.error('FAIL — '+name+': '+e.message);}}
console.log(`Variance workpaper checks: ${cases.length-failed}/${cases.length} PASS; ${failed} FAIL`);if(failed)process.exitCode=1;
