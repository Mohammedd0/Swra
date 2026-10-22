/* Billing: invoices, payments, installments, debts, expenses, printing */
(function () {
  const esc = U.esc;
  const state = { q: '', status: '', doctor: '', page: 1 };
  const EXP_CATS = ['کرێی شوێن', 'موچەی کارمەندان', 'کارەبا و مۆلیدە', 'کەرەستەی پزیشکی', 'تاقیگە (لاب)', 'ڕیکلام', 'چاککردنەوە و خزمەتگوزاری', 'ئینتەرنێت و تەلەفۆن', 'خواردن و میوانداری', 'هی تر'];

  function methodChips(name, val) {
    return '<div class="chips">' + Object.entries(Store.METHODS).map(([k, v]) => '<label class="chip" style="cursor:pointer"><input type="radio" name="' + name + '" value="' + k + '"' + (k === val ? ' checked' : '') + ' style="accent-color:var(--navy)">' + esc(v) + '</label>').join('') + '</div>';
  }
  function schedule(inv) {
    if (!inv.installments) return [];
    const n = inv.installments;
    const per = Math.round(inv.total / n / 5000) * 5000;
    let paid = Store.paidFor(inv.id);
    const out = [];
    for (let k = 0; k < n; k++) {
      const amt = k === n - 1 ? inv.total - per * (n - 1) : per;
      const due = U.addDays(inv.date, k * 30);
      const covered = Math.min(amt, Math.max(0, paid));
      paid -= amt;
      out.push({ k: k + 1, due, amount: amt, covered, status: covered >= amt ? 'paid' : covered > 0 ? 'partial' : due < U.today() ? 'late' : 'due' });
    }
    return out;
  }

  /* ---------- invoice form ---------- */
  function openInvoiceForm(pre) {
    pre = pre || {};
    if (!Store.can('billing')) { UI.toast('دەسەڵاتی دروستکردنی پسوولەت نییە', 'err'); return; }
    const appt = pre.appt || null;
    const patientId = appt ? appt.patientId : pre.patientId || '';
    const docs = Store.scopedDoctors(true);
    const doctorId = appt ? appt.doctorId : (pre.doctorId || (docs.length === 1 ? docs[0].id : (Store.patient(patientId) || {}).doctorId || ''));
    const services = Store.db.services.filter((s) => s.active);
    const lineRow = (it) => '<div class="line-item">' +
      '<select class="select" data-k="serviceId" aria-label="خزمەتگوزاری">' + UI.opts(services, it ? it.serviceId : '', '— خزمەتگوزاری —') + '</select>' +
      '<select class="select" data-k="tooth" aria-label="ددان">' + UI.opts([['', 'ددان']].concat(Seed.TEETH_UP.concat(Seed.TEETH_LO).map((t) => [t, String(t)])), it && it.tooth ? it.tooth : '') + '</select>' +
      '<input class="input" data-k="qty" type="number" min="1" value="' + (it ? it.qty || 1 : 1) + '" aria-label="ژمارە">' +
      '<input class="input li-price" data-k="price" inputmode="numeric" value="' + (it ? it.price : '') + '" placeholder="نرخ" aria-label="نرخ">' +
      '<button type="button" class="icon-btn" data-rm aria-label="لابردن" style="width:36px;height:42px">' + I('x', 'sm') + '</button></div>';
    const initial = appt ? [{ serviceId: appt.serviceId, tooth: appt.tooth, qty: 1, price: (Store.service(appt.serviceId) || {}).price || 0 }] : [];
    const p0 = patientId ? Store.patient(patientId) : null;
    const planOpen = p0 ? p0.plan.filter((x) => x.status !== 'done') : [];
    const m = UI.modal({
      title: 'پسوولەی نوێ', size: 'wide', sticky: true,
      body: '<form class="form" id="invf" novalidate>' +
        '<div class="field full"><label>نەخۆش <span class="req">*</span></label>' + Pages.patients.picker('patientId', patientId) + '</div>' +
        UI.field('دکتۆر', '<select class="select" name="doctorId">' + UI.opts(docs, doctorId, '—') + '</select>', { req: true }) +
        UI.field('بەروار', '<input class="input" type="date" name="date" value="' + (appt ? appt.date : U.today()) + '">', { req: true }) +
        '<div class="field full"><span class="lbl">چارەسەرەکان <span class="req">*</span></span>' +
        (planOpen.length ? '<div class="alert blue">' + I('info') + '<span>ئەم نەخۆشە ' + U.num(planOpen.length) + ' چارەسەری لە پلاندا هەیە. <button type="button" class="btn xs" data-from-plan>زیادکردنیان</button></span></div>' : '') +
        '<div class="line-items" id="lines">' + (initial.length ? initial.map(lineRow).join('') : lineRow()) + '</div><button type="button" class="btn sm" data-add-line style="align-self:flex-start;margin-top:6px">' + I('plus', 'sm') + 'چارەسەری تر</button></div>' +
        (Store.can('discounts') ? UI.field('داشکاندن (د.ع)', '<input class="input" name="discount" inputmode="numeric" value="0">') : '<input type="hidden" name="discount" value="0">') +
        UI.field('شێوازی پارەدان', '<select class="select" name="installments">' + UI.opts([[0, 'یەکجار'], [2, 'قیست — ٢ مانگ'], [3, 'قیست — ٣ مانگ'], [4, 'قیست — ٤ مانگ'], [6, 'قیست — ٦ مانگ'], [10, 'قیست — ١٠ مانگ'], [12, 'قیست — ١٢ مانگ']], 0) + '</select>') +
        UI.field('پارەی وەرگیراو ئێستا (د.ع)', '<input class="input" name="payNow" inputmode="numeric" placeholder="٠">', { hint: 'ئەگەر نەخۆش ئێستا پارە دەدات' }) +
        '<div class="field"><span class="lbl">شێوازی وەرگرتن</span>' + methodChips('method', 'cash') + '</div>' +
        UI.field('تێبینی', '<input class="input" name="note" placeholder="دڵخواز">', { full: true }) +
        '<div class="full totals" id="tot"></div></form>',
      foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn" data-save>پاشەکەوتکردن</button><button class="btn primary" data-save-print>' + I('printer') + 'پاشەکەوت و چاپ</button>'
    });
    const f = m.$('#invf');
    const lines = m.$('#lines');
    Pages.patients.bindPicker(f);
    const read = () => Array.from(lines.querySelectorAll('.line-item')).map((li) => {
      const sid = li.querySelector('[data-k=serviceId]').value;
      return { serviceId: sid, name: Store.serviceName(sid), tooth: li.querySelector('[data-k=tooth]').value ? Number(li.querySelector('[data-k=tooth]').value) : null, qty: Math.max(1, Number(li.querySelector('[data-k=qty]').value) || 1), price: UI.parseNum(li.querySelector('[data-k=price]').value) };
    }).filter((x) => x.serviceId);
    const calc = () => {
      const items = read();
      const sub = U.sum(items, (x) => x.price * x.qty);
      const disc = Math.min(sub, UI.parseNum(f.discount.value));
      const total = sub - disc;
      const inst = Number(f.installments.value);
      const now = UI.parseNum(f.payNow.value);
      m.$('#tot').innerHTML = '<div class="row"><span>کۆی چارەسەرەکان</span><span>' + U.money(sub) + '</span></div>' + (disc ? '<div class="row"><span>داشکاندن</span><span class="down">− ' + U.money(disc) + '</span></div>' : '') + '<div class="row grand"><span>کۆی گشتی</span><span>' + U.money(total) + '</span></div>' + (inst ? '<div class="row small muted"><span>قیستی مانگانە (' + U.num(inst) + ' مانگ)</span><span>' + U.money(Math.round(total / inst / 5000) * 5000) + '</span></div>' : '') + (now ? '<div class="row small"><span>وەرگیراو ئێستا</span><span class="up">' + U.money(Math.min(now, total)) + '</span></div><div class="row small"><span>ماوە</span><span class="down">' + U.money(Math.max(0, total - now)) + '</span></div>' : '');
      return { items, sub, disc, total };
    };
    m.el.addEventListener('change', (e) => {
      if (e.target.matches('[data-k=serviceId]')) { const s = Store.service(e.target.value); const pr = e.target.closest('.line-item').querySelector('[data-k=price]'); if (s && !pr.value) pr.value = s.price; else if (s) pr.value = s.price; }
      calc();
    });
    m.el.addEventListener('input', calc);
    f.addEventListener('picker', () => {
      const p = Store.patient(f.patientId.value);
      if (p && !f.doctorId.value && Store.inScope(p.doctorId)) f.doctorId.value = p.doctorId;
    });
    m.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-add-line]')) { lines.insertAdjacentHTML('beforeend', lineRow()); }
      const rm = e.target.closest('[data-rm]');
      if (rm) { if (lines.children.length > 1) rm.closest('.line-item').remove(); else rm.closest('.line-item').outerHTML = lineRow(); calc(); }
      if (e.target.closest('[data-from-plan]')) {
        lines.innerHTML = planOpen.map((it) => lineRow({ serviceId: it.serviceId, tooth: it.tooth, qty: 1, price: it.price })).join('');
        e.target.closest('.alert').remove();
        calc();
      }
    });
    calc();
    const save = (print) => {
      const ok = UI.validate(f, { patientId: UI.req('نەخۆش هەڵبژێرە'), doctorId: UI.req('دکتۆر هەڵبژێرە'), date: UI.req('بەروار پێویستە') });
      if (!ok) return;
      const c = calc();
      if (!c.items.length) { UI.toast('لانیکەم یەک چارەسەر زیاد بکە', 'err'); return; }
      if (c.items.some((x) => x.price <= 0)) { UI.toast('نرخی هەموو چارەسەرەکان بنووسە', 'err'); return; }
      const d = UI.data(f);
      const inv = { id: U.uid('inv'), no: Store.nextInvoiceNo(), patientId: d.patientId, doctorId: d.doctorId, apptId: appt ? appt.id : null, date: d.date, items: c.items, discount: c.disc, total: c.total, installments: Number(d.installments), note: d.note, createdBy: Store.me.id, createdAt: U.stamp() };
      Store.db.invoices.push(inv);
      const now = Math.min(UI.parseNum(d.payNow), inv.total);
      if (now > 0) Store.db.payments.push({ id: U.uid('pay'), invoiceId: inv.id, patientId: inv.patientId, amount: now, method: d.method || 'cash', date: d.date, by: Store.me.id });
      const p = Store.patient(inv.patientId);
      if (p) c.items.forEach((it) => { const pl = p.plan.find((x) => x.status !== 'done' && x.serviceId === it.serviceId && (!x.tooth || x.tooth === it.tooth)); if (pl) { pl.invoiced = inv.id; } });
      Store.commit('invoice', 'پسوولەی ' + inv.no + ' بۆ ' + Store.patientName(inv.patientId) + ' — ' + U.money(inv.total) + (now ? ' (وەرگیراو ' + U.money(now) + ')' : ''), { ref: inv.id });
      m.close();
      UI.toast('پسوولە ' + inv.no + ' دروست کرا');
      if (print) printInvoice(inv);
    };
    m.$('[data-save]').addEventListener('click', () => save(false));
    m.$('[data-save-print]').addEventListener('click', () => save(true));
  }

  /* ---------- invoice view ---------- */
  function openInvoice(id) {
    const inv = Store.invoice(id);
    if (!inv) return;
    const p = Store.patient(inv.patientId);
    const pays = Store.paymentsFor(inv.id).slice().sort(U.by((x) => x.date));
    const sch = schedule(inv);
    const sub = U.sum(inv.items, (x) => x.price * (x.qty || 1));
    const bal = Store.invBalance(inv);
    const m = UI.modal({
      title: 'پسوولە ' + inv.no, size: 'wide',
      body: '<div class="row between wrap">' + UI.who(p ? p.name : '—', U.fmtDate(inv.date) + ' · ' + esc(Store.doctorName(inv.doctorId)), null) + UI.invBadge(inv) + '</div>' +
        '<div class="table-wrap"><table class="t"><thead><tr><th>چارەسەر</th><th>ددان</th><th class="num">ژمارە</th><th class="num">نرخ</th><th class="num">کۆ</th></tr></thead><tbody>' + inv.items.map((x) => '<tr><td>' + esc(x.name) + '</td><td class="latin">' + (x.tooth || '—') + '</td><td class="num">' + U.num(x.qty || 1) + '</td><td class="num">' + U.money(x.price) + '</td><td class="num">' + U.money(x.price * (x.qty || 1)) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="totals"><div class="row"><span>کۆ</span><span>' + U.money(sub) + '</span></div>' + (inv.discount ? '<div class="row"><span>داشکاندن</span><span class="down">− ' + U.money(inv.discount) + '</span></div>' : '') + '<div class="row grand"><span>کۆی گشتی</span><span>' + U.money(inv.total) + '</span></div><div class="row"><span>دراوە</span><span class="up">' + U.money(Store.paidFor(inv.id)) + '</span></div><div class="row"><span>ماوە</span><b class="' + (bal ? 'down' : '') + '">' + U.money(bal) + '</b></div></div>' +
        (sch.length ? '<div><div class="card-title" style="font-size:14px;margin-bottom:6px">' + I('calendar', 'sm') + 'خشتەی قیست</div><div class="table-wrap"><table class="t"><thead><tr><th>قیست</th><th>بەرواری دان</th><th class="num">بڕ</th><th>بار</th></tr></thead><tbody>' + sch.map((s) => '<tr><td>' + U.num(s.k) + '</td><td>' + U.fmtDate(s.due) + '</td><td class="num">' + U.money(s.amount) + '</td><td>' + (s.status === 'paid' ? UI.badge('دراوە', 'b-green') : s.status === 'partial' ? UI.badge('بەشێکی دراوە', 'b-amber') : s.status === 'late' ? UI.badge('دواکەوتووە', 'b-red') : UI.badge('ماوە', 'b-gray')) + '</td></tr>').join('') + '</tbody></table></div></div>' : '') +
        '<div><div class="card-title" style="font-size:14px;margin-bottom:6px">' + I('wallet', 'sm') + 'پارەدانەکان</div>' + (pays.length ? '<div class="list">' + pays.map((x) => '<div class="li"><span class="grow"><span class="t">' + U.money(x.amount) + '</span><span class="s">' + U.fmtDate(x.date) + ' · ' + esc(Store.METHODS[x.method] || x.method) + ' · ' + esc(Store.user(x.by) ? Store.user(x.by).name : '') + '</span></span>' + (Store.isOwner() ? '<button class="btn xs danger" data-del-pay="' + x.id + '" aria-label="سڕینەوەی پارەدان">' + I('trash', 'sm') + '</button>' : '') + '</div>').join('') + '</div>' : '<div class="muted small">هیچ پارەیەک نەدراوە</div>') + '</div>' +
        (inv.note ? '<div class="small muted">تێبینی: ' + esc(inv.note) + '</div>' : ''),
      foot: '<div class="left">' + (Store.isOwner() ? '<button class="btn sm danger" data-void>' + I('trash', 'sm') + 'سڕینەوەی پسوولە</button>' : '') + (p && bal ? '<a class="btn sm wa" target="_blank" rel="noopener" href="' + U.waLink(p.phone, 'سڵاو ' + p.name + '، بیرخستنەوەیەکی دۆستانە لە Bite for Dentistry: بڕی ' + U.money(bal) + ' لە پسوولەی ' + inv.no + ' ماوە. سوپاس بۆ متمانەت.') + '">' + I('whatsapp', 'sm') + 'بیرخستنەوەی قەرز</a>' : '') + '</div><button class="btn sm" data-print>' + I('printer', 'sm') + 'چاپکردن</button>' + (bal && Store.can('billing') ? '<button class="btn sm primary" data-pay>' + I('wallet', 'sm') + 'وەرگرتنی پارە</button>' : '')
    });
    m.el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-print]')) printInvoice(inv);
      if (e.target.closest('[data-pay]')) { m.close(); openPayment(inv.id); }
      const dp = e.target.closest('[data-del-pay]');
      if (dp && await UI.confirm({ title: 'سڕینەوەی پارەدان', text: 'ئەم پارەدانە دەسڕێتەوە و قەرزی نەخۆش زیاد دەبێتەوە.', ok: 'سڕینەوە', danger: true })) {
        const pay = Store.db.payments.find((x) => x.id === dp.dataset.delPay);
        Store.db.payments = Store.db.payments.filter((x) => x.id !== dp.dataset.delPay);
        Store.commit('payment', 'پارەدانی ' + U.money(pay.amount) + ' لە ' + inv.no + ' سڕایەوە');
        m.close(); openInvoice(inv.id);
      }
      if (e.target.closest('[data-void]') && await UI.confirm({ title: 'سڕینەوەی پسوولە', html: 'پسوولەی <b>' + esc(inv.no) + '</b> و هەموو پارەدانەکانی دەسڕێنەوە. ئەم کارە لە تۆماری گۆڕانکاریدا دەمێنێتەوە.', ok: 'سڕینەوە', danger: true })) {
        Store.db.invoices = Store.db.invoices.filter((x) => x.id !== inv.id);
        Store.db.payments = Store.db.payments.filter((x) => x.invoiceId !== inv.id);
        Store.commit('invoice', 'پسوولەی ' + inv.no + ' (' + U.money(inv.total) + ') سڕایەوە');
        m.close();
        UI.toast('پسوولەکە سڕایەوە', 'warn');
      }
    });
  }

  function openPayment(invId) {
    const inv = Store.invoice(invId);
    if (!inv) return;
    if (!Store.can('billing')) { UI.toast('دەسەڵاتی وەرگرتنی پارەت نییە', 'err'); return; }
    const bal = Store.invBalance(inv);
    const sch = schedule(inv).find((s) => s.status !== 'paid');
    const suggest = sch ? Math.min(bal, sch.amount - sch.covered) : bal;
    const m = UI.modal({
      title: 'وەرگرتنی پارە', size: 'narrow',
      body: '<div class="row between">' + UI.who(Store.patientName(inv.patientId), inv.no + ' · ماوە ' + U.money(bal)) + '</div>' +
        '<form class="form" id="payf" style="grid-template-columns:minmax(0,1fr)" novalidate>' +
        UI.field('بڕ (د.ع)', '<input class="input" name="amount" inputmode="numeric" value="' + suggest + '" style="font-size:18px;font-weight:700">', { req: true, hint: sch ? 'قیستی ' + U.num(sch.k) + ': ' + U.money(sch.amount) : '' }) +
        '<div class="chips">' + [bal, Math.round(bal / 2 / 5000) * 5000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => '<button type="button" class="chip" data-amt="' + v + '">' + U.money(v) + '</button>').join('') + '</div>' +
        '<div class="field"><span class="lbl">شێواز</span>' + methodChips('method', 'cash') + '</div>' +
        UI.field('بەروار', '<input class="input" type="date" name="date" value="' + U.today() + '">') +
        '</form>',
      foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn" data-ok-print>' + I('printer') + 'وەرگرتن و چاپ</button><button class="btn primary" data-ok>' + I('check') + 'وەرگرتن</button>'
    });
    const f = m.$('#payf');
    m.el.addEventListener('click', (e) => { const a = e.target.closest('[data-amt]'); if (a) f.amount.value = a.dataset.amt; });
    const go = (print) => {
      if (!UI.validate(f, { amount: (v) => { const n = UI.parseNum(v); return n <= 0 ? 'بڕێکی دروست بنووسە' : n > bal ? 'بڕەکە لە قەرزی ماوە (' + U.money(bal) + ') زیاترە' : null; } })) return;
      const d = UI.data(f);
      const pay = { id: U.uid('pay'), invoiceId: inv.id, patientId: inv.patientId, amount: UI.parseNum(d.amount), method: d.method || 'cash', date: d.date || U.today(), by: Store.me.id };
      Store.db.payments.push(pay);
      Store.commit('payment', 'پارەدانی ' + U.money(pay.amount) + ' (' + Store.METHODS[pay.method] + ') لە ' + Store.patientName(inv.patientId) + ' وەرگیرا', { ref: inv.id });
      m.close();
      UI.toast('پارەکە وەرگیرا — ' + U.money(pay.amount));
      if (print) printReceipt(inv, pay);
    };
    m.$('[data-ok]').addEventListener('click', () => go(false));
    m.$('[data-ok-print]').addEventListener('click', () => go(true));
  }

  function printInvoice(inv) {
    const p = Store.patient(inv.patientId);
    const sub = U.sum(inv.items, (x) => x.price * (x.qty || 1));
    const sch = schedule(inv);
    UI.print('<div class="doc">' + UI.docHead('پسوولە', '<div>ژمارە: <b class="latin">' + esc(inv.no) + '</b></div><div>بەروار: ' + U.fmtDate(inv.date) + '</div>') +
      '<table><tr><th>نەخۆش</th><td>' + esc(p ? p.name : '') + '</td><th>پەڕگە</th><td>#' + (p ? U.d(p.fileNo) : '') + '</td></tr><tr><th>دکتۆر</th><td>' + esc(Store.doctorName(inv.doctorId)) + '</td><th>مۆبایل</th><td class="ltr">' + (p ? U.fmtPhone(p.phone) : '') + '</td></tr></table>' +
      '<table><thead><tr><th>#</th><th>چارەسەر</th><th>ددان</th><th class="num">ژمارە</th><th class="num">نرخ</th><th class="num">کۆ</th></tr></thead><tbody>' + inv.items.map((x, i) => '<tr><td>' + U.d(i + 1) + '</td><td>' + esc(x.name) + '</td><td class="latin">' + (x.tooth || '—') + '</td><td class="num">' + U.num(x.qty || 1) + '</td><td class="num">' + U.num(x.price) + '</td><td class="num">' + U.num(x.price * (x.qty || 1)) + '</td></tr>').join('') + '</tbody></table>' +
      '<table class="tot"><tr><td>کۆ</td><td class="num">' + U.money(sub) + '</td></tr>' + (inv.discount ? '<tr><td>داشکاندن</td><td class="num">− ' + U.money(inv.discount) + '</td></tr>' : '') + '<tr class="g"><td>کۆی گشتی</td><td class="num">' + U.money(inv.total) + '</td></tr><tr><td>دراوە</td><td class="num">' + U.money(Store.paidFor(inv.id)) + '</td></tr><tr><td>ماوە</td><td class="num">' + U.money(Store.invBalance(inv)) + '</td></tr></table>' +
      (sch.length ? '<p><b>خشتەی قیست:</b></p><table><thead><tr><th>قیست</th><th>بەروار</th><th class="num">بڕ</th></tr></thead><tbody>' + sch.map((s) => '<tr><td>' + U.d(s.k) + '</td><td>' + U.fmtDate(s.due) + '</td><td class="num">' + U.num(s.amount) + '</td></tr>').join('') + '</tbody></table>' : '') +
      (Store.invBalance(inv) === 0 ? '<p><span class="stamp">دراوە</span></p>' : '') +
      '<div class="foot"><span>' + esc(Store.db.settings.invoiceNote || '') + '</span><span>' + esc(Store.db.settings.website || '') + '</span></div></div>');
  }
  function printReceipt(inv, pay) {
    UI.print('<div class="doc">' + UI.docHead('پسوولەی وەرگرتن', '<div>پسوولە: <b class="latin">' + esc(inv.no) + '</b></div><div>بەروار: ' + U.fmtDate(pay.date) + '</div>') +
      '<p style="font-size:14pt">وەرگیرا لە بەڕێز <b>' + esc(Store.patientName(inv.patientId)) + '</b> بڕی <b>' + U.money(pay.amount) + '</b> بە شێوازی ' + esc(Store.METHODS[pay.method]) + '، لە بەرامبەر ' + esc(inv.items.map((x) => x.name).join('، ')) + '.</p>' +
      '<table class="tot"><tr><td>کۆی پسوولە</td><td class="num">' + U.money(inv.total) + '</td></tr><tr><td>کۆی دراو تا ئێستا</td><td class="num">' + U.money(Store.paidFor(inv.id)) + '</td></tr><tr class="g"><td>ماوە</td><td class="num">' + U.money(Store.invBalance(inv)) + '</td></tr></table>' +
      '<div class="sig"><div>وەرگر<br>' + esc(Store.user(pay.by) ? Store.user(pay.by).name : '') + '</div><div>مۆری کلینیک</div></div></div>');
  }

  function openExpenseForm(exp) {
    if (!Store.can('manage_expenses')) { UI.toast('دەسەڵاتی تۆمارکردنی خەرجیت نییە', 'err'); return; }
    const e = exp || { category: EXP_CATS[3], amount: '', date: U.today(), note: '' };
    const m = UI.modal({
      title: exp ? 'دەستکاری خەرجی' : 'خەرجی نوێ', size: 'narrow',
      body: '<form class="form" id="exf" style="grid-template-columns:minmax(0,1fr)" novalidate>' + UI.field('جۆر', '<select class="select" name="category">' + UI.opts(EXP_CATS.map((c) => [c, c]), e.category) + '</select>') + UI.field('بڕ (د.ع)', '<input class="input" name="amount" inputmode="numeric" value="' + esc(e.amount) + '">', { req: true }) + UI.field('بەروار', '<input class="input" type="date" name="date" value="' + e.date + '">') + UI.field('وردەکاری', '<input class="input" name="note" value="' + esc(e.note) + '" placeholder="نموونە: کڕینی کۆمپۆزیت">') + '</form>',
      foot: (exp ? '<div class="left"><button class="btn danger sm" data-del>' + I('trash', 'sm') + 'سڕینەوە</button></div>' : '') + '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>پاشەکەوتکردن</button>'
    });
    const f = m.$('#exf');
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { amount: (v) => (UI.parseNum(v) > 0 ? null : 'بڕێکی دروست بنووسە') })) return;
      const d = UI.data(f);
      const rec = { category: d.category, amount: UI.parseNum(d.amount), date: d.date || U.today(), note: d.note };
      if (exp) { Object.assign(exp, rec); Store.commit('expense', 'خەرجی دەستکاری کرا: ' + rec.category); } else { Store.db.expenses.push(Object.assign({ id: U.uid('ex'), by: Store.me.id }, rec)); Store.commit('expense', 'خەرجی ' + U.money(rec.amount) + ' (' + rec.category + ') تۆمار کرا'); }
      m.close();
      UI.toast('خەرجییەکە پاشەکەوت کرا');
    });
    const del = m.$('[data-del]');
    if (del) del.addEventListener('click', async () => { if (await UI.confirm({ title: 'سڕینەوەی خەرجی', text: 'ئەم خەرجییە دەسڕێتەوە.', ok: 'سڕینەوە', danger: true })) { Store.db.expenses = Store.db.expenses.filter((x) => x.id !== exp.id); Store.commit('expense', 'خەرجییەک سڕایەوە: ' + exp.category); m.close(); } });
  }

  /* ---------- page ---------- */
  Pages.billing = {
    title: 'پارە و حیساب',
    openInvoiceForm, openInvoice, openPayment, openExpenseForm, printInvoice, schedule,
    render(r) {
      const T = U.today();
      const month = r.params.month || T.slice(0, 7);
      const from = month + '-01', to = month === T.slice(0, 7) ? T : U.endOfMonth(from);
      const tab = r.params.tab || 'invoices';
      const ids = Store.scopeDoctorIds();
      const fin = Store.can('view_finance');
      const billed = Store.billed(from, to, ids), coll = Store.collected(from, to, ids);
      const exps = Store.db.expenses.filter((e) => e.date >= from && e.date <= to);
      const expTotal = U.sum(exps, (e) => e.amount);
      const shares = U.sum(Store.doctors(true).filter((d) => ids.includes(d.id)), (d) => Store.billed(from, to, [d.id]) * (d.share || 0) / 100);
      const months = [];
      for (let k = 0; k < 12; k++) { const mk = U.addMonths(T, -k).slice(0, 7); months.push([mk, U.fmtMonth(mk)]); }
      const tabs = [['invoices', 'پسوولەکان', 'receipt'], ['payments', 'پارەدانەکان', 'wallet'], ['debts', 'قەرزەکان', 'alert']].concat(Store.can('manage_expenses') || fin ? [['expenses', 'خەرجییەکان', 'box']] : []);
      let html = '<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">پارە و حیساب' + (Store.can('view_all') ? '' : ' · ' + esc(Store.scopeLabel())) + '</span><h1 class="page-title">' + U.fmtMonth(month) + '</h1></div><div class="row wrap"><select class="select" data-month style="width:190px">' + UI.opts(months, month) + '</select>' + (Store.can('manage_expenses') ? '<button class="btn" data-new-exp>' + I('plus') + 'خەرجی</button>' : '') + (Store.can('billing') ? '<button class="btn accent" data-new-inv>' + I('plus') + 'پسوولەی نوێ</button>' : '') + '</div></div>';
      html += '<div class="grid ' + (fin ? 'g-5' : 'g-3') + '">' +
        UI.kpi('پسوولەکراو', U.moneyShort(billed) + ' <small>د.ع</small>', U.num(Store.invoicesIn(from, to, ids).length) + ' پسوولە', 'receipt') +
        UI.kpi('وەرگیراو', U.moneyShort(coll) + ' <small>د.ع</small>', U.num(Store.paymentsIn(from, to, ids).length) + ' پارەدان', 'wallet') +
        UI.kpi('کۆی قەرزی ماوە', '<span class="down">' + U.moneyShort(Store.outstanding(ids)) + '</span> <small>د.ع</small>', 'هەموو کاتەکان', 'alert', { icoStyle: 'background:var(--red-bg);color:var(--red-fg)' }) +
        (fin ? UI.kpi('خەرجی', U.moneyShort(expTotal) + ' <small>د.ع</small>', 'پشکی دکتۆرەکان: ' + U.moneyShort(shares), 'box') + UI.kpi('قازانجی ڕاستەقینە', '<span class="' + (coll - expTotal - shares >= 0 ? 'up' : 'down') + '">' + U.moneyShort(coll - expTotal - shares) + '</span> <small>د.ع</small>', 'وەرگیراو − خەرجی − پشکی دکتۆر', 'trend') : '') + '</div>';
      html += '<div class="tabs">' + tabs.map((t) => '<button class="tab ' + (t[0] === tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + I(t[2], 'sm') + t[1] + '</button>').join('') + '</div>';
      const docs = Store.scopedDoctors(true);
      if (tab === 'invoices') {
        let list = Store.invoicesIn(from, to, state.doctor ? [state.doctor] : ids);
        if (state.status) list = list.filter((i) => Store.invStatus(i) === state.status);
        if (state.q) list = list.filter((i) => { const p = Store.patient(i.patientId); return U.search(i.no + ' ' + (p ? p.name + ' ' + p.phone : '') + ' ' + i.items.map((x) => x.name).join(' '), state.q); });
        list = list.slice().sort(U.by((i) => i.date + i.no, -1));
        const size = 20, pages = Math.max(1, Math.ceil(list.length / size));
        state.page = U.clamp(state.page, 1, pages);
        const rows = list.slice((state.page - 1) * size, state.page * size);
        html += '<div class="card flush"><div class="row wrap" style="padding:14px 18px;gap:10px;border-bottom:1px solid var(--border)"><input class="input" data-q style="max-width:260px" placeholder="ژمارەی پسوولە، ناو، مۆبایل" value="' + esc(state.q) + '">' + (docs.length > 1 ? '<select class="select" data-doc style="max-width:200px">' + UI.opts(docs, state.doctor, 'هەموو دکتۆرەکان') + '</select>' : '') + '<div class="chips">' + [['', 'هەموو'], ['paid', 'دراوە'], ['partial', 'بەشێکی دراوە'], ['unpaid', 'نەدراوە']].map((s) => '<button class="chip ' + (state.status === s[0] ? 'on' : '') + '" data-st="' + s[0] + '">' + s[1] + '</button>').join('') + '</div>' + (Store.can('export_data') ? '<button class="btn sm" data-export style="margin-inline-start:auto">' + I('download', 'sm') + 'Excel</button>' : '') + '</div>' +
          (rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>ژمارە</th><th>بەروار</th><th>نەخۆش</th><th>چارەسەر</th>' + (docs.length > 1 ? '<th>دکتۆر</th>' : '') + '<th class="num">کۆ</th><th class="num">ماوە</th><th>بار</th><th></th></tr></thead><tbody>' + rows.map((i) => '<tr class="click" data-inv="' + i.id + '"><td class="latin nowrap">' + esc(i.no) + '</td><td class="nowrap">' + U.fmtDateShort(i.date) + '</td><td>' + esc(Store.patientName(i.patientId)) + '</td><td class="small">' + esc(i.items.map((x) => x.name).join('، ')) + (i.installments ? ' ' + UI.badge('قیست', 'b-blue') : '') + '</td>' + (docs.length > 1 ? '<td class="nowrap">' + esc(Store.doctorName(i.doctorId)) + '</td>' : '') + '<td class="num">' + U.money(i.total) + '</td><td class="num">' + (Store.invBalance(i) ? '<b class="down">' + U.money(Store.invBalance(i)) + '</b>' : '—') + '</td><td>' + UI.invBadge(i) + '</td><td>' + (Store.invBalance(i) && Store.can('billing') ? '<button class="btn xs" data-pay="' + i.id + '">وەرگرتن</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' + UI.pager(list.length, state.page, size) : UI.empty('هیچ پسوولەیەک لەم مانگەدا نییە', 'receipt')) + '</div>';
      }
      if (tab === 'payments') {
        const pays = Store.paymentsIn(from, to, ids).slice().sort(U.by((x) => x.date, -1));
        const byM = U.groupBy(pays, (x) => x.method);
        html += '<div class="split-r"><section class="card"><div class="card-head"><span class="card-title">شێوازی پارەدان</span></div><div class="chart-box sm"><canvas id="ch-methods"></canvas></div><div class="list" style="margin-top:10px">' + Object.keys(Store.METHODS).map((k) => '<div class="li"><span class="grow">' + esc(Store.METHODS[k]) + '</span><b>' + U.money(U.sum(byM[k] || [], (x) => x.amount)) + '</b></div>').join('') + '</div></section>' +
          '<section class="card flush">' + (pays.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>بەروار</th><th>نەخۆش</th><th>پسوولە</th><th>شێواز</th><th>وەرگر</th><th class="num">بڕ</th></tr></thead><tbody>' + pays.slice(0, 80).map((x) => { const inv = Store.invoice(x.invoiceId); return '<tr class="click" data-inv="' + x.invoiceId + '"><td class="nowrap">' + U.fmtDateShort(x.date) + '</td><td>' + esc(Store.patientName(x.patientId)) + '</td><td class="latin">' + esc(inv ? inv.no : '') + '</td><td>' + esc(Store.METHODS[x.method] || x.method) + '</td><td class="small nowrap">' + esc(Store.user(x.by) ? Store.user(x.by).name : '') + '</td><td class="num"><b>' + U.money(x.amount) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' + (pays.length > 80 ? '<div class="pager">' + U.num(pays.length - 80) + ' پارەدانی تر — مانگێکی تر هەڵبژێرە یان هەناردە بکە</div>' : '') : UI.empty('هیچ پارەدانێک نییە', 'wallet')) + '</section></div>';
      }
      if (tab === 'debts') {
        const by = {};
        Store.db.invoices.filter((i) => ids.includes(i.doctorId) && Store.invBalance(i) > 0).forEach((i) => { const b = by[i.patientId] = by[i.patientId] || { pid: i.patientId, bal: 0, oldest: i.date, invs: [] }; b.bal += Store.invBalance(i); b.invs.push(i); if (i.date < b.oldest) b.oldest = i.date; });
        const list = Object.values(by).sort(U.by((x) => x.bal, -1));
        const aging = [[0, 30, '٠–٣٠ ڕۆژ'], [31, 60, '٣١–٦٠ ڕۆژ'], [61, 90, '٦١–٩٠ ڕۆژ'], [91, 9999, 'زیاتر لە ٩٠ ڕۆژ']].map(([a, b, l]) => [l, U.sum(Store.db.invoices.filter((i) => ids.includes(i.doctorId) && Store.invBalance(i) > 0 && U.diffDays(T, i.date) >= a && U.diffDays(T, i.date) <= b), Store.invBalance)]);
        html += '<div class="grid g-4">' + aging.map((a, i) => UI.kpi(a[0], U.moneyShort(a[1]) + ' <small>د.ع</small>', '', i >= 2 ? 'alert' : 'clock', { icoStyle: i >= 2 ? 'background:var(--red-bg);color:var(--red-fg)' : '' })).join('') + '</div>';
        html += '<section class="card flush">' + (list.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>نەخۆش</th><th>مۆبایل</th><th>پسوولە</th><th>کۆنترین</th><th class="num">قەرز</th><th></th></tr></thead><tbody>' + list.map((x) => { const p = Store.patient(x.pid); return '<tr><td><a href="#/patients/' + x.pid + '?tab=billing">' + esc(p ? p.name : '—') + '</a></td><td class="ltr nowrap" style="text-align:right">' + (p ? U.fmtPhone(p.phone) : '') + '</td><td>' + U.num(x.invs.length) + '</td><td class="nowrap">' + U.fmtDateShort(x.oldest) + ' <span class="small ' + (U.diffDays(T, x.oldest) > 60 ? 'down' : 'muted') + '">(' + U.num(U.diffDays(T, x.oldest)) + ' ڕۆژ)</span></td><td class="num"><b class="down">' + U.money(x.bal) + '</b></td><td><span class="row" style="gap:4px;justify-content:flex-end">' + (p ? '<a class="btn xs wa" target="_blank" rel="noopener" href="' + U.waLink(p.phone, 'سڵاو ' + p.name + '، بیرخستنەوەیەکی دۆستانە لە Bite for Dentistry: بڕی ' + U.money(x.bal) + ' لە حیسابەکەتدا ماوە. سوپاس.') + '">' + I('whatsapp', 'sm') + '</a>' : '') + (Store.can('billing') ? '<button class="btn xs" data-pay="' + x.invs.sort(U.by((i) => i.date))[0].id + '">وەرگرتن</button>' : '') + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : UI.empty('هیچ قەرزێک نییە — هەموو حیسابەکان پاکن', 'check')) + '</section>';
      }
      if (tab === 'expenses') {
        const byCat = U.groupBy(exps, (e) => e.category);
        html += '<div class="split-r"><section class="card"><div class="card-head"><span class="card-title">بەپێی جۆر</span><b>' + U.money(expTotal) + '</b></div><div class="chart-box sm"><canvas id="ch-exp"></canvas></div><div class="stack" style="gap:10px;margin-top:12px">' + Object.entries(byCat).sort((a, b) => U.sum(b[1], (e) => e.amount) - U.sum(a[1], (e) => e.amount)).map(([c, l]) => UI.progRow(c, U.money(U.sum(l, (e) => e.amount)), expTotal ? U.sum(l, (e) => e.amount) / expTotal * 100 : 0, 'navy')).join('') + '</div></section>' +
          '<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">خەرجییەکان</span>' + (Store.can('manage_expenses') ? '<button class="btn sm primary" data-new-exp>' + I('plus', 'sm') + 'خەرجی نوێ</button>' : '') + '</div>' + (exps.length ? '<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>بەروار</th><th>جۆر</th><th>وردەکاری</th><th class="num">بڕ</th></tr></thead><tbody>' + exps.slice().sort(U.by((e) => e.date, -1)).map((e) => '<tr class="' + (Store.can('manage_expenses') ? 'click' : '') + '" data-exp="' + e.id + '"><td class="nowrap">' + U.fmtDateShort(e.date) + '</td><td>' + esc(e.category) + '</td><td class="small">' + esc(e.note || '') + '</td><td class="num"><b>' + U.money(e.amount) + '</b></td></tr>').join('') + '</tbody></table></div>' : UI.empty('هیچ خەرجییەک تۆمار نەکراوە', 'box')) + '</section></div>';
      }
      return html;
    },
    mount(root, r) {
      const T = U.today();
      const month = r.params.month || T.slice(0, 7);
      const from = month + '-01', to = month === T.slice(0, 7) ? T : U.endOfMonth(from);
      const ids = Store.scopeDoctorIds();
      root.querySelector('[data-month]').addEventListener('change', (e) => App.setParams({ month: e.target.value === T.slice(0, 7) ? null : e.target.value }));
      root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { state.page = 1; App.setParams({ tab: b.dataset.tab === 'invoices' ? null : b.dataset.tab }); }));
      root.querySelectorAll('[data-new-inv]').forEach((b) => b.addEventListener('click', () => openInvoiceForm({})));
      root.querySelectorAll('[data-new-exp]').forEach((b) => b.addEventListener('click', () => openExpenseForm()));
      root.addEventListener('click', (e) => {
        const pay = e.target.closest('[data-pay]');
        if (pay) { e.stopPropagation(); openPayment(pay.dataset.pay); return; }
        const inv = e.target.closest('[data-inv]');
        if (inv) openInvoice(inv.dataset.inv);
        const st = e.target.closest('[data-st]');
        if (st) { state.status = st.dataset.st; state.page = 1; App.render(); }
        const pg = e.target.closest('[data-page]');
        if (pg && !pg.disabled) { state.page = Number(pg.dataset.page); App.render(); }
        const ex = e.target.closest('[data-exp]');
        if (ex && Store.can('manage_expenses')) openExpenseForm(Store.db.expenses.find((x) => x.id === ex.dataset.exp));
        if (e.target.closest('[data-export]')) {
          const rows = [['ژمارە', 'بەروار', 'نەخۆش', 'دکتۆر', 'چارەسەر', 'کۆ', 'دراوە', 'ماوە', 'بار']];
          Store.invoicesIn(from, to, ids).forEach((i) => rows.push([i.no, i.date, Store.patientName(i.patientId), Store.doctorName(i.doctorId), i.items.map((x) => x.name).join(' + '), i.total, Store.paidFor(i.id), Store.invBalance(i), { paid: 'دراوە', partial: 'بەشێکی دراوە', unpaid: 'نەدراوە' }[Store.invStatus(i)]]));
          U.download('bite-invoices-' + month + '.csv', U.csv(rows), 'text/csv;charset=utf-8');
          UI.toast('فایلەکە دابەزی');
        }
      });
      const q = root.querySelector('[data-q]');
      if (q) q.addEventListener('input', U.debounce(() => { state.q = q.value; state.page = 1; App.render(); const n = document.querySelector('[data-q]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250));
      const ds = root.querySelector('[data-doc]');
      if (ds) ds.addEventListener('change', () => { state.doctor = ds.value; state.page = 1; App.render(); });
      const cm = root.querySelector('#ch-methods');
      if (cm) { const pays = Store.paymentsIn(from, to, ids); const keys = Object.keys(Store.METHODS); Charts.doughnut(cm, keys.map((k) => Store.METHODS[k]), keys.map((k) => U.sum(pays.filter((x) => x.method === k), (x) => x.amount)), null, { money: true }); }
      const ce = root.querySelector('#ch-exp');
      if (ce) { const exps = Store.db.expenses.filter((x) => x.date >= from && x.date <= to); const by = U.groupBy(exps, (x) => x.category); const cats = Object.keys(by); Charts.doughnut(ce, cats, cats.map((c) => U.sum(by[c], (x) => x.amount)), null, { money: true }); }
    }
  };
})();
