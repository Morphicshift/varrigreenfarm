/* Varri Green Farm guestbook - plain fetch to the Supabase REST API.
   The publishable key below is meant for public web pages; access is
   limited by row-level security (read + add only). */
(function () {
  'use strict';
  var SB_URL = 'https://bgaldjnsiboqivfhwjtt.supabase.co';
  var SB_KEY = 'sb_publishable_ylx3X2czR4tHzm4lbf1sUw_LxRnnIsd';
  var API = SB_URL + '/rest/v1/guestbook';
  var PAGE = 50;
  var loadedAt = Date.now();

  var root = document.getElementById('guestbook');
  if (!root) return;
  var form = root.querySelector('.gb-form');
  var nameEl = form.querySelector('#gb-name');
  var msgEl = form.querySelector('#gb-message');
  var hpEl = form.querySelector('#gb-website');
  var leftEl = form.querySelector('#gb-left');
  var btn = form.querySelector('.gb-post');
  var status = root.querySelector('.gb-status');
  var list = root.querySelector('.gb-list');
  var empty = root.querySelector('.gb-empty');
  var more = root.querySelector('.gb-more');
  var listStatus = root.querySelector('.gb-list-status');

  var offset = 0;      // rows fetched from the server so far
  var added = 0;       // rows this visitor posted (shift the paging offset)
  var seen = {};

  function headers(extra) {
    var h = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };
    for (var k in extra) h[k] = extra[k];
    return h;
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function makeEntry(row) {
    var li = document.createElement('li');
    li.className = 'gb-entry';
    var head = document.createElement('div');
    head.className = 'gb-head';
    var n = document.createElement('span');
    n.className = 'gb-name';
    n.textContent = row.name;
    var t = document.createElement('time');
    t.className = 'gb-date';
    t.dateTime = row.created_at;
    t.textContent = fmtDate(row.created_at);
    head.appendChild(n);
    head.appendChild(t);
    var p = document.createElement('p');
    p.className = 'gb-msg';
    p.textContent = row.message;
    li.appendChild(head);
    li.appendChild(p);
    return li;
  }

  function refreshEmpty() {
    empty.hidden = list.children.length > 0;
  }

  function setStatus(el, text, kind) {
    el.textContent = text;
    el.className = el.className.replace(/\s*gb-(ok|err)\b/g, '') + (kind ? ' gb-' + kind : '');
  }

  function friendlyError(body, httpStatus) {
    var m = (body && (body.message || body.hint || body.details)) || '';
    m = String(m).replace(/^ERROR:\s*/i, '').trim();
    if (!m) {
      if (httpStatus === 429) m = 'Too many messages right now. Please try again a little later.';
      else m = 'Something went wrong. Please try again in a moment.';
    }
    return 'Sorry, we couldn\u2019t post your message: ' + m;
  }

  function load() {
    more.disabled = true;
    setStatus(listStatus, offset ? 'Loading\u2026' : '', '');
    var url = API + '?select=id,name,message,created_at&order=created_at.desc&limit=' + PAGE +
      '&offset=' + (offset + added);
    fetch(url, { headers: headers({}) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rows) {
        offset += rows.length;
        rows.forEach(function (row) {
          if (seen[row.id]) return;
          seen[row.id] = 1;
          list.appendChild(makeEntry(row));
        });
        more.hidden = rows.length < PAGE;
        more.disabled = false;
        setStatus(listStatus, '', '');
        refreshEmpty();
      })
      .catch(function () {
        more.disabled = false;
        empty.hidden = true;
        setStatus(listStatus, 'Sorry, the guestbook couldn\u2019t be loaded right now. Please try again later.', 'err');
      });
  }

  function updateLeft() {
    var left = 1000 - msgEl.value.length;
    leftEl.textContent = left + (left === 1 ? ' character left' : ' characters left');
  }

  msgEl.addEventListener('input', updateLeft);
  more.addEventListener('click', load);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = nameEl.value.trim();
    var message = msgEl.value.trim();

    // Bots: honeypot filled -> pretend it worked, send nothing.
    if (hpEl.value) {
      form.reset(); updateLeft();
      setStatus(status, 'Thanks for signing!', 'ok');
      return;
    }
    // Too fast to be a person.
    if (Date.now() - loadedAt < 3000) {
      setStatus(status, 'Please take a moment, then press Post again.', 'err');
      return;
    }
    if (!name) { setStatus(status, 'Please enter your name.', 'err'); nameEl.focus(); return; }
    if (!message) { setStatus(status, 'Please write a message.', 'err'); msgEl.focus(); return; }

    btn.disabled = true;
    setStatus(status, 'Posting\u2026', '');
    fetch(API, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
      body: JSON.stringify({ name: name.slice(0, 60), message: message.slice(0, 1000) })
    })
      .then(function (r) {
        return r.text().then(function (txt) {
          var body = null;
          try { body = txt ? JSON.parse(txt) : null; } catch (x) {}
          if (!r.ok) throw new Error(friendlyError(body, r.status));
          return body;
        });
      })
      .then(function (rows) {
        var row = rows && rows[0];
        if (row && !seen[row.id]) {
          seen[row.id] = 1;
          added++;
          list.insertBefore(makeEntry(row), list.firstChild);
        }
        refreshEmpty();
        form.reset(); updateLeft();
        setStatus(status, 'Thanks for signing!', 'ok');
      })
      .catch(function (err) {
        var m = err && err.message;
        if (!m || /Failed to fetch|NetworkError|Load failed/i.test(m)) {
          m = 'Sorry, we couldn\u2019t reach the guestbook. Please check your connection and try again.';
        }
        setStatus(status, m, 'err');
      })
      .then(function () { btn.disabled = false; });
  });

  updateLeft();
  load();
})();
