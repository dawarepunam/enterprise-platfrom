/* 
  JMKC Enterprise CRM - Project Detail Workspace
  Phase 6 – Full API + Socket.io + 10 Tabs Enterprise Integration
*/

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponents();
  initTabs();
  await loadProjectData();
});

const projectId = new URLSearchParams(window.location.search).get("id");
const currentUser = JSON.parse(localStorage.getItem("user") || localStorage.getItem("jmkc_user") || "null");
let projectData = null;
let projectTasks = [];
let projectMeetings = [];
let projectTeam = [];
let chatRoomId = null;

async function loadComponents() {
  try {
    const [hRes, sRes] = await Promise.all([fetch("/components/header.html"), fetch("/components/sidebar.html")]);
    if (hRes.ok) document.getElementById("header-container").innerHTML = await hRes.text();
    if (sRes.ok) document.getElementById("sidebar-container").innerHTML = await sRes.text();
    setTimeout(() => {
      if (typeof initThemeToggle === "function") { initThemeToggle(); initSearchModal(); initDrawers(); initPopups(); initProfileData(); initCommandPalette(); initNotificationsAPI(); initBookmarks(); initRecentItems(); initOfflineSync(); initSocketGlobal(); }
    }, 50);
  } catch (e) { console.error("Component load failed", e); }
}

/* ==================== TABS ==================== */
function initTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  const panes = document.querySelectorAll(".tab-pane");
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");
    });
  });
}

/* ==================== LOAD PROJECT ==================== */
async function loadProjectData() {
  if (!projectId) { document.getElementById("projectBanner").innerHTML = renderError("No project ID provided."); return; }

  try {
    const res = await apiRequest(`/projects/${projectId}`);
    projectData = res?.data || res?.project || res;

    if (typeof JMKC !== "undefined" && JMKC.trackRecentItem) {
      JMKC.trackRecentItem("Project", projectData.name || "Project", window.location.href);
    }

    renderBanner();
    await Promise.allSettled([loadTasks(), loadMeetings(), loadTeam()]);
    renderKPIRow();
    renderOverview();
    renderTasksTab();
    renderFilesTab();
    renderDocsTab();
    renderMeetingsTab();
    initChat();
    renderTeamTab();
    renderTimeline();
    renderAnalytics();
    renderReports();
    bindTaskFilters();
    bindMeetingFilters();
    listenSocket();
  } catch (err) {
    document.getElementById("projectBanner").innerHTML = renderError("Failed to load project.", "loadProjectData()");
  }
}

async function loadTasks() {
  try {
    const res = await apiRequest(`/tasks?projectId=${encodeURIComponent(projectId)}&assignedToMe=true&size=200`);
    projectTasks = arr(res).filter(t => String(t.projectId || t.project?._id || t.project) === String(projectId));
  } catch(e) { projectTasks = []; }
}
async function loadMeetings() {
  try { const res = await apiRequest("/meetings"); projectMeetings = arr(res); } catch(e) { projectMeetings = []; }
}
async function loadTeam() {
  try { const res = await apiRequest(`/teams`); projectTeam = arr(res); } catch(e) { projectTeam = []; }
}

/* ==================== BANNER ==================== */
function renderBanner() {
  const p = projectData;
  const banner = document.getElementById("projectBanner");
  const progress = p.progress || 0;
  const health = p.healthScore || p.health || "Good";
  const risk = p.riskLevel || "Low";
  banner.innerHTML = `
    <div class="banner-top">
      <div class="banner-title-group">
        <h1>${p.projectName || p.name || "Untitled Project"}</h1>
        <span class="badge ${statusClass(p.status)}">${p.status || "Active"}</span>
        <span class="badge ${risk === 'High' || risk === 'Critical' ? 'critical' : risk === 'Medium' ? 'high' : 'low'}">${risk} Risk</span>
      </div>
      <div class="banner-actions">
        <button class="btn btn-outline" onclick="toggleBookmark()">🔖 Bookmark</button>
        <button class="btn btn-primary shadow-hover">Share</button>
      </div>
    </div>
    <div class="banner-meta">
      <span>🏢 Client: <strong>${p.clientName || p.client?.name || p.client || "—"}</strong></span>
      <span>📂 Dept: <strong>${p.department?.name || p.departmentName || "—"}</strong></span>
      <span>💰 Budget: <strong>${p.budget || "—"}</strong></span>
      <span>📅 ${fmt(p.startDate)} – ${fmt(p.endDate || p.deadline)}</span>
      <span>🏃 Sprint: <strong>${p.currentSprint || p.sprint || "—"}</strong></span>
      <span>● Health: <strong style="color:${health === 'Good' ? 'var(--success-color)' : health === 'Critical' ? 'var(--danger-color)' : 'var(--warning-color)'}">${health}</strong></span>
    </div>
    <div class="banner-progress">
      <div class="progress-labels"><span>Overall Progress</span><span>${progress}%</span></div>
      <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
    </div>`;
}

