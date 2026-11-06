#!/usr/bin/env python3
"""Patch the inner SPA with HesabrasiAI hub and rebuild audit-google-auto.html."""
from __future__ import annotations

import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HUB = ROOT / "hesabrasi-ai-hub.js"
OUT = ROOT / "audit-google-auto.html"
INNER_CACHE = Path("/tmp/inner.html")


def decode_inner(html: str) -> str:
    m = re.search(r"atob\('([^']+)'\)", html)
    if not m:
        if html.lstrip().lower().startswith("<!doctype html>"):
            return html
        raise SystemExit("could not find inner atob payload")
    raw = base64.b64decode(m.group(1))
    return raw.decode("utf-8")


def replace_once(src: str, old: str, new: str, label: str) -> str:
    n = src.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {n}")
    return src.replace(old, new, 1)


NEW_WIRE = r"""async function wire(job,p,s,meta,current,operation){
  if(!fresh(s,current))throw Error('مدل، کلید، ظرفیت یا داده تغییر کرده؛ درخواست بعدی ارسال نشد.');
  if(!adFits(p,job.messages,job.output))throw Error('بستهٔ واقعی در ظرفیت برنامه‌ریزی‌شده جا نشد؛ بدون برش یا درخواست اضافی متوقف شد.');
  if(operation){adCheckOperationBudget(operation,{maxCalls:1,cost:adCost(p,[job])});operation.used++;operation.spent+=adCost(p,[job])??0;}
  const entry=typeof usageStart==='function'?usageStart(job.messages,meta):null;if(entry){entry.adaptiveRate={input:p.inputPrice,output:p.outputPrice,source:p.source,at:p.retrievedAt};usageSave();}
  const attempts=(window.HesabrasiAI&&typeof HesabrasiAI.readySlots==='function'&&HesabrasiAI.readySlots().length)?HesabrasiAI.readySlots().map(slot=>HesabrasiAI.stampFrom(slot,s)):[s];
  let lastFail=null,data=null,status='network_unknown',traceRequest=null,completed=false;
  const perMs=(attempts.length>1)?Math.min(AI_TIMEOUT_MS,25000):AI_TIMEOUT_MS;
  for(let i=0;i<attempts.length;i++){
    const sx=attempts[i];
    if(window.HesabrasiAI&&sx.slotId&&HesabrasiAI.isCool(sx.slotId)&&attempts.some((a,idx)=>idx>i&&!(a.slotId&&HesabrasiAI.isCool(a.slotId)))) continue;
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),perMs);
    try{
      let payload={model:sx.model,messages:job.messages};const field=p.parameters.includes('max_completion_tokens')&&!p.parameters.includes('max_tokens')?'max_completion_tokens':'max_tokens';payload[field]=job.output;if(p.parameters.includes('temperature'))payload.temperature=.2;
      const gemini=window.HesabrasiAI?HesabrasiAI.isGemini(sx):sx.provider==='google';
      if(gemini)payload=adGooglePayload(job.messages,job.output);
      else if(window.HesabrasiAI&&HesabrasiAI.isAnthropic(sx))payload=HesabrasiAI.anthropicPayload(job.messages,job.output,sx.model);
      const requestJSON=JSON.stringify(payload);if(operation?.trace){traceRequest={index:operation.trace.requests.length+1,at:new Date().toISOString(),purpose:meta.purpose,provider:sx.provider,model:sx.model,requestJSON:requestJSON.split(sx.key).join('[کلید حذف شد]'),status:'attempted_not_delivery_proven'};operation.trace.requests.push(traceRequest);}
      const url=window.HesabrasiAI?HesabrasiAI.chatUrl(sx):(gemini?AD_GOOGLE_ROOT+'models/'+adGoogleModelId(sx.model)+':generateContent':AI_ENDPOINT);
      const headers=window.HesabrasiAI?HesabrasiAI.chatHeaders(sx):(gemini?{'Content-Type':'application/json','x-goog-api-key':sx.key}:{'Content-Type':'application/json',Authorization:'Bearer '+sx.key});
      const response=await fetch(url,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:headers,body:requestJSON,signal:ctl.signal});try{data=await response.json();}catch{data={};}
      if(gemini)data=adGoogleResponse(data);else if(window.HesabrasiAI&&HesabrasiAI.isAnthropic(sx))data=HesabrasiAI.anthropicResponse(data);
      status=response.ok?'received':'HTTP '+response.status;if(traceRequest){const content=data.choices?.[0]?.message?.content;traceRequest.responseText=typeof content==='string'?content.split(sx.key).join('[کلید حذف شد]'):'';traceRequest.finishReason=data.googleFinish||data.choices?.[0]?.finish_reason||null;}
      if(!response.ok){let message=typeof data.error?.message==='string'?data.error.message:typeof data.error==='string'?data.error:typeof data.message==='string'?data.message:'';message=String(message).split(sx.key).join('[کلید حذف شد]').replace(/ir-[A-Za-z0-9_-]+/g,'[کلید حذف شد]').slice(0,600);lastFail={ok:false,detail:'HTTP '+response.status+' — '+message+(i<attempts.length-1?'؛ سوییچ به ارائه‌دهندهٔ بعدی.':'؛ تلاش مجدد خودکار انجام نشد.'),usageId:entry?.id};if(window.HesabrasiAI&&HesabrasiAI.shouldSwitch(response.status,message)){HesabrasiAI.noteFail(sx.slotId,lastFail.detail);status='switched';continue;}completed=true;return lastFail;}
      if(data.choices?.[0]?.finish_reason==='length'){status='truncated';completed=true;return {ok:false,detail:'پاسخ ناقص به سقف خروجی رسید؛ '+(traceRequest?'درخواست '+traceRequest.index+' — ':'')+(meta.purpose==='nature-notes'?'یادداشت میانی ماهیت':meta.purpose==='nature'?'نگارش نهایی ماهیت':meta.purpose==='counterparty'?'بررسی طرف حساب':'دسته‌بندی')+'، سقف '+job.output+' توکن؛ بدون تلاش پولیِ مجدد متوقف شد.',usageId:entry?.id};}
      if(gemini&&data.googleFinish!=='STOP'){status='blocked_or_unfinished';completed=true;return {ok:false,detail:'گوگل پاسخ کامل قابل استفاده نداد: '+String(data.googleFinish).slice(0,80)+'؛ بدون تلاش مجدد.',usageId:entry?.id};}
      const text=data.choices?.[0]?.message?.content;if(typeof text!=='string'||!text.trim()){status='empty_response';lastFail={ok:false,detail:'پاسخ متنی معتبر دریافت نشد.',usageId:entry?.id};if(window.HesabrasiAI&&attempts.length>1){HesabrasiAI.noteFail(sx.slotId,'empty');continue;}completed=true;return lastFail;}
      if(!fresh(sx,current)){status='stale_response';completed=true;return {ok:false,detail:'پاسخ مربوط به تنظیمات/دادهٔ قبلی است؛ استفاده نشد.',usageId:entry?.id};}
      if(window.HesabrasiAI&&sx.slotId)HesabrasiAI.noteOk(sx.slotId);completed=true;return {ok:true,text:text.trim(),usage:data.usage||null,usageId:entry?.id};
    }catch(error){status=error.name==='AbortError'?'timeout_usage_unknown':'network_usage_unknown';lastFail={ok:false,detail:error.name==='AbortError'?'مهلت درخواست تمام شد؛ مصرف احتمالی نامشخص است.':'خطای شبکه؛ تکرار پولی خودکار انجام نشد.',usageId:entry?.id};if(window.HesabrasiAI&&sx.slotId&&i<attempts.length-1){HesabrasiAI.noteFail(sx.slotId,lastFail.detail);continue;}completed=true;return lastFail;}
    finally{clearTimeout(timer);if(traceRequest)traceRequest.status=status;if(completed&&typeof usageComplete==='function')usageComplete(entry,data,status);}
  }
  if(!completed&&typeof usageComplete==='function')usageComplete(entry,data,status);
  return lastFail||{ok:false,detail:'هیچ ارائه‌دهندهٔ آماده‌ای باقی نماند.',usageId:entry?.id};
 }
 """


