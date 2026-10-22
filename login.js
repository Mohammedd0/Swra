/* Login screen with demo account picker */
(function () {
  const esc = U.esc;
  Pages.login = {
    title: 'چوونەژوورەوە',
    render() {
      const users = Store.db.users.filter((u) => u.active);
      const group = (role) => users.filter((u) => u.role === role);
      const acct = (u) => '<button type="button" class="demo-acct" data-u="' + esc(u.username) + '">' + UI.av(u.name, u.role === 'doctor' ? u.color : u.role === 'owner' ? '#1B2B4F' : '#3FA987', 'sm') + '<span class="col"><b>' + esc(u.name) + '</b><small>' + esc(u.role === 'secretary' ? 'سکرتێری ' + Store.doctorName(u.doctorId) : Store.ROLES[u.role]) + '</small></span></button>';
      return '<div class="login">' +
        '<section class="login-art">' +
        '<div class="brand">' + UI.logoHtml(52) + '<span class="brand-text"><span class="brand-name" style="font-size:26px">Bite</span><span class="brand-sub" style="font-size:14px">for dentistry</span></span></div>' +
        '<div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:16px"><span class="eyebrow" style="color:var(--mint);letter-spacing:3px">سیستەمی بەڕێوەبردنی کلینیک</span><h1>هەموو کلینیکەکەت،<br>لە یەک شوێندا.</h1><p>نۆرە، نەخۆش، دکتۆر، پارە و ڕاپۆرت — هەر کەسێک پەڕەی خۆی، بە دەسەڵاتی جیاواز و بە شێوەیەکی پارێزراو.</p></div>' +
        '<div class="login-feats">' +
        [['calendar', 'خشتەی ٥ دکتۆر لە یەک شاشەدا'], ['tooth', 'نەخشەی ددان و پەڕگەی پزیشکی'], ['wallet', 'پسوولە، قیست و قەرز'], ['shield', 'دەسەڵات بەپێی ڕۆڵ'], ['whatsapp', 'بیرخستنەوە بە واتسئاپ'], ['bars', 'ڕاپۆرتی ورد بۆ خاوەن']].map((f) => '<div class="login-feat"><span>' + I(f[0]) + '</span>' + f[1] + '</div>').join('') +
        '</div>' +
        '<small style="color:rgba(255,255,255,.55);position:relative;z-index:1">' + esc(Store.db.settings.address) + '</small>' +
        '</section>' +
        '<section class="login-form-wrap"><form class="login-form" id="login-form" novalidate>' +
        '<div class="col" style="gap:4px"><h2 style="font-size:28px;color:var(--navy)" class="page-title">بەخێربێیتەوە</h2><span class="muted">بۆ چوونەژوورەوە ناوی بەکارهێنەر و وشەی نهێنی بنووسە</span></div>' +
        '<div class="field"><label for="lu">ناوی بەکارهێنەر</label><input class="input" id="lu" name="username" autocomplete="username" placeholder="owner" dir="ltr" style="text-align:right"></div>' +
        '<div class="field"><label for="lp">وشەی نهێنی</label><div style="position:relative"><input class="input" id="lp" name="password" type="password" autocomplete="current-password" placeholder="••••" dir="ltr" style="text-align:right;padding-inline-start:44px"><button type="button" class="btn ghost sm" data-showpw aria-label="پیشاندانی وشەی نهێنی" style="position:absolute;inset-inline-start:4px;top:5px">' + I('eye', 'sm') + '</button></div></div>' +
        '<div class="err-msg hidden" id="lerr" role="alert"></div>' +
        '<button class="btn accent lg block" type="submit">چوونەژوورەوە</button>' +
        '<div class="divider"></div>' +
        '<div class="col" style="gap:8px"><b>هەژمارەکانی تاقیکردنەوە</b><span class="hint">کلیک لە هەر هەژمارێک بکە بۆ چوونەژوورەوە. وشەی نهێنی هەموویان <span class="ltr latin">1234</span>ـە. هەر هەژمارێک تەنها بەشەکانی خۆی دەبینێت.</span></div>' +
        '<div class="demo-accts">' + group('owner').map(acct).join('') + group('admin').map(acct).join('') + group('doctor').map(acct).join('') + group('secretary').map(acct).join('') + '</div>' +
        '</form></section></div>';
    },
    mount(root) {
      const f = root.querySelector('#login-form');
      const err = root.querySelector('#lerr');
      const doLogin = (u, p) => {
        const res = Store.login(u, p);
        if (res.error) { err.textContent = res.error; err.classList.remove('hidden'); root.querySelector('#lp').select(); return; }
        U.digits = Store.db.settings.digits || 'ar';
        UI.toast('بەخێربێیت، ' + res.user.name);
        location.hash = '#/dashboard';
        App.render();
      };
      f.addEventListener('submit', (e) => { e.preventDefault(); const d = UI.data(f); if (!d.username || !d.password) { err.textContent = 'ناوی بەکارهێنەر و وشەی نهێنی پێویستن'; err.classList.remove('hidden'); return; } doLogin(d.username, d.password); });
      root.querySelectorAll('[data-u]').forEach((b) => b.addEventListener('click', () => { root.querySelector('#lu').value = b.dataset.u; root.querySelector('#lp').value = '1234'; doLogin(b.dataset.u, '1234'); }));
      root.querySelector('[data-showpw]').addEventListener('click', () => { const p = root.querySelector('#lp'); p.type = p.type === 'password' ? 'text' : 'password'; });
      setTimeout(() => { const u = document.getElementById('lu'); if (u && window.innerWidth > 680) u.focus(); }, 50);
    }
  };
})();
