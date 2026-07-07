let allTasks=[],taskStatus='',pg=1,ppg=15;
async function loadTasks(){
  try{
    showLoader();
    const data=await AdminAPI.getTasks('?limit=500&sort=-createdAt');
    allTasks=data.tasks||data.data||[];
    renderStats(allTasks);
    applyTaskFilters();
    loadProjects();
  }catch(err){
    document.getElementById('taskTableBody').innerHTML=`<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--danger)">Failed to load tasks: ${err.message}</td></tr>`;
  }
}
function showLoader(){
  document.getElementById('taskTableBody').innerHTML='<tr><td colspan="6" style="text-align:center;padding:40px;"><div class="loader-spinner" style="margin:0 auto;"></div></td></tr>';
}
function renderStats(tasks){
  const todo=tasks.filter(t=>t.status==='To Do'||t.status==='TODO').length;
  const inprog=tasks.filter(t=>t.status==='In Progress'||t.status==='IN_PROGRESS').length;
  const done=tasks.filter(t=>t.status==='Completed'||t.status==='Approved'||t.status==='COMPLETED').length;
  const delayed=tasks.filter(t=>t.dueDate&&new Date(t.dueDate)<new Date()&&!['Completed','Approved'].includes(t.status)).length;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('cntTodo',todo); set('cntProgress',inprog); set('cntDone',done); set('cntDelayed',delayed);
}
function setTaskStatus(btn,st){
  document.querySelectorAll('.proj-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); taskStatus=st; pg=1; applyTaskFilters();
}
window.setTaskStatus=setTaskStatus;
function getTaskGroup(status) {
  const s = (status || '').toLowerCase();
  if (['pending', 'to do', 'todo'].includes(s)) return 'PENDING';
  if (['in progress', 'in_progress', 'active'].includes(s)) return 'IN_PROGRESS';
  if (['review', 'in review'].includes(s)) return 'REVIEW';
  if (['completed', 'approved', 'done'].includes(s)) return 'COMPLETED';
  if (['blocked', 'on hold', 'on_hold'].includes(s)) return 'BLOCKED';
  return 'OTHER';
}

function applyTaskFilters(){
  const q=(document.getElementById('taskSearch')?.value||'').toLowerCase();
  const proj=document.getElementById('filterProj')?.value||'';
  const prio=document.getElementById('filterPrio')?.value||'';
  const filtered=allTasks.filter(t=>{
    const g=getTaskGroup(t.status);
    const ms=!taskStatus||g===taskStatus;
    const mq=!q||(t.title||'').toLowerCase().includes(q)||(t.assignee||t.assigneeName||'').toLowerCase().includes(q);
    const projId=t.projectId||t.project?._id||t.project||'';
    const mp=!proj||String(projId)===proj;
    const mpr=!prio||(prio==='HIGH'?(t.priority==='HIGH'||t.priority==='CRITICAL'):t.priority===prio);
    return ms&&mq&&mp&&mpr;
  });
  document.getElementById('taskCount').textContent=` (${filtered.length})`;
  renderTable(filtered);
}
window.applyTaskFilters=applyTaskFilters;
function renderTable(tasks){
  const start=(pg-1)*ppg;
  const paged=tasks.slice(start,start+ppg);
  if(!paged.length){
    document.getElementById('taskTableBody').innerHTML='<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">No tasks found</div></div></td></tr>';
    document.getElementById('taskPageBtns').innerHTML='';
    return;
  }
  const prioColor={HIGH:'var(--danger)',CRITICAL:'#7C3AED',MEDIUM:'var(--warning)',LOW:'var(--text-4)'};
  document.getElementById('taskTableBody').innerHTML=paged.map(t=>{
    const projId=t.projectId||t.project?._id||t.project||'';
    const assigneeName=t.assignee?.name||t.assignee||t.assigneeName||'—';
    const isOverdue=t.dueDate&&new Date(t.dueDate)<new Date()&&!['Completed','Approved'].includes(t.status);
    return `<tr style="cursor:pointer" onclick="window.open('/admin/projects/${projId}/tasks/${t._id}', '_blank')">
      <td>
        <div style="font-weight:600;font-size:13px">${t.title||'—'}</div>
        ${t.description?`<div style="font-size:11px;color:var(--text-4)">${t.description.slice(0,60)}</div>`:''}
      </td>
      <td><span style="font-size:12px;color:var(--primary);font-weight:600;">${t.projectName||t.project?.name||'—'}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          ${window.avatar(assigneeName,26)}
          <span style="font-size:12px">${assigneeName}</span>
        </div>
      </td>
      <td><span style="font-weight:700;font-size:12px;color:${prioColor[t.priority]||'var(--text-3)'}">${t.priority||'MEDIUM'}</span></td>
      <td style="${isOverdue?'color:var(--danger);font-weight:600;':''}">${window.fmt.date(t.dueDate||t.deadline)}${isOverdue?' ⚠️':''}</td>
      <td>${window.statusBadge(t.status)}</td>
    </tr>`;
  }).join('');
  const pages=Math.ceil(tasks.length/ppg);
  document.getElementById('taskPageBtns').innerHTML=Array.from({length:Math.min(pages,10)},(_,i)=>`<button class="page-btn ${i+1===pg?'active':''}" onclick="pg=${i+1};applyTaskFilters()">${i+1}</button>`).join('');
}
async function loadProjects(){
  try{
    const data=await AdminAPI.getProjects('?limit=200');
    const ps=data.projects||data.data||[];
    const el=document.getElementById('filterProj');
    if(el)el.innerHTML='<option value="">All Projects</option>'+ps.map(p=>`<option value="${p._id}">${p.projectName||p.name}</option>`).join('');
  }catch{}
}
document.addEventListener('DOMContentLoaded',loadTasks);