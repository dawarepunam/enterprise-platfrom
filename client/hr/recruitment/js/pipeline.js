let candidatesList = [];

document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  // Socket listener for real-time updates
  socket.on('stageChanged', (data) => {
    fetchCandidates(); // Re-fetch to keep it simple, or move element in DOM
  });
  
  socket.on('candidateAdded', () => {
    fetchCandidates();
  });

  fetchCandidates();
});

async function fetchCandidates() {
  try {
    const res = await fetch('/api/recruitment/candidates');
    candidatesList = await res.json();
    renderKanban();
  } catch (err) {
    console.error('Error fetching candidates:', err);
  }
}

function renderKanban() {
  // Clear columns
  document.querySelectorAll('.kanban-cards').forEach(container => container.innerHTML = '');

  candidatesList.forEach(cand => {
    const stage = cand.stage || 'Applied';
    const container = document.querySelector(`.kanban-cards[data-stage="${stage}"]`);
    if (container) {
      const card = document.createElement('div');
      card.className = 'k-card';
      card.draggable = true;
      card.id = cand._id;
      card.ondragstart = drag;
      
      let jobTitle = cand.jobApplied ? cand.jobApplied.title : 'General Application';
      
      card.innerHTML = `
        <div class="k-card-title">${cand.name}</div>
        <div class="k-card-subtitle">${jobTitle}</div>
        <div class="k-card-meta">
          <span class="k-card-rating"><i class="fas fa-star"></i> ${cand.rating || 0}</span>
          <span><i class="fas fa-paperclip"></i> Resume</span>
        </div>
      `;
      container.appendChild(card);
    }
  });
  updateCounts();
}

// Drag and Drop Logic
window.allowDrop = function(ev) {
  ev.preventDefault();
  const column = ev.currentTarget;
  column.classList.add('drag-over');
}

window.drag = function(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
  setTimeout(() => ev.target.classList.add('dragging'), 0);
}

window.drop = async function(ev) {
  ev.preventDefault();
  const column = ev.currentTarget;
  column.classList.remove('drag-over');
  
  const data = ev.dataTransfer.getData("text");
  const card = document.getElementById(data);
  
  if (card) {
    card.classList.remove('dragging');
    const cardsContainer = column.querySelector('.kanban-cards');
    cardsContainer.appendChild(card);
    updateCounts();
    
    const newStage = cardsContainer.getAttribute('data-stage');
    
    // API Call
    try {
      await fetch(`/api/recruitment/candidates/${data}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      showToast(\`Candidate moved to \${newStage}\`, 'success');
    } catch(e) {
      showToast('Error updating candidate stage', 'error');
    }
  }
}

document.querySelectorAll('.kanban-column').forEach(col => {
  col.addEventListener('dragleave', (e) => {
    col.classList.remove('drag-over');
  });
});

document.addEventListener('dragend', (e) => {
  if (e.target && e.target.classList) {
    e.target.classList.remove('dragging');
  }
});

function updateCounts() {
  document.querySelectorAll('.kanban-column').forEach(col => {
    const count = col.querySelectorAll('.k-card').length;
    col.querySelector('.column-count').textContent = count;
  });
}
