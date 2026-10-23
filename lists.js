/* Admin → Lists: every option list in the system (medicines and their categories, allergies,
   conditions, sources, expense types, payment methods, inventory, lab…) can be added, renamed,
   re-ordered, switched off or deleted here. */
(function () {
  const esc = U.esc;
  const st = { key: 'medicines', q: '', cat: '' };

  const GROUPS = [
    [_t('پزیشکی'), [['medicines', _t('دەرمانەکان'), 'pill'], ['medCategories', _t('جۆرەکانی دەرمان'), 'tag'], ['rxAdvice', _t('ئامۆژگاری ڕەچەتە'), 'file'], ['allergies', _t('هەستیارییەکان'), 'alert'], ['conditions', _t('نەخۆشی و باری تەندروستی'), 'stethoscope']]],
    [_t('نەخۆش'), [['patientSources', _t('سەرچاوەی ناساندن'), 'globe'], ['patientTags', _t('نیشانەکانی نەخۆش'), 'star'], ['areas', _t('ناوچە و ناونیشان'), 'home']]],
    [_t('نۆرە و ستاف'), [['apptSources', _t('سەرچاوەی نۆرە'), 'calendar'], ['leaveReasons', _t('هۆکاری مۆڵەت'), 'clock'], ['specialties', _t('پسپۆڕییەکان'), 'user']]],
    [_t('خزمەتگوزاری و پارە'), [['serviceCategories', _t('پۆلی خزمەتگوزاری'), 'receipt'], ['expenseCategories', _t('جۆرەکانی خەرجی'), 'wallet'], ['paymentMethods', _t('شێوازەکانی پارەدان'), 'wallet']]],
    [_t('کۆگا و تاقیگە'), [['inventoryCategories', _t('پۆلەکانی کۆگا'), 'box'], ['inventoryUnits', _t('یەکەکانی پێوان'), 'box'], ['suppliers', _t('دابینکەرەکان'), 'box'], ['labWorkTypes', _t('جۆری کاری تاقیگە'), 'flask'], ['labs', _t('تاقیگەکان'), 'flask']]]
  ];
  const HELP = {
    medicines: _t('لە ڕەچەتەدا وەک دەرمانی ئامادە پیشان دەدرێن. ئەگەر دەرمانێک لەگەڵ هەستیارییەکی نەخۆش نەگونجێت، سیستەمەکە ئاگادارت دەکاتەوە.'),
    medCategories: _t('دەرمانەکان بەپێی ئەم جۆرانە پۆلێن دەکرێن (بۆ نموونە دژە بەکتریا، ئازارشکێن).'),
    rxAdvice: _t('دەقی ئامادە کە بە یەک کلیک دەخرێتە ناو ڕەچەتەوە.'),
    allergies: _t('لە فۆرمی نەخۆشدا وەک هەڵبژاردن دەردەکەون و بۆ ئاگاداری دەرمان بەکاردێن.'),
    conditions: _t('نەخۆشییە درێژخایەنەکان کە لە پەڕگەی نەخۆشدا تۆمار دەکرێن.'),
    patientSources: _t('نەخۆش چۆن ئاشنای کلینیک بوو. لە ڕاپۆرتی سەرچاوەکاندا بەکاردێت.'),
    patientTags: _t('نیشانەی تایبەت بۆ نەخۆش (VIP، ترس لە ددانساز…).'),
    areas: _t('پێشنیارەکانی خانەی ناونیشان لە فۆرمی نەخۆشدا.'),
    apptSources: _t('نۆرەکە لە کوێوە گیرا (پێشوازی، تەلەفۆن، واتسئاپ…).'),
    leaveReasons: _t('هۆکارە ئامادەکان لە کاتی تۆمارکردنی مۆڵەتی دکتۆردا.'),
    specialties: _t('لە فۆرمی دکتۆردا وەک پێشنیار دەردەکەون.'),
    serviceCategories: _t('خزمەتگوزارییەکان و نرخەکان بەپێی ئەم پۆلانە ڕیز دەکرێن.'),
    expenseCategories: _t('جۆرەکانی خەرجی لە فۆرمی خەرجی و ڕاپۆرتی قازانجدا.'),
    paymentMethods: _t('شێوازەکانی وەرگرتنی پارە لە پسوولەدا.'),
    inventoryCategories: _t('پۆلەکانی کەرەستە لە کۆگادا.'),
    inventoryUnits: _t('یەکەی پێوانی کەرەستەکان (قوتوو، پاکەت، دانە…).'),
    suppliers: _t('ئەو کۆمپانیایانەی کەرەستە دابین دەکەن.'),
    labWorkTypes: _t('جۆرەکانی کار لە داواکاری تاقیگەدا.'),
    labs: _t('ئەو تاقیگانەی کلینیک کاریان لەگەڵ دەکات.')
  };
  const titleOf = (key) => { for (const g of GROUPS) for (const x of g[1]) if (x[0] === key) return x[1]; return key; };
  const iconOf = (key) => { for (const g of GROUPS) for (const x of g[1]) if (x[0] === key) return x[2]; return 'list'; };

  /* how each list is used by records: count, and rename/propagate */
  const db = () => Store.db;
  const arrField = (coll, field) => ({
    count: (name) => db()[coll].filter((r) => (r[field] || []).includes(name)).length,
    rename: (from, to) => db()[coll].forEach((r) => { if (Array.isArray(r[field])) r[field] = r[field].map((x) => (x === from ? to : x)); })
  });
  const strField = (coll, field, filter) => ({
    count: (name) => db()[coll].filter((r) => (!filter || filter(r)) && r[field] === name).length,
    rename: (from, to) => db()[coll].forEach((r) => { if ((!filter || filter(r)) && r[field] === from) r[field] = to; })
  });
  const multi = (...parts) => ({ count: (n) => U.sum(parts, (p) => p.count(n)), rename: (a, b) => parts.forEach((p) => p.rename(a, b)) });
  const USAGE = {
    allergies: arrField('patients', 'allergies'),
    conditions: arrField('patients', 'conditions'),
    patientTags: arrField('patients', 'tags'),
    patientSources: strField('patients', 'source'),
    areas: strField('patients', 'address'),
    apptSources: multi(strField('appointments', 'source'), strField('requests', 'source')),
    leaveReasons: strField('leaves', 'reason'),
    specialties: multi(strField('users', 'specialty', (u) => u.role === 'doctor'), strField('users', 'title', (u) => u.role === 'doctor')),
    serviceCategories: strField('services', 'category'),
    expenseCategories: strField('expenses', 'category'),
    inventoryCategories: strField('inventory', 'category'),
    inventoryUnits: strField('inventory', 'unit'),
    suppliers: strField('inventory', 'supplier'),
    labWorkTypes: strField('labOrders', 'type'),
    labs: strField('labOrders', 'lab')
  };
  function usedBy(key, item) {
    if (key === 'paymentMethods') return db().payments.filter((p) => p.method === item.id).length;
    if (key === 'medCategories') return db().lists.medicines.filter((m) => m.categoryId === item.id).length;
    if (key === 'medicines') return U.sum(db().patients, (p) => p.prescriptions.filter((rx) => rx.meds.some((m) => m.name === item.name)).length);
    return USAGE[key] ? USAGE[key].count(item.name) : 0;
  }
  const usedLabel = (key) => (key === 'medCategories' ? _t('دەرمان') : key === 'medicines' ? _t('ڕەچەتە') : key === 'paymentMethods' ? _t('پارەدان') : _t('تۆمار'));

  /* ---------- views ---------- */
  function nav() {
    return '<nav class="lists-nav card">' + GROUPS.map(([g, items]) => '<div class="ln-group"><span class="ln-title">' + esc(g) + '</span>' + items.map(([k, label, icon]) => '<button type="button" class="ln-item' + (k === st.key ? ' on' : '') + '" data-lkey="' + k + '">' + I(icon, 'sm') + '<span class="grow">' + esc(label) + '</span><span class="ln-count">' + U.num(Store.list(k, true).length) + '</span></button>').join('') + '</div>').join('') + '</nav>';
  }
  function head(key, extra) {
    const all = Store.list(key, true);
    return '<div class="card-head" style="padding:16px 20px 0;align-items:flex-start"><span class="col" style="gap:2px"><span class="card-title">' + I(iconOf(key)) + esc(titleOf(key)) + ' <span class="badge">' + U.num(all.length) + '</span></span><span class="small muted">' + esc(HELP[key] || '') + '</span></span><button class="btn sm primary" data-lnew>' + I('plus', 'sm') + _t('زیادکردن</button></div>') +
      _t('<div class="row wrap" style="padding:12px 20px;gap:8px;border-bottom:1px solid var(--border)"><input class="input" data-lq style="max-width:260px" placeholder="گەڕان لە لیست" value="') + esc(st.q) + '">' + (extra || '') + '</div>';
  }
  const actions = (key, x, i, n) => '<span class="row" style="gap:4px;justify-content:flex-end">' +
    '<button class="icon-btn sm" data-lup="' + x.id + _t('" aria-label="بەرزکردنەوە"') + (i === 0 ? ' disabled' : '') + '>' + I('chevD', 'sm flip-y') + '</button>' +
    '<button class="icon-btn sm" data-ldown="' + x.id + _t('" aria-label="نزمکردنەوە"') + (i === n - 1 ? ' disabled' : '') + '>' + I('chevD', 'sm') + '</button>' +
    '<button class="btn xs" data-ledit="' + x.id + '">' + I('edit', 'sm') + _t('دەستکاری</button>') +
    '<button class="btn xs danger" data-ldel="' + x.id + _t('" aria-label="سڕینەوە">') + I('trash', 'sm') + '</button></span>';
  const sw = (x) => '<label class="switch"><input type="checkbox" data-lact="' + x.id + '"' + (x.active !== false ? ' checked' : '') + _t(' aria-label="چالاک"><span></span></label>');

  function simplePanel(key) {
    const all = Store.list(key, true);
    const rows = all.filter((x) => U.search(x.name, st.q));
    return '<section class="card flush">' + head(key) +
      (rows.length ? _t('<div class="table-wrap"><table class="t"><thead><tr><th>ناو</th><th>بەکارهاتووە لە</th><th>چالاک</th><th></th></tr></thead><tbody>') + rows.map((x) => { const i = all.indexOf(x); const n = usedBy(key, x); return '<tr' + (x.active === false ? ' style="opacity:.55"' : '') + '><td><b style="font-weight:600">' + esc(x.name) + '</b></td><td class="small">' + (n ? U.num(n) + ' ' + usedLabel(key) : '<span class="muted">—</span>') + '</td><td>' + sw(x) + '</td><td>' + actions(key, x, i, all.length) + '</td></tr>'; }).join('') + '</tbody></table></div>' : UI.empty(st.q ? _t('هیچ ئەنجامێک نییە') : _t('لیستەکە بەتاڵە. یەکەم دانە زیاد بکە.'), iconOf(key))) + '</section>';
  }
  function medsPanel() {
    const all = Store.list('medicines', true);
    const cats = Store.list('medCategories', true);
    const rows = all.filter((m) => (!st.cat || (st.cat === '_none' ? !Store.listItem('medCategories', m.categoryId) : m.categoryId === st.cat)) && U.search(m.name + ' ' + Store.medCategoryName(m.categoryId), st.q));
    const allergyName = (id) => { const a = Store.listItem('allergies', id); return a ? a.name : ''; };
    const catChips = '<div class="chips">' + [['', _t('هەموو'), all.length]].concat(cats.map((c) => [c.id, c.name, all.filter((m) => m.categoryId === c.id).length])).map(([id, name, n]) => '<button type="button" class="chip' + (st.cat === id ? ' on' : '') + '" data-lcat="' + id + '">' + esc(name) + ' <span class="muted">' + U.num(n) + '</span></button>').join('') + '<button type="button" class="chip" data-lkey="medCategories">' + I('edit', 'sm') + _t('بەڕێوەبردنی جۆرەکان</button></div>');
    return '<section class="card flush">' + head('medicines') + '<div style="padding:12px 20px 0">' + catChips + '</div>' +
      (rows.length ? _t('<div class="table-wrap" style="margin-top:8px"><table class="t"><thead><tr><th>دەرمان</th><th>جۆر</th><th>بڕ و چەند جار</th><th>ئاگاداری هەستیاری</th><th>چالاک</th><th></th></tr></thead><tbody>') + rows.map((m) => { const i = all.indexOf(m); return '<tr' + (m.active === false ? ' style="opacity:.55"' : '') + '><td><b class="ltr" style="display:inline-block;font-weight:600">' + esc(m.name) + '</b>' + (m.note ? '<div class="small muted">' + esc(m.note) + '</div>' : '') + '</td><td>' + (Store.medCategoryName(m.categoryId) ? UI.badge(Store.medCategoryName(m.categoryId), 'b-mint') : _t('<span class="muted small">بێ جۆر</span>')) + '</td><td class="small">' + esc([m.dose, m.freq, m.days].filter(Boolean).join(' · ')) + '</td><td>' + ((m.conflicts || []).map(allergyName).filter(Boolean).map((n) => UI.badge(n, 'b-red')).join(' ') || '<span class="muted small">—</span>') + '</td><td>' + sw(m) + '</td><td>' + actions('medicines', m, i, all.length) + '</td></tr>'; }).join('') + '</tbody></table></div>' : UI.empty(st.q || st.cat ? _t('هیچ دەرمانێک نییە بەم مەرجانە') : _t('هیچ دەرمانێک نییە. یەکەم دەرمان زیاد بکە.'), 'pill')) + '</section>';
  }
  function tab(params) {
    if (params && params.list && Store.db.lists[params.list]) st.key = params.list;
    return '<div class="alert blue">' + I('info') + _t('<span>هەموو لیستەکانی سیستەم لێرە بەڕێوە دەبرێن: زیادکردن، گۆڕینی ناو، ڕیزکردن، ناچالاککردن و سڕینەوە. بڕگەی ناچالاک لە فۆرمەکاندا پیشان نادرێت بەڵام تۆمارە کۆنەکان دەمێننەوە.</span></div>') +
      '<div class="lists-layout">' + nav() + '<div class="col" style="gap:14px;min-width:0">' + (st.key === 'medicines' ? medsPanel() : simplePanel(st.key)) + '</div></div>';
  }

  /* ---------- forms ---------- */
  function simpleForm(key, item, after) {
    const editing = !!item;
    const n = editing ? usedBy(key, item) : 0;
    const canProp = editing && n && USAGE[key];
    const m = UI.modal({
      title: (editing ? _t('دەستکاری — ') : _t('زیادکردن — ')) + titleOf(key), size: 'narrow',
      body: '<form class="form" id="lf" style="grid-template-columns:minmax(0,1fr)" novalidate>' +
        UI.field(key === 'rxAdvice' ? _t('دەق') : _t('ناو'), key === 'rxAdvice' ? '<textarea class="textarea" name="name" style="min-height:110px">' + esc(item ? item.name : '') + '</textarea>' : '<input class="input" name="name" value="' + esc(item ? item.name : '') + '">', { req: true }) +
        (canProp ? '<label class="check"><input type="checkbox" name="propagate" checked>' + _t('ناوە نوێیەکە لە ') + U.num(n) + ' ' + usedLabel(key) + _t('ی پێشوودا بگۆڕە') + '</label>' : '') +
        (!editing ? '' : '<label class="check"><input type="checkbox" name="active"' + (item.active !== false ? ' checked' : '') + _t('>چالاک (لە فۆرمەکاندا پیشان بدرێت)</label>')) + '</form>',
      foot: _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>') + I('check') + _t('پاشەکەوتکردن</button>')
    });
    const f = m.$('#lf');
    const go = () => {
      const list = Store.db.lists[key];
      if (!UI.validate(f, { name: (v) => (!v ? _t('ئەم خانەیە پێویستە') : list.some((x) => x !== item && x.name.toLowerCase() === v.toLowerCase()) ? _t('ئەم ناوە پێشتر لە لیستەکەدایە') : null) })) return;
      const d = UI.data(f);
      if (editing) {
        const old = item.name;
        item.name = d.name;
        item.active = d.active !== false;
        if (d.propagate && old !== d.name && USAGE[key]) USAGE[key].rename(old, d.name);
        Store.commit('list', titleOf(key) + ': «' + old + '» ← «' + d.name + '»');
        UI.toast(_t('گۆڕانکارییەکە پاشەکەوت کرا'));
      } else {
        const nx = { id: U.uid('li'), name: d.name, active: true };
        list.push(nx);
        Store.commit('list', titleOf(key) + ': «' + d.name + _t('» زیاد کرا'));
        UI.toast(_t('زیاد کرا'));
        if (after) after(nx);
      }
      m.close();
    };
    m.$('[data-ok]').addEventListener('click', go);
    f.addEventListener('submit', (e) => { e.preventDefault(); go(); });
  }
  function medForm(item) {
    const editing = !!item;
    const x = Object.assign({ name: '', categoryId: st.cat && st.cat !== '_none' ? st.cat : '', dose: '', freq: '', days: '', note: '', conflicts: [], active: true }, item || {});
    const meds = Store.list('medicines', true);
    const dl = (id, field) => '<datalist id="' + id + '">' + Array.from(new Set(meds.map((mm) => mm[field]).filter(Boolean))).map((v) => '<option value="' + esc(v) + '">').join('') + '</datalist>';
    const catOpts = () => UI.opts(Store.list('medCategories'), x.categoryId, _t('— بێ جۆر —'));
    const m = UI.modal({
      title: editing ? _t('دەستکاری دەرمان') : _t('دەرمانی نوێ'), size: 'wide', sticky: true,
      body: '<form class="form" id="mf" novalidate>' +
        UI.field(_t('ناوی دەرمان و هێز'), '<input class="input" name="name" dir="ltr" value="' + esc(x.name) + '" placeholder="Amoxicillin 500mg">', { req: true, hint: _t('ناوی زانستی یان بازرگانی، بە ئینگلیزی وەک لەسەر قوتووەکە') }) +
        _t('<div class="field"><label>جۆر</label><div class="row" style="gap:6px"><select class="select" name="categoryId">') + catOpts() + _t('</select><button type="button" class="btn sm" data-newcat title="جۆری نوێ">') + I('plus', 'sm') + '</button></div></div>' +
        UI.field(_t('بڕ'), '<input class="input" name="dose" list="dl-dose" value="' + esc(x.dose) + _t('" placeholder="١ حەب">') + dl('dl-dose', 'dose')) +
        UI.field(_t('چەند جار'), '<input class="input" name="freq" list="dl-freq" value="' + esc(x.freq) + _t('" placeholder="٣ جار لە ڕۆژێکدا">') + dl('dl-freq', 'freq')) +
        UI.field(_t('ماوە'), '<input class="input" name="days" list="dl-days" value="' + esc(x.days) + _t('" placeholder="٥ ڕۆژ">') + dl('dl-days', 'days')) +
        UI.field(_t('تێبینی'), '<input class="input" name="note" value="' + esc(x.note || '') + _t('" placeholder="بۆ نموونە: دوای نان">')) +
        _t('<div class="field full"><span class="lbl">ئاگادارم بکەرەوە ئەگەر نەخۆش هەستیاری هەبوو بە:</span><div class="chips">') + Store.list('allergies', true).map((a) => '<label class="chip" style="cursor:pointer"><input type="checkbox" name="conflicts" data-multi="1" value="' + a.id + '"' + ((x.conflicts || []).includes(a.id) ? ' checked' : '') + ' style="accent-color:var(--red)">' + esc(a.name) + '</label>').join('') + '</div></div>' +
        '<label class="check full"><input type="checkbox" name="active"' + (x.active !== false ? ' checked' : '') + _t('>چالاک (لە ڕەچەتەدا پیشان بدرێت)</label>') +
        '</form>',
      foot: (editing ? '<div class="left"><button class="btn danger sm" data-mdel>' + I('trash', 'sm') + _t('سڕینەوە</button></div>') : '') + _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>') + I('check') + _t('پاشەکەوتکردن</button>')
    });
    const f = m.$('#mf');
    m.$('[data-newcat]').addEventListener('click', () => simpleForm('medCategories', null, (c) => { x.categoryId = c.id; f.categoryId.innerHTML = catOpts(); f.categoryId.value = c.id; }));
    if (editing) m.$('[data-mdel]').addEventListener('click', () => { m.close(); del('medicines', item); });
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { name: (v) => (!v ? _t('ناوی دەرمان پێویستە') : meds.some((mm) => mm !== item && mm.name.toLowerCase() === v.toLowerCase()) ? _t('ئەم دەرمانە پێشتر هەیە') : null) })) return;
      const d = UI.data(f);
      const rec = { name: d.name, categoryId: d.categoryId, dose: d.dose, freq: d.freq, days: d.days, note: d.note, conflicts: d.conflicts || [], active: !!d.active };
      if (editing) { Object.assign(item, rec); Store.commit('list', _t('دەرمانی «') + rec.name + _t('» نوێ کرایەوە')); UI.toast(_t('دەرمانەکە نوێ کرایەوە')); } else { Store.db.lists.medicines.push(Object.assign({ id: U.uid('md') }, rec)); Store.commit('list', _t('دەرمانی نوێ: ') + rec.name); UI.toast(_t('دەرمانەکە زیاد کرا')); }
      m.close();
    });
  }
  async function del(key, item) {
    const n = usedBy(key, item);
    if (key === 'paymentMethods' && n) {
      UI.confirm({ title: _t('ناتوانرێت بسڕدرێتەوە'), html: '<b>' + esc(item.name) + _t('</b> بەکارهاتووە لە ژمارەیەک پارەداندا: ') + U.num(n) + _t('. بۆ پاراستنی حیسابەکان لە جیاتی سڕینەوە <b>ناچالاکی بکە</b>.'), ok: _t('ناچالاککردن'), danger: true }).then((y) => { if (y) { item.active = false; Store.commit('list', titleOf(key) + ': «' + item.name + _t('» ناچالاک کرا')); } });
      return;
    }
    const extra = !n ? '' : key === 'medCategories' ? '<br>' + U.num(n) + _t(' دەرمان ئەم جۆرەیان هەیە و دەبن بە «بێ جۆر».') : '<br>' + U.num(n) + ' ' + usedLabel(key) + _t(' ئەم ناوەیان تێدایە و وەک خۆی دەمێنێتەوە، بەڵام لە فۆرمەکاندا پیشان نادرێت.');
    if (!await UI.confirm({ title: _t('سڕینەوە'), html: '<b>' + esc(item.name) + _t('</b> لە لیستی «') + esc(titleOf(key)) + _t('» دەسڕێتەوە.') + extra, ok: _t('سڕینەوە'), danger: true })) return;
    Store.db.lists[key] = Store.db.lists[key].filter((x) => x !== item);
    if (key === 'medCategories') Store.db.lists.medicines.forEach((md) => { if (md.categoryId === item.id) md.categoryId = ''; });
    if (key === 'allergies') Store.db.lists.medicines.forEach((md) => { md.conflicts = (md.conflicts || []).filter((c) => c !== item.id); });
    Store.commit('list', titleOf(key) + ': «' + item.name + _t('» سڕایەوە'));
    UI.toast(_t('سڕایەوە'), 'warn');
  }
  function move(key, id, dir) {
    const list = Store.db.lists[key];
    const i = list.findIndex((x) => x.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    Store.commit(null);
  }

  function bind(root) {
    root.addEventListener('click', (e) => {
      const t = e.target;
      const k = t.closest('[data-lkey]'); if (k) { st.key = k.dataset.lkey; st.q = ''; st.cat = ''; App.setParams({ tab: 'lists', list: st.key }); return; }
      const c = t.closest('[data-lcat]'); if (c) { st.cat = c.dataset.lcat; App.render(); return; }
      if (t.closest('[data-lnew]')) { if (st.key === 'medicines') medForm(); else simpleForm(st.key); return; }
      const find = (id) => Store.db.lists[st.key].find((x) => x.id === id);
      const ed = t.closest('[data-ledit]'); if (ed) { const it = find(ed.dataset.ledit); if (st.key === 'medicines') medForm(it); else simpleForm(st.key, it); return; }
      const dl = t.closest('[data-ldel]'); if (dl) { del(st.key, find(dl.dataset.ldel)); return; }
      const up = t.closest('[data-lup]'); if (up && !up.disabled) { move(st.key, up.dataset.lup, -1); return; }
      const dn = t.closest('[data-ldown]'); if (dn && !dn.disabled) move(st.key, dn.dataset.ldown, 1);
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('[data-lact]')) {
        const it = Store.db.lists[st.key].find((x) => x.id === t.dataset.lact);
        if (!it) return;
        it.active = t.checked;
        Store.commit('list', titleOf(st.key) + ': «' + it.name + '» ' + (it.active ? _t('چالاک کرا') : _t('ناچالاک کرا')));
      }
    });
    const q = root.querySelector('[data-lq]');
    if (q) q.addEventListener('input', U.debounce(() => { st.q = q.value; App.render(); const n = document.querySelector('[data-lq]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 220));
  }

  Pages.lists = { tab, bind, simpleForm, medForm, titleOf };
})();
