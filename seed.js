/* Demo data generator — deterministic, built around today's date */
(function () {
  const PERMS = [
    ['view_all', 'بینینی داتای هەموو دکتۆرەکان'],
    ['view_finance', 'بینینی داهات و قازانجی کلینیک'],
    ['view_reports', 'بینینی ڕاپۆرتەکان'],
    ['create_appointments', 'گرتنی نۆرە'],
    ['edit_appointments', 'گۆڕین و هەڵوەشاندنەوەی نۆرە'],
    ['manage_patients', 'تۆمارکردن و دەستکاری نەخۆش'],
    ['view_medical', 'بینینی پەڕگەی پزیشکی'],
    ['edit_medical', 'نووسینی تێبینی پزیشکی و نەخشەی ددان'],
    ['billing', 'پسوولە و وەرگرتنی پارە'],
    ['discounts', 'داشکاندن لە پسوولە'],
    ['manage_expenses', 'تۆمارکردنی خەرجی'],
    ['manage_inventory', 'بەڕێوەبردنی کۆگا'],
    ['manage_lab', 'داواکاری تاقیگە'],
    ['manage_users', 'زیادکردن و سڕینەوەی دکتۆر و کارمەند'],
    ['manage_services', 'گۆڕینی خزمەتگوزاری و نرخ'],
    ['manage_settings', 'ڕێکخستنەکانی کلینیک'],
    ['view_audit', 'بینینی تۆماری گۆڕانکاری'],
    ['export_data', 'هەناردەکردن و باکئەپ']
  ];
  const ROLE_DEFAULTS = {
    admin: { view_all: true, view_finance: false, view_reports: true, create_appointments: true, edit_appointments: true, manage_patients: true, view_medical: false, edit_medical: false, billing: true, discounts: true, manage_expenses: true, manage_inventory: true, manage_lab: true, manage_users: true, manage_services: true, manage_settings: false, view_audit: true, export_data: false },
    doctor: { view_all: false, view_finance: false, view_reports: true, create_appointments: true, edit_appointments: true, manage_patients: true, view_medical: true, edit_medical: true, billing: false, discounts: false, manage_expenses: false, manage_inventory: false, manage_lab: true, manage_users: false, manage_services: false, manage_settings: false, view_audit: false, export_data: false },
    secretary: { view_all: false, view_finance: false, view_reports: false, create_appointments: true, edit_appointments: true, manage_patients: true, view_medical: false, edit_medical: false, billing: true, discounts: false, manage_expenses: false, manage_inventory: true, manage_lab: true, manage_users: false, manage_services: false, manage_settings: false, view_audit: false, export_data: false }
  };

  const SERVICES = [
    ['sv_consult', 'پشکنین و ڕاوێژ', 'گشتی', 30, 25000, false],
    ['sv_pano', 'تیشکی پانۆراما', 'تیشک', 15, 30000, false],
    ['sv_pa', 'تیشکی ددان (PA)', 'تیشک', 15, 10000, true],
    ['sv_clean', 'پاککردنەوە و پۆلیش', 'پاراستن', 45, 75000, false],
    ['sv_fill', 'پڕکردنەوەی کۆمپۆزیت', 'چارەسەری گشتی', 45, 150000, true],
    ['sv_kidfill', 'پڕکردنەوەی منداڵان', 'منداڵان', 30, 75000, true],
    ['sv_rct', 'ڕەگ چارەسەری', 'ڕەگ چارەسەری', 90, 450000, true],
    ['sv_rerct', 'ڕەگ چارەسەری دووبارە', 'ڕەگ چارەسەری', 90, 550000, true],
    ['sv_post', 'پۆست و کۆر', 'ڕەگ چارەسەری', 45, 150000, true],
    ['sv_ext', 'هەڵکێشانی ددان', 'نەشتەرگەری', 30, 75000, true],
    ['sv_wisdom', 'هەڵکێشانی ددانی عەقڵ', 'نەشتەرگەری', 60, 250000, true],
    ['sv_crown', 'کراونی زێرکۆنیا', 'دەستکرد', 60, 600000, true],
    ['sv_vdirect', 'ڤینیەری ڕاستەوخۆ (کۆمپۆزیت)', 'جوانکاری', 60, 300000, true],
    ['sv_emax', 'ڤینیەری E-max', 'جوانکاری', 60, 700000, true],
    ['sv_smile', 'دیزاینی پێکەنین (DSD)', 'جوانکاری', 60, 150000, false],
    ['sv_white', 'سپیکردنەوەی ددان', 'جوانکاری', 60, 350000, false],
    ['sv_implant', 'دانانی ئیمپلانت', 'ئیمپلانت', 120, 1600000, true],
    ['sv_graft', 'بۆن گرافت', 'ئیمپلانت', 60, 600000, true],
    ['sv_braces', 'دانانی تێل (سیرامیک)', 'ئۆرتۆدۆنتیک', 90, 1800000, false],
    ['sv_adjust', 'ڕێکخستنی تێل', 'ئۆرتۆدۆنتیک', 30, 50000, false],
    ['sv_aligner', 'ئەلاینەری ڕوون (پلانی تەواو)', 'ئۆرتۆدۆنتیک', 45, 3500000, false],
    ['sv_retainer', 'ڕیتەینەر', 'ئۆرتۆدۆنتیک', 30, 150000, false],
    ['sv_scaling', 'پاککردنەوەی قووڵی پوک', 'پوک', 60, 200000, false],
    ['sv_followup', 'سەردانی بەدواداچوون', 'گشتی', 15, 0, false]
  ];

  const DOCTORS = [
    { id: 'd1', name: 'د. ئاراس کەریم', username: 'aras', spec: 'ڕەگ چارەسەری (Endodontics)', room: 'r1', share: 40, color: '#2F5DA8', mix: [['sv_rct', 30], ['sv_rerct', 8], ['sv_post', 6], ['sv_consult', 14], ['sv_fill', 18], ['sv_pa', 8], ['sv_crown', 10], ['sv_followup', 6]] },
    { id: 'd2', name: 'د. شیلان عەزیز', username: 'shilan', spec: 'ددانی جوانکاری (Cosmetic)', room: 'r2', share: 45, color: '#B5556B', mix: [['sv_vdirect', 18], ['sv_emax', 12], ['sv_white', 16], ['sv_smile', 8], ['sv_consult', 14], ['sv_clean', 12], ['sv_crown', 12], ['sv_followup', 8]] },
    { id: 'd3', name: 'د. هێمن ڕەشید', username: 'hemn', spec: 'ئۆرتۆدۆنتیک (Orthodontics)', room: 'r3', share: 40, color: '#2A9D8F', mix: [['sv_adjust', 46], ['sv_braces', 8], ['sv_aligner', 6], ['sv_retainer', 6], ['sv_consult', 18], ['sv_pano', 10], ['sv_followup', 6]] },
    { id: 'd4', name: 'د. ڕێژین ئەحمەد', username: 'rezhin', spec: 'ئیمپلانت و نەشتەرگەری', room: 'r4', share: 50, color: '#C9822E', mix: [['sv_implant', 26], ['sv_graft', 8], ['sv_consult', 22], ['sv_wisdom', 16], ['sv_ext', 12], ['sv_pano', 8], ['sv_followup', 8]] },
    { id: 'd5', name: 'د. کاروان مەحمود', username: 'karwan', spec: 'ددانی گشتی و منداڵان', room: 'r5', share: 35, color: '#6B5BC9', mix: [['sv_consult', 18], ['sv_clean', 18], ['sv_fill', 22], ['sv_kidfill', 16], ['sv_ext', 10], ['sv_scaling', 8], ['sv_followup', 8]] }
  ];
  const SECRETARIES = [
    { id: 's1', name: 'شیرین ئەحمەد', username: 'shirin', doctorId: 'd1' },
    { id: 's2', name: 'ڕێبین کەریم', username: 'rebin', doctorId: 'd2' },
    { id: 's3', name: 'لاڤا حەمید', username: 'lava', doctorId: 'd3' },
    { id: 's4', name: 'دڵنیا عەلی', username: 'dlnya', doctorId: 'd4' },
    { id: 's5', name: 'ئاری جەلال', username: 'ari', doctorId: 'd5' }
  ];

  const F_NAMES = ['ڕێزان', 'نازدار', 'بەفرین', 'لانە', 'هێڤی', 'ئەڤین', 'سارا', 'ڕۆژان', 'بێریڤان', 'سۆزان', 'شادی', 'نیشتمان', 'هێرۆ', 'ئاوێزان', 'دیلان', 'ژیلا', 'گوڵاڵە', 'کانی', 'ڤیان', 'شیلان', 'سروە', 'ڕوناک', 'پەری', 'تارا', 'هانا', 'لاوین', 'نەسرین', 'خەندە', 'چنار', 'ئالا', 'بەهار', 'دڵنیا', 'زێڕین', 'سەیران', 'مەهاباد'];
  const M_NAMES = ['سامان', 'هاوڕێ', 'ئازاد', 'کاوە', 'دیار', 'ئاوات', 'زانا', 'پشتیوان', 'دانا', 'ڕەوەند', 'شەهین', 'کۆڤان', 'ئاڤان', 'بەختیار', 'ڕێبوار', 'هەڵۆ', 'سیروان', 'کارزان', 'ئارام', 'شوان', 'نەوزاد', 'ڕێکەوت', 'ئومێد', 'یاسین', 'بەهۆز', 'کامەران', 'سەرهەنگ', 'هێمن', 'ئاکۆ', 'دلێر', 'فەرهاد', 'ئارێز', 'ژیار', 'بڕوا', 'گۆران'];
  const LAST = ['ئەحمەد', 'محەمەد', 'کەریم', 'عومەر', 'عەلی', 'حەسەن', 'مستەفا', 'جەمال', 'ڕەشید', 'فاروق', 'ئیبراهیم', 'عەبدوڵا', 'سەعید', 'قادر', 'حەمە', 'تاهیر', 'جەلال', 'ئیسماعیل', 'خالید', 'نوری', 'سەلام', 'ڕەسوڵ', 'شێخانی', 'بارزانی', 'دزەیی', 'کۆیی', 'هەولێری', 'سۆرانی', 'باڵەکی', 'شەقڵاوەیی'];
  const SOURCES = [['ئینستاگرام', 36], ['ناساندن لەلایەن نەخۆشەوە', 28], ['گووگڵ / نەخشە', 17], ['وێبسایت', 8], ['فەیسبووک', 5], ['هاتنی ڕاستەوخۆ', 6]];
  const ALLERGIES = ['پەنسلین', 'لاتێکس', 'ئەسپرین', 'لیدۆکایین', 'ئایبوپرۆفین'];
  const CONDITIONS = ['شەکرە', 'پەستانی خوێنی بەرز', 'نەخۆشی دڵ', 'ڕەبۆ', 'دووگیانی', 'خوێن ڕوون (وارفارین)', 'تایرۆید'];
  const TEETH_UP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const TEETH_LO = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const TOOTH_STATUS_BY_SERVICE = { sv_rct: 'rct', sv_rerct: 'rct', sv_crown: 'crown', sv_fill: 'filled', sv_kidfill: 'filled', sv_implant: 'implant', sv_ext: 'extracted', sv_wisdom: 'extracted', sv_vdirect: 'veneer', sv_emax: 'veneer' };
  const CLIN_NOTES = {
    sv_rct: ['ئاوێتەکردنی ڕەگ تەواو بوو، ٣ کەناڵ. ئازاری نییە.', 'دانیشتنی یەکەم: پاککردنەوە و دانانی کالسیۆم هایدرۆکساید.', 'کەناڵەکان پڕکرانەوە، تیشکی دوای چارەسەر باشە.'],
    sv_implant: ['ئیمپلانتی 4.1×10mm دانرا، جێگیری سەرەتایی باشە.', 'نەشتەرگەری بێ کێشە، ٣ مانگ چاوەڕوانی بۆ لکان.'],
    sv_adjust: ['وایەری 0.016 NiTi گۆڕدرا.', 'ڕێکخستنی مانگانە، پێشکەوتن باشە.', 'چەسپی برەکێتێک دووبارە کرایەوە.'],
    sv_fill: ['پڕکردنەوەی چینی دووەم (Class II) بە کۆمپۆزیت.', 'کلۆری بچووک لابرا و پڕکرایەوە.'],
    sv_emax: ['ئامادەکردنی ڤینیەر و وەرگرتنی قاڵب.', 'ڤینیەرەکان چەسپێنران، نەخۆش ڕازییە.'],
    sv_white: ['سپیکردنەوەی ناو کلینیک، ٣ خول × ١٥ خولەک.'],
    sv_consult: ['پشکنینی گشتی، پلانی چارەسەر ڕوونکرایەوە.', 'نەخۆش ئازاری لە لای چەپی خوارەوە هەیە، تیشک داواکرا.'],
    sv_wisdom: ['هەڵکێشانی نەشتەرگەری ددانی ٣٨، ٣ دروومان.']
  };

  function build(opts) {
    opts = opts || {};
    const r = U.rng(opts.seed || 20261022);
    const T = U.today();
    const nowM = U.nowMin();
    const openM = 12 * 60, closeM = 21 * 60;
    const svc = {};
    const services = SERVICES.map((s) => {
      const o = { id: s[0], name: s[1], category: s[2], duration: s[3], price: s[4], perTooth: s[5], active: true };
      svc[o.id] = o;
      return o;
    });

    const users = [];
    users.push({ id: 'u_owner', role: 'owner', name: 'خاوەنی کلینیک', title: 'خاوەن و بەڕێوەبەری گشتی', username: 'owner', password: '1234', phone: '07505430000', email: 'owner@bite.krd', active: true, color: '#1B2B4F', createdAt: U.addDays(T, -900) });
    DOCTORS.forEach((d) => users.push({ id: d.id, role: 'doctor', name: d.name, title: d.spec, specialty: d.spec, username: d.username, password: '1234', phone: '0750' + r.int(1000000, 9999999), email: d.username + '@bite.krd', room: d.room, share: d.share, color: d.color, workDays: [6, 0, 1, 2, 3, 4], start: '12:00', end: '21:00', active: true, createdAt: U.addDays(T, -r.int(300, 900)) }));
    SECRETARIES.forEach((s) => users.push({ id: s.id, role: 'secretary', name: s.name, title: 'سکرتێری ' + DOCTORS.find((d) => d.id === s.doctorId).name, username: s.username, password: '1234', phone: '0751' + r.int(1000000, 9999999), email: s.username + '@bite.krd', doctorId: s.doctorId, active: true, color: '#3FA987', createdAt: U.addDays(T, -r.int(100, 600)) }));

    const rooms = [1, 2, 3, 4, 5].map((n) => ({ id: 'r' + n, name: 'ژووری ' + U.d(n), note: n === 4 ? 'ژووری نەشتەرگەری' : n === 3 ? 'ئۆرتۆ' : '', active: true }));

    const leaves = [
      { id: 'lv1', doctorId: 'd5', from: T, to: T, reason: 'مۆڵەتی ساڵانە' },
      { id: 'lv2', doctorId: 'd2', from: U.addDays(T, 6), to: U.addDays(T, 8), reason: 'بەشداری کۆنفرانسی ددانی جوانکاری — دوبەی' }
    ];
    const onLeave = (docId, day) => leaves.some((l) => l.doctorId === docId && day >= l.from && day <= l.to);

    // Patients
    const patients = [];
    const docWeights = [['d1', 22], ['d2', 18], ['d3', 26], ['d4', 14], ['d5', 20]];
    for (let i = 0; i < 170; i++) {
      const female = r.chance(0.54);
      const first = r.pick(female ? F_NAMES : M_NAMES);
      const name = first + ' ' + r.pick(LAST);
      const age = r.weighted([[r.int(6, 14), 10], [r.int(15, 25), 26], [r.int(26, 45), 42], [r.int(46, 72), 22]]);
      const dobY = new Date().getFullYear() - age;
      const created = U.addDays(T, -r.int(5, 700));
      const p = {
        id: 'p' + (1001 + i), fileNo: 1001 + i, name, gender: female ? 'f' : 'm',
        dob: dobY + '-' + U.pad(r.int(1, 12)) + '-' + U.pad(r.int(1, 28)),
        phone: r.pick(['0750', '0751', '0770', '0771', '0782']) + r.int(1000000, 9999999),
        address: r.pick(['هەولێر — ئەنکاوە', 'هەولێر — ٦٠ مەتری', 'هەولێر — گوڵان', 'هەولێر — ئیمپایەر', 'هەولێر — دریم سیتی', 'هەولێر — بەختیاری', 'هەولێر — شۆڕش', 'سلێمانی', 'دهۆک', 'کۆیە', 'شەقڵاوە']),
        source: r.weighted(SOURCES), doctorId: r.weighted(docWeights),
        allergies: r.chance(0.12) ? [r.pick(ALLERGIES)] : [],
        conditions: r.chance(0.18) ? [r.pick(CONDITIONS)] : [],
        tags: [], notes: '', createdAt: created, teeth: {}, plan: [], files: [], clinical: [], prescriptions: []
      };
      if (age < 15) { p.conditions = []; p.doctorId = r.chance(0.7) ? 'd5' : 'd3'; }
      if (r.chance(0.05)) p.tags.push('VIP');
      patients.push(p);
    }
    const byDoc = U.groupBy(patients, (p) => p.doctorId);

    // Appointments
    const appts = [];
    let aSeq = 1;
    for (let off = -75; off <= 21; off++) {
      const day = U.addDays(T, off);
      if (U.dow(day) === 5) continue;
      DOCTORS.forEach((d) => {
        if (onLeave(d.id, day)) return;
        let count = off < 0 ? r.int(5, 8) : off === 0 ? r.int(6, 8) : off <= 4 ? r.int(4, 7) : off <= 10 ? r.int(2, 5) : r.int(0, 3);
        let t = openM + (r.chance(0.3) ? 30 : 0);
        for (let k = 0; k < count && t < closeM - 30; k++) {
          const sid = r.weighted(d.mix);
          const s = svc[sid];
          let dur = Math.max(30, Math.ceil(s.duration / 30) * 30);
          if (t + dur > closeM) break;
          const pool = r.chance(0.82) && byDoc[d.id] && byDoc[d.id].length ? byDoc[d.id] : patients;
          const p = r.pick(pool);
          const start = U.fromMin(t), end = t + dur;
          let status;
          if (off < 0) status = r.weighted([['completed', 86], ['no_show', 5], ['cancelled', 9]]);
          else if (off === 0) {
            if (end <= nowM) status = r.chance(0.07) ? 'no_show' : 'completed';
            else if (t <= nowM) status = 'in_progress';
            else if (t - nowM <= 25) status = 'arrived';
            else status = r.chance(0.7) ? 'confirmed' : 'scheduled';
          } else status = r.chance(off <= 2 ? 0.55 : 0.25) ? 'confirmed' : 'scheduled';
          let tooth = null;
          if (s.perTooth) {
            const up = r.chance(0.5);
            tooth = r.pick(up ? TEETH_UP : TEETH_LO);
            if (sid === 'sv_wisdom') tooth = r.pick([18, 28, 38, 48]);
            if (sid === 'sv_vdirect' || sid === 'sv_emax') tooth = r.pick([11, 12, 13, 21, 22, 23]);
          }
          const notesList = CLIN_NOTES[sid];
          appts.push({
            id: 'a' + (aSeq++), patientId: p.id, doctorId: d.id, roomId: d.room, serviceId: sid, tooth,
            date: day, start, duration: dur, status,
            note: r.chance(0.08) ? r.pick(['نەخۆش داوای کاتی زووتری کردووە', 'پێویستی بە تیشکە پێش چارەسەر', 'نەخۆش ترسی لە دەرزییە', 'لەگەڵ منداڵەکەی دێت']) : '',
            clinicalNote: status === 'completed' && notesList && r.chance(0.6) ? r.pick(notesList) : '',
            source: r.weighted([['پێشوازی', 55], ['تەلەفۆن', 22], ['ئینستاگرام', 12], ['وێبسایت', 7], ['واتسئاپ', 4]]),
            reminded: off >= 0 && off <= 1 ? r.chance(0.5) : off < 0,
            createdBy: 's' + d.id.slice(1), createdAt: U.addDays(day, -r.int(1, 20)) + 'T10:00:00.000Z'
          });
          t = end + (r.chance(0.35) ? 30 : 0);
        }
      });
    }

    // Tooth chart + clinical history from completed visits
    const pById = {};
    patients.forEach((p) => { pById[p.id] = p; });
    appts.filter((a) => a.status === 'completed').sort(U.by((a) => a.date)).forEach((a) => {
      const p = pById[a.patientId];
      if (a.tooth && TOOTH_STATUS_BY_SERVICE[a.serviceId]) p.teeth[a.tooth] = { status: TOOTH_STATUS_BY_SERVICE[a.serviceId], note: svc[a.serviceId].name + ' — ' + U.fmtDateShort(a.date), date: a.date };
      if (a.clinicalNote) p.clinical.push({ id: U.uid('cn'), date: a.date, doctorId: a.doctorId, text: a.clinicalNote, apptId: a.id });
    });
    patients.forEach((p) => {
      if (r.chance(0.35)) {
        const t = r.pick(TEETH_UP.concat(TEETH_LO));
        if (!p.teeth[t]) p.teeth[t] = { status: 'needs', note: 'کلۆر — پێویستی بە چارەسەرە', date: T };
        p.plan.push({ id: U.uid('pl'), tooth: t, serviceId: r.chance(0.6) ? 'sv_fill' : 'sv_rct', price: 0, status: 'planned', doctorId: p.doctorId, createdAt: T });
      }
      if (r.chance(0.08)) { const t = r.pick([18, 28, 38, 48]); if (!p.teeth[t]) p.teeth[t] = { status: 'missing', note: 'لە دایکبوونەوە نییە', date: '' }; }
      p.plan.forEach((it) => { it.price = svc[it.serviceId].price; });
    });

    // Invoices & payments
    const invoices = [], payments = [];
    let invSeq = 2000;
    const methods = [['cash', 56], ['card', 20], ['fib', 13], ['fastpay', 6], ['zaincash', 5]];
    appts.filter((a) => a.status === 'completed').sort(U.by((a) => a.date + a.start)).forEach((a) => {
      const s = svc[a.serviceId];
      if (!s.price) return;
      const discount = r.chance(0.08) ? Math.round(s.price * r.pick([0.05, 0.1, 0.15]) / 5000) * 5000 : 0;
      const total = s.price - discount;
      const inv = { id: 'inv' + (++invSeq), no: 'INV-' + invSeq, patientId: a.patientId, doctorId: a.doctorId, apptId: a.id, date: a.date, items: [{ serviceId: s.id, name: s.name, tooth: a.tooth, qty: 1, price: s.price }], discount, total, note: '', createdBy: 's' + a.doctorId.slice(1), installments: 0 };
      const age = U.diffDays(T, a.date);
      const big = total >= 1800000 && r.chance(0.5);
      if (big) inv.installments = r.pick([3, 4, 6]);
      invoices.push(inv);
      let mode = r.weighted([['full', 95], ['part', 3], ['none', 2]]);
      if (big) mode = 'inst';
      if (age > 30 && mode !== 'full') mode = r.chance(0.1) ? 'part' : 'full';
      const pay = (amount, date) => payments.push({ id: 'pay' + payments.length, invoiceId: inv.id, patientId: inv.patientId, amount, method: r.weighted(methods), date, by: inv.createdBy });
      if (mode === 'full') pay(total, a.date);
      else if (mode === 'part') pay(Math.round(total * 0.5 / 5000) * 5000, a.date);
      else if (mode === 'inst') {
        const per = Math.round(total / inv.installments / 5000) * 5000;
        for (let k = 0; k < inv.installments; k++) {
          const dd = U.addDays(a.date, k * 30);
          if (dd > T) break;
          if (k > 0 && k === inv.installments - 1 && r.chance(0.2)) break;
          pay(k === inv.installments - 1 ? total - per * k : per, dd);
        }
      }
    });

    // Expenses (current + 3 previous months)
    const expenses = [];
    for (let m = 3; m >= 0; m--) {
      const base = U.addMonths(T, -m);
      const last = m === 0 ? T : U.endOfMonth(base);
      const lastDay = Number(last.slice(8));
      const add = (cat, amt, note, day) => expenses.push({ id: U.uid('ex'), category: cat, amount: amt, note, date: base.slice(0, 8) + U.pad(Math.min(day, lastDay)) });
      add('کرێی شوێن', 12000000, 'کرێی مانگانەی نهۆمی ٣', 1);
      add('موچەی کارمەندان', 9500000, 'موچەی ٥ سکرتێر و یاریدەدەرەکان', 28);
      add('کارەبا و مۆلیدە', r.int(18, 26) * 100000, 'وەسڵی کارەبا و مۆلیدە', 10);
      add('کەرەستەی پزیشکی', r.int(70, 110) * 100000, 'کۆمپۆزیت، دەرزی، دەستکێش، ماسک', 5);
      add('کەرەستەی پزیشکی', r.int(20, 45) * 100000, 'فایلی ڕەگ و گۆتاپێرکا', 18);
      add('تاقیگە (لاب)', r.int(45, 80) * 100000, 'کراون و ڤینیەری مانگ', 25);
      add('ڕیکلام', r.int(5, 12) * 100000, 'ڕیکلامی ئینستاگرام', 3);
      add('چاککردنەوە و خزمەتگوزاری', r.int(2, 8) * 100000, 'چاککردنەوەی کورسی و کۆمپرێسەر', 14);
      add('ئینتەرنێت و تەلەفۆن', 350000, 'ئینتەرنێت و هێڵەکان', 7);
    }
    const expensesFinal = expenses.filter((e) => e.date <= T);

    const inventory = [
      ['کۆمپۆزیتی 3M Filtek A2', 'کەرەستەی پڕکردنەوە', 'سرنج', 14, 10, 45000, 'کۆمپانیای ئاسۆ'],
      ['کۆمپۆزیتی 3M Filtek A3', 'کەرەستەی پڕکردنەوە', 'سرنج', 6, 10, 45000, 'کۆمپانیای ئاسۆ'],
      ['دەرزی بێهۆشکردن (Articaine)', 'بێهۆشکەر', 'قوتوو', 9, 6, 60000, 'دەرمانخانەی ژیان'],
      ['دەستکێشی نایترێل M', 'پاراستن', 'قوتوو', 22, 15, 9000, 'کۆمپانیای ئاسۆ'],
      ['دەستکێشی نایترێل S', 'پاراستن', 'قوتوو', 4, 10, 9000, 'کۆمپانیای ئاسۆ'],
      ['ماسکی پزیشکی', 'پاراستن', 'قوتوو', 30, 12, 5000, 'کۆمپانیای ئاسۆ'],
      ['فایلی ڕەگ ProTaper Gold', 'ڕەگ چارەسەری', 'پاکەت', 7, 5, 120000, 'Dentsply — نوێنەر'],
      ['گۆتاپێرکا', 'ڕەگ چارەسەری', 'قوتوو', 12, 6, 25000, 'Dentsply — نوێنەر'],
      ['ئیمپلانتی Straumann BLT 4.1×10', 'ئیمپلانت', 'دانە', 4, 6, 420000, 'Straumann — نوێنەر'],
      ['ئیمپلانتی Straumann BLT 3.3×12', 'ئیمپلانت', 'دانە', 7, 4, 420000, 'Straumann — نوێنەر'],
      ['بۆن گرافت Bio-Oss 0.5g', 'ئیمپلانت', 'دانە', 3, 4, 180000, 'Geistlich — نوێنەر'],
      ['جێلی سپیکردنەوە Opalescence', 'جوانکاری', 'کیت', 5, 3, 95000, 'Ultradent — نوێنەر'],
      ['برەکێتی سیرامیک', 'ئۆرتۆدۆنتیک', 'کیت', 6, 4, 140000, 'ئۆرتۆ میدیکاڵ'],
      ['وایەری NiTi 0.016', 'ئۆرتۆدۆنتیک', 'پاکەت', 18, 10, 30000, 'ئۆرتۆ میدیکاڵ'],
      ['ماددەی قاڵب (Alginate)', 'قاڵبگرتن', 'پاکەت', 8, 5, 22000, 'کۆمپانیای ئاسۆ'],
      ['سیمێنتی چەسپاندن RelyX', 'دەستکرد', 'سرنج', 5, 4, 85000, 'کۆمپانیای ئاسۆ'],
      ['بەتانی کۆمپرێس و گاز', 'گشتی', 'پاکەت', 40, 20, 3000, 'دەرمانخانەی ژیان'],
      ['ماددەی پاککەرەوەی ئامێر', 'پاکوخاوێنی', 'لیتر', 9, 6, 15000, 'کۆمپانیای ئاسۆ']
    ].map((x, i) => ({ id: 'it' + (i + 1), name: x[0], category: x[1], unit: x[2], qty: x[3], min: x[4], cost: x[5], supplier: x[6], updatedAt: U.addDays(T, -r.int(0, 20)) }));

    const labTypes = { sv_crown: 'کراونی زێرکۆنیا', sv_emax: 'ڤینیەری E-max', sv_implant: 'کراونی سەر ئیمپلانت', sv_aligner: 'ئەلاینەری ڕوون', sv_retainer: 'ڕیتەینەر' };
    const labs = ['تاقیگەی هەولێر دێنتاڵ', 'تاقیگەی دیجیتاڵ سمایل', 'Align Technology'];
    const labOrders = [];
    appts.filter((a) => labTypes[a.serviceId] && a.status !== 'cancelled' && a.date >= U.addDays(T, -35) && a.date <= T).forEach((a, i) => {
      const sent = a.date;
      const due = U.addDays(sent, a.serviceId === 'sv_aligner' ? 21 : a.serviceId === 'sv_implant' ? 90 : 7);
      let status = due < T ? (r.chance(0.6) ? 'fitted' : 'received') : U.diffDays(T, sent) <= 2 ? 'sent' : 'in_progress';
      if (a.serviceId === 'sv_implant') status = 'in_progress';
      labOrders.push({ id: 'lab' + (i + 1), patientId: a.patientId, doctorId: a.doctorId, type: labTypes[a.serviceId], tooth: a.tooth, shade: r.pick(['A1', 'A2', 'B1', 'BL2', 'A3']), lab: a.serviceId === 'sv_aligner' ? labs[2] : r.pick(labs.slice(0, 2)), sentDate: sent, dueDate: due, status, cost: a.serviceId === 'sv_aligner' ? 1200000 : r.int(8, 20) * 10000, note: '' });
    });

    const requests = [
      { id: 'rq1', name: 'هێرۆ ئیسماعیل', phone: '07502234455', service: 'سپیکردنەوەی ددان', preferred: U.addDays(T, 2) + ' 15:00', doctorId: 'd2', source: 'ئینستاگرام', status: 'pending', createdAt: U.stamp() },
      { id: 'rq2', name: 'بەختیار سەعید', phone: '07518801234', service: 'ئازاری ددان — بەپەلە', preferred: T + ' 18:00', doctorId: 'd1', source: 'واتسئاپ', status: 'pending', createdAt: U.stamp() },
      { id: 'rq3', name: 'نیشتمان کەریم', phone: '07704456678', service: 'ئەلاینەری ڕوون', preferred: U.addDays(T, 3) + ' 17:30', doctorId: 'd3', source: 'وێبسایت', status: 'pending', createdAt: U.stamp() },
      { id: 'rq4', name: 'ڕێبوار محەمەد', phone: '07509913321', service: 'ڕاوێژی ئیمپلانت', preferred: U.addDays(T, 4) + ' 13:00', doctorId: 'd4', source: 'وێبسایت', status: 'pending', createdAt: U.stamp() },
      { id: 'rq5', name: 'ئاڤا جەمال', phone: '07821234567', service: 'پشکنینی منداڵ (٧ ساڵ)', preferred: U.addDays(T, 1) + ' 16:00', doctorId: 'd5', source: 'ئینستاگرام', status: 'pending', createdAt: U.stamp() }
    ];

    const audit = [];
    const al = (daysAgo, h, userId, action, details) => audit.push({ id: U.uid('lg'), at: new Date(U.parse(U.addDays(T, -daysAgo)).setHours(h, r.int(0, 59))).toISOString(), userId, action, details });
    al(0, Math.min(20, Math.max(12, Math.floor(nowM / 60))), 's1', 'appointment', 'نۆرەی نوێی بۆ ' + patients[3].name + ' تۆمار کرد');
    al(0, 13, 's2', 'payment', 'پارەدانی ٧٥٠,٠٠٠ د.ع ی وەرگرت');
    al(0, 12, 'u_owner', 'settings', 'نرخی سپیکردنەوەی گۆڕی بۆ ٣٥٠,٠٠٠');
    al(1, 20, 'd1', 'appointment', '٣ نۆرەی هەفتەی داهاتووی گواستەوە');
    al(1, 14, 'u_owner', 'leave', 'مۆڵەتی د. کاروان مەحمودی بۆ ئەمڕۆ تۆمار کرد');
    al(2, 16, 's4', 'lab', 'داواکاری تاقیگەی بۆ کراونی ئیمپلانت نارد');
    al(3, 12, 'u_owner', 'user', 'هەژماری ئاری جەلال ی چالاک کرد');
    al(5, 18, 's3', 'patient', 'پەڕگەی نەخۆشی نوێی دروست کرد');
    al(7, 15, 'u_owner', 'inventory', '١٠ دانە ئیمپلانتی زیاد کرد بۆ کۆگا');

    return {
      version: 1, seededAt: T,
      settings: {
        clinicName: 'Bite for Dentistry', clinicNameKu: 'بایت بۆ ددان', address: 'نێرگز پلازا، نهۆمی ٣، شەقامی گوڵان، هەولێر', phone: '07505430000', email: 'info@bite.krd', website: 'bite.krd',
        open: '12:00', close: '21:00', closedDays: [5], slot: 30, digits: 'ar', theme: 'light',
        reminderTemplate: 'سڵاو {name} 🌿\nبیرخستنەوەی نۆرەکەت لە Bite for Dentistry:\n📅 {date} — کاتژمێر {time}\n👩‍⚕️ {doctor}\nتکایە ١٠ خولەک پێشتر ئامادە بە. بۆ گۆڕین پەیوەندی بکە: 0750 543 0000',
        autoReminders: true, onlineBooking: true, approveOnline: true, reviewRequest: true, weeklyReport: false, invoiceNote: 'سوپاس بۆ متمانەتان. هەموو چارەسەرەکان گەرەنتی کوالیتییان هەیە.',
        logo: '', permissions: JSON.parse(JSON.stringify(ROLE_DEFAULTS))
      },
      users, rooms, services, patients, appointments: appts, invoices, payments, expenses: expensesFinal, inventory, labOrders, requests, leaves, audit
    };
  }

  window.Seed = { build, PERMS, ROLE_DEFAULTS, TEETH_UP, TEETH_LO };
})();
