/* =============================================================
 * config.js — ταξινόμηση, θέσεις και ελληνικές ετικέτες
 * ============================================================= */
(function (V) {
  'use strict';

  /* ---------- Θέσεις παίκτη ---------- */
  var POSITIONS = [
    { id: 'S', label: 'S', hint: 'Παίκτης σερβίς' },
    { id: 'OH', label: 'OH', hint: 'Εξωτερικός επιθέτης' },
    { id: 'OPP', label: 'OPP', hint: 'Αντίθετος επιθέτης' },
    { id: 'MB', label: 'MB', hint: 'Μεσικός αποκρίσεως' },
    { id: 'L', label: 'L', hint: 'Λιμπέρω' },
    { id: 'DS', label: 'DS', hint: 'Libero / ειδικός αμυντικός' }
  ];

  /* ---------- 7 θέσεις στο γήπεδο + δεύτερος λιμπέρω ---------- */
  var COURT_SLOTS = [
    { id: 'S', label: 'S' },
    { id: 'OH1', label: 'OH' },
    { id: 'OH2', label: 'OH' },
    { id: 'OPP', label: 'OPP' },
    { id: 'MB1', label: 'MB' },
    { id: 'MB2', label: 'MB' },
    { id: 'L', label: 'L' },
    { id: 'L2', label: 'L', reserve: true }
  ];

  /* ---------- ΧΤΥΠΗΜΑΤΑ ---------- */
  var ATTACK_KINDS = [
    { id: 'tip', label: 'Tip', accent: '#a78bfa' },
    { id: 'spike', label: 'Spike', accent: '#60a5fa' }
  ];

  /* Θετικό = μπήκε ο πόντος, Αρνητικό = χάθηκε ο πόντος
     block_saved = μπλόκαραν κι εμείς σώσαμε τη μπάλα */
  var ATTACK_RESULTS = {
    tip: [
      { id: 'point', label: 'Point', emoji: '\uD83C\uDFAF', tone: 'good' },
      { id: 'saved', label: 'Saved', emoji: '\uD83D\uDEE1', tone: 'neutral' },
      { id: 'block_saved', label: 'Blocked Saved', emoji: '\uD83D\uDCAA', tone: 'good', help: 'Μπλόκαραν και σώσαμε τη μπάλα' },
      { id: 'blocked', label: 'Blocked', emoji: '\uD83D\uDEA8', tone: 'bad' },
      { id: 'out', label: 'Out / Net', emoji: '\u274C', tone: 'bad' }
    ],
    spike: [
      { id: 'point', label: 'Point', emoji: '\uD83C\uDFAF', tone: 'good' },
      { id: 'saved', label: 'Saved', emoji: '\uD83D\uDEE1', tone: 'neutral' },
      { id: 'block_saved', label: 'Blocked Saved', emoji: '\uD83D\uDCAA', tone: 'good', help: 'Μπλόκαραν και σώσαμε τη μπάλα' },
      { id: 'blocked', label: 'Blocked', emoji: '\uD83D\uDEA8', tone: 'bad' },
      { id: 'out', label: 'Out / Net', emoji: '\u274C', tone: 'bad' }
    ]
  };

  /* ---------- ΥΠΟΔΟΧΕΣ ---------- */
  /* χωρίς emoji — μόνο το κείμενο */
  var RECEPTION_RESULTS = [
    { id: 'good', label: 'Point', tone: 'good', help: 'Δικός μας πόντος μετά την υποδοχή' },
    { id: 'ace', label: 'Ace', tone: 'bad', help: 'Χάσαμε πόντο, αντίπαθος πόντος' },
    { id: 'error', label: 'Λάθος', tone: 'bad', help: 'Δικό μας λάθος στην υποδοχή' },
    { id: 'poor', label: 'Ασθενές', tone: 'neutral', help: 'Η ομάδα σώθηκε μετά την υποδοχή' }
  ];

  /* Τύπος υποδοχής = πόσοι μπλόκερ έχουν ανέβει ψηλά,
     άρα σε ποιον επιθέτη μπορεί να πάει η πάσα */
  var RECEPTION_TARGETS = [
    { id: '0', label: '0', sub: null, hint: 'Κανένας μπλόκερ ψηλά' },
    { id: '1', label: '1', sub: 'OH', hint: 'Μόνο OH' },
    { id: '2', label: '2', sub: 'OH-OPP', hint: 'OH ή OPP' },
    { id: '3', label: '3', sub: 'OH-OPP-MB', hint: 'OH, OPP, MB' }
  ];

  /* ---------- ΠΑΣΕΣ (πάσες παίκτη σερβίς) ---------- */
  var PASS_TARGETS = [
    { id: 'MB', label: 'MB' },
    { id: 'OH', label: 'OH' },
    { id: 'OPP', label: 'OPP' },
    { id: 'S', label: 'S', hidden: false }
  ];

  var PASS_ISSUES = [
    { id: 'mb_timing', label: 'Χαλιά χρόνια με MB' },
    { id: 'close_net', label: 'Πολύ κοντά στο δίχτυ' },
    { id: 'far_net', label: 'Πολύ μακριά από το δίχτυ' },
    { id: 'too_inside', label: 'Πολύ μέσα στο πεδίο' },
    { id: 'off_antenna', label: 'Εκτός αντένας' },
    { id: 'too_high', label: 'Πολύ ψηλά' }
  ];

  /* ---------- ΣΕΡΒΙΣ ---------- */
  var SERVE_TYPES = [
    { id: 'jump', label: 'Άλμα', emoji: '\uD83D\uDD80' },
    { id: 'float', label: 'Float', emoji: '\uD83C\uDF00' }
  ];

  var SERVE_RESULTS = [
    { id: 'ace', label: 'Ace', emoji: '\uD83D\uDCA5', tone: 'good', help: 'Ο πόντος μας' },
    { id: 'out', label: 'Out', emoji: '\u274C', tone: 'bad', help: 'Πόντος τους' },
    { id: 'easy', label: 'Σώθηκε', emoji: '\uD83D\uDEE1', tone: 'neutral', help: 'Δεν έγινε πόντος, διάσωσαν το σερβίς' }
  ];

  /* Ζώνη σερβίς (προαιρετικό) */
  var SERVE_ZONES = ['1', '2', '3', '4', '5', '6', '9'];

  /* ---------- ΟΡΙΑ ΣΕΤ ---------- */
  var SET_RULES = { normal: 25, short: 15, deciding: 5 };

  /* =============================================================
   * ΣΤΑΘΕΡΟ ΡΟΣΤΕΡ ΟΜΑΔΑΣ
   * Υπάρχουν πάντα σε κάθε νέο αγώνα και δεν διαγράφονται.
   * `position` = κύρια θέση. `also` = μπορεί να παίξει και σε αυτές.
   * Χρησιμοποιείται για την αυτόματη συμπλήρωση της ενδέκης και
   * ως πρόταση θέσης όταν γράφεις όνομα παίκτη.
   * ============================================================= */
  var DEFAULT_ROSTER = [
    { name: 'Τασος', position: 'L' },
    { name: 'Ραφ', position: 'L' },

    { name: 'Βασιλης', position: 'S' },
    { name: 'Δημητρης', position: 'S' },

    { name: 'Αποστολοσ', position: 'MB' },
    { name: 'Νικος', position: 'MB', also: ['OPP'] },
    { name: 'Αντωνης', position: 'MB' },
    { name: 'Φιλλιπος', position: 'MB' },

    { name: 'Γιουλιανο', position: 'OH' },
    { name: 'Μητσοβαγγελος', position: 'OH' },
    { name: 'Τσοτσονις', position: 'OH', also: ['OPP'] },
    { name: 'Σαββας', position: 'OH' },
    { name: 'Κοσμας', position: 'OH', also: ['OPP'] },
    { name: 'Κωνσταντινος Κουτσουραδης', position: 'OH', also: ['OPP'] },
    { name: 'Αντρεας Κολλιας', position: 'OH', also: ['OPP'] }
  ];

  /* ---------- ΟΜΑΔΑ (προεπιλογή) ---------- */
  var DEFAULT_TEAM = 'ΕΘΝΙΚΟΣ Γ.Σ';

  /* χαλαρή/χωρίς τόνους σύγκριση ονομάτων για τις προτάσεις */
  function normName(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[ΆΈΉΊΌΎΏάέήίόύώϊϋΐΰ]/g, function (c) {
        var map = {
          'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο',
          'ύ': 'υ', 'ώ': 'ω', 'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η',
          'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω'
        };
        return map[c] || c;
      })
      .replace(/[^α-ωa-z0-9]/g, '');
  }

  /* πρόταση θέσης ανά όνομα */
  function suggestPosition(name) {
    var n = normName(name);
    if (!n) return null;
    for (var i = 0; i < DEFAULT_ROSTER.length; i++) {
      if (normName(DEFAULT_ROSTER[i].name) === n) return DEFAULT_ROSTER[i].position;
    }
    /* χαλαρή σύγκριση (μέρος του ονόματος) */
    for (var j = 0; j < DEFAULT_ROSTER.length; j++) {
      var full = normName(DEFAULT_ROSTER[j].name);
      if (full.indexOf(n) === 0 || n.indexOf(full) === 0) return DEFAULT_ROSTER[j].position;
    }
    return null;
  }

  function isDefaultPlayer(name) {
    var n = normName(name);
    return DEFAULT_ROSTER.some(function (p) { return normName(p.name) === n; });
  }

  /* =============================================================
   * ΑΥΤΟΜΑΤΟ ΣΚΟΡ
   * Ποιο γεγονός δίνει πόντο σε ποιον. Ό,τι δεν αναφέρεται εδώ
   * σημαίνει «η ομάδα συνεχίζει» (π.χ. Saved, Σώθηκε) → κανένας πόντος.
   * ============================================================= */
  var AUTO_SCORE = {
    attack: function (e) {
      if (e.result === 'point') return 'us';        // μπήκε ο πόντος
      if (e.result === 'blocked' || e.result === 'out') return 'them';
      return null;
    },
    reception: function (e) {
      if (e.target === '0') return 'them';
      return null;
    },
    serve: function (e) {
      if (e.result === 'ace') return 'us';
      if (e.result === 'out') return 'them';
      return null;
    },
    pass: function () { return null; }
  };

  function scoreSideFor(e) {
    var fn = AUTO_SCORE[e && e.type];
    return fn ? fn(e) : null;
  }

  /* ---------- ΕΙΔΟΣ ΓΕΓΟΝΟΤΩΝ ---------- */
  var EVENT_TYPES = [
    { id: 'attack', label: 'Χτυπήματα', short: 'Χτυπ.' },
    { id: 'reception', label: 'Υποδοχές', short: 'Υποδ.' },
    { id: 'pass', label: 'Πάσες', short: 'Πάσες' },
    { id: 'serve', label: 'Σερβίς', short: 'Σερβ.' }
  ];

  V.CONFIG = {
    POSITIONS: POSITIONS,
    COURT_SLOTS: COURT_SLOTS,
    ATTACK_KINDS: ATTACK_KINDS,
    ATTACK_RESULTS: ATTACK_RESULTS,
    RECEPTION_RESULTS: RECEPTION_RESULTS,
    RECEPTION_TARGETS: RECEPTION_TARGETS,
    PASS_TARGETS: PASS_TARGETS,
    PASS_ISSUES: PASS_ISSUES,
    SERVE_TYPES: SERVE_TYPES,
    SERVE_RESULTS: SERVE_RESULTS,
    SERVE_ZONES: SERVE_ZONES,
    SET_RULES: SET_RULES,
    DEFAULT_ROSTER: DEFAULT_ROSTER,
    DEFAULT_TEAM: DEFAULT_TEAM,
    suggestPosition: suggestPosition,
    isDefaultPlayer: isDefaultPlayer,
    normName: normName,
    scoreSideFor: scoreSideFor,
    EVENT_TYPES: EVENT_TYPES,
    STORAGE_KEY: 'volleytracker.v1'
  };

  /* ---------- Βοηθητικά: ετικέτες ανά id ---------- */
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  V.byId = byId;

  V.label = {
    attackKind: function (id) { var x = byId(ATTACK_KINDS, id); return x ? x.label : id; },
    attackResult: function (kind, id) {
      var list = ATTACK_RESULTS[kind] || [];
      var x = byId(list, id);
      return x ? x.label : id;
    },
    receptionResult: function (id) { var x = byId(RECEPTION_RESULTS, id); return x ? x.label : id; },
    receptionTarget: function (id) { var x = byId(RECEPTION_TARGETS, id); return x ? x.label : id; },
    passTarget: function (id) { var x = byId(PASS_TARGETS, id); return x ? x.label : id; },
    passIssue: function (id) { var x = byId(PASS_ISSUES, id); return x ? x.label : id; },
    serveType: function (id) { var x = byId(SERVE_TYPES, id); return x ? x.label : id; },
    serveResult: function (id) { var x = byId(SERVE_RESULTS, id); return x ? x.label : id; },
    position: function (id) { var x = byId(POSITIONS, id); return x ? x.label : id; }
  };
})(window.V = window.V || {});