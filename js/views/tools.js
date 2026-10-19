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
      /* awardPoint, όχι addPoint: αν το χειροκίνητο +1 κάνει side-out,
         πρέπει να περιστραφεί η ομάδα στο γήπεδο */
      V.Store.awardPoint(ctx.match.id, ctx.set, key, d);
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
    /* ειδική τιμή: να φύγει χωρίς να μπει κανείς */
    var NO_IN = '__none__';

    /* Όχι μόνο το τρέχον σετ: πολλές φορές διορθώνουμε αλλαγή
       παλιότερου σετ. */
    var sets = [];
    for (var n = 1; n <= V.Store.currentSet(m); n++) sets.push(n);
    if (!sets.length) sets = [1];
    if (sets.indexOf(ctx.set) === -1) sets.push(ctx.set);

    var setSel = V.ui.select(
      sets.map(function (n) { return { id: String(n), label: 'Σετ ' + n }; }),
      String(ctx.set)
    );
    body.appendChild(V.ui.field('Σετ', setSel));

    var outSel = V.ui.select([], '');
    var inSel = V.ui.select([], '');
    var warn = el('div', {});

    function refresh() {
      /* κράτα τις επιλογές του χρήστη όταν ξαναφτιάχνουμε τις λίστες */
      var keepOut = outSel.value;
      var keepIn = inSel.value;

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
      inSel.appendChild(el('option', { value: NO_IN, text: '— χωρίς αντικατάσταση —' }));
      m.roster.forEach(function (p) {
        if (onCourt[p.id]) return;
        inSel.appendChild(el('option', { value: p.id, text: (p.number != null ? '#' + p.number + ' ' : '') + p.name + ' (' + p.position + ')' }));
      });

      /* Το «Αποχώρησε» γεμίζει από την ενδέκη του σετ. Αν το σετ δεν έχει
         ενδέκη, η λίστα μένει κενή — και ο χρήστης βλέπει ένα κενό
         dropdown χωρίς εξήγηση. Το λέμε ρητά και δίνουμε αντιγραφή
         από το πιο πρόσφατο σετ που έχει. */
      V.ui.clear(warn);
      var lastWith = 0;
      for (var i = sets.length - 1; i >= 0; i--) {
        if (V.Store.hasLineup(m, sets[i])) { lastWith = sets[i]; break; }
      }
      if (!V.Store.hasLineup(m, set)) {
        warn.appendChild(el('div', { class: 'issues' }, [
          el('span', { class: 'sticky__label', text: 'Προσοχή' }),
          el('p', {
            class: 'hint is-error',
            text: 'Το Σετ ' + set + ' δεν έχει ενδέκη — δεν υπάρχουν παίκτες για αποχώρηση.'
          }),
          lastWith ? el('button', {
            class: 'btn btn--sm',
            text: '⧉ Αντιγραφή ενδέκης από το Σετ ' + lastWith,
            onclick: function () {
              V.Store.setLineup(m.id, set, V.Store.lineup(m, lastWith));
              refresh();
              V.ui.toast('Ενδέκη Σετ ' + lastWith + ' αντιγράφηκε στο Σετ ' + set, { tone: 'good' });
            }
          }) : null
        ]));
      } else if (lastWith && lastWith !== set) {
        warn.appendChild(el('p', {
          class: 'field__hint',
          text: 'Το Σετ ' + set + ' έχει δική του ενδέκη.'
        }));
      }
    }
    setSel.addEventListener('change', refresh);
    refresh();

    body.appendChild(warn);
    body.appendChild(el('div', { class: 'grid2' }, [
      V.ui.field('Αποχώρησε (από το γήπεδο)', outSel),
      V.ui.field('Μπήκε (από τον πάγκο)', inSel)
    ]));

    /* ιστορικό αλλαγών */
    function renderHist() {
      V.ui.clear(hist);
      if (!m.subs.length) {
        hist.appendChild(el('p', { class: 'empty', text: 'Καμία αλλαγή.' }));
        return;
      }
      hist.appendChild(V.charts.table(
        ['Σετ', 'Έφυγε', 'Ήρθε', ''],
        m.subs.map(function (s) {
          return [
            { text: String(s.set) },
            { text: V.Store.playerName(m, s.outId) },
            { text: s.inId ? V.Store.playerName(m, s.inId) : '— χωρίς αντικατάσταση —' },
            { html: '<button class="icon-btn icon-btn--danger" data-sid="' + s.id + '" title="Διαγραφή">✕</button>' }
          ];
        })
      ));
      V.ui.$$('[data-sid]', hist).forEach(function (b) {
        b.addEventListener('click', function () {
          V.Store.removeSub(m.id, b.dataset.sid);
          renderHist();
          V.ui.toast('Η αλλαγή διαγράφηκε', { tone: 'info', duration: 1500 });
        });
      });
    }
    var hist = el('div', { class: 'subs-hist' });
    renderHist();

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
            var outId = outSel.value;
            var inId = inSel.value;
            if (!outId) { V.ui.toast('Διάλεξε ποιος φεύγει', { tone: 'warn' }); return false; }

            var removeOnly = inId === NO_IN;
            if (!removeOnly && !inId) { V.ui.toast('Διάλεξε ποιος μπαίνει ή «χωρίς αντικατάσταση»', { tone: 'warn' }); return false; }

            var set = Number(setSel.value);
            var lu = V.Store.lineup(m, set);
            var slot = null;
            C.COURT_SLOTS.forEach(function (s) { if (lu[s.id] === outId) slot = s.id; });
            if (!slot) {
              V.ui.toast('Ο έφυγε δεν είναι στην ενδέκη αυτού του σετ', { tone: 'warn' });
              return false;
            }

            /* κράτα ΟΛΟΚΛΗΡΗ την ενδέκη — και τα activeMB/activeL,
               αλλιώς το setLineup τα μηδενίζει */
            var patch = {};
            Object.keys(lu).forEach(function (k) { patch[k] = lu[k]; });

            if (removeOnly) {
              patch[slot] = null;
              /* αν έφυγε ο ενεργός λιμπέρω, επίστρεψε στον άλλον */
              if (slot === 'L' && lu.activeL === 'L' && lu.L2) patch.activeL = 'L2';
              if (slot === 'L2' && lu.activeL === 'L2' && lu.L) patch.activeL = 'L';
            } else {
              patch[slot] = inId;
              /* μπαίνει λιμπέρω → γίνεται ο ενεργός (L2) */
              if (slot === 'L') { patch.L2 = inId; patch.activeL = 'L2'; }
              if (slot === 'L2') patch.L2 = inId;
            }

            V.Store.setLineup(m.id, set, patch);
            V.Store.addSub(m.id, {
              set: set, outId: outId,
              inId: removeOnly ? null : inId
            });

            var outName = V.Store.playerName(m, outId);
            V.ui.toast(
              removeOnly
                ? outName + ' βγήκε από το γήπεδο (χωρίς αντικατάσταση)'
                : outName + ' ⇄ ' + V.Store.playerName(m, inId),
              { tone: 'good' }
            );
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
    body.appendChild(item('\u270F\uFE0F', 'Χειροκίνητη καταχώρηση', 'Χτυπήματα · Υποδοχές · Πάσες · Σερβίς', function () { V.views.entry.entryDialog(ctx); }));
    body.appendChild(item('\uD83D\uDD04', 'Αλλαγή παίκτη', m.subs.length + ' αλλαγές', function () { subsDialog(ctx); }));
    body.appendChild(item('\uD83D\uDCCC', 'Νέο σετ', 'Συνέχεια στο επόμενο σετ', function () { nextSet(ctx); }));
    body.appendChild(item('\u270F', 'Στοιχεία αγώνα', 'Ομάδες, ημερομηνία, ημέρα', function () { metaDialog(ctx); }));
    body.appendChild(toggleAutoScore(ctx));
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

    body.appendChild(item('\u2193', 'Εξαγωγή αγώνα (.json)', 'Στείλε το αρχείο στο κινητό σου', function () { EX().exportMatch(m); }));
    body.appendChild(item('\u2197', 'Εξαγωγή CSV', 'Excel: σύνοψη, παίκτες, καταχωρήσεις', function () { EX().exportCSV(m); }));
    body.appendChild(item('\u2191', 'Εισαγωγή αγώνα', 'Από αρχείο ή επικόλληση', function () { EX().importDialog(); }));
    body.appendChild(item('\uD83D\uDD17', 'Εμφάνιση/απόκρυψη', 'Οδηγίες χρήσης', function () { helpDialog(); }));

    var d = V.ui.modal({ title: 'Μενού αγώνα', body: body, actions: [{ label: 'Κλείσιμο', variant: 'ghost' }] });
  }

  /* =========================================================
   * Αυτόματο σκορ — on/off
   * ========================================================= */
  function toggleAutoScore(ctx) {
    var on = ctx.match.autoScore !== false;
    var btn = el('button', { class: 'switch' }, [
      el('span', { class: 'switch__track' + (on ? ' is-on' : '') }, [el('span', { class: 'switch__dot' })]),
      el('span', { class: 'switch__text' }, [
        el('span', { class: 'switch__label', text: 'Αυτόματο σκορ' }),
        el('span', {
          class: 'switch__desc',
          text: on ? 'Μαθαίνουν το σκορ από τα στατιστικά' : 'Απενεργοποιημένο — βάλε το σκορ χειροκίνητα'
        })
      ])
    ]);
    btn.addEventListener('click', function () {
      V.Store.setAutoScore(ctx.match.id, !(ctx.match.autoScore !== false));
      V.ui.buzz(10);
      V.ui.toast((ctx.match.autoScore !== false) ? 'Αυτόματο σκορ: ΕΝΕΡΓΟ' : 'Αυτόματο σκορ: ΕΝΕΡΓΟΠΟΙΗΜΕΝΟ',
        { tone: 'info', duration: 1500 });
    });
    return el('div', { class: 'menu__toggle' }, [btn]);
  }

  /* =========================================================
   * Βοήθεια
   * ========================================================= */
  function helpDialog() {
    V.ui.modal({
      title: 'Οδηγίες χρήσης',
      size: 'lg',
      body: el('div', { class: 'help' }, [
        el('h4', { text: 'Γήπεδο (νέο)' }),
        el('ul', {}, [
          el('li', { text: 'Η πρώτη καρτέλα είναι το γήπεδο: πάνω η αντίπαλος (απλοί κύκλοι), κάτω η δική σου ομάδα.' }),
          el('li', { text: 'Πατάς «Ξεκίνα το σετ» και διαλέγεις μόνο σε ποια ζώνη (1-6) είναι ο παίκτης σερβίς. Θεωρούμε ότι σερβίρει η δική μας ομάδα.' }),
          el('li', { text: 'Ζώνη 1 = πίσω δεξιά, από όπου σερβίρει. Οι υπόλοιπες 5 μπαίνουν μόνες τους.' }),
          el('li', { text: 'Σερβίρουν αυτοί → πάτα ποιος υπέδεξε, βάλε τον τύπο (0-3), μετά πάτα ποιος χτύπησε, ο παίκτης σερβίς βαθμολογεί την πάσα και εσύ το χτύπημα.' }),
          el('li', { text: 'Σερβίρουμε εμείς → πάτα τον σερβιέρ και Άλμα/Float με Ace / Out / Difficult / Σώθηκε.' }),
          el('li', { text: 'Μόλις κερδίσεις το σερβίς, η ομάδα περιστρέφεται μόνη της. Ισχύει και αν αλλάξεις το σκορ με το +/−.' }),
          el('li', { text: 'Ο κεντρικός δεν παίζει πίσω, εκτός από τη ζώνη 1: όταν πάει να σερβίρει, μπαίνει ο δεύτερος κεντρικός μπροστά και ο λιμπέρω βγαίνει. Στην επόμενη περιστροφή ξαναμπαίνει ο λιμπέρω.' }),
          el('li', { text: 'Σερβίρει ΠΑΝΤΑ ο παίκτης της ζώνης 1. Αν πατήσεις άλλον σου λέει ποιος σερβίρει.' })
        ]),
        el('h4', { text: 'Γρήγορη καταχώρηση' }),
        el('ul', {}, [
          el('li', { text: 'Οι παλιές καρτέλες (Χτυπ. / Υποδ. / Πάσες / Σερβ.) παραμένουν για όσους θέλουν στατ μία-μία.' }),
          el('li', { text: 'Ο «Τύπος σερβίς» μένει επιλεγμένος — άλλαξέ τον μόνο αν χρειάζεται.' }),
          el('li', { text: 'Το σκορ μαθαίνεται αυτόματα από τα στατιστικά. Αν το θες χειροκίνητα, άνοιξε ☰ → Αυτόματο σκορ.' }),
          el('li', { text: 'Κάθε καταχώρηση έχει «Undo» στο μήνυμα. Μπορείς να επεξεργαστείς ή διαγράψεις από το Λογόδιο.' })
        ]),
        el('h4', { text: 'Χτυπήματα' }),
        el('p', { text: 'Tip / Spike. Για κάθε είδος: Point, Saved, Blocked Saved, Blocked, Out/Net. Το Block Saved δίνει πόντο (μπλόκαραν κι εμείς σώσαμε).' }),
        el('h4', { text: 'Υποδοχές & Άμυνα' }),
        el('p', { text: 'Υποδοχή: τύπος 0 = χωρίς μπλόκ, 1 = OH, 2 = OH-OPP, 3 = OH-OPP-MB. Ο τύπος 0 δίνει πόντο στον αντίπαλο.' }),
        el('p', { text: 'Άμυνα (το 🗡 κάτω από το γήπεδο): πάτα το κουμπί, μετά τον παίκτη που έκανε την άμυνα, και βαθμολόγησε 0-3.' }),
        el('h4', { text: 'Πάσες' }),
        el('p', { text: 'Διάλεξε σε ποιον πήγε και τυχόν πρόβλημα. Με το «Καθαρή» καταχωρείς πάσα χωρίς πρόβλημα.' }),
        el('h4', { text: 'Σερβίς' }),
        el('p', { text: 'Άλμα ή Float, και μετά Ace / Out / Difficult / Σώθηκε. Προαιρετικά ζώνη 1-6, 9.' }),
        el('h4', { text: 'Σημειώσεις' }),
        el('p', { text: 'Το πλαίσιο «Γρήγορη σημείωση» κάτω από το γήπεδο αποθηκεύει ελεύθερες σημειώσεις. Θα τις βρεις στα Στατιστικά → Σημειώσεις.' }),
        el('h4', { text: 'Σετ & αλλαγές' }),
        el('p', { text: 'Στο μενού (☰) υπάρχει «Νέο σετ» (σε βοηθά να ξαναγράψεις τους 7 παίκτες) και «Αλλαγή παίκτη».' }),
        el('h4', { text: 'Μοίρασμα' }),
        el('p', { text: 'Η εξαγωγή βγάζει αρχείο .json. Το στέλνεις στο κινητό σου (e-mail, Drive, Viber, WhatsApp) και το εισάγεις από «Εισαγωγή αγώνα».' })
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