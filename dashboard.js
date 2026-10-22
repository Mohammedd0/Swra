/* Role-aware dashboards: owner/admin, doctor, secretary */
(function () {
  const esc = U.esc;

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'بەیانیت باش' : h < 17 ? 'ڕۆژت باش' : 'ئێوارەت باش';
  }
  function clinicState() {
    const s = Store.db.settings, T = U.today(), now = U.nowMin();
    if (Store.isClosedDay(T)) return UI.badge('ئەمڕۆ پشووە', 'b-gray', true);
    if (now < U.toMin(s.open)) return UI.badge('کلینیک ' + U.fmtTime(s.open) + ' دەکرێتەوە', 'b-blue', true);
    if (now >= U.toMin(s.close)) return UI.badge('کلینیک داخراوە', 'b-gray', true);
    return UI.badge('کلینیک کراوەیە تا ' + U.fmtTime(s.close), 'b-green', true);
  }
  function head(title, sub, actions) {
    return '<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">' + esc(greeting()) + '</span><h1 class="page-title">' + esc(title) + '</h1><span class="page-sub">' + U.fmtDate(U.today(), true) + ' · ' + clinicState() + '</span></div><div class="row wrap">' + (actions || '') + '</div></div>';
  }
  function alertsCard(limit) {
    const n = Store.notifications().slice(0, limit || 4);
    if (!n.length) return '';
    return '<div class="grid" style="gap:8px">' + n.map((x) => '<a class="alert ' + x.type + '" href="' + x.href + '" style="text-decoration:none">' + I(x.icon) + '<span>' + esc(x.text) + '</span><span style="margin-inline-start:auto">' + I('chevL', 'sm') + '</span></a>').join('') + '</div>';
  }
  function noShowRate(docIds) {
    const T = U.today();
    const list = Store.appts({ from: U.addDays(T, -30), to: U.addDays(T, -1), doctorIds: docIds }).filter((a) => a.status !== 'cancelled');
    return list.length ? (list.filter((a) => a.status === 'no_show').length / list.length) * 100 : 0;
  }
  function revenueSeries(days, docIds) {
    const T = U.today();
    const labels = [], data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = U.addDays(T, -i);
      labels.push(U.fmtDateShort(d));
      data.push(Store.collected(d, d, docIds));
    }
    return { labels, data };
  }
  function docTile(d) {
    const st = Store.liveStatus(d);
    let now = '';
    if (st.cur) now = 'لەگەڵ <b>' + esc(Store.patientName(st.cur.patientId)) + '</b><br>' + esc(Store.serviceName(st.cur.serviceId)) + ' · ' + U.num(Math.max(0, st.left)) + ' خولەک ماوە';
    else if (st.key === 'leave') now = esc(st.note || 'مۆڵەت');
    else if (st.next) now = 'نۆرەی داهاتوو: <b>' + U.fmtTime(st.next.start) + '</b><br>' + esc(Store.patientName(st.next.patientId));
    else if (st.key === 'closed' || st.key === 'off') now = 'نۆرەی ماوەی نییە بۆ ئەمڕۆ';
    else now = 'هیچ نۆرەیەکی تری نییە';
    const pct = st.total ? (st.done / st.total) * 100 : 0;
    return '<a class="doc-tile" href="#/doctors/' + d.id + '" style="--dc:' + d.color + '">' +
      '<div class="row between">' + UI.who(d.name, esc(d.specialty.split('(')[0]), d.color, 'sm') + '</div>' +
      '<div>' + UI.badge(st.label, st.cls, true) + (st.waiting && st.waiting.length ? ' ' + UI.badge(U.num(st.waiting.length) + ' چاوەڕوان', 'b-purple') : '') + '</div>' +
      '<div class="now">' + now + '</div>' +
      UI.bar(pct) +
      '<div class="meta"><span>تەواوبوو <b>' + U.num(st.done) + '</b> لە ' + U.num(st.total) + '</span><span>' + esc(Store.room(d.room) ? Store.room(d.room).name : '') + '</span></div></a>';
  }
  function roomsGrid() {
    return '<div class="room-grid">' + Store.db.rooms.filter((r) => r.active).map((r) => {
      const doc = Store.doctors().find((d) => d.room === r.id);
      const st = doc ? Store.liveStatus(doc) : null;
      let cls = 'free', txt = 'ئامادەیە', who = doc ? doc.name : 'دیاری نەکراوە';
      if (st && st.cur) { cls = st.key === 'surgery' ? 'surg' : 'busy'; txt = (st.key === 'surgery' ? 'نەشتەرگەری' : 'بەکارە') + ' · ' + U.num(Math.max(0, st.left)) + ' خولەک'; }
      else if (st && ['leave', 'off', 'closed', 'inactive'].includes(st.key)) { cls = 'off'; txt = st.label; }
      return '<div class="room ' + cls + '"><b>' + esc(r.name) + '</b><span class="small">' + esc(txt) + '</span><span class="small muted">' + esc(who) + '</span></div>';
    }).join('') + '</div>';
  }
  function feed(limit) {
    const items = Store.db.audit.filter((l) => l.action !== 'login').slice(0, limit || 7);
    if (!items.length) return UI.empty('هیچ چالاکییەک تۆمار نەکراوە', 'history');
    return '<div class="list feed">' + items.map((l) => '<div class="li"><time>' + U.fmtStamp(l.at) + '</time><span class="grow"><span class="t">' + esc(l.details) + '</span><span class="s">' + esc(Store.user(l.userId) ? Store.user(l.userId).name : 'سیستەم') + '</span></span></div>').join('') + '</div>';
  }
  function upcomingList(docIds, limit) {
    const T = U.today(), now = U.nowMin();
    const list = Store.appts({ date: T, doctorIds: docIds }).filter((a) => ['scheduled', 'confirmed', 'arrived'].includes(a.status) && U.toMin(a.start) + a.duration >= now).sort(U.by((a) => a.start)).slice(0, limit || 6);
    if (!list.length) {
      const tom = Store.appts({ date: U.addDays(T, 1), doctorIds: docIds }).filter(Store.isActive);
      return UI.empty('هیچ نۆرەیەکی تری ئەمڕۆ نییە' + (tom.length ? ' · سبەی ' + U.num(tom.length) + ' نۆرە هەیە' : ''), 'calendar');
    }
    return '<div class="list">' + list.map((a) => Pages.appointments.queueItem(a, { compact: true, showDoctor: docIds.length > 1 })).join('') + '</div>';
  }

  function ownerView() {
    const T = U.today(), ids = Store.scopeDoctorIds();
    const fin = Store.can('view_finance');
    const today = Store.appts({ date: T, doctorIds: ids }).filter(Store.isActive);
    const done = today.filter((a) => a.status === 'completed').length;
    const mStart = U.startOfMonth(T);
    const dayOfMonth = Number(T.slice(8));
    const lmStart = U.addMonths(T, -1);
    const lmSame = U.addDays(lmStart, Math.min(dayOfMonth, Number(U.endOfMonth(lmStart).slice(8))) - 1);
    const monthRev = Store.collected(mStart, T, ids);
    const lastRev = Store.collected(lmStart, lmSame, ids);
    const delta = lastRev ? ((monthRev - lastRev) / lastRev) * 100 : 0;
    const newPts = Store.db.patients.filter((p) => p.createdAt >= mStart).length;
    const ns = noShowRate(ids);
    const docs = Store.doctors(true).filter((d) => ids.includes(d.id));
    const pend = Store.db.requests.filter((r) => r.status === 'pending').length;

    let html = head('داشبۆردی ' + (Store.me.role === 'owner' ? 'خاوەن' : 'بەڕێوەبەر'), '', '<a class="btn" href="#/reports">' + I('bars') + 'ڕاپۆرتەکان</a><button class="btn primary" data-new-appt>' + I('plus') + 'نۆرەی نوێ</button>');
    html += alertsCard(3);
    html += '<div class="grid g-5">' +
      UI.kpi('نۆرەکانی ئەمڕۆ', U.num(today.length), U.num(done) + ' تەواوبوو · ' + U.num(today.length - done) + ' ماوە', 'calendar', { href: '#/appointments' }) +
      (fin ? UI.kpi('وەرگیراوی ئەمڕۆ', U.moneyShort(Store.collected(T, T, ids)) + ' <small>د.ع</small>', 'لە ' + U.num(Store.paymentsIn(T, T, ids).length) + ' پارەدان', 'wallet', { href: '#/billing' }) : UI.kpi('نەخۆشی چاوەڕوان', U.num(today.filter((a) => a.status === 'arrived').length), 'لە ژووری چاوەڕوانی', 'clock')) +
      (fin ? UI.kpi('داهاتی ئەم مانگە', U.moneyShort(monthRev) + ' <small>د.ع</small>', '<span class="' + (delta >= 0 ? 'up' : 'down') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + U.pct(Math.abs(delta)) + '</span> بەراورد بە هەمان ماوەی مانگی پێشوو', 'trend', { href: '#/reports' }) : UI.kpi('داواکاری ئۆنلاین', U.num(pend), 'چاوەڕێی وەڵامن', 'globe', { href: '#/appointments?panel=requests' })) +
      UI.kpi('نەخۆشی نوێی مانگ', U.num(newPts), 'کۆی نەخۆشەکان: ' + U.num(Store.db.patients.length), 'users', { href: '#/patients' }) +
      UI.kpi('ڕێژەی نەهاتن', U.pct(ns, 1), '٣٠ ڕۆژی ڕابردوو · ئامانج کەمتر لە ٥٪', 'alert', { icoStyle: ns > 5 ? 'background:var(--red-bg);color:var(--red-fg)' : '' }) +
      '</div>';
    html += '<section class="card"><div class="card-head"><span class="card-title">' + I('stethoscope') + 'دکتۆرەکان — ئێستا</span><a class="btn sm ghost" href="#/doctors">هەموو دکتۆرەکان ' + I('chevL', 'sm') + '</a></div><div class="doc-board">' + docs.map(docTile).join('') + '</div></section>';
    html += '<div class="split">';
    if (fin) html += '<section class="card"><div class="card-head"><span class="card-title">' + I('trend') + 'پارەی وەرگیراو — ٣٠ ڕۆژی ڕابردوو</span><span class="card-sub">کۆ: ' + U.money(Store.collected(U.addDays(T, -29), T, ids)) + '</span></div><div class="chart-box"><canvas id="ch-rev"></canvas></div></section>';
    else html += '<section class="card"><div class="card-head"><span class="card-title">' + I('calendar') + 'نۆرە — ١٤ ڕۆژی ڕابردوو</span></div><div class="chart-box"><canvas id="ch-appts"></canvas></div></section>';
    html += '<section class="card"><div class="card-head"><span class="card-title">' + I('door') + 'ژوورە چارەسەرییەکان</span></div>' + roomsGrid() + '<div class="divider" style="margin:16px 0 8px"></div><div class="card-head" style="margin-bottom:4px"><span class="card-title" style="font-size:14px">' + I('clock') + 'نۆرەکانی داهاتووی ئەمڕۆ</span><a class="small" href="#/appointments">خشتە</a></div>' + upcomingList(ids, 4) + '</section>';
    html += '</div>';
    html += '<div class="split">';
    if (fin) html += '<section class="card"><div class="card-head"><span class="card-title">' + I('bars') + 'داهاتی ئەم مانگە بەپێی دکتۆر</span><span class="card-sub">پسوولەکراو</span></div><div class="chart-box sm"><canvas id="ch-doc"></canvas></div></section>';
    else html += '<section class="card"><div class="card-head"><span class="card-title">' + I('globe') + 'داواکاری ئۆنلاین</span></div>' + Pages.appointments.requestsList(5) + '</section>';
    html += '<section class="card"><div class="card-head"><span class="card-title">' + I('history') + 'دوایین چالاکییەکان</span>' + (Store.can('view_audit') ? '<a class="small" href="#/admin?tab=audit">هەمووی</a>' : '') + '</div>' + feed(6) + '</section>';
    html += '</div>';
    return html;
  }

  function doctorView() {
    const me = Store.me, T = U.today(), ids = [me.id];
    const st = Store.liveStatus(me);
    const today = st.today.filter(Store.isActive);
    const mStart = U.startOfMonth(T);
    const billed = Store.billed(mStart, T, ids);
    const myPatients = Store.visiblePatients().length;
    const next = st.cur || st.next;
    let html = head(me.name, '', '<a class="btn" href="#/doctors/' + me.id + '">' + I('user') + 'پرۆفایلی من</a><button class="btn primary" data-new-appt>' + I('plus') + 'نۆرەی نوێ</button>');
    if (st.key === 'leave') html += '<div class="alert amber">' + I('info') + '<span>ئەمڕۆ لە مۆڵەتدایت: ' + esc(st.note || '') + '</span></div>';
    html += alertsCard(3);
    html += '<div class="grid g-4">' +
      UI.kpi('نۆرەکانی ئەمڕۆم', U.num(today.length), U.num(st.done) + ' تەواوبوو · ' + U.num(st.waiting ? st.waiting.length : 0) + ' چاوەڕوان', 'calendar', { href: '#/appointments' }) +
      UI.kpi('داهاتی ئەم مانگەم', U.moneyShort(billed) + ' <small>د.ع</small>', 'پشکی من (' + U.pct(me.share || 0) + '): ' + U.money(billed * (me.share || 0) / 100), 'wallet', { href: '#/doctors/' + me.id }) +
      UI.kpi('نەخۆشەکانم', U.num(myPatients), 'لە سیستەمدا', 'users', { href: '#/patients' }) +
      UI.kpi('ڕێژەی نەهاتن', U.pct(noShowRate(ids), 1), '٣٠ ڕۆژی ڕابردوو', 'alert') +
      '</div>';
    html += '<div class="split-r">';
    if (next) {
      const p = Store.patient(next.patientId);
      html += '<section class="next-card"><span class="eyebrow" style="color:var(--mint)">' + (st.cur ? 'نەخۆشی ئێستا' : 'نەخۆشی داهاتوو') + '</span>' +
        UI.who(p ? p.name : '—', U.fmtTime(next.start) + ' · ' + esc(Store.serviceName(next.serviceId)) + (next.tooth ? ' · ددانی ' + U.d(next.tooth) : ''), null, 'lg') +
        (p && p.allergies.length ? '<div class="alert red" style="margin:0">' + I('alert') + '<span>هەستیاری: ' + esc(p.allergies.join('، ')) + '</span></div>' : '') +
        (p && p.conditions.length ? '<div class="alert amber" style="margin:0">' + I('info') + '<span>' + esc(p.conditions.join('، ')) + '</span></div>' : '') +
        (next.note ? '<div class="small" style="color:rgba(255,255,255,.75)">تێبینی: ' + esc(next.note) + '</div>' : '') +
        '<div class="row wrap">' + (st.cur ? '<button class="btn accent" data-act="completed" data-id="' + next.id + '">' + I('check') + 'تەواوکردن</button>' : '<button class="btn accent" data-act="in_progress" data-id="' + next.id + '">' + I('play') + 'دەستپێکردن</button>') + '<a class="btn" href="#/patients/' + next.patientId + '" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff">' + I('file') + 'پەڕگەی نەخۆش</a></div></section>';
    } else html += '<section class="card">' + UI.empty('هیچ نەخۆشێکی تر ئەمڕۆ چاوەڕێت ناکات', 'check') + '</section>';
    html += '<section class="card"><div class="card-head"><span class="card-title">' + I('calendar') + 'خشتەی ئەمڕۆم</span><a class="small" href="#/appointments">بینینی خشتە</a></div>' + (st.today.length ? '<div class="list">' + st.today.slice().sort(U.by((a) => a.start)).map((a) => Pages.appointments.queueItem(a, { role: 'doctor' })).join('') + '</div>' : UI.empty('ئەمڕۆ هیچ نۆرەیەکت نییە', 'calendar')) + '</section>';
    html += '</div>';
    const labs = Store.db.labOrders.filter((l) => l.doctorId === me.id && l.status !== 'fitted').slice(0, 5);
    html += '<div class="split"><section class="card"><div class="card-head"><span class="card-title">' + I('chart') + 'نۆرەکانم — ١٤ ڕۆژی ڕابردوو</span></div><div class="chart-box sm"><canvas id="ch-appts"></canvas></div></section>' +
      '<section class="card"><div class="card-head"><span class="card-title">' + I('flask') + 'کارەکانی تاقیگە</span><a class="small" href="#/lab">هەمووی</a></div>' + (labs.length ? '<div class="list">' + labs.map((l) => '<div class="li"><span class="grow"><span class="t">' + esc(l.type) + (l.tooth ? ' · ' + U.d(l.tooth) : '') + '</span><span class="s">' + esc(Store.patientName(l.patientId)) + ' · ' + esc(l.lab) + '</span></span>' + UI.badge(Store.LAB_STATUS[l.status].label, Store.LAB_STATUS[l.status].cls) + '</div>').join('') + '</div>' : UI.empty('هیچ کارێکی کراوە نییە', 'flask')) + '</section></div>';
    return html;
  }

  function secretaryView() {
    const me = Store.me, T = U.today();
    const doc = Store.user(me.doctorId);
    if (!doc) return '<div class="card">' + UI.empty('هێشتا بە هیچ دکتۆرێکەوە نەبەستراویت. پەیوەندی بە خاوەنی کلینیکەوە بکە.', 'link') + '</div>';
    const ids = [doc.id];
    const st = Store.liveStatus(doc);
    const list = st.today.slice().sort(U.by((a) => a.start));
    const active = list.filter(Store.isActive);
    const remaining = active.filter((a) => ['scheduled', 'confirmed', 'arrived'].includes(a.status)).length;
    const tomorrow = Store.appts({ date: U.addDays(T, 1), doctorIds: ids }).filter(Store.isActive).sort(U.by((a) => a.start));
    let html = head('سکرتێری ' + doc.name, '', '<button class="btn" data-new-patient>' + I('user') + 'نەخۆشی نوێ</button><button class="btn primary" data-new-appt>' + I('plus') + 'نۆرەی نوێ</button>');
    html += '<div class="banner">' + UI.av(doc.name, doc.color) + '<span class="grow"><b>' + esc(doc.name) + '</b><small>' + esc(doc.specialty) + ' · ' + esc(Store.room(doc.room) ? Store.room(doc.room).name : '') + '</small></span>' + UI.badge(st.label, st.cls, true) + '</div>';
    html += alertsCard(4);
    html += '<div class="grid g-4">' +
      UI.kpi('نۆرەکانی ئەمڕۆ', U.num(active.length), U.num(st.done) + ' تەواوبوو · ' + U.num(remaining) + ' ماوە', 'calendar', { href: '#/appointments' }) +
      UI.kpi('لە ژووری چاوەڕوانی', U.num(st.waiting ? st.waiting.length : 0), st.cur ? 'دکتۆر لەگەڵ ' + esc(Store.patientName(st.cur.patientId)) + 'ە' : 'دکتۆر بەتاڵە', 'clock') +
      (Store.can('billing') ? UI.kpi('وەرگیراوی ئەمڕۆ', U.moneyShort(Store.collected(T, T, ids)) + ' <small>د.ع</small>', U.num(Store.paymentsIn(T, T, ids).length) + ' پارەدان', 'wallet', { href: '#/billing' }) : '') +
      UI.kpi('نۆرەکانی سبەی', U.num(tomorrow.length), U.num(tomorrow.filter((a) => !a.reminded).length) + ' بیرخستنەوە نەنێردراوە', 'whatsapp', { href: '#/appointments?panel=reminders' }) +
      '</div>';
    html += '<div class="split"><section class="card"><div class="card-head"><span class="card-title">' + I('list') + 'ڕیزی ئەمڕۆ</span><span class="card-sub">کلیک لە هەر نۆرەیەک بکە بۆ وردەکاری</span></div>' + (list.length ? '<div class="list">' + list.map((a) => Pages.appointments.queueItem(a, { role: 'secretary' })).join('') + '</div>' : UI.empty('ئەمڕۆ هیچ نۆرەیەک نییە', 'calendar', '<button class="btn primary sm" data-new-appt>' + I('plus') + 'نۆرەی نوێ</button>')) + '</section>';
    html += '<div class="stack"><section class="card"><div class="card-head"><span class="card-title">' + I('whatsapp') + 'بیرخستنەوەی سبەی</span></div>' + Pages.appointments.remindersList(tomorrow) + '</section>';
    html += '<section class="card"><div class="card-head"><span class="card-title">' + I('globe') + 'داواکاری ئۆنلاین</span></div>' + Pages.appointments.requestsList(4) + '</section>';
    if (Store.can('billing')) {
      const debts = Store.db.invoices.filter((i) => i.doctorId === doc.id && Store.invBalance(i) > 0).sort(U.by((i) => i.date)).slice(0, 5);
      html += '<section class="card"><div class="card-head"><span class="card-title">' + I('wallet') + 'قەرزی نەخۆشەکان</span><a class="small" href="#/billing?tab=debts">هەمووی</a></div>' + (debts.length ? '<div class="list">' + debts.map((i) => '<div class="li"><span class="grow"><a class="t" href="#/patients/' + i.patientId + '">' + esc(Store.patientName(i.patientId)) + '</a><span class="s">' + esc(i.no) + ' · ' + U.fmtDateShort(i.date) + '</span></span><b class="down nowrap">' + U.money(Store.invBalance(i)) + '</b><button class="btn xs" data-pay="' + i.id + '">وەرگرتن</button></div>').join('') + '</div>' : UI.empty('هیچ قەرزێک نییە', 'check')) + '</section>';
    }
    html += '</div></div>';
    return html;
  }

  Pages.dashboard = {
    title: 'داشبۆرد',
    render() {
      const role = Store.me.role;
      if (role === 'doctor') return doctorView();
      if (role === 'secretary') return secretaryView();
      return ownerView();
    },
    mount(root) {
      const T = U.today(), ids = Store.scopeDoctorIds();
      const rev = root.querySelector('#ch-rev');
      if (rev) { const s = revenueSeries(30, ids); Charts.line(rev, s.labels, [{ label: 'وەرگیراو', data: s.data }], { money: true }); }
      const cd = root.querySelector('#ch-doc');
      if (cd) {
        const docs = Store.doctors(true).filter((d) => ids.includes(d.id));
        Charts.bar(cd, docs.map((d) => d.name.replace('د. ', '')), [{ label: 'داهات', data: docs.map((d) => Store.billed(U.startOfMonth(T), T, [d.id])), colors: docs.map((d) => d.color) }], { money: true, horizontal: true });
      }
      const ca = root.querySelector('#ch-appts');
      if (ca) {
        const labels = [], done = [], miss = [];
        for (let i = 13; i >= 0; i--) {
          const d = U.addDays(T, -i);
          labels.push(U.fmtDateShort(d));
          const l = Store.appts({ date: d, doctorIds: ids });
          done.push(l.filter((a) => a.status === 'completed').length);
          miss.push(l.filter((a) => a.status === 'no_show' || a.status === 'cancelled').length);
        }
        Charts.bar(ca, labels, [{ label: 'تەواوبوو', data: done, color: '#67CDAB' }, { label: 'نەهات/هەڵوەشا', data: miss, color: '#E7A0A0' }], { stacked: true, legend: true });
      }
      Pages.appointments.bindQueue(root);
      Pages.appointments.bindRequests(root);
      root.querySelectorAll('[data-new-appt]').forEach((b) => b.addEventListener('click', () => Pages.appointments.openForm({})));
      root.querySelectorAll('[data-new-patient]').forEach((b) => b.addEventListener('click', () => Pages.patients.openForm()));
    }
  };
})();