window.toggleBookmark = function() {
  if (typeof JMKC !== "undefined" && JMKC.addBookmark) {
    JMKC.addBookmark("Project", projectData.projectName || projectData.name, window.location.href, projectId);
  }
};

/* ==================== KPI ROW ==================== */
function renderKPIRow() {
  const kpi = document.getElementById("kpiRow");
  const open = projectTasks.filter(t => t.status !== "Completed").length;
  const done = projectTasks.filter(t => t.status === "Completed").length;
  const members = projectData.members?.length || projectData.teamMemberIds?.length || projectData.teamMembers?.length || projectData.allocatedTeam?.length || projectTeam.length || 0;
  kpi.innerHTML = [
    { label: "Members", val: members, tab: "tab-team" },
    { label: "Open Tasks", val: open, tab: "tab-tasks" },
    { label: "Completed", val: done, tab: "tab-tasks" },
    { label: "Meetings", val: projectMeetings.length, tab: "tab-meetings" },
    { label: "Files", val: projectData.filesCount || "—", tab: "tab-files" },
  ].map(k => `<div class="kpi-box" onclick="document.querySelector('[data-target=${k.tab}]').click()"><div class="kpi-box-val">${k.val}</div><div class="kpi-box-label">${k.label}</div></div>`).join("");
}

/* ==================== TAB 1: OVERVIEW ==================== */
function renderOverview() {
  const p = projectData;
  // Description & Objectives
  el("overviewDescContainer").innerHTML = `
    <h4 style="margin-bottom:10px">Description</h4>
    <p style="color:var(--text-secondary);margin-bottom:20px">${p.description || "No description available."}</p>
    <h4 style="margin-bottom:10px">Objectives</h4>
    <ul style="color:var(--text-secondary);padding-left:20px">${(p.objectives || ["Deliver on time", "Meet quality standards"]).map(o => `<li>${o}</li>`).join("")}</ul>
  `;

  // Health Breakdown
  el("healthBreakdownContainer").innerHTML = [
    { name: "Schedule", status: p.scheduleHealth || "On Track", color: "var(--success-color)" },
    { name: "Budget", status: p.budgetHealth || "Healthy", color: "var(--success-color)" },
    { name: "Resource", status: p.resourceHealth || "Adequate", color: "var(--warning-color)" },
    { name: "Quality", status: p.qualityHealth || "High", color: "var(--success-color)" },
  ].map(h => `<div style="display:flex;justify-content:space-between;margin-bottom:10px"><span>${h.name}</span><span style="color:${h.color};font-weight:600">${h.status}</span></div>`).join("");

  // Milestones
  el("milestonesContainer").innerHTML = (p.milestones && p.milestones.length > 0)
    ? p.milestones.map(m => `<div class="list-item"><div class="item-left"><h4>${m.name || m.title}</h4><p>${m.status || "Upcoming"} • ${fmt(m.dueDate || m.date)}</p></div><span class="badge ${(m.status || 'upcoming').toLowerCase()}">${m.status || "Upcoming"}</span></div>`).join("")
    : `<div class="list-item"><div class="item-left"><h4>Phase 1 Delivery</h4><p>Upcoming</p></div><span class="badge medium">Upcoming</span></div><div class="list-item"><div class="item-left"><h4>Design Approval</h4><p>Completed</p></div><span class="badge low">Done</span></div>`;

  // Stakeholders
  el("stakeholdersContainer").innerHTML = `
    <div style="margin-bottom:12px"><strong>Project Manager:</strong> ${p.projectManager?.name || p.pmName || "—"}</div>
    <div style="margin-bottom:12px"><strong>Client Contact:</strong> ${p.clientContact || p.client?.contactPerson || "—"}</div>
    <div><strong>Department Lead:</strong> ${p.departmentLead || "—"}</div>
  `;

  // Risks
  el("risksContainer").innerHTML = (p.risks && p.risks.length > 0)
    ? p.risks.map(r => `<div class="list-item"><div class="item-left"><h4>${r.title || r.description}</h4><p>Impact: ${r.impact || "Medium"}</p></div><span class="badge ${(r.severity || 'medium').toLowerCase()}">${r.severity || "Medium"}</span></div>`).join("")
    : `<p style="color:var(--text-secondary)">No risks identified yet.</p>`;
}

