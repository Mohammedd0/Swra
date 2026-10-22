/* Reports: period analytics, doctor comparison, services, sources, busiest hours */
(function () {
  const esc = U.esc;
  function range(p) {
    const T = U.today();
    if (p.period === 'last') { const s = U.addMonths(T, -1); return [s, U.endOfMonth(s), _t('مانگی پێشوو')]; }
    if (p.period === '3m') return [U.addMonths(T, -2), T, _t('٣ مانگی ڕابردوو')];
    if (p.period === 'year') return [T.slice(0, 4) + '-01-01', T, _t('ساڵی ') + U.d(T.slice(0, 4))];
    if (p.period === 'custom' && p.from && p.to) return [p.from, p.to, U.fmtDateShort(p.from) + ' – ' + U.fmtDateShort(p.to)];
    return [U.startOfMonth(T), T, _t('ئەم مانگە')];
  }
  function calc(from, to) {
    const ids = Store.scopeDoctorIds();
    const ap = Store.appts({ from, to, doctorIds: ids });
    const valid = ap.filter((a) => a.status !== 'cancelled');
    const done = ap.filter((a) => a.status === 'completed');
    const invs = Store.invoicesIn(from, to, ids);
    const newPts = Store.db.patients.filter((p) => p.createdAt >= from && p.createdAt <= to && (Store.can('view_all') || ids.includes(p.doctorId)));
    return { ids, ap, valid, done, invs, newPts, billed: U.sum(invs, (i) => i.total), collected: Store.collected(from, to, ids), noShow: valid.length ? valid.filter((a) => a.status === 'no_show').length / valid.length * 100 : 0 };
  }

  Pages.reports = {
    title: _t('ڕاپۆرتەکان'),
    render(r) {
      const p = r.params;
      const [from, to, label] = range(p);
      const c = calc(from, to);
      const money = Store.can('view_finance') || Store.me.role === 'doctor';
      const docs = Store.doctors(true).filter((d) => c.ids.includes(d.id));
      const days = U.diffDays(to, from) + 1;
      const prevTo = U.addDays(from, -1), prevFrom = U.addDays(prevTo, -(days - 1));
      const prev = calc(prevFrom, prevTo);
      const dl = (a, b) => (b ? '<span class="' + (a >= b ? 'up' : 'down') + '">' + (a >= b ? '▲ ' : '▼ ') + U.pct(Math.abs((a - b) / b * 100)) + _t('</span> بەراورد بە ماوەی پێشوو') : '');
      let html = _t('<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">ڕاپۆرتەکان') + (Store.can('view_all') ? '' : ' · ' + esc(Store.scopeLabel())) + '</span><h1 class="page-title">' + esc(label) + '</h1><span class="page-sub">' + U.fmtDate(from) + ' – ' + U.fmtDate(to) + '</span></div><div class="row wrap"><div class="seg">' + [['month', _t('ئەم مانگە')], ['last', _t('مانگی پێشوو')], ['3m', _t('٣ مانگ')], ['year', _t('ساڵ')], ['custom', _t('دیاریکراو')]].map((x) => '<button class="' + ((p.period || 'month') === x[0] ? 'on' : '') + '" data-period="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' + (Store.can('export_data') ? '<button class="btn" data-export>' + I('download') + 'Excel</button>' : '') + '<button class="btn" data-print>' + I('printer') + _t('چاپ</button></div></div>');
      if (p.period === 'custom') html += _t('<div class="card row wrap" style="padding:14px 18px"><label class="row small">لە <input class="input" type="date" data-cf="from" value="') + esc(p.from || from) + _t('" style="width:170px"></label><label class="row small">بۆ <input class="input" type="date" data-cf="to" value="') + esc(p.to || to) + '" style="width:170px"></label></div>';
      html += '<div class="grid ' + (money ? 'g-5' : 'g-4') + '">' +
        (money ? UI.kpi(_t('داهات (پسوولەکراو)'), U.moneyShort(c.billed) + _t(' <small>د.ع</small>'), dl(c.billed, prev.billed), 'wallet') + UI.kpi(_t('وەرگیراو'), U.moneyShort(c.collected) + _t(' <small>د.ع</small>'), _t('ڕێژەی کۆکردنەوە ') + U.pct(c.billed ? c.collected / c.billed * 100 : 0), 'check') : '') +
        UI.kpi(_t('چارەسەری تەواوبوو'), U.num(c.done.length), dl(c.done.length, prev.done.length), 'tooth') +
        UI.kpi(_t('نەخۆشی نوێ'), U.num(c.newPts.length), dl(c.newPts.length, prev.newPts.length), 'users') +
        UI.kpi(_t('ڕێژەی نەهاتن'), U.pct(c.noShow, 1), _t('ماوەی پێشوو ') + U.pct(prev.noShow, 1), 'alert') +
        (!money ? UI.kpi(_t('کۆی نۆرە'), U.num(c.valid.length), '', 'calendar') : '') + '</div>';
      html += '<section class="card"><div class="card-head"><span class="card-title">' + I('trend') + (money ? _t('داهات و وەرگیراو') : _t('چارەسەری تەواوبوو')) + (days > 62 ? _t(' — مانگانە') : _t(' — ڕۆژانە')) + '</span></div><div class="chart-box lg"><canvas id="ch-trend"></canvas></div></section>';
      if (docs.length) {
        html += '<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">' + I('stethoscope') + _t('بەراوردی دکتۆرەکان</span></div><div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>دکتۆر</th><th class="num">نۆرە</th><th class="num">تەواوبوو</th><th class="num">نەخۆش</th><th class="num">نەهاتن</th>') + (money ? _t('<th class="num">داهات</th><th class="num">وەرگیراو</th><th class="num">تێکڕای سەردان</th><th class="num">پشکی دکتۆر</th>') : '') + '</tr></thead><tbody>' + docs.map((d) => {
          const a = c.ap.filter((x) => x.doctorId === d.id), v = a.filter((x) => x.status !== 'cancelled'), dn = a.filter((x) => x.status === 'completed');
          const b = Store.billed(from, to, [d.id]);
          return '<tr><td>' + UI.who(d.name, esc(d.specialty.split('(')[0]), d.color, 'sm') + '</td><td class="num">' + U.num(v.length) + '</td><td class="num">' + U.num(dn.length) + '</td><td class="num">' + U.num(new Set(dn.map((x) => x.patientId)).size) + '</td><td class="num">' + U.pct(v.length ? v.filter((x) => x.status === 'no_show').length / v.length * 100 : 0, 1) + '</td>' + (money ? '<td class="num"><b>' + U.money(b) + '</b></td><td class="num">' + U.money(Store.collected(from, to, [d.id])) + '</td><td class="num">' + U.money(dn.length ? b / dn.length : 0) + '</td><td class="num">' + U.money(b * (d.share || 0) / 100) + '</td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div></section>';
      }
      const bySvc = U.groupBy(c.done, (a) => a.serviceId);
      const svcRows = Object.keys(bySvc).map((k) => ({ k, n: bySvc[k].length, rev: U.sum(c.invs.filter((i) => i.items.some((x) => x.serviceId === k)), (i) => U.sum(i.items.filter((x) => x.serviceId === k), (x) => x.price * (x.qty || 1))) })).sort((a, b) => (money ? b.rev - a.rev : b.n - a.n)).slice(0, 10);
      const maxS = Math.max(1, ...svcRows.map((x) => (money ? x.rev : x.n)));
      html += '<div class="split"><section class="card"><div class="card-head"><span class="card-title">' + I('tooth') + _t('زۆرترین چارەسەر</span></div><div class="stack" style="gap:12px">') + (svcRows.length ? svcRows.map((x) => UI.progRow(Store.serviceName(x.k), U.num(x.n) + _t(' جار') + (money ? ' · ' + U.moneyShort(x.rev) : ''), (money ? x.rev : x.n) / maxS * 100)).join('') : UI.empty(_t('هیچ داتایەک نییە'), 'tooth')) + '</div></section>';
      const bySrc = U.groupBy(c.newPts, (x) => x.source || _t('نەزانراو'));
      html += '<section class="card"><div class="card-head"><span class="card-title">' + I('globe') + _t('نەخۆشی نوێ لە کوێوە هات؟</span></div><div class="chart-box sm"><canvas id="ch-src"></canvas></div><div class="stack" style="gap:8px;margin-top:12px">') + Object.entries(bySrc).sort((a, b) => b[1].length - a[1].length).map(([k, l]) => '<div class="row between small"><span>' + esc(k) + '</span><b>' + U.num(l.length) + ' · ' + U.pct(l.length / Math.max(1, c.newPts.length) * 100) + '</b></div>').join('') + '</div></section></div>';
      const order = [6, 0, 1, 2, 3, 4];
      const hours = [];
      for (let h = U.toMin(Store.db.settings.open) / 60; h < U.toMin(Store.db.settings.close) / 60; h++) hours.push(h);
      const grid = {};
      c.valid.forEach((a) => { const k = U.dow(a.date) + '-' + Math.floor(U.toMin(a.start) / 60); grid[k] = (grid[k] || 0) + 1; });
      const mx = Math.max(1, ...Object.values(grid));
      html += '<section class="card"><div class="card-head"><span class="card-title">' + I('clock') + _t('قەرەباڵغترین کاتەکان</span><span class="card-sub">ژمارەی نۆرە بەپێی ڕۆژ و کاتژمێر</span></div><div class="table-wrap"><table class="t" style="min-width:640px"><thead><tr><th></th>') + hours.map((h) => '<th style="text-align:center">' + U.fmtTime(U.pad(h) + ':00') + '</th>').join('') + '</tr></thead><tbody>' + order.map((w) => '<tr><td class="nowrap"><b>' + U.DAYS[w] + '</b></td>' + hours.map((h) => { const n = grid[w + '-' + h] || 0; const a = n / mx; return '<td style="text-align:center;background:rgba(103,205,171,' + (0.08 + a * 0.85).toFixed(2) + ');color:' + (a > 0.6 ? '#0B2A22' : 'inherit') + ';font-weight:' + (a > 0.6 ? 700 : 400) + '">' + U.num(n) + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div></section>';
      const visitedP = new Set(c.done.map((a) => a.patientId));
      const returning = Array.from(visitedP).filter((pid) => Store.appts({ patientId: pid, allScopes: true }).some((a) => a.status === 'completed' && a.date < from)).length;
      html += '<div class="grid g-3">' + UI.kpi(_t('نەخۆشی جیاوازی سەردانکەر'), U.num(visitedP.size), '', 'users') + UI.kpi(_t('نەخۆشی گەڕاوە'), U.num(returning), U.pct(visitedP.size ? returning / visitedP.size * 100 : 0) + _t(' لە سەردانکەران'), 'refresh') + (money ? UI.kpi(_t('تێکڕای پسوولە'), U.money(c.invs.length ? c.billed / c.invs.length : 0), U.num(c.invs.length) + _t(' پسوولە'), 'receipt') : UI.kpi(_t('هەڵوەشاندنەوە'), U.num(c.ap.filter((a) => a.status === 'cancelled').length), '', 'x')) + '</div>';
      return html;
    },
    mount(root, r) {
      const p = r.params;
      const [from, to, label] = range(p);
      const c = calc(from, to);
      const money = Store.can('view_finance') || Store.me.role === 'doctor';
      root.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => App.setParams({ period: b.dataset.period === 'month' ? null : b.dataset.period, from: null, to: null })));
      root.querySelectorAll('[data-cf]').forEach((el) => el.addEventListener('change', () => { const f = root.querySelector('[data-cf=from]').value, t = root.querySelector('[data-cf=to]').value; if (f && t && f <= t) App.setParams({ from: f, to: t }); }));
      const days = U.diffDays(to, from) + 1;
      const tr = root.querySelector('#ch-trend');
      if (tr) {
        const labels = [], b = [], col = [];
        if (days > 62) {
          for (let m = U.startOfMonth(from); m <= to; m = U.addMonths(m, 1)) {
            const e = U.endOfMonth(m) > to ? to : U.endOfMonth(m);
            labels.push(U.MONTHS_SHORT[Number(m.slice(5, 7)) - 1]);
            b.push(money ? Store.billed(m, e, c.ids) : c.done.filter((a) => a.date >= m && a.date <= e).length);
            col.push(money ? Store.collected(m, e, c.ids) : 0);
          }
        } else {
          for (let d = from; d <= to; d = U.addDays(d, 1)) {
            labels.push(U.fmtDateShort(d));
            b.push(money ? Store.billed(d, d, c.ids) : c.done.filter((a) => a.date === d).length);
            col.push(money ? Store.collected(d, d, c.ids) : 0);
          }
        }
        if (money) Charts.line(tr, labels, [{ label: _t('پسوولەکراو'), data: b }, { label: _t('وەرگیراو'), data: col, color: '#67CDAB', fill: false }], { money: true, legend: true });
        else Charts.bar(tr, labels, [{ label: _t('چارەسەر'), data: b, color: '#67CDAB' }]);
      }
      const cs = root.querySelector('#ch-src');
      if (cs) { const by = U.groupBy(c.newPts, (x) => x.source || _t('نەزانراو')); const ks = Object.keys(by).sort((a, b) => by[b].length - by[a].length); Charts.doughnut(cs, ks, ks.map((k) => by[k].length)); }
      const ex = root.querySelector('[data-export]');
      if (ex) ex.addEventListener('click', () => {
        const rows = [[_t('دکتۆر'), _t('نۆرە'), _t('تەواوبوو'), _t('نەهاتن'), _t('داهات'), _t('وەرگیراو'), _t('پشکی دکتۆر')]];
        Store.doctors(true).filter((d) => c.ids.includes(d.id)).forEach((d) => { const a = c.ap.filter((x) => x.doctorId === d.id); const b = Store.billed(from, to, [d.id]); rows.push([d.name, a.filter((x) => x.status !== 'cancelled').length, a.filter((x) => x.status === 'completed').length, a.filter((x) => x.status === 'no_show').length, b, Store.collected(from, to, [d.id]), Math.round(b * (d.share || 0) / 100)]); });
        U.download('bite-report-' + from + '_' + to + '.csv', U.csv(rows), 'text/csv;charset=utf-8');
        UI.toast(_t('ڕاپۆرتەکە دابەزی'));
      });
      root.querySelector('[data-print]').addEventListener('click', () => {
        const docs = Store.doctors(true).filter((d) => c.ids.includes(d.id));
        UI.print('<div class="doc">' + UI.docHead(_t('ڕاپۆرتی کلینیک'), '<div>' + esc(label) + '</div><div>' + U.fmtDate(from) + ' – ' + U.fmtDate(to) + '</div>') +
          _t('<table><tr><th>چارەسەری تەواوبوو</th><td>') + U.num(c.done.length) + _t('</td><th>نەخۆشی نوێ</th><td>') + U.num(c.newPts.length) + '</td></tr>' + (money ? _t('<tr><th>داهات</th><td>') + U.money(c.billed) + _t('</td><th>وەرگیراو</th><td>') + U.money(c.collected) + '</td></tr>' : '') + _t('<tr><th>ڕێژەی نەهاتن</th><td>') + U.pct(c.noShow, 1) + _t('</td><th>کۆی نۆرە</th><td>') + U.num(c.valid.length) + '</td></tr></table>' +
          _t('<table><thead><tr><th>دکتۆر</th><th class="num">تەواوبوو</th><th class="num">نەهاتن</th>') + (money ? _t('<th class="num">داهات</th><th class="num">پشک</th>') : '') + '</tr></thead><tbody>' + docs.map((d) => { const a = c.ap.filter((x) => x.doctorId === d.id); const b = Store.billed(from, to, [d.id]); return '<tr><td>' + esc(d.name) + '</td><td class="num">' + U.num(a.filter((x) => x.status === 'completed').length) + '</td><td class="num">' + U.num(a.filter((x) => x.status === 'no_show').length) + '</td>' + (money ? '<td class="num">' + U.num(b) + '</td><td class="num">' + U.num(b * (d.share || 0) / 100) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table><div class="foot"><span>' + esc(Store.db.settings.clinicName) + _t('</span><span>ئامادەکراو لەلایەن ') + esc(Store.me.name) + ' · ' + U.fmtDate(U.today()) + '</span></div></div>');
      });
    }
  };
})();
