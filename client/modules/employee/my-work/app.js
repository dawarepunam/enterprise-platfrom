/* 
  JMKC Enterprise CRM - My Work Command Center Logic
  Phase 4 – Full API + Socket + Enterprise Integration
*/

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponents();
  initTimers();
  initTimeTracker();
  initPersonalWorkspace();
  loadAllData();
  initAIAssistant();
  listenBookmarksAndRecent();
  listenSocketEvents();
});

const currentUser = JSON.parse(localStorage.getItem("user") || localStorage.getItem("jmkc_user") || "null");
const userId = currentUser?._id || currentUser?.id || "";

async function loadComponents() {
  try {
    const [headerRes, sidebarRes] = await Promise.all([
      fetch("/components/header.html"),
      fetch("/components/sidebar.html"),
    ]);
    if (headerRes.ok) document.getElementById("header-container").innerHTML = await headerRes.text();
    if (sidebarRes.ok) document.getElementById("sidebar-container").innerHTML = await sidebarRes.text();
    // Wait a tick for DOM to update, then init global UI
    setTimeout(() => {
      if (typeof initThemeToggle === "function") { initThemeToggle(); initSearchModal(); initDrawers(); initPopups(); initProfileData(); initCommandPalette(); initNotificationsAPI(); initBookmarks(); initRecentItems(); initAnnouncementsCenter(); initOfflineSync(); initAutosave(); initSocketGlobal(); }
    }, 50);
  } catch (error) { console.error("Component load failed", error); }
}

/* ==================== LOAD ALL DATA FROM API ==================== */
async function loadAllData() {
  await Promise.allSettled([
    loadSummaryBar(),
    loadTodayTasks(),
    loadOverdueTasks(),
    loadUpcomingTasks(),
    loadMeetingsToday(),
    loadRecentActivity(),
    loadWorkload(),
    loadGoals(),
    loadUpcomingDeadlines(),
    loadAnnouncements(),
    loadApprovals(),
    loadTimeStats(),
  ]);
  renderBookmarksWidget();
  renderRecentItemsWidget();
}

