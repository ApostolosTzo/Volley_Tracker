/* =============================================================
 * export.js — εξαγωγή / εισαγωγή αγώνων (.volley) & CSV
 * ============================================================= */
(function (V) {
  'use strict';

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  function slug(s) {
    return String(s || 'match').toLowerCase()
      .replace(/[^a-z0-9α-ωάέήίόύώϊϋΐΰ\-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'match';
  }

  function fileName(m, ext) {
    return 'volley-' + slug(m.meta.teamUs) + '-vs-' + slug(m.meta.teamThem) +
      '-' + (m.meta.date || '') + '.' + (ext || 'volley');
  }

  /* ---------------- JSON (μοιράζεται σε άλλον με το ίδιο app) ---------------- */
  function exportMatch(m) {
    var payload = V.Store.exportMatch(m.id);
    download(fileName(m, 'volley'), JSON.stringify(payload, null, 2), 'application/json');
    V.ui.toast('Έγινε εξαγωγή — στείλε το αρχείο σε όποιον θέλεις', { tone: 'good' });
  }

  function exportAll() {
    var payload = V.Store.exportAll();
    if (!payload.matches.length) { V.ui.toast('Δεν υπάρχουν αγώνες', { tone: 'warn' }); return; }
    download('volley-backup-' + V.Store.todayISO() + '.volley', JSON.stringify(payload, null, 2), 'application/json');
    V.ui.toast('Εξήχθη όλο το αρχείο (' + payload.matches.length + ' αγώνες)', { tone: 'good' });
  }

  /* ---------------- CSV ---------------- */
  function csvEscape(v) {
    if (v == null) return '';
    var s = String(v);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCSV(rows) {
    return '\uFEFF' + rows.map(function (r) { return r.map(csvEscape).join(';'); }).join('\r\n');
  }

  function eventsRows(m) {
    var head = ['Αγώνας', 'Ημερομηνία', 'Αγωνιστική ημέρα', 'Δική ομάδα', 'Αντίπαλος',
      'Σετ', 'Ώρα', 'Κατηγορία', 'Παίκτης', 'Θέση', 'Είδος', 'Αποτέλεσμα',
      'Τύπος υποδοχής', 'Σε ποιον', 'Προβλήματα πάσας', 'Ζώνη'];
    var rows = [head];
    m.events.forEach(function (e) {
      var p = V.Store.player(m, e.playerId);
      rows.push([
        slug(m.meta.teamUs) + '-vs-' + slug(m.meta.teamThem),
        m.meta.date, m.meta.day, m.meta.teamUs, m.meta.teamThem,
        e.set, V.ui.fmtTime(e.ts),
        (V.CONFIG.EVENT_TYPES.filter(function (x) { return x.id === e.type; })[0] || {}).label || e.type,
        p ? p.name : '',
        p ? p.position : '',
        V.label.attackKind(e.kind),
        V.label.attackResult(e.kind, e.result) || V.label.receptionResult(e.result) ||
          V.label.serveResult(e.result) || '',
        V.label.receptionTarget(e.target),
        V.label.passTarget(e.target),
        (e.issues || []).map(function (i) { return V.label.passIssue(i); }).join(' + '),
        e.zone || ''
      ]);
    });
    return rows;
  }

  function summaryRows(m) {
    var head = ['Αγώνας', 'Σετ', 'Σκορ εμείς', 'Σκορ αντίπαλος', 'Χτυπήματα', 'Πόντοι',
      '% χτυπημάτων', 'Υποδοχές', 'Καλές υποδοχές', '% υποδοχής', 'Πάσες', 'Σερβίς', 'Aces'];
    var rows = [head];
    V.Stats.bySet(m).forEach(function (r) {
      rows.push([
        slug(m.meta.teamUs) + '-vs-' + slug(m.meta.teamThem),
        r.set, r.us, r.them,
        r.attacks, r.kills, r.killPct == null ? '' : r.killPct + '%',
        r.receptions, r.goodRec, r.recPct == null ? '' : r.recPct + '%',
        r.passes, r.serves, r.aces
      ]);
    });
    return rows;
  }

  function playersRows(m) {
    var head = ['Αγώνας', 'Παίκτης', 'Θέση', 'Σετ που έπαιξε', 'Χτυπήματα', 'Πόντοι',
      '% πόντοι', 'Σερβίς', 'Aces', 'Υποδοχές', '% καλή υποδοχή', 'Πάσες'];
    var rows = [head];
    var all = m.roster.slice();
    /* παίκτες χωρίς ρόστερ (παλιά αρχεία) */
    var seen = {};
    all.forEach(function (p) { seen[p.id] = true; });
    m.events.forEach(function (e) {
      if (e.playerId && !seen[e.playerId]) {
        seen[e.playerId] = true;
        all.push({ id: e.playerId, name: '—', position: '' });
      }
    });

    all.forEach(function (p) {
      var s = V.Stats.summary(m, 'all');
      var atk = s.attacks.players.filter(function (x) { return x.id === p.id; })[0];
      var srv = s.serves.players.filter(function (x) { return x.id === p.id; })[0];
      var rec = s.receptions.players.filter(function (x) { return x.id === p.id; })[0];
      var pas = s.passes.players.filter(function (x) { return x.id === p.id; })[0];
      rows.push([
        slug(m.meta.teamUs) + '-vs-' + slug(m.meta.teamThem),
        p.name, p.position,
        V.Stats.playerSetsPlayed(m, p.id).join('/'),
        atk ? atk.total : 0, atk ? atk.kills : 0, atk ? (atk.killPct == null ? '' : atk.killPct + '%') : '',
        srv ? srv.total : 0, srv ? srv.aces : 0,
        rec ? rec.total : 0, rec ? (rec.goodPct == null ? '' : rec.goodPct + '%') : '',
        pas ? pas.total : 0
      ]);
    });
    return rows;
  }

  function exportCSV(m) {
    var csv = toCSV(summaryRows(m)) + '\r\n\r\n' +
      toCSV(playersRows(m)) + '\r\n\r\n' +
      toCSV(eventsRows(m));
    download(fileName(m, 'csv'), csv, 'text/csv;charset=utf-8');
    V.ui.toast('Έγινε εξαγωγή CSV (Excel)', { tone: 'good' });
  }

  function exportCSVsAll() {
    var matches = V.Store.matches();
    if (!matches.length) { V.ui.toast('Δεν υπάρχουν αγώνες', { tone: 'warn' }); return; }
    var csv = matches.map(function (m) {
      return toCSV(summaryRows(m)) + '\r\n\r\n' + toCSV(playersRows(m)) + '\r\n\r\n' + toCSV(eventsRows(m));
    }).join('\r\n\r\n=====\r\n\r\n');
    download('volley-all-' + V.Store.todayISO() + '.csv', csv, 'text/csv;charset=utf-8');
    V.ui.toast('Έγινε εξαγωγή CSV όλων των αγώνων', { tone: 'good' });
  }

  /* ---------------- import ---------------- */
  function importFile() {
    var inp = el('input', { type: 'file', accept: '.volley,.json,application/json', style: 'display:none' });
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) { document.body.removeChild(inp); return; }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var res = V.Store.import(JSON.parse(reader.result));
          V.ui.toast('Εισήχθησαν ' + res.added + ' αγώνες' + (res.skipped ? ' (' + res.skipped + ' υπάρχουν ήδη)' : ''), { tone: 'good' });
          if (res.added) location.hash = '#/';
        } catch (e) {
          V.ui.toast('Σφάλμα: ' + e.message, { tone: 'bad', duration: 5000 });
        }
        document.body.removeChild(inp);
      };
      reader.onerror = function () {
        V.ui.toast('Αδυναμία ανάγνωσης αρχείου', { tone: 'bad' });
        document.body.removeChild(inp);
      };
      reader.readAsText(f);
    });
    inp.click();
  }

  V.exporter = {
    download: download,
    exportMatch: exportMatch,
    exportAll: exportAll,
    exportCSV: exportCSV,
    exportCSVsAll: exportCSVsAll,
    importFile: importFile,
    slug: slug
  };
})(window.V = window.V || {});