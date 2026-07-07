/**
 * Calling Module Dashboard – Enterprise CRM
 * SPA controller: handles routing, data fetching, rendering
 */

// ============================================================
// STATE
// ============================================================
const state = {
  user: null,
  activeSection: "dashboard",
  leads: [],
  metrics: { funnel: { assigned: 0, notCalled: 0, attempted: 0, connected: 0, interested: 0, converted: 0 } },
  callHistory: [],
  activeLead: null,
  callTimer: null,
  callSeconds: 0,
  charts: {},
};

// Section metadata for the generic placeholder
const SECTION_META = {
  "my-calls":      { icon: "📞", title: "My Calls",      desc: "Your call queue will appear here." },
  "history":       { icon: "⏱️", title: "Call History",   desc: "All logged calls will be listed here." },
  "team":          { icon: "🫂", title: "Team View",      desc: "Monitor your team's performance live." },
  "reports":       { icon: "📊", title: "Reports",        desc: "Detailed reports and exports." },
  "notifications": { icon: "🔔", title: "Notifications",  desc: "All system alerts and lead updates." },
  "sales-handover":{ icon: "🤝", title: "Sales Handover", desc: "Leads flagged for sales team follow-up." },
  "lost-leads":    { icon: "🗑️", title: "Lost Leads",     desc: "Leads marked as not interested or lost." },
  "settings":      { icon: "⚙️", title: "Settings",       desc: "Configure your calling preferences." },
};

// Route map
const SECTION_ROUTE = {
  "dashboard":     "/calling/dashboard",
  "my-calls":      "/calling/my-calls",
  "lead-queue":    "/calling/assigned-leads",
  "follow-ups":    "/calling/follow-ups",
  "pipeline":      "/calling/pipeline",
  "history":       "/calling/call-history",
  "performance":   "/calling/performance",
  "team":          "/calling/team",
  "reports":       "/calling/reports",
  "notifications": "/calling/notifications",
  "sales-handover":"/calling/sales-handover",
  "lost-leads":    "/calling/lost-leads",
  "settings":      "/calling/settings",
};

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", initCallingModule);

async function initCallingModule() {
  // Auth guard
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "/login"; return; }

  state.user = JSON.parse(localStorage.getItem("user") || "null");
  if (state.user) {
    const role = normalizeRole(state.user.role || "");
    const allowed = ["CALLING", "ADMIN", "MANAGER", "TELECALLER", "SALES_EXECUTIVE"];
    if (!allowed.includes(role)) {
      window.location.href = "/login";
      return;
    }
  }

  hydrateChrome();
  bindSidebar();
  bindModals();
  bindOutcomeButtons();

  await loadData();
  renderDashboardCharts();
  startCallTimer();
}

// ============================================================
// CHROME HYDRATION
// ============================================================
function hydrateChrome() {
  if (!state.user) return;
  const name = state.user.name || "User";
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  setElText("sidebarUserName", name);
  setElText("topProfileName", name + " ▼");
  setElText("topAvatar", initials);
  setElText("sidebarAvatar", initials);
  setElText("callerAvatar", initials);
}

// ============================================================
// SIDEBAR NAVIGATION
// ============================================================
function bindSidebar() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchSection(btn.dataset.section));
  });

  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    document.querySelector(".calling-app").classList.toggle("sidebar-collapsed");
  });

  document.getElementById("profileBtn")?.addEventListener("click", logout);
}

function switchSection(section) {
  state.activeSection = section;

  // Update nav items
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.section === section);
  });

  // Push history
  const route = SECTION_ROUTE[section] || "/calling/dashboard";
  window.history.replaceState({}, "", route);

  // Show the right panel
  hideAllSections();

  if (section === "dashboard") {
    showPanel("dashboard");

  } else if (section === "lead-queue" || section === "follow-ups" || section === "sales-handover" || section === "lost-leads") {
    showPanel("table-view");
    const titles = {
      "lead-queue":     "Lead Queue",
      "follow-ups":     "Follow-ups",
      "sales-handover": "Sales Handover",
      "lost-leads":     "Lost Leads",
    };
    setElText("viewTitle", titles[section] || "Leads");
    renderSharedTable(section);

  } else if (section === "pipeline") {
    showPanel("pipeline");
    renderKanban();

  } else if (section === "performance") {
    showPanel("performance");
    loadPerformance();

  } else {
    // Generic placeholder
    const meta = SECTION_META[section] || { icon: "📄", title: "Section", desc: "Loading…" };
    setElText("genericTitle", meta.title);
    setElText("genericIcon", meta.icon);
    setElText("genericHeading", meta.title);
    setElText("genericDesc", meta.desc);
    showPanel("generic");
  }
}

