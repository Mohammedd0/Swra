/* Data layer: localStorage persistence, session, permissions, queries */
(function () {
  const KEY = 'bite_crm_db_v1';
  const SKEY = 'bite_crm_session_v1';
  const STATUS = {
    scheduled: { label: 'دیاریکراو', cls: 'b-gray' },
    confirmed: { label: 'پشتڕاستکراوە', cls: 'b-blue' },
    arrived: { label: 'گەیشتووە', cls: 'b-purple' },
    in_progress: { label: 'لە چارەسەردایە', cls: 'b-amber' },
    completed: { label: 'تەواوبوو', cls: 'b-green' },
    no_show: { label: 'نەهات', cls: 'b-red' },
    cancelled: { label: 'هەڵوەشێنرایەوە', cls: 'b-gray' }
  };
  const TOOTH = {
    healthy: { label: 'سالم', cls: '' },
    needs: { label: 'پێویستی بە چارەسەرە', cls: 's-needs', short: 'پێویستە' },
    filled: { label: 'پڕکراوەتەوە', cls: 's-filled', short: 'پڕکراوە' },
    rct: { label: 'ڕەگ چارەسەری', cls: 's-rct', short: 'ڕەگ' },
    crown: { label: 'کراون', cls: 's-crown', short: 'کراون' },
    veneer: { label: 'ڤینیەر', cls: 's-veneer', short: 'ڤینیەر' },
    implant: { label: 'ئیمپلانت', cls: 's-implant', short: 'ئیمپلانت' },
    extracted: { label: 'هەڵکێشراوە', cls: 's-extracted', short: 'هەڵکێشراوە' },
    missing: { label: 'نەماوە', cls: 's-missing', short: 'نەماوە' }
  };
  const METHODS = { cash: 'کاش', card: 'کارتی بانکی', fib: 'FIB', fastpay: 'FastPay', zaincash: 'زەین کاش' };
  const ROLES = { owner: 'خاوەن', admin: 'بەڕێوەبەر', doctor: 'دکتۆر', secretary: 'سکرتێر' };
  const LAB_STATUS = { sent: { label: 'نێردراوە', cls: 'b-blue' }, in_progress: { label: 'لە دروستکردندایە', cls: 'b-amber' }, received: { label: 'گەیشتەوە', cls: 'b-purple' }, fitted: { label: 'دانرا', cls: 'b-green' } };

  const S = {
    db: null, me: null, STATUS, TOOTH, METHODS, ROLES, LAB_STATUS,
    _idx: null, _saveFail: false,

    init() {
      let raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
      if (raw) {
        try { S.db = JSON.parse(raw); } catch (e) { S.db = null; }
      }
      if (!S.db || !S.db.users) { S.db = Seed.build(); S.save(); }
      S.migrate();
      U.digits = S.db.settings.digits || 'ar';
      try {
        const sess = JSON.parse(localStorage.getItem(SKEY) || 'null');
        if (sess && sess.userId) {
          const u = S.user(sess.userId);
          if (u && u.active) S.me = u;
        }
      } catch (e) { /* ignore */ }
      S.reindex();
    },
    migrate() {
      const d = S.db;
      ['requests', 'leaves', 'audit', 'labOrders', 'inventory', 'expenses', 'payments', 'invoices'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
      d.patients.forEach((p) => { p.teeth = p.teeth || {}; p.plan = p.plan || []; p.files = p.files || []; p.clinical = p.clinical || []; p.prescriptions = p.prescriptions || []; p.tags = p.tags || []; p.allergies = p.allergies || []; p.conditions = p.conditions || []; });
      const perms = d.settings.permissions || {};
      ['admin', 'doctor', 'secretary'].forEach((role) => {
        perms[role] = Object.assign({}, Seed.ROLE_DEFAULTS[role], perms[role] || {});
      });
      d.settings.permissions = perms;
    },
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(S.db));
        S._saveFail = false;
        return true;
      } catch (e) {
        if (!S._saveFail && window.UI) UI.toast('شوێنی پاشەکەوتکردن لە وێبگەڕەکەدا پڕ بووە. هەندێک فایل بسڕەوە یان باکئەپ بگرە.', 'err');
        S._saveFail = true;
        return false;
      }
    },
    reset() {
      S.db = Seed.build({ seed: 20261022 });
      S.save();
      S.reindex();
    },
    reindex() {
      const paid = {}, payByInv = {};
      S.db.payments.forEach((p) => {
        paid[p.invoiceId] = (paid[p.invoiceId] || 0) + p.amount;
        (payByInv[p.invoiceId] = payByInv[p.invoiceId] || []).push(p);
      });
      const users = {}, patients = {}, services = {}, rooms = {}, invoices = {};
      S.db.users.forEach((u) => { users[u.id] = u; });
      S.db.patients.forEach((p) => { patients[p.id] = p; });
      S.db.services.forEach((s) => { services[s.id] = s; });
      S.db.rooms.forEach((r) => { rooms[r.id] = r; });
      S.db.invoices.forEach((i) => { invoices[i.id] = i; });
      const apptsByPatient = {}, apptsByDate = {}, patientDocs = {};
      S.db.appointments.forEach((a) => {
        (apptsByPatient[a.patientId] = apptsByPatient[a.patientId] || []).push(a);
        (apptsByDate[a.date] = apptsByDate[a.date] || []).push(a);
        (patientDocs[a.patientId] = patientDocs[a.patientId] || {})[a.doctorId] = true;
      });
      const invByPatient = U.groupBy(S.db.invoices, (i) => i.patientId);
      S._idx = { paid, payByInv, users, patients, services, rooms, invoices, apptsByPatient, apptsByDate, patientDocs, invByPatient };
    },
    commit(type, text, opts) {
      if (type) S.log(type, text, opts);
      S.reindex();
      S.save();
      if (window.App && !(opts && opts.silent)) App.onDataChange();
    },
    log(type, text, opts) {
      S.db.audit.unshift({ id: U.uid('lg'), at: U.stamp(), userId: S.me ? S.me.id : null, action: type, details: text, ref: opts && opts.ref });
      if (S.db.audit.length > 1500) S.db.audit.length = 1500;
    },

    /* session */
    login(username, password) {
      const u = S.db.users.find((x) => x.username.toLowerCase() === String(username || '').trim().toLowerCase());
      if (!u || u.password !== String(password || '')) return { error: 'ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە' };
      if (!u.active) return { error: 'ئەم هەژمارە ناچالاک کراوە. پەیوەندی بە خاوەنی کلینیکەوە بکە.' };
      S.me = u;
      try { localStorage.setItem(SKEY, JSON.stringify({ userId: u.id, at: U.stamp() })); } catch (e) { /* ignore */ }
      u.lastLogin = U.stamp();
      S.log('login', 'چووە ژوورەوە');
      S.save();
      return { user: u };
    },
    logout() {
      if (S.me) { S.log('login', 'چووە دەرەوە'); S.save(); }
      S.me = null;
      try { localStorage.removeItem(SKEY); } catch (e) { /* ignore */ }
    },

    /* permissions & scope */
    isOwner() { return !!S.me && S.me.role === 'owner'; },
    can(perm) {
      if (!S.me) return false;
      if (S.me.role === 'owner') return true;
      const p = S.db.settings.permissions[S.me.role];
      return !!(p && p[perm]);
    },
    scopeDoctorIds() {
      if (!S.me) return [];
      if (S.me.role === 'doctor') return [S.me.id];
      if (S.me.role === 'secretary') return S.me.doctorId ? [S.me.doctorId] : [];
      if (S.can('view_all')) return S.doctors(true).map((d) => d.id);
      return [];
    },
    inScope(doctorId) { return S.scopeDoctorIds().includes(doctorId); },
    scopeLabel() {
      if (!S.me) return '';
      if (S.me.role === 'secretary') { const d = S.user(S.me.doctorId); return d ? 'س. ' + d.name : ''; }
      if (S.me.role === 'doctor') return S.me.name;
      return 'هەموو کلینیک';
    },

    /* lookups */
    user(id) { return S._idx.users[id] || null; },
    patient(id) { return S._idx.patients[id] || null; },
    service(id) { return S._idx.services[id] || null; },
    room(id) { return S._idx.rooms[id] || null; },
    invoice(id) { return S._idx.invoices[id] || null; },
    doctors(includeInactive) { return S.db.users.filter((u) => u.role === 'doctor' && (includeInactive || u.active)); },
    scopedDoctors(includeInactive) { const ids = S.scopeDoctorIds(); return S.doctors(includeInactive).filter((d) => ids.includes(d.id)); },
    secretaryOf(docId) { return S.db.users.filter((u) => u.role === 'secretary' && u.doctorId === docId && u.active); },
    serviceName(id) { const s = S.service(id); return s ? s.name : '—'; },
    doctorName(id) { const u = S.user(id); return u ? u.name : '—'; },
    patientName(id) { const p = S.patient(id); return p ? p.name : 'نەخۆشی سڕاوە'; },

    visiblePatients() {
      if (S.can('view_all')) return S.db.patients;
      const ids = S.scopeDoctorIds();
      return S.db.patients.filter((p) => ids.includes(p.doctorId) || ids.some((d) => S._idx.patientDocs[p.id] && S._idx.patientDocs[p.id][d]));
    },
    canSeePatient(p) {
      if (!p) return false;
      if (S.can('view_all')) return true;
      const ids = S.scopeDoctorIds();
      return ids.includes(p.doctorId) || ids.some((d) => S._idx.patientDocs[p.id] && S._idx.patientDocs[p.id][d]);
    },
    appts(f) {
      f = f || {};
      let list;
      if (f.date) list = S._idx.apptsByDate[f.date] || [];
      else if (f.patientId) list = S._idx.apptsByPatient[f.patientId] || [];
      else list = S.db.appointments;
      const ids = f.doctorIds || (f.allScopes ? null : S.scopeDoctorIds());
      return list.filter((a) => (!ids || ids.includes(a.doctorId)) && (!f.from || a.date >= f.from) && (!f.to || a.date <= f.to) && (!f.status || (Array.isArray(f.status) ? f.status.includes(a.status) : a.status === f.status)) && (!f.patientId || a.patientId === f.patientId) && (!f.date || a.date === f.date));
    },
    apptEnd(a) { return U.toMin(a.start) + a.duration; },
    isActive(a) { return a.status !== 'cancelled' && a.status !== 'no_show'; },
    conflicts(a) {
      const s = U.toMin(a.start), e = s + Number(a.duration);
      return (S._idx.apptsByDate[a.date] || []).filter((b) => b.id !== a.id && S.isActive(b) && (b.doctorId === a.doctorId || (a.roomId && b.roomId === a.roomId) || b.patientId === a.patientId) && U.toMin(b.start) < e && S.apptEnd(b) > s);
    },
    leaveFor(docId, date) { return S.db.leaves.find((l) => l.doctorId === docId && date >= l.from && date <= l.to) || null; },
    isClosedDay(date) { return (S.db.settings.closedDays || []).includes(U.dow(date)); },
    worksOn(doc, date) { return (doc.workDays || [6, 0, 1, 2, 3, 4]).includes(U.dow(date)) && !S.isClosedDay(date); },

    /* money */
    paidFor(invId) { return S._idx.paid[invId] || 0; },
    paymentsFor(invId) { return S._idx.payByInv[invId] || []; },
    invStatus(inv) {
      const p = S.paidFor(inv.id);
      if (inv.total <= 0 || p >= inv.total) return 'paid';
      return p > 0 ? 'partial' : 'unpaid';
    },
    invBalance(inv) { return Math.max(0, inv.total - S.paidFor(inv.id)); },
    patientInvoices(pid) { return S._idx.invByPatient[pid] || []; },
    patientBalance(pid) { return U.sum(S.patientInvoices(pid), (i) => S.invBalance(i)); },
    patientPaid(pid) { return U.sum(S.patientInvoices(pid), (i) => S.paidFor(i.id)); },
    invoicesIn(from, to, docIds) { const ids = docIds || S.scopeDoctorIds(); return S.db.invoices.filter((i) => ids.includes(i.doctorId) && i.date >= from && i.date <= to); },
    paymentsIn(from, to, docIds) {
      const ids = docIds || S.scopeDoctorIds();
      return S.db.payments.filter((p) => { const inv = S.invoice(p.invoiceId); return inv && ids.includes(inv.doctorId) && p.date >= from && p.date <= to; });
    },
    billed(from, to, docIds) { return U.sum(S.invoicesIn(from, to, docIds), (i) => i.total); },
    collected(from, to, docIds) { return U.sum(S.paymentsIn(from, to, docIds), (p) => p.amount); },
    outstanding(docIds) { const ids = docIds || S.scopeDoctorIds(); return U.sum(S.db.invoices.filter((i) => ids.includes(i.doctorId)), (i) => S.invBalance(i)); },
    nextInvoiceNo() {
      const max = S.db.invoices.reduce((m, i) => Math.max(m, Number(String(i.no).replace(/\D/g, '')) || 0), 2000);
      return 'INV-' + (max + 1);
    },
    nextFileNo() { return S.db.patients.reduce((m, p) => Math.max(m, p.fileNo || 0), 1000) + 1; },

    /* live doctor status for today */
    liveStatus(doc) {
      const T = U.today();
      const now = U.nowMin();
      const today = (S._idx.apptsByDate[T] || []).filter((a) => a.doctorId === doc.id).sort(U.by((a) => a.start));
      const lv = S.leaveFor(doc.id, T);
      const open = U.toMin(S.db.settings.open), close = U.toMin(S.db.settings.close);
      const base = { today, total: today.filter(S.isActive).length, done: today.filter((a) => a.status === 'completed').length };
      if (!doc.active) return Object.assign(base, { key: 'inactive', label: 'ناچالاک', cls: 'b-gray' });
      if (lv) return Object.assign(base, { key: 'leave', label: 'مۆڵەت', cls: 'b-gray', note: lv.reason });
      if (S.isClosedDay(T) || !S.worksOn(doc, T)) return Object.assign(base, { key: 'off', label: 'پشوو', cls: 'b-gray' });
      const cur = today.find((a) => a.status === 'in_progress');
      const next = today.find((a) => ['scheduled', 'confirmed', 'arrived'].includes(a.status) && U.toMin(a.start) + a.duration > now);
      const waiting = today.filter((a) => a.status === 'arrived');
      if (cur) {
        const left = U.toMin(cur.start) + cur.duration - now;
        const surg = ['sv_implant', 'sv_graft', 'sv_wisdom'].includes(cur.serviceId);
        return Object.assign(base, { key: surg ? 'surgery' : 'busy', label: surg ? 'نەشتەرگەری' : 'لە چارەسەردایە', cls: surg ? 'b-amber' : 'b-green', cur, next, waiting, left });
      }
      if (now < open) return Object.assign(base, { key: 'before', label: 'هێشتا دەستی پێنەکردووە', cls: 'b-blue', next, waiting });
      if (now >= close) return Object.assign(base, { key: 'closed', label: 'کاتی کار تەواو بوو', cls: 'b-gray', next, waiting });
      return Object.assign(base, { key: 'free', label: 'بەتاڵە', cls: 'b-blue', next, waiting });
    },

    /* notifications computed from data */
    notifications() {
      const out = [];
      const T = U.today();
      const ids = S.scopeDoctorIds();
      if (S.can('manage_inventory')) {
        S.db.inventory.filter((i) => i.qty <= i.min).forEach((i) => out.push({ type: 'amber', icon: 'box', text: 'کۆگا: ' + i.name + ' کەمە (' + U.num(i.qty) + ' ' + i.unit + ' ماوە)', href: '#/inventory' }));
      }
      const pend = S.db.requests.filter((r) => r.status === 'pending' && (!r.doctorId || ids.includes(r.doctorId)));
      if (pend.length && S.can('create_appointments')) out.unshift({ type: 'blue', icon: 'globe', text: U.num(pend.length) + ' داواکاری نۆرەی ئۆنلاین چاوەڕێی وەڵامن', href: '#/appointments?panel=requests' });
      const open = S.appts({ to: U.addDays(T, -1), status: ['scheduled', 'confirmed', 'arrived', 'in_progress'] });
      if (open.length && S.can('edit_appointments')) out.unshift({ type: 'red', icon: 'alert', text: U.num(open.length) + ' نۆرەی ڕابردوو هێشتا داخراو نەکراون (تەواو/نەهات)', href: '#/appointments?view=list&filter=open' });
      if (S.can('billing')) {
        const overdue = S.db.invoices.filter((i) => ids.includes(i.doctorId) && S.invBalance(i) > 0 && U.diffDays(T, i.date) > 30);
        if (overdue.length) out.push({ type: 'red', icon: 'wallet', text: U.num(overdue.length) + ' پسوولە زیاتر لە ٣٠ ڕۆژە قەرزیان ماوە (' + U.moneyShort(U.sum(overdue, S.invBalance)) + ' د.ع)', href: '#/billing?tab=debts' });
      }
      if (S.can('manage_lab')) {
        const late = S.db.labOrders.filter((l) => ids.includes(l.doctorId) && ['sent', 'in_progress'].includes(l.status) && l.dueDate < T);
        if (late.length) out.push({ type: 'amber', icon: 'flask', text: U.num(late.length) + ' داواکاری تاقیگە دواکەوتوون', href: '#/lab' });
        const arrived = S.db.labOrders.filter((l) => ids.includes(l.doctorId) && l.status === 'received');
        if (arrived.length) out.push({ type: 'green', icon: 'flask', text: U.num(arrived.length) + ' کاری تاقیگە گەیشتووەتەوە و ئامادەی دانانە', href: '#/lab' });
      }
      const tomorrow = U.addDays(T, 1);
      const toRemind = S.appts({ date: tomorrow }).filter((a) => !a.reminded && S.isActive(a));
      if (toRemind.length && S.can('create_appointments')) out.push({ type: 'blue', icon: 'whatsapp', text: U.num(toRemind.length) + ' نەخۆشی سبەی بیرخستنەوەیان بۆ نەنێردراوە', href: '#/appointments?panel=reminders' });
      return out;
    },

    /* generic mutations */
    add(coll, obj, logType, logText) { S.db[coll].push(obj); S.commit(logType, logText, { ref: obj.id }); return obj; },
    update(coll, id, patch, logType, logText) {
      const o = S.db[coll].find((x) => x.id === id);
      if (!o) return null;
      Object.assign(o, patch);
      S.commit(logType, logText, { ref: id });
      return o;
    },
    remove(coll, id, logType, logText) {
      const i = S.db[coll].findIndex((x) => x.id === id);
      if (i < 0) return false;
      S.db[coll].splice(i, 1);
      S.commit(logType, logText, { ref: id });
      return true;
    },
    reminderText(a) {
      const p = S.patient(a.patientId);
      return (S.db.settings.reminderTemplate || '').replace('{name}', p ? p.name : '').replace('{date}', U.fmtDate(a.date, true)).replace('{time}', U.fmtTime(a.start) + ' ' + U.period(a.start)).replace('{doctor}', S.doctorName(a.doctorId));
    }
  };
  window.Store = S;
})();
