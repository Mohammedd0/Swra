/* Patients: list, profile with dental chart, treatment plan, clinical notes, files, prescriptions */
(function () {
  const esc = U.esc;
  const state = { q: '', chip: 'all', doctor: '', sort: 'recent', page: 1 };
  const ALLERGY_OPTS = ['پەنسلین', 'لاتێکس', 'ئەسپرین', 'لیدۆکایین', 'ئایبوپرۆفین', 'سەلفا'];
  const COND_OPTS = ['شەکرە', 'پەستانی خوێنی بەرز', 'نەخۆشی دڵ', 'ڕەبۆ', 'دووگیانی', 'خوێن ڕوون (وارفارین)', 'تایرۆید', 'هێپاتایتس'];
  const SOURCES = ['ئینستاگرام', 'ناساندن لەلایەن نەخۆشەوە', 'گووگڵ / نەخشە', 'وێبسایت', 'فەیسبووک', 'هاتنی ڕاستەوخۆ', 'تیکتۆک'];
  const MEDS = [
    ['Amoxicillin 500mg', '١ کەپسول', '٣ جار لە ڕۆژێکدا', '٥ ڕۆژ', 'penicillin'],
    ['Augmentin 1g', '١ حەب', '٢ جار لە ڕۆژێکدا', '٥ ڕۆژ', 'penicillin'],
    ['Azithromycin 500mg', '١ حەب', '١ جار لە ڕۆژێکدا', '٣ ڕۆژ', ''],
    ['Metronidazole 500mg', '١ حەب', '٣ جار لە ڕۆژێکدا', '٥ ڕۆژ', ''],
    ['Ibuprofen 400mg', '١ حەب', 'هەر ٨ کاتژمێر جارێک دوای نان', '٣ ڕۆژ', 'nsaid'],
    ['Paracetamol 500mg', '٢ حەب', 'هەر ٦ کاتژمێر جارێک لە کاتی ئازار', '٣ ڕۆژ', ''],
    ['Chlorhexidine 0.12% mouthwash', '١٥ مل', '٢ جار لە ڕۆژێکدا', '٧ ڕۆژ', ''],
    ['Dexamethasone 4mg', '١ حەب', '١ جار لە ڕۆژێکدا', '٢ ڕۆژ', '']
  ];

  function lastVisit(pid) {
    const l = Store.appts({ patientId: pid, allScopes: true }).filter((a) => a.status === 'completed').sort(U.by((a) => a.date, -1));
    return l[0] || null;
  }
  function nextAppt(pid) {
    const T = U.today();
    const l = Store.appts({ patientId: pid, allScopes: true }).filter((a) => a.date >= T && ['scheduled', 'confirmed', 'arrived'].includes(a.status)).sort(U.by((a) => a.date + a.start));
    return l[0] || null;
  }
  function tagBadges(p) {
    return p.allergies.map((x) => UI.badge('هەستیاری: ' + x, 'b-red')).join('') + p.conditions.map((x) => UI.badge(x, 'b-amber')).join('') + p.tags.map((x) => UI.badge(x, 'b-purple')).join('');
  }

  /* ---------- patient picker (used by appointment, invoice, lab forms) ---------- */
  function picker(name, value, o) {
    o = o || {};
    const p = value ? Store.patient(value) : null;
    const showNew = !p && (o.newName || o.newPhone);
    return '<div class="picker" data-picker style="position:relative">' +
      '<input type="hidden" name="' + name + '" value="' + esc(p ? p.id : '') + '">' +
      '<div class="picker-sel ' + (p ? '' : 'hidden') + '" style="display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border-2);border-radius:10px;padding:6px 10px;background:var(--surface-2)">' + (p ? UI.who(p.name, 'پەڕگە #' + U.d(p.fileNo) + ' · ' + U.fmtPhone(p.phone), null, 'sm') : '') + '<button type="button" class="btn xs" data-pchange>گۆڕین</button></div>' +
      '<input class="input ' + (p || showNew ? 'hidden' : '') + '" data-pq autocomplete="off" placeholder="گەڕان بە ناو، مۆبایل یان ژمارەی پەڕگە…">' +
      '<div class="search-results hidden" style="top:46px"></div>' +
      (o.allowNew ? '<div class="picker-new ' + (showNew ? '' : 'hidden') + '" style="border:1px dashed var(--mint-2);border-radius:12px;padding:12px;margin-top:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"><div class="field"><label>ناوی نەخۆشی نوێ <span class="req">*</span></label><input class="input" data-new-name value="' + esc(o.newName || '') + '"></div><div class="field"><label>مۆبایل <span class="req">*</span></label><input class="input" data-new-phone dir="ltr" style="text-align:right" placeholder="0750 123 4567" value="' + esc(o.newPhone || '') + '"></div><div class="full hint" style="grid-column:1/-1">پەڕگەیەکی نوێ دروست دەکرێت. دواتر دەتوانیت زانیاری زیاتری بۆ زیاد بکەیت. <button type="button" class="btn xs ghost" data-pcancel-new>پاشگەزبوونەوە</button></div></div>' : '') +
      '</div>';
  }
  function bindPicker(scope) {
    scope.querySelectorAll('[data-picker]').forEach((pk) => {
      const hid = pk.querySelector('input[type=hidden]');
      const q = pk.querySelector('[data-pq]');
      const box = pk.querySelector('.search-results');
      const sel = pk.querySelector('.picker-sel');
      const nw = pk.querySelector('.picker-new');
      const fire = () => pk.closest('form') && pk.closest('form').dispatchEvent(new Event('picker'));
      const choose = (p) => {
        hid.value = p.id;
        sel.innerHTML = UI.who(p.name, 'پەڕگە #' + U.d(p.fileNo) + ' · ' + U.fmtPhone(p.phone), null, 'sm') + '<button type="button" class="btn xs" data-pchange>گۆڕین</button>';
        sel.classList.remove('hidden');
        q.classList.add('hidden');
        box.classList.add('hidden');
        if (nw) nw.classList.add('hidden');
        hid.dispatchEvent(new Event('change', { bubbles: true }));
        fire();
      };
      const draw = () => {
        const s = q.value.trim();
        const list = Store.visiblePatients().filter((p) => !s || U.search(p.name + ' ' + p.phone + ' ' + p.fileNo, s)).slice(0, 8);
        box.innerHTML = list.map((p) => '<a href="#" class="search-item" data-pid="' + p.id + '">' + UI.who(p.name, 'پەڕگە #' + U.d(p.fileNo) + ' · ' + U.fmtPhone(p.phone), null, 'sm') + '</a>').join('') + (nw ? '<a href="#" class="search-item" data-pnew>' + I('plus') + '<span>نەخۆشی نوێ' + (s ? ': «' + esc(s) + '»' : '') + '</span></a>' : '') + (!list.length && !nw ? '<div class="empty" style="padding:14px">هیچ نەخۆشێک نەدۆزرایەوە</div>' : '');
        box.classList.remove('hidden');
      };
      q.addEventListener('input', U.debounce(draw, 120));
      q.addEventListener('focus', draw);
      box.addEventListener('mousedown', (e) => e.preventDefault());
      box.addEventListener('click', (e) => {
        e.preventDefault();
        const a = e.target.closest('[data-pid]');
        if (a) choose(Store.patient(a.dataset.pid));
        if (e.target.closest('[data-pnew]')) {
          const s = q.value.trim();
          nw.classList.remove('hidden');
          q.classList.add('hidden');
          box.classList.add('hidden');
          if (/\d/.test(s)) nw.querySelector('[data-new-phone]').value = s; else nw.querySelector('[data-new-name]').value = s;
          nw.querySelector(/\d/.test(s) ? '[data-new-name]' : '[data-new-phone]').focus();
          fire();
        }
      });
      q.addEventListener('blur', () => setTimeout(() => box.classList.add('hidden'), 150));
      pk.addEventListener('click', (e) => {
        if (e.target.closest('[data-pchange]')) { hid.value = ''; sel.classList.add('hidden'); q.classList.remove('hidden'); q.value = ''; q.focus(); fire(); }
        if (e.target.closest('[data-pcancel-new]')) { nw.classList.add('hidden'); q.classList.remove('hidden'); q.focus(); }
      });
    });
  }
  function createFromPicker(form) {
    const n = form.querySelector('[data-new-name]'), ph = form.querySelector('[data-new-phone]');
    if (!n) return null;
    const name = n.value.trim(), phone = U.normPhone(ph.value);
    let bad = false;
    [[n, name ? null : 'ناو پێویستە'], [ph, /^07\d{9}$/.test(phone) ? null : 'ژمارەی مۆبایل دروست نییە']].forEach(([el, msg]) => { el.classList.toggle('err', !!msg); if (msg) { bad = true; UI.toast(msg, 'err'); } });
    if (bad) return null;
    const dup = Store.db.patients.find((p) => U.normPhone(p.phone) === phone);
    if (dup) return dup;
    const docSel = form.querySelector('[name=doctorId]');
    const p = newPatient({ name, phone, doctorId: (docSel && docSel.value) || Store.scopeDoctorIds()[0] || '' });
    Store.db.patients.push(p);
    Store.commit('patient', 'پەڕگەی نوێ بۆ ' + name + ' دروست کرا', { ref: p.id, silent: true });
    return p;
  }
  function newPatient(d) {
    return Object.assign({ id: U.uid('p'), fileNo: Store.nextFileNo(), name: '', gender: '', dob: '', phone: '', phone2: '', address: '', source: 'هاتنی ڕاستەوخۆ', doctorId: '', allergies: [], conditions: [], tags: [], notes: '', createdAt: U.today(), teeth: {}, plan: [], files: [], clinical: [], prescriptions: [] }, d);
  }

  /* ---------- create / edit ---------- */
  function openForm(pre) {
    pre = pre || {};
    if (!Store.can('manage_patients')) { UI.toast('دەسەڵاتی تۆمارکردنی نەخۆشت نییە', 'err'); return; }
    const editing = pre.id ? Store.patient(pre.id) : null;
    const p = Object.assign(newPatient({}), editing || {}, editing ? {} : pre);
    const docs = Store.scopedDoctors();
    if (!p.doctorId && docs.length === 1) p.doctorId = docs[0].id;
    const chk = (name, opts, sel) => '<div class="chips">' + opts.map((o) => '<label class="chip" style="cursor:pointer"><input type="checkbox" name="' + name + '" data-multi="1" value="' + esc(o) + '"' + (sel.includes(o) ? ' checked' : '') + ' style="accent-color:var(--navy)">' + esc(o) + '</label>').join('') + '</div>';
    const otherAll = p.allergies.filter((x) => !ALLERGY_OPTS.includes(x)).join('، ');
    const m = UI.modal({
      title: editing ? 'دەستکاری پەڕگەی ' + p.name : 'تۆمارکردنی نەخۆشی نوێ', size: 'wide', sticky: true,
      body: '<form class="form" id="pf" novalidate>' +
        UI.field('ناوی تەواو', '<input class="input" name="name" value="' + esc(p.name) + '" placeholder="ناو و ناوی باوک">', { req: true }) +
        UI.field('ژمارەی مۆبایل', '<input class="input" name="phone" dir="ltr" style="text-align:right" value="' + esc(p.phone) + '" placeholder="0750 123 4567">', { req: true }) +
        UI.field('ژمارەی دووەم', '<input class="input" name="phone2" dir="ltr" style="text-align:right" value="' + esc(p.phone2 || '') + '" placeholder="دڵخواز">') +
        UI.field('ڕەگەز', '<select class="select" name="gender">' + UI.opts([['f', 'مێ'], ['m', 'نێر']], p.gender, '—') + '</select>') +
        UI.field('بەرواری لەدایکبوون', '<input class="input" type="date" name="dob" value="' + esc(p.dob || '') + '" max="' + U.today() + '">') +
        UI.field('ناونیشان', '<input class="input" name="address" value="' + esc(p.address || '') + '" placeholder="هەولێر — گەڕەک">') +
        UI.field('دکتۆری سەرەکی', '<select class="select" name="doctorId">' + UI.opts(docs, p.doctorId, '—') + '</select>', { req: true }) +
        UI.field('چۆن ئاشنای کلینیک بوو؟', '<select class="select" name="source">' + UI.opts(SOURCES.map((s) => [s, s]), p.source) + '</select>') +
        '<div class="field full"><span class="lbl">هەستیاری</span>' + chk('allergies', ALLERGY_OPTS, p.allergies) + '<input class="input" name="allergyOther" placeholder="هەستیاری تر (بە کۆما جیا بکەرەوە)" value="' + esc(otherAll) + '"></div>' +
        '<div class="field full"><span class="lbl">نەخۆشی و باری تەندروستی</span>' + chk('conditions', COND_OPTS, p.conditions) + '</div>' +
        '<div class="field full"><span class="lbl">نیشانە</span>' + chk('tags', ['VIP', 'ترس لە ددانساز', 'منداڵ', 'گەشتیار', 'کارمەندی کلینیک'], p.tags) + '</div>' +
        UI.field('تێبینی گشتی', '<textarea class="textarea" name="notes" placeholder="هەر زانیارییەکی تر">' + esc(p.notes || '') + '</textarea>', { full: true }) +
        '<div class="full" id="pf-dup"></div></form>',
      foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-save>' + I('check') + (editing ? 'پاشەکەوتکردن' : 'تۆمارکردن') + '</button>'
    });
    const f = m.$('#pf');
    const dupBox = m.$('#pf-dup');
    f.phone.addEventListener('input', U.debounce(() => {
      const n = U.normPhone(f.phone.value);
      const dup = n.length >= 10 && Store.db.patients.find((x) => x.id !== p.id && U.normPhone(x.phone) === n);
      dupBox.innerHTML = dup ? '<div class="alert amber">' + I('alert') + '<span>نەخۆشێک بەم ژمارەیەوە هەیە: <a href="#/patients/' + dup.id + '" data-close>' + esc(dup.name) + ' (#' + U.d(dup.fileNo) + ')</a></span></div>' : '';
    }, 250));
    m.$('[data-save]').addEventListener('click', () => {
      if (!UI.validate(f, { name: UI.req('ناو پێویستە'), phone: UI.phoneRule(true), phone2: UI.phoneRule(false), doctorId: UI.req('دکتۆری سەرەکی هەڵبژێرە') })) return;
      const d = UI.data(f);
      const allergies = (d.allergies || []).concat((d.allergyOther || '').split(/[،,]/).map((x) => x.trim()).filter(Boolean));
      const rec = { name: d.name, phone: U.normPhone(d.phone), phone2: d.phone2 ? U.normPhone(d.phone2) : '', gender: d.gender, dob: d.dob, address: d.address, doctorId: d.doctorId, source: d.source, allergies, conditions: d.conditions || [], tags: d.tags || [], notes: d.notes };
      if (editing) {
        Object.assign(editing, rec);
        Store.commit('patient', 'زانیاری ' + rec.name + ' نوێ کرایەوە', { ref: editing.id });
        UI.toast('پەڕگەکە نوێ کرایەوە');
        m.close();
      } else {
        const np = newPatient(rec);
        Store.db.patients.push(np);
        Store.commit('patient', 'پەڕگەی نوێ بۆ ' + rec.name + ' دروست کرا (#' + np.fileNo + ')', { ref: np.id });
        UI.toast('نەخۆشەکە تۆمار کرا — پەڕگە #' + U.d(np.fileNo));
        m.close();
        if (pre.after) pre.after(np); else App.go('#/patients/' + np.id);
      }
    });
  }

  /* ---------- list ---------- */
  function renderList() {
    const all = Store.visiblePatients();
    const T = U.today();
    const fin = Store.can('billing') || Store.can('view_finance');
    const counts = {
      all: all.length,
      debt: fin ? all.filter((p) => Store.patientBalance(p.id) > 0).length : 0,
      plan: all.filter((p) => p.plan.some((x) => x.status !== 'done')).length,
      new: all.filter((p) => p.createdAt >= U.startOfMonth(T)).length,
      alert: all.filter((p) => p.allergies.length || p.conditions.length).length,
      vip: all.filter((p) => p.tags.includes('VIP')).length
    };
    let list = all;
    if (state.chip === 'debt') list = list.filter((p) => Store.patientBalance(p.id) > 0);
    if (state.chip === 'plan') list = list.filter((p) => p.plan.some((x) => x.status !== 'done'));
    if (state.chip === 'new') list = list.filter((p) => p.createdAt >= U.startOfMonth(T));
    if (state.chip === 'alert') list = list.filter((p) => p.allergies.length || p.conditions.length);
    if (state.chip === 'vip') list = list.filter((p) => p.tags.includes('VIP'));
    if (state.doctor) list = list.filter((p) => p.doctorId === state.doctor);
    if (state.q) list = list.filter((p) => U.search(p.name + ' ' + p.phone + ' ' + (p.phone2 || '') + ' ' + p.fileNo + ' ' + (p.address || ''), state.q));
    const lv = {};
    list.forEach((p) => { const l = lastVisit(p.id); lv[p.id] = l ? l.date : ''; });
    if (state.sort === 'recent') list = list.slice().sort(U.by((p) => lv[p.id] || p.createdAt, -1));
    if (state.sort === 'name') list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'ckb'));
    if (state.sort === 'new') list = list.slice().sort(U.by((p) => p.createdAt + String(p.fileNo).padStart(6, '0'), -1));
    if (state.sort === 'debt') list = list.slice().sort(U.by((p) => Store.patientBalance(p.id), -1));
    const size = 20, pages = Math.max(1, Math.ceil(list.length / size));
    state.page = U.clamp(state.page, 1, pages);
    const rows = list.slice((state.page - 1) * size, state.page * size);
    const docs = Store.scopedDoctors(true);
    const chips = [['all', 'هەموو'], fin ? ['debt', 'قەرزدار'] : null, ['plan', 'پلانی کراوە'], ['new', 'نوێی ئەم مانگە'], ['alert', 'ئاگاداری پزیشکی'], ['vip', 'VIP']].filter(Boolean);
    return '<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">نەخۆشەکان' + (Store.can('view_all') ? '' : ' · ' + esc(Store.scopeLabel())) + '</span><h1 class="page-title">' + U.num(all.length) + ' نەخۆش</h1></div><div class="row wrap">' + (Store.can('export_data') ? '<button class="btn" data-export>' + I('download') + 'هەناردە (Excel)</button>' : '') + (Store.can('manage_patients') ? '<button class="btn accent" data-new>' + I('plus') + 'نەخۆشی نوێ</button>' : '') + '</div></div>' +
      '<div class="card flush"><div style="padding:14px 18px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--border)"><div class="row wrap" style="gap:10px"><div class="search" style="max-width:340px">' + I('search') + '<input data-q placeholder="ناو، مۆبایل، ژمارەی پەڕگە یان ناونیشان" value="' + esc(state.q) + '" style="padding-inline-end:12px"></div>' +
      (docs.length > 1 ? '<select class="select" style="max-width:200px" data-doctor>' + UI.opts(docs, state.doctor, 'هەموو دکتۆرەکان') + '</select>' : '') +
      '<select class="select" style="max-width:190px" data-sort>' + UI.opts([['recent', 'دوایین سەردان'], ['new', 'نوێترین تۆمار'], ['name', 'ناو (ئەلفوبێ)']].concat(fin ? [['debt', 'زۆرترین قەرز']] : []), state.sort) + '</select></div>' +
      '<div class="chips">' + chips.map((c) => '<button class="chip ' + (state.chip === c[0] ? 'on' : '') + '" data-chip="' + c[0] + '">' + c[1] + ' <span class="cnt">' + U.num(counts[c[0]]) + '</span></button>').join('') + '</div></div>' +
      (rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>نەخۆش</th><th>مۆبایل</th>' + (docs.length > 1 ? '<th>دکتۆر</th>' : '') + '<th>دوایین سەردان</th><th>نۆرەی داهاتوو</th>' + (fin ? '<th class="num">قەرز</th>' : '') + '<th>ئاگاداری</th></tr></thead><tbody>' + rows.map((p) => {
        const nx = nextAppt(p.id);
        const bal = fin ? Store.patientBalance(p.id) : 0;
        const age = U.age(p.dob);
        return '<tr class="click" data-href="#/patients/' + p.id + '"><td>' + UI.who(p.name, '#' + U.d(p.fileNo) + (age !== null ? ' · ' + U.num(age) + ' ساڵ' : '') + (p.gender ? ' · ' + (p.gender === 'f' ? 'مێ' : 'نێر') : '')) + '</td><td class="nowrap ltr" style="text-align:right">' + U.fmtPhone(p.phone) + '</td>' + (docs.length > 1 ? '<td class="nowrap">' + esc(Store.doctorName(p.doctorId)) + '</td>' : '') + '<td class="nowrap">' + (lv[p.id] ? U.relDay(lv[p.id]) : '<span class="muted">—</span>') + '</td><td class="nowrap">' + (nx ? U.relDay(nx.date) + ' ' + U.fmtTime(nx.start) : '<span class="muted">—</span>') + '</td>' + (fin ? '<td class="num">' + (bal > 0 ? '<b class="down">' + U.money(bal) + '</b>' : '<span class="muted">—</span>') + '</td>' : '') + '<td><div class="tags">' + (p.allergies.length ? UI.badge('هەستیاری', 'b-red') : '') + (p.conditions.length ? UI.badge(p.conditions[0], 'b-amber') : '') + (p.tags.includes('VIP') ? UI.badge('VIP', 'b-purple') : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' + UI.pager(list.length, state.page, size) : UI.empty('هیچ نەخۆشێک بەم گەڕانە نەدۆزرایەوە', 'users', Store.can('manage_patients') ? '<button class="btn sm primary" data-new>' + I('plus', 'sm') + 'تۆمارکردنی نەخۆشی نوێ</button>' : '')) + '</div>';
  }

  /* ---------- profile ---------- */
  function toothCell(n, p, lower) {
    const t = p.teeth[n];
    const st = t ? Store.TOOTH[t.status] : null;
    const planned = p.plan.some((x) => x.tooth === n && x.status !== 'done');
    return '<button type="button" class="tooth ' + (lower ? 'lower ' : '') + (st ? st.cls : '') + '" data-tooth="' + n + '" title="' + esc((st ? st.label : 'سالم') + (t && t.note ? ' — ' + t.note : '')) + '" aria-label="ددانی ' + n + ' ' + esc(st ? st.label : 'سالم') + '"><span class="num">' + n + '</span><span class="lab">' + (st ? esc(st.short || '') : '') + '</span>' + (planned ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--red)"></span>' : '') + '</button>';
  }
  function chartHtml(p) {
    const row = (arr, lower) => '<div class="tooth-row">' + arr.map((n) => toothCell(n, p, lower)).join('') + '</div>';
    return '<div class="table-wrap"><div class="tooth-chart"><div class="row between small muted"><span>ڕاست</span><span>ژوورەوە</span><span>چەپ</span></div>' + row(Seed.TEETH_UP) + '<div class="jaw-sep"></div>' + row(Seed.TEETH_LO, true) + '</div></div>' +
      '<div class="legend" style="margin-top:12px">' + Object.entries(Store.TOOTH).map(([k, v]) => '<span><i class="tooth ' + v.cls + '" style="height:14px;width:14px;border-radius:4px;display:inline-block;padding:0"></i>' + esc(v.label) + '</span>').join('') + '<span><i style="width:8px;height:8px;border-radius:50%;background:var(--red)"></i>لە پلانی چارەسەردایە</span></div>';
  }
  function renderProfile(id, tab) {
    const p = Store.patient(id);
    if (!p) return '<div class="card">' + UI.empty('ئەم نەخۆشە نەدۆزرایەوە', 'users', '<a class="btn" href="#/patients">گەڕانەوە بۆ لیست</a>') + '</div>';
    if (!Store.canSeePatient(p)) return '<div class="card">' + UI.empty('ئەم نەخۆشە سەر بە دکتۆرێکی ترە و دەسەڵاتی بینینیت نییە', 'lock', '<a class="btn" href="#/patients">گەڕانەوە</a>') + '</div>';
    const med = Store.can('view_medical');
    const fin = Store.can('billing') || Store.can('view_finance');
    const T = U.today();
    const appts = Store.appts({ patientId: p.id, allScopes: true }).slice().sort(U.by((a) => a.date + a.start, -1));
    const done = appts.filter((a) => a.status === 'completed');
    const nx = nextAppt(p.id);
    const age = U.age(p.dob);
    const tabs = [['overview', 'کورتە', 'user'], med ? ['chart', 'نەخشەی ددان', 'tooth'] : null, ['plan', 'پلانی چارەسەر', 'list'], ['visits', 'سەردانەکان', 'calendar'], fin ? ['billing', 'پارە', 'wallet'] : null, med ? ['clinical', 'تێبینی پزیشکی', 'file'] : null, ['files', 'تیشک و فایل', 'image']].filter(Boolean);
    if (!tabs.find((t) => t[0] === tab)) tab = 'overview';
    let html = '<div class="row"><a class="btn ghost sm" href="#/patients">' + I('chevR', 'sm') + 'نەخۆشەکان</a></div>';
    html += '<section class="card"><div class="p-head"><div class="who">' + UI.av(p.name, null, 'xl') + '<span class="col" style="gap:2px"><span class="small muted">پەڕگەی ژمارە #' + U.d(p.fileNo) + ' · تۆمارکراو ' + U.fmtDateShort(p.createdAt) + '</span><b>' + esc(p.name) + '</b><span class="small muted">' + (p.gender ? (p.gender === 'f' ? 'مێ' : 'نێر') + ' · ' : '') + (age !== null ? U.num(age) + ' ساڵ · ' : '') + '<span class="ltr">' + U.fmtPhone(p.phone) + '</span> · ' + esc(Store.doctorName(p.doctorId)) + '</span><div class="tags" style="margin-top:6px">' + tagBadges(p) + '</div></span></div>' +
      '<div class="row wrap">' +
      '<a class="btn sm" href="tel:' + U.normPhone(p.phone) + '">' + I('phone', 'sm') + 'پەیوەندی</a><a class="btn sm wa" target="_blank" rel="noopener" href="' + U.waLink(p.phone, 'سڵاو ' + p.name + '، ') + '">' + I('whatsapp', 'sm') + 'واتسئاپ</a>' +
      (Store.can('manage_patients') ? '<button class="btn sm" data-edit>' + I('edit', 'sm') + 'دەستکاری</button>' : '') +
      (Store.can('edit_medical') ? '<button class="btn sm" data-rx>' + I('pill', 'sm') + 'ڕەچەتە</button>' : '') +
      (Store.can('billing') ? '<button class="btn sm" data-inv>' + I('receipt', 'sm') + 'پسوولە</button>' : '') +
      (Store.can('create_appointments') ? '<button class="btn sm primary" data-book>' + I('calendar', 'sm') + 'نۆرە بگرە</button>' : '') + '</div></div>' +
      '<div class="divider" style="margin:16px 0"></div><div class="stat-inline">' +
      '<span class="col"><span class="small muted">سەردانی تەواوبوو</span><b>' + U.num(done.length) + '</b></span>' +
      '<span class="col"><span class="small muted">دوایین سەردان</span><b>' + (done[0] ? U.relDay(done[0].date) : '—') + '</b></span>' +
      '<span class="col"><span class="small muted">نۆرەی داهاتوو</span><b>' + (nx ? U.relDay(nx.date) + ' ' + U.fmtTime(nx.start) : '—') + '</b></span>' +
      '<span class="col"><span class="small muted">نەهاتن</span><b>' + U.num(appts.filter((a) => a.status === 'no_show').length) + '</b></span>' +
      (fin ? '<span class="col"><span class="small muted">کۆی دراو</span><b>' + U.money(Store.patientPaid(p.id)) + '</b></span><span class="col"><span class="small muted">قەرزی ماوە</span><b class="' + (Store.patientBalance(p.id) ? 'down' : '') + '">' + U.money(Store.patientBalance(p.id)) + '</b></span>' : '') +
      '</div></section>';
    html += '<div class="tabs" role="tablist">' + tabs.map((t) => '<button class="tab ' + (t[0] === tab ? 'on' : '') + '" role="tab" data-tab="' + t[0] + '">' + I(t[2], 'sm') + t[1] + '</button>').join('') + '</div>';

    if (tab === 'overview') {
      html += '<div class="split"><section class="card"><div class="card-head"><span class="card-title">زانیاری کەسی</span></div><dl class="kv">' +
        '<dt>ناو</dt><dd>' + esc(p.name) + '</dd><dt>مۆبایل</dt><dd class="ltr" style="text-align:right">' + U.fmtPhone(p.phone) + (p.phone2 ? ' / ' + U.fmtPhone(p.phone2) : '') + '</dd>' +
        '<dt>لەدایکبوون</dt><dd>' + (p.dob ? U.fmtDate(p.dob) : '—') + '</dd><dt>ناونیشان</dt><dd>' + esc(p.address || '—') + '</dd>' +
        '<dt>دکتۆری سەرەکی</dt><dd>' + esc(Store.doctorName(p.doctorId)) + '</dd><dt>سەرچاوە</dt><dd>' + esc(p.source || '—') + '</dd>' +
        '<dt>تێبینی</dt><dd>' + esc(p.notes || '—') + '</dd></dl></section>' +
        '<section class="card"><div class="card-head"><span class="card-title">ئاگاداری پزیشکی</span></div>' +
        (p.allergies.length || p.conditions.length ? p.allergies.map((x) => '<div class="alert red" style="margin-bottom:6px">' + I('alert') + '<span>هەستیاری بە ' + esc(x) + '</span></div>').join('') + p.conditions.map((x) => '<div class="alert amber" style="margin-bottom:6px">' + I('info') + '<span>' + esc(x) + '</span></div>').join('') : '<div class="alert green">' + I('check') + '<span>هیچ ئاگادارییەکی پزیشکی تۆمار نەکراوە</span></div>') +
        '<div class="divider" style="margin:14px 0 10px"></div><div class="card-head" style="margin-bottom:6px"><span class="card-title" style="font-size:14px">نۆرەکانی داهاتوو</span></div>' +
        (appts.filter((a) => a.date >= T && ['scheduled', 'confirmed', 'arrived'].includes(a.status)).reverse().map((a) => '<div class="li" style="cursor:pointer" data-open-appt="' + a.id + '"><span class="grow"><span class="t">' + U.relDay(a.date) + ' · ' + U.fmtTime(a.start) + '</span><span class="s">' + esc(Store.serviceName(a.serviceId)) + ' · ' + esc(Store.doctorName(a.doctorId)) + '</span></span>' + UI.status(a.status) + '</div>').join('') || '<div class="muted small">هیچ نۆرەیەکی داهاتووی نییە</div>') + '</section></div>';
      if (med) html += '<section class="card"><div class="card-head"><span class="card-title">' + I('tooth') + 'نەخشەی ددان</span><button class="btn sm ghost" data-tab="chart">گەورەکردن ' + I('chevL', 'sm') + '</button></div>' + chartHtml(p) + '</section>';
    }
    if (tab === 'chart') {
      html += '<section class="card"><div class="card-head"><span class="card-title">' + I('tooth') + 'نەخشەی ددان (FDI)</span><span class="card-sub">' + (Store.can('edit_medical') ? 'کلیک لە هەر ددانێک بکە بۆ گۆڕینی بار یان زیادکردن بۆ پلان' : 'تەنها بینین') + '</span></div>' + chartHtml(p) + '</section>';
      const listT = Object.entries(p.teeth).sort((a, b) => a[0] - b[0]);
      html += '<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">تۆماری ددانەکان</span></div>' + (listT.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>ددان</th><th>بار</th><th>تێبینی</th><th>بەروار</th></tr></thead><tbody>' + listT.map(([n, t]) => '<tr class="click" data-tooth="' + n + '"><td class="latin"><b>' + n + '</b></td><td>' + UI.badge(Store.TOOTH[t.status].label, '') + '</td><td>' + esc(t.note || '') + '</td><td class="nowrap">' + (t.date ? U.fmtDateShort(t.date) : '—') + '</td></tr>').join('') + '</tbody></table></div>' : UI.empty('هەموو ددانەکان سالمن', 'tooth')) + '</section>';
    }
    if (tab === 'plan') {
      const open = p.plan.filter((x) => x.status !== 'done');
      const total = U.sum(open, (x) => x.price);
      html += '<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">' + I('list') + 'پلانی چارەسەر</span><span class="row">' + (Store.can('edit_medical') || Store.can('manage_patients') ? '<button class="btn sm primary" data-plan-add>' + I('plus', 'sm') + 'زیادکردنی چارەسەر</button>' : '') + '</span></div>' +
        (p.plan.length ? '<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>ددان</th><th>چارەسەر</th><th>دکتۆر</th><th class="num">نرخ</th><th>بار</th><th></th></tr></thead><tbody>' + p.plan.map((it) => '<tr><td class="latin"><b>' + (it.tooth || '—') + '</b></td><td>' + esc(Store.serviceName(it.serviceId)) + '</td><td class="nowrap">' + esc(Store.doctorName(it.doctorId)) + '</td><td class="num">' + U.money(it.price) + '</td><td>' + (it.status === 'done' ? UI.badge('تەواوبوو' + (it.doneAt ? ' · ' + U.fmtDateShort(it.doneAt) : ''), 'b-green') : it.status === 'booked' ? UI.badge('نۆرەی بۆ گیراوە', 'b-blue') : UI.badge('پلان', 'b-gray')) + '</td><td><span class="row" style="gap:4px;justify-content:flex-end">' + (it.status !== 'done' && Store.can('create_appointments') ? '<button class="btn xs" data-plan-book="' + it.id + '">' + I('calendar', 'sm') + 'نۆرە</button>' : '') + (it.status !== 'done' && (Store.can('edit_medical')) ? '<button class="btn xs" data-plan-done="' + it.id + '">' + I('check', 'sm') + '</button><button class="btn xs danger" data-plan-del="' + it.id + '" aria-label="سڕینەوە">' + I('trash', 'sm') + '</button>' : '') + '</span></td></tr>').join('') + '</tbody></table></div><div class="pager"><span>' + U.num(open.length) + ' چارەسەری ماوە</span><b style="color:var(--text)">کۆی ماوە: ' + U.money(total) + '</b>' + (open.length && Store.can('billing') ? '<button class="btn sm" data-plan-quote>' + I('printer', 'sm') + 'چاپکردنی خەمڵاندنی نرخ</button>' : '') + '</div>' : UI.empty('هیچ پلانێکی چارەسەر دانەنراوە', 'list')) + '</section>';
    }
    if (tab === 'visits') {
      html += '<section class="card flush">' + (appts.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>بەروار</th><th>کات</th><th>چارەسەر</th><th>دکتۆر</th><th>بار</th>' + (med ? '<th>تێبینی پزیشکی</th>' : '') + '</tr></thead><tbody>' + appts.map((a) => '<tr class="click" data-open-appt="' + a.id + '"><td class="nowrap">' + U.fmtDateShort(a.date) + ' <span class="small muted">' + U.d(a.date.slice(0, 4)) + '</span></td><td>' + U.fmtTime(a.start) + '</td><td>' + esc(Store.serviceName(a.serviceId)) + (a.tooth ? ' <span class="latin muted">#' + a.tooth + '</span>' : '') + '</td><td class="nowrap">' + esc(Store.doctorName(a.doctorId)) + '</td><td>' + UI.status(a.status) + '</td>' + (med ? '<td class="small">' + esc(a.clinicalNote || '') + '</td>' : '') + '</tr>').join('') + '</tbody></table></div>' : UI.empty('هیچ سەردانێک تۆمار نەکراوە', 'calendar')) + '</section>';
    }
    if (tab === 'billing') {
      const invs = Store.patientInvoices(p.id).slice().sort(U.by((i) => i.date, -1));
      const pays = Store.db.payments.filter((x) => x.patientId === p.id).sort(U.by((x) => x.date, -1));
      html += '<div class="grid g-3">' + UI.kpi('کۆی پسوولەکان', U.money(U.sum(invs, (i) => i.total)), U.num(invs.length) + ' پسوولە', 'receipt') + UI.kpi('دراوە', U.money(Store.patientPaid(p.id)), U.num(pays.length) + ' پارەدان', 'check') + UI.kpi('ماوە', '<span class="' + (Store.patientBalance(p.id) ? 'down' : '') + '">' + U.money(Store.patientBalance(p.id)) + '</span>', '', 'wallet') + '</div>';
      html += '<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">پسوولەکان</span>' + (Store.can('billing') ? '<button class="btn sm primary" data-inv>' + I('plus', 'sm') + 'پسوولەی نوێ</button>' : '') + '</div>' + (invs.length ? '<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>ژمارە</th><th>بەروار</th><th>چارەسەر</th><th class="num">کۆ</th><th class="num">ماوە</th><th>بار</th><th></th></tr></thead><tbody>' + invs.map((i) => '<tr class="click" data-view-inv="' + i.id + '"><td class="latin">' + esc(i.no) + '</td><td class="nowrap">' + U.fmtDateShort(i.date) + '</td><td>' + esc(i.items.map((x) => x.name).join('، ')) + (i.installments ? ' ' + UI.badge('قیست ×' + U.d(i.installments), 'b-blue') : '') + '</td><td class="num">' + U.money(i.total) + '</td><td class="num">' + (Store.invBalance(i) ? '<b class="down">' + U.money(Store.invBalance(i)) + '</b>' : '—') + '</td><td>' + UI.invBadge(i) + '</td><td>' + (Store.invBalance(i) && Store.can('billing') ? '<button class="btn xs" data-pay="' + i.id + '">وەرگرتن</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : UI.empty('هیچ پسوولەیەک نییە', 'receipt')) + '</section>';
    }
    if (tab === 'clinical') {
      const notes = p.clinical.slice().sort(U.by((c) => c.date, -1));
      html += '<div class="split"><section class="card"><div class="card-head"><span class="card-title">' + I('file') + 'تێبینی پزیشکی</span>' + (Store.can('edit_medical') ? '<button class="btn sm primary" data-note-add>' + I('plus', 'sm') + 'تێبینی نوێ</button>' : '') + '</div>' + (notes.length ? '<div class="list feed">' + notes.map((c) => '<div class="li"><time>' + U.fmtDateShort(c.date) + '</time><span class="grow"><span class="t" style="font-weight:400">' + esc(c.text) + '</span><span class="s">' + esc(Store.doctorName(c.doctorId)) + '</span></span></div>').join('') + '</div>' : UI.empty('هیچ تێبینییەک نەنووسراوە', 'file')) + '</section>' +
        '<section class="card"><div class="card-head"><span class="card-title">' + I('pill') + 'ڕەچەتەکان</span>' + (Store.can('edit_medical') ? '<button class="btn sm" data-rx>' + I('plus', 'sm') + 'ڕەچەتەی نوێ</button>' : '') + '</div>' + (p.prescriptions.length ? '<div class="list">' + p.prescriptions.slice().reverse().map((rx) => '<div class="li"><span class="grow"><span class="t">' + esc(rx.meds.map((m) => m.name).join('، ')) + '</span><span class="s">' + U.fmtDateShort(rx.date) + ' · ' + esc(Store.doctorName(rx.doctorId)) + '</span></span><button class="btn xs" data-rx-print="' + rx.id + '">' + I('printer', 'sm') + 'چاپ</button></div>').join('') + '</div>' : UI.empty('هیچ ڕەچەتەیەک نەنووسراوە', 'pill')) + '</section></div>';
    }
    if (tab === 'files') {
      html += '<section class="card"><div class="card-head"><span class="card-title">' + I('image') + 'تیشک و فایلەکان</span><label class="btn sm primary" style="cursor:pointer">' + I('upload', 'sm') + 'بارکردنی وێنە<input type="file" accept="image/*" data-upload hidden multiple></label></div>' +
        '<p class="hint" style="margin-top:0">وێنەی تیشک، وێنەی پێش و دوای چارەسەر، یان فۆرمی ڕەزامەندی. لەم وەشانەی تاقیکردنەوەدا فایلەکان لە وێبگەڕەکەدا هەڵدەگیرێن.</p>' +
        (p.files.length ? '<div class="files">' + p.files.map((fl) => '<div class="file"><button type="button" class="thumb" data-file="' + fl.id + '" style="border:none;cursor:zoom-in;padding:0">' + (fl.data ? '<img src="' + fl.data + '" alt="' + esc(fl.name) + '">' : I('image', 'lg')) + '</button><div class="info"><b>' + esc(fl.name) + '</b><small>' + U.fmtDateShort(fl.date) + ' · ' + esc(fl.kind || '') + '</small><button class="btn xs danger" data-file-del="' + fl.id + '" style="margin-top:4px">' + I('trash', 'sm') + 'سڕینەوە</button></div></div>').join('') + '</div>' : UI.empty('هیچ فایلێک بار نەکراوە', 'image')) + '</section>';
    }
    return html;
  }

  function toothModal(p, n) {
    const t = p.teeth[n] || { status: 'healthy', note: '' };
    const canEdit = Store.can('edit_medical');
    const hist = Store.appts({ patientId: p.id, allScopes: true }).filter((a) => a.tooth === Number(n)).sort(U.by((a) => a.date, -1));
    const svc = Store.db.services.filter((s) => s.active && s.perTooth);
    const m = UI.modal({
      title: 'ددانی ' + n,
      body: (canEdit ? '<div class="field"><span class="lbl">باری ددان</span><div class="chips">' + Object.entries(Store.TOOTH).map(([k, v]) => '<label class="chip" style="cursor:pointer"><input type="radio" name="status" value="' + k + '"' + (t.status === k ? ' checked' : '') + ' style="accent-color:var(--navy)">' + esc(v.label) + '</label>').join('') + '</div></div>' + UI.field('تێبینی', '<input class="input" name="note" value="' + esc(t.note || '') + '" placeholder="نموونە: کلۆری قووڵ لە ڕووی ناوەوە">') +
        '<div class="field"><span class="lbl">زیادکردن بۆ پلانی چارەسەر</span><div class="row wrap"><select class="select" name="planSvc" style="flex:1;min-width:200px">' + UI.opts(svc, '', '— هیچ —') + '</select></div></div>' : '<p>' + esc(Store.TOOTH[t.status].label) + (t.note ? ' — ' + esc(t.note) : '') + '</p>') +
        (hist.length ? '<div><div class="small muted" style="margin-bottom:4px">مێژووی ئەم ددانە</div>' + hist.map((a) => '<div class="small">• ' + U.fmtDateShort(a.date) + ' — ' + esc(Store.serviceName(a.serviceId)) + ' · ' + esc(Store.STATUS[a.status].label) + '</div>').join('') + '</div>' : ''),
      foot: canEdit ? '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>' + I('check') + 'پاشەکەوتکردن</button>' : '<button class="btn" data-close>داخستن</button>'
    });
    const ok = m.$('[data-ok]');
    if (ok) ok.addEventListener('click', () => {
      const st = (m.$('[name=status]:checked') || {}).value || 'healthy';
      const note = m.$('[name=note]').value.trim();
      if (st === 'healthy' && !note) delete p.teeth[n]; else p.teeth[n] = { status: st, note, date: U.today() };
      const ps = m.$('[name=planSvc]').value;
      if (ps) p.plan.push({ id: U.uid('pl'), tooth: Number(n), serviceId: ps, price: Store.service(ps).price, status: 'planned', doctorId: Store.me.role === 'doctor' ? Store.me.id : p.doctorId, createdAt: U.today() });
      Store.commit('medical', 'نەخشەی ددانی ' + p.name + ' نوێ کرایەوە (ددانی ' + n + ')', { ref: p.id });
      m.close();
      UI.toast('ددانی ' + n + ' نوێ کرایەوە');
    });
  }
  function planAdd(p) {
    const svc = Store.db.services.filter((s) => s.active);
    const docs = Store.doctors();
    const m = UI.modal({
      title: 'زیادکردنی چارەسەر بۆ پلان', size: 'narrow',
      body: '<form class="form" id="plf" style="grid-template-columns:minmax(0,1fr)">' + UI.field('چارەسەر', '<select class="select" name="serviceId">' + UI.opts(svc, '', '—') + '</select>', { req: true }) + UI.field('ددان', '<select class="select" name="tooth">' + UI.opts([['', '— گشتی —']].concat(Seed.TEETH_UP.concat(Seed.TEETH_LO).map((t) => [t, String(t)]))) + '</select>') + UI.field('دکتۆر', '<select class="select" name="doctorId">' + UI.opts(docs, Store.me.role === 'doctor' ? Store.me.id : p.doctorId) + '</select>') + UI.field('نرخ (د.ع)', '<input class="input" name="price" inputmode="numeric">', { hint: 'خۆکارانە لە لیستی نرخەکانەوە پڕ دەکرێتەوە' }) + '</form>',
      foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>زیادکردن</button>'
    });
    const f = m.$('#plf');
    f.serviceId.addEventListener('change', () => { const s = Store.service(f.serviceId.value); if (s) f.price.value = s.price; });
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { serviceId: UI.req('چارەسەر هەڵبژێرە'), price: UI.numRule(0) })) return;
      const d = UI.data(f);
      p.plan.push({ id: U.uid('pl'), tooth: d.tooth ? Number(d.tooth) : null, serviceId: d.serviceId, price: UI.parseNum(d.price), status: 'planned', doctorId: d.doctorId, createdAt: U.today() });
      if (d.tooth && !p.teeth[d.tooth]) p.teeth[d.tooth] = { status: 'needs', note: Store.serviceName(d.serviceId) + ' پلان کراوە', date: U.today() };
      Store.commit('medical', 'چارەسەری «' + Store.serviceName(d.serviceId) + '» بۆ پلانی ' + p.name + ' زیاد کرا', { ref: p.id });
      m.close();
    });
  }
  function noteAdd(p) {
    const m = UI.modal({
      title: 'تێبینی پزیشکی نوێ', size: 'narrow',
      body: UI.field('بەروار', '<input class="input" type="date" name="date" value="' + U.today() + '">') + UI.field('تێبینی', '<textarea class="textarea" name="text" style="min-height:120px" placeholder="پشکنین، دۆزینەوە، چارەسەر، ئامۆژگاری…"></textarea>', { req: true }),
      foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>پاشەکەوتکردن</button>'
    });
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(m.el, { text: UI.req('تێبینی بنووسە') })) return;
      p.clinical.push({ id: U.uid('cn'), date: m.$('[name=date]').value || U.today(), doctorId: Store.me.role === 'doctor' ? Store.me.id : p.doctorId, text: m.$('[name=text]').value.trim(), by: Store.me.id });
      Store.commit('medical', 'تێبینی پزیشکی بۆ ' + p.name + ' زیاد کرا', { ref: p.id });
      m.close();
    });
  }
  function rxModal(p) {
    const docId = Store.me.role === 'doctor' ? Store.me.id : p.doctorId;
    const pen = p.allergies.some((a) => /پەنسلین/.test(a));
    const nsaid = p.allergies.some((a) => /ئەسپرین|ئایبوپرۆفین/.test(a));
    const row = (m) => '<div class="line-item" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1.6fr) minmax(0,1fr) 36px"><input class="input" data-k="name" value="' + esc(m ? m[0] : '') + '" placeholder="ناوی دەرمان" dir="ltr" style="text-align:right"><input class="input" data-k="dose" value="' + esc(m ? m[1] : '') + '" placeholder="بڕ"><input class="input" data-k="freq" value="' + esc(m ? m[2] : '') + '" placeholder="چەند جار"><input class="input" data-k="days" value="' + esc(m ? m[3] : '') + '" placeholder="ماوە"><button type="button" class="icon-btn" data-rm aria-label="لابردن" style="width:36px;height:36px">' + I('x', 'sm') + '</button></div>';
    const m = UI.modal({
      title: 'ڕەچەتەی نوێ — ' + p.name, size: 'wide', sticky: true,
      body: (pen || nsaid ? '<div class="alert red">' + I('alert') + '<span>ئاگاداری: نەخۆش هەستیاری هەیە بە ' + esc(p.allergies.join('، ')) + '. سیستەمەکە ئاگادارت دەکاتەوە ئەگەر دەرمانێکی پەیوەندیدار هەڵبژێریت.</span></div>' : '') +
        '<div class="field"><span class="lbl">دەرمانی باو (کلیک بکە بۆ زیادکردن)</span><div class="chips">' + MEDS.map((x, i) => '<button type="button" class="chip" data-preset="' + i + '"' + ((x[4] === 'penicillin' && pen) || (x[4] === 'nsaid' && nsaid) ? ' style="border-color:var(--red);color:var(--red-fg)"' : '') + '>' + esc(x[0]) + '</button>').join('') + '</div></div>' +
        '<div class="line-items" id="rx-lines">' + row() + '</div><button type="button" class="btn sm" data-add-line style="align-self:flex-start">' + I('plus', 'sm') + 'دەرمانی تر</button>' +
        UI.field('ئامۆژگاری', '<textarea class="textarea" name="advice" style="min-height:70px">٢ کاتژمێر هیچ مەخۆ. بۆ ٢٤ کاتژمێر خواردنی گەرم و جگەرە مەکێشە.</textarea>'),
      foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn" data-save>پاشەکەوتکردن</button><button class="btn primary" data-print>' + I('printer') + 'پاشەکەوت و چاپ</button>'
    });
    const lines = m.$('#rx-lines');
    const warnCheck = (name) => { const x = MEDS.find((k) => k[0] === name); if (x && ((x[4] === 'penicillin' && pen) || (x[4] === 'nsaid' && nsaid))) UI.toast('ئاگاداری: ' + name + ' لەگەڵ هەستیاری نەخۆشەکە ناگونجێت!', 'err'); };
    m.el.addEventListener('click', (e) => {
      const pr = e.target.closest('[data-preset]');
      if (pr) {
        const x = MEDS[Number(pr.dataset.preset)];
        const empty = Array.from(lines.querySelectorAll('.line-item')).find((li) => !li.querySelector('[data-k=name]').value.trim());
        if (empty) empty.outerHTML = row(x); else lines.insertAdjacentHTML('beforeend', row(x));
        warnCheck(x[0]);
      }
      if (e.target.closest('[data-add-line]')) lines.insertAdjacentHTML('beforeend', row());
      const rm = e.target.closest('[data-rm]');
      if (rm) { if (lines.children.length > 1) rm.closest('.line-item').remove(); else rm.closest('.line-item').querySelectorAll('input').forEach((i) => { i.value = ''; }); }
    });
    const save = (print) => {
      const meds = Array.from(lines.querySelectorAll('.line-item')).map((li) => ({ name: li.querySelector('[data-k=name]').value.trim(), dose: li.querySelector('[data-k=dose]').value.trim(), freq: li.querySelector('[data-k=freq]').value.trim(), days: li.querySelector('[data-k=days]').value.trim() })).filter((x) => x.name);
      if (!meds.length) { UI.toast('لانیکەم یەک دەرمان بنووسە', 'err'); return; }
      const rx = { id: U.uid('rx'), date: U.today(), doctorId: docId, meds, advice: m.$('[name=advice]').value.trim() };
      p.prescriptions.push(rx);
      Store.commit('medical', 'ڕەچەتە بۆ ' + p.name + ' نووسرا', { ref: p.id });
      m.close();
      UI.toast('ڕەچەتەکە پاشەکەوت کرا');
      if (print) printRx(p, rx);
    };
    m.$('[data-save]').addEventListener('click', () => save(false));
    m.$('[data-print]').addEventListener('click', () => save(true));
  }
  function printRx(p, rx) {
    const doc = Store.user(rx.doctorId);
    const age = U.age(p.dob);
    UI.print('<div class="doc">' + UI.docHead('ڕەچەتەی پزیشکی', '<div>بەروار: ' + U.fmtDate(rx.date) + '</div><div>پەڕگە: #' + U.d(p.fileNo) + '</div>') +
      '<table><tr><th>ناوی نەخۆش</th><td>' + esc(p.name) + '</td><th>تەمەن</th><td>' + (age !== null ? U.num(age) : '—') + '</td></tr><tr><th>دکتۆر</th><td>' + esc(doc ? doc.name : '') + '</td><th>هەستیاری</th><td>' + esc(p.allergies.join('، ') || 'نییە') + '</td></tr></table>' +
      '<div class="rx">℞</div>' + rx.meds.map((x, i) => '<div class="med"><b class="ltr" style="display:inline-block">' + U.d(i + 1) + '. ' + esc(x.name) + '</b><div>' + esc([x.dose, x.freq, x.days ? 'بۆ ماوەی ' + x.days : ''].filter(Boolean).join(' — ')) + '</div></div>').join('') +
      (rx.advice ? '<p style="margin-top:14px"><b>ئامۆژگاری:</b> ' + esc(rx.advice) + '</p>' : '') +
      '<div class="sig"><div>واژووی دکتۆر<br>' + esc(doc ? doc.name : '') + '</div><div>مۆری کلینیک</div></div>' +
      '<div class="foot"><span>' + esc(Store.db.settings.clinicName) + '</span><span>' + U.fmtPhone(Store.db.settings.phone) + '</span></div></div>');
  }
  function printQuote(p) {
    const open = p.plan.filter((x) => x.status !== 'done');
    UI.print('<div class="doc">' + UI.docHead('خەمڵاندنی نرخی چارەسەر', '<div>بەروار: ' + U.fmtDate(U.today()) + '</div><div>پەڕگە: #' + U.d(p.fileNo) + '</div>') +
      '<p>بۆ: <b>' + esc(p.name) + '</b></p><table><thead><tr><th>#</th><th>ددان</th><th>چارەسەر</th><th>دکتۆر</th><th class="num">نرخ (د.ع)</th></tr></thead><tbody>' + open.map((it, i) => '<tr><td>' + U.d(i + 1) + '</td><td class="latin">' + (it.tooth || '—') + '</td><td>' + esc(Store.serviceName(it.serviceId)) + '</td><td>' + esc(Store.doctorName(it.doctorId)) + '</td><td class="num">' + U.num(it.price) + '</td></tr>').join('') + '</tbody></table>' +
      '<table class="tot"><tr class="g"><td>کۆی گشتی</td><td class="num">' + U.money(U.sum(open, (x) => x.price)) + '</td></tr></table><p style="font-size:10pt;color:#555">ئەم خەمڵاندنە بۆ ماوەی ٣٠ ڕۆژ بەکارە. دەتوانرێت بە قیست بدرێت.</p>' +
      '<div class="foot"><span>' + esc(Store.db.settings.clinicName) + '</span><span>' + esc(Store.db.settings.invoiceNote || '') + '</span></div></div>');
  }

  Pages.patients = {
    title: (r) => (r.parts[1] ? (Store.patient(r.parts[1]) || {}).name || 'نەخۆش' : 'نەخۆشەکان'),
    picker, bindPicker, createFromPicker, openForm, printRx,
    render(r) { return r.parts[1] ? renderProfile(r.parts[1], r.params.tab || 'overview') : renderList(); },
    mount(root, r) {
      if (!r.parts[1]) {
        const q = root.querySelector('[data-q]');
        if (q) q.addEventListener('input', U.debounce(() => { state.q = q.value; state.page = 1; App.render(); const n = document.querySelector('[data-q]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250));
        root.querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => { state.chip = b.dataset.chip; state.page = 1; App.render(); }));
        const ds = root.querySelector('[data-doctor]');
        if (ds) ds.addEventListener('change', () => { state.doctor = ds.value; state.page = 1; App.render(); });
        const so = root.querySelector('[data-sort]');
        if (so) so.addEventListener('change', () => { state.sort = so.value; App.render(); });
        root.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => openForm()));
        root.addEventListener('click', (e) => { const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { state.page = Number(pg.dataset.page); App.render(); } });
        const ex = root.querySelector('[data-export]');
        if (ex) ex.addEventListener('click', () => {
          const rows = [['ژمارەی پەڕگە', 'ناو', 'مۆبایل', 'ڕەگەز', 'لەدایکبوون', 'ناونیشان', 'دکتۆر', 'سەرچاوە', 'هەستیاری', 'نەخۆشی', 'قەرز', 'تۆمارکراو']];
          Store.visiblePatients().forEach((p) => rows.push([p.fileNo, p.name, p.phone, p.gender === 'f' ? 'مێ' : p.gender === 'm' ? 'نێر' : '', p.dob, p.address, Store.doctorName(p.doctorId), p.source, p.allergies.join(' / '), p.conditions.join(' / '), Store.patientBalance(p.id), p.createdAt]));
          U.download('bite-patients-' + U.today() + '.csv', U.csv(rows), 'text/csv;charset=utf-8');
          Store.log('export', 'لیستی نەخۆشەکانی هەناردە کرد'); Store.save();
          UI.toast('فایلەکە دابەزی');
        });
        return;
      }
      const p = Store.patient(r.parts[1]);
      if (!p || !Store.canSeePatient(p)) return;
      Pages.appointments.bindQueue(root);
      root.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-tab]');
        if (t) { App.setParams({ tab: t.dataset.tab === 'overview' ? null : t.dataset.tab }); return; }
        if (e.target.closest('[data-edit]')) openForm({ id: p.id });
        if (e.target.closest('[data-book]')) Pages.appointments.openForm({ patientId: p.id, doctorId: Store.inScope(p.doctorId) ? p.doctorId : undefined });
        if (e.target.closest('[data-inv]')) Pages.billing.openInvoiceForm({ patientId: p.id });
        if (e.target.closest('[data-rx]')) rxModal(p);
        const rp = e.target.closest('[data-rx-print]');
        if (rp) printRx(p, p.prescriptions.find((x) => x.id === rp.dataset.rxPrint));
        const th = e.target.closest('[data-tooth]');
        if (th) toothModal(p, th.dataset.tooth);
        if (e.target.closest('[data-plan-add]')) planAdd(p);
        if (e.target.closest('[data-plan-quote]')) printQuote(p);
        const pb = e.target.closest('[data-plan-book]');
        if (pb) { const it = p.plan.find((x) => x.id === pb.dataset.planBook); it.status = 'booked'; Store.commit(null, null, { silent: true }); Pages.appointments.openForm({ patientId: p.id, doctorId: it.doctorId, serviceId: it.serviceId, tooth: it.tooth, duration: (Store.service(it.serviceId) || {}).duration }); }
        const pd = e.target.closest('[data-plan-done]');
        if (pd) { const it = p.plan.find((x) => x.id === pd.dataset.planDone); it.status = 'done'; it.doneAt = U.today(); Store.commit('medical', 'چارەسەری پلان تەواو کرا بۆ ' + p.name); }
        const pdel = e.target.closest('[data-plan-del]');
        if (pdel && await UI.confirm({ title: 'لابردن لە پلان', text: 'ئەم چارەسەرە لە پلان لادەبرێت.', ok: 'لابردن', danger: true })) { p.plan = p.plan.filter((x) => x.id !== pdel.dataset.planDel); Store.commit('medical', 'چارەسەرێک لە پلانی ' + p.name + ' لابرا'); }
        if (e.target.closest('[data-note-add]')) noteAdd(p);
        const vi = e.target.closest('[data-view-inv]');
        if (vi && !e.target.closest('[data-pay]')) Pages.billing.openInvoice(vi.dataset.viewInv);
        const fl = e.target.closest('[data-file]');
        if (fl) { const f = p.files.find((x) => x.id === fl.dataset.file); if (f && f.data) UI.modal({ title: f.name, size: 'wide', body: '<img src="' + f.data + '" alt="" style="width:100%;border-radius:12px;background:#000">' }); }
        const fd = e.target.closest('[data-file-del]');
        if (fd && await UI.confirm({ title: 'سڕینەوەی فایل', text: 'ئەم فایلە بە یەکجاری دەسڕێتەوە.', ok: 'سڕینەوە', danger: true })) { p.files = p.files.filter((x) => x.id !== fd.dataset.fileDel); Store.commit('patient', 'فایلێک لە پەڕگەی ' + p.name + ' سڕایەوە'); }
      });
      const up = root.querySelector('[data-upload]');
      if (up) up.addEventListener('change', async () => {
        const files = Array.from(up.files || []);
        for (const file of files) {
          try {
            const raw = await UI.readFile(file, 8000);
            const small = await UI.shrinkImage(raw, 1400, 0.78);
            p.files.push({ id: U.uid('f'), name: file.name.replace(/\.[^.]+$/, ''), kind: /pano|opg/i.test(file.name) ? 'پانۆراما' : 'وێنە', date: U.today(), data: small, by: Store.me.id });
          } catch (err) { UI.toast(err.message, 'err'); }
        }
        Store.commit('patient', U.num(files.length) + ' فایل بۆ پەڕگەی ' + p.name + ' بار کرا', { ref: p.id });
        UI.toast('فایلەکان بار کران');
      });
    }
  };
})();
