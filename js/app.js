/* =============================================================
 * app.js — περιβάλλον, πλοήγηση, tabs, sticky καταστάσεις
 * ============================================================= */
(function (V) {
  'use strict';

  var el = V.ui.el;
  var C = V.CONFIG;

  var TABS = [
    { id: 'attack', label: 'Χτυπ.', full: 'Χτυπήματα', icon: '\uD83E\uDD3A' },
    { id: 'reception', label: 'Υποδ.', full: 'Υποδοχές', icon: '\uD83D\uDCD6' },
    { id: 'pass', label: 'Πάσες', full: 'Πάσες', icon: '\uD83C\uDFAF' },
    { id: 'serve', label: 'Σερβ.', full: 'Σερβίς', icon: '\uD83C\uDF00' },
    { id: 'stats', label: 'Στατ.', full: 'Στατιστικά', icon: '\uD83D\uDCCA' },
    { id: 'log', label: 'Λογ.', full: 'Λογόδιο', icon: '\uD83D\uDCDC' }
  ];

  var root = null;
  var ctx = null;

  /* ---------------- sticky defaults ---------------- */
  function defaultSticky() {
    return {
      recTarget: '3',
      passTarget: 'OH',
      passIssues: [],
      serveType: 'jump',
      serveZone: null
    };
  }

  function makeCtx(match) {
    var set = V.Store.currentSet(match);
    var c = {
      match: match,
      tab: 'attack',
      set: set,
      statSet: 'all',
      selected: null,
      lastSpiker: null,
      lastEdited: null,
      logAll: false,
      sticky: defaultSticky(),
      setSelected: function (id) { c.selected = id; render(); },
      setSet: function (n) { c.set = Number(n); c.autoSelect(true); render(); },
      /* ο πιο φυσικός παίκτης για την τρέχουσα καρτέλα */
      naturalPlayer: function () {
        var players = V.Store.entryPlayers(c.match, c.set);
        if (!players.length) return null;
        if (c.tab === 'pass') return players.filter(function (p) { return p.slot === 'S'; })[0];
        if (c.tab === 'reception') return players.filter(function (p) { return p.slot.indexOf('L') === 0; })[0];
        return players.filter(function (p) { return p.slot.indexOf('OH') === 0; })[0] || players[0];
      },
      /* μόνο όταν αλλάζει καρτέλα/σετ — όχι σε κάθε render */
      autoSelect: function (force) {
        var players = V.Store.entryPlayers(c.match, c.set);
        if (!players.length) { c.selected = null; return; }
        var still = players.some(function (p) { return p.playerId === c.selected; });
        if (still && !force) return;
        var want = c.naturalPlayer();
        c.selected = want ? want.playerId : players[0].playerId;
      },
      setStatSet: function (s) { c.statSet = s; render(); },
      setSticky: function (k, v) { c.sticky[k] = v; render(); },
      rememberSpiker: function (kind) {
        var lu = V.Store.lineup(c.match, c.set);
        var slot = null;
        C.COURT_SLOTS.forEach(function (s) { if (lu[s.id] === c.selected) slot = s.id; });
        if (!slot) return;
        var role = slot.indexOf('MB') === 0 ? 'MB' : (slot.indexOf('L') === 0 ? null : slot.replace(/[12]$/, ''));
        if (role) { c.lastSpiker = role; c.sticky.passTarget = role; }
      },
      ensurePlayer: function () { c.autoSelect(); },
      /* από τα views */
      importFile: function () { V.exporter.importFile(); },
      exportAll: function () { V.exporter.exportAll(); },
      exportMatch: function (id) { V.exporter.exportMatch(id); },
      openMatch: function (id) { V.Store.setCurrent(id); location.hash = '#/m/' + id; },
      backHome: function () { location.hash = '#/'; }
    };
    c.ensurePlayer();
    return c;
  }

  /* ---------------- match header ---------------- */
  function matchHeader(c) {
    var m = c.match;
    return el('header', { class: 'appbar' }, [
      el('button', {
        class: 'icon-btn appbar__back', text: '‹', title: 'Πίσω',
        onclick: function () { c.backHome(); }
      }),
      el('div', { class: 'appbar__title' }, [
        el('span', { class: 'appbar__teams', text: (m.meta.teamUs || 'Εμείς') + '  ·  ' + (m.meta.teamThem || 'Αντίπαλοι') }),
        el('span', {
          class: 'appbar__sub',
          text: [V.ui.fmtDate(m.meta.date), m.meta.day, m.meta.competition].filter(Boolean).join(' · ')
        })
      ]),
      el('button', {
        class: 'icon-btn', text: '\u2630', title: 'Μενού',
        onclick: function () { V.views.tools.menuDialog(c); }
      })
    ]);
  }

  /* ---------------- tabs ---------------- */
  function tabbar(c) {
    return el('nav', { class: 'tabbar' }, TABS.map(function (t) {
      return el('button', {
        class: 'tabbar__btn' + (c.tab === t.id ? ' is-active' : ''),
        onclick: function () { c.tab = t.id; c.autoSelect(true); render(true); V.ui.buzz(6); }
      }, [
        el('span', { class: 'tabbar__icon', text: t.icon }),
        el('span', { class: 'tabbar__label', text: t.label })
      ]);
    }));
  }

  /* ---------------- render ---------------- */
  function render(scrollTop) {
    if (!root) return;
    var hash = location.hash || '#/';
    V.ui.clear(root);

    var m = /^#\/m\/(.+)$/.exec(hash);
    if (!m || !V.Store.byId(m[1])) {
      ctx = null;
      root.appendChild(V.views.setup.renderHome({
        importFile: function () { V.exporter.importFile(); },
        exportAll: function () { V.exporter.exportAll(); },
        openMatch: function (id) { V.Store.setCurrent(id); location.hash = '#/m/' + id; },
        exportMatch: function (id) { V.exporter.exportMatch(id); }
      }));
      document.body.classList.remove('in-match');
      return;
    }

    var match = V.Store.byId(m[1]);
    if (!ctx || ctx.match.id !== match.id) ctx = makeCtx(match);
    ctx.match = match;

    document.body.classList.add('in-match');

    var view = el('div', { class: 'screen' });
    view.appendChild(matchHeader(ctx));
    view.appendChild(V.views.tools.scoreboard(ctx));

    if (ctx.tab !== 'stats' && ctx.tab !== 'log') {
      view.appendChild(V.views.tools.lineupStrip(ctx));
    }

    view.appendChild(tabbar(ctx));

    var content = el('div', { class: 'content' });
    if (ctx.tab === 'stats') content.appendChild(V.views.dashboard.render(ctx));
    else if (ctx.tab === 'log') content.appendChild(V.views.dashboard.renderTimeline(ctx));
    else content.appendChild(V.views.entry.render(ctx));
    view.appendChild(content);

    root.appendChild(view);
    if (scrollTop) window.scrollTo(0, 0);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    root = V.ui.$('#app');
    V.Store.init();

    /* αν δεν υπάρχει current match, άνοιξε τον πιο πρόσφατο */
    if (!location.hash || location.hash === '#' || location.hash === '#/') {
      var ms = V.Store.matches();
      if (ms.length) { /* ο χρήστης μπορεί να μπει από τη λίστα */ }
    }

    window.addEventListener('hashchange', function () { render(true); });
    V.Store.onChange(function () {
      /* τα δεδομένα άλλαξαν — ανανέωσε χωρίς να χαλάσει την καρτέλα */
      if (!ctx) { render(); return; }
      ctx.match = V.Store.byId(ctx.match.id);
      if (!ctx.match) { location.hash = '#/'; return; }
      render();
    });

    /* service worker (offline) */
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
    }

    render(true);
  }

  V.app = {
    boot: boot,
    render: render,
    TABS: TABS,
    /* χρήσιμο για debugging / αυτοματοποιημένα τεστ */
    ctx: function () { return ctx; }
  };

  document.addEventListener('DOMContentLoaded', boot);
})(window.V = window.V || {});