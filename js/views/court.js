/* =============================================================
 * views/court.js — το γήπεδο: η οθόνη που ακολουθεί τη ροή του παιχνιδιού
 *
 *   πάνω    : η αντίπαλη ομάδα (6 απλοί κύκλοι, δεν πατιούνται)
 *   φιλέ    : στη μέση
 *   κάτω    : η δική μας ομάδα (6 παίκτες που πατιούνται)
 *
 * Ροή όταν σερβίρουν αυτοί:  παίκτης → υποδοχή 0/1/2/3
 *   → παίκτης που χτυπάει → πάσα (ο S βαθμολογεί) → επιλογή Tip/Spike
 * Ροή όταν σερβίρουμε εμείς:  παίκτης → Άλμα/Float + Ace/Out/Difficult/Σώθηκε
 * ============================================================= */
(function (V) {
  'use strict';

  var el = V.ui.el;
  var C = V.CONFIG;

  /* =========================================================
   * Αρχική ρύθμιση σετ: πού είναι ο παίκτης σερβίς.
   * Ποιος σερβίρει πρώτος δεν ρωτάμε — θεωρούμε ότι σερβίρει η
   * δική μας ομάδα.
   * ========================================================= */
  function startSetDialog(ctx, opts) {
    opts = opts || {};
    var m = ctx.match;
    var set = ctx.set;
    var zone = 1;
    var startServer = (opts.server === 'them') ? 'them' : 'us';
    var dlg = null;

    var zoneBox = el('div', { class: 'startset__zones' });
    var zoneBtns = {};
    [4, 3, 2, 5, 6, 1].forEach(function (z) {
      var isSrv = (z === 1);
      var b = el('button', {
        class: 'zbtn' + (z === zone ? ' is-active' : ''),
        title: 'Ζώνη ' + z + ' — ' + C.ZONE_NAMES[z],
        onclick: function () {
          zone = z;
          Object.keys(zoneBtns).forEach(function (k) { zoneBtns[k].classList.remove('is-active'); });
          b.classList.add('is-active');
        }
      }, [
        el('span', { class: 'zbtn__n', text: String(z) }),
        el('span', {
          class: 'zbtn__t' + (isSrv && startServer === 'them' ? ' zbtn__t--rec' : ''),
          text: isSrv ? (startServer === 'them' ? 'ΥΠΟΔΟΧΗ' : 'ΣΕΡΒΙΣ') : 'S'
        })
      ]);
      zoneBtns[z] = b;
      zoneBox.appendChild(b);
    });

    /* Ποιος ξεκινάει το σετ: σερβίς ή υποδοχή. */
    var seg = el('div', { class: 'seg seg--fill' });
    function redrawZoneLabels() {
      var t = zoneBtns[1].querySelector('.zbtn__t');
      t.textContent = startServer === 'them' ? 'ΥΠΟΔΟΧΗ' : 'ΣΕΡΒΙΣ';
      t.classList.toggle('zbtn__t--rec', startServer === 'them');
    }
    [{ id: 'us', label: 'ΣΕΡΒΙΣ', hint: 'ξεκινάμε εμείς' },
     { id: 'them', label: 'ΥΠΟΔΟΧΗ', hint: 'ξεκινάνε αυτοί' }].forEach(function (o) {
      seg.appendChild(el('button', {
        class: 'seg__btn' + (startServer === o.id ? ' is-active' : ''),
        onclick: function () {
          startServer = o.id;
          Array.prototype.forEach.call(seg.children, function (b) { b.classList.remove('is-active'); });
          this.classList.add('is-active');
          redrawZoneLabels();
          V.ui.buzz(8);
        }
      }, [
        el('span', { text: o.label }),
        el('span', { class: 'seg__btn__sub', text: o.hint })
      ]));
    });

    var body = el('div', { class: 'form' }, [
      el('p', { class: 'startset__intro', text: opts.title || 'Πώς ξεκινάει το σετ;' }),
      el('div', { class: 'startpick sticky' }, [
        el('span', { class: 'sticky__label', text: 'Ποιος ξεκινάει το σετ' }),
        seg,
        el('span', {
          class: 'field__hint',
          text: 'Με «Υποδοχή» δεν περιστρέφεται κανείς — η ομάδα μένει όπως είναι μέχρι να κερδίσει τον πόντο του υποδοχής.'
        })
      ]),
      el('div', { class: 'sticky' }, [
        el('span', { class: 'sticky__label', text: 'Ζώνη παίκτη σερβίς' }),
        zoneBox,
        el('span', {
          class: 'field__hint',
          text: 'Ζώνη 1 = πίσω δεξιά, από όπου σερβίρει η ομάδα. Οι άλλες 5 ακολουθούν μόνες τους.'
        })
      ])
    ]);

    dlg = V.ui.modal({
      title: 'Έναρξη Σετ ' + set,
      body: body,
      dismissible: false,
      actions: [
        { label: 'Άκυρο', variant: 'ghost' },
        {
          label: 'Παίξε!', variant: 'primary',
          onClick: function () {
            V.Store.setGame(m.id, set, {
              server: startServer,
              order: C.orderForSetterZone(zone),
              rotations: 0,
              servingPlayerId: null
            });
            ctx.flow = null;
            V.ui.buzz(20);
            V.ui.toast(
              'Σετ ' + set + ' · S στη ζώνη ' + zone + ' · ' +
              (startServer === 'them' ? 'ξεκινάμε με υποδοχή' : 'σερβίρουμε εμείς'),
              { tone: 'good' }
            );
          }
        }
      ]
    });
  }

  /* =========================================================
   * Κατάσταση ροής
   * ========================================================= */
  function flowState(ctx) {
    if (ctx.flow) return ctx.flow;
    var g = V.Store.game(ctx.match, ctx.set);
    if (g.server === 'us') return { stage: 'serve' };
    return { stage: 'reception' };
  }

  function hintFor(ctx) {
    var f = ctx.flow;
    if (f && f.stage === 'pick-attacker') return 'Ποιος χτύπησε τη μπάλα;';
    if (f && f.stage === 'defense-pick') return 'Ποιος έκανε την άμυνα;';
    var g = V.Store.game(ctx.match, ctx.set);
    if (g.server === 'us') return 'Πάτα τον σερβιέρ';
    return 'Πάτα ποιος υπέδεξε';
  }

  /* =========================================================
   * Γήπεδο
   * ========================================================= */
  function courtBoard(ctx) {
    var m = ctx.match;
    var set = ctx.set;
    var g = V.Store.game(m, set);
    var ours = V.Store.courtPlayers(m, set);

    /* --- αντίπαλη πλευρά: μόνο η μπροστά γραμμή (3 κύκλοι, άδειοι) --- */
    var opp = el('div', {
      class: 'court-half court-half--them',
      title: 'Αντίπαλη ομάδα — μπροστά γραμμή'
    }, [4, 3, 2].map(function () {
      return el('div', { class: 'opp-slot' });
    }));

    /* --- δική μας πλευρά --- */
    var byZone = {};
    ours.forEach(function (p) { byZone[p.zone] = p; });
    var mine = el('div', { class: 'court-half court-half--us' }, [4, 3, 2, 5, 6, 1].map(function (z) {
      var p = byZone[z] || { zone: z, name: '—', label: '', playerId: null };
      var isServer = (g.server === 'us' && z === C.serverZone());
      var pl = p.playerId ? V.Store.player(m, p.playerId) : null;
      var num = pl && pl.number != null && pl.number !== '' ? '#' + pl.number + ' · ' : '';

      return el('button', {
        class: 'court-player' + (isServer ? ' court-player--serving' : '') +
          (p.playerId ? '' : ' court-player--empty'),
        title: p.playerId
          ? 'Ζώνη ' + z + ' — ' + num + p.name
          : 'Ζώνη ' + z + ' — κενό (πάτα για ενδέκη)',
        'aria-label': p.playerId ? p.label + ' ' + p.name : 'Ζώνη ' + z + ' κενό',
        onclick: function () { onCourtTap(ctx, p); }
      }, [
        el('span', { class: 'court-player__bubble' }, [
          el('span', { class: 'position-badge', text: p.label || '—' })
        ]),
        el('span', { class: 'court-player__name', text: shortName(p.name) })
      ]);
    }));

    return el('div', { class: 'volley-court' }, [
      opp,
      el('div', { class: 'net' }, [el('span', { text: 'ΦΙΛΕ' })]),
      mine
    ]);
  }

  /* κοντεύεις όνομα ώστε να χωράει στον κύκλο */
  function shortName(n) {
    var s = String(n || '—');
    if (s.length <= 14) return s;
    return s.slice(0, 13) + '…';
  }

  /* =========================================================
   * Πάτημα σε παίκτη στο γήπεδο
   * ========================================================= */
  function onCourtTap(ctx, p) {
    var f = flowState(ctx);
    if (!p.playerId) {
      V.ui.toast('Η θέση αυτή είναι κενή — όρισε ενδέκη (☰ → Ενδέκη)', { tone: 'warn', duration: 2600 });
      return;
    }
    if (ctx.flow && ctx.flow.stage === 'defense-pick') {
      ctx.flow = null;
      defenseRating(ctx, p.playerId);
      return;
    }
    if (ctx.flow && ctx.flow.stage === 'pick-attacker') {
      /* ο S βαθμολογεί την πάσα, μετά ανοίγει το παράθυρο του χτυπήματος */
      passRating(ctx, p.playerId);
      return;
    }
    if (f.stage === 'serve') {
      /* Σερβίρει ΠΑΝΤΑ ο παίκτης της ζώνης 1 — ο κανόνας του βόλι */
      if (p.zone !== C.serverZone()) {
        var srv = V.Store.courtPlayers(ctx.match, ctx.set).filter(function (x) {
          return x.zone === C.serverZone();
        })[0];
        V.ui.toast('Σερβίρει μόνο ο ' + (srv && srv.playerId ? srv.name : 'παίκτης της ζώνης 1'),
          { tone: 'warn', duration: 2400 });
        return;
      }
      serveModal(ctx, p.playerId);
      return;
    }
    receptionRating(ctx, p.playerId);
  }

  /* =========================================================
   * ΥΠΟΔΟΧΗ 0/1/2/3
   * ========================================================= */
  var REC_HINT = {
    '0': 'Χωρίς μπλόκ', '1': 'Μόνο OH',
    '2': 'OH ή OPP', '3': 'Όλες οι επιλογές'
  };

  function receptionRating(ctx, playerId) {
    var m = ctx.match;
    var name = V.Store.playerName(m, playerId);
    var dlg = null;

    var grid = el('div', { class: 'rating-grid' }, C.RECEPTION_TARGETS.map(function (t) {
      return el('button', {
        class: t.id === '3' ? 'good' : (t.id === '0' ? 'bad' : ''),
        onclick: function () {
          /* Ο τύπος 0 δίνει πόντο στους (όταν το αυτόματο σκορ είναι
             ενεργό) — άρα το rally τελείωσε, δεν ζητάμε επιθέτη.
             Η ροή μπαίνει ΠΡΙΝ την καταχώρηση, γιατί το addEvent
             κάνει render και η render πρέπει να δει τη νέα ροή. */
          var endsRally = (m.autoScore !== false && t.id === '0');
          ctx.flow = endsRally ? null : { stage: 'pick-attacker', recId: playerId };

          var ev = V.Store.addEvent(m.id, {
            set: ctx.set, type: 'reception', playerId: playerId, target: t.id
          });
          var side = scoreSideFor(m, ev);
          if (side) V.Store.awardPoint(m.id, ctx.set, side, 1);

          if (dlg) dlg.close();
          V.ui.buzz(side ? 18 : 10);
          V.ui.toast(name + ' · υποδοχή ' + t.label + (endsRally ? '  ·  +1 αντίπαλοι' : ''), {
            tone: endsRally ? 'bad' : 'neutral',
            actionLabel: 'Undo', onAction: function () { V.views.entry.undo(ctx); }
          });
        }
      }, [
        el('span', { text: t.label }),
        el('small', { text: REC_HINT[t.id] || (t.sub || '') })
      ]);
    }));

    dlg = V.ui.modal({
      title: 'Υποδοχή',
      body: playerHead(name, 'reception', positionOf(m, playerId)),
      actions: [{ label: 'Άκυρο', variant: 'ghost' }]
    });
    dlg.body.appendChild(el('p', { class: 'modal-label', text: 'ΤΥΠΟΣ ΥΠΟΔΟΧΗΣ' }));
    dlg.body.appendChild(el('p', { class: 'modal-text', text: 'Πόσοι μπλόκερ έχουν ανέβει ψηλά.' }));
    dlg.body.appendChild(grid);
  }

  /* κεφαλίδα παίκτη μέσα στο modal */
  function playerHead(name, kind, position) {
    return el('div', { class: 'modal-player' }, [
      el('span', { text: (name || '?').charAt(0) }),
      el('div', {}, [
        el('p', { text: kind }),
        el('h2', { text: name }),
        el('small', { text: position || '' })
      ])
    ]);
  }

  function positionOf(m, pid) {
    var p = V.Store.player(m, pid);
    return p ? p.position : '';
  }

  /* =========================================================
   * ΠΑΣΑ (ο παίκτης σερβίς βαθμολογεί)
   * ========================================================= */
  function passRating(ctx, attackerId) {
    var m = ctx.match;
    var setterSlot = findSetter(ctx);
    var setterId = setterSlot ? setterSlot.playerId : null;
    var setter = setterId ? V.Store.playerName(m, setterId) : 'ο παίκτης σερβίς';
    var attacker = V.Store.playerName(m, attackerId);

    var draft = { target: guessTarget(ctx, attackerId), issues: [] };

    var targetTabs = el('div', { class: 'type-tabs' }, C.PASS_TARGETS.map(function (t) {
      return el('button', {
        class: t.id === draft.target ? 'active' : '',
        text: t.label,
        onclick: function () {
          draft.target = t.id;
          Array.prototype.forEach.call(this.parentNode.children, function (b) { b.classList.remove('active'); });
          this.classList.add('active');
        }
      });
    }));

    var chips = el('div', { class: 'chiprow' });
    function drawChips() {
      V.ui.clear(chips);
      C.PASS_ISSUES.forEach(function (i) {
        var on = draft.issues.indexOf(i.id) !== -1;
        chips.appendChild(el('button', {
          class: 'tchip' + (on ? ' is-on' : ''),
          text: i.label,
          onclick: function () {
            var idx = draft.issues.indexOf(i.id);
            if (idx === -1) draft.issues.push(i.id); else draft.issues.splice(idx, 1);
            drawChips();
            V.ui.buzz(6);
          }
        }));
      });
    }
    drawChips();

    var dlg = V.ui.modal({
      title: 'Πάσα',
      body: playerHead(setter, 'pass', positionOf(m, setterId)),
      actions: [
        {
          label: 'Χωρίς χτύπημα', variant: 'ghost',
          onClick: function () {
            ctx.flow = null;
            V.app.render();
            V.ui.toast('Ακυρώθηκε το rally', { tone: 'info', duration: 1500 });
          }
        },
        {
          label: 'Επόμενο', variant: 'primary',
          onClick: function () {
            V.Store.addEvent(m.id, {
              set: ctx.set, type: 'pass',
              playerId: setterId,
              target: draft.target,
              issues: draft.issues.slice()
            });
            /* κλείνει και ανοίγει αμέσως το παράθυρο του χτυπήματος */
            setTimeout(function () { attackChoice(ctx, attackerId); }, 170);
          }
        }
      ]
    });
    dlg.body.appendChild(el('p', { class: 'modal-label', text: 'ΣΕ ΠΟΙΟΝ ΕΓΙΝΕ Η ΠΑΣΑ' }));
    dlg.body.appendChild(targetTabs);
    dlg.body.appendChild(el('p', { class: 'modal-label second', text: 'ΠΡΟΒΛΗΜΑ (ΚΑΝΕΝΑ = ΚΑΘΑΡΗ)' }));
    dlg.body.appendChild(chips);
  }

  /* =========================================================
   * ΕΠΙΛΟΓΗ TIP / SPIKE — δύο στήλες, κλείνει αμέσως
   * ========================================================= */
  function attackChoice(ctx, attackerId) {
    var m = ctx.match;
    var attacker = V.Store.playerName(m, attackerId);
    var dlg = null;

    function log(kind, r) {
      /* saved / block_saved → σώσαμε τη μπάλα, δεν έγινε πόντος:
         συνεχίζουμε με επίθεση (επόμενο πάτημα = ο χτυπητής).
         Το αποτέλεσμα μπαίνει ΠΡΙΝ το addEvent, γιατί το addEvent κάνει render. */
      var continueRally = (r.id === 'saved' || r.id === 'block_saved');
      ctx.flow = continueRally ? { stage: 'pick-attacker' } : null;

      var ev = V.Store.addEvent(m.id, {
        set: ctx.set, type: 'attack',
        playerId: attackerId, kind: kind, result: r.id
      });
      var side = scoreSideFor(m, ev);
      if (side) V.Store.awardPoint(m.id, ctx.set, side, 1);

      if (dlg) dlg.close();
      if (!continueRally) scrollToCourt();
      V.ui.buzz(side ? 20 : 10);
      V.ui.toast(
        attacker + ' · ' + (kind === 'tip' ? 'Tip' : 'Spike') + ' · ' + r.label +
        (side === 'us' ? '  ·  +1 εμείς' : (side === 'them' ? '  ·  +1 αντίπαλοι' : '')),
        { tone: r.tone, actionLabel: 'Undo', onAction: function () { V.views.entry.undo(ctx); } }
      );
    }

    /* ίδια διάταξη με την καρτέλα «Χτυπήματα»: μία στήλη ανά είδος */
    var grid = el('div', {
      class: 'amat-grid',
      style: 'grid-template-columns:repeat(' + C.ATTACK_KINDS.length + ',1fr)'
    }, C.ATTACK_KINDS.map(function (k) {
      var col = el('div', { class: 'amat-col', style: '--accent-c:' + (k.accent || 'var(--acid)') }, [
        el('div', { class: 'amat-col__head', text: k.label })
      ]);
      C.ATTACK_RESULTS[k.id].forEach(function (r) {
        col.appendChild(el('button', {
          class: 'amat-btn amat-btn--' + r.tone,
          title: r.help || '',
          onclick: function () { log(k.id, r); }
        }, [
          el('span', { class: 'amat-btn__emoji', text: r.emoji }),
          el('span', { class: 'amat-btn__label', text: r.label })
        ]));
      });
      return col;
    }));

    dlg = V.ui.modal({
      title: 'Χτύπημα',
      body: playerHead(attacker, 'attack', positionOf(m, attackerId)),
      actions: [{ label: 'Άκυρο', variant: 'ghost' }]
    });
    dlg.body.appendChild(el('p', { class: 'modal-label', text: 'ΑΠΟΤΕΛΕΣΜΑ' }));
    dlg.body.appendChild(grid);
  }

  /* =========================================================
   * ΣΕΡΒΙΣ — δύο στήλες (Άλμα / Float), κλείνει αμέσως
   * ========================================================= */
  function serveModal(ctx, playerId) {
    var m = ctx.match;
    var name = V.Store.playerName(m, playerId);
    var draft = { zone: ctx.sticky.serveZone || null };
    var dlg = null;

    var zones = el('div', { class: 'chiprow' });
    function drawZones() {
      V.ui.clear(zones);
      zones.appendChild(el('button', {
        class: 'tchip' + (!draft.zone ? ' is-on' : ''), text: '— χωρίς ζώνη —',
        onclick: function () { draft.zone = null; drawZones(); }
      }));
      C.SERVE_ZONES.forEach(function (z) {
        zones.appendChild(el('button', {
          class: 'tchip' + (draft.zone === z ? ' is-on' : ''), text: z,
          onclick: function () { draft.zone = z; drawZones(); }
        }));
      });
    }
    drawZones();

    function log(result, stype) {
      ctx.sticky.serveType = stype;
      ctx.sticky.serveZone = draft.zone;

      /* «Σώθηκε» / «Difficult» → ΔΕΝ έγινε πόντος, το rally συνεχίζεται
         και ΕΜΕΙΣ επιτιθόμαστε, άτι το σερβί παραμένει δικό μας.
         (Πριν το μπλόκαμε εδώ: μ' έβριζε το σερβί στους αντιπάλους,
         κι έτσι ο κανόνας του κεντρικού έβγαζε τον MB αμέσως μετά το
         σερβί, πριν πάρουν καν πόντο.)
         Όλα μπαίνουν ΠΡΙΝ το addEvent, γιατί το addEvent κάνει render. */
      var keptRally = (result === 'difficult' || result === 'easy');
      var point = (m.autoScore !== false)
        ? (result === 'ace' ? 'us' : (result === 'out' ? 'them' : null))
        : null;

      ctx.flow = keptRally ? { stage: 'pick-attacker' } : null;
      V.Store.setGame(m.id, ctx.set, {
        servingPlayerId: playerId,
        server: point ? point : (keptRally ? 'us' : 'them')
      });

      V.Store.addEvent(m.id, {
        set: ctx.set, type: 'serve', playerId: playerId,
        stype: stype, result: result, zone: draft.zone
      });
      if (point) V.Store.awardPoint(m.id, ctx.set, point, 1);

      if (dlg) dlg.close();
      if (!keptRally) scrollToCourt();
      V.ui.buzz(point ? 20 : 10);
      V.ui.toast(
        name + ' · ' + (stype === 'float' ? 'Float' : 'Άλμα') + ' · ' +
        V.label.serveResult(result) +
        (point === 'us' ? '  ·  +1 εμείς'
          : (point === 'them' ? '  ·  +1 αντίπαλοι'
            : (result === 'difficult' ? '  ·  το σώσανε' : ''))),
        {
          tone: result === 'ace' || result === 'difficult' ? 'good' : (result === 'out' ? 'bad' : 'neutral'),
          actionLabel: 'Undo', onAction: function () { V.views.entry.undo(ctx); }
        }
      );
    }

    /* μία στήλη ανά τύπο σερβίς */
    var grid = el('div', {
      class: 'amat-grid',
      style: 'grid-template-columns:repeat(' + C.SERVE_TYPES.length + ',1fr)'
    }, C.SERVE_TYPES.map(function (t) {
      var col = el('div', {
        class: 'amat-col',
        style: '--accent-c:' + (t.id === 'float' ? 'var(--blue)' : 'var(--acid)')
      }, [el('div', { class: 'amat-col__head', text: t.label })]);
      C.SERVE_RESULTS.forEach(function (r) {
        col.appendChild(el('button', {
          class: 'amat-btn amat-btn--' + r.tone,
          title: r.help || '',
          onclick: function () { log(r.id, t.id); }
        }, [
          el('span', { class: 'amat-btn__emoji', text: r.emoji }),
          el('span', { class: 'amat-btn__label', text: r.label })
        ]));
      });
      return col;
    }));

    dlg = V.ui.modal({
      title: 'Σερβίς',
      body: playerHead(name, 'serve', positionOf(m, playerId)),
      actions: [{ label: 'Άκυρο', variant: 'ghost' }]
    });
    dlg.body.appendChild(el('p', { class: 'modal-label', text: 'ΤΥΠΟΣ ΚΑΙ ΑΠΟΤΕΛΕΣΜΑ' }));
    dlg.body.appendChild(grid);
    dlg.body.appendChild(el('p', { class: 'modal-label second', text: 'ΖΩΝΗ (ΠΡΟΑΙΡΕΤΙΚΟ)' }));
    dlg.body.appendChild(zones);
  }

  /* =========================================================
   * ΑΜΥΝΑ 0-3
   * ========================================================= */
  var DEF_HINT = ['Χαμένη μπάλα', 'Δύσκολη', 'Ελεγχόμενη', 'Άριστη'];

  function defenseRating(ctx, playerId) {
    var m = ctx.match;
    var name = V.Store.playerName(m, playerId);
    var dlg = null;

    var grid = el('div', { class: 'rating-grid' }, C.DEFENSE_RESULTS.map(function (r) {
      return el('button', {
        class: r.id === '3' ? 'good' : (r.id === '0' ? 'bad' : ''),
        onclick: function () {
          /* άμυνα 0  = δεν τη διάσωσε → πόντος στους αντιπάλους, το rally τελειώνει.
             άμυνα 1/2/3 = τη σώσαμε → συνεχίζουμε, μπαίνουμε σε ροή
             «ετοιμάζει επίθεση»: το επόμενο πάτημα στο γήπεδο είναι ο χτυπητής.
             Η ροή μπαίνει ΠΡΙΝ το addEvent, γιατί το addEvent κάνει render. */
          var saved = r.id !== '0';
          ctx.flow = saved ? { stage: 'pick-attacker' } : null;

          var ev = V.Store.addEvent(m.id, { set: ctx.set, type: 'defense', playerId: playerId, target: r.id });
          var side = scoreSideFor(m, ev);
          if (side) V.Store.awardPoint(m.id, ctx.set, side, 1);

          if (dlg) dlg.close();
          V.ui.buzz(side ? 18 : 12);
          V.ui.toast(
            name + ' · άμυνα ' + r.label +
            (side === 'them' ? '  ·  +1 αντίπαλοι' : (saved ? '  ·  σώθηκε' : '')),
            {
              tone: r.id === '3' ? 'good' : (side === 'them' ? 'bad' : 'neutral'),
              actionLabel: 'Undo', onAction: function () { V.views.entry.undo(ctx); }
            }
          );
        }
      }, [
        el('span', { text: r.label }),
        el('small', { text: r.hint || DEF_HINT[r.id] })
      ]);
    }));

    dlg = V.ui.modal({
      title: 'Άμυνα',
      body: playerHead(name, 'defense', positionOf(m, playerId)),
      actions: [{ label: 'Άκυρο', variant: 'ghost' }]
    });
    dlg.body.appendChild(el('p', { class: 'modal-label', text: 'ΒΑΘΜΟΣ ΑΜΥΝΑΣ' }));
    dlg.body.appendChild(grid);
  }

  /* =========================================================
   * Βοηθητικά
   * ========================================================= */

  /* Μετά το κλείσιμο ενός παραθύρου γύρεψε το γήπεδο στην οθόνη —
     εκεί είναι το σκορ, η κατάσταση και η επόμενη κίνηση. */
  function scrollToCourt() {
    try {
      var board = document.querySelector('.volley-court');
      if (board && board.scrollIntoView) {
        board.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      window.scrollTo(0, 0);
    } catch (e) { window.scrollTo(0, 0); }
  }

  function scoreSideFor(m, ev) {
    if (m.autoScore === false) return null;
    return C.scoreSideFor(ev);
  }

  function findSetter(ctx) {
    var cp = V.Store.courtPlayers(ctx.match, ctx.set);
    return cp.filter(function (p) { return p.slot === 'S'; })[0] || null;
  }

  /* προτείνει σε ποιον πήγε η πάσα, βάσει του χτυπήματος */
  function guessTarget(ctx, attackerId) {
    var cp = V.Store.courtPlayers(ctx.match, ctx.set);
    var a = cp.filter(function (p) { return p.playerId === attackerId; })[0];
    if (!a) return ctx.sticky.passTarget || 'OH';
    if (a.slot.indexOf('MB') === 0) return 'MB';
    if (a.slot === 'OPP') return 'OPP';
    return ctx.sticky.passTarget || 'OH';
  }

  /* =========================================================
   * Κάτω από το γήπεδο: άμυνα, swaps, σημείωση, σετ
   * ========================================================= */
  function controls(ctx) {
    var m = ctx.match;
    var players = V.Store.courtPlayers(m, ctx.set);

    /* ποιος παίζει ΑΥΤΗ τη στιγμή στη θέση MB / L */
    function onCourt(group) {
      var test = (group === 'MB') ? C.isMBSlot : C.isLSlot;
      var rows = players.filter(function (p) { return test(p.slot); });
      if (!rows.length) return 'εκτός';
      return rows.map(function (r) { return r.name; }).join(' + ');
    }

    var defOn = !!(ctx.flow && ctx.flow.stage === 'defense-pick');

    var row = el('div', { class: 'quick-actions' }, [
      el('button', {
        class: 'qa-defense' + (defOn ? ' is-on' : ''),
        title: 'Άμυνα — πάτα μετά τον παίκτη που αμύνθηκε',
        onclick: function () {
          ctx.flow = defOn ? null : { stage: 'defense-pick' };
          V.ui.buzz(10);
          V.app.render();
        }
      }, [
        V.icon('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM9 12l2 2 4-4', 14),
        el('span', { text: 'Άμυνα' })
      ]),
      el('button', {
        title: 'Αλλαγή λιμπέρω',
        onclick: function () {
          var r = V.Store.swapSlot(m.id, ctx.set, 'L');
          V.ui.buzz(14);
          V.ui.toast(r && r.onCourt ? 'Μπαίνει ο ' + r.name : (r && r.reason ? r.reason : '—'),
            { tone: r && r.onCourt ? 'info' : 'warn', duration: 1600 });
        }
      }, [
        V.icon('m16 3 4 4-4 4M4 7h16M8 21l-4-4 4-4M20 17H4', 14),
        el('span', { text: 'Libero' }),
        el('span', { class: 'qa-sub', text: onCourt('L') })
      ]),
      el('button', {
        title: 'Αλλαγή κεντρικού',
        onclick: function () {
          var r = V.Store.swapSlot(m.id, ctx.set, 'MB');
          V.ui.buzz(14);
          V.ui.toast(r && r.onCourt ? 'Μπαίνει ο ' + r.name : (r && r.reason ? r.reason : '—'),
            { tone: r && r.onCourt ? 'info' : 'warn', duration: 1600 });
        }
      }, [
        V.icon('m16 3 4 4-4 4M4 7h16M8 21l-4-4 4-4M20 17H4', 14),
        el('span', { text: 'MB' }),
        el('span', { class: 'qa-sub', text: onCourt('MB') })
      ]),
      el('button', {
        class: 'rotate-button', title: 'Περιστροφή χωρίς πόντο (διόρθωση)',
        onclick: function () {
          var set = V.Store.currentSet(m);
          var g = V.Store.game(m, set);
          V.Store.setGame(m.id, set, {
            order: C.rotateOrder(g.order, 1, g.server),
            rotations: (g.rotations || 0) + 1
          });
          V.ui.buzz(14);
          V.ui.toast('Χειροκίνητη περιστροφή', { tone: 'info', duration: 1400 });
        }
      }, [
        el('span', { text: 'Περιστροφή' }),
        V.icon('m9 18 6-6-6-6', 14)
      ])
    ]);

    return row;
  }

  /* =========================================================
   * Γρήγορη σημείωση — κάτω από το MATCH LOG
   * ========================================================= */
  function noteBox(ctx) {
    var m = ctx.match;
    var input = el('input', {
      class: 'input', type: 'text',
      placeholder: 'Γρήγορη σημείωση…',
      maxlength: '140'
    });

    function save() {
      var txt = input.value.trim();
      if (!txt) return;
      V.Store.addEvent(m.id, { set: ctx.set, type: 'note', text: txt });
      V.ui.buzz(10);
      V.ui.toast('Σημείωση: ' + txt, { tone: 'info', duration: 2600 });
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
    });

    var btn = el('button', { text: 'Προσθήκη σημείωσης', onclick: save });
    function sync() { btn.disabled = !input.value.trim(); }
    input.addEventListener('input', sync);
    sync();

    return el('div', { class: 'note-box' }, [
      el('p', { class: 'note-title' }, [
        V.icon('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z', 14),
        el('span', { text: 'ΣΗΜΕΙΩΣΗ' })
      ]),
      input,
      btn
    ]);
  }

  /* =========================================================
   * MATCH LOG (δεξιά στήλη)
   * ========================================================= */
  var CAT_LABEL = {
    reception: 'Υποδοχή', attack: 'Χτύπημα', pass: 'Πάσα',
    serve: 'Σερβίς', defense: 'Άμυνα', note: 'Σημείωση'
  };

  function matchLog(ctx) {
    var m = ctx.match;
    var evs = m.events.filter(function (e) { return e.set === ctx.set; }).slice().reverse();
    var shown = evs.slice(0, ctx.logAll ? evs.length : 40);

    var feed = el('div', { class: 'event-feed' });

    if (!shown.length) {
      feed.appendChild(el('div', { class: 'empty-state' }, [
        el('span', {}, [V.icon('M3 4h18v16H3zM3 12h18M12 4v16', 28)]),
        el('strong', { text: 'Έτοιμοι για πρώτο σερβίς' }),
        el('p', { text: 'Οι ενέργειες του αγώνα θα εμφανίζονται εδώ.' })
      ]));
    } else {
      shown.forEach(function (e) {
        var p = e.playerId ? V.Store.player(m, e.playerId) : null;
        var color = (V.app.CAT_COLOR && V.app.CAT_COLOR[e.type]) || '#84909f';
        feed.appendChild(el('button', {
          class: 'event-row',
          title: 'Πάτα για επεξεργασία',
          onclick: function () { V.views.dashboard.editEvent(ctx, e); }
        }, [
          el('i', { style: 'background:' + color }),
          el('div', {}, [
            el('strong', {}, [
              document.createTextNode(p ? p.name : CAT_LABEL[e.type] || e.type),
              p ? el('span', { text: p.position }) : null
            ]),
            el('p', { text: eventDetail(e) })
          ]),
          el('time', { text: V.ui.fmtTime(e.ts) })
        ]));
      });
    }

    var foot = null;
    if (evs.length > shown.length || ctx.logAll) {
      foot = el('button', {
        class: 'btn btn--sm btn--ghost',
        text: ctx.logAll ? 'Δείξε λιγότερα' : 'Δείξε και τις ' + evs.length + ' ενέργειες',
        onclick: function () { ctx.logAll = !ctx.logAll; V.app.render(); }
      });
    }

    return el('aside', { class: 'side-panel' }, [
      el('div', { class: 'panel-heading' }, [
        el('div', {}, [
          el('p', { class: 'eyebrow', text: 'MATCH LOG' }),
          el('h2', { text: 'Ροή αγώνα' })
        ]),
        el('span', { text: evs.length + ' ενέργειες' })
      ]),
      feed,
      foot ? el('div', { style: 'padding:10px 16px' }, [foot]) : null,
      noteBox(ctx)
    ]);
  }

  /* σύντομη περιγραφή για το λογόδιο */
  function eventDetail(e) {
    switch (e.type) {
      case 'attack':
        return V.label.attackKind(e.kind) + ' · ' + V.label.attackResult(e.kind, e.result);
      case 'reception':
        return 'Υποδοχή τύπος ' + e.target;
      case 'pass':
        return 'Πάσα → ' + V.label.passTarget(e.target) +
          ((e.issues && e.issues.length)
            ? ' (' + e.issues.map(function (i) { return V.label.passIssue(i); }).join(', ') + ')'
            : ' (καθαρή)');
      case 'serve':
        return (e.stype === 'float' ? 'Float' : 'Άλμα') + ' · ' + V.label.serveResult(e.result) +
          (e.zone ? ' · ζ.' + e.zone : '');
      case 'defense':
        return 'Άμυνα ' + V.label.defenseResult(e.target);
      case 'note':
        return e.text || '';
      default:
        return e.type;
    }
  }

  /* =========================================================
   * render — γήπεδο + λογόδιο
   * ========================================================= */
  function render(ctx) {
    var wrap = el('div', { class: 'workspace' });

    var left = el('div', { class: 'court-column' }, [
      courtBoard(ctx),
      el('div', { class: 'court-hint' }, [
        el('span', { class: 'court-hint__txt', text: hintFor(ctx) }),
        ctx.flow ? el('button', {
          class: 'btn btn--sm btn--ghost', text: '✕ Ακύρωση',
          onclick: function () { ctx.flow = null; V.app.render(); }
        }) : null
      ]),
      controls(ctx)
    ]);

    var setRow = el('div', { class: 'quick-actions' }, [
      el('div', { class: 'seg seg--sm' }, numsOf(ctx).map(function (n) {
        return el('button', {
          class: 'seg__btn' + (ctx.set === n ? ' is-active' : ''),
          text: 'Σετ ' + n,
          onclick: function () { ctx.setSet(n); }
        });
      })),
      el('button', {
        onclick: function () { V.views.setup.lineupDialog(ctx.match, ctx.set); }
      }, [el('span', { text: V.Store.hasLineup(ctx.match, ctx.set) ? 'Ενδέκη' : '＋ Ενδέκη' })]),
      el('button', {
        onclick: function () { startSetDialog(ctx); }
      }, [el('span', { text: 'Ρύθμιση σετ' })])
    ]);
    left.appendChild(setRow);

    wrap.appendChild(left);
    wrap.appendChild(matchLog(ctx));
    return wrap;
  }

  function numsOf(ctx) {
    var cur = V.Store.currentSet(ctx.match);
    var out = [];
    for (var i = 1; i <= cur; i++) out.push(i);
    return out;
  }

  V.views = V.views || {};
  V.views.court = {
    render: render,
    noteBox: noteBox,
    startSetDialog: startSetDialog,
    matchLog: matchLog,
    courtBoard: courtBoard
  };
})(window.V = window.V || {});
