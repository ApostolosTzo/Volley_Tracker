/* =============================================================
 * views/dashboard.js — στατιστικά, ιστορικά, ανά σετ + λογόδιο
 * ============================================================= */
(function (V) {
  'use strict';

  var el = V.ui.el;
  var CH = V.charts;
  var C = V.CONFIG;

  /* ---------------- φίλτρο σετ ---------------- */
  function setFilter(ctx) {
    var m = ctx.match;
    var cur = V.Store.currentSet(m);
    var nums = [];
    for (var i = 1; i <= cur; i++) nums.push(i);
    return el('div', { class: 'setfilter' }, [
      el('span', { class: 'setfilter__label', text: 'Σετ' }),
      el('div', { class: 'seg seg--sm' }, [{ id: 'all', label: 'Όλα' }].concat(nums.map(function (n) {
        return { id: String(n), label: String(n) };
      })).map(function (o) {
        return el('button', {
          class: 'seg__btn' + (String(ctx.statSet) === o.id ? ' is-active' : ''),
          text: o.label,
          onclick: function () { ctx.setStatSet(o.id); }
        });
      }))
    ]);
  }

  function section(title, icon, body, extra) {
    return el('section', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('h2', { class: 'card__title', text: (icon ? icon + ' ' : '') + title }),
        extra || null
      ]),
      body
    ]);
  }

  /* ---------------- ΧΤΥΠΗΜΑΤΑ ---------------- */
  function attackSection(ctx, s) {
    if (!s.total) return section('Χτυπήματα', '\uD83E\uDD3A', emptyState('Δεν υπάρχουν χτυπήματα σε αυτό το σετ.'));

    var head = CH.statCards([
      { value: String(s.kills), label: 'Πόντοι', accent: 'good' },
      { value: String(s.total), label: 'Προσπάθειες' },
      { value: V.Stats.fmtPct(s.kills, s.total), label: 'Ποσοστό', hint: 'kills / attempts' },
      { value: String(s.players.length), label: 'Παίκτες' }
    ]);

    var body = el('div', {}, [
      head,
      el('h3', { class: 'sub', text: 'Τι είδους ήταν τα χτυπήματα' }),
      CH.bars(s.kindCounts.map(function (k) {
        return { label: k.label, value: k.value, tone: 'default' };
      })),
      el('h3', { class: 'sub', text: 'Ποιος χτύπησε και πόσοι πόντοι έβαλε' }),
      CH.bars(s.players.map(function (p) {
        return {
          label: String(p.kills),
          name: p.name,
          value: p.kills,
          tone: 'good',
          sub: p.total + ' προσπάθειες · ' + (p.total ? (100 - p.killPct).toFixed(1) : '0') + '% χαμένες',
          meta: p.position ? 'Θέση: ' + p.position : ''
        };
      }), { hideEmpty: true }),
      el('h3', { class: 'sub', text: 'Τι έκανε κάθε παίκτης σε κάθε χτύπημα' }),
      el('div', { class: 'detail-list' }, s.players.map(function (p) {
        return playerAttackDetail(p);
      }))
    ]);
    return section('Χτυπήματα', '\uD83E\uDD3A', body);
  }

  function playerAttackDetail(p) {
    var rows = [];
    C.ATTACK_KINDS.forEach(function (k) {
      var n = p.byKind[k.id] || 0;
      if (!n) return;
      rows.push({ label: V.label.attackKind(k.id), value: n, tone: 'default' });
    });
    C.ATTACK_KINDS.forEach(function (k) {
      C.ATTACK_RESULTS[k.id].forEach(function (r) {
        var n = p.byResult[r.id] || 0;
        if (!n) return;
        rows.push({ label: r.label, name: V.label.attackKind(k.id), value: n, tone: r.tone });
      });
    });

    return el('details', { class: 'detail' }, [
      el('summary', { class: 'detail__sum' }, [
        el('span', { class: 'detail__name', text: p.name }),
        el('span', { class: 'detail__meta', text: p.total + ' χτ. · ' + p.kills + ' πόντοι · ' + V.Stats.fmtPct(p.kills, p.total) })
      ]),
      el('div', { class: 'detail__body' }, [
        CH.bars(rows, { dense: true }),
        el('div', { class: 'tagrow' }, [
          CH.chip('Πόντοι: ' + p.kills, 'good'),
          CH.chip('Σώθηκε: ' + p.saved, 'neutral'),
          CH.chip('Block: ' + p.blocked, 'bad'),
          CH.chip('Out: ' + p.out, 'bad')
        ])
      ])
    ]);
  }

  /* ---------------- ΥΠΟΔΟΧΕΣ ---------------- */
  function receptionSection(ctx, s) {
    if (!s.total) return section('Υποδοχές', '\uD83D\uDCD6', emptyState('Δεν υπάρχουν υποδοχές σε αυτό το σετ.'));

    var body = el('div', {}, [
      CH.statCards([
        { value: String(s.total), label: 'Υποδοχές' },
        { value: String(s.targets.filter(function (t) { return t.id === '0'; })[0].value), label: 'Τύπος 0' },
        { value: String(s.players.length), label: 'Παίκτες' }
      ]),
      el('h3', { class: 'sub', text: 'Ποιος υπέδεξε και πόσες' }),
      CH.bars(s.players.map(function (p) {
        return {
          label: String(p.total), name: p.name, value: p.total, tone: 'default',
          sub: C.RECEPTION_TARGETS.filter(function (t) { return (p.byTarget[t.id] || 0) > 0; })
            .map(function (t) { return t.label + '×' + p.byTarget[t.id]; }).join(' · ')
        };
      }), { hideEmpty: true }),
      el('h3', { class: 'sub', text: 'Πόσοι τύποι υποδοχής (0 / 1 / 2 / 3)' }),
      CH.bars(s.targets.map(function (t) {
        return { label: 'Τύπος ' + t.label, name: t.sub || '', value: t.value, tone: 'default' };
      })),
      el('h3', { class: 'sub', text: 'Τι έκανε κάθε παίκτης σε κάθε υποδοχή' }),
      el('div', { class: 'detail-list' }, s.players.map(function (p) {
        return playerReceptionDetail(p);
      }))
    ]);
    return section('Υποδοχές', '\uD83D\uDCD6', body);
  }

  function playerReceptionDetail(p) {
    var rows = [];
    /* τύποι υποδοχής — το βασικό */
    C.RECEPTION_TARGETS.forEach(function (t) {
      var n = p.byTarget[t.id] || 0;
      if (!n) return;
      rows.push({ label: 'Τύπος ' + t.label, name: t.sub || '', value: n, tone: 'default' });
    });
    /* αποτελέσματα — μόνο αν υπάρχουν (παλιές καταχωρήσεις) */
    C.RECEPTION_RESULTS.forEach(function (r) {
      var n = p.byResult[r.id] || 0;
      if (!n) return;
      rows.push({ label: r.label, value: n, tone: r.tone });
    });

    var meta = p.total + ' υποδοχές';
    if (p.good || p.ace || p.error || p.poor) {
      meta += ' · ' + V.Stats.fmtPct(p.goodPct, 100) + ' ποιοστό';
    }

    return el('details', { class: 'detail' }, [
      el('summary', { class: 'detail__sum' }, [
        el('span', { class: 'detail__name', text: p.name }),
        el('span', { class: 'detail__meta', text: meta })
      ]),
      el('div', { class: 'detail__body' }, [CH.bars(rows, { dense: true })])
    ]);
  }

  /* ---------------- ΠΑΣΕΣ ---------------- */
  function passSection(ctx, s) {
    if (!s.total) return section('Πάσες', '\uD83C\uDFAF', emptyState('Δεν υπάρχουν πάσες σε αυτό το σετ.'));

    var body = el('div', {}, [
      CH.statCards([
        { value: String(s.total), label: 'Πάσες' },
        { value: String(s.players.length), label: 'Παίκτες' },
        { value: s.cleanPct == null ? '—' : s.cleanPct.toFixed(1) + '%', label: 'Καθαρές' }
      ]),
      el('h3', { class: 'sub', text: 'Ποιος έδωσε πάσα και πόσες' }),
      CH.bars(s.players.map(function (p) {
        return {
          label: String(p.total), name: p.name, value: p.total, tone: 'default',
          sub: p.clean + ' καθαρές · ' + p.withIssue + ' με πρόβλημα'
        };
      }), { hideEmpty: true }),
      el('h3', { class: 'sub', text: 'Σε ποιον πήγαν οι πάσες' }),
      CH.bars(s.targets.map(function (t) {
        return { label: t.label, value: t.value, tone: 'default' };
      })),
      el('h3', { class: 'sub', text: 'Προβλήματα στις πάσες' }),
      s.issues.some(function (i) { return i.value; })
        ? CH.bars(s.issues.map(function (i) {
          return { label: i.label, value: i.value, tone: 'bad' };
        }))
        : emptyState('Καμία πάσα με πρόβλημα.'),
      el('h3', { class: 'sub', text: 'Πόσο καθαρές οι πάσες ανά παίκτη' }),
      el('div', { class: 'meters' }, s.pairs.map(function (p) {
        return CH.meter('Πάσα σε ' + p.label, p.clean, p.total, p.cleanPct >= 80 ? 'good' : (p.cleanPct >= 50 ? 'default' : 'bad'));
      }))
    ]);
    return section('Πάσες', '\uD83C\uDFAF', body);
  }

  /* ---------------- ΣΕΡΒΙΣ ---------------- */
  function serveSection(ctx, s) {
    if (!s.total) return section('Σερβίς', '\uD83C\uDF00', emptyState('Δεν υπάρχουν σερβίς σε αυτό το σετ.'));

    var body = el('div', {}, [
      CH.statCards([
        { value: String(s.aces), label: 'Aces', accent: 'good' },
        { value: String(s.total), label: 'Σερβίς' },
        { value: V.Stats.fmtPct(s.aces, s.total), label: 'Ποσοστό ace' },
        { value: String(s.players.length), label: 'Σερβιέρ' }
      ]),
      el('h3', { class: 'sub', text: 'Ποιος πέτυχε ace' }),
      CH.bars(s.players.map(function (p) {
        return {
          label: String(p.aces), name: p.name, value: p.aces, tone: 'good',
          sub: p.total + ' σερβίς · ' + p.out + ' out · ' + p.saved + ' σώθηκε'
        };
      }), { hideEmpty: true }),
      el('h3', { class: 'sub', text: 'Τύπος σερβίς' }),
      CH.bars(s.types.map(function (t) {
        return { label: t.label, value: t.value, tone: 'default' };
      })),
      el('h3', { class: 'sub', text: 'Τι έκανε κάθε σερβιέρ' }),
      el('div', { class: 'detail-list' }, s.players.map(function (p) {
        var rows = C.SERVE_RESULTS.map(function (r) {
          return { label: r.label, value: (p.byResult && p.byResult[r.id]) || 0, tone: r.tone };
        }).filter(function (r) { return r.value; });
        rows.unshift({ label: 'Άλμα', value: p.jump, tone: 'default' });
        rows.push({ label: 'Float', value: p.float, tone: 'default' });
        rows = rows.filter(function (r) { return r.value; });
        return el('details', { class: 'detail' }, [
          el('summary', { class: 'detail__sum' }, [
            el('span', { class: 'detail__name', text: p.name }),
            el('span', { class: 'detail__meta', text: p.total + ' σερβίς · ' + p.aces + ' ace · ' + V.Stats.fmtPct(p.acePct, 100) })
          ]),
          el('div', { class: 'detail__body' }, [
            CH.bars(rows, { dense: true }),
            el('div', { class: 'tagrow' }, [
              CH.chip('Ace: ' + p.aces, 'good'),
              CH.chip('Out: ' + p.out, 'bad'),
              CH.chip('Σώθηκε: ' + p.saved, 'neutral')
            ])
          ])
        ]);
      }))
    ]);
    return section('Σερβίς', '\uD83C\uDF00', body);
  }

  /* ---------------- συνοπτική εικόνα ---------------- */
  function overviewSection(m, s) {
    var rows = V.Stats.bySet(m);
    var setsUs = rows.filter(function (r) { return r.us > r.them; }).length;
    var setsThem = rows.filter(function (r) { return r.them > r.us; }).length;

    var body = el('div', {}, [
      CH.statCards([
        { value: setsUs + '–' + setsThem, label: 'Σετ', accent: setsUs >= setsThem ? 'good' : 'bad' },
        { value: String(s.attacks.kills), label: 'Πόντοι από χτύπημα', accent: 'good' },
        { value: String(s.serves.aces), label: 'Aces', accent: 'good' },
        { value: String(s.receptions.total), label: 'Υποδοχές' },
        { value: s.passes.cleanPct == null ? '—' : s.passes.cleanPct.toFixed(1) + '%', label: 'Καθαρές πάσες' },
        { value: String(m.events.length), label: 'Καταχωρήσεις' }
      ]),
      el('div', { class: 'top-list' }, [
        s.attacks.topKiller ? topLine('🏆 Πρώτος σκόρερ', s.attacks.topKiller.name,
          s.attacks.topKiller.kills + ' πόντοι από ' + s.attacks.topKiller.total + ' χτυπήματα (' +
          V.Stats.fmtPct(s.attacks.topKiller.kills, s.attacks.topKiller.total) + ')') : null,
        s.serves.players[0] ? topLine('🎯 Καλύτερος σερβιέρ', s.serves.players[0].name,
          s.serves.players[0].aces + ' ace από ' + s.serves.players[0].total + ' σερβίς (' +
          V.Stats.fmtPct(s.serves.players[0].acePct, 100) + ')') : null,
        s.receptions.players[0] ? topLine('🧱 Περισσότερες υποδοχές', s.receptions.players[0].name,
          s.receptions.players[0].total + ' υποδοχές (' +
          C.RECEPTION_TARGETS.filter(function (t) { return s.receptions.players[0].byTarget[t.id]; })
            .map(function (t) { return t.label + '×' + s.receptions.players[0].byTarget[t.id]; }).join(', ') + ')') : null,
        s.passes.players[0] ? topLine('🤝 Περισσότερες πάσες', s.passes.players[0].name,
          s.passes.players[0].total + ' πάσες') : null
      ].filter(Boolean))
    ]);
    return section('Συνοπτικά', '\uD83D\uDCCA', body);
  }

  function topLine(label, name, detail) {
    return el('div', { class: 'top-line' }, [
      el('span', { class: 'top-line__label', text: label }),
      el('span', { class: 'top-line__name', text: name }),
      el('span', { class: 'top-line__detail', text: detail })
    ]);
  }

  /* ---------------- ΣΕΤ ΑΝΑ ΣΕΤ ---------------- */
  function setTableSection(m) {
    var rows = V.Stats.bySet(m).map(function (r) {
      return [
        { text: 'Σετ ' + r.set, strong: true },
        { text: r.us + '–' + r.them },
        { text: String(r.attacks) },
        { text: String(r.kills) },
        { text: r.killPct == null ? '—' : r.killPct.toFixed(1) + '%' },
        { text: String(r.receptions) },
        { text: String(r.recNoBlock) },
        { text: String(r.serves) },
        { text: String(r.aces) }
      ];
    });
    var headers = ['Σετ', 'Σκορ', 'Χτυπ.', 'Ποντ.', '%', 'Υποδ.', '0', 'Σερβ.', 'Aces'].map(function (l, i) {
      return { label: l, num: i > 0 };
    });

    /* ποιοι έπαιξαν σε κάθε σετ */
    var lineups = el('div', { class: 'set-lineups' }, V.Stats.bySet(m).map(function (r) {
      var lu = r.lineup;
      var names = [];
      if (lu) {
        C.COURT_SLOTS.forEach(function (s) {
          if (s.reserve) return;
          var pid = lu[s.id];
          if (pid) names.push(s.label + ': ' + V.Store.playerName(m, pid));
        });
      }
      return el('div', { class: 'set-lineup' }, [
        el('span', { class: 'set-lineup__n', text: 'Σετ ' + r.set }),
        el('span', { class: 'set-lineup__names', text: names.join(' · ') || '—' })
      ]);
    }));

    return section('Σετ ανά σετ', '\uD83D\uDCCA', el('div', {}, [
      rows.length ? CH.table(headers, rows) : emptyState('Δεν υπάρχουν σετ.'),
      lineups
    ]));
  }

  /* ---------------- Λογόδιο ---------------- */
  var LOG_PAGE = 120;

