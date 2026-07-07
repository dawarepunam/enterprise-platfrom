document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const travelPopup = document.getElementById('travelPopup');
  const addTravelBtn = document.getElementById('addTravelBtn');
  const closeTravelBtn = document.getElementById('closeTravelBtn');
  const travelForm = document.getElementById('travelForm');
  const tbody = document.getElementById('travelTableBody');
  const viewDrawer = document.getElementById('viewDrawer');
  const viewDrawerOverlay = document.getElementById('viewDrawerOverlay');
  const closeViewDrawer = document.getElementById('closeViewDrawer');

  addTravelBtn.addEventListener('click', () => travelPopup.classList.add('active'));
  closeTravelBtn.addEventListener('click', () => travelPopup.classList.remove('active'));
  travelPopup.addEventListener('click', (e) => { if(e.target === travelPopup) travelPopup.classList.remove('active'); });

  window.closeDrawer = () => {
    viewDrawer.classList.remove('active');
    viewDrawerOverlay.classList.remove('active');
  };

  closeViewDrawer.addEventListener('click', closeDrawer);
  viewDrawerOverlay.addEventListener('click', closeDrawer);

  socket.on('travelCreated', () => fetchTravels());
  socket.on('travelUpdated', () => fetchTravels());

  async function fetchTravels() {
    try {
      const res = await fetch('/api/claims-benefits/travel');
      const requests = await res.json();
      renderTable(requests);
    } catch (err) {
      console.error('Error fetching travel requests:', err);
    }
  }

  travelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      destination: document.getElementById('travelDest').value,
      purpose: document.getElementById('travelPurpose').value,
      startDate: document.getElementById('travelStart').value,
      endDate: document.getElementById('travelEnd').value,
      estimatedCost: document.getElementById('travelCost').value
    };

    try {
      const res = await fetch('/api/claims-benefits/travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Travel Request Submitted', 'success');
        travelPopup.classList.remove('active');
        travelForm.reset();
        fetchTravels();
      }
    } catch (err) {
      showToast('Error saving travel request', 'error');
    }
  });

  function renderTable(requests) {
    if (!requests || requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No travel requests found.</td></tr>';
      return;
    }

    tbody.innerHTML = requests.map(row => {
      const sDate = new Date(row.startDate).toLocaleDateString();
      const eDate = new Date(row.endDate).toLocaleDateString();
      const empName = row.employeeId ? row.employeeId.name : 'N/A';
      
      let statusClass = 'status-pending';
      if(row.status === 'Manager Approved' || row.status === 'HR Approved') statusClass = 'status-success';
      if(row.status === 'Rejected') statusClass = 'status-danger';

      return \`
        <tr>
          <td><strong>\${empName}</strong></td>
          <td>\${row.destination}</td>
          <td>\${sDate} to \${eDate}</td>
          <td>$\${row.estimatedCost || 0}</td>
          <td><span class="status-badge \${statusClass}">\${row.status}</span></td>
          <td>
            <div class="action-btns">
              <button class="action-btn view-btn" title="Review" onclick="showToast('Loading Review...', 'info')"><i class="fas fa-eye"></i></button>
            </div>
          </td>
        </tr>
      \`;
    }).join('');
  }

  fetchTravels();
});
