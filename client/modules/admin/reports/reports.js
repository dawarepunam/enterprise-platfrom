function openModal(id){document.getElementById(id)?.classList.remove('hidden');}
function closeModal(id){document.getElementById(id)?.classList.add('hidden');}
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.add('hidden');});
function openReportModal(type){
  document.getElementById('rmTitle').textContent=`Generate ${type} Report`;
  openModal('genReportModal');
}
function downloadReport(){
  const title = document.getElementById('rmTitle').textContent;
  const type = title.replace('Generate ', '').replace(' Report', '');
  const format = document.getElementById('rFormat')?.value || 'csv';
  
  window.showToast('Generating...','Please wait while your report is generated.','info');
  
  setTimeout(()=>{
    closeModal('genReportModal');
    
    // Create dummy CSV data based on type
    let csvData = '';
    if (type === 'Attendance') {
      csvData = 'Employee,Date,Check In,Check Out,Status,Total Hours\nRahul Sharma,2023-10-15,09:00 AM,06:00 PM,Present,9\nNeha Singh,2023-10-15,09:15 AM,05:45 PM,Present,8.5';
    } else if (type === 'Project') {
      csvData = 'Project Name,Manager,Deadline,Progress,Status\nApollo Restructure,Rahul Sharma,2023-11-20,75%,In Progress\nWebsite Redesign,Amit Kumar,2023-12-05,25%,Planning';
    } else {
      csvData = `Report Type,${type}\nGenerated,${new Date().toLocaleDateString()}\nStatus,Success\nData,Report data would appear here in production`;
    }

    // Trigger download
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.showToast('Success','Report downloaded successfully!','success');
  },1500);
}