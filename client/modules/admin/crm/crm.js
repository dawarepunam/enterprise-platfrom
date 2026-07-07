/* Clients (CRM) JS */
let allClients=[],currentView='card';
function openModal(id){document.getElementById(id)?.classList.remove('hidden');}
function closeModal(id){document.getElementById(id)?.classList.add('hidden');}
window.openModal=openModal;window.closeModal=closeModal;
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.add('hidden');});

async function loadClients(){
  try{
    const [clientsData, usersData] = await Promise.all([
      AdminAPI.getClients('?limit=100&sort=-createdAt').catch(() => ({})),
      AdminAPI.getUsers('?role=CLIENT').catch(() => ({}))
    ]);
    
    let clients = clientsData.enterprises || clientsData.clients || clientsData.data || [];
    
    // Restore demo clients if there are no real CRM clients in the database yet
    if (clients.length === 0) {
      clients = [
        {_id:'demo1',name:'Rahul Mehta',companyName:'TechSoft Solutions',email:'rahul@techsoft.com',phone:'+91 98765 43210',status:'ACTIVE',projectCount:4,totalBudget:1200000,industry:'IT',createdAt:new Date().toISOString(), isUser: false},
        {_id:'demo2',name:'Priya Sharma',companyName:'InfoByte Corp',email:'priya@infobyte.com',phone:'+91 98765 43211',status:'ACTIVE',projectCount:2,totalBudget:800000,industry:'Finance',createdAt:new Date().toISOString(), isUser: false},
        {_id:'demo3',name:'Amit Singh',companyName:'NextGen Systems',email:'amit@nextgen.com',phone:'+91 98765 43212',status:'PROSPECT',projectCount:1,totalBudget:500000,industry:'Healthcare',createdAt:new Date().toISOString(), isUser: false},
      ];
    }

    let usersAsClients = (usersData.users || usersData.data || []).map(u => ({
      _id: u._id,
      companyName: u.department?.name || u.department || u.name,
      contactName: u.name,
      name: u.name,
      email: u.email,
      phone: u.phone,
      status: u.status,
      projectCount: 0,
      totalBudget: 0,
      industry: u.designation || 'Client',
      createdAt: u.createdAt || new Date().toISOString(),
      isUser: true // flag
    }));

    // Deduplicate by email just in case
    const emailSet = new Set(clients.map(c => c.email));
    usersAsClients = usersAsClients.filter(u => !emailSet.has(u.email));

    allClients = [...clients, ...usersAsClients];
    
    updateStats(); renderCards(allClients);
  }catch(e){
    console.warn("Failed to load clients", e);
    loadDemoClients();
  }
}

function loadDemoClients(){
  allClients=[
    {_id:'1',name:'Rahul Mehta',companyName:'TechSoft Solutions',email:'rahul@techsoft.com',phone:'+91 98765 43210',status:'ACTIVE',projectCount:4,totalBudget:1200000,industry:'IT',createdAt:new Date().toISOString()},
    {_id:'2',name:'Priya Sharma',companyName:'InfoByte Corp',email:'priya@infobyte.com',phone:'+91 98765 43211',status:'ACTIVE',projectCount:2,totalBudget:800000,industry:'Finance',createdAt:new Date().toISOString()},
    {_id:'3',name:'Amit Singh',companyName:'NextGen Systems',email:'amit@nextgen.com',phone:'+91 98765 43212',status:'PROSPECT',projectCount:1,totalBudget:500000,industry:'Healthcare',createdAt:new Date().toISOString()},
  ];
  updateStats(); renderCards(allClients);
}

function updateStats(){
  document.getElementById('stTotal').textContent=allClients.length;
  document.getElementById('stActive').textContent=allClients.filter(c=>c.status==='ACTIVE').length;
  document.getElementById('stProjects').textContent=allClients.reduce((s,c)=>s+(c.projectCount||0),0);
  document.getElementById('stRevenue').textContent=window.fmt.currency(allClients.reduce((s,c)=>s+(c.totalBudget||c.budget||0),0));
}

let currentCardFilter = 'total';

function filterByCard(type) {
  if (currentCardFilter === type) currentCardFilter = 'total';
  else currentCardFilter = type;
  
  document.querySelectorAll('.kpi-card').forEach(c => c.style.opacity = '0.6');
  if (currentCardFilter === 'total') document.querySelectorAll('.kpi-card').forEach(c => c.style.opacity = '1');
  else if (currentCardFilter === 'active') document.querySelector('.kpi-card-green').style.opacity = '1';

  filterClients();
}
window.filterByCard = filterByCard;

