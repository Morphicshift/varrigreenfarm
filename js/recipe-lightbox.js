(function () {
  var imgs = Array.prototype.slice.call(document.querySelectorAll('main.recipe .rhero, main.recipe .rgal img, img.zoom'));
  if (!imgs.length) return;
  var lb = document.createElement('div');
  lb.className = 'lb rlb';
  lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Recipe photo');
  lb.innerHTML = '<button class="lb-close" aria-label="Close">&times;</button>' +
    (imgs.length > 1 ? '<button class="lb-prev" aria-label="Previous">&#8249;</button><button class="lb-next" aria-label="Next">&#8250;</button><div class="lb-count"></div>' : '') +
    '<div class="lbin"><img alt=""><button class="lb-back" type="button">Back</button></div>';
  document.body.appendChild(lb);
  var big = lb.querySelector('img'), cnt = lb.querySelector('.lb-count'), cur = 0, last = null;
  function fit() { var room = window.innerHeight - (window.innerWidth < 560 ? 200 : 160); var side = window.innerWidth < 560 ? 16 : 120; var ratio = big.naturalWidth && big.naturalHeight ? big.naturalWidth / big.naturalHeight : 1.6; var w = Math.min(window.innerWidth - side, room * ratio); big.style.cssText = 'width:' + Math.max(w, 200) + 'px;height:auto;max-width:none;max-height:' + room + 'px;object-fit:contain;cursor:zoom-out;image-rendering:auto'; }
  big.onload = fit; window.addEventListener('resize', function () { if (lb.classList.contains('open')) fit(); });
  function show(i) { cur = (i + imgs.length) % imgs.length; big.src = imgs[cur].src; big.alt = imgs[cur].alt; if (cnt) cnt.textContent = (cur + 1) + ' / ' + imgs.length; }
  function open(i) { last = imgs[i]; lb.classList.add('open'); document.body.classList.add('lb-on'); show(i); lb.querySelector('.lb-close').focus(); }
  function close() { lb.classList.remove('open'); document.body.classList.remove('lb-on'); big.removeAttribute('src'); if (last) last.focus(); }
  imgs.forEach(function (im, i) {
    im.tabIndex = 0; im.style.cursor = 'zoom-in'; im.title = 'Click to see it bigger';
    im.onclick = function () { open(i); };
    im.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } };
  });
  lb.querySelector('.lb-close').onclick = function (e) { e.stopPropagation(); close(); };
  lb.querySelector('.lb-back').onclick = function (e) { e.stopPropagation(); close(); };
  if (imgs.length > 1) {
    lb.querySelector('.lb-prev').onclick = function (e) { e.stopPropagation(); show(cur - 1); };
    lb.querySelector('.lb-next').onclick = function (e) { e.stopPropagation(); show(cur + 1); };
  }
  lb.onclick = function (e) { if (e.target === lb || e.target === big) close(); };
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (imgs.length > 1 && e.key === 'ArrowLeft') show(cur - 1);
    else if (imgs.length > 1 && e.key === 'ArrowRight') show(cur + 1);
  });
})();