/* ==================== TAB 2: TASKS ==================== */
let taskFilter = "all";
function renderTasksTab() {
  const container = el("tasksTableContainer");
  let filtered = [...projectTasks];

  if (taskFilter === "mine") filtered = filtered.filter(t => (t.assignedTo?._id || t.assignedTo) === currentUser?._id);
  else if (taskFilter === "open") filtered = filtered.filter(t => t.status !== "Completed");
  else if (taskFilter === "completed") filtered = filtered.filter(t => t.status === "Completed");
  else if (taskFilter === "blocked") filtered = filtered.filter(t => (t.status || "").toLowerCase().includes("block"));

  if (filtered.length === 0) { container.innerHTML = empty("No tasks found for this filter."); return; }

  container.innerHTML = `<table><thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Deadline</th><th>Assigned By</th><th>Deps</th></tr></thead><tbody>${filtered.map(t => {
    const isBlocked = (t.dependencies && t.dependencies.length > 0) || (t.status || "").toLowerCase().includes("block");
    return `<tr onclick="window.location.href='/employee/task-detail?id=${t._id || t.id}'" style="cursor:pointer${isBlocked ? ';border-left:3px solid var(--danger-color)' : ''}">
      <td><strong>${t.title || t.name || "Untitled"}</strong>${isBlocked ? ' <span style="color:var(--danger-color);font-size:0.75rem">🚫 Blocked</span>' : ''}</td>
      <td><span class="badge ${(t.priority || 'medium').toLowerCase()}">${t.priority || "Medium"}</span></td>
      <td>${t.status || "To Do"}</td>
      <td>${fmt(t.deadline)}</td>
      <td>${t.assignedBy?.name || t.assignedByName || "—"}</td>
      <td>${t.dependencies?.length || 0}</td>
    </tr>`;
  }).join("")}</tbody></table>`;
}

function bindTaskFilters() {
  document.querySelectorAll(".task-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".task-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      taskFilter = btn.dataset.filter;
      renderTasksTab();
    });
  });

  document.getElementById("exportTasksBtn")?.addEventListener("click", () => {
    const csv = ["Task,Priority,Status,Deadline"].concat(projectTasks.map(t => `"${t.title || t.name}","${t.priority}","${t.status}","${t.deadline || ""}"`)).join("\n");
    downloadCSV(csv, "tasks_export.csv");
  });

  document.getElementById("taskGroupBy")?.addEventListener("change", (e) => {
    // Future: group by status/priority. For now just re-render.
    renderTasksTab();
  });
}

/* ==================== TAB 3: FILES ==================== */
async function renderFilesTab() {
  const container = el("filesContainer");
  container.innerHTML = `<div style="padding:40px;text-align:center">Loading files...</div>`;
  
  try {
    const res = await apiRequest(`/files?projectId=${projectId}`);
    const files = arr(res);
    
    let html = `
      <div style="grid-column: 1/-1; display: flex; justify-content: space-between; margin-bottom: 15px">
        <h4 style="margin: 0">Project Files</h4>
        <div style="display:flex;gap:10px;">
          <input type="file" id="fileUploadInput" style="display:none" onchange="handleFileUpload(event)">
          <button class="btn btn-sm btn-primary" onclick="document.getElementById('fileUploadInput').click()">Upload File</button>
        </div>
      </div>
    `;

    if (files.length === 0) {
      html += empty("No files uploaded yet.");
    } else {
      html += `<div class="files-grid" style="grid-column:1/-1">` + files.map(f => `
        <div class="file-folder glass-card" style="padding:15px">
          <div style="font-size:2rem;margin-bottom:10px">${f.type && f.type.includes("image") ? "🖼️" : f.type && f.type.includes("pdf") ? "📄" : "📁"}</div>
          <h4 style="font-size:0.9rem;word-break:break-all" title="${f.name}">${f.name}</h4>
          <p style="font-size:0.75rem;color:var(--text-secondary)">${(f.size / 1024 / 1024).toFixed(2)} MB • ${timeAgo(f.createdAt)}</p>
          <div style="margin-top:10px;display:flex;gap:6px">
            <a href="${f.url}" target="_blank" class="btn btn-sm btn-outline">Download</a>
            <button class="btn btn-sm btn-outline" style="color:var(--danger-color);border-color:var(--danger-color)" onclick="deleteFile('${f._id}')">Delete</button>
          </div>
        </div>
      `).join("") + `</div>`;
    }
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = renderError("Failed to load files.", "renderFilesTab()");
  }
}

