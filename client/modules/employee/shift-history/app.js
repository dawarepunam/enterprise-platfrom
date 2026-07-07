/* =====================================================================
   Project Shift History — app.js
   Shows all projects where the employee is/was a team member
   ===================================================================== */
"use strict";

(function () {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  if (!token) {
    window.location.href = "/login";
    return;
  }

  let user = null;
  let allProjects = [];
  let allTasks = [];

  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    user = {};
  }

  async function apiFetch(path, opts = {}) {
    const res = await fetch("/api" + path, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...opts,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || "API error");
    return json;
  }

  function fmtDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getProjectStatus(p) {
    const s = (p.status || "").toLowerCase();
    if (["completed", "done", "archived"].some((x) => s.includes(x)))
      return "completed";
    if (
      ["active", "in progress", "inprogress", "in_progress", "assigned"].some(
        (x) => s.includes(x),
      )
    )
      return "active";
    return "in-progress";
  }

  function getProjectInitials(name) {
    return (name || "P")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function getProjectColor(name) {
    const colors = [
      "#3965FF",
      "#05CD99",
      "#FFB547",
      "#4318FF",
      "#EE5D50",
      "#6366f1",
      "#10b981",
    ];
    let hash = 0;
    for (const c of name || "") hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  function renderProjects(projects) {
    const list = document.getElementById("shiftList");
    if (!projects.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa fa-folder-open"></i></div>
          <div class="empty-title">No Project History Found</div>
          <div class="empty-sub">You haven't been assigned to any projects yet.</div>
        </div>`;
      return;
    }

    // Group tasks by project
    const tasksByProject = {};
    allTasks.forEach((t) => {
      const pid = String(t.projectId || t.project || "");
      if (!tasksByProject[pid]) tasksByProject[pid] = [];
      tasksByProject[pid].push(t);
    });

    list.innerHTML = `<div class="shift-container">${projects
      .map((p) => {
        const status = getProjectStatus(p);
        const color = getProjectColor(p.projectName);
        const initials = getProjectInitials(p.projectName);
        const tasks = tasksByProject[String(p._id)] || [];
        const role =
          user?.name && p.teamLead === user.name
            ? "Team Lead"
            : user?.name && p.manager === user.name
              ? "Manager"
              : "Team Member";
        const joinedAt = p.managerAssignedAt || p.startDate || p.createdAt;
        const statusCls =
          status === "completed"
            ? "completed"
            : status === "active"
              ? "active"
              : "in-progress";
        const statusLbl =
          status === "completed"
            ? "Completed"
            : status === "active"
              ? "Active"
              : "In Progress";

        return `
        <div class="shift-card ${status === "active" ? "active-proj" : status === "completed" ? "completed" : ""}"
             onclick="window.location.href='/employee/project-detail?id=${p._id}'">
          <div class="sc-icon" style="background:${color}18;color:${color};">${initials}</div>
          <div class="sc-body">
            <div class="sc-project">${p.projectName || "—"}</div>
            <div class="sc-role"><i class="fa fa-user-tag" style="margin-right:5px;color:#a3aed1;"></i>${role}${p.department ? ` · ${p.department}` : ""}</div>
            <div class="sc-meta">
              ${p.clientName ? `<span class="sc-chip"><i class="fa fa-building"></i>${p.clientName}</span>` : ""}
              ${joinedAt ? `<span class="sc-chip"><i class="fa fa-calendar-plus"></i>Joined ${fmtDate(joinedAt)}</span>` : ""}
              ${p.deadline ? `<span class="sc-chip"><i class="fa fa-flag"></i>Deadline ${fmtDate(p.deadline)}</span>` : ""}
              ${tasks.length > 0 ? `<span class="sc-chip"><i class="fa fa-tasks"></i>${tasks.length} task${tasks.length !== 1 ? "s" : ""}</span>` : ""}
              ${typeof p.progress === "number" ? `<span class="sc-chip"><i class="fa fa-chart-line"></i>${p.progress}% done</span>` : ""}
            </div>
          </div>
          <div class="sc-right">
            <div class="sc-badge ${statusCls}">${statusLbl}</div><br/>
            ${p.priority ? `<div class="sc-date">Priority: ${p.priority}</div>` : ""}
          </div>
        </div>`;
      })
      .join("")}</div>`;
  }

  function updateSummary(projects) {
    const active = projects.filter(
      (p) => getProjectStatus(p) === "active",
    ).length;
    const completed = projects.filter(
      (p) => getProjectStatus(p) === "completed",
    ).length;
    const taskCount = allTasks.length;
    const sumTotal = document.getElementById("sumTotal");
    const sumActive = document.getElementById("sumActive");
    const sumCompleted = document.getElementById("sumCompleted");
    const sumTasks = document.getElementById("sumTasks");
    if (sumTotal) sumTotal.textContent = projects.length;
    if (sumActive) sumActive.textContent = active;
    if (sumCompleted) sumCompleted.textContent = completed;
    if (sumTasks) sumTasks.textContent = taskCount;
  }

  async function load() {
    try {
      // Load all projects
      const projRes = await apiFetch("/projects/employee");
      allProjects = projRes.data || projRes.projects || projRes || [];

      // Load user's tasks
      try {
        const taskRes = await apiFetch("/tasks?assignedToMe=true&size=200");
        allTasks = taskRes.data || taskRes.tasks || taskRes || [];
      } catch {
        allTasks = [];
      }

      updateSummary(allProjects);
      applyFilter("all");
    } catch (err) {
      document.getElementById("shiftList").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon" style="color:#EE5D50;"><i class="fa fa-exclamation-triangle"></i></div>
          <div class="empty-title">Could not load data</div>
          <div class="empty-sub">${err.message}</div>
        </div>`;
    }
  }

  function applyFilter(status) {
    let filtered = allProjects;
    if (status === "active")
      filtered = allProjects.filter((p) => getProjectStatus(p) === "active");
    if (status === "completed")
      filtered = allProjects.filter((p) => getProjectStatus(p) === "completed");
    renderProjects(filtered);
  }

  window.setQuickFilter = function (status) {
    const el = document.getElementById("statusFilter");
    if (el) el.value = status;
    applyFilter(status);
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (window.authGuard && !window.authGuard()) return;
    const statusFilter = document.getElementById("statusFilter");
    statusFilter?.addEventListener("change", () =>
      applyFilter(statusFilter.value),
    );
    load();
  });
})();
