/* Doctors: team overview and per-doctor profile with performance, schedule, leaves and commission */
(function () {
  const esc = U.esc;

  function moneyVisible(doc) { return Store.can('view_finance') || (Store.me && Store.me.id === doc.id); }
  function monthStats(doc, from, to) {
    const ap = Store.appts({ from, to, doctorIds: [doc.id] });
    const done = ap.filter((a) => a.status === 'completed');
    const ns = ap.filter((a) => a.status === 'no_show').length;
    const billed = Store.billed(from, to, [doc.id]);
    return { appts: ap.filter((a) => a.status !== 'cancelled').length, done: done.length, patients: new Set(done.map((a) => a.patientId)).size, noShow: ap.length ? ns / ap.filter((a) => a.status !== 'cancelled').length * 100 : 0, billed, share: billed * (doc.share || 0) / 100 };
  }

  function renderList() {
    const docs = Store.scopedDoctors(true);
    if (docs.length === 1) return renderProfile(docs[0].id);
    const T = U.today(), from = U.startOfMonth(T);
    return _t('<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">تیمی پزیشکی</span><h1 class="page-title">') + U.num(docs.filter((d) => d.active).length) + _t(' دکتۆر</h1></div>') + (Store.can('manage_users') ? '<a class="btn accent" href="#/admin?tab=users">' + I('plus') + _t('زیادکردنی دکتۆر</a>') : '') + '</div>' +
      '<div class="grid g-auto" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">' + docs.map((d) => {
        const st = Store.liveStatus(d);
        const s = monthStats(d, from, T);
        const secs = Store.secretaryOf(d.id);
        return '<a class="card doc-tile" href="#/doctors/' + d.id + '" style="--dc:' + d.color + ';padding:20px;gap:14px' + (d.active ? '' : ';opacity:.6') + '">' +
          '<div class="row between">' + UI.who(d.name, esc(d.specialty), d.color, 'lg') + '</div>' +
          '<div class="row wrap">' + UI.badge(st.label, st.cls, true) + (d.active ? '' : UI.badge(_t('ناچالاک'), 'b-red')) + UI.badge(Store.room(d.room) ? Store.room(d.room).name : '—', '') + '</div>' +
          '<div class="grid g-3" style="gap:8px;text-align:center"><div class="col" style="gap:0"><b style="font-size:18px">' + U.num(s.done) + _t('</b><span class="small muted">چارەسەر</span></div><div class="col" style="gap:0"><b style="font-size:18px">') + U.num(s.patients) + _t('</b><span class="small muted">نەخۆش</span></div><div class="col" style="gap:0"><b style="font-size:18px">') + (moneyVisible(d) ? U.moneyShort(s.billed) : U.pct(s.noShow)) + '</b><span class="small muted">' + (moneyVisible(d) ? _t('داهات') : _t('نەهاتن')) + '</span></div></div>' +
          _t('<div class="meta"><span>سکرتێر: <b style="font-size:13px">') + esc(secs.map((x) => x.name).join(_t('، ')) || '—') + _t('</b></span><span>ئەمڕۆ ') + U.num(st.total) + _t(' نۆرە</span></div></a>');
      }).join('') + '</div>';
  }

  function renderProfile(id) {
    const d = Store.user(id);
    if (!d || d.role !== 'doctor') return '<div class="card">' + UI.empty(_t('ئەم دکتۆرە نەدۆزرایەوە'), 'stethoscope', _t('<a class="btn" href="#/doctors">گەڕانەوە</a>')) + '</div>';
    if (!Store.inScope(d.id)) return '<div class="card">' + UI.empty(_t('دەسەڵاتی بینینی داتای ئەم دکتۆرەت نییە'), 'lock', _t('<a class="btn" href="#/dashboard">گەڕانەوە</a>')) + '</div>';
    const T = U.today(), from = U.startOfMonth(T);
    const s = monthStats(d, from, T);
    const lm = U.addMonths(T, -1);
    const sPrev = monthStats(d, lm, U.endOfMonth(lm));
    const st = Store.liveStatus(d);
    const money = moneyVisible(d);
    const secs = Store.secretaryOf(d.id);
    const leaves = Store.db.leaves.filter((l) => l.doctorId === d.id && l.to >= U.addDays(T, -30)).sort(U.by((l) => l.from));
    const canManage = Store.can('manage_users');
    let html = (Store.scopedDoctors(true).length > 1 ? '<div class="row"><a class="btn ghost sm" href="#/doctors">' + I('chevR', 'sm') + _t('دکتۆرەکان</a></div>') : '');
    html += '<section class="card" style="border-top:4px solid ' + d.color + '"><div class="p-head"><div class="who">' + UI.av(d.name, d.color, 'xl') + '<span class="col" style="gap:2px"><span class="eyebrow">' + esc(d.specialty) + '</span><b>' + esc(d.name) + '</b><span class="small muted">' + esc(Store.room(d.room) ? Store.room(d.room).name : '') + ' · <span class="ltr">' + U.fmtPhone(d.phone) + _t('</span> · کار: ') + (d.workDays || []).map((w) => U.DAYS[w]).join(_t('، ')) + ' · ' + U.fmtTime(d.start || Store.db.settings.open) + '–' + U.fmtTime(d.end || Store.db.settings.close) + '</span><div class="tags" style="margin-top:6px">' + UI.badge(st.label, st.cls, true) + secs.map((x) => UI.badge(_t('سکرتێر: ') + x.name, 'b-mint')).join('') + (money ? UI.badge(_t('پشک: ') + U.pct(d.share || 0), 'b-blue') : '') + '</div></span></div>' +
      '<div class="row wrap"><a class="btn sm" href="#/appointments?view=week&doctor=' + d.id + '">' + I('calendar', 'sm') + _t('خشتەی هەفتە</a>') + (canManage ? '<button class="btn sm" data-leave>' + I('flag', 'sm') + _t('مۆڵەت</button><a class="btn sm" href="#/admin?tab=users&edit=') + d.id + '">' + I('edit', 'sm') + _t('دەستکاری</a>') : '') + (money ? '<button class="btn sm primary" data-statement>' + I('printer', 'sm') + _t('کەشفی حیسابی مانگ</button>') : '') + '</div></div></section>';
    const delta = (a, b) => (b ? '<span class="' + (a >= b ? 'up' : 'down') + '">' + (a >= b ? '▲' : '▼') + ' ' + U.pct(Math.abs((a - b) / b * 100)) + _t('</span> لە مانگی پێشوو') : '');
    html += '<div class="grid ' + (money ? 'g-5' : 'g-3') + '">' + UI.kpi(_t('چارەسەری ئەم مانگە'), U.num(s.done), delta(s.done, sPrev.done), 'check') + UI.kpi(_t('نەخۆشی جیاواز'), U.num(s.patients), delta(s.patients, sPrev.patients), 'users') + UI.kpi(_t('ڕێژەی نەهاتن'), U.pct(s.noShow, 1), _t('مانگی پێشوو ') + U.pct(sPrev.noShow, 1), 'alert') + (money ? UI.kpi(_t('داهاتی مانگ'), U.moneyShort(s.billed) + _t(' <small>د.ع</small>'), delta(s.billed, sPrev.billed), 'wallet') + UI.kpi(_t('پشکی دکتۆر'), U.moneyShort(s.share) + _t(' <small>د.ع</small>'), U.pct(d.share || 0) + _t(' لە داهات'), 'trend') : '') + '</div>';
    html += '<div class="split"><section class="card"><div class="card-head"><span class="card-title">' + I('chart') + (money ? _t('داهاتی ٦ مانگی ڕابردوو') : _t('چارەسەری ٦ مانگی ڕابردوو')) + '</span></div><div class="chart-box"><canvas id="ch-doc6"></canvas></div></section>' +
      '<section class="card"><div class="card-head"><span class="card-title">' + I('tooth') + _t('جۆری چارەسەر — ئەم مانگە</span></div><div class="chart-box sm"><canvas id="ch-mix"></canvas></div></section></div>');
    html += '<div class="split"><section class="card"><div class="card-head"><span class="card-title">' + I('calendar') + _t('خشتەی ئەمڕۆ</span><a class="small" href="#/appointments?view=day">خشتەی تەواو</a></div>') + (st.today.length ? '<div class="list">' + st.today.slice().sort(U.by((a) => a.start)).map((a) => Pages.appointments.queueItem(a, {})).join('') + '</div>' : UI.empty(st.key === 'leave' ? _t('ئەمڕۆ لە مۆڵەتدایە') : _t('ئەمڕۆ هیچ نۆرەیەکی نییە'), 'calendar')) + '</section>' +
      '<section class="card"><div class="card-head"><span class="card-title">' + I('flag') + _t('مۆڵەتەکان</span>') + (canManage ? '<button class="btn xs" data-leave>' + I('plus', 'sm') + _t('زیادکردن</button>') : '') + '</div>' + (leaves.length ? '<div class="list">' + leaves.map((l) => '<div class="li"><span class="grow"><span class="t">' + U.fmtDateShort(l.from) + (l.to !== l.from ? ' – ' + U.fmtDateShort(l.to) : '') + '</span><span class="s">' + esc(l.reason) + '</span></span>' + (l.to < T ? UI.badge(_t('ڕابردوو'), '') : l.from <= T ? UI.badge(_t('ئێستا'), 'b-amber') : UI.badge(_t('داهاتوو'), 'b-blue')) + (canManage ? '<button class="btn xs danger" data-del-leave="' + l.id + _t('" aria-label="سڕینەوە">') + I('trash', 'sm') + '</button>' : '') + '</div>').join('') + '</div>' : UI.empty(_t('هیچ مۆڵەتێک تۆمار نەکراوە'), 'flag')) + '</section></div>';
    return html;
  }

  function leaveForm(doc) {
    const m = UI.modal({
      title: _t('مۆڵەتی ') + doc.name, size: 'narrow',
      body: '<form class="form" id="lvf" novalidate>' + UI.field(_t('لە'), '<input class="input" type="date" name="from" value="' + U.today() + '">', { req: true }) + UI.field(_t('بۆ'), '<input class="input" type="date" name="to" value="' + U.today() + '">', { req: true }) + UI.field(_t('هۆکار'), _t('<input class="input" name="reason" list="dl-leave" placeholder="مۆڵەتی ساڵانە، کۆنفرانس، نەخۆشی…"><datalist id="dl-leave">') + Store.listNames('leaveReasons').map((x) => '<option value="' + esc(x) + '">').join('') + '</datalist>', { full: true, req: true }) + '<div class="full" id="lv-warn"></div></form>',
      foot: _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>پاشەکەوتکردن</button>')
    });
    const f = m.$('#lvf');
    const check = () => {
      const d = UI.data(f);
      if (!d.from || !d.to) return;
      const hit = Store.appts({ from: d.from, to: d.to, doctorIds: [doc.id] }).filter((a) => ['scheduled', 'confirmed'].includes(a.status));
      m.$('#lv-warn').innerHTML = hit.length ? '<div class="alert amber">' + I('alert') + '<span>' + U.num(hit.length) + _t(' نۆرە لەم ماوەیەدا هەیە. پاش پاشەکەوتکردن پێویستە بگوازرێنەوە یان هەڵبوەشێنرێنەوە.</span></div>') : '';
    };
    f.addEventListener('change', check);
    check();
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { from: UI.req(), to: (v) => (!v ? _t('پێویستە') : v < f.from.value ? _t('دەبێت دوای بەرواری دەستپێک بێت') : null), reason: UI.req(_t('هۆکار بنووسە')) })) return;
      const d = UI.data(f);
      Store.db.leaves.push({ id: U.uid('lv'), doctorId: doc.id, from: d.from, to: d.to, reason: d.reason });
      Store.commit('leave', _t('مۆڵەت بۆ ') + doc.name + _t(' تۆمار کرا: ') + U.fmtDateShort(d.from) + ' – ' + U.fmtDateShort(d.to));
      m.close();
      UI.toast(_t('مۆڵەتەکە تۆمار کرا'));
    });
  }
  function printStatement(doc) {
    const T = U.today(), from = U.startOfMonth(T);
    const invs = Store.invoicesIn(from, T, [doc.id]).sort(U.by((i) => i.date));
    const billed = U.sum(invs, (i) => i.total);
    UI.print('<div class="doc">' + UI.docHead(_t('کەشفی حیسابی دکتۆر'), '<div>' + U.fmtMonth(T.slice(0, 7)) + '</div><div>' + esc(doc.name) + '</div>') +
      _t('<table><thead><tr><th>بەروار</th><th>پسوولە</th><th>نەخۆش</th><th>چارەسەر</th><th class="num">بڕ</th></tr></thead><tbody>') + invs.map((i) => '<tr><td>' + U.fmtDateShort(i.date) + '</td><td class="latin">' + esc(i.no) + '</td><td>' + esc(Store.patientName(i.patientId)) + '</td><td>' + esc(i.items.map((x) => x.name).join(_t('، '))) + '</td><td class="num">' + U.num(i.total) + '</td></tr>').join('') + '</tbody></table>' +
      _t('<table class="tot"><tr><td>کۆی داهات</td><td class="num">') + U.money(billed) + _t('</td></tr><tr><td>ڕێژەی پشک</td><td class="num">') + U.pct(doc.share || 0) + _t('</td></tr><tr class="g"><td>پشکی دکتۆر</td><td class="num">') + U.money(billed * (doc.share || 0) / 100) + '</td></tr></table>' +
      _t('<div class="sig"><div>واژووی دکتۆر</div><div>واژووی خاوەنی کلینیک</div></div></div>'));
  }

  Pages.doctors = {
    title: (r) => (r.parts[1] ? Store.doctorName(r.parts[1]) : _t('دکتۆرەکان')),
    render(r) { return r.parts[1] ? renderProfile(r.parts[1]) : renderList(); },
    mount(root, r) {
      const docs = Store.scopedDoctors(true);
      const id = r.parts[1] || (docs.length === 1 ? docs[0].id : null);
      if (!id) return;
      const d = Store.user(id);
      if (!d || !Store.inScope(d.id)) return;
      Pages.appointments.bindQueue(root);
      const money = moneyVisible(d);
      const T = U.today();
      const c6 = root.querySelector('#ch-doc6');
      if (c6) {
        const labels = [], vals = [];
        for (let k = 5; k >= 0; k--) {
          const ms = U.addMonths(T, -k), me = k === 0 ? T : U.endOfMonth(ms);
          labels.push(U.MONTHS_SHORT[Number(ms.slice(5, 7)) - 1]);
          vals.push(money ? Store.billed(ms, me, [d.id]) : Store.appts({ from: ms, to: me, doctorIds: [d.id], status: 'completed' }).length);
        }
        Charts.bar(c6, labels, [{ label: money ? _t('داهات') : _t('چارەسەر'), data: vals, color: d.color }], { money });
      }
      const cm = root.querySelector('#ch-mix');
      if (cm) {
        const done = Store.appts({ from: U.startOfMonth(T), to: T, doctorIds: [d.id], status: 'completed' });
        const by = U.groupBy(done, (a) => a.serviceId);
        const keys = Object.keys(by).sort((a, b) => by[b].length - by[a].length).slice(0, 6);
        Charts.doughnut(cm, keys.map((k) => Store.serviceName(k)), keys.map((k) => by[k].length));
      }
      root.addEventListener('click', async (e) => {
        if (e.target.closest('[data-leave]')) leaveForm(d);
        if (e.target.closest('[data-statement]')) printStatement(d);
        const dl = e.target.closest('[data-del-leave]');
        if (dl && await UI.confirm({ title: _t('سڕینەوەی مۆڵەت'), text: _t('ئەم مۆڵەتە دەسڕێتەوە.'), ok: _t('سڕینەوە'), danger: true })) { Store.db.leaves = Store.db.leaves.filter((l) => l.id !== dl.dataset.delLeave); Store.commit('leave', _t('مۆڵەتێکی ') + d.name + _t(' سڕایەوە')); }
      });
    }
  };
})();
