/* Inventory: stock levels, low-stock alerts, purchases and usage */
(function () {
  const esc = U.esc;
  const state = { q: '', cat: '', low: false };

  function itemForm(it) {
    const withCur = (key, cur) => Array.from(new Set(Store.listNames(key).concat(cur ? [cur] : [])));
    const e = it || { name: '', category: Store.listNames('inventoryCategories')[0] || '', unit: Store.listNames('inventoryUnits')[0] || '', qty: 0, min: 5, cost: 0, supplier: '' };
    const cats = withCur('inventoryCategories', e.category);
    const m = UI.modal({
      title: it ? _t('دەستکاری کەرەستە') : _t('کەرەستەی نوێ'),
      body: '<form class="form" id="itf" novalidate>' + UI.field(_t('ناو'), '<input class="input" name="name" value="' + esc(e.name) + '">', { req: true, full: true }) +
        UI.field(_t('جۆر'), '<select class="select" name="category">' + UI.opts(cats.map((c) => [c, c]), e.category) + '</select>', { req: true }) +
        UI.field(_t('یەکە'), '<select class="select" name="unit">' + UI.opts(withCur('inventoryUnits', e.unit).map((x) => [x, x]), e.unit) + '</select>') +
        (it ? '' : UI.field(_t('بڕی ئێستا'), '<input class="input" name="qty" type="number" min="0" value="' + e.qty + '">')) +
        UI.field(_t('کەمترین بڕ (ئاگاداری)'), '<input class="input" name="min" type="number" min="0" value="' + e.min + '">', { hint: _t('کاتێک بڕەکە گەیشتە ئەمە، ئاگاداری دەردەکەوێت') }) +
        UI.field(_t('نرخی یەکە (د.ع)'), '<input class="input" name="cost" inputmode="numeric" value="' + e.cost + '">') +
        UI.field(_t('دابینکەر'), '<input class="input" name="supplier" list="dl-sup" value="' + esc(e.supplier) + '"><datalist id="dl-sup">' + Store.listNames('suppliers').map((x) => '<option value="' + esc(x) + '">').join('') + '</datalist>') + '</form>',
      foot: (it ? '<div class="left"><button class="btn danger sm" data-del>' + I('trash', 'sm') + _t('سڕینەوە</button></div>') : '') + _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>پاشەکەوتکردن</button>')
    });
    const f = m.$('#itf');
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { name: UI.req(_t('ناو پێویستە')), category: UI.req(_t('جۆر پێویستە')) })) return;
      const d = UI.data(f);
      const rec = { name: d.name, category: d.category, unit: d.unit, min: Number(d.min) || 0, cost: UI.parseNum(d.cost), supplier: d.supplier, updatedAt: U.today() };
      if (it) { Object.assign(it, rec); Store.commit('inventory', _t('زانیاری «') + rec.name + _t('» نوێ کرایەوە')); } else { Store.db.inventory.push(Object.assign({ id: U.uid('it'), qty: Number(d.qty) || 0, history: [] }, rec)); Store.commit('inventory', _t('کەرەستەی نوێ زیاد کرا: ') + rec.name); }
      m.close();
    });
    const del = m.$('[data-del]');
    if (del) del.addEventListener('click', async () => { if (await UI.confirm({ title: _t('سڕینەوە'), text: '«' + it.name + _t('» لە کۆگا دەسڕێتەوە.'), ok: _t('سڕینەوە'), danger: true })) { Store.db.inventory = Store.db.inventory.filter((x) => x.id !== it.id); Store.commit('inventory', _t('کەرەستە سڕایەوە: ') + it.name); m.close(); } });
  }
  function adjust(it, dir) {
    const m = UI.modal({
      title: (dir > 0 ? _t('زیادکردن بۆ کۆگا') : _t('بەکارهێنان لە کۆگا')) + ' — ' + it.name, size: 'narrow',
      body: _t('<form class="form" id="adf" style="grid-template-columns:minmax(0,1fr)" novalidate><p class="muted" style="margin:0">بڕی ئێستا: <b>') + U.num(it.qty) + ' ' + esc(it.unit) + '</b></p>' + UI.field(_t('بڕ'), '<input class="input" name="n" type="number" min="1" value="' + (dir > 0 ? Math.max(1, it.min * 2 - it.qty) : 1) + '">', { req: true }) + UI.field(_t('تێبینی'), '<input class="input" name="note" placeholder="' + (dir > 0 ? _t('کڕین لە ') + esc(it.supplier || '') : _t('بەکارهێنان بۆ…')) + '">') + '</form>',
      foot: _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>') + (dir > 0 ? _t('زیادکردن') : _t('کەمکردنەوە')) + '</button>'
    });
    const f = m.$('#adf');
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { n: (v) => { const n = Number(v); return !n || n < 1 ? _t('بڕێکی دروست بنووسە') : dir < 0 && n > it.qty ? _t('لە کۆگادا تەنها ') + it.qty + _t(' هەیە') : null; } })) return;
      const n = Number(f.n.value) * dir;
      it.qty += n;
      it.updatedAt = U.today();
      (it.history = it.history || []).unshift({ date: U.today(), delta: n, note: f.note.value.trim(), by: Store.me.id });
      Store.commit('inventory', (n > 0 ? _t('زیادکردنی ') : _t('بەکارهێنانی ')) + U.num(Math.abs(n)) + ' ' + it.unit + ' ' + it.name);
      m.close();
      if (it.qty <= it.min) UI.toast(it.name + _t(' کەمە — کاتی داواکردنە'), 'warn'); else UI.toast(_t('کۆگا نوێ کرایەوە'));
    });
  }

  Pages.inventory = {
    title: _t('کۆگا'),
    render() {
      const all = Store.db.inventory;
      const cats = Array.from(new Set(all.map((x) => x.category)));
      let list = all;
      if (state.cat) list = list.filter((x) => x.category === state.cat);
      if (state.low) list = list.filter((x) => x.qty <= x.min);
      if (state.q) list = list.filter((x) => U.search(x.name + ' ' + x.supplier, state.q));
      list = list.slice().sort(U.by((x) => (x.qty <= x.min ? 0 : 1) + x.name));
      const low = all.filter((x) => x.qty <= x.min);
      return _t('<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">کۆگا</span><h1 class="page-title">کەرەستە و پێداویستی</h1></div><button class="btn accent" data-new>') + I('plus') + _t('کەرەستەی نوێ</button></div>') +
        '<div class="grid g-3">' + UI.kpi(_t('جۆری کەرەستە'), U.num(all.length), U.num(cats.length) + _t(' پۆل'), 'box') + UI.kpi(_t('کەمە / پێویستی بە داواکردنە'), '<span class="' + (low.length ? 'down' : '') + '">' + U.num(low.length) + '</span>', low.slice(0, 2).map((x) => x.name).join(_t('، ')), 'alert', { icoStyle: low.length ? 'background:var(--red-bg);color:var(--red-fg)' : '' }) + UI.kpi(_t('بەهای کۆگا'), U.moneyShort(U.sum(all, (x) => x.qty * x.cost)) + _t(' <small>د.ع</small>'), _t('بەپێی نرخی کڕین'), 'wallet') + '</div>' +
        _t('<div class="card flush"><div class="row wrap" style="padding:14px 18px;gap:10px;border-bottom:1px solid var(--border)"><input class="input" data-q style="max-width:260px" placeholder="گەڕان" value="') + esc(state.q) + '"><select class="select" data-cat style="max-width:200px">' + UI.opts(cats.map((c) => [c, c]), state.cat, _t('هەموو پۆلەکان')) + '</select><label class="check"><input type="checkbox" data-low' + (state.low ? ' checked' : '') + _t('>تەنها کەمەکان</label></div>') +
        (list.length ? _t('<div class="table-wrap"><table class="t"><thead><tr><th>کەرەستە</th><th>پۆل</th><th>دابینکەر</th><th class="num">بڕ</th><th style="min-width:120px">ئاست</th><th class="num">نرخی یەکە</th><th></th></tr></thead><tbody>') + list.map((x) => {
          const pct = Math.min(100, x.qty / Math.max(1, x.min * 2.5) * 100);
          const isLow = x.qty <= x.min;
          return '<tr><td><b style="font-weight:600">' + esc(x.name) + '</b>' + (isLow ? ' ' + UI.badge(_t('کەمە'), 'b-red') : '') + '</td><td class="small">' + esc(x.category) + '</td><td class="small">' + esc(x.supplier || '') + '</td><td class="num"><b class="' + (isLow ? 'down' : '') + '">' + U.num(x.qty) + '</b> <span class="small muted">' + esc(x.unit) + '</span></td><td><div class="bar"><i style="width:' + pct.toFixed(0) + '%;background:' + (isLow ? 'var(--red)' : 'var(--mint-2)') + _t('"></i></div><div class="small muted">کەمترین: ') + U.num(x.min) + '</div></td><td class="num">' + U.money(x.cost) + '</td><td><span class="row" style="gap:4px;justify-content:flex-end"><button class="btn xs" data-add="' + x.id + _t('" aria-label="زیادکردن">') + I('plus', 'sm') + '</button><button class="btn xs" data-use="' + x.id + _t('" aria-label="بەکارهێنان">−</button><button class="btn xs ghost" data-edit="') + x.id + _t('" aria-label="دەستکاری">') + I('edit', 'sm') + '</button></span></td></tr>';
        }).join('') + '</tbody></table></div>' : UI.empty(_t('هیچ کەرەستەیەک نەدۆزرایەوە'), 'box')) + '</div>';
    },
    mount(root) {
      const find = (id) => Store.db.inventory.find((x) => x.id === id);
      root.querySelector('[data-new]').addEventListener('click', () => itemForm());
      root.addEventListener('click', (e) => {
        const a = e.target.closest('[data-add]'); if (a) adjust(find(a.dataset.add), 1);
        const u = e.target.closest('[data-use]'); if (u) adjust(find(u.dataset.use), -1);
        const ed = e.target.closest('[data-edit]'); if (ed) itemForm(find(ed.dataset.edit));
      });
      const q = root.querySelector('[data-q]');
      q.addEventListener('input', U.debounce(() => { state.q = q.value; App.render(); const n = document.querySelector('[data-q]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250));
      root.querySelector('[data-cat]').addEventListener('change', (e) => { state.cat = e.target.value; App.render(); });
      root.querySelector('[data-low]').addEventListener('change', (e) => { state.low = e.target.checked; App.render(); });
    }
  };
})();
