/* Leave JS */
let allLeaves=[],leaveStatus='',leavePg=1,leavePpg=15;
function openModal(id){document.getElementById(id)?.classList.remove('hidden');}
function closeModal(id){document.getElementById(id)?.classList.add('hidden');}
window.openModal=openModal;window.closeModal=closeModal;
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.add('hidden');});

async function loadLeaves(){
  try{
    const data=await AdminAPI.getLeaves('?limit=200&sort=-createdAt&populate=user');
    allLeaves=data.leaves||data.data||[];
    if (!allLeaves.length) throw new Error('No leaves in database');
    updateLeaveCounts(); applyLeaveFilters(); loadDepts();
  }catch(err){loadDemoLeaves();}
}

function loadDemoLeaves(){
  const names=['Rahul Sharma','Priya Patil','Amit Kumar','Neha Singh','Ravi Desai'];
  const types=['CASUAL','SICK','ANNUAL','CASUAL','SICK'];
  const statuses=['PENDING','APPROVED','PENDING','REJECTED','APPROVED'];
  allLeaves=names.map((n,i)=>({_id:i+'',user:{name:n,email:n.split(' ')[0].toLowerCase()+'@jmkc.com',_id:i+''},type:types[i],startDate:new Date(Date.now()-i*86400000*2).toISOString(),endDate:new Date(Date.now()-i*86400000*2+86400000*(i+1)).toISOString(),days:i+1,reason:'Personal reasons',status:statuses[i],createdAt:new Date().toISOString()}));
  updateLeaveCounts(); applyLeaveFilters();
}

function updateLeaveCounts(){
  const cnt={all:allLeaves.length,PENDING:0,APPROVED:0,REJECTED:0,CANCELLED:0};
  allLeaves.forEach(l=>{if(cnt[l.status]!==undefined)cnt[l.status]++;});
  document.getElementById('lc-all').textContent=cnt.all;
  document.getElementById('lc-pending').textContent=cnt.PENDING;
  document.getElementById('lc-approved').textContent=cnt.APPROVED;
  document.getElementById('lc-rejected').textContent=cnt.REJECTED;
  document.getElementById('lc-cancelled').textContent=cnt.CANCELLED;
}

function setLeaveStatus(btn,status){
  document.querySelectorAll('.kpi-card').forEach(b=>b.style.boxShadow = 'none');
  document.querySelectorAll('.kpi-card').forEach(b=>b.style.border = '1px solid var(--border)');
  if (btn) {
    btn.style.boxShadow = '0 8px 24px rgba(37,99,235,0.12)';
    btn.style.border = '1px solid var(--primary)';
  }
  leaveStatus=status; leavePg=1; applyLeaveFilters();
}
window.setLeaveStatus=setLeaveStatus;

function applyLeaveFilters(){
  const q=(document.getElementById('leaveSearch')?.value||'').toLowerCase();
  const type=document.getElementById('filterLeaveType')?.value||'';
  const dept=document.getElementById('filterLeaveDept')?.value||'';
  const filtered=allLeaves.filter(l=>{
    const ms=!leaveStatus||l.status===leaveStatus;
    const mt=!type||l.type===type;
    const mq=!q||(l.user?.name||'').toLowerCase().includes(q);
    return ms&&mt&&mq;
  });
  document.getElementById('leaveCount').textContent=` (${filtered.length})`;
  renderLeaveTable(filtered);
}
window.applyLeaveFilters=applyLeaveFilters;

function renderLeaveTable(leaves){
  const start=(leavePg-1)*leavePpg;
  const paged=leaves.slice(start,start+leavePpg);
  document.getElementById('leavePageInfo').textContent=`Showing ${Math.min(start+1,leaves.length)}–${Math.min(start+leavePpg,leaves.length)} of ${leaves.length}`;
  document.getElementById('leaveTableBody').innerHTML=paged.length?paged.map(l=>`
    <tr style="cursor:pointer" onclick="showLeaveDetail('${l._id}')">
      <td><div class="table-user-cell">${window.avatar(l.user?.name||'?',34)}<div><div class="user-name">${l.user?.name||'—'}</div><div class="user-email">${l.user?.email||''}</div></div></div></td>
      <td><span class="badge badge-info">${l.type||'CASUAL'}</span></td>
      <td>${window.fmt.date(l.startDate)}</td>
      <td>${window.fmt.date(l.endDate)}</td>
      <td><strong>${l.days||1}</strong></td>
      <td>${window.fmt.truncate(l.reason||'—',30)}</td>
      <td>${window.fmt.date(l.createdAt)}</td>
      <td>${window.statusBadge(l.status)}</td>
      <td onclick="event.stopPropagation()">
        ${l.status==='PENDING'?`
          <div style="display:flex;gap:4px">
            <button class="btn btn-success btn-sm" onclick="handleLeave('${l._id}','APPROVED')">✓</button>
            <button class="btn btn-danger btn-sm" onclick="handleLeave('${l._id}','REJECTED')">✗</button>
          </div>`:
          `<button class="btn btn-ghost btn-sm" onclick="showLeaveDetail('${l._id}')">View</button>`}
      </td>
    </tr>`).join('') :
    '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🌿</div><div class="empty-title">No leave requests found</div></div></td></tr>';
  const pages=Math.ceil(leaves.length/leavePpg);
  document.getElementById('leavePageBtns').innerHTML=Array.from({length:Math.min(pages,8)},(_,i)=>`<button class="page-btn ${i+1===leavePg?'active':''}" onclick="goLeavePg(${i+1})">${i+1}</button>`).join('');
}
function goLeavePg(n){leavePg=n;applyLeaveFilters();}window.goLeavePg=goLeavePg;