function renderTimeline(ctx) {
    var m = ctx.match;
    var evs = m.events.slice().reverse();
    if (!evs.length) return el('div', { class: 'card' }, [emptyState('Κανές καταχωρήσεις ακόμα.')]);

    var shown = evs.slice(0, ctx.logAll ? evs.length : LOG_PAGE);

    function row(e) {
      return el('div', { class: 'log', dataset: { id: e.id } }, [
        el('div', { class: 'log__time', text: V.ui.fmtTime(e.ts) }),
        el('div', { class: 'log__badge log__badge--' + e.type, text: badgeFor(e.type) }),
        el('div', { class: 'log__main' }, [
          el('div', { class: 'log__title', text: V.views.entry.eventLabel(m, e) }),
          el('div', { class: 'log__sub', text: subFor(e) })
        ]),
        el('button', {
          class: 'log__edit',
          text: '✎',
          'aria-label': 'Επεξεργασία',
          onclick: function () { editEvent(ctx, e); }
        })
      ]);
    }

    var foot = null;
    if (evs.length > shown.length) {
      foot = el('button', {
        class: 'btn btn--ghost btn--sm',
        text: 'Δείξε όλες τις ' + evs.length + ' καταχωρήσεις',
        onclick: function () { ctx.logAll = true; V.app.render(); }
      });
    } else if (ctx.logAll) {
      foot = el('button', {
        class: 'btn btn--ghost btn--sm',
        text: 'Δείξε λιγότερες',
        onclick: function () { ctx.logAll = false; V.app.render(); }
      });
    }

    return el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('h2', { class: 'card__title', text: '\uD83D\uDCDC Λογόδιο (' + evs.length + ')' }),
        el('button', { class: 'btn btn--ghost btn--sm', text: 'Undo τελευταίο', onclick: function () { V.views.entry.undo(ctx); } })
      ]),
      el('div', { class: 'log-list' }, shown.map(row)),
      foot
    ]);
  }

  function badgeFor(type) {
    var t = C.EVENT_TYPES.find(function (x) { return x.id === type; });
    return t ? t.short : type;
  }

  function subFor(e) {
    var parts = ['Σετ ' + e.set];
    if (e.type === 'reception') {
      var t = V.byId(C.RECEPTION_TARGETS, e.target);
      if (t && t.sub) parts.push(t.sub);
    } else if (e.type === 'pass') {
      parts.push((e.issues && e.issues.length)
        ? e.issues.map(function (i) { return V.label.passIssue(i); }).join(' + ')
        : 'χωρίς πρόβλημα');
    } else if (e.type === 'serve') {
      if (e.zone) parts.push('Ζώνη ' + e.zone);
    } else if (e.type === 'attack') {
      parts.push(V.label.attackKind(e.kind));
    }
    return parts.join(' · ');
  }

  function editEvent(ctx, e) {
    var body = el('div', { class: 'editor' });
    var draft = JSON.parse(JSON.stringify(e));

    /* παίκτης */
    var players = V.Store.onCourt(ctx.match, e.set);
    body.appendChild(el('label', { class: 'field' }, [
      el('span', { class: 'field__label', text: 'Παίκτης' }),
      V.ui.select(players.map(function (p) {
        return { id: p.playerId, label: p.label + ' · ' + p.name };
      }).concat([{ id: '', label: '— χωρίς παίκτη —' }]), draft.playerId)
    ]));
    var pSel = body.querySelector('select');

    function segRow(label, list, key) {
      return el('div', { class: 'sticky' }, [
        el('span', { class: 'sticky__label', text: label }),
        el('div', { class: 'seg' }, list.map(function (it) {
          return el('button', {
            class: 'seg__btn' + (draft[key] === it.id ? ' is-active' : ''),
            text: it.label,
            onclick: function () {
              draft[key] = it.id;
              Array.prototype.forEach.call(this.parentNode.children, function (b) { b.classList.remove('is-active'); });
              this.classList.add('is-active');
            }
          });
        }))
      ]);
    }

    if (e.type === 'attack') {
      var kinds = C.ATTACK_KINDS.map(function (k) { return { id: k.id, label: k.label }; });
      body.appendChild(segRow('Είδος', kinds, 'kind'));
      var resWrap = el('div', { class: 'sticky' });
      function renderResults() {
        V.ui.clear(resWrap);
        resWrap.appendChild(segRow('Αποτέλεσμα', C.ATTACK_RESULTS[draft.kind].map(function (r) {
          return { id: r.id, label: r.label };
        }), 'result'));
        resWrap.firstChild.querySelectorAll('.seg__btn').forEach(function (b) {
          if (b.textContent === V.label.attackResult(draft.kind, draft.result)) b.classList.add('is-active');
        });
      }
      body.appendChild(resWrap);
      renderResults();
      body.querySelectorAll('.sticky')[0].querySelectorAll('.seg__btn').forEach(function (b) {
        b.addEventListener('click', function () { setTimeout(renderResults, 0); });
      });
    } else if (e.type === 'reception') {
      body.appendChild(segRow('Τύπος', C.RECEPTION_TARGETS.map(function (r) { return { id: r.id, label: r.label + ' · ' + r.sub }; }), 'target'));
    } else if (e.type === 'pass') {
      body.appendChild(segRow('Σε ποιον', C.PASS_TARGETS.map(function (r) { return { id: r.id, label: r.label }; }), 'target'));
      var issues = (draft.issues || []).slice();
      body.appendChild(el('div', { class: 'issues' }, [
        el('span', { class: 'sticky__label', text: 'Προβλήματα' }),
        el('div', { class: 'chiprow' }, C.PASS_ISSUES.map(function (i) {
          return el('button', {
            class: 'tchip' + (issues.indexOf(i.id) !== -1 ? ' is-on' : ''),
            text: i.label,
            onclick: function () {
              var idx = issues.indexOf(i.id);
              if (idx === -1) issues.push(i.id); else issues.splice(idx, 1);
              this.classList.toggle('is-on');
            }
          });
        }))
      ]));
      body._issues = issues;
    } else if (e.type === 'serve') {
      body.appendChild(segRow('Τύπος', C.SERVE_TYPES.map(function (r) { return { id: r.id, label: r.label }; }), 'stype'));
      body.appendChild(segRow('Αποτέλεσμα', C.SERVE_RESULTS.map(function (r) { return { id: r.id, label: r.label }; }), 'result'));
    }

    body.appendChild(el('label', { class: 'field' }, [
      el('span', { class: 'field__label', text: 'Σετ' }),
      V.ui.select([1, 2, 3, 4, 5].map(function (n) { return { id: String(n), label: 'Σετ ' + n }; }), String(draft.set))
    ]));
    var setSel = body.querySelectorAll('select')[1];

    V.ui.modal({
      title: 'Επεξεργασία καταχώρησης',
      body: body,
      actions: [
        {
          label: 'Διαγραφή',
          variant: 'danger',
          onClick: function () {
            V.Store.removeEvent(ctx.match.id, e.id);
            V.ui.toast('Διαγράφηκε', { tone: 'info' });
          }
        },
        { label: 'Άκυρο', variant: 'ghost' },
        {
          label: 'Αποθήκευση',
          variant: 'primary',
          onClick: function () {
            V.Store.updateEvent(ctx.match.id, e.id, {
              playerId: pSel.value || null,
              kind: draft.kind, result: draft.result,
              target: draft.target,
              stype: draft.stype, zone: draft.zone,
              issues: body._issues || draft.issues || [],
              set: Number(setSel.value)
            });
            V.ui.toast('Ενημερώθηκε', { tone: 'good' });
          }
        }
      ]
    });
  }

  function emptyState(text) {
    return el('p', { class: 'empty', text: text });
  }

  V.views = V.views || {};
  V.views.dashboard = {
    render: function (ctx) {
      var m = ctx.match;
      var s = V.Stats.summary(m, ctx.statSet);
      var wrap = el('div', { class: 'stats' }, [
        setFilter(ctx),
        overviewSection(m, s),
        attackSection(ctx, s.attacks),
        receptionSection(ctx, s.receptions),
        passSection(ctx, s.passes),
        serveSection(ctx, s.serves),
        setTableSection(m)
      ]);
      return wrap;
    },
    renderTimeline: renderTimeline
  };
})(window.V = window.V || {});