const state = {
  user: null,
  data: { leads: [], deals: [], premium: { dealCards: [], pipeline: [] } },
  leaderboard: [],
  selectedDealId: "",
  activePanel: "dashboard",
  drawerTab: "overview",
};

document.addEventListener("DOMContentLoaded", initSalesWorkspace);

async function initSalesWorkspace() {
  requireAuth();
  state.user = getCurrentUser();
  if (!state.user || !["SALES", "MANAGER", "ADMIN"].includes(normalizeSalesRole(state.user.role))) {
    window.location.href = "/pages/unauthorized.html";
    return;
  }

  bindUI();
  hydrateProfile();
  await refreshWorkspace();
  setupRealtime();
}

function bindUI() {
  document.getElementById("logoutButton")?.addEventListener("click", logout);
  document.getElementById("refreshButton")?.addEventListener("click", refreshWorkspace);
  document.getElementById("globalSearch")?.addEventListener("input", renderDealList);
  document.getElementById("stageFilter")?.addEventListener("change", renderDealList);
  document.getElementById("newDealButton")?.addEventListener("click", () => toggleDealModal(true));
  document.getElementById("closeDrawer")?.addEventListener("click", () => document.getElementById("dealDrawer").classList.add("hidden"));
  document.getElementById("openSidebar")?.addEventListener("click", () => document.body.classList.add("sidebar-open"));
  document.getElementById("closeSidebar")?.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
  document.getElementById("saveSettingsButton")?.addEventListener("click", saveSettings);
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => toggleDealModal(false)));
  document.getElementById("dealModal")?.addEventListener("click", (event) => {
    if (event.target.id === "dealModal") toggleDealModal(false);
  });
  document.getElementById("dealForm")?.addEventListener("submit", createDeal);

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => switchPanel(button.dataset.panel));
  });
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.drawerTab = button.dataset.tab;
      renderDrawer();
    });
  });
}

async function refreshWorkspace() {
  try {
    const [summaryResult, leaderboardResult] = await Promise.all([
      apiRequest("/sales/summary"),
      apiRequest("/sales/leaderboard"),
    ]);
    state.data = summaryResult.data || state.data;
    state.leaderboard = leaderboardResult.data || [];
    const deals = getDeals();
    state.selectedDealId = state.selectedDealId || deals[0]?._id || "";
    renderAll();
  } catch (error) {
    toast(error.message || "Unable to load sales workspace");
    renderAll();
  }
}

function setupRealtime() {
  if (typeof connectSocket !== "function") return;
  connectSocket();
  ["leadAssigned", "notification", "sales:message", "meetingAlert"].forEach((eventName) => {
    if (typeof onSocket === "function") onSocket(eventName, refreshWorkspace);
  });
}

function hydrateProfile() {
  const user = state.user || {};
  document.getElementById("firstName").textContent = String(user.name || "Sales").split(" ")[0];
  document.getElementById("profileCard").innerHTML = `
    <strong>${escapeHtml(user.name || "Sales User")}</strong>
    <small>${escapeHtml(user.email || "")}</small>
    <small>${escapeHtml(formatRole(user.role))}</small>
  `;
  document.getElementById("dailyTarget").value = localStorage.getItem("salesDailyTarget") || "20";
  document.getElementById("riskDays").value = localStorage.getItem("salesRiskDays") || "10";
}

function renderAll() {
  renderKpis();
  renderDealList();
  renderSelectedDeal();
  renderPipeline();
  renderQueues();
  renderReports();
  renderLeaderboard();
}

function switchPanel(panel) {
  state.activePanel = panel || "dashboard";
  document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.panel === state.activePanel));
  document.querySelectorAll(".panel-page").forEach((page) => page.classList.toggle("active", page.dataset.page === state.activePanel));
  document.body.classList.remove("sidebar-open");
}

function getPremium() {
  return state.data?.premium || { dealCards: [], pipeline: [] };
}

function getDeals() {
  const premiumDeals = getPremium().dealCards || [];
  if (premiumDeals.length) return premiumDeals;
  return state.data?.deals || [];
}

