/* Varri Green Farm - volunteer photo gallery (no external libraries).
   Photo list: <data-base>/list.json (volunteers list is generated automatically) */
(function () {
  /* ======== SETTING: shuffle photo order on every visit (true = on, false = off) ======== */
  var SHUFFLE = true;
  /* ===================================================================================== */
  var grid = document.getElementById('vgal');
  if (!grid) return;
  /* Other pages can reuse this gallery: <div id="vgal" data-base="photos/workshops/" data-shuffle="false" data-alt="..."> */
  var BASE = grid.getAttribute('data-base') || 'photos/volunteers/';
  if (grid.hasAttribute('data-shuffle')) SHUFFLE = grid.getAttribute('data-shuffle') === 'true';
  var ALT = grid.getAttribute('data-alt') || 'Varri Green Farm volunteer';
  var photos = [], cur = 0, lb, img, count;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function build() {
    lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<img alt="' + ALT + ' photo">' +
      '<button class="lb-prev" aria-label="Previous photo">&#10094;</button>' +
      '<button class="lb-next" aria-label="Next photo">&#10095;</button>' +
      '<button class="lb-close" aria-label="Close">&#10005;</button>' +
      '<div class="lb-count"></div>';
    document.body.appendChild(lb);
    img = lb.querySelector('img'); count = lb.querySelector('.lb-count');
    lb.querySelector('.lb-prev').onclick = function (e) { e.stopPropagation(); go(-1); };
    lb.querySelector('.lb-next').onclick = function (e) { e.stopPropagation(); go(1); };
    lb.querySelector('.lb-close').onclick = close;
    lb.onclick = function (e) { if (e.target === lb) close(); };
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Escape') close();
    });
    var x0 = null, y0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }

  function preload(i) { var p = new Image(); p.src = BASE + 'large/' + photos[(i + photos.length) % photos.length]; }
  function show(i) {
    cur = (i + photos.length) % photos.length;
    img.src = BASE + 'large/' + photos[cur];
    img.alt = ALT + ', photo ' + (cur + 1);
    count.textContent = (cur + 1) + ' / ' + photos.length;
    preload(cur + 1); preload(cur - 1);
  }
  function go(d) { show(cur + d); }
  function open(i) { lb.classList.add('open'); document.body.classList.add('lb-on'); show(i); lb.querySelector('.lb-close').focus(); }
  function close() { lb.classList.remove('open'); document.body.classList.remove('lb-on'); img.removeAttribute('src'); var b = grid.children[cur]; if (b) b.focus(); }

  fetch(BASE + 'list.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (list) {
    photos = SHUFFLE ? shuffle(list.slice()) : list.slice();
    var frag = document.createDocumentFragment();
    photos.forEach(function (f, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', 'Open photo ' + (i + 1) + ' of ' + photos.length);
      b.innerHTML = '<img src="' + BASE + 'thumbs/' + f + '" alt="' + ALT + ', photo ' + (i + 1) + '" loading="lazy" decoding="async" width="400" height="400">';
      b.onclick = function () { open(i); };
      frag.appendChild(b);
    });
    grid.innerHTML = '';
    grid.appendChild(frag);
    build();
  }).catch(function () { if (!grid.querySelector('img')) grid.innerHTML = '<p>Photos are loading slowly &mdash; please refresh.</p>'; });
})();
