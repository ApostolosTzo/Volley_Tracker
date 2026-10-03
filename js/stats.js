/* =============================================================
 * stats.js — στατιστικά / ιστορικά (aggregations)
 * ============================================================= */
(function (V) {
  'use strict';

  function pct(num, den) {
    if (!den) return null;
    return Math.round((num / den) * 1000) / 10;
  }
  function fmtPct(num, den) {
    var p = pct(num, den);
    return p == null ? '—' : p.toFixed(1) + '%';
  }

  function filter(m, set) {
    if (set === 'all' || set == null || set === '') return m.events.slice();
    var n = Number(set);
    return m.events.filter(function (e) { return e.set === n; });
  }

  function countBy(list, keyFn) {
    var out = {};
    list.forEach(function (x) {
      var k = keyFn(x);
      if (k == null || k === '') return;
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  /* πόσοι events ανά παίκτη (μόνο αυτούς που έχουν) */
  function playersWithEvents(m, events) {
    var ids = {};
    events.forEach(function (e) { if (e.playerId) ids[e.playerId] = true; });
    return Object.keys(ids).map(function (pid) {
      return {
        id: pid,
        name: V.Store.playerName(m, pid),
        player: V.Store.player(m, pid),
        events: events.filter(function (e) { return e.playerId === pid; })
      };
    }).sort(function (a, b) { return b.events.length - a.events.length; });
  }

  /* ---------------- ΧΤΥΠΗΜΑΤΑ ---------------- */
  function attacks(m, set) {
    var ev = filter(m, set).filter(function (e) { return e.type === 'attack'; });
    var players = playersWithEvents(m, ev).map(function (p) {
      var byResult = countBy(p.events, function (e) { return e.result; });
      var byKind = countBy(p.events, function (e) { return e.kind; });
      var kills = byResult.point || 0;
      var total = p.events.length;
      return {
        id: p.id,
        name: p.name,
        position: p.player ? p.player.position : '',
        total: total,
        kills: kills,
        saved: byResult.saved || 0,
        blocked: byResult.blocked || 0,
        out: byResult.out || 0,
        byResult: byResult,
        byKind: byKind,
        tip: byKind.tip || 0,
        spike: byKind.spike || 0,
        killPct: pct(kills, total),
        errors: (byResult.out || 0) + (byResult.blocked || 0)
      };
    }).sort(function (a, b) { return b.kills - a.kills || b.total - a.total; });

    var allResults = countBy(ev, function (e) { return e.result; });
    var allKinds = countBy(ev, function (e) { return e.kind; });

    return {
      total: ev.length,
      kills: allResults.point || 0,
      players: players,
      kindCounts: [
        { id: 'tip', label: 'Tip', value: allKinds.tip || 0 },
        { id: 'spike', label: 'Spike', value: allKinds.spike || 0 }
      ],
      resultCounts: resultRows('attack', ev),
      topKiller: players[0] || null
    };
  }

  /* γενικές σειρές αποτελεσμάτων ανά kind (για τα συνολικά ιστορικά) */
  function resultRows(type, events) {
    var kinds = type === 'attack'
      ? V.CONFIG.ATTACK_KINDS.map(function (k) { return k.id; })
      : [null];
    var rows = [];
    kinds.forEach(function (kind) {
      var defs = type === 'attack'
        ? V.CONFIG.ATTACK_RESULTS[kind]
        : (type === 'reception' ? V.CONFIG.RECEPTION_RESULTS
          : type === 'serve' ? V.CONFIG.SERVE_RESULTS : []);
      (defs || []).forEach(function (d) {
        var value = events.filter(function (e) {
          return e.result === d.id && (type !== 'attack' || e.kind === kind);
        }).length;
        if (value > 0 || type !== 'attack') {
          rows.push({ id: d.id, kind: kind, label: d.label, tone: d.tone, value: value });
        }
      });
    });
    return rows;
  }

  /* ---------------- ΥΠΟΔΟΧΕΣ ---------------- */
  function receptions(m, set) {
    var ev = filter(m, set).filter(function (e) { return e.type === 'reception'; });
    var players = playersWithEvents(m, ev).map(function (p) {
      var byResult = countBy(p.events, function (e) { return e.result; });
      var byTarget = countBy(p.events, function (e) { return e.target; });
      var good = byResult.good || 0;
      var total = p.events.length;
      return {
        id: p.id,
        name: p.name,
        position: p.player ? p.player.position : '',
        total: total,
        good: good,
        ace: byResult.ace || 0,
        error: byResult.error || 0,
        poor: byResult.poor || 0,
        byResult: byResult,
        byTarget: byTarget,
        goodPct: pct(good, total)
      };
    }).sort(function (a, b) { return b.good - a.good || b.total - a.total; });

    var byResult = countBy(ev, function (e) { return e.result; });
    var targets = V.CONFIG.RECEPTION_TARGETS.map(function (t) {
      return {
        id: t.id, label: t.label, hint: t.hint, sub: t.sub,
        value: ev.filter(function (e) { return e.target === t.id; }).length
      };
    });

    return {
      total: ev.length,
      good: byResult.good || 0,
      ace: byResult.ace || 0,
      error: byResult.error || 0,
      poor: byResult.poor || 0,
      goodPct: pct(byResult.good || 0, ev.length),
      players: players,
      targets: targets,
      resultCounts: resultRows('reception', ev)
    };
  }

  /* ---------------- ΠΑΣΕΣ ---------------- */
  function passes(m, set) {
    var ev = filter(m, set).filter(function (e) { return e.type === 'pass'; });
    var players = playersWithEvents(m, ev).map(function (p) {
      var withIssue = p.events.filter(function (e) { return e.issues && e.issues.length; });
      var byTarget = countBy(p.events, function (e) { return e.target; });
      return {
        id: p.id,
        name: p.name,
        position: p.player ? p.player.position : '',
        total: p.events.length,
        clean: p.events.length - withIssue.length,
        withIssue: withIssue.length,
        byTarget: byTarget
      };
    }).sort(function (a, b) { return b.total - a.total; });

    var issueCounts = countBy(
      ev.filter(function (e) { return e.issues && e.issues.length; }),
      function (e) { return e.issues[0]; }
    );
    var issues = V.CONFIG.PASS_ISSUES.map(function (i) {
      return { id: i.id, label: i.label, value: issueCounts[i.id] || 0 };
    }).sort(function (a, b) { return b.value - a.value; });

    /* πιο συχνό ζεύγος (πάσα + πρόβλημα) — για γρήγορη ανάλυση */
    var pairs = V.CONFIG.PASS_TARGETS.map(function (t) {
      var tev = ev.filter(function (e) { return e.target === t.id; });
      var bad = tev.filter(function (e) { return e.issues && e.issues.length; });
      return {
        id: t.id, label: t.label, total: tev.length, clean: tev.length - bad.length,
        cleanPct: pct(tev.length - bad.length, tev.length)
      };
    }).filter(function (r) { return r.total > 0; });

    return {
      total: ev.length,
      players: players,
      targets: V.CONFIG.PASS_TARGETS.map(function (t) {
        return { id: t.id, label: t.label, value: ev.filter(function (e) { return e.target === t.id; }).length };
      }).filter(function (r) { return r.value > 0; }),
      issues: issues,
      pairs: pairs,
      cleanPct: pct(ev.filter(function (e) { return !e.issues || !e.issues.length; }).length, ev.length)
    };
  }

  /* ---------------- ΣΕΡΒΙΣ ---------------- */
  function serves(m, set) {
    var ev = filter(m, set).filter(function (e) { return e.type === 'serve'; });
    var players = playersWithEvents(m, ev).map(function (p) {
      var byResult = countBy(p.events, function (e) { return e.result; });
      var byType = countBy(p.events, function (e) { return e.stype; });
      var total = p.events.length;
      var aces = byResult.ace || 0;
      var points = (byResult.ace || 0) + (byResult.point || 0);
      return {
        id: p.id,
        name: p.name,
        position: p.player ? p.player.position : '',
        total: total,
        aces: aces,
        points: points,
        errors: (byResult.out || 0) + (byResult.easy || 0),
        out: byResult.out || 0,
        easy: byResult.easy || 0,
        jump: byType.jump || 0,
        float: byType.float || 0,
        acePct: pct(aces, total),
        pointPct: pct(points, total),
        errorPct: pct((byResult.out || 0) + (byResult.easy || 0), total)
      };
    }).sort(function (a, b) { return b.aces - a.aces || b.points - a.points; });

    var byType = countBy(ev, function (e) { return e.stype; });

    return {
      total: ev.length,
      aces: players.reduce(function (s, p) { return s + p.aces; }, 0),
      players: players,
      types: V.CONFIG.SERVE_TYPES.map(function (t) {
        return { id: t.id, label: t.label, value: byType[t.id] || 0 };
      }),
      resultCounts: resultRows('serve', ev)
    };
  }

  /* ---------------- ΣΕΤ ΑΝΑ ΣΕΤ ---------------- */
  function bySet(m) {
    var sets = {};
    Object.keys(m.score).forEach(function (k) {
      if (!isNaN(Number(k))) sets[Number(k)] = true;
    });
    m.events.forEach(function (e) { sets[e.set] = true; });
    var nums = Object.keys(sets).map(Number).filter(function (n) { return !isNaN(n); });
    nums.sort(function (a, b) { return a - b; });
    return nums.map(function (n) {
      var ev = m.events.filter(function (e) { return e.set === n; });
      var sc = m.score[n] || { us: 0, them: 0, timeoutsUs: 0, timeoutsThem: 0 };
      var atk = ev.filter(function (e) { return e.type === 'attack'; });
      var rec = ev.filter(function (e) { return e.type === 'reception'; });
      var srv = ev.filter(function (e) { return e.type === 'serve'; });
      var pas = ev.filter(function (e) { return e.type === 'pass'; });
      var kills = atk.filter(function (e) { return e.result === 'point'; }).length;
      var aces = srv.filter(function (e) { return e.result === 'ace'; }).length;
      var goodRec = rec.filter(function (e) { return e.result === 'good'; }).length;
      return {
        set: n,
        us: sc.us || 0,
        them: sc.them || 0,
        timeoutsUs: sc.timeoutsUs || 0,
        timeoutsThem: sc.timeoutsThem || 0,
        attacks: atk.length,
        kills: kills,
        killPct: pct(kills, atk.length),
        receptions: rec.length,
        goodRec: goodRec,
        recPct: pct(goodRec, rec.length),
        passes: pas.length,
        serves: srv.length,
        aces: aces,
        acePct: pct(aces, srv.length),
        lineup: m.lineups[n] || null
      };
    });
  }

  /* ---------------- Σύνοψη αγώνα ---------------- */
  function summary(m, set) {
    return {
      attacks: attacks(m, set),
      receptions: receptions(m, set),
      passes: passes(m, set),
      serves: serves(m, set),
      sets: bySet(m)
    };
  }

  /* ---------------- sets που έπαιξε ο παίκτης ---------------- */
  function playerSetsPlayed(m, pid) {
    var res = {};
    m.events.forEach(function (e) {
      if (e.playerId === pid) res[e.set] = true;
    });
    m.subs.forEach(function (s) {
      if (s.inId === pid) res[s.set] = true;
    });
    Object.keys(m.lineups).forEach(function (s) {
      var lu = m.lineups[s];
      if (Object.keys(lu).some(function (k) { return lu[k] === pid; })) res[s] = true;
    });
    return Object.keys(res).map(Number).sort(function (a, b) { return a - b; });
  }

  V.Stats = {
    pct: pct,
    fmtPct: fmtPct,
    filter: filter,
    attacks: attacks,
    receptions: receptions,
    passes: passes,
    serves: serves,
    bySet: bySet,
    summary: summary,
    playerSetsPlayed: playerSetsPlayed,
    playersWithEvents: playersWithEvents
  };
})(window.V = window.V || {});