function showLeaveDetail(id){
  const l=allLeaves.find(x=>x._id===id);if(!l)return;
  document.getElementById('leaveDetailBody').innerHTML=`
    <div class="info-row"><span class="info-label">Employee</span><span class="info-val">${l.user?.name||'—'}</span></div>
    <div class="info-row"><span class="info-label">Leave Type</span><span class="info-val">${l.type||'CASUAL'}</span></div>
    <div class="info-row"><span class="info-label">From</span><span class="info-val">${window.fmt.date(l.startDate)}</span></div>
    <div class="info-row"><span class="info-label">To</span><span class="info-val">${window.fmt.date(l.endDate)}</span></div>
    <div class="info-row"><span class="info-label">Total Days</span><span class="info-val">${l.days||1} days</span></div>
    <div class="info-row"><span class="info-label">Reason</span><span class="info-val">${l.reason||'—'}</span></div>
    <div class="info-row"><span class="info-label">Applied On</span><span class="info-val">${window.fmt.date(l.createdAt)}</span></div>
    <div class="info-row"><span class="info-label">Status</span><span class="info-val">${window.statusBadge(l.status)}</span></div>
    <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:var(--r-md);">
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text-2)">Approval Timeline</div>
      <div class="timeline">
        <div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-time">Applied</div><div class="timeline-title">Leave Applied by ${l.user?.name||'Employee'}</div></div>
        ${l.pmApprovedAt?`<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-time">${window.fmt.date(l.pmApprovedAt)}</div><div class="timeline-title">Reviewed by Project Manager</div></div>`:''}
        ${l.hrApprovedAt?`<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-time">${window.fmt.date(l.hrApprovedAt)}</div><div class="timeline-title">Approved by HR</div></div>`:''}
        ${l.status!=='PENDING'?`<div class="timeline-item"><div class="timeline-dot" style="background:${l.status==='APPROVED'?'var(--success)':'var(--danger)'}"></div><div class="timeline-time">Final</div><div class="timeline-title">Admin: ${l.status}</div></div>`:''}
      </div>
    </div>`;
  document.getElementById('leaveDetailFooter').innerHTML=l.status==='PENDING'?`
    <button class="btn btn-outline" onclick="closeModal('leaveDetailModal')">Close</button>
    <button class="btn btn-danger" onclick="handleLeave('${l._id}','REJECTED');closeModal('leaveDetailModal')">❌ Reject</button>
    <button class="btn btn-success" onclick="handleLeave('${l._id}','APPROVED');closeModal('leaveDetailModal')">✅ Approve</button>`:`<button class="btn btn-primary" onclick="closeModal('leaveDetailModal')">Close</button>`;
  openModal('leaveDetailModal');
}
window.showLeaveDetail=showLeaveDetail;

async function handleLeave(id,status){
  try{
    await AdminAPI.updateLeave(id,{status});
    const l=allLeaves.find(x=>x._id===id);if(l)l.status=status;
    updateLeaveCounts(); applyLeaveFilters();
    window.showToast('Updated',`Leave ${status.toLowerCase()} successfully.`,status==='APPROVED'?'success':'info');
  }catch(err){window.showToast('Error',err.message,'error');}
}
window.handleLeave=handleLeave;

function exportLeaves(){
  const rows=[['Employee','Type','From','To','Days','Status','Reason']];
  allLeaves.forEach(l=>rows.push([l.user?.name||'',l.type||'',window.fmt.date(l.startDate),window.fmt.date(l.endDate),l.days||1,l.status,l.reason||'']));
  const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const el=document.createElement('a');el.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);el.download='leaves.csv';el.click();
  window.showToast('Exported!','Leave data downloaded.','success');
}
window.exportLeaves=exportLeaves;

async function loadDepts(){
  try{const data=await AdminAPI.getDepts('?limit=50');const depts=data.departments||data.data||[];const el=document.getElementById('filterLeaveDept');if(el)el.innerHTML='<option value="">All Departments</option>'+depts.map(d=>`<option value="${d._id}">${d.name}</option>`).join('');}catch{}
}

document.addEventListener('DOMContentLoaded',loadLeaves);
