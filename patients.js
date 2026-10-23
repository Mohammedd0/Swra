/* Patients: list, profile with dental chart, treatment plan, clinical notes, files, prescriptions */
(function () {
  const esc = U.esc;
  const state = { q: '', chip: 'all', doctor: '', sort: 'recent', page: 1 };
  /* option lists come from Admin → Lists; keep any value a record already has */
  const opts = (key, current) => Array.from(new Set(Store.listNames(key).concat(current || [])));
  const VIP = 'VIP';

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
    return p.allergies.map((x) => UI.badge(_t('هەستیاری: ') + x, 'b-red')).join('') + p.conditions.map((x) => UI.badge(x, 'b-amber')).join('') + p.tags.map((x) => UI.badge(x, 'b-purple')).join('');
  }

  /* ---------- patient picker (used by appointment, invoice, lab forms) ---------- */
  function picker(name, value, o) {
    o = o || {};
    const p = value ? Store.patient(value) : null;
    const showNew = !p && (o.newName || o.newPhone);
    return '<div class="picker" data-picker style="position:relative">' +
      '<input type="hidden" name="' + name + '" value="' + esc(p ? p.id : '') + '">' +
      '<div class="picker-sel ' + (p ? '' : 'hidden') + '" style="display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border-2);border-radius:10px;padding:6px 10px;background:var(--surface-2)">' + (p ? UI.who(p.name, _t('پەڕگە #') + U.d(p.fileNo) + ' · ' + U.fmtPhone(p.phone), null, 'sm') : '') + _t('<button type="button" class="btn xs" data-pchange>گۆڕین</button></div>') +
      '<input class="input ' + (p || showNew ? 'hidden' : '') + _t('" data-pq autocomplete="off" placeholder="گەڕان بە ناو، مۆبایل یان ژمارەی پەڕگە…">') +
      '<div class="search-results hidden" style="top:46px"></div>' +
      (o.allowNew ? '<div class="picker-new ' + (showNew ? '' : 'hidden') + _t('" style="border:1px dashed var(--mint-2);border-radius:12px;padding:12px;margin-top:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"><div class="field"><label>ناوی نەخۆشی نوێ <span class="req">*</span></label><input class="input" data-new-name value="') + esc(o.newName || '') + _t('"></div><div class="field"><label>مۆبایل <span class="req">*</span></label><input class="input" data-new-phone dir="ltr" style="text-align:right" placeholder="0750 123 4567" value="') + esc(o.newPhone || '') + _t('"></div><div class="full hint" style="grid-column:1/-1">پەڕگەیەکی نوێ دروست دەکرێت. دواتر دەتوانیت زانیاری زیاتری بۆ زیاد بکەیت. <button type="button" class="btn xs ghost" data-pcancel-new>پاشگەزبوونەوە</button></div></div>') : '') +
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
        sel.innerHTML = UI.who(p.name, _t('پەڕگە #') + U.d(p.fileNo) + ' · ' + U.fmtPhone(p.phone), null, 'sm') + _t('<button type="button" class="btn xs" data-pchange>گۆڕین</button>');
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
        box.innerHTML = list.map((p) => '<a href="#" class="search-item" data-pid="' + p.id + '">' + UI.who(p.name, _t('پەڕگە #') + U.d(p.fileNo) + ' · ' + U.fmtPhone(p.phone), null, 'sm') + '</a>').join('') + (nw ? '<a href="#" class="search-item" data-pnew>' + I('plus') + _t('<span>نەخۆشی نوێ') + (s ? ': «' + esc(s) + '»' : '') + '</span></a>' : '') + (!list.length && !nw ? _t('<div class="empty" style="padding:14px">هیچ نەخۆشێک نەدۆزرایەوە</div>') : '');
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
    [[n, name ? null : _t('ناو پێویستە')], [ph, /^07\d{9}$/.test(phone) ? null : _t('ژمارەی مۆبایل دروست نییە')]].forEach(([el, msg]) => { el.classList.toggle('err', !!msg); if (msg) { bad = true; UI.toast(msg, 'err'); } });
    if (bad) return null;
    const dup = Store.db.patients.find((p) => U.normPhone(p.phone) === phone);
    if (dup) return dup;
    const docSel = form.querySelector('[name=doctorId]');
    const p = newPatient({ name, phone, doctorId: (docSel && docSel.value) || Store.scopeDoctorIds()[0] || '' });
    Store.db.patients.push(p);
    Store.commit('patient', _t('پەڕگەی نوێ بۆ ') + name + _t(' دروست کرا'), { ref: p.id, silent: true });
    return p;
  }
  function newPatient(d) {
    return Object.assign({ id: U.uid('p'), fileNo: Store.nextFileNo(), name: '', gender: '', dob: '', phone: '', phone2: '', address: '', source: '', doctorId: '', allergies: [], conditions: [], tags: [], notes: '', createdAt: U.today(), teeth: {}, plan: [], files: [], clinical: [], prescriptions: [] }, d);
  }

  /* ---------- create / edit ---------- */
  function openForm(pre) {
    pre = pre || {};
    if (!Store.can('manage_patients')) { UI.toast(_t('دەسەڵاتی تۆمارکردنی نەخۆشت نییە'), 'err'); return; }
    const editing = pre.id ? Store.patient(pre.id) : null;
    const p = Object.assign(newPatient({}), editing || {}, editing ? {} : pre);
    const docs = Store.scopedDoctors();
    if (!p.doctorId && docs.length === 1) p.doctorId = docs[0].id;
    const chk = (name, opts, sel) => '<div class="chips">' + opts.map((o) => '<label class="chip" style="cursor:pointer"><input type="checkbox" name="' + name + '" data-multi="1" value="' + esc(o) + '"' + (sel.includes(o) ? ' checked' : '') + ' style="accent-color:var(--navy)">' + esc(o) + '</label>').join('') + '</div>';
    const allergyOpts = Store.listNames('allergies');
    const otherAll = p.allergies.filter((x) => !allergyOpts.includes(x)).join(', ');
    const m = UI.modal({
      title: editing ? _t('دەستکاری پەڕگەی ') + p.name : _t('تۆمارکردنی نەخۆشی نوێ'), size: 'wide', sticky: true,
      body: '<form class="form" id="pf" novalidate>' +
        UI.field(_t('ناوی تەواو'), '<input class="input" name="name" value="' + esc(p.name) + _t('" placeholder="ناو و ناوی باوک">'), { req: true }) +
        UI.field(_t('ژمارەی مۆبایل'), '<input class="input" name="phone" dir="ltr" style="text-align:right" value="' + esc(p.phone) + '" placeholder="0750 123 4567">', { req: true }) +
        UI.field(_t('ژمارەی دووەم'), '<input class="input" name="phone2" dir="ltr" style="text-align:right" value="' + esc(p.phone2 || '') + _t('" placeholder="دڵخواز">')) +
        UI.field(_t('ڕەگەز'), '<select class="select" name="gender">' + UI.opts([['f', _t('مێ')], ['m', _t('نێر')]], p.gender, '—') + '</select>') +
        UI.field(_t('بەرواری لەدایکبوون'), '<input class="input" type="date" name="dob" value="' + esc(p.dob || '') + '" max="' + U.today() + '">') +
        UI.field(_t('ناونیشان'), '<input class="input" name="address" value="' + esc(p.address || '') + _t('" placeholder="هەولێر — گەڕەک" list="dl-areas"><datalist id="dl-areas">') + Store.listNames('areas').map((x) => '<option value="' + esc(x) + '">').join('') + '</datalist>') +
        UI.field(_t('دکتۆری سەرەکی'), '<select class="select" name="doctorId">' + UI.opts(docs, p.doctorId, '—') + '</select>', { req: true }) +
        UI.field(_t('چۆن ئاشنای کلینیک بوو؟'), '<select class="select" name="source">' + UI.opts(opts('patientSources', p.source ? [p.source] : []).map((s) => [s, s]), p.source, '—') + '</select>') +
        _t('<div class="field full"><span class="lbl">هەستیاری</span>') + chk('allergies', allergyOpts, p.allergies) + _t('<input class="input" name="allergyOther" placeholder="هەستیاری تر (بە کۆما جیا بکەرەوە)" value="') + esc(otherAll) + '"></div>' +
        _t('<div class="field full"><span class="lbl">نەخۆشی و باری تەندروستی</span>') + chk('conditions', opts('conditions', p.conditions), p.conditions) + '</div>' +
        _t('<div class="field full"><span class="lbl">نیشانە</span>') + chk('tags', opts('patientTags', p.tags), p.tags) + '</div>' +
        UI.field(_t('تێبینی گشتی'), _t('<textarea class="textarea" name="notes" placeholder="هەر زانیارییەکی تر">') + esc(p.notes || '') + '</textarea>', { full: true }) +
        '<div class="full" id="pf-dup"></div></form>',
      foot: _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-save>') + I('check') + (editing ? _t('پاشەکەوتکردن') : _t('تۆمارکردن')) + '</button>'
    });
    const f = m.$('#pf');
    const dupBox = m.$('#pf-dup');
    f.phone.addEventListener('input', U.debounce(() => {
      const n = U.normPhone(f.phone.value);
      const dup = n.length >= 10 && Store.db.patients.find((x) => x.id !== p.id && U.normPhone(x.phone) === n);
      dupBox.innerHTML = dup ? '<div class="alert amber">' + I('alert') + _t('<span>نەخۆشێک بەم ژمارەیەوە هەیە: <a href="#/patients/') + dup.id + '" data-close>' + esc(dup.name) + ' (#' + U.d(dup.fileNo) + ')</a></span></div>' : '';
    }, 250));
    m.$('[data-save]').addEventListener('click', () => {
      if (!UI.validate(f, { name: UI.req(_t('ناو پێویستە')), phone: UI.phoneRule(true), phone2: UI.phoneRule(false), doctorId: UI.req(_t('دکتۆری سەرەکی هەڵبژێرە')) })) return;
      const d = UI.data(f);
      const allergies = (d.allergies || []).concat((d.allergyOther || '').split(/[،,]/).map((x) => x.trim()).filter(Boolean));
      const rec = { name: d.name, phone: U.normPhone(d.phone), phone2: d.phone2 ? U.normPhone(d.phone2) : '', gender: d.gender, dob: d.dob, address: d.address, doctorId: d.doctorId, source: d.source, allergies, conditions: d.conditions || [], tags: d.tags || [], notes: d.notes };
      if (editing) {
        Object.assign(editing, rec);
        Store.commit('patient', _t('زانیاری ') + rec.name + _t(' نوێ کرایەوە'), { ref: editing.id });
        UI.toast(_t('پەڕگەکە نوێ کرایەوە'));
        m.close();
      } else {
        const np = newPatient(rec);
        Store.db.patients.push(np);
        Store.commit('patient', _t('پەڕگەی نوێ بۆ ') + rec.name + _t(' دروست کرا (#') + np.fileNo + ')', { ref: np.id });
        UI.toast(_t('نەخۆشەکە تۆمار کرا — پەڕگە #') + U.d(np.fileNo));
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
      vip: all.filter((p) => p.tags.includes(VIP)).length,
      lapsed: all.filter((p) => Retention.isLapsed(p.id, Retention.months(), Store.scopeDoctorIds())).length
    };
    let list = all;
    if (state.chip === 'debt') list = list.filter((p) => Store.patientBalance(p.id) > 0);
    if (state.chip === 'plan') list = list.filter((p) => p.plan.some((x) => x.status !== 'done'));
    if (state.chip === 'new') list = list.filter((p) => p.createdAt >= U.startOfMonth(T));
    if (state.chip === 'alert') list = list.filter((p) => p.allergies.length || p.conditions.length);
    if (state.chip === 'vip') list = list.filter((p) => p.tags.includes(VIP));
    if (state.chip === 'lapsed') list = list.filter((p) => Retention.isLapsed(p.id, Retention.months(), Store.scopeDoctorIds()));
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
    const chips = [['all', _t('هەموو')], fin ? ['debt', _t('قەرزدار')] : null, ['plan', _t('پلانی کراوە')], ['new', _t('نوێی ئەم مانگە')], ['alert', _t('ئاگاداری پزیشکی')], ['vip', 'VIP'], ['lapsed', _t('{n} مانگ+ نەهاتوون').split('{n}').join(U.num(Retention.months()))]].filter(Boolean);
    return _t('<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">نەخۆشەکان') + (Store.can('view_all') ? '' : ' · ' + esc(Store.scopeLabel())) + '</span><h1 class="page-title">' + U.num(all.length) + _t(' نەخۆش</h1></div><div class="row wrap">') + (Store.can('export_data') ? '<button class="btn" data-export>' + I('download') + _t('هەناردە (Excel)</button>') : '') + (Store.can('manage_patients') ? '<button class="btn accent" data-new>' + I('plus') + _t('نەخۆشی نوێ</button>') : '') + '</div></div>' +
      '<div class="card flush"><div style="padding:14px 18px;display:flex;flex-direction:column;gap:12px;border-bottom:1px solid var(--border)"><div class="row wrap" style="gap:10px"><div class="search" style="max-width:340px">' + I('search') + _t('<input data-q placeholder="ناو، مۆبایل، ژمارەی پەڕگە یان ناونیشان" value="') + esc(state.q) + '" style="padding-inline-end:12px"></div>' +
      (docs.length > 1 ? '<select class="select" style="max-width:200px" data-doctor>' + UI.opts(docs, state.doctor, _t('هەموو دکتۆرەکان')) + '</select>' : '') +
      '<select class="select" style="max-width:190px" data-sort>' + UI.opts([['recent', _t('دوایین سەردان')], ['new', _t('نوێترین تۆمار')], ['name', _t('ناو (ئەلفوبێ)')]].concat(fin ? [['debt', _t('زۆرترین قەرز')]] : []), state.sort) + '</select></div>' +
      '<div class="chips">' + chips.map((c) => '<button class="chip ' + (state.chip === c[0] ? 'on' : '') + '" data-chip="' + c[0] + '">' + c[1] + ' <span class="cnt">' + U.num(counts[c[0]]) + '</span></button>').join('') + '</div></div>' +
      (rows.length ? _t('<div class="table-wrap"><table class="t"><thead><tr><th>نەخۆش</th><th>مۆبایل</th>') + (docs.length > 1 ? _t('<th>دکتۆر</th>') : '') + _t('<th>دوایین سەردان</th><th>نۆرەی داهاتوو</th>') + (fin ? _t('<th class="num">قەرز</th>') : '') + _t('<th>ئاگاداری</th></tr></thead><tbody>') + rows.map((p) => {
        const nx = nextAppt(p.id);
        const bal = fin ? Store.patientBalance(p.id) : 0;
        const age = U.age(p.dob);
        return '<tr class="click" data-href="#/patients/' + p.id + '"><td>' + UI.who(p.name, '#' + U.d(p.fileNo) + (age !== null ? ' · ' + U.num(age) + _t(' ساڵ') : '') + (p.gender ? ' · ' + (p.gender === 'f' ? _t('مێ') : _t('نێر')) : '')) + '</td><td class="nowrap ltr" style="text-align:right">' + U.fmtPhone(p.phone) + '</td>' + (docs.length > 1 ? '<td class="nowrap">' + esc(Store.doctorName(p.doctorId)) + '</td>' : '') + '<td class="nowrap">' + (lv[p.id] ? U.relDay(lv[p.id]) : '<span class="muted">—</span>') + '</td><td class="nowrap">' + (nx ? U.relDay(nx.date) + ' ' + U.fmtTime(nx.start) : '<span class="muted">—</span>') + '</td>' + (fin ? '<td class="num">' + (bal > 0 ? '<b class="down">' + U.money(bal) + '</b>' : '<span class="muted">—</span>') + '</td>' : '') + '<td><div class="tags">' + (p.allergies.length ? UI.badge(_t('هەستیاری'), 'b-red') : '') + (p.conditions.length ? UI.badge(p.conditions[0], 'b-amber') : '') + (p.tags.includes('VIP') ? UI.badge('VIP', 'b-purple') : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' + UI.pager(list.length, state.page, size) : UI.empty(_t('هیچ نەخۆشێک بەم گەڕانە نەدۆزرایەوە'), 'users', Store.can('manage_patients') ? '<button class="btn sm primary" data-new>' + I('plus', 'sm') + _t('تۆمارکردنی نەخۆشی نوێ</button>') : '')) + '</div>';
  }

  /* ---------- profile ---------- */
  function toothCell(n, p, lower) {
    const t = p.teeth[n];
    const st = t ? Store.TOOTH[t.status] : null;
    const planned = p.plan.some((x) => x.tooth === n && x.status !== 'done');
    return '<button type="button" class="tooth ' + (lower ? 'lower ' : '') + (st ? st.cls : '') + '" data-tooth="' + n + '" title="' + esc((st ? st.label : _t('سالم')) + (t && t.note ? ' — ' + t.note : '')) + _t('" aria-label="ددانی ') + n + ' ' + esc(st ? st.label : _t('سالم')) + '"><span class="num">' + n + '</span><span class="lab">' + (st ? esc(st.short || '') : '') + '</span>' + (planned ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--red)"></span>' : '') + '</button>';
  }
  function chartHtml(p) {
    const row = (arr, lower) => '<div class="tooth-row">' + arr.map((n) => toothCell(n, p, lower)).join('') + '</div>';
    return _t('<div class="table-wrap"><div class="tooth-chart"><div class="row between small muted"><span>ڕاست</span><span>ژوورەوە</span><span>چەپ</span></div>') + row(Seed.TEETH_UP) + '<div class="jaw-sep"></div>' + row(Seed.TEETH_LO, true) + '</div></div>' +
      '<div class="legend" style="margin-top:12px">' + Object.entries(Store.TOOTH).map(([k, v]) => '<span><i class="tooth ' + v.cls + '" style="height:14px;width:14px;border-radius:4px;display:inline-block;padding:0"></i>' + esc(v.label) + '</span>').join('') + _t('<span><i style="width:8px;height:8px;border-radius:50%;background:var(--red)"></i>لە پلانی چارەسەردایە</span></div>');
  }
  function renderProfile(id, tab) {
    const p = Store.patient(id);
    if (!p) return '<div class="card">' + UI.empty(_t('ئەم نەخۆشە نەدۆزرایەوە'), 'users', _t('<a class="btn" href="#/patients">گەڕانەوە بۆ لیست</a>')) + '</div>';
    if (!Store.canSeePatient(p)) return '<div class="card">' + UI.empty(_t('ئەم نەخۆشە سەر بە دکتۆرێکی ترە و دەسەڵاتی بینینیت نییە'), 'lock', _t('<a class="btn" href="#/patients">گەڕانەوە</a>')) + '</div>';
    const med = Store.can('view_medical');
    const fin = Store.can('billing') || Store.can('view_finance');
    const T = U.today();
    const appts = Store.appts({ patientId: p.id, allScopes: true }).slice().sort(U.by((a) => a.date + a.start, -1));
    const done = appts.filter((a) => a.status === 'completed');
    const nx = nextAppt(p.id);
    const age = U.age(p.dob);
    const tabs = [['overview', _t('کورتە'), 'user'], med ? ['chart', _t('نەخشەی ددان'), 'tooth'] : null, ['plan', _t('پلانی چارەسەر'), 'list'], ['visits', _t('سەردانەکان'), 'calendar'], fin ? ['billing', _t('پارە'), 'wallet'] : null, med ? ['clinical', _t('تێبینی پزیشکی'), 'file'] : null, ['files', _t('تیشک و فایل'), 'image']].filter(Boolean);
    if (!tabs.find((t) => t[0] === tab)) tab = 'overview';
    let html = '<div class="row"><a class="btn ghost sm" href="#/patients">' + I('chevR', 'sm') + _t('نەخۆشەکان</a></div>');
    html += '<section class="card"><div class="p-head"><div class="who">' + UI.av(p.name, null, 'xl') + _t('<span class="col" style="gap:2px"><span class="small muted">پەڕگەی ژمارە #') + U.d(p.fileNo) + _t(' · تۆمارکراو ') + U.fmtDateShort(p.createdAt) + '</span><b>' + esc(p.name) + '</b><span class="small muted">' + (p.gender ? (p.gender === 'f' ? _t('مێ') : _t('نێر')) + ' · ' : '') + (age !== null ? U.num(age) + _t(' ساڵ · ') : '') + '<span class="ltr">' + U.fmtPhone(p.phone) + '</span> · ' + esc(Store.doctorName(p.doctorId)) + '</span><div class="tags" style="margin-top:6px">' + tagBadges(p) + '</div></span></div>' +
      '<div class="row wrap">' +
      '<a class="btn sm" href="tel:' + U.normPhone(p.phone) + '">' + I('phone', 'sm') + _t('پەیوەندی</a><a class="btn sm wa" target="_blank" rel="noopener" href="') + U.waLink(p.phone, _t('سڵاو ') + p.name + _t('، ')) + '">' + I('whatsapp', 'sm') + _t('واتسئاپ</a>') +
      (Store.can('manage_patients') ? '<button class="btn sm" data-edit>' + I('edit', 'sm') + _t('دەستکاری</button>') : '') +
      (Store.can('edit_medical') ? '<button class="btn sm" data-rx>' + I('pill', 'sm') + _t('ڕەچەتە</button>') : '') +
      (Store.can('billing') ? '<button class="btn sm" data-inv>' + I('receipt', 'sm') + _t('پسوولە</button>') : '') +
      (Store.can('create_appointments') ? '<button class="btn sm primary" data-book>' + I('calendar', 'sm') + _t('نۆرە بگرە</button>') : '') + '</div></div>' +
      '<div class="divider" style="margin:16px 0"></div><div class="stat-inline">' +
      _t('<span class="col"><span class="small muted">سەردانی تەواوبوو</span><b>') + U.num(done.length) + '</b></span>' +
      _t('<span class="col"><span class="small muted">دوایین سەردان</span><b>') + (done[0] ? U.relDay(done[0].date) : '—') + '</b></span>' +
      _t('<span class="col"><span class="small muted">نۆرەی داهاتوو</span><b>') + (nx ? U.relDay(nx.date) + ' ' + U.fmtTime(nx.start) : '—') + '</b></span>' +
      _t('<span class="col"><span class="small muted">نەهاتن</span><b>') + U.num(appts.filter((a) => a.status === 'no_show').length) + '</b></span>' +
      (fin ? _t('<span class="col"><span class="small muted">کۆی دراو</span><b>') + U.money(Store.patientPaid(p.id)) + _t('</b></span><span class="col"><span class="small muted">قەرزی ماوە</span><b class="') + (Store.patientBalance(p.id) ? 'down' : '') + '">' + U.money(Store.patientBalance(p.id)) + '</b></span>' : '') +
      '</div></section>';
    html += '<div class="tabs" role="tablist">' + tabs.map((t) => '<button class="tab ' + (t[0] === tab ? 'on' : '') + '" role="tab" data-tab="' + t[0] + '">' + I(t[2], 'sm') + t[1] + '</button>').join('') + '</div>';

    if (tab === 'overview') {
      html += _t('<div class="split"><section class="card"><div class="card-head"><span class="card-title">زانیاری کەسی</span></div><dl class="kv">') +
        _t('<dt>ناو</dt><dd>') + esc(p.name) + _t('</dd><dt>مۆبایل</dt><dd class="ltr" style="text-align:right">') + U.fmtPhone(p.phone) + (p.phone2 ? ' / ' + U.fmtPhone(p.phone2) : '') + '</dd>' +
        _t('<dt>لەدایکبوون</dt><dd>') + (p.dob ? U.fmtDate(p.dob) : '—') + _t('</dd><dt>ناونیشان</dt><dd>') + esc(p.address || '—') + '</dd>' +
        _t('<dt>دکتۆری سەرەکی</dt><dd>') + esc(Store.doctorName(p.doctorId)) + _t('</dd><dt>سەرچاوە</dt><dd>') + esc(p.source || '—') + '</dd>' +
        _t('<dt>تێبینی</dt><dd>') + esc(p.notes || '—') + '</dd></dl></section>' +
        _t('<section class="card"><div class="card-head"><span class="card-title">ئاگاداری پزیشکی</span></div>') +
        (p.allergies.length || p.conditions.length ? p.allergies.map((x) => '<div class="alert red" style="margin-bottom:6px">' + I('alert') + _t('<span>هەستیاری بە ') + esc(x) + '</span></div>').join('') + p.conditions.map((x) => '<div class="alert amber" style="margin-bottom:6px">' + I('info') + '<span>' + esc(x) + '</span></div>').join('') : '<div class="alert green">' + I('check') + _t('<span>هیچ ئاگادارییەکی پزیشکی تۆمار نەکراوە</span></div>')) +
        _t('<div class="divider" style="margin:14px 0 10px"></div><div class="card-head" style="margin-bottom:6px"><span class="card-title" style="font-size:14px">نۆرەکانی داهاتوو</span></div>') +
        (appts.filter((a) => a.date >= T && ['scheduled', 'confirmed', 'arrived'].includes(a.status)).reverse().map((a) => '<div class="li" style="cursor:pointer" data-open-appt="' + a.id + '"><span class="grow"><span class="t">' + U.relDay(a.date) + ' · ' + U.fmtTime(a.start) + '</span><span class="s">' + esc(Store.serviceName(a.serviceId)) + ' · ' + esc(Store.doctorName(a.doctorId)) + '</span></span>' + UI.status(a.status) + '</div>').join('') || _t('<div class="muted small">هیچ نۆرەیەکی داهاتووی نییە</div>')) + '</section></div>';
      if (med) html += '<section class="card"><div class="card-head"><span class="card-title">' + I('tooth') + _t('نەخشەی ددان</span><button class="btn sm ghost" data-tab="chart">گەورەکردن ') + I('chevL', 'sm') + '</button></div>' + chartHtml(p) + '</section>';
    }
    if (tab === 'chart') {
      html += '<section class="card"><div class="card-head"><span class="card-title">' + I('tooth') + _t('نەخشەی ددان (FDI)</span><span class="card-sub">') + (Store.can('edit_medical') ? _t('کلیک لە هەر ددانێک بکە بۆ گۆڕینی بار یان زیادکردن بۆ پلان') : _t('تەنها بینین')) + '</span></div>' + chartHtml(p) + '</section>';
      const listT = Object.entries(p.teeth).sort((a, b) => a[0] - b[0]);
      html += _t('<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">تۆماری ددانەکان</span></div>') + (listT.length ? _t('<div class="table-wrap"><table class="t"><thead><tr><th>ددان</th><th>بار</th><th>تێبینی</th><th>بەروار</th></tr></thead><tbody>') + listT.map(([n, t]) => '<tr class="click" data-tooth="' + n + '"><td class="latin"><b>' + n + '</b></td><td>' + UI.badge(Store.TOOTH[t.status].label, '') + '</td><td>' + esc(t.note || '') + '</td><td class="nowrap">' + (t.date ? U.fmtDateShort(t.date) : '—') + '</td></tr>').join('') + '</tbody></table></div>' : UI.empty(_t('هەموو ددانەکان سالمن'), 'tooth')) + '</section>';
    }
    if (tab === 'plan') {
      const open = p.plan.filter((x) => x.status !== 'done');
      const total = U.sum(open, (x) => x.price);
      html += '<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">' + I('list') + _t('پلانی چارەسەر</span><span class="row">') + (Store.can('edit_medical') || Store.can('manage_patients') ? '<button class="btn sm primary" data-plan-add>' + I('plus', 'sm') + _t('زیادکردنی چارەسەر</button>') : '') + '</span></div>' +
        (p.plan.length ? _t('<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>ددان</th><th>چارەسەر</th><th>دکتۆر</th><th class="num">نرخ</th><th>بار</th><th></th></tr></thead><tbody>') + p.plan.map((it) => '<tr><td class="latin"><b>' + (it.tooth || '—') + '</b></td><td>' + esc(Store.serviceName(it.serviceId)) + '</td><td class="nowrap">' + esc(Store.doctorName(it.doctorId)) + '</td><td class="num">' + U.money(it.price) + '</td><td>' + (it.status === 'done' ? UI.badge(_t('تەواوبوو') + (it.doneAt ? ' · ' + U.fmtDateShort(it.doneAt) : ''), 'b-green') : it.status === 'booked' ? UI.badge(_t('نۆرەی بۆ گیراوە'), 'b-blue') : UI.badge(_t('پلان'), 'b-gray')) + '</td><td><span class="row" style="gap:4px;justify-content:flex-end">' + (it.status !== 'done' && Store.can('create_appointments') ? '<button class="btn xs" data-plan-book="' + it.id + '">' + I('calendar', 'sm') + _t('نۆرە</button>') : '') + (it.status !== 'done' && (Store.can('edit_medical')) ? '<button class="btn xs" data-plan-done="' + it.id + '">' + I('check', 'sm') + '</button><button class="btn xs danger" data-plan-del="' + it.id + _t('" aria-label="سڕینەوە">') + I('trash', 'sm') + '</button>' : '') + '</span></td></tr>').join('') + '</tbody></table></div><div class="pager"><span>' + U.num(open.length) + _t(' چارەسەری ماوە</span><b style="color:var(--text)">کۆی ماوە: ') + U.money(total) + '</b>' + (open.length && Store.can('billing') ? '<button class="btn sm" data-plan-quote>' + I('printer', 'sm') + _t('چاپکردنی خەمڵاندنی نرخ</button>') : '') + '</div>' : UI.empty(_t('هیچ پلانێکی چارەسەر دانەنراوە'), 'list')) + '</section>';
    }
    if (tab === 'visits') {
      html += '<section class="card flush">' + (appts.length ? _t('<div class="table-wrap"><table class="t"><thead><tr><th>بەروار</th><th>کات</th><th>چارەسەر</th><th>دکتۆر</th><th>بار</th>') + (med ? _t('<th>تێبینی پزیشکی</th>') : '') + '</tr></thead><tbody>' + appts.map((a) => '<tr class="click" data-open-appt="' + a.id + '"><td class="nowrap">' + U.fmtDateShort(a.date) + ' <span class="small muted">' + U.d(a.date.slice(0, 4)) + '</span></td><td>' + U.fmtTime(a.start) + '</td><td>' + esc(Store.serviceName(a.serviceId)) + (a.tooth ? ' <span class="latin muted">#' + a.tooth + '</span>' : '') + '</td><td class="nowrap">' + esc(Store.doctorName(a.doctorId)) + '</td><td>' + UI.status(a.status) + '</td>' + (med ? '<td class="small">' + esc(a.clinicalNote || '') + '</td>' : '') + '</tr>').join('') + '</tbody></table></div>' : UI.empty(_t('هیچ سەردانێک تۆمار نەکراوە'), 'calendar')) + '</section>';
    }
    if (tab === 'billing') {
      const invs = Store.patientInvoices(p.id).slice().sort(U.by((i) => i.date, -1));
      const pays = Store.db.payments.filter((x) => x.patientId === p.id).sort(U.by((x) => x.date, -1));
      html += '<div class="grid g-3">' + UI.kpi(_t('کۆی پسوولەکان'), U.money(U.sum(invs, (i) => i.total)), U.num(invs.length) + _t(' پسوولە'), 'receipt') + UI.kpi(_t('دراوە'), U.money(Store.patientPaid(p.id)), U.num(pays.length) + _t(' پارەدان'), 'check') + UI.kpi(_t('ماوە'), '<span class="' + (Store.patientBalance(p.id) ? 'down' : '') + '">' + U.money(Store.patientBalance(p.id)) + '</span>', '', 'wallet') + '</div>';
      html += _t('<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">پسوولەکان</span>') + (Store.can('billing') ? '<button class="btn sm primary" data-inv>' + I('plus', 'sm') + _t('پسوولەی نوێ</button>') : '') + '</div>' + (invs.length ? _t('<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>ژمارە</th><th>بەروار</th><th>چارەسەر</th><th class="num">کۆ</th><th class="num">ماوە</th><th>بار</th><th></th></tr></thead><tbody>') + invs.map((i) => '<tr class="click" data-view-inv="' + i.id + '"><td class="latin">' + esc(i.no) + '</td><td class="nowrap">' + U.fmtDateShort(i.date) + '</td><td>' + esc(i.items.map((x) => x.name).join(_t('، '))) + (i.installments ? ' ' + UI.badge(_t('قیست ×') + U.d(i.installments), 'b-blue') : '') + '</td><td class="num">' + U.money(i.total) + '</td><td class="num">' + (Store.invBalance(i) ? '<b class="down">' + U.money(Store.invBalance(i)) + '</b>' : '—') + '</td><td>' + UI.invBadge(i) + '</td><td>' + (Store.invBalance(i) && Store.can('billing') ? '<button class="btn xs" data-pay="' + i.id + _t('">وەرگرتن</button>') : '') + '</td></tr>').join('') + '</tbody></table></div>' : UI.empty(_t('هیچ پسوولەیەک نییە'), 'receipt')) + '</section>';
    }
    if (tab === 'clinical') {
      const notes = p.clinical.slice().sort(U.by((c) => c.date, -1));
      html += '<div class="split"><section class="card"><div class="card-head"><span class="card-title">' + I('file') + _t('تێبینی پزیشکی</span>') + (Store.can('edit_medical') ? '<button class="btn sm primary" data-note-add>' + I('plus', 'sm') + _t('تێبینی نوێ</button>') : '') + '</div>' + (notes.length ? '<div class="list feed">' + notes.map((c) => '<div class="li"><time>' + U.fmtDateShort(c.date) + '</time><span class="grow"><span class="t" style="font-weight:400">' + esc(c.text) + '</span><span class="s">' + esc(Store.doctorName(c.doctorId)) + '</span></span></div>').join('') + '</div>' : UI.empty(_t('هیچ تێبینییەک نەنووسراوە'), 'file')) + '</section>' +
        '<section class="card"><div class="card-head"><span class="card-title">' + I('pill') + _t('ڕەچەتەکان</span>') + (Store.can('edit_medical') ? '<button class="btn sm" data-rx>' + I('plus', 'sm') + _t('ڕەچەتەی نوێ</button>') : '') + '</div>' + (p.prescriptions.length ? '<div class="list">' + p.prescriptions.slice().reverse().map((rx) => '<div class="li"><span class="grow"><span class="t">' + esc(rx.meds.map((m) => m.name).join(', ')) + '</span><span class="s">' + U.fmtDateShort(rx.date) + ' · ' + esc(Store.doctorName(rx.doctorId)) + '</span></span><span class="row" style="gap:4px"><a class="btn xs wa" target="_blank" rel="noopener" href="' + U.waLink(p.phone, rxText(p, rx)) + '">' + I('whatsapp', 'sm') + _t('واتسئاپ</a><button class="btn xs" data-rx-print="') + rx.id + '">' + I('printer', 'sm') + _t('چاپ</button></span></div>')).join('') + '</div>' : UI.empty(_t('هیچ ڕەچەتەیەک نەنووسراوە'), 'pill')) + '</section></div>';
    }
    if (tab === 'files') {
      html += '<section class="card"><div class="card-head"><span class="card-title">' + I('image') + _t('تیشک و فایلەکان</span><label class="btn sm primary" style="cursor:pointer">') + I('upload', 'sm') + _t('بارکردنی وێنە<input type="file" accept="image/*" data-upload hidden multiple></label></div>') +
        _t('<p class="hint" style="margin-top:0">وێنەی تیشک، وێنەی پێش و دوای چارەسەر، یان فۆرمی ڕەزامەندی. لەم وەشانەی تاقیکردنەوەدا فایلەکان لە وێبگەڕەکەدا هەڵدەگیرێن.</p>') +
        (p.files.length ? '<div class="files">' + p.files.map((fl) => '<div class="file"><button type="button" class="thumb" data-file="' + fl.id + '" style="border:none;cursor:zoom-in;padding:0">' + (fl.data ? '<img src="' + fl.data + '" alt="' + esc(fl.name) + '">' : I('image', 'lg')) + '</button><div class="info"><b>' + esc(fl.name) + '</b><small>' + U.fmtDateShort(fl.date) + ' · ' + esc(fl.kind || '') + '</small><button class="btn xs danger" data-file-del="' + fl.id + '" style="margin-top:4px">' + I('trash', 'sm') + _t('سڕینەوە</button></div></div>')).join('') + '</div>' : UI.empty(_t('هیچ فایلێک بار نەکراوە'), 'image')) + '</section>';
    }
    return html;
  }

  function toothModal(p, n) {
    const t = p.teeth[n] || { status: 'healthy', note: '' };
    const canEdit = Store.can('edit_medical');
    const hist = Store.appts({ patientId: p.id, allScopes: true }).filter((a) => a.tooth === Number(n)).sort(U.by((a) => a.date, -1));
    const svc = Store.db.services.filter((s) => s.active && s.perTooth);
    const m = UI.modal({
      title: _t('ددانی ') + n,
      body: (canEdit ? _t('<div class="field"><span class="lbl">باری ددان</span><div class="chips">') + Object.entries(Store.TOOTH).map(([k, v]) => '<label class="chip" style="cursor:pointer"><input type="radio" name="status" value="' + k + '"' + (t.status === k ? ' checked' : '') + ' style="accent-color:var(--navy)">' + esc(v.label) + '</label>').join('') + '</div></div>' + UI.field(_t('تێبینی'), '<input class="input" name="note" value="' + esc(t.note || '') + _t('" placeholder="نموونە: کلۆری قووڵ لە ڕووی ناوەوە">')) +
        _t('<div class="field"><span class="lbl">زیادکردن بۆ پلانی چارەسەر</span><div class="row wrap"><select class="select" name="planSvc" style="flex:1;min-width:200px">') + UI.opts(svc, '', _t('— هیچ —')) + '</select></div></div>' : '<p>' + esc(Store.TOOTH[t.status].label) + (t.note ? ' — ' + esc(t.note) : '') + '</p>') +
        (hist.length ? _t('<div><div class="small muted" style="margin-bottom:4px">مێژووی ئەم ددانە</div>') + hist.map((a) => '<div class="small">• ' + U.fmtDateShort(a.date) + ' — ' + esc(Store.serviceName(a.serviceId)) + ' · ' + esc(Store.STATUS[a.status].label) + '</div>').join('') + '</div>' : ''),
      foot: canEdit ? _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>') + I('check') + _t('پاشەکەوتکردن</button>') : _t('<button class="btn" data-close>داخستن</button>')
    });
    const ok = m.$('[data-ok]');
    if (ok) ok.addEventListener('click', () => {
      const st = (m.$('[name=status]:checked') || {}).value || 'healthy';
      const note = m.$('[name=note]').value.trim();
      if (st === 'healthy' && !note) delete p.teeth[n]; else p.teeth[n] = { status: st, note, date: U.today() };
      const ps = m.$('[name=planSvc]').value;
      if (ps) p.plan.push({ id: U.uid('pl'), tooth: Number(n), serviceId: ps, price: Store.service(ps).price, status: 'planned', doctorId: Store.me.role === 'doctor' ? Store.me.id : p.doctorId, createdAt: U.today() });
      Store.commit('medical', _t('نەخشەی ددانی ') + p.name + _t(' نوێ کرایەوە (ددانی ') + n + ')', { ref: p.id });
      m.close();
      UI.toast(_t('ددانی ') + n + _t(' نوێ کرایەوە'));
    });
  }
  function planAdd(p) {
    const svc = Store.db.services.filter((s) => s.active);
    const docs = Store.doctors();
    const m = UI.modal({
      title: _t('زیادکردنی چارەسەر بۆ پلان'), size: 'narrow',
      body: '<form class="form" id="plf" style="grid-template-columns:minmax(0,1fr)">' + UI.field(_t('چارەسەر'), '<select class="select" name="serviceId">' + UI.opts(svc, '', '—') + '</select>', { req: true }) + UI.field(_t('ددان'), '<select class="select" name="tooth">' + UI.opts([['', _t('— گشتی —')]].concat(Seed.TEETH_UP.concat(Seed.TEETH_LO).map((t) => [t, String(t)]))) + '</select>') + UI.field(_t('دکتۆر'), '<select class="select" name="doctorId">' + UI.opts(docs, Store.me.role === 'doctor' ? Store.me.id : p.doctorId) + '</select>') + UI.field(_t('نرخ (د.ع)'), '<input class="input" name="price" inputmode="numeric">', { hint: _t('خۆکارانە لە لیستی نرخەکانەوە پڕ دەکرێتەوە') }) + '</form>',
      foot: _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>زیادکردن</button>')
    });
    const f = m.$('#plf');
    f.serviceId.addEventListener('change', () => { const s = Store.service(f.serviceId.value); if (s) f.price.value = s.price; });
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { serviceId: UI.req(_t('چارەسەر هەڵبژێرە')), price: UI.numRule(0) })) return;
      const d = UI.data(f);
      p.plan.push({ id: U.uid('pl'), tooth: d.tooth ? Number(d.tooth) : null, serviceId: d.serviceId, price: UI.parseNum(d.price), status: 'planned', doctorId: d.doctorId, createdAt: U.today() });
      if (d.tooth && !p.teeth[d.tooth]) p.teeth[d.tooth] = { status: 'needs', note: Store.serviceName(d.serviceId) + _t(' پلان کراوە'), date: U.today() };
      Store.commit('medical', _t('چارەسەری «') + Store.serviceName(d.serviceId) + _t('» بۆ پلانی ') + p.name + _t(' زیاد کرا'), { ref: p.id });
      m.close();
    });
  }
  function noteAdd(p) {
    const m = UI.modal({
      title: _t('تێبینی پزیشکی نوێ'), size: 'narrow',
      body: UI.field(_t('بەروار'), '<input class="input" type="date" name="date" value="' + U.today() + '">') + UI.field(_t('تێبینی'), _t('<textarea class="textarea" name="text" style="min-height:120px" placeholder="پشکنین، دۆزینەوە، چارەسەر، ئامۆژگاری…"></textarea>'), { req: true }),
      foot: _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>پاشەکەوتکردن</button>')
    });
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(m.el, { text: UI.req(_t('تێبینی بنووسە')) })) return;
      p.clinical.push({ id: U.uid('cn'), date: m.$('[name=date]').value || U.today(), doctorId: Store.me.role === 'doctor' ? Store.me.id : p.doctorId, text: m.$('[name=text]').value.trim(), by: Store.me.id });
      Store.commit('medical', _t('تێبینی پزیشکی بۆ ') + p.name + _t(' زیاد کرا'), { ref: p.id });
      m.close();
    });
  }
  /* allergy names the patient has → allergy ids from the list (matched by name) */
  function allergyIdsOf(p) {
    const all = Store.list('allergies', true);
    return all.filter((a) => p.allergies.some((x) => x.trim().toLowerCase() === a.name.toLowerCase())).map((a) => a.id);
  }
  function medConflict(p, med) {
    if (!med || !med.conflicts || !med.conflicts.length) return null;
    const mine = allergyIdsOf(p);
    const hit = med.conflicts.filter((c) => mine.includes(c));
    if (!hit.length) return null;
    return hit.map((id) => (Store.listItem('allergies', id) || {}).name).filter(Boolean).join(', ');
  }
  function rxModal(p) {
    const docId = Store.me.role === 'doctor' ? Store.me.id : p.doctorId;
    const meds = Store.list('medicines');
    const cats = Store.list('medCategories').filter((c) => meds.some((m) => m.categoryId === c.id));
    const advice = Store.list('rxAdvice');
    const risky = meds.filter((m) => medConflict(p, m));
    const byName = (n) => Store.list('medicines', true).find((m) => m.name.toLowerCase() === String(n || '').trim().toLowerCase());
    const row = (m) => '<div class="line-item" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1.6fr) minmax(0,1fr) 36px"><input class="input" data-k="name" list="dl-meds" value="' + esc(m ? m.name : '') + _t('" placeholder="ناوی دەرمان" dir="ltr"><input class="input" data-k="dose" value="') + esc(m ? m.dose : '') + _t('" placeholder="بڕ"><input class="input" data-k="freq" value="') + esc(m ? m.freq : '') + _t('" placeholder="چەند جار"><input class="input" data-k="days" value="') + esc(m ? m.days : '') + _t('" placeholder="ماوە"><button type="button" class="icon-btn" data-rm aria-label="لابردن" style="width:36px;height:36px">') + I('x', 'sm') + '</button></div>';
    const chipsFor = (catId) => meds.filter((m) => !catId || m.categoryId === catId).map((m) => '<button type="button" class="chip" data-preset="' + m.id + '"' + (medConflict(p, m) ? ' style="border-color:var(--red);color:var(--red-fg)" title="' + esc(medConflict(p, m)) + '"' : '') + '><span dir="ltr">' + esc(m.name) + '</span></button>').join('') || _t('<span class="muted small">هیچ دەرمانێک لەم جۆرەدا نییە</span>');
    const canManage = Store.can('manage_lists');
    const m = UI.modal({
      title: _t('ڕەچەتەی نوێ — ') + p.name, size: 'wide', sticky: true,
      body: (p.allergies.length ? '<div class="alert red">' + I('alert') + _t('<span>ئاگاداری: نەخۆش هەستیاری هەیە بە ') + esc(p.allergies.join(', ')) + '.' + (risky.length ? _t(' ئەو دەرمانانەی بە سوور نیشانکراون لەگەڵیدا ناگونجێن.') : '') + '</span></div>' : '') +
        _t('<div class="field"><span class="lbl row between"><span>دەرمانی ئامادە (کلیک بکە بۆ زیادکردن)</span>') + (canManage ? '<a href="#/admin?tab=lists&list=medicines" data-close class="small">' + I('edit', 'sm') + _t(' بەڕێوەبردنی لیستی دەرمان</a>') : '') + '</span>' +
        (cats.length > 1 ? _t('<div class="chips" style="margin-bottom:6px"><button type="button" class="chip on" data-rxcat="">هەموو</button>') + cats.map((c) => '<button type="button" class="chip" data-rxcat="' + c.id + '">' + esc(c.name) + '</button>').join('') + '</div>' : '') +
        '<div class="chips" id="rx-presets">' + chipsFor('') + '</div></div>' +
        '<datalist id="dl-meds">' + meds.map((x) => '<option value="' + esc(x.name) + '">').join('') + '</datalist>' +
        '<div class="line-items" id="rx-lines">' + row() + '</div><button type="button" class="btn sm" data-add-line style="align-self:flex-start">' + I('plus', 'sm') + _t('دەرمانی تر</button>') +
        _t('<div class="field"><span class="lbl">ئامۆژگاری</span>') + (advice.length ? '<div class="chips" style="margin-bottom:6px">' + advice.map((x) => '<button type="button" class="chip" data-advice="' + x.id + '">' + I('plus', 'sm') + esc(x.name.length > 38 ? x.name.slice(0, 36) + '…' : x.name) + '</button>').join('') + '</div>' : '') + '<textarea class="textarea" name="advice" style="min-height:70px">' + esc(advice[0] ? advice[0].name : '') + '</textarea></div>',
      foot: _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn" data-save>پاشەکەوتکردن</button><button class="btn primary" data-print>') + I('printer') + _t('پاشەکەوت و چاپ</button>')
    });
    const lines = m.$('#rx-lines');
    const warnCheck = (name) => { const c = medConflict(p, byName(name)); if (c) UI.toast(_t('ئاگاداری: ') + name + _t(' لەگەڵ هەستیاری نەخۆشەکە (') + c + _t(') ناگونجێت!'), 'err'); };
    m.el.addEventListener('click', (e) => {
      const cb = e.target.closest('[data-rxcat]');
      if (cb) { m.$$('[data-rxcat]').forEach((b) => b.classList.toggle('on', b === cb)); m.$('#rx-presets').innerHTML = chipsFor(cb.dataset.rxcat); return; }
      const pr = e.target.closest('[data-preset]');
      if (pr) {
        const x = meds.find((k) => k.id === pr.dataset.preset);
        const empty = Array.from(lines.querySelectorAll('.line-item')).find((li) => !li.querySelector('[data-k=name]').value.trim());
        if (empty) empty.outerHTML = row(x); else lines.insertAdjacentHTML('beforeend', row(x));
        warnCheck(x.name);
      }
      const ad = e.target.closest('[data-advice]');
      if (ad) { const x = advice.find((k) => k.id === ad.dataset.advice); const ta = m.$('[name=advice]'); if (x && !ta.value.includes(x.name)) ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + x.name; }
      if (e.target.closest('[data-add-line]')) lines.insertAdjacentHTML('beforeend', row());
      const rm = e.target.closest('[data-rm]');
      if (rm) { if (lines.children.length > 1) rm.closest('.line-item').remove(); else rm.closest('.line-item').querySelectorAll('input').forEach((i) => { i.value = ''; }); }
    });
    /* typing a known medicine name fills its dose, frequency and duration */
    lines.addEventListener('change', (e) => {
      if (!e.target.matches('[data-k=name]')) return;
      const x = byName(e.target.value);
      if (!x) return;
      const li = e.target.closest('.line-item');
      ['dose', 'freq', 'days'].forEach((k) => { const inp = li.querySelector('[data-k=' + k + ']'); if (!inp.value) inp.value = x[k] || ''; });
      warnCheck(x.name);
    });
    const save = (print) => {
      const list = Array.from(lines.querySelectorAll('.line-item')).map((li) => ({ name: li.querySelector('[data-k=name]').value.trim(), dose: li.querySelector('[data-k=dose]').value.trim(), freq: li.querySelector('[data-k=freq]').value.trim(), days: li.querySelector('[data-k=days]').value.trim() })).filter((x) => x.name);
      if (!list.length) { UI.toast(_t('لانیکەم یەک دەرمان بنووسە'), 'err'); return; }
      const rx = { id: U.uid('rx'), date: U.today(), doctorId: docId, meds: list, advice: m.$('[name=advice]').value.trim() };
      p.prescriptions.push(rx);
      Store.commit('medical', _t('ڕەچەتە بۆ ') + p.name + _t(' نووسرا'), { ref: p.id });
      m.close();
      UI.toast(_t('ڕەچەتەکە پاشەکەوت کرا'));
      if (print) printRx(p, rx);
    };
    m.$('[data-save]').addEventListener('click', () => save(false));
    m.$('[data-print]').addEventListener('click', () => save(true));
  }
  /* prescription as a WhatsApp message to the patient */
  function rxText(p, rx) {
    const doc = Store.user(rx.doctorId);
    return Store.db.settings.clinicName + ' — ' + _t('ڕەچەتەی پزیشکی') + '\n' + p.name + ' · ' + U.fmtDate(rx.date) + '\n' + (doc ? doc.name : '') + '\n\n' +
      rx.meds.map((x, i) => (i + 1) + '. ' + x.name + (x.dose || x.freq || x.days ? '\n   ' + [x.dose, x.freq, x.days ? _t('بۆ ماوەی ') + x.days : ''].filter(Boolean).join(' — ') : '')).join('\n') +
      (rx.advice ? '\n\n' + _t('ئامۆژگاری:') + ' ' + rx.advice : '');
  }
  function printRx(p, rx) {
    const doc = Store.user(rx.doctorId);
    const age = U.age(p.dob);
    UI.print('<div class="doc">' + UI.docHead(_t('ڕەچەتەی پزیشکی'), _t('<div>بەروار: ') + U.fmtDate(rx.date) + _t('</div><div>پەڕگە: #') + U.d(p.fileNo) + '</div>') +
      _t('<table><tr><th>ناوی نەخۆش</th><td>') + esc(p.name) + _t('</td><th>تەمەن</th><td>') + (age !== null ? U.num(age) : '—') + _t('</td></tr><tr><th>دکتۆر</th><td>') + esc(doc ? doc.name : '') + _t('</td><th>هەستیاری</th><td>') + esc(p.allergies.join(', ') || _t('نییە')) + '</td></tr></table>' +
      '<div class="rx">℞</div>' + rx.meds.map((x, i) => '<div class="med"><b class="ltr" style="display:inline-block">' + U.d(i + 1) + '. ' + esc(x.name) + '</b><div>' + esc([x.dose, x.freq, x.days ? _t('بۆ ماوەی ') + x.days : ''].filter(Boolean).join(' — ')) + '</div></div>').join('') +
      (rx.advice ? _t('<p style="margin-top:14px"><b>ئامۆژگاری:</b> ') + esc(rx.advice) + '</p>' : '') +
      _t('<div class="sig"><div>واژووی دکتۆر<br>') + esc(doc ? doc.name : '') + _t('</div><div>مۆری کلینیک</div></div>') +
      '<div class="foot"><span>' + esc(Store.db.settings.clinicName) + '</span><span>' + U.fmtPhone(Store.db.settings.phone) + '</span></div></div>');
  }
  function printQuote(p) {
    const open = p.plan.filter((x) => x.status !== 'done');
    UI.print('<div class="doc">' + UI.docHead(_t('خەمڵاندنی نرخی چارەسەر'), _t('<div>بەروار: ') + U.fmtDate(U.today()) + _t('</div><div>پەڕگە: #') + U.d(p.fileNo) + '</div>') +
      _t('<p>بۆ: <b>') + esc(p.name) + _t('</b></p><table><thead><tr><th>#</th><th>ددان</th><th>چارەسەر</th><th>دکتۆر</th><th class="num">نرخ (د.ع)</th></tr></thead><tbody>') + open.map((it, i) => '<tr><td>' + U.d(i + 1) + '</td><td class="latin">' + (it.tooth || '—') + '</td><td>' + esc(Store.serviceName(it.serviceId)) + '</td><td>' + esc(Store.doctorName(it.doctorId)) + '</td><td class="num">' + U.num(it.price) + '</td></tr>').join('') + '</tbody></table>' +
      _t('<table class="tot"><tr class="g"><td>کۆی گشتی</td><td class="num">') + U.money(U.sum(open, (x) => x.price)) + _t('</td></tr></table><p style="font-size:10pt;color:#555">ئەم خەمڵاندنە بۆ ماوەی ٣٠ ڕۆژ بەکارە. دەتوانرێت بە قیست بدرێت.</p>') +
      '<div class="foot"><span>' + esc(Store.db.settings.clinicName) + '</span><span>' + esc(Store.db.settings.invoiceNote || '') + '</span></div></div>');
  }

  Pages.patients = {
    title: (r) => (r.parts[1] ? (Store.patient(r.parts[1]) || {}).name || _t('نەخۆش') : _t('نەخۆشەکان')),
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
          const rows = [[_t('ژمارەی پەڕگە'), _t('ناو'), _t('مۆبایل'), _t('ڕەگەز'), _t('لەدایکبوون'), _t('ناونیشان'), _t('دکتۆر'), _t('سەرچاوە'), _t('هەستیاری'), _t('نەخۆشی'), _t('قەرز'), _t('تۆمارکراو')]];
          Store.visiblePatients().forEach((p) => rows.push([p.fileNo, p.name, p.phone, p.gender === 'f' ? _t('مێ') : p.gender === 'm' ? _t('نێر') : '', p.dob, p.address, Store.doctorName(p.doctorId), p.source, p.allergies.join(' / '), p.conditions.join(' / '), Store.patientBalance(p.id), p.createdAt]));
          U.download('bite-patients-' + U.today() + '.csv', U.csv(rows), 'text/csv;charset=utf-8');
          Store.log('export', _t('لیستی نەخۆشەکانی هەناردە کرد')); Store.save();
          UI.toast(_t('فایلەکە دابەزی'));
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
        if (pd) { const it = p.plan.find((x) => x.id === pd.dataset.planDone); it.status = 'done'; it.doneAt = U.today(); Store.commit('medical', _t('چارەسەری پلان تەواو کرا بۆ ') + p.name); }
        const pdel = e.target.closest('[data-plan-del]');
        if (pdel && await UI.confirm({ title: _t('لابردن لە پلان'), text: _t('ئەم چارەسەرە لە پلان لادەبرێت.'), ok: _t('لابردن'), danger: true })) { p.plan = p.plan.filter((x) => x.id !== pdel.dataset.planDel); Store.commit('medical', _t('چارەسەرێک لە پلانی ') + p.name + _t(' لابرا')); }
        if (e.target.closest('[data-note-add]')) noteAdd(p);
        const vi = e.target.closest('[data-view-inv]');
        if (vi && !e.target.closest('[data-pay]')) Pages.billing.openInvoice(vi.dataset.viewInv);
        const fl = e.target.closest('[data-file]');
        if (fl) { const f = p.files.find((x) => x.id === fl.dataset.file); if (f && f.data) UI.modal({ title: f.name, size: 'wide', body: '<img src="' + f.data + '" alt="" style="width:100%;border-radius:12px;background:#000">' }); }
        const fd = e.target.closest('[data-file-del]');
        if (fd && await UI.confirm({ title: _t('سڕینەوەی فایل'), text: _t('ئەم فایلە بە یەکجاری دەسڕێتەوە.'), ok: _t('سڕینەوە'), danger: true })) { p.files = p.files.filter((x) => x.id !== fd.dataset.fileDel); Store.commit('patient', _t('فایلێک لە پەڕگەی ') + p.name + _t(' سڕایەوە')); }
      });
      const up = root.querySelector('[data-upload]');
      if (up) up.addEventListener('change', async () => {
        const files = Array.from(up.files || []);
        for (const file of files) {
          try {
            const raw = await UI.readFile(file, 8000);
            const small = await UI.shrinkImage(raw, 1400, 0.78);
            p.files.push({ id: U.uid('f'), name: file.name.replace(/\.[^.]+$/, ''), kind: /pano|opg/i.test(file.name) ? _t('پانۆراما') : _t('وێنە'), date: U.today(), data: small, by: Store.me.id });
          } catch (err) { UI.toast(err.message, 'err'); }
        }
        Store.commit('patient', U.num(files.length) + _t(' فایل بۆ پەڕگەی ') + p.name + _t(' بار کرا'), { ref: p.id });
        UI.toast(_t('فایلەکان بار کران'));
      });
    }
  };
})();