function hideAllSections() {
  document.querySelectorAll(".workspace-section").forEach(s => s.classList.remove("active"));
}

function showPanel(panelKey) {
  const el = document.querySelector(`.workspace-section[data-panel="${panelKey}"]`);
  if (el) el.classList.add("active");
}

// ============================================================
// DATA LOADING
// ============================================================
async function loadData() {
  try {
    const [metricsRes, queueRes] = await Promise.all([
      safeApiRequest("/calling/dashboard"),
      safeApiRequest("/calling/queue"),
    ]);

    if (metricsRes?.success && metricsRes.data) {
      state.metrics = metricsRes.data;
    }

    if (queueRes?.success && queueRes.data) {
      state.leads = queueRes.data;
    }
  } catch (err) {
    console.error("loadData error:", err);
  }

  renderKpis();
  renderDashLeads();
}

async function safeApiRequest(url, method = "GET", body = null) {
  try {
    return await apiRequest(url, method, body);
  } catch (err) {
    console.warn("API error:", url, err.message);
    return null;
  }
}

// ============================================================
// KPI RENDERING
// ============================================================
function renderKpis() {
  const f = state.metrics?.funnel || {};
  const assigned  = f.assigned  || state.leads.length;
  const notCalled = f.notCalled || countByStatus(["Not Called", "Assigned"]);
  const connected = f.connected || countByStatus(["Connected"]);
  const followups = f.attempted || countByStatus(["Follow-up", "Attempted"]);
  const converted = f.converted || countByStatus(["Converted"]);
  const total = assigned || 1;
  const rate = Math.round((converted / total) * 100);

  setElText("kpiAssigned", assigned);
  setElText("kpiPending", notCalled);
  setElText("kpiConnected", connected);
  setElText("kpiFollowups", followups);
  setElText("kpiConverted", converted);
  setElText("kpiSuccess", `${rate}%`);

  // Update sidebar badges
  setElText("navBadgeQueue", notCalled);
  setElText("navBadgeFollowup", followups);
}

function countByStatus(statuses) {
  return state.leads.filter(l => statuses.includes(l.assignmentStatus || "Not Called")).length;
}

