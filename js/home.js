/* Home: hero typing, avatar wave, Polaroids dropping in on scroll. */
(function () {
  var site = window.site;
  var reduced = site.reduced;
  var SPEED = 8;
  var SEEN_KEY = 'el-home-typed';
  var seen = site.seen(SEEN_KEY);
  function instant() { return seen || reduced(); }

  var tag = document.querySelector('.hero-tag');
  var ctaA = document.querySelector('.cta-a');
  var ctaB = document.querySelector('.cta-b');

  var T = site.typer(
    { hero: [0, 1, 2, 3], head: [4], p0: [5], p1: [8], p2: [11], cta: [14, 15] },
    {
      // The caret waits at the end of the tag line until the buttons start typing.
      caret: function (id, g, G) { return g === G.hero && g.done && id === 3 && !G.cta.started; },
      after: function (G) {
        tag.classList.toggle('on', G.hero.idx >= 3);
        ctaA.className = 'cta-a ' + (G.hero.done ? 'cta-drop left' : 'cta-wait');
        ctaB.className = 'cta-b ' + (G.hero.done ? 'cta-drop right second' : 'cta-wait');
      }
    });
  var groups = T.groups;

  function startGroup(name, delay) {
    var g = groups[name];
    if (g.started) return;
    if (instant()) {
      T.finish(name);
      if (name === 'hero') startGroup('cta', 0);
      return;
    }
    g.started = true;
    T.render();
    setTimeout(function () { step(name); }, delay);
  }

  function step(name) {
    var g = groups[name];
    var line = T.lines[g.list[g.idx]].text;
    var k = name === 'hero' ? 0.68 : 1;
    if (g.pos < line.length) {
      g.pos += 1;
      var ch = line[g.pos - 1];
      var delay = SPEED + Math.random() * 24;
      if (ch === ',' || ch === '.' || ch === '!') delay += 180;
      T.render();
      setTimeout(function () { step(name); }, delay * k);
    } else if (g.idx < g.list.length - 1) {
      g.idx += 1;
      g.pos = 0;
      T.render();
      setTimeout(function () { step(name); }, 320 * k);
    } else {
      g.done = true;
      T.render();
      if (name === 'hero') startGroup('cta', 1350);
    }
  }

  // Avatar: falls in, waves, blinks and smiles, then wiggles on hover.
  var av = document.querySelector('.av');
  var hiDone = false;
  var wig = 0;
  setTimeout(function () { hiDone = true; av.className = 'av still'; }, reduced() ? 0 : 3950);
  document.querySelector('.avatar').addEventListener('mouseenter', function () {
    if (!hiDone || reduced()) return;
    wig += 1;
    av.className = 'av ' + (wig % 2 === 1 ? 'wig-a' : 'wig-b');
  });

  // Polaroids drop in as their row scrolls into view.
  var pols = document.querySelectorAll('[data-pol]');
  var tapes = document.querySelectorAll('[data-tape]');
  var rowOf = [0, 0, 1];
  var rows = [false, false];
  pols.forEach(function (p) { p.classList.add('pol-wait'); });
  tapes.forEach(function (t) { t.classList.add('tape-wait'); });

  function triggerRow(r) {
    for (var i = 0; i <= r; i++) {
      if (rows[i]) continue;
      rows[i] = true;
      if (i === 0) {
        startGroup('head', 0);
        startGroup('p0', 1500);
        startGroup('p1', 1500);
      } else {
        startGroup('p2', 1500);
      }
      for (var p = 0; p < 3; p++) {
        if (rowOf[p] !== i) continue;
        pols[p].classList.replace('pol-wait', 'pol-a');
        tapes[p].classList.replace('tape-wait', 'tdrop-a');
      }
    }
  }

  var r1 = document.getElementById('pf-row-1');
  var r2 = document.getElementById('pf-row-2');
  if (typeof IntersectionObserver === 'undefined') {
    triggerRow(1);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting || e.boundingClientRect.top < 0) triggerRow(e.target === r1 ? 0 : 1);
      });
    }, { threshold: 0.2 });
    io.observe(r1);
    io.observe(r2);
  }

  // "See my work" scrolls to the projects, stopping below the sticky nav.
  document.querySelector('[data-to-work]').addEventListener('click', function (e) {
    e.preventDefault();
    var top = document.getElementById('projects').getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: top, behavior: reduced() ? 'auto' : 'smooth' });
  });

  // Polaroids open their project window (js/windows.js).
  document.querySelectorAll('[data-open]').forEach(function (el) {
    var open = function () { if (window.openProject) window.openProject(+el.dataset.open, el); };
    el.addEventListener('click', open);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  T.render();
  if (!instant()) site.markSeen(SEEN_KEY);
  startGroup('hero', 600);
})();
