document.addEventListener('DOMContentLoaded',()=>{
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  new Chart(document.getElementById('revChart'),{type:'line',data:{labels:months,datasets:[{label:'Revenue',data:[12,19,15,22,28,25,32,38,35,42,48,55],borderColor:'#2563EB',backgroundColor:'rgba(37,99,235,0.1)',fill:true,tension:0.4,borderWidth:2}]},options:{responsive:true,plugins:{legend:{display:false}}}});

  new Chart(document.getElementById('projChart'),{type:'doughnut',data:{labels:['Completed','Delayed','Failed'],datasets:[{data:[75,20,5],backgroundColor:['#22C55E','#F59E0B','#EF4444'],borderWidth:0}]},options:{responsive:true,cutout:'70%'}});

  new Chart(document.getElementById('deptChart'),{type:'bar',data:{labels:['Eng','Design','HR','Sales','Ops'],datasets:[{label:'Score',data:[92,85,88,95,82],backgroundColor:'#7C3AED',borderRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{max:100}}}});

  new Chart(document.getElementById('attChart'),{type:'line',data:{labels:months,datasets:[{label:'Attendance %',data:[92,94,91,95,93,92,90,94,96,95,93,94],borderColor:'#10B981',tension:0.3,borderWidth:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{min:80,max:100}}}});

  new Chart(document.getElementById('leadChart'),{type:'bar',data:{labels:['Q1','Q2','Q3','Q4'],datasets:[{label:'Leads',data:[120,150,180,220],backgroundColor:'#94A3B8'},{label:'Converted',data:[40,60,85,110],backgroundColor:'#2563EB'}]},options:{responsive:true}});

  new Chart(document.getElementById('perfChart'),{type:'radar',data:{labels:['Communication','Quality','Speed','Teamwork','Initiative'],datasets:[{label:'Company Avg',data:[85,90,82,88,75],backgroundColor:'rgba(37,99,235,0.2)',borderColor:'#2563EB'}]},options:{responsive:true}});
});