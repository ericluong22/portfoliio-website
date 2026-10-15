/* Shared behavior: reduced-motion check, typing engine, "Eric Luong" to top, phone menu. */
(function () {
  var root = document.documentElement;

  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // Typing plays once per session per page; later visits show the text already typed.
  function seen(key) {
    try { return sessionStorage.getItem(key) === '1'; } catch (e) { return false; }
  }
  function markSeen(key) {
    try { sessionStorage.setItem(key, '1'); } catch (e) {}
  }

  // Typing engine. Each [data-line] element becomes typed text + caret + transparent
  // remainder, so layout never shifts while typing. defs maps group name -> line ids.
  // A group types its lines in order; render() reflects every group's progress.
  // opts.caret(id, group, groups): extra caret condition. opts.after(groups): page hook.
  function typer(defs, opts) {
    opts = opts || {};
    var lines = {};
    document.querySelectorAll('[data-line]').forEach(function (el) {
      var text = el.textContent;
      el.textContent = '';
      var t = document.createElement('span');
      var c = document.createElement('span');
      var g = document.createElement('span');
      c.className = 'caret';
      c.hidden = true;
      g.className = 'ghost';
      g.textContent = text;
      el.append(t, c, g);
      lines[el.dataset.line] = { text: text, t: t, c: c, g: g };
    });

    var groups = {};
    var owner = {};
    Object.keys(defs).forEach(function (name) {
      groups[name] = { list: defs[name], started: false, done: false, idx: 0, pos: 0 };
      defs[name].forEach(function (i) { owner[i] = name; });
    });

    function typedOf(id) {
      var L = lines[id];
      var g = groups[owner[id]];
      var at = g.list.indexOf(+id);
      if (!g.started) return '';
      if (at < g.idx || (g.done && at <= g.idx)) return L.text;
      if (at === g.idx) return L.text.slice(0, g.pos);
      return '';
    }

    function render() {
      Object.keys(lines).forEach(function (id) {
        var L = lines[id];
        var g = groups[owner[id]];
        var typed = typedOf(id);
        if (L.t.textContent !== typed) {
          L.t.textContent = typed;
          L.g.textContent = L.text.slice(typed.length);
        }
        var active = g.started && !g.done && g.list.indexOf(+id) === g.idx;
        L.c.hidden = !(active || (opts.caret && opts.caret(+id, g, groups)));
      });
      if (opts.after) opts.after(groups);
    }

    // Jump a group to its final state (reduced motion, or already seen this session).
    function finish(name) {
      var g = groups[name];
      g.started = true;
      g.idx = g.list.length - 1;
      g.pos = lines[g.list[g.idx]].text.length;
      g.done = true;
      render();
    }

    return { lines: lines, groups: groups, render: render, finish: finish, typedOf: typedOf };
  }

  window.site = { reduced: reduced, seen: seen, markSeen: markSeen, typer: typer };

  // "Eric Luong" on Home, and the current-page link on About, scroll to the top.
  document.querySelectorAll('[data-to-top]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    });
  });

  // Ink wipe, cover half: links to another page on this site sweep a black panel across,
  // then navigate. The next page plays the reveal half (head script + html.wipe-in).
  var wiping = false;
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.protocol !== location.protocol || url.host !== location.host) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (reduced()) return;
    e.preventDefault();
    if (wiping) return;
    wiping = true;
    var panel = document.createElement('div');
    panel.className = 'wipe';
    panel.setAttribute('aria-hidden', 'true');
    document.body.appendChild(panel);
    try { sessionStorage.setItem('el-wipe', '1'); } catch (err) {}
    setTimeout(function () { location.href = url.href; }, 350);
  });
  // Coming back through the back/forward cache: drop the leftover panel.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    wiping = false;
    document.querySelectorAll('.wipe').forEach(function (el) { el.remove(); });
    root.classList.remove('wipe-in');
  });

  // Phone menu: sheet slides up, page scroll is locked by html.menu-open.
  var btn = document.querySelector('.mhb');
  var sheet = document.getElementById('mmenu');
  if (!btn || !sheet) return;

  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  function isOpen() { return root.classList.contains('menu-open'); }

  btn.addEventListener('click', function () { setMenu(!isOpen()); });
  sheet.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { setMenu(false); btn.focus(); }
  });
  // The menu only exists at phone width.
  var phone = window.matchMedia('(max-width: 600px)');
  var onChange = function () { if (!phone.matches) setMenu(false); };
  if (phone.addEventListener) phone.addEventListener('change', onChange); else phone.addListener(onChange);
})();
