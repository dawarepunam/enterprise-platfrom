/* Project Workspace JS */
const projId=window.location.pathname.split('/').pop();
let projData={},projTasks=[];
function openModal(id){document.getElementById(id)?.classList.remove('hidden');}
function closeModal(id){document.getElementById(id)?.classList.add('hidden');}
window.openModal=openModal;window.closeModal=closeModal;
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.add('hidden');});

document.querySelectorAll('.tab-item').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-item').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c=>c.classList.add('hidden'));
    btn.classList.add('active');
    const tab=btn.dataset.tab;
    document.getElementById('tab-'+tab)?.classList.remove('hidden');
    if(tab==='kanban')renderKanban();
    if(tab==='files')loadFiles();
    if(tab==='meetings')loadMeetings();
    if(tab==='budget')loadBudget();
    if(tab==='activity')loadActivity();
    if(tab==='team')loadTeamTable();
    if(tab==='risks')loadRisks();
    if(tab==='approvals')loadApprovals();
  });
});

async function loadProject(){
  try{
    const data=await AdminAPI.getProjectById(projId);
    projData=data.project||data;
    renderHero(projData);
    renderDetails(projData);
    loadTasks();
  }catch(err){
    document.getElementById('projName').textContent='Project not found';
    window.showToast('Error',err.message,'error');
  }
}

function renderHero(p){
  document.getElementById('projName').textContent=p.name||p.title||'—';
  document.getElementById('breadProj').textContent=p.name||'Workspace';
  document.getElementById('chatProjName').textContent=p.name+' Chat';
  document.getElementById('projMeta').textContent=`🏢 ${p.department?.name||'—'} · 👤 ${p.manager?.name||p.projectManager?.name||'—'} · 🤝 ${p.client?.name||'—'}`;
  const prog=p.progress||0;
  const days=p.endDate?Math.max(0,Math.ceil((new Date(p.endDate)-new Date())/86400000)):0;
  document.getElementById('phProgress').textContent=prog+'%';
  document.getElementById('phTasks').textContent=p.taskCount||p.tasks?.length||0;
  document.getElementById('phTeam').textContent=p.teamSize||p.members?.length||0;
  document.getElementById('phDays').textContent=days;
  document.getElementById('projBadges').innerHTML=`${window.statusBadge(p.status)} <span class="badge badge-${p.priority==='HIGH'||p.priority==='CRITICAL'?'danger':'warning'}">${p.priority||'MEDIUM'}</span>`;
}

function renderDetails(p){
  document.getElementById('projDetails').innerHTML=`
    <div class="info-row"><span class="info-label">Created By</span><span class="info-val">${p.createdBy?.name||'Admin'}</span></div>
    <div class="info-row"><span class="info-label">Project Manager</span><span class="info-val">${p.manager?.name||p.projectManager?.name||'—'}</span></div>
    <div class="info-row"><span class="info-label">Product Manager</span><span class="info-val">${p.productManager?.name||'—'}</span></div>
    <div class="info-row"><span class="info-label">Department</span><span class="info-val">${p.department?.name||'—'}</span></div>
    <div class="info-row"><span class="info-label">Client</span><span class="info-val">${p.client?.name||'—'}</span></div>
    <div class="info-row"><span class="info-label">Start Date</span><span class="info-val">${window.fmt.date(p.startDate)}</span></div>
    <div class="info-row"><span class="info-label">Deadline</span><span class="info-val">${window.fmt.date(p.endDate||p.deadline)}</span></div>
    <div class="info-row"><span class="info-label">Budget</span><span class="info-val">${window.fmt.currency(p.budget||0)}</span></div>`;
  const prog=p.progress||0;
  const score=p.healthScore||Math.min(100,Math.max(0,prog+(Math.random()*20-10)));
  document.getElementById('projHealth').innerHTML=`
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;font-weight:600">Progress</span><span style="font-size:12px;font-weight:700;color:var(--primary)">${prog}%</span></div>
      ${window.progressBar(prog,prog>=80?'green':prog>=50?'orange':'red')}
    </div>
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;font-weight:600">Health Score</span><span style="font-size:12px;font-weight:700;color:${score>=80?'var(--success)':score>=60?'var(--warning)':'var(--danger)'}">${Math.round(score)}%</span></div>
      ${window.progressBar(score,score>=80?'green':score>=60?'orange':'red')}
    </div>
    <div class="grid-2" style="gap:8px;">
      <div style="background:var(--success-light);border-radius:var(--r-sm);padding:8px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:var(--success)">${p.completedTasks||0}</div><div style="font-size:10px;color:var(--text-4)">Completed</div>
      </div>
      <div style="background:var(--danger-light);border-radius:var(--r-sm);padding:8px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:var(--danger)">${p.delayedTasks||0}</div><div style="font-size:10px;color:var(--text-4)">Delayed</div>
      </div>
    </div>`;
  renderTeamCards(p.members||[]);
  renderProgressChart(prog);
}

