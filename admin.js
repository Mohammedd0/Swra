/* Admin: users (doctors, secretaries, managers), services & prices, rooms, permissions, settings, audit log, backup */
(function () {
  const esc = U.esc;
  const COLORS = ['#2F5DA8', '#B5556B', '#2A9D8F', '#C9822E', '#6B5BC9', '#1B2B4F', '#3FA987', '#D85A30', '#5BB5C5', '#993556'];
  const LOG_TYPES = { appointment: 'نۆرە', patient: 'نەخۆش', medical: 'پزیشکی', invoice: 'پسوولە', payment: 'پارەدان', expense: 'خەرجی', inventory: 'کۆگا', lab: 'تاقیگە', user: 'هەژمار', settings: 'ڕێکخستن', leave: 'مۆڵەت', reminder: 'بیرخستنەوە', login: 'چوونەژوورەوە', export: 'هەناردە', service: 'خزمەتگوزاری' };
  const auditState = { q: '', user: '', type: '', page: 1 };

  function tabsFor() {
    const t = [];
    if (Store.can('manage_users')) t.push(['users', 'هەژمارەکان', 'users']);
    if (Store.can('manage_services')) t.push(['services', 'خزمەتگوزاری و نرخ', 'receipt'], ['rooms', 'ژوورەکان', 'door']);
    if (Store.isOwner()) t.push(['roles', 'دەسەڵاتەکان', 'shield']);
    if (Store.can('manage_settings')) t.push(['settings', 'ڕێکخستنی کلینیک', 'settings']);
    if (Store.can('view_audit')) t.push(['audit', 'تۆماری گۆڕانکاری', 'history']);
    if (Store.can('export_data')) t.push(['data', 'باکئەپ و داتا', 'download']);
    return t;
  }

  /* ---------- users ---------- */
  function userForm(u, presetRole) {
    const editing = !!u;
    const isOwnerAcct = u && u.role === 'owner';
    if (isOwnerAcct && !Store.isOwner()) { UI.toast('تەنها خاوەن دەتوانێت هەژماری خۆی بگۆڕێت', 'err'); return; }
    const x = Object.assign({ role: presetRole || 'doctor', name: '', phone: '', email: '', username: '', password: '', specialty: '', room: '', share: 40, color: COLORS[Store.doctors(true).length % COLORS.length], workDays: [6, 0, 1, 2, 3, 4], start: Store.db.settings.open, end: Store.db.settings.close, doctorId: '', active: true }, u || {});
    const docs = Store.doctors();
    const days = [6, 0, 1, 2, 3, 4, 5];
    const m = UI.modal({
      title: editing ? 'دەستکاری ' + x.name : 'هەژماری نوێ', size: 'wide', sticky: true,
      body: '<form class="form" id="uf" novalidate>' +
        (isOwnerAcct ? '<input type="hidden" name="role" value="owner">' : UI.field('ڕۆڵ', '<select class="select" name="role"' + (editing ? ' disabled' : '') + '>' + UI.opts([['doctor', 'دکتۆر'], ['secretary', 'سکرتێر'], ['admin', 'بەڕێوەبەر (ئەدمین)']], x.role) + '</select>', { req: true, hint: editing ? 'ڕۆڵ دوای دروستکردن ناگۆڕدرێت' : '' })) +
        UI.field('ناوی تەواو', '<input class="input" name="name" value="' + esc(x.name) + '" placeholder="' + (x.role === 'doctor' ? 'د. ناو و پاشناو' : 'ناو و پاشناو') + '">', { req: true }) +
        '<div class="field full r-secretary"><label>دکتۆرەکەی <span class="req">*</span></label><select class="select" name="doctorId">' + UI.opts(docs, x.doctorId, '— دکتۆر هەڵبژێرە —') + '</select><div class="hint">سکرتێر تەنها نۆرە، نەخۆش و پارەی ئەم دکتۆرە دەبینێت و بەڕێوەی دەبات. لە سیستەمدا وەک «س. د. …» دەردەکەوێت.</div></div>' +
        '<div class="field r-doctor"><label>پسپۆڕی <span class="req">*</span></label><input class="input" name="specialty" list="specs" value="' + esc(x.specialty || '') + '"><datalist id="specs">' + ['ددانی گشتی', 'ڕەگ چارەسەری (Endodontics)', 'ددانی جوانکاری (Cosmetic)', 'ئۆرتۆدۆنتیک (Orthodontics)', 'ئیمپلانت و نەشتەرگەری', 'ددانی منداڵان (Pedodontics)', 'پوک (Periodontics)', 'دەستکرد (Prosthodontics)'].map((s) => '<option value="' + esc(s) + '">').join('') + '</datalist></div>' +
        UI.field('مۆبایل', '<input class="input" name="phone" dir="ltr" style="text-align:right" value="' + esc(x.phone) + '" placeholder="0750 123 4567">', { req: true }) +
        UI.field('ئیمەیڵ', '<input class="input" name="email" dir="ltr" style="text-align:right" value="' + esc(x.email || '') + '" placeholder="name@bite.krd">') +
        UI.field('ناوی بەکارهێنەر', '<input class="input" name="username" dir="ltr" style="text-align:right" value="' + esc(x.username) + '" autocomplete="off" placeholder="بە ئینگلیزی، بێ بۆشایی">', { req: true }) +
        UI.field(editing ? 'وشەی نهێنی نوێ' : 'وشەی نهێنی', '<input class="input" name="password" type="text" dir="ltr" style="text-align:right" value="" autocomplete="new-password" placeholder="' + (editing ? 'بەتاڵی بهێڵە بۆ نەگۆڕین' : 'لانیکەم ٤ پیت') + '">', { req: !editing }) +
        '<div class="field r-doctor"><label>ژوور</label><select class="select" name="room">' + UI.opts(Store.db.rooms.filter((r) => r.active), x.room, '—') + '</select></div>' +
        '<div class="field r-doctor"><label>پشکی دکتۆر لە داهات (٪)</label><input class="input" name="share" type="number" min="0" max="100" value="' + esc(x.share) + '"></div>' +
        '<div class="field r-doctor"><label>کاتی دەستپێک</label><input class="input" type="time" name="start" value="' + esc(x.start || '12:00') + '"></div>' +
        '<div class="field r-doctor"><label>کاتی کۆتایی</label><input class="input" type="time" name="end" value="' + esc(x.end || '21:00') + '"></div>' +
        '<div class="field full r-doctor"><span class="lbl">ڕۆژانی کار</span><div class="chips">' + days.map((w) => '<label class="chip" style="cursor:pointer"><input type="checkbox" name="workDays" data-multi="1" value="' + w + '"' + ((x.workDays || []).includes(w) ? ' checked' : '') + ' style="accent-color:var(--navy)">' + U.DAYS[w] + '</label>').join('') + '</div></div>' +
        '<div class="field full r-doctor"><span class="lbl">ڕەنگی دکتۆر لە خشتەدا</span><div class="chips">' + COLORS.map((c) => '<label style="cursor:pointer"><input type="radio" name="color" value="' + c + '"' + (x.color === c ? ' checked' : '') + ' class="sr-only"><span class="dot-c" style="width:30px;height:30px;background:' + c + ';display:inline-block;border:3px solid ' + (x.color === c ? 'var(--mint)' : 'transparent') + '"></span></label>').join('') + '</div></div>' +
        '</form>',
      foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>' + I('check') + (editing ? 'پاشەکەوتکردن' : 'دروستکردنی هەژمار') + '</button>'
    });
    const f = m.$('#uf');
    const sync = () => {
      const role = isOwnerAcct ? 'owner' : f.role.value;
      m.$$('.r-doctor').forEach((el) => el.classList.toggle('hidden', role !== 'doctor'));
      m.$$('.r-secretary').forEach((el) => el.classList.toggle('hidden', role !== 'secretary'));
    };
    if (f.role && f.role.tagName === 'SELECT') f.role.addEventListener('change', sync);
    f.addEventListener('change', (e) => { if (e.target.name === 'color') m.$$('[name=color]').forEach((r) => { r.nextElementSibling.style.borderColor = r.checked ? 'var(--mint)' : 'transparent'; }); });
    sync();
    m.$('[data-ok]').addEventListener('click', () => {
      const role = isOwnerAcct ? 'owner' : (editing ? x.role : f.role.value);
      const rules = {
        name: UI.req('ناو پێویستە'), phone: UI.phoneRule(true),
        username: (v) => (!/^[a-z0-9._-]{3,}$/i.test(v) ? 'تەنها پیتی ئینگلیزی و ژمارە، لانیکەم ٣ پیت' : Store.db.users.some((o) => o.username.toLowerCase() === v.toLowerCase() && o.id !== (u && u.id)) ? 'ئەم ناوە پێشتر بەکارهاتووە' : null),
        password: (v) => (!editing && v.length < 4) || (editing && v && v.length < 4) ? 'وشەی نهێنی لانیکەم ٤ پیت بێت' : null
      };
      if (role === 'secretary') rules.doctorId = UI.req('دکتۆر هەڵبژێرە');
      if (role === 'doctor') rules.specialty = UI.req('پسپۆڕی بنووسە');
      if (!UI.validate(f, rules)) return;
      const d = UI.data(f);
      const rec = { name: d.name, phone: U.normPhone(d.phone), email: d.email, username: d.username.toLowerCase() };
      if (d.password) rec.password = d.password;
      if (role === 'doctor') Object.assign(rec, { specialty: d.specialty, title: d.specialty, room: d.room, share: U.clamp(Number(d.share) || 0, 0, 100), start: d.start, end: d.end, workDays: (d.workDays || []).map(Number), color: d.color || x.color });
      if (role === 'secretary') Object.assign(rec, { doctorId: d.doctorId, title: 'سکرتێری ' + Store.doctorName(d.doctorId) });
      if (role === 'admin') rec.title = 'بەڕێوەبەری کلینیک';
      if (editing) {
        const movedFrom = u.role === 'secretary' && u.doctorId !== rec.doctorId ? Store.doctorName(u.doctorId) : null;
        Object.assign(u, rec);
        Store.commit('user', 'هەژماری ' + u.name + ' نوێ کرایەوە' + (movedFrom ? ' (گوازرایەوە لە ' + movedFrom + ' بۆ ' + Store.doctorName(u.doctorId) + ')' : '') + (d.password ? ' · وشەی نهێنی گۆڕا' : ''));
        if (Store.me.id === u.id) { Store.me = u; App._layoutFor = null; }
        UI.toast('هەژمارەکە نوێ کرایەوە');
      } else {
        const nu = Object.assign({ id: U.uid(role === 'doctor' ? 'd' : role === 'secretary' ? 's' : 'u'), role, active: true, createdAt: U.today(), color: role === 'doctor' ? x.color : '#3FA987' }, rec);
        Store.db.users.push(nu);
        Store.commit('user', Store.ROLES[role] + 'ی نوێ زیاد کرا: ' + nu.name + (role === 'secretary' ? ' (سکرتێری ' + Store.doctorName(nu.doctorId) + ')' : ''));
        UI.toast('هەژمار دروست کرا — ناوی بەکارهێنەر: ' + nu.username);
      }
      m.close();
    });
  }
  async function toggleUser(u) {
    if (u.role === 'owner') return;
    if (u.active) {
      const future = u.role === 'doctor' ? Store.appts({ from: U.today(), doctorIds: [u.id], status: ['scheduled', 'confirmed'] }).length : 0;
      const ok = await UI.confirm({ title: 'ناچالاککردنی هەژمار', html: '<b>' + esc(u.name) + '</b> ناتوانێت بچێتە ژوورەوە.' + (future ? '<br><span class="down">ئاگاداری: ' + U.num(future) + ' نۆرەی داهاتووی هەیە.</span>' : '') + '<br>هەموو داتاکانی دەمێننەوە و دەتوانیت دووبارە چالاکی بکەیتەوە.', ok: 'ناچالاککردن', danger: true });
      if (!ok) return;
    }
    u.active = !u.active;
    Store.commit('user', 'هەژماری ' + u.name + (u.active ? ' چالاک کرایەوە' : ' ناچالاک کرا'));
  }
  async function deleteUser(u) {
    if (u.role === 'owner') return;
    const used = u.role === 'doctor' ? Store.db.appointments.filter((a) => a.doctorId === u.id).length + Store.db.invoices.filter((i) => i.doctorId === u.id).length : 0;
    if (used) {
      UI.confirm({ title: 'ناتوانرێت بسڕدرێتەوە', html: '<b>' + esc(u.name) + '</b> ' + U.num(used) + ' نۆرە و پسوولەی بە ناوەوەیە. بۆ پاراستنی مێژووی نەخۆشەکان و حیسابەکان، لە جیاتی سڕینەوە <b>ناچالاکی بکە</b>.', ok: 'ناچالاککردن', danger: true }).then((y) => { if (y && u.active) { u.active = false; Store.commit('user', 'هەژماری ' + u.name + ' ناچالاک کرا'); } });
      return;
    }
    if (!await UI.confirm({ title: 'سڕینەوەی هەژمار', html: 'هەژماری <b>' + esc(u.name) + '</b> بە یەکجاری دەسڕێتەوە.', ok: 'سڕینەوە', danger: true })) return;
    Store.db.users = Store.db.users.filter((x) => x.id !== u.id);
    if (u.role === 'doctor') Store.db.users.forEach((s) => { if (s.role === 'secretary' && s.doctorId === u.id) s.doctorId = ''; });
    Store.commit('user', 'هەژماری ' + u.name + ' سڕایەوە');
    UI.toast('هەژمارەکە سڕایەوە', 'warn');
  }
  function usersTab() {
    const users = Store.db.users;
    const docs = users.filter((u) => u.role === 'doctor');
    const secs = users.filter((u) => u.role === 'secretary');
    const others = users.filter((u) => u.role === 'owner' || u.role === 'admin');
    const row = (u) => '<tr' + (u.active ? '' : ' style="opacity:.55"') + '><td>' + UI.who(u.name, esc(u.role === 'secretary' ? (u.doctorId ? 'س. ' + Store.doctorName(u.doctorId) : 'نەبەستراوە بە دکتۆر') : u.title || Store.ROLES[u.role]), u.role === 'doctor' ? u.color : null, 'sm') + '</td><td class="latin ltr" style="text-align:right">' + esc(u.username) + '</td><td class="ltr nowrap" style="text-align:right">' + U.fmtPhone(u.phone) + '</td><td>' + (u.role === 'doctor' ? esc(Store.room(u.room) ? Store.room(u.room).name : '—') + ' · ' + U.pct(u.share || 0) : u.role === 'secretary' ? (u.doctorId ? UI.badge(Store.doctorName(u.doctorId), 'b-mint') : UI.badge('پێویستی بە دکتۆرە', 'b-red')) : '') + '</td><td class="small nowrap">' + (u.lastLogin ? U.fmtStamp(u.lastLogin) : '<span class="muted">هەرگیز</span>') + '</td><td>' + (u.active ? UI.badge('چالاک', 'b-green', true) : UI.badge('ناچالاک', 'b-gray', true)) + '</td><td><span class="row" style="gap:4px;justify-content:flex-end">' + (u.role !== 'owner' || Store.isOwner() ? '<button class="btn xs" data-uedit="' + u.id + '">' + I('edit', 'sm') + 'دەستکاری</button>' : '') + (u.role !== 'owner' ? '<button class="btn xs" data-utoggle="' + u.id + '">' + (u.active ? 'ناچالاککردن' : 'چالاککردن') + '</button><button class="btn xs danger" data-udel="' + u.id + '" aria-label="سڕینەوە">' + I('trash', 'sm') + '</button>' : '') + '</span></td></tr>';
    const table = (title, list, role, icon) => '<section class="card flush"><div class="card-head" style="padding:16px 22px 0"><span class="card-title">' + I(icon) + title + ' <span class="badge">' + U.num(list.length) + '</span></span>' + (role ? '<button class="btn sm primary" data-unew="' + role + '">' + I('plus', 'sm') + 'زیادکردن</button>' : '') + '</div><div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>ناو</th><th>ناوی بەکارهێنەر</th><th>مۆبایل</th><th>' + (role === 'doctor' ? 'ژوور · پشک' : role === 'secretary' ? 'دکتۆرەکەی' : '') + '</th><th>دوایین چوونەژوورەوە</th><th>بار</th><th></th></tr></thead><tbody>' + list.map(row).join('') + '</tbody></table></div></section>';
    const orphan = secs.filter((s) => !s.doctorId || !Store.user(s.doctorId));
    const unassigned = docs.filter((d) => d.active && !Store.secretaryOf(d.id).length);
    return (orphan.length ? '<div class="alert red">' + I('alert') + '<span>' + U.num(orphan.length) + ' سکرتێر بە هیچ دکتۆرێکەوە نەبەستراوە و هیچ داتایەک نابینێت.</span></div>' : '') +
      (unassigned.length ? '<div class="alert amber">' + I('info') + '<span>ئەم دکتۆرانە سکرتێریان نییە: ' + esc(unassigned.map((d) => d.name).join('، ')) + '</span></div>' : '') +
      '<div class="alert blue">' + I('shield') + '<span>هەر هەژمارێک بە ناوی بەکارهێنەر و وشەی نهێنی خۆی دەچێتە ژوورەوە. دکتۆر تەنها داتای خۆی دەبینێت، سکرتێر تەنها داتای دکتۆرەکەی. خاوەن هەموو شتێک دەبینێت.</span></div>' +
      table('دکتۆرەکان', docs, 'doctor', 'stethoscope') + table('سکرتێرەکان', secs, 'secretary', 'users') + table('خاوەن و بەڕێوەبەران', others, 'admin', 'shield');
  }

  /* ---------- services ---------- */
  function serviceForm(s) {
    const cats = Array.from(new Set(Store.db.services.map((x) => x.category)));
    const x = s || { name: '', category: cats[0], duration: 30, price: 0, perTooth: false, active: true };
    const m = UI.modal({
      title: s ? 'دەستکاری خزمەتگوزاری' : 'خزمەتگوزاری نوێ',
      body: '<form class="form" id="sf" novalidate>' + UI.field('ناو', '<input class="input" name="name" value="' + esc(x.name) + '">', { req: true, full: true }) + UI.field('پۆل', '<input class="input" name="category" list="scats" value="' + esc(x.category) + '"><datalist id="scats">' + cats.map((c) => '<option value="' + esc(c) + '">').join('') + '</datalist>', { req: true }) + UI.field('ماوە (خولەک)', '<select class="select" name="duration">' + UI.opts([15, 30, 45, 60, 90, 120, 150, 180].map((n) => [n, U.num(n)]), x.duration) + '</select>') + UI.field('نرخ (د.ع)', '<input class="input" name="price" inputmode="numeric" value="' + x.price + '">', { req: true }) + '<div class="field" style="justify-content:flex-end"><label class="check"><input type="checkbox" name="perTooth"' + (x.perTooth ? ' checked' : '') + '>بۆ ددانێکی دیاریکراوە</label></div>' + (s ? '<div class="field full alert blue">' + I('info') + '<span>گۆڕینی نرخ تەنها کاریگەری لەسەر پسوولە نوێیەکان دەبێت.</span></div>' : '') + '</form>',
      foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>پاشەکەوتکردن</button>'
    });
    const f = m.$('#sf');
    m.$('[data-ok]').addEventListener('click', () => {
      if (!UI.validate(f, { name: UI.req(), category: UI.req(), price: UI.numRule(0) })) return;
      const d = UI.data(f);
      const rec = { name: d.name, category: d.category, duration: Number(d.duration), price: UI.parseNum(d.price), perTooth: !!d.perTooth };
      if (s) { const old = s.price; Object.assign(s, rec); Store.commit('service', 'خزمەتگوزاری «' + s.name + '» نوێ کرایەوە' + (old !== s.price ? ' — نرخ: ' + U.money(old) + ' ← ' + U.money(s.price) : '')); } else { Store.db.services.push(Object.assign({ id: U.uid('sv'), active: true }, rec)); Store.commit('service', 'خزمەتگوزاری نوێ: ' + rec.name + ' — ' + U.money(rec.price)); }
      m.close();
    });
  }
  function servicesTab() {
    const by = U.groupBy(Store.db.services, (s) => s.category);
    return '<div class="row between wrap"><p class="muted" style="margin:0">لیستی نرخەکان لە کاتی دروستکردنی پسوولە و نۆرەدا بەکاردێت.</p><button class="btn accent" data-snew>' + I('plus') + 'خزمەتگوزاری نوێ</button></div>' +
      Object.entries(by).map(([cat, list]) => '<section class="card flush"><div class="card-head" style="padding:14px 22px 0"><span class="card-title" style="font-size:15px">' + esc(cat) + '</span></div><div class="table-wrap" style="margin-top:10px"><table class="t"><thead><tr><th>خزمەتگوزاری</th><th>ماوە</th><th>جۆر</th><th class="num">نرخ</th><th>بەکارهێنان (٣٠ ڕۆژ)</th><th>چالاک</th><th></th></tr></thead><tbody>' + list.map((s) => '<tr' + (s.active ? '' : ' style="opacity:.55"') + '><td><b style="font-weight:600">' + esc(s.name) + '</b></td><td class="nowrap">' + U.num(s.duration) + ' خولەک</td><td>' + (s.perTooth ? UI.badge('بۆ ددان', 'b-blue') : '') + '</td><td class="num"><b>' + U.money(s.price) + '</b></td><td>' + U.num(Store.db.appointments.filter((a) => a.serviceId === s.id && a.status === 'completed' && a.date >= U.addDays(U.today(), -30)).length) + '</td><td><label class="switch"><input type="checkbox" data-stoggle="' + s.id + '"' + (s.active ? ' checked' : '') + ' aria-label="چالاک"><span></span></label></td><td><button class="btn xs" data-sedit="' + s.id + '">' + I('edit', 'sm') + 'دەستکاری</button></td></tr>').join('') + '</tbody></table></div></section>').join('');
  }

  /* ---------- rooms ---------- */
  function roomsTab() {
    return '<div class="row between"><p class="muted" style="margin:0">ژوورەکان لە خشتەی نۆرە و داشبۆردی خاوەندا بەکاردێن.</p><button class="btn accent" data-rnew>' + I('plus') + 'ژووری نوێ</button></div><div class="grid g-auto">' + Store.db.rooms.map((r) => {
      const docs = Store.doctors().filter((d) => d.room === r.id);
      return '<div class="card" style="' + (r.active ? '' : 'opacity:.55') + '"><div class="row between"><b style="font-size:16px">' + esc(r.name) + '</b><label class="switch"><input type="checkbox" data-rtoggle="' + r.id + '"' + (r.active ? ' checked' : '') + ' aria-label="چالاک"><span></span></label></div><div class="small muted">' + esc(r.note || '') + '</div><div class="small">' + (docs.length ? esc(docs.map((d) => d.name).join('، ')) : '<span class="muted">هیچ دکتۆرێک</span>') + '</div><button class="btn xs" data-redit="' + r.id + '" style="align-self:flex-start;margin-top:8px">' + I('edit', 'sm') + 'گۆڕینی ناو</button></div>';
    }).join('') + '</div>';
  }
  function roomForm(r) {
    const m = UI.modal({ title: r ? 'دەستکاری ژوور' : 'ژووری نوێ', size: 'narrow', body: '<form class="form" id="rf" style="grid-template-columns:minmax(0,1fr)">' + UI.field('ناو', '<input class="input" name="name" value="' + esc(r ? r.name : 'ژووری ' + U.d(Store.db.rooms.length + 1)) + '">', { req: true }) + UI.field('تێبینی', '<input class="input" name="note" value="' + esc(r ? r.note || '' : '') + '" placeholder="نموونە: ژووری نەشتەرگەری">') + '</form>', foot: '<button class="btn" data-close>پاشگەزبوونەوە</button><button class="btn primary" data-ok>پاشەکەوتکردن</button>' });
    m.$('[data-ok]').addEventListener('click', () => {
      const f = m.$('#rf');
      if (!UI.validate(f, { name: UI.req() })) return;
      const d = UI.data(f);
      if (r) { Object.assign(r, d); Store.commit('settings', 'ژوور نوێ کرایەوە: ' + d.name); } else { Store.db.rooms.push({ id: U.uid('r'), name: d.name, note: d.note, active: true }); Store.commit('settings', 'ژووری نوێ: ' + d.name); }
      m.close();
    });
  }

  /* ---------- roles ---------- */
  function rolesTab() {
    const P = Store.db.settings.permissions;
    const roles = [['owner', 'خاوەن'], ['admin', 'بەڕێوەبەر'], ['doctor', 'دکتۆر'], ['secretary', 'سکرتێر']];
    return '<div class="alert blue">' + I('info') + '<span><b>چۆنیەتی کارکردن:</b> دکتۆر هەمیشە تەنها نەخۆش و نۆرە و داهاتی خۆی دەبینێت. سکرتێر تەنها داتای ئەو دکتۆرەی پێی بەستراوە. ئەگەر «بینینی داتای هەموو دکتۆرەکان» بۆ ڕۆڵێک چالاک بکەیت، ئەو سنوورە لادەچێت. گۆڕانکارییەکان یەکسەر کاردەکەن.</span></div>' +
      '<section class="card flush"><div class="table-wrap"><table class="t perm"><thead><tr><th>دەسەڵات</th>' + roles.map((r) => '<th>' + r[1] + '</th>').join('') + '</tr></thead><tbody>' + Seed.PERMS.map(([k, label]) => '<tr><td>' + esc(label) + '</td>' + roles.map(([r]) => r === 'owner' ? '<td><span class="badge b-green">' + I('check', 'sm') + '</span></td>' : '<td><label class="switch"><input type="checkbox" data-perm="' + r + '|' + k + '"' + (P[r] && P[r][k] ? ' checked' : '') + ' aria-label="' + esc(label + ' — ' + r) + '"><span></span></label></td>').join('') + '</tr>').join('') + '</tbody></table></div></section>' +
      '<div class="row"><button class="btn" data-perm-reset>' + I('refresh') + 'گەڕانەوە بۆ ڕێکخستنی بنەڕەت</button></div>';
  }

  /* ---------- settings ---------- */
  function settingsTab() {
    const s = Store.db.settings;
    const days = [6, 0, 1, 2, 3, 4, 5];
    const sample = Store.db.appointments.find((a) => a.date >= U.today() && Store.isActive(a)) || Store.db.appointments[0];
    return '<form id="setf" class="stack" novalidate>' +
      '<section class="card"><div class="card-head"><span class="card-title">' + I('home') + 'زانیاری کلینیک</span></div><div class="form">' +
      UI.field('ناوی کلینیک', '<input class="input" name="clinicName" value="' + esc(s.clinicName) + '">', { req: true }) + UI.field('ژمارەی تەلەفۆن', '<input class="input" name="phone" dir="ltr" style="text-align:right" value="' + esc(s.phone) + '">') +
      UI.field('ناونیشان', '<input class="input" name="address" value="' + esc(s.address) + '">', { full: true }) +
      UI.field('ئیمەیڵ', '<input class="input" name="email" dir="ltr" style="text-align:right" value="' + esc(s.email) + '">') + UI.field('وێبسایت', '<input class="input" name="website" dir="ltr" style="text-align:right" value="' + esc(s.website || '') + '">') +
      '<div class="field full"><span class="lbl">لۆگۆی کلینیک</span><div class="row wrap">' + '<span style="background:var(--navy);border-radius:12px;display:inline-flex">' + UI.logoHtml(56) + '</span>' + '<label class="btn sm" style="cursor:pointer">' + I('upload', 'sm') + 'بارکردنی لۆگۆ<input type="file" accept="image/*" data-logo hidden></label>' + (s.logo ? '<button type="button" class="btn sm danger" data-logo-del>' + I('trash', 'sm') + 'لابردن</button>' : '') + '<span class="hint">لە مێنیو، پەڕەی چوونەژوورەوە و هەموو چاپەکاندا دەردەکەوێت. PNG ی بێ باکگراوند باشترە.</span></div></div>' +
      '</div></section>' +
      '<section class="card"><div class="card-head"><span class="card-title">' + I('clock') + 'کاتی کار</span></div><div class="form">' +
      UI.field('کردنەوە', '<input class="input" type="time" name="open" value="' + esc(s.open) + '" step="1800">') + UI.field('داخستن', '<input class="input" type="time" name="close" value="' + esc(s.close) + '" step="1800">') +
      '<div class="field full"><span class="lbl">ڕۆژانی پشوو</span><div class="chips">' + days.map((w) => '<label class="chip" style="cursor:pointer"><input type="checkbox" name="closedDays" data-multi="1" value="' + w + '"' + (s.closedDays.includes(w) ? ' checked' : '') + ' style="accent-color:var(--navy)">' + U.DAYS[w] + '</label>').join('') + '</div></div></div></section>' +
      '<section class="card"><div class="card-head"><span class="card-title">' + I('whatsapp') + 'نامەی بیرخستنەوە</span></div><div class="form">' +
      UI.field('دەقی نامە', '<textarea class="textarea" name="reminderTemplate" style="min-height:150px">' + esc(s.reminderTemplate) + '</textarea>', { full: true, hint: 'ئەم کلیلانە خۆکارانە دەگۆڕدرێن: {name} ناوی نەخۆش · {date} بەروار · {time} کات · {doctor} ناوی دکتۆر' }) +
      '<div class="field full"><span class="lbl">پێشبینین</span><div class="alert green" style="white-space:pre-wrap" id="tpl-prev">' + esc(sample ? Store.reminderText(sample) : '') + '</div></div></div></section>' +
      '<section class="card"><div class="card-head"><span class="card-title">' + I('sliders') + 'تایبەتمەندییەکان</span></div><div class="list">' +
      [['autoReminders', 'بیرخستنەوەی نۆرە', 'لیستی بیرخستنەوەی سبەی بۆ سکرتێرەکان پیشان بدە'], ['onlineBooking', 'نۆرەگرتنی ئۆنلاین', 'وەرگرتنی داواکاری لە وێبسایت و ئینستاگرامەوە'], ['approveOnline', 'پەسەندکردنی دەستی', 'هەموو داواکارییەکی ئۆنلاین پێش تۆمارکردن پەسەند بکرێت'], ['reviewRequest', 'داواکردنی هەڵسەنگاندن', 'دوای چارەسەر، لینکی هەڵسەنگاندنی گووگڵ بنێرە'], ['weeklyReport', 'ڕاپۆرتی هەفتانە', 'هەموو شەممەیەک کورتەیەک بۆ خاوەن ئامادە بکە']].map(([k, t, d]) => '<div class="li"><span class="grow"><span class="t">' + t + '</span><span class="s">' + d + '</span></span><label class="switch"><input type="checkbox" name="' + k + '"' + (s[k] ? ' checked' : '') + '><span></span></label></div>').join('') + '</div></section>' +
      '<section class="card"><div class="card-head"><span class="card-title">' + I('receipt') + 'پسوولە و پیشاندان</span></div><div class="form">' +
      UI.field('تێبینی خوارەوەی پسوولە', '<input class="input" name="invoiceNote" value="' + esc(s.invoiceNote || '') + '">', { full: true }) +
      UI.field('شێوەی ژمارەکان', '<select class="select" name="digits">' + UI.opts([['ar', 'کوردی/عەرەبی (١٢٣)'], ['en', 'ئینگلیزی (123)']], s.digits) + '</select>') + '</div></section>' +
      '<div class="row" style="position:sticky;bottom:12px;z-index:5"><button type="button" class="btn primary lg" data-save-settings>' + I('check') + 'پاشەکەوتکردنی ڕێکخستنەکان</button></div></form>';
  }

  /* ---------- audit ---------- */
  function auditTab() {
    let list = Store.db.audit;
    if (auditState.user) list = list.filter((l) => l.userId === auditState.user);
    if (auditState.type) list = list.filter((l) => l.action === auditState.type);
    if (auditState.q) list = list.filter((l) => U.search(l.details, auditState.q));
    const size = 30, pages = Math.max(1, Math.ceil(list.length / size));
    auditState.page = U.clamp(auditState.page, 1, pages);
    const rows = list.slice((auditState.page - 1) * size, auditState.page * size);
    return '<div class="card flush"><div class="row wrap" style="padding:14px 18px;gap:10px;border-bottom:1px solid var(--border)"><input class="input" data-aq style="max-width:240px" placeholder="گەڕان لە تۆمار" value="' + esc(auditState.q) + '"><select class="select" data-au style="max-width:220px">' + UI.opts(Store.db.users.map((u) => [u.id, u.name]), auditState.user, 'هەموو بەکارهێنەران') + '</select><select class="select" data-at style="max-width:180px">' + UI.opts(Object.entries(LOG_TYPES), auditState.type, 'هەموو جۆرەکان') + '</select><span class="small muted" style="margin-inline-start:auto">' + U.num(list.length) + ' تۆمار</span></div>' +
      (rows.length ? '<div class="table-wrap"><table class="t"><thead><tr><th>کات</th><th>بەکارهێنەر</th><th>جۆر</th><th>وردەکاری</th></tr></thead><tbody>' + rows.map((l) => { const u = Store.user(l.userId); return '<tr><td class="nowrap small">' + U.fmtStamp(l.at) + '</td><td class="nowrap">' + (u ? UI.who(u.name, esc(Store.ROLES[u.role]), u.role === 'doctor' ? u.color : null, 'sm') : '<span class="muted">سیستەم</span>') + '</td><td>' + UI.badge(LOG_TYPES[l.action] || l.action, '') + '</td><td>' + esc(l.details) + '</td></tr>'; }).join('') + '</tbody></table></div>' + UI.pager(list.length, auditState.page, size) : UI.empty('هیچ تۆمارێک نییە', 'history')) + '</div>';
  }

  /* ---------- data ---------- */
  function dataTab() {
    let size = 0;
    try { size = (localStorage.getItem('bite_crm_db_v1') || '').length * 2; } catch (e) { /* ignore */ }
    const c = Store.db;
    return '<div class="grid g-4">' + UI.kpi('نەخۆش', U.num(c.patients.length), '', 'users') + UI.kpi('نۆرە', U.num(c.appointments.length), '', 'calendar') + UI.kpi('پسوولە', U.num(c.invoices.length), '', 'receipt') + UI.kpi('قەبارەی داتا', U.d((size / 1024 / 1024).toFixed(2)) + ' <small>MB</small>', 'لە ~٥MB ی وێبگەڕ', 'box') + '</div>' +
      '<div class="alert amber">' + I('info') + '<span><b>ئەمە وەشانی تاقیکردنەوەیە:</b> هەموو داتاکان لەناو ئەم وێبگەڕەدا هەڵدەگیرێن (localStorage). هەر کەسێک لە ئامێرێکی ترەوە بیکاتەوە داتای نموونەیی خۆی دەبینێت. لە وەشانی ڕاستەقینەدا داتاکان لە سێرڤەرێکی پارێزراودا دەبن و هەمووان هاوبەشی دەکەن.</span></div>' +
      '<div class="grid g-3">' +
      '<section class="card"><div class="card-title">' + I('download') + 'باکئەپ</div><p class="muted small">هەموو داتاکان وەک یەک فایلی JSON دابەزێنە.</p><button class="btn primary" data-backup>' + I('download') + 'دابەزاندنی باکئەپ</button></section>' +
      (Store.isOwner() ? '<section class="card"><div class="card-title">' + I('upload') + 'گەڕاندنەوە</div><p class="muted small">فایلی باکئەپ بار بکە. داتای ئێستا جێگۆڕکێ دەکرێت.</p><label class="btn" style="cursor:pointer">' + I('upload') + 'بارکردنی باکئەپ<input type="file" accept="application/json,.json" data-restore hidden></label></section>' +
        '<section class="card"><div class="card-title">' + I('refresh') + 'داتای نموونەیی</div><p class="muted small">هەموو داتاکان دەسڕێنەوە و داتای نموونەیی نوێ دروست دەکرێت (بۆ نمایشکردن).</p><button class="btn danger" data-reset>' + I('refresh') + 'دەستپێکردنەوە</button></section>' : '') + '</div>';
  }

  Pages.admin = {
    title: 'بەڕێوەبردن',
    render(r) {
      const tabs = tabsFor();
      const tab = tabs.find((t) => t[0] === r.params.tab) ? r.params.tab : tabs[0][0];
      const body = { users: usersTab, services: servicesTab, rooms: roomsTab, roles: rolesTab, settings: settingsTab, audit: auditTab, data: dataTab }[tab]();
      return '<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">بەڕێوەبردن</span><h1 class="page-title">کۆنترۆڵی سیستەم</h1><span class="page-sub">زیادکردن و لابردنی دکتۆر و سکرتێر، نرخەکان، دەسەڵاتەکان و ڕێکخستنی کلینیک</span></div></div>' +
        '<div class="tabs">' + tabs.map((t) => '<button class="tab ' + (t[0] === tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + I(t[2], 'sm') + t[1] + '</button>').join('') + '</div>' + body;
    },
    mount(root, r) {
      root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => App.setParams({ tab: b.dataset.tab, edit: null })));
      const findU = (id) => Store.db.users.find((u) => u.id === id);
      root.addEventListener('click', async (e) => {
        const t = e.target;
        const un = t.closest('[data-unew]'); if (un) userForm(null, un.dataset.unew);
        const ue = t.closest('[data-uedit]'); if (ue) userForm(findU(ue.dataset.uedit));
        const ut = t.closest('[data-utoggle]'); if (ut) toggleUser(findU(ut.dataset.utoggle));
        const ud = t.closest('[data-udel]'); if (ud) deleteUser(findU(ud.dataset.udel));
        if (t.closest('[data-snew]')) serviceForm();
        const se = t.closest('[data-sedit]'); if (se) serviceForm(Store.service(se.dataset.sedit));
        if (t.closest('[data-rnew]')) roomForm();
        const re = t.closest('[data-redit]'); if (re) roomForm(Store.room(re.dataset.redit));
        if (t.closest('[data-perm-reset]') && await UI.confirm({ title: 'گەڕانەوە بۆ بنەڕەت', text: 'هەموو دەسەڵاتەکان دەگەڕێنەوە بۆ ڕێکخستنی بنەڕەت.', ok: 'گەڕانەوە' })) { Store.db.settings.permissions = JSON.parse(JSON.stringify(Seed.ROLE_DEFAULTS)); Store.commit('settings', 'دەسەڵاتەکان گەڕێنرانەوە بۆ بنەڕەت'); }
        const pg = t.closest('[data-page]'); if (pg && !pg.disabled) { auditState.page = Number(pg.dataset.page); App.render(); }
        if (t.closest('[data-save-settings]')) {
          const f = root.querySelector('#setf');
          if (!UI.validate(f, { clinicName: UI.req(), close: (v) => (v <= f.open.value ? 'دەبێت دوای کاتی کردنەوە بێت' : null) })) return;
          const d = UI.data(f);
          Object.assign(Store.db.settings, { clinicName: d.clinicName, phone: U.normPhone(d.phone), address: d.address, email: d.email, website: d.website, open: d.open, close: d.close, closedDays: (d.closedDays || []).map(Number), reminderTemplate: d.reminderTemplate, autoReminders: d.autoReminders, onlineBooking: d.onlineBooking, approveOnline: d.approveOnline, reviewRequest: d.reviewRequest, weeklyReport: d.weeklyReport, invoiceNote: d.invoiceNote, digits: d.digits });
          U.digits = d.digits;
          App._layoutFor = null;
          Store.commit('settings', 'ڕێکخستنەکانی کلینیک نوێ کرانەوە');
          UI.toast('ڕێکخستنەکان پاشەکەوت کران');
        }
        if (t.closest('[data-logo-del]')) { Store.db.settings.logo = ''; App._layoutFor = null; Store.commit('settings', 'لۆگۆ لابرا'); }
        if (t.closest('[data-backup]')) {
          U.download('bite-crm-backup-' + U.today() + '.json', JSON.stringify(Store.db), 'application/json');
          Store.log('export', 'باکئەپی تەواوی داتاکانی دابەزاند'); Store.save();
          UI.toast('باکئەپ دابەزی');
        }
        if (t.closest('[data-reset]') && await UI.confirm({ title: 'دەستپێکردنەوەی داتا', html: 'هەموو داتاکان (نەخۆش، نۆرە، پسوولە، گۆڕانکارییەکانت) دەسڕێنەوە و داتای نموونەیی نوێ دادەنرێت.<br><b>ئەم کارە ناگەڕێتەوە.</b>', ok: 'بەڵێ، دەستپێکردنەوە', danger: true })) {
          const meId = Store.me.id;
          Store.reset();
          Store.me = Store.user(meId) || Store.user('u_owner');
          App._layoutFor = null;
          UI.toast('داتای نموونەیی نوێ دانرا');
          App.go('#/dashboard');
        }
      });
      root.addEventListener('change', async (e) => {
        const t = e.target;
        if (t.matches('[data-perm]')) {
          const [role, k] = t.dataset.perm.split('|');
          Store.db.settings.permissions[role][k] = t.checked;
          Store.commit('settings', 'دەسەڵاتی «' + Seed.PERMS.find((p) => p[0] === k)[1] + '» بۆ ' + Store.ROLES[role] + (t.checked ? ' چالاک کرا' : ' لابرا'), { silent: true });
          UI.toast('دەسەڵاتەکە نوێ کرایەوە');
        }
        if (t.matches('[data-stoggle]')) { const s = Store.service(t.dataset.stoggle); s.active = t.checked; Store.commit('service', 'خزمەتگوزاری «' + s.name + '» ' + (s.active ? 'چالاک کرا' : 'ناچالاک کرا')); }
        if (t.matches('[data-rtoggle]')) { const rm = Store.room(t.dataset.rtoggle); rm.active = t.checked; Store.commit('settings', rm.name + (rm.active ? ' چالاک کرا' : ' ناچالاک کرا')); }
        if (t.matches('[data-logo]') && t.files[0]) {
          try {
            const raw = await UI.readFile(t.files[0], 3000);
            Store.db.settings.logo = t.files[0].type === 'image/svg+xml' || raw.length < 250000 ? raw : await UI.shrinkImage(raw, 480, 0.92, 'image/png');
            App._layoutFor = null;
            Store.commit('settings', 'لۆگۆی نوێ بار کرا');
            UI.toast('لۆگۆکە دانرا');
          } catch (err) { UI.toast(err.message, 'err'); }
        }
        if (t.matches('[data-restore]') && t.files[0]) {
          const text = await t.files[0].text();
          let data;
          try { data = JSON.parse(text); } catch (err) { UI.toast('فایلەکە JSON ی دروست نییە', 'err'); return; }
          if (!data || !Array.isArray(data.users) || !Array.isArray(data.patients) || !data.settings) { UI.toast('ئەم فایلە باکئەپی Bite CRM نییە', 'err'); return; }
          if (!await UI.confirm({ title: 'گەڕاندنەوەی باکئەپ', html: 'داتای ئێستا جێگۆڕکێ دەکرێت بە باکئەپەکە (' + U.num(data.patients.length) + ' نەخۆش، ' + U.num(data.appointments.length) + ' نۆرە).', ok: 'گەڕاندنەوە', danger: true })) return;
          Store.db = data;
          Store.migrate();
          Store.reindex();
          Store.me = Store.user(Store.me.id) || Store.db.users.find((u) => u.role === 'owner');
          Store.commit('settings', 'داتا لە باکئەپەوە گەڕێنرایەوە');
          App._layoutFor = null;
          UI.toast('باکئەپ گەڕێنرایەوە');
        }
      });
      const aq = root.querySelector('[data-aq]');
      if (aq) aq.addEventListener('input', U.debounce(() => { auditState.q = aq.value; auditState.page = 1; App.render(); const n = document.querySelector('[data-aq]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250));
      const au = root.querySelector('[data-au]'); if (au) au.addEventListener('change', () => { auditState.user = au.value; auditState.page = 1; App.render(); });
      const at = root.querySelector('[data-at]'); if (at) at.addEventListener('change', () => { auditState.type = at.value; auditState.page = 1; App.render(); });
      const tpl = root.querySelector('[name=reminderTemplate]');
      if (tpl) tpl.addEventListener('input', () => {
        const sample = Store.db.appointments.find((a) => a.date >= U.today() && Store.isActive(a));
        if (!sample) return;
        const old = Store.db.settings.reminderTemplate;
        Store.db.settings.reminderTemplate = tpl.value;
        root.querySelector('#tpl-prev').textContent = Store.reminderText(sample);
        Store.db.settings.reminderTemplate = old;
      });
      if (r.params.edit) { const u = findU(r.params.edit); if (u) setTimeout(() => userForm(u), 30); history.replaceState(null, '', location.hash.replace(/[?&]edit=[^&]*/, '')); }
    }
  };
})();
