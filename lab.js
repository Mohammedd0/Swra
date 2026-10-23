/* Lab orders: crowns, veneers, aligners tracked on a board */
(function () {
  const esc = U.esc;
  const ORDER = ['sent', 'in_progress', 'received', 'fitted'];
  const state = { doctor: '' };

  function openForm(pre) {
    pre = pre || {};
    if (!Store.can('manage_lab')) { UI.toast(_t('دەسەڵاتی تاقیگەت نییە'), 'err'); return; }
    const editing = pre.id ? Store.db.labOrders.find((x) => x.id === pre.id) : null;
    const TYPES = Store.listNames('labWorkTypes'), LABS = Store.listNames('labs');
    const o = Object.assign({ type: TYPES[0] || '', lab: LABS[0] || '', sentDate: U.today(), dueDate: U.addDays(U.today(), 7), status: 'sent', shade: 'A2', cost: '', note: '' }, editing || pre);
    const docs = Store.scopedDoctors();
    if (!o.doctorId && docs.length === 1) o.doctorId = docs[0].id;
    const m = UI.modal({
      title: editing ? _t('داواکاری تاقیگە') : _t('داواکاری تاقیگەی نوێ'), size: 'wide',
      body: _t('<form class="form" id="lbf" novalidate><div class="field full"><label>نەخۆش <span class="req">*</span></label>') + Pages.patients.picker('patientId', o.patientId) + '</div>' +
        UI.field(_t('دکتۆر'), '<select class="select" name="doctorId">' + UI.opts(docs, o.doctorId, '—') + '</select>', { req: true }) +
        UI.field(_t('جۆری کار'), '<input class="input" name="type" list="labtypes" value="' + esc(o.type) + '"><datalist id="labtypes">' + TYPES.map((t) => '<option value="' + esc(t) + '">').join('') + '</datalist>', { req: true }) +
        UI.field(_t('ددان'), '<input class="input" name="tooth" value="' + esc(o.tooth || '') + _t('" placeholder="نموونە: 11، 21">')) +
        UI.field(_t('ڕەنگ (Shade)'), '<select class="select" name="shade">' + UI.opts(['BL1', 'BL2', 'A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'D2'].map((x) => [x, x]), o.shade) + '</select>') +
        UI.field(_t('تاقیگە'), '<input class="input" name="lab" list="labs" value="' + esc(o.lab) + '"><datalist id="labs">' + LABS.map((t) => '<option value="' + esc(t) + '">').join('') + '</datalist>', { req: true }) +
        UI.field(_t('تێچوو (د.ع)'), '<input class="input" name="cost" inputmode="numeric" value="' + esc(o.cost) + '">') +
        UI.field(_t('بەرواری ناردن'), '<input class="input" type="date" name="sentDate" value="' + o.sentDate + '">') +
        UI.field(_t('بەرواری گەڕانەوە'), '<input class="input" type="date" name="dueDate" value="' + o.dueDate + '">', { req: true }) +
        (editing ? UI.field(_t('بار'), '<select class="select" name="status">' + UI.opts(ORDER.map((k) => [k, Store.LAB_STATUS[k].label]), o.status) + '</select>') : '') +
        UI.field(_t('تێبینی بۆ تاقیگە'), '<textarea class="textarea" name="note" style="min-height:64px">' + esc(o.note || '') + '</textarea>', { full: true }) + '</form>',
      foot: (editing ? '<div class="left"><button class="btn danger sm" data-del>' + I('trash', 'sm') + _t('سڕینەوە</button></div>') : '') + _t('<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>پاشەکەوتکردن</button>')
    });
    const f = m.$('#lbf');
    Pages.patients.bindPicker(f);
    f.addEventListener('picker', () => { const p = Store.patient(f.patientId.value); if (p && !f.doctorId.value && Store.inScope(p.doctorId)) f.doctorId.value = p.doctorId; });
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { patientId: UI.req(_t('نەخۆش هەڵبژێرە')), doctorId: UI.req(_t('دکتۆر هەڵبژێرە')), type: UI.req(), lab: UI.req(), dueDate: (v) => (!v ? _t('پێویستە') : v < f.sentDate.value ? _t('دەبێت دوای ناردن بێت') : null) })) return;
      const d = UI.data(f);
      const rec = { patientId: d.patientId, doctorId: d.doctorId, type: d.type, tooth: d.tooth, shade: d.shade, lab: d.lab, cost: UI.parseNum(d.cost), sentDate: d.sentDate, dueDate: d.dueDate, note: d.note };
      if (editing) { Object.assign(editing, rec, { status: d.status || editing.status }); Store.commit('lab', _t('داواکاری تاقیگەی ') + Store.patientName(rec.patientId) + _t(' نوێ کرایەوە')); } else { Store.db.labOrders.push(Object.assign({ id: U.uid('lab'), status: 'sent' }, rec)); Store.commit('lab', _t('داواکاری تاقیگە نێردرا: ') + rec.type + _t(' بۆ ') + Store.patientName(rec.patientId)); }
      m.close();
      UI.toast(_t('پاشەکەوت کرا'));
    });
    const del = m.$('[data-del]');
    if (del) del.addEventListener('click', async () => { if (await UI.confirm({ title: _t('سڕینەوە'), text: _t('ئەم داواکارییە دەسڕێتەوە.'), ok: _t('سڕینەوە'), danger: true })) { Store.db.labOrders = Store.db.labOrders.filter((x) => x.id !== editing.id); Store.commit('lab', _t('داواکاری تاقیگە سڕایەوە')); m.close(); } });
  }

  Pages.lab = {
    title: _t('تاقیگە'),
    openForm,
    render() {
      const T = U.today();
      const docs = Store.scopedDoctors(true);
      let list = Store.db.labOrders.filter((l) => Store.inScope(l.doctorId) && (!state.doctor || l.doctorId === state.doctor));
      const recentFitted = (l) => l.status !== 'fitted' || U.diffDays(T, l.dueDate) <= 30;
      list = list.filter(recentFitted);
      const late = list.filter((l) => ['sent', 'in_progress'].includes(l.status) && l.dueDate < T);
      return _t('<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">تاقیگە (لاب)</span><h1 class="page-title">کارەکانی تاقیگە</h1></div><div class="row wrap">') + (docs.length > 1 ? '<select class="select" data-doc style="width:200px">' + UI.opts(docs, state.doctor, _t('هەموو دکتۆرەکان')) + '</select>' : '') + '<button class="btn accent" data-new>' + I('plus') + _t('داواکاری نوێ</button></div></div>') +
        (late.length ? '<div class="alert red">' + I('alert') + '<span>' + U.num(late.length) + _t(' کار لە کاتی خۆی دواکەوتووە: ') + esc(late.map((l) => Store.patientName(l.patientId)).join(_t('، '))) + '</span></div>' : '') +
        '<div class="kanban">' + ORDER.map((st) => {
          const col = list.filter((l) => l.status === st).sort(U.by((l) => l.dueDate));
          return '<div class="kcol"><div class="kcol-head"><span>' + UI.badge(Store.LAB_STATUS[st].label, Store.LAB_STATUS[st].cls) + '</span><span class="muted small">' + U.num(col.length) + '</span></div>' + (col.length ? col.map((l) => {
            const isLate = ['sent', 'in_progress'].includes(l.status) && l.dueDate < T;
            const nextSt = ORDER[ORDER.indexOf(st) + 1];
            return '<div class="kcard" data-open="' + l.id + '" tabindex="0" role="button"' + (isLate ? ' style="border-color:var(--red)"' : '') + '><b>' + esc(l.type) + (l.tooth ? ' <span class="latin muted">#' + esc(l.tooth) + '</span>' : '') + '</b><span class="small">' + esc(Store.patientName(l.patientId)) + '</span><div class="row"><span>' + esc(Store.doctorName(l.doctorId)) + '</span><span>' + esc(l.shade || '') + '</span></div><div class="row"><span>' + esc(l.lab) + '</span><span class="' + (isLate ? 'down' : '') + '">' + (st === 'fitted' ? _t('دانرا') : _t('گەڕانەوە ') + U.relDay(l.dueDate)) + '</span></div>' + (nextSt ? '<button class="btn xs" data-next="' + l.id + '" style="align-self:flex-start">' + I('chevL', 'sm') + Store.LAB_STATUS[nextSt].label + '</button>' : '') + '</div>';
          }).join('') : _t('<div class="muted small" style="text-align:center;padding:20px 0">بەتاڵە</div>')) + '</div>';
        }).join('') + '</div>';
    },
    mount(root) {
      root.querySelector('[data-new]').addEventListener('click', () => openForm({}));
      const ds = root.querySelector('[data-doc]');
      if (ds) ds.addEventListener('change', () => { state.doctor = ds.value; App.render(); });
      root.addEventListener('click', (e) => {
        const n = e.target.closest('[data-next]');
        if (n) {
          e.stopPropagation();
          const l = Store.db.labOrders.find((x) => x.id === n.dataset.next);
          const nx = ORDER[ORDER.indexOf(l.status) + 1];
          l.status = nx;
          if (nx === 'received') l.receivedAt = U.today();
          Store.commit('lab', l.type + _t(' ی ') + Store.patientName(l.patientId) + ': ' + Store.LAB_STATUS[nx].label);
          if (nx === 'received' && Store.can('create_appointments')) UI.confirm({ title: _t('کارەکە گەیشتەوە'), text: _t('دەتەوێت نۆرەیەک بۆ دانانی بگریت بۆ ') + Store.patientName(l.patientId) + _t('؟'), ok: _t('بەڵێ، نۆرە بگرە'), cancel: _t('دواتر') }).then((y) => { if (y) Pages.appointments.openForm({ patientId: l.patientId, doctorId: l.doctorId, note: _t('دانانی ') + l.type, date: U.addDays(U.today(), 1) }); });
          return;
        }
        const o = e.target.closest('[data-open]');
        if (o) openForm({ id: o.dataset.open });
      });
      root.addEventListener('keydown', (e) => { const o = e.target.closest('[data-open]'); if (o && e.key === 'Enter') openForm({ id: o.dataset.open }); });
    }
  };
})();
