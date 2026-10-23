/* Demo data generator — deterministic, built around today's date */
(function () {
  const PERMS = [
    ['view_all', tt('بینینی داتای هەموو دکتۆرەکان', "See all doctors' data")],
    ['view_finance', tt('بینینی داهات و قازانجی کلینیک', 'See clinic revenue and profit')],
    ['view_reports', tt('بینینی ڕاپۆرتەکان', 'See reports')],
    ['create_appointments', tt('گرتنی نۆرە', 'Book appointments')],
    ['edit_appointments', tt('گۆڕین و هەڵوەشاندنەوەی نۆرە', 'Change and cancel appointments')],
    ['manage_patients', tt('تۆمارکردن و دەستکاری نەخۆش', 'Register and edit patients')],
    ['view_medical', tt('بینینی پەڕگەی پزیشکی', 'See medical records')],
    ['edit_medical', tt('نووسینی تێبینی پزیشکی و نەخشەی ددان', 'Write clinical notes and dental chart')],
    ['billing', tt('پسوولە و وەرگرتنی پارە', 'Invoices and taking payments')],
    ['discounts', tt('داشکاندن لە پسوولە', 'Give invoice discounts')],
    ['manage_expenses', tt('تۆمارکردنی خەرجی', 'Record expenses')],
    ['manage_inventory', tt('بەڕێوەبردنی کۆگا', 'Manage inventory')],
    ['manage_lab', tt('داواکاری تاقیگە', 'Lab orders')],
    ['manage_users', tt('زیادکردن و سڕینەوەی دکتۆر و کارمەند', 'Add and remove doctors and staff')],
    ['manage_services', tt('گۆڕینی خزمەتگوزاری و نرخ', 'Change services and prices')],
    ['manage_settings', tt('ڕێکخستنەکانی کلینیک', 'Clinic settings')],
    ['view_audit', tt('بینینی تۆماری گۆڕانکاری', 'See the activity log')],
    ['export_data', tt('هەناردەکردن و باکئەپ', 'Export and backup')],
    ['manage_lists', tt('بەڕێوەبردنی لیستەکان (دەرمان، هەستیاری، جۆرەکان…)', 'Manage lists (medicines, allergies, categories…)')]
  ];
  const ROLE_DEFAULTS = {
    admin: { view_all: true, view_finance: false, view_reports: true, create_appointments: true, edit_appointments: true, manage_patients: true, view_medical: false, edit_medical: false, billing: true, discounts: true, manage_expenses: true, manage_inventory: true, manage_lab: true, manage_users: true, manage_services: true, manage_settings: false, view_audit: true, export_data: false, manage_lists: true },
    doctor: { view_all: false, view_finance: false, view_reports: true, create_appointments: true, edit_appointments: true, manage_patients: true, view_medical: true, edit_medical: true, billing: false, discounts: false, manage_expenses: false, manage_inventory: false, manage_lab: true, manage_users: false, manage_services: false, manage_settings: false, view_audit: false, export_data: false, manage_lists: false },
    secretary: { view_all: false, view_finance: false, view_reports: false, create_appointments: true, edit_appointments: true, manage_patients: true, view_medical: false, edit_medical: false, billing: true, discounts: false, manage_expenses: false, manage_inventory: true, manage_lab: true, manage_users: false, manage_services: false, manage_settings: false, view_audit: false, export_data: false, manage_lists: false }
  };

  /* Every text value is a [Kurdish, English] pair; build() picks one by language. */
  const SERVICES = [
    ['sv_consult', ['پشکنین و ڕاوێژ', 'Check-up & consultation'], 'general', 30, 25000, false],
    ['sv_pano', ['تیشکی پانۆراما', 'Panoramic X-ray'], 'xray', 15, 30000, false],
    ['sv_pa', ['تیشکی ددان (PA)', 'Periapical X-ray (PA)'], 'xray', 15, 10000, true],
    ['sv_clean', ['پاککردنەوە و پۆلیش', 'Scale & polish'], 'prevent', 45, 75000, false],
    ['sv_fill', ['پڕکردنەوەی کۆمپۆزیت', 'Composite filling'], 'restore', 45, 150000, true],
    ['sv_kidfill', ['پڕکردنەوەی منداڵان', 'Children\'s filling'], 'kids', 30, 75000, true],
    ['sv_rct', ['ڕەگ چارەسەری', 'Root canal treatment'], 'endo', 90, 450000, true],
    ['sv_rerct', ['ڕەگ چارەسەری دووبارە', 'Root canal re-treatment'], 'endo', 90, 550000, true],
    ['sv_post', ['پۆست و کۆر', 'Post & core'], 'endo', 45, 150000, true],
    ['sv_ext', ['هەڵکێشانی ددان', 'Tooth extraction'], 'surgery', 30, 75000, true],
    ['sv_wisdom', ['هەڵکێشانی ددانی عەقڵ', 'Wisdom tooth extraction'], 'surgery', 60, 250000, true],
    ['sv_crown', ['کراونی زێرکۆنیا', 'Zirconia crown'], 'prosth', 60, 600000, true],
    ['sv_vdirect', ['ڤینیەری ڕاستەوخۆ (کۆمپۆزیت)', 'Direct composite veneer'], 'cosmetic', 60, 300000, true],
    ['sv_emax', ['ڤینیەری E-max', 'E-max veneer'], 'cosmetic', 60, 700000, true],
    ['sv_smile', ['دیزاینی پێکەنین (DSD)', 'Digital smile design (DSD)'], 'cosmetic', 60, 150000, false],
    ['sv_white', ['سپیکردنەوەی ددان', 'Teeth whitening'], 'cosmetic', 60, 350000, false],
    ['sv_implant', ['دانانی ئیمپلانت', 'Implant placement'], 'implant', 120, 1600000, true],
    ['sv_graft', ['بۆن گرافت', 'Bone graft'], 'implant', 60, 600000, true],
    ['sv_braces', ['دانانی تێل (سیرامیک)', 'Ceramic braces'], 'ortho', 90, 1800000, false],
    ['sv_adjust', ['ڕێکخستنی تێل', 'Braces adjustment'], 'ortho', 30, 50000, false],
    ['sv_aligner', ['ئەلاینەری ڕوون (پلانی تەواو)', 'Clear aligners (full plan)'], 'ortho', 45, 3500000, false],
    ['sv_retainer', ['ڕیتەینەر', 'Retainer'], 'ortho', 30, 150000, false],
    ['sv_scaling', ['پاککردنەوەی قووڵی پوک', 'Deep gum cleaning'], 'perio', 60, 200000, false],
    ['sv_followup', ['سەردانی بەدواداچوون', 'Follow-up visit'], 'general', 15, 0, false]
  ];
  const SERVICE_CATS = {
    general: ['گشتی', 'General'], xray: ['تیشک', 'X-ray'], prevent: ['پاراستن', 'Prevention'], restore: ['چارەسەری گشتی', 'Restorative'],
    kids: ['منداڵان', 'Children'], endo: ['ڕەگ چارەسەری', 'Endodontics'], surgery: ['نەشتەرگەری', 'Oral surgery'], prosth: ['دەستکرد', 'Prosthodontics'],
    cosmetic: ['جوانکاری', 'Cosmetic'], implant: ['ئیمپلانت', 'Implants'], ortho: ['ئۆرتۆدۆنتیک', 'Orthodontics'], perio: ['پوک', 'Periodontics']
  };

  const DOCTORS = [
    { id: 'd1', name: ['د. ئاراس کەریم', 'Dr. Aras Karim'], username: 'aras', spec: ['ڕەگ چارەسەری (Endodontics)', 'Endodontics'], room: 'r1', share: 40, color: '#2F5DA8', mix: [['sv_rct', 30], ['sv_rerct', 8], ['sv_post', 6], ['sv_consult', 14], ['sv_fill', 18], ['sv_pa', 8], ['sv_crown', 10], ['sv_followup', 6]] },
    { id: 'd2', name: ['د. شیلان عەزیز', 'Dr. Shilan Aziz'], username: 'shilan', spec: ['ددانی جوانکاری (Cosmetic)', 'Cosmetic dentistry'], room: 'r2', share: 45, color: '#B5556B', mix: [['sv_vdirect', 18], ['sv_emax', 12], ['sv_white', 16], ['sv_smile', 8], ['sv_consult', 14], ['sv_clean', 12], ['sv_crown', 12], ['sv_followup', 8]] },
    { id: 'd3', name: ['د. هێمن ڕەشید', 'Dr. Hemn Rashid'], username: 'hemn', spec: ['ئۆرتۆدۆنتیک (Orthodontics)', 'Orthodontics'], room: 'r3', share: 40, color: '#2A9D8F', mix: [['sv_adjust', 46], ['sv_braces', 8], ['sv_aligner', 6], ['sv_retainer', 6], ['sv_consult', 18], ['sv_pano', 10], ['sv_followup', 6]] },
    { id: 'd4', name: ['د. ڕێژین ئەحمەد', 'Dr. Rezhin Ahmed'], username: 'rezhin', spec: ['ئیمپلانت و نەشتەرگەری', 'Implants & oral surgery'], room: 'r4', share: 50, color: '#C9822E', mix: [['sv_implant', 26], ['sv_graft', 8], ['sv_consult', 22], ['sv_wisdom', 16], ['sv_ext', 12], ['sv_pano', 8], ['sv_followup', 8]] },
    { id: 'd5', name: ['د. کاروان مەحمود', 'Dr. Karwan Mahmood'], username: 'karwan', spec: ['ددانی گشتی و منداڵان', 'General & children\'s dentistry'], room: 'r5', share: 35, color: '#6B5BC9', mix: [['sv_consult', 18], ['sv_clean', 18], ['sv_fill', 22], ['sv_kidfill', 16], ['sv_ext', 10], ['sv_scaling', 8], ['sv_followup', 8]] }
  ];
  const SECRETARIES = [
    { id: 's1', name: ['شیرین ئەحمەد', 'Shirin Ahmed'], username: 'shirin', doctorId: 'd1' },
    { id: 's2', name: ['ڕێبین کەریم', 'Rebin Karim'], username: 'rebin', doctorId: 'd2' },
    { id: 's3', name: ['لاڤا حەمید', 'Lava Hamid'], username: 'lava', doctorId: 'd3' },
    { id: 's4', name: ['دڵنیا عەلی', 'Dilnya Ali'], username: 'dlnya', doctorId: 'd4' },
    { id: 's5', name: ['ئاری جەلال', 'Ari Jalal'], username: 'ari', doctorId: 'd5' }
  ];

  const F_NAMES = [['ڕێزان', 'Rezan'], ['نازدار', 'Nazdar'], ['بەفرین', 'Bafrin'], ['لانە', 'Lana'], ['هێڤی', 'Hevi'], ['ئەڤین', 'Avin'], ['سارا', 'Sara'], ['ڕۆژان', 'Rozhan'], ['بێریڤان', 'Berivan'], ['سۆزان', 'Suzan'], ['شادی', 'Shadi'], ['نیشتمان', 'Nishtman'], ['هێرۆ', 'Hero'], ['ئاوێزان', 'Awezan'], ['دیلان', 'Dilan'], ['ژیلا', 'Zhila'], ['گوڵاڵە', 'Gulala'], ['کانی', 'Kani'], ['ڤیان', 'Vian'], ['شیلان', 'Shilan'], ['سروە', 'Sirwa'], ['ڕوناک', 'Runak'], ['پەری', 'Pari'], ['تارا', 'Tara'], ['هانا', 'Hana'], ['لاوین', 'Lawin'], ['نەسرین', 'Nasrin'], ['خەندە', 'Khanda'], ['چنار', 'Chinar'], ['ئالا', 'Ala'], ['بەهار', 'Bahar'], ['دڵنیا', 'Dilnya'], ['زێڕین', 'Zerin'], ['سەیران', 'Sayran'], ['مەهاباد', 'Mahabad']];
  const M_NAMES = [['سامان', 'Saman'], ['هاوڕێ', 'Hawre'], ['ئازاد', 'Azad'], ['کاوە', 'Kawa'], ['دیار', 'Diyar'], ['ئاوات', 'Awat'], ['زانا', 'Zana'], ['پشتیوان', 'Pishtiwan'], ['دانا', 'Dana'], ['ڕەوەند', 'Rawand'], ['شەهین', 'Shahin'], ['کۆڤان', 'Kovan'], ['ئاڤان', 'Avan'], ['بەختیار', 'Bakhtiyar'], ['ڕێبوار', 'Rebwar'], ['هەڵۆ', 'Halo'], ['سیروان', 'Sirwan'], ['کارزان', 'Karzan'], ['ئارام', 'Aram'], ['شوان', 'Shwan'], ['نەوزاد', 'Nawzad'], ['ڕێکەوت', 'Rekawt'], ['ئومێد', 'Omed'], ['یاسین', 'Yasin'], ['بەهۆز', 'Bahoz'], ['کامەران', 'Kamaran'], ['سەرهەنگ', 'Sarhang'], ['هێمن', 'Hemn'], ['ئاکۆ', 'Ako'], ['دلێر', 'Dler'], ['فەرهاد', 'Farhad'], ['ئارێز', 'Arez'], ['ژیار', 'Zhiyar'], ['بڕوا', 'Birwa'], ['گۆران', 'Goran']];
  const LAST = [['ئەحمەد', 'Ahmed'], ['محەمەد', 'Mohammed'], ['کەریم', 'Karim'], ['عومەر', 'Omar'], ['عەلی', 'Ali'], ['حەسەن', 'Hassan'], ['مستەفا', 'Mustafa'], ['جەمال', 'Jamal'], ['ڕەشید', 'Rashid'], ['فاروق', 'Farouq'], ['ئیبراهیم', 'Ibrahim'], ['عەبدوڵا', 'Abdullah'], ['سەعید', 'Saeed'], ['قادر', 'Qadir'], ['حەمە', 'Hama'], ['تاهیر', 'Tahir'], ['جەلال', 'Jalal'], ['ئیسماعیل', 'Ismail'], ['خالید', 'Khalid'], ['نوری', 'Nuri'], ['سەلام', 'Salam'], ['ڕەسوڵ', 'Rasul'], ['شێخانی', 'Shekhani'], ['بارزانی', 'Barzani'], ['دزەیی', 'Dizayee'], ['کۆیی', 'Koyi'], ['هەولێری', 'Hawleri'], ['سۆرانی', 'Sorani'], ['باڵەکی', 'Balaki'], ['شەقڵاوەیی', 'Shaqlawayi']];
  const AREAS = [['هەولێر — ئەنکاوە', 'Erbil — Ankawa'], ['هەولێر — ٦٠ مەتری', 'Erbil — 60m Street'], ['هەولێر — گوڵان', 'Erbil — Gulan'], ['هەولێر — ئیمپایەر', 'Erbil — Empire'], ['هەولێر — دریم سیتی', 'Erbil — Dream City'], ['هەولێر — بەختیاری', 'Erbil — Bakhtiari'], ['هەولێر — شۆڕش', 'Erbil — Shorsh'], ['سلێمانی', 'Sulaymaniyah'], ['دهۆک', 'Duhok'], ['کۆیە', 'Koya'], ['شەقڵاوە', 'Shaqlawa']];
  const P_SOURCES = [['ps_ig', ['ئینستاگرام', 'Instagram'], 36], ['ps_ref', ['ناساندن لەلایەن نەخۆشەوە', 'Referred by a patient'], 28], ['ps_google', ['گووگڵ / نەخشە', 'Google / Maps'], 17], ['ps_web', ['وێبسایت', 'Website'], 8], ['ps_fb', ['فەیسبووک', 'Facebook'], 5], ['ps_walk', ['هاتنی ڕاستەوخۆ', 'Walk-in'], 6], ['ps_tt', ['تیکتۆک', 'TikTok'], 0]];
  const A_SOURCES = [['as_desk', ['پێشوازی', 'Front desk'], 55], ['as_phone', ['تەلەفۆن', 'Phone'], 22], ['as_ig', ['ئینستاگرام', 'Instagram'], 12], ['as_web', ['وێبسایت', 'Website'], 7], ['as_wa', ['واتسئاپ', 'WhatsApp'], 4], ['as_ref', ['ناساندن', 'Referral'], 0]];
  const ALLERGIES = [['al_pen', ['پەنسلین', 'Penicillin']], ['al_latex', ['لاتێکس', 'Latex']], ['al_asp', ['ئەسپرین', 'Aspirin']], ['al_lido', ['لیدۆکایین', 'Lidocaine']], ['al_ibu', ['ئایبوپرۆفین', 'Ibuprofen']], ['al_sulfa', ['سەلفا', 'Sulfa drugs']]];
  const CONDITIONS = [['cd_dm', ['شەکرە', 'Diabetes']], ['cd_htn', ['پەستانی خوێنی بەرز', 'High blood pressure']], ['cd_heart', ['نەخۆشی دڵ', 'Heart disease']], ['cd_asthma', ['ڕەبۆ', 'Asthma']], ['cd_preg', ['دووگیانی', 'Pregnancy']], ['cd_warf', ['خوێن ڕوون (وارفارین)', 'Blood thinner (warfarin)']], ['cd_thyroid', ['تایرۆید', 'Thyroid disorder']], ['cd_hep', ['هێپاتایتس', 'Hepatitis']]];
  const TAGS = [['tg_vip', ['VIP', 'VIP']], ['tg_fear', ['ترس لە ددانساز', 'Dental anxiety']], ['tg_kid', ['منداڵ', 'Child']], ['tg_travel', ['گەشتیار', 'Visitor from abroad']], ['tg_staff', ['کارمەندی کلینیک', 'Clinic staff']]];
  const MED_CATS = [['mc_ab', ['دژە بەکتریا', 'Antibiotics']], ['mc_pain', ['ئازارشکێن', 'Painkillers']], ['mc_nsaid', ['دژە هەوکردن', 'Anti-inflammatories']], ['mc_rinse', ['غەرغەرە و دەمشۆر', 'Mouthwashes & rinses']], ['mc_steroid', ['کۆرتیکۆستیرۆید', 'Corticosteroids']], ['mc_fungal', ['دژە کەڕوو', 'Antifungals']], ['mc_topical', ['جێڵ و دەرمانی سەرپێست', 'Topical gels']], ['mc_anx', ['ئارامکەرەوە', 'Sedatives']]];
  /* name, category, dose, frequency, duration, conflicting allergy ids */
  const MEDS = [
    ['Amoxicillin 500mg', 'mc_ab', ['١ کەپسول', '1 capsule'], ['٣ جار لە ڕۆژێکدا', '3 times a day'], ['٥ ڕۆژ', '5 days'], ['al_pen']],
    ['Augmentin 1g', 'mc_ab', ['١ حەب', '1 tablet'], ['٢ جار لە ڕۆژێکدا', 'Twice a day'], ['٥ ڕۆژ', '5 days'], ['al_pen']],
    ['Azithromycin 500mg', 'mc_ab', ['١ حەب', '1 tablet'], ['١ جار لە ڕۆژێکدا', 'Once a day'], ['٣ ڕۆژ', '3 days'], []],
    ['Clindamycin 300mg', 'mc_ab', ['١ کەپسول', '1 capsule'], ['٣ جار لە ڕۆژێکدا', '3 times a day'], ['٧ ڕۆژ', '7 days'], []],
    ['Metronidazole 500mg', 'mc_ab', ['١ حەب', '1 tablet'], ['٣ جار لە ڕۆژێکدا', '3 times a day'], ['٥ ڕۆژ', '5 days'], []],
    ['Paracetamol 500mg', 'mc_pain', ['٢ حەب', '2 tablets'], ['هەر ٦ کاتژمێر جارێک لە کاتی ئازار', 'Every 6 hours when in pain'], ['٣ ڕۆژ', '3 days'], []],
    ['Ibuprofen 400mg', 'mc_nsaid', ['١ حەب', '1 tablet'], ['هەر ٨ کاتژمێر جارێک دوای نان', 'Every 8 hours after food'], ['٣ ڕۆژ', '3 days'], ['al_ibu', 'al_asp']],
    ['Diclofenac 50mg', 'mc_nsaid', ['١ حەب', '1 tablet'], ['٢ جار لە ڕۆژێکدا دوای نان', 'Twice a day after food'], ['٣ ڕۆژ', '3 days'], ['al_ibu', 'al_asp']],
    ['Chlorhexidine 0.12% mouthwash', 'mc_rinse', ['١٥ مل', '15 ml'], ['٢ جار لە ڕۆژێکدا', 'Twice a day'], ['٧ ڕۆژ', '7 days'], []],
    ['Dexamethasone 4mg', 'mc_steroid', ['١ حەب', '1 tablet'], ['١ جار لە ڕۆژێکدا', 'Once a day'], ['٢ ڕۆژ', '2 days'], []],
    ['Nystatin oral suspension', 'mc_fungal', ['١ مل', '1 ml'], ['٤ جار لە ڕۆژێکدا', '4 times a day'], ['٧ ڕۆژ', '7 days'], []],
    ['Benzocaine 20% gel', 'mc_topical', ['کەمێک', 'A small amount'], ['لە کاتی ئازار', 'When in pain'], ['٣ ڕۆژ', '3 days'], []],
    ['Diazepam 5mg', 'mc_anx', ['١ حەب', '1 tablet'], ['١ کاتژمێر پێش چارەسەر', '1 hour before treatment'], ['١ جار', 'Once'], []]
  ];
  const RX_ADVICE = [
    ['ra_ext', ['دوای هەڵکێشان: ٢ کاتژمێر هیچ مەخۆ. بۆ ٢٤ کاتژمێر خواردنی گەرم مەخۆ و جگەرە مەکێشە. گاز بۆ نیو کاتژمێر بگەزە.', 'After extraction: nothing to eat for 2 hours. No hot food or smoking for 24 hours. Bite on the gauze for 30 minutes.']],
    ['ra_rct', ['دوای ڕەگ چارەسەری: تا دانانی کراون بەو لایە مەجوو. ئازاری کەم بۆ ٢-٣ ڕۆژ ئاساییە.', 'After root canal: avoid chewing on that side until the crown is fitted. Mild pain for 2–3 days is normal.']],
    ['ra_white', ['دوای سپیکردنەوە: بۆ ٤٨ کاتژمێر چا، قاوە و خواردنی ڕەنگاوڕەنگ مەخۆ.', 'After whitening: no tea, coffee or coloured food for 48 hours.']],
    ['ra_implant', ['دوای ئیمپلانت: سەهۆڵ بۆ ٢٠ خولەک دابنێ، خواردنی نەرم بخۆ و دەمت توند مەشۆ.', 'After implant surgery: apply ice for 20 minutes, eat soft food and rinse gently.']]
  ];
  const EXP_CATS = [['ec_rent', ['کرێی شوێن', 'Rent']], ['ec_salary', ['موچەی کارمەندان', 'Staff salaries']], ['ec_power', ['کارەبا و مۆلیدە', 'Electricity & generator']], ['ec_supply', ['کەرەستەی پزیشکی', 'Medical supplies']], ['ec_lab', ['تاقیگە (لاب)', 'Dental lab']], ['ec_ads', ['ڕیکلام', 'Advertising']], ['ec_repair', ['چاککردنەوە و خزمەتگوزاری', 'Repairs & maintenance']], ['ec_net', ['ئینتەرنێت و تەلەفۆن', 'Internet & phone']], ['ec_food', ['خواردن و میوانداری', 'Food & hospitality']], ['ec_other', ['هی تر', 'Other']]];
  const PAY_METHODS = [['cash', ['کاش', 'Cash']], ['card', ['کارتی بانکی', 'Bank card']], ['fib', ['FIB', 'FIB']], ['fastpay', ['FastPay', 'FastPay']], ['zaincash', ['زەین کاش', 'ZainCash']]];
  const INV_CATS = [['ic_fill', ['کەرەستەی پڕکردنەوە', 'Filling materials']], ['ic_anes', ['بێهۆشکەر', 'Anaesthetics']], ['ic_ppe', ['پاراستن', 'Protective wear']], ['ic_endo', ['ڕەگ چارەسەری', 'Endodontics']], ['ic_impl', ['ئیمپلانت', 'Implants']], ['ic_cos', ['جوانکاری', 'Cosmetic']], ['ic_ortho', ['ئۆرتۆدۆنتیک', 'Orthodontics']], ['ic_imp', ['قاڵبگرتن', 'Impressions']], ['ic_pros', ['دەستکرد', 'Prosthodontics']], ['ic_gen', ['گشتی', 'General']], ['ic_clean', ['پاکوخاوێنی', 'Cleaning & sterilising']]];
  const UNITS = [['un_syr', ['سرنج', 'syringe']], ['un_box', ['قوتوو', 'box']], ['un_pack', ['پاکەت', 'pack']], ['un_pc', ['دانە', 'piece']], ['un_kit', ['کیت', 'kit']], ['un_l', ['لیتر', 'litre']]];
  const SUPPLIERS = [['su_aso', ['کۆمپانیای ئاسۆ', 'Aso Company']], ['su_zhian', ['دەرمانخانەی ژیان', 'Zhian Pharmacy']], ['su_dent', ['Dentsply — نوێنەر', 'Dentsply — agent']], ['su_str', ['Straumann — نوێنەر', 'Straumann — agent']], ['su_geist', ['Geistlich — نوێنەر', 'Geistlich — agent']], ['su_ultra', ['Ultradent — نوێنەر', 'Ultradent — agent']], ['su_ortho', ['ئۆرتۆ میدیکاڵ', 'Ortho Medical']]];
  const LAB_TYPES = [['lt_zr', ['کراونی زێرکۆنیا', 'Zirconia crown']], ['lt_emaxc', ['کراونی E-max', 'E-max crown']], ['lt_emaxv', ['ڤینیەری E-max', 'E-max veneer']], ['lt_impc', ['کراونی سەر ئیمپلانت', 'Implant crown']], ['lt_bridge', ['بریج', 'Bridge']], ['lt_align', ['ئەلاینەری ڕوون', 'Clear aligners']], ['lt_ret', ['ڕیتەینەر', 'Retainer']], ['lt_guard', ['نایت گارد', 'Night guard']], ['lt_dent', ['ددانی دەستکرد (تەواو)', 'Complete denture']], ['lt_partial', ['ددانی دەستکرد (بەشێک)', 'Partial denture']]];
  const LABS = [['lb_erbil', ['تاقیگەی هەولێر دێنتاڵ', 'Erbil Dental Lab']], ['lb_smile', ['تاقیگەی دیجیتاڵ سمایل', 'Digital Smile Lab']], ['lb_align', ['Align Technology', 'Align Technology']]];
  const SPECIALTIES = [['sp_gen', ['ددانی گشتی', 'General dentistry']], ['sp_endo', ['ڕەگ چارەسەری (Endodontics)', 'Endodontics']], ['sp_cos', ['ددانی جوانکاری (Cosmetic)', 'Cosmetic dentistry']], ['sp_ortho', ['ئۆرتۆدۆنتیک (Orthodontics)', 'Orthodontics']], ['sp_impl', ['ئیمپلانت و نەشتەرگەری', 'Implants & oral surgery']], ['sp_ped', ['ددانی منداڵان (Pedodontics)', 'Paediatric dentistry']], ['sp_perio', ['پوک (Periodontics)', 'Periodontics']], ['sp_pros', ['دەستکرد (Prosthodontics)', 'Prosthodontics']]];
  const LEAVE_REASONS = [['lr_annual', ['مۆڵەتی ساڵانە', 'Annual leave']], ['lr_sick', ['نەخۆشی', 'Sick leave']], ['lr_conf', ['کۆنفرانس و خولی زانستی', 'Conference or course']], ['lr_travel', ['گەشت', 'Travel']], ['lr_personal', ['کاری تایبەت', 'Personal']]];
  const APPT_NOTES = [['نەخۆش داوای کاتی زووتری کردووە', 'Patient asked for an earlier slot'], ['پێویستی بە تیشکە پێش چارەسەر', 'Needs an X-ray before treatment'], ['نەخۆش ترسی لە دەرزییە', 'Patient is afraid of needles'], ['لەگەڵ منداڵەکەی دێت', 'Coming with their child']];

  const TEETH_UP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const TEETH_LO = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const TOOTH_STATUS_BY_SERVICE = { sv_rct: 'rct', sv_rerct: 'rct', sv_crown: 'crown', sv_fill: 'filled', sv_kidfill: 'filled', sv_implant: 'implant', sv_ext: 'extracted', sv_wisdom: 'extracted', sv_vdirect: 'veneer', sv_emax: 'veneer' };
  const CLIN_NOTES = {
    sv_rct: [['ئاوێتەکردنی ڕەگ تەواو بوو، ٣ کەناڵ. ئازاری نییە.', 'Root canal completed, 3 canals. No pain.'], ['دانیشتنی یەکەم: پاککردنەوە و دانانی کالسیۆم هایدرۆکساید.', 'First visit: cleaning and calcium hydroxide dressing.'], ['کەناڵەکان پڕکرانەوە، تیشکی دوای چارەسەر باشە.', 'Canals obturated, post-op X-ray looks good.']],
    sv_implant: [['ئیمپلانتی 4.1×10mm دانرا، جێگیری سەرەتایی باشە.', '4.1×10mm implant placed, good primary stability.'], ['نەشتەرگەری بێ کێشە، ٣ مانگ چاوەڕوانی بۆ لکان.', 'Uneventful surgery, 3 months for osseointegration.']],
    sv_adjust: [['وایەری 0.016 NiTi گۆڕدرا.', '0.016 NiTi wire changed.'], ['ڕێکخستنی مانگانە، پێشکەوتن باشە.', 'Monthly adjustment, good progress.'], ['چەسپی برەکێتێک دووبارە کرایەوە.', 'One bracket re-bonded.']],
    sv_fill: [['پڕکردنەوەی چینی دووەم (Class II) بە کۆمپۆزیت.', 'Class II composite restoration.'], ['کلۆری بچووک لابرا و پڕکرایەوە.', 'Small caries removed and filled.']],
    sv_emax: [['ئامادەکردنی ڤینیەر و وەرگرتنی قاڵب.', 'Veneer preparation and impression taken.'], ['ڤینیەرەکان چەسپێنران، نەخۆش ڕازییە.', 'Veneers bonded, patient is happy.']],
    sv_white: [['سپیکردنەوەی ناو کلینیک، ٣ خول × ١٥ خولەک.', 'In-office whitening, 3 cycles × 15 minutes.']],
    sv_consult: [['پشکنینی گشتی، پلانی چارەسەر ڕوونکرایەوە.', 'General check-up, treatment plan explained.'], ['نەخۆش ئازاری لە لای چەپی خوارەوە هەیە، تیشک داواکرا.', 'Pain on the lower left, X-ray requested.']],
    sv_wisdom: [['هەڵکێشانی نەشتەرگەری ددانی ٣٨، ٣ دروومان.', 'Surgical extraction of tooth 38, 3 sutures.']]
  };

  /* Lists the admin can edit. Built in the given language. */
  function buildLists(L) {
    const simple = (arr) => arr.map((x) => ({ id: x[0], name: L(x[1]), active: true }));
    return {
      medCategories: simple(MED_CATS),
      medicines: MEDS.map((m, i) => ({ id: 'md' + (i + 1), name: m[0], categoryId: m[1], dose: L(m[2]), freq: L(m[3]), days: L(m[4]), conflicts: m[5].slice(), note: '', active: true })),
      rxAdvice: simple(RX_ADVICE),
      allergies: simple(ALLERGIES),
      conditions: simple(CONDITIONS),
      patientTags: simple(TAGS),
      patientSources: P_SOURCES.map((x) => ({ id: x[0], name: L(x[1]), active: true })),
      areas: AREAS.map((x, i) => ({ id: 'ar' + (i + 1), name: L(x), active: true })),
      apptSources: A_SOURCES.map((x) => ({ id: x[0], name: L(x[1]), active: true })),
      leaveReasons: simple(LEAVE_REASONS),
      serviceCategories: Object.keys(SERVICE_CATS).map((k) => ({ id: 'sc_' + k, name: L(SERVICE_CATS[k]), active: true })),
      specialties: simple(SPECIALTIES),
      expenseCategories: simple(EXP_CATS),
      paymentMethods: simple(PAY_METHODS),
      inventoryCategories: simple(INV_CATS),
      inventoryUnits: simple(UNITS),
      suppliers: simple(SUPPLIERS),
      labWorkTypes: simple(LAB_TYPES),
      labs: simple(LABS)
    };
  }

  function build(opts) {
    opts = opts || {};
    const lang = opts.lang || window.Lang || 'en';
    const L = (pair) => (Array.isArray(pair) ? (lang === 'ku' ? pair[0] : pair[1]) : pair);
    const D = (n) => (lang === 'ku' ? U.d(n) : String(n));
    const r = U.rng(opts.seed || 20261022);
    const T = U.today();
    const nowM = U.nowMin();
    const openM = 12 * 60, closeM = 21 * 60;
    const lists = buildLists(L);
    const nameOf = (key, id) => { const x = lists[key].find((i) => i.id === id); return x ? x.name : ''; };
    const svc = {};
    const services = SERVICES.map((s) => {
      const o = { id: s[0], name: L(s[1]), category: L(SERVICE_CATS[s[2]]), duration: s[3], price: s[4], perTooth: s[5], active: true };
      svc[o.id] = o;
      return o;
    });

    const users = [];
    users.push({ id: 'u_owner', role: 'owner', name: L(['خاوەنی کلینیک', 'Clinic Owner']), title: L(['خاوەن و بەڕێوەبەری گشتی', 'Owner & managing director']), username: 'owner', password: '1234', phone: '07505430000', email: 'owner@bite.krd', active: true, color: '#1B2B4F', createdAt: U.addDays(T, -900) });
    DOCTORS.forEach((d) => users.push({ id: d.id, role: 'doctor', name: L(d.name), title: L(d.spec), specialty: L(d.spec), username: d.username, password: '1234', phone: '0750' + r.int(1000000, 9999999), email: d.username + '@bite.krd', room: d.room, share: d.share, color: d.color, workDays: [6, 0, 1, 2, 3, 4], start: '12:00', end: '21:00', active: true, createdAt: U.addDays(T, -r.int(300, 900)) }));
    SECRETARIES.forEach((s) => users.push({ id: s.id, role: 'secretary', name: L(s.name), title: L(['سکرتێری ', 'Secretary to ']) + L(DOCTORS.find((d) => d.id === s.doctorId).name), username: s.username, password: '1234', phone: '0751' + r.int(1000000, 9999999), email: s.username + '@bite.krd', doctorId: s.doctorId, active: true, color: '#3FA987', createdAt: U.addDays(T, -r.int(100, 600)) }));

    const rooms = [1, 2, 3, 4, 5].map((n) => ({ id: 'r' + n, name: L(['ژووری ', 'Room ']) + D(n), note: n === 4 ? L(['ژووری نەشتەرگەری', 'Surgery room']) : n === 3 ? L(['ئۆرتۆ', 'Ortho']) : '', active: true }));

    const leaves = [
      { id: 'lv1', doctorId: 'd5', from: T, to: T, reason: nameOf('leaveReasons', 'lr_annual') },
      { id: 'lv2', doctorId: 'd2', from: U.addDays(T, 6), to: U.addDays(T, 8), reason: L(['بەشداری کۆنفرانسی ددانی جوانکاری — دوبەی', 'Cosmetic dentistry conference — Dubai']) }
    ];
    const onLeave = (docId, day) => leaves.some((l) => l.doctorId === docId && day >= l.from && day <= l.to);

    // Patients & appointments — generated as patient journeys so that visit patterns
    // (treatment courses, recalls, patients who never come back) are realistic.
    // The last FULL days carry full detail and billing; older visits are compact
    // "imported history" (no invoices) so the demo stays within browser storage limits.
    const patients = [];
    const docWeights = [['d1', 22], ['d2', 18], ['d3', 26], ['d4', 14], ['d5', 20]];
    const srcWeights = P_SOURCES.filter((x) => x[2]).map((x) => [L(x[1]), x[2]]);
    const HIST = 300, FULL = 62, AHEAD = 21;
    const pType = {}; // pid -> journey info (not stored)
    function makePatient(created, docId) {
      const i = patients.length;
      const female = r.chance(0.54);
      const name = L(r.pick(female ? F_NAMES : M_NAMES)) + ' ' + L(r.pick(LAST));
      let age = r.weighted([[r.int(6, 14), 10], [r.int(15, 25), 26], [r.int(26, 45), 42], [r.int(46, 72), 22]]);
      if (age < 15 && docId !== 'd5' && docId !== 'd3') age = r.int(18, 50);
      if (docId === 'd3' && r.chance(0.6)) age = r.int(11, 24);
      const dobY = new Date().getFullYear() - age;
      const p = {
        id: 'p' + (1001 + i), fileNo: 1001 + i, name, gender: female ? 'f' : 'm',
        dob: dobY + '-' + U.pad(r.int(1, 12)) + '-' + U.pad(r.int(1, 28)),
        phone: r.pick(['0750', '0751', '0770', '0771', '0782']) + r.int(1000000, 9999999),
        address: L(r.pick(AREAS)),
        source: r.weighted(srcWeights), doctorId: docId,
        allergies: r.chance(0.12) ? [L(r.pick(ALLERGIES.slice(0, 5))[1])] : [],
        conditions: age >= 15 && r.chance(0.18) ? [L(r.pick(CONDITIONS.slice(0, 7))[1])] : [],
        tags: [], notes: '', createdAt: created, teeth: {}, plan: [], files: [], clinical: [], prescriptions: []
      };
      if (r.chance(0.05)) p.tags.push('VIP');
      patients.push(p);
      // journey: loyal patients come back for check-ups, occasional ones about yearly, some never return
      const ortho = docId === 'd3' && r.chance(0.7);
      pType[p.id] = { kind: ortho ? 'ortho' : r.weighted([['loyal', 54], ['occasional', 24], ['once', 22]]), orthoLeft: ortho ? r.int(10, 18) : 0 };
      return p;
    }
    // queue of patients due to come back, per doctor: {pid, due, svc, until}
    const due = { d1: [], d2: [], d3: [], d4: [], d5: [] };
    const plan = (pid, docId, day, svcId) => due[docId].push({ pid, due: day, svc: svcId || null, until: U.addDays(day, 60) });
    // patients who were already on file before the history window
    for (let i = 0; i < 260; i++) {
      const doc = r.weighted(docWeights);
      const p = makePatient(U.addDays(T, -r.int(HIST + 20, 760)), doc);
      if (pType[p.id].kind === 'once' && r.chance(0.6)) continue; // lapsed long ago — never seen in the window
      plan(p.id, doc, U.addDays(T, -HIST + r.int(0, 200)));
    }
    function afterVisit(pid, docId, day, status, svcId) {
      const j = pType[pid];
      if (status === 'cancelled' || status === 'no_show') { if (r.chance(0.7)) plan(pid, docId, U.addDays(day, r.int(3, 12)), svcId); return; }
      if (j.course > 0) { j.course--; plan(pid, docId, U.addDays(day, r.int(7, 21))); return; }
      if (j.kind === 'ortho') {
        if (j.orthoLeft-- > 0) { plan(pid, docId, U.addDays(day, r.int(26, 38)), 'sv_adjust'); return; }
        j.kind = 'loyal'; plan(pid, docId, U.addDays(day, r.int(150, 200)), 'sv_retainer'); return;
      }
      if (j.kind === 'loyal') { if (r.chance(0.12)) { j.kind = 'once'; return; } plan(pid, r.chance(0.75) ? docId : 'd5', U.addDays(day, r.int(140, 230))); }
      else if (j.kind === 'occasional') { if (r.chance(0.3)) { j.kind = 'once'; return; } plan(pid, docId, U.addDays(day, r.int(270, 420))); }
    }
    function nextPatient(d, day) {
      const q = due[d.id];
      // drop people who waited too long (they went elsewhere)
      for (let k = q.length - 1; k >= 0; k--) if (q[k].until < day) q.splice(k, 1);
      let best = -1;
      for (let k = 0; k < q.length; k++) if (q[k].due <= day && (best < 0 || q[k].due < q[best].due)) best = k;
      if (best >= 0 && r.chance(0.92)) { const e = q.splice(best, 1)[0]; return { pid: e.pid, svc: e.svc, isNew: false }; }
      // someone already on file comes back with a new problem
      const seen = seenBy[d.id];
      if (seen.length && r.chance(0.3)) {
        const pid = r.pick(seen);
        if (lastVisit[pid] < U.addDays(day, -45) && pType[pid].kind !== 'ortho') return { pid, svc: null, isNew: false };
      }
      const p = makePatient(day > T ? U.addDays(T, -r.int(0, 6)) : U.addDays(day, -r.int(0, 4)), d.id);
      return { pid: p.id, svc: null, isNew: true };
    }
    const seenBy = { d1: [], d2: [], d3: [], d4: [], d5: [] }, lastVisit = {};
    const apptSrcWeights = A_SOURCES.filter((x) => x[2]).map((x) => [L(x[1]), x[2]]);

    // Appointments
    const appts = [];
    let aSeq = 1;
    for (let off = -HIST; off <= AHEAD; off++) {
      const day = U.addDays(T, off);
      if (U.dow(day) === 5) continue;
      const full = off >= -FULL;
      DOCTORS.forEach((d) => {
        if (onLeave(d.id, day)) return;
        // the clinic has grown: quieter days further back
        let count = off < -FULL ? r.int(1, 3) + (off > -150 ? 1 : 0) : off < 0 ? r.int(4, 7) : off === 0 ? r.int(6, 8) : off <= 4 ? r.int(4, 7) : off <= 10 ? r.int(2, 5) : r.int(0, 3);
        let t = openM + (r.chance(0.3) ? 30 : 0);
        for (let k = 0; k < count && t < closeM - 30; k++) {
          const who = nextPatient(d, day);
          let sid = who.svc || (who.isNew && r.chance(0.45) ? 'sv_consult' : r.weighted(d.mix));
          if (who.isNew && d.id === 'd3' && pType[who.pid].kind === 'ortho') sid = r.chance(0.6) ? 'sv_braces' : 'sv_aligner';
          const s = svc[sid];
          let dur = Math.max(30, Math.ceil(s.duration / 30) * 30);
          if (t + dur > closeM) break;
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
          // a new treatment course: some treatments need more visits
          const j = pType[who.pid];
          if (status === 'completed' && !who.svc && j.kind !== 'ortho') j.course = r.weighted([[0, 36], [1, 34], [2, 20], [3, 10]]);
          const a = { id: 'a' + (aSeq++), patientId: who.pid, doctorId: d.id, serviceId: sid, date: day, start, duration: dur, status };
          if (tooth) a.tooth = tooth;
          if (full) {
            const notesList = CLIN_NOTES[sid];
            Object.assign(a, {
              roomId: d.room, tooth,
              note: r.chance(0.08) ? L(r.pick(APPT_NOTES)) : '',
              clinicalNote: status === 'completed' && notesList && r.chance(0.6) ? L(r.pick(notesList)) : '',
              source: r.weighted(apptSrcWeights),
              reminded: off >= 0 && off <= 1 ? r.chance(0.5) : off < 0,
              createdBy: 's' + d.id.slice(1), createdAt: U.addDays(day, -r.int(1, 20)) + 'T10:00:00.000Z'
            });
          }
          appts.push(a);
          if (status === 'completed') { if (!(who.pid in lastVisit)) seenBy[d.id].push(who.pid); lastVisit[who.pid] = day; }
          if (off < 0 || (off === 0 && status === 'completed')) afterVisit(who.pid, d.id, day, status, sid);
          t = end + (r.chance(0.35) ? 30 : 0);
        }
      });
    }
    // first-visit date is when the file was opened for anyone booked for the first time
    const firstSeen = {};
    appts.forEach((a) => { if (!firstSeen[a.patientId] || a.date < firstSeen[a.patientId]) firstSeen[a.patientId] = a.date; });
    patients.forEach((p) => { if (firstSeen[p.id] && p.createdAt > firstSeen[p.id]) p.createdAt = firstSeen[p.id]; if (p.createdAt > T) p.createdAt = T; });

    // Tooth chart + clinical history from completed visits
    const pById = {};
    patients.forEach((p) => { pById[p.id] = p; });
    const shortDate = (s) => { const dt = U.parse(s); return lang === 'ku' ? U.d(dt.getDate()) + ' ' + ['ک.دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەممووز', 'ئاب', 'ئەیلوول', 'ت.یەکەم', 'ت.دووەم', 'ک.یەکەم'][dt.getMonth()] : dt.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getMonth()]; };
    appts.filter((a) => a.status === 'completed').sort(U.by((a) => a.date)).forEach((a) => {
      const p = pById[a.patientId];
      if (a.tooth && TOOTH_STATUS_BY_SERVICE[a.serviceId]) p.teeth[a.tooth] = { status: TOOTH_STATUS_BY_SERVICE[a.serviceId], note: svc[a.serviceId].name + ' — ' + shortDate(a.date), date: a.date };
      if (a.clinicalNote) p.clinical.push({ id: U.uid('cn'), date: a.date, doctorId: a.doctorId, text: a.clinicalNote, apptId: a.id });
    });
    const recentPts = {};
    appts.forEach((a) => { if (a.date >= U.addDays(T, -FULL)) recentPts[a.patientId] = 1; });
    patients.forEach((p) => {
      if (recentPts[p.id] && r.chance(0.35)) {
        const t = r.pick(TEETH_UP.concat(TEETH_LO));
        if (!p.teeth[t]) p.teeth[t] = { status: 'needs', note: L(['کلۆر — پێویستی بە چارەسەرە', 'Caries — needs treatment']), date: T };
        p.plan.push({ id: U.uid('pl'), tooth: t, serviceId: r.chance(0.6) ? 'sv_fill' : 'sv_rct', price: 0, status: 'planned', doctorId: p.doctorId, createdAt: T });
      }
      if (r.chance(0.08)) { const t = r.pick([18, 28, 38, 48]); if (!p.teeth[t]) p.teeth[t] = { status: 'missing', note: L(['لە دایکبوونەوە نییە', 'Congenitally missing']), date: '' }; }
      p.plan.forEach((it) => { it.price = svc[it.serviceId].price; });
    });

    // Invoices & payments
    const invoices = [], payments = [];
    let invSeq = 2000;
    const methods = [['cash', 56], ['card', 20], ['fib', 13], ['fastpay', 6], ['zaincash', 5]];
    const billFrom = U.addDays(T, -FULL);
    appts.filter((a) => a.status === 'completed' && a.date >= billFrom).sort(U.by((a) => a.date + a.start)).forEach((a) => {
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
    const ec = (id) => nameOf('expenseCategories', id);
    for (let m = 3; m >= 0; m--) {
      const base = U.addMonths(T, -m);
      const last = m === 0 ? T : U.endOfMonth(base);
      const lastDay = Number(last.slice(8));
      const add = (cat, amt, note, day) => expenses.push({ id: U.uid('ex'), category: ec(cat), amount: amt, note: L(note), date: base.slice(0, 8) + U.pad(Math.min(day, lastDay)) });
      add('ec_rent', 12000000, ['کرێی مانگانەی نهۆمی ٣', 'Monthly rent, 3rd floor'], 1);
      add('ec_salary', 9500000, ['موچەی ٥ سکرتێر و یاریدەدەرەکان', 'Salaries for 5 secretaries and assistants'], 28);
      add('ec_power', r.int(18, 26) * 100000, ['وەسڵی کارەبا و مۆلیدە', 'Electricity and generator bills'], 10);
      add('ec_supply', r.int(70, 110) * 100000, ['کۆمپۆزیت، دەرزی، دەستکێش، ماسک', 'Composite, needles, gloves, masks'], 5);
      add('ec_supply', r.int(20, 45) * 100000, ['فایلی ڕەگ و گۆتاپێرکا', 'Endo files and gutta-percha'], 18);
      add('ec_lab', r.int(45, 80) * 100000, ['کراون و ڤینیەری مانگ', 'Crowns and veneers this month'], 25);
      add('ec_ads', r.int(5, 12) * 100000, ['ڕیکلامی ئینستاگرام', 'Instagram ads'], 3);
      add('ec_repair', r.int(2, 8) * 100000, ['چاککردنەوەی کورسی و کۆمپرێسەر', 'Chair and compressor repair'], 14);
      add('ec_net', 350000, ['ئینتەرنێت و هێڵەکان', 'Internet and phone lines'], 7);
    }
    const expensesFinal = expenses.filter((e) => e.date <= T);

    const ic = (id) => nameOf('inventoryCategories', id), un = (id) => nameOf('inventoryUnits', id), su = (id) => nameOf('suppliers', id);
    const inventory = [
      ['کۆمپۆزیتی 3M Filtek A2', 'Composite 3M Filtek A2', 'ic_fill', 'un_syr', 14, 10, 45000, 'su_aso'],
      ['کۆمپۆزیتی 3M Filtek A3', 'Composite 3M Filtek A3', 'ic_fill', 'un_syr', 6, 10, 45000, 'su_aso'],
      ['دەرزی بێهۆشکردن (Articaine)', 'Anaesthetic cartridges (Articaine)', 'ic_anes', 'un_box', 9, 6, 60000, 'su_zhian'],
      ['دەستکێشی نایترێل M', 'Nitrile gloves M', 'ic_ppe', 'un_box', 22, 15, 9000, 'su_aso'],
      ['دەستکێشی نایترێل S', 'Nitrile gloves S', 'ic_ppe', 'un_box', 4, 10, 9000, 'su_aso'],
      ['ماسکی پزیشکی', 'Medical masks', 'ic_ppe', 'un_box', 30, 12, 5000, 'su_aso'],
      ['فایلی ڕەگ ProTaper Gold', 'ProTaper Gold files', 'ic_endo', 'un_pack', 7, 5, 120000, 'su_dent'],
      ['گۆتاپێرکا', 'Gutta-percha points', 'ic_endo', 'un_box', 12, 6, 25000, 'su_dent'],
      ['ئیمپلانتی Straumann BLT 4.1×10', 'Straumann BLT implant 4.1×10', 'ic_impl', 'un_pc', 4, 6, 420000, 'su_str'],
      ['ئیمپلانتی Straumann BLT 3.3×12', 'Straumann BLT implant 3.3×12', 'ic_impl', 'un_pc', 7, 4, 420000, 'su_str'],
      ['بۆن گرافت Bio-Oss 0.5g', 'Bio-Oss bone graft 0.5g', 'ic_impl', 'un_pc', 3, 4, 180000, 'su_geist'],
      ['جێلی سپیکردنەوە Opalescence', 'Opalescence whitening gel', 'ic_cos', 'un_kit', 5, 3, 95000, 'su_ultra'],
      ['برەکێتی سیرامیک', 'Ceramic brackets', 'ic_ortho', 'un_kit', 6, 4, 140000, 'su_ortho'],
      ['وایەری NiTi 0.016', 'NiTi wire 0.016', 'ic_ortho', 'un_pack', 18, 10, 30000, 'su_ortho'],
      ['ماددەی قاڵب (Alginate)', 'Alginate impression material', 'ic_imp', 'un_pack', 8, 5, 22000, 'su_aso'],
      ['سیمێنتی چەسپاندن RelyX', 'RelyX luting cement', 'ic_pros', 'un_syr', 5, 4, 85000, 'su_aso'],
      ['بەتانی کۆمپرێس و گاز', 'Gauze and cotton rolls', 'ic_gen', 'un_pack', 40, 20, 3000, 'su_zhian'],
      ['ماددەی پاککەرەوەی ئامێر', 'Instrument disinfectant', 'ic_clean', 'un_l', 9, 6, 15000, 'su_aso']
    ].map((x, i) => ({ id: 'it' + (i + 1), name: lang === 'ku' ? x[0] : x[1], category: ic(x[2]), unit: un(x[3]), qty: x[4], min: x[5], cost: x[6], supplier: su(x[7]), updatedAt: U.addDays(T, -r.int(0, 20)) }));

    const lt = (id) => nameOf('labWorkTypes', id);
    const labTypes = { sv_crown: lt('lt_zr'), sv_emax: lt('lt_emaxv'), sv_implant: lt('lt_impc'), sv_aligner: lt('lt_align'), sv_retainer: lt('lt_ret') };
    const labs = lists.labs.map((x) => x.name);
    const labOrders = [];
    appts.filter((a) => labTypes[a.serviceId] && a.status !== 'cancelled' && a.date >= U.addDays(T, -35) && a.date <= T).forEach((a, i) => {
      const sent = a.date;
      const due = U.addDays(sent, a.serviceId === 'sv_aligner' ? 21 : a.serviceId === 'sv_implant' ? 90 : 7);
      let status = due < T ? (r.chance(0.6) ? 'fitted' : 'received') : U.diffDays(T, sent) <= 2 ? 'sent' : 'in_progress';
      if (a.serviceId === 'sv_implant') status = 'in_progress';
      labOrders.push({ id: 'lab' + (i + 1), patientId: a.patientId, doctorId: a.doctorId, type: labTypes[a.serviceId], tooth: a.tooth, shade: r.pick(['A1', 'A2', 'B1', 'BL2', 'A3']), lab: a.serviceId === 'sv_aligner' ? labs[2] : r.pick(labs.slice(0, 2)), sentDate: sent, dueDate: due, status, cost: a.serviceId === 'sv_aligner' ? 1200000 : r.int(8, 20) * 10000, note: '' });
    });

    const as = (id) => nameOf('apptSources', id);
    const requests = [
      { id: 'rq1', name: L(['هێرۆ ئیسماعیل', 'Hero Ismail']), phone: '07502234455', service: L(['سپیکردنەوەی ددان', 'Teeth whitening']), preferred: U.addDays(T, 2) + ' 15:00', doctorId: 'd2', source: as('as_ig'), status: 'pending', createdAt: U.stamp() },
      { id: 'rq2', name: L(['بەختیار سەعید', 'Bakhtiyar Saeed']), phone: '07518801234', service: L(['ئازاری ددان — بەپەلە', 'Toothache — urgent']), preferred: T + ' 18:00', doctorId: 'd1', source: as('as_wa'), status: 'pending', createdAt: U.stamp() },
      { id: 'rq3', name: L(['نیشتمان کەریم', 'Nishtman Karim']), phone: '07704456678', service: L(['ئەلاینەری ڕوون', 'Clear aligners']), preferred: U.addDays(T, 3) + ' 17:30', doctorId: 'd3', source: as('as_web'), status: 'pending', createdAt: U.stamp() },
      { id: 'rq4', name: L(['ڕێبوار محەمەد', 'Rebwar Mohammed']), phone: '07509913321', service: L(['ڕاوێژی ئیمپلانت', 'Implant consultation']), preferred: U.addDays(T, 4) + ' 13:00', doctorId: 'd4', source: as('as_web'), status: 'pending', createdAt: U.stamp() },
      { id: 'rq5', name: L(['ئاڤا جەمال', 'Ava Jamal']), phone: '07821234567', service: L(['پشکنینی منداڵ (٧ ساڵ)', 'Child check-up (age 7)']), preferred: U.addDays(T, 1) + ' 16:00', doctorId: 'd5', source: as('as_ig'), status: 'pending', createdAt: U.stamp() }
    ];

    const audit = [];
    const al = (daysAgo, h, userId, action, details) => audit.push({ id: U.uid('lg'), at: new Date(U.parse(U.addDays(T, -daysAgo)).setHours(h, r.int(0, 59))).toISOString(), userId, action, details: L(details) });
    al(0, Math.min(20, Math.max(12, Math.floor(nowM / 60))), 's1', 'appointment', ['نۆرەی نوێی بۆ ' + patients[3].name + ' تۆمار کرد', 'Booked a new appointment for ' + patients[3].name]);
    al(0, 13, 's2', 'payment', ['پارەدانی ٧٥٠,٠٠٠ د.ع ی وەرگرت', 'Received a payment of 750,000 IQD']);
    al(0, 12, 'u_owner', 'settings', ['نرخی سپیکردنەوەی گۆڕی بۆ ٣٥٠,٠٠٠', 'Changed the whitening price to 350,000']);
    al(1, 20, 'd1', 'appointment', ['٣ نۆرەی هەفتەی داهاتووی گواستەوە', 'Moved 3 appointments next week']);
    al(1, 14, 'u_owner', 'leave', ['مۆڵەتی د. کاروان مەحمودی بۆ ئەمڕۆ تۆمار کرد', 'Recorded leave for Dr. Karwan Mahmood today']);
    al(2, 16, 's4', 'lab', ['داواکاری تاقیگەی بۆ کراونی ئیمپلانت نارد', 'Sent a lab order for an implant crown']);
    al(3, 12, 'u_owner', 'user', ['هەژماری ئاری جەلال ی چالاک کرد', 'Activated Ari Jalal\'s account']);
    al(5, 18, 's3', 'patient', ['پەڕگەی نەخۆشی نوێی دروست کرد', 'Created a new patient file']);
    al(7, 15, 'u_owner', 'inventory', ['١٠ دانە ئیمپلانتی زیاد کرد بۆ کۆگا', 'Added 10 implants to inventory']);

    return {
      version: 3, seededAt: T, lang, pristine: true,
      settings: {
        clinicName: 'Bite for Dentistry', clinicNameKu: 'بایت بۆ ددان', address: L(['نێرگز پلازا، نهۆمی ٣، شەقامی گوڵان، هەولێر', 'Nergz Plaza, 3rd floor, Gulan Street, Erbil']), phone: '07505430000', email: 'info@bite.krd', website: 'bite.krd',
        open: '12:00', close: '21:00', closedDays: [5], slot: 30, digits: 'ar', theme: 'light',
        reminderTemplate: L(['سڵاو {name} 🌿\nبیرخستنەوەی نۆرەکەت لە Bite for Dentistry:\n📅 {date} — کاتژمێر {time}\n👩‍⚕️ {doctor}\nتکایە ١٠ خولەک پێشتر ئامادە بە. بۆ گۆڕین پەیوەندی بکە: 0750 543 0000', 'Hello {name} 🌿\nA reminder of your appointment at Bite for Dentistry:\n📅 {date} at {time}\n👩‍⚕️ {doctor}\nPlease arrive 10 minutes early. To change it, call us on 0750 543 0000.']),
        retentionMonths: 6, recallTemplate: L(RECALL),
        autoReminders: true, onlineBooking: true, approveOnline: true, reviewRequest: true, weeklyReport: false, invoiceNote: L(['سوپاس بۆ متمانەتان. هەموو چارەسەرەکان گەرەنتی کوالیتییان هەیە.', 'Thank you for your trust. All treatments come with a quality guarantee.']),
        logo: '', permissions: JSON.parse(JSON.stringify(ROLE_DEFAULTS))
      },
      lists,
      users, rooms, services, patients, appointments: appts, invoices, payments, expenses: expensesFinal, inventory, labOrders, requests, leaves, audit
    };
  }

  const RECALL = ['سڵاو {name} 🌿\nماوەیەکە سەردانی Bite for Dentistry ت نەکردووە (دوایین سەردان: {date}).\nپشکنینی ددان هەر {months} مانگ جارێک ددانەکانت تەندروست دەهێڵێتەوە.\nبۆ گرتنی نۆرە وەڵامی ئەم نامەیە بدەرەوە یان پەیوەندی بکە: 0750 543 0000', 'Hello {name} 🌿\nIt has been a while since your last visit to Bite for Dentistry ({date}).\nA check-up every {months} months keeps your teeth healthy.\nReply to this message to book, or call us on 0750 543 0000.'];
  const listsFor = (lang) => buildLists((pair) => (Array.isArray(pair) ? (lang === 'ku' ? pair[0] : pair[1]) : pair));
  window.Seed = { build, buildLists: listsFor, recallTemplate: (lang) => (lang === 'ku' ? RECALL[0] : RECALL[1]), PERMS, ROLE_DEFAULTS, TEETH_UP, TEETH_LO };
})();
