(function () {
  const BASE = window.location.origin;

  function tok() {
    return localStorage.getItem("token") || localStorage.getItem("jmkc_token");
  }

  function api(p, o = {}) {
    return fetch(BASE + "/api" + p, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok()}`,
      },
      ...o,
    }).then((r) => (r.ok ? r.json() : Promise.reject()));
  }
  let draggedId = null,
    allTasks = [];
  const colMap = {
    pending: "colTodo",
    "in-progress": "colProg",
    review: "colRev",
    done: "colDone",
  };
  const countMap = {
    pending: "colTodoCount",
    "in-progress": "colProgCount",
    review: "colRevCount",
    done: "colDoneCount",
  };
  const pBadge = {
    critical: "danger",
    high: "danger",
    medium: "warning",
    low: "success",
  };
  const typeIcon = {
    bug: "🐛",
    feature: "✨",
    task: "📋",
    story: "📖",
    epic: "⚡",
  };

  function normalizeStatus(s) {
    return (s || "").toLowerCase().replace(/\s+/g, "-");
  }

  function renderCard(t) {
    const p = normalizeStatus(t.priority || "normal");
    const type = (t.type || "task").toLowerCase();
    const pts = t.storyPoints || t.points || "";
    return `<div class="sprint-card" draggable="true"
      id="sc_${t._id}" data-id="${t._id}" data-status="${normalizeStatus(t.status)}"
      ondragstart="dragStart(event,'${t._id}')"
      ondragend="dragEnd(event)"
      onclick="window.location='/employee/task-detail?id=${t._id}'">
      <div style="display:flex;align-items:flex-start;gap:0.4rem;margin-bottom:0.5rem">
        <span class="sprint-card-type">${typeIcon[type] || "📋"}</span>
        <div class="sprint-card-title">${t.title || t.name || "Task"}</div>
      </div>
      <div class="sprint-card-meta">
        <span class="badge badge-${pBadge[p] || "muted"}" style="font-size:0.65rem">${t.priority || "Normal"}</span>
        ${pts ? `<span class="sprint-card-pts">${pts}pt</span>` : ""}
        <div class="avatar" style="width:20px;height:20px;font-size:0.6rem;flex-shrink:0">${(t.assignedTo?.name || "?")[0]}</div>
      </div>
    </div>`;
  }

  function renderBoard(tasks) {
    allTasks = tasks;
    const groups = { pending: [], inProgress: [], review: [], done: [] };
    const statusMap = {
      pending: "pending",
      todo: "pending",
      "in-progress": "inProgress",
      review: "review",
      done: "done",
    };
    tasks.forEach((t) => {
      const k = statusMap[normalizeStatus(t.status)] || "pending";
      (groups[k] = groups[k] || []).push(t);
    });
    const colBodyMap = {
      pending: "colTodo",
      inProgress: "colProg",
      review: "colRev",
      done: "colDone",
    };
    const colCountMap = {
      pending: "colTodoCount",
      inProgress: "colProgCount",
      review: "colRevCount",
      done: "colDoneCount",
    };
    Object.entries(groups).forEach(([k, ts]) => {
      const el = document.getElementById(colBodyMap[k]);
      const ct = document.getElementById(colCountMap[k]);
      if (ct) ct.textContent = ts.length;
      if (el)
        el.innerHTML = ts.length
          ? ts.map(renderCard).join("")
          : `<div style="text-align:center;padding:1.5rem;color:var(--clr-text-muted);font-size:0.8rem">Drop tasks here</div>`;
    });
    // Sprint stats
    const done = tasks.filter((t) => normalizeStatus(t.status) === "done");
    const pts = done.reduce((s, t) => s + (t.storyPoints || t.points || 0), 0);
    document.getElementById("sTodo").textContent = groups.pending.length;
    document.getElementById("sInProg").textContent = groups.inProgress.length;
    document.getElementById("sReview").textContent = groups.review.length;
    document.getElementById("sDone").textContent = done.length;
    document.getElementById("sTotal").textContent = tasks.length;
    document.getElementById("sVelocity").textContent = pts;
    const pct = tasks.length
      ? Math.round((done.length / tasks.length) * 100)
      : 0;
    document.getElementById("sprintProgressBar").style.width = pct + "%";
  }

  window.dragStart = function (e, id) {
    draggedId = id;
    e.target.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  };
  window.dragEnd = function (e) {
    e.target.classList.remove("dragging");
    document
      .querySelectorAll(".sprint-col-body")
      .forEach((c) => c.classList.remove("drag-over"));
  };
  window.drop = async function (e, status) {
    e.preventDefault();
    document
      .querySelectorAll(".sprint-col-body")
      .forEach((c) => c.classList.remove("drag-over"));
    if (!draggedId) return;
    const card = document.getElementById(`sc_${draggedId}`);
    const oldStatus = card?.dataset.status;
    if (oldStatus === status) return;
    // Optimistic update
    const task = allTasks.find((t) => t._id === draggedId);
    if (task) {
      task.status = status;
      renderBoard(allTasks);
    }
    try {
      await api(`/tasks/${draggedId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      if (task) {
        task.status = oldStatus;
        renderBoard(allTasks);
      }
    }
    draggedId = null;
  };

  // Drag-over highlight
  document.querySelectorAll(".sprint-col-body").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
  });

  async function loadProjects() {
    try {
      const res = await api("/projects/employee");
      const projs = res.data || res || [];
      const sel = document.getElementById("projectSelect");
      projs.forEach((p) => {
        const o = document.createElement("option");
        o.value = p._id;
        o.textContent = p.name || p.title;
        sel.appendChild(o);
      });
      sel.addEventListener("change", () => loadSprint(sel.value));
      if (projs.length) loadSprint(projs[0]._id);
    } catch {
      loadSprint();
    }
  }

  async function loadSprint(projectId) {
    try {
      const q = projectId ? `?project=${projectId}` : "";
      const res = await api(`/sprints/active${q}`);
      const sprint = res.data || res || {};
      document.getElementById("sprintName").textContent =
        sprint.name || "Active Sprint";
      document.getElementById("sprintMeta").textContent =
        `${sprint.startDate ? new Date(sprint.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"} → ${sprint.endDate ? new Date(sprint.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}`;
      if (sprint.endDate) {
        const days = Math.ceil(
          (new Date(sprint.endDate) - new Date()) / 86400000,
        );
        document.getElementById("sprintDaysLeft").textContent =
          `${days > 0 ? days : 0} days left`;
        document.getElementById("sprintDaysLeft").className =
          `badge badge-${days <= 3 ? "danger" : days <= 7 ? "warning" : "success"}`;
        document.getElementById("sprintDeadline").textContent =
          `Due: ${new Date(sprint.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
      }
      renderBoard(sprint.tasks || []);
    } catch {
      // Fallback: load my tasks
      try {
        const res = await api(
          `/tasks?assignedToMe=true&limit=50${projectId ? `&project=${projectId}` : ""}`,
        );
        renderBoard(res.data || res || []);
      } catch {
        renderBoard([]);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", loadProjects);
})();