def patch(inner: str, hub_js: str) -> str:
    a = inner.find("async function wire(job,p,s,meta,current,operation){")
    b = inner.find("async function run(job,p,s,purpose,current,operation){")
    if a < 0 or b < 0 or b <= a:
        raise SystemExit("wire/run anchors not found")
    inner = inner[:a] + NEW_WIRE + inner[b:]

    inner = replace_once(
        inner,
        "const fresh=(s,current)=>s.p===AD.profile&&s.key===ROUTER_KEY&&s.model===ROUTER_MODEL&&s.provider===AD_PROVIDER&&current();",
        "const fresh=(s,current)=>s.p===AD.profile&&current()&&(s.failover===true||(s.key===ROUTER_KEY&&s.model===ROUTER_MODEL&&s.provider===AD_PROVIDER));",
        "fresh",
    )
    inner = replace_once(
        inner,
        "AD.promise=(async()=>{const timer=setTimeout(()=>controller.abort(),10000);try{",
        "AD.promise=(async()=>{const timer=setTimeout(()=>controller.abort(),(window.HesabrasiAI&&HesabrasiAI.hasReady()?4000:10000));try{",
        "discover-timeout",
    )
    inner = replace_once(
        inner,
        "async function profile(){const p=await discover();if(!p)throw Error('ظرفیت خودکار مدل دریافت نشد: '+(AD.lastError||'اتصال خودکار گوگل را اجرا کنید.'));return p;}",
        "async function profile(){const p=await discover();if(p)return p;if(window.HesabrasiAI&&typeof HesabrasiAI.fallbackProfile==='function'){const fb=HesabrasiAI.fallbackProfile();if(fb){AD.profile=Object.freeze(fb);notify(describe(AD.profile));return AD.profile;}}throw Error('ظرفیت خودکار مدل دریافت نشد: '+(AD.lastError||'حداقل یک سرویس را وصل و آزمایش کنید.'));}",
        "profile",
    )
    inner = replace_once(
        inner,
        "const url=chosenProvider==='google'?AD_GOOGLE_ROOT+'models/'+adGoogleModelId(id):catalogURL;\n   const response=await fetch(url,{method:'GET',...(chosenProvider==='google'?{headers:{'x-goog-api-key':key}}:{}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});",
        "const url=(window.HesabrasiAI&&HesabrasiAI.modelsUrl)?HesabrasiAI.modelsUrl({provider:chosenProvider,key,model:id}):(chosenProvider==='google'?AD_GOOGLE_ROOT+'models/'+adGoogleModelId(id):catalogURL);\n   if(!url)throw Error('فهرست مدل این سرویس از مرورگر خوانده نمی‌شود.');\n   const extraHeaders=(window.HesabrasiAI&&HesabrasiAI.modelsHeaders)?HesabrasiAI.modelsHeaders({provider:chosenProvider,key}):(chosenProvider==='google'?{'x-goog-api-key':key}:{});\n   const response=await fetch(url,{method:'GET',headers:extraHeaders,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});",
        "discover-url",
    )
    inner = replace_once(
        inner,
        "if(key&&(/\\s/.test(key)||!key.startsWith('ir-'))) throw new Error('فقط خود کلید ایران‌روتر را وارد کنید؛ کل دستور curl یا علامت نقل‌قول را نچسبانید.');",
        "if(key&&/\\s/.test(key)) throw new Error('کلید نباید فاصله یا چند خط داشته باشد.');\n if(key&&AD_PROVIDER==='iranrouter'&&!(window.HesabrasiAI&&HesabrasiAI.hasReady())&&!key.startsWith('ir-')) throw new Error('فقط خود کلید ایران‌روتر را وارد کنید؛ کل دستور curl یا علامت نقل‌قول را نچسبانید.');",
        "readCredentials",
    )
    inner = replace_once(
        inner,
        "el('routerBadge').textContent=ROUTER_KEY?'کلید فعال':'تنظیم نشده'",
        "el('routerBadge').textContent=(window.HesabrasiAI&&HesabrasiAI.badgeText)?HesabrasiAI.badgeText():(ROUTER_KEY?'کلید فعال':'تنظیم نشده')",
        "badge",
    )
    inner = replace_once(
        inner,
        ".router-popover{position:absolute;top:calc(100% + 8px);inset-inline-end:0;width:340px;max-width:calc(100vw - 32px);max-height:72vh;",
        ".router-popover{position:absolute;top:calc(100% + 8px);inset-inline-end:0;width:min(880px,calc(100vw - 24px));max-width:calc(100vw - 16px);max-height:86vh;",
        "popover-css",
    )
    inner = replace_once(
        inner,
        "اتصال ایران‌روتر · نسخهٔ ۹٫۱۹",
        "هستهٔ هوش مصنوعی · نسخهٔ ۹٫۱۹",
        "title",
    )
    inner = replace_once(
        inner,
        "ارسال شرح‌ها و شواهد طرف حساب به ایران‌روتر و ارائه‌دهندهٔ مدل، و هزینهٔ بررسی موارد حل‌نشده پیش از نگارش را تأیید می‌کنم.",
        "ارسال شرح‌ها و شواهد طرف حساب به ارائه‌دهندهٔ هوش مصنوعی انتخاب‌شده، و هزینهٔ بررسی موارد حل‌نشده پیش از نگارش را تأیید می‌کنم.",
        "consent",
    )

    marker = "// Personal prefill only."
    idx = inner.find(marker)
    if idx < 0:
        raise SystemExit("prefill-hub: personal prefill script not found")
    start = inner.rfind("<script>", 0, idx)
    end = inner.find("</script></body>", idx)
    if start < 0 or end < 0:
        raise SystemExit("prefill-hub: script bounds not found")
    inner = inner[:start] + "<script>\n" + hub_js.strip() + "\n</script></body>" + inner[end + len("</script></body>") :]

    if marker in inner:
        raise SystemExit("prefill script still present")
    if "HesabrasiAI" not in inner:
        raise SystemExit("hub not injected")
    return inner


