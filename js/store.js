/* =============================================================
 * store.js — μοντέλο δεδομένων + αποθήκευση στο localStorage
 * ============================================================= */
(function (V) {
  'use strict';

  var KEY = V.CONFIG.STORAGE_KEY;

  function uid(prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 7);
  }

  function todayISO() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function nowISO() {
    return new Date().toISOString();
  }

  /* ---------------- default lineup ---------------- */
  function emptyLineup() {
    var lu = { activeMB: 'MB1', activeL: 'L' };
    V.CONFIG.COURT_SLOTS.forEach(function (s) { lu[s.id] = null; });
    return lu;
  }

  function emptyScore() {
    return { us: 0, them: 0, timeoutsUs: 0, timeoutsThem: 0 };
  }

  /* ---------------- κατάσταση αγώνα ανά σετ ----------------
     server: 'us' | 'them'  — ποιος σερβίρει τώρα
     order:   { 1..6: slotId } — ποιος παίκτης είναι σε ποια ζώνη
     zones:   πόσες περιστροφές έχει κάνει η ομάδα (για πληροφορία)
  */
  function emptyGame() {
    return {
      server: 'us',
      order: Object.assign({}, V.CONFIG.BASE_ORDER),
      rotations: 0,
      servingPlayerId: null
    };
  }

  /* ---------------- match factory ---------------- */
  function newMatch(opts) {
    opts = opts || {};
    return {
      schema: 1,
      id: uid('m'),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      meta: {
        teamUs: opts.teamUs || '',
        teamThem: opts.teamThem || '',
        day: opts.day || '',              // αγωνιστική ημέρα
        date: opts.date || todayISO(),   // ημερομηνία
        competition: opts.competition || '',
        venue: opts.venue || '',
        notes: opts.notes || ''
      },
      roster: [],    // { id, name, number, position }
      lineups: {},   // { "1": lineup, "2": lineup }
      subs: [],      // { id, set, outId, inId, position, rally, ts }
      score: {},     // { "1": {us,them,timeoutsUs,timeoutsThem} }
      game: {},      // { "1": {server, order, rotations} }
      events: [],    // βλ. makeEvent()
      autoScore: opts.autoScore !== false,   // +1 αυτόματα στο σκορ
      result: { winner: null, setsUs: 0, setsThem: 0 }
    };
  }

  /* ---------------- events ----------------
   * type: attack | reception | pass | serve | defense | note
   * attack:    kind, result
   * reception: result, target(0|1|2|3)
   * pass:      target, issues[]
   * serve:     stype, result, zone
   * defense:   target(0|1|2|3)
   * note:      text
   */
  function makeEvent(e) {
    return {
      id: uid('e'),
      ts: nowISO(),
      set: e.set || 1,
      rally: e.rally != null ? e.rally : null,
      type: e.type,
      playerId: e.playerId || null,
      kind: e.kind || null,
      result: e.result || null,
      target: e.target || null,
      coverage: e.coverage || null,
      issues: e.issues || [],
      stype: e.stype || null,
      zone: e.zone || null,
      text: e.text || null
    };
  }

  /* ---------------- persistence ---------------- */
  var state = {
    matches: [],
    currentId: null
  };

  var listeners = [];

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) { state.matches = []; state.currentId = null; return; }
    try {
      var data = JSON.parse(raw);
      state.matches = (data && data.matches) || [];
      state.currentId = (data && data.currentId) || null;
    } catch (e) {
      console.error('Αποτυχία ανάγνωσης δεδομένων', e);
      state.matches = [];
      state.currentId = null;
      return;
    }

    /* Παίκτες που προστέθηκαν στο σταθερό ρόστερ ΜΕΤΑ τη δημιουργία
       των αγώνων μπαίνουν και στους παλιούς — αλλιώς ένας νέος
       παίκτης θα έφανεζε μόνο στα νέα αρχεία. Το ίδιο και για
       διορθωμένα ονόματα. */
    var touched = false;
    state.matches.forEach(function (m) {
      var before = (m.roster || []).map(function (p) { return p.name; }).join('|');
      ensureDefaultRoster(m);
      var after = (m.roster || []).map(function (p) { return p.name; }).join('|');
      if (before !== after) touched = true;
    });
    if (touched) save();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        matches: state.matches,
        currentId: state.currentId
      }));
    } catch (e) {
      console.error('Αποτυχία αποθήκευσης', e);
      V.bus && V.bus.emit && V.bus.emit('storage-error', e);
    }
  }

  function touch(match) {
    if (match) match.updatedAt = nowISO();
  }

  function emit() {
    save();
    listeners.forEach(function (fn) { fn(); });
  }

  /* ---------------- public API ---------------- */
  var Store = {
    onChange: function (fn) { listeners.push(fn); },

    init: function () { load(); },

    /* --- state --- */
    matches: function () {
      return state.matches.slice().sort(function (a, b) {
        return (b.meta.date || '').localeCompare(a.meta.date || '');
      });
    },
    all: function () { return state.matches; },

    current: function () {
      if (!state.currentId) return null;
      return Store.byId(state.currentId);
    },
    byId: function (id) {
      for (var i = 0; i < state.matches.length; i++) {
        if (state.matches[i].id === id) return state.matches[i];
      }
      return null;
    },

    setCurrent: function (id) {
      state.currentId = id;
      emit();
    },

    /* --- matches --- */
    create: function (opts) {
      var m = newMatch(opts);
      state.matches.push(m);
      state.currentId = m.id;
      emit();
      return m;
    },

    remove: function (id) {
      state.matches = state.matches.filter(function (m) { return m.id !== id; });
      if (state.currentId === id) state.currentId = null;
      emit();
    },

    updateMeta: function (id, meta) {
      var m = Store.byId(id);
      if (!m) return null;
      Object.assign(m.meta, meta);
      touch(m);
      emit();
      return m;
    },

    /* αυτόματο σκορ on/off για τον αγώνα */
    setAutoScore: function (id, on) {
      var m = Store.byId(id); if (!m) return;
      m.autoScore = !!on;
      touch(m); emit();
    },

    /* --- roster --- */
    addPlayer: function (id, data) {
      var m = Store.byId(id); if (!m) return null;
      var p = {
        id: uid('p'),
        name: (data.name || '').trim(),
        number: data.number != null && data.number !== '' ? Number(data.number) : null,
        position: data.position || 'OH',
        also: data.also || null
      };
      if (!p.name) return null;
      m.roster.push(p);
      touch(m); emit();
      return p;
    },

    updatePlayer: function (id, pid, data) {
      var m = Store.byId(id); if (!m) return null;
      var p = Store.player(m, pid); if (!p) return null;
      if (data.name != null) p.name = String(data.name).trim() || p.name;
      if (data.number !== undefined) p.number = data.number === '' || data.number == null ? null : Number(data.number);
      if (data.position) p.position = data.position;
      touch(m); emit();
      return p;
    },

    removePlayer: function (id, pid) {
      var m = Store.byId(id); if (!m) return;
      m.roster = m.roster.filter(function (x) { return x.id !== pid; });
      Object.keys(m.lineups).forEach(function (s) {
        Object.keys(m.lineups[s]).forEach(function (k) {
          if (m.lineups[s][k] === pid) m.lineups[s][k] = null;
        });
      });
      touch(m); emit();
    },

    player: function (m, pid) {
      if (!m) return null;
      for (var i = 0; i < m.roster.length; i++) if (m.roster[i].id === pid) return m.roster[i];
      return null;
    },
    playerName: function (m, pid) {
      var p = Store.player(m, pid);
      return p ? p.name : '—';
    },

    /* --- lineups --- */
    lineup: function (m, set) {
      if (!m) return emptyLineup();
      if (!m.lineups[set]) m.lineups[set] = emptyLineup();
      return m.lineups[set];
    },
    setLineup: function (id, set, lineup) {
      var m = Store.byId(id); if (!m) return;
      m.lineups[set] = Object.assign(emptyLineup(), lineup);
      touch(m); emit();
    },
    hasLineup: function (m, set) {
      var lu = m && m.lineups[set];
      if (!lu) return false;
      return V.CONFIG.COURT_SLOTS.some(function (s) {
        return !s.reserve && lu[s.id];
      });
    },

    /* swap MB / L within the current set */
    swap: function (id, set, slot) {
      var m = Store.byId(id); if (!m) return;
      var lu = Store.lineup(m, set);
      if (slot === 'MB') lu.activeMB = lu.activeMB === 'MB1' ? 'MB2' : 'MB1';
      else if (slot === 'L') lu.activeL = lu.activeL === 'L' ? 'L2' : 'L';
      touch(m); emit();
    },

    /* the players currently on court, with resolved slot labels */
    onCourt: function (m, set) {
      var lu = Store.lineup(m, set);
      return V.CONFIG.COURT_SLOTS
        .filter(function (s) { return !s.reserve && lu[s.id]; })
        .map(function (s) {
          return { slot: s.id, label: s.label, playerId: lu[s.id], name: Store.playerName(m, lu[s.id]) };
        });
    },

    /* the players selectable in the entry screen (with MB/L swap applied) */
    entryPlayers: function (m, set) {
      var lu = Store.lineup(m, set);
      var out = [];
      V.CONFIG.COURT_SLOTS.forEach(function (s) {
        var pid = lu[s.id];
        if (!pid) return;
        if (s.id === 'MB1' && lu.activeMB === 'MB2') return;  // inactive MB
        if (s.id === 'MB2' && lu.activeMB === 'MB1') return;  // inactive MB
        if (s.id === 'L' && lu.activeL === 'L2') return;       // inactive libero
        if (s.id === 'L2' && lu.activeL === 'L') return;       // reserve libero
        out.push({ slot: s.id, label: s.label, playerId: pid, name: Store.playerName(m, pid), swapGroup: (s.id.indexOf('MB') === 0 ? 'MB' : (s.id.indexOf('L') === 0 ? 'L' : null)) });
      });
      return out;
    },

    /* --- substitutions --- */
    addSub: function (id, sub) {
      var m = Store.byId(id); if (!m) return null;
      var s = {
        id: uid('s'),
        set: sub.set || 1,
        outId: sub.outId || null,
        inId: sub.inId || null,
        position: sub.position || null,
        rally: sub.rally != null ? sub.rally : null,
        ts: nowISO()
      };
      m.subs.push(s);
      touch(m); emit();
      return s;
    },
    removeSub: function (id, sid) {
      var m = Store.byId(id); if (!m) return;
      m.subs = m.subs.filter(function (s) { return s.id !== sid; });
      touch(m); emit();
    },

    /* --- score / sets --- */
    currentSet: function (m) {
      var keys = Object.keys(m.score).filter(function (k) { return !isNaN(Number(k)); });
      if (!keys.length) return 1;
      return Math.max.apply(null, keys.map(Number));
    },
    score: function (m, set) {
      if (!m.score[set]) m.score[set] = emptyScore();
      return m.score[set];
    },
    addPoint: function (id, set, side, delta) {
      var m = Store.byId(id); if (!m) return;
      var sc = Store.score(m, set);
      sc[side] = Math.max(0, (sc[side] || 0) + (delta || 1));
      touch(m); emit();
    },

    /* --- παιχνίδι: σερβίς & περιστροφή --- */
    game: function (m, set) {
      if (!m.game[set]) m.game[set] = emptyGame();
      /* ασφάλεια: αν λείπει κάτι, γεμίζουμε με τις προεπιλογές */
      var g = m.game[set];
      if (!g.order) g.order = Object.assign({}, V.CONFIG.BASE_ORDER);
      if (g.server !== 'us' && g.server !== 'them') g.server = 'us';
      if (typeof g.rotations !== 'number') g.rotations = 0;

      /* αυτο-επιδιόρθωση: αρχαίες σειρές μπορεί να έχουν MB πίσω
         ή λιμπέρω μπροστά (πριν τον κανόνα). Η αλλαγή είναι
         μη-αναστρεπτέλλουσα, γι' αυτό το κάνουμε εδώ. */
      var fixed = V.CONFIG.enforceLiberoRule(g.order, g.server);
      if (JSON.stringify(fixed) !== JSON.stringify(g.order)) {
        g.order = fixed;
        m.updatedAt = nowISO();
      }
      return g;
    },
    setGame: function (id, set, patch) {
      var m = Store.byId(id); if (!m) return;
      var g = Object.assign(emptyGame(), Store.game(m, set), patch || {});
      if (patch && patch.order) {
        /* κρατάμε μόνο έγκυρες ζώνες 1..6 */
        var ord = {};
        for (var z = 1; z <= 6; z++) ord[z] = patch.order[z] || g.order[z] || V.CONFIG.BASE_ORDER[z];
        g.order = ord;
      }
      /* ο MB δεν πάει ποτέ πίσω (εκτός ζώνης 1 να σερβίρει),
         ο λιμπέρω ποτέ μπροστά */
      g.order = V.CONFIG.enforceLiberoRule(g.order, g.server);
      m.game[set] = g;
      touch(m); emit();
      return g;
    },

    /* Ο πόντος πάει στην ομάδα που τον κέρδισε — και εκείνη σερβίρει.
       Αν κερδίσαμε το σερβίς (side-out), περιστρέφουμε δεξιόστροφα.
       Το ίδιο μονοπάτι περνάει από τα κουμπιά +/− του ταμπλό, άρα
       και χειροκίνητη διόρθωση σκορο προκαλεί σωστή περιστροφή. */
    awardPoint: function (id, set, side, delta) {
      var m = Store.byId(id); if (!m) return null;
      delta = delta == null ? 1 : delta;
      var sc = Store.score(m, set);
      sc[side] = Math.max(0, (sc[side] || 0) + delta);

      var g = Store.game(m, set);
      var rotated = false;
      if (delta > 0 && side !== g.server) {
        if (side === 'us') {
          /* κέρδισα το σερβίς → περιστροφή */
          g.order = V.CONFIG.rotateOrder(g.order, 1, side);
          g.rotations = (g.rotations || 0) + 1;
          rotated = true;
        }
        /* αν χάσαμε το σερβίς, περιστρέφονται αυτοί — εμείς δεν το κρατάμε */
        g.server = side;
      }
      touch(m); emit();
      return { game: g, rotated: rotated };
    },

    /* Ποιος είναι παίκτης σε κάθε ζώνη.
       Η ζώνη κρατά τη συγκεκριμένη θέση (MB1, MB2, L…) άρα η
       σειρά από μόνη της λέει ποιος παίκτης είναι εκεί. Το
       activeMB/activeL υπάρχει για τις παλιές καρτέλες. */
    courtPlayers: function (m, set) {
      var lu = Store.lineup(m, set);
      var g = Store.game(m, set);
      var out = [];
      for (var z = 1; z <= 6; z++) {
        var slot = g.order[z];
        var pid = lu[slot] || null;
        /* αν η ζώνη ζητά κεντρικό/λιμπέρω που δεν έχει οριστεί,
           δοκίμασε τον άλλον — μην άφησε κενή θέση */
        if (!pid && V.CONFIG.isMBSlot(slot)) {
          pid = lu[slot === 'MB1' ? 'MB2' : 'MB1'] || lu[lu.activeMB] || null;
        }
        if (!pid && V.CONFIG.isLSlot(slot)) {
          pid = lu[lu.activeL] || lu[slot === 'L' ? 'L2' : 'L'] || null;
        }
        var def = null;
        V.CONFIG.COURT_SLOTS.forEach(function (s) { if (s.id === slot) def = s; });
        out.push({
          zone: z,
          slot: slot,
          label: def ? def.label : slot,
          back: V.CONFIG.isBackCourt(z),
          playerId: pid,
          name: pid ? Store.playerName(m, pid) : '—',
          position: pid ? (Store.player(m, pid) || {}).position || '' : ''
        });
      }
      return out;
    },

    /* Γρήγορη εναλλαγή από το γήπεδο: αλλάζει ΠΟΙΟΣ κεντρικός ή
       λιμπέρω παίζει, και κρατάει τον activeMB/activeL συνεπή
       ώστε να μη μπερδεύονται τα στατιστικά στις παλιές καρτέλες. */
    swapSlot: function (id, set, group) {
      var m = Store.byId(id); if (!m) return;
      var lu = Store.lineup(m, set);
      var g = Store.game(m, set);
      var isMB = (group === 'MB');
      var test = isMB ? V.CONFIG.isMBSlot : V.CONFIG.isLSlot;
      var pair = isMB ? ['MB1', 'MB2'] : ['L', 'L2'];

      /* ποιες θέσει του ζητούμενου τύπου είναι στη σειρά περιστροφής */
      var cur = [];
      for (var z = 1; z <= 6; z++) if (test(g.order[z])) cur.push(g.order[z]);

      /* δύο MB παίζουν ή κανένας λιμπέρω — δεν υπάρχει τι να αλλάξει */
      if (!cur.length || cur.length > 1) {
        return {
          slot: null, name: null, onCourt: false,
          reason: !cur.length
            ? (isMB ? 'Δεν υπάρχει κεντρικός στο γήπεδο' : 'Ο λιμπέρω είναι εκτός γηπέδου')
            : 'Και οι δύο κεντρικοί είναι στο γήπεδο'
        };
      }

      var next = (cur[0] === pair[0]) ? pair[1] : pair[0];
      if (isMB) lu.activeMB = next; else lu.activeL = next;
      for (z = 1; z <= 6; z++) if (test(g.order[z])) g.order[z] = next;

      g.order = V.CONFIG.enforceLiberoRule(g.order, g.server);
      touch(m); emit();
      return { slot: next, name: Store.playerName(m, lu[next]), onCourt: true };
    },
    addTimeout: function (id, set, side, delta) {
      var m = Store.byId(id); if (!m) return;
      var sc = Store.score(m, set);
      var key = side === 'us' ? 'timeoutsUs' : 'timeoutsThem';
      sc[key] = Math.max(0, (sc[key] || 0) + (delta || 1));
      touch(m); emit();
    },
    setScore: function (id, set, us, them) {
      var m = Store.byId(id); if (!m) return;
      var sc = Store.score(m, set);
      sc.us = Math.max(0, Number(us) || 0);
      sc.them = Math.max(0, Number(them) || 0);
      touch(m); emit();
    },
    deleteSet: function (id, set) {
      var m = Store.byId(id); if (!m) return;
      delete m.score[set];
      delete m.lineups[set];
      delete m.game[set];
      m.events = m.events.filter(function (e) { return e.set !== Number(set); });
      m.subs = m.subs.filter(function (s) { return s.set !== Number(set); });
      touch(m); emit();
    },

    /* --- events --- */
    addEvent: function (id, e) {
      var m = Store.byId(id); if (!m) return null;
      /* κρατάμε στιγμιότυπο ΠΡΙΝ το γεγονός, ώστε το Undo να
         επαναφέρει σκόρ, σερβιέρ και περιστροφή μαζί */
      var beforeSnap = Store.snapshotSet(m, e && e.set);
      var ev = makeEvent(e);
      if (beforeSnap) ev.before = beforeSnap;
      m.events.push(ev);
      touch(m); emit();
      return ev;
    },
    updateEvent: function (id, eid, patch) {
      var m = Store.byId(id); if (!m) return null;
      for (var i = 0; i < m.events.length; i++) {
        if (m.events[i].id === eid) {
          Object.assign(m.events[i], patch);
          touch(m); emit();
          return m.events[i];
        }
      }
      return null;
    },
    removeEvent: function (id, eid) {
      var m = Store.byId(id); if (!m) return null;
      var removed = null;
      m.events = m.events.filter(function (e) {
        if (e.id === eid) { removed = e; return false; }
        return true;
      });
      touch(m); emit();
      return removed;
    },
    /* ---------- Αναστροφή κατάστασης σετ (για το Undo) ----------
       Το awardPoint αλλάζει σκορ + σερβιέρ + περιστροφή μαζί, άρα το
       απλό «αφαίρεσε τον πόντο» δεν αρκεί: θα άφηνε την ομάδα
       περιστρεμμένη σε λάθος θέση. Κρατάμε ολόκληρη την κατάσταση. */
    snapshotSet: function (m, set) {
      if (!m) return null;
      var sc = Store.score(m, set);
      var g = Store.game(m, set);
      return {
        us: sc.us || 0,
        them: sc.them || 0,
        server: g.server,
        order: Object.assign({}, g.order),
        rotations: g.rotations || 0,
        servingPlayerId: g.servingPlayerId != null ? g.servingPlayerId : null
      };
    },
    restoreSet: function (m, set, snap) {
      if (!m || !snap) return;
      var sc = Store.score(m, set);
      sc.us = snap.us;
      sc.them = snap.them;
      var g = Store.game(m, set);
      g.server = snap.server;
      g.order = Object.assign({}, snap.order);
      g.rotations = snap.rotations || 0;
      g.servingPlayerId = snap.servingPlayerId;
      touch(m); emit();
    },

    undoLast: function (id) {
      var m = Store.byId(id); if (!m || !m.events.length) return null;
      var ev = m.events[m.events.length - 1];
      m.events.pop();
      touch(m); emit();
      return ev;
    },
    lastEvent: function (m) {
      if (!m || !m.events.length) return null;
      return m.events[m.events.length - 1];
    },
    eventsOfSet: function (m, set) {
      return m.events.filter(function (e) { return e.set === Number(set); });
    },

    /* --- rally counter (auto) --- */
    nextRally: function (m) {
      return m.events.length + 1;
    },

    /* --- import / export --- */
    exportMatch: function (id) {
      var m = Store.byId(id);
      if (!m) return null;
      return JSON.parse(JSON.stringify({ kind: 'volleytrack.match', version: 1, match: m }));
    },
    exportAll: function () {
      return JSON.parse(JSON.stringify({ kind: 'volleytrack.backup', version: 1, exportedAt: nowISO(), matches: state.matches }));
    },
    import: function (data, opts) {
      opts = opts || {};
      var incoming = [];
      if (!data) throw new Error('Άδεια αρχείο');
      if (data.kind === 'volleytrack.match' && data.match) incoming = [data.match];
      else if (data.kind === 'volleytrack.backup' && data.matches) incoming = data.matches;
      else if (Array.isArray(data)) incoming = data;
      else if (data.meta && data.events) incoming = [data];
      else throw new Error('Μη αναγνωρίσιμο αρχείο');

      var added = 0, skipped = 0;
      incoming.forEach(function (raw) {
        if (!raw || !raw.meta) { skipped++; return; }
        var m = normalize(raw);
        var existing = Store.byId(m.id);
        if (existing && !opts.overwrite) { skipped++; return; }
        if (existing) {
          state.matches = state.matches.filter(function (x) { return x.id !== m.id; });
        }
        state.matches.push(m);
        added++;
      });
      if (added && !state.currentId) state.currentId = state.matches[state.matches.length - 1].id;
      emit();
      return { added: added, skipped: skipped };
    },

    /* wipe everything */
    clearAll: function () {
      state.matches = [];
      state.currentId = null;
      emit();
    },

    /* helpers */
    uid: uid,
    todayISO: todayISO,
    nowISO: nowISO,
    emptyLineup: emptyLineup,
    emptyGame: emptyGame,
    normalize: normalize,
    ensureDefaultRoster: ensureDefaultRoster,
    _emit: emit
  };

  /* ---------------- normalize (safe against old/partial files) ---------------- */
  function normalize(raw) {
    var m = {
      schema: 1,
      id: raw.id || uid('m'),
      createdAt: raw.createdAt || nowISO(),
      updatedAt: raw.updatedAt || nowISO(),
      meta: Object.assign({
        teamUs: '', teamThem: '', day: '', date: todayISO(),
        competition: '', venue: '', notes: ''
      }, raw.meta || {}),
      roster: (raw.roster || []).map(function (p) {
        return {
          id: p.id || uid('p'), name: p.name || '',
          number: p.number != null ? p.number : null,
          position: p.position || 'OH',
          also: p.also || null
        };
      }),
      lineups: {},
      subs: raw.subs || [],
      score: raw.score || {},
      game: {},
      events: (raw.events || []).map(function (e) { return makeEvent(e); }),
      autoScore: raw.autoScore !== false,
      result: raw.result || { winner: null, setsUs: 0, setsThem: 0 }
    };
    Object.keys(raw.lineups || {}).forEach(function (s) {
      m.lineups[s] = Object.assign(emptyLineup(), raw.lineups[s]);
    });
    /* κατάσταση σερβίς/περιστροφής — τα παλιά αρχεία δεν έχουν, οπότε
       ξεκινούν από τη βασική σειρά και τον πρώτο σερβιέρ */
    Object.keys(raw.game || {}).forEach(function (s) {
      var g = raw.game[s] || {};
      m.game[s] = {
        server: (g.server === 'them') ? 'them' : 'us',
        order: Object.assign({}, V.CONFIG.BASE_ORDER, g.order || {}),
        rotations: typeof g.rotations === 'number' ? g.rotations : 0
      };
    });
    ensureDefaultRoster(m);
    return m;
  }

  /* Οι βασικοί παίκτες της ομάδας προστίθενται αυτόματα σε κάθε αγώνα.
     Προστίθενται και σε παλιούς αγώνες που δεν τους είχαν.
     Είναι απλώς προτεινόμενοι — ο χρήστης μπορεί να τους διαγράψει. */
  function ensureDefaultRoster(m) {
    if (!V.CONFIG.DEFAULT_ROSTER) return m;

    /* 1) διόρθωση ονομάτων παίκτες που μετονομάστηκαν */
    var renames = V.CONFIG.ROSTER_RENAMES || {};
    var renameKeys = Object.keys(renames);
    if (renameKeys.length) {
      m.roster.forEach(function (p) {
        var n = V.CONFIG.normName(p.name);
        renameKeys.forEach(function (oldName) {
          if (n === V.CONFIG.normName(oldName)) p.name = renames[oldName];
        });
      });
    }

    /* 2) αριθμοί μπλικά — μόνο όπου δεν υπάρχει ήδη, και μόνο αν
       είναι ελεύθερος. Έτσι το 1-16 μπαίνει σε παλιούς αγώνες
       χωρίς να χαλάσει αριθμό που έβαλες εσύ. */
    var byName = {};
    V.CONFIG.DEFAULT_ROSTER.forEach(function (d) { byName[V.CONFIG.normName(d.name)] = d; });
    m.roster.forEach(function (p) {
      if (p.number !== null && p.number !== undefined && p.number !== '') return;
      var d = byName[V.CONFIG.normName(p.name)];
      if (!d || d.number == null) return;
      var taken = m.roster.some(function (o) {
        return o.id !== p.id && Number(o.number) === Number(d.number);
      });
      if (!taken) p.number = d.number;
    });

    /* 3) προσθήκη όσων λείπουν */
    var present = {};
    m.roster.forEach(function (p) { present[V.CONFIG.normName(p.name)] = true; });
    V.CONFIG.DEFAULT_ROSTER.forEach(function (d) {
      var n = V.CONFIG.normName(d.name);
      if (present[n]) return;
      var taken = m.roster.some(function (o) { return Number(o.number) === Number(d.number); });
      m.roster.push({
        id: uid('p'), name: d.name,
        number: (!taken && d.number != null) ? d.number : null,
        position: d.position, also: d.also || null
      });
      present[n] = true;
    });
    return m;
  }

  V.Store = Store;
})(window.V = window.V || {});