// ============================================================
// DASHBOARD LEADS TABLE
// ============================================================
function renderDashLeads() {
  const tbody = document.getElementById("dashLeadsBody");
  if (!tbody) return;

  const top5 = state.leads.slice(0, 5);

  if (top5.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">No leads assigned yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = top5.map(lead => {
    const status = lead.assignmentStatus || "Not Called";
    const statusClass = statusToClass(status);
    return `
      <tr onclick="selectLead('${lead._id}')">
        <td>
          <strong>${esc(lead.name)}</strong>
          <br><small style="color:var(--text-muted)">${esc(lead.email || "")}</small>
        </td>
        <td>${esc(lead.company || "—")}</td>
        <td style="white-space:nowrap">${esc(lead.phone || "—")}</td>
        <td><span class="status-badge ${statusClass}">${esc(status)}</span></td>
        <td>
          <button class="btn-primary" style="padding:4px 10px;font-size:11px" onclick="openLogModal(event,'${lead._id}')">
            Call Now
          </button>
        </td>
        <td>
          <div class="action-row">
            <button class="act-btn" title="Call" onclick="openLogModal(event,'${lead._id}')">📞</button>
            <button class="act-btn" title="WhatsApp">💬</button>
            <button class="act-btn" title="Options">⋮</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ============================================================
// SHARED TABLE VIEW
// ============================================================
function renderSharedTable(section) {
  const tbody = document.getElementById("sharedLeadsBody");
  if (!tbody) return;

  let leads = [...state.leads];

  // Filter by section
  if (section === "follow-ups") {
    leads = leads.filter(l => ["Follow-up", "Attempted"].includes(l.assignmentStatus));
  } else if (section === "lost-leads") {
    leads = leads.filter(l => l.assignmentStatus === "Lost");
  } else if (section === "sales-handover") {
    leads = leads.filter(l => ["Sales Handover", "Converted", "Interested"].includes(l.assignmentStatus));
  }

  if (leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:32px">No leads found for this view.</td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map(lead => {
    const status = lead.assignmentStatus || "Not Called";
    const statusClass = statusToClass(status);
    const priority = lead.priority || "Medium";
    const score = Math.floor(Math.random() * 40) + 60;
    const nextAction = status === "Interested" ? "Handover" : status === "Follow-up" ? "Callback" : "Call Now";

    return `
      <tr onclick="selectLead('${lead._id}')">
        <td><input type="checkbox" onclick="event.stopPropagation()" /></td>
        <td>
          <strong>${esc(lead.name)}</strong>
          <br><small style="color:var(--text-muted)">${esc(lead.email || "")}</small>
        </td>
        <td>${esc(lead.company || "—")}</td>
        <td style="white-space:nowrap">${esc(lead.phone || "—")}</td>
        <td><span class="status-badge ${statusClass}">${esc(status)}</span></td>
        <td><span class="priority-badge ${priority.toLowerCase()}">${priority}</span></td>
        <td><strong>${score}</strong></td>
        <td>${nextAction}</td>
        <td>
          <div class="action-row">
            <button class="act-btn" title="Call" onclick="openLogModal(event,'${lead._id}')">📞</button>
            <button class="act-btn" title="WhatsApp">💬</button>
            <button class="act-btn" title="More">⋮</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Wire up search/filter
  document.getElementById("applySharedFilter")?.addEventListener("click", () => {
    const search = document.getElementById("sharedSearch")?.value.toLowerCase() || "";
    const statusF = document.getElementById("sharedStatusFilter")?.value || "";
    const priorF  = document.getElementById("sharedPriorityFilter")?.value || "";
    const filtered = leads.filter(l => {
      const matchSearch = !search ||
        (l.name || "").toLowerCase().includes(search) ||
        (l.phone || "").includes(search) ||
        (l.company || "").toLowerCase().includes(search);
      const matchStatus = !statusF || l.assignmentStatus === statusF;
      const matchPriority = !priorF || l.priority === priorF;
      return matchSearch && matchStatus && matchPriority;
    });
    renderFilteredRows(filtered);
  });
}

function renderFilteredRows(leads) {
  const tbody = document.getElementById("sharedLeadsBody");
  if (!tbody) return;
  if (!leads.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px">No results.</td></tr>`;
    return;
  }
  tbody.innerHTML = leads.map(lead => {
    const status = lead.assignmentStatus || "Not Called";
    const statusClass = statusToClass(status);
    const priority = lead.priority || "Medium";
    return `
      <tr onclick="selectLead('${lead._id}')">
        <td><input type="checkbox" /></td>
        <td><strong>${esc(lead.name)}</strong><br><small style="color:var(--text-muted)">${esc(lead.email||"")}</small></td>
        <td>${esc(lead.company || "—")}</td>
        <td>${esc(lead.phone || "—")}</td>
        <td><span class="status-badge ${statusClass}">${esc(status)}</span></td>
        <td><span class="priority-badge ${priority.toLowerCase()}">${priority}</span></td>
        <td>${Math.floor(Math.random()*40)+60}</td>
        <td>${status === "Interested" ? "Handover" : "Call Now"}</td>
        <td><div class="action-row"><button class="act-btn" onclick="openLogModal(event,'${lead._id}')">📞</button><button class="act-btn">💬</button><button class="act-btn">⋮</button></div></td>
      </tr>
    `;
  }).join("");
}

// ============================================================
// KANBAN
// ============================================================
const KANBAN_STAGES = [
  { key: "not-called",  label: "Not Called",  statuses: ["Not Called", "Assigned"], color: "#ef4444" },
  { key: "attempted",   label: "Attempted",   statuses: ["Attempted"],              color: "#f97316" },
  { key: "connected",   label: "Connected",   statuses: ["Connected"],              color: "#2563eb" },
  { key: "interested",  label: "Interested",  statuses: ["Interested"],             color: "#10b981" },
  { key: "follow-up",   label: "Follow-up",   statuses: ["Follow-up"],              color: "#f59e0b" },
  { key: "converted",   label: "Converted",   statuses: ["Converted"],              color: "#14b8a6" },
  { key: "lost",        label: "Lost",        statuses: ["Lost"],                   color: "#94a3b8" },
];

function renderKanban() {
  const board = document.getElementById("kanbanBoard");
  if (!board) return;

  board.innerHTML = KANBAN_STAGES.map(stage => {
    const cards = state.leads.filter(l => stage.statuses.includes(l.assignmentStatus || "Not Called"));
    return `
      <div class="kanban-col">
        <div class="kanban-col-head">
          <h4 style="color:${stage.color}">${stage.label}</h4>
          <span class="nav-badge" style="position:static;background:${stage.color}20;color:${stage.color}">${cards.length}</span>
        </div>
        <div class="kanban-cards" id="kanban-${stage.key}">
          ${cards.length === 0
            ? `<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:16px">No leads</div>`
            : cards.map(lead => `
                <div class="kanban-card" onclick="selectLead('${lead._id}')">
                  <h5>${esc(lead.name)}</h5>
                  <p>${esc(lead.company || "—")}</p>
                  <p style="margin-top:6px">${esc(lead.phone || "—")}</p>
                </div>
              `).join("")
          }
        </div>
      </div>
    `;
  }).join("");
}

// ============================================================
// PERFORMANCE
// ============================================================
async function loadPerformance() {
  try {
    const res = await safeApiRequest("/calling/dashboard");
    if (!res?.success) return;
    const f = res.data?.funnel || {};
    const total = f.assigned || 1;
    const conn  = (f.connected || 0) + (f.interested || 0) + (f.converted || 0);
    const rate  = Math.round(((f.converted || 0) / total) * 100);
    setElText("perfTotalCalls", total);
    setElText("perfConnected", conn);
    setElText("perfConvRate", `${rate}%`);
    setElText("perfAvgDur", "2:34");

    const recentLogs = res.data?.recentActivity || [];
    const tbody = document.getElementById("perfCallHistBody");
    if (tbody && recentLogs.length > 0) {
      tbody.innerHTML = recentLogs.map(log => `
        <tr>
          <td>${formatDate(log.createdAt)}</td>
          <td>${esc(log.leadId?.name || "—")}</td>
          <td>${esc(log.leadId?.company || "—")}</td>
          <td>${log.durationSeconds ? Math.floor(log.durationSeconds / 60) + ":" + String(log.durationSeconds % 60).padStart(2,"0") : "—"}</td>
          <td><span class="status-badge ${statusToClass(log.status)}">${esc(log.status)}</span></td>
          <td>${esc(log.notes || "—")}</td>
        </tr>
      `).join("");
    }
  } catch (err) {
    console.error("loadPerformance error:", err);
  }
}

// ============================================================
// LEAD SELECTION
// ============================================================
window.selectLead = function(leadId) {
  const lead = state.leads.find(l => l._id === leadId);
  if (!lead) return;
  state.activeLead = lead;

  const initials = lead.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2);
  setElText("callerAvatar", initials);
  setElText("activeCallName", lead.name);
  setElText("activeCallCompany", lead.company || "—");
  setElText("activeCallPhone", "📞 " + (lead.phone || "—"));

  toast(`Lead selected: ${lead.name}`, "success");
};

// ============================================================
// CHARTS
// ============================================================
function renderDashboardCharts() {
  if (typeof Chart === "undefined") return;

  // Status Donut
  const statusCtx = document.getElementById("statusChart")?.getContext("2d");
  if (statusCtx) {
    if (state.charts.status) state.charts.status.destroy();
    state.charts.status = new Chart(statusCtx, {
      type: "doughnut",
      data: {
        labels: ["Not Called", "Attempted", "Connected", "Follow-up", "Lost"],
        datasets: [{ data: [42, 28, 36, 15, 7], backgroundColor: ["#ef4444","#f97316","#2563eb","#f59e0b","#94a3b8"], borderWidth: 2, borderColor: "#fff" }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 } } } }, cutout: "65%" }
    });
  }

  // Trend Line
  const trendCtx = document.getElementById("trendChart")?.getContext("2d");
  if (trendCtx) {
    if (state.charts.trend) state.charts.trend.destroy();
    state.charts.trend = new Chart(trendCtx, {
      type: "line",
      data: {
        labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
        datasets: [{
          label: "Calls",
          data: [45, 62, 58, 80, 72, 40, 55],
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.08)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#2563eb",
          pointRadius: 4,
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "#f1f5f9" }, beginAtZero: true } } }
    });
  }

  // Funnel Bar
  const funnelCtx = document.getElementById("funnelChart")?.getContext("2d");
  if (funnelCtx) {
    if (state.charts.funnel) state.charts.funnel.destroy();
    state.charts.funnel = new Chart(funnelCtx, {
      type: "bar",
      data: {
        labels: ["Assigned","Attempted","Connected","Interested","Converted"],
        datasets: [{ data: [128, 86, 36, 23, 19], backgroundColor: ["#2563eb","#f97316","#3b82f6","#10b981","#14b8a6"], borderRadius: 6, borderSkipped: false }]
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, beginAtZero: true }, y: { grid: { display: false } } } }
    });
  }
}

// ============================================================
// CALL TIMER
// ============================================================
function startCallTimer() {
  state.callSeconds = 154;
  if (state.callTimer) clearInterval(state.callTimer);
  state.callTimer = setInterval(() => {
    state.callSeconds++;
    const min = String(Math.floor(state.callSeconds / 60)).padStart(2, "0");
    const sec = String(state.callSeconds % 60).padStart(2, "0");
    const chipEl = document.getElementById("callStatusChip");
    if (chipEl) chipEl.textContent = `Connected ${min}:${sec}`;
  }, 1000);
}

document.getElementById("endCallBtn")?.addEventListener("click", () => {
  clearInterval(state.callTimer);
  state.callTimer = null;
  const chipEl = document.getElementById("callStatusChip");
  if (chipEl) {
    chipEl.textContent = "Call Ended";
    chipEl.style.background = "var(--danger-light)";
    chipEl.style.color = "var(--danger)";
  }
  if (state.activeLead) openLogModal(null, state.activeLead._id);
});

// ============================================================
// MODAL
// ============================================================
window.openLogModal = function(event, leadId) {
  if (event) event.stopPropagation();
  const lead = state.leads.find(l => l._id === leadId);
  if (!lead) { toast("Select a lead first", "warning"); return; }
  state.activeLead = lead;
  setElValue("logLeadId", leadId);
  setElValue("logStatus", "");
  setElValue("logFollowUp", "");
  setElValue("logRequirement", "");
  setElValue("logNotes", "");
  document.getElementById("followUpField").style.display = "none";
  document.getElementById("logCallModal").classList.remove("hidden");
};

function bindModals() {
  document.getElementById("closeLogCallModal")?.addEventListener("click", () => {
    document.getElementById("logCallModal").classList.add("hidden");
  });

  document.getElementById("logCallModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("logCallModal")) {
      document.getElementById("logCallModal").classList.add("hidden");
    }
  });

  document.getElementById("logStatus")?.addEventListener("change", (e) => {
    const showFollowUp = ["Call Back Later", "Interested", "Not Picked", "Very Interested"].includes(e.target.value);
    document.getElementById("followUpField").style.display = showFollowUp ? "flex" : "none";
  });

  document.getElementById("logCallForm")?.addEventListener("submit", submitCallLog);
}

async function submitCallLog(e) {
  e.preventDefault();
  const leadId     = document.getElementById("logLeadId").value;
  const status     = document.getElementById("logStatus").value;
  const followUp   = document.getElementById("logFollowUp").value;
  const requirement= document.getElementById("logRequirement").value;
  const notes      = document.getElementById("logNotes").value;

  const submitBtn = e.target.querySelector("[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    const res = await safeApiRequest("/calling/log", "POST", {
      leadId,
      status,
      notes,
      customerRequirement: requirement,
      nextFollowUpAt: followUp || null,
      durationSeconds: state.callSeconds || 0,
    });

    if (res?.success) {
      toast("Call logged successfully!", "success");
      document.getElementById("logCallModal").classList.add("hidden");
      e.target.reset();
      await loadData();
    } else {
      toast(res?.message || "Failed to save call log", "error");
    }
  } catch (err) {
    toast("Server error – please try again", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 Save Call Log";
  }
}

// ============================================================
// OUTCOME BUTTONS
// ============================================================
function bindOutcomeButtons() {
  document.querySelectorAll(".outcome-btn[data-outcome]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!state.activeLead) {
        toast("Click on a lead first to select it", "warning");
        return;
      }
      openLogModal(null, state.activeLead._id);
      setTimeout(() => {
        const sel = document.getElementById("logStatus");
        if (sel) {
          sel.value = btn.dataset.outcome;
          sel.dispatchEvent(new Event("change"));
        }
      }, 100);
    });
  });
}

// ============================================================
// TOAST
// ============================================================
function toast(message, type = "info") {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.innerHTML = `<span>${type === "success" ? "✅" : type === "error" ? "❌" : type === "warning" ? "⚠️" : "ℹ️"}</span> ${esc(message)}`;
  stack.appendChild(div);
  setTimeout(() => div.remove(), 3200);
}

// ============================================================
// HELPERS
// ============================================================
function statusToClass(status) {
  const map = {
    "Not Called":     "not-called",
    "Assigned":       "not-called",
    "Attempted":      "attempted",
    "Connected":      "connected",
    "Interested":     "interested",
    "Very Interested":"interested",
    "Follow-up":      "follow-up",
    "Follow-Up Required": "follow-up",
    "Converted":      "converted",
    "Deal Closed":    "converted",
    "Lost":           "lost",
    "Not Interested": "lost",
  };
  return map[status] || "not-called";
}

function esc(value = "") {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setElValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function normalizeRole(role) {
  const v = String(role || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (v === "CALLING_TEAM" || v === "CALLER" || v === "CALLING_EXECUTIVE" || v === "TELECALLER") return "CALLING";
  if (v === "TEAMLEAD") return "TEAM_LEAD";
  if (v === "PRODUCTMANAGER") return "PRODUCT_MANAGER";
  return v;
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}
