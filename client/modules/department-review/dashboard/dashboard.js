/**
 * Department Review Module - Enterprise Backend Connected Logic
 * ZERO STATIC POLICY IMPLEMENTATION
 */

document.addEventListener('DOMContentLoaded', () => {
  // ===== 1. GLOBAL VARIABLES & STATE =====
  let currentSection = 'dashboard';
  let reviewsData = [];
  let currentReviewId = null;
  
  // Socket.IO Initialization
  const socket = typeof io !== 'undefined' ? io() : null;

  // DOM Elements
  const sidebarToggle = document.getElementById('sidebarToggle');
  const collapseBtn = document.getElementById('collapseBtn');
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.ws-section');
  const workspaceScroll = document.getElementById('workspaceScroll');
  
  // Modal Elements
  const quickCreateBtn = document.getElementById('quickCreateBtn');
  const createModal = document.getElementById('createModal');
  const createReviewForm = document.getElementById('createReviewForm');

  // Load Initial Data
  async function loadData() {
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        fetch('/api/department-reviews'),
        fetch('/api/department-reviews/dashboard-stats').catch(() => ({ json: () => ({ success: false }) }))
      ]);
      const reviewsDataJson = await reviewsRes.json();
      const statsDataJson = await statsRes.json();
      
      if (reviewsDataJson.success) {
        reviewsData = reviewsDataJson.data;
      } else {
        showToast("Failed to load reviews", "error");
      }
      
      let stats = null;
      if (statsDataJson.success) {
        stats = statsDataJson.data;
      }
      
      refreshUI(stats);
      if (currentReviewId) openReviewWorkspace(currentReviewId, true); // re-render workspace if open
    } catch (err) {
      console.error(err);
      showToast("Network error loading data", "error");
    }
  }

  function refreshUI(stats) {
    renderKPIs();
    renderRecentTable();
    renderQueueTable();
    renderKanbanBoard();
    if (stats) {
      renderDashboardActivities(stats.recentActivities);
      renderDashboardDeadlines(stats.upcomingDeadlines);
      renderDepartmentPerformance(stats.departmentPerformance);
    }
    if (currentSection === 'dashboard') setTimeout(renderDashboardCharts, 100);
  }

  function renderDashboardActivities(activities) {
    const list = document.getElementById('activityList');
    if (!list) return;
    if (!activities || activities.length === 0) {
      list.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">No recent activities.</p>';
      return;
    }
    list.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-dot blue"></div>
        <div class="activity-content"><strong>${a.userName} ${a.name}</strong><small>${a.metadata?.details?.oldStatus ? a.metadata.details.oldStatus + ' -> ' + a.metadata.details.newStatus : ''}</small></div>
        <span class="activity-time">${new Date(a.date).toLocaleDateString()}</span>
      </div>
    `).join('');
  }

  function renderDashboardDeadlines(deadlines) {
    const list = document.getElementById('deadlineList');
    if (!list) return;
    if (!deadlines || deadlines.length === 0) {
      list.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">No upcoming deadlines.</p>';
      return;
    }
    list.innerHTML = deadlines.map(d => {
      const isUrgent = d.priority === 'Critical' || d.priority === 'High';
      return `
      <div class="deadline-item"><span class="deadline-dot" style="background:var(--${isUrgent ? 'danger' : 'primary'})"></span><div class="deadline-info"><strong>Review: ${d.company}</strong><small>${d.department} · ${new Date(d.createdAt).toLocaleDateString()}</small></div></div>
      `;
    }).join('');
  }

  function renderDepartmentPerformance(perf) {
    const list = document.getElementById('perfList');
    if (!list) return;
    if (!perf || perf.length === 0) {
      list.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">No performance data available.</p>';
      return;
    }
    list.innerHTML = perf.map(p => {
      const pct = p.total > 0 ? Math.round((p.approved / p.total) * 100) : 0;
      let color = 'primary';
      if (pct > 80) color = 'success';
      else if (pct < 50) color = 'danger';
      return `
      <div class="perf-row"><span class="perf-label">${p._id}</span><div class="perf-bar-track"><div class="perf-bar-fill" style="width:${pct}%;background:var(--${color})"></div></div><span class="perf-pct" style="color:var(--${color})">${pct}%</span></div>
      `;
    }).join('');
  }

  // ===== 2. SOCKET.IO REAL TIME EVENTS =====
  if (socket) {
    socket.on('review_created', () => { showToast("New review created", "info"); loadData(); });
    socket.on('review_updated', (data) => { showToast("Review updated", "info"); loadData(); });
    socket.on('review_approved', (data) => { showToast(`Review ${data.status} at ${data.role}`, "success"); loadData(); });
    socket.on('clarification_added', () => { showToast("New clarification added", "info"); loadData(); });
  }

  // ===== 3. CREATE REVIEW WORKFLOW =====
  if (quickCreateBtn && createModal) {
    quickCreateBtn.addEventListener('click', () => {
      createModal.style.display = 'flex';
    });
  }

  if (createReviewForm) {
    createReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        company: document.getElementById('crCompany').value,
        requirement: document.getElementById('crRequirement').value,
        department: document.getElementById('crDepartment').value,
        priority: document.getElementById('crPriority').value
      };

      try {
        const res = await fetch('/api/department-reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast("Review created successfully!", "success");
          createModal.style.display = 'none';
          createReviewForm.reset();
          loadData(); // Will also be triggered by socket, but local load is fast
        } else {
          showToast(data.message, "error");
        }
      } catch (err) {
        showToast("Network error", "error");
      }
    });
  }

  // ===== 4. SIDEBAR & NAVIGATION =====
  function toggleSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
  }

  if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
  if (collapseBtn) collapseBtn.addEventListener('click', toggleSidebar);

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(nav => nav.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      item.classList.add('active');
      
      const targetPanel = item.getAttribute('data-section');
      const section = document.querySelector(`.ws-section[data-panel="${targetPanel}"]`);
      if (section) {
        section.classList.add('active');
        currentSection = targetPanel;
        
        if (targetPanel === 'dashboard') setTimeout(renderDashboardCharts, 100);
        if (targetPanel === 'kanban') renderKanbanBoard();
        if (workspaceScroll) workspaceScroll.scrollTop = 0;
      }
    });
  });

  // Navigate directly to a section
  window.navigateTo = (sectionName) => {
    const btn = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (btn) btn.click();
  };

  // ===== 5. KPI CARD BINDINGS =====
  function renderKPIs() {
    const pending = reviewsData.filter(r => r.status === 'Pending').length;
    const approved = reviewsData.filter(r => r.status === 'Approved').length;
    const rejected = reviewsData.filter(r => r.status === 'Rejected').length;
    const clarifications = reviewsData.filter(r => r.status === 'Clarification').length;
    // For demo, "Critical Risks" is derived from priority = Critical
    const critical = reviewsData.filter(r => r.priority === 'Critical').length;

    const setKpi = (id, val, filterAction) => {
      const el = document.getElementById(id);
      if (el) {
        el.querySelector('.kpi-value').innerText = val;
        el.style.cursor = 'pointer';
        el.onclick = () => {
          navigateTo('review-queue');
          const statusSelect = document.getElementById('filterStatus');
          if (statusSelect && filterAction) {
            statusSelect.value = filterAction;
            renderQueueTable(); // trigger filter manually
          }
        };
      }
    };

    setKpi('kpiPending', pending, 'Pending');
    setKpi('kpiUnderReview', reviewsData.filter(r => r.status === 'Under Review').length, 'Under Review');
    setKpi('kpiClarifications', clarifications, 'Clarification');
    setKpi('kpiApproved', approved, 'Approved');
    setKpi('kpiRejected', rejected, 'Rejected');
    
    const critEl = document.getElementById('kpiCriticalRisks');
    if (critEl) {
      critEl.querySelector('.kpi-value').innerText = critical;
      critEl.style.cursor = 'pointer';
      critEl.onclick = () => { navigateTo('risk'); };
    }
  }

  // ===== 6. RENDER TABLES =====
  const getPriorityBadge = (p) => {
    const cls = p === 'High' ? 'high' : p === 'Critical' ? 'high' : p === 'Medium' ? 'medium' : 'low';
    return `<span class="priority-badge ${cls}">${p || 'Medium'}</span>`;
  };

  const getStatusBadge = (s) => {
    const str = s || 'Pending';
    const cls = str.toLowerCase().replace(' ', '-');
    return `<span class="status-badge ${cls}">${str}</span>`;
  };

  function renderRecentTable() {
    const recentBody = document.getElementById('recentReviewsBody');
    if (!recentBody) return;
    let html = '';
    reviewsData.slice(0, 5).forEach(r => {
      html += `
        <tr onclick="openReviewWorkspace('${r._id}')" style="cursor:pointer">
          <td><strong style="color:var(--primary)">${r._id.toString().slice(-6)}</strong></td>
          <td>${r.company}</td>
          <td>${r.requirement}</td>
          <td>${r.department}</td>
          <td>${getPriorityBadge(r.priority)}</td>
          <td>${getPriorityBadge('Low')}</td>
          <td>${getStatusBadge(r.status)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <div class="avatar-circle avatar-xs" style="background:var(--primary)">${(r.ownerName || '?').charAt(0)}</div>
              ${r.ownerName || 'Unassigned'}
            </div>
          </td>
          <td style="color:var(--text-muted);font-size:12px">${new Date(r.createdAt).toLocaleDateString()}</td>
          <td><button class="act-btn" title="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
        </tr>
      `;
    });
    recentBody.innerHTML = html;
  }

  window.renderQueueTable = function() {
    const queueBody = document.getElementById('reviewQueueBody');
    if (!queueBody) return;
    
    // Check Filters
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const deptFilter = document.getElementById('filterDept')?.value || '';
    
    const filtered = reviewsData.filter(r => {
      if (statusFilter && statusFilter !== 'All Status' && r.status !== statusFilter) return false;
      if (deptFilter && deptFilter !== 'All Departments' && r.department !== deptFilter) return false;
      return true;
    });

    let html = '';
    filtered.forEach(r => {
      html += `
        <tr>
          <td><input type="checkbox"></td>
          <td><strong style="color:var(--primary);cursor:pointer" onclick="openReviewWorkspace('${r._id}')">${r._id.toString().slice(-6)}</strong></td>
          <td>${r.company}</td>
          <td>${r.client || 'N/A'}</td>
          <td>${r.requirement}</td>
          <td>₹${r.budget || 0}</td>
          <td>${r.timeline || 'TBD'}</td>
          <td>${getPriorityBadge(r.priority)}</td>
          <td>${getPriorityBadge('Low')}</td>
          <td>${r.ownerName || 'Unassigned'}</td>
          <td>${getStatusBadge(r.status)}</td>
          <td><button class="act-btn" onclick="openReviewWorkspace('${r._id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
        </tr>
      `;
    });
    queueBody.innerHTML = html;
  };

  // Add event listener to Filter button
  const applyFilters = document.getElementById('applyFilters');
  if (applyFilters) applyFilters.addEventListener('click', renderQueueTable);

  // ===== 7. WORKSPACE WORKFLOWS =====
  window.openReviewWorkspace = (id, silentRefresh = false) => {
    currentReviewId = id;
    const reviewObj = reviewsData.find(r => r._id === id);
    if (!reviewObj) return;

    if (!silentRefresh) navigateTo('review-workspace');

    // Populate Workspace UI
    if (document.getElementById('rwLeadName')) document.getElementById('rwLeadName').textContent = reviewObj.company;
    if (document.getElementById('rwLeadId')) document.getElementById('rwLeadId').textContent = id.slice(-6);

    renderClientDetails(reviewObj);
    renderChecklist(reviewObj);
    renderClarifications(reviewObj);
    renderWorkspaceTimeline(reviewObj);
    renderAttachments(reviewObj);
    renderApprovals(reviewObj);
  };

  function renderClientDetails(review) {
    const container = document.getElementById('clientDetailsContainer');
    if (!container) return;
    container.innerHTML = `
      <div class="client-detail-row"><span class="cdl">Company</span><span class="cdv">${review.company || 'N/A'}</span></div>
      <div class="client-detail-row"><span class="cdl">Client</span><span class="cdv">${review.client || 'N/A'}</span></div>
      <div class="client-detail-row"><span class="cdl">Department</span><span class="cdv">${review.department || 'N/A'}</span></div>
      <div class="client-detail-row"><span class="cdl">Priority</span><span class="cdv">${review.priority || 'N/A'}</span></div>
      <div class="client-detail-row"><span class="cdl">Status</span><span class="cdv">${review.status || 'N/A'}</span></div>
      <h4 style="margin-top:16px;font-size:13px;font-weight:600;margin-bottom:8px">Requirement Summary</h4>
      <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">${review.requirement || 'No requirement specified.'}</p>
      <div class="client-detail-row" style="margin-top:12px"><span class="cdl">Budget</span><span class="cdv" style="color:var(--success)">₹${review.budget || 0}</span></div>
      <div class="client-detail-row"><span class="cdl">Timeline</span><span class="cdv">${review.timeline || 'TBD'}</span></div>
    `;
  }

  function renderChecklist(review) {
    const container = document.getElementById('reviewChecklist');
    if (!container) return;
    const items = review.checklist || [];
    if (items.length === 0) {
      container.innerHTML = `<p style="font-size:12px;color:var(--text-muted)">No checklist items defined.</p>`;
      return;
    }
    container.innerHTML = items.map(c => `
      <div class="checklist-item ${c.checked ? 'checked' : ''}" onclick="toggleChecklist('${c.label}', ${!c.checked})" style="cursor:pointer">
        <div class="checklist-box">${c.checked ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
        <span class="checklist-label">${c.label}</span>
      </div>
    `).join('');
  }

  window.toggleChecklist = async (label, checked) => {
    if (!currentReviewId) return;
    try {
      await fetch(`/api/department-reviews/${currentReviewId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, checked })
      });
      loadData(); // Will trigger re-render
    } catch (e) { console.error(e); }
  };

  function renderClarifications(review) {
    const commentsSection = document.getElementById('commentsSection');
    if (!commentsSection) return;
    if (!review.clarifications || review.clarifications.length === 0) {
      commentsSection.innerHTML = `<p style="font-size:12px;color:var(--text-muted)">No comments yet.</p>`;
    } else {
      commentsSection.innerHTML = review.clarifications.map(c => `
        <div class="comment-item">
          <div class="avatar-circle avatar-sm" style="background:var(--primary)">${(c.authorName || 'S').charAt(0)}</div>
          <div class="comment-body">
            <div class="comment-author">${c.authorName}</div>
            <div class="comment-text">${c.message}</div>
            <div class="comment-time">${new Date(c.timestamp).toLocaleString()}</div>
          </div>
        </div>
      `).join('');
    }
  }

  function renderWorkspaceTimeline(review) {
    const list = document.getElementById('workspaceActivityList');
    if (!list) return;
    const activities = [];
    activities.push({ content: 'Review created', time: review.createdAt, dot: 'blue' });
    if(review.approvals) {
       review.approvals.forEach(a => activities.push({ content: `Approval ${a.status} at ${a.role}`, time: a.timestamp, dot: a.status==='Approved'?'green':'red' }));
    }
    if(review.clarifications) {
       review.clarifications.forEach(c => activities.push({ content: `Comment added by ${c.authorName}`, time: c.timestamp, dot: 'purple' }));
    }
    activities.sort((a,b) => new Date(b.time) - new Date(a.time));
    
    if (activities.length === 0) {
      list.innerHTML = `<p style="font-size:12px;color:var(--text-muted)">No activities recorded.</p>`;
      return;
    }

    list.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.dot}"></div>
        <div class="activity-content"><strong>${a.content}</strong></div>
        <span class="activity-time">${new Date(a.time).toLocaleString()}</span>
      </div>
    `).join('');
  }

  function renderAttachments(review) {
    const list = document.getElementById('workspaceAttachments');
    if (!list) return;
    const atts = review.attachments || [];
    if (atts.length === 0) {
      list.innerHTML = `<p style="font-size:12px;color:var(--text-muted)">No attachments.</p>`;
      return;
    }
    list.innerHTML = atts.map(a => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg);border-radius:6px;font-size:12px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg> 
        <a href="${a.url}" target="_blank" style="color:inherit;text-decoration:none">${a.filename}</a>
        <span style="margin-left:auto;color:var(--text-light)">${new Date(a.timestamp).toLocaleDateString()}</span>
      </div>
    `).join('');
  }

  function renderApprovals(review) {
    const list = document.getElementById('workspaceApprovals');
    if (!list) return;
    const apps = review.approvals || [];
    if (apps.length === 0) {
      list.innerHTML = `No approvals yet`;
      return;
    }
    list.innerHTML = apps.map(a => `
      <div style="margin-bottom:8px;text-align:left;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--${a.status==='Approved'?'success':a.status==='Rejected'?'danger':'warning'})"></span>
        <strong>${a.role}</strong> - <span style="color:var(--${a.status==='Approved'?'success':a.status==='Rejected'?'danger':'warning'})">${a.status}</span>
        <div style="font-size:11px;color:var(--text-muted);margin-left:auto">${new Date(a.timestamp).toLocaleString()}</div>
      </div>
    `).join('');
  }

  // Add Workspace Clarification
  window.sendClarification = async () => {
    if (!currentReviewId) return;
    const input = document.getElementById('clarificationInput');
    if (!input || !input.value.trim()) return;

    try {
      const res = await fetch(`/api/department-reviews/${currentReviewId}/clarifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.value.trim() })
      });
      const data = await res.json();
      if (data.success) {
        input.value = '';
        showToast('Comment added');
        loadData(); // Re-render everything
      }
    } catch (err) {
      showToast('Error saving comment', 'error');
    }
  };

  // Workspace Actions
  window.workspaceAction = async (actionType) => {
    if (!currentReviewId) return;
    
    const reviewObj = reviewsData.find(r => r._id === currentReviewId);
    if (!reviewObj) return;

    // Define Approval Hierarchy
    const hierarchy = ['Executive', 'Manager', 'Department Head', 'Final Approval'];
    let currentStageIndex = -1;
    
    if (reviewObj.approvals && reviewObj.approvals.length > 0) {
      const lastApproval = reviewObj.approvals[reviewObj.approvals.length - 1];
      if (lastApproval.status === 'Approved') {
        currentStageIndex = hierarchy.indexOf(lastApproval.role);
      }
    }
    
    let nextRole = hierarchy[currentStageIndex + 1];
    if (!nextRole) nextRole = 'Final Approval';
    
    let payload = {};
    let endpoint = `/api/department-reviews/${currentReviewId}/approvals`;
    
    if (actionType === 'Approve') {
      payload = { status: "Approved", role: nextRole, notes: "Approved from UI" };
    } else if (actionType === 'Reject') {
      payload = { status: "Rejected", role: nextRole, notes: "Rejected from UI" };
    } else if (actionType === 'Save') {
      const notes = document.getElementById('deptNotes')?.value;
      if (notes) {
        await fetch(`/api/department-reviews/${currentReviewId}/clarifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Notes updated: " + notes })
        });
      }
      showToast("Review saved.", "success");
      loadData();
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Successfully ${actionType}d at ${nextRole} stage`, "success");
        loadData();
      } else {
        showToast(data.message, "error");
      }
    } catch (err) {
      showToast("Network Error", "error");
    }
  };

  const rwBackBtn = document.getElementById('rwBackBtn');
  if (rwBackBtn) {
    rwBackBtn.addEventListener('click', () => { navigateTo('review-queue'); currentReviewId = null; });
  }

  // ===== 8. KANBAN BOARD =====
  function renderKanbanBoard() {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    const columns = [
      { id: 'pending', name: 'Pending', color: 'var(--indigo)' },
      { id: 'under-review', name: 'Under Review', color: 'var(--primary)' },
      { id: 'clarification', name: 'Clarification', color: 'var(--orange)' },
      { id: 'approved', name: 'Approved', color: 'var(--success)' },
      { id: 'rejected', name: 'Rejected', color: 'var(--danger)' }
    ];

    let html = '';
    columns.forEach(col => {
      const colCards = reviewsData.filter(r => r.status.toLowerCase().replace(' ', '-') === col.id);
      
      const cardsHtml = colCards.map(r => `
          <div class="kanban-card" draggable="true" ondragstart="drag(event)" id="${r._id}" onclick="openReviewWorkspace('${r._id}')">
            <div class="kanban-card-title">${r.company}</div>
            <div class="kanban-card-company">${r.requirement}</div>
            <div class="kanban-card-badges">
              ${getPriorityBadge(r.priority)}
            </div>
            <div class="kanban-card-footer">
              <div class="kanban-card-due">Due: ${new Date(r.createdAt).toLocaleDateString()}</div>
              <div class="avatar-circle avatar-xs" style="background:var(--primary)">${(r.ownerName||'?').charAt(0)}</div>
            </div>
          </div>
        `).join('');

      html += `
        <div class="kanban-column" data-status="${col.name}" ondrop="drop(event)" ondragover="allowDrop(event)">
          <div class="kanban-col-head">
            <span style="display:flex;align-items:center;gap:6px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col.color}"></span>
              ${col.name}
            </span>
            <span class="kanban-count">${colCards.length}</span>
          </div>
          <div class="kanban-cards">
            ${cardsHtml}
          </div>
        </div>
      `;
    });
    
    board.innerHTML = html;
  }

  window.allowDrop = (ev) => {
    ev.preventDefault();
    const column = ev.target.closest('.kanban-column');
    if (column) {
      document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
      column.querySelector('.kanban-cards').classList.add('drag-over');
    }
  };

  window.drag = (ev) => {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.target.classList.add('dragging');
  };

  window.drop = async (ev) => {
    ev.preventDefault();
    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
    document.querySelectorAll('.kanban-card').forEach(c => c.classList.remove('dragging'));
    
    var reviewId = ev.dataTransfer.getData("text");
    const card = document.getElementById(reviewId);
    if (!card) return;

    const column = ev.target.closest('.kanban-column');
    if (column) {
      const newStatus = column.getAttribute('data-status');
      
      try {
        const res = await fetch(`/api/department-reviews/${reviewId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
          // Toast will be shown by socket event if configured, otherwise local:
          // showToast(`Moved to ${newStatus}`, 'success');
        } else {
          showToast(`Error: ${data.message}`, 'error');
        }
      } catch (err) {
        showToast("Network error", "error");
      }
    }
  };

  document.addEventListener('dragend', (ev) => {
    if(ev.target.classList) ev.target.classList.remove('dragging');
    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
  });

  // ===== 9. CHARTS =====
  let charts = {};
  const commonOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  function renderDashboardCharts() {
    if (typeof Chart === 'undefined') return;
    ['pipelineChart', 'workloadChart', 'approvalTrendChart'].forEach(id => {
      if (charts[id]) charts[id].destroy();
    });

    const counts = [
      reviewsData.filter(r => r.status === 'Pending').length,
      reviewsData.filter(r => r.status === 'Under Review').length,
      reviewsData.filter(r => r.status === 'Clarification').length,
      reviewsData.filter(r => r.status === 'Approved').length,
      reviewsData.filter(r => r.status === 'Rejected').length
    ];

    const ctxPipe = document.getElementById('pipelineChart');
    if (ctxPipe) {
      charts.pipelineChart = new Chart(ctxPipe, {
        type: 'bar',
        data: {
          labels: ['Pending', 'Under Review', 'Clarification', 'Approved', 'Rejected'],
          datasets: [{ data: counts, backgroundColor: ['#f59e0b', '#2563eb', '#f97316', '#10b981', '#ef4444'], borderRadius: 4 }]
        },
        options: { indexAxis: 'y', ...commonOptions, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }
      });
    }
  }

  // ===== 10. TOAST SYSTEM =====
  window.showToast = (message, type = 'success') => {
    const stack = document.getElementById('toastStack');
    if (!stack) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✓' : type === 'info' ? 'ℹ' : '✕';
    toast.innerHTML = `<span style="font-weight:bold;margin-right:8px">${icon}</span> <span>${message}</span>`;
    
    stack.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Run
  loadData();
});
