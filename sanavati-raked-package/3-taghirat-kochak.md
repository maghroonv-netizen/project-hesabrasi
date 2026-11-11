# تغییرات کوچک در کدهای موجود برنامه

غیر از دو بلوک بزرگ (موتور و رابط)، فقط این ۹ جای کوچک در برنامه تغییر کرده است.
در هر مورد، خط‌های شروع‌شده با «-» حذف و خط‌های شروع‌شده با «+» اضافه شده‌اند؛ بقیهٔ خط‌ها فقط برای پیدا کردن محل‌اند.

## 1. نوار نسخه (اختیاری)

```diff
@@ -1869,9 +1869,9 @@ body.meta-stage-active .wrap{display:none!important;}
 /* ===== FLAT-LAYOUT-END ===== */
 </style>
 </head>
 <body class="meta-stage-active">
-<div id="appVersionBar" class="no-print" style="padding:12px 16px;background:#2f6f4f;color:#fff;font-family:Tahoma,sans-serif;font-size:18px">نرم‌افزار حسابرسی — نسخهٔ ۹٫۱۹</div>
+<div id="appVersionBar" class="no-print" style="padding:12px 16px;background:#2f6f4f;color:#fff;font-family:Tahoma,sans-serif;font-size:18px">نرم‌افزار حسابرسی — نسخهٔ ۹٫۱۹ + ماژول اقلام سنواتی و راکد</div>
 
 <section id="projectMeta" dir="rtl" style="max-width:940px;margin:16px auto;padding:20px;background:var(--panel,#fff);border:1px solid var(--line,#ddd);border-radius:14px;font-family:Tahoma,sans-serif">
 <p style="color:var(--muted)">نسخهٔ رسمی ۹٫۱۹ + آزمایش محلی شواهد (مرحلهٔ اول)</p><h2>اطلاعات عمومی پرونده</h2><p>در ابتدای کار وارد کنید؛ این مشخصات در سربرگ همهٔ کاربرگ‌های همین پرونده استفاده می‌شوند. تاریخ تهیه پیش‌فرض امروز است و قابل ویرایش است. اطلاعات در این صفحه نگهداری می‌شوند؛ با تازه‌سازی صفحه از بین می‌روند.</p>
 <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px">
```

## 2. شش بخش صفحه برای مراحل ماژول جدید (کنار بخش‌های a1 تا a5)

```diff
@@ -1943,8 +1943,16 @@ body.meta-stage-active .wrap{display:none!important;}
   <!-- ================= ماژول ۲ : آنالیز و رسیدگی به حساب ================= -->
   <section class="stage" data-stage="a2"><div id="anaAccounts"></div></section>
   <section class="stage" data-stage="a5"><div id="anaOutput"></div></section>
 
+  <!-- ================= ماژول ۳ : اقلام سنواتی و راکد ================= -->
+  <section class="stage" data-stage="s1"><div id="srS1"></div></section>
+  <section class="stage" data-stage="s2"><div id="srS2"></div></section>
+  <section class="stage" data-stage="s3"><div id="srS3"></div></section>
+  <section class="stage" data-stage="s4"><div id="srS4"></div></section>
+  <section class="stage" data-stage="s5"><div id="srS5"></div></section>
+  <section class="stage" data-stage="s6"><div id="srS6"></div></section>
+
 </div>
 
 
 <script>window.AUDIT_EVIDENCE_LAB=true;</script>
```

## 3. کارت ورود به ماژول در صفحهٔ بارگذاری (تابع entryUpload)

