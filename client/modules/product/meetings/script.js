window.init_meetings = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    renderMeetings();
  } catch (error) {
    console.error('Failed to load meetings', error);
  }
};

function renderMeetings() {
  const tbody = document.getElementById('meetingTableBody');
  const items = window.currentRequirement.meetings || [];
  
  if (items.length > 0) {
    tbody.innerHTML = items.map(item => `
      <tr>
        <td><strong>${window.UI.escapeHtml(item.title)}</strong></td>
        <td>${window.UI.formatDate(item.date)}</td>
        <td>${window.UI.escapeHtml(item.agenda || '-')}</td>
        <td>${(item.attendees || []).join(', ')}</td>
        <td>
          <button class="pm-btn danger" data-action="deleteMeeting" data-id="${item._id}">Delete</button>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No meetings logged yet.</td></tr>';
  }
}

window.action_meetings = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'addMeeting') {
    window.UI.openModal('Log Meeting', `
      <form id="meetingForm" onsubmit="event.preventDefault(); window.submitMeetingForm();">
        <div class="pm-form-group">
          <label>Meeting Title</label>
          <input type="text" name="title" class="pm-form-control" required />
        </div>
        <div class="pm-form-group">
          <label>Date & Time</label>
          <input type="datetime-local" name="date" class="pm-form-control" required />
        </div>
        <div class="pm-form-group">
          <label>Agenda</label>
          <textarea name="agenda" class="pm-form-control"></textarea>
        </div>
        <div class="pm-form-group">
          <label>Attendees (comma separated)</label>
          <input type="text" name="attendees" class="pm-form-control" />
        </div>
        <div style="margin-top: 1rem; text-align: right;">
          <button type="submit" class="pm-btn primary">Save Meeting</button>
        </div>
      </form>
    `);
    
    window.submitMeetingForm = async function() {
      const form = document.getElementById('meetingForm');
      const data = Object.fromEntries(new FormData(form).entries());
      data.attendees = data.attendees.split(',').map(s => s.trim()).filter(Boolean);
      try {
        const updatedReq = await ProductAPI.addSubdoc(reqId, 'meetings', data);
        window.currentRequirement = updatedReq;
        renderMeetings();
        window.UI.closeModal();
        window.UI.toast('Meeting logged', 'success');
      } catch (err) { }
    };
  }
  
  if (action === 'deleteMeeting') {
    if (confirm('Delete this meeting?')) {
      try {
        const updatedReq = await ProductAPI.deleteSubdoc(reqId, 'meetings', id);
        window.currentRequirement = updatedReq;
        renderMeetings();
        window.UI.toast('Meeting deleted', 'info');
      } catch (err) { }
    }
  }
};
