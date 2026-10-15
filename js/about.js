/* About: bio types out in about 5.5s, hobby rows type out as they scroll into view. */
(function () {
  var site = window.site;
  var SPEED = 8;
  var SEEN_KEY = 'el-about-typed';
  var seen = site.seen(SEEN_KEY);
  function instant() { return seen || site.reduced(); }

  var labels = document.querySelectorAll('.hobbies h3');
  var link = document.querySelector('.bio-text a');

  var T = site.typer(
    { bio: [0, 1, 2, 3, 4, 5, 6], head: [7], h0: [8, 9], h1: [10, 11], h2: [12, 13], h3: [14, 15], h4: [16, 17], h5: [18, 19] },
    {
      // The caret stays at the end of the bio once it's typed.
      caret: function (id, g, G) { return g === G.bio && g.done && id === 6; },
      after: function (G) {
        link.classList.toggle('on', T.typedOf(5) !== '');
        labels.forEach(function (h, i) { h.classList.toggle('on', G['h' + i].started); });
      }
    });
  var groups = T.groups;

  function startGroup(name, delay) {
    var g = groups[name];
    if (g.started) return;
    if (instant()) { T.finish(name); return; }
    g.started = true;
    T.render();
    setTimeout(function () { name === 'bio' ? stepBio() : step(name); }, delay);
  }

  // Hobbies type character by character.
  function step(name) {
    var g = groups[name];
    var line = T.lines[g.list[g.idx]].text;
    if (g.pos < line.length) {
      g.pos += 1;
      var ch = line[g.pos - 1];
      var delay = SPEED + Math.random() * 24;
      if (ch === ',' || ch === '.' || ch === '!') delay += 180;
      T.render();
      setTimeout(function () { step(name); }, delay / 1.35);
    } else if (g.idx < g.list.length - 1) {
      g.idx += 1;
      g.pos = 0;
      T.render();
      setTimeout(function () { step(name); }, 320 / 1.35);
    } else {
      g.done = true;
      T.render();
    }
  }

  // The bio types at a steady rate so it finishes in 5.5 seconds.
  var TICK = 16;
  var DURATION = 5500;
  function stepBio() {
    var g = groups.bio;
    if (!g.total) {
      g.total = 0;
      g.list.forEach(function (id) { g.total += T.lines[id].text.length; });
    }
    g.acc = (g.acc || 0) + g.total * TICK / DURATION;
    var n = Math.floor(g.acc);
    g.acc -= n;
    while (n > 0) {
      var line = T.lines[g.list[g.idx]].text;
      var take = Math.min(n, line.length - g.pos);
      g.pos += take;
      n -= take;
      if (g.pos >= line.length) {
        if (g.idx < g.list.length - 1) { g.idx += 1; g.pos = 0; }
        else { g.done = true; break; }
      }
    }
    T.render();
    if (!g.done) setTimeout(stepBio, TICK);
  }

  // Hobby rows start typing as they scroll into view.
  var rowGroups = [['head', 'h0', 'h1'], ['h2', 'h3'], ['h4', 'h5']];
  var rows = [false, false, false];
  function triggerRow(r) {
    for (var i = 0; i <= r; i++) {
      if (rows[i]) continue;
      rows[i] = true;
      rowGroups[i].forEach(function (name) { startGroup(name, name === 'head' ? 0 : (i === 0 ? 500 : 0)); });
    }
  }
  var els = ['hb-row-1', 'hb-row-2', 'hb-row-3'].map(function (id) { return document.getElementById(id); });
  if (typeof IntersectionObserver === 'undefined') {
    triggerRow(2);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting || e.boundingClientRect.top < 0) triggerRow(els.indexOf(e.target));
      });
    }, { threshold: 0.2 });
    els.forEach(function (e) { io.observe(e); });
  }

  T.render();
  if (!instant()) site.markSeen(SEEN_KEY);
  startGroup('bio', 600);
})();