function getSelectedDeal() {
  return getDeals().find((deal) => String(deal._id) === String(state.selectedDealId)) || getDeals()[0] || null;
}

function renderKpis() {
  const cards = state.data?.cards || {};
  const premium = getPremium();
  const kpis = [
    ["Today's Calls", cards.todayCalls || 0, "calls"],
    ["Follow Ups", cards.followUpsDue || 0, "pending"],
    ["Interested", cards.interestedLeads || 0, "pipeline"],
    ["Quotations", cards.quotationsSent || 0, "sent"],
    ["Expected Revenue", formatCurrency(premium.expectedRevenue || 0), "forecast"],
    ["High Risk", premium.highRiskDeals || 0, "risk"],
  ];

  document.getElementById("kpiGrid").innerHTML = kpis
    .map(([label, value, tone]) => `
      <article class="kpi-card ${tone}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </article>
    `)
    .join("");
}

function renderDealList() {
  const query = String(document.getElementById("globalSearch")?.value || "").trim().toLowerCase();
  const stage = document.getElementById("stageFilter")?.value || "";
  const deals = getDeals().filter((deal) => {
    const text = `${deal.company} ${deal.contact} ${deal.phone} ${deal.stage} ${deal.owner}`.toLowerCase();
    return (!query || text.includes(query)) && (!stage || deal.stage === stage);
  });

  const container = document.getElementById("dealList");
  container.innerHTML = deals.length
    ? deals.map((deal) => dealCard(deal)).join("")
    : `<div class="empty-state">No sales deals found. Create a deal or assign leads to Sales.</div>`;

  document.querySelectorAll("[data-select-deal]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDealId = button.dataset.selectDeal;
      renderSelectedDeal();
      renderDealList();
    });
  });
  document.querySelectorAll("[data-open-drawer]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedDealId = button.dataset.openDrawer;
      openDrawer("overview");
    });
  });
}

function dealCard(deal) {
  const selected = String(deal._id) === String(state.selectedDealId);
  const risk = deal.risk || { level: "Low", reasons: [] };
  return `
    <article class="deal-card ${selected ? "selected" : ""}" data-select-deal="${escapeAttr(deal._id)}">
      <div class="deal-card-head">
        <div>
          <strong>${escapeHtml(deal.company || "Untitled Deal")}</strong>
          <small>${escapeHtml(deal.contact || "Contact pending")} | ${escapeHtml(deal.phone || "-")}</small>
        </div>
        <span class="score-ring">${Math.round(deal.relationshipScore || deal.probability || 0)}</span>
      </div>
      <div class="deal-meta">
        <span>${escapeHtml(deal.stage || "New")}</span>
        <span>${formatCurrency(deal.value || deal.expectedValue || 0)}</span>
        <span>${deal.stageAgeDays || 0} days</span>
      </div>
      <div class="deal-tags">
        <span class="status-pill ${risk.level.toLowerCase()}">${escapeHtml(risk.level)} Risk</span>
        <span class="status-pill">${escapeHtml(deal.decisionMakerRole || "Decision maker pending")}</span>
      </div>
      <button class="primary-btn" data-open-drawer="${escapeAttr(deal._id)}" type="button">Open Deal</button>
    </article>
  `;
}

