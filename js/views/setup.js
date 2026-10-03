/* =============================================================
 * views/setup.js — αρχική οθόνη, νέος αγώνας, ρόστερ, ενδέκη ανά σετ
 * ============================================================= */
(function (V) {
  'use strict';

  var el = V.ui.el;
  var C = V.CONFIG;

  /* =========================================================
   * Αρχική οθόνη: λίστα αγώνων + νέος αγώνας
   * ========================================================= */
  function renderHome(ctx) {
    var wrap = el('div', { class: 'home' });
    var matches = V.Store.matches();

    wrap.appendChild(el('header', { class: 'home__hero' }, [
      el('div', { class: 'logo' }, [el('span', { class: 'logo__ball', text: '\uD83C\uDFD0' })]),
      el('h1', { class: 'home__title', text: 'Volley Tracker' }),
      el('p', { class: 'home__sub', text: 'Στατιστικά αγώνα: χτυπήματα, υποδοχές, πάσες, σερβίς' })
    ]));

    wrap.appendChild(el('button', {
      class: 'btn btn--primary btn--xl',
      onclick: function () { newMatchDialog(); }
    }, [el('span', { text: '＋' }), el('span', { text: 'Νέος αγώνας' })]));

    /* εισαγωγή/εξαγωγή γρήγορα από την αρχική */
    wrap.appendChild(el('div', { class: 'home__tools' }, [
      el('button', { class: 'btn btn--ghost btn--sm', text: '\u2193 Εισαγωγή αγώνα', onclick: function () { ctx.importFile(); } }),
      el('button', { class: 'btn btn--ghost btn--sm', text: '\u2191 Εξαγωγή όλων', onclick: function () { ctx.exportAll(); } })
    ]));

    wrap.appendChild(el('h2', { class: 'home__h2', text: matches.length ? 'Αγώνες (' + matches.length + ')' : 'Κανένας αγώνας ακόμα' }));

    var list = el('div', { class: 'matchlist' });
    if (!matches.length) {
      list.appendChild(el('p', { class: 'empty', text: 'Δημιούργησε τον πρώτο σου αγώνα για να ξεκινήσεις.' }));
    }
    matches.forEach(function (m) {
      var sets = V.Stats.bySet(m);
      var setsUs = sets.filter(function (s) { return s.us > s.them; }).length;
      var setsThem = sets.filter(function (s) { return s.them > s.us; }).length;
      list.appendChild(el('div', { class: 'matchcard' }, [
        el('button', {
          class: 'matchcard__main',
          onclick: function () { ctx.openMatch(m.id); }
        }, [
          el('div', { class: 'matchcard__teams' }, [
            el('span', { class: 'matchcard__us', text: m.meta.teamUs || 'Εμείς' }),
            el('span', { class: 'matchcard__score', text: sets.length ? setsUs + '–' + setsThem : '—' }),
            el('span', { class: 'matchcard__them', text: m.meta.teamThem || 'Αντίπαλοι' })
          ]),
          el('div', { class: 'matchcard__meta', text: [
            V.ui.fmtDate(m.meta.date),
            m.meta.day ? '· ' + m.meta.day : '',
            m.meta.competition ? '· ' + m.meta.competition : '',
            '· ' + m.events.length + ' καταχωρήσεις'
          ].filter(Boolean).join(' ') })
        ]),
        el('button', {
          class: 'icon-btn',
          title: 'Εξαγωγή',
          text: '\u2193',
          onclick: function () { ctx.exportMatch(m.id); }
        }),
        el('button', {
          class: 'icon-btn icon-btn--danger',
          title: 'Διαγραφή',
          text: '\uD83D\uDDD1',
          onclick: function () {
            V.ui.confirm('Διαγραφή αγώνα', 'Διαγραφή οριστικά τον αγώνα «' +
              (m.meta.teamUs || 'Εμείς') + ' vs ' + (m.meta.teamThem || 'Αντίπαλοι') + '»;', 'Διαγραφή')
              .then(function (ok) { if (ok) { V.Store.remove(m.id); V.ui.toast('Ο αγώνας διαγράφηκε'); } });
          }
        })
      ]));
    });
    wrap.appendChild(list);

    if (matches.length) {
      wrap.appendChild(el('div', { class: 'home__danger' }, [
        el('button', {
          class: 'btn btn--ghost btn--sm',
          text: 'Διαγραφή όλων των δεδομένων',
          onclick: function () {
            V.ui.confirm('Διαγραφή όλων', 'Θα χαθούν όλοι οι αγώνες. Σίγουρα;', 'Διαγραφή όλων')
              .then(function (ok) { if (ok) { V.Store.clearAll(); V.ui.toast('Διαγράφηκαν όλα'); } });
          }
        })
      ]));
    }
    return wrap;
  }

  /* =========================================================
   * Νέος αγώνας
   * ========================================================= */
  function newMatchDialog() {
    var draft = { roster: C.DEFAULT_ROSTER.map(function (d) {
      return {
        id: V.Store.uid('p'), name: d.name, number: '',
        position: d.position, also: d.also
      };
    }) };
    var body = el('div', { class: 'form' });

    var fUs = V.ui.input({ placeholder: 'π.χ. Ολυμπιακός Βόλι' });
    var fThem = V.ui.input({ placeholder: 'π.χ. Παναθηναϊκός' });
    var fDate = V.ui.input({ type: 'date', value: V.Store.todayISO() });
    var fDay = V.ui.input({ placeholder: 'π.χ. 2η αγωνιστική' });
    var fComp = V.ui.input({ placeholder: 'π.χ. Πρωτάθλημα Α' });
    var fVenue = V.ui.input({ placeholder: 'π.χ. Γήπεδο Χ' });

    body.appendChild(el('div', { class: 'grid2' }, [
      V.ui.field('Δική μας ομάδα', fUs),
      V.ui.field('Αντίπαλη ομάδα', fThem)
    ]));
    body.appendChild(el('div', { class: 'grid2' }, [
      V.ui.field('Ημερομηνία', fDate),
      V.ui.field('Αγωνιστική ημέρα', fDay)
    ]));
    body.appendChild(el('div', { class: 'grid2' }, [
      V.ui.field('Διοργάνωση', fComp),
      V.ui.field('Χώροι', fVenue)
    ]));

    /* ρόστερ */
    var rosterBox = el('div', { class: 'roster-box' });
    body.appendChild(el('h3', { class: 'sub', text: 'Ρόστερ (παίκτες που θα παίξουν)' }));
    body.appendChild(rosterBox);

    /* ενδέκη */
    var lineupBox = el('div', { class: 'lineup-box' });
    var lineupState = {};
    function refreshLineup() { renderLineupEditor(lineupBox, draft, lineupState); }
    refreshLineup();
    body.appendChild(el('h3', { class: 'sub', text: 'Ενδέκη Σετ 1 (7 στο γήπεδο)' }));
    body.appendChild(lineupBox);
    renderRoster(rosterBox, draft, refreshLineup);

    var modal = V.ui.modal({
      title: 'Νέος αγώνας',
      size: 'lg',
      body: body,
      actions: [
        { label: 'Άκυρο', variant: 'ghost' },
        {
          label: 'Δημιουργία',
          variant: 'primary',
          onClick: function () {
            if (!fUs.value.trim() && !fThem.value.trim()) {
              V.ui.toast('Βάλε τουλάχιστον ένα όνομα ομάδας', { tone: 'warn' });
              return false;
            }
            var m = V.Store.create({
              teamUs: fUs.value.trim(),
              teamThem: fThem.value.trim(),
              date: fDate.value || V.Store.todayISO(),
              day: fDay.value.trim(),
              competition: fComp.value.trim(),
              venue: fVenue.value.trim()
            });
            /* προσωρινά id -> πραγματικά id του αγώνα */
            var idMap = {};
            draft.roster.forEach(function (p) {
              var created = V.Store.addPlayer(m.id, {
                name: p.name, number: p.number, position: p.position,
                also: p.also
              });
              idMap[p.id] = created ? created.id : null;
            });
            var lineup = {};
            C.COURT_SLOTS.forEach(function (s) {
              lineup[s.id] = lineupState[s.id] ? (idMap[lineupState[s.id]] || null) : null;
            });
            V.Store.setLineup(m.id, 1, lineup);
            V.Store.setCurrent(m.id);
            V.ui.toast('Ο αγώνας δημιουργήθηκε', { tone: 'good' });
            location.hash = '#/m/' + m.id;
          }
        }
      ]
    });
    return modal;
  }

  /* =========================================================
   * Ρόστερ
   * ========================================================= */
  function renderRoster(box, draft, onChange) {
    V.ui.clear(box);

    var add = el('div', { class: 'row-add' });
    var nName = V.ui.input({ placeholder: 'Όνομα παίκτη' });
    var nNum = V.ui.input({ placeholder: 'Νο.', inputmode: 'numeric', style: 'max-width:80px' });
    var nPos = V.ui.select(C.POSITIONS.map(function (p) { return { id: p.id, label: p.label }; }), 'OH');

    /* πρόταση θέσης αν το όνομα είναι γνωστό στην ομάδα */
    nName.addEventListener('input', function () {
      var s = C.suggestPosition(nName.value);
      if (s) { nPos.value = s; nPos.classList.add('is-suggested'); }
      else nPos.classList.remove('is-suggested');
    });

    function findDraft(pid) {
      return draft.roster.filter(function (p) { return p.id === pid; })[0];
    }

    function rerender() {
      renderRoster(box, draft, onChange);
      if (onChange) onChange();
    }

    add.appendChild(nName); add.appendChild(nNum); add.appendChild(nPos);
    add.appendChild(el('button', {
      class: 'btn btn--primary btn--sm',
      text: '＋',
      onclick: function () {
        var name = nName.value.trim();
        if (!name) { V.ui.toast('Γράψε όνομα', { tone: 'warn' }); return; }
        var exists = draft.roster.some(function (p) {
          return C.normName(p.name) === C.normName(name);
        });
        if (exists) { V.ui.toast('Είναι ήδη στο ρόστερ', { tone: 'warn' }); return; }
        var sug = C.suggestPosition(name);
        draft.roster.push({
          id: V.Store.uid('p'), name: name, number: nNum.value,
          position: sug || nPos.value
        });
        nName.value = ''; nNum.value = '';
        nPos.classList.remove('is-suggested');
        rerender();
        nName.focus();
      }
    }));

    box.appendChild(el('div', { class: 'card card--inner' }, [
      add,
      rosterTable(draft.roster, {
        onDelete: function (pid) {
          draft.roster = draft.roster.filter(function (p) { return p.id !== pid; });
          rerender();
        },
        onPosition: function (pid, pos) {
          var p = findDraft(pid);
          if (p) p.position = pos;
          rerender();
        }
      })
    ]));
  }

  function rosterTable(roster, handlers) {
    handlers = handlers || {};
    if (!roster.length) return el('p', { class: 'empty', text: 'Κανένας παίκτης ακόμα.' });

    var posOptions = C.POSITIONS.map(function (o) {
      return '<option value="' + o.id + '">' + o.label + '</option>';
    }).join('');

    var table = V.charts.table(
      ['#', 'Όνομα', 'Θέση', ''],
      roster.map(function (p) {
        return [
          { text: p.number != null && p.number !== '' ? String(p.number) : '—' },
          { text: p.name },
          { html: '<select class="mini-sel" data-pos="' + p.id + '">' + posOptions + '</select>' },
          { html: '<button class="icon-btn icon-btn--danger" data-drop="' + p.id + '" title="Διαγραφή">✕</button>' }
        ];
      })
    );

    /* τοποθέτησε την επιλεγμένη θέση μετά τη δημιουργία του table */
    roster.forEach(function (p) {
      var sel = table.querySelector('[data-pos="' + p.id + '"]');
      if (sel) sel.value = p.position;
    });

    var wrap = el('div', { class: 'table-wrap' }, [table]);

    V.ui.$$('[data-drop]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        if (handlers.onDelete) handlers.onDelete(b.dataset.drop);
      });
    });
    V.ui.$$('[data-pos]', wrap).forEach(function (s) {
      s.addEventListener('change', function () {
        if (handlers.onPosition) handlers.onPosition(s.dataset.pos, s.value);
      });
    });
    return wrap;
  }

  /* =========================================================
   * Ενδέκη (lineup)
   * ========================================================= */

  /* Ποιες θέσεις δέχεται κάθε slot */
  function slotPositions(slotId) {
    if (slotId === 'S') return ['S'];
    if (slotId.indexOf('OH') === 0) return ['OH'];
    if (slotId === 'OPP') return ['OPP'];
    if (slotId.indexOf('MB') === 0) return ['MB'];
    if (slotId.indexOf('L') === 0) return ['L', 'DS'];
    return [];
  }

  /* Ο παίκτης ταιριάζει αν η κύρια θέση του είναι αυτή ή αν μπορεί να παίξει κι εκεί */
  function matchesSlot(p, want) {
    if (!want.length) return true;
    if (want.indexOf(p.position) !== -1) return true;
    return !!(p.also && p.also.some(function (x) { return want.indexOf(x) !== -1; }));
  }

  function optionFor(p) {
    var extra = (p.also && p.also.length) ? ' (' + p.also.join('/') + ')' : '';
    return el('option', {
      value: p.id,
      text: (p.number != null && p.number !== '' ? '#' + p.number + ' ' : '') +
        p.name + ' · ' + p.position + extra
    });
  }

  function renderLineupEditor(box, draft, state, onSlotChange) {
    V.ui.clear(box);
    var roster = draft.roster;

    /* πρώτη φορά που ανοίγει και είναι κενό → γέμισε αυτόματα */
    var empty = C.COURT_SLOTS.every(function (s) { return !state[s.id]; });
    if (empty && roster.length >= 7) autoAssign(state, roster);

    var grid = el('div', { class: 'lineup-grid' });
    var missing = [];

    C.COURT_SLOTS.forEach(function (s) {
      var want = slotPositions(s.id);
      var current = state[s.id];
      var currentPlayer = roster.filter(function (p) { return p.id === current; })[0];

      /* μόνο παίκτες που ταιριάζουν στη συγκεκριμένη θέση */
      var matches = roster.filter(function (p) { return matchesSlot(p, want); });
      if (!matches.length) missing.push(s.reserve ? 'L2' : s.label);

      var sel = el('select', { class: 'input input--select' });
      sel.appendChild(el('option', { value: '', text: '— κενό —' }));

      /* αν ο ήδη επιλεγμένος δεν ταιριάζει, κράτησέ τον ορατό */
      if (currentPlayer && !matches.some(function (p) { return p.id === current; })) {
        sel.appendChild(optionFor(currentPlayer));
      }
      matches.forEach(function (p) { sel.appendChild(optionFor(p)); });

      /* αν δεν υπάρχει κανείς για τη θέση, δείξε όλους ώστε να μη μπλοκάρει */
      if (!matches.length) {
        roster.forEach(function (p) {
          if (p.id !== current) sel.appendChild(optionFor(p));
        });
      }

      sel.value = current || '';
      sel.addEventListener('change', function () {
        state[s.id] = sel.value || null;
        if (onSlotChange) onSlotChange();
      });

      grid.appendChild(el('label', {
        class: 'lineup-slot' + (s.reserve ? ' lineup-slot--reserve' : '') +
          (matches.length ? '' : ' lineup-slot--empty')
      }, [
        el('span', { class: 'lineup-slot__pos' }, [
          el('span', { text: s.reserve ? 'L2' : s.label }),
          el('span', { class: 'slot-count', text: String(matches.length) })
        ]),
        sel
      ]));
    });

    box.appendChild(grid);

    if (missing.length) {
      box.appendChild(el('p', { class: 'field__hint', text: 'Κανένας παίκτης για: ' + missing.join(', ') }));
    }

    box.appendChild(el('div', { class: 'lineup-actions' }, [
      el('button', {
        class: 'btn btn--ghost btn--sm',
        text: '⚡ Αυτόματη εισαγωγή',
        onclick: function () { autoAssign(state, roster); renderLineupEditor(box, draft, state); }
      }),
      roster.length ? null : el('span', { class: 'field__hint', text: 'Πρόσθεσε παίκτες για να ορίσεις ενδέκη.' })
    ]));
  }

  /* Γέμιζει τις 7 θέσεις από το ρόστερ.
   Προτείνεται πρώτα η κύρια θέση, μετά αν μπορεί και σε αυτή,
   και τελευταίο κάθε ελεύθερος παίκτης. */
  function autoAssign(state, roster) {
    var used = {};

    function free() {
      return roster.filter(function (r) { return !used[r.id]; });
    }
    function also(r, pos) {
      return !!(r.also && r.also.indexOf(pos) !== -1);
    }
    function pick(primary, secondary) {
      var cands = free().filter(primary);
      if (!cands.length && secondary) cands = free().filter(secondary);
      if (!cands.length) cands = free();
      var p = cands[0];
      if (!p) return null;
      used[p.id] = true;
      return p.id;
    }
    function is(pos) { return function (p) { return p.position === pos; }; }
    function alsoIs(pos) { return function (p) { return also(p, pos); }; }

    /* σειρά που αποφεύγει να πάρει λιμπέρω για επιθέτη */
    state.S = pick(is('S'), is('DS'));
    state.OH1 = pick(is('OH'), alsoIs('OH'));
    state.OH2 = pick(is('OH'), alsoIs('OH'));
    state.MB1 = pick(is('MB'), alsoIs('MB'));
    state.MB2 = pick(is('MB'), alsoIs('MB'));
    state.OPP = pick(is('OPP'), alsoIs('OPP'));
    state.L = pick(function (p) { return p.position === 'L' || p.position === 'DS'; });
    state.L2 = pick(function (p) { return p.position === 'L' || p.position === 'DS'; });
  }

  /* =========================================================
   * Modal: ενδέκη για συγκεκριμένο σετ (χρησιμοποιείται και στο
   * μενού του αγώνα, οπου το ρόστερ έρχεται από τον αγώνα)
   * ========================================================= */
  function lineupDialog(m, set) {
    var draft = { roster: m.roster.map(function (p) { return Object.assign({}, p); }) };
    var state = {};
    var lu = V.Store.lineup(m, set);
    C.COURT_SLOTS.forEach(function (s) { state[s.id] = lu[s.id] || null; });
    state.activeMB = lu.activeMB;
    state.activeL = lu.activeL;

    var body = el('div', {});
    var box = el('div', { class: 'lineup-box' });
    var sw = el('div', { class: 'lineup-actions' });

    renderLineupEditor(box, draft, state, function () { renderSw(); });
    body.appendChild(box);

    /* ενεργοί MB / L */
    function activeName(slot) {
      var pid = state[slot];
      if (!pid) return '—';
      var p = m.roster.filter(function (x) { return x.id === pid; })[0];
      return p ? p.name : '—';
    }
    function renderSw() {
      V.ui.clear(sw);
      sw.appendChild(el('div', { class: 'swapbox' }, [
        el('span', { class: 'sticky__label', text: 'Ενεργός MB' }),
        el('span', { class: 'swapbox__val', text: activeName(state.activeMB) }),
        el('button', {
          class: 'btn btn--ghost btn--sm', text: '\u21C4 Αλλαγή',
          onclick: function () {
            state.activeMB = state.activeMB === 'MB1' ? 'MB2' : 'MB1';
            V.ui.buzz(12);
            renderSw();
          }
        })
      ]));
      sw.appendChild(el('div', { class: 'swapbox' }, [
        el('span', { class: 'sticky__label', text: 'Ενεργός Λιμπέρω' }),
        el('span', { class: 'swapbox__val', text: activeName(state.activeL) }),
        el('button', {
          class: 'btn btn--ghost btn--sm', text: '\u21C4 Αλλαγή',
          onclick: function () {
            state.activeL = state.activeL === 'L' ? 'L2' : 'L';
            V.ui.buzz(12);
            renderSw();
          }
        })
      ]));
    }
    renderSw();
    body.appendChild(sw);

    V.ui.modal({
      title: 'Ενδέκη Σετ ' + set,
      size: 'lg',
      body: body,
      actions: [
        { label: 'Άκυρο', variant: 'ghost' },
        {
          label: 'Αποθήκευση',
          variant: 'primary',
          onClick: function () {
            V.Store.setLineup(m.id, set, state);
            V.ui.toast('Ενδέκη Σετ ' + set + ' αποθηκεύτηκε', { tone: 'good' });
          }
        }
      ]
    });
  }

  /* =========================================================
   * Modal: ρόστερ αγώνα (από το μενού)
   * ========================================================= */
  function rosterDialog(m) {
    var box = el('div', {});
    var add = el('div', { class: 'row-add' });
    var nName = V.ui.input({ placeholder: 'Όνομα παίκτη' });
    var nNum = V.ui.input({ placeholder: 'Νο.', inputmode: 'numeric', style: 'max-width:80px' });
    var nPos = V.ui.select(C.POSITIONS.map(function (p) { return { id: p.id, label: p.label }; }), 'OH');

    nName.addEventListener('input', function () {
      var s = C.suggestPosition(nName.value);
      if (s) { nPos.value = s; nPos.classList.add('is-suggested'); }
      else nPos.classList.remove('is-suggested');
    });

    function renderList() {
      V.ui.clear(list);
      list.appendChild(rosterTable(m.roster, {
        onDelete: function (pid) {
          V.Store.removePlayer(m.id, pid);
          renderList();
        },
        onPosition: function (pid, pos) {
          V.Store.updatePlayer(m.id, pid, { position: pos });
        }
      }));
    }

    add.appendChild(nName); add.appendChild(nNum); add.appendChild(nPos);
    add.appendChild(el('button', {
      class: 'btn btn--primary btn--sm', text: '＋',
      onclick: function () {
        var name = nName.value.trim();
        if (!name) { V.ui.toast('Γράψε όνομα', { tone: 'warn' }); return; }
        var dup = m.roster.some(function (p) { return C.normName(p.name) === C.normName(name); });
        if (dup) { V.ui.toast('Είναι ήδη στο ρόστερ', { tone: 'warn' }); return; }
        var sug = C.suggestPosition(name);
        V.Store.addPlayer(m.id, {
          name: name, number: nNum.value,
          position: sug || nPos.value
        });
        nName.value = ''; nNum.value = '';
        nPos.classList.remove('is-suggested');
        nName.focus();
        renderList();
      }
    }));

    var list = el('div', { class: 'table-wrap-host' });
    box.appendChild(add);
    box.appendChild(list);
    renderList();

    V.ui.modal({
      title: 'Ρόστερ',
      size: 'lg',
      body: box,
      actions: [{ label: 'Τέλος', variant: 'primary' }]
    });
  }

  V.views = V.views || {};
  V.views.setup = {
    renderHome: renderHome,
    newMatchDialog: newMatchDialog,
    lineupDialog: lineupDialog,
    rosterDialog: rosterDialog,
    renderLineupEditor: renderLineupEditor,
    autoAssign: autoAssign
  };
})(window.V = window.V || {});