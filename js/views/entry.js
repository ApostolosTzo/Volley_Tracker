/* =============================================================
 * views/entry.js — γρήγορη καταχώρηση στατιστικών (4 καρτέλες)
 * ============================================================= */
(function (V) {
  'use strict';

  var el = V.ui.el;
  var C = V.CONFIG;

  /* ---------------- επιλογή παίκτη ---------------- */
  function playerBar(ctx, opts) {
    opts = opts || {};
    var m = ctx.match;
    var set = ctx.set;
    var players = V.Store.entryPlayers(m, set);

    var wrap = el('div', { class: 'playerbar' });
    var strip = el('div', { class: 'playerbar__strip' });

    players.forEach(function (p) {
      var selected = ctx.selected === p.playerId;
      var chip = el('button', {
        class: 'pchip' + (selected ? ' is-selected' : '') + ' pchip--' + (p.slot.indexOf('MB') === 0 ? 'mb' : (p.slot.indexOf('L') === 0 ? 'l' : '')),
        onclick: function () { ctx.setSelected(p.playerId); V.ui.buzz(8); }
      }, [
        el('span', { class: 'pchip__pos', text: p.label }),
        el('span', { class: 'pchip__name', text: p.name })
      ]);
      strip.appendChild(chip);

      if (p.swapGroup === 'MB' || p.swapGroup === 'L') {
        var grp = p.swapGroup;
        strip.appendChild(el('button', {
          class: 'swap-btn',
          title: grp === 'MB' ? 'Αλλαγή ενεργού MB' : 'Αλλαγή ενεργού Λιμπέρω',
          onclick: function () {
            V.Store.swap(m.id, set, grp);
            V.ui.buzz(14);
            V.ui.toast(grp === 'MB' ? 'Αλλαγή MB' : 'Αλλαγή Λιμπέρω', { tone: 'info', duration: 1200 });
          }
        }, [el('span', { text: '\u21C4' }), el('span', { class: 'swap-btn__txt', text: grp })]));
      }
    });

    wrap.appendChild(el('div', { class: 'playerbar__label' }, [
      el('span', { text: 'Παίκτης' }),
      players.length ? null : el('span', { class: 'playerbar__warn', text: '— ορίστε σετ' })
    ]));
    wrap.appendChild(strip);
    return wrap;
  }

  /* ---------------- κοινό: επιλογή set ---------------- */
  function setRow(ctx) {
    var m = ctx.match;
    var cur = V.Store.currentSet(m);
    var nums = [];
    for (var i = 1; i <= cur; i++) nums.push(i);
    return el('div', { class: 'setrow' }, [
      el('span', { class: 'setrow__label', text: 'Σετ' }),
      el('div', { class: 'seg seg--sm' }, nums.map(function (n) {
        return el('button', {
          class: 'seg__btn' + (ctx.set === n ? ' is-active' : ''),
          text: String(n),
          onclick: function () { ctx.setSet(n); }
        });
      }))
    ]);
  }

  /* ---------------- segmented sticky control ---------------- */
  function segmented(label, items, value, onPick, opts) {
    opts = opts || {};
    return el('div', {
      class: 'sticky' + (opts.wide ? ' sticky--wide' : '') + (opts.stack ? ' sticky--stack' : '')
    }, [
      el('span', { class: 'sticky__label', text: label }),
      el('div', { class: 'seg' + (opts.fill ? ' seg--fill' : '') }, items.map(function (it) {
        return el('button', {
          class: 'seg__btn seg__btn--stack' + (it.id === value ? ' is-active' : '') +
            (opts.tall ? ' seg__btn--tall' : '') + (it.tone ? ' seg__btn--' + it.tone : ''),
          title: it.hint || it.label,
          onclick: function () { onPick(it.id); }
        }, [
          el('span', { class: 'seg__btn__n', text: it.label }),
          it.sub ? el('span', { class: 'seg__btn__sub', text: it.sub }) : null
        ]);
      }))
    ]);
  }

  /* ---------------- αυτόματο σκορ ---------------- */
  /* Δίνει +1 στην ομάδα που δικαιούται τον πόντο, αν το αυτόματο
     σκορ είναι ενεργοποιημένο. Επιστρέφει 'us' | 'them' | null. */
  function applyAutoScore(ctx, ev) {
    if (ctx.match.autoScore === false) return null;
    var side = C.scoreSideFor(ev);
    if (!side) return null;
    V.Store.addPoint(ctx.match.id, ev.set, side, 1);
    return side;
  }

  function scoreNote(side) {
    if (!side) return '';
    return side === 'us' ? '  ·  +1 εμείς' : '  ·  +1 αντίπαλοι';
  }

  /* ---------------- χτυπήματα ---------------- */
  function renderAttacks(ctx) {
    var wrap = el('div', { class: 'entry' });
    wrap.appendChild(playerBar(ctx));
    wrap.appendChild(setRow(ctx));

    var grid = el('div', {
      class: 'amat-grid',
      style: 'grid-template-columns:repeat(' + C.ATTACK_KINDS.length + ',1fr)'
    });
    C.ATTACK_KINDS.forEach(function (k) {
      var col = el('div', { class: 'amat-col', style: '--accent-c:' + (k.accent || 'var(--accent)') });
      col.appendChild(el('div', { class: 'amat-col__head', text: k.label }));
      C.ATTACK_RESULTS[k.id].forEach(function (r) {
        col.appendChild(el('button', {
          class: 'amat-btn amat-btn--' + r.tone,
          onclick: function () { logAttack(ctx, k.id, r.id); }
        }, [
          el('span', { class: 'amat-btn__emoji', text: r.emoji }),
          el('span', { class: 'amat-btn__label', text: r.label })
        ]));
      });
      grid.appendChild(col);
    });
    wrap.appendChild(grid);

    wrap.appendChild(el('p', { class: 'hint', text: '1) Πάτα παίκτη  2) Πάτα αποτέλεσμα. Οι στήλες είναι Tip / Spike.' }));
    return wrap;
  }

  function logAttack(ctx, kind, result) {
    var m = ctx.match;
    if (!ctx.selected) { warnPlayer(ctx); return; }
    var ev = V.Store.addEvent(m.id, {
      set: ctx.set,
      type: 'attack',
      playerId: ctx.selected,
      kind: kind,
      result: result
    });
    /* υπενθύμιση για την επόμενη πάσα: ποιος χτύπησε τελευταία */
    ctx.rememberSpiker(kind);
    var side = applyAutoScore(ctx, ev);
    V.ui.buzz(side ? 18 : 10);
    V.ui.toast(
      V.Store.playerName(m, ev.playerId) + ' · ' + C.ATTACK_KINDS.find(function (k) { return k.id === kind; }).label + ' · ' +
      V.label.attackResult(kind, result) + scoreNote(side),
      {
        tone: result === 'point' || result === 'block_saved' ? 'good'
          : (result === 'saved' ? 'neutral' : 'bad'),
        actionLabel: 'Undo', onAction: function () { undo(ctx); }
      }
    );
  }

  /* ---------------- υποδοχές ---------------- */
  function renderReceptions(ctx) {
    var wrap = el('div', { class: 'entry' });
    wrap.appendChild(playerBar(ctx));
    wrap.appendChild(setRow(ctx));

    /* ο τύπος υποδοχής ΕΙΝΑΙ η καταχώρηση: πατάς το παίκτη και μετά τον τύπο */
    wrap.appendChild(segmented('Τύπος υποδοχής', C.RECEPTION_TARGETS.map(function (t) {
      return { id: t.id, label: t.label, hint: t.hint, sub: t.sub, tone: 'rec' };
    }), ctx.sticky.recTarget, function (v) { logReception(ctx, v); }, { stack: true, fill: true, tall: true }));

    wrap.appendChild(el('p', { class: 'hint', text: 'Πάτα παίκτη και μετά τον τύπο — η υποδοχή καταχωρείται αμέσως.' }));
    return wrap;
  }

  function logReception(ctx, target) {
    var m = ctx.match;
    if (!ctx.selected) { warnPlayer(ctx); return; }
    ctx.sticky.recTarget = target;   /* θυμάται τον τελευταίο για ενόπιση */
    var ev = V.Store.addEvent(m.id, {
      set: ctx.set,
      type: 'reception',
      playerId: ctx.selected,
      target: target
    });
    var side = applyAutoScore(ctx, ev);
    V.ui.buzz(side ? 18 : 10);
    V.ui.toast(
      V.Store.playerName(m, ctx.selected) + ' · υποδοχή τύπος ' + target + scoreNote(side),
      { tone: side === 'them' ? 'bad' : 'neutral', actionLabel: 'Undo', onAction: function () { undo(ctx); } }
    );
  }

  /* ---------------- πάσες ---------------- */
  function renderPasses(ctx) {
    var wrap = el('div', { class: 'entry' });
    wrap.appendChild(playerBar(ctx));
    wrap.appendChild(setRow(ctx));

    var sug = ctx.sticky.passTarget;
    var targetSeg = segmented('Σε ποιον', C.PASS_TARGETS.map(function (t) {
      return { id: t.id, label: t.label };
    }), sug, function (v) { ctx.setSticky('passTarget', v); }, { wide: true });

    if (ctx.lastSpiker) {
      targetSeg.insertBefore(el('span', {
        class: 'sticky__hint',
        text: 'Υπενθύμιση: τελευταίο χτύπημα ' + ctx.lastSpiker
      }), targetSeg.querySelector('.seg'));
    }
    wrap.appendChild(targetSeg);

    /* πρόβληματα (πολλαπλή επιλογή) */
    var issues = (ctx.sticky.passIssues || []).slice();
    var issueWrap = el('div', { class: 'issues' });
    issueWrap.appendChild(el('span', { class: 'sticky__label', text: 'Πρόβλημα (0 = καθαρή πάσα)' }));
    var chips = el('div', { class: 'chiprow' });
    C.PASS_ISSUES.forEach(function (i) {
      var on = issues.indexOf(i.id) !== -1;
      chips.appendChild(el('button', {
        class: 'tchip' + (on ? ' is-on' : ''),
        text: i.label,
        onclick: function () {
          var idx = issues.indexOf(i.id);
          if (idx === -1) issues.push(i.id); else issues.splice(idx, 1);
          ctx.setSticky('passIssues', issues.slice());
          V.ui.buzz(8);
        }
      }));
    });
    issueWrap.appendChild(chips);
    wrap.appendChild(issueWrap);

    var actions = el('div', { class: 'grid2' });
    actions.appendChild(el('button', {
      class: 'btn btn--big btn--good',
      onclick: function () { logPass(ctx, issues.slice()); }
    }, [
      el('span', { class: 'amat-btn__emoji', text: '\u2713' }),
      el('span', { class: 'amat-btn__label', text: issues.length ? 'Πάσα με πρόβλημα' : 'Καθαρή πάσα' })
    ]));
    actions.appendChild(el('button', {
      class: 'btn btn--big btn--ghost',
      text: 'Καθαρή',
      onclick: function () {
        ctx.setSticky('passIssues', []);
        logPass(ctx, []);
      }
    }));
    wrap.appendChild(actions);
    return wrap;
  }

  function logPass(ctx, issues) {
    var m = ctx.match;
    if (!ctx.selected) { warnPlayer(ctx); return; }
    var target = ctx.sticky.passTarget;
    V.Store.addEvent(m.id, {
      set: ctx.set,
      type: 'pass',
      playerId: ctx.selected,
      target: target,
      issues: issues
    });
    V.ui.buzz(10);
    var desc = V.Store.playerName(m, ctx.selected) + ' → ' + V.label.passTarget(target) +
      (issues.length ? ' · ' + issues.map(function (i) { return V.label.passIssue(i); }).join(', ') : ' · καθαρή');
    /* οι πάσες δεν δίνουν πόντο — μόνο ενημέρωση σκορ αν ήταν ενεργό (δεν είναι) */
    V.ui.toast(desc, {
      tone: issues.length ? 'neutral' : 'good',
      actionLabel: 'Undo', onAction: function () { undo(ctx); }
    });
  }

  /* ---------------- σερβίς ---------------- */
  function renderServes(ctx) {
    var wrap = el('div', { class: 'entry' });
    wrap.appendChild(playerBar(ctx));
    wrap.appendChild(setRow(ctx));

    wrap.appendChild(segmented('Τύπος σερβίς', C.SERVE_TYPES.map(function (t) {
      return { id: t.id, label: t.label };
    }), ctx.sticky.serveType, function (v) { ctx.setSticky('serveType', v); }, { wide: true }));

    var grid = el('div', { class: 'grid2' });
    C.SERVE_RESULTS.forEach(function (r) {
      grid.appendChild(el('button', {
        class: 'btn btn--big btn--' + r.tone,
        title: r.help || '',
        onclick: function () { logServe(ctx, r.id); }
      }, [
        el('span', { class: 'amat-btn__emoji', text: r.emoji }),
        el('span', { class: 'amat-btn__label', text: r.label })
      ]));
    });
    wrap.appendChild(grid);

    /* ζώνη (προαιρετικό) */
    var zones = el('div', { class: 'chiprow' }, [
      el('button', {
        class: 'tchip' + (!ctx.sticky.serveZone ? ' is-on' : ''),
        text: '— χωρίς ζώνη —',
        onclick: function () { ctx.setSticky('serveZone', null); }
      })
    ].concat(C.SERVE_ZONES.map(function (z) {
      return el('button', {
        class: 'tchip' + (ctx.sticky.serveZone === z ? ' is-on' : ''),
        text: z,
        onclick: function () { ctx.setSticky('serveZone', z); }
      });
    })));
    wrap.appendChild(el('div', { class: 'issues' }, [
      el('span', { class: 'sticky__label', text: 'Ζώνη σερβίς (προαιρετικό)' }),
      zones
    ]));

    return wrap;
  }

  function logServe(ctx, result) {
    var m = ctx.match;
    if (!ctx.selected) { warnPlayer(ctx); return; }
    var stype = ctx.sticky.serveType;
    var ev = V.Store.addEvent(m.id, {
      set: ctx.set,
      type: 'serve',
      playerId: ctx.selected,
      stype: stype,
      result: result,
      zone: ctx.sticky.serveZone
    });
    var side = applyAutoScore(ctx, ev);
    V.ui.buzz(side ? 20 : 10);
    V.ui.toast(
      V.Store.playerName(m, ctx.selected) + ' · ' + V.label.serveType(stype) + ' · ' + V.label.serveResult(result) +
      (ctx.sticky.serveZone ? ' · ζ.' + ctx.sticky.serveZone : '') + scoreNote(side),
      {
        tone: result === 'ace' ? 'good' : (result === 'out' ? 'bad' : 'neutral'),
        actionLabel: 'Undo', onAction: function () { undo(ctx); }
      }
    );
  }

  /* ---------------- helpers ---------------- */
  function warnPlayer(ctx) {
    V.ui.toast('Διάλεξε πρώτα παίκτη', { tone: 'warn' });
  }

  function undo(ctx) {
    var ev = V.Store.undoLast(ctx.match.id);
    if (ev) V.ui.toast('Αναιρέθηκε: ' + eventLabel(ctx.match, ev), { tone: 'info', duration: 1600 });
  }

  /* περιγραφή γεγονότος για το toast */
  function eventLabel(m, e) {
    var who = V.Store.playerName(m, e.playerId);
    switch (e.type) {
      case 'attack': return who + ' · ' + V.label.attackKind(e.kind) + ' · ' + V.label.attackResult(e.kind, e.result);
      case 'reception': return who + ' · υποδοχή τύπος ' + e.target;
      case 'pass': return who + ' · πάσα → ' + V.label.passTarget(e.target);
      case 'serve': return who + ' · σερβίς ' + V.label.serveResult(e.result);
      default: return e.type;
    }
  }

  /* υπότιτλος υποδοχής: τι σημαίνει ο τύπος (το 0 δεν έχει) */
  function receptionTargetSub(id) {
    var t = V.byId(C.RECEPTION_TARGETS, id);
    return (t && t.sub) ? t.sub : '';
  }

  V.views = V.views || {};
  V.views.entry = {
    render: function (ctx) {
      switch (ctx.tab) {
        case 'attack': return renderAttacks(ctx);
        case 'reception': return renderReceptions(ctx);
        case 'pass': return renderPasses(ctx);
        case 'serve': return renderServes(ctx);
        default: return el('div');
      }
    },
    eventLabel: eventLabel,
    undo: undo
  };
})(window.V = window.V || {});