function renderSelectedDeal() {
  const deal = getSelectedDeal();
  const title = document.getElementById("selectedDealTitle");
  const badge = document.getElementById("riskBadge");
  const insight = document.getElementById("dealInsight");
  const sequence = document.getElementById("sequencePanel");

  if (!deal) {
    title.textContent = "No deal selected";
    badge.textContent = "-";
    insight.innerHTML = `<div class="empty-state">Create or select a deal to see revenue intelligence.</div>`;
    sequence.innerHTML = `<div class="empty-state">Follow-up sequence will appear after selecting a deal.</div>`;
    return;
  }

  const risk = deal.risk || { level: "Low", reasons: [] };
  title.textContent = deal.company || "Deal";
  badge.className = `status-pill ${risk.level.toLowerCase()}`;
  badge.textContent = `${risk.level} Risk`;

  insight.innerHTML = `
    <div class="insight-stack">
      <article class="info-tile"><span>Next Best Action</span><strong>${escapeHtml(deal.nextBestAction || "Follow up")}</strong></article>
      <article class="info-tile"><span>Expected Revenue</span><strong>${formatCurrency(deal.expectedRevenue || 0)}</strong></article>
      <article class="info-tile"><span>Win Probability</span><strong>${Number(deal.probability || 0)}%</strong></article>
      <article class="info-tile"><span>Relationship Score</span><strong>${Number(deal.relationshipScore || 0)}%</strong></article>
    </div>
    <div class="risk-box">
      <strong>Risk Reasons</strong>
      ${(risk.reasons || []).length ? risk.reasons.map((item) => `<p>${escapeHtml(item)}</p>`).join("") : "<p>No major risk detected.</p>"}
    </div>
    <div class="action-row">
      <button class="primary-btn" data-action="meeting" type="button">Schedule Meeting</button>
      <button class="ghost-btn" data-action="proposal" type="button">Send Proposal</button>
      <button class="ghost-btn" data-action="won" type="button">Mark Won</button>
      <button class="danger-btn" data-action="lost" type="button">Mark Lost</button>
    </div>
  `;

  sequence.innerHTML = ["Call", "Email", "WhatsApp", "Meeting", "Proposal", "Close"]
    .map((item, index) => `<article class="sequence-step"><span>${index + 1}</span><strong>${item}</strong><small>${sequenceCopy(item, deal)}</small></article>`)
    .join("");

  insight.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => handleDealAction(button.dataset.action)));
}

function sequenceCopy(step, deal) {
  const company = deal.company || "client";
  if (step === "Call") return `Confirm need with ${company}`;
  if (step === "Email") return "Share recap and next step";
  if (step === "WhatsApp") return "Send reminder if no reply";
  if (step === "Meeting") return "Bring product or technical expert";
  if (step === "Proposal") return "Send versioned commercial proposal";
  return "Capture won or lost reason";
}

function renderPipeline() {
  const board = document.getElementById("pipelineBoard");
  const pipeline = getPremium().pipeline || [];
  board.innerHTML = pipeline.length
    ? pipeline.map((column) => `
      <section class="pipeline-column">
        <div class="pipeline-head">
          <strong>${escapeHtml(column.stage)}</strong>
          <small>${column.count} deals | ${formatCurrency(column.value || 0)}</small>
        </div>
        ${(column.deals || []).map((deal) => `
          <button class="pipeline-deal ${Number(deal.stageAgeDays || 0) >= 10 ? "aged" : ""}" data-pipeline-deal="${escapeAttr(deal._id)}" type="button">
            <strong>${escapeHtml(deal.company || "Deal")}</strong>
            <small>${formatCurrency(deal.value || deal.expectedValue || 0)} | ${deal.stageAgeDays || 0} days</small>
          </button>
        `).join("") || '<div class="empty-state compact">No deals</div>'}
      </section>
    `).join("")
    : `<div class="empty-state">Pipeline will appear after sales deals are created.</div>`;

  document.querySelectorAll("[data-pipeline-deal]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDealId = button.dataset.pipelineDeal;
      openDrawer("overview");
    });
  });
}

function renderQueues() {
  const premium = getPremium();
  renderCompactList("rescueQueue", premium.rescueQueue || [], "Rescue", "No rescue leads right now.");
  renderCompactList("reassignmentQueue", premium.reassignmentQueue || [], "Manager Review", "No inactive deal warnings.");
  renderCompactList("approvalQueue", premium.approvalQueue || [], "Review Discount", "No approvals pending.");
}

function renderCompactList(id, items, action, empty) {
  document.getElementById(id).innerHTML = items.length
    ? items.map((deal) => `
      <article class="compact-row">
        <div>
          <strong>${escapeHtml(deal.company || "Deal")}</strong>
          <small>${escapeHtml(deal.stage || "New")} | ${formatCurrency(deal.value || deal.expectedValue || 0)} | ${deal.stageAgeDays || 0} days</small>
        </div>
        <button class="ghost-btn" data-queue-deal="${escapeAttr(deal._id)}" type="button">${escapeHtml(action)}</button>
      </article>
    `).join("")
    : `<div class="empty-state">${escapeHtml(empty)}</div>`;

  document.querySelectorAll("[data-queue-deal]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDealId = button.dataset.queueDeal;
      openDrawer("overview");
    });
  });
}

