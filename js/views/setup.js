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
      el('div', { class: 'brand-mark' }, [el('span', { text: 'V' })]),
      el('p', { class: 'eyebrow', text: 'VOLLEY COMMAND' }),
      el('h1', { text: 'Στήσε τον αγώνα.' }),
      el('p', {
        class: 'home__sub',
        text: 'Γρήγορη καταγραφή, καθαρή εικόνα και στατιστικά που ακολουθούν τον ρυθμό του παιχνιδιού.'
      })
    ]));

    wrap.appendChild(el('div', { class: 'home__top' }, [
      el('h2', { text: matches.length ? 'ΑΓΩΝΕΣ (' + matches.length + ')' : 'ΚΑΝΕΝΑΣ ΑΓΩΝΑΣ ΑΚΟΜΑ' }),
      el('div', { class: 'home-actions' }, [
        el('button', { class: 'btn btn--ghost btn--sm', text: '↓ Εισαγωγή αγώνα', onclick: function () { ctx.importDialog(); } }),
        el('button', { class: 'btn btn--ghost btn--sm', text: '↑ Εξαγωγή όλων', onclick: function () { ctx.exportAll(); } }),
        el('button', { class: 'btn btn--primary btn--sm', text: '＋ Νέος αγώνας', onclick: function () { newMatchDialog(); } })
      ])
    ]));

    var list = el('div', { class: 'match-list' });
    if (!matches.length) {
      list.appendChild(el('p', { class: 'empty', text: 'Δημιούργησε τον πρώτο σου αγώνα για να ξεκινήσεις.' }));
    }
    matches.forEach(function (m) {
      var sets = V.Stats.bySet(m);
      var setsUs = sets.filter(function (s) { return s.us > s.them; }).length;
      var setsThem = sets.filter(function (s) { return s.them > s.us; }).length;
      list.appendChild(el('div', { class: 'match-row' }, [
        el('button', { class: 'match-row__main', onclick: function () { ctx.openMatch(m.id); } }, [
          el('span', { class: 'match-row__teams', text: (m.meta.teamUs || 'Εμείς') + '  ·  ' + (m.meta.teamThem || 'Αντίπαλοι') }),
          el('span', {
            class: 'match-row__meta',
            text: [
              V.ui.fmtDate(m.meta.date),
              m.meta.day,
              m.meta.competition,
              m.events.length + ' καταχωρήσεις'
            ].filter(Boolean).join(' · ')
          })
        ]),
        el('span', { class: 'match-row__score', text: sets.length ? setsUs + '–' + setsThem : '—' }),
        el('button', {
          class: 'icon-btn', title: 'Εξαγωγή .json', text: '↓',
          onclick: function () { ctx.exportMatch(m.id); }
        }),
        el('button', {
          class: 'icon-btn icon-btn--danger', title: 'Διαγραφή', text: '✕',
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
   * Σελίδα Ρόστερ (η τρίτη προβολή μέσα στον αγώνα)
   * ========================================================= */
  function renderRosterPage(ctx) {
    var m = ctx.match;
    var onCourt = {};
    V.Store.courtPlayers(m, ctx.set).forEach(function (p) {
      if (p.playerId) onCourt[p.playerId] = p;
    });

    var list = el('div', { class: 'roster-list' });
    if (!m.roster.length) {
      list.appendChild(el('p', { class: 'empty', text: 'Κανένας παίκτης. Πρόσθεσε παίκτες στα δεξιά.' }));
    }
    m.roster.forEach(function (p) {
      var on = !!onCourt[p.id];
      list.appendChild(el('article', { class: 'roster-row' + (on ? ' is-on-court' : '') }, [
        el('span', { class: 'avatar', text: p.name.charAt(0) }),
        el('div', {}, [
          el('strong', { text: (p.number != null && p.number !== '' ? '#' + p.number + ' ' : '') + p.name }),
          el('small', {
            text: p.position +
              (p.also && p.also.length ? ' (' + p.also.join('/') + ')' : '') +
              ' · ' + (on ? 'Ζώνη ' + onCourt[p.id].zone : 'Πάγκος')
          })
        ]),
        el('button', {
          class: 'icon-btn icon-btn--danger',
          title: 'Διαγραφή ' + p.name,
          disabled: on,
          onclick: function () {
            V.ui.confirm('Διαγραφή παίκτη', 'Διαγραφή τον παίκτη «' + p.name + '»;', 'Διαγραφή')
              .then(function (ok) {
                if (!ok) return;
                V.Store.removePlayer(m.id, p.id);
                V.ui.toast('Ο παίκτης διαγράφηκε', { tone: 'info' });
              });
          }
        }, [V.icon('m6 6 12 12M18 6 6 18', 16)])
      ]));
    });

    /* προσθήκη παίκτη */
    var nName = V.ui.input({ placeholder: 'Όνομα παίκτη' });
    var nNum = V.ui.input({ placeholder: 'Νο.', inputmode: 'numeric' });
    var nPos = V.ui.select(C.POSITIONS.map(function (p) { return { id: p.id, label: p.label }; }), 'OH');
    nName.addEventListener('input', function () {
      var s = C.suggestPosition(nName.value);
      if (s) nPos.value = s;
    });
    function addPlayer() {
      var name = nName.value.trim();
      if (!name) { V.ui.toast('Γράψε όνομα', { tone: 'warn' }); return; }
      V.Store.addPlayer(m.id, {
        name: name,
        number: nNum.value,
        position: nPos.value
      });
      nName.value = ''; nNum.value = '';
      V.ui.toast('Ο ' + name + ' προστέθηκε', { tone: 'good' });
    }
    nName.addEventListener('keydown', function (e) { if (e.key === 'Enter') addPlayer(); });

    var add = el('aside', { class: 'add-player' }, [
      el('p', { class: 'eyebrow', text: 'ΝΕΟΣ ΠΑΙΚΤΗΣ' }),
      el('h2', { text: 'Προσθήκη στο ρόστερ' }),
      el('label', {}, [el('span', { text: 'ΟΝΟΜΑ' }), nName]),
      el('label', {}, [el('span', { text: 'ΑΡΙΘΜΟΣ' }), nNum]),
      el('label', {}, [el('span', { text: 'ΘΕΣΗ' }), nPos]),
      el('button', {
        class: 'btn btn--primary', onclick: addPlayer
      }, [V.icon('M12 5v14M5 12h14', 14), el('span', { text: 'Προσθήκη παίκτη' })])
    ]);

    return el('div', { class: 'content' }, [
      el('div', { class: 'page-title' }, [
        el('div', {}, [
          el('p', { class: 'eyebrow', text: 'TEAM MANAGEMENT' }),
          el('h1', { text: 'Ρόστερ ομάδας' }),
          el('p', { class: 'hint', text: 'Οι παίκτες με πράσινο είναι στο γήπεδο στο τρέχον σετ.' })
        ]),
        el('button', {
          class: 'btn btn--ghost btn--sm',
          text: '☰ Ενδέκη & αλλαγές',
          onclick: function () { V.views.tools.menuDialog(ctx); }
        })
      ]),
      el('div', { class: 'roster-layout' }, [list, add])
    ]);
  }

  /* =========================================================
   * Νέος αγώνας
   * ========================================================= */
  function newMatchDialog() {
    var draft = { roster: C.DEFAULT_ROSTER.map(function (d) {
      return {
        id: V.Store.uid('p'), name: d.name, number: d.number != null ? String(d.number) : '',
        position: d.position, also: d.also
      };
    }) };
    var body = el('div', { class: 'form' });

    var fUs = V.ui.input({ placeholder: 'π.χ. Ολυμπιακός Βόλι', value: C.DEFAULT_TEAM });
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
    function refreshLineup() {
      var empty = C.COURT_SLOTS.every(function (s) { return !lineupState[s.id]; });
      if (empty && draft.roster.length >= 7) autoAssign(lineupState, draft.roster);
      /* νέος αγώνας: δεν υπάρχει ακόμη περιστροφή — δείχνουμε τη βασική */
      renderLineupEditor(lineupBox, {
        roster: draft.roster, order: C.BASE_ORDER, state: lineupState
      });
    }
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

  /* =========================================================
   * Ενδέκη σε σχήμα γηπέδου
   *
   *   ζ4      ζ3      ζ2     μπροστά
   *  ─────────── φιλέ ───────────
   *   ζ5      ζ6      ζ1     πίσω
   *
   * Οι δύο «δεύτεροι» (ΜΒ2, Λ2) μένουν από κάτω, εκεί που δεν
   * πατάει ποτέ ο κανόνας του κεντρικού/λιμπέρω.
   * Οι ζώνες έρχονται από την τρέχουσα περιστροφή, άρα το γήπεδο
   * στο παράθυρο είναι ίδιο με αυτό στην οθόνη του αγώνα.
   * ========================================================= */
  function renderLineupEditor(box, opts) {
    V.ui.clear(box);
    var roster = opts.roster;
    var order = opts.order;
    var state = opts.state;
    var onChange = opts.onChange || function () { };

    var used = {};
    for (var z = 1; z <= 6; z++) used[order[z]] = true;

    var missing = [];
    var court = el('div', { class: 'lc' });

    function cell(slotId, zone, extra) {
      var want = slotPositions(slotId);
      var current = state[slotId];
      var currentPlayer = roster.filter(function (p) { return p.id === current; })[0];

      /* μόνο παίκτες που ταιριάζουν στη συγκεκριμένη θέση */
      var matches = roster.filter(function (p) { return matchesSlot(p, want); });
      if (!matches.length && !extra) missing.push(slotLabel(slotId));

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
        state[slotId] = sel.value || null;
        onChange();
      });

      return el('label', {
        class: 'lc__cell' + (matches.length ? '' : ' lc__cell--empty') + (extra ? ' lc__cell--reserve' : '')
      }, [
        el('span', { class: 'lc__zone', title: C.ZONE_NAMES[zone] || '' }, [
          el('span', { class: 'lc__zonen', text: extra ? '' : String(zone) }),
          el('span', { class: 'lc__slot', text: slotLabel(slotId) }),
          el('span', { class: 'slot-count', text: String(matches.length) })
        ]),
        sel
      ]);
    }

    court.appendChild(el('div', { class: 'lc__row' }, [
      cell(order[4], 4), cell(order[3], 3), cell(order[2], 2)
    ]));
    court.appendChild(el('div', { class: 'lc__net' }, [el('span', { text: 'φιλέ' })]));
    court.appendChild(el('div', { class: 'lc__row' }, [
      cell(order[5], 5), cell(order[6], 6), cell(order[1], 1)
    ]));

    /* όσοι έμειναν εκτός — ο δεύτερος κεντρικός και ο δεύτερος λιμπέρω */
    var rest = C.COURT_SLOTS.filter(function (s) { return !used[s.id]; });
    if (rest.length) {
      court.appendChild(el('div', { class: 'lc__rest' }, [
        el('span', { class: 'lc__restlbl', text: 'Εκτός γηπέδου' })
      ].concat(rest.map(function (s) {
        return cell(s.id, 0, true);
      }))));
    }

    box.appendChild(court);

    if (missing.length) {
      box.appendChild(el('p', { class: 'field__hint', text: 'Κανένας παίκτης για: ' + missing.join(', ') }));
    }

    box.appendChild(el('div', { class: 'lineup-actions' }, [
      el('button', {
        class: 'btn btn--ghost btn--sm',
        text: '⚡ Αυτόματη εισαγωγή',
        onclick: function () {
          autoAssign(state, roster);
          onChange();
          renderLineupEditor(box, opts);
        }
      }),
      roster.length ? null : el('span', { class: 'field__hint', text: 'Πρόσθεσε παίκτες για να ορίσεις ενδέκη.' })
    ]));
  }

  /* ετικέτα θέσης: κρατάμε το νούμερο όταν ξεχωρίζει τον ενεργό
     από τον δεύτερο (ΜΒ1/ΜΒ2, L/L2) */
  function slotLabel(slotId) {
    if (slotId === 'MB1') return 'MB1';
    if (slotId === 'MB2') return 'MB2';
    if (slotId === 'L2') return 'L2';
    var s = V.byId(C.COURT_SLOTS, slotId);
    return s ? s.label : slotId;
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

    /* οι ζώνες προέρχονται από την τρέχουσα περιστροφή του σετ —
       έτσι το γήπεδο στο παράθυρο είναι όπως στην οθόνη */
    var order = V.Store.game(m, set).order;

    /* πρώτη φορά που ανοίγει και είναι κενό → γέμισε αυτόματα */
    var empty = C.COURT_SLOTS.every(function (s) { return !state[s.id]; });
    if (empty && draft.roster.length >= 7) autoAssign(state, draft.roster);

    var body = el('div', {});
    var box = el('div', { class: 'lineup-box' });
    var sw = el('div', { class: 'lineup-actions' });

    var opts = {
      roster: draft.roster,
      order: order,
      state: state,
      onChange: function () { renderSw(); }
    };
    renderLineupEditor(box, opts);
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
    renderRosterPage: renderRosterPage,
    newMatchDialog: newMatchDialog,
    lineupDialog: lineupDialog,
    rosterDialog: rosterDialog,
    renderLineupEditor: renderLineupEditor,
    autoAssign: autoAssign
  };
})(window.V = window.V || {});