/* Project windows: open over Home, prev/next, close, focus handling, fit-to-width
   scaling, plus the persona switcher (window 1) and Spotify prototype (window 3).
   Markup bindings: data-k = click handler, data-c = dynamic class, data-t = text,
   data-a-<attr> = attribute. Values come from the vals functions ported from the design. */
(function () {
  var reduced = window.site.reduced;
  var ov = document.querySelector('.ov');
  if (!ov) return;
  var wins = {};
  ov.querySelectorAll('.ovw').forEach(function (w) { wins[w.dataset.win] = w; });
  var page = [document.querySelector('.site-nav'), document.querySelector('main'), document.querySelector('footer'), document.getElementById('mmenu')];
  var desk = window.matchMedia('(min-width: 1200px)');
  var tablet = window.matchMedia('(min-width: 601px) and (max-width: 1199px)');
  var current = 0;
  var closing = false;
  var opener = null;

  function scroller(w) { return desk.matches ? w.querySelector('.wbody') : w.querySelector('.win'); }

  // Framed window: scale the 1180x800 design to fit the viewport.
  // Fixed-width content (prototype, tablet collage) is zoomed to fit its column.
  function fit() {
    var s = Math.min(1, (window.innerWidth - 220) / 1180, (window.innerHeight - 60) / 800);
    ov.style.setProperty('--ws', String(Math.max(0.5, s)));
    if (!current) return;
    var w = wins[current];
    w.querySelectorAll('[data-zfit]').forEach(function (el) {
      var box = el.parentElement.closest('[aria-label="Interactive Spotify statistics prototype"]') || el.parentElement;
      var cw = box.clientWidth;
      if (cw) el.style.zoom = String(cw / +el.dataset.zfit);
    });
    w.querySelectorAll('[data-tfit]').forEach(function (el) {
      el.style.zoom = '';
      if (!tablet.matches) return;
      var cw = el.parentElement.clientWidth - 12;
      var z = Math.min(1, cw / +el.dataset.tfit);
      el.style.zoom = z < 1 ? String(z) : '';
    });
  }
  window.addEventListener('resize', fit);

  function show(n) {
    Object.keys(wins).forEach(function (k) { wins[k].classList.toggle('hide', +k !== n); });
    current = n;
    fit();
    var w = wins[n];
    w.querySelector('.wbody').scrollTop = 0;
    w.querySelector('.win').scrollTop = 0;
  }

  function open(n, from) {
    opener = from || document.activeElement;
    closing = false;
    ov.classList.remove('closing');
    show(n);
    ov.classList.add('open');
    ov.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('ov-open');
    page.forEach(function (el) { if (el) el.inert = true; });
    wins[n].querySelector('[data-close]:not(.ovbg)').focus({ preventScroll: true });
  }

  function finishClose() {
    ov.classList.remove('open', 'closing');
    ov.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ov-open');
    page.forEach(function (el) { if (el) el.inert = false; });
    current = 0;
    closing = false;
    try { if (opener && opener.focus) opener.focus({ preventScroll: true }); } catch (e) {}
  }

  function close() {
    if (!current || closing) return;
    if (reduced()) { finishClose(); return; }
    closing = true;
    ov.classList.add('closing');
    setTimeout(finishClose, 260);
  }

  function step(d, which) {
    var n = ((current - 1 + d + 3) % 3) + 1;
    show(n);
    // Keep focus on the same control in the newly shown window.
    var sel = which === 'prev' ? '[data-prev]' : '[data-next]';
    var btns = Array.prototype.filter.call(wins[n].querySelectorAll(sel), function (b) { return b.offsetParent; });
    if (btns[0]) btns[0].focus({ preventScroll: true });
  }

  window.openProject = open;

  ov.addEventListener('click', function (e) {
    var t = e.target.closest('[data-close], [data-prev], [data-next]');
    if (!t) return;
    if (t.hasAttribute('data-close')) close();
    else if (t.hasAttribute('data-prev')) step(-1, 'prev');
    else step(1, 'next');
  });

  document.addEventListener('keydown', function (e) {
    if (!current) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    // Keep focus inside the open window.
    var f = Array.prototype.filter.call(
      wins[current].querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent || el === document.activeElement; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ---------- Bindings ----------
  function component(n, prefix, valsFn) {
    var root = wins[n];
    var state = {};
    var vals = {};
    var bound = [];
    root.querySelectorAll('*').forEach(function (el) {
      var attrs = [];
      for (var i = 0; i < el.attributes.length; i++) {
        var a = el.attributes[i];
        if (a.name.indexOf('data-a-') === 0) attrs.push([a.name.slice(7), a.value]);
      }
      if (el.dataset.c || el.dataset.t || attrs.length) {
        bound.push({ el: el, base: el.getAttribute('class') || '', attrs: attrs });
      }
    });
    function key(k) { return k.indexOf(prefix) === 0 ? k.slice(prefix.length) : k; }
    function render() {
      vals = valsFn(state, setState);
      bound.forEach(function (b) {
        var el = b.el;
        if (el.dataset.c) {
          var extra = el.dataset.c.split(' ').map(function (k) { return vals[key(k)] || ''; }).join(' ');
          el.setAttribute('class', (b.base + ' ' + extra).trim().replace(/\s+/g, ' '));
        }
        if (el.dataset.t) el.textContent = vals[key(el.dataset.t)];
        b.attrs.forEach(function (a) { el.setAttribute(a[0], vals[key(a[1])]); });
      });
    }
    function setState(u) {
      for (var k in u) state[k] = u[k];
      render();
    }
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-k]');
      if (!t || !root.contains(t)) return;
      var fn = vals[key(t.dataset.k)];
      if (typeof fn === 'function') fn(e);
    });
    render();
  }

  // Window 1: persona thumbnails switch the persona card. (vals1 in the design)
  component(1, 'w1_', function (st, set) {
    var a = ('pp' in st) ? st.pp : 0; var o = {};
    for (var i = 0; i < 3; i++) { (function (j) { o['p' + j] = function () { set({ pp: j }); }; })(i); o['pon' + i] = a === i ? 'on' : ''; o['phide' + i] = a === i ? '' : 'hide'; }
    return o;
  });

  // Window 3: interactive Spotify statistics prototype. (vals3 in the design)
  component(3, 'w3_', function (st, set) {
    var o = {};
    var TF = ["Week", "Month", "Year", "Lifetime"], TFM = [1, 4.3, 52, 160], PER = [["This week", "Last week", "Jul 14 – Jul 20", "Jul 7 – Jul 13"], ["This month", "June", "May", "April"], ["2024", "2023", "2022"], ["Since 2019"]], PF = [[1, 0.584, 0.389, 0.519], [1, 0.85, 0.92, 0.7], [1, 0.8, 0.55], [1]], PREVW = ["last week", "last month", "last year", ""], KIND = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
    var AM = [450, 280, 220, 200, 100, 90, 70, 60], TP = [50, 40, 30, 20, 10, 5, 5, 5, 5], GM = [640, 534, 357, 220, 68, 66, 58, 75, 39];
    var tf = ('tf' in st) ? st.tf : 0; var p = ('p' in st) ? st.p : 0; var np = PER[tf].length;
    function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
    function sc(v) { return v * TFM[tf] * PF[tf][p]; }
    for (var i = 0; i < 4; i++) { (function (j) { o['tfset' + j] = function () { set({ tf: j, p: 0 }); }; })(i); o['tfon' + i] = (i === tf) ? 'on' : ''; }
    for (var a = 0; a < 4; a++) { for (var b = 0; b < 4; b++) { o['ch' + a + b] = (a === tf && b === p) ? '' : 'hide'; } }
    o.older = function () { if (p < np - 1) set({ p: p + 1 }); }; o.newer = function () { if (p > 0) set({ p: p - 1 }); };
    o.olddis = (p >= np - 1) ? 'dis' : ''; o.newdis = (p <= 0) ? 'dis' : '';
    o.plabel = PER[tf][p]; o.plabelLow = ((p === 0 && tf < 2) || tf === 3) ? PER[tf][p].toLowerCase() : PER[tf][p]; o.ckind = KIND[tf];
    var cur = 1850 * TFM[tf] * PF[tf][p]; o.kmin = fmt(cur);
    if (p < np - 1) { var prv = 1850 * TFM[tf] * PF[tf][p + 1]; var d = Math.round((cur / prv - 1) * 100); o.kdelta = (d >= 0 ? '▲ ' : '▼ ') + Math.abs(d) + '%'; o.kvs = 'vs ' + (p === 0 ? PREVW[tf] : PER[tf][p + 1]); } else { o.kdelta = ''; o.kvs = (tf === 3) ? 'since you joined' : 'earliest period'; }
    o.kart = fmt(sc(450)); o.ktrk = fmt(sc(50)); o.kgen = fmt(sc(640));
    for (i = 0; i < AM.length; i++) o['a' + i] = fmt(sc(AM[i])); for (i = 0; i < TP.length; i++) o['t' + i] = fmt(Math.max(1, sc(TP[i]))); for (i = 0; i < GM.length; i++) o['g' + i] = fmt(sc(GM[i]));
    ['a', 't', 'g'].forEach(function (k) { var on = !!st['sa' + k]; o[k + 'hide'] = on ? '' : 'hide'; o[k + 'lab'] = on ? 'Show less' : 'Show all'; o[k + 't'] = function () { var u = {}; u['sa' + k] = !on; set(u); }; });
    var sh = !!st.sh; o.shtog = function () { set({ sh: !sh, cp: false }); }; o.shhide = sh ? '' : 'hide'; o.shexp = sh ? 'true' : 'false'; o.shlab = sh ? 'Done' : 'Share with friends';
    o.cpy = function () { set({ cp: true }); }; o.cplab = st.cp ? 'Link copied' : 'Copy link';
    var hist = st.hist || [0]; var hi = ('hi' in st) ? st.hi : 0; var view = hist[hi];
    function go(v) { if (v === view) return; var h = hist.slice(0, hi + 1); h.push(v); set({ hist: h, hi: h.length - 1 }); }
    o.vart = function () { go(1); }; o.vsong = function () { go(2); }; o.vback = function () { if (hi > 0) set({ hi: hi - 1 }); };
    o.navback = function () { if (hi > 0) set({ hi: hi - 1 }); }; o.navfwd = function () { if (hi < hist.length - 1) set({ hi: hi + 1 }); };
    o.bkdis = hi > 0 ? '' : 'dis'; o.fwdis = hi < hist.length - 1 ? '' : 'dis';
    o.dashhide = view === 0 ? '' : 'hide'; o.apg = view === 1 ? '' : 'hide'; o.spg = view === 2 ? '' : 'hide';
    var AM50 = [450, 280, 220, 200, 100, 90, 70, 60, 58, 55, 52, 48, 45, 42, 40, 38, 36, 34, 32, 30, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 15, 14, 14, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7], SP50 = [50, 40, 30, 20, 10, 9, 9, 8, 8, 8, 7, 7, 7, 6, 6, 6, 6, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1];
    for (i = 0; i < 50; i++) { o['A' + i] = fmt(sc(AM50[i])); o['S' + i] = fmt(Math.max(1, sc(SP50[i]))); }
    return o;
  });
})();
