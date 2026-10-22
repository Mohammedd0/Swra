/* My account: details, password, appearance, what this role can do */
(function () {
  const esc = U.esc;
  Pages.profile = {
    title: _t('هەژماری من'),
    render() {
      const me = Store.me;
      const dark = document.documentElement.dataset.theme === 'dark';
      const perms = Seed.PERMS.map(([k, l]) => [l, Store.can(k)]);
      return _t('<div class="page-head"><div class="col" style="gap:2px"><span class="eyebrow">هەژماری من</span><h1 class="page-title">') + esc(me.name) + '</h1></div></div>' +
        '<div class="split"><div class="stack">' +
        '<section class="card"><div class="p-head"><div class="who">' + UI.av(me.name, me.role === 'doctor' ? me.color : null, 'xl') + '<span class="col" style="gap:2px"><b>' + esc(me.name) + '</b><span class="small muted">' + esc(Store.ROLES[me.role]) + (me.role === 'secretary' ? ' · ' + esc(Store.scopeLabel()) : '') + ' · <span class="latin">' + esc(me.username) + _t('</span></span><span class="small muted">دوایین چوونەژوورەوە: ') + (me.lastLogin ? U.fmtStamp(me.lastLogin) : '—') + '</span></span></div></div></section>' +
        '<section class="card"><div class="card-head"><span class="card-title">' + I('user') + _t('زانیاری پەیوەندی</span></div><form class="form" id="mf" novalidate>') + UI.field(_t('ناو'), '<input class="input" name="name" value="' + esc(me.name) + '"' + (me.role === 'owner' ? '' : _t(' readonly title="تەنها خاوەن دەتوانێت ناو بگۆڕێت"')) + '>', { req: true }) + UI.field(_t('مۆبایل'), '<input class="input" name="phone" dir="ltr" style="text-align:right" value="' + esc(me.phone || '') + '">') + UI.field(_t('ئیمەیڵ'), '<input class="input" name="email" dir="ltr" style="text-align:right" value="' + esc(me.email || '') + '">', { full: true }) + _t('<div class="full"><button type="button" class="btn primary" data-save>پاشەکەوتکردن</button></div></form></section>') +
        '<section class="card"><div class="card-head"><span class="card-title">' + I('lock') + _t('گۆڕینی وشەی نهێنی</span></div><form class="form" id="pwf" novalidate>') + UI.field(_t('وشەی نهێنی ئێستا'), '<input class="input" type="password" name="cur" autocomplete="current-password">', { req: true, full: true }) + UI.field(_t('وشەی نهێنی نوێ'), '<input class="input" type="password" name="n1" autocomplete="new-password">', { req: true }) + UI.field(_t('دووبارە'), '<input class="input" type="password" name="n2" autocomplete="new-password">', { req: true }) + _t('<div class="full"><button type="button" class="btn" data-pw>گۆڕین</button></div></form></section>') +
        '<section class="card"><div class="card-head"><span class="card-title">' + I(dark ? 'moon' : 'sun') + _t('ڕووکار</span></div><div class="li" style="border:none"><span class="grow"><span class="t">دۆخی تاریک</span><span class="s">بۆ کارکردن لە ئێوارەدا ئاسوودەترە. تەنها لەسەر ئەم ئامێرە.</span></span><label class="switch"><input type="checkbox" data-dark') + (dark ? ' checked' : '') + '><span></span></label></div></section>' +
        '</div><section class="card"><div class="card-head"><span class="card-title">' + I('shield') + _t('دەسەڵاتەکانم</span></div><p class="small muted" style="margin-top:0">') + (me.role === 'owner' ? _t('وەک خاوەن، دەسەڵاتی تەواوت هەیە.') : me.role === 'doctor' ? _t('تەنها داتای نەخۆش و نۆرەکانی خۆت دەبینیت.') : me.role === 'secretary' ? _t('تەنها داتای ') + esc(Store.doctorName(me.doctorId)) + _t(' دەبینیت.') : '') + '</p><div class="list">' + perms.map(([l, ok]) => '<div class="li"><span class="grow">' + esc(l) + '</span>' + (ok ? '<span class="up">' + I('check', 'sm') + '</span>' : '<span class="muted">' + I('x', 'sm') + '</span>') + '</div>').join('') + '</div></section></div>' +
        '<div class="row"><button class="btn danger" data-logout2>' + I('logout') + _t('چوونەدەرەوە</button></div>');
    },
    mount(root) {
      const me = Store.me;
      root.querySelector('[data-save]').addEventListener('click', () => {
        const f = root.querySelector('#mf');
        if (!UI.validate(f, { name: UI.req(), phone: UI.phoneRule(false) })) return;
        const d = UI.data(f);
        Object.assign(me, { name: me.role === 'owner' ? d.name : me.name, phone: U.normPhone(d.phone), email: d.email });
        App._layoutFor = null;
        Store.commit('user', _t('زانیاری هەژماری خۆی نوێ کردەوە'));
        UI.toast(_t('پاشەکەوت کرا'));
      });
      root.querySelector('[data-pw]').addEventListener('click', () => {
        const f = root.querySelector('#pwf');
        if (!UI.validate(f, { cur: (v) => (v !== me.password ? _t('وشەی نهێنی ئێستا هەڵەیە') : null), n1: (v) => (v.length < 4 ? _t('لانیکەم ٤ پیت') : null), n2: (v) => (v !== f.n1.value ? _t('وەک یەک نین') : null) })) return;
        me.password = f.n1.value;
        Store.commit('user', _t('وشەی نهێنی خۆی گۆڕی'), { silent: true });
        f.reset();
        UI.toast(_t('وشەی نهێنی گۆڕا'));
      });
      root.querySelector('[data-dark]').addEventListener('change', () => App.toggleTheme());
      root.querySelector('[data-logout2]').addEventListener('click', () => { Store.logout(); App._layoutFor = null; location.hash = '#/login'; App.render(); });
    }
  };
})();
