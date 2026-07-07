/* ============================================================
   JMKC CRM — Admin Chat (Real-world, Room-Based)
   Uses: POST /api/chat/direct/:userId → opens/gets room
         GET  /api/chat/rooms/:roomId/messages → load history
         POST /api/chat/rooms/:roomId/messages → send
   ============================================================ */

let allUsers = [];
let currentUser = {};
try { currentUser = JSON.parse(localStorage.getItem('jmkc_user') || '{}'); } catch(e) {}

let activeRoomId = null;
let activeUserId = null;
let activeUserName = '';
// Cache: userId → { roomId, messages[] }
const chatCache = {};

/* ── 1. Load all users into sidebar ─────────────────────── */
async function loadUsers() {
  const listEl = document.getElementById('chatSidebarList');
  if (listEl) listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-4)">Loading users...</div>';

  try {
    const res = await AdminAPI.getUsers('?limit=500&status=ACTIVE');
    allUsers = res.users || res.data || [];
    if (!allUsers.length) throw new Error('empty');
  } catch(e) {
    // Fallback: won't block UI
    allUsers = [];
    if (listEl) listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-4)">No users found.</div>';
    return;
  }

  // Exclude self
  const myId = currentUser.id || currentUser._id;
  allUsers = allUsers.filter(u => String(u._id) !== String(myId));

  renderSidebar();
}

