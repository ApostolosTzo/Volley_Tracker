/* =============================================================
 * app.js — περιβάλλον, πλοήγηση, sticky καταστάσεις
 *
 * Τρεις προβολές (Γήπεδο / Στατιστικά / Ρόστερ) όπως στο UI,
 * και όλα τα υπόλοιπα εργαλεία μέσα από το ☰ μενού.
 * ============================================================= */
(function (V) {
  'use strict';

  var el = V.ui.el;
  var C = V.CONFIG;

  var VIEWS = [
    { id: 'court', label: 'Γήπεδο', icon: 'M3 4h18v16H3zM3 12h18M12 4v16' },
    { id: 'stats', label: 'Στατιστικά', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { id: 'roster', label: 'Ρόστερ', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' }
  ];

  /* κατηγορίες για τις ενέργειες στο λογόδιο */
  var CAT_COLOR = {
    reception: '#38bdf8', attack: '#fb7185', pass: '#a78bfa',
    serve: '#fbbf24', defense: '#34d399', note: '#84909f'
  };

  function icon(d, size) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', size || 16);
    s.setAttribute('height', size || 16);
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    s.appendChild(p);
    return s;
  }
  V.icon = icon;

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
      view: 'court',
      tab: 'court',
      set: set,
      statSet: 'all',
      selected: null,
      lastSpiker: null,
      lastEdited: null,
      logAll: false,
      flow: null,
      sticky: defaultSticky(),

      setSelected: function (id) { c.selected = id; render(); },
      setSet: function (n) { c.set = Number(n); c.flow = null; c.autoSelect(true); render(true); },
      setView: function (v) { c.view = v; c.tab = v; render(true); },

      /* ο πιο φυσικός παίκτης για την τρέχουσα ενέργεια */
      naturalPlayer: function () {
        var players = V.Store.entryPlayers(c.match, c.set);
        if (!players.length) return null;
        if (c.tab === 'pass') return players.filter(function (p) { return p.slot === 'S'; })[0];
        if (c.tab === 'reception') return players.filter(function (p) { return p.slot.indexOf('L') === 0; })[0];
        return players.filter(function (p) { return p.slot.indexOf('OH') === 0; })[0] || players[0];
      },

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

      importFile: function () { V.exporter.importDialog(); },
      exportAll: function () { V.exporter.exportAll(); },
      exportMatch: function (id) { V.exporter.exportMatch(id); },
      openMatch: function (id) { V.Store.setCurrent(id); location.hash = '#/m/' + id; },
      backHome: function () { location.hash = '#/'; }
    };
    c.ensurePlayer();
    return c;
  }

  /* ---------------- topbar ---------------- */
  function topbar(c) {
    var m = c.match;
    var set = V.Store.currentSet(m);

    return el('header', { class: 'topbar' }, [
      el('button', {
        class: 'icon-btn', title: 'Αρχική',
        onclick: function () { c.backHome(); }
      }, [icon('M15 18l-6-6 6-6', 16)]),

      el('div', { class: 'brand-lockup' }, [
        el('div', { class: 'brand-mark small', text: 'V' }),
        el('div', {}, [
          el('strong', { text: (m.meta.teamUs || 'Εμείς').toUpperCase() }),
          el('span', {
            text: [V.ui.fmtDate(m.meta.date), m.meta.day, m.meta.competition]
              .filter(Boolean).join(' · ') || '—'
          })
        ])
      ]),

      el('nav', { class: 'topnav' }, VIEWS.map(function (v) {
        return el('button', {
          class: c.view === v.id ? 'is-active' : '',
          onclick: function () { c.setView(v.id); V.ui.buzz(6); }
        }, [icon(v.icon, 16), el('span', { text: v.label })]);
      })),

      el('div', { class: 'topbar__right' }, [
        el('div', { class: 'live-pill' }, [
          el('i'), el('span', { text: 'LIVE · ΣΕΤ ' + set })
        ]),
        el('button', {
          class: 'icon-btn', title: 'Μενού',
          onclick: function () { V.views.tools.menuDialog(c); }
        }, [icon('M4 7h16M4 12h16M4 17h16', 16)])
      ])
    ]);
  }

  /* ---------------- ribbon σκορο ---------------- */
  function scoreRibbon(c) {
    var m = c.match;
    var sc = V.Store.score(m, c.set);
    var g = V.Store.game(m, c.set);
    var us = m.meta.teamUs || 'Εμείς';
    var them = m.meta.teamThem || 'Αντίπαλοι';

    function side(key, name, value) {
      return el('div', { class: 'team-score' + (key === 'them' ? ' opponent' : '') + (g.server === key ? ' serving' : '') }, [
        el('span', { text: name }),
        el('button', {
          text: '−', 'aria-label': 'Αφαίρεση πόντου',
          onclick: function () {
            if ((sc[key] || 0) <= 0) { V.ui.toast('Το σκορ δεν πάει κάτω', { tone: 'warn', duration: 1200 }); return; }
            V.ui.buzz(8);
            V.Store.awardPoint(m.id, c.set, key, -1);
          }
        }),
        el('strong', { text: String(value || 0) }),
        el('button', {
          text: '+', 'aria-label': 'Πόντος',
          onclick: function () { V.ui.buzz(14); V.Store.awardPoint(m.id, c.set, key, 1); }
        })
      ]);
    }

    var sets = el('div', { class: 'score-sets' }, V.Stats.bySet(m).map(function (r) {
      return el('span', {
        class: 'setsq' + (r.set === c.set ? ' is-active' : '') +
          (r.us > r.them ? ' setsq--us' : (r.them > r.us ? ' setsq--them' : '')),
        text: String(r.set)
      });
    }));

    return el('section', { class: 'score-ribbon' }, [
      side('us', us, sc.us),
      el('div', { class: 'score-center' }, [
        el('span', { text: 'ΣΕΤ ' + c.set }),
        el('b', { text: '—' }),
        sets
      ]),
      side('them', them, sc.them)
    ]);
  }

  /* ---------------- γραμμή κατάστασης ---------------- */
  function statusLine(c) {
    var m = c.match;
    var g = V.Store.game(m, c.set);
    var f = c.flow;
    var us = m.meta.teamUs || 'Εμείς';

    var txt;
    if (f && f.stage === 'pick-attacker') txt = 'ετοιμάζει επίθεση';
    else if (f && f.stage === 'defense-pick') txt = 'επιλέξε άμυνα';
    else if (g.server === 'us') {
      var z1 = V.Store.courtPlayers(m, c.set).filter(function (p) { return p.zone === 1; })[0];
      txt = us + ' έχει σέρβις' + (z1 && z1.playerId ? ' — ' + z1.name : '');
    } else txt = us + ' έχει υποδοχή';

    var serving = (g.server === 'us');
    if (f && f.stage === 'pick-attacker') serving = true;
    if (f && f.stage === 'defense-pick') serving = false;

    return el('div', { class: 'status-line' }, [
      el('span', {
        class: 'status-chip ' + (serving ? 'status-serve' : 'status-receive'),
        text: serving ? 'ΣΕΡΒΙΣ' : 'ΥΠΟΔΟΧΗ'
      }),
      el('strong', { text: txt }),
      c.flow && c.flow.stage !== 'defense-pick'
        ? el('button', { class: 'status-hint', text: 'ακύρωση', onclick: function () { c.flow = null; render(); } })
        : null
    ]);
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
        importDialog: function () { V.exporter.importDialog(); },
        exportAll: function () { V.exporter.exportAll(); },
        openMatch: function (id) { V.Store.setCurrent(id); location.hash = '#/m/' + id; },
        exportMatch: function (id) { V.exporter.exportMatch(id); },
        onRender: function () { render(); }
      }));
      document.body.classList.remove('in-match');
      return;
    }

    var match = V.Store.byId(m[1]);
    if (!ctx || !ctx.match || ctx.match.id !== match.id) ctx = makeCtx(match);
    ctx.match = match;

    document.body.classList.add('in-match');

    var view = el('div', { class: 'screen' });
    view.appendChild(topbar(ctx));

    if (ctx.view === 'court') {
      view.appendChild(scoreRibbon(ctx));
      view.appendChild(statusLine(ctx));
      view.appendChild(V.views.court.render(ctx));
    } else {
      var content = el('div', { class: 'content' });
      content.appendChild(ctx.view === 'stats'
        ? V.views.dashboard.render(ctx)
        : V.views.setup.renderRosterPage(ctx));
      view.appendChild(content);
    }

    root.appendChild(view);
    if (scrollTop) window.scrollTo(0, 0);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    root = V.ui.$('#app');
    V.Store.init();

    window.addEventListener('hashchange', function () { render(true); });
    V.Store.onChange(function () {
      /* τα δεδομένα άλλαξαν. Το ctx.match μηδενίζεται όταν ο αγώνας
         διαγραφεί, και μπορεί να έρθει ακόμα μία αλλαγή πριν το hashchange. */
      if (!ctx) { render(); return; }
      var id = ctx.match && ctx.match.id;
      if (!id) { location.hash = '#/'; return; }
      ctx.match = V.Store.byId(id);
      if (!ctx.match) { ctx = null; location.hash = '#/'; render(); return; }
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
    VIEWS: VIEWS,
    CAT_COLOR: CAT_COLOR,
    icon: icon,
    /* χρήσιμο για debugging / αυτοματοποιημένα τεστ */
    ctx: function () { return ctx; }
  };

  document.addEventListener('DOMContentLoaded', boot);
})(window.V = window.V || {});
