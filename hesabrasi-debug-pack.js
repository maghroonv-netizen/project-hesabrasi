/* Hesabrasi debug pack — download nature + analysis outputs for review. No API keys. */
(function (global) {
  'use strict';
  var events = [];

  function now() { return new Date().toISOString(); }

  function log(type, data) {
    events.push({ at: now(), type: type, data: data || {} });
    if (events.length > 250) events.shift();
    paint();
  }

  function stripSecrets(value) {
    try {
      return JSON.parse(JSON.stringify(value, function (k, v) {
        if (typeof v === 'string' && /key|authorization|token|bearer/i.test(k) && v.length > 6) return '[حذف شد]';
        if (typeof v === 'string' && /^(sk-|ir-|AQ\.|nvapi-|or-)/.test(v)) return '[حذف شد]';
        if (typeof v === 'string' && v.length > 60000) return v.slice(0, 60000) + '\n…[برش شد]';
        return v;
      }));
    } catch (e) {
      return { error: 'serialize-failed', message: String(e) };
    }
  }

  function summarizeGroups(groups) {
    if (!Array.isArray(groups)) return [];
    return groups.slice(0, 400).map(function (g) {
      return {
        id: g.id,
        opening: !!g.opening,
        category: g.category || g.group || '',
        document: g.document || g.doc || '',
        description: String(g.description || g.documentDescription || g.ds || '').slice(0, 500),
        debit: g.debit,
        credit: g.credit,
        refs: Array.isArray(g.refs) ? g.refs.slice(0, 80) : undefined
      };
    });
  }

  function pack() {
    var accounts = [];
    try {
      (typeof ANA !== 'undefined' && ANA.out ? ANA.out : []).forEach(function (o, i) {
        var slot = (ANA.aiBy && ANA.aiBy[i]) || {};
        var report = o.report || {};
        var a = o.a || {};
        accounts.push({
          index: i,
          active: typeof ANA !== 'undefined' && ANA.active === i,
          account: {
            title: a.title || '',
            pathLabel: a.pathLabel || '',
            code: a.code || a.fullCode || ''
          },
          nature: {
            acceptedText: slot.nature || '',
            rejectedRaw: slot.receivedNature || '',
            analysisSlot: slot.analysis || '',
            error: slot.error || '',
            detail: slot.detail || '',
            stage: slot.stage || '',
            noEvidence: !!slot.noEvidence,
            sendMode: slot.sendMode || '',
            inputChars: slot.inputChars || 0,
            usage: slot.usage || null,
            elapsedSeconds: slot.elapsedSeconds || null,
            adaptiveCalls: slot.adaptiveCalls || 0,
            counterpartEvidence: slot.counterpartEvidence || null
          },
          analysis: {
            error: report.error || '',
            prepared: !!report.prepared,
            busy: !!report.busy,
            stage: report.stage || '',
            classificationRaw: report.classificationRaw || '',
            categories: report.categories || [],
            coverage: report.coverage || null,
            groups: summarizeGroups(report.data && report.data.groups),
            groupCount: report.data && report.data.groups ? report.data.groups.length : 0,
            invalidRows: report.data && report.data.invalidRows,
            mismatch: report.data && report.data.mismatch,
            totals: report.data && report.data.totals
          }
        });
      });
    } catch (e) {
      accounts.push({ error: String(e && e.message || e) });
    }
    return {
      format: 'hesabrasi-debug-v1',
      createdAt: now(),
      app: 'project-hesabrasi',
      version: '9.19',
      note: 'خروجی بازبینی برای پیدا کردن باگ شرح ماهیت و دسته‌بندی. کلید API داخل نیست.',
      runtime: {
        provider: typeof AD_PROVIDER !== 'undefined' ? AD_PROVIDER : '',
        model: typeof ROUTER_MODEL !== 'undefined' ? ROUTER_MODEL : '',
        sendMode: typeof NATURE_SEND_MODE !== 'undefined' ? NATURE_SEND_MODE : '',
        aiReady: typeof anaAIReady === 'function' ? !!anaAIReady() : false,
        badge: (global.HesabrasiAI && HesabrasiAI.badgeText) ? HesabrasiAI.badgeText() : ''
      },
      events: events,
      accounts: accounts
    };
  }

  function toText(p) {
    var lines = [];
    lines.push('خروجی بازبینی حسابرسی');
    lines.push('زمان: ' + p.createdAt);
    lines.push('مدل: ' + (p.runtime.model || '-') + ' | سرویس: ' + (p.runtime.provider || '-'));
    lines.push('');
    (p.accounts || []).forEach(function (acc, n) {
      lines.push('======== حساب ' + (n + 1) + (acc.active ? ' (فعال)' : '') + ' ========');
      lines.push('عنوان: ' + ((acc.account && acc.account.pathLabel) || (acc.account && acc.account.title) || '-'));
      lines.push('');
      lines.push('--- شرح ماهیت ---');
      if (acc.nature.acceptedText) {
        lines.push('وضعیت: پذیرفته شد');
        lines.push(acc.nature.acceptedText);
      } else if (acc.nature.rejectedRaw) {
        lines.push('وضعیت: قالب پذیرفته نشد');
        lines.push('خطا: ' + (acc.nature.detail || acc.nature.error || '-'));
        lines.push('متن خام مدل:');
        lines.push(acc.nature.rejectedRaw);
      } else {
        lines.push('وضعیت: خالی');
        lines.push('خطا: ' + (acc.nature.detail || acc.nature.error || '-'));
      }
      lines.push('');
      lines.push('--- آنالیز / دسته‌بندی ---');
      lines.push('آماده‌شده: ' + (acc.analysis.prepared ? 'بله' : 'خیر'));
      if (acc.analysis.error) lines.push('خطا: ' + acc.analysis.error);
      if (acc.analysis.coverage) {
        try { lines.push('پوشش: ' + JSON.stringify(acc.analysis.coverage)); } catch (e1) {}
      }
      if (acc.analysis.categories && acc.analysis.categories.length) {
        lines.push('دسته‌ها:');
        acc.analysis.categories.forEach(function (c) {
          var name = c.category || c.title || c.name || '?';
          var count = (c.rows && c.rows.length) || (c.refs && c.refs.length) || c.count || '';
          lines.push(' • ' + name + (count !== '' ? ' (' + count + ')' : ''));
        });
      }
      if (acc.analysis.groups && acc.analysis.groups.length) {
        lines.push('نمونه ردیف‌ها (' + acc.analysis.groupCount + '):');
        acc.analysis.groups.slice(0, 80).forEach(function (g) {
          lines.push(' - ' + (g.id || '') + ' | ' + (g.category || (g.opening ? 'افتتاحیه' : '')) + ' | ' + (g.description || g.document || ''));
        });
      }
      if (acc.analysis.classificationRaw) {
        lines.push('پاسخ خام دسته‌بندی:');
        lines.push(acc.analysis.classificationRaw);
      }
      lines.push('');
    });
    if (p.events && p.events.length) {
      lines.push('======== رویدادها ========');
      p.events.forEach(function (ev) {
        lines.push('[' + ev.at + '] ' + ev.type);
        if (ev.data && ev.data.error) lines.push('  خطا: ' + ev.data.error);
        if (ev.data && ev.data.raw) lines.push('  raw: ' + String(ev.data.raw).slice(0, 1500));
        if (ev.data && ev.data.text) lines.push('  text: ' + String(ev.data.text).slice(0, 800));
      });
    }
    return lines.join('\n');
  }

  function download(kind) {
    var p = stripSecrets(pack());
    var blob, name;
    if (kind === 'txt') {
      blob = new Blob([toText(p)], { type: 'text/plain;charset=utf-8' });
      name = 'hesabrasi-debug.txt';
    } else {
      blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json;charset=utf-8' });
      name = 'hesabrasi-debug.json';
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  function html() {
    var p = pack();
    var acc = (p.accounts || []).filter(function (x) { return x.active; })[0] || p.accounts[0];
    var natureState = 'هنوز خروجی نیست';
    if (acc && acc.nature.acceptedText) natureState = 'شرح ماهیت پذیرفته شد (' + acc.nature.acceptedText.length + ' نویسه)';
    else if (acc && acc.nature.rejectedRaw) natureState = 'قالب ماهیت رد شد — متن خام ذخیره شده';
    else if (acc && (acc.nature.error || acc.nature.detail)) natureState = acc.nature.detail || acc.nature.error;
    var anaState = 'آنالیز هنوز اجرا نشده';
    if (acc && acc.analysis.prepared) anaState = 'آنالیز آماده شد — ' + (acc.analysis.categories.length || 0) + ' دسته';
    else if (acc && acc.analysis.error) anaState = acc.analysis.error;
    return (
      '<section class="audit-debug-box" dir="rtl">' +
        '<div class="audit-debug-head"><b>خروجی بازبینی برای برنامه‌نویس</b>' +
        '<small>همین خروجی را دانلود کنید و بفرستید تا باگ شرح ماهیت و دسته‌بندی دیده شود.</small></div>' +
        '<p class="audit-debug-sum">' + esc(natureState) + '</p>' +
        '<p class="audit-debug-sum">' + esc(anaState) + '</p>' +
        '<div class="audit-debug-actions">' +
          '<button type="button" id="auditDebugJson">دانلود JSON بازبینی</button>' +
          '<button type="button" id="auditDebugTxt">دانلود متن بازبینی</button>' +
        '</div>' +
        '<p class="audit-debug-hint">کلید API داخل فایل نیست. هر دو فایل را بفرستید.</p>' +
      '</section>'
    );
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function paint() {
    var box = document.getElementById('auditDebugBox');
    if (!box) return;
    box.innerHTML = html();
    var j = document.getElementById('auditDebugJson');
    var x = document.getElementById('auditDebugTxt');
    if (j) j.onclick = function () { download('json'); };
    if (x) x.onclick = function () { download('txt'); };
  }

  function hook() {
    function wrap(name, okType, errType) {
      try {
        var fn = global[name];
        if (typeof fn !== 'function') {
          try { fn = eval(name); } catch (e0) { return; }
        }
        if (typeof fn !== 'function') return;
        var orig = fn;
        var wrapped = function () {
          var args = arguments;
          try {
            var out = orig.apply(this, args);
            if (okType) log(okType, { sample: String(args[0] || '').slice(0, 4000) });
            return out;
          } catch (e) {
            log(errType || (name + '_error'), {
              error: e && e.message ? e.message : String(e),
              raw: String(args[0] == null ? '' : args[0]).slice(0, 20000)
            });
            throw e;
          }
        };
        try { global[name] = wrapped; } catch (e1) {}
        try { eval(name + ' = wrapped'); } catch (e2) {}
      } catch (e) {}
    }
    wrap('adNatureText', null, 'nature_template_rejected');
    wrap('reportJSON', null, 'analysis_json_invalid');
    wrap('reportAggregate', null, 'analysis_aggregate_failed');
    wrap('adClassifyGroups', null, 'analysis_classify_failed');
  }

  var style = document.createElement('style');
  style.textContent =
    '.audit-debug-box{margin:12px 0 18px;padding:14px;border:1px dashed #2f6f4f;border-radius:12px;background:#e9f3ec;color:#1f2a24;text-align:right}' +
    '.audit-debug-head b{display:block;font-size:15px;margin-bottom:4px}' +
    '.audit-debug-head small,.audit-debug-hint,.audit-debug-sum{display:block;font-size:12px;line-height:1.7;color:#3d4a44}' +
    '.audit-debug-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}' +
    '.audit-debug-actions button{padding:8px 12px;border-radius:8px;border:1px solid #2f6f4f;background:#2f6f4f;color:#fff;font-family:Tahoma,sans-serif;cursor:pointer}';
  document.head.appendChild(style);

  global.HesabrasiDebug = { log: log, pack: pack, download: download, paint: paint, hook: hook };
  hook();
})(typeof window !== 'undefined' ? window : this);
