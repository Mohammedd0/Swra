/* My account: details, password, appearance, what this role can do */
(function () {
  const esc = U.esc;
  Pages.profile = {
    title: 'هەژماری من',
    render() {
      const me = Store.me;
      const dark = document.documentElement.dataset.theme === 'dark';
      const perms = Seed.PERMS.map(([k, l]) => [l, Store.can(k)]);
      return '<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">هەژماری من</span><h1 class="page-title">' + esc(me.name) + '</h1></div></div>' +
        '<div class="split"><div class="stack">' +
        '<section class="card"><div class="p-head"><div class="who">' + UI.av(me.name, me.role === 'doctor' ? me.color : null, 'xl') + '<span class="col" style="gap:2px"><b>' + esc(me.name) + '</b><span class="small muted">' + esc(Store.ROLES[me.role]) + (me.role === 'secretary' ? ' · ' + esc(Store.scopeLabel()) : '') + ' · <span class="latin">' + esc(me.username) + '</span></span><span class="small muted">دوایین چوونەژوورەوە: ' + (me.lastLogin ? U.fmtStamp(me.lastLogin) : '—') + '</span></span></div></div></section>' +
        '<section class="card"><div class="card-head"><span class="card-title">' + I('user') + 'زانیاری پەیوەندی</span></div><form class="form" id="mf" novalidate>' + UI.field('ناو', '<input class="input" name="name" value="' + esc(me.name) + '"' + (me.role === 'owner' ? '' : ' readonly title="تەنها خاوەن دەتوانێت ناو بگۆڕێت"') + '>', { req: true }) + UI.field('مۆبایل', '<input class="input" name="phone" dir="ltr" style="text-align:right" value="' + esc(me.phone || '') + '">') + UI.field('ئیمەیڵ', '<input class="input" name="email" dir="ltr" style="text-align:right" value="' + esc(me.email || '') + '">', { full: true }) + '<div class="full"><button type="button" class="btn primary" data-save>پاشەکەوتکردن</button></div></form></section>' +
        '<section class="card"><div class="card-head"><span class="card-title">' + I('lock') + 'گۆڕینی وشەی نهێنی</span></div><form class="form" id="pwf" novalidate>' + UI.field('وشەی نهێنی ئێستا', '<input class="input" type="password" name="cur" autocomplete="current-password">', { req: true, full: true }) + UI.field('وشەی نهێنی نوێ', '<input class="input" type="password" name="n1" autocomplete="new-password">', { req: true }) + UI.field('دووبارە', '<input class="input" type="password" name="n2" autocomplete="new-password">', { req: true }) + '<div class="full"><button type="button" class="btn" data-pw>گۆڕین</button></div></form></section>' +
        '<section class="card"><div class="card-head"><span class="card-title">' + I(dark ? 'moon' : 'sun') + 'ڕووکار</span></div><div class="li" style="border:none"><span class="grow"><span class="t">دۆخی تاریک</span><span class="s">بۆ کارکردن لە ئێوارەدا ئاسوودەترە. تەنها لەسەر ئەم ئامێرە.</span></span><label class="switch"><input type="checkbox" data-dark' + (dark ? ' checked' : '') + '><span></span></label></div></section>' +
        '</div><section class="card"><div class="card-head"><span class="card-title">' + I('shield') + 'دەسەڵاتەکانم</span></div><p class="small muted" style="margin-top:0">' + (me.role === 'owner' ? 'وەک خاوەن، دەسەڵاتی تەواوت هەیە.' : me.role === 'doctor' ? 'تەنها داتای نەخۆش و نۆرەکانی خۆت دەبینیت.' : me.role === 'secretary' ? 'تەنها داتای ' + esc(Store.doctorName(me.doctorId)) + ' دەبینیت.' : '') + '</p><div class="list">' + perms.map(([l, ok]) => '<div class="li"><span class="grow">' + esc(l) + '</span>' + (ok ? '<span class="up">' + I('check', 'sm') + '</span>' : '<span class="muted">' + I('x', 'sm') + '</span>') + '</div>').join('') + '</div></section></div>' +
        '<div class="row"><button class="btn danger" data-logout2>' + I('logout') + 'چوونەدەرەوە</button></div>';
    },
    mount(root) {
      const me = Store.me;
      root.querySelector('[data-save]').addEventListener('click', () => {
        const f = root.querySelector('#mf');
        if (!UI.validate(f, { name: UI.req(), phone: UI.phoneRule(false) })) return;
        const d = UI.data(f);
        Object.assign(me, { name: me.role === 'owner' ? d.name : me.name, phone: U.normPhone(d.phone), email: d.email });
        App._layoutFor = null;
        Store.commit('user', 'زانیاری هەژماری خۆی نوێ کردەوە');
        UI.toast('پاشەکەوت کرا');
      });
      root.querySelector('[data-pw]').addEventListener('click', () => {
        const f = root.querySelector('#pwf');
        if (!UI.validate(f, { cur: (v) => (v !== me.password ? 'وشەی نهێنی ئێستا هەڵەیە' : null), n1: (v) => (v.length < 4 ? 'لانیکەم ٤ پیت' : null), n2: (v) => (v !== f.n1.value ? 'وەک یەک نین' : null) })) return;
        me.password = f.n1.value;
        Store.commit('user', 'وشەی نهێنی خۆی گۆڕی', { silent: true });
        f.reset();
        UI.toast('وشەی نهێنی گۆڕا');
      });
      root.querySelector('[data-dark]').addEventListener('change', () => App.toggleTheme());
      root.querySelector('[data-logout2]').addEventListener('click', () => { Store.logout(); App._layoutFor = null; location.hash = '#/login'; App.render(); });
    }
  };
})();
