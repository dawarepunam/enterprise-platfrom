(function(){
  const BASE=window.location.origin;
  function tok(){return localStorage.getItem('token')||localStorage.getItem('jmkc_token');}
  function api(p,o={}){return fetch(BASE+'/api'+p,{headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok()},...o}).then(r=>r.ok?r.json():Promise.reject());}
  const sBadge={achieved:'success','in-progress':'info','at-risk':'danger','not-started':'muted'};
  async function load(){
    try{
      const res=await api('/goals?mine=true');const goals=res.data||res||[];
      document.getElementById('gkpiTotal').textContent=goals.length;
      document.getElementById('gkpiAchieved').textContent=goals.filter(g=>g.status==='achieved').length;
      document.getElementById('gkpiInProg').textContent=goals.filter(g=>g.status==='in-progress').length;
      document.getElementById('gkpiAtRisk').textContent=goals.filter(g=>g.status==='at-risk').length;
      const el=document.getElementById('goalsList');
      el.innerHTML=goals.length?goals.map(g=>{
        const p=g.progress||0;const s=(g.status||'not-started').toLowerCase().replace(' ','-');
        const due=g.dueDate?new Date(g.dueDate).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'}):'No deadline';
        return '<div class="goal-card"><div class="goal-title">'+g.title+'</div><div class="goal-meta"><span class="badge badge-'+(sBadge[s]||'muted')+'">'+g.status+'</span><span style="font-size:0.75rem;color:var(--clr-text-muted)">'+g.category+'</span><span style="font-size:0.75rem;color:var(--clr-text-muted)">📅 '+due+'</span></div><div class="goal-progress-lbl"><span>Progress</span><span>'+p+'%</span></div><div class="progress-wrap"><div class="progress-bar" style="width:'+p+'%;background:var(--clr-primary)"></div></div></div>';
      }).join(''):'<div class="empty-state"><div class="empty-state-icon">🎯</div><p>No goals set yet. Add your first goal!</p></div>';
    }catch{document.getElementById('goalsList').innerHTML='<div class="empty-state"><p>Could not load goals</p></div>';}
  }
  document.getElementById('btnSaveGoal')?.addEventListener('click',async()=>{
    const title=document.getElementById('ngTitle')?.value.trim();if(!title)return;
    try{await api('/goals',{method:'POST',body:JSON.stringify({title,category:document.getElementById('ngCat')?.value,dueDate:document.getElementById('ngDue')?.value,description:document.getElementById('ngDesc')?.value})});document.getElementById('newGoalModal').style.display='none';load();}
    catch{alert('Could not save goal');}
  });
  document.addEventListener('DOMContentLoaded',load);
})();
