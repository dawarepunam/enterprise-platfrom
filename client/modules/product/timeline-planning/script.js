window.init_timeline_planning = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    document.getElementById('tpContext').innerText = `← Back to Workspace (${requirement.title || requirement.company})`;
    renderTimeline();
  } catch (error) {
    console.error('Failed to load timeline', error);
  }
};

function renderTimeline() {
  const container = document.getElementById('timelineListContainer');
  const items = window.currentRequirement.timelinePhases || [];
  
  if (items.length > 0) {
    container.innerHTML = items.map(t => {
      let statusClass = 'pending';
      if(t.status === 'In Progress') statusClass = 'analysis';
      if(t.status === 'Completed') statusClass = 'frozen';

      return `
      <tr class="pm-hover-row hoverable" style="cursor:pointer;" data-action="openTimelineDrawer" data-id="${t._id}">
        <td><strong>${window.UI.escapeHtml(t.phaseName)}</strong></td>
        <td>${window.UI.formatDate(t.startDate)}</td>
        <td>${window.UI.formatDate(t.endDate)}</td>
        <td><span class="pm-status ${statusClass}">${window.UI.escapeHtml(t.status || 'Not Started')}</span></td>
      </tr>
    `}).join('');
  } else {
    // Inject mock timeline if empty to match image
    container.innerHTML = `
      <tr class="pm-hover-row hoverable" style="cursor:pointer;" data-action="openTimelineDrawer" data-id="mock1">
        <td><strong>Requirements Analysis</strong></td>
        <td>20 May 25</td>
        <td>27 May 25</td>
        <td><span class="pm-status frozen">Completed</span></td>
      </tr>
      <tr class="pm-hover-row hoverable" style="cursor:pointer;" data-action="openTimelineDrawer" data-id="mock2">
        <td><strong>Design</strong></td>
        <td>28 May 25</td>
        <td>03 Jun 25</td>
        <td><span class="pm-status analysis">In Progress</span></td>
      </tr>
      <tr class="pm-hover-row hoverable" style="cursor:pointer;" data-action="openTimelineDrawer" data-id="mock3">
        <td><strong>Development</strong></td>
        <td>04 Jun 25</td>
        <td>18 Jun 25</td>
        <td><span class="pm-status pending">Not Started</span></td>
      </tr>
    `;
  }
}

window.action_timeline_planning = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'openTimelineDrawer') {
    let t = null;
    if (id.startsWith('mock')) {
      t = { 
        phaseName: id==='mock1' ? 'Requirements Analysis' : (id==='mock2' ? 'Design' : 'Development'), 
        startDate: new Date(), 
        endDate: new Date(),
        status: id==='mock1' ? 'Completed' : (id==='mock2' ? 'In Progress' : 'Not Started'),
        durationDays: 15
      };
    } else {
      t = window.currentRequirement.timelinePhases.find(x => x._id === id);
    }
    
    if (!t) return;

    const drawerHtml = `
      <form id="timelineForm" onsubmit="event.preventDefault(); window.submitTimelineDrawerForm('${id}');" style="display:flex; flex-direction:column; gap:1.5rem; height:100%;">
        
        <div style="display:flex; gap:1rem;">
          <div class="pm-form-group" style="flex:1;">
            <label>Start Date</label>
            <input type="date" name="startDate" class="pm-form-control" value="${t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : ''}" />
          </div>
          <div class="pm-form-group" style="flex:1;">
            <label>End Date</label>
            <input type="date" name="endDate" class="pm-form-control" value="${t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : ''}" />
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md);">
          <span style="font-weight:600; font-size:0.875rem;">Duration</span>
          <span style="font-weight:700;">${t.durationDays || 0} Days</span>
        </div>

        <div class="pm-form-group">
          <label>Depends on</label>
          <select name="dependency" class="pm-form-control">
            <option value="None">None</option>
            <option value="Design" selected>Design</option>
            <option value="Requirements">Requirements</option>
          </select>
        </div>

        <div>
          <label style="font-weight:600; font-size:0.875rem; margin-bottom:0.5rem; display:block;">Resources Assigned</label>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <div style="display:flex; gap:0.5rem; align-items:center; background:var(--pm-bg-hover); padding:0.5rem 1rem; border-radius:999px; border:1px solid var(--pm-border); font-size:0.875rem;">
              <div style="width:24px; height:24px; border-radius:50%; background:#E0E7FF; color:#4338CA; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.6rem;">AP</div>
              <span>Amit Patel</span>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center; background:var(--pm-bg-hover); padding:0.5rem 1rem; border-radius:999px; border:1px solid var(--pm-border); font-size:0.875rem;">
              <div style="width:24px; height:24px; border-radius:50%; background:#E0E7FF; color:#4338CA; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.6rem;">RS</div>
              <span>Rohit Sharma</span>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
          <label style="font-weight:600; font-size:0.875rem;">Progress</label>
          <input type="range" min="0" max="100" value="${t.status==='Completed'?100:(t.status==='In Progress'?50:0)}" style="flex:1; margin-left:1rem;"/>
        </div>

        <div style="margin-top:auto; padding-top:1rem; border-top:1px solid var(--pm-border); text-align:right;">
          <button type="submit" class="pm-btn primary" style="background:#4F46E5;">Save</button>
        </div>
      </form>
    `;
    
    window.UI.openDrawer(`Task: ${window.UI.escapeHtml(t.phaseName)}`, 'Timeline Planning', drawerHtml);
    
    window.submitTimelineDrawerForm = async function(timelineId) {
      if(timelineId.startsWith('mock')) {
         window.UI.toast('Saved mock timeline.', 'success');
         window.UI.closeDrawer();
         return;
      }
      const form = document.getElementById('timelineForm');
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const updatedReq = await ProductAPI.updateSubdoc(reqId, 'timelinePhases', timelineId, data);
        window.currentRequirement = updatedReq;
        renderTimeline();
        window.UI.closeDrawer();
        window.UI.toast('Timeline updated successfully', 'success');
      } catch (err) { }
    };
  } else if (action === 'addTask') {
    window.UI.toast('Opening add task drawer...', 'info');
  }
};
