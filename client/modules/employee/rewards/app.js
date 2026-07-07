(function(){
  const BASE=window.location.origin;
  function tok(){return localStorage.getItem('token')||localStorage.getItem('jmkc_token');}
  function api(p){return fetch(BASE+'/api'+p,{headers:{Authorization:'Bearer '+tok()}}).then(r=>r.ok?r.json():Promise.reject());}
  const defaultBadges=[{icon:'⭐',name:'Star Employee'},{icon:'🚀',name:'Fast Finisher'},{icon:'💪',name:'Never Late'},{icon:'🧠',name:'Problem Solver'},{icon:'🤝',name:'Team Player'},{icon:'🔥',name:'On Fire'}];
  async function load(){
    try{
      const [rRes,kRes]=await Promise.all([api('/rewards/me').catch(()=>({data:{}})),api('/kudos?received=true').catch(()=>({data:[]}))]);
      const r=rRes.data||rRes||{};const kudos=kRes.data||kRes||[];
      document.getElementById('rPoints').textContent=r.points||0;
      document.getElementById('rBadges').textContent=(r.badges||[]).length;
      document.getElementById('rKudos').textContent=kudos.length;
      document.getElementById('rRank').textContent=r.rank?'#'+r.rank:'—';
      const badges=r.badges?.length?r.badges:defaultBadges;
      document.getElementById('badgeGrid').innerHTML=badges.map(b=>'<div class="badge-item"><div class="badge-icon">'+( b.icon||b.emoji||'🎖️')+'</div><div class="badge-name">'+( b.name||b.title||'Badge')+'</div></div>').join('');
      document.getElementById('kudosList').innerHTML=kudos.length?kudos.map(k=>'<div class="kudo-item"><div class="avatar avatar-sm">'+( (k.from?.name||'?')[0])+'</div><div><div class="kudo-from">'+(k.from?.name||'Teammate')+'</div><div class="kudo-msg">'+( k.message||'Gave you kudos! ❤️')+'</div></div></div>').join(''):'<div class="empty-state"><p>No kudos yet — keep up the great work!</p></div>';
    }catch{document.getElementById('badgeGrid').innerHTML=defaultBadges.map(b=>'<div class="badge-item"><div class="badge-icon">'+b.icon+'</div><div class="badge-name">'+b.name+'</div></div>').join('');}
  }
  document.addEventListener('DOMContentLoaded',load);
})();