function filterClients(){
  const q=(document.getElementById('clientSearch')?.value||'').toLowerCase();
  const status=document.getElementById('clientStatusFilter')?.value||'';
  const type=document.getElementById('clientTypeFilter')?.value||'';
  const filtered=allClients.filter(c=>{
    const mq=!q||(c.companyName||c.name||'').toLowerCase().includes(q)||(c.contactName||c.name||'').toLowerCase().includes(q);
    const ms=!status||c.status===status;
    let mt = true;
    if (type === 'SYSTEM_USER') mt = !!c.isUser;
    if (type === 'CRM_RECORD') mt = !c.isUser;

    let mc = true;
    if (currentCardFilter === 'active') mc = c.status === 'ACTIVE';
    return mq&&ms&&mt&&mc;
  });
  if(currentView==='card') renderCards(filtered);
  else renderList(filtered);
}
window.filterClients=filterClients;

function setView(view,btn){
  currentView=view;
  document.querySelectorAll('.view-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('clientsGrid').classList.toggle('hidden',view!=='card');
  document.getElementById('clientsList').classList.toggle('hidden',view!=='list');
  filterClients();
}
window.setView=setView;

function renderCards(clients){
  const el=document.getElementById('clientsGrid');
  if(!clients.length){el.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🤝</div><div class="empty-title">No clients found</div></div>';return;}
  el.innerHTML=clients.map(c=>{
    const initials=window.fmt.initials(c.companyName||c.name||'CL');
    const statusColor=c.status==='ACTIVE'?'var(--success)':c.status==='PROSPECT'?'var(--warning)':'var(--text-4)';
    const link = c.isUser ? `/admin/users/${c._id}` : `/admin/clients/${c._id}`;
    return `
    <div class="client-card" onclick="window.location.href='${link}'">
      <div class="client-card-top">
        <div class="client-avatar">${initials}</div>
        <div style="flex:1">
          <div class="client-name">${c.companyName||c.name||'—'}</div>
          <div class="client-company">👤 ${c.contactName||c.name||'—'} · 🏭 ${c.industry||'—'}</div>
        </div>
        <span class="badge badge-${c.status==='ACTIVE'?'success':c.status==='PROSPECT'?'warning':'gray'}">${c.status||'ACTIVE'}</span>
      </div>
      <div class="client-body">
        <div class="client-stat-row">
          <div class="client-stat"><div class="client-stat-val" style="color:var(--primary)">${c.projectCount||c.projects?.length||0}</div><div class="client-stat-label">Projects</div></div>
          <div class="client-stat"><div class="client-stat-val" style="color:var(--success)">${c.completedProjects||0}</div><div class="client-stat-label">Completed</div></div>
          <div class="client-stat"><div class="client-stat-val" style="color:var(--warning)">${window.fmt.currency(c.totalBudget||c.budget||0).replace('₹','')}</div><div class="client-stat-label">Budget</div></div>
        </div>
        <div style="font-size:12px;color:var(--text-3)">📧 ${c.email||'—'} &nbsp; 📱 ${c.phone||'—'}</div>
      </div>
      <div class="client-footer">
        <span style="font-size:11px;color:var(--text-4)">Since ${window.fmt.date(c.createdAt)}</span>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();window.location.href='${link}'">View →</button>
      </div>
    </div>`;}).join('');
}

function renderList(clients){
  document.getElementById('clientsListBody').innerHTML=clients.map(c=>{
    const link = c.isUser ? `/admin/users/${c._id}` : `/admin/clients/${c._id}`;
    return `
    <tr style="cursor:pointer" onclick="window.location.href='${link}'">
      <td><div class="table-user-cell"><div class="user-avatar-sm">${window.fmt.initials(c.companyName||'CL')}</div><div><div class="user-name">${c.companyName||c.name||'—'}</div><div class="user-email">${c.contactName||''}</div></div></div></td>
      <td>${c.companyName||'—'}</td>
      <td>${c.projectCount||0}</td>
      <td>${window.fmt.currency(c.totalBudget||0)}</td>
      <td>${window.statusBadge(c.status||'ACTIVE')}</td>
      <td>${c.email||'—'}</td>
    </tr>`;
  }).join('');
}

async function submitClient(){
  const company=document.getElementById('cCompany').value.trim();
  const contact=document.getElementById('cContact').value.trim();
  const email=document.getElementById('cEmail').value.trim();
  if(!company||!contact||!email){window.showToast('Validation','Fill all required fields','error');return;}
  try{
    await AdminAPI.createClient({companyName:company,contactName:contact,email,phone:document.getElementById('cPhone').value,website:document.getElementById('cWebsite').value,industry:document.getElementById('cIndustry').value,address:document.getElementById('cAddress').value,budget:document.getElementById('cBudget').value||0,status:document.getElementById('cStatus').value});
    closeModal('addClientModal');window.showToast('Client Added!',company+' added.','success');loadClients();
  }catch(err){window.showToast('Error',err.message,'error');}
}
window.submitClient=submitClient;

document.addEventListener('DOMContentLoaded',loadClients);
