// Phase 12 — Meetings — app.js
'use strict';
const token = localStorage.getItem('token');
if (!token) location.href = '/login';

const api = (url, opts = {}) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }, ...opts })
    .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'API Error'); return d; });
const $ = id => document.getElementById(id);

let allMeetings = [];
let socket;
let countdownInterval;

document.addEventListener('DOMContentLoaded', async () => {
  await loadMeetings();
  initSocket();
  $('meetSearch').addEventListener('input', applyFilters);
  $('meetViewFilter').addEventListener('change', applyFilters);
});

async function loadMeetings() {
  try {
    const res = await api('/api/meetings');
    allMeetings = (res.data || res.meetings || []).map(normalizeMeeting);
    applyFilters();
    renderKPIs();
    showNextBanner();
  } catch (e) {
    ['todayGrid','upcomingGrid','completedGrid'].forEach(id => $(id).innerHTML = '');
    ['todayEmpty','upcomingEmpty','completedEmpty'].forEach(id => $(id).style.display = 'block');
  }
}

function normalizeMeeting(m) {
  const start = new Date(m.startTime || m.dateTime || m.date || m.scheduledAt || m.createdAt);
  const end = m.endTime ? new Date(m.endTime) : new Date(start.getTime() + (m.duration || 60) * 60000);
  const now = new Date();
  let status = m.status || 'upcoming';
  if (end < now) status = 'completed';
  else if (start <= now && now <= end) status = 'live';
  else if (start.toDateString() === now.toDateString()) status = 'today';
  else status = 'upcoming';
  return { ...m, _start: start, _end: end, _status: status, _duration: Math.round((end - start) / 60000) };
}

function applyFilters() {
  const q = ($('meetSearch').value || '').toLowerCase();
  const view = $('meetViewFilter').value;
  let filtered = allMeetings;
  if (q) filtered = filtered.filter(m => (m.title || m.subject || '').toLowerCase().includes(q) || (m.organizer || m.createdByName || '').toLowerCase().includes(q));
  const today = filtered.filter(m => m._status === 'today' || m._status === 'live');
  const upcoming = filtered.filter(m => m._status === 'upcoming');
  const completed = filtered.filter(m => m._status === 'completed');

  const show = (section, grid, empty, items) => {
    const s = document.querySelector(`.meet-section:has(#${grid})`);
    if (view !== 'all' && view !== section) { if (s) s.style.display = 'none'; return; }
    if (s) s.style.display = '';
    renderCards(grid, empty, items);
  };
  show('today', 'todayGrid', 'todayEmpty', today);
  show('upcoming', 'upcomingGrid', 'upcomingEmpty', upcoming);
  show('completed', 'completedGrid', 'completedEmpty', completed);
}

function renderCards(gridId, emptyId, meetings) {
  if (!meetings.length) {
    $(gridId).innerHTML = '';
    $(emptyId).style.display = 'block';
    return;
  }
  $(emptyId).style.display = 'none';
  $(gridId).innerHTML = meetings.map(m => {
    const time = m._start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const endTime = m._end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const date = m._start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const title = m.title || m.subject || 'Untitled Meeting';
    const organizer = m.organizer || m.createdByName || 'Unknown';
    const participants = m.participants || m.attendees || [];
    const agenda = m.agenda || m.description || '';
    const isLive = m._status === 'live';
    return `
    <div class="meet-card ${isLive ? 'live' : ''}" onclick="openMeetDetail('${m._id}')">
      <div class="mc-time">🕐 ${time} — ${endTime} &nbsp;•&nbsp; ${date}</div>
      <div class="mc-title">${title}</div>
      <div class="mc-organizer">👤 ${organizer}</div>
      <div class="mc-meta-row">
        <span class="mc-meta-tag">⏱ ${m._duration}m</span>
        <span class="mc-meta-tag">👥 ${participants.length || '—'}</span>
        ${m.teamsLink || m.meetingLink ? '<span class="mc-meta-tag">📹 Teams</span>' : ''}
        ${m.mom ? '<span class="mc-meta-tag">📝 MOM</span>' : ''}
      </div>
      ${participants.length ? `<div class="mc-participants">${participants.slice(0, 5).map(p => `<div class="mc-avatar" title="${p.name || p}">${(p.name || p || '?').charAt(0).toUpperCase()}</div>`).join('')}${participants.length > 5 ? `<div class="mc-avatar mc-avatar-more">+${participants.length - 5}</div>` : ''}</div>` : ''}
      ${agenda ? `<div class="mc-hover-popup"><div class="mhp-label">📋 Agenda</div><div class="mhp-text">${agenda.slice(0, 200)}${agenda.length > 200 ? '…' : ''}</div><div class="mhp-duration">Duration: ${m._duration} minutes</div></div>` : ''}
    </div>`;
  }).join('');
}