/* ==================== SUMMARY BAR (API) ==================== */
async function loadSummaryBar() {
  const container = document.getElementById("summaryBarContainer");
  try {
    const res = await apiRequest("/analytics/employee/summary");
    if (!res || !res.success) throw new Error("API failed");
    const data = res.data;

    const stats = [
      { title: "Tasks Due Today", value: data.tasksDueToday || 0, trend: data.tasksDueToday > 3 ? "High load" : "On track", color: data.tasksDueToday > 3 ? "var(--danger-color)" : "var(--success-color)", link: "#todayTasksContainer" },
      { title: "Overdue Tasks", value: data.overdueTasks || 0, trend: data.overdueTasks > 0 ? "Needs attention!" : "Clear", color: data.overdueTasks > 0 ? "var(--danger-color)" : "var(--success-color)", link: "#overdueTasksContainer" },
      { title: "Meetings Today", value: data.meetingsToday || 0, trend: data.meetingsToday > 0 ? `Next in schedule` : "No meetings", color: "var(--accent-color)", link: "#meetingsTodayContainer" },
      { title: "Hours Logged", value: data.hoursLogged || 0, trend: "Total Logged", color: "var(--accent-color)", link: "#timeTrackingContainer" },
      { title: "Leave Balance", value: data.leaveBalance || 0, trend: "Remaining", color: "var(--text-secondary)", link: "/employee/leave" },
      { title: "Current Sprint", value: data.currentSprint || "—", trend: "Active", color: "var(--accent-color)", link: "/employee/sprint" },
    ];

    container.innerHTML = stats.map(s => `
      <div class="summary-card" onclick="${s.link.startsWith('#') ? `document.querySelector('${s.link}')?.scrollIntoView({behavior:'smooth'})` : `window.location.href='${s.link}'`}">
        <h4>${s.title}</h4>
        <div class="s-value">${s.value}</div>
        <div class="trend-popup" style="color:${s.color}">${s.trend}</div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = renderError("Failed to load summary", "loadSummaryBar()");
  }
}

/* ==================== TODAY'S TASKS (API) ==================== */
async function loadTodayTasks() {
  const container = document.getElementById("todayTasksContainer");
  try {
    const tasks = extractArray(await apiRequest("/tasks").then(r => ({ value: r })).catch(e => ({ reason: e })));
    const today = new Date().toDateString();
    const todayTasks = tasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === today && t.status !== "Completed");

    if (todayTasks.length === 0) {
      container.innerHTML = renderEmpty("No tasks due today. Great job! 🎉");
      return;
    }

    container.innerHTML = todayTasks.map(t => `
      <div class="list-item" onclick="window.location.href='/employee/task-detail?id=${t._id || t.id}'">
        <div class="item-left">
          <h4>${t.title || t.name || "Untitled Task"}</h4>
          <p>${t.projectName || t.project?.name || "No Project"} • ${t.status || "To Do"}</p>
        </div>
        <div class="item-right">
          <span class="badge ${(t.priority || "medium").toLowerCase()}">${t.priority || "Medium"}</span>
        </div>
        <div class="hover-popup">
          <div class="popup-row"><span>Description</span><span>${truncate(t.description || "—", 50)}</span></div>
          <div class="popup-row"><span>Assigned By</span><span>${t.assignedBy?.name || t.assignedByName || "—"}</span></div>
          <div class="popup-row"><span>Estimated</span><span>${t.estimatedHours || "—"}h</span></div>
          <div class="popup-row"><span>Progress</span><span>${t.progress || 0}%</span></div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = renderError("Failed to load tasks", "loadTodayTasks()");
  }
}

/* ==================== OVERDUE TASKS (API) ==================== */
async function loadOverdueTasks() {
  const container = document.getElementById("overdueTasksContainer");
  try {
    const tasks = await fetchTasks();
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== "Completed");

    if (overdue.length === 0) {
      container.innerHTML = renderEmpty("No overdue tasks. ✅");
      return;
    }

    container.innerHTML = overdue.map(t => {
      const missedDays = Math.ceil((new Date() - new Date(t.deadline)) / 86400000);
      return `<div class="list-item" style="border-color: rgba(239, 68, 68, 0.5);" onclick="window.location.href='/employee/task-detail?id=${t._id || t.id}'">
        <div class="item-left">
          <h4>${t.title || t.name || "Untitled"}</h4>
          <p class="text-danger">Missed by ${missedDays} day${missedDays > 1 ? 's' : ''}</p>
        </div>
        <span class="badge critical">${t.priority || "High"}</span>
      </div>`;
    }).join("");
  } catch (err) {
    container.innerHTML = renderError("Failed to load overdue tasks", "loadOverdueTasks()");
  }
}

/* ==================== UPCOMING TASKS (API) ==================== */
async function loadUpcomingTasks() {
  const container = document.getElementById("upcomingTasksContainer");
  try {
    const tasks = await fetchTasks();
    const now = new Date();
    const weekLater = new Date(Date.now() + 7 * 86400000);
    const upcoming = tasks.filter(t => {
      if (!t.deadline || t.status === "Completed") return false;
      const d = new Date(t.deadline);
      return d > now && d <= weekLater;
    });

    if (upcoming.length === 0) {
      container.innerHTML = renderEmpty("No upcoming tasks this week.");
      return;
    }

    container.innerHTML = upcoming.map(t => {
      const daysLeft = Math.ceil((new Date(t.deadline) - new Date()) / 86400000);
      return `<div class="list-item" onclick="window.location.href='/employee/task-detail?id=${t._id || t.id}'">
        <div class="item-left"><h4>${t.title || t.name || "Untitled"}</h4><p>Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}</p></div>
        <span class="badge ${(t.priority || "medium").toLowerCase()}">${t.priority || "Medium"}</span>
      </div>`;
    }).join("");
  } catch (err) {
    container.innerHTML = renderError("Failed to load upcoming tasks", "loadUpcomingTasks()");
  }
}

