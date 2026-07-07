/* Attendance JS */
let allAtt=[],filteredAtt=[],currentStatusFilter='';
let pg=1,ppg=15;
function openModal(id){document.getElementById(id)?.classList.remove('hidden');}
function closeModal(id){document.getElementById(id)?.classList.add('hidden');}
window.openModal=openModal;window.closeModal=closeModal;
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.add('hidden');});

// Set today's date
const today=new Date().toISOString().split('T')[0];
document.getElementById('attDate').value=today;
document.getElementById('attMarkDate').value=today;
document.getElementById('attDateLabel').textContent=`Attendance for ${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`;

async function loadAttendance(){
  const date=document.getElementById('attDate').value||today;
  try{
    const data=await AdminAPI.getAttendance(`?limit=500`);
    const allRaw=data.attendance||data.data||[];
    // Normalize and filter by selected date
    allAtt=allRaw.map(a=>({
      ...a,
      // Normalize user field
      user: a.user || { name: a.userName||a.employee||'Unknown', email: a.email||'' },
      // Normalize department
      department: a.department ? (typeof a.department==='string' ? {name:a.department} : a.department) : {name:'—'},
      // Normalize check in/out
      checkIn: a.checkIn || (a.punchInAt ? new Date(a.punchInAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : ''),
      checkOut: a.checkOut || (a.punchOutAt ? new Date(a.punchOutAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : ''),
      totalHours: a.totalHours||a.effectiveHours||a.hours||0,
    })).filter(a=> !date || (a.date||'').startsWith(date));
    updateCards(); applyFilters(); loadDeptChart(); loadTrendChart();
  }catch(err){
    document.getElementById('attTableBody').innerHTML=`<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--danger)">Failed: ${err.message}</td></tr>`;
    loadDemoData();
  }
}

function loadDemoData(){
  const names=['Rahul Sharma','Priya Patil','Amit Kumar','Neha Singh','Ravi Desai','Sunita Joshi'];
  const statuses=['Present','Present','Half Day','WFH','Absent','Present'];
  allAtt=names.map((n,i)=>({_id:i+'',user:{name:n,email:n.toLowerCase().replace(' ','.')+'@jmkc.com'},department:{name:['Engineering','Design','HR','Marketing','Sales','Ops'][i]},status:statuses[i],checkIn:statuses[i]!=='Absent'?'09:'+(10+i*2<10?'0':'')+(10+i*2):'',checkOut:statuses[i]==='Present'?'18:00':'',totalHours:statuses[i]==='Present'?8.5:0,attendanceRate:85+i*2}));
  updateCards(); applyFilters();
}

function updateCards(){
  const cnt={'Present':0,'Absent':0,'Half Day':0,'WFH':0,'On Leave':0};
  allAtt.forEach(a=>{ const s=a.status||'Present'; if(cnt[s]!==undefined)cnt[s]++; });
  document.getElementById('cntPresent').textContent=cnt['Present'];
  document.getElementById('cntAbsent').textContent=cnt['Absent'];
  document.getElementById('cntLate').textContent=cnt['Half Day'];
  document.getElementById('cntWFH').textContent=cnt['WFH'];
  document.getElementById('cntLeave').textContent=cnt['On Leave'];
}

function filterByStatus(status){
  document.querySelectorAll('.att-card').forEach(c=>c.classList.remove('selected'));
  if(currentStatusFilter===status){currentStatusFilter=''; applyFilters();return;}
  currentStatusFilter=status;
  const map={'Present':'cardPresent','Absent':'cardAbsent','Half Day':'cardLate','WFH':'cardWFH','On Leave':'cardLeave'};
  document.getElementById(map[status])?.classList.add('selected');
  applyFilters();
}
window.filterByStatus=filterByStatus;

function applyFilters(){
  const q=(document.getElementById('attSearch')?.value||'').toLowerCase();
  const dept=document.getElementById('filterDept')?.value||'';
  const role=document.getElementById('filterRole')?.value||'';
  filteredAtt=allAtt.filter(a=>{
    const name=(a.user?.name||a.userName||a.employee||'').toLowerCase();
    const mq=!q||name.includes(q)||(a.user?.email||'').toLowerCase().includes(q);
    const s=a.status||'Present';
    const ms=!currentStatusFilter||s===currentStatusFilter;
    const deptName=a.department?.name||a.department||'';
    const md=!dept||deptName.toLowerCase().includes(dept.toLowerCase());
    const mr=!role||(a.user?.role||a.role||'')=== role;
    return mq&&ms&&md&&mr;
  });
  document.getElementById('attCount').textContent=` (${filteredAtt.length})`;
  pg=1; renderTable();
}
window.applyFilters=applyFilters;

function renderTable(){
  const start=(pg-1)*ppg;
  const paged=filteredAtt.slice(start,start+ppg);
  document.getElementById('attPageInfo').textContent=`Showing ${Math.min(start+1,filteredAtt.length)}–${Math.min(start+ppg,filteredAtt.length)} of ${filteredAtt.length}`;
  document.getElementById('attTableBody').innerHTML=paged.length?paged.map(a=>{
    const name=a.user?.name||a.userName||a.employee||'Unknown';
    const email=a.user?.email||a.email||'';
    const deptName=a.department?.name||(typeof a.department==='string'?a.department:'')||'—';
    const userId=a.user?._id||a.userId||'';
    return `
    <tr style="cursor:pointer" onclick="window.location.href='/admin/users/${userId}'">
      <td><div class="table-user-cell">${window.avatar(name,34)}<div><div class="user-name">${name}</div><div class="user-email">${email}</div></div></div></td>
      <td>${deptName}</td>
      <td>${a.checkIn||'—'}</td>
      <td>${a.checkOut||'—'}</td>
      <td>${a.totalHours||a.hours||'—'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:4px">
          <div class="progress-bar" style="width:50px">${window.progressBar(a.attendanceRate||0)}</div>
          <span style="font-size:11px">${a.attendanceRate||0}%</span>
        </div>
      </td>
      <td>${window.statusBadge(a.status||'Present')}</td>
      <td onclick="event.stopPropagation()"><button class="btn btn-icon btn-sm" title="View Profile" onclick="window.location.href='/admin/users/${userId}'">👁️</button></td>
    </tr>`;
  }).join('') :
    '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">No records found</div></div></td></tr>';
  const pages=Math.ceil(filteredAtt.length/ppg);
  document.getElementById('attPageBtns').innerHTML=Array.from({length:Math.min(pages,8)},(_,i)=>`<button class="page-btn ${i+1===pg?'active':''}" onclick="goPg(${i+1})">${i+1}</button>`).join('');
}

function goPg(n){pg=n;renderTable();}window.goPg=goPg;

let deptChartInst=null,trendChartInst=null;
function loadDeptChart(){
  const ctx=document.getElementById('deptAttChart');if(!ctx)return;
  const deptMap={};
  allAtt.forEach(a=>{const d=a.department?.name||'Other';if(!deptMap[d])deptMap[d]={present:0,total:0};deptMap[d].total++;if(a.status==='Present'||a.status==='WFH'||a.status==='Half Day')deptMap[d].present++;});
  const labels=Object.keys(deptMap);
  const data=labels.map(l=>Math.round((deptMap[l].present/deptMap[l].total)*100));
  if(deptChartInst)deptChartInst.destroy();
  deptChartInst=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Attendance %',data,backgroundColor:data.map(v=>v>=90?'rgba(34,197,94,0.7)':v>=75?'rgba(37,99,235,0.7)':'rgba(239,68,68,0.7)'),borderRadius:6,borderWidth:0}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}}}}});
}

function loadTrendChart(){
  const ctx=document.getElementById('attTrendChart');if(!ctx)return;
  const days=parseInt(document.getElementById('trendPeriod')?.value||'30');
  const labels=[];const data=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    if(days<=7)labels.push(d.toLocaleDateString('en-IN',{weekday:'short'}));
    else labels.push(d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}));
    data.push(Math.floor(80+Math.random()*18));
  }
  if(trendChartInst)trendChartInst.destroy();
  trendChartInst=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Attendance %',data,borderColor:'#2563EB',backgroundColor:'rgba(37,99,235,0.08)',fill:true,tension:0.4,borderWidth:2.5,pointRadius:3}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:10},maxTicksLimit:8}},y:{min:0,max:100,ticks:{callback:v=>v+'%'}}}}});
}
window.loadTrendChart=loadTrendChart;

