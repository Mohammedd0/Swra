/* Appointments: day / week / month / list views, booking, status workflow, reminders, online requests */
(function () {
  const esc = U.esc;
  const SLOT_H = 44;
  const state = { list: { q: '', status: '', doctor: '', from: '', to: '', page: 1 } };

  function scopedDocs() { return Store.scopedDoctors(true).filter((d) => d.active || Store.appts({ doctorIds: [d.id], from: U.today() }).length); }
  function slots() {
    const s = Store.db.settings, out = [];
    for (let m = U.toMin(s.open); m < U.toMin(s.close); m += 30) out.push(m);
    return out;
  }
  function timeOptions(selected) {
    const s = Store.db.settings, out = [];
    for (let m = U.toMin(s.open); m <= U.toMin(s.close) - 15; m += 15) out.push([U.fromMin(m), U.fmtTime(U.fromMin(m)) + ' ' + U.period(U.fromMin(m))]);
    return UI.opts(out, selected);
  }
  function apptLabel(a) { return Store.patientName(a.patientId) + ' · ' + Store.serviceName(a.serviceId); }
  function canEdit(a) { return Store.can('edit_appointments') && Store.inScope(a.doctorId); }
  function invoiceForAppt(a) { return Store.db.invoices.find((i) => i.apptId === a.id) || null; }

  /* ---------- quick status workflow ---------- */
  function actionsFor(a, role) {
    if (!canEdit(a)) return [];
    const T = U.today();
    const out = [];
    const isDoc = role === 'doctor' || (Store.me.role === 'doctor');
    if (['scheduled', 'confirmed'].includes(a.status)) {
      if (a.date === T && !isDoc) out.push(['arrived', 'گەیشت', 'check', 'primary']);
      if (a.date === T && isDoc) out.push(['in_progress', 'دەستپێکردن', 'play', 'primary']);
      if (a.status === 'scheduled' && a.date >= T) out.push(['confirmed', 'پشتڕاستکردنەوە', 'check', '']);
      if (a.date <= T) out.push(['no_show', 'نەهات', 'x', 'danger']);
    } else if (a.status === 'arrived') out.push(['in_progress', 'دەستپێکردن', 'play', 'primary']);
    else if (a.status === 'in_progress') out.push(['completed', 'تەواوکردن', 'check', 'accent']);
    return out;
  }
  function queueItem(a, o) {
    o = o || {};
    const p = Store.patient(a.patientId);
    const acts = actionsFor(a, o.role);
    const inv = invoiceForAppt(a);
    const s = Store.service(a.serviceId);
    let extra = '';
    if (a.status === 'completed' && Store.can('billing')) {
      if (!inv && s && s.price > 0) extra = '<button class="btn xs" data-inv-appt="' + a.id + '">' + I('receipt', 'sm') + 'پسوولە</button>';
      else if (inv && Store.invBalance(inv) > 0) extra = '<button class="btn xs" data-pay="' + inv.id + '">' + I('wallet', 'sm') + 'وەرگرتنی ' + U.moneyShort(Store.invBalance(inv)) + '</button>';
    }
    const wa = p && ['scheduled', 'confirmed'].includes(a.status) && a.date >= U.today() && Store.can('create_appointments') ? '<a class="btn xs wa" target="_blank" rel="noopener" href="' + U.waLink(p.phone, Store.reminderText(a)) + '" data-remind="' + a.id + '" aria-label="ناردنی بیرخستنەوە بە واتسئاپ">' + I('whatsapp', 'sm') + '</a>' : '';
    const alertIco = p && (p.allergies.length || p.conditions.length) ? ' <span title="' + esc(p.allergies.concat(p.conditions).join('، ')) + '" style="color:var(--red)">' + I('alert', 'sm') + '</span>' : '';
    return '<div class="queue-item">' +
      '<span class="time-pill">' + U.fmtTime(a.start) + '</span>' +
      '<span class="grow" style="display:flex;flex-direction:column;cursor:pointer" data-open-appt="' + a.id + '"><b style="font-weight:600">' + esc(p ? p.name : '—') + alertIco + '</b><span class="small muted">' + esc(Store.serviceName(a.serviceId)) + (a.tooth ? ' · ددانی ' + U.d(a.tooth) : '') + (o.showDoctor ? ' · ' + esc(Store.doctorName(a.doctorId)) : '') + ' · ' + U.num(a.duration) + ' خولەک</span></span>' +
      UI.status(a.status) +
      (o.compact ? '' : '<span class="row wrap" style="gap:6px">' + acts.map((x) => '<button class="btn xs ' + x[3] + '" data-act="' + x[0] + '" data-id="' + a.id + '">' + I(x[2], 'sm') + x[1] + '</button>').join('') + extra + wa + '</span>') +
      '</div>';
  }
  function bindQueue(root) {
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (act && act.dataset.id) { e.preventDefault(); setStatus(act.dataset.id, act.dataset.act); return; }
      const op = e.target.closest('[data-open-appt]');
      if (op) { openDetail(op.dataset.openAppt); return; }
      const ia = e.target.closest('[data-inv-appt]');
      if (ia) { const a = Store.db.appointments.find((x) => x.id === ia.dataset.invAppt); if (a) Pages.billing.openInvoiceForm({ appt: a }); return; }
      const pay = e.target.closest('[data-pay]');
      if (pay) { Pages.billing.openPayment(pay.dataset.pay); return; }
      const rm = e.target.closest('[data-remind]');
      if (rm) { const a = Store.db.appointments.find((x) => x.id === rm.dataset.remind); if (a && !a.reminded) { a.reminded = true; Store.commit('reminder', 'بیرخستنەوەی واتسئاپی نارد بۆ ' + Store.patientName(a.patientId), { silent: true }); } }
    });
  }

  function setStatus(id, st) {
    const a = Store.db.appointments.find((x) => x.id === id);
    if (!a) return;
    if (!canEdit(a)) { UI.toast('دەسەڵاتی گۆڕینی ئەم نۆرەیەت نییە', 'err'); return; }
    const prev = a.status;
    const doIt = (extra) => {
      Object.assign(a, { status: st }, extra || {});
      if (st === 'arrived') a.arrivedAt = U.stamp();
      if (st === 'in_progress') a.startedAt = U.stamp();
      if (st === 'completed') {
        a.completedAt = U.stamp();
        const p = Store.patient(a.patientId);
        const map = { sv_rct: 'rct', sv_rerct: 'rct', sv_crown: 'crown', sv_fill: 'filled', sv_kidfill: 'filled', sv_implant: 'implant', sv_ext: 'extracted', sv_wisdom: 'extracted', sv_vdirect: 'veneer', sv_emax: 'veneer' };
        if (p && a.tooth && map[a.serviceId]) p.teeth[a.tooth] = { status: map[a.serviceId], note: Store.serviceName(a.serviceId) + ' — ' + U.fmtDateShort(a.date), date: a.date };
        if (p && a.clinicalNote) p.clinical.push({ id: U.uid('cn'), date: a.date, doctorId: a.doctorId, text: a.clinicalNote, apptId: a.id });
        if (p) p.plan.filter((it) => it.status !== 'done' && it.serviceId === a.serviceId && (!it.tooth || it.tooth === a.tooth)).slice(0, 1).forEach((it) => { it.status = 'done'; it.doneAt = a.date; });
      }
      Store.commit('appointment', 'باری نۆرەی ' + Store.patientName(a.patientId) + ' گۆڕا: ' + Store.STATUS[prev].label + ' ← ' + Store.STATUS[st].label, { ref: a.id });
      UI.toast(Store.STATUS[st].label + ' — ' + Store.patientName(a.patientId));
      if (st === 'completed' && Store.can('billing') && !invoiceForAppt(a) && (Store.service(a.serviceId) || {}).price > 0) {
        UI.confirm({ title: 'پسوولە دروست بکرێت؟', text: 'چارەسەری «' + Store.serviceName(a.serviceId) + '» تەواو بوو. دەتەوێت ئێستا پسوولەکەی دروست بکەیت؟', ok: 'بەڵێ، پسوولە', cancel: 'دواتر' }).then((y) => { if (y) Pages.billing.openInvoiceForm({ appt: a }); });
      }
    };
    if (st === 'completed' && Store.can('edit_medical')) {
      const m = UI.modal({
        title: 'تەواوکردنی چارەسەر', size: 'narrow',
        body: '<div class="col" style="gap:2px"><b>' + esc(apptLabel(a)) + '</b><span class="small muted">' + (a.tooth ? 'ددانی ' + U.d(a.tooth) + ' — نەخشەی ددان خۆکارانە نوێ دەکرێتەوە' : '') + '</span></div>' + UI.field('تێبینی پزیشکی (دڵخواز)', '<textarea class="textarea" name="note" placeholder="نموونە: ٣ کەناڵ پڕکرانەوە، ئازاری نییە">' + esc(a.clinicalNote || '') + '</textarea>'),
        foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn accent" data-ok>' + I('check') + 'تەواوکردن</button>'
      });
      m.$('[data-ok]').addEventListener('click', () => { const n = m.$('[name=note]').value.trim(); m.close(); doIt({ clinicalNote: n }); });
      return;
    }
    if (st === 'no_show') {
      UI.confirm({ title: 'نەخۆش نەهات؟', text: Store.patientName(a.patientId) + ' وەک «نەهات» تۆمار دەکرێت. دەتوانیت دواتر نۆرەیەکی نوێی بۆ بگریت.', ok: 'بەڵێ، نەهات', danger: true }).then((y) => { if (y) doIt(); });
      return;
    }
    doIt();
  }

  /* ---------- booking form ---------- */
  function openForm(pre) {
    pre = pre || {};
    if (!Store.can('create_appointments') && !pre.id) { UI.toast('دەسەڵاتی گرتنی نۆرەت نییە', 'err'); return; }
    const editing = pre.id ? Store.db.appointments.find((x) => x.id === pre.id) : null;
    const a = Object.assign({ date: U.today(), start: '', duration: 30, status: 'confirmed', source: 'پێشوازی' }, editing || {}, pre);
    const docs = Store.scopedDoctors();
    if (!a.doctorId) a.doctorId = docs.length === 1 ? docs[0].id : (pre.doctorId || '');
    const services = Store.db.services.filter((s) => s.active || s.id === a.serviceId);
    const svcOpts = '<option value="">— خزمەتگوزاری هەڵبژێرە —</option>' + Object.entries(U.groupBy(services, (s) => s.category)).map(([cat, l]) => '<optgroup label="' + esc(cat) + '">' + l.map((s) => '<option value="' + s.id + '"' + (s.id === a.serviceId ? ' selected' : '') + '>' + esc(s.name) + ' — ' + U.num(s.duration) + ' خولەک</option>').join('') + '</optgroup>').join('');
    const teeth = [['', '— هیچ —']].concat(Seed.TEETH_UP.concat(Seed.TEETH_LO).map((t) => [t, U.d(t)]));
    const m = UI.modal({
      title: editing ? 'گۆڕینی نۆرە' : 'نۆرەی نوێ', size: 'wide', sticky: true,
      body: '<form class="form" id="af" novalidate>' +
        '<div class="field full"><label>نەخۆش <span class="req">*</span></label>' + Pages.patients.picker('patientId', a.patientId, { allowNew: true, newName: pre.newName, newPhone: pre.newPhone }) + '</div>' +
        UI.field('دکتۆر', '<select class="select" name="doctorId">' + UI.opts(docs, a.doctorId, '— دکتۆر هەڵبژێرە —') + '</select>', { req: true }) +
        UI.field('خزمەتگوزاری', '<select class="select" name="serviceId">' + svcOpts + '</select>', { req: true }) +
        UI.field('بەروار', '<input class="input" type="date" name="date" value="' + a.date + '" min="' + (editing ? '' : U.addDays(U.today(), -30)) + '">', { req: true }) +
        UI.field('کات', '<select class="select" name="start">' + '<option value="">— کات —</option>' + timeOptions(a.start) + '</select>', { req: true }) +
        UI.field('ماوە (خولەک)', '<select class="select" name="duration">' + UI.opts([15, 30, 45, 60, 75, 90, 120, 150, 180].map((n) => [n, U.num(n) + ' خولەک']), a.duration) + '</select>') +
        UI.field('ژمارەی ددان', '<select class="select" name="tooth">' + UI.opts(teeth, a.tooth || '') + '</select>', { hint: 'بۆ چارەسەری ددانێکی دیاریکراو' }) +
        UI.field('ژوور', '<select class="select" name="roomId">' + UI.opts(Store.db.rooms.filter((r) => r.active), a.roomId || '', '— خۆکار (ژووری دکتۆر) —') + '</select>') +
        UI.field('بار', '<select class="select" name="status">' + UI.opts(Object.entries(Store.STATUS).filter(([k]) => editing || ['scheduled', 'confirmed'].includes(k)).map(([k, v]) => [k, v.label]), a.status) + '</select>') +
        UI.field('سەرچاوەی نۆرە', '<select class="select" name="source">' + UI.opts(['پێشوازی', 'تەلەفۆن', 'واتسئاپ', 'ئینستاگرام', 'وێبسایت', 'ناساندن'].map((x) => [x, x]), a.source) + '</select>') +
        UI.field('تێبینی', '<textarea class="textarea" name="note" placeholder="هەر تێبینییەک بۆ پێشوازی یان دکتۆر" style="min-height:64px">' + esc(a.note || '') + '</textarea>', { full: true }) +
        '<div class="full" id="af-warn"></div>' +
        '</form>',
      foot: (editing && Store.can('edit_appointments') && editing.status !== 'cancelled' ? '<div class="left"><button class="btn danger" data-cancel-appt>' + I('x') + 'هەڵوەشاندنەوە</button></div>' : '') + '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-save>' + I('check') + (editing ? 'پاشەکەوتکردن' : 'تۆمارکردنی نۆرە') + '</button>'
    });
    const f = m.$('#af');
    Pages.patients.bindPicker(f);
    const warn = m.$('#af-warn');
    const check = () => {
      const d = UI.data(f);
      const msgs = [];
      if (d.date && Store.isClosedDay(d.date)) msgs.push(['red', 'ئەم ڕۆژە کلینیک داخراوە (' + U.DAYS[U.dow(d.date)] + ')']);
      if (d.doctorId && d.date) {
        const lv = Store.leaveFor(d.doctorId, d.date);
        if (lv) msgs.push(['red', Store.doctorName(d.doctorId) + ' لەو ڕۆژەدا لە مۆڵەتدایە: ' + lv.reason]);
      }
      if (d.date && d.date < U.today() && !editing) msgs.push(['amber', 'بەرواری ڕابردووت هەڵبژاردووە']);
      if (d.doctorId && d.date && d.start) {
        const probe = { id: editing ? editing.id : '_new', date: d.date, start: d.start, duration: Number(d.duration), doctorId: d.doctorId, roomId: d.roomId || (Store.user(d.doctorId) || {}).room, patientId: d.patientId };
        const c = Store.conflicts(probe);
        c.forEach((b) => msgs.push(['amber', 'پێکدادان: ' + U.fmtTime(b.start) + ' — ' + apptLabel(b) + ' (' + Store.doctorName(b.doctorId) + ')']));
        const end = U.toMin(d.start) + Number(d.duration);
        if (end > U.toMin(Store.db.settings.close)) msgs.push(['amber', 'نۆرەکە دوای کاتی داخستنی کلینیک تەواو دەبێت']);
      }
      if (d.patientId) {
        const p = Store.patient(d.patientId);
        if (p && p.allergies.length) msgs.push(['red', 'ئاگاداری: نەخۆش هەستیاری هەیە بە ' + p.allergies.join('، ')]);
        if (p && Store.patientBalance(p.id) > 0 && Store.can('billing')) msgs.push(['blue', 'ئەم نەخۆشە ' + U.money(Store.patientBalance(p.id)) + ' قەرزی ماوە']);
      }
      warn.innerHTML = msgs.map((x) => '<div class="alert ' + x[0] + '" style="margin-bottom:6px">' + I(x[0] === 'blue' ? 'info' : 'alert') + '<span>' + esc(x[1]) + '</span></div>').join('');
    };
    f.addEventListener('change', (e) => {
      if (e.target.name === 'serviceId') {
        const s = Store.service(e.target.value);
        if (s) { f.duration.value = String(Math.max(15, s.duration)); if (!f.duration.value) f.duration.value = '30'; f.tooth.closest('.field').style.opacity = s.perTooth ? '1' : '.55'; }
      }
      if (e.target.name === 'doctorId' && !f.roomId.value) { /* room auto */ }
      check();
    });
    f.addEventListener('picker', check);
    check();
    m.$('[data-save]').addEventListener('click', () => {
      const ok = UI.validate(f, {
        patientId: (v) => (v || f.querySelector('[data-new-name]') && f.querySelector('[data-new-name]').value.trim() ? null : 'نەخۆش هەڵبژێرە یان نەخۆشی نوێ تۆمار بکە'),
        doctorId: UI.req('دکتۆر هەڵبژێرە'), serviceId: UI.req('خزمەتگوزاری هەڵبژێرە'), date: UI.req('بەروار پێویستە'), start: UI.req('کات هەڵبژێرە')
      });
      if (!ok) return;
      let d = UI.data(f);
      if (!d.patientId) {
        const np = Pages.patients.createFromPicker(f);
        if (!np) return;
        d.patientId = np.id;
      }
      const doc = Store.user(d.doctorId);
      const rec = { patientId: d.patientId, doctorId: d.doctorId, serviceId: d.serviceId, date: d.date, start: d.start, duration: Number(d.duration), tooth: d.tooth ? Number(d.tooth) : null, roomId: d.roomId || (doc ? doc.room : null), status: d.status, source: d.source, note: d.note };
      const probe = Object.assign({ id: editing ? editing.id : '_new' }, rec);
      const conflicts = Store.conflicts(probe);
      const save = () => {
        if (editing) {
          const moved = editing.date !== rec.date || editing.start !== rec.start;
          Object.assign(editing, rec);
          if (moved) editing.reminded = false;
          Store.commit('appointment', 'نۆرەی ' + Store.patientName(rec.patientId) + ' گۆڕا بۆ ' + U.fmtDateShort(rec.date) + ' ' + U.fmtTime(rec.start), { ref: editing.id });
          UI.toast('گۆڕانکارییەکان پاشەکەوت کران');
        } else {
          const n = Object.assign({ id: U.uid('a'), createdBy: Store.me.id, createdAt: U.stamp(), reminded: false, clinicalNote: '' }, rec);
          Store.db.appointments.push(n);
          if (pre.requestId) { const rq = Store.db.requests.find((r) => r.id === pre.requestId); if (rq) rq.status = 'approved'; }
          Store.commit('appointment', 'نۆرەی نوێ بۆ ' + Store.patientName(rec.patientId) + ' — ' + U.fmtDateShort(rec.date) + ' ' + U.fmtTime(rec.start) + ' لای ' + Store.doctorName(rec.doctorId), { ref: n.id });
          UI.toast('نۆرەکە تۆمار کرا');
        }
        m.close();
      };
      if (conflicts.length) UI.confirm({ title: 'پێکدادانی کات', html: 'ئەم کاتە لەگەڵ ' + U.num(conflicts.length) + ' نۆرەی تر پێکدادان دەکات:<br>' + conflicts.map((b) => '• ' + U.fmtTime(b.start) + ' — ' + esc(apptLabel(b))).join('<br>') + '<br><br>هەر تۆماری بکەم؟', ok: 'بەڵێ، تۆماری بکە' }).then((y) => { if (y) save(); });
      else save();
    });
    const cb = m.$('[data-cancel-appt]');
    if (cb) cb.addEventListener('click', () => { m.close(); cancelAppt(editing.id); });
  }

  function cancelAppt(id) {
    const a = Store.db.appointments.find((x) => x.id === id);
    if (!a) return;
    const m = UI.modal({
      title: 'هەڵوەشاندنەوەی نۆرە', size: 'narrow',
      body: '<p style="margin:0">' + esc(apptLabel(a)) + '<br><span class="muted">' + U.fmtDate(a.date, true) + ' · ' + U.fmtTime(a.start) + '</span></p>' + UI.field('هۆکار', '<select class="select" name="reason">' + UI.opts(['نەخۆش داوای کرد', 'دکتۆر بەردەست نییە', 'نەخۆش نەخۆش کەوت', 'گۆڕین بۆ کاتێکی تر', 'هۆکاری تر'].map((x) => [x, x])) + '</select>'),
      foot: '<button class="btn" data-close>نەخێر</button><button class="btn danger solid" data-ok>هەڵوەشاندنەوە</button>'
    });
    m.$('[data-ok]').addEventListener('click', () => {
      a.status = 'cancelled';
      a.cancelReason = m.$('[name=reason]').value;
      Store.commit('appointment', 'نۆرەی ' + Store.patientName(a.patientId) + ' هەڵوەشێنرایەوە: ' + a.cancelReason, { ref: a.id });
      m.close();
      UI.toast('نۆرەکە هەڵوەشێنرایەوە', 'warn');
    });
  }

  function openDetail(id) {
    const a = Store.db.appointments.find((x) => x.id === id);
    if (!a) return;
    const p = Store.patient(a.patientId);
    const doc = Store.user(a.doctorId);
    const inv = invoiceForAppt(a);
    const acts = actionsFor(a);
    const edit = canEdit(a);
    const hist = p ? Store.appts({ patientId: p.id }).filter((x) => x.id !== a.id && x.status === 'completed').sort(U.by((x) => x.date, -1)).slice(0, 3) : [];
    const m = UI.modal({
      title: 'وردەکاری نۆرە',
      body: '<div class="row between wrap">' + UI.who(p ? p.name : '—', p ? 'پەڕگە #' + U.d(p.fileNo) + ' · ' + U.fmtPhone(p.phone) : '', null, 'lg') + UI.status(a.status) + '</div>' +
        (p && p.allergies.length ? '<div class="alert red">' + I('alert') + '<span>هەستیاری: ' + esc(p.allergies.join('، ')) + '</span></div>' : '') +
        (p && p.conditions.length ? '<div class="alert amber">' + I('info') + '<span>نەخۆشی: ' + esc(p.conditions.join('، ')) + '</span></div>' : '') +
        '<dl class="kv"><dt>خزمەتگوزاری</dt><dd>' + esc(Store.serviceName(a.serviceId)) + (a.tooth ? ' · ددانی <span class="latin">' + a.tooth + '</span>' : '') + '</dd>' +
        '<dt>کات</dt><dd>' + U.fmtDate(a.date, true) + ' · ' + U.fmtTime(a.start) + '–' + U.fmtTime(U.fromMin(Store.apptEnd(a))) + ' (' + U.num(a.duration) + ' خولەک)</dd>' +
        '<dt>دکتۆر</dt><dd>' + esc(doc ? doc.name : '—') + '</dd><dt>ژوور</dt><dd>' + esc(Store.room(a.roomId) ? Store.room(a.roomId).name : '—') + '</dd>' +
        '<dt>سەرچاوە</dt><dd>' + esc(a.source || '—') + '</dd>' +
        (a.note ? '<dt>تێبینی</dt><dd>' + esc(a.note) + '</dd>' : '') +
        (a.cancelReason ? '<dt>هۆکاری هەڵوەشاندنەوە</dt><dd>' + esc(a.cancelReason) + '</dd>' : '') +
        (a.clinicalNote && Store.can('view_medical') ? '<dt>تێبینی پزیشکی</dt><dd>' + esc(a.clinicalNote) + '</dd>' : '') +
        '<dt>بیرخستنەوە</dt><dd>' + (a.reminded ? UI.badge('نێردراوە', 'b-green') : UI.badge('نەنێردراوە', 'b-gray')) + '</dd>' +
        (inv && Store.can('billing') ? '<dt>پسوولە</dt><dd>' + esc(inv.no) + ' · ' + U.money(inv.total) + ' ' + UI.invBadge(inv) + '</dd>' : '') +
        '</dl>' +
        (hist.length ? '<div><div class="small muted" style="margin-bottom:4px">دوایین سەردانەکان</div>' + hist.map((h) => '<div class="small">• ' + U.fmtDateShort(h.date) + ' — ' + esc(Store.serviceName(h.serviceId)) + ' (' + esc(Store.doctorName(h.doctorId)) + ')</div>').join('') + '</div>' : ''),
      foot: '<div class="left">' + (p ? '<a class="btn sm" href="#/patients/' + p.id + '" data-close>' + I('file', 'sm') + 'پەڕگەی نەخۆش</a>' : '') +
        (p && ['scheduled', 'confirmed'].includes(a.status) && Store.can('create_appointments') ? '<a class="btn sm wa" target="_blank" rel="noopener" href="' + U.waLink(p.phone, Store.reminderText(a)) + '" data-remind>' + I('whatsapp', 'sm') + 'بیرخستنەوە</a>' : '') +
        (p ? '<a class="btn sm" href="tel:' + U.normPhone(p.phone) + '">' + I('phone', 'sm') + 'پەیوەندی</a>' : '') + '</div>' +
        (edit && !['completed', 'cancelled'].includes(a.status) ? '<button class="btn sm" data-edit>' + I('edit', 'sm') + 'گۆڕین</button>' : '') +
        (a.status === 'completed' && Store.can('billing') ? (inv ? (Store.invBalance(inv) > 0 ? '<button class="btn sm" data-pay>' + I('wallet', 'sm') + 'وەرگرتنی پارە</button>' : '<button class="btn sm" data-view-inv>' + I('receipt', 'sm') + 'پسوولە</button>') : '<button class="btn sm" data-new-inv>' + I('receipt', 'sm') + 'دروستکردنی پسوولە</button>') : '') +
        ((a.status === 'no_show' || a.status === 'cancelled') && Store.can('create_appointments') ? '<button class="btn sm primary" data-rebook>' + I('calendar', 'sm') + 'نۆرەی نوێ</button>' : '') +
        acts.map((x) => '<button class="btn sm ' + x[3] + '" data-st="' + x[0] + '">' + I(x[2], 'sm') + x[1] + '</button>').join('')
    });
    m.el.addEventListener('click', (e) => {
      const st = e.target.closest('[data-st]');
      if (st) { m.close(); setStatus(a.id, st.dataset.st); }
      if (e.target.closest('[data-edit]')) { m.close(); openForm({ id: a.id }); }
      if (e.target.closest('[data-pay]')) { m.close(); Pages.billing.openPayment(inv.id); }
      if (e.target.closest('[data-view-inv]')) { m.close(); Pages.billing.openInvoice(inv.id); }
      if (e.target.closest('[data-new-inv]')) { m.close(); Pages.billing.openInvoiceForm({ appt: a }); }
      if (e.target.closest('[data-rebook]')) { m.close(); openForm({ patientId: a.patientId, doctorId: a.doctorId, serviceId: a.serviceId, tooth: a.tooth, date: U.addDays(U.today(), 1), status: 'confirmed' }); }
      if (e.target.closest('[data-remind]') && !a.reminded) { a.reminded = true; Store.commit('reminder', 'بیرخستنەوەی واتسئاپی نارد بۆ ' + Store.patientName(a.patientId)); }
    });
  }

  /* ---------- side lists ---------- */
  function requestsList(limit) {
    const list = Store.db.requests.filter((r) => r.status === 'pending' && Store.inScope(r.doctorId));
    if (!list.length) return UI.empty('هیچ داواکارییەکی نوێ نییە', 'check');
    return '<div class="list">' + list.slice(0, limit || 50).map((r) => '<div class="li" style="flex-wrap:wrap"><span class="grow"><span class="t">' + esc(r.name) + ' · <span class="ltr">' + U.fmtPhone(r.phone) + '</span></span><span class="s">' + esc(r.service) + ' · ' + esc(r.source) + ' · ' + U.relDay(r.preferred.split(' ')[0]) + ' ' + U.fmtTime(r.preferred.split(' ')[1]) + (Store.can('view_all') ? ' · ' + esc(Store.doctorName(r.doctorId)) : '') + '</span></span><span class="row" style="gap:6px"><button class="btn xs primary" data-rq-ok="' + r.id + '">' + I('check', 'sm') + 'پەسەند</button><button class="btn xs" data-rq-no="' + r.id + '" aria-label="ڕەتکردنەوە">' + I('x', 'sm') + '</button></span></div>').join('') + '</div>';
  }
  function remindersList(list) {
    if (!list.length) return UI.empty('هیچ نۆرەیەک نییە', 'calendar');
    return '<div class="list">' + list.map((a) => { const p = Store.patient(a.patientId); return '<div class="li"><span class="time-pill" style="min-width:46px;font-size:13px">' + U.fmtTime(a.start) + '</span><span class="grow"><span class="t">' + esc(p ? p.name : '—') + '</span><span class="s">' + esc(Store.serviceName(a.serviceId)) + '</span></span>' + (a.reminded ? UI.badge('نێردرا', 'b-green') : '') + (p ? '<a class="btn xs wa" target="_blank" rel="noopener" href="' + U.waLink(p.phone, Store.reminderText(a)) + '" data-remind="' + a.id + '">' + I('whatsapp', 'sm') + 'ناردن</a>' : '') + '</div>'; }).join('') + '</div>';
  }
  function bindRequests(root) {
    root.addEventListener('click', (e) => {
      const ok = e.target.closest('[data-rq-ok]');
      if (ok) {
        const r = Store.db.requests.find((x) => x.id === ok.dataset.rqOk);
        if (!r) return;
        UI.closeAll();
        const existing = Store.db.patients.find((p) => U.normPhone(p.phone) === U.normPhone(r.phone));
        const [d, t] = r.preferred.split(' ');
        openForm({ patientId: existing ? existing.id : '', newName: existing ? '' : r.name, newPhone: existing ? '' : r.phone, doctorId: r.doctorId, date: d < U.today() ? U.today() : d, start: t, source: r.source === 'واتسئاپ' ? 'واتسئاپ' : r.source === 'ئینستاگرام' ? 'ئینستاگرام' : 'وێبسایت', note: r.service, requestId: r.id, status: 'confirmed' });
      }
      const no = e.target.closest('[data-rq-no]');
      if (no) {
        const r = Store.db.requests.find((x) => x.id === no.dataset.rqNo);
        UI.confirm({ title: 'ڕەتکردنەوەی داواکاری', text: 'داواکاری ' + r.name + ' ڕەت دەکرێتەوە.', ok: 'ڕەتکردنەوە', danger: true }).then((y) => { if (y) { r.status = 'rejected'; Store.commit('appointment', 'داواکاری ئۆنلاینی ' + r.name + ' ڕەت کرایەوە'); } });
      }
    });
  }

  /* ---------- views ---------- */
  function dayView(date) {
    const docs = scopedDocs();
    if (!docs.length) return UI.empty('هیچ دکتۆرێک نییە', 'stethoscope');
    const sl = slots();
    const closed = Store.isClosedDay(date);
    const cols = '64px repeat(' + docs.length + ',minmax(' + (docs.length === 1 ? 320 : 170) + 'px,1fr))';
    let html = '<div class="cal-wrap" id="calwrap"><div class="cal" style="grid-template-columns:' + cols + ';grid-template-rows:62px repeat(' + sl.length + ',' + SLOT_H + 'px)">';
    html += '<div class="cal-corner" style="grid-column:1;grid-row:1"></div>';
    docs.forEach((d, i) => {
      const n = Store.appts({ date, doctorIds: [d.id] }).filter(Store.isActive).length;
      html += '<div class="cal-head" style="grid-column:' + (i + 2) + ';grid-row:1">' + UI.who(d.name, U.num(n) + ' نۆرە · ' + esc(Store.room(d.room) ? Store.room(d.room).name : ''), d.color, 'sm') + '</div>';
    });
    sl.forEach((m, r) => {
      html += '<div class="cal-time" style="grid-column:1;grid-row:' + (r + 2) + '">' + (m % 60 === 0 ? U.fmtTime(U.fromMin(m)) : '') + '</div>';
      docs.forEach((d, i) => {
        const off = closed || !!Store.leaveFor(d.id, date) || !d.active || !Store.worksOn(d, date);
        html += '<div class="cal-cell ' + (m % 60 ? 'half' : '') + (off ? ' closed' : '') + '" style="grid-column:' + (i + 2) + ';grid-row:' + (r + 2) + '" ' + (off ? '' : 'data-slot="' + d.id + '|' + date + '|' + U.fromMin(m) + '"') + ' aria-label="' + esc(d.name + ' ' + U.fmtTime(U.fromMin(m))) + '"></div>';
      });
    });
    const open = U.toMin(Store.db.settings.open);
    docs.forEach((d, i) => {
      const lv = Store.leaveFor(d.id, date);
      if (lv) html += '<div class="appt st-leave" style="grid-column:' + (i + 2) + ';grid-row:2 / span ' + sl.length + ';align-items:center;justify-content:center;text-align:center;cursor:default"><b>مۆڵەت</b><span>' + esc(lv.reason) + '</span></div>';
      Store.appts({ date, doctorIds: [d.id] }).forEach((a) => {
        const row = Math.floor((U.toMin(a.start) - open) / 30) + 2;
        const span = Math.max(1, Math.ceil(a.duration / 30));
        if (row < 2) return;
        const p = Store.patient(a.patientId);
        html += '<div class="appt st-' + a.status + ' ' + (a.status === 'cancelled' ? 'cancelled' : '') + '" style="grid-column:' + (i + 2) + ';grid-row:' + row + ' / span ' + span + '" data-open-appt="' + a.id + '" tabindex="0" role="button" aria-label="' + esc(apptLabel(a)) + '"><b>' + esc(p ? p.name : '—') + (p && p.allergies.length ? ' ⚠' : '') + '</b><span>' + U.fmtTime(a.start) + ' · ' + esc(Store.serviceName(a.serviceId)) + (a.tooth ? ' · ' + U.d(a.tooth) : '') + '</span>' + (span > 1 ? '<span>' + esc(Store.STATUS[a.status].label) + '</span>' : '') + '</div>';
      });
    });
    if (date === U.today()) {
      const now = U.nowMin();
      if (now >= open && now <= U.toMin(Store.db.settings.close)) html += '<div class="now-line" style="top:' + (62 + ((now - open) / 30) * SLOT_H) + 'px"></div>';
    }
    html += '</div></div>';
    return html;
  }
  function weekView(date, docId) {
    const docs = scopedDocs();
    const doc = Store.user(docId) || docs[0];
    if (!doc) return UI.empty('هیچ دکتۆرێک نییە', 'stethoscope');
    const ws = U.startOfWeek(date);
    const days = [];
    for (let i = 0; i < 7; i++) { const d = U.addDays(ws, i); if (!Store.isClosedDay(d)) days.push(d); }
    const sl = slots(), open = U.toMin(Store.db.settings.open);
    let html = '<div class="cal-wrap" id="calwrap"><div class="cal" style="grid-template-columns:64px repeat(' + days.length + ',minmax(150px,1fr));grid-template-rows:62px repeat(' + sl.length + ',' + SLOT_H + 'px)"><div class="cal-corner" style="grid-column:1;grid-row:1"></div>';
    days.forEach((d, i) => {
      const n = Store.appts({ date: d, doctorIds: [doc.id] }).filter(Store.isActive).length;
      html += '<div class="cal-head" style="grid-column:' + (i + 2) + ';grid-row:1;flex-direction:column;align-items:flex-start;gap:0;cursor:pointer' + (d === U.today() ? ';box-shadow:inset 0 -3px 0 var(--mint)' : '') + '" data-goday="' + d + '"><b>' + U.DAYS[U.dow(d)] + '</b><span class="small muted">' + U.fmtDateShort(d) + ' · ' + U.num(n) + ' نۆرە</span></div>';
    });
    sl.forEach((m, r) => {
      html += '<div class="cal-time" style="grid-column:1;grid-row:' + (r + 2) + '">' + (m % 60 === 0 ? U.fmtTime(U.fromMin(m)) : '') + '</div>';
      days.forEach((d, i) => {
        const off = !!Store.leaveFor(doc.id, d) || !doc.active || !Store.worksOn(doc, d);
        html += '<div class="cal-cell ' + (m % 60 ? 'half' : '') + (off ? ' closed' : '') + '" style="grid-column:' + (i + 2) + ';grid-row:' + (r + 2) + '" ' + (off ? '' : 'data-slot="' + doc.id + '|' + d + '|' + U.fromMin(m) + '"') + '></div>';
      });
    });
    days.forEach((d, i) => {
      const lv = Store.leaveFor(doc.id, d);
      if (lv) html += '<div class="appt st-leave" style="grid-column:' + (i + 2) + ';grid-row:2 / span ' + sl.length + ';align-items:center;justify-content:center;text-align:center"><b>مۆڵەت</b><span>' + esc(lv.reason) + '</span></div>';
      Store.appts({ date: d, doctorIds: [doc.id] }).forEach((a) => {
        const row = Math.floor((U.toMin(a.start) - open) / 30) + 2;
        const span = Math.max(1, Math.ceil(a.duration / 30));
        html += '<div class="appt st-' + a.status + ' ' + (a.status === 'cancelled' ? 'cancelled' : '') + '" style="grid-column:' + (i + 2) + ';grid-row:' + row + ' / span ' + span + '" data-open-appt="' + a.id + '" tabindex="0" role="button"><b>' + esc(Store.patientName(a.patientId)) + '</b><span>' + U.fmtTime(a.start) + ' · ' + esc(Store.serviceName(a.serviceId)) + '</span></div>';
      });
    });
    html += '</div></div>';
    return html;
  }
  function monthView(date, docIds) {
    const ms = U.startOfMonth(date), me = U.endOfMonth(date);
    let start = U.startOfWeek(ms);
    const cells = [];
    for (let d = start; d <= me || cells.length % 7; d = U.addDays(d, 1)) cells.push(d);
    const counts = cells.map((d) => Store.appts({ date: d, doctorIds: docIds }).filter(Store.isActive).length);
    const max = Math.max(1, ...counts);
    const order = [6, 0, 1, 2, 3, 4, 5];
    return '<div class="month">' + order.map((w) => '<div class="dow">' + U.DAYS[w] + '</div>').join('') + cells.map((d, i) => {
      const closed = Store.isClosedDay(d);
      return '<a class="mday ' + (d.slice(0, 7) !== ms.slice(0, 7) ? 'other ' : '') + (d === U.today() ? 'today ' : '') + (closed ? 'closed' : '') + '" href="#/appointments?view=day&date=' + d + '"><span class="d">' + U.d(Number(d.slice(8))) + '</span>' + (closed ? '<span class="n">داخراوە</span>' : '<span class="n">' + U.num(counts[i]) + ' نۆرە</span>' + UI.bar((counts[i] / max) * 100, 'navy')) + '</a>';
    }).join('') + '</div>';
  }
  function listView(params) {
    const st = state.list;
    const T = U.today();
    if (params.filter === 'open' && !st._openApplied) { st.status = 'open'; st.from = ''; st.to = U.addDays(T, -1); st._openApplied = true; }
    const from = st.from || (st.status === 'open' ? '' : U.addDays(T, -7));
    const to = st.to || U.addDays(T, 14);
    let list = Store.appts({ from: from || undefined, to, doctorIds: st.doctor ? [st.doctor] : undefined });
    if (st.status === 'open') list = list.filter((a) => ['scheduled', 'confirmed', 'arrived', 'in_progress'].includes(a.status) && a.date < T);
    else if (st.status) list = list.filter((a) => a.status === st.status);
    if (st.q) list = list.filter((a) => { const p = Store.patient(a.patientId); return U.search((p ? p.name + ' ' + p.phone + ' ' + p.fileNo : '') + ' ' + Store.serviceName(a.serviceId), st.q); });
    list = list.slice().sort(U.by((a) => a.date + a.start, st.status === 'open' ? 1 : -1));
    const size = 25, pages = Math.max(1, Math.ceil(list.length / size));
    st.page = U.clamp(st.page, 1, pages);
    const rows = list.slice((st.page - 1) * size, st.page * size);
    const docs = Store.scopedDoctors(true);
    return '<div class="card flush"><div class="row wrap" style="padding:14px 18px;gap:10px;border-bottom:1px solid var(--border)">' +
      '<input class="input" style="max-width:240px" data-lf="q" placeholder="گەڕان بە ناو یان مۆبایل" value="' + esc(st.q) + '">' +
      (docs.length > 1 ? '<select class="select" style="max-width:200px" data-lf="doctor">' + UI.opts(docs, st.doctor, 'هەموو دکتۆرەکان') + '</select>' : '') +
      '<select class="select" style="max-width:200px" data-lf="status">' + UI.opts([['open', 'داخراو نەکراو (ڕابردوو)']].concat(Object.entries(Store.STATUS).map(([k, v]) => [k, v.label])), st.status, 'هەموو بارەکان') + '</select>' +
      '<label class="row small muted">لە<input class="input" type="date" style="width:150px" data-lf="from" value="' + esc(from) + '"></label><label class="row small muted">بۆ<input class="input" type="date" style="width:150px" data-lf="to" value="' + esc(to) + '"></label>' +
      '<span class="muted small" style="margin-inline-start:auto">' + U.num(list.length) + ' نۆرە</span></div>' +
      (rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>بەروار</th><th>کات</th><th>نەخۆش</th><th>خزمەتگوزاری</th>' + (docs.length > 1 ? '<th>دکتۆر</th>' : '') + '<th>بار</th><th>کردار</th></tr></thead><tbody>' + rows.map((a) => {
        const acts = actionsFor(a);
        return '<tr class="click" data-open-appt="' + a.id + '"><td class="nowrap">' + U.relDay(a.date) + '<div class="small muted">' + U.DAYS[U.dow(a.date)] + '</div></td><td class="nowrap">' + U.fmtTime(a.start) + '</td><td>' + esc(Store.patientName(a.patientId)) + '</td><td>' + esc(Store.serviceName(a.serviceId)) + (a.tooth ? ' <span class="muted latin">#' + a.tooth + '</span>' : '') + '</td>' + (docs.length > 1 ? '<td class="nowrap">' + esc(Store.doctorName(a.doctorId)) + '</td>' : '') + '<td>' + UI.status(a.status) + '</td><td><span class="row" style="gap:4px">' + acts.slice(0, 2).map((x) => '<button class="btn xs ' + x[3] + '" data-act="' + x[0] + '" data-id="' + a.id + '">' + x[1] + '</button>').join('') + '</span></td></tr>';
      }).join('') + '</tbody></table></div>' + UI.pager(list.length, st.page, size) : UI.empty('هیچ نۆرەیەک بەم فلتەرانە نییە', 'calendar')) + '</div>';
  }

  Pages.appointments = {
    title: 'نۆرەکان',
    queueItem, bindQueue, setStatus, openForm, openDetail, requestsList, remindersList, cancelAppt,
    render(r) {
      const p = r.params;
      const view = p.view || (window.innerWidth < 680 ? 'list' : 'day');
      const date = p.date || U.today();
      const docs = Store.scopedDoctors(true);
      const doc = p.doctor || (docs[0] && docs[0].id);
      const pend = Store.db.requests.filter((x) => x.status === 'pending' && Store.inScope(x.doctorId)).length;
      const tom = Store.appts({ date: U.addDays(U.today(), 1) }).filter((a) => Store.isActive(a) && !a.reminded).length;
      let title = view === 'month' ? U.fmtMonth(date.slice(0, 7)) : view === 'week' ? U.fmtDateShort(U.startOfWeek(date)) + ' – ' + U.fmtDateShort(U.addDays(U.startOfWeek(date), 6)) : view === 'list' ? 'لیستی نۆرەکان' : U.fmtDate(date, true);
      let html = '<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">نۆرەکان' + (Store.can('view_all') ? '' : ' · ' + esc(Store.scopeLabel())) + '</span><h1 class="page-title">' + esc(title) + '</h1></div><div class="row wrap">' +
        (Store.can('create_appointments') ? '<button class="btn" data-panel="requests">' + I('globe') + 'داواکاری ئۆنلاین' + (pend ? ' <span class="badge b-mint">' + U.num(pend) + '</span>' : '') + '</button><button class="btn" data-panel="reminders">' + I('whatsapp') + 'بیرخستنەوە' + (tom ? ' <span class="badge b-blue">' + U.num(tom) + '</span>' : '') + '</button><button class="btn accent" data-new>' + I('plus') + 'نۆرەی نوێ</button>' : '') + '</div></div>';
      html += '<div class="cal-toolbar"><div class="seg" role="tablist">' + [['day', 'ڕۆژ'], ['week', 'هەفتە'], ['month', 'مانگ'], ['list', 'لیست']].map((v) => '<button role="tab" class="' + (view === v[0] ? 'on' : '') + '" data-view="' + v[0] + '">' + v[1] + '</button>').join('') + '</div>' +
        (view !== 'list' ? '<div class="row"><button class="icon-btn" data-nav="-1" aria-label="پێشوو">' + I('chevR') + '</button><button class="btn" data-nav="0">ئەمڕۆ</button><button class="icon-btn" data-nav="1" aria-label="دواتر">' + I('chevL') + '</button><input class="input" type="date" value="' + date + '" data-date style="width:160px"></div>' : '') +
        (view === 'week' && docs.length > 1 ? '<select class="select" style="max-width:220px" data-doc>' + UI.opts(docs, doc) + '</select>' : '') +
        (view === 'day' || view === 'week' ? '<div class="legend">' + ['confirmed', 'arrived', 'in_progress', 'completed', 'no_show'].map((k) => '<span><i class="st-' + k + '" style="background:var(--ab);border:2px solid var(--ac)"></i>' + Store.STATUS[k].label + '</span>').join('') + '</div>' : '') + '</div>';
      if (view === 'day') html += dayView(date);
      else if (view === 'week') html += weekView(date, doc);
      else if (view === 'month') html += '<div class="card">' + monthView(date, Store.scopeDoctorIds()) + '</div>';
      else html += listView(p);
      if (view === 'day' && Store.isClosedDay(date)) html = html.replace('<div class="cal-wrap"', '<div class="alert amber">' + I('info') + '<span>ئەم ڕۆژە (' + U.DAYS[U.dow(date)] + ') کلینیک داخراوە.</span></div><div class="cal-wrap"');
      return html;
    },
    mount(root, r) {
      const p = r.params;
      const view = p.view || (window.innerWidth < 680 ? 'list' : 'day');
      const date = p.date || U.today();
      root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => App.setParams({ view: b.dataset.view })));
      root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
        const n = Number(b.dataset.nav);
        let d = U.today();
        if (n) d = view === 'month' ? U.addMonths(date, n) : view === 'week' ? U.addDays(date, 7 * n) : (() => { let x = U.addDays(date, n); while (Store.isClosedDay(x)) x = U.addDays(x, n); return x; })();
        App.setParams({ date: d === U.today() ? null : d });
      }));
      const di = root.querySelector('[data-date]');
      if (di) di.addEventListener('change', () => App.setParams({ date: di.value || null }));
      const ds = root.querySelector('[data-doc]');
      if (ds) ds.addEventListener('change', () => App.setParams({ doctor: ds.value }));
      root.querySelectorAll('[data-goday]').forEach((h) => h.addEventListener('click', () => App.setParams({ view: 'day', date: h.dataset.goday })));
      root.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => openForm({ date: date >= U.today() ? date : U.today() })));
      root.addEventListener('click', (e) => {
        const s = e.target.closest('[data-slot]');
        if (s && Store.can('create_appointments')) { const [doctorId, d, start] = s.dataset.slot.split('|'); openForm({ doctorId, date: d, start }); }
        const pg = e.target.closest('[data-page]');
        if (pg && !pg.disabled) { state.list.page = Number(pg.dataset.page); App.render(); }
        const pn = e.target.closest('[data-panel]');
        if (pn) Pages.appointments.panel(pn.dataset.panel);
      });
      root.addEventListener('keydown', (e) => { const t = e.target.closest('[data-open-appt]'); if (t && e.key === 'Enter') openDetail(t.dataset.openAppt); });
      bindQueue(root);
      bindRequests(root);
      root.querySelectorAll('[data-lf]').forEach((el) => {
        const k = el.dataset.lf;
        const fire = () => { state.list[k] = el.value; state.list.page = 1; if (k === 'status' && el.value !== 'open') state.list._openApplied = true; App.render(); const again = document.querySelector('[data-lf="' + k + '"]'); if (again && k === 'q') { again.focus(); again.setSelectionRange(again.value.length, again.value.length); } };
        el.addEventListener(k === 'q' ? 'input' : 'change', k === 'q' ? U.debounce(fire, 250) : fire);
      });
      const wrap = root.querySelector('#calwrap');
      if (wrap && view === 'day' && date === U.today()) {
        const open = U.toMin(Store.db.settings.open);
        wrap.scrollTop = Math.max(0, ((U.nowMin() - open) / 30) * SLOT_H - 120);
      }
      if (p.panel) { const pn = p.panel; history.replaceState(null, '', location.hash.replace(/[?&]panel=[^&]*/, '').replace(/\?$/, '')); setTimeout(() => Pages.appointments.panel(pn), 30); }
    },
    panel(kind) {
      if (kind === 'requests') {
        const m = UI.modal({ title: 'داواکاری نۆرەی ئۆنلاین', body: '<p class="muted small" style="margin:0">ئەم داواکارییانە لە وێبسایت، ئینستاگرام و واتسئاپەوە هاتوون. «پەسەند» فۆرمی نۆرە دەکاتەوە بە زانیارییەکانیانەوە.</p>' + requestsList() });
        bindRequests(m.el);
      }
      if (kind === 'reminders') {
        const draw = (d) => {
          const list = Store.appts({ date: d }).filter(Store.isActive).sort(U.by((a) => a.start));
          return '<div class="row wrap between"><input class="input" type="date" value="' + d + '" data-rdate style="max-width:180px"><span class="muted small">' + U.num(list.filter((a) => a.reminded).length) + ' لە ' + U.num(list.length) + ' نێردراوە</span></div><p class="muted small" style="margin:0">«ناردن» واتسئاپ دەکاتەوە بە نامەی ئامادەکراو. دەقی نامەکە لە ڕێکخستنەکاندا دەگۆڕدرێت.</p>' + remindersList(list) + (list.some((a) => !a.reminded) ? '<button class="btn sm" data-markall="' + d + '">' + I('check', 'sm') + 'هەموو وەک نێردراو نیشانە بکە</button>' : '');
        };
        let d = U.addDays(U.today(), 1);
        const m = UI.modal({ title: 'بیرخستنەوەی نۆرە', body: draw(d) });
        m.el.addEventListener('change', (e) => { if (e.target.matches('[data-rdate]')) { d = e.target.value; m.setBody(draw(d)); } });
        m.el.addEventListener('click', (e) => {
          const r = e.target.closest('[data-remind]');
          if (r) { const a = Store.db.appointments.find((x) => x.id === r.dataset.remind); if (a && !a.reminded) { a.reminded = true; Store.commit('reminder', 'بیرخستنەوەی واتسئاپی نارد بۆ ' + Store.patientName(a.patientId)); setTimeout(() => m.setBody(draw(d)), 200); } }
          const all = e.target.closest('[data-markall]');
          if (all) { Store.appts({ date: d }).forEach((a) => { a.reminded = true; }); Store.commit('reminder', 'هەموو بیرخستنەوەکانی ' + U.fmtDateShort(d) + ' نیشانە کران'); m.setBody(draw(d)); }
        });
      }
    }
  };
  Pages.appointments.bindRequests = bindRequests;
})();
