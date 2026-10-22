/* App shell: routing, layout, global search, notifications, theme */
(function () {
  const esc = U.esc;
  window.Pages = window.Pages || {};

  const NAV = [
    { section: 'سەرەکی' },
    { key: 'dashboard', label: 'داشبۆرد', icon: 'home' },
    { key: 'appointments', label: 'نۆرەکان', icon: 'calendar', badge: () => { const n = Store.db.requests.filter((r) => r.status === 'pending' && Store.inScope(r.doctorId)).length; return Store.can('create_appointments') && n ? n : 0; } },
    { key: 'patients', label: 'نەخۆشەکان', icon: 'users' },
    { key: 'doctors', label: () => (Store.me.role === 'owner' || Store.can('view_all') ? 'دکتۆرەکان' : Store.me.role === 'doctor' ? 'پرۆفایلی من' : 'دکتۆرەکەم'), icon: 'stethoscope' },
    { section: 'دارایی و کار', perm: () => Store.can('billing') || Store.can('view_finance') || Store.can('view_reports') || Store.can('manage_inventory') || Store.can('manage_lab') },
    { key: 'billing', label: 'پارە و حیساب', icon: 'wallet', perm: () => Store.can('billing') || Store.can('view_finance') },
    { key: 'reports', label: 'ڕاپۆرتەکان', icon: 'bars', perm: () => Store.can('view_reports') },
    { key: 'lab', label: 'تاقیگە (لاب)', icon: 'flask', perm: () => Store.can('manage_lab'), badge: () => Store.db.labOrders.filter((l) => l.status === 'received' && Store.inScope(l.doctorId)).length },
    { key: 'inventory', label: 'کۆگا', icon: 'box', perm: () => Store.can('manage_inventory'), badge: () => Store.db.inventory.filter((i) => i.qty <= i.min).length },
    { section: 'سیستەم', perm: () => App.canAdmin() },
    { key: 'admin', label: 'بەڕێوەبردن', icon: 'shield', perm: () => App.canAdmin() }
  ];

  const App = {
    route: { path: '', parts: [], params: {} },
    canAdmin() { return Store.can('manage_users') || Store.can('manage_services') || Store.can('manage_settings') || Store.can('view_audit') || Store.can('export_data'); },
    canRoute(key) {
      const n = NAV.find((x) => x.key === key);
      if (!n) return key === 'profile';
      return !n.perm || n.perm();
    },
    parse() {
      const h = location.hash.replace(/^#\/?/, '');
      const [path, qs] = h.split('?');
      const params = {};
      (qs || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
      const parts = (path || '').split('/').filter(Boolean);
      return { path: parts[0] || '', parts, params };
    },
    go(hash) { if (location.hash === hash) App.render(); else location.hash = hash; },
    setParams(patch, replace) {
      const p = Object.assign({}, App.route.params, patch);
      Object.keys(p).forEach((k) => { if (p[k] === null || p[k] === undefined || p[k] === '') delete p[k]; });
      const qs = Object.keys(p).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(p[k])).join('&');
      const hash = '#/' + App.route.parts.join('/') + (qs ? '?' + qs : '');
      if (replace) { history.replaceState(null, '', hash); App.render(); } else location.hash = hash;
    },
    start() {
      Store.init();
      App.applyTheme();
      window.addEventListener('hashchange', () => App.render());
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          const s = document.getElementById('gsearch');
          if (s) { e.preventDefault(); s.focus(); s.select(); }
        }
      });
      document.addEventListener('click', (e) => {
        const k = e.target.closest('[data-href]');
        if (k && !e.target.closest('a,button,input,select,textarea')) { App.go(k.dataset.href); }
        if (!e.target.closest('.pop') && !e.target.closest('[data-pop]')) App.closePops();
      });
      document.addEventListener('keydown', (e) => {
        const k = e.target.closest && e.target.closest('[data-href]');
        if (k && (e.key === 'Enter' || e.key === ' ') && e.target === k) { e.preventDefault(); App.go(k.dataset.href); }
      });
      App.render();
    },
    applyTheme() {
      let t = 'light';
      try { t = localStorage.getItem('bite_crm_theme') || 'light'; } catch (e) { /* ignore */ }
      document.documentElement.dataset.theme = t;
      const meta = document.querySelector('meta[name=theme-color]');
      if (meta) meta.content = t === 'dark' ? '#0B1222' : '#1B2B4F';
    },
    toggleTheme() {
      const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('bite_crm_theme', t); } catch (e) { /* ignore */ }
      App.applyTheme();
      App.render();
    },
    render() {
      App.route = App.parse();
      const r = App.route;
      Charts.destroyAll();
      App.closePops();
      if (!Store.me) {
        if (r.path !== 'login') { history.replaceState(null, '', '#/login'); App.route = App.parse(); }
        document.getElementById('app').innerHTML = Pages.login.render();
        Pages.login.mount(document.getElementById('app'));
        document.title = 'چوونەژوورەوە — Bite CRM';
        return;
      }
      if (!r.path || r.path === 'login') { history.replaceState(null, '', '#/dashboard'); App.route = App.parse(); }
      if (!document.querySelector('.layout') || App._layoutFor !== Store.me.id + document.documentElement.dataset.theme) App.renderLayout();
      App.renderNav();
      const key = App.route.path;
      const page = Pages[key];
      const old = document.getElementById('page');
      const host = old.cloneNode(false);
      old.replaceWith(host);
      if (!page) { host.innerHTML = '<div class="card">' + UI.empty('ئەم پەڕەیە بوونی نییە', 'alert', '<a class="btn" href="#/dashboard">گەڕانەوە بۆ داشبۆرد</a>') + '</div>'; return; }
      if (!App.canRoute(key)) { host.innerHTML = '<div class="card">' + UI.empty('دەسەڵاتی بینینی ئەم بەشەت نییە. خاوەنی کلینیک دەتوانێت لە بەشی بەڕێوەبردنەوە دەسەڵاتت پێبدات.', 'lock', '<a class="btn" href="#/dashboard">گەڕانەوە بۆ داشبۆرد</a>') + '</div>'; return; }
      const sameRoute = App._lastPath === location.hash.split('?')[0];
      const y = window.scrollY;
      try {
        host.innerHTML = page.render(App.route);
        if (page.mount) page.mount(host, App.route);
      } catch (err) {
        console.error(err);
        host.innerHTML = '<div class="card">' + UI.empty('هەڵەیەک ڕوویدا لە پیشاندانی ئەم پەڕەیە: ' + err.message, 'alert', '<button class="btn" onclick="location.reload()">نوێکردنەوە</button>') + '</div>';
      }
      host.querySelectorAll('[data-href]').forEach((el) => { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0'); });
      document.title = (typeof page.title === 'function' ? page.title(App.route) : page.title) + ' — Bite CRM';
      if (sameRoute && App._keepScroll) window.scrollTo(0, y); else if (!sameRoute) window.scrollTo(0, 0);
      App._keepScroll = false;
      App._lastPath = location.hash.split('?')[0];
      document.querySelector('.layout').classList.remove('drawer-open');
    },
    onDataChange() { App._keepScroll = true; App.render(); },
    renderLayout() {
      const me = Store.me;
      App._layoutFor = me.id + document.documentElement.dataset.theme;
      const dark = document.documentElement.dataset.theme === 'dark';
      document.getElementById('app').innerHTML =
        '<div class="layout">' +
        '<aside class="sidebar" aria-label="مێنیوی سەرەکی">' + UI.brand() + '<nav id="nav" style="display:flex;flex-direction:column;gap:2px"></nav>' +
        '<div class="sidebar-foot"><a class="me" href="#/profile" style="text-decoration:none">' + UI.av(me.name, me.role === 'doctor' ? me.color : '#67CDAB') + '<span class="grow"><b style="font-weight:600">' + esc(me.name) + '</b><small>' + esc(Store.ROLES[me.role]) + (me.role === 'secretary' ? ' · ' + esc(Store.scopeLabel()) : '') + '</small></span></a>' +
        '<button class="nav-link" data-logout style="border:none;background:none;cursor:pointer;width:100%;text-align:start">' + I('logout') + 'چوونەدەرەوە</button></div></aside>' +
        '<div class="drawer-mask" data-drawer-close></div>' +
        '<div class="main"><header class="topbar">' +
        '<button class="icon-btn menu-btn" data-drawer aria-label="کردنەوەی مێنیو">' + I('menu') + '</button>' +
        '<div class="search"><label for="gsearch" class="sr-only">گەڕان</label>' + I('search') + '<input id="gsearch" autocomplete="off" placeholder="گەڕان بۆ نەخۆش، مۆبایل، ژمارەی پەڕگە…"><kbd>Ctrl K</kbd><div class="search-results hidden" id="gsr"></div></div>' +
        '<div class="topbar-actions">' +
        '<div style="position:relative"><button class="btn accent desk-only" data-pop="quick">' + I('plus') + 'زیادکردن</button><button class="icon-btn mobile-only" data-pop="quick" aria-label="زیادکردن" style="background:var(--mint);border-color:var(--mint);color:var(--navy)">' + I('plus') + '</button><div class="pop hidden" id="pop-quick" style="width:240px"></div></div>' +
        '<button class="icon-btn desk-only" data-theme-toggle aria-label="گۆڕینی ڕووکار">' + I(dark ? 'sun' : 'moon') + '</button>' +
        '<div style="position:relative"><button class="icon-btn" data-pop="notif" aria-label="ئاگادارییەکان">' + I('bell') + '<span class="dot hidden" id="notif-dot"></span></button><div class="pop hidden" id="pop-notif"></div></div>' +
        '</div></header>' +
        '<main class="content" id="page"></main></div>' +
        '<nav class="mbnav" id="mbnav" aria-label="مێنیوی خوارەوە"></nav>' +
        '</div>';
      const L = document.querySelector('.layout');
      L.addEventListener('click', (e) => {
        if (e.target.closest('[data-logout]')) { Store.logout(); App._layoutFor = null; location.hash = '#/login'; App.render(); UI.toast('بە سەلامەتی'); }
        if (e.target.closest('[data-drawer]')) { e.preventDefault(); L.classList.add('drawer-open'); }
        if (e.target.closest('[data-drawer-close]')) L.classList.remove('drawer-open');
        if (e.target.closest('[data-theme-toggle]')) App.toggleTheme();
        const pb = e.target.closest('[data-pop]');
        if (pb) { const id = 'pop-' + pb.dataset.pop; const el = document.getElementById(id); const was = !el.classList.contains('hidden'); App.closePops(); if (!was) { App.fillPop(pb.dataset.pop, el); el.classList.remove('hidden'); } }
        const qa = e.target.closest('[data-quick]');
        if (qa) { App.closePops(); App.quick(qa.dataset.quick); }
      });
      App.mountSearch();
    },
    renderNav() {
      const cur = App.route.path;
      const html = NAV.filter((n) => !n.perm || n.perm()).map((n) => {
        if (n.section) return '<div class="nav-label">' + esc(n.section) + '</div>';
        const label = typeof n.label === 'function' ? n.label() : n.label;
        const b = n.badge ? n.badge() : 0;
        return '<a class="nav-link ' + (cur === n.key ? 'active' : '') + '" href="#/' + n.key + '"' + (cur === n.key ? ' aria-current="page"' : '') + '>' + I(n.icon) + '<span>' + esc(label) + '</span>' + (b ? '<span class="nav-badge">' + U.num(b) + '</span>' : '') + '</a>';
      }).join('');
      document.getElementById('nav').innerHTML = html;
      const mb = [['dashboard', 'داشبۆرد', 'home'], ['appointments', 'نۆرەکان', 'calendar'], ['patients', 'نەخۆشەکان', 'users']];
      if (App.canRoute('billing')) mb.push(['billing', 'پارە', 'wallet']); else mb.push(['doctors', 'دکتۆر', 'stethoscope']);
      document.getElementById('mbnav').innerHTML = mb.map((m) => '<a href="#/' + m[0] + '" class="' + (cur === m[0] ? 'active' : '') + '">' + I(m[2]) + '<span>' + m[1] + '</span></a>').join('') + '<a href="#" data-drawer>' + I('menu') + '<span>زیاتر</span></a>';
      const n = Store.notifications();
      const dot = document.getElementById('notif-dot');
      if (dot) dot.classList.toggle('hidden', !n.length);
    },
    closePops() { document.querySelectorAll('.pop').forEach((p) => p.classList.add('hidden')); },
    fillPop(kind, el) {
      if (kind === 'notif') {
        const list = Store.notifications();
        el.innerHTML = '<div class="pop-head"><b>ئاگادارییەکان</b><span class="badge">' + U.num(list.length) + '</span></div>' + (list.length ? list.map((n) => '<a class="alert ' + n.type + '" href="' + n.href + '" style="text-decoration:none">' + I(n.icon) + '<span>' + esc(n.text) + '</span></a>').join('') : UI.empty('هیچ ئاگادارییەک نییە. هەموو شتێک ڕێکە.', 'check'));
        el.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => App.closePops()));
      }
      if (kind === 'quick') {
        const items = [];
        if (Store.can('create_appointments')) items.push(['appt', 'calendar', 'نۆرەی نوێ']);
        if (Store.can('manage_patients')) items.push(['patient', 'user', 'نەخۆشی نوێ']);
        if (Store.can('billing')) items.push(['invoice', 'receipt', 'پسوولەی نوێ']);
        if (Store.can('manage_expenses')) items.push(['expense', 'wallet', 'خەرجی نوێ']);
        if (Store.can('manage_lab')) items.push(['lab', 'flask', 'داواکاری تاقیگە']);
        el.innerHTML = items.length ? items.map((i) => '<button class="menu-item" data-quick="' + i[0] + '">' + I(i[1]) + i[2] + '</button>').join('') : UI.empty('هیچ کردارێک بەردەست نییە', 'lock');
      }
    },
    quick(kind) {
      if (kind === 'appt') Pages.appointments.openForm({});
      if (kind === 'patient') Pages.patients.openForm();
      if (kind === 'invoice') Pages.billing.openInvoiceForm({});
      if (kind === 'expense') Pages.billing.openExpenseForm();
      if (kind === 'lab') Pages.lab.openForm({});
    },
    mountSearch() {
      const inp = document.getElementById('gsearch');
      const box = document.getElementById('gsr');
      let sel = 0, items = [];
      const draw = () => {
        const q = inp.value.trim();
        if (!q) { box.classList.add('hidden'); return; }
        const pts = Store.visiblePatients().filter((p) => U.search(p.name + ' ' + p.phone + ' ' + p.fileNo, q)).slice(0, 7);
        const docs = Store.scopedDoctors(true).filter((d) => U.search(d.name + ' ' + d.specialty, q)).slice(0, 3);
        items = pts.map((p) => ({ href: '#/patients/' + p.id, html: UI.who(p.name, 'پەڕگە #' + U.d(p.fileNo) + ' · ' + U.fmtPhone(p.phone), null, 'sm') }))
          .concat(docs.map((d) => ({ href: '#/doctors/' + d.id, html: UI.who(d.name, esc(d.specialty), d.color, 'sm') })));
        if (Store.can('manage_patients')) items.push({ href: null, action: 'new', html: '<span class="row">' + I('plus') + 'تۆمارکردنی «' + esc(q) + '» وەک نەخۆشی نوێ</span>' });
        sel = 0;
        box.innerHTML = items.length ? items.map((it, i) => '<a class="search-item ' + (i === sel ? 'on' : '') + '" ' + (it.href ? 'href="' + it.href + '"' : 'href="#" data-new="1"') + ' data-i="' + i + '">' + it.html + '</a>').join('') : '<div class="empty" style="padding:16px">هیچ ئەنجامێک نییە</div>';
        box.classList.remove('hidden');
      };
      const choose = (i) => {
        const it = items[i];
        if (!it) return;
        box.classList.add('hidden');
        const q = inp.value.trim();
        inp.value = '';
        if (it.action === 'new') Pages.patients.openForm({ name: /\d/.test(q) ? '' : q, phone: /\d/.test(q) ? q : '' });
        else App.go(it.href);
      };
      inp.addEventListener('input', U.debounce(draw, 120));
      inp.addEventListener('focus', draw);
      inp.addEventListener('keydown', (e) => {
        if (box.classList.contains('hidden')) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          box.querySelectorAll('.search-item').forEach((el, i) => el.classList.toggle('on', i === sel));
        }
        if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
        if (e.key === 'Escape') { box.classList.add('hidden'); inp.blur(); }
      });
      box.addEventListener('click', (e) => { const a = e.target.closest('.search-item'); if (a) { e.preventDefault(); choose(Number(a.dataset.i)); } });
      document.addEventListener('click', (e) => { if (!e.target.closest('.search')) box.classList.add('hidden'); });
    }
  };
  window.App = App;
  document.addEventListener('DOMContentLoaded', () => App.start());
})();
