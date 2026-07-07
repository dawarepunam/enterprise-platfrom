/* Projects JS */
let allProjects=[], currentStatus='', currentView='card';
function openModal(id){document.getElementById(id)?.classList.remove('hidden');}
function closeModal(id){document.getElementById(id)?.classList.add('hidden');}
window.openModal=openModal;window.closeModal=closeModal;
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.add('hidden');});

async function loadProjects(){
  try{
    const data=await AdminAPI.getProjects('?limit=500&sort=-createdAt');
    allProjects=data.projects||data.data||[];
    updateCounts(); applyFilters(); loadSelectOptions();
  }catch(err){
    document.getElementById('projectsGrid').innerHTML=`<div style="padding:40px;text-align:center;color:var(--danger);grid-column:1/-1">Failed to load: ${err.message}</div>`;
  }
}

function getGroup(status) {
  const s = (status || '').toLowerCase();
  if (['active', 'assigned', 'in_progress', 'in progress'].includes(s)) return 'IN_PROGRESS';
  if (s === 'completed') return 'COMPLETED';
  if (s === 'delayed') return 'DELAYED';
  if (['draft', 'planning'].includes(s)) return 'DRAFT';
  if (['on hold', 'on_hold'].includes(s)) return 'ON_HOLD';
  return 'OTHER';
}

function updateCounts(){
  const cnt={all:allProjects.length,active:0,completed:0,delayed:0,draft:0,onhold:0};
  allProjects.forEach(p=>{
    const g = getGroup(p.status);
    if(g==='IN_PROGRESS') cnt.active++;
    else if(g==='COMPLETED') cnt.completed++;
    else if(g==='DELAYED') cnt.delayed++;
    else if(g==='DRAFT') cnt.draft++;
    else if(g==='ON_HOLD') cnt.onhold++;
  });
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('cnt-all',cnt.all); set('cnt-active',cnt.active); set('cnt-completed',cnt.completed);
  set('cnt-delayed',cnt.delayed); set('cnt-draft',cnt.draft); set('cnt-hold',cnt.onhold);
}

