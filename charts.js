/* Thin Chart.js wrapper with brand styling and graceful fallback */
(function () {
  const live = [];
  const FONT = "Fraunces, 'Noto Naskh Arabic', Georgia, serif";
  const isRtl = () => document.documentElement.dir === 'rtl';
  const PALETTE = ['#1B2B4F', '#67CDAB', '#5BB5C5', '#C9822E', '#B5556B', '#6B5BC9', '#2F5DA8', '#9AA5AE'];
  function theme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    return { dark, grid: dark ? 'rgba(255,255,255,.07)' : 'rgba(27,43,79,.07)', text: dark ? '#A8B4C4' : '#5B6B75', navy: dark ? '#7F9BE0' : '#1B2B4F' };
  }
  function base(type, data, extra) {
    const th = theme();
    const rtl = isRtl();
    const money = extra && extra.money, pct = extra && extra.pct;
    const fmt = (v) => (money ? U.moneyShort(v) : pct ? U.pct(v) : U.num(v));
    const val = (v) => (money ? U.money(v) : pct ? U.pct(v, 1) : U.num(v));
    const cfg = {
      type, data,
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
        locale: 'en-US',
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: !!(extra && extra.legend), position: 'bottom', rtl, labels: { color: th.text, usePointStyle: true, boxWidth: 8, font: { family: FONT, size: 12 } } },
          tooltip: { rtl, textDirection: rtl ? 'rtl' : 'ltr', titleFont: { family: FONT }, bodyFont: { family: FONT }, callbacks: { label: (c) => ' ' + (c.dataset.label ? c.dataset.label + ': ' : '') + val(c.parsed.y !== undefined ? c.parsed.y : c.parsed) } }
        },
        scales: type === 'doughnut' ? {} : {
          x: { reverse: rtl, grid: { display: false }, ticks: { color: th.text, font: { family: FONT, size: 11 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 10 } },
          y: { position: rtl ? 'right' : 'left', beginAtZero: true, max: pct ? 100 : undefined, grid: { color: th.grid }, border: { display: false }, ticks: { color: th.text, font: { family: FONT, size: 11 }, callback: fmt, maxTicksLimit: 6 }, stacked: !!(extra && extra.stacked) }
        }
      }
    };
    if (extra && extra.stacked) cfg.options.scales.x.stacked = true;
    if (extra && extra.horizontal) {
      cfg.options.indexAxis = 'y';
      cfg.options.scales = {
        x: { position: 'bottom', reverse: rtl, beginAtZero: true, grid: { color: th.grid }, ticks: { color: th.text, callback: fmt, maxTicksLimit: 5, font: { family: FONT, size: 11 } } },
        y: { position: rtl ? 'right' : 'left', grid: { display: false }, ticks: { color: th.text, font: { family: FONT, size: 12 } } }
      };
      cfg.options.plugins.tooltip.callbacks.label = (c) => ' ' + (money ? U.money(c.parsed.x) : U.num(c.parsed.x));
    }
    if (type === 'doughnut') {
      cfg.options.cutout = '68%';
      cfg.options.plugins.legend.display = true;
      cfg.options.plugins.tooltip.callbacks.label = (c) => ' ' + c.label + ': ' + (money ? U.money(c.parsed) : U.num(c.parsed));
    }
    return cfg;
  }
  const Charts = {
    PALETTE,
    theme,
    make(el, type, data, extra) {
      if (!el) return null;
      if (!window.Chart) { el.parentElement.innerHTML = '<div class="chart-fallback">' + _t('چارت بار نەبوو — پەیوەندی ئینتەرنێت پێویستە') + '</div>'; return null; }
      const c = new window.Chart(el.getContext('2d'), base(type, data, extra));
      live.push(c);
      return c;
    },
    destroyAll() { while (live.length) { try { live.pop().destroy(); } catch (e) { /* ignore */ } } },
    line(el, labels, sets, extra) {
      const th = theme();
      return Charts.make(el, 'line', {
        labels,
        datasets: sets.map((s, i) => ({ label: s.label, data: s.data, borderColor: s.color || (i === 0 ? th.navy : PALETTE[i + 1]), backgroundColor: (s.color || (i === 0 ? th.navy : PALETTE[i + 1])) + '22', fill: s.fill !== false && i === 0, tension: 0.35, borderWidth: 2.4, pointRadius: 0, pointHoverRadius: 5 }))
      }, extra);
    },
    bar(el, labels, sets, extra) {
      const th = theme();
      return Charts.make(el, 'bar', {
        labels,
        datasets: sets.map((s, i) => ({ label: s.label, data: s.data, backgroundColor: s.colors || s.color || (i === 0 ? th.navy : PALETTE[i + 1]), borderRadius: 6, maxBarThickness: 38 }))
      }, extra);
    },
    doughnut(el, labels, data, colors, extra) {
      return Charts.make(el, 'doughnut', { labels, datasets: [{ data, backgroundColor: colors || PALETTE, borderWidth: 2, borderColor: theme().dark ? '#16203A' : '#fff' }] }, extra);
    }
  };
  window.Charts = Charts;
})();