window.handleFileUpload = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("projectId", projectId);

  try {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/files/upload", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    if (res.ok) {
      alert("File uploaded successfully");
      renderFilesTab();
    } else {
      alert("Failed to upload file");
    }
  } catch(e) {
    alert("Error uploading file");
  }
};

window.deleteFile = async function(fileId) {
  if (!confirm("Are you sure you want to delete this file?")) return;
  try {
    const res = await apiRequest(`/files/${fileId}`, "DELETE");
    if (res && res.success) renderFilesTab();
  } catch(e) {
    alert("Failed to delete file.");
  }
};

/* ==================== TAB 4: DOCUMENTS ==================== */
async function renderDocsTab() {
  const container = el("docsContainer");
  container.innerHTML = `<div style="padding:40px;text-align:center">Loading documents...</div>`;

  try {
    const res = await apiRequest(`/documents?projectId=${projectId}`);
    const docs = arr(res);

    if (docs.length === 0) {
      container.innerHTML = empty("No documents available. Create one to get started.");
      return;
    }

    container.innerHTML = `<div class="files-grid">${docs.map(d => `
      <div class="file-folder glass-card" style="padding:20px;cursor:pointer">
        <div style="font-size:2rem;margin-bottom:10px">${d.icon || "📋"}</div>
        <h4 title="${d.title || d.name}">${d.title || d.name}</h4>
        <p style="font-size:0.8rem;color:var(--text-secondary)">Version: ${d.version || "v1.0"} • ${timeAgo(d.updatedAt || d.createdAt)}</p>
        <div style="margin-top:10px;display:flex;gap:6px">
          <button class="btn btn-sm btn-outline">Preview</button>
          <a href="${d.filePath || '#'}" class="btn btn-sm btn-outline" target="_blank">Download</a>
        </div>
      </div>
    `).join("")}</div>`;
  } catch(e) {
    container.innerHTML = renderError("Failed to load documents.", "renderDocsTab()");
  }
}

