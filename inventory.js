/* Inventory: stock levels, low-stock alerts, purchases and usage */
(function () {
  const esc = U.esc;
  const state = { q: '', cat: '', low: false };

  function itemForm(it) {
    const cats = Array.from(new Set(Store.db.inventory.map((x) => x.category)));
    const e = it || { name: '', category: cats[0] || '', unit: 'دانە', qty: 0, min: 5, cost: 0, supplier: '' };
    const m = UI.modal({
      title: it ? 'دەستکاری کەرەستە' : 'کەرەستەی نوێ',
      body: '<form class="form" id="itf" novalidate>' + UI.field('ناو', '<input class="input" name="name" value="' + esc(e.name) + '">', { req: true, full: true }) +
        UI.field('جۆر', '<input class="input" name="category" list="cats" value="' + esc(e.category) + '"><datalist id="cats">' + cats.map((c) => '<option value="' + esc(c) + '">').join('') + '</datalist>', { req: true }) +
        UI.field('یەکە', '<select class="select" name="unit">' + UI.opts(['دانە', 'قوتوو', 'پاکەت', 'سرنج', 'کیت', 'لیتر'].map((x) => [x, x]), e.unit) + '</select>') +
        (it ? '' : UI.field('بڕی ئێستا', '<input class="input" name="qty" type="number" min="0" value="' + e.qty + '">')) +
        UI.field('کەمترین بڕ (ئاگاداری)', '<input class="input" name="min" type="number" min="0" value="' + e.min + '">', { hint: 'کاتێک بڕەکە گەیشتە ئەمە، ئاگاداری دەردەکەوێت' }) +
        UI.field('نرخی یەکە (د.ع)', '<input class="input" name="cost" inputmode="numeric" value="' + e.cost + '">') +
        UI.field('دابینکەر', '<input class="input" name="supplier" value="' + esc(e.supplier) + '">') + '</form>',
      foot: (it ? '<div class="left"><button class="btn danger sm" data-del>' + I('trash', 'sm') + 'سڕینەوە</button></div>' : '') + '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>پاشەکەوتکردن</button>'
    });
    const f = m.$('#itf');
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { name: UI.req('ناو پێویستە'), category: UI.req('جۆر پێویستە') })) return;
      const d = UI.data(f);
      const rec = { name: d.name, category: d.category, unit: d.unit, min: Number(d.min) || 0, cost: UI.parseNum(d.cost), supplier: d.supplier, updatedAt: U.today() };
      if (it) { Object.assign(it, rec); Store.commit('inventory', 'زانیاری «' + rec.name + '» نوێ کرایەوە'); } else { Store.db.inventory.push(Object.assign({ id: U.uid('it'), qty: Number(d.qty) || 0, history: [] }, rec)); Store.commit('inventory', 'کەرەستەی نوێ زیاد کرا: ' + rec.name); }
      m.close();
    });
    const del = m.$('[data-del]');
    if (del) del.addEventListener('click', async () => { if (await UI.confirm({ title: 'سڕینەوە', text: '«' + it.name + '» لە کۆگا دەسڕێتەوە.', ok: 'سڕینەوە', danger: true })) { Store.db.inventory = Store.db.inventory.filter((x) => x.id !== it.id); Store.commit('inventory', 'کەرەستە سڕایەوە: ' + it.name); m.close(); } });
  }
  function adjust(it, dir) {
    const m = UI.modal({
      title: (dir > 0 ? 'زیادکردن بۆ کۆگا' : 'بەکارهێنان لە کۆگا') + ' — ' + it.name, size: 'narrow',
      body: '<form class="form" id="adf" style="grid-template-columns:minmax(0,1fr)" novalidate><p class="muted" style="margin:0">بڕی ئێستا: <b>' + U.num(it.qty) + ' ' + esc(it.unit) + '</b></p>' + UI.field('بڕ', '<input class="input" name="n" type="number" min="1" value="' + (dir > 0 ? Math.max(1, it.min * 2 - it.qty) : 1) + '">', { req: true }) + UI.field('تێبینی', '<input class="input" name="note" placeholder="' + (dir > 0 ? 'کڕین لە ' + esc(it.supplier || '') : 'بەکارهێنان بۆ…') + '">') + '</form>',
      foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>' + (dir > 0 ? 'زیادکردن' : 'کەمکردنەوە') + '</button>'
    });
    const f = m.$('#adf');
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { n: (v) => { const n = Number(v); return !n || n < 1 ? 'بڕێکی دروست بنووسە' : dir < 0 && n > it.qty ? 'لە کۆگادا تەنها ' + it.qty + ' هەیە' : null; } })) return;
      const n = Number(f.n.value) * dir;
      it.qty += n;
      it.updatedAt = U.today();
      (it.history = it.history || []).unshift({ date: U.today(), delta: n, note: f.note.value.trim(), by: Store.me.id });
      Store.commit('inventory', (n > 0 ? 'زیادکردنی ' : 'بەکارهێنانی ') + U.num(Math.abs(n)) + ' ' + it.unit + ' ' + it.name);
      m.close();
      if (it.qty <= it.min) UI.toast(it.name + ' کەمە — کاتی داواکردنە', 'warn'); else UI.toast('کۆگا نوێ کرایەوە');
    });
  }

  Pages.inventory = {
    title: 'کۆگا',
    render() {
      const all = Store.db.inventory;
      const cats = Array.from(new Set(all.map((x) => x.category)));
      let list = all;
      if (state.cat) list = list.filter((x) => x.category === state.cat);
      if (state.low) list = list.filter((x) => x.qty <= x.min);
      if (state.q) list = list.filter((x) => U.search(x.name + ' ' + x.supplier, state.q));
      list = list.slice().sort(U.by((x) => (x.qty <= x.min ? 0 : 1) + x.name));
      const low = all.filter((x) => x.qty <= x.min);
      return '<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">کۆگا</span><h1 class="page-title">کەرەستە و پێداویستی</h1></div><button class="btn accent" data-new>' + I('plus') + 'کەرەستەی نوێ</button></div>' +
        '<div class="grid g-3">' + UI.kpi('جۆری کەرەستە', U.num(all.length), U.num(cats.length) + ' پۆل', 'box') + UI.kpi('کەمە / پێویستی بە داواکردنە', '<span class="' + (low.length ? 'down' : '') + '">' + U.num(low.length) + '</span>', low.slice(0, 2).map((x) => x.name).join('، '), 'alert', { icoStyle: low.length ? 'background:var(--red-bg);color:var(--red-fg)' : '' }) + UI.kpi('بەهای کۆگا', U.moneyShort(U.sum(all, (x) => x.qty * x.cost)) + ' <small>د.ع</small>', 'بەپێی نرخی کڕین', 'wallet') + '</div>' +
        '<div class="card flush"><div class="row wrap" style="padding:14px 18px;gap:10px;border-bottom:1px solid var(--border)"><input class="input" data-q style="max-width:260px" placeholder="گەڕان" value="' + esc(state.q) + '"><select class="select" data-cat style="max-width:200px">' + UI.opts(cats.map((c) => [c, c]), state.cat, 'هەموو پۆلەکان') + '</select><label class="check"><input type="checkbox" data-low' + (state.low ? ' checked' : '') + '>تەنها کەمەکان</label></div>' +
        (list.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>کەرەستە</th><th>پۆل</th><th>دابینکەر</th><th class="num">بڕ</th><th style="min-width:120px">ئاست</th><th class="num">نرخی یەکە</th><th></th></tr></thead><tbody>' + list.map((x) => {
          const pct = Math.min(100, x.qty / Math.max(1, x.min * 2.5) * 100);
          const isLow = x.qty <= x.min;
          return '<tr><td><b style="font-weight:600">' + esc(x.name) + '</b>' + (isLow ? ' ' + UI.badge('کەمە', 'b-red') : '') + '</td><td class="small">' + esc(x.category) + '</td><td class="small">' + esc(x.supplier || '') + '</td><td class="num"><b class="' + (isLow ? 'down' : '') + '">' + U.num(x.qty) + '</b> <span class="small muted">' + esc(x.unit) + '</span></td><td><div class="bar"><i style="width:' + pct.toFixed(0) + '%;background:' + (isLow ? 'var(--red)' : 'var(--mint-2)') + '"></i></div><div class="small muted">کەمترین: ' + U.num(x.min) + '</div></td><td class="num">' + U.money(x.cost) + '</td><td><span class="row" style="gap:4px;justify-content:flex-end"><button class="btn xs" data-add="' + x.id + '" aria-label="زیادکردن">' + I('plus', 'sm') + '</button><button class="btn xs" data-use="' + x.id + '" aria-label="بەکارهێنان">−</button><button class="btn xs ghost" data-edit="' + x.id + '" aria-label="دەستکاری">' + I('edit', 'sm') + '</button></span></td></tr>';
        }).join('') + '</tbody></table></div>' : UI.empty('هیچ کەرەستەیەک نەدۆزرایەوە', 'box')) + '</div>';
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