function renderTeamCards(members){
  const el=document.getElementById('projTeamList');
  if(!el)return;
  if(!members.length){el.innerHTML='<p style="color:var(--text-4);font-size:13px;">No team members assigned</p>';return;}
  el.innerHTML=members.slice(0,8).map(m=>`
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg);border-radius:var(--r-md);cursor:pointer;" onclick="window.location.href='/admin/users/${m._id||m}'">
      ${window.avatar(m.name||'?',36)}
      <div><div style="font-size:12px;font-weight:600;">${m.name||'Member'}</div><div style="font-size:10px;color:var(--text-4)">${m.role||'Developer'}</div></div>
    </div>`).join('');
}

function renderProgressChart(prog){
  const ctx=document.getElementById('progressChart');if(!ctx)return;
  const weeks=['W1','W2','W3','W4','W5','W6'];
  const step=prog/5;
  const data=weeks.map((_,i)=>Math.min(prog,Math.round(step*i+Math.random()*5)));
  data[data.length-1]=prog;
  new Chart(ctx,{type:'line',data:{labels:weeks,datasets:[{label:'Progress',data,borderColor:'#2563EB',backgroundColor:'rgba(37,99,235,0.1)',fill:true,tension:0.4,borderWidth:2.5,pointRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}}}}});
}

async function loadTasks(){
  try{
    const data=await AdminAPI.getTasks(`?project=${projId}&limit=100`);
    projTasks=data.tasks||data.data||[];
    renderTasksTable(projTasks);
    renderKanban();
    loadAssigneeSelect(projData.members||[]);
  }catch{projTasks=[];}
}

function filterTasks(){const f=document.getElementById('taskFilter')?.value||'';renderTasksTable(f?projTasks.filter(t=>t.status===f):projTasks);}
window.filterTasks=filterTasks;

function renderTasksTable(tasks){
  document.getElementById('projTasksTable').innerHTML=tasks.length?tasks.map(t=>`
    <tr style="cursor:pointer">
      <td><strong>${t.title||t.name||'—'}</strong>${t.description?`<br/><span style="font-size:11px;color:var(--text-4)">${window.fmt.truncate(t.description,50)}</span>`:''}</td>
      <td>${t.assignee?.name?`<div style="display:flex;align-items:center;gap:6px;">${window.avatar(t.assignee.name,26)}<span style="font-size:12px">${t.assignee.name}</span></div>`:'—'}</td>
      <td><span class="kanban-task-priority priority-${(t.priority||'MEDIUM').toLowerCase()}">${t.priority||'MEDIUM'}</span></td>
      <td>${window.fmt.date(t.dueDate||t.deadline)}</td>
      <td>${window.statusBadge(t.status||'PENDING')}</td>
      <td><button class="btn btn-icon btn-sm" onclick="updateTaskStatus('${t._id}')">✏️</button></td>
    </tr>`).join('') :
    '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">No tasks yet</div></div></td></tr>';
}

function renderKanban(){
  const cols=['PENDING','IN_PROGRESS','REVIEW','COMPLETED','BLOCKED'];
  const counts={PENDING:0,IN_PROGRESS:0,REVIEW:0,COMPLETED:0,BLOCKED:0};
  cols.forEach(c=>{const el=document.getElementById('kanban-'+c);if(el)el.innerHTML='';});
  projTasks.forEach(t=>{
    const status=t.status||'PENDING';
    const el=document.getElementById('kanban-'+status);
    if(!el)return;
    counts[status]=(counts[status]||0)+1;
    const p=(t.priority||'MEDIUM').toLowerCase();
    el.insertAdjacentHTML('beforeend',`
      <div class="kanban-task" onclick="updateTaskStatus('${t._id}')">
        <div class="kanban-task-title">${t.title||t.name||'Task'}</div>
        ${t.description?`<div style="font-size:11px;color:var(--text-4);margin-bottom:6px;">${window.fmt.truncate(t.description,50)}</div>`:''}
        <div class="kanban-task-meta">
          <span class="kanban-task-priority priority-${p}">${t.priority||'MEDIUM'}</span>
          <span class="kanban-task-due">${t.assignee?.name?'👤 '+t.assignee.name.split(' ')[0]:''}</span>
        </div>
      </div>`);
  });
  const countMap={PENDING:'kc-todo',IN_PROGRESS:'kc-ip',REVIEW:'kc-rev',COMPLETED:'kc-done',BLOCKED:'kc-blk'};
  Object.entries(countMap).forEach(([s,id])=>{const el=document.getElementById(id);if(el)el.textContent=counts[s]||0;});
}

