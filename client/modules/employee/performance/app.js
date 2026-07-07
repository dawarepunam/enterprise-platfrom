// Phase 15 — Performance — app.js
'use strict';
const token = localStorage.getItem('token');
if (!token) location.href = '/login';

const api = (url, opts = {}) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }, ...opts })
    .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'API Error'); return d; });
const $ = id => document.getElementById(id);

let prodChartInstance = null;
let taskChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupUI();
  await loadPerformanceData();
});

function setupUI() {
  $('perfFilter').addEventListener('change', loadPerformanceData);
  $('btnExportPdf').addEventListener('click', () => {
    alert('PDF Export feature will generate a snapshot of the current view.');
    // Real implementation would use html2canvas + jsPDF
  });
}

async function loadPerformanceData() {
  const period = $('perfFilter').value;
  try {
    const res = await api(`/api/performance/employee?period=${period}`);
    const data = res.data || res;
    renderTopStats(data);
    renderKPIs(data.kpis || []);
    renderBadges(data.badges || []);
    renderCharts(data.chartData || {});
  } catch (e) {
    console.error(e);
    // Render defaults on error to avoid broken UI
    renderTopStats({ productivity: 0, tasksCompleted: 0, attendanceRate: 0, meetingsAttended: 0 });
    $('kpiList').innerHTML = `<p style="color:#f87171">${e.message}</p>`;
    renderBadges([]);
    renderCharts({ labels: [], prodData: [], tasksDone: 0, tasksPending: 0 });
  }
}

function renderTopStats(data) {
  $('valProductivity').textContent = (data.productivity || 0) + '%';
  $('valTasks').textContent = data.tasksCompleted || 0;
  $('valAttendance').textContent = (data.attendanceRate || 0) + '%';
  $('valMeetings').textContent = data.meetingsAttended || 0;
}

function renderKPIs(kpis) {
  if (!kpis.length) {
    $('kpiList').innerHTML = '<p style="color:var(--clr-text-muted);text-align:center;padding:1rem;">No KPIs defined for this period.</p>';
    return;
  }
  $('kpiList').innerHTML = kpis.map(k => {
    const p = Math.min(Math.max(k.progress || 0, 0), 100);
    const color = p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444';
    return `
      <div class="kpi-item">
        <div class="kpi-header">
          <span class="kpi-name">${k.name || 'Goal'}</span>
          <span class="kpi-val">${p}%</span>
        </div>
        <div class="kpi-progress-bg">
          <div class="kpi-progress-fill" style="width:${p}%; background:${color}"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderBadges(badges) {
  if (!badges.length) {
    $('badgesGrid').innerHTML = '';
    $('badgesEmpty').style.display = 'block';
    return;
  }
  $('badgesEmpty').style.display = 'none';
  $('badgesGrid').innerHTML = badges.map(b => `
    <div class="badge-card" title="${b.description || b.name}">
      <div class="badge-icon">${b.icon || '🏆'}</div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-date">${new Date(b.date || b.createdAt).toLocaleDateString('en-IN', {month:'short', year:'numeric'})}</div>
    </div>
  `).join('');
}

function renderCharts(cData) {
  // Chart.js defaults
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = 'Inter, sans-serif';

  // 1. Productivity Trend (Line Chart)
  const pCtx = $('productivityChart').getContext('2d');
  if (prodChartInstance) prodChartInstance.destroy();
  
  const gradient = pCtx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(99,102,241,0.5)');
  gradient.addColorStop(1, 'rgba(99,102,241,0.0)');

  prodChartInstance = new Chart(pCtx, {
    type: 'line',
    data: {
      labels: cData.labels || ['W1', 'W2', 'W3', 'W4'],
      datasets: [{
        label: 'Productivity Score',
        data: cData.prodData || [0, 0, 0, 0],
        borderColor: '#6366f1',
        backgroundColor: gradient,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#22d3ee',
        pointBorderColor: '#fff',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });

  // 2. Task Distribution (Doughnut Chart)
  const tCtx = $('taskChart').getContext('2d');
  if (taskChartInstance) taskChartInstance.destroy();
  taskChartInstance = new Chart(tCtx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [cData.tasksDone || 0, cData.tasksPending || 0],
        backgroundColor: ['#10b981', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
      }
    }
  });
}
