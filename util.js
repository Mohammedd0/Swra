/* Shared helpers: formatting, dates, escaping */
window.Pages = window.Pages || {};
(function () {
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const MONTHS = ['کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەممووز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'];
  const MONTHS_SHORT = ['ک.دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەممووز', 'ئاب', 'ئەیلوول', 'ت.یەکەم', 'ت.دووەم', 'ک.یەکەم'];
  const DAYS = ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە'];

  const U = {
    MONTHS, MONTHS_SHORT, DAYS,
    digits: 'ar',
    esc(v) {
      if (v === null || v === undefined) return '';
      return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    d(s) {
      s = String(s);
      return U.digits === 'ar' ? s.replace(/[0-9]/g, (x) => AR[x]) : s;
    },
    toLatinDigits(s) {
      return String(s || '').replace(/[٠-٩]/g, (c) => AR.indexOf(c)).replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
    },
    num(n, opts) {
      if (n === null || n === undefined || isNaN(n)) n = 0;
      return U.d(Number(n).toLocaleString('en-US', opts || { maximumFractionDigits: 0 }));
    },
    money(n) { return U.num(Math.round(n || 0)) + ' د.ع'; },
    moneyShort(n) {
      n = Number(n) || 0;
      const a = Math.abs(n);
      if (a >= 1e9) return U.d((n / 1e9).toFixed(2).replace(/\.?0+$/, '')) + 'ب';
      if (a >= 1e6) return U.d((n / 1e6).toFixed(1).replace(/\.0$/, '')) + 'م';
      if (a >= 1e3) return U.d(Math.round(n / 1e3)) + 'ه';
      return U.d(Math.round(n));
    },
    pct(n, dec) { return U.d((Number(n) || 0).toFixed(dec || 0)) + '٪'; },
    pad(n) { return String(n).padStart(2, '0'); },

    /* dates as YYYY-MM-DD strings in local time */
    ymd(dt) { return dt.getFullYear() + '-' + U.pad(dt.getMonth() + 1) + '-' + U.pad(dt.getDate()); },
    today() { return U.ymd(new Date()); },
    parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); },
    addDays(s, n) { const d = U.parse(s); d.setDate(d.getDate() + n); return U.ymd(d); },
    diffDays(a, b) { return Math.round((U.parse(a) - U.parse(b)) / 864e5); },
    dow(s) { return U.parse(s).getDay(); },
    monthKey(s) { return s.slice(0, 7); },
    startOfWeek(s) { const w = U.dow(s); const back = (w + 1) % 7; return U.addDays(s, -back); },
    startOfMonth(s) { return s.slice(0, 8) + '01'; },
    endOfMonth(s) { const d = U.parse(U.startOfMonth(s)); d.setMonth(d.getMonth() + 1); d.setDate(0); return U.ymd(d); },
    addMonths(s, n) { const d = U.parse(U.startOfMonth(s)); d.setMonth(d.getMonth() + n); return U.ymd(d); },
    fmtDate(s, withDay) {
      if (!s) return '—';
      const d = U.parse(s);
      const base = U.d(d.getDate()) + 'ی ' + MONTHS[d.getMonth()] + ' ' + U.d(d.getFullYear());
      return withDay ? DAYS[d.getDay()] + '، ' + base : base;
    },
    fmtDateShort(s) {
      if (!s) return '—';
      const d = U.parse(s);
      return U.d(d.getDate()) + ' ' + MONTHS_SHORT[d.getMonth()];
    },
    fmtMonth(key) { const [y, m] = key.split('-').map(Number); return MONTHS[m - 1] + ' ' + U.d(y); },
    relDay(s) {
      const t = U.today();
      const n = U.diffDays(s, t);
      if (n === 0) return 'ئەمڕۆ';
      if (n === -1) return 'دوێنێ';
      if (n === 1) return 'سبەی';
      return U.fmtDateShort(s);
    },
    toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
    fromMin(m) { return U.pad(Math.floor(m / 60)) + ':' + U.pad(m % 60); },
    fmtTime(t) {
      if (!t) return '';
      const [h, m] = t.split(':').map(Number);
      const h12 = h % 12 || 12;
      return U.d(h12 + ':' + U.pad(m));
    },
    period(t) { const h = Number(t.split(':')[0]); return h < 12 ? 'بەیانی' : h < 15 ? 'نیوەڕۆ' : h < 18 ? 'دوانیوەڕۆ' : 'ئێوارە'; },
    nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); },
    stamp() { return new Date().toISOString(); },
    fmtStamp(iso) {
      const d = new Date(iso);
      const day = U.relDay(U.ymd(d));
      return day + ' ' + U.fmtTime(U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()));
    },
    age(dob) {
      if (!dob) return null;
      const b = U.parse(dob), n = new Date();
      let a = n.getFullYear() - b.getFullYear();
      if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
      return a;
    },

    initials(name) {
      const clean = String(name || '').replace(/^(د|س)\.\s*/, '').replace(/^(د|س)\.\s*/, '').trim();
      const parts = clean.split(/\s+/).filter(Boolean);
      if (!parts.length) return '؟';
      return (parts[0][0] || '') + (parts[1] ? parts[1][0] : '');
    },
    uid(prefix) { return (prefix || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    debounce(fn, ms) { let t; return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(() => fn.apply(s, a), ms); }; },
    sum(arr, f) { return arr.reduce((s, x) => s + (f ? f(x) : x), 0); },
    groupBy(arr, f) { const m = {}; arr.forEach((x) => { const k = f(x); (m[k] = m[k] || []).push(x); }); return m; },
    by(f, dir) { return (a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * (dir || 1); }; },
    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
    normPhone(p) { return U.toLatinDigits(p).replace(/[^0-9+]/g, ''); },
    fmtPhone(p) {
      const n = U.normPhone(p);
      if (/^07\d{9}$/.test(n)) return '\u2066' + n.slice(0, 4) + ' ' + n.slice(4, 7) + ' ' + n.slice(7) + '\u2069';
      return '\u2066' + U.toLatinDigits(p || '') + '\u2069';
    },
    waLink(phone, text) {
      let n = U.normPhone(phone);
      if (n.startsWith('0')) n = '964' + n.slice(1);
      n = n.replace(/^\+/, '');
      return 'https://wa.me/' + n + '?text=' + encodeURIComponent(text || '');
    },
    search(hay, q) {
      if (!q) return true;
      const norm = (s) => U.toLatinDigits(String(s || '')).toLowerCase().replace(/[ىي]/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ');
      return norm(hay).includes(norm(q).trim());
    },
    download(name, content, type) {
      const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    csv(rows) {
      const q = (v) => { const s = String(v === undefined || v === null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      return '﻿' + rows.map((r) => r.map(q).join(',')).join('\n');
    },
    rng(seed) {
      let a = seed >>> 0;
      const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
      r.pick = (arr) => arr[Math.floor(r() * arr.length)];
      r.weighted = (pairs) => { const tot = pairs.reduce((s, p) => s + p[1], 0); let x = r() * tot; for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; } return pairs[pairs.length - 1][0]; };
      r.chance = (p) => r() < p;
      return r;
    }
  };
  window.U = U;
})();
