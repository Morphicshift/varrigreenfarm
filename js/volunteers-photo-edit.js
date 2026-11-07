/* Photo add/delete for the volunteers page.
   Shown only when this browser has already saved the key.
   Volunteer photos go to photos/volunteers/upload/ and the existing
   GitHub Action resizes them and rebuilds list.json.
   Deleting a volunteer photo deletes only its large file; that same
   action removes the thumb and rebuilds the list.
   Farm project photos are written directly under photos/projects/. */
(function () {
  var KEY_NAME = 'vgfPhotoKey';
  var REPO = 'https://api.github.com/repos/Morphicshift/varrigreenfarm/contents/';
  var OK_EXT = { '.jpg': 1, '.jpeg': 1, '.png': 1, '.webp': 1, '.heic': 1, '.heif': 1, '.gif': 1, '.bmp': 1, '.tif': 1, '.tiff': 1 };

  function saveHash() {
    var h = location.hash.length > 1 ? location.hash.slice(1) : '';
    if (!h) return;
    var k = h;
    try { k = decodeURIComponent(h); } catch (e) {}
    k = (k || '').replace(/^\s+|\s+$/g, '');
    if (/^(github_pat_|ghp_)[A-Za-z0-9_]+$/.test(k) && k.length >= 20) {
      try { localStorage.setItem(KEY_NAME, k); } catch (e) {}
    }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  saveHash();

  var key = '';
  try { key = localStorage.getItem(KEY_NAME) || ''; } catch (e) {}
  if (!/^(github_pat_|ghp_)[A-Za-z0-9_]+$/.test(key)) return;

  var grid = document.getElementById('vgal');
  if (!grid || !grid.parentNode) return;

  var css = document.createElement('style');
  css.textContent = '#vgf-photo-edit{max-width:720px;margin:16px auto;padding:12px 14px;border:1px solid #f5a623;border-radius:6px;background:rgba(0,0,0,.55);text-align:center}' +
    '#vgf-photo-edit p,#vgf-photo-edit label{font-size:1em;line-height:1.45;color:#f5c518}' +
    '#vgf-photo-edit b{color:#ffd700}' +
    '#vgf-photo-edit button,#vgf-photo-edit select{font:inherit;color:#071c12;background:#f5c518;border:2px solid #f5a623;border-radius:5px;padding:6px 12px;margin:4px;cursor:pointer}' +
    '#vgf-photo-edit button.danger{background:#8c1c1c;color:#fff;border-color:#f5a623}' +
    '#vgf-photo-edit input[type=file]{color:#f5c518;margin:6px auto}' +
    '#vgf-photo-edit select{max-width:100%}' +
    '#vgf-status{min-height:1.4em}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.id = 'vgf-photo-edit';
  box.innerHTML = '<p><b>Photo editing</b></p>' +
    '<label>Album <select id="vgf-album">' +
    '<option value="volunteers">Volunteers</option>' +
    '<option value="projects">Farm projects</option>' +
    '</select></label>' +
    '<p><input id="vgf-file" type="file" accept="image/*" multiple> <button type="button" id="vgf-add">Add</button></p>' +
    '<p><label>On the site <select id="vgf-list"></select></label> ' +
    '<button type="button" id="vgf-del" class="danger">Delete</button> ' +
    '<button type="button" id="vgf-refresh">Refresh list</button> ' +
    '<button type="button" id="vgf-hide">Hide editing</button></p>' +
    '<p id="vgf-status"></p>';
  grid.parentNode.insertBefore(box, grid);

  var albumEl = document.getElementById('vgf-album');
  var fileEl = document.getElementById('vgf-file');
  var listEl = document.getElementById('vgf-list');
  var statusEl = document.getElementById('vgf-status');
  var busy = false;

  function say(text) { statusEl.textContent = text; }

  function gh(method, path, body) {
    var url = REPO + path.split('/').map(encodeURIComponent).join('/');
    var opts = {
      method: method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + key,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (r) {
      return r.text().then(function (t) {
        var j = {};
        if (t) { try { j = JSON.parse(t); } catch (e) { j = {}; } }
        if (!r.ok) {
          var msg = (j && j.message) ? j.message : ('HTTP ' + r.status);
          var err = new Error(String(msg).slice(0, 180));
          err.status = r.status;
          throw err;
        }
        return j;
      });
    });
  }

  function explain(err) {
    if (err && (err.status === 401 || err.status === 403)) return 'GitHub refused the saved key. Use Unlock Website Photo Editing on the desktop again.';
    return (err && err.message) ? err.message : 'Something went wrong.';
  }

  function safeRel(name) {
    if (!name || name.indexOf('..') !== -1 || name.charAt(0) === '/' || name.indexOf('\\') !== -1) return '';
    if (!/^[A-Za-z0-9._/-]+$/.test(name)) return '';
    if (name.charAt(0) === '.' || name.indexOf('/.') !== -1) return '';
    return name;
  }

  function cleanStem(filename) {
    var base = String(filename || '').split(/[/\\]/).pop();
    var stem = base.replace(/\.[^.]+$/, '').toLowerCase();
    stem = stem.replace(/[^a-z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
    return stem || 'photo';
  }

  function uploadName(filename) {
    var base = String(filename || '').split(/[/\\]/).pop();
    var m = base.match(/(\.[^.]+)$/);
    var ext = m ? m[1].toLowerCase() : '';
    if (!OK_EXT[ext]) ext = '.jpg';
    return cleanStem(base) + ext;
  }

  function fileToB64(file) {
    return file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var bin = '';
      var step = 0x8000;
      for (var i = 0; i < bytes.length; i += step) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + step, bytes.length)));
      }
      return btoa(bin);
    });
  }

  function fill(items) {
    listEl.innerHTML = '';
    if (!items.length) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '(none)';
      listEl.appendChild(empty);
      return;
    }
    items.forEach(function (it) {
      var rel = safeRel(it.name);
      if (!rel) return;
      var opt = document.createElement('option');
      opt.value = rel;
      opt.textContent = rel;
      if (it.sha) opt.setAttribute('data-sha', it.sha);
      listEl.appendChild(opt);
    });
  }

  function listDir(path) {
    return gh('GET', path).then(function (data) { return Array.isArray(data) ? data : []; });
  }

  function listProjects() {
    var out = [];
    function walk(path, rel, depth) {
      return listDir(path).then(function (items) {
        var dirs = [];
        items.forEach(function (it) {
          var relName = rel ? (rel + '/' + it.name) : it.name;
          if (it.type === 'file' && /\.(jpe?g|png|webp|gif)$/i.test(it.name) && safeRel(relName)) {
            out.push({ name: relName, sha: it.sha || '' });
          } else if (it.type === 'dir' && depth < 3 && safeRel(it.name) && it.name.charAt(0) !== '.') {
            dirs.push(it);
          }
        });
        return dirs.reduce(function (p, dir) {
          var nextRel = rel ? (rel + '/' + dir.name) : dir.name;
          return p.then(function () { return walk(path + '/' + dir.name, nextRel, depth + 1); });
        }, Promise.resolve());
      });
    }
    return walk('photos/projects', '', 0).then(function () {
      out.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
      return out;
    });
  }

  function listVolunteers() {
    return fetch('photos/volunteers/list.json', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Could not load the volunteer photo list.');
      return r.json();
    }).then(function (list) {
      if (!Array.isArray(list)) return [];
      return list.filter(function (n) { return typeof n === 'string' && safeRel(n) && n.indexOf('/') === -1; })
        .sort()
        .map(function (n) { return { name: n, sha: '' }; });
    });
  }

  function refresh() {
    say('Loading the list...');
    var job = albumEl.value === 'projects' ? listProjects() : listVolunteers();
    return job.then(function (items) {
      fill(items);
      say(listEl.options.length + (albumEl.value === 'projects' ? ' project photos.' : ' volunteer photos.'));
    }).catch(function (err) { say(explain(err)); });
  }

  function taken(name) {
    for (var i = 0; i < listEl.options.length; i++) {
      if (listEl.options[i].value.toLowerCase() === name.toLowerCase()) return true;
    }
    return false;
  }

  function uniqueJpg(stem) {
    var name = stem + '.jpg';
    var n = 2;
    while (taken(name)) { name = stem + '-' + n + '.jpg'; n++; }
    return name;
  }

  function putFile(path, b64, message) {
    return gh('PUT', path, { message: message, content: b64, branch: 'main' });
  }

  function toProjectJpeg(file) {
    return createImageBitmap(file).then(function (bmp) {
      var max = 1600;
      var scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bmp.width * scale));
      canvas.height = Math.max(1, Math.round(bmp.height * scale));
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      if (bmp.close) bmp.close();
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) reject(new Error('Could not save that picture as a JPG.'));
          else resolve(blob);
        }, 'image/jpeg', 0.8);
      });
    });
  }

  function addOne(file, index, total) {
    if (file.size > 25 * 1024 * 1024) return Promise.reject(new Error(file.name + ' is over 25 MB.'));
    if (albumEl.value === 'projects') {
      var stem = cleanStem(file.name);
      var name = uniqueJpg(stem);
      say('Uploading ' + (index + 1) + ' of ' + total + ': ' + name);
      return toProjectJpeg(file).then(fileToB64).then(function (b64) {
        return putFile('photos/projects/' + name, b64, 'Add farm project photo ' + name);
      });
    }
    var up = uploadName(file.name);
    say('Uploading ' + (index + 1) + ' of ' + total + ': ' + up);
    return fileToB64(file).then(function (b64) {
      return putFile('photos/volunteers/upload/' + up, b64, 'Add volunteer photo ' + up);
    });
  }

  function addAll() {
    var files = fileEl.files ? Array.prototype.slice.call(fileEl.files) : [];
    if (!files.length) { say('Choose a photo first.'); return; }
    busy = true;
    var chain = Promise.resolve();
    files.forEach(function (file, i) {
      chain = chain.then(function () { return addOne(file, i, files.length); });
    });
    chain.then(function () {
      fileEl.value = '';
      if (albumEl.value === 'projects') {
        say('Added. Refreshing the list.');
        return refresh();
      }
      say('Uploaded. The site resizes volunteer photos and adds them in a minute or two. Refresh the list then.');
    }).catch(function (err) {
      say(explain(err));
    }).then(function () { busy = false; });
  }

  function removeSelected() {
    var name = safeRel(listEl.value);
    if (!name) { say('Choose a photo to delete.'); return; }
    var opt = listEl.options[listEl.selectedIndex];
    var sha = opt ? (opt.getAttribute('data-sha') || '') : '';
    var path = albumEl.value === 'projects' ? ('photos/projects/' + name) : ('photos/volunteers/large/' + name);
    if (albumEl.value !== 'projects' && name.indexOf('/') !== -1) { say('Choose a photo to delete.'); return; }
    if (!confirm('Delete ' + name + ' from the website?')) return;
    busy = true;
    say('Deleting ' + name + '...');
    var ready = sha ? Promise.resolve(sha) : gh('GET', path).then(function (info) { return info.sha; });
    ready.then(function (fileSha) {
      if (!fileSha) throw new Error('Could not find that photo.');
      var message = (albumEl.value === 'projects' ? 'Remove farm project photo ' : 'Remove volunteer photo ') + name;
      return gh('DELETE', path, { message: message, sha: fileSha, branch: 'main' });
    }).then(function () {
      if (opt && opt.parentNode) opt.parentNode.removeChild(opt);
      if (albumEl.value === 'projects') say('Deleted ' + name + '.');
      else say('Deleted ' + name + '. The gallery drops it after the site rebuilds, about a minute.');
    }).catch(function (err) {
      if (err && err.status === 404) say('That photo is already gone.');
      else say(explain(err));
    }).then(function () { busy = false; });
  }

  function guard(fn) {
    return function () { if (!busy) fn(); };
  }

  document.getElementById('vgf-add').onclick = guard(addAll);
  document.getElementById('vgf-del').onclick = guard(removeSelected);
  document.getElementById('vgf-refresh').onclick = guard(refresh);
  albumEl.onchange = guard(refresh);
  document.getElementById('vgf-hide').onclick = function () {
    try { localStorage.removeItem(KEY_NAME); } catch (e) {}
    if (box.parentNode) box.parentNode.removeChild(box);
    if (css.parentNode) css.parentNode.removeChild(css);
  };

  refresh();
})();
