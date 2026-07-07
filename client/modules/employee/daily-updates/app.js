// Phase 11 — Daily Updates — app.js
'use strict';

/* ─── Auth & Socket Init ─────────────────────────────── */
const token = localStorage.getItem('token');
if (!token) location.href = '/login';

let socket;
let selectedMood = 3;
let selectedFiles = [];
let editingId = null;
let todayUpdate = null;
let assignedProjects = [];
let assignedTasks = [];

const api = (url, opts = {}) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }, ...opts })
    .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'API Error'); return d; });

async function readJsonResponse(res) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) return res.json();
    const text = await res.text();
    throw new Error(text.includes('<!DOCTYPE') ? 'Upload endpoint returned a page instead of JSON. Please restart the server and try again.' : text || 'Upload failed');
}

/* ─── DOM Refs ───────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ─── Init ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async() => {
    setDateLabel();
    setupMood();
    setupToolbar();
    setupFileUpload();
    setupCharCounter();
    setupDragDrop();
    await loadAssignmentContext();

    await Promise.all([loadToday(), loadHistory(), loadStats()]);
    initSocket();

    const editData = sessionStorage.getItem('editUpdate');
    if (editData) {
        sessionStorage.removeItem('editUpdate');
        fillForm(JSON.parse(editData));
    }
});

/* ─── Date Label ─────────────────────────────────────── */
function setDateLabel() {
    const now = new Date();
    $('duDateLabel').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('duSubtitle').textContent = `${now.toLocaleDateString('en-IN', { weekday: 'long' })} — keep your PM updated!`;
}

async function loadAssignmentContext() {
    try {
        const [projectRes, taskRes] = await Promise.all([
            api('/api/projects/employee').catch(() => ({ data: [] })),
            api('/api/tasks?assignedToMe=true&size=200').catch(() => ({ data: [] })),
        ]);
        assignedProjects = projectRes.data || projectRes.projects || [];
        assignedTasks = taskRes.data || taskRes.tasks || [];
        renderProjectOptions();
    } catch (error) {
        renderProjectOptions();
    }
}

function renderProjectOptions() {
    const projectSelect = $('duProject');
    if (!projectSelect) return;
    projectSelect.innerHTML = assignedProjects.length ?
        assignedProjects.map(p => `<option value="${p._id || p.id}">${escapeHtml(p.projectName || p.name || 'Untitled Project')}</option>`).join('') :
        '<option value="">No assigned projects</option>';
    projectSelect.addEventListener('change', renderTaskOptions);
    renderTaskOptions();
}

function renderTaskOptions() {
    const taskSelect = $('duTask');
    const projectId = $('duProject') ? .value || '';
    if (!taskSelect) return;
    const tasks = assignedTasks.filter(t => !projectId || String(t.projectId || '') === String(projectId));
    taskSelect.innerHTML = tasks.length ?
        tasks.map(t => `<option value="${t._id || t.id}">${escapeHtml(t.title || t.name || 'Untitled Task')}</option>`).join('') :
        '<option value="">General project update</option>';
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/* ─── Mood Picker ────────────────────────────────────── */
function setupMood() {
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedMood = Number(btn.dataset.mood);
            $('duMood').value = selectedMood;
        });
    });
}

/* ─── Toolbar (text helpers) ─────────────────────────── */
function setupToolbar() {
    document.querySelectorAll('.du-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ta = $(btn.dataset.field);
            const prefix = btn.dataset.prefix;
            const pos = ta.selectionStart;
            const lineStart = ta.value.lastIndexOf('\n', pos - 1) + 1;
            ta.value = ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart);
            ta.focus();
            updateCharCount();
        });
    });
}

/* ─── Char Counter ───────────────────────────────────── */
function setupCharCounter() {
    $('duWork').addEventListener('input', updateCharCount);
}

function updateCharCount() {
    const len = $('duWork').value.length;
    const el = $('workCount');
    el.textContent = `${len} / 2000`;
    el.classList.toggle('over', len > 2000);
}

/* ─── File Upload ────────────────────────────────────── */
function setupFileUpload() {
    $('duFiles').addEventListener('change', e => addFiles(Array.from(e.target.files)));
    $('btnSubmit').addEventListener('click', (e) => {
        e.preventDefault();
        const isDraft = $('updateStatusSelect').value === 'draft';
        submitUpdate(isDraft);
    });
    $('btnNewUpdate').addEventListener('click', () => { editingId = null;
        clearForm();
        $('duFormCard').scrollIntoView({ behavior: 'smooth' }); });
    $('btnEditToday').addEventListener('click', () => { if (todayUpdate) fillForm(todayUpdate); });
}

function addFiles(files) {
    files.forEach(f => {
        if (f.size > 10 * 1024 * 1024) return alert(`${f.name} exceeds 10MB`);
        selectedFiles.push(f);
    });
    renderFileList();
}