async function submitTask(){
  const title=document.getElementById('tTitle').value.trim();
  if(!title){window.showToast('Validation','Task title required','error');return;}
  try{
    await AdminAPI.createTask({title,description:document.getElementById('tDesc').value,project:projId,assignee:document.getElementById('tAssignee').value||null,priority:document.getElementById('tPriority').value,dueDate:document.getElementById('tDue').value||null,estimatedHours:document.getElementById('tHours').value||0,status:'PENDING'});
    closeModal('addTaskModal');
    window.showToast('Task Created!',title+' added.','success');
    loadTasks();
  }catch(err){window.showToast('Error',err.message,'error');}
}
window.submitTask=submitTask;

async function updateTaskStatus(id){
  const task=projTasks.find(t=>t._id===id);if(!task)return;
  const statuses=['PENDING','IN_PROGRESS','REVIEW','COMPLETED','BLOCKED'];
  const next=statuses[(statuses.indexOf(task.status||'PENDING')+1)%statuses.length];
  try{await AdminAPI.updateTask(id,{status:next});task.status=next;renderTasksTable(projTasks);renderKanban();window.showToast('Updated','Task moved to '+next,'success');}
  catch(err){window.showToast('Error',err.message,'error');}
}
window.updateTaskStatus=updateTaskStatus;

