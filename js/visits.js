(function(){
  var B='https://abacus.jasoncameron.dev/', K='varrigreenfarm-com/visits';
  var ls=window.localStorage, ss=window.sessionStorage, q=location.search+location.hash;
  try{
    if(/[?&#]me\b/.test(q)){ ls.setItem('vgf_owner','1'); owner=true; }
    if(/[?&#]notme\b/.test(q)){ ls.removeItem('vgf_owner'); }
  }catch(e){}
  var owner=false, done=false;
  try{ owner=ls.getItem('vgf_owner')==='1'; done=ss.getItem('vgf_counted')==='1'; }catch(e){}
  var local=/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)||location.protocol==='file:';
  var bot=navigator.webdriver||/bot|crawl|spider|slurp|headless/i.test(navigator.userAgent);
  var hit=!(owner||done||local||bot);
  if(!(owner||local||bot)){ try{ fetch('https://bgaldjnsiboqivfhwjtt.supabase.co/rest/v1/rpc/log_visit',{method:'POST',keepalive:true,headers:{'apikey':'sb_publishable_ylx3X2czR4tHzm4lbf1sUw_LxRnnIsd','Authorization':'Bearer sb_publishable_ylx3X2czR4tHzm4lbf1sUw_LxRnnIsd','Content-Type':'application/json'},body:JSON.stringify({p_page:location.pathname,p_ref:document.referrer||''})}).catch(function(){}); }catch(e){} }
  var el=document.getElementById('visits'), box=el&&el.closest('.visits');
  if(box&&owner){ box.style.display='contents'; box.style.visibility='visible'; var fi=el.parentNode, a=document.createElement('a'); a.href='/visitors.html'; a.title='See who visited'; while(fi.firstChild){ a.appendChild(fi.firstChild); } fi.appendChild(a); }
  var key=null; try{ key=ls.getItem('vgf_vkey'); }catch(e){}
  if(el&&owner&&key){ var P='sb_publishable_ylx3X2czR4tHzm4lbf1sUw_LxRnnIsd';
    fetch('https://bgaldjnsiboqivfhwjtt.supabase.co/rest/v1/rpc/get_visits',{method:'POST',headers:{'apikey':P,'Authorization':'Bearer '+P,'Content-Type':'application/json'},body:JSON.stringify({p_pass:key})})
    .then(function(r){return r.json();}).then(function(rows){ if(!Array.isArray(rows)) return; var u={}; rows.forEach(function(r){ if(r.ip) u[r.ip]=1; }); el.textContent=Object.keys(u).length.toLocaleString('en-US'); }).catch(function(){});
  }
})();