def wrap(inner: str) -> str:
    b64 = base64.b64encode(inner.encode("utf-8")).decode("ascii")
    return (
        "<!doctype html><html lang=\"fa\" dir=\"rtl\"><head><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        "<title>حسابرسی — هستهٔ هوش مصنوعی</title>"
        "<style>html,body{height:100%;margin:0;background:#faf9f7;font-family:Tahoma}"
        "iframe{width:100%;height:100%;border:0;display:none}p{padding:24px;line-height:2}</style>"
        "</head><body><p id=\"status\">در حال باز کردن برنامه…</p>"
        "<iframe id=\"app\" title=\"برنامه حسابرسی\"></iframe><script>(async()=>{try{"
        "const text=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob('"
        + b64
        + "')));"
        "const frame=document.getElementById('app');document.getElementById('status').style.display='none';"
        "frame.style.display='block';frame.srcdoc=text;}catch(e){"
        "document.getElementById('status').textContent='بازکردن برنامه موفق نبود؛ این فایل را در مرورگر با JavaScript فعال باز کنید.';"
        "}})();</script></body></html>\n"
    )


def main() -> None:
    if INNER_CACHE.exists():
        inner = INNER_CACHE.read_text(encoding="utf-8")
    else:
        inner = decode_inner(OUT.read_text(encoding="utf-8"))
    hub_js = HUB.read_text(encoding="utf-8")
    patched = patch(inner, hub_js)
    OUT.write_text(wrap(patched), encoding="utf-8")
    print("wrote", OUT, "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
