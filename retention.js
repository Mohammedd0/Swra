/* Patient retention.
   Rules (kept in one place so every screen agrees):
   - Only COMPLETED visits count. Cancelled, no-show and future bookings are not visits.
   - A patient "came back" when they had another completed visit at the clinic, with any doctor.
   - Retention rate for a window of M months: of the patients seen in the M months before the
     last M months, the share who came back during the last M months. Patients who are new in
     the last M months are therefore not counted against the rate (they haven't had the chance).
   - "Lapsed": last completed visit more than M months ago and nothing booked.
   M comes from Admin → Settings (retentionMonths, default 6). */
(function () {
  let cache = null, cacheKey = null;
  const ACTIVE = ['scheduled', 'confirmed', 'arrived', 'in_progress'];

  /* same day N months away (31 Mar − 1 month → 28/29 Feb) */
  function shift(s, n) {
    const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)) - 1 + n, d = Number(s.slice(8, 10));
    const ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12;
    const last = new Date(ty, tm + 1, 0).getDate();
    return ty + '-' + U.pad(tm + 1) + '-' + U.pad(Math.min(d, last));
  }

  function data() {
    if (cache && cacheKey === Store._idx) return cache;
    const T = U.today();
    const visits = {}, upcoming = {};
    let start = null;
    Store.db.appointments.forEach((a) => {
      if (!start || a.date < start) start = a.date;
      if (a.status === 'completed' && a.date <= T) (visits[a.patientId] = visits[a.patientId] || []).push(a);
      else if (a.date >= T && ACTIVE.includes(a.status)) {
        const u = upcoming[a.patientId];
        if (!u || a.date + a.start < u.date + u.start) upcoming[a.patientId] = a;
      }
    });
    Object.keys(visits).forEach((k) => visits[k].sort((x, y) => (x.date + x.start < y.date + y.start ? -1 : 1)));
    cache = { T, visits, upcoming, start: start || T };
    cacheKey = Store._idx;
    return cache;
  }

  const months = () => Number(Store.db.settings.retentionMonths) || 6;
  const scope = (ids) => ids || Store.scopeDoctorIds();
  const lastVisit = (pid) => { const l = data().visits[pid]; return l ? l[l.length - 1] : null; };
  const upcoming = (pid) => data().upcoming[pid] || null;

  /* patients with a completed visit in (from, to] with one of the doctors */
  function seenIn(from, to, ids) {
    const set = new Set();
    Store.db.appointments.forEach((a) => { if (a.status === 'completed' && a.date > from && a.date <= to && ids.includes(a.doctorId)) set.add(a.patientId); });
    return set;
  }
  function cameBack(pid, from, to) { return (data().visits[pid] || []).some((a) => a.date > from && a.date <= to); }

  /* retention rate as of a given day */
  function rate(M, ids, asOf) {
    ids = scope(ids);
    const D = data(), T = asOf || D.T;
    const mid = shift(T, -M), from = shift(T, -2 * M);
    // the base period must be mostly covered by recorded visits
    const covered = U.diffDays(mid, D.start > from ? D.start : from);
    const enough = covered >= U.diffDays(mid, from) * 0.5;
    const base = seenIn(from, mid, ids);
    let back = 0;
    base.forEach((pid) => { if (cameBack(pid, mid, T)) back++; });
    return { from, mid, to: T, base: base.size, back, rate: base.size ? back / base.size * 100 : 0, enough: enough && base.size > 0, partial: D.start > from };
  }

  function isLapsed(pid, M, ids) {
    const lv = lastVisit(pid);
    if (!lv || upcoming(pid)) return false;
    if (ids && !ids.includes(lv.doctorId)) return false;
    return lv.date <= shift(data().T, -M);
  }
  function isDueSoon(pid, M, ids) {
    const lv = lastVisit(pid);
    if (!lv || upcoming(pid)) return false;
    if (ids && !ids.includes(lv.doctorId)) return false;
    const T = data().T;
    return lv.date > shift(T, -M) && lv.date <= shift(T, -M + 1);
  }

  /* lapsed / due-soon patients, most valuable first (more visits, then most recent) */
  function list(kind, M, ids) {
    ids = scope(ids);
    const test = kind === 'due' ? isDueSoon : isLapsed;
    return Store.visiblePatients().filter((p) => test(p.id, M, ids)).map((p) => {
      const v = data().visits[p.id];
      const lv = v[v.length - 1];
      return { p, last: lv, count: v.length, days: U.diffDays(data().T, lv.date) };
    }).sort((a, b) => b.count - a.count || (a.last.date < b.last.date ? 1 : -1));
  }

  function active(M, ids) { ids = scope(ids); const T = data().T; return seenIn(shift(T, -M), T, ids).size; }

  /* typical time between separate visits (gaps under 30 days are the same treatment course) */
  function medianGap(ids) {
    ids = scope(ids);
    const gaps = [];
    Object.values(data().visits).forEach((l) => {
      for (let i = 1; i < l.length; i++) {
        if (!ids.includes(l[i].doctorId) && !ids.includes(l[i - 1].doctorId)) continue;
        const g = U.diffDays(l[i].date, l[i - 1].date);
        if (g >= 30) gaps.push(g);
      }
    });
    if (!gaps.length) return 0;
    gaps.sort((a, b) => a - b);
    return gaps[Math.floor(gaps.length / 2)];
  }

  /* per month: patients seen, split into new (file opened that month) and returning */
  function monthly(ids, n) {
    ids = scope(ids);
    const D = data(), out = [];
    for (let k = n - 1; k >= 0; k--) {
      const m0 = U.addMonths(D.T, -k), m1 = k === 0 ? D.T : U.endOfMonth(m0);
      if (m1 < D.start) continue;
      const seen = seenIn(U.addDays(m0, -1), m1, ids);
      let nw = 0;
      seen.forEach((pid) => { const p = Store.patient(pid); if (p && p.createdAt >= m0 && p.createdAt <= m1) nw++; });
      out.push({ key: m0.slice(0, 7), from: m0, to: m1, total: seen.size, fresh: nw, back: seen.size - nw, partial: m0 < D.start });
    }
    return out;
  }

  /* rolling retention rate at the end of each of the last n months (only where history allows) */
  function trend(M, ids, n) {
    const D = data(), out = [];
    for (let k = n - 1; k >= 0; k--) {
      const m0 = U.addMonths(D.T, -k), end = k === 0 ? D.T : U.endOfMonth(m0);
      const r = rate(M, ids, end);
      if (r.enough) out.push({ key: m0.slice(0, 7), rate: r.rate, base: r.base, back: r.back });
    }
    return out;
  }

  function recallText(p) {
    const lv = lastVisit(p.id);
    const M = months();
    return (Store.db.settings.recallTemplate || '').split('{name}').join(p.name)
      .split('{date}').join(lv ? U.fmtDate(lv.date) : '')
      .split('{doctor}').join(Store.doctorName(lv ? lv.doctorId : p.doctorId))
      .split('{months}').join(U.num(M));
  }

  window.Retention = { shift, data, months, lastVisit, upcoming, rate, isLapsed, isDueSoon, list, active, medianGap, monthly, trend, recallText };
})();
