(function(){
  var ls=window.localStorage, st=document.getElementById('st'), t=document.getElementById('t'), tb=t.querySelector('tbody');
  var m=/[#&]k=([0-9a-f]{32})/.exec(location.hash);
  try{ if(m){ ls.setItem('vgf_vkey',m[1]); ls.setItem('vgf_owner','1'); history.replaceState(null,'',location.pathname); } }catch(e){}
  var key=null; try{ key=ls.getItem('vgf_vkey'); }catch(e){}
  if(!key){ st.textContent='Nothing to see here.'; return; }
  var P='sb_publishable_ylx3X2czR4tHzm4lbf1sUw_LxRnnIsd';
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  var geo={}; try{ geo=JSON.parse(ls.getItem('vgf_geo')||'{}'); }catch(e){}
  function where(ip){ var g=geo[ip]; return g? [g.city,g.region,g.country].filter(Boolean).join(', ')+(g.isp?' ('+g.isp+')':'') : 'â€¦'; }
  fetch('https://bgaldjnsiboqivfhwjtt.supabase.co/rest/v1/rpc/get_visits',{method:'POST',headers:{'apikey':P,'Authorization':'Bearer '+P,'Content-Type':'application/json'},body:JSON.stringify({p_pass:key})})
  .then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(rows){
    rows.sort(function(a,b){return b.id-a.id;});
    var uq={}; rows.forEach(function(r){ if(r.ip) uq[r.ip]=1; }); st.textContent=Object.keys(uq).length+' different visitors, '+rows.length+' page visits, newest first.';
    var fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
    tb.innerHTML=rows.map(function(r){ return '<tr><td class="w">'+esc(fmt.format(new Date(r.created_at)))+'</td><td>'+esc(r.page)+'</td><td>'+esc(r.referrer||'direct')+'</td><td class="w">'+esc(r.ip)+'</td><td data-ip="'+esc(r.ip)+'">'+esc(where(r.ip))+'</td></tr>'; }).join('');
    t.hidden=false;
    var ips=rows.map(function(r){return r.ip;}).filter(function(ip,i,a){return ip&&a.indexOf(ip)===i&&!geo[ip];}).slice(0,40);
    ips.reduce(function(p,ip){ return p.then(function(){ return fetch('https://ipwho.is/'+encodeURIComponent(ip)).then(function(r){return r.json();}).then(function(g){
      if(g&&g.success){ geo[ip]={city:g.city,region:g.region,country:g.country,isp:g.connection&&g.connection.isp}; try{ls.setItem('vgf_geo',JSON.stringify(geo));}catch(e){} }
    }).catch(function(){}); }); }, Promise.resolve()).then(function(){
      Array.prototype.forEach.call(tb.querySelectorAll('td[data-ip]'),function(td){ td.textContent=where(td.getAttribute('data-ip')).replace(/^â€¦$/,''); });
    });
  }).catch(function(){ st.textContent='Could not load the list.'; });
})();