/* ==================== TAB 5: MEETINGS ==================== */
let meetingFilter = "upcoming";
function renderMeetingsTab() {
  const container = el("meetingsListContainer");
  const now = new Date();
  let filtered = [...projectMeetings];
  if (meetingFilter === "upcoming") filtered = filtered.filter(m => new Date(m.date || m.startTime) >= now);
  else if (meetingFilter === "past") filtered = filtered.filter(m => new Date(m.date || m.startTime) < now);
  else if (meetingFilter === "cancelled") filtered = filtered.filter(m => (m.status || "").toLowerCase() === "cancelled");

  if (filtered.length === 0) { container.innerHTML = empty("No meetings found."); }
  else {
    container.innerHTML = `<div class="meetings-list">${filtered.map(m => `
      <div class="list-item glass-card" style="margin-bottom:12px;padding:16px">
        <div class="item-left">
          <h4>${m.title || m.name || "Meeting"}</h4>
          <p>${m.organizer?.name || m.organizerName || "—"} • ${formatTime(m.date || m.startTime)} • ${m.duration || "30"} min</p>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-primary" onclick="window.open('${m.teamsLink || m.meetingLink || "#"}')">Join Teams</button>
          <button class="btn btn-sm btn-outline">Outlook</button>
          <button class="btn btn-sm btn-outline">Reschedule</button>
        </div>
      </div>
    `).join("")}</div>`;
  }

  // Meeting Analytics
  el("meetingAnalyticsContainer").innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px">
      <div style="text-align:center"><div style="font-weight:700;font-size:1.5rem">${projectMeetings.length}</div><div style="font-size:0.75rem;color:var(--text-secondary)">Total Meetings</div></div>
      <div style="text-align:center"><div style="font-weight:700;font-size:1.5rem">${Math.round(projectMeetings.length * 0.85 * 100) / 100}%</div><div style="font-size:0.75rem;color:var(--text-secondary)">Attendance</div></div>
      <div style="text-align:center"><div style="font-weight:700;font-size:1.5rem">${(projectMeetings.length * 0.5).toFixed(1)}h</div><div style="font-size:0.75rem;color:var(--text-secondary)">Meeting Hours</div></div>
    </div>
  `;
}

function bindMeetingFilters() {
  document.querySelectorAll(".meeting-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".meeting-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      meetingFilter = btn.dataset.filter;
      renderMeetingsTab();
    });
  });
}

/* ==================== TAB 6: CHAT (Socket.io) ==================== */
function initChat() {
  const msgContainer = el("chatMessagesContainer");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");
  if (!msgContainer) return;

  // Load existing messages via REST
  loadChatMessages();

  // Send message
  if (sendBtn && input) {
    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;

      apiRequest("/messages", "POST", { projectId, text, content: text, message: text })
        .then(() => loadChatMessages())
        .catch(() => appendChatMessage({ senderName: currentUser?.name || "You", text, createdAt: new Date().toISOString() }));
      input.value = "";
    };

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
  }

  // Listen for incoming messages
  if (typeof JMKC !== "undefined" && JMKC.socket) {
    JMKC.socket.on("chat:message", (msg) => {
      if (msg.roomId === chatRoomId && msg.senderId !== currentUser?._id) {
        appendChatMessage(msg);
      }
    });
  }

  // Channel switching
  document.querySelectorAll(".chat-channel").forEach(ch => {
    ch.addEventListener("click", () => {
      document.querySelectorAll(".chat-channel").forEach(c => c.classList.remove("active"));
      ch.classList.add("active");
      document.getElementById("chatChannelTitle").textContent = `# ${ch.dataset.channel.charAt(0).toUpperCase() + ch.dataset.channel.slice(1)}`;
      loadChatMessages();
    });
  });

  // Message search
  document.getElementById("chatSearchInput")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll(".chat-msg").forEach(msg => {
      msg.style.display = msg.textContent.toLowerCase().includes(query) ? "" : "none";
    });
  });
}

async function loadChatMessages() {
  const container = el("chatMessagesContainer");
  try {
    chatRoomId = `project_${projectId}`;
    const msgRes = await apiRequest(`/messages?projectId=${encodeURIComponent(projectId)}`);
    const messages = arr(msgRes);
    container.innerHTML = messages.length > 0
      ? messages.map(m => chatMsgHTML(m)).join("")
      : `<div style="text-align:center;padding:40px;color:var(--text-secondary)">No messages yet. Start the project conversation!</div>`;
    container.scrollTop = container.scrollHeight;
  } catch(e) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary)">Chat unavailable.</div>`;
  }
}

function appendChatMessage(msg) {
  const container = el("chatMessagesContainer");
  const div = document.createElement("div");
  div.innerHTML = chatMsgHTML(msg);
  container.appendChild(div.firstElementChild);
  container.scrollTop = container.scrollHeight;
}

function chatMsgHTML(m) {
  const isMe = m.senderId === currentUser?._id || m.senderName === currentUser?.name;
  return `<div class="chat-msg" style="margin-bottom:15px;${isMe ? 'text-align:right' : ''}">
    <strong style="color:var(--accent-color)">${m.senderName || "User"}</strong> <span style="font-size:0.7rem;color:var(--text-secondary)">${formatTime(m.createdAt)}</span>
    <p style="margin-top:4px;${isMe ? 'background:rgba(59,130,246,0.15);display:inline-block;padding:8px 14px;border-radius:12px' : ''}">${m.text || ""}</p>
    ${m.fileUrl ? `<a href="${m.fileUrl}" target="_blank" style="font-size:0.8rem;color:var(--accent-color)">📎 ${m.fileName || "Attachment"}</a>` : ""}
  </div>`;
}

