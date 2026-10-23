/* Language core. English is the default; Kurdish (Sorani) is the second language.
   UI strings are written in Kurdish in the code and wrapped in t(); the English text
   comes from window.EN (js/lang-en.js). Switching language reloads the page so every
   module-level label is rebuilt in the new language. */
(function () {
  const LKEY = 'bite_crm_lang';
  let lang = 'en';
  try { lang = localStorage.getItem(LKEY) || 'en'; } catch (e) { /* storage blocked */ }
  if (lang !== 'en' && lang !== 'ku') lang = 'en';
  window.Lang = lang;
  window.EN = window.EN || {};
  window._t = window.t = function (ku) {
    if (lang === 'ku') return ku;
    const v = window.EN[ku];
    return v === undefined ? ku : v;
  };
  /* pick between a Kurdish and an English literal (for data built in code) */
  window.tt = function (ku, en) { return lang === 'ku' ? ku : en; };
  window.setLang = function (l) {
    if (l === lang) return;
    try { localStorage.setItem(LKEY, l); } catch (e) { /* ignore */ }
    location.reload();
  };
  const html = document.documentElement;
  html.lang = lang === 'ku' ? 'ckb' : 'en';
  html.dir = lang === 'ku' ? 'rtl' : 'ltr';
})();
