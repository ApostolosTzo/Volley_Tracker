/* =============================================================
 * views/tools.js — ταμπλό, αλλαγές παικτών, μενού, νέο σετ
 * ============================================================= */
(function (V) {
  'use strict';

  var el = V.ui.el;
  var C = V.CONFIG;
  var EX = function () { return V.exporter; };

  /* =========================================================
   * Ταμπλό σκορο
   * ========================================================= */
  function scoreboard(ctx) {
    var m = ctx.match;
    var set = ctx.set;
    var sc = V.Store.score(m, set);

    var box = el('div', { class: 'scoreboard' });

    /* ομάδα μας */
    box.appendChild(side(ctx, 'us', m.meta.teamUs || 'Εμείς', sc.us, sc.timeoutsUs));

    /* κέντρο */
    box.appendChild(el('div', { class: 'scoreboard__mid' }, [
      el('div', { class: 'scoreboard__set', text: 'Σετ ' + set }),
      el('div', { class: 'scoreboard__vs', text: String(sc.us) + ' – ' + String(sc.them) }),
      el('div', { class: 'scoreboard__sets' }, V.Stats.bySet(m).map(function (r) {
        return el('span', {
          class: 'setsq' + (r.set === set ? ' is-active' : '') + (r.us > r.them ? ' setsq--us' : (r.them > r.us ? ' setsq--them' : '')),
          text: String(r.set),
          onclick: function () { ctx.setSet(r.set); }
        });
      }))
    ]));

    /* αντίπαλοι */
    box.appendChild(side(ctx, 'them', m.meta.teamThem || 'Αντίπαλοι', sc.them, sc.timeoutsThem));

    return box;
  }

  function side(ctx, key, name, score, timeouts) {
    function bump(d) {
      V.ui.buzz(8);
      V.Store.addPoint(ctx.match.id, ctx.set, key, d);
    }
    return el('div', { class: 'sb-side sb-side--' + key }, [
      el('div', { class: 'sb-side__name', text: name }),
      el('div', { class: 'sb-side__row' }, [
        el('button', { class: 'sb-btn sb-btn--minus', text: '−', 'aria-label': 'Αφαίρεση πόντου', onclick: function () { bump(-1); } }),
        el('span', { class: 'sb-score', text: String(score || 0) }),
        el('button', { class: 'sb-btn sb-btn--plus', text: '+', 'aria-label': 'Πόντος', onclick: function () { bump(1); } })
      ]),
      el('div', { class: 'sb-side__to' }, [
        el('span', { class: 'sb-to', text: 'T/O ' + (timeouts || 0) }),
        el('button', {
          class: 'icon-btn', text: '+', title: 'Timeout',
          onclick: function () { V.Store.addTimeout(ctx.match.id, ctx.set, key, 1); }
        })
      ])
    ]);
  }

  /* =========================================================
   * Γραμμή ενδέκης (μικρή, κάτω από ταμπλό)
   * ========================================================= */
  function lineupStrip(ctx) {
    var m = ctx.match;
    var lu = V.Store.lineup(m, ctx.set);
    var chips = [];
    C.COURT_SLOTS.forEach(function (s) {
      var pid = lu[s.id];
      if (!pid) return;
      var inactive = (s.id === 'MB1' && lu.activeMB === 'MB2') ||
        (s.id === 'MB2' && lu.activeMB === 'MB1') ||
        (s.id === 'L' && lu.activeL === 'L2') ||
        (s.id === 'L2' && lu.activeL === 'L');
      chips.push(el('span', {
        class: 'lchip' + (inactive ? ' lchip--off' : ''),
        title: inactive ? 'Εφεδρικός' : ''
      }, [
        el('span', { class: 'lchip__pos', text: s.reserve ? 'L2' : s.label }),
        el('span', { class: 'lchip__name', text: V.Store.playerName(m, pid) })
      ]));
    });
    if (!chips.length) {
      return el('button', {
        class: 'strip strip--empty',
        text: '＋ Όρισε ενδέκη Σετ ' + ctx.set,
        onclick: function () { V.views.setup.lineupDialog(m, ctx.set); }
      });
    }
    return el('div', { class: 'strip' }, [
      el('div', { class: 'strip__chips' }, chips),
      el('button', {
        class: 'btn btn--ghost btn--sm',
        text: 'Ενδέκη',
        onclick: function () { V.views.setup.lineupDialog(m, ctx.set); }
      })
    ]);
  }

  /* =========================================================
   * Αλλαγές παικτών
   * ========================================================= */
  function subsDialog(ctx) {
    var m = ctx.match;
    var body = el('div', {});

    var setSel = V.ui.select(
      [V.Store.currentSet(m)].filter(function (v, i, a) { return a.indexOf(v) === i; })
        .map(function (n) { return { id: String(n), label: 'Σετ ' + n }; }),
      String(ctx.set)
    );
    body.appendChild(V.ui.field('Σετ', setSel));

    var outSel = V.ui.select([], '');
    var inSel = V.ui.select([], '');

    function refresh() {
      var set = Number(setSel.value);
      var lu = V.Store.lineup(m, set);
      var onCourt = {};
      C.COURT_SLOTS.forEach(function (s) { if (lu[s.id]) onCourt[lu[s.id]] = s; });

      V.ui.clear(outSel);
      outSel.appendChild(el('option', { value: '', text: '— διάλεξε —' }));
      C.COURT_SLOTS.forEach(function (s) {
        if (!lu[s.id]) return;
        outSel.appendChild(el('option', {
          value: lu[s.id],
          text: (s.reserve ? 'L2 ' : s.label + ' ') + V.Store.playerName(m, lu[s.id])
        }));
      });

      V.ui.clear(inSel);
      inSel.appendChild(el('option', { value: '', text: '— διάλεξε —' }));
      m.roster.forEach(function (p) {
        if (onCourt[p.id]) return;
        inSel.appendChild(el('option', { value: p.id, text: (p.number != null ? '#' + p.number + ' ' : '') + p.name + ' (' + p.position + ')' }));
      });
    }
    setSel.addEventListener('change', refresh);
    outSel.addEventListener('change', refresh);
    refresh();

    body.appendChild(el('div', { class: 'grid2' }, [
      V.ui.field('Αποχώρησε (από το γήπεδο)', outSel),
      V.ui.field('Μπήκε (από τον πάγκο)', inSel)
    ]));

    /* ιστορικό αλλαγών */
    var hist = el('div', { class: 'subs-hist' });
    if (!m.subs.length) hist.appendChild(el('p', { class: 'empty', text: 'Καμία αλλαγή.' }));
    else {
      hist.appendChild(V.charts.table(
        ['Σετ', 'Έφυγε', 'Ήρθε', ''],
        m.subs.map(function (s) {
          return [
            { text: String(s.set) },
            { text: V.Store.playerName(m, s.outId) },
            { text: V.Store.playerName(m, s.inId) },
            { html: '<button class="icon-btn icon-btn--danger" data-sid="' + s.id + '">✕</button>' }
          ];
        })
      ));
      V.ui.$$('[data-sid]', hist).forEach(function (b) {
        b.addEventListener('click', function () {
          V.Store.removeSub(m.id, b.dataset.sid);
          b.closest('tr').remove();
        });
      });
    }

    V.ui.modal({
      title: 'Αλλαγή παίκτη',
      size: 'lg',
      body: el('div', {}, [
        body,
        el('h3', { class: 'sub', text: 'Ιστορικό αλλαγών' }),
        hist
      ]),
      actions: [
        { label: 'Άκυρο', variant: 'ghost' },
        {
          label: 'Κάνε την αλλαγή',
          variant: 'primary',
          onClick: function () {
            var outId = outSel.value, inId = inSel.value;
            if (!outId || !inId) { V.ui.toast('Διάλεξε ποιος φεύγει και ποιος μπαίνει', { tone: 'warn' }); return false; }
            var set = Number(setSel.value);
            var lu = V.Store.lineup(m, set);
            var slot = null;
            C.COURT_SLOTS.forEach(function (s) { if (lu[s.id] === outId) slot = s.id; });

            var patch = {};
            C.COURT_SLOTS.forEach(function (s) { patch[s.id] = lu[s.id]; });
            if (slot) {
              patch[slot] = inId;
              /* λιμπέρω που μπαίνει → δεύτερη θέση L2 */
              if (slot === 'L') { patch.L2 = inId; patch.activeL = 'L2'; }
            } else {
              V.ui.toast('Ο έφυγε δεν είναι στην ενδέκη αυτού του σετ', { tone: 'warn' });
              return false;
            }
            V.Store.setLineup(m.id, set, patch);
            V.Store.addSub(m.id, { set: set, outId: outId, inId: inId });
            V.ui.toast('Αλλαγή: ' + V.Store.playerName(m, outId) + ' ⇄ ' + V.Store.playerName(m, inId), { tone: 'good' });
          }
        }
      ]
    });
  }

  /* =========================================================
   * Νέο σετ
   * ========================================================= */
  function nextSet(ctx) {
    var m = ctx.match;
    var cur = V.Store.currentSet(m);
    var next = cur + 1;

    V.Store.score(m, next);   /* δημιουργεί κενό σκορ */
    ctx.setSet(next);
    V.ui.toast('Σετ ' + next, { tone: 'info' });
    V.views.setup.lineupDialog(m, next);
  }

  /* =========================================================
   * Στοιχεία αγώνα (επεξεργασία)
   * ========================================================= */
  function metaDialog(ctx) {
    var m = ctx.match;
    var fUs = V.ui.input({ value: m.meta.teamUs });
    var fThem = V.ui.input({ value: m.meta.teamThem });
    var fDate = V.ui.input({ type: 'date', value: m.meta.date });
    var fDay = V.ui.input({ value: m.meta.day });
    var fComp = V.ui.input({ value: m.meta.competition });
    var fVenue = V.ui.input({ value: m.meta.venue });
    var fNotes = el('textarea', { class: 'input', rows: '3' });
    fNotes.value = m.meta.notes || '';

    V.ui.modal({
      title: 'Στοιχεία αγώνα',
      body: el('div', { class: 'form' }, [
        el('div', { class: 'grid2' }, [V.ui.field('Δική ομάδα', fUs), V.ui.field('Αντίπαλος', fThem)]),
        el('div', { class: 'grid2' }, [V.ui.field('Ημερομηνία', fDate), V.ui.field('Αγωνιστική ημέρα', fDay)]),
        el('div', { class: 'grid2' }, [V.ui.field('Διοργάνωση', fComp), V.ui.field('Χώροι', fVenue)]),
        V.ui.field('Σημειώσεις', fNotes)
      ]),
      actions: [
        { label: 'Άκυρο', variant: 'ghost' },
        {
          label: 'Αποθήκευση', variant: 'primary',
          onClick: function () {
            V.Store.updateMeta(m.id, {
              teamUs: fUs.value.trim(), teamThem: fThem.value.trim(),
              date: fDate.value, day: fDay.value.trim(),
              competition: fComp.value.trim(), venue: fVenue.value.trim(),
              notes: fNotes.value
            });
            V.ui.toast('Αποθηκεύτηκε', { tone: 'good' });
          }
        }
      ]
    });
  }

  /* =========================================================
   * Μενού αγώνα
   * ========================================================= */
  function menuDialog(ctx) {
    var m = ctx.match;
    var body = el('div', { class: 'menu' });

    function item(icon, label, desc, onClick) {
      return el('button', { class: 'menu__item', onclick: function () { d.close(); setTimeout(onClick, 120); } }, [
        el('span', { class: 'menu__icon', text: icon }),
        el('span', { class: 'menu__text' }, [
          el('span', { class: 'menu__label', text: label }),
          desc ? el('span', { class: 'menu__desc', text: desc }) : null
        ])
      ]);
    }

    body.appendChild(item('\uD83D\uDDC3', 'Ρόστερ', m.roster.length + ' παίκτες', function () { V.views.setup.rosterDialog(m); }));
    body.appendChild(item('\uD83C\uDDF0', 'Ενδέκη Σετ ' + ctx.set, 'Επιλογή 7 παικτών + swap MB/L', function () { V.views.setup.lineupDialog(m, ctx.set); }));
    body.appendChild(item('\uD83D\uDD04', 'Αλλαγή παίκτη', m.subs.length + ' αλλαγές', function () { subsDialog(ctx); }));
    body.appendChild(item('\uD83D\uDCCC', 'Νέο σετ', 'Συνέχεια στο επόμενο σετ', function () { nextSet(ctx); }));
    body.appendChild(item('\u270F', 'Στοιχεία αγώνα', 'Ομάδες, ημερομηνία, ημέρα', function () { metaDialog(ctx); }));
    body.appendChild(item('\uD83D\uDCCC', 'Διαγραφή Σετ ' + ctx.set, 'Σκορ, στατιστικά & ενδέκη του σετ', function () {
      V.ui.confirm('Διαγραφή Σετ ' + ctx.set, 'Θα χαθούν όλα τα στατιστικά του σετ ' + ctx.set + '.', 'Διαγραφή')
        .then(function (ok) {
          if (!ok) return;
          V.Store.deleteSet(m.id, ctx.set);
          ctx.setSet(1);
          V.ui.toast('Το σετ διαγράφηκε', { tone: 'info' });
        });
    }));

    body.appendChild(el('hr', { class: 'menu__sep' }));

    body.appendChild(item('\u2193', 'Εξαγωγή αγώνα (.volley)', 'Στείλε το σε άλλον με την ίδια εφαρμογή', function () { EX().exportMatch(m); }));
    body.appendChild(item('\u2197', 'Εξαγωγή CSV', 'Excel: σύνοψη, παίκτες, καταχωρήσεις', function () { EX().exportCSV(m); }));
    body.appendChild(item('\u2191', 'Εισαγωγή αγώνα', 'Άνοιξε .volley αρχείο', function () { EX().importFile(); }));
    body.appendChild(item('\uD83D\uDD17', 'Εμφάνιση/απόκρυψη', 'Οδηγίες χρήσης', function () { helpDialog(); }));

    var d = V.ui.modal({ title: 'Μενού αγώνα', body: body, actions: [{ label: 'Κλείσιμο', variant: 'ghost' }] });
  }

  /* =========================================================
   * Βοήθεια
   * ========================================================= */
  function helpDialog() {
    V.ui.modal({
      title: 'Οδηγίες χρήσης',
      size: 'lg',
      body: el('div', { class: 'help' }, [
        el('h4', { text: 'Γρήγορη καταχώρηση' }),
        el('ul', {}, [
          el('li', { text: 'Διάλεξε παίκτη (πάνω) και μετά πάτα το αποτέλεσμα. Ένα στατ σε 2 πατήματα.' }),
          el('li', { text: 'Το «Στόχος υποδοχής», η «Άμυνα από» και ο «Τύπος σερβίς» μένουν επιλεγμένα — άλλαξε τους μόνο αν χρειάζεται.' }),
          el('li', { text: 'Το κουμπί ⇄ MB / ⇄ L αλλάζει ποιος είναι ενεργός, χωρίς να μπερδεύονται τα στατιστικά.' }),
          el('li', { text: 'Κάθε καταχώρηση έχει «Undo» στο μήνυμα. Μπορείς να επεξεργαστείς ή διαγράψεις από το Λογόδιο.' })
        ]),
        el('h4', { text: 'Χτυπήματα' }),
        el('p', { text: 'Tip / Spike / Place. Για κάθε είδος: Point, Σώθηκε, Block, Out/Net. Δείξε το «τι έκανε κάθε παίκτης» στο ιστορικό.' }),
        el('h4', { text: 'Υποδοχές' }),
        el('p', { text: 'Τύπος υποδοχής: 1 = μόνο OH, 2 = OH-OPP, 3 = OH-OPP-MB. Αποτέλεσμα: Point / Ace / Λάθος / Ασθενές.' }),
        el('h4', { text: 'Πάσες' }),
        el('p', { text: 'Διάλεξε σε ποιον πήγε και τυχόν πρόβλημα. Με το «Καθαρή» καταχωρείς πάσα χωρίς πρόβλημα.' }),
        el('h4', { text: 'Σερβίς' }),
        el('p', { text: 'Άλμα ή Float, και μετά Ace / Out / Σώθηκε. Προαιρετικά ζώνη 1-6, 9.' }),
        el('h4', { text: 'Σετ & αλλαγές' }),
        el('p', { text: 'Στο μενού (☰) υπάρχει «Νέο σετ» (σε βοηθά να ξαναγράψεις τους 7 παίκτες) και «Αλλαγή παίκτη».' }),
        el('h4', { text: 'Μοίρασμα' }),
        el('p', { text: 'Εξαγωγή .volley στέλνεις το αρχείο σε άλλον που έχει την εφαρμογή (μέσω e-mail, Drive, Viber κ.λπ.) και το εισάγει από «Εισαγωγή αγώνα».' })
      ]),
      actions: [{ label: 'ΟΚ', variant: 'primary' }]
    });
  }

  V.views = V.views || {};
  V.views.tools = {
    scoreboard: scoreboard,
    lineupStrip: lineupStrip,
    subsDialog: subsDialog,
    nextSet: nextSet,
    metaDialog: metaDialog,
    menuDialog: menuDialog,
    helpDialog: helpDialog
  };
})(window.V = window.V || {});