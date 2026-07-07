let allDepts=[];
function openModal(id){document.getElementById(id)?.classList.remove('hidden');}
function closeModal(id){document.getElementById(id)?.classList.add('hidden');}
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.add('hidden');});

async function loadDepts(){
  try {
    const data = await AdminAPI.getDepts('?limit=100');
    allDepts = data.departments || data.data || [];
    
    // Ensure "Project Manager" department exists
    let pmDept = allDepts.find(d => d.name === 'Project Manager' || d.name === 'Project Managers');
    if (!pmDept) {
      try {
        await AdminAPI.createDept({
          name: 'Project Manager',
          code: 'PM001',
          description: 'Project Managers overseeing delivery',
          status: 'ACTIVE'
        });
        // Reload depts after creating
        const refresh = await AdminAPI.getDepts('?limit=100');
        allDepts = refresh.departments || refresh.data || [];
      } catch(e) { console.warn('Failed to auto-create PM dept:', e); }
    }

    // Auto-assign existing managers to this department if not already assigned
    pmDept = allDepts.find(d => d.name === 'Project Manager' || d.name === 'Project Managers');
    if (pmDept) {
      try {
        const users = await AdminAPI.getUsers('?role=MANAGER');
        const managers = users.users || users.data || [];
        for (const m of managers) {
          if (!m.department || m.department !== pmDept.name) {
            await AdminAPI.updateUser(m._id, { department: pmDept.name });
          }
        }
      } catch(e) {}
    }
    
    // Fix employee counts (augment data if backend doesn't return count)
    try {
      const usersRes = await AdminAPI.getUsers('?limit=500');
      const allUsers = usersRes.data || usersRes.users || [];
      allDepts.forEach(d => {
         const matched = allUsers.filter(u => {
           const dName = d.name.toLowerCase();
           const uDept = typeof u.department === 'string' ? u.department.toLowerCase() : (u.department && u.department.name ? u.department.name.toLowerCase() : '');
           const uRole = (u.role || '').toLowerCase();
           
           if (uDept === dName) return true;
           if (dName === 'hr' && uRole === 'hr') return true;
           if ((dName === 'project manager' || dName === 'project managers') && uRole.includes('manager')) return true;
           if (dName === 'marketing' && uRole.includes('marketing')) return true;
           if (dName === 'development' && (uRole.includes('dev') || (u.designation||'').toLowerCase().includes('dev'))) return true;
           return false;
         });
         if (matched.length > (d.employeeCount || 0)) d.employeeCount = matched.length;
      });
    } catch(e) {}

    updateStats(); renderCards(allDepts); loadUsers();
  } catch { loadDemo(); }
}

function loadDemo(){
  allDepts=[
    {_id:'1',name:'Engineering',description:'Software development and IT operations',employeeCount:45,activeProjects:12,performanceScore:92,status:'ACTIVE',head:{name:'Rahul Sharma'}},
    {_id:'2',name:'Design',description:'UI/UX, graphic design and branding',employeeCount:15,activeProjects:8,performanceScore:88,status:'ACTIVE',head:{name:'Priya Patil'}},
    {_id:'3',name:'Sales & Marketing',description:'Customer acquisition and brand awareness',employeeCount:25,activeProjects:5,performanceScore:85,status:'ACTIVE',head:{name:'Amit Kumar'}},
    {_id:'4',name:'Human Resources',description:'Talent acquisition and employee management',employeeCount:8,activeProjects:2,performanceScore:90,status:'ACTIVE',head:{name:'Neha Singh'}},
    {_id:'5',name:'Project Manager',description:'Project Managers overseeing delivery',employeeCount:5,activeProjects:15,performanceScore:95,status:'ACTIVE',head:{name:'Vikram Joshi'}}
  ];
  updateStats(); renderCards(allDepts);
}

function updateStats(){
  document.getElementById('stTotal').textContent=allDepts.length;
  document.getElementById('stEmployees').textContent=allDepts.reduce((s,d)=>s+(d.employeeCount||0),0);
  document.getElementById('stProjects').textContent=allDepts.reduce((s,d)=>s+(d.activeProjects||0),0);
  const avgP=allDepts.length?allDepts.reduce((s,d)=>s+(d.performanceScore||85),0)/allDepts.length:0;
  document.getElementById('stPerf').textContent=Math.round(avgP)+'%';
}

function filterDepts(){
  const q=(document.getElementById('deptSearch')?.value||'').toLowerCase();
  const filtered=allDepts.filter(d=>(d.name||'').toLowerCase().includes(q)||(d.description||'').toLowerCase().includes(q));
  renderCards(filtered);
}

function renderCards(depts){
  const el=document.getElementById('deptGrid');
  if(!depts.length){el.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏢</div><div class="empty-title">No departments found</div></div>';return;}
  const icons=['💻','🎨','📈','👥','💰','🎧'];
  el.innerHTML=depts.map((d,i)=>`
    <div class="dept-card" onclick="window.location.href='/admin/departments/${d._id}'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="dept-icon">${icons[i%icons.length]}</div>
        ${window.statusBadge(d.status||'ACTIVE')}
      </div>
      <div class="dept-name">${d.name}</div>
      <div class="dept-desc">${window.fmt.truncate(d.description||'No description',60)}</div>
      <div class="dept-stats">
        <div><div class="dept-stat-val" style="color:var(--primary)">${d.employeeCount||0}</div><div class="dept-stat-label">Employees</div></div>
        <div><div class="dept-stat-val" style="color:var(--success)">${d.activeProjects||0}</div><div class="dept-stat-label">Projects</div></div>
      </div>
      <div class="dept-footer">
        <div class="dept-head">
          ${window.avatar(d.head?.name||'?',24)}
          <span class="dept-head-name">${d.head?.name||d.headName||'Not Assigned'}</span>
        </div>
        <div style="font-size:11px;color:var(--text-4);font-weight:600">Perf: <span style="color:${(d.performanceScore||85)>=80?'var(--success)':'var(--warning)'}">${d.performanceScore||85}%</span></div>
      </div>
    </div>`).join('');
}

async function submitDept(){
  const name=document.getElementById('dName').value.trim();
  if(!name){window.showToast('Validation','Department name is required','error');return;}
  try{
    const code = name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100);
    await AdminAPI.createDept({name,code,description:document.getElementById('dDesc').value,head:document.getElementById('dHead').value||null,status:document.getElementById('dStatus').value});
    closeModal('addDeptModal');window.showToast('Created',name+' department added.','success');loadDepts();
  }catch(err){window.showToast('Error',err.message,'error');}
}

async function loadUsers(){
  try{
    const data=await AdminAPI.getUsers('?role=MANAGER,ADMIN,HR&limit=100');
    const users=data.users||data.data||[];
    const el=document.getElementById('dHead');
    if(el)el.innerHTML='<option value="">Select User</option>'+users.map(u=>`<option value="${u._id}">${u.name}</option>`).join('');
  }catch{}
}
document.addEventListener('DOMContentLoaded',loadDepts);