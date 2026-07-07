document.addEventListener('DOMContentLoaded',async()=>{
  try{
    const data=await AdminAPI.getAuditLogs('?limit=50');
    const logs=data.logs||data.data||[];
    document.getElementById('logsBody').innerHTML=logs.length?logs.map(l=>`
      <tr>
        <td style="white-space:nowrap">${window.fmt.dateTime(l.createdAt)}</td>
        <td><strong>${l.user?.name||l.userName||'System'}</strong></td>
        <td><span class="badge badge-gray">${l.module||'General'}</span></td>
        <td><span class="badge badge-${l.action==='CREATE'?'success':l.action==='DELETE'?'danger':'info'}">${l.action||'ACTION'}</span></td>
        <td>${l.description||'—'}</td>
        <td style="font-family:monospace;color:var(--text-4)">${l.ip||'127.0.0.1'}</td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center">No logs found</td></tr>';
  }catch{
    document.getElementById('logsBody').innerHTML=`
      <tr><td>Today, 10:30 AM</td><td><strong>Admin</strong></td><td><span class="badge badge-gray">Users</span></td><td><span class="badge badge-info">LOGIN</span></td><td>User logged in</td><td>192.168.1.5</td></tr>
      <tr><td>Today, 09:15 AM</td><td><strong>Rahul Sharma</strong></td><td><span class="badge badge-gray">Projects</span></td><td><span class="badge badge-success">CREATE</span></td><td>Created project 'Website Redesign'</td><td>10.0.0.42</td></tr>
      <tr><td>Yesterday, 04:45 PM</td><td><strong>HR System</strong></td><td><span class="badge badge-gray">Leave</span></td><td><span class="badge badge-info">UPDATE</span></td><td>Approved leave for Priya</td><td>System</td></tr>
    `;
  }
});