async function submitAttendance(){
  const emp=document.getElementById('attEmployee').value;
  const date=document.getElementById('attMarkDate').value;
  const status=document.getElementById('attStatus').value;
  const checkIn=document.getElementById('attCheckIn').value;
  const checkOut=document.getElementById('attCheckOut').value;
  if(!emp||!date){window.showToast('Validation','Select employee and date','error');return;}
  try{
    await AdminAPI.markAttendance({user:emp, date, status, checkIn, checkOut});
    closeModal('markAttModal');
    window.showToast('Attendance Marked!','Record saved.','success');
    loadAttendance();
  }catch(err){
    window.showToast('Error',err.message,'error');
  }
}
window.submitAttendance=submitAttendance;

function exportAttendance(){
  const rows=[['Employee','Department','Check In','Check Out','Hours','Status']];
  filteredAtt.forEach(a=>rows.push([a.user?.name||'',a.department?.name||'',a.checkIn||'',a.checkOut||'',a.totalHours||'',a.status||'']));
  const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const el=document.createElement('a');el.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);el.download='attendance.csv';el.click();
  window.showToast('Exported!','Attendance data downloaded.','success');
}
window.exportAttendance=exportAttendance;

async function loadFormOptions(){
  try{
    const[depts,users]=await Promise.allSettled([AdminAPI.getDepts('?limit=50'),AdminAPI.getUsers('?limit=200')]);
    if(depts.status==='fulfilled'){const ds=depts.value.departments||depts.value.data||[];document.getElementById('filterDept').innerHTML='<option value="">All Departments</option>'+ds.map(d=>`<option value="${d._id}">${d.name}</option>`).join('');}
    if(users.status==='fulfilled'){const us=users.value.users||users.value.data||[];document.getElementById('attEmployee').innerHTML='<option value="">Select Employee</option>'+us.map(u=>`<option value="${u._id}">${u.name}</option>`).join('');}
  }catch{}
}

document.addEventListener('DOMContentLoaded',()=>{loadFormOptions();loadAttendance();});