/* ── 2. Render sidebar with search + role filter ─────────── */
function renderSidebar() {
  const q = (document.getElementById('chatSearch')?.value || '').toLowerCase();
  const r = (document.getElementById('chatRoleFilter')?.value || '').toLowerCase();

  const filtered = allUsers.filter(u => {
    const name = (u.name || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    const dept = (u.department || '').toLowerCase();
    const matchQ = !q || name.includes(q) || role.includes(q);

    if (!matchQ) return false;
    if (!r) return true;

    if (r === 'hr')          return role.includes('hr') || dept.includes('hr');
    if (r === 'manager')     return role.includes('manager');
    if (r === 'marketing')   return role.includes('marketing') || dept.includes('marketing');
    if (r === 'development') return role.includes('dev') || dept.includes('dev') || (u.designation||'').toLowerCase().includes('dev');
    if (r === 'client')      return role.includes('client');
    return true;
  });

  const listEl = document.getElementById('chatSidebarList');
  if (!listEl) return;

  if (!filtered.length) {
    listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-4);font-size:13px;">No users found</div>';
    return;
  }

  const colors = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#0891B2','#BE185D'];

  listEl.innerHTML = filtered.map((u, i) => {
    const isActive = u._id === activeUserId ? 'active' : '';
    const cache = chatCache[u._id];
    const lastMsg = cache?.messages?.slice(-1)[0];
    const preview = lastMsg ? truncate(lastMsg.text || '📎 File', 32) : '<em style="opacity:0.6">Start a conversation...</em>';
    const color = colors[i % colors.length];
    const initials = (u.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const roleBadge = u.role ? `<span style="font-size:10px;background:rgba(99,102,241,0.1);color:var(--primary);padding:1px 5px;border-radius:4px;">${u.role}</span>` : '';

    return `
    <div class="chat-thread ${isActive}" onclick="openChat('${u._id}','${escHtml(u.name)}')">
      <div style="width:38px;height:38px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;">${initials}</div>
      <div style="flex:1;overflow:hidden;margin-left:10px;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
          <span class="chat-thread-name" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name || 'Unknown'}</span>
          ${roleBadge}
        </div>
        <div class="chat-thread-preview" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preview}</div>
      </div>
    </div>`;
  }).join('');
}

/* ── 3. Open chat with a user (create/get room) ──────────── */
async function openChat(userId, userName) {
  activeUserId = userId;
  activeUserName = userName;

  renderSidebar();

  const user = allUsers.find(u => u._id === userId) || { name: userName, role: '', department: '' };
  const initials = (user.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Update header
  const headerEl = document.getElementById('chatMainHeader');
  if (headerEl) {
    headerEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#2563EB,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;">${initials}</div>
        <div>
          <strong style="display:block;font-size:15px;">${user.name || userName}</strong>
          <span style="font-size:11px;color:var(--text-4);">${user.role || 'Employee'} ${user.department ? '· ' + user.department : ''}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-icon" title="Call">📞</button>
        <button class="btn btn-icon" title="Video">📹</button>
      </div>`;
  }

  // Show loading
  const area = document.getElementById('chatArea');
  if (area) area.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-4)"><div class="loader-spinner" style="margin:0 auto 12px;"></div>Loading messages...</div>';

  try {
    // Open/get the direct room
    const roomRes = await AdminAPI.post(`/chat/direct/${userId}`, {});
    const room = roomRes.data || roomRes;
    activeRoomId = room.roomId;

    // Load messages for this room
    await loadRoomMessages(activeRoomId, userId);
  } catch(e) {
    console.error('Failed to open chat room:', e);
    // Fallback: show empty chat
    activeRoomId = null;
    if (!chatCache[userId]) chatCache[userId] = { messages: [] };
    renderMessages(userId);
  }
}

/* ── 4. Load messages from room ──────────────────────────── */
async function loadRoomMessages(roomId, userId) {
  try {
    const res = await AdminAPI.get(`/chat/rooms/${roomId}/messages`);
    const msgs = (res.data?.messages || res.messages || []).map(m => ({
      text: m.text || '',
      senderId: String(m.senderId?._id || m.senderId),
      senderName: m.senderName || '',
      fileUrl: m.fileUrl || '',
      fileName: m.fileName || '',
      messageType: m.messageType || 'TEXT',
      timestamp: m.createdAt || new Date().toISOString(),
    }));
    chatCache[userId] = { roomId, messages: msgs };
  } catch(e) {
    if (!chatCache[userId]) chatCache[userId] = { roomId, messages: [] };
    else chatCache[userId].roomId = roomId;
  }
  renderMessages(userId);
}

/* ── 5. Render messages in chat area ─────────────────────── */
function renderMessages(userId) {
  const area = document.getElementById('chatArea');
  if (!area) return;

  const msgs = chatCache[userId]?.messages || [];
  const myId = String(currentUser.id || currentUser._id || '');
  const user = allUsers.find(u => u._id === userId);
  const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (!msgs.length) {
    area.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-4)">
      <div style="font-size:40px;margin-bottom:12px;">💬</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;">No messages yet</div>
      <div style="font-size:13px;">Say hi to ${user?.name || 'this user'}!</div>
    </div>`;
    return;
  }

  // Group messages by date
  let lastDate = '';
  area.innerHTML = msgs.map(m => {
    const isOwn = String(m.senderId) === myId || m.isOwn;
    const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '';
    const dateStr = m.timestamp ? new Date(m.timestamp).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '';

    let dateDivider = '';
    if (dateStr && dateStr !== lastDate) {
      lastDate = dateStr;
      dateDivider = `<div style="text-align:center;margin:16px 0;"><span style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:3px 12px;font-size:11px;color:var(--text-4);">${dateStr}</span></div>`;
    }

    let content = '';
    if (m.messageType === 'FILE' || m.fileUrl) {
      content = `<a href="${m.fileUrl}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(0,0,0,0.08);border-radius:8px;text-decoration:none;color:inherit;">
        <span>📎</span><span style="font-size:12px;">${m.fileName || 'File'}</span>
      </a>${m.text ? `<div style="margin-top:4px;">${m.text}</div>` : ''}`;
    } else {
      content = m.text || '';
    }

    if (isOwn) {
      return `${dateDivider}<div class="chat-msg own"><div class="chat-bubble">${content}<div class="chat-bubble-time">${time}</div></div></div>`;
    } else {
      return `${dateDivider}<div class="chat-msg">
        <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#2563EB,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;">${initials}</div>
        <div class="chat-bubble">${content}<div class="chat-bubble-time">${time}</div></div>
      </div>`;
    }
  }).join('');

  area.scrollTop = area.scrollHeight;
}

/* ── 6. Send a message ───────────────────────────────────── */
async function sendMessage() {
  if (!activeUserId) {
    window.showToast?.('Select a chat', 'Please choose a user to chat with.', 'info');
    return;
  }

  const inp = document.getElementById('chatInput');
  const text = (inp?.value || '').trim();
  if (!text) return;

  const myId = String(currentUser.id || currentUser._id || '');
  const msgObj = { text, senderId: myId, isOwn: true, timestamp: new Date().toISOString(), messageType: 'TEXT' };

  // Optimistic UI
  if (!chatCache[activeUserId]) chatCache[activeUserId] = { messages: [] };
  chatCache[activeUserId].messages.push(msgObj);
  inp.value = '';
  renderMessages(activeUserId);
  renderSidebar();

  try {
    if (activeRoomId) {
      await AdminAPI.post(`/chat/rooms/${activeRoomId}/messages`, { text, messageType: 'TEXT' });
    } else {
      // Try opening room first then send
      const roomRes = await AdminAPI.post(`/chat/direct/${activeUserId}`, {});
      activeRoomId = (roomRes.data || roomRes).roomId;
      await AdminAPI.post(`/chat/rooms/${activeRoomId}/messages`, { text, messageType: 'TEXT' });
    }
  } catch(e) {
    console.warn('Message saved locally only (backend send failed):', e.message);
  }
}
window.sendMessage = sendMessage;

/* ── 7. Handle Enter key in input ────────────────────────── */
function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
window.handleChatKey = handleChatKey;

/* ── Helpers ─────────────────────────────────────────────── */
function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '...' : (s || ''); }
function escHtml(s) { return (s||'').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
  document.getElementById('chatSearch')?.addEventListener('input', renderSidebar);
  document.getElementById('chatRoleFilter')?.addEventListener('change', renderSidebar);

  // Attach enter key listener
  document.getElementById('chatInput')?.addEventListener('keydown', handleChatKey);
});