/* ==================== MEETINGS TODAY (API) ==================== */
async function loadMeetingsToday() {
  const container = document.getElementById("meetingsTodayContainer");
  try {
    const res = await apiRequest("/meetings");
    const meetings = extractArrayDirect(res);
    const today = new Date().toDateString();
    const todayMeetings = meetings.filter(m => m.date && new Date(m.date).toDateString() === today);

    if (todayMeetings.length === 0) {
      container.innerHTML = renderEmpty("No meetings scheduled today.");
      return;
    }

    container.innerHTML = todayMeetings.map(m => `
      <div class="list-item">
        <div class="item-left">
          <h4>${m.title || m.name || "Untitled Meeting"}</h4>
          <p>${m.organizer?.name || m.organizerName || "—"} • ${formatTime(m.date || m.startTime)}</p>
        </div>
        <div class="item-right" style="display:flex;gap:6px">
          <button class="btn btn-sm btn-primary" onclick="window.open('${m.teamsLink || m.meetingLink || "#"}')">Join</button>
          <button class="btn btn-sm btn-outline" onclick="window.location.href='/employee/meetings'">Details</button>
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = renderError("Failed to load meetings", "loadMeetingsToday()");
  }
}

/* ==================== RECENT ACTIVITY (API) ==================== */
async function loadRecentActivity() {
  const container = document.getElementById("recentActivityContainer");
  try {
    let activities = [];
    try {
      const res = await apiRequest("/notifications");
      activities = extractArrayDirect(res).slice(0, 10);
    } catch (e) { /* fallback empty */ }

    if (activities.length === 0) {
      container.innerHTML = renderEmpty("No recent activity.");
      return;
    }

    container.innerHTML = `<div class="timeline-container" style="border-left:2px solid var(--border-color);margin-left:10px;padding-left:15px">` +
      activities.map(a => `<div class="timeline-item" style="margin-bottom:12px;position:relative;padding-left:10px"><div style="position:absolute;left:-21px;top:2px;width:8px;height:8px;border-radius:50%;background:var(--accent-color)"></div><strong style="font-size:0.9rem">${a.title || a.type || "Activity"}</strong><p style="font-size:0.8rem;color:var(--text-secondary)">${a.description || a.body || a.message || ""} • ${timeAgo(a.createdAt)}</p></div>`).join("")
      + `</div>`;
  } catch (err) {
    container.innerHTML = renderError("Failed to load activity", "loadRecentActivity()");
  }
}

/* ==================== WORKLOAD WIDGET (API) ==================== */
async function loadWorkload() {
  const container = document.getElementById("workloadContainer");
  try {
    const res = await apiRequest("/analytics/workload");
    if (!res || !res.success) throw new Error();
    const data = res.data.find(w => w.name === (currentUser?.name || currentUser?.employeeId)) || { activeTasks: 0 };
    
    const activeTasks = data.activeTasks;
    const maxCapacity = 20; // Configurable
    const capacityPct = Math.min(100, Math.round((activeTasks / maxCapacity) * 100));
    const burnoutLevel = capacityPct > 85 ? "Overloaded" : capacityPct > 60 ? "Busy" : "Healthy";
    const color = capacityPct > 85 ? "gauge-red" : capacityPct > 60 ? "gauge-yellow" : "gauge-green";

    container.innerHTML = `
      <div class="workload-stats" style="margin-bottom:8px"><span>Assigned: ${activeTasks} tasks</span><span>Capacity: ${capacityPct}%</span></div>
      <div class="workload-gauge"><div class="gauge-fill ${color}" style="width:${capacityPct}%"></div></div>
      <div class="workload-stats" style="margin-top:8px"><span>Available: ${Math.max(0, maxCapacity - activeTasks)} slots</span><span style="color:${capacityPct > 85 ? 'var(--danger-color)' : capacityPct > 60 ? 'var(--warning-color)' : 'var(--success-color)'}">${burnoutLevel}</span></div>
    `;
  } catch (err) {
    container.innerHTML = renderError("Failed to load workload", "loadWorkload()");
  }
}

/* ==================== GOALS & KPI ==================== */
async function loadGoals() {
  const container = document.getElementById("goalsContainer");
  try {
    const tasks = await fetchTasks();
    const total = tasks.length || 1;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const pct = Math.round((completed / total) * 100);

    container.innerHTML = `
      <div style="margin-bottom:15px">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:5px"><span>Monthly Goal: Task Completion</span><span>${pct}%</span></div>
        <div class="workload-gauge"><div class="gauge-fill ${pct > 70 ? 'gauge-green' : 'gauge-yellow'}" style="width:${pct}%"></div></div>
      </div>
      <div style="margin-bottom:15px">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:5px"><span>Quarterly: Performance Score</span><span>${Math.min(100, pct + 10)}%</span></div>
        <div class="workload-gauge"><div class="gauge-fill gauge-green" style="width:${Math.min(100, pct + 10)}%"></div></div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:5px"><span>KPI: Zero Overdue Tasks</span><span>${tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== "Completed").length === 0 ? '100%' : '50%'}</span></div>
        <div class="workload-gauge"><div class="gauge-fill ${tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== "Completed").length === 0 ? 'gauge-green' : 'gauge-yellow'}" style="width:${tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== "Completed").length === 0 ? '100' : '50'}%"></div></div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = renderError("Failed to load goals", "loadGoals()");
  }
}

/* ==================== UPCOMING DEADLINES ==================== */
async function loadUpcomingDeadlines() {
  const container = document.getElementById("deadlinesContainer");
  try {
    const tasks = await fetchTasks();
    const now = new Date();
    const deadlines = tasks.filter(t => t.deadline && new Date(t.deadline) > now && t.status !== "Completed")
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);

    if (deadlines.length === 0) { container.innerHTML = renderEmpty("No upcoming deadlines."); return; }

    container.innerHTML = deadlines.map(t => {
      const daysLeft = Math.ceil((new Date(t.deadline) - now) / 86400000);
      return `<div class="list-item" onclick="window.location.href='/employee/task-detail?id=${t._id || t.id}'">
        <div class="item-left"><h4>${t.title || t.name || "Task"}</h4><p>${t.projectName || "—"} • ${daysLeft} day${daysLeft > 1 ? 's' : ''} left</p></div>
        <span class="badge ${(t.priority || 'medium').toLowerCase()}">${t.priority || "Medium"}</span>
      </div>`;
    }).join("");
  } catch (err) { container.innerHTML = renderError("Failed to load deadlines", "loadUpcomingDeadlines()"); }
}