function renderFileList() {
    $('duFileList').innerHTML = selectedFiles.map((f, i) => `
    <div class="du-file-chip">
      📎 ${f.name}
      <button onclick="removeFile(${i})">×</button>
    </div>`).join('');
}

window.removeFile = i => { selectedFiles.splice(i, 1);
    renderFileList(); };

/* ─── Drag & Drop ────────────────────────────────────── */
function setupDragDrop() {
    const dz = $('duDropZone');
    dz.addEventListener('dragover', e => { e.preventDefault();
        dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
        e.preventDefault();
        dz.classList.remove('drag-over');
        addFiles(Array.from(e.dataTransfer.files));
    });
    dz.addEventListener('click', () => $('duFiles').click());
}

/* ─── Clear / Fill Form ──────────────────────────────── */
function clearForm() {
    ['duWork', 'duBlockers', 'duTomorrow'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('duHours')) $('duHours').value = 8;
    selectedFiles = [];
    renderFileList();
    const t = $('formTitleText');
    if (t) t.innerHTML = '<i class="fa fa-edit"></i> Today\'s Report';
}

function fillForm(u) {
    editingId = u._id;
    if ($('duWork')) $('duWork').value = u.todayWork || u.work || '';
    if ($('duBlockers')) $('duBlockers').value = u.blockers || u.issues || '';
    if ($('duTomorrow')) $('duTomorrow').value = u.tomorrowPlan || u.tomorrow || '';
    if ($('duHours')) $('duHours').value = u.hoursLogged || u.hours || 8;
    const t = $('formTitleText');
    if (t) t.innerHTML = '<i class="fa fa-pen"></i> Edit Update';
    updateCharCount();
}

