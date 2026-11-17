const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'audit-google-auto.html'), 'utf8');
const start = html.indexOf('var HesabrasiCostVariance = (function(){');
const end = html.indexOf('/* <<<COST-VARIANCE-ENGINE-END>>> */', start);
assert(start >= 0 && end > start, 'cost-variance engine markers should be present');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(html.slice(start, end), sandbox, { filename: 'cost-variance-engine.js' });
const engine = sandbox.module.exports;

const report = engine.compute({
  company_name: '', subject: '', fiscal_year_end: '', prepared_date: '',
  preparer: '', reviewer: '', year_current: '', year_previous: '',
  kol_accounts: [{
    kol_code: '۷۱۰', kol_title: 'هزینهٔ نمونه', moin_items: [
      { moin_code: '۷۱۰۰۱', title: 'افزایش', amount_current: '۱۱۰٬۰۰۰', amount_previous: '۱۰۰٬۰۰۰', explanation: '  توضیح  \n پایان ' },
      { moin_code: '۷۱۰۰۲', title: 'کاهش', amount_current: '۵۰٬۰۰۰', amount_previous: '۱۰۰٬۰۰۰', explanation: '' },
      { moin_code: '۷۱۰۰۳', title: 'بدون سابقه', amount_current: '۰', amount_previous: '۰', explanation: '' }
    ]
  }]
});

assert.equal(report.groups[0].items[0].change, 10_000n, 'change is current minus prior year');
assert.equal(report.groups[0].items[0].percent.tenths, 100n, 'row percent is rounded to one decimal');
assert.equal(engine.formatPercent(report.groups[0].items[0].percent), '۱۰٫۰٪');
assert.equal(engine.formatPercent(report.groups[0].items[1].percent), '(۵۰٫۰٪)', 'negative percentages use parentheses');
assert.equal(engine.formatPercent(report.groups[0].items[2].percent), '—', 'zero prior-year amount has no percentage');
assert.equal(report.groups[0].totals.current, 160_000n);
assert.equal(report.groups[0].totals.previous, 200_000n);
assert.equal(engine.formatPercent(report.groups[0].totals.percent), '(۲۰٫۰٪)', 'summary percent is based on group totals, not a sum of row percentages');
assert.equal(report.groups[0].items[0].explanation, '  توضیح  \n پایان ', 'explanation whitespace is preserved');
assert.equal(engine.formatAmount(-1234567n), '(۱٬۲۳۴٬۵۶۷)');
assert.equal(report.meta.prepared_date, '');
assert.equal(engine.formatDate('2025-10-09'), '۲۰۲۵/۱۰/۰۹');

const moduleSource = html.slice(html.indexOf('/* <<<COST-VARIANCE-ENGINE-BEGIN>>>'), html.indexOf('/* <<<COST-VARIANCE-UI-END>>>'));
assert.doesNotMatch(moduleSource, /آستانه|حد نوسان|بیش از حد|threshold/i, 'the variance module must not add threshold settings or rules');
assert.match(moduleSource, /font-family:"Hesabrasi DejaVu"/);
assert.match(moduleSource, /data:font\/woff2;base64,/);
assert.match(moduleSource, /DejaVu changes are in public domain/);
assert.doesNotMatch(moduleSource, /assets\/fonts\//, 'the print font should remain bundled with the single-file app');
const embeddedSample = html.slice(html.indexOf('const SAMPLE={'), html.indexOf('\n  };', html.indexOf('const SAMPLE={')));
assert.match(embeddedSample, /company_name:'',subject:'',fiscal_year_end:''/);
assert.match(embeddedSample, /prepared_date:'',preparer:'',reviewer:'',year_current:'',year_previous:''/);

const demo = JSON.parse(fs.readFileSync(path.join(root, 'examples/cost-variance.sample.json'), 'utf8'));
for (const key of ['company_name', 'subject', 'fiscal_year_end', 'prepared_date', 'preparer', 'reviewer', 'year_current', 'year_previous']) {
  assert.equal(demo[key], '', `the demo must not fabricate ${key}`);
}

console.log('Cost-variance engine tests passed.');
