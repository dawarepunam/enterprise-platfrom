(function(){
  const BASE=window.location.origin;
  function tok(){return localStorage.getItem('token')||localStorage.getItem('jmkc_token');}
  function api(p){return fetch(BASE+'/api'+p,{headers:{Authorization:'Bearer '+tok()}}).then(r=>r.ok?r.json():Promise.reject());}
  let all=[];
  async function load(){
    try{const res=await api('/announcements?limit=30');all=res.data||res||[];render();}
    catch{document.getElementById('annList').innerHTML='<div class="empty-state"><div class="empty-state-icon">📢</div><p>Could not load announcements</p></div>';}
  }
  function render(){
    const f=document.getElementById('annFilter')?.value||'';
    const list=f?all.filter(a=>(a.type||'general').toLowerCase()===f):all;
    const el=document.getElementById('annList');
    el.innerHTML=list.length?list.map(a=>{
      const t=(a.type||'general').toLowerCase();
      const pin=a.pinned?'📌 ':t==='important'?'🔴 ':t==='event'?'🎉 ':'📢 ';
      const d=a.createdAt?new Date(a.createdAt).toLocaleDateString('en-IN',{month:'long',day:'numeric',year:'numeric'}):'';
      return '<div class="ann-card '+t+'"><div class="ann-title">'+pin+(a.title||'Announcement')+'</div><div class="ann-body">'+(a.body||a.content||a.message||'—')+'</div><div class="ann-footer"><span>👤 '+( a.postedBy?.name||a.author?.name||'Admin')+'</span><span>📅 '+d+'</span>'+( t!=='general'?'<span class="badge badge-'+(t==='important'?'danger':'success')+'">'+t.charAt(0).toUpperCase()+t.slice(1)+'</span>':'')+'</div></div>';
    }).join(''):'<div class="empty-state"><div class="empty-state-icon">📢</div><p>No announcements found</p></div>';
  }
  document.addEventListener('DOMContentLoaded',()=>{load();document.getElementById('annFilter')?.addEventListener('change',render);});
})();