function renderReports() {
  const premium = getPremium();
  document.getElementById("expectedRevenue").textContent = formatCurrency(premium.expectedRevenue || 0);
  document.getElementById("activePipeline").textContent = formatCurrency(premium.activePipelineValue || 0);
  document.getElementById("relationshipAverage").textContent = `${premium.averageRelationshipScore || 0}%`;
  document.getElementById("highRiskDeals").textContent = premium.highRiskDeals || 0;
  const reasons = Object.entries(premium.lostReasons || {});
  document.getElementById("lostReasons").innerHTML = reasons.length
    ? reasons.map(([reason, count]) => `<article class="compact-row"><strong>${escapeHtml(reason)}</strong><span>${count}</span></article>`).join("")
    : `<div class="empty-state">Lost reason data will appear when a deal is marked lost.</div>`;
}

function renderLeaderboard() {
  document.getElementById("leaderboard").innerHTML = state.leaderboard.length
    ? state.leaderboard.slice(0, 6).map((item, index) => `
      <article class="leader-row">
        <span>${index + 1}</span>
        <div><strong>${escapeHtml(item.name || "Sales User")}</strong><small>${item.dealsClosed || 0} closures | ${item.callsMade || 0} calls</small></div>
        <strong>${formatCurrency(item.revenue || 0)}</strong>
      </article>
    `).join("")
    : `<div class="empty-state">Leaderboard will appear after sales activity starts.</div>`;
}

function openDrawer(tab = "overview") {
  state.drawerTab = tab;
  document.getElementById("dealDrawer").classList.remove("hidden");
  renderDrawer();
}

function renderDrawer() {
  const deal = getSelectedDeal();
  document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.drawerTab));
  if (!deal) return;
  document.getElementById("drawerTitle").textContent = deal.company || "Deal";
  const body = document.getElementById("drawerBody");

  if (state.drawerTab === "contacts") {
    body.innerHTML = `
      <div class="drawer-grid">
        ${(deal.contacts || []).map((contact) => `
          <article class="info-tile"><span>${escapeHtml(contact.role || "Contact")}</span><strong>${escapeHtml(contact.name || "-")}</strong><small>${escapeHtml(contact.email || contact.phone || "")}</small></article>
        `).join("")}
      </div>
      <h3>Stakeholder Map</h3>
      <div class="stakeholder-map">${(deal.stakeholders || []).map((item) => `<div><strong>${escapeHtml(item.role || "-")}</strong><span>${escapeHtml(item.name || "-")}</span><small>${escapeHtml(item.reportsTo ? `Reports to ${item.reportsTo}` : "Top level")}</small></div>`).join("")}</div>
    `;
    return;
  }

  if (state.drawerTab === "proposal") {
    body.innerHTML = `
      <div class="compact-list">
        ${(deal.proposalVersions || []).length ? deal.proposalVersions.map((item) => `
          <article class="compact-row"><div><strong>Proposal ${escapeHtml(item.version || "V1")}</strong><small>${escapeHtml(item.status || "Draft")} | ${formatCurrency(item.amount || 0)}</small></div></article>
        `).join("") : '<div class="empty-state">No proposal versions yet.</div>'}
      </div>
    `;
    return;
  }

  if (state.drawerTab === "discussion") {
    body.innerHTML = `
      <div class="war-room">
        <article><strong>Sales</strong><span>Own negotiation, proposal, revenue closure.</span></article>
        <article><strong>Calling</strong><span>Qualification notes and follow-up history.</span></article>
        <article><strong>Product</strong><span>Requirement validation and estimates.</span></article>
        <article><strong>Project</strong><span>Won deal handoff and delivery planning.</span></article>
      </div>
      <label><span>War room note</span><textarea id="warRoomNote" rows="4" placeholder="Add internal discussion note..."></textarea></label>
      <button class="primary-btn" id="sendWarRoomNote" type="button">Send Note</button>
    `;
    document.getElementById("sendWarRoomNote")?.addEventListener("click", sendWarRoomNote);
    return;
  }

  body.innerHTML = `
    <div class="drawer-grid">
      <article class="info-tile"><span>Deal Value</span><strong>${formatCurrency(deal.value || deal.expectedValue || 0)}</strong></article>
      <article class="info-tile"><span>Stage Aging</span><strong>${deal.stageAgeDays || 0} Days</strong></article>
      <article class="info-tile"><span>Decision Maker</span><strong>${escapeHtml(deal.decisionMakerRole || "Pending")}</strong></article>
      <article class="info-tile"><span>Approval</span><strong>${escapeHtml(deal.approvalStatus || "Not Required")}</strong></article>
    </div>
    <article class="risk-box"><strong>Notes</strong><p>${escapeHtml(deal.notes || "No notes added yet.")}</p></article>
  `;
}