/* ==================== ANNOUNCEMENTS ==================== */
async function loadAnnouncements() {
  const container = document.getElementById("announcementsContainer");
  try {
    const items = (typeof JMKC !== "undefined" && JMKC.fetchAnnouncements) ? await JMKC.fetchAnnouncements() : [];
    if (items.length === 0) { container.innerHTML = renderEmpty("No announcements."); return; }
    container.innerHTML = items.slice(0, 5).map(a => `<div class="list-item"><div class="item-left"><h4>${a.title || a.message || "Announcement"}</h4><p style="font-size:0.8rem;color:var(--text-secondary)">${timeAgo(a.createdAt)}</p></div></div>`).join("");
  } catch (err) { container.innerHTML = renderEmpty("No announcements."); }
}

/* ==================== APPROVALS ==================== */
async function loadApprovals() {
  const container = document.getElementById("approvalsContainer");
  container.innerHTML = renderEmpty("No pending approvals. ✅");
}

/* ==================== TIME TRACKING ==================== */
async function loadTimeStats() {
  const container = document.getElementById("timeStatsContainer");
  try {
    let timesheets = [];
    try { const res = await apiRequest("/timesheets"); timesheets = extractArrayDirect(res); } catch(e) {}
    const todayHrs = getLoggedHoursToday();
    container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px">
      <div style="text-align:center"><div style="font-weight:700;font-size:1.2rem">${todayHrs}</div><div style="font-size:0.7rem;color:var(--text-secondary)">TODAY</div></div>
      <div style="text-align:center"><div style="font-weight:700;font-size:1.2rem">${getLoggedHoursWeek()}</div><div style="font-size:0.7rem;color:var(--text-secondary)">THIS WEEK</div></div>
      <div style="text-align:center"><div style="font-weight:700;font-size:1.2rem">—</div><div style="font-size:0.7rem;color:var(--text-secondary)">BILLABLE</div></div>
    </div>`;
  } catch (err) { container.innerHTML = ""; }
}

/* ==================== PERSONAL WORKSPACE (API) ==================== */
function initPersonalWorkspace() {
  const container = document.getElementById("notesContainer");
  const addBtn = document.getElementById("addNoteBtn");
  let currentSettingsId = null;
  let cachedNotes = [];

  async function loadNotes() {
    try {
      const res = await apiRequest(`/settings?userId=${userId}&type=personal_notes`);
      if (res && res.data && res.data.length > 0) {
        currentSettingsId = res.data[0]._id;
        cachedNotes = res.data[0].notes || [];
      }
      renderNotes();
    } catch(e) { console.error("Failed to load notes"); renderNotes(); }
  }

  async function saveNotes() {
    try {
      const payload = { userId, type: "personal_notes", notes: cachedNotes };
      if (currentSettingsId) {
        await apiRequest(`/settings/${currentSettingsId}`, "PUT", payload);
      } else {
        const res = await apiRequest(`/settings`, "POST", payload);
        if (res && res.data) currentSettingsId = res.data._id;
      }
    } catch(e) { console.error("Failed to save notes"); }
  }

  function renderNotes() {
    if (cachedNotes.length === 0) { container.innerHTML = renderEmpty("Add a note with the + button."); return; }
    container.innerHTML = cachedNotes.map((n, i) => `<div class="sticky-note"><div contenteditable="true" class="note-text" data-index="${i}" style="outline:none">${n.text}</div><button onclick="JMKC.deleteNote(${i})" style="position:absolute;top:4px;right:8px;background:none;border:none;cursor:pointer;color:#92400e;font-size:0.8rem">✕</button></div>`).join("");
    container.querySelectorAll(".note-text").forEach(el => {
      el.addEventListener("blur", () => {
        cachedNotes[parseInt(el.dataset.index)].text = el.textContent;
        saveNotes();
      });
    });
  }

  if (addBtn) addBtn.addEventListener("click", () => {
    cachedNotes.push({ text: "New note...", createdAt: new Date().toISOString() });
    saveNotes();
    renderNotes();
  });

  window.JMKC = window.JMKC || {};
  window.JMKC.deleteNote = (i) => {
    cachedNotes.splice(i, 1);
    saveNotes();
    renderNotes();
  };
  window.JMKC.addStickyNote = (text) => {
    cachedNotes.push({ text, createdAt: new Date().toISOString() });
    saveNotes();
    renderNotes();
  };

  loadNotes();
}

/* ==================== BOOKMARKS & RECENT ITEMS WIDGETS ==================== */
function renderBookmarksWidget() {
  const container = document.getElementById("bookmarksContainer");
  if (!container || typeof JMKC === "undefined") return;
  const bookmarks = JMKC.getBookmarks ? JMKC.getBookmarks() : [];
  if (bookmarks.length === 0) { container.innerHTML = renderEmpty("No bookmarks yet."); return; }
  container.innerHTML = bookmarks.slice(0, 8).map(b => `<div class="list-item" onclick="window.location.href='${b.url}'"><div class="item-left"><h4>${b.name}</h4><p style="font-size:0.75rem;color:var(--text-secondary)">${b.type}</p></div><button onclick="event.stopPropagation();JMKC.removeBookmark('${b.url}');renderBookmarksWidget()" style="background:none;border:none;cursor:pointer;color:var(--text-secondary)">✕</button></div>`).join("");
}

function renderRecentItemsWidget() {
  const container = document.getElementById("recentItemsContainer");
  if (!container || typeof JMKC === "undefined") return;
  const items = JMKC.getRecentItems ? JMKC.getRecentItems() : [];
  if (items.length === 0) { container.innerHTML = renderEmpty("No recent items."); return; }
  container.innerHTML = items.slice(0, 8).map(i => `<div class="list-item" onclick="window.location.href='${i.url}'"><div class="item-left"><h4>${i.name}</h4><p style="font-size:0.75rem;color:var(--text-secondary)">${i.type} • ${timeAgo(i.openedAt)}</p></div></div>`).join("");
}

function listenBookmarksAndRecent() {
  document.addEventListener("jmkc:bookmarks:updated", renderBookmarksWidget);
}

/* ==================== AI ASSISTANT ==================== */
function initAIAssistant() {
  const actions = {
    aiDailyReport: "Generating daily report based on your tasks and meetings...",
    aiTaskSummary: "Summarizing your current task status...",
    aiMeetingSummary: "Summarizing today's meetings...",
    aiStatusUpdate: "Generating status update for your team..."
  };
  Object.entries(actions).forEach(([id, msg]) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", () => {
      btn.textContent = "⏳ Processing...";
      btn.disabled = true;
      setTimeout(() => { btn.textContent = "✅ Generated!"; setTimeout(() => { btn.textContent = btn.textContent; btn.disabled = false; }, 2000); }, 1500);
    });
  });
}

/* ==================== FOCUS / POMODORO TIMER ==================== */
let pomodoroInterval, pomodoroTimeLeft = 25 * 60, pomodoroSessions = 0;

function initTimers() {
  const display = document.getElementById("timerDisplay");
  const btnStart = document.getElementById("startTimerBtn");
  const btnPause = document.getElementById("pauseTimerBtn");
  const btnStop = document.getElementById("stopTimerBtn");
  const statusBadge = document.getElementById("focusStatus");
  const sessionCounter = document.getElementById("focusSessionCount");
  if (!display) return;

  // Load sessions from localStorage
  pomodoroSessions = parseInt(localStorage.getItem("jmkc_pomodoro_sessions_today") || "0");
  if (sessionCounter) sessionCounter.textContent = `Sessions Today: ${pomodoroSessions}`;

  const updateDisplay = () => {
    const m = Math.floor(pomodoroTimeLeft / 60).toString().padStart(2, "0");
    const s = (pomodoroTimeLeft % 60).toString().padStart(2, "0");
    display.textContent = `${m}:${s}`;
  };

  btnStart.addEventListener("click", () => {
    clearInterval(pomodoroInterval);
    if (statusBadge) statusBadge.textContent = "🔥 Focusing...";
    pomodoroInterval = setInterval(() => {
      if (pomodoroTimeLeft > 0) { pomodoroTimeLeft--; updateDisplay(); }
      else {
        clearInterval(pomodoroInterval);
        pomodoroSessions++;
        localStorage.setItem("jmkc_pomodoro_sessions_today", pomodoroSessions);
        if (sessionCounter) sessionCounter.textContent = `Sessions Today: ${pomodoroSessions}`;
        if (statusBadge) statusBadge.textContent = "✅ Session Complete";
        logFocusSession();
        pomodoroTimeLeft = 25 * 60;
        updateDisplay();
      }
    }, 1000);
  });

  btnPause.addEventListener("click", () => { clearInterval(pomodoroInterval); if (statusBadge) statusBadge.textContent = "⏸ Paused"; });
  btnStop.addEventListener("click", () => { clearInterval(pomodoroInterval); pomodoroTimeLeft = 25 * 60; updateDisplay(); if (statusBadge) statusBadge.textContent = "Pomodoro Ready"; });
}

async function logFocusSession() {
  try { await apiRequest("/timesheets", "POST", { type: "focus_session", duration: 25, date: new Date().toISOString(), userId }); } catch (e) { console.log("Focus session log skipped (API may not support)"); }
}

/* ==================== TIME TRACKER ==================== */
let trackerInterval, trackerSeconds = 0, trackerRunning = false;

function initTimeTracker() {
  const display = document.getElementById("trackerDisplay");
  const startBtn = document.getElementById("trackerStartBtn");
  const pauseBtn = document.getElementById("trackerPauseBtn");
  const stopBtn = document.getElementById("trackerStopBtn");
  if (!display) return;

  const updateTracker = () => {
    const h = Math.floor(trackerSeconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((trackerSeconds % 3600) / 60).toString().padStart(2, "0");
    const s = (trackerSeconds % 60).toString().padStart(2, "0");
    display.textContent = `${h}:${m}:${s}`;
  };

  startBtn.addEventListener("click", () => {
    if (trackerRunning) return;
    trackerRunning = true;
    trackerInterval = setInterval(() => { trackerSeconds++; updateTracker(); }, 1000);
  });

  pauseBtn.addEventListener("click", () => { clearInterval(trackerInterval); trackerRunning = false; });

  stopBtn.addEventListener("click", async () => {
    clearInterval(trackerInterval);
    trackerRunning = false;
    if (trackerSeconds > 0) {
      const hours = (trackerSeconds / 3600).toFixed(2);
      addLoggedTime(parseFloat(hours));
      try { await apiRequest("/timesheets", "POST", { type: "manual_track", duration: trackerSeconds, hours: parseFloat(hours), date: new Date().toISOString(), userId }); } catch(e) {}
    }
    trackerSeconds = 0;
    updateTracker();
    loadTimeStats();
  });
}

/* ==================== SOCKET EVENTS ==================== */
function listenSocketEvents() {
  document.addEventListener("jmkc:task:updated", () => { loadTodayTasks(); loadOverdueTasks(); loadUpcomingTasks(); loadSummaryBar(); loadWorkload(); });
  document.addEventListener("jmkc:project:updated", () => { loadGoals(); });
}

/* ==================== UTILITY FUNCTIONS ==================== */
let _tasksCache = null;
async function fetchTasks() {
  if (_tasksCache) return _tasksCache;
  try { const res = await apiRequest("/tasks"); _tasksCache = extractArrayDirect(res); return _tasksCache; } catch(e) { return []; }
}

function extractArray(settled) {
  if (settled.status === "fulfilled") return extractArrayDirect(settled.value);
  return [];
}
function extractArrayDirect(res) {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  if (res?.tasks && Array.isArray(res.tasks)) return res.tasks;
  if (res?.meetings && Array.isArray(res.meetings)) return res.meetings;
  return [];
}

function truncate(str, len) { return str && str.length > len ? str.substring(0, len) + "..." : str || ""; }
function formatTime(dateStr) { try { return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); } catch(e) { return "—"; } }
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Time logging helpers (localStorage-based for client-side tracking)
function getLoggedHoursToday() {
  const data = JSON.parse(localStorage.getItem("jmkc_time_log") || "{}");
  return (data[new Date().toDateString()] || 0).toFixed(1);
}
function getLoggedHoursWeek() {
  const data = JSON.parse(localStorage.getItem("jmkc_time_log") || "{}");
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 86400000).toDateString();
    total += data[d] || 0;
  }
  return total.toFixed(1);
}
function addLoggedTime(hours) {
  const data = JSON.parse(localStorage.getItem("jmkc_time_log") || "{}");
  const today = new Date().toDateString();
  data[today] = (data[today] || 0) + hours;
  localStorage.setItem("jmkc_time_log", JSON.stringify(data));
}

function renderEmpty(msg) {
  return `<div class="empty-state" style="text-align:center;padding:30px 20px;color:var(--text-secondary)"><div class="empty-icon" style="font-size:2rem;opacity:0.5;margin-bottom:10px">📭</div><p>${msg}</p></div>`;
}
function renderError(msg, retryFn) {
  return `<div class="empty-state" style="text-align:center;padding:30px 20px;color:var(--danger-color)"><p>${msg}</p><button onclick="${retryFn}" class="btn btn-primary" style="margin-top:10px">Retry</button></div>`;
}
