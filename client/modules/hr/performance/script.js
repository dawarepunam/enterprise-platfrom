window.PerformanceAPI = {
  currentReviewId: null,

  async fetchMetrics() {
    try {
      const res = await fetch('http://localhost:5003/api/performance/metrics');
      if(res.ok) {
        const json = await res.json();
        const d = json.data;
        document.getElementById('perfActive').innerText = d.active;
        document.getElementById('perfPending').innerText = d.pending;
        document.getElementById('perfCompleted').innerText = d.completed;
        document.getElementById('perfAvg').innerText = d.avgRating;

        document.getElementById('cardPending').innerText = d.pending;
        document.getElementById('cardCompleted').innerText = d.completed;
        document.getElementById('cardAvg').innerHTML = `${d.avgRating}<span style="font-size:1rem; color:var(--hr-text-muted);">/5</span>`;
      }
    } catch(e) {
      console.error('Failed to fetch metrics', e);
    }
  },

  async fetchReviews(statusFilter = '') {
    try {
      let url = 'http://localhost:5003/api/performance';
      if(statusFilter) url += `?status=${statusFilter}`;
      
      const res = await fetch(url);
      if(res.ok) {
        const json = await res.json();
        this.renderTable(json.data);
      }
    } catch(e) {
      console.error('Failed to fetch reviews', e);
      document.getElementById('perfTableBody').innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Backend not reachable. Run 'npm start' in server directory.</td></tr>`;
    }
  },

  renderTable(data) {
    const tbody = document.getElementById('perfTableBody');
    if(!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--hr-text-muted);">No reviews found</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(d => {
      let sStyle = d.status === 'Completed' ? 'background:#D1FAE5; color:#065F46;' : 
                   d.status === 'In Progress' ? 'background:#DBEAFE; color:#1E40AF;' : 
                   'background:#FEF3C7; color:#B45309;';
                   
      let dString = JSON.stringify(d).replace(/"/g, '&quot;');
                   
      return `
        <tr class="hr-table-row hoverable" style="border-bottom:1px solid var(--hr-border);">
          <td style="padding:1rem;">
            <img src="https://ui-avatars.com/api/?name=${d.employeeName.replace(' ', '+')}&background=random" style="width:36px; height:36px; border-radius:50%;" />
          </td>
          <td style="padding:1rem;">
            <div style="font-weight:500;">${d.employeeName}</div>
            <div style="font-size:0.75rem; color:var(--hr-text-muted);">${d.employeeId}</div>
          </td>
          <td style="padding:1rem; color:var(--hr-text-muted);">${d.department}</td>
          <td style="padding:1rem; color:var(--hr-text-muted);">${d.managerName}</td>
          <td style="padding:1rem; font-weight:600; color:var(--hr-text);">${d.rating > 0 ? d.rating : '-'}</td>
          <td style="padding:1rem;">
            <span style="${sStyle} padding:0.25rem 0.75rem; border-radius:12px; font-size:0.75rem;">${d.status}</span>
          </td>
          <td style="padding:1rem;">
            <div class="row-actions" style="display:flex; gap:0.5rem; opacity:0; transition:opacity 0.2s;">
              <button class="hr-icon-btn" onclick="window.UI.openReviewDrawer('${dString}')" style="font-size:0.75rem; border:1px solid var(--hr-primary); color:var(--hr-primary); padding:0.25rem 0.5rem; border-radius:6px;">Review</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Row hover interactions
    document.querySelectorAll('#perfTableBody tr').forEach(tr => {
      tr.addEventListener('mouseenter', () => {
        const actions = tr.querySelector('.row-actions');
        if(actions) actions.style.opacity = '1';
      });
      tr.addEventListener('mouseleave', () => {
        const actions = tr.querySelector('.row-actions');
        if(actions) actions.style.opacity = '0';
      });
    });
  },

  async seedData() {
    try {
      window.UI.toast('Seeding Database...', 'info');
      const res = await fetch('http://localhost:5003/api/performance/seed', { method: 'POST' });
      if(res.ok) {
        window.UI.toast('Database Seeded', 'success');
        this.fetchMetrics();
        this.fetchReviews();
      }
    } catch(e) {
      window.UI.toast('Seeding Failed', 'error');
    }
  },

  async submitRating() {
    if(!this.currentReviewId) return;
    try {
      const payload = {
        technicalSkills: Number(document.getElementById('rateTech').value),
        communication: Number(document.getElementById('rateComm').value),
        leadership: Number(document.getElementById('rateLead').value),
        innovation: Number(document.getElementById('rateInno').value),
        teamWork: Number(document.getElementById('rateTeam').value),
        remarks: document.getElementById('rateRemarks').value
      };

      const res = await fetch(`http://localhost:5003/api/performance/${this.currentReviewId}/rate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if(res.ok) {
        window.UI.closeRatingModal();
        window.UI.closeReviewDrawer();
        window.UI.toast('Review Submitted Successfully', 'success');
      }
    } catch(e) {
      window.UI.toast('Submit Failed', 'error');
    }
  }
};

window.init_hr_performance = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Talent > Performance';
  
  window.PerformanceAPI.fetchMetrics();
  window.PerformanceAPI.fetchReviews();

  // Socket.IO Integration
  if(!window.hrSocket) {
    window.hrSocket = io('http://localhost:5003');
    
    window.hrSocket.on('connect', () => {
      console.log('Socket Connected:', window.hrSocket.id);
    });

    window.hrSocket.on('reviewSubmitted', (review) => {
      console.log('Realtime Update: Review Submitted', review);
      if(window.location.pathname === '/hr/performance') {
        window.PerformanceAPI.fetchMetrics();
        window.PerformanceAPI.fetchReviews();
        window.UI.toast(`${review.employeeName}'s review was completed`, 'info');
      }
    });

    window.hrSocket.on('dataSeeded', () => {
      if(window.location.pathname === '/hr/performance') {
        window.PerformanceAPI.fetchMetrics();
        window.PerformanceAPI.fetchReviews();
      }
    });
  }
};

// UI Triggers specific to Performance
if (window.UI) {
  window.UI.openReviewDrawer = function(dString) {
    const d = JSON.parse(dString);
    window.PerformanceAPI.currentReviewId = d._id;

    document.getElementById('drawerRevTitle').innerText = `Review - ${d.employeeName}`;
    document.getElementById('drawerEmp').innerText = `${d.employeeName} (${d.employeeId})`;
    document.getElementById('drawerDept').innerText = d.department;
    document.getElementById('drawerMgr').innerText = d.managerName;
    document.getElementById('drawerPeriod').innerText = d.reviewPeriod;
    
    const statusEl = document.getElementById('drawerStatus');
    statusEl.innerText = d.status;
    statusEl.style.color = d.status === 'Completed' ? '#10B981' : d.status === 'In Progress' ? '#3B82F6' : '#F59E0B';

    const drawer = document.getElementById('hrReviewDrawer');
    drawer.classList.remove('hidden');
    drawer.style.transform = 'translateX(100%)';
    requestAnimationFrame(() => {
      drawer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      drawer.style.transform = 'translateX(0)';
    });
  };

  window.UI.closeReviewDrawer = function() {
    const drawer = document.getElementById('hrReviewDrawer');
    drawer.style.transform = 'translateX(100%)';
    setTimeout(() => drawer.classList.add('hidden'), 300);
  };

  window.UI.openRatingModal = function() {
    document.getElementById('hrRatingModal').classList.remove('hidden');
  };

  window.UI.closeRatingModal = function() {
    document.getElementById('hrRatingModal').classList.add('hidden');
  };
}
