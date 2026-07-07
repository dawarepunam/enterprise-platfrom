document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  const schedulePopup = document.getElementById('schedulePopup');
  const scheduleBtn = document.getElementById('scheduleBtn');
  const closeScheduleBtn = document.getElementById('closeScheduleBtn');
  const scheduleForm = document.getElementById('scheduleForm');
  const tbody = document.getElementById('interviewsTableBody');

  scheduleBtn.addEventListener('click', () => schedulePopup.classList.add('active'));
  closeScheduleBtn.addEventListener('click', () => schedulePopup.classList.remove('active'));
  schedulePopup.addEventListener('click', (e) => { if(e.target === schedulePopup) schedulePopup.classList.remove('active'); });

  socket.on('interviewScheduled', () => {
    fetchInterviews();
  });

  async function fetchInterviews() {
    try {
      const res = await fetch('/api/recruitment/interviews');
      const interviews = await res.json();
      renderTable(interviews);
    } catch (err) {
      console.error('Error fetching interviews:', err);
    }
  }

  scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      candidateName: document.getElementById('intCandidate').value,
      panelMembers: [{ name: document.getElementById('intPanel').value }],
      scheduledAt: new Date(document.getElementById('intDate').value + 'T' + document.getElementById('intTime').value),
      meetingJoinUrl: document.getElementById('intLink').value,
      status: 'SCHEDULED'
    };

    try {
      const res = await fetch('/api/recruitment/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Interview Scheduled', 'success');
        schedulePopup.classList.remove('active');
        scheduleForm.reset();
        fetchInterviews();
      }
    } catch (err) {
      showToast('Error scheduling interview', 'error');
    }
  });

  function renderTable(interviews) {
    if (!interviews || interviews.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No interviews scheduled.</td></tr>';
      return;
    }

    tbody.innerHTML = interviews.map(row => {
      const date = new Date(row.scheduledAt).toLocaleString();
      const statusClass = row.status === 'COMPLETED' ? 'status-success' : 'status-pending';
      const panel = row.panelMembers && row.panelMembers.length > 0 ? row.panelMembers[0].name : 'N/A';
      return \`
        <tr>
          <td><strong>\${row.candidateName}</strong></td>
          <td>\${row.position || 'N/A'}</td>
          <td>\${panel}</td>
          <td>\${date}</td>
          <td><span class="status-badge \${statusClass}">\${row.status}</span></td>
          <td>
            <div class="action-btns">
              <button class="action-btn" title="Feedback"><i class="fas fa-comment-dots"></i></button>
              \${row.meetingJoinUrl ? \`<a href="\${row.meetingJoinUrl}" target="_blank" class="action-btn text-success" title="Join Meeting"><i class="fas fa-video"></i></a>\` : ''}
            </div>
          </td>
        </tr>
      \`;
    }).join('');
  }

  fetchInterviews();
});
