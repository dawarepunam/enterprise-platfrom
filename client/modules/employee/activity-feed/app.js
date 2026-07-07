(function(){
  const BASE=window.location.origin;
  function tok(){return localStorage.getItem('token')||localStorage.getItem('jmkc_token');}
  function api(p){return fetch(BASE+'/api'+p,{headers:{Authorization:'Bearer '+tok()}}).then(r=>r.ok?r.json():Promise.reject());}
  const icons={task:'✅',comment:'💬',time:'⏱',login:'🔐',status:'🔄',project:'📁',leave:'🏖️',file:'📎',default:'⚡'};
  const timeAgo=d=>{const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';};
  async function load(){
    const f=document.getElementById('actFilter')?.value||'';
    try{
      const res=await api('/activity?mine=true&limit=50'+(f?'&type='+f:''));
      const items=res.data||res||[];
      const el=document.getElementById('actFeed');
      let lastDate='',html='';
      items.forEach(a=>{
        const d=a.createdAt?new Date(a.createdAt).toLocaleDateString('en-IN',{weekday:'long',month:'long',day:'numeric'}):'';
        if(d&&d!==lastDate){html+='<div class="act-date-header">'+d+'</div>';lastDate=d;}
        const type=(a.type||a.action||'default').toLowerCase();
        const icon=icons[type]||icons.default;
        html+='<div class="act-item"><div class="act-dot">'+icon+'</div><div class="act-content"><div class="act-text">'+(a.description||a.text||a.action||'Activity')+'</div><div class="act-meta">'+(a.createdAt?timeAgo(a.createdAt):'')+(a.project?.name?' · '+a.project.name:'')+'</div></div></div>';
      });
      el.innerHTML=html||'<div class="empty-state"><div class="empty-state-icon">⚡</div><h3>No activity yet</h3><p>Start working to see your activity here!</p></div>';
    }catch{document.getElementById('actFeed').innerHTML='<div class="empty-state"><p>Could not load activity</p></div>';}
  }
  document.addEventListener('DOMContentLoaded',()=>{load();document.getElementById('actFilter')?.addEventListener('change',load);});
})();
