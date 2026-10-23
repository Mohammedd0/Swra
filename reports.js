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

  /* ---------- retention ---------- */
  const RV = { kind: 'lapsed', doctor: '', hide: true, page: 1 };
  const fill = (s, o) => Object.keys(o).reduce((acc, k) => acc.split('{' + k + '}').join(o[k]), s);
  function tabs(on) {
    return '<div class="tabs">' + [['overview', _t('گشتی'), 'chart'], ['retention', _t('گەڕانەوەی نەخۆش'), 'refresh']].map((t) => '<button class="tab ' + (t[0] === on ? 'on' : '') + '" data-view="' + t[0] + '">' + I(t[2], 'sm') + t[1] + '</button>').join('') + '</div>';
  }
  function monthsOf(p) { const m = Number(p.m); return m >= 1 && m <= 24 ? m : Retention.months(); }
  const contacted = (p) => p.recalledAt && U.diffDays(U.today(), p.recalledAt) <= 30;
  const monthsAgo = (days) => (days >= 60 ? fill(_t('{n} مانگ لەمەوبەر'), { n: U.num(Math.floor(days / 30.4)) }) : fill(_t('{n} ڕۆژ لەمەوبەر'), { n: U.num(days) }));
  function callList(M, ids) {
    let l = Retention.list(RV.kind, M, RV.doctor && ids.includes(RV.doctor) ? [RV.doctor] : ids);
    if (RV.hide) l = l.filter((x) => !contacted(x.p));
    return l;
  }
  function retentionHtml(p) {
    const R = Retention, D = R.data(), M = monthsOf(p);
    const ids = Store.scopeDoctorIds();
    const docs = Store.doctors(true).filter((d) => ids.includes(d.id));
    const rt = R.rate(M, ids);
    const prev = R.rate(M, ids, R.shift(D.T, -M));
    const lapsedAll = R.list('lapsed', M, ids), dueAll = R.list('due', M, ids);
    const mopts = Array.from(new Set([3, 6, 12, R.months()])).sort((a, b) => a - b);
    let html = '<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">' + _t('ڕاپۆرتەکان') + (Store.can('view_all') ? '' : ' · ' + esc(Store.scopeLabel())) + '</span><h1 class="page-title">' + _t('گەڕانەوەی نەخۆش') + '</h1><span class="page-sub">' + fill(_t('تەنها سەردانی تەواوکراو دەژمێردرێت · مێژووی سەردان لە {date} ـەوە تۆمار کراوە'), { date: U.fmtDate(D.start) }) + '</span></div><div class="row wrap"><div class="seg">' + mopts.map((m) => '<button class="' + (m === M ? 'on' : '') + '" data-m="' + m + '">' + fill(_t('{n} مانگ'), { n: U.num(m) }) + '</button>').join('') + '</div></div></div>';
    html += tabs('retention');
    if (Store.oldDemo) html += '<div class="alert amber">' + I('info') + '<span>' + _t('داتای پاشەکەوتکراوت پێش زیادکردنی مێژووی سەردان دروست کراوە، بۆیە ژمارەکانی ئەم بەشە کەم دەردەچن. خاوەنی کلینیک دەتوانێت لە بەڕێوەبردن ← باکئەپ و داتا ← دەستپێکردنەوە داتای نموونەیی نوێ دروست بکات.') + '</span></div>';
    const dl = prev.enough && rt.enough ? ' · <span class="' + (rt.rate >= prev.rate ? 'up' : 'down') + '">' + (rt.rate >= prev.rate ? '▲ ' : '▼ ') + U.num(Math.abs(rt.rate - prev.rate).toFixed(1)) + _t(' خاڵ') + '</span>' : '';
    html += '<div class="grid g-4">' +
      UI.kpi(fill(_t('ڕێژەی گەڕانەوە ({n} مانگ)'), { n: U.num(M) }), rt.enough ? U.pct(rt.rate, 1) : '—', rt.enough ? fill(_t('{a} لە {b} نەخۆشی {from} – {to} گەڕانەوە'), { a: U.num(rt.back), b: U.num(rt.base), from: U.fmtDate(U.addDays(rt.from, 1) > D.start ? U.addDays(rt.from, 1) : D.start), to: U.fmtDate(rt.mid) }) + dl : fill(_t('پێویستی بە مێژووی سەردانە لە {date} ـەوە'), { date: U.fmtDate(rt.from) }), 'refresh') +
      UI.kpi(_t('نەخۆشی چالاک'), U.num(R.active(M, ids)), fill(_t('سەردانیان هەبووە لە {n} مانگی ڕابردوودا'), { n: U.num(M) }), 'users') +
      UI.kpi(_t('لە دەستچوو'), U.num(lapsedAll.length), fill(_t('{n} مانگ زیاتر نەهاتوون و نۆرەیان نییە'), { n: U.num(M) }), 'alert') +
      UI.kpi(_t('کاتی گەڕانەوەیان نزیکە'), U.num(dueAll.length), fill(_t('لە مانگی داهاتوودا دەگەنە {n} مانگ بێ سەردان'), { n: U.num(M) }), 'clock') +
      '</div>';
    if (rt.enough && rt.partial) html += '<div class="small muted" style="margin-top:-6px">' + I('info', 'sm') + ' ' + fill(_t('بەشێک لە ماوەی بەراوردکردن پێش {date} ـە کە هێشتا سەردانی تێدا تۆمار نەکراوە، بۆیە ڕێژەکە لەسەر ئەو بەشەی هەیە ژمێردراوە.'), { date: U.fmtDate(D.start) }) + '</div>';
    const tr = R.trend(M, ids, 12);
    html += '<div class="split"><section class="card"><div class="card-head"><span class="card-title">' + I('users') + _t('نەخۆشی گەڕاوە و نوێ بەپێی مانگ') + '</span><span class="card-sub">' + _t('ژمارەی نەخۆشی جیاواز کە سەردانیان کردووە') + '</span></div><div class="chart-box"><canvas id="ch-ret-mix"></canvas></div></section>' +
      '<section class="card"><div class="card-head"><span class="card-title">' + I('trend') + fill(_t('ڕەوتی ڕێژەی گەڕانەوە ({n} مانگ)'), { n: U.num(M) }) + '</span><span class="card-sub">' + _t('ڕێژەکە لە کۆتایی هەر مانگێکدا') + '</span></div>' + (tr.length >= 2 ? '<div class="chart-box"><canvas id="ch-ret-trend"></canvas></div>' : UI.empty(fill(_t('ئەم چارتە دەردەکەوێت کاتێک مێژووی سەردان بەس بێت. بۆ ماوەی {n} مانگ، لانیکەم {k} مانگ مێژوو پێویستە. ماوەیەکی کورتتر هەڵبژێرە بۆ بینینی ئێستا.'), { n: U.num(M), k: U.num(M * 2) }), 'trend')) + '</section></div>';
    if (docs.length > 1) {
      const cut = R.shift(D.T, -M);
      html += '<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">' + I('stethoscope') + _t('گەڕانەوە بەپێی دکتۆر') + '</span><span class="card-sub">' + _t('گەڕانەوە واتە نەخۆشەکە دووبارە هاتەوە بۆ کلینیک، لای هەر دکتۆرێک بێت') + '</span></div><div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>' + _t('دکتۆر') + '</th><th class="num">' + _t('چالاک') + '</th><th class="num">' + _t('نەخۆشی ماوەی پێشوو') + '</th><th class="num">' + _t('گەڕاونەتەوە') + '</th><th style="min-width:150px">' + _t('ڕێژە') + '</th><th class="num">' + _t('نەخۆشی نوێی ئەم ماوەیە') + '</th><th class="num">' + _t('لە دەستچوو') + '</th></tr></thead><tbody>' +
        docs.map((d) => {
          const r = R.rate(M, [d.id]);
          const nw = Store.db.patients.filter((x) => x.doctorId === d.id && x.createdAt > cut).length;
          return '<tr><td>' + UI.who(d.name, esc(d.specialty.split('(')[0]), d.color, 'sm') + '</td><td class="num">' + U.num(R.active(M, [d.id])) + '</td><td class="num">' + U.num(r.base) + '</td><td class="num">' + U.num(r.back) + '</td><td>' + (r.enough ? '<div class="row" style="gap:8px"><b style="min-width:52px">' + U.pct(r.rate, 1) + '</b><span class="grow">' + UI.bar(r.rate, r.rate >= 60 ? 'green' : r.rate >= 40 ? 'amber' : 'red') + '</span></div>' : '<span class="muted">—</span>') + '</td><td class="num">' + U.num(nw) + '</td><td class="num">' + U.num(R.list('lapsed', M, [d.id]).length) + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
    }
    const list = callList(M, ids);
    const size = 15, pages = Math.max(1, Math.ceil(list.length / size));
    RV.page = U.clamp(RV.page, 1, pages);
    const rows = list.slice((RV.page - 1) * size, RV.page * size);
    const canBook = Store.can('create_appointments');
    html += '<section class="card flush" id="ret-list"><div style="padding:16px 22px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--border)"><div class="row between wrap"><span class="card-title">' + I('phone') + _t('نەخۆش بۆ پەیوەندیکردن') + '</span>' + (Store.can('export_data') ? '<button class="btn sm" data-ret-export>' + I('download', 'sm') + 'Excel</button>' : '') + '</div>' +
      '<div class="row wrap" style="gap:10px"><div class="seg"><button class="' + (RV.kind === 'lapsed' ? 'on' : '') + '" data-kind="lapsed">' + _t('لە دەستچوو') + ' <span class="cnt">' + U.num(lapsedAll.length) + '</span></button><button class="' + (RV.kind === 'due' ? 'on' : '') + '" data-kind="due">' + _t('کاتی گەڕانەوەیان نزیکە') + ' <span class="cnt">' + U.num(dueAll.length) + '</span></button></div>' +
      (docs.length > 1 ? '<select class="select" style="max-width:210px" data-rdoc>' + UI.opts(docs, RV.doctor, _t('هەموو دکتۆرەکان')) + '</select>' : '') +
      '<label class="row small" style="gap:6px;cursor:pointer"><input type="checkbox" data-hide' + (RV.hide ? ' checked' : '') + ' style="accent-color:var(--navy)">' + _t('ئەوانەی لە ٣٠ ڕۆژی ڕابردوودا پەیوەندییان پێوە کراوە پیشان مەدە') + '</label></div>' +
      '<span class="small muted">' + (RV.kind === 'lapsed' ? fill(_t('دوایین سەردانیان زیاتر لە {n} مانگ لەمەوبەر بووە و هیچ نۆرەیەکیان نییە. ئەوانەی زۆرترین سەردانیان هەبووە لە سەرەوەن.'), { n: U.num(M) }) : fill(_t('لە ماوەی مانگێکی داهاتوودا دەگەنە {n} مانگ بێ سەردان. ئێستا کاتی باشە بۆ بیرخستنەوە.'), { n: U.num(M) })) + '</span></div>' +
      (rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>' + _t('نەخۆش') + '</th>' + (docs.length > 1 ? '<th>' + _t('دکتۆر') + '</th>' : '') + '<th>' + _t('دوایین سەردان') + '</th><th class="num">' + _t('سەردان') + '</th><th>' + _t('دوایین چارەسەر') + '</th><th></th></tr></thead><tbody>' +
        rows.map((x) => '<tr><td>' + UI.who(x.p.name, '#' + U.d(x.p.fileNo) + ' · <span class="ltr">' + U.fmtPhone(x.p.phone) + '</span>', null, 'sm', '#/patients/' + x.p.id) + (x.p.recalledAt ? '<div class="small muted" style="margin-top:2px">' + I('check', 'sm') + ' ' + fill(_t('پەیوەندی کرا: {d}'), { d: U.relDay(x.p.recalledAt) }) + '</div>' : '') + '</td>' + (docs.length > 1 ? '<td class="nowrap">' + esc(Store.doctorName(x.last.doctorId)) + '</td>' : '') + '<td class="nowrap">' + U.fmtDateShort(x.last.date) + ' <span class="small muted">(' + monthsAgo(x.days) + ')</span></td><td class="num">' + U.num(x.count) + '</td><td>' + esc(Store.serviceName(x.last.serviceId)) + '</td><td><span class="row" style="gap:4px;justify-content:flex-end"><a class="btn xs wa" target="_blank" rel="noopener" data-recall="' + x.p.id + '" href="' + U.waLink(x.p.phone, Retention.recallText(x.p)) + '">' + I('whatsapp', 'sm') + _t('واتسئاپ') + '</a>' + (canBook ? '<button class="btn xs" data-rbook="' + x.p.id + '">' + I('calendar', 'sm') + _t('نۆرە بگرە') + '</button>' : '') + '</span></td></tr>').join('') + '</tbody></table></div>' + UI.pager(list.length, RV.page, size)
        : UI.empty(RV.kind === 'lapsed' ? _t('هیچ نەخۆشێکی لە دەستچوو نییە') : _t('هیچ نەخۆشێک لەم ماوەیەدا کاتی گەڕانەوەی نییە'), 'check')) + '</section>';
    return html;
  }
  function mountRetention(root, r) {
    const R = Retention, M = monthsOf(r.params), ids = Store.scopeDoctorIds();
    const mix = root.querySelector('#ch-ret-mix');
    if (mix) {
      const mo = R.monthly(ids, 12).filter((x) => !x.partial);
      Charts.bar(mix, mo.map((x) => U.MONTHS_SHORT[Number(x.key.slice(5, 7)) - 1]), [{ label: _t('گەڕاوە'), data: mo.map((x) => x.back) }, { label: _t('نوێ'), data: mo.map((x) => x.fresh), color: '#67CDAB' }], { stacked: true, legend: true });
    }
    const trc = root.querySelector('#ch-ret-trend');
    if (trc) {
      const tr = R.trend(M, ids, 12);
      Charts.line(trc, tr.map((x) => U.MONTHS_SHORT[Number(x.key.slice(5, 7)) - 1]), [{ label: _t('ڕێژەی گەڕانەوە'), data: tr.map((x) => Math.round(x.rate * 10) / 10) }], { pct: true });
    }
    root.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { RV.page = 1; App.setParams({ m: Number(b.dataset.m) === R.months() ? null : b.dataset.m }); }));
    root.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { RV.kind = b.dataset.kind; RV.page = 1; App.render(); }));
    const sd = root.querySelector('[data-rdoc]');
    if (sd) sd.addEventListener('change', () => { RV.doctor = sd.value; RV.page = 1; App.render(); });
    const hd = root.querySelector('[data-hide]');
    if (hd) hd.addEventListener('change', () => { RV.hide = hd.checked; RV.page = 1; App.render(); });
    const box = root.querySelector('#ret-list');
    if (box) box.addEventListener('click', (e) => {
      const pg = e.target.closest('[data-page]');
      if (pg && !pg.disabled) { RV.page = Number(pg.dataset.page); App.render(); return; }
      const rc = e.target.closest('[data-recall]');
      if (rc) {
        const p = Store.patient(rc.dataset.recall);
        // record the contact after the link has opened WhatsApp
        if (p) setTimeout(() => { p.recalledAt = U.today(); Store.commit('patient', fill(_t('بیرخستنەوەی گەڕانەوە نێردرا بۆ {name}'), { name: p.name }), { ref: p.id }); }, 400);
        return;
      }
      const bk = e.target.closest('[data-rbook]');
      if (bk) { const p = Store.patient(bk.dataset.rbook); const lv = R.lastVisit(p.id); const doc = lv && Store.inScope(lv.doctorId) ? lv.doctorId : Store.inScope(p.doctorId) ? p.doctorId : undefined; Pages.appointments.openForm({ patientId: p.id, doctorId: doc }); }
    });
    const ex = root.querySelector('[data-ret-export]');
    if (ex) ex.addEventListener('click', () => {
      const rows = [[_t('ژمارەی پەڕگە'), _t('نەخۆش'), _t('مۆبایل'), _t('دکتۆر'), _t('دوایین سەردان'), _t('سەردان'), _t('دوایین چارەسەر'), _t('پەیوەندی کرا')]];
      callList(M, ids).forEach((x) => rows.push([x.p.fileNo, x.p.name, x.p.phone, Store.doctorName(x.last.doctorId), x.last.date, x.count, Store.serviceName(x.last.serviceId), x.p.recalledAt || '']));
      U.download('bite-retention-' + RV.kind + '-' + U.today() + '.csv', U.csv(rows), 'text/csv;charset=utf-8');
      UI.toast(_t('لیستەکە دابەزی'));
    });
  }

  Pages.reports = {
    title: _t('ڕاپۆرتەکان'),
    render(r) {
      const p = r.params;
      if (p.view === 'retention') return retentionHtml(p);
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
      html += tabs('overview');
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
      root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => App.setParams({ view: b.dataset.view === 'overview' ? null : 'retention', m: null, period: null, from: null, to: null })));
      if (p.view === 'retention') return mountRetention(root, r);
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
