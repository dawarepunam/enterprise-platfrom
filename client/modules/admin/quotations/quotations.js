// quotations.js

const API_BASE_URL = "http://localhost:5000/api/quotations";

let quotations = [];
let editingQuotationId = null;

// DOM Elements
const quotationsTableBody = document.getElementById("quotationsTableBody");
const quotationModal = document.getElementById("quotationModal");
const quotationForm = document.getElementById("quotationForm");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    loadQuotations();
    attachEventListeners();
});

// Event Listeners
function attachEventListeners() {
    document
        .getElementById("addQuotationBtn") ?
        .addEventListener("click", openCreateModal);

    document
        .getElementById("quotationSearch") ?
        .addEventListener("input", filterQuotations);

    document
        .getElementById("statusFilter") ?
        .addEventListener("change", filterQuotations);

    quotationForm ? .addEventListener("submit", saveQuotation);
}

// Load Quotations
async function loadQuotations() {
    try {
        const res = await fetch(API_BASE_URL, {
            headers: getAuthHeaders()
        });

        if (!res.ok) throw new Error("Failed to load quotations");

        quotations = await res.json();
        renderQuotations(quotations);
        updateSummaryCards();
    } catch (error) {
        console.error(error);
        showToast("Unable to load quotations", "error");
        renderQuotations([]);
    }
}

// Render Quotations
function renderQuotations(data) {
    if (!quotationsTableBody) return;

    if (!data.length) {
        quotationsTableBody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">No quotations found.</div>
        </td>
      </tr>
    `;
        return;
    }

    quotationsTableBody.innerHTML = data
        .map(
            (quotation) => `
      <tr>
        <td>${quotation.quotationNumber || "-"}</td>
        <td>${quotation.clientName || "-"}</td>
        <td>${quotation.projectName || "-"}</td>
        <td>₹${formatCurrency(quotation.amount || 0)}</td>
        <td>${formatDate(quotation.validUntil)}</td>
        <td>${getStatusBadge(quotation.status)}</td>
        <td>${quotation.createdBy?.name || "Admin"}</td>
        <td>${formatDate(quotation.createdAt)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-primary" onclick="editQuotation('${quotation._id}')">
              Edit
            </button>
            <button class="btn btn-success" onclick="approveQuotation('${quotation._id}')">
              Approve
            </button>
            <button class="btn btn-danger" onclick="deleteQuotation('${quotation._id}')">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `
        )
        .join("");
}

// Summary Cards
function updateSummaryCards() {
    setText("totalQuotations", quotations.length);
    setText(
        "approvedQuotations",
        quotations.filter((q) => q.status === "Approved").length
    );
    setText(
        "pendingQuotations",
        quotations.filter((q) => ["Draft", "Sent", "Viewed"].includes(q.status)).length
    );
    setText(
        "totalQuotationValue",
        "₹" +
        formatCurrency(
            quotations.reduce((sum, q) => sum + (q.amount || 0), 0)
        )
    );
}

// Filter
function filterQuotations() {
    const search = document
        .getElementById("quotationSearch")
        .value.toLowerCase();

    const status = document.getElementById("statusFilter").value;

    const filtered = quotations.filter((quotation) => {
        const matchesSearch =
            (quotation.clientName || "").toLowerCase().includes(search) ||
            (quotation.projectName || "").toLowerCase().includes(search) ||
            (quotation.quotationNumber || "").toLowerCase().includes(search);

        const matchesStatus = !status || quotation.status === status;

        return matchesSearch && matchesStatus;
    });

    renderQuotations(filtered);
}

// Modal Functions
function openCreateModal() {
    editingQuotationId = null;
    quotationForm.reset();
    document.getElementById("modalTitle").textContent = "Create Quotation";
    quotationModal.classList.add("active");
}

function closeQuotationModal() {
    quotationModal.classList.remove("active");
}

// Save
async function saveQuotation(e) {
    e.preventDefault();

    const formData = {
        quotationNumber: document.getElementById("quotationNumber").value,
        clientName: document.getElementById("clientName").value,
        projectName: document.getElementById("projectName").value,
        amount: parseFloat(document.getElementById("amount").value),
        validUntil: document.getElementById("validUntil").value,
        status: document.getElementById("status").value,
        notes: document.getElementById("notes").value
    };

    try {
        const method = editingQuotationId ? "PUT" : "POST";
        const url = editingQuotationId ?
            `${API_BASE_URL}/${editingQuotationId}` :
            API_BASE_URL;

        const res = await fetch(url, {
            method,
            headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        if (!res.ok) throw new Error("Save failed");

        showToast(
            editingQuotationId ?
            "Quotation updated successfully" :
            "Quotation created successfully",
            "success"
        );

        closeQuotationModal();
        loadQuotations();
    } catch (error) {
        console.error(error);
        showToast("Failed to save quotation", "error");
    }
}

// Edit
async function editQuotation(id) {
    const quotation = quotations.find((q) => q._id === id);
    if (!quotation) return;

    editingQuotationId = id;

    document.getElementById("modalTitle").textContent = "Edit Quotation";
    document.getElementById("quotationNumber").value =
        quotation.quotationNumber || "";
    document.getElementById("clientName").value =
        quotation.clientName || "";
    document.getElementById("projectName").value =
        quotation.projectName || "";
    document.getElementById("amount").value =
        quotation.amount || "";
    document.getElementById("validUntil").value =
        quotation.validUntil ?
        quotation.validUntil.split("T")[0] :
        "";
    document.getElementById("status").value =
        quotation.status || "Draft";
    document.getElementById("notes").value =
        quotation.notes || "";

    quotationModal.classList.add("active");
}

// Approve
async function approveQuotation(id) {
    if (!confirm("Approve this quotation?")) return;

    try {
        const res = await fetch(`${API_BASE_URL}/${id}/approve`, {
            method: "PATCH",
            headers: getAuthHeaders()
        });

        if (!res.ok) throw new Error("Approval failed");

        showToast("Quotation approved successfully", "success");
        loadQuotations();
    } catch (error) {
        console.error(error);
        showToast("Failed to approve quotation", "error");
    }
}

// Delete
async function deleteQuotation(id) {
    if (!confirm("Delete this quotation?")) return;

    try {
        const res = await fetch(`${API_BASE_URL}/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!res.ok) throw new Error("Delete failed");

        showToast("Quotation deleted successfully", "success");
        loadQuotations();
    } catch (error) {
        console.error(error);
        showToast("Failed to delete quotation", "error");
    }
}

// Helpers
function getStatusBadge(status = "Draft") {
    const cls = status.toLowerCase().replace(/\s+/g, "-");
    return `<span class="badge ${cls}">${status}</span>`;
}

function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
}

function formatCurrency(value) {
    return Number(value).toLocaleString("en-IN");
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function showToast(message, type = "info") {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// Close modal when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === quotationModal) {
        closeQuotationModal();
    }
});