/* ==================== TAB 7: TEAM ==================== */
function renderTeamTab() {
  const container = el("teamContainer");
  const members = projectData.members || projectData.allocatedTeam || projectData.teamMembers || projectData.teamMemberIds || projectTeam;
  if (!members || members.length === 0) { container.innerHTML = empty("No team members found."); return; }

  container.innerHTML = `<div class="team-grid">${members.map(m => {
    const name = m.name || m.user?.name || "Team Member";
    const role = m.role || m.user?.role || "Member";
    const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    return `<div class="glass-card" style="padding:20px;text-align:center">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--accent-color);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-weight:700;color:#fff;font-size:1.2rem">${initials}</div>
      <h4>${name}</h4>
      <p style="font-size:0.8rem;color:var(--text-secondary)">${role}</p>
      <div style="margin-top:12px;font-size:0.8rem;color:var(--text-secondary)">
        <div>🟢 Available</div>
        <div style="margin-top:4px">Tasks: ${m.taskCount || "—"}</div>
      </div>
      <div style="margin-top:12px;display:flex;gap:6px;justify-content:center">
        <button class="btn btn-sm btn-outline" onclick="window.location.href='/employee/profile?id=${m._id || m.user?._id || ""}'">Profile</button>
        <button class="btn btn-sm btn-primary">Message</button>
      </div>
    </div>`;
  }).join("")}</div>`;
}

/* ==================== TAB 8: TIMELINE (Audit Logs) ==================== */
async function renderTimeline() {
  const container = el("timelineContainer");
  container.innerHTML = `<div style="padding:40px;text-align:center">Loading timeline...</div>`;

  try {
    const res = await apiRequest(`/audit-logs?targetId=${projectId}`);
    let logs = arr(res);
    
    // Mix in local tasks and meetings if logs are empty (for backward compatibility/fallback)
    const events = [
      ...logs.map(l => ({ type: l.action || l.activity, date: l.createdAt, icon: "⚡", user: l.user?.name || "System" })),
      ...projectTasks.filter(t => t.status === "Completed").slice(0, 5).map(t => ({ type: `Task Completed: ${t.title || t.name}`, date: t.updatedAt || t.completedAt, icon: "✅", user: t.assignedTo?.name || "System" })),
      ...projectMeetings.slice(0, 3).map(m => ({ type: `Meeting: ${m.title || m.name}`, date: m.date, icon: "🤝", user: m.organizer?.name || "System" })),
    ].filter(e => e.date).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (events.length === 0) { container.innerHTML = empty("No timeline events yet."); return; }

    // Remove duplicates based on exact date match
    const uniqueEvents = Array.from(new Map(events.map(item => [item.date, item])).values());

    container.innerHTML = uniqueEvents.slice(0, 20).map(e => `
      <div class="timeline-item">
        <strong>${e.icon} ${e.type}</strong><br>
        <span style="font-size:0.8rem;color:var(--text-secondary)">By ${e.user} • ${fmt(e.date)} • ${timeAgo(e.date)}</span>
      </div>
    `).join("");
  } catch(e) {
    container.innerHTML = renderError("Failed to load timeline.", "renderTimeline()");
  }
}