async function loadFiles(){
  try{const data=await AdminAPI.getFiles(`?project=${projId}`);const files=data.files||data.data||[];
  const iconMap={pdf:'📄',doc:'📝',docx:'📝',xlsx:'📊',png:'🖼️',jpg:'🖼️',mp4:'🎬'};
  document.getElementById('projFilesList').innerHTML=files.length?files.map(f=>{const ext=(f.name||f.filename||'').split('.').pop()?.toLowerCase();return`<div class="doc-card" onclick="window.open('${f.url||f.path||'#'}','_blank')"><div class="doc-icon">${iconMap[ext]||'📎'}</div><div class="doc-name">${f.name||f.filename||'File'}</div><div class="doc-meta">${window.fmt.date(f.createdAt)}</div></div>`;}).join('') : '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📂</div><div class="empty-title">No files uploaded</div></div>';}
  catch{document.getElementById('projFilesList').innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📂</div><div class="empty-title">Could not load files</div></div>';}
}
window.uploadFile=function(){window.showToast('Upload','File upload feature coming soon.','info');};

async function loadMeetings(){
  try{const data=await AdminAPI.getMeetings(`?project=${projId}&limit=20`);const meetings=data.meetings||data.data||[];
  document.getElementById('projMeetingsList').innerHTML=meetings.length?meetings.map(m=>`
    <div class="card card-clickable" style="margin-bottom:4px"><div class="card-body" style="display:flex;align-items:center;gap:16px;padding:12px 16px;">
      <div style="font-size:28px;">📹</div>
      <div style="flex:1;"><div style="font-weight:600">${m.title||m.name||'Meeting'}</div><div style="font-size:11px;color:var(--text-4)">${window.fmt.dateTime(m.startTime||m.date)}</div></div>
      ${window.statusBadge(m.status||'SCHEDULED')}
    </div></div>`).join('') : '<div class="empty-state"><div class="empty-icon">📹</div><div class="empty-title">No meetings scheduled</div></div>';}
  catch{}
}

function loadBudget(){
  const budget=projData.budget||0;const used=projData.usedBudget||budget*0.6;const left=budget-used;
  document.getElementById('budgetTotal').textContent=window.fmt.currency(budget);
  document.getElementById('budgetUsed').textContent=window.fmt.currency(used);
  document.getElementById('budgetLeft').textContent=window.fmt.currency(left);
  const ctx=document.getElementById('budgetChart');if(!ctx)return;
  new Chart(ctx,{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Allocated',data:[budget/6,budget/6,budget/6,budget/6,budget/6,budget/6].map(v=>Math.round(v)),backgroundColor:'rgba(37,99,235,0.2)',borderColor:'#2563EB',borderWidth:2,borderRadius:4},{label:'Spent',data:[used*0.1,used*0.2,used*0.15,used*0.2,used*0.2,used*0.15].map(v=>Math.round(v)),backgroundColor:'rgba(239,68,68,0.6)',borderColor:'#EF4444',borderWidth:2,borderRadius:4}]},options:{responsive:true,scales:{y:{ticks:{callback:v=>'₹'+(v/1000).toFixed(0)+'K'}}}}});
}

async function loadActivity(){
  try{const data=await AdminAPI.getAuditLogs(`?project=${projId}&limit=15`);const logs=data.logs||data.data||[];
  document.getElementById('projTimeline').innerHTML=logs.length?logs.map(l=>`
    <div class="timeline-item"><div class="timeline-dot"></div>
    <div class="timeline-time">${window.fmt.dateTime(l.createdAt)}</div>
    <div class="timeline-title">${l.description||l.action||'Action'}</div>
    <div class="timeline-desc">by ${l.userName||l.user?.name||'—'}</div></div>`).join('') :
    '<div class="empty-state"><div class="empty-icon">⏱️</div><div class="empty-title">No activity yet</div></div>';}
  catch{document.getElementById('projTimeline').innerHTML='<div class="empty-state"><div class="empty-icon">⏱️</div><div class="empty-title">Could not load activity</div></div>';}
}

function loadTeamTable(){
  const members=projData.members||[];
  document.getElementById('projTeamTable').innerHTML=members.length?members.map(m=>`
    <tr onclick="window.location.href='/admin/users/${m._id||''}'" style="cursor:pointer">
      <td><div class="table-user-cell">${window.avatar(m.name||'?',34)}<div><div class="user-name">${m.name||'—'}</div><div class="user-email">${m.email||''}</div></div></div></td>
      <td>${m.role||'Member'}</td>
      <td>${m.taskCount||0}</td>
      <td>${m.completedTasks||0}</td>
      <td>${window.statusBadge(m.status||'ACTIVE')}</td>
    </tr>`).join('') :
    '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No team members</div></div></td></tr>';
}

function loadRisks(){
  const risks=projData.risks||[{title:'Resource constraint',level:'HIGH',description:'Limited developer availability'},{title:'Deadline pressure',level:'MEDIUM',description:'Client expects early delivery'},{title:'Scope creep',level:'LOW',description:'Additional features requested'}];
  document.getElementById('risksList').innerHTML=risks.map(r=>`
    <div class="risk-card ${r.level?.toLowerCase()==='medium'?'medium':r.level?.toLowerCase()==='low'?'low':''}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <strong style="font-size:14px">${r.title||'Risk'}</strong>
        <span class="badge badge-${r.level==='HIGH'?'danger':r.level==='MEDIUM'?'warning':'success'}">${r.level||'MEDIUM'}</span>
      </div>
      <p style="font-size:12px;color:var(--text-3);margin:0">${r.description||''}</p>
    </div>`).join('');
}

function loadApprovals(){
  document.getElementById('approvalsList').innerHTML=`
    <tr><td>Budget Increase Request</td><td>PM Rahul</td><td>Budget</td><td>${window.fmt.date(new Date())}</td><td>${window.statusBadge('PENDING')}</td>
    <td><div style="display:flex;gap:4px;"><button class="btn btn-success btn-sm" onclick="approveItem(this)">✓</button><button class="btn btn-danger btn-sm" onclick="rejectItem(this)">✗</button></div></td></tr>
    <tr><td>Additional Resource</td><td>PM Kumar</td><td>Resource</td><td>${window.fmt.date(new Date())}</td><td>${window.statusBadge('PENDING')}</td>
    <td><div style="display:flex;gap:4px;"><button class="btn btn-success btn-sm" onclick="approveItem(this)">✓</button><button class="btn btn-danger btn-sm" onclick="rejectItem(this)">✗</button></div></td></tr>`;
}
function approveItem(btn){const td=btn.closest('tr').querySelector('td:nth-child(5)');td.innerHTML=window.statusBadge('APPROVED');btn.closest('div').innerHTML='<span style="color:var(--success);font-size:12px;font-weight:600">Approved</span>';window.showToast('Approved','Request approved','success');}
function rejectItem(btn){const td=btn.closest('tr').querySelector('td:nth-child(5)');td.innerHTML=window.statusBadge('REJECTED');btn.closest('div').innerHTML='<span style="color:var(--danger);font-size:12px;font-weight:600">Rejected</span>';window.showToast('Rejected','Request rejected','info');}
window.approveItem=approveItem;window.rejectItem=rejectItem;

function loadAssigneeSelect(members){
  const el=document.getElementById('tAssignee');if(!el)return;
  el.innerHTML='<option value="">Select Assignee</option>'+members.map(m=>`<option value="${m._id||m}">${m.name||'Member'}</option>`).join('');
}

async function sendProjChat(){
  const input=document.getElementById('projChatInput');const msg=input?.value?.trim();
  if(!msg)return;
  const user=JSON.parse(localStorage.getItem('jmkc_user')||'{}');
  const el=document.getElementById('projChatMessages');
  el.insertAdjacentHTML('beforeend',`<div class="chat-msg own"><div class="chat-bubble">${msg}<div class="chat-bubble-time">${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></div></div>`);
  input.value='';el.scrollTop=el.scrollHeight;
}
window.sendProjChat=sendProjChat;

document.addEventListener('DOMContentLoaded',()=>{
  if(!projId||projId==='projects'){window.location.href='/admin/projects';return;}
  loadProject();
});