function setStatus(btn,status){
  document.querySelectorAll('.proj-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); currentStatus=status; applyFilters();
}
window.setStatus=setStatus;

function setView(view){
  currentView=view;
  document.getElementById('cardViewBtn').classList.toggle('active',view==='card');
  document.getElementById('listViewBtn').classList.toggle('active',view==='list');
  document.getElementById('projectsGrid').classList.toggle('hidden',view!=='card');
  document.getElementById('projectsList').classList.toggle('hidden',view!=='list');
  applyFilters();
}
window.setView=setView;

function clearFilters(){
  document.getElementById('filterDept').value='';
  document.getElementById('filterPM').value='';
  document.getElementById('projSearch').value='';
  applyFilters();
}
window.clearFilters=clearFilters;

function applyFilters(){
  const q=(document.getElementById('projSearch')?.value||'').toLowerCase();
  const dept=document.getElementById('filterDept')?.value||'';
  const pm=document.getElementById('filterPM')?.value||'';
  const filtered=allProjects.filter(p=>{
    const g=getGroup(p.status);
    const ms=!currentStatus||g===currentStatus;
    const pName=String(p.projectName||p.name||'');
    const mq=!q||pName.toLowerCase().includes(q)||(p.description||'').toLowerCase().includes(q)||(p.clientName||'').toLowerCase().includes(q);
    const pDept=p.department?.name||p.department||'';
    const md=!dept||pDept.toLowerCase().includes(dept.toLowerCase())||pDept===dept;
    const pMgr=p.managerId||p.assignedManager||'';
    const mpm=!pm||String(pMgr)===pm||String(p.manager||'').toLowerCase().includes(pm.toLowerCase());
    return ms&&mq&&md&&mpm;
  });
  if(currentView==='card') renderCards(filtered);
  else renderList(filtered);
}
window.applyFilters=applyFilters;

const statusColors={IN_PROGRESS:'#2563EB',COMPLETED:'#22C55E',DELAYED:'#EF4444',DRAFT:'#94A3B8',ON_HOLD:'#F59E0B'};

function renderCards(projects){
  const el=document.getElementById('projectsGrid');
  if(!projects.length){
    el.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📁</div><div class="empty-title">No projects found</div><div class="empty-desc">Try different filters or create a new project</div></div>';
    return;
  }
  const sColors={'Active':'#2563EB','Assigned':'#7C3AED','Completed':'#22C55E','Delayed':'#EF4444','Draft':'#94A3B8','Planning':'#64748B','On Hold':'#F59E0B','Cancelled':'#6B7280'};
  el.innerHTML=projects.map(p=>{
    const prog=p.progress||0;
    const name=p.projectName||p.name||'Untitled';
    const color=sColors[p.status]||'#94A3B8';
    const deadline=p.deadline||p.dueDate||p.endDate;
    const isOverdue=deadline&&new Date(deadline)<new Date()&&p.status!=='Completed';
    const daysLeft=deadline?Math.ceil((new Date(deadline)-new Date())/86400000):null;
    const teamCount=(p.teamMemberIds||p.teamMembers||[]).length;
    return `
    <div class="proj-card" onclick="window.location.href='/admin/projects/${p._id}'">
      <div class="proj-card-top">
        <div>
          <div class="proj-card-name">${name}</div>
          <div class="proj-card-meta">🏢 ${p.department||'—'} · 👤 ${p.manager||'—'}</div>
        </div>
        <span class="badge badge-${getBadgeType(p.status)}">${p.status||'Draft'}</span>
      </div>
      <div class="proj-card-body">
        <div class="proj-card-stat-row">
          <div class="proj-card-stat"><div class="proj-card-stat-val" style="color:var(--primary)">${p.taskCount||0}</div><div class="proj-card-stat-label">Tasks</div></div>
          <div class="proj-card-stat"><div class="proj-card-stat-val" style="color:var(--success)">${p.completedTasks||0}</div><div class="proj-card-stat-label">Done</div></div>
          <div class="proj-card-stat"><div class="proj-card-stat-val" style="color:var(--info)">${teamCount}</div><div class="proj-card-stat-label">Team</div></div>
          <div class="proj-card-stat"><div class="proj-card-stat-val" style="color:${color}">${prog}%</div><div class="proj-card-stat-label">Progress</div></div>
        </div>
        <div style="margin-bottom:6px;">${window.progressBar(prog,prog>=80?'green':prog>=50?'orange':'red')}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-4);">
          <span>💰 ${window.fmt.currency(p.budget||0)}</span>
          <span>🤝 ${p.clientName||'—'}</span>
        </div>
      </div>
      <div class="proj-card-footer">
        <span class="proj-deadline ${isOverdue?'overdue':''}">
          ${isOverdue?'⚠️ Overdue':daysLeft!==null?(daysLeft>0?`⏰ ${daysLeft}d left`:'Due Today'):'No deadline'}
        </span>
        <div style="font-size:11px;color:var(--text-4);">Priority: <strong>${p.priority||'Medium'}</strong></div>
      </div>
    </div>`;
  }).join('');
}

function renderList(projects){
  const tbody=document.getElementById('projectsListBody');
  tbody.innerHTML=projects.map(p=>`
    <tr onclick="window.location.href='/admin/projects/${p._id}'" style="cursor:pointer">
      <td><strong>${p.projectName||p.name||'—'}</strong><br/><span style="font-size:11px;color:var(--text-4)">${(p.description||'').slice(0,50)}</span></td>
      <td>${p.department||'—'}</td>
      <td>${p.manager||'—'}</td>
      <td>${p.clientName||'—'}</td>
      <td style="min-width:120px">${window.progressBar(p.progress||0)} <span style="font-size:11px">${p.progress||0}%</span></td>
      <td>${window.fmt.currency(p.budget||0)}</td>
      <td>${window.fmt.date(p.deadline||p.dueDate)}</td>
      <td>${window.statusBadge(p.status)}</td>
    </tr>`).join('');
}

function getBadgeType(s){const m={IN_PROGRESS:'info',COMPLETED:'success',DELAYED:'danger',DRAFT:'gray',ON_HOLD:'warning'};return m[s]||'gray';}
function formatStatus(s){const m={IN_PROGRESS:'Active',COMPLETED:'Completed',DELAYED:'Delayed',DRAFT:'Draft',ON_HOLD:'On Hold'};return m[s]||s||'—';}

async function submitProject(){
  const name=document.getElementById('pName').value.trim();
  const dept=document.getElementById('pDept').value;
  const pm=document.getElementById('pPM').value;
  const start=document.getElementById('pStart').value;
  const end=document.getElementById('pEnd').value;
  if(!name){window.showToast('Validation','Project name is required','error');return;}
  try{
    const pmUser=document.getElementById('pPM');
    const pmName=pmUser?.options[pmUser?.selectedIndex]?.text||'';
    const clientSelect=document.getElementById('pClient');
    const selectedClient=clientSelect?.selectedOptions?.[0] || null;
    const clientName=clientSelect?.value && selectedClient ? selectedClient.textContent.trim() : '';
    const result=await AdminAPI.createProject({
      projectName:name, description:document.getElementById('pDesc').value,
      department:dept, managerId:pm, manager:pmName,
      clientId:clientSelect?.value||'', clientName:clientName,
      budget:Number(document.getElementById('pBudget').value)||0,
      startDate:start, deadline:end, dueDate:end,
      priority:document.getElementById('pPriority').value,
      status:document.getElementById('pStatus').value||'Draft'
    });
    closeModal('addProjectModal');
    const newProj=result.data||result.project;
    if(newProj) allProjects.unshift(newProj);
    window.showToast('Project Created!',`${name} created successfully.`,'success');
    updateCounts(); applyFilters();
  }catch(err){window.showToast('Error',err.message,'error');}
}
window.submitProject=submitProject;

async function loadSelectOptions(){
  try{
    const[deptData,pmData,clientData,enterpriseData,clientUsersData]=await Promise.allSettled([
      AdminAPI.getDepts('?limit=50'),
      AdminAPI.getUsers('?role=MANAGER&limit=50'),
      AdminAPI.getClients('?limit=500'),
      AdminAPI.getEnterpriseClients('?limit=500'),
      AdminAPI.getUsers('?role=CLIENT&limit=500')
    ]);
    if(deptData.status==='fulfilled'){
      const depts=deptData.value.departments||deptData.value.data||[];
      ['filterDept','pDept'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=(id==='filterDept'?'<option value="">All Departments</option>':'<option value="">Select Department</option>')+depts.map(d=>`<option value="${d._id}">${d.name}</option>`).join('');});
    }
    if(pmData.status==='fulfilled'){
      const pms=pmData.value.users||pmData.value.data||[];
      ['filterPM','pPM'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=(id==='filterPM'?'<option value="">All PMs</option>':'<option value="">Select PM</option>')+pms.map(u=>`<option value="${u._id}">${u.name}</option>`).join('');});
    }
    const clientSources=[
      clientData.status==='fulfilled' ? (clientData.value.clients||clientData.value.data||[]) : [],
      enterpriseData.status==='fulfilled' ? (enterpriseData.value.enterprises||enterpriseData.value.data||[]) : [],
      clientUsersData.status==='fulfilled' ? (clientUsersData.value.users||clientUsersData.value.data||[]) : []
    ];
    const clients=dedupeClientOptions(clientSources.flat());
    if(clients.length){
      const el=document.getElementById('pClient');
      if(el)el.innerHTML='<option value="">Select Client</option>'+clients.map(c=>`<option value="${escapeAttr(c._id)}">${escapeHtml(c.label)}</option>`).join('');
    }
  }catch{}
}

function dedupeClientOptions(items){
  const map=new Map();
  items.forEach(item=>{
    const label=String(item.name||item.companyName||item.clientName||item.title||item.email||'').trim();
    if(!label) return;
    const key=String(item._id||item.email||label).trim();
    if(!map.has(key)) map.set(key,{_id:item._id||key,label});
  });
  return Array.from(map.values()).sort((a,b)=>a.label.localeCompare(b.label));
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function escapeAttr(value=''){
  return escapeHtml(value);
}

// Handle ?create=1 query param
if(new URLSearchParams(window.location.search).get('create')==='1'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>openModal('addProjectModal'),800));
}
document.addEventListener('DOMContentLoaded',loadProjects);