/* ==================== TAB 9: ANALYTICS ==================== */
function renderAnalytics() {
  const container = el("analyticsContainer");
  const total = projectTasks.length || 1;
  const completed = projectTasks.filter(t => t.status === "Completed").length;
  const inProgress = projectTasks.filter(t => t.status === "In Progress").length;
  const overdue = projectTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== "Completed").length;
  const avgAge = projectTasks.length > 0 ? Math.round(projectTasks.reduce((sum, t) => sum + (Date.now() - new Date(t.createdAt || Date.now()).getTime()) / 86400000, 0) / projectTasks.length) : 0;

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px">
      ${chartCard("Task Burndown", [
        { label: "Completed", val: completed, total, color: "var(--success-color)" },
        { label: "In Progress", val: inProgress, total, color: "var(--warning-color)" },
        { label: "Remaining", val: total - completed - inProgress, total, color: "var(--accent-color)" },
      ])}
      ${chartCard("Team Productivity", [
        { label: "Tasks Completed", val: completed, total, color: "var(--success-color)" },
        { label: "Overdue", val: overdue, total, color: "var(--danger-color)" },
      ])}
      ${chartCard("Task Aging", [
        { label: `Avg Age: ${avgAge} days`, val: Math.min(avgAge, 30), total: 30, color: avgAge > 14 ? "var(--danger-color)" : "var(--accent-color)" },
      ])}
      ${chartCard("Delay Analysis", [
        { label: "On Time", val: total - overdue, total, color: "var(--success-color)" },
        { label: "Delayed", val: overdue, total, color: "var(--danger-color)" },
      ])}
    </div>
  `;
}

function chartCard(title, bars) {
  return `<div class="glass-card" style="padding:20px">
    <h4 style="margin-bottom:16px">${title}</h4>
    ${bars.map(b => `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px"><span>${b.label}</span><span>${b.val}/${b.total}</span></div>
      <div style="height:8px;background:var(--bg-primary);border-radius:4px;overflow:hidden"><div style="height:100%;width:${(b.val / Math.max(b.total, 1)) * 100}%;background:${b.color};border-radius:4px;transition:width 0.5s"></div></div>
    </div>`).join("")}
  </div>`;
}

/* ==================== TAB 10: REPORTS ==================== */
function renderReports() {
  const container = el("reportsContainer");
  const reports = [
    { name: "Project Summary", icon: "📊" },
    { name: "Sprint Report", icon: "🏃" },
    { name: "Task Report", icon: "✅" },
    { name: "Attendance Report", icon: "📋" },
    { name: "Timesheet Report", icon: "⏱️" },
    { name: "Performance Report", icon: "📈" },
    { name: "Resource Report", icon: "👥" },
  ];

  container.innerHTML = `<div class="files-grid">${reports.map(r => `
    <div class="glass-card" style="padding:20px;text-align:center">
      <div style="font-size:2rem;margin-bottom:10px">${r.icon}</div>
      <h4>${r.name}</h4>
      <div style="margin-top:12px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="generateReport('${r.name}','pdf')">PDF</button>
        <button class="btn btn-sm btn-outline" onclick="generateReport('${r.name}','excel')">Excel</button>
        <button class="btn btn-sm btn-outline" onclick="generateReport('${r.name}','csv')">CSV</button>
        <button class="btn btn-sm btn-outline" onclick="window.print()">Print</button>
      </div>
    </div>
  `).join("")}</div>
  <div class="glass-card" style="margin-top:20px;padding:20px">
    <h4 style="margin-bottom:12px">📅 Scheduled & Email Reports</h4>
    <p style="color:var(--text-secondary);font-size:0.9rem">Configure automated report delivery via email. Reports can be scheduled daily, weekly, or monthly.</p>
    <button class="btn btn-primary" style="margin-top:12px">Configure Schedule</button>
  </div>`;
}

window.generateReport = function(name, format) {
  if (format === "csv") {
    const csv = `Report: ${name}\nGenerated: ${new Date().toISOString()}\n\nProject,${projectData?.name || ""}\nTasks,${projectTasks.length}\nCompleted,${projectTasks.filter(t => t.status === "Completed").length}\nMeetings,${projectMeetings.length}`;
    downloadCSV(csv, `${name.replace(/\s/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
  } else {
    alert(`Generating ${format.toUpperCase()} for "${name}"... This would trigger a backend report generation endpoint.`);
  }
};

/* ==================== SOCKET EVENTS ==================== */
function listenSocket() {
  document.addEventListener("jmkc:task:updated", async () => { await loadTasks(); renderKPIRow(); renderTasksTab(); renderTimeline(); renderAnalytics(); });
  document.addEventListener("jmkc:project:updated", async (e) => { if (e.detail?._id === projectId) { projectData = { ...projectData, ...e.detail }; renderBanner(); } });
}

/* ==================== UTILITIES ==================== */
function el(id) { return document.getElementById(id); }
function arr(res) { if (Array.isArray(res)) return res; if (res?.data && Array.isArray(res.data)) return res.data; if (res?.messages) return res.messages; if (res?.rooms) return res.rooms; return []; }
function fmt(d) { if (!d) return "—"; try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch(e) { return "—"; } }
function formatTime(d) { if (!d) return "—"; try { return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); } catch(e) { return "—"; } }
function timeAgo(d) { if (!d) return ""; const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return "Just now"; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; }
function statusClass(s) { const v = (s || "active").toLowerCase(); if (v.includes("complet")) return "low"; if (v.includes("critical")) return "critical"; if (v.includes("hold")) return "high"; return "medium"; }
function empty(msg) { return `<div style="text-align:center;padding:30px;color:var(--text-secondary)"><div style="font-size:2rem;opacity:0.5;margin-bottom:10px">📭</div><p>${msg}</p></div>`; }
function renderError(msg, retryFn) { return `<div style="text-align:center;padding:30px;color:var(--danger-color)"><p>${msg}</p>${retryFn ? `<button onclick="${retryFn}" class="btn btn-primary" style="margin-top:10px">Retry</button>` : ""}</div>`; }
function downloadCSV(csv, filename) { const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); }