/* ─── Load Today ─────────────────────────────────────── */
async function loadToday() {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await api(`/api/daily-updates/user?date=${today}`);
        const updates = res.data || [];
        const todayUpd = updates.find(u => (u.date || u.createdAt || '').slice(0, 10) === today);
        if (todayUpd) {
            todayUpdate = todayUpd;
            $('todayBanner').style.display = 'flex';
            $('bannerTime').textContent = `Submitted at ${new Date(todayUpd.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        }
    } catch { /* no update today */ }
}

/* ─── Load History ───────────────────────────────────── */
async function loadHistory() {
    const days = $('duFilter').value || 30;
    try {
        const res = await api(`/api/daily-updates/user?days=${days}`);
        let updates = res.data || [];

        // Check URL for view parameter
        const viewParams = new URLSearchParams(window.location.search);
        const view = viewParams.get('view');

        if (view) {
            if (view === 'drafts') updates = updates.filter(u => (u.status || '').toLowerCase() === 'draft');
            else if (view === 'viewed') updates = updates.filter(u => u.viewedByPM || u.pmViewed);
            // for 'all' we don't filter

            // Adjust UI for view mode
            const formCard = document.querySelector('.main-grid > div:first-child');
            if (formCard) formCard.style.display = 'none';

            const grid = document.querySelector('.main-grid');
            if (grid) grid.style.gridTemplateColumns = '1fr';

            const histHdrTitle = document.querySelector('.hist-title');
            if (histHdrTitle) {
                let label = 'All Updates';
                if (view === 'drafts') label = 'Saved Drafts';
                if (view === 'viewed') label = 'Updates Viewed by Manager';
                histHdrTitle.innerHTML = `<i class="fa fa-folder-open"></i> ${label} <button onclick="window.location.href='/employee/daily-updates'" style="margin-left:12px;padding:4px 12px;background:#f4f7fe;border:none;border-radius:8px;cursor:pointer;font-weight:600;color:#3965FF;font-size:12px;"><i class="fa fa-arrow-left"></i> Back to Form</button>`;
            }
        }

        renderHistory(updates);
    } catch (e) {
        $('duHistoryList').innerHTML = `<div class="du-empty" style="text-align:center;padding:40px;"><div class="du-empty-icon" style="font-size:40px;margin-bottom:16px;">⚠️</div><p style="color:#EE5D50;font-weight:600;">${e.message}</p></div>`;
    }
}

async function loadStats() {
    try {
        const res = await api('/api/daily-updates/stats');
        const s = res.data || {};
        if ($('statTotal')) $('statTotal').textContent = s.total ? ? '—';
        if ($('statStreak')) $('statStreak').textContent = s.streak ? ? '—';
        if ($('statViewed')) $('statViewed').textContent = s.viewed ? ? '—';
        if ($('statDrafts')) $('statDrafts').textContent = s.drafts ? ? '—';
        if (s.streak >= 3 && $('streakBadge')) {
            $('streakBadge').style.display = 'flex';
            if ($('streakCount')) $('streakCount').textContent = s.streak;
        }
    } catch { /* silent */ }
}

$('duFilter').addEventListener('change', loadHistory);

function renderHistory(updates) {
    if (!updates.length) {
        $('duHistoryList').innerHTML = '<div class="du-empty" style="text-align:center;padding:40px;"><div class="du-empty-icon" style="font-size:40px;margin-bottom:16px;">📝</div><p style="color:#a3aed1;font-weight:600;">No updates found.</p></div>';
        return;
    }
    $('duHistoryList').innerHTML = updates.map(u => {
                const d = new Date(u.createdAt);
                const isViewed = u.viewedByPM || u.pmViewed;
                const isDraft = u.status === 'draft';
                const preview = u.todayWork || u.work || u.description || '—';
                return `
    <div class="upd-item" onclick="showDetail('${u._id}')" style="background:#fff; ${isDraft ? 'border-left: 4px solid #FFB547;' : 'border-left: 4px solid #3965FF;'}">
      <div class="upd-top">
        <div class="upd-date">
          ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
        <div>
          ${isDraft ? '<span class="badge" style="background:rgba(255,181,71,0.12);color:#FFB547;">Draft</span>' : ''}
          ${isViewed ? '<span class="badge bg-g">👁 Viewed</span>' : (!isDraft ? '<span class="badge bg-gray">Pending</span>' : '')}
        </div>
      </div>
      <div class="upd-desc" style="margin-bottom:12px;">${preview}</div>
      <div style="display:flex;gap:12px;font-size:12px;color:#a3aed1;font-weight:600;">
        <span><i class="fa fa-clock"></i> ${u.hoursLogged || u.hours || 8}h</span>
        ${u.mood ? `<span>${['', '😞', '😔', '😐', '😊', '🚀'][u.mood]}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderStats(updates) {
  // fallback local render if /stats API is slow
  if ($('statTotal'))  $('statTotal').textContent  = $('statTotal').textContent  === '—' ? updates.length : $('statTotal').textContent;
  if ($('statViewed')) $('statViewed').textContent = $('statViewed').textContent === '—' ? updates.filter(u => u.viewedByPM || u.pmViewed).length : $('statViewed').textContent;
  if ($('statDrafts')) $('statDrafts').textContent = $('statDrafts').textContent === '—' ? updates.filter(u => (u.status||'').toLowerCase()==='draft').length : $('statDrafts').textContent;
}

/* ─── Submit ─────────────────────────────────────────── */
async function submitUpdate(isDraft = false) {
  const work = $('duWork').value.trim();
  const tomorrow = $('duTomorrow').value.trim();
  if (!work || !tomorrow) return alert('Today\'s Work and Tomorrow\'s Plan are required!');
  if (work.length > 2000) return alert('Today\'s Work exceeds 2000 characters.');

  $('btnSubmit').disabled = true;
  $('btnSubmit').textContent = '⏳ Submitting…';

  try {
    let attachments = [];
    // Upload files first if any
    if (selectedFiles.length) {
      const fd = new FormData();
      selectedFiles.forEach(f => fd.append('files', f));
      fd.append('folder', 'Daily Updates');
      fd.append('source', 'daily-updates');
      try {
        const upRes = await fetch('/api/files/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const upData = await readJsonResponse(upRes);
        if (upRes.ok) {
          // Handle various response shapes from the server
          if (Array.isArray(upData.urls)) attachments = upData.urls;
          else if (Array.isArray(upData.files)) attachments = upData.files.map(f => f.url || f);
          else if (upData.data?.url) attachments = [upData.data.url];
        }
      } catch (uploadErr) {
        console.warn('File upload failed, continuing without attachments:', uploadErr.message);
      }
    }

    const payload = {
      todayWork: work,
      work,
      blockers: $('duBlockers').value.trim(),
      issues: $('duBlockers').value.trim(),
      tomorrowPlan: tomorrow,
      tomorrow,
      hoursLogged: parseFloat($('duHours').value) || 8,
      hours: parseFloat($('duHours').value) || 8,
      mood: selectedMood,
      status: isDraft ? 'draft' : 'submitted',
      attachments,
      date: new Date().toISOString().slice(0, 10),
    };

    if (editingId) {
      await api(`/api/daily-updates/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/daily-updates', { method: 'POST', body: JSON.stringify(payload) });
    }

    clearForm(); editingId = null;
    await Promise.all([loadToday(), loadHistory()]);
    if (!isDraft) {
      $('todayBanner').style.display = 'flex';
      $('bannerTime').textContent = `Submitted at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
      if (socket) socket.emit('daily_update_created', { message: 'New daily update submitted' });
    }
  } catch (e) { alert(e.message); }
  finally {
    $('btnSubmit').disabled = false;
    $('btnSubmit').textContent = '📤 Submit Update';
  }
}

/* ─── Detail — Navigate to new page ─────────────────── */
window.showDetail = (id) => {
  window.location.href = `/employee/daily-updates/detail?id=${id}`;
};

/* ─── Socket ─────────────────────────────────────────── */
function initSocket() {
  try {
    socket = io({ auth: { token } });
    socket.on('daily_update_created', () => loadHistory());
    socket.on('pm_notification', data => {
      if (data?.type === 'update_viewed') loadHistory();
    });
  } catch { socket = null; }
}