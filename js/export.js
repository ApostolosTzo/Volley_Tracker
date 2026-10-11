/* =============================================================
 * export.js — εξαγωγή / εισαγωγή αγώνων (.volley) & CSV
 * ============================================================= */
(function (V) {
  'use strict';

  var el = V.ui.el;

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

  /* Τόνοι ελληνικών → βατικά γράμματα, ώστε το όνομα αρχείου να είναι
     καθαρό και να ταξιδεύει σωστά μέσω e-mail / Drive / Viber. */
  var TONES = {
    'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
    'ϊ': 'ι', 'ϋ': 'υ', 'ΐ': 'ι', 'ΰ': 'υ',
    'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω'
  };

  function slug(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[άέήίόύώϊϋΐΰΆΈΉΊΌΎΏΐΰ]/g, function (c) { return TONES[c] || c; })
      .replace(/[^a-z0-9\-α-ω]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'match';
  }

  function fileName(m, ext) {
    return 'volley-' + slug(m.meta.teamUs) + '-vs-' + slug(m.meta.teamThem) +
      '-' + (m.meta.date || '') + '.' + (ext || 'json');
  }

  /* ---------------- JSON (μοιράζεται σε άλλον με το ίδιο app) ---------------- */
  function exportMatch(m) {
    var payload = V.Store.exportMatch(m.id);
    download(fileName(m, 'json'), JSON.stringify(payload, null, 2), 'application/json');
    V.ui.toast('Έγινε εξαγωγή .json — στείλε το στο κινητό σου', { tone: 'good', duration: 4500 });
  }

  function exportAll() {
    var payload = V.Store.exportAll();
    if (!payload.matches.length) { V.ui.toast('Δεν υπάρχουν αγώνες', { tone: 'warn' }); return; }
    download('volley-backup-' + V.Store.todayISO() + '.json', JSON.stringify(payload, null, 2), 'application/json');
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
      '% χτυπημάτων', 'Υποδοχές', 'Υποδοχές χωρίς μπλόκ', 'Πάσες', 'Σερβίς', 'Aces'];
    var rows = [head];
    V.Stats.bySet(m).forEach(function (r) {
      rows.push([
        slug(m.meta.teamUs) + '-vs-' + slug(m.meta.teamThem),
        r.set, r.us, r.them,
        r.attacks, r.kills, r.killPct == null ? '' : r.killPct + '%',
        r.receptions, r.recNoBlock,
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
        rec ? rec.total : 0,
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

  /* ---------------- import ----------------
   * Στο κινητό τα «κρυφά» file inputs με αυστηρό `accept` δεν
   * εμφανίζουν το αρχείο (το .volley δεν είναι γνωστός τύπος στο
   * Android). Γι' αυτό: input ορατό μέσα σε modal + χωρίς φίλτρο
   * + εναλλακτική επικόλλησης του περιεχομένου.
   */
  function importDialog() {
    var body = el('div', { class: 'form' });
    var status = el('p', { class: 'hint' });

    /* --- επιλογή αρχείου --- */
    var fileInput = el('input', { type: 'file', class: 'input file-input' });
    var fileInfo = el('p', { class: 'field__hint', text: 'Δεν υπάρχει επιλεγμένο αρχείο' });

    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      fileInfo.textContent = f
        ? f.name + '  ·  ' + Math.max(1, Math.round(f.size / 1024)) + ' KB'
        : 'Δεν υπάρχει επιλεγμένο αρχείο';
    });

    body.appendChild(el('label', { class: 'field' }, [
      el('span', { class: 'field__label', text: 'Αρχείο αγώνα (.json)' }),
      fileInput,
      fileInfo
    ]));

    body.appendChild(el('div', { class: 'or-line' }, [
      el('span', { class: 'or-line__text', text: 'ή' })
    ]));

    /* --- εναλλακτική: επικόλληση --- */
    var ta = el('textarea', {
      class: 'input',
      rows: '5',
      placeholder: 'Επικόλλησε εδώ το περιεχόμενο του αρχείου'
    });
    body.appendChild(el('label', { class: 'field' }, [
      el('span', { class: 'field__label', text: 'Επικόλληση περιεχομένου' }),
      ta,
      el('span', {
        class: 'field__hint',
        text: 'Αν ο επιλογέας αρχείων δεν δείχνει το αρχείο, άνοιξέ το με οποιοδήποτε πρόγραμμα, αντίγραψε τα περιεχόμενα και επικόλλησέ τα εδώ.'
      })
    ]));

    function finish(res, err) {
      if (err) {
        status.textContent = '✗ ' + err;
        status.classList.add('is-error');
        V.ui.toast('Αποτυχία εισαγωγής: ' + err, { tone: 'bad', duration: 5000 });
        return false;   /* κράτα το παράθυρο ανοιχτό */
      }
      V.ui.toast(
        'Εισήχθησαν ' + res.added + ' αγώνες' + (res.skipped ? ' (' + res.skipped + ' υπάρχουν ήδη)' : ''),
        { tone: 'good' }
      );
      if (res.added) location.hash = '#/';
      return true;
    }

    var d = V.ui.modal({
      title: 'Εισαγωγή αγώνα',
      size: 'lg',
      body: el('div', {}, [body, status]),
      actions: [
        { label: 'Άκυρο', variant: 'ghost' },
        {
          label: 'Εισαγωγή',
          variant: 'primary',
          onClick: function () {
            var f = fileInput.files && fileInput.files[0];
            var pasted = ta.value.trim();

            if (f) {
              var reader = new FileReader();
              reader.onload = function () {
                var ok = applyImport(reader.result, finish);
                if (ok) d.close();
              };
              reader.onerror = function () { finish(null, 'Αδυναμία ανάγνωσης αρχείου'); };
              reader.readAsText(f);
              return false;   /* κλείνει μόνο αν πετύχει */
            }
            if (pasted) return applyImport(pasted, finish);

            status.textContent = '✗ Διάλεξε αρχείο ή επικόλλησε περιεχόμενο';
            status.classList.add('is-error');
            return false;
          }
        }
      ]
    });
  }

  function applyImport(text, cb) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return cb(null, 'Το αρχείο δεν είναι σωστής μορφής (JSON). Μήπως άνοιξες λάθος αρχείο;');
    }
    var res;
    try {
      res = V.Store.import(data);
    } catch (e) {
      return cb(null, e.message);
    }
    return cb(res, null);
  }

  /* παλιά συμπεριφορά: άμεση κλήση του διαλόγου */
  function importFile() { importDialog(); }

  V.exporter = {
    download: download,
    exportMatch: exportMatch,
    exportAll: exportAll,
    exportCSV: exportCSV,
    exportCSVsAll: exportCSVsAll,
    importFile: importFile,
    importDialog: importDialog,
    slug: slug
  };
})(window.V = window.V || {});