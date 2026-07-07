const approvalsState = {
  subtasks: [],
  allSubtasks: [],
  currentUser: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "TEAM_LEAD",
  });
  if (!ready) return;

  approvalsState.currentUser = getCurrentUser?.() || {};
  await loadApprovalData();
});

async function loadApprovalData() {
  const fallback = filterReviewItems(window.enterpriseStore?.getSubtasks?.() || []);

  try {
    const [pendingResponse, subtasksResponse] = await Promise.all([
      apiRequest("/subtasks/reviews/pending").catch(() => ({ data: [] })),
      apiRequest("/subtasks").catch(() => ({ data: [] })),
    ]);

    approvalsState.subtasks = Array.isArray(pendingResponse.data) && pendingResponse.data.length ? pendingResponse.data : fallback.filter((item) => item.status === "In Review");
    approvalsState.allSubtasks = Array.isArray(subtasksResponse.data) && subtasksResponse.data.length ? filterReviewItems(subtasksResponse.data) : fallback;
  } catch (error) {
    approvalsState.subtasks = fallback.filter((item) => item.status === "In Review");
    approvalsState.allSubtasks = fallback;
  }

  renderLeadApprovals();
}

function filterReviewItems(items) {
  const currentUser = approvalsState.currentUser || {};
  return (items || []).filter((item) => String(item.reviewer || item.lead || "") === String(currentUser.name || ""));
}

function renderLeadApprovals() {
  const reviewItems = approvalsState.subtasks.length ? approvalsState.subtasks : approvalsState.allSubtasks.filter((item) => item.status === "In Review");
  const rejectedCount = approvalsState.allSubtasks.filter((item) => item.status === "Rejected").length;
  const approvedCount = approvalsState.allSubtasks.filter((item) => item.status === "Approved").length;

  setText("pendingReviews", reviewItems.length);
  setText("approvedToday", approvedCount);
  setText("rejectedCount", rejectedCount);

  document.getElementById("leadApprovalBoard").innerHTML = reviewItems.length
    ? reviewItems
        .map(
          (item) => `
            <article class="list-card review-card">
              <div class="card-topline">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <span class="list-meta">${escapeHtml(item.assignee || "Member")} • ${escapeHtml(item.status || "In Review")}</span>
                </div>
                <span class="priority-pill ${priorityClass(item.priority || "Medium")}">${escapeHtml(item.priority || "Medium")}</span>
              </div>
              <p class="status-note">${escapeHtml(item.instructions || item.description || "No submission instructions captured.")}</p>
              <div class="review-details">
                <span>Deadline ${formatShortDate(item.deadline)}</span>
                <span>Estimated ${Number(item.estimatedHours || 0)} hours</span>
                <span>Spent ${Number(item.timeSpentHours || 0)} hours</span>
              </div>
              <input id="comment-${item._id}" type="text" placeholder="Enter approval note or rejection reason" value="${escapeHtml(item.submittedNote || item.feedback || "")}" />
              <div class="review-actions">
                <button class="btn tiny-btn" type="button" onclick="openReviewChat('${escapeJs(item.roomId || "")}')">Open Chat</button>
                <button class="btn btn-primary" type="button" onclick="setLeadTaskStatus('${item._id}', 'Approved')">Approve</button>
                <button class="btn ghost-btn" type="button" onclick="setLeadTaskStatus('${item._id}', 'Rejected')">Request Changes</button>
              </div>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No submitted work is waiting for review right now.</p>';
}

async function setLeadTaskStatus(id, status) {
  const feedback = document.getElementById(`comment-${id}`)?.value?.trim() || "";
  const endpoint = status === "Approved" ? `/subtasks/${id}/approve` : `/subtasks/${id}/reject`;

  try {
    const response = await apiRequest(endpoint, {
      method: "PUT",
      body: {
        feedback,
        submittedNote: feedback,
      },
    });

    const saved = response.data;
    window.enterpriseStore?.upsertSubtask?.(saved);
    showToast?.(
      status === "Approved"
        ? "Submission approved. Member popup, manager notification and email workflow triggered."
        : "Changes requested. Member popup and correction email workflow triggered.",
      "success",
      { title: status === "Approved" ? "Approved" : "Rework Requested" },
    );
    await loadApprovalData();
  } catch (error) {
    const localItems = window.enterpriseStore?.getSubtasks?.() || [];
    const subtask = localItems.find((item) => String(item._id) === String(id));
    if (!subtask) return;

    window.enterpriseStore?.upsertSubtask?.({
      ...subtask,
      status,
      feedback,
      submittedNote: feedback,
    });
    showToast?.(error.message || "Backend unavailable, local review state updated only.", "warning", { title: "Local Review" });
    await loadApprovalData();
  }
}

function openReviewChat(roomId) {
  if (!roomId) {
    showToast?.("Chat room is not linked to this submission yet.", "warning", { title: "Chat Missing" });
    return;
  }

  window.location.href = `../../collaboration/chat/chat.html?roomId=${encodeURIComponent(roomId)}&welcome=review`;
}

function escapeJs(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

window.setLeadTaskStatus = setLeadTaskStatus;
window.openReviewChat = openReviewChat;
