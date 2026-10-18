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
    { id: 'difficult', label: 'Difficult', emoji: '\uD83D\uDCCF', tone: 'good', help: 'Δύσκολο σερβίς — δυσκολεύτηκαν να το πιάσουν' },
    { id: 'easy', label: 'Σώθηκε', emoji: '\uD83D\uDEE1', tone: 'neutral', help: 'Δεν έγινε πόντος, διάσωσαν το σερβίς' }
  ];

  /* ---------- ΑΜΥΝΑ (σωσμένη μπάλα μετά από χτύπημα τους) ----------
     Βαθμοί 0-3 όπως στην υποδοχή: πόσο καλά διαβάστηκε η μπάλα. */
  var DEFENSE_RESULTS = [
    { id: '0', label: '0', tone: 'bad', hint: 'Δεν τη διάβασε καθόλου' },
    { id: '1', label: '1', tone: 'neutral', hint: 'Αργή, μετά βίας την έπιασε' },
    { id: '2', label: '2', tone: 'default', hint: 'Σωστή αντίδραση' },
    { id: '3', label: '3', tone: 'good', hint: 'Τέλεια άμυνα' }
  ];

  /* =============================================================
   * ΠΕΡΙΣΤΡΟΦΗ ΟΜΑΔΑΣ
   * Ζώνες (από τη δική μας μεριά):
   *   1 πίσω-δεξιά (ο σερβιέρ) · 2 μπροστά-δεξιά · 3 μπροστά-μέση
   *   4 μπροστά-αριστερά · 5 πίσω-αριστερά · 6 πίσω-μέση
   * Περιστροφή είναι ΔΕΞΙΟΣΤΡΟΦΗ: ο παίκτης της ζώνης n πηγαίνει
   * στη ζώνη n-1 (1→6→5→4→3→2→1). Ο S από τη 2 πάει στη 1,
   * ο σερβιέρ από τη 1 πάει στη 6.
   *
   * ΚΑΝΟΝΑΣ ΒΟΛΙ: ο κεντρικός δεν πηγαίνει ΠΟΤΕ πίσω και ο λιμπέρω
   * ΠΟΤΕ μπροστά. Η σειρά έχει δύο θέσεις MB (ΜΒ1/ΜΒ2) και μία L.
   * Όταν μετά την περιστροφή ένας MB πέσει στο πίσω, αλλάζει θέση
   * με τον λιμπέρω — έτσι ο δεύτερος κεντρικός μπαίνει μπροστά στη
   * θέση που άδειασε και ο λιμπέρω πάει πίσω να σερβίρει.
   * ============================================================= */
  var ZONE_NAMES = {
    1: 'πίσω δεξιά (σερβίς)', 2: 'μπροστά δεξιά', 3: 'μπροστά μέση',
    4: 'μπροστά αριστερά', 5: 'πίσω αριστερά', 6: 'πίσω μέση'
  };

  /* πίσω περιοχή = ζώνες 5, 6, 1 */
  var BACK_COURT = [5, 6, 1];

  function isBackCourt(zone) { return BACK_COURT.indexOf(zone) !== -1; }
  function isMBSlot(slot) { return slot === 'MB1' || slot === 'MB2'; }
  function isLSlot(slot) { return slot === 'L' || slot === 'L2'; }

  /* Βασική σειρά = η διάταξη όταν ο παίκτης σερβίς είναι στη ζώνη 1:

        ζ4 OPP   ζ3 MB   ζ2 OH      μπροστά
        ζ5 OH    ζ6 L    ζ1 S       πίσω (ο S σερβίρει)

     Ο MB είναι μπροστά-μέση και ο λιμπέρω πίσω-μέση, όπως στο
     κανονικό 6-rotation σχήμα. */
  var BASE_ORDER = { 1: 'S', 2: 'OH1', 3: 'MB2', 4: 'OPP', 5: 'OH2', 6: 'L' };

  /* ΚΑΝΟΝΑΣ ΚΕΝΤΡΙΚΟΥ / ΛΙΜΠΕΡΩ
   *
   * Ο κεντρικός ΔΕΝ παίζει πίσω — με μία εξαίρεση: μπορεί να σερβίρει
   * από τη ζώνη 1. Όταν η θέση του πέφτει πίσω στο σερβίς:
   *
   *   · μένει εκεί και σερβίρει ο ίδιος
   *   · στη θέση που πήγε ο λιμπέρω μπαίνει ο ΔΕΥΤΕΡΟΣ κεντρικός
   *   · ο λιμπέρω βγαίνει από το γήπεδο (παίζουμε δύο MB, χωρίς L)
   *
   * Όταν μετά το επόμενο rotation ο MB ξαναβγαίνει μπροστά, τότε
   * αντί για δεύτερο κεντρικό μπαίνει ο λιμπέρω — όπως σε αγώνα.
   */
  function enforceLiberoRule(order) {
    var o = Object.assign({}, order);
    var mbs = [], lz = 0;
    for (var z = 1; z <= 6; z++) {
      if (isMBSlot(o[z])) mbs.push(z);
      else if (isLSlot(o[z])) lz = z;
    }
    var server = serverZone();

    /* (α) Κεντρικός στις ζώνες 5 ή 6 — δεν μπορεί, εκεί δεν σερβίρει.
           Τον καλύπτει ο λιμπέρω. Στη ζώνη 1 ο κεντρικός είναι μέσα:
           σερβίρει ο ίδιος. */
    for (var i = 0; i < mbs.length; i++) {
      var mbz = mbs[i];
      if (mbz === server || !isBackCourt(mbz)) continue;
      if (lz && isBackCourt(lz)) continue;   /* ήδη καλυπται */
      if (!lz) { o[mbz] = 'L'; lz = mbz; }
    }

    /* (β) Λιμπέρω μπροστά: μπαίνει ο ΔΕΥΤΕΡΟΣ κεντρικός στη θέση του
           και ο λιμπέρω βγαίνει από το γήπεδο. Ο κεντρικός που
           πήγε πίσω μένει εκεί — σερβίρει. */
    if (lz && !isBackCourt(lz)) {
      var backMb = mbs.filter(function (z) { return isBackCourt(z); })[0];
      if (backMb != null) {
        o[lz] = (o[backMb] === 'MB1') ? 'MB2' : 'MB1';
      }
    }
    return o;
  }

  function rotateOrder(order, times) {
    var cur = Object.assign({}, order);
    var t = ((times % 6) + 6) % 6;
    for (var i = 0; i < t; i++) {
      var next = {};
      for (var z = 1; z <= 6; z++) next[z] = cur[z === 6 ? 1 : z + 1];
      /* ο κανόνας του λιμπέρω εφαρμόζεται σε ΚΑΘΕ βήμα */
      cur = enforceLiberoRule(next);
    }
    return cur;
  }

  /* Σειρά περιστροφής ώστε ο παίκτης σερβίς να βρίσκεται στη ζώνη n.
     Στη βάση ο S είναι ήδη στη ζώνη 1, άρα χρειάζεται μόνο
     περιστροφή (1-n) βημάτων — μία περιστροφή τον πάει 1→6. */
  function orderForSetterZone(n) {
    n = Math.max(1, Math.min(6, Number(n) || 1));
    return rotateOrder(BASE_ORDER, ((1 - n) % 6 + 6) % 6);
  }

  function zoneOfSlot(order, slot) {
    for (var z = 1; z <= 6; z++) if (order[z] === slot) return z;
    return null;
  }

  /* Παραβιάσεις του γηπέδου. Ο MB στο πίσω δεν είναι από μόνος του
   * παραβίαση (σερβίρει άνωστα)· γίνεται όταν ταυτόχρονα υπάρχει
   * και λιμπέρω στο γήπεδο, οπότε το φτιάχνουμε. */
  function validateOrder(order) {
    var bad = [];
    var srv = serverZone();
    var lOn = 0;
    for (var z = 1; z <= 6; z++) {
      /* ο MB επιτρέπεται μόνο μπροστά ή στη ζώνη 1 να σερβίρει */
      if (isMBSlot(order[z]) && isBackCourt(z) && z !== srv) {
        bad.push('MB στη ζώνη ' + z + ' (μπορεί μόνο στη ' + srv + ' να σερβίρει)');
      }
      if (isLSlot(order[z])) {
        lOn++;
        if (!isBackCourt(z)) bad.push('λιμπέρω στη ζώνη ' + z + ' (μπροστά δεν παίζει)');
      }
    }
    var filled = 0;
    for (z = 1; z <= 6; z++) if (order[z]) filled++;
    if (filled !== 6) bad.push(filled + ' από 6 θέσεις γεμάτες');
    return bad;
  }

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
    { name: 'Τασος', position: 'L', number: 1 },
    { name: 'Ραφ', position: 'L', number: 2 },

    { name: 'Βασιλης', position: 'S', number: 3 },
    { name: 'Δημητρης', position: 'S', number: 4 },

    { name: 'Αποστολοσ', position: 'MB', number: 5 },
    { name: 'Νικος', position: 'MB', number: 6, also: ['OPP'] },
    { name: 'Αντωνης', position: 'MB', number: 7 },
    { name: 'Φιλλιπος', position: 'MB', number: 8 },

    { name: 'Νίκος Κρ.', position: 'OPP', number: 9 },

    { name: 'Γιουλιανο', position: 'OH', number: 10 },
    { name: 'Μητσοβαγγελος', position: 'OH', number: 11 },
    { name: 'Τσοτσονις', position: 'OH', number: 12, also: ['OPP'] },
    { name: 'Σαββας', position: 'OH', number: 13 },
    { name: 'Κοσμας', position: 'OH', number: 14, also: ['OPP'] },
    { name: 'Κωνσταντινος Κουτσουραδης', position: 'OH', number: 15, also: ['OPP'] },
    { name: 'Αντρεας Κολλιας', position: 'OH', number: 16, also: ['OPP'] }
  ];

  /* ---------- ΟΜΑΔΑ (προεπιλογή) ---------- */
  var DEFAULT_TEAM = 'ΕΘΝΙΚΟΣ Γ.Σ';

  /* Παίκτες που διορθώθηκε το όνομά τους μετά την πρώτη προσθήκη.
     Εφαρμόζεται σε κάθε αγώνα, αλλιώς θα έμπαινε ο νέος στις λίστες
     δίπλα στον παλιό και θα είχες δύο ίδιους παίκτες. */
  var ROSTER_RENAMES = {
    'Νικο Κρ.': 'Νίκος Κρ.'
  };

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
      if (e.result === 'block_saved') return 'us';  // μπλόκαραν κι εμείς σώσαμε τη μπάλα
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
    pass: function () { return null; },
    /* άμυνα 0 = δεν διάσωσε τη μπάλα, έπεσε → πόντος στους αντιπάλους.
       Οι 1/2/3 σημαίνουν ότι τη σώσαμε, άρα το rally συνεχίζεται. */
    defense: function (e) {
      if (e.target === '0') return 'them';
      return null;
    },
    note: function () { return null; }
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
    { id: 'serve', label: 'Σερβίς', short: 'Σερβ.' },
    { id: 'defense', label: 'Άμυνα', short: 'Άμυνα' },
    { id: 'note', label: 'Σημειώσεις', short: 'Σημ.' }
  ];

  /* Ο σερβιέρ είναι ΠΑΝΤΑ ο παίκτης της ζώνης 1 — δεν επιλέγεται */
  function serverZone() { return 1; }


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
    DEFENSE_RESULTS: DEFENSE_RESULTS,
    SERVE_ZONES: SERVE_ZONES,
    SET_RULES: SET_RULES,
    ZONE_NAMES: ZONE_NAMES,
    BACK_COURT: BACK_COURT,
    isBackCourt: isBackCourt,
    isMBSlot: isMBSlot,
    isLSlot: isLSlot,
    BASE_ORDER: BASE_ORDER,
    enforceLiberoRule: enforceLiberoRule,
    rotateOrder: rotateOrder,
    orderForSetterZone: orderForSetterZone,
    zoneOfSlot: zoneOfSlot,
    validateOrder: validateOrder,
    serverZone: serverZone,
    DEFAULT_ROSTER: DEFAULT_ROSTER,
    ROSTER_RENAMES: ROSTER_RENAMES,
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
    defenseResult: function (id) { var x = byId(DEFENSE_RESULTS, id); return x ? x.label : id; },
    position: function (id) { var x = byId(POSITIONS, id); return x ? x.label : id; }
  };
})(window.V = window.V || {});