function renderKPIs() {
  const now = new Date();
  const todayStr = now.toDateString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  $('kpiToday').textContent = allMeetings.filter(m => m._start.toDateString() === todayStr).length;
  $('kpiUpcoming').textContent = allMeetings.filter(m => m._status === 'upcoming').length;
  $('kpiCompleted').textContent = allMeetings.filter(m => m._status === 'completed').length;
  const monthHours = allMeetings.filter(m => m._start >= monthStart && m._status === 'completed').reduce((s, m) => s + m._duration, 0);
  $('kpiHours').textContent = `${Math.round(monthHours / 6) / 10}h`;
}

function showNextBanner() {
  const now = new Date();
  const next = allMeetings.filter(m => m._start > now || m._status === 'live').sort((a, b) => a._start - b._start)[0];
  if (!next) { $('meetNextBanner').style.display = 'none'; return; }
  $('meetNextBanner').style.display = 'flex';
  $('mnbTitle').textContent = next.title || next.subject || 'Untitled';
  const time = next._start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  $('mnbMeta').textContent = `${time} • ${next._duration}m • ${(next.participants || next.attendees || []).length} participants`;
  if (next.teamsLink || next.meetingLink) {
    $('mnbJoinBtn').style.display = 'inline-flex';
    $('mnbJoinBtn').onclick = () => window.open(next.teamsLink || next.meetingLink, '_blank');
  }
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const diff = next._start - new Date();
    if (diff <= 0) { $('mnbCountdown').textContent = '🔴 NOW'; return; }
    const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); const s = Math.floor((diff % 60000) / 1000);
    $('mnbCountdown').textContent = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  }, 1000);
}

/* Detail Modal */
window.openMeetDetail = async (id) => {
  $('meetDetailModal').style.display = 'flex';
  $('meetDetailContent').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--clr-text-muted)">Loading…</div>';
  try {
    const res = await api(`/api/meetings/${id}`);
    const m = normalizeMeeting(res.data || res);
    const title = m.title || m.subject || 'Untitled';
    const organizer = m.organizer || m.createdByName || 'Unknown';
    const participants = m.participants || m.attendees || [];
    const time = m._start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const date = m._start.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('meetDetailTitle').textContent = title;
    $('meetDetailContent').innerHTML = `
      <div class="md-info-grid">
        <div class="md-info-card"><div class="md-info-label">📅 Date</div><div class="md-info-val">${date}</div></div>
        <div class="md-info-card"><div class="md-info-label">🕐 Time</div><div class="md-info-val">${time} (${m._duration}m)</div></div>
        <div class="md-info-card"><div class="md-info-label">👤 Organizer</div><div class="md-info-val">${organizer}</div></div>
        <div class="md-info-card"><div class="md-info-label">📊 Status</div><div class="md-info-val">${m._status.toUpperCase()}</div></div>
      </div>
      ${m.agenda || m.description ? `<div class="md-section"><div class="md-label">📋 Agenda</div><div class="md-text">${m.agenda || m.description}</div></div>` : ''}
      ${m.mom || m.minutesOfMeeting ? `<div class="md-section"><div class="md-label">📝 Minutes of Meeting (MOM)</div><div class="md-text">${m.mom || m.minutesOfMeeting}</div></div>` : ''}
      ${participants.length ? `<div class="md-section"><div class="md-label">👥 Participants (${participants.length})</div><div class="md-participant-list">${participants.map(p => `<span class="md-participant">${p.name || p}</span>`).join('')}</div></div>` : ''}`;
    $('meetDetailActions').innerHTML = `
      <button class="btn-cancel" onclick="closeMeetModal()">Close</button>
      ${m.teamsLink || m.meetingLink ? `<button class="btn-action teams" onclick="window.open('${m.teamsLink || m.meetingLink}','_blank')">▶ Join Teams</button>` : ''}
      ${m.outlookLink ? `<button class="btn-action outlook" onclick="window.open('${m.outlookLink}','_blank')">📧 Open Outlook</button>` : ''}
      ${m.mom || m.minutesOfMeeting ? `<button class="btn-action download" onclick="downloadMOM('${m._id}')">📥 Download MOM</button>` : ''}`;
  } catch (e) { $('meetDetailContent').innerHTML = `<p style="color:#f87171">${e.message}</p>`; }
};

window.closeMeetModal = () => $('meetDetailModal').style.display = 'none';

window.downloadMOM = (id) => {
  const m = allMeetings.find(x => x._id === id);
  if (!m) return;
  const content = m.mom || m.minutesOfMeeting || 'No MOM available';
  const blob = new Blob([`Minutes of Meeting\n${'='.repeat(40)}\n\nTitle: ${m.title || m.subject}\nDate: ${m._start.toLocaleDateString()}\nOrganizer: ${m.organizer || m.createdByName}\n\n${content}`], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `MOM_${(m.title || 'meeting').replace(/\s+/g, '_')}.txt`; a.click();
};

/* Socket */
function initSocket() {
  try {
    socket = io({ auth: { token } });
    socket.on('meeting_updated', () => loadMeetings());
    socket.on('meeting_reminder', data => {
      if (Notification.permission === 'granted') new Notification('🔔 Meeting Reminder', { body: data.message || 'Meeting starting soon!' });
      showNextBanner();
    });
  } catch { socket = null; }
}
