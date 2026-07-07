/* ==========================================
   ADMIN LEADS MODULE SCRIPT
========================================== */

const API_BASE_URL = window.API_BASE_URL || "http://localhost:5000/api";

const leadsTableBody = document.getElementById("leadsTableBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const refreshBtn = document.getElementById("refreshBtn");

const totalLeadsEl = document.getElementById("totalLeads");
const newLeadsEl = document.getElementById("newLeads");
const convertedLeadsEl = document.getElementById("convertedLeads");
const lostLeadsEl = document.getElementById("lostLeads");

let allLeads = [];

document.addEventListener("DOMContentLoaded", () => {
  if (typeof protectRoute === "function") {
    protectRoute(["ADMIN"]);
  }

  loadLeads();

  searchInput.addEventListener("input", renderLeads);
  statusFilter.addEventListener("change", renderLeads);
  refreshBtn.addEventListener("click", loadLeads);
});

/* ==========================================
   LOAD LEADS
========================================== */
async function loadLeads() {
  try {
    leadsTableBody.innerHTML = `<tr><td colspan="8" class="text-center">Loading leads...</td></tr>`;

    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/leads`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch leads");
    }

    const data = await response.json();
    allLeads = Array.isArray(data) ? data : data.leads || [];

    renderLeads();
    updateSummary();
  } catch (error) {
    console.error("Error loading leads:", error);

    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center">
          Failed to load leads.
        </td>
      </tr>
    `;
  }
}

/* ==========================================
   FILTER LEADS
========================================== */
function getFilteredLeads() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedStatus = statusFilter.value;

  return allLeads.filter((lead) => {
    const name = (lead.name || "").toLowerCase();
    const company = (lead.company || "").toLowerCase();
    const email = (lead.email || "").toLowerCase();
    const status = lead.status || "";

    const matchesSearch =
      name.includes(searchTerm) ||
      company.includes(searchTerm) ||
      email.includes(searchTerm);

    const matchesStatus = !selectedStatus || status === selectedStatus;

    return matchesSearch && matchesStatus;
  });
}

/* ==========================================
   RENDER TABLE
========================================== */
function renderLeads() {
  const leads = getFilteredLeads();

  if (leads.length === 0) {
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center">
          No leads found.
        </td>
      </tr>
    `;
    return;
  }

  leadsTableBody.innerHTML = leads
    .map(
      (lead) => `
    <tr>
      <td>${escapeHtml(lead.name || "N/A")}</td>
      <td>${escapeHtml(lead.company || "-")}</td>
      <td>${escapeHtml(lead.email || "-")}</td>
      <td>${escapeHtml(lead.phone || "-")}</td>
      <td>${escapeHtml(lead.source || "Manual")}</td>
      <td>
        <span class="status-badge ${getStatusClass(lead.status)}">
          ${escapeHtml(lead.status || "New")}
        </span>
      </td>
      <td>₹${Number(lead.expectedValue || 0).toLocaleString("en-IN")}</td>
      <td>
        <button class="btn-edit"
          onclick="editLead('${lead._id}')">
          Edit
        </button>
        <button class="btn-delete"
          onclick="deleteLead('${lead._id}')">
          Delete
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

/* ==========================================
   SUMMARY
========================================== */
function updateSummary() {
  totalLeadsEl.textContent = allLeads.length;

  newLeadsEl.textContent = allLeads.filter(
    (lead) => (lead.status || "New") === "New",
  ).length;

  convertedLeadsEl.textContent = allLeads.filter(
    (lead) => lead.status === "Converted",
  ).length;

  lostLeadsEl.textContent = allLeads.filter(
    (lead) => lead.status === "Lost",
  ).length;
}

/* ==========================================
   ACTIONS
========================================== */
function editLead(leadId) {
  window.location.href = `edit-lead.html?id=${leadId}`;
}

async function deleteLead(leadId) {
  if (!confirm("Are you sure you want to delete this lead?")) {
    return;
  }

  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Delete failed");
    }

    alert("Lead deleted successfully.");
    loadLeads();
  } catch (error) {
    console.error("Delete error:", error);
    alert("Unable to delete lead.");
  }
}

/* ==========================================
   HELPERS
========================================== */
function getStatusClass(status = "") {
  switch (status.toLowerCase()) {
    case "new":
      return "status-new";

    case "contacted":
    case "interested":
    case "follow-up":
    case "negotiation":
      return "status-progress";

    case "converted":
      return "status-converted";

    case "lost":
      return "status-lost";

    default:
      return "status-new";
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
