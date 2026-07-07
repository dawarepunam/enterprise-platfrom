document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const claimPopup = document.getElementById('claimPopup');
  const addClaimBtn = document.getElementById('addClaimBtn');
  const closeClaimBtn = document.getElementById('closeClaimBtn');
  const claimForm = document.getElementById('claimForm');
  const tbody = document.getElementById('claimsTableBody');
  const viewDrawer = document.getElementById('viewDrawer');
  const viewDrawerOverlay = document.getElementById('viewDrawerOverlay');
  const closeViewDrawer = document.getElementById('closeViewDrawer');

  addClaimBtn.addEventListener('click', () => claimPopup.classList.add('active'));
  closeClaimBtn.addEventListener('click', () => claimPopup.classList.remove('active'));
  claimPopup.addEventListener('click', (e) => { if(e.target === claimPopup) claimPopup.classList.remove('active'); });

  window.closeDrawer = () => {
    viewDrawer.classList.remove('active');
    viewDrawerOverlay.classList.remove('active');
  };

  closeViewDrawer.addEventListener('click', closeDrawer);
  viewDrawerOverlay.addEventListener('click', closeDrawer);

  socket.on('claimCreated', () => fetchClaims());
  socket.on('claimApproved', () => fetchClaims());

  async function fetchClaims() {
    try {
      const res = await fetch('/api/claims-benefits/claims');
      const claims = await res.json();
      renderTable(claims);
    } catch (err) {
      console.error('Error fetching claims:', err);
    }
  }

  claimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      type: document.getElementById('claimType').value,
      amount: document.getElementById('claimAmount').value,
      date: document.getElementById('claimDate').value,
      description: document.getElementById('claimDesc').value
    };

    try {
      const res = await fetch('/api/claims-benefits/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Claim Saved Successfully', 'success');
        claimPopup.classList.remove('active');
        claimForm.reset();
        fetchClaims();
      }
    } catch (err) {
      showToast('Error saving claim', 'error');
    }
  });

  function renderTable(claims) {
    if (!claims || claims.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No claims found.</td></tr>';
      return;
    }

    tbody.innerHTML = claims.map(row => {
      const date = new Date(row.date).toLocaleDateString();
      const empName = row.employeeId ? row.employeeId.name : 'N/A';
      let statusClass = 'status-pending';
      if(row.status === 'Approved' || row.status === 'Reimbursed') statusClass = 'status-success';
      if(row.status === 'Rejected') statusClass = 'status-danger';

      return \`
        <tr>
          <td><strong>\${empName}</strong></td>
          <td>\${row.type}</td>
          <td>$\${row.amount}</td>
          <td>\${date}</td>
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

  fetchClaims();
});
