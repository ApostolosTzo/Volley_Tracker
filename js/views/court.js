/* =============================================================
 * views/court.js — το γήπεδο: η οθόνη που ακολουθεί τη ροή του παιχνιδιού
 *
 *   πάνω    : η αντίπαλη ομάδα (6 απλά σημεία, δεν πατιούνται)
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
   * Αρχική ρύθμιση σετ: ποιος σερβίρει + σε ποια ζώνη ο S
   * ========================================================= */
  function startSetDialog(ctx, opts) {
    opts = opts || {};
    var m = ctx.match;
    var set = ctx.set;

    var server = 'us';
    var zone = 2;

    var srvSeg = el('div', { class: 'seg seg--fill' }, [
      { id: 'us', label: m.meta.teamUs || 'Εμείς' },
      { id: 'them', label: m.meta.teamThem || 'Αντίπαλοι' }
    ].map(function (o) {
      return el('button', {
        class: 'seg__btn' + (o.id === server ? ' is-active' : ''),
        text: o.label,
        onclick: function () {
          server = o.id;
          Array.prototype.forEach.call(this.parentNode.children, function (b) { b.classList.remove('is-active'); });
          this.classList.add('is-active');
        }
      });
    }));

    /* ζώνες σε σχήμα γηπέδου (μπροστά πάνω, πίσω κάτω) */
    var zoneBox = el('div', { class: 'startset__zones' });
    var zoneBtns = {};
    [4, 3, 2, 5, 6, 1].forEach(function (z) {
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
        el('span', { class: 'zbtn__t', text: z === 1 ? 'ΣΕΡΒΙΣ' : 'S' })
      ]);
      zoneBtns[z] = b;
      zoneBox.appendChild(b);
    });

    var body = el('div', { class: 'form' }, [
      opts.title ? el('p', { class: 'startset__intro', text: opts.title }) : null,
      el('div', { class: 'sticky' }, [
        el('span', { class: 'sticky__label', text: 'Ποιος σερβίρει πρώτος' }),
        srvSeg
      ]),
      el('div', { class: 'sticky' }, [
        el('span', { class: 'sticky__label', text: 'Πού είναι ο παίκτης σερβίς' }),
        zoneBox,
        el('span', { class: 'field__hint', text: 'Ζώνη 1 = πίσω δεξιά, από όπου σερβίρει. Οι άλλες 5 ακολουθούν μόνες τους.' })
      ])
    ]);

    V.ui.modal({
      title: 'Έναρξη Σετ ' + set,
      body: body,
      dismissible: false,
      actions: [
        { label: 'Άκυρο', variant: 'ghost' },
        {
          label: 'Παίξε!', variant: 'primary',
          onClick: function () {
            V.Store.setGame(m.id, set, {
              server: server,
              order: C.orderForSetterZone(zone),
              rotations: 0,
              servingPlayerId: null
            });
            ctx.flow = null;
            V.ui.buzz(20);
            V.ui.toast('Σετ ' + set + ' — σερβίρει ' +
              (server === 'us' ? (m.meta.teamUs || 'η ομάδα μας') : (m.meta.teamThem || 'ο αντίπαλος')) +
              ' · S στη ζώνη ' + zone, { tone: 'good' });
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
   * Ταμπλό σκορο του γηπέδου (T1 = εμείς, T2 = αντίπαλοι)
   * Τα +/− περνούν από το awardPoint, άρα χειροκίνητη διόρθωση
   * σκορο κάνει σωστή περιστροφή όταν γίνεται side-out.
   * ========================================================= */
  function scoreboard(ctx) {
    var m = ctx.match;
    var sc = V.Store.score(m, ctx.set);
    var us = m.meta.teamUs || 'Εμείς';
    var them = m.meta.teamThem || 'Αντίπαλοι';

    function box(key, name, score) {
      return el('div', { class: 'cscore__side cscore__side--' + key }, [
        el('button', {
          class: 'cscore__btn', text: '−', 'aria-label': 'Αφαίρεση',
          onclick: function () {
            if ((sc[key] || 0) <= 0) { V.ui.toast('Το σκορ δεν πάει κάτω', { tone: 'warn', duration: 1200 }); return; }
            V.ui.buzz(6);
            V.Store.awardPoint(m.id, ctx.set, key, -1);
          }
        }),
        el('div', { class: 'cscore__mid' }, [
          el('span', { class: 'cscore__n', text: name }),
          el('span', { class: 'cscore__v', text: String(score || 0) })
        ]),
        el('button', {
          class: 'cscore__btn cscore__btn--plus', text: '+', 'aria-label': 'Πόντος',
          onclick: function () { V.ui.buzz(14); V.Store.awardPoint(m.id, ctx.set, key, 1); }
        })
      ]);
    }

    var sets = V.Stats.bySet(m).map(function (r) {
      return el('span', {
        class: 'setsq' + (r.us > r.them ? ' setsq--us' : (r.them > r.us ? ' setsq--them' : '')),
        text: String(r.set)
      });
    });

    return el('div', { class: 'cscore' }, [
      box('us', us, sc.us),
      el('div', { class: 'cscore__mid2' }, [
        el('span', { class: 'cscore__dash', text: '–' }),
        sets.length ? el('div', { class: 'cscore__sets' }, sets) : null
      ]),
      box('them', them, sc.them)
    ]);
  }

  /* =========================================================
   * Γήπεδο
   * ========================================================= */
  function court(ctx) {
    var m = ctx.match;
    var set = ctx.set;
    var g = V.Store.game(m, set);
    var ours = V.Store.courtPlayers(m, set);
    var f = flowState(ctx);

    var wrap = el('div', { class: 'court' });

    /* --- αντίπαλη πλευρά: απλά σημεία --- */
    var opp = el('div', { class: 'court__half court__half--them' }, [4, 3, 2, 5, 6, 1].map(function (z) {
      return el('div', { class: 'bubble bubble--opp', title: 'Αντίπαλος ζώνη ' + z });
    }));

    /* --- φιλέ --- */
    var net = el('div', { class: 'court__net' }, [el('span', { class: 'court__netlbl', text: 'φιλέ' })]);

    /* --- δική μας πλευρά --- */
    var mine = el('div', { class: 'court__half court__half--us' });
    var byZone = {};
    ours.forEach(function (p) { byZone[p.zone] = p; });
    [4, 3, 2, 5, 6, 1].forEach(function (z) {
      var p = byZone[z] || { zone: z, name: '—', label: '', playerId: null };
      var isServer = (g.server === 'us' && z === 1);
      var pl = p.playerId ? V.Store.player(m, p.playerId) : null;
      var num = pl && pl.number != null && pl.number !== '' ? String(pl.number) : '';
      var b = el('button', {
        class: 'bubble bubble--us' + (p.playerId ? '' : ' bubble--empty') + (isServer ? ' bubble--server' : ''),
        title: p.playerId ? 'Ζώνη ' + z + ' — ' + (num ? '#' + num + ' ' : '') + p.name : 'Ζώνη ' + z + ' — κενό',
        onclick: function () { onCourtTap(ctx, p); }
      }, [
        el('span', { class: 'bubble__pos', text: p.label || '—' }),
        el('span', { class: 'bubble__name' }, [
          num ? el('span', { class: 'bubble__num', text: '#' + num }) : null,
          el('span', { text: shortName(p.name) })
        ]),
        isServer ? el('span', { class: 'bubble__ball', text: '\u25CF' }) : null
      ]);
      mine.appendChild(b);
    });

    wrap.appendChild(opp);
    wrap.appendChild(net);
    wrap.appendChild(mine);

    /* --- λωρίδα οδηγιών --- */
    wrap.appendChild(el('div', { class: 'court__hint' }, [
      el('span', { class: 'court__hinttxt', text: hintFor(ctx) }),
      ctx.flow ? el('button', {
        class: 'btn btn--ghost btn--sm', text: '✕ Ακύρωση',
        onclick: function () { ctx.flow = null; V.app.render(); }
      }) : null
    ]));

    return wrap;
  }

  /* κρίνεις όνομα ώστε να χωράει στη φούσκα */
  function shortName(n) {
    var s = String(n || '—');
    if (s.length <= 11) return s;
    return s.slice(0, 10) + '…';
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
    if (f.stage === 'serve') { serveModal(ctx, p.playerId); return; }
    receptionRating(ctx, p.playerId);
  }

  /* =========================================================
   * ΥΠΟΔΟΧΗ 0/1/2/3
   * ========================================================= */
  function receptionRating(ctx, playerId) {
    var m = ctx.match;
    var name = V.Store.playerName(m, playerId);
    var dlg = null;

    var grid = el('div', { class: 'rategrid' }, C.RECEPTION_TARGETS.map(function (t) {
      return el('button', {
        class: 'rate rate--rec',
        title: t.hint || '',
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
          V.ui.toast(
            name + ' · υποδοχή ' + t.label + (endsRally ? '  ·  +1 αντίπαλοι' : ''),
            { tone: endsRally ? 'bad' : 'neutral', actionLabel: 'Undo', onAction: function () { V.views.entry.undo(ctx); } }
          );
          if (!endsRally) {
            setTimeout(function () {
              V.ui.toast('Τώρα πάτα ποιος χτύπησε', { tone: 'info', duration: 2000 });
            }, 420);
          }
        }
      }, [
        el('span', { class: 'rate__n', text: t.label }),
        t.sub ? el('span', { class: 'rate__sub', text: t.sub }) : null
      ]);
    }));

    dlg = V.ui.modal({
      title: 'Υποδοχή — ' + name,
      body: el('div', {}, [
        el('p', { class: 'modal__text', text: 'Τύπος υποδοχής: πόσοι μπλόκερ έχουν ανέβει ψηλά.' }),
        grid
      ]),
      actions: [{ label: 'Άκυρο', variant: 'ghost' }]
    });
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

    var targetSeg = el('div', { class: 'seg seg--fill' }, C.PASS_TARGETS.map(function (t) {
      return el('button', {
        class: 'seg__btn' + (t.id === draft.target ? ' is-active' : ''),
        text: t.label,
        onclick: function () {
          draft.target = t.id;
          Array.prototype.forEach.call(this.parentNode.children, function (b) { b.classList.remove('is-active'); });
          this.classList.add('is-active');
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

    V.ui.modal({
      title: 'Πάσα — ' + setter,
      body: el('div', { class: 'form' }, [
        el('p', { class: 'modal__text', text: attacker + ' χτυπάει. Ο ' + setter + ' βαθμολογεί την πάσα.' }),
        el('div', { class: 'sticky' }, [
          el('span', { class: 'sticky__label', text: 'Σε ποιον πήγε' }),
          targetSeg
        ]),
        el('div', { class: 'issues' }, [
          el('span', { class: 'sticky__label', text: 'Πρόβλημα (κανένα = καθαρή)' }),
          chips
        ])
      ]),
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
            setTimeout(function () { attackChoice(ctx, attackerId); }, 160);
          }
        }
      ]
    });
  }

  /* =========================================================
   * ΕΠΙΛΟΓΗ TIP / SPIKE — δύο στήλες, κλείνει αμέσως
   * ========================================================= */
  function attackChoice(ctx, attackerId) {
    var m = ctx.match;
    var attacker = V.Store.playerName(m, attackerId);
    var dlg = null;

    function log(kind, r) {
      /* η ροή μπαίνει πριν το addEvent (το addEvent κάνει render) */
      ctx.flow = null;
      var ev = V.Store.addEvent(m.id, {
        set: ctx.set, type: 'attack',
        playerId: attackerId, kind: kind, result: r.id
      });
      var side = scoreSideFor(m, ev);
      if (side) V.Store.awardPoint(m.id, ctx.set, side, 1);

      if (dlg) dlg.close();
      scrollToCourt();
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
    });
    C.ATTACK_KINDS.forEach(function (k) {
      var col = el('div', { class: 'amat-col', style: '--accent-c:' + (k.accent || 'var(--accent)') }, [
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
      grid.appendChild(col);
    });

    dlg = V.ui.modal({
      title: 'Χτύπημα — ' + attacker,
      body: grid,
      actions: [{ label: 'Άκυρο', variant: 'ghost' }]
    });
  }

  /* =========================================================
   * ΣΕΡΒΙΣ — δύο στήλες (Άλμα / Float), κλείνει αμέσως
   * ========================================================= */
  function serveModal(ctx, playerId) {
    var m = ctx.match;
    var name = V.Store.playerName(m, playerId);
    var draft = { stype: ctx.sticky.serveType || 'jump', zone: ctx.sticky.serveZone || null };
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

      /* «Σώθηκε» / «Difficult» → το rally συνεχίζεται, σερβίρουν αυτοί.
         Όλα αυτά μπαίνουν ΠΡΙΝ το addEvent, γιατί το addEvent κάνει render. */
      var point = (m.autoScore !== false)
        ? (result === 'ace' ? 'us' : (result === 'out' ? 'them' : null))
        : null;
      ctx.flow = null;
      V.Store.setGame(m.id, ctx.set, {
        servingPlayerId: playerId,
        server: point ? point : 'them'
      });

      V.Store.addEvent(m.id, {
        set: ctx.set, type: 'serve', playerId: playerId,
        stype: stype, result: result, zone: draft.zone
      });
      if (point) V.Store.awardPoint(m.id, ctx.set, point, 1);

      if (dlg) dlg.close();
      scrollToCourt();
      V.ui.buzz(point ? 20 : 10);
      V.ui.toast(
        name + ' · ' + (stype === 'float' ? 'Float' : 'Άλμα') + ' · ' +
        V.label.serveResult(result) + (point === 'us' ? '  ·  +1 εμείς' : (point === 'them' ? '  ·  +1 αντίπαλοι' : '')),
        { tone: result === 'ace' || result === 'difficult' ? 'good' : (result === 'out' ? 'bad' : 'neutral'),
          actionLabel: 'Undo', onAction: function () { V.views.entry.undo(ctx); } }
      );
    }

    /* μία στήλη ανά τύπο σερβίς, όπως στην καρτέλα «Σερβίς» */
    var grid = el('div', {
      class: 'amat-grid',
      style: 'grid-template-columns:repeat(' + C.SERVE_TYPES.length + ',1fr)'
    });
    C.SERVE_TYPES.forEach(function (t) {
      var col = el('div', { class: 'amat-col', style: '--accent-c:' + (t.id === 'float' ? '#22d3ee' : 'var(--accent)') }, [
        el('div', { class: 'amat-col__head', text: t.label })
      ]);
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
      grid.appendChild(col);
    });

    dlg = V.ui.modal({
      title: 'Σερβίς — ' + name,
      body: el('div', { class: 'form' }, [
        grid,
        el('div', { class: 'issues' }, [
          el('span', { class: 'sticky__label', text: 'Ζώνη (προαιρετικό)' }),
          zones
        ])
      ]),
      actions: [{ label: 'Άκυρο', variant: 'ghost' }]
    });
  }

  /* =========================================================
   * ΑΜΥΝΑ 0-3
   * ========================================================= */
  function defenseRating(ctx, playerId) {
    var m = ctx.match;
    var name = V.Store.playerName(m, playerId);
    var dlg = null;

    var grid = el('div', { class: 'rategrid' }, C.DEFENSE_RESULTS.map(function (r) {
      return el('button', {
        class: 'rate rate--' + r.tone,
        title: r.hint || '',
        onclick: function () {
          V.Store.addEvent(m.id, { set: ctx.set, type: 'defense', playerId: playerId, target: r.id });
          if (dlg) dlg.close();
          V.ui.buzz(12);
          V.ui.toast(name + ' · άμυνα ' + r.label, {
            tone: r.id === '3' ? 'good' : 'neutral',
            actionLabel: 'Undo', onAction: function () { V.views.entry.undo(ctx); }
          });
        }
      }, [
        el('span', { class: 'rate__n', text: r.label }),
        el('span', { class: 'rate__sub', text: r.hint })
      ]);
    }));

    dlg = V.ui.modal({
      title: 'Άμυνα — ' + name,
      body: el('div', {}, [
        el('p', { class: 'modal__text', text: 'Πόσο καλά διάβασε τη μπάλα.' }),
        grid
      ]),
      actions: [{ label: 'Άκυρο', variant: 'ghost' }]
    });
  }

  /* =========================================================
   * Βοηθητικά
   * ========================================================= */

  /* Μετά το κλείσιμο ενός παραθύρου γύρεψε το γήπεδο στην οθόνη —
     εκεί είναι το σκορ, η κατάσταση και η επόμενη κίνηση. */
  function scrollToCourt() {
    try {
      var screen = document.querySelector('.cscreen');
      if (screen && screen.scrollIntoView) {
        screen.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
    var s = cp.filter(function (p) { return p.slot === 'S'; })[0];
    return (s && s.playerId) ? s : null;
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
    var lu = V.Store.lineup(m, ctx.set);
    var players = V.Store.courtPlayers(m, ctx.set);

    /* ποιος παίζει ΑΥΤΗ τη στιγμή στη θέση MB / L */
    function onCourt(group) {
      var test = (group === 'MB') ? C.isMBSlot : C.isLSlot;
      var row = players.filter(function (p) { return test(p.slot); })[0];
      if (row) return row.name;
      var slot = (group === 'MB') ? lu.activeMB : lu.activeL;
      return lu[slot] ? V.Store.playerName(m, lu[slot]) : '—';
    }

    /* --- άμυνα --- */
    var defBtn = el('button', {
      class: 'btn btn--big btn--ghost cbtn cbtn--wide',
      onclick: function () {
        ctx.flow = ctx.flow && ctx.flow.stage === 'defense-pick' ? null : { stage: 'defense-pick' };
        V.ui.buzz(10);
        V.app.render();
      }
    }, [
      el('span', { class: 'cbtn__ico', text: '\uD83D\uDDE1' }),
      el('span', { class: 'cbtn__txt', text: 'Άμυνα' }),
      el('span', { class: 'cbtn__sub', text: '0-3' })
    ]);

    /* --- swap λιμπέρω / MB (αλλάζει ΠΟΙΟΣ παίζει, όχι τη θέση) --- */
    function swapBtn(group, title) {
      return el('button', {
        class: 'btn btn--ghost cbtn',
        title: title,
        onclick: function () {
          var r = V.Store.swapSlot(m.id, ctx.set, group);
          V.ui.buzz(14);
          V.ui.toast(
            r && r.onCourt
              ? (group === 'MB' ? 'Μπαίνει ο ' : 'Μπαίνει ο ') + r.name
              : 'Δεν υπάρχει θέση για εναλλαγή',
            { tone: 'info', duration: 1500 }
          );
        }
      }, [
        el('span', { class: 'cbtn__ico', text: '\u21C4' }),
        el('span', { class: 'cbtn__txt', text: group === 'MB' ? 'MB' : 'L' }),
        el('span', { class: 'cbtn__sub', text: onCourt(group) })
      ]);
    }

    /* --- γρήγορη σημείωση --- */
    var noteInput = el('input', {
      class: 'input cnote__input',
      type: 'text',
      placeholder: 'Γρήγορη σημείωση… (π.χ. «κόλλησε ο Νικος στο δίχτυ»)',
      value: ''
    });
    noteInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveNote(); }
    });
    function saveNote() {
      var txt = noteInput.value.trim();
      if (!txt) return;
      V.Store.addEvent(m.id, { set: ctx.set, type: 'note', text: txt });
      noteInput.value = '';
      V.ui.buzz(10);
      V.ui.toast('Σημείωση: ' + txt, { tone: 'info', duration: 2600 });
      /* το input ζει μέσα σε αυτό το render — δεν χρειάζεται επανασχεδιασμός */
      V.ui.$$('.cnote__input').forEach(function (i) { i.value = ''; });
    }

    /* --- σετ + ενδέκη --- */
    var cur = V.Store.currentSet(m);
    var nums = [];
    for (var i = 1; i <= cur; i++) nums.push(i);

    return el('div', { class: 'cfoot' }, [
      el('div', { class: 'cfoot__row' }, [
        defBtn,
        swapBtn('L', 'Αλλαγή λιμπέρω'),
        swapBtn('MB', 'Αλλαγή MB')
      ]),
      el('div', { class: 'cnote' }, [
        noteInput,
        el('button', { class: 'btn btn--ghost btn--sm', text: '+ Σημείωση', onclick: saveNote })
      ]),
      el('div', { class: 'cfoot__row cfoot__row--set' }, [
        el('div', { class: 'seg seg--sm' }, nums.map(function (n) {
          return el('button', {
            class: 'seg__btn' + (ctx.set === n ? ' is-active' : ''),
            text: 'Σετ ' + n,
            onclick: function () { ctx.setSet(n); }
          });
        })),
        el('button', {
          class: 'btn btn--ghost btn--sm',
          text: V.Store.hasLineup(m, ctx.set) ? 'Ενδέκη' : '＋ Ενδέκη',
          onclick: function () { V.views.setup.lineupDialog(m, ctx.set); }
        }),
        el('button', {
          class: 'btn btn--ghost btn--sm',
          text: 'Ρύθμιση σετ',
          onclick: function () { startSetDialog(ctx, { title: 'Ποιος σερβίρει και πού είναι ο παίκτης σερβίς.' }); }
        })
      ])
    ]);
  }

  /* =========================================================
   * Κατάσταση παιχνιδιού (η λέξη κάτω από το σκορ)
   * ========================================================= */
  function statusLine(ctx) {
    var m = ctx.match;
    var g = V.Store.game(m, ctx.set);
    var f = ctx.flow;
    var us = m.meta.teamUs || 'Εμείς';

    var txt;
    if (f && f.stage === 'pick-attacker') txt = us + ' · ετοιμάζει επίθεση';
    else if (f && f.stage === 'defense-pick') txt = us + ' · επιλέξε άμυνα';
    else if (g.server === 'us') {
      /* ο σερβιέρ είναι ΠΑΝΤΑ όποιος βρίσκεται στη ζώνη 1 —
         το servingPlayerId μένει παλιό μετά την περιστροφή */
      var z1 = V.Store.courtPlayers(m, ctx.set).filter(function (p) { return p.zone === 1; })[0];
      txt = us + ' έχει σέρβις' + (z1 && z1.playerId ? ' — ' + z1.name : '');
    } else txt = us + ' έχει Υποδοχή';

    var canStart = !m.game[ctx.set];
    return el('div', { class: 'cstatus' }, [
      el('span', { class: 'cstatus__txt', text: txt }),
      canStart ? el('button', {
        class: 'btn btn--primary btn--sm',
        text: 'Ξεκίνα το σετ',
        onclick: function () { startSetDialog(ctx, { title: 'Ρύθμισε το ξεκίνημα του σετ.' }); }
      }) : null
    ]);
  }

  /* =========================================================
   * render
   * ========================================================= */
  function render(ctx) {
    var m = ctx.match;
    var wrap = el('div', { class: 'cscreen' }, [
      scoreboard(ctx),
      statusLine(ctx),
      court(ctx),
      controls(ctx)
    ]);
    return wrap;
  }

  V.views = V.views || {};
  V.views.court = {
    render: render,
    startSetDialog: startSetDialog
  };
})(window.V = window.V || {});
