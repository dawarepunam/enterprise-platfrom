document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  
  socket.on('structureUpdated', (data) => {
    showToast(`Structure updated successfully`, 'success');
    renderTable(); // Reload table
  });

  const editPopup = document.getElementById('editPopup');
  const closeEditBtn = document.getElementById('closeEditBtn');
  const editForm = document.getElementById('editForm');
  const addStructureBtn = document.getElementById('addStructureBtn');

  const viewDrawer = document.getElementById('viewDrawer');
  const viewDrawerOverlay = document.getElementById('viewDrawerOverlay');
  const closeViewDrawer = document.getElementById('closeViewDrawer');

  function openEditPopup(data = {}) {
    editPopup.classList.add('active');
    document.getElementById('editGrade').value = data.grade || '';
    document.getElementById('editType').value = data.type || 'Permanent';
    document.getElementById('editBasic').value = data.basic || '';
    document.getElementById('editHra').value = data.hra || '';
    document.getElementById('editAllowance').value = data.allowance || '';
    document.getElementById('editPf').value = data.pf || '';
    document.getElementById('editTax').value = data.tax || '';
    document.getElementById('editGross').value = data.gross || '';
  }
  
  function closeEditPopup() { editPopup.classList.remove('active'); }

  function openViewDrawer() {
    viewDrawer.classList.add('active');
    viewDrawerOverlay.classList.add('active');
  }

  function closeDrawer() {
    viewDrawer.classList.remove('active');
    viewDrawerOverlay.classList.remove('active');
  }

  addStructureBtn.addEventListener('click', () => openEditPopup());
  closeEditBtn.addEventListener('click', closeEditPopup);
  editPopup.addEventListener('click', (e) => { if(e.target === editPopup) closeEditPopup(); });
  
  closeViewDrawer.addEventListener('click', closeDrawer);
  viewDrawerOverlay.addEventListener('click', closeDrawer);

  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Salary Structure Updated Successfully', 'success');
    // Mock emit for local demo
    socket.emit('structureUpdated', { timestamp: new Date() });
    closeEditPopup();
  });

  function renderTable() {
    const tbody = document.getElementById('structureTableBody');
    const mockData = [
      { grade: 'Grade A', basic: 50000, hra: 25000, allowance: 10000, pf: 6000, tax: 15000, gross: 106000 },
      { grade: 'Grade B', basic: 30000, hra: 15000, allowance: 8000, pf: 3600, tax: 5000, gross: 61600 }
    ];

    tbody.innerHTML = mockData.map(row => `
      <tr>
        <td><strong>${row.grade}</strong></td>
        <td>$${row.basic}</td>
        <td>$${row.hra}</td>
        <td>$${row.allowance}</td>
        <td>$${row.pf}</td>
        <td>$${row.tax}</td>
        <td>$${row.gross}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn view-btn" title="View"><i class="fas fa-eye"></i></button>
            <button class="action-btn edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="action-btn history-btn" title="History"><i class="fas fa-history"></i></button>
            <button class="action-btn clone-btn" title="Clone"><i class="fas fa-copy"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', openViewDrawer));
    document.querySelectorAll('.edit-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => openEditPopup(mockData[index]));
    });
    document.querySelectorAll('.clone-btn').forEach(btn => btn.addEventListener('click', () => showToast('Structure Cloned', 'success')));
  }

  renderTable();
});
