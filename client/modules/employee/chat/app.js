// Phase 13 — Team Chat — app.js (Rewritten)
'use strict';
const token = localStorage.getItem('token') || localStorage.getItem('jmkc_token');
if (!token) location.href = '/login';
const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || '{}');

const api = (url, opts = {}) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }, ...opts })
    .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'API Error'); return d; });
const $ = id => document.getElementById(id);

function normId(value) {
    if (!value) return '';
    return String(value._id || value.id || value.userId || value).trim();
}

function normText(value) {
    return String(value || '').trim().toLowerCase();
}

function projectIncludesCurrentUser(project) {
    const uid = normId(user);
    const email = normText(user.email);
    const name = normText(user.name);
    if (!uid && !email && !name) return true;

    const directIds = [project.assignedManager, project.managerId, project.teamLeadId, project.projectManager].map(normId);
    if (uid && directIds.includes(uid)) return true;

    const directEmails = [project.managerEmail, project.teamLeadEmail].map(normText);
    if (email && directEmails.includes(email)) return true;

    const directNames = [project.manager, project.teamLead].map(normText);
    if (name && directNames.includes(name)) return true;

    const members = [
        ...(project.allocatedTeam || []),
        ...(project.members || []),
        ...(project.teamMemberIds || []),
        ...(project.teamMembers || []),
    ];
    return members.some(member => {
        if (uid && [normId(member), normId(member ? .user), normId(member ? .userId)].includes(uid)) return true;
        if (email && [member ? .email, member ? .userEmail].map(normText).includes(email)) return true;
        if (name && [member ? .name, member ? .userName, member ? .employeeName, typeof member === 'string' ? member : ''].map(normText).includes(name)) return true;
        return false;
    });
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

let socket, currentChannel = null,
    channels = [],
    people = [],
    messages = [],
    chatFiles = [];
let typingTimeout;

document.addEventListener('DOMContentLoaded', async() => {
    await loadChannels();
    initSocket();
    setupCompose();
    setupUI();
});

/* ─── Load Channels (Projects as channels) ───────────── */
async function loadChannels() {
    try {
        const [projectRes, roomRes] = await Promise.all([
            api('/api/projects/employee'),
            api('/api/chat/rooms/my').catch(() => ({ data: [] })),
        ]);
        const allProj = projectRes.data || projectRes.projects || [];
        const rooms = roomRes.data || [];
        const roomByProjectId = new Map(rooms.filter(r => r.roomType !== 'DIRECT').map(r => [String(r.projectId || ''), r]));
        window.__directRooms = rooms.filter(r => r.roomType === 'DIRECT');

        if (!allProj.length) {
            $('channelList').innerHTML = `<div style="padding:16px 20px;color:#a3aed1;font-size:12px;text-align:center;">
        <i class="fa fa-folder-open" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>
        No projects found. You'll appear here once you're added to a project.
      </div>`;
            return;
        }

        // Show ALL projects as channels (not just ones you're a member of — backend already filters by org)
        const assignedProjects = allProj;
        if (!assignedProjects.length) {
            $('channelList').innerHTML = `<div style="padding:16px 20px;color:#a3aed1;font-size:12px;text-align:center;">
        <i class="fa fa-folder-open" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>
        No assigned project chats yet.
      </div>`;
            $('dmList').innerHTML = '';
            return;
        }

        channels = assignedProjects.map(p => ({
            ...p,
            name: p.projectName || p.name || 'Untitled Project',
            type: 'channel',
            roomId: roomByProjectId.get(String(p._id || p.id || '')) ? .roomId || p.roomId || '',
            participants: roomByProjectId.get(String(p._id || p.id || '')) ? .participants || [],
            // Collect all members from various possible fields
            _allMembers: [
                ...(roomByProjectId.get(String(p._id || p.id || '')) ? .participants || []),
                ...(p.allocatedTeam || []),
                ...(p.members || []),
                ...(p.teamMemberIds || []),
                ...(p.teamMembers || []),
            ]
        }));

        renderChannels();
        renderDirectRooms(window.__directRooms || []);
        loadPeopleDirectory();
        // Auto-select first channel
        if (channels.length && !currentChannel) selectChannel(channels[0]);
    } catch (e) {
        $('channelList').innerHTML = `<div style="padding:16px 20px;color:#f87171;font-size:12px;">${e.message}</div>`;
        loadPeopleDirectory();
    }
}

function renderChannels() {
    const search = ($('chSearchInput') ? .value || '').toLowerCase();
    const filtered = channels.filter(c => (c.name || '').toLowerCase().includes(search));

    if (!filtered.length) {
        $('channelList').innerHTML = `<div style="padding:10px 20px;color:#a3aed1;font-size:12px;">No projects found.</div>`;
        return;
    }

    $('channelList').innerHTML = filtered.map(c => {
                const memberCount = (c._allMembers || []).length;
                return `
    <div class="ch-item ${currentChannel?._id === c._id ? 'active' : ''}" onclick="selectChannelById('${c._id}')">
      <span class="ch-icon" style="color:#3965FF; font-size:16px;">📁</span>
      <div style="flex:1; min-width:0;">
        <div class="ch-name" style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.name}</div>
        <div style="font-size:10px; color:#a3aed1;">${memberCount} member${memberCount !== 1 ? 's' : ''}</div>
      </div>
      ${c.unreadCount ? `<span class="ch-unread" style="background:#3965FF;color:#fff;border-radius:10px;padding:2px 6px;font-size:10px;font-weight:700;">${c.unreadCount}</span>` : ''}
    </div>`;
  }).join('');

  // Clear DM list — using projects as channels
  if (!$('dmList').innerHTML.trim()) {
    $('dmList').innerHTML = '<div style="padding:10px 20px;color:#a3aed1;font-size:12px;">No direct chats yet.</div>';
  }
}

function renderDirectRooms(rooms = []) {
  if (!rooms.length) {
    $('dmList').innerHTML = '<div style="padding:10px 20px;color:#a3aed1;font-size:12px;">No direct chats yet.</div>';
    return;
  }
  $('dmList').innerHTML = rooms.map(room => {
    const name = room.directMeta?.otherUserName || room.teamName || 'Direct chat';
    const role = room.directMeta?.otherUserRole || 'Employee';
    return `
      <div class="ch-item ${currentChannel?.roomId === room.roomId ? 'active' : ''}" onclick="selectDirectRoom('${room.roomId}')">
        <span class="dm-status"></span>
        <div style="flex:1;min-width:0;">
          <div class="ch-name">${escapeHtml(name)}</div>
          <div style="font-size:10px;color:#a3aed1;">${escapeHtml(role)}</div>
        </div>
      </div>`;
  }).join('');
}

async function loadPeopleDirectory() {
  const panel = $('peopleList');
  if (!panel) return;
  try {
    const res = await api('/api/chat/people');
    people = res.data || [];
    renderPeopleDirectory();
  } catch (error) {
    panel.innerHTML = `<div style="padding:10px 20px;color:#f87171;font-size:12px;">Unable to load people.</div>`;
  }
}

function renderPeopleDirectory() {
  const panel = $('peopleList');
  if (!panel) return;
  const search = ($('chSearchInput')?.value || '').toLowerCase();
  const visiblePeople = people.filter(person => [person.name, person.department, person.designation, person.role].join(' ').toLowerCase().includes(search));

  if (!visiblePeople.length) {
    panel.innerHTML = '<div style="padding:10px 20px;color:#a3aed1;font-size:12px;">No people found.</div>';
    return;
  }

  panel.innerHTML = visiblePeople.map(person => {
    const name = escapeHtml(person.name || 'Employee');
    const role = escapeHtml([person.designation || person.role || 'Employee', person.department].filter(Boolean).join(' | '));
    const color = stringToColor(person.name || 'Employee');
    const initial = (person.name || 'E').charAt(0).toUpperCase();
    return `
      <div class="ch-item" onclick="startDM('${encodeURIComponent(person.name || 'Employee')}', '${person._id}')">
        <span style="width:28px;height:28px;border-radius:50%;background:${color};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">${initial}</span>
        <div style="flex:1;min-width:0;">
          <div class="ch-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</div>
          <div style="font-size:10px;color:#a3aed1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${role}</div>
        </div>
      </div>`;
  }).join('');
}

window.selectDirectRoom = roomId => {
  const room = (window.__directRooms || []).find(item => item.roomId === roomId);
  if (!room) return;
  currentChannel = {
    _id: room.roomId,
    roomId: room.roomId,
    name: room.directMeta?.otherUserName || room.teamName || 'Direct chat',
    type: 'direct',
    participants: room.participants || [],
    _allMembers: room.participants || [],
  };
  renderChannels();
  renderDirectRooms(window.__directRooms || []);
  $('cmChannelName').innerHTML = `<i class="fa fa-user" style="color:#3965FF;margin-right:6px;"></i> ${escapeHtml(currentChannel.name)}`;
  $('cmChannelMeta').textContent = 'Direct message';
  $('composeArea').style.display = 'flex';
  loadMessages();
};

window.selectChannelById = id => {
  const ch = channels.find(c => c._id === id);
  if (ch) selectChannel(ch);
};

async function selectChannel(ch) {
  currentChannel = ch;
  renderChannels();

  const memberCount = (ch._allMembers || []).length;
  $('cmChannelName').innerHTML = `<i class="fa fa-folder" style="color:#3965FF;margin-right:6px;"></i> ${ch.name}`;
  $('cmChannelMeta').textContent = `${memberCount} team member${memberCount !== 1 ? 's' : ''} • ${ch.status || 'Active'}`;
  $('composeArea').style.display = 'flex';

  await loadMessages();
  // Load members panel automatically
  loadMembers();
}

/* ─── Load Messages via project channel ───────────────── */
async function loadMessages() {
  if (!currentChannel) return;
  $('messagesArea').innerHTML = `<div style="text-align:center;margin:auto;color:#a3aed1;"><i class="fa fa-spinner fa-spin fa-2x"></i></div>`;
  
  try {
    // Try project-specific messages first, fallback to channel messages
    let res;
    try {
      if (currentChannel.roomId) {
        const roomRes = await api(`/api/chat/rooms/${currentChannel.roomId}/messages`);
        messages = roomRes.data?.messages || [];
        renderMessages();
        scrollToBottom();
        return;
      }
      res = await api(`/api/messages?projectId=${currentChannel._id}`);
    } catch {
      res = await api(`/api/messages?channelId=${currentChannel._id}`);
    }
    messages = (res.data || res.messages || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    renderMessages();
    scrollToBottom();
  } catch (e) {
    $('messagesArea').innerHTML = `<div style="text-align:center;margin:auto;color:#a3aed1;">
      <i class="fa fa-comments fa-3x" style="opacity:0.3; display:block; margin-bottom:12px;"></i>
      <div style="font-size:14px; font-weight:600; color:#2b3674; margin-bottom:4px;">Start the conversation!</div>
      <div style="font-size:12px;">Be the first to send a message in this project chat.</div>
    </div>`;
  }
}

function renderMessages() {
  if (!messages.length) {
    $('messagesArea').innerHTML = `<div style="text-align:center;margin:auto;color:#a3aed1;">
      <i class="fa fa-comments fa-3x" style="opacity:0.3; display:block; margin-bottom:12px;"></i>
      <div style="font-size:14px; font-weight:600; color:#2b3674; margin-bottom:4px;">No messages yet</div>
      <div style="font-size:12px;">Start the conversation in #${currentChannel?.name || 'channel'}</div>
    </div>`;
    return;
  }

  let html = '';
  let lastDate = '';
  const myId = user._id || user.id;
  const myName = user.name || '';

  messages.forEach(m => {
    const d = new Date(m.createdAt);
    const dateStr = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    if (dateStr !== lastDate) {
      html += `<div style="text-align:center;margin:8px 0;font-size:11px;font-weight:600;color:#a3aed1;position:relative;">
        <span style="background:#fff;padding:0 12px;position:relative;z-index:1;">${dateStr}</span>
        <hr style="position:absolute;top:50%;left:0;right:0;border:none;border-top:1px solid #f0f4ff;margin:0;z-index:0;">
      </div>`;
      lastDate = dateStr;
    }
    const senderName = m.senderName || m.sender?.name || m.userName || 'Unknown';
    const initial = senderName.charAt(0).toUpperCase();
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const text = (m.content || m.text || m.message || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    const isMine = (m.sender?._id || m.sender || m.senderId) === myId || m.senderName === myName;
    const avatarColor = stringToColor(senderName);
    
    html += `
    <div class="msg-row ${isMine ? 'mine' : ''}">
      <div class="msg-avatar" style="background:${avatarColor}">${initial}</div>
      <div class="msg-content">
        <div class="msg-hdr">
          <span class="msg-author">${senderName}</span>
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-bubble">${text}</div>
        ${m.attachments?.length ? m.attachments.map(a => `<a href="${a.url || a}" target="_blank" style="display:block;margin-top:6px;font-size:12px;color:#3965FF;text-decoration:none;">📎 ${a.name || a.originalName || 'File'}</a>`).join('') : ''}
      </div>
    </div>`;
  });
  $('messagesArea').innerHTML = html;
}

function stringToColor(str) {
  const colors = ['#6366f1','#22d3ee','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#3965FF'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function scrollToBottom() {
  const area = $('messagesArea');
  setTimeout(() => area.scrollTop = area.scrollHeight, 50);
}

/* ─── Compose ────────────────────────────────────────── */
function setupCompose() {
  const input = $('messageInput');

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    if (socket && currentChannel) {
      socket.emit('typing', { channelId: currentChannel._id, projectId: currentChannel._id, userName: user.name || 'Someone' });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => socket.emit('stop_typing', { channelId: currentChannel._id }), 2000);
    }
  });

  $('btnSend').addEventListener('click', sendMessage);
  $('btnAttach').addEventListener('click', () => $('chatFileInput').click());
  $('chatFileInput').addEventListener('change', e => {
    Array.from(e.target.files).forEach(f => chatFiles.push(f));
    renderChatAttachments();
  });
  $('btnMention').addEventListener('click', () => { input.value += '@'; input.focus(); });
  $('btnEmoji').addEventListener('click', () => { input.value += '😊'; input.focus(); });
}

function renderChatAttachments() {
  $('chatAttachments').innerHTML = chatFiles.map((f, i) => `
    <div style="display:inline-flex;align-items:center;gap:6px;background:#f0f4ff;border-radius:8px;padding:4px 10px;font-size:12px;color:#3965FF;font-weight:600;">
      📎 ${f.name} <button onclick="removeChatFile(${i})" style="background:none;border:none;color:#a3aed1;cursor:pointer;font-size:14px;line-height:1;padding:0;">×</button>
    </div>`).join('');
}
window.removeChatFile = i => { chatFiles.splice(i, 1); renderChatAttachments(); };

async function sendMessage() {
  const input = $('messageInput');
  const text = input.value.trim();
  if (!text && !chatFiles.length) return;
  if (!currentChannel) return;

  const sendBtn = $('btnSend');
  sendBtn.disabled = true;

  try {
    let attachments = [];
    if (chatFiles.length) {
      const fd = new FormData();
      chatFiles.forEach(f => fd.append('files', f));
      const upRes = await fetch('/api/files/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (upRes.ok) {
        const upData = await upRes.json();
        attachments = (upData.urls || upData.files || []).map(u => typeof u === 'string' ? { url: u, name: u.split('/').pop() } : u);
      }
    }

    const payload = {
      channelId: currentChannel._id,
      projectId: currentChannel._id,
      content: text, text, message: text,
      attachments,
      sender: user._id || user.id,
      senderName: user.name,
    };

    if (currentChannel.roomId) {
      await api(`/api/chat/rooms/${currentChannel.roomId}/messages`, { method: 'POST', body: JSON.stringify({ text, messageType: 'TEXT' }) });
    } else {
      await api('/api/messages', { method: 'POST', body: JSON.stringify(payload) });
    }
    input.value = ''; input.style.height = 'auto';
    chatFiles = []; renderChatAttachments();

    if (socket) socket.emit('message_send', { ...payload, channelId: currentChannel._id });
    await loadMessages();
  } catch (e) {
    // Try direct optimistic update
    messages.push({
      _id: Date.now().toString(),
      content: text,
      senderName: user.name,
      sender: user._id,
      createdAt: new Date().toISOString()
    });
    renderMessages();
    scrollToBottom();
    input.value = ''; input.style.height = 'auto';
  } finally {
    sendBtn.disabled = false;
  }
}

/* ─── Load Members ───────────────────────────────────── */
async function loadMembers() {
  if (!currentChannel) return;
  
  const panel = $('membersList');
  panel.innerHTML = `<div style="padding:16px;text-align:center;color:#a3aed1;font-size:12px;"><i class="fa fa-spinner fa-spin"></i> Loading...</div>`;
  
  try {
    let members = [];
    if (currentChannel.participants?.length) {
      members = currentChannel.participants;
    }
    if (!members.length) {
    try {
      const res = await api(`/api/projects/${currentChannel._id}`);
      const p = res.data || res.project || res;
      members = [
        ...(p.allocatedTeam || []),
        ...(p.members || []),
        ...(p.teamMemberIds || []),
      ];
    } catch {
      // Fallback to what we already have
      members = currentChannel._allMembers || [];
    }
    }

    // Deduplicate by id when present; keep name-only project members too.
    const seen = new Set();
    members = members.filter(m => {
      const name = m.name || m.userName || m.employeeName || (typeof m === 'string' ? m : '');
      const id = m._id || m.userId || name;
      if (!id || seen.has(String(id))) return false;
      seen.add(String(id));
      return true;
    });

    if (!members.length) {
      panel.innerHTML = `<div style="padding:16px;text-align:center;color:#a3aed1;font-size:12px;">No team members found.</div>`;
      return;
    }

    // Update member count in header
    $('cmChannelMeta').textContent = `${members.length} team member${members.length !== 1 ? 's' : ''} • ${currentChannel.status || 'Active'}`;

    panel.innerHTML = members.map(m => {
      const name = m.name || m.userName || m.employeeName || (typeof m === 'string' ? m : 'Team Member');
      const role = m.role || m.designation || m.position || 'Member';
      const initial = name.charAt(0).toUpperCase();
      const color = stringToColor(name);
      const safeName = escapeHtml(name);
      const safeRole = escapeHtml(role);
      const encodedName = encodeURIComponent(name);
      const userId = m.userId || m._id || '';
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #f0f4ff;cursor:pointer;transition:.2s;" 
           onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''"
           onclick="startDM('${encodedName}', '${userId}')">
        <div style="width:36px;height:36px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${initial}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#2b3674;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeName}</div>
          <div style="font-size:11px;color:#a3aed1;">${safeRole}</div>
        </div>
        <button style="border:none;background:#eef2ff;color:#3965FF;border-radius:8px;padding:6px 8px;font-size:11px;font-weight:800;cursor:pointer;">Chat</button>
      </div>`;
    }).join('');
  } catch (e) {
    panel.innerHTML = `<div style="padding:16px;text-align:center;color:#f87171;font-size:12px;">${e.message}</div>`;
  }
}

window.startDM = async (name, userId = '') => {
  name = decodeURIComponent(name);
  if (userId) {
    try {
      const res = await api(`/api/chat/direct/${userId}`, { method: 'POST', body: JSON.stringify({}) });
      const room = res.data;
      window.__directRooms = [room, ...(window.__directRooms || []).filter(item => item.roomId !== room.roomId)];
      renderDirectRooms(window.__directRooms);
      selectDirectRoom(room.roomId);
      return;
    } catch (error) {
      if (window.pmToast) pmToast(error.message || 'Unable to open direct chat.', 'error');
    }
  }
  const input = $('messageInput');
  if (!input) return;
  input.value = `@${name} `;
  input.focus();
  $('membersPanel')?.classList.remove('open');
  if (window.pmToast) pmToast(`Write your message to ${name} in ${currentChannel?.name || 'this project'}.`, 'info');
};

/* ─── UI Setup ───────────────────────────────────────── */
function setupUI() {
  $('btnChSearch').addEventListener('click', () => {
    const box = $('chSearchBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
    if (box.style.display === 'block') $('chSearchInput').focus();
  });
  $('chSearchInput')?.addEventListener('input', renderChannels);
  $('chSearchInput')?.addEventListener('input', renderPeopleDirectory);
  
  $('btnMembers').addEventListener('click', () => {
    const panel = $('membersPanel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) loadMembers();
  });
  $('btnCloseMembers').addEventListener('click', () => $('membersPanel').classList.remove('open'));
  
  $('btnPinned').addEventListener('click', () => {
    const pinned = messages.filter(m => m.pinned || m.isPinned);
    if (!pinned.length) { if (window.pmToast) pmToast('No pinned messages in this channel.', 'info'); return; }
    const firstPinned = document.querySelector('.msg-pinned');
    if (firstPinned) firstPinned.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  
  $('btnSearch').addEventListener('click', () => {
    const q = prompt('Search messages:');
    if (!q) return;
    const filtered = messages.filter(m => (m.content || m.text || '').toLowerCase().includes(q.toLowerCase()));
    if (!filtered.length) { if (window.pmToast) pmToast('No messages found.', 'info'); return; }
    const saved = messages;
    messages = filtered; renderMessages();
    setTimeout(() => { messages = saved; loadMessages(); }, 5000);
  });
}

/* ─── Socket ─────────────────────────────────────────── */
function initSocket() {
  try {
    socket = io({ auth: { token } });
    socket.on('message_send', data => {
      if (data.channelId === currentChannel?._id || data.projectId === currentChannel?._id) loadMessages();
      const ch = channels.find(c => c._id === data.channelId);
      if (ch && ch._id !== currentChannel?._id) { ch.unreadCount = (ch.unreadCount || 0) + 1; renderChannels(); }
    });
    socket.on('typing', data => {
      if ((data.channelId === currentChannel?._id || data.projectId === currentChannel?._id) && data.userName !== user.name) {
        $('typingIndicator').style.display = 'flex';
        $('typingName').textContent = data.userName || 'Someone';
      }
    });
    socket.on('stop_typing', () => $('typingIndicator').style.display = 'none');
  } catch { socket = null; }
}