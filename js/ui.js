/* =============================================================
 * ui.js — μικρά εργαλεία DOM: στοιχεία, toast, modal, φύλλο
 * ============================================================= */
(function (V) {
  'use strict';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var val = attrs[k];
        if (val == null || val === false) return;
        if (k === 'class') node.className = val;
        else if (k === 'text') node.textContent = val;
        else if (k === 'html') node.innerHTML = val;
        else if (k === 'dataset') Object.keys(val).forEach(function (d) { node.dataset[d] = val[d]; });
        else if (k.slice(0, 2) === 'on' && typeof val === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), val);
        } else if (val === true) node.setAttribute(k, '');
        else node.setAttribute(k, val);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------------- toast ---------------- */
  var toastWrap = null;
  function toast(msg, opts) {
    opts = opts || {};
    if (!toastWrap) {
      toastWrap = el('div', { class: 'toast-wrap' });
      document.body.appendChild(toastWrap);
    }
    var node = el('div', { class: 'toast' + (opts.tone ? ' toast--' + opts.tone : '') }, [
      el('span', { class: 'toast__msg', text: msg }),
      opts.actionLabel ? el('button', {
        class: 'toast__action',
        text: opts.actionLabel,
        onclick: function () { close(); opts.onAction && opts.onAction(); }
      }) : null
    ]);
    toastWrap.appendChild(node);
    requestAnimationFrame(function () { node.classList.add('is-in'); });
    var timer = setTimeout(close, opts.duration || 3800);
    function close() {
      clearTimeout(timer);
      node.classList.remove('is-in');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 220);
    }
    node.addEventListener('click', function (e) {
      if (e.target.classList.contains('toast__action')) return;
      close();
    });
    return close;
  }

  /* ---------------- modal ---------------- */
  var openModals = [];

  function modal(opts) {
    opts = opts || {};
    var overlay = el('div', { class: 'modal-overlay' });
    var box = el('div', { class: 'modal' + (opts.size ? ' modal--' + opts.size : '') });

    if (opts.title) {
      box.appendChild(el('div', { class: 'modal__head' }, [
        el('h3', { class: 'modal__title', text: opts.title }),
        el('button', { class: 'icon-btn', text: '\u2715', 'aria-label': 'Κλείσιμο', onclick: close })
      ]));
    }
    var body = el('div', { class: 'modal__body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    box.appendChild(body);

    if (opts.actions && opts.actions.length) {
      var foot = el('div', { class: 'modal__foot' });
      opts.actions.forEach(function (a) {
        foot.appendChild(el('button', {
          class: 'btn ' + (a.variant ? 'btn--' + a.variant : 'btn--ghost'),
          text: a.label,
          onclick: function () {
            if (!a.onClick) { close(); return; }
            var keep = a.onClick();
            if (keep !== false) close();
          }
        }));
      });
      box.appendChild(foot);
    }

    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && opts.dismissible !== false) close();
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('is-in'); });
    openModals.push(close);
    if (opts.onOpen) opts.onOpen(box);

    function close() {
      overlay.classList.remove('is-in');
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 180);
      openModals = openModals.filter(function (c) { return c !== close; });
      if (opts.onClose) opts.onClose();
    }
    return { close: close, body: body, box: box };
  }

  function confirm(title, message, okLabel) {
    return new Promise(function (resolve) {
      modal({
        title: title,
        body: el('p', { class: 'modal__text', text: message }),
        actions: [
          { label: 'Άκυρο', variant: 'ghost' },
          { label: okLabel || 'Ναι', variant: 'danger', onClick: function () { resolve(true); } }
        ],
        onClose: function () { resolve(false); }
      });
    });
  }

  function prompt(title, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var input;
      var m = modal({
        title: title,
        body: el('div', {}, [
          opts.label ? el('label', { class: 'field__label', text: opts.label }) : null,
          input = el('input', {
            class: 'input',
            type: opts.type || 'text',
            value: opts.value || '',
            placeholder: opts.placeholder || '',
            inputmode: opts.inputmode || null
          })
        ]),
        actions: [
          { label: 'Άκυρο', variant: 'ghost' },
          { label: opts.okLabel || 'ΟΚ', variant: 'primary', onClick: function () { resolve(input.value); } }
        ],
        onOpen: function () { setTimeout(function () { input.focus(); input.select && input.select(); }, 60); },
        onClose: function () { resolve(null); }
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); resolve(input.value); m.close(); }
      });
    });
  }

  /* ---------------- field ---------------- */
  function field(label, input, hint) {
    return el('label', { class: 'field' }, [
      el('span', { class: 'field__label', text: label }),
      input,
      hint ? el('span', { class: 'field__hint', text: hint }) : null
    ]);
  }

  function input(attrs) { return el('input', Object.assign({ class: 'input' }, attrs || {})); }
  function select(options, value, attrs) {
    var s = el('select', Object.assign({ class: 'input input--select' }, attrs || {}));
    options.forEach(function (o) {
      s.appendChild(el('option', { value: o.id, text: o.label, selected: o.id === value ? true : null }));
    });
    s.value = value != null ? value : (options[0] && options[0].id);
    return s;
  }

  /* ---------------- haptics ---------------- */
  function buzz(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) { /* ignore */ }
  }

  /* ---------------- format ---------------- */
  function fmtDate(iso) {
    if (!iso) return '—';
    var parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  function fmtTime(ts) {
    try {
      var d = new Date(ts);
      var p = function (n) { return String(n).padStart(2, '0'); };
      return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    } catch (e) { return ''; }
  }

  V.ui = {
    el: el, clear: clear, $: $, $$: $$,
    toast: toast, modal: modal, confirm: confirm, prompt: prompt,
    field: field, input: input, select: select,
    buzz: buzz, fmtDate: fmtDate, fmtTime: fmtTime
  };

  /* ---------------- απλό event bus ---------------- */
  var busListeners = {};
  V.bus = {
    on: function (name, fn) { (busListeners[name] = busListeners[name] || []).push(fn); },
    emit: function (name, payload) {
      (busListeners[name] || []).forEach(function (fn) { try { fn(payload); } catch (e) { console.error(e); } });
    }
  };
})(window.V = window.V || {});