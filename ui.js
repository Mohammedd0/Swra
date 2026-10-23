/* UI primitives: modal, confirm, toast, form helpers, small components */
(function () {
  const esc = U.esc;
  const stack = [];

  const UI = {
    modal(o) {
      const root = document.getElementById('modal-root');
      const mask = document.createElement('div');
      mask.className = 'modal-mask';
      mask.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '">' +
        '<div class="modal-head"><h3>' + esc(o.title) + _t('</h3><button class="icon-btn" data-close aria-label="داخستن">') + I('x') + '</button></div>' +
        '<div class="modal-body">' + (o.body || '') + '</div>' +
        (o.foot ? '<div class="modal-foot">' + o.foot + '</div>' : '') + '</div>';
      root.appendChild(mask);
      const el = mask.querySelector('.modal');
      const prevFocus = document.activeElement;
      const api = {
        el, mask,
        close() {
          if (!mask.isConnected) return;
          mask.remove();
          const i = stack.indexOf(api);
          if (i >= 0) stack.splice(i, 1);
          if (o.onClose) o.onClose();
          if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* ignore */ }
        },
        $(s) { return el.querySelector(s); },
        $$(s) { return Array.from(el.querySelectorAll(s)); },
        setBody(html) { el.querySelector('.modal-body').innerHTML = html; },
        setFoot(html) { const f = el.querySelector('.modal-foot'); if (f) f.innerHTML = html; }
      };
      stack.push(api);
      mask.addEventListener('mousedown', (e) => { if (e.target === mask && !o.sticky) api.close(); });
      el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) api.close(); });
      if (o.onOpen) o.onOpen(api);
      setTimeout(() => {
        const f = el.querySelector('[autofocus]') || el.querySelector('.modal-body input:not([type=hidden]):not([type=checkbox]),.modal-body select,.modal-body textarea');
        if (f && window.innerWidth > 680) f.focus();
      }, 30);
      return api;
    },
    closeAll() { while (stack.length) stack[stack.length - 1].close(); },
    topModal() { return stack[stack.length - 1]; },
    confirm(o) {
      return new Promise((resolve) => {
        let done = false;
        const m = UI.modal({
          title: o.title || _t('دڵنیایت؟'), size: 'narrow',
          body: '<p style="margin:0;line-height:1.9">' + (o.html || esc(o.text || '')) + '</p>',
          foot: '<button class="btn" data-close>' + esc(o.cancel || _t('نەخێر')) + '</button><button class="btn ' + (o.danger ? 'danger solid' : 'primary') + '" data-ok>' + esc(o.ok || _t('بەڵێ')) + '</button>',
          onClose() { if (!done) resolve(false); }
        });
        m.$('[data-ok]').addEventListener('click', () => { done = true; m.close(); resolve(true); });
        setTimeout(() => m.$('[data-ok]').focus(), 40);
      });
    },
    toast(msg, type) {
      const root = document.getElementById('toast-root');
      const t = document.createElement('div');
      t.className = 'toast ' + (type || 'ok');
      t.innerHTML = I(type === 'err' ? 'alert' : type === 'warn' ? 'info' : 'check') + '<span>' + esc(msg) + '</span>';
      root.appendChild(t);
      setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, type === 'err' ? 4200 : 2600);
    },
    data(form) {
      const o = {};
      Array.from(form.querySelectorAll('[name]')).forEach((el) => {
        if (el.type === 'checkbox') {
          if (el.dataset.multi) { o[el.name] = o[el.name] || []; if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked;
        } else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = typeof el.value === 'string' ? el.value.trim() : el.value;
      });
      return o;
    },
    /* rules: {field: [check(fn->msg|null)]} ; returns true if valid */
    validate(scope, rules) {
      let ok = true, first = null;
      scope.querySelectorAll('.err-msg[data-for]').forEach((e) => e.remove());
      scope.querySelectorAll('.err').forEach((e) => e.classList.remove('err'));
      Object.keys(rules).forEach((name) => {
        const el = scope.querySelector('[name="' + name + '"]');
        if (!el) return;
        const msg = rules[name](el.type === 'checkbox' ? el.checked : (el.value || '').trim());
        if (msg) {
          ok = false;
          el.classList.add('err');
          const m = document.createElement('div');
          m.className = 'err-msg';
          m.dataset.for = name;
          m.textContent = msg;
          el.insertAdjacentElement('afterend', m);
          if (!first) first = el;
          const clear = () => { el.classList.remove('err'); m.remove(); el.removeEventListener('input', clear); el.removeEventListener('change', clear); };
          el.addEventListener('input', clear);
          el.addEventListener('change', clear);
        }
      });
      if (first) first.focus();
      return ok;
    },
    req(msg) { return (v) => (v ? null : msg || _t('ئەم خانەیە پێویستە')); },
    phoneRule(required) {
      return (v) => {
        if (!v) return required ? _t('ژمارەی مۆبایل پێویستە') : null;
        const n = U.normPhone(v);
        return /^(07\d{9}|\+?964\d{10})$/.test(n) ? null : _t('ژمارەکە دروست نییە (نموونە: 0750 123 4567)');
      };
    },
    numRule(min, msg) { return (v) => { const n = Number(U.toLatinDigits(v).replace(/,/g, '')); return v === '' || isNaN(n) || n < min ? (msg || _t('ژمارەیەکی دروست بنووسە')) : null; }; },
    parseNum(v) { return Number(U.toLatinDigits(String(v || '')).replace(/[,\s]/g, '')) || 0; },

    /* components */
    av(name, color, size) {
      const style = color ? ' style="background:' + color + '1F;color:' + color + '"' : '';
      return '<span class="av ' + (size || '') + '"' + style + '>' + esc(U.initials(name)) + '</span>';
    },
    who(name, sub, color, size, href) {
      const inner = UI.av(name, color, size) + '<span class="col"><b>' + esc(name) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>';
      return href ? '<a class="who" href="' + href + '" style="color:inherit">' + inner + '</a>' : '<span class="who">' + inner + '</span>';
    },
    badge(text, cls, dot) { return '<span class="badge ' + (cls || '') + '">' + (dot ? '<i class="bd"></i>' : '') + esc(text) + '</span>'; },
    status(st) { const s = Store.STATUS[st] || { label: st, cls: '' }; return UI.badge(s.label, s.cls, true); },
    invBadge(inv) {
      const st = Store.invStatus(inv);
      return st === 'paid' ? UI.badge(_t('دراوە'), 'b-green') : st === 'partial' ? UI.badge(_t('بەشێکی دراوە'), 'b-amber') : UI.badge(_t('نەدراوە'), 'b-red');
    },
    kpi(label, value, foot, icon, opts) {
      opts = opts || {};
      return '<div class="kpi"' + (opts.href ? ' role="link" tabindex="0" data-href="' + opts.href + '" style="cursor:pointer"' : '') + '><div class="kpi-top"><span class="kpi-label">' + esc(label) + '</span>' + (icon ? '<span class="kpi-ico" style="' + (opts.icoStyle || '') + '">' + I(icon) + '</span>' : '') + '</div><div class="kpi-value">' + value + '</div>' + (foot ? '<div class="kpi-foot">' + foot + '</div>' : '') + '</div>';
    },
    empty(text, icon, action) { return '<div class="empty">' + I(icon || 'info') + '<div>' + esc(text) + '</div>' + (action || '') + '</div>'; },
    opts(list, value, placeholder) {
      return (placeholder !== undefined ? '<option value="">' + esc(placeholder) + '</option>' : '') + list.map((o) => {
        const v = Array.isArray(o) ? o[0] : o.id, l = Array.isArray(o) ? o[1] : o.name;
        return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(l) + '</option>';
      }).join('');
    },
    field(label, input, opts) {
      opts = opts || {};
      return '<div class="field ' + (opts.full ? 'full' : '') + '"><label' + (opts.id ? ' for="' + opts.id + '"' : '') + '>' + esc(label) + (opts.req ? ' <span class="req">*</span>' : '') + '</label>' + input + (opts.hint ? '<div class="hint">' + esc(opts.hint) + '</div>' : '') + '</div>';
    },
    bar(pct, cls) { return '<div class="bar ' + (cls || '') + '"><i style="width:' + U.clamp(pct, 0, 100).toFixed(1) + '%"></i></div>'; },
    progRow(label, value, pct, cls) { return '<div class="prog-row"><div class="row"><span>' + esc(label) + '</span><span class="muted">' + value + '</span></div>' + UI.bar(pct, cls) + '</div>'; },
    logoHtml(size) {
      const logo = Store.db && Store.db.settings.logo;
      return '<span class="brand-logo" style="' + (size ? 'width:' + size + 'px;height:' + size + 'px' : '') + '">' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '<span dir="ltr">B<b>.</b></span>') + '</span>';
    },
    brand() { return '<a class="brand" href="#/dashboard">' + UI.logoHtml() + '<span class="brand-text"><span class="brand-name">Bite</span><span class="brand-sub">for dentistry</span></span></a>'; },
    print(html) {
      const root = document.getElementById('print-root');
      root.innerHTML = html;
      document.body.classList.add('printing');
      const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      setTimeout(() => { window.print(); setTimeout(() => { if (document.body.classList.contains('printing')) done(); }, 1500); }, 120);
    },
    docHead(title, meta) {
      const s = Store.db.settings;
      return '<div class="doc-head"><div class="doc-brand">' + (s.logo ? '<img src="' + esc(s.logo) + '" alt="">' : '<span class="n">Bite</span><span class="s">for dentistry</span>') + '<div style="font-size:10pt;color:#555;margin-top:6px">' + esc(s.address) + '<br>' + U.fmtPhone(s.phone) + ' · ' + esc(s.email) + '</div></div><div class="doc-meta"><h2>' + esc(title) + '</h2>' + meta + '</div></div>';
    },
    pager(total, page, size) {
      const pages = Math.max(1, Math.ceil(total / size));
      return '<div class="pager"><span>' + U.num(Math.min(total, (page - 1) * size + 1)) + '–' + U.num(Math.min(total, page * size)) + _t(' لە ') + U.num(total) + '</span><span class="row"><button class="btn sm" data-page="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + '>' + I('chevR', 'sm') + _t(' پێشوو</button><span>') + U.num(page) + ' / ' + U.num(pages) + '</span><button class="btn sm" data-page="' + (page + 1) + '" ' + (page >= pages ? 'disabled' : '') + _t('>دواتر ') + I('chevL', 'sm') + '</button></span></div>';
    },
    readFile(file, maxKB) {
      return new Promise((resolve, reject) => {
        if (file.size > maxKB * 1024) { reject(new Error(_t('قەبارەی فایل زۆرە (زۆرترین ') + U.num(maxKB) + 'KB)')); return; }
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error(_t('خوێندنەوەی فایل سەرکەوتوو نەبوو')));
        fr.readAsDataURL(file);
      });
    },
    shrinkImage(dataUrl, maxSide, quality, type) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, maxSide / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL(type || 'image/jpeg', quality || 0.8));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length) { e.preventDefault(); stack[stack.length - 1].close(); }
  });
  window.UI = UI;
})();
