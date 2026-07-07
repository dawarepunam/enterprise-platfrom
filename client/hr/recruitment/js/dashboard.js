document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const jobPopup = document.getElementById('jobPopup');
  const addJobBtn = document.getElementById('addJobBtn');
  const closeJobBtn = document.getElementById('closeJobBtn');
  const jobForm = document.getElementById('jobForm');
  const jobsGrid = document.getElementById('jobsGrid');

  addJobBtn.addEventListener('click', () => jobPopup.classList.add('active'));
  closeJobBtn.addEventListener('click', () => jobPopup.classList.remove('active'));
  jobPopup.addEventListener('click', (e) => { if(e.target === jobPopup) jobPopup.classList.remove('active'); });

  // Socket listener
  socket.on('jobAdded', (job) => {
    fetchJobs();
  });

  async function fetchJobs() {
    try {
      const res = await fetch('/api/recruitment/jobs');
      const jobs = await res.json();
      renderJobs(jobs);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  }

  jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('jobTitle').value;
    const department = document.getElementById('jobDept').value;
    const location = document.getElementById('jobLoc').value;
    const description = document.getElementById('jobDesc').value;

    try {
      const res = await fetch('/api/recruitment/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, department, location, description })
      });
      if (res.ok) {
        showToast('Job Posted Successfully', 'success');
        jobPopup.classList.remove('active');
        jobForm.reset();
        fetchJobs();
      }
    } catch (err) {
      showToast('Error posting job', 'error');
    }
  });

  function renderJobs(jobs) {
    if (!jobs || jobs.length === 0) {
      jobsGrid.innerHTML = '<p style="color:var(--text-muted);">No open jobs found.</p>';
      return;
    }
    
    jobsGrid.innerHTML = jobs.map(job => `
      <div class="job-card" onclick="window.location.href='/hr/recruitment/pipeline?jobId=${job._id}'">
        <div class="job-header">
          <div class="job-title">${job.title}</div>
          <span class="status-badge status-success">${job.status}</span>
        </div>
        <div class="job-meta">
          <span><i class="fas fa-building"></i> ${job.department}</span>
          <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
        </div>
        <div class="job-stats">
          <div class="stat-box"><h4>0</h4><p>Candidates</p></div>
          <div class="stat-box"><h4>0</h4><p>Interviews</p></div>
          <div class="stat-box"><h4>0</h4><p>Hired</p></div>
        </div>
      </div>
    `).join('');
  }

  // Initial load
  fetchJobs();
});
