(function(){
  var B='https://abacus.jasoncameron.dev/', K='varrigreenfarm-com/visits';
  var ls=window.localStorage, ss=window.sessionStorage, q=location.search+location.hash;
  try{
    if(/[?&#]me\b/.test(q)){ ls.setItem('vgf_owner','1'); owner=true; alert('This browser is now marked as yours. Your visits will not be counted.'); }
    if(/[?&#]notme\b/.test(q)){ ls.removeItem('vgf_owner'); }
  }catch(e){}
  var owner=false, done=false;
  try{ owner=ls.getItem('vgf_owner')==='1'; done=ss.getItem('vgf_counted')==='1'; }catch(e){}
  var local=/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)||location.protocol==='file:';
  var bot=navigator.webdriver||/bot|crawl|spider|slurp|headless/i.test(navigator.userAgent);
  var hit=!(owner||done||local||bot);
  fetch(B+(hit?'hit/':'get/')+K).then(function(r){return r.json();}).then(function(d){
    if(hit){ try{ss.setItem('vgf_counted','1');}catch(e){} }
    var el=document.getElementById('visits');
    if(el&&owner&&typeof d.value==='number'){ el.parentNode.style.display='block'; el.textContent=d.value.toLocaleString('en-US'); el.parentNode.style.visibility='visible'; }
  }).catch(function(){});
})();