async function handleDealAction(action) {
  const deal = getSelectedDeal();
  if (!deal) return;
  try {
    if (action === "won") {
      await apiRequest(`/sales/deals/${deal._id}/close`, "POST", {
        converted: true,
        dealAmount: deal.value || deal.expectedValue || 0,
        finalAgreedPrice: deal.value || deal.expectedValue || 0,
      });
      toast("Deal marked won");
      await refreshWorkspace();
      return;
    }
    if (action === "lost") {
      const reason = window.prompt("Lost reason: Price, Competitor, No Budget, No Requirement, Internal Delay", "Reason Pending");
      if (reason === null) return;
      await apiRequest(`/sales/deals/${deal._id}/close`, "POST", { converted: false, lostReason: reason });
      toast("Lost reason captured");
      await refreshWorkspace();
      return;
    }
    if (action === "meeting") {
      await apiRequest("/sales/meetings", "POST", {
        title: `${deal.company || "Client"} sales meeting`,
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        notes: deal.nextBestAction || "",
      });
      toast("Meeting scheduled");
      await refreshWorkspace();
      return;
    }
    toast("Proposal action ready from quotation workflow");
  } catch (error) {
    toast(error.message || "Action failed");
  }
}

async function createDeal(event) {
  event.preventDefault();
  try {
    const result = await apiRequest("/sales", "POST", {
      company: document.getElementById("dealCompany").value.trim(),
      contact: document.getElementById("dealContact").value.trim(),
      phone: document.getElementById("dealPhone").value.trim(),
      expectedValue: Number(document.getElementById("dealValue").value || 0),
      stage: document.getElementById("dealStage").value,
      notes: document.getElementById("dealNotes").value.trim(),
      probability: 40,
    });
    state.selectedDealId = result.data?._id || "";
    toggleDealModal(false);
    document.getElementById("dealForm").reset();
    toast("Deal created");
    await refreshWorkspace();
  } catch (error) {
    toast(error.message || "Unable to create deal");
  }
}

async function sendWarRoomNote() {
  const deal = getSelectedDeal();
  const text = document.getElementById("warRoomNote")?.value.trim();
  if (!deal || !text) return toast("Add a note first");
  try {
    await apiRequest("/sales/messages", "POST", {
      roomId: `sales-deal-${deal._id}`,
      text,
      recipientRefs: [{ role: "MANAGER" }, { role: "PRODUCT_MANAGER" }, { role: "CALLING" }],
    });
    document.getElementById("warRoomNote").value = "";
    toast("War room note sent");
  } catch (error) {
    toast(error.message || "Unable to send note");
  }
}

function toggleDealModal(open) {
  document.getElementById("dealModal").classList.toggle("hidden", !open);
}

function saveSettings() {
  localStorage.setItem("salesDailyTarget", document.getElementById("dailyTarget").value || "20");
  localStorage.setItem("salesRiskDays", document.getElementById("riskDays").value || "10");
  toast("Settings saved");
}

function normalizeSalesRole(role) {
  return String(role || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function formatRole(role) {
  const value = normalizeSalesRole(role);
  if (value === "SALES") return "Sales Executive";
  if (value === "MANAGER") return "Manager";
  return value || "User";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.getElementById("toastStack").appendChild(node);
  setTimeout(() => node.remove(), 3200);
}