```diff
@@ -2048,8 +2056,12 @@ function entryUpload(){
         <button type="button" class="btn primary" id="homePick">انتخاب فایل</button>
         <input type="file" id="homeFile" accept=".xlsx,.xls,.csv" hidden>
       </div>
       <p class="hint">فایل فقط در همین مرورگر خوانده می‌شود و به هیچ سروری ارسال نمی‌گردد.</p>
+    </div>
+    <div class="card entry-sr-note">
+      <span>⏳ برای <b>اقلام سنواتی و راکد</b> که فایل اسناد چند سال را جداگانه می‌گیرد، لازم نیست اینجا فایلی بارگذاری کنید:</span>
+      <button type="button" class="btn" data-open="sr">ورود به ماژول اقلام سنواتی و راکد</button>
     </div>`;
 }
 
 function entryCols(){
```

## 4. کاشی ماژول در فهرست ماژول‌ها (تابع entryReady)

```diff
@@ -2075,8 +2087,13 @@ function entryReady(){
         <span class="et-ic">🔍</span>
         <span class="et-nm">آنالیز و رسیدگی به حساب</span>
         <span class="et-ds">تعیین ماهیت حساب، آنالیز گردش و تهیه‌ی کاربرگ رسیدگی</span>
       </button>
+      <button type="button" class="entry-tile" data-open="sr">
+        <span class="et-ic">⏳</span>
+        <span class="et-nm">اقلام سنواتی و راکد</span>
+        <span class="et-ds">مانده‌های سنواتی و راکد با حداقل و حداکثر، از روی اسناد چند سال (هر سال یک فایل)</span>
+      </button>
     </div>`;
 }
 
 function renderModuleHome(){
```

## 5. تابع stepReady

```diff
@@ -2123,8 +2140,9 @@ function has(el){ const e=document.getElementById(el); return !!(e && e.innerHTM
 function stepReady(n){
   n=String(n);
   if(CUR_MODULE==='home') return true;
   if(CUR_MODULE==='analysis') return analysisStepReady(n);
+  if(CUR_MODULE==='sr') return typeof srStepReady==='function' && srStepReady(n);
   if(n==='3') return has('typeControlArea');
   if(n==='4') return has('accountArea');
   if(n==='5') return WORKSHEET_ACCOUNTS.length>0;
   if(n==='6') return SHEET_OUT.length>0;
```

## 6. تابع gotoModule

```diff
@@ -2137,8 +2155,9 @@ function gotoModule(mid, step){
   CUR_MODULE=mid;
   if(step) CUR_STEP=String(step);
   else { const L=curSteps(); CUR_STEP = L[0].n; }
   if(mid==='analysis'){ anaSyncAccounts(); onAnalysisModuleEnter(); }
+  if(mid==='sr' && typeof srEnter==='function') srEnter();
   paint();
 }
 function gotoStep(n){
   n=String(n);
```

## 7. تابع gotoStep

```diff
@@ -2153,8 +2172,11 @@ function gotoStep(n){
   if(CUR_MODULE==='sample'){
     if(n==='5' && !document.querySelector('table.smp')) renderSamplingStep();
     if(n==='6' && !has('outputArea')) renderOutputStep();
     if(n==='6') checkStale();
+  }else if(CUR_MODULE==='sr'){
+    CUR_STEP=n;
+    if(typeof srEnter==='function') srEnter();
   }else{
     CUR_STEP=n;
     onAnalysisModuleEnter();
   }
```

## 8. تابع renderStepper (شماره‌گذاری مراحل)

```diff
@@ -2222,9 +2244,9 @@ function renderStepper(){
   sp.innerHTML = onHome ? '' : L.map(s=>{
     const ready=stepReady(s.n), active=s.n===CUR_STEP, idx=L.findIndex(q=>q.n===s.n);
     const here=L.findIndex(q=>q.n===CUR_STEP);
     const done = !active && ready && here>=0 && idx<here;
-    const mark = done ? '✓' : (CUR_MODULE==='analysis' ? faNum(idx+1) : (s.n.startsWith('a') ? s.n.slice(1) : faNum(s.n)));
+    const mark = done ? '✓' : ((CUR_MODULE==='analysis'||CUR_MODULE==='sr') ? faNum(idx+1) : (s.n.startsWith('a') ? s.n.slice(1) : faNum(s.n)));
     const cls  = active ? 'active' : (done ? 'done ready' : (ready ? 'ready' : ''));
     const title = active ? 'مرحله‌ی جاری' : (ready ? 'رفتن به این مرحله' : 'هنوز آماده نیست');
     return `<button type="button" class="step ${cls}" data-go="${s.n}" `
       +`${ready?'':'aria-disabled="true" '}title="${title}">`
```

## 9. دروازهٔ افتتاحیهٔ مشترک (ماژول جدید از آن عبور می‌کند)

```diff
@@ -5543,10 +5565,11 @@ if(typeof window!=='undefined'&&window.AUDIT_EVIDENCE_LAB===true){
    feedback('انتقال به مرحلهٔ افتتاحیه انجام نشد: '+(error?.message||'خطای اجرا')+'\nانتخاب ستون‌ها حفظ شده است. از همین پیام عکس بگیرید.');
   }finally{state.mappingPending=false;if(button){button.disabled=false;button.textContent=oldLabel;}}
  };
  handleFile=function(file){park();state.source=null;state.confirmed=false;state.signature='';state.lastOpeningNumbers=null;state.mappingError=false;ANA.aiBy={};return baseFile(file);};
- gotoModule=function(mid,step){if(mid!=='home'&&!ready()){openOpening();return;}return baseModule(mid,step);};
- gotoStep=function(n){if(tracked()&&(String(n)==='3'||!ready())){openOpening();return;}return baseStep(n);};
+ // ماژول «اقلام سنواتی و راکد» فایل‌ها و تأیید افتتاحیهٔ مستقل خود را دارد و از این دروازه عبور می‌کند.
+ gotoModule=function(mid,step){if(mid!=='home'&&mid!=='sr'&&!ready()){openOpening();return;}return baseModule(mid,step);};
+ gotoStep=function(n){if(CUR_MODULE!=='sr'&&tracked()&&(String(n)==='3'||!ready())){openOpening();return;}return baseStep(n);};
  goBackOne=function(){
   if(CUR_MODULE==='home'&&tracked()&&ENTRY.phase==='ready'){openOpening();return;}
   if(CUR_MODULE==='home'&&ENTRY.phase==='opening'){document.getElementById('openingBackToColumns')?.click();return;}
   return baseBack();
```
