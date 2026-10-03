/* =============================================================
 * charts.js — ιστορικά (bar charts) χωρίς εξωτερικές βιβλιοθήκες
 * ============================================================= */
(function (V) {
  'use strict';

  var el = V.ui.el;

  /* Μπάρα με ποσοστό. rows: [{label, value, sub, tone, meta}] */
  function bars(rows, opts) {
    opts = opts || {};
    var total = rows.reduce(function (s, r) { return s + (r.value || 0); }, 0);
    var max = rows.reduce(function (s, r) { return Math.max(s, r.value || 0); }, 0) || 1;

    var wrap = el('div', { class: 'bars' + (opts.dense ? ' bars--dense' : '') });

    rows.forEach(function (r) {
      if (!r.value && opts.hideEmpty) return;
      var sharePct = total ? (r.value / total) * 100 : 0;
      var widthPct = (r.value / max) * 100;
      wrap.appendChild(el('div', { class: 'bar' }, [
        el('div', { class: 'bar__head' }, [
          el('span', { class: 'bar__label' + (r.name ? '' : ' bar__label--strong'), text: r.label }),
          r.name ? el('span', { class: 'bar__name', text: r.name }) : null,
          el('span', { class: 'bar__value', text: String(r.value) }),
          el('span', { class: 'bar__pct', text: V.Stats.fmtPct(r.value, total) })
        ]),
        el('div', { class: 'bar__track' }, [
          el('div', {
            class: 'bar__fill bar__fill--' + (r.tone || 'default'),
            style: 'width:' + Math.max(widthPct, r.value > 0 ? 3 : 0).toFixed(1) + '%'
          })
        ]),
        r.sub ? el('div', { class: 'bar__sub', text: r.sub }) : null,
        r.meta ? el('div', { class: 'bar__meta', text: r.meta }) : null
      ]));
    });
    return wrap;
  }

  /* Στήλες (για σύγκριση σετ) */
  function columns(rows, opts) {
    opts = opts || {};
    var max = rows.reduce(function (s, r) { return Math.max(s, r.value || 0); }, 0) || 1;
    var wrap = el('div', { class: 'cols' });
    rows.forEach(function (r) {
      var h = Math.max(4, (r.value / max) * 100);
      wrap.appendChild(el('div', { class: 'col' }, [
        el('div', { class: 'col__track' }, [
          el('div', { class: 'col__fill col__fill--' + (r.tone || 'default'), style: 'height:' + h + '%' }),
          el('span', { class: 'col__value', text: String(r.value) })
        ]),
        el('span', { class: 'col__label', text: r.label })
      ]));
    });
    return wrap;
  }

  /* Μετρητές σε κάρτες */
  function statCards(cards) {
    return el('div', { class: 'stat-cards' }, cards.filter(Boolean).map(function (c) {
      return el('div', { class: 'stat-card' + (c.accent ? ' stat-card--' + c.accent : '') }, [
        el('span', { class: 'stat-card__value', text: c.value }),
        el('span', { class: 'stat-card__label', text: c.label }),
        c.hint ? el('span', { class: 'stat-card__hint', text: c.hint }) : null
      ]);
    }));
  }

  /* Μικρή ετικέτα */
  function chip(text, tone) {
    return el('span', { class: 'chip' + (tone ? ' chip--' + tone : ''), text: text });
  }

  /* Μετρητής (progress bar) */
  function meter(label, num, den, tone) {
    var p = den ? Math.round((num / den) * 1000) / 10 : 0;
    return el('div', { class: 'meter' }, [
      el('div', { class: 'meter__head' }, [
        el('span', { class: 'meter__label', text: label }),
        el('span', { class: 'meter__value', text: V.Stats.fmtPct(num, den) })
      ]),
      el('div', { class: 'meter__track' }, [
        el('div', { class: 'meter__fill meter__fill--' + (tone || 'default'), style: 'width:' + p + '%' })
      ]),
      el('div', { class: 'meter__sub', text: num + ' / ' + den })
    ]);
  }

  /* Πίνακας */
  function table(headers, rows) {
    var t = el('table', { class: 'table' });
    var thead = el('thead', {}, [el('tr', {}, headers.map(function (h) {
      return el('th', { class: h.num ? 'num' : '', text: h.label != null ? h.label : h });
    }))]);
    var tbody = el('tbody', {}, rows.map(function (r) {
      return el('tr', {}, r.map(function (c, i) {
        var h = headers[i] || {};
        return el('td', {
          class: (h.num ? 'num ' : '') + (h.strong ? 'strong' : '') + (c && c.tone ? ' tone-' + c.tone : ''),
          html: c && c.html != null ? c.html : (c && c.text != null ? c.text : String(c == null ? '—' : c))
        });
      }));
    }));
    t.appendChild(thead); t.appendChild(tbody);
    return t;
  }

  V.charts = {
    bars: bars,
    columns: columns,
    statCards: statCards,
    chip: chip,
    meter: meter,
    table: table
  };
})(window.V = window.V || {});