document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const tbody = document.getElementById('onboardingTableBody');

  async function fetchOnboardingList() {
    try {
      const res = await fetch('/api/lifecycle/onboarding');
      const hires = await res.json();
      renderTable(hires);
    } catch (err) {
      console.error('Error fetching onboarding list:', err);
    }
  }

  function renderTable(hires) {
    if (!hires || hires.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No recent hires found.</td></tr>';
      return;
    }

    tbody.innerHTML = hires.map(row => {
      const date = new Date(row.createdAt).toLocaleDateString();
      return \`
        <tr>
          <td><strong>\${row.name}</strong></td>
          <td>\${row.role || 'Employee'}</td>
          <td>\${date}</td>
          <td><span class="status-badge status-pending">Pending Docs</span></td>
          <td>
            <div class="action-btns">
              <button class="action-btn" title="View Docs" onclick="showToast('Loading Docs...', 'info')"><i class="fas fa-folder-open"></i></button>
              <button class="action-btn text-success" title="Assign Assets" onclick="showToast('Opening Asset Mapper...', 'info')"><i class="fas fa-laptop"></i></button>
            </div>
          </td>
        </tr>
      \`;
    }).join('');
  }

  fetchOnboardingList();
});
