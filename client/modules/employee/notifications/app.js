(function(){
  const BASE=window.location.origin;
  function tok(){return localStorage.getItem('token')||localStorage.getItem('jmkc_token');}
  function api(p,o={}){return fetch(BASE+'/api'+p,{headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok()},...o}).then(r=>r.ok?r.json():Promise.reject());}
  let all=[];
  const typeIcon={task:'✅',project:'📁',leave:'🏖️',mention:'💬',meeting:'📅',system:'🔔',announcement:'📢',reward:'🏆'};
  const timeAgo=d=>{const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';};
  async function load(){
    try{const res=await api('/notifications?limit=50');all=res.data||res||[];render();}
    catch{document.getElementById('notifList').innerHTML='<div class="empty-state"><p>Could not load notifications</p></div>';}
  }
  function render(){
    const f=document.getElementById('notifFilter')?.value||'';
    let list=all;
    if(f==='unread')list=all.filter(n=>!n.read);
    else if(f)list=all.filter(n=>(n.type||'system')===f);
    const unreadCount=all.filter(n=>!n.read).length;
    document.getElementById('notifSubtitle').textContent=unreadCount?unreadCount+' unread notifications':'All caught up!';
    const el=document.getElementById('notifList');
    el.innerHTML=list.length?list.map(n=>{
      const type=(n.type||'system').toLowerCase();
      return '<div class="notif-item'+(n.read?'':' unread')+'" onclick="markRead(\''+n._id+'\')" data-link="'+(n.link||'')+'"><div class="notif-icon-wrap">'+(typeIcon[type]||'🔔')+'</div><div class="notif-body"><div class="notif-title">'+(n.title||n.subject||'Notification')+'</div><div class="notif-desc">'+(n.body||n.message||'—')+'</div><div class="notif-time">'+(n.createdAt?timeAgo(n.createdAt):'')+'</div></div>'+(n.read?'':'<div class="notif-unread-dot"></div>')+'</div>';
    }).join(''):'<div class="empty-state"><div class="empty-state-icon">🔔</div><h3>No notifications</h3><p>You\'re all caught up!</p></div>';
  }
  window.markRead=async function(id){
    const n=all.find(x=>x._id===id);if(!n)return;
    const link=document.querySelector([data-link])?.dataset.link;
    n.read=true;render();
    try{await api('/notifications/'+id+'/read',{method:'PATCH'});}catch{}
    if(link)window.location=link;
  };
  document.getElementById('btnMarkAll')?.addEventListener('click',async()=>{all.forEach(n=>n.read=true);render();try{await api('/notifications/mark-all-read',{method:'PATCH'});}catch{}});
  document.getElementById('notifFilter')?.addEventListener('change',render);
  document.addEventListener('DOMContentLoaded',load);
})();
