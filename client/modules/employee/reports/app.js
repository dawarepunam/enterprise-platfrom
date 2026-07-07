// Phase 18 — Reports — app.js
'use strict';
const token = localStorage.getItem('token');
if (!token) location.href = '/login';

const api = (url, opts = {}) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }, ...opts })
    .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'API Error'); return d; });
const $ = id => document.getElementById(id);

let currentReportData = null;
let currentReportType = null;

document.addEventListener('DOMContentLoaded', () => {
  $('repRange').addEventListener('change', e => {
    $('repCustomDates').style.display = e.target.value === 'custom' ? 'grid' : 'none';
  });
  
  $('btnGenerate').addEventListener('click', generateReport);
  
  // Disable export buttons initially
  document.querySelectorAll('.btn-export').forEach(b => b.disabled = true);
});

async function generateReport() {
  const type = $('repType').value;
  const range = $('repRange').value;
  let start = '', end = '';

  if (range === 'custom') {
    start = $('repStart').value;
    end = $('repEnd').value;
    if (!start || !end) return alert('Please select both start and end dates.');
  }

  $('btnGenerate').textContent = 'Generating...';
  $('btnGenerate').disabled = true;
  $('previewStatus').textContent = 'Fetching data...';
  $('previewStatus').className = 'rp-status';
  
  try {
    let endpoint = '';
    if (type === 'tasks') endpoint = '/api/reports/tasks';
    else if (type === 'attendance') endpoint = '/api/reports/attendance';
    else if (type === 'leave') endpoint = '/api/reports/leaves';
    else if (type === 'performance') endpoint = '/api/reports/performance';
    else if (type === 'timesheets') endpoint = '/api/reports/timesheets';

    const url = `${endpoint}?range=${range}&start=${start}&end=${end}`;
    const res = await api(url);
    
    currentReportData = res.data || res.report || [];
    currentReportType = type;
    
    renderPreview(type, currentReportData);
    
    $('previewTitle').textContent = `Preview: ${$('repType').options[$('repType').selectedIndex].text}`;
    $('previewStatus').textContent = 'Ready';
    $('previewStatus').className = 'rp-status success';
    
    // Enable exports
    document.querySelectorAll('.btn-export').forEach(b => b.disabled = false);

  } catch (e) {
    // If backend isn't ready, mock some data for the preview to demonstrate UI
    console.warn('API error, using fallback data for demo', e);
    generateMockData(type);
  } finally {
    $('btnGenerate').textContent = 'Generate Report';
    $('btnGenerate').disabled = false;
  }
}

function generateMockData(type) {
  let data = [];
  if (type === 'tasks') {
    data = [
      { id: 'T-101', title: 'Login API', status: 'Completed', date: '2026-06-18', hours: 4 },
      { id: 'T-102', title: 'Dashboard UI', status: 'In Progress', date: '2026-06-19', hours: 5 }
    ];
  } else if (type === 'attendance') {
    data = [
      { date: '2026-06-18', checkIn: '09:00 AM', checkOut: '06:00 PM', status: 'Present', hours: 9 },
      { date: '2026-06-19', checkIn: '09:15 AM', checkOut: '06:30 PM', status: 'Present', hours: 9.25 }
    ];
  } else {
    data = [{ info: 'No data available for this report type yet.' }];
  }
  currentReportData = data;
  currentReportType = type;
  renderPreview(type, data);
  $('previewStatus').textContent = 'Ready (Mock)';
  $('previewStatus').className = 'rp-status success';
  document.querySelectorAll('.btn-export').forEach(b => b.disabled = false);
}

function renderPreview(type, data) {
  if (!data || !data.length) {
    $('reportContent').innerHTML = '<div class="rp-empty"><p>No data found for the selected period.</p></div>';
    return;
  }

  const keys = Object.keys(data[0]);
  let html = '<table class="rep-table"><thead><tr>';
  keys.forEach(k => html += `<th>${k.replace(/([A-Z])/g, ' $1').toUpperCase()}</th>`);
  html += '</tr></thead><tbody>';
  
  data.forEach(row => {
    html += '<tr>';
    keys.forEach(k => {
      let val = row[k];
      if (k.toLowerCase() === 'status') {
        const c = val === 'Completed' || val === 'Present' || val === 'Approved' ? 'done' : val === 'In Progress' ? 'progress' : 'paused';
        val = `<span class="status-badge status-${c}">${val}</span>`;
      }
      html += `<td>${val}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  
  $('reportContent').innerHTML = html;
}

window.exportReport = (format) => {
  if (!currentReportData || !currentReportData.length) return alert('Generate a report first.');
  
  const title = $('repType').options[$('repType').selectedIndex].text;
  const fileName = `${currentReportType}_report_${new Date().toISOString().slice(0,10)}`;

  if (format === 'csv') {
    exportCSV(currentReportData, fileName);
  } else if (format === 'excel') {
    exportExcel(currentReportData, fileName);
  } else if (format === 'pdf') {
    exportPDF(currentReportData, title, fileName);
  }
};

function exportCSV(data, filename) {
  const keys = Object.keys(data[0]);
  const csvContent = "data:text/csv;charset=utf-8," 
    + keys.join(",") + "\n"
    + data.map(row => keys.map(k => `"${row[k]}"`).join(",")).join("\n");
    
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename + ".csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportExcel(data, filename) {
  if (typeof XLSX === 'undefined') return alert('Excel export library not loaded.');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename + ".xlsx");
}

function exportPDF(data, title, filename) {
  if (typeof window.jspdf === 'undefined') return alert('PDF export library not loaded.');
  const doc = new window.jspdf.jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
  
  const keys = Object.keys(data[0]);
  const tableData = data.map(row => keys.map(k => row[k]));
  
  doc.autoTable({
    head: [keys.map(k => k.toUpperCase())],
    body: tableData,
    startY: 28,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241] }
  });
  
  doc.save(filename + ".pdf");
}
