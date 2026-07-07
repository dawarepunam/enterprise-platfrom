(function initHrShell() {
  const defaultAvatar = "/assets/images/default-avatar.png";
  const searchRoutes = {
    dashboard: "/hr/dashboard.html",
    employees: "/hr/employees.html",
    attendance: "/hr/attendance.html",
    leaves: "/hr/leaves.html",
    recruitment: "/hr/interviews.html",
    projects: "/hr/reports.html#project-insights",
    teams: "/hr/reports.html#team-insights",
    files: "/hr/employees.html#employeeDocumentsSection",
    payroll: "/hr/payroll.html",
    reports: "/hr/reports.html",
    meetings: "/hr/interviews.html#meeting-desk",
    notifications: "/hr/dashboard.html#notifications",
    settings: "/hr/settings.html",
  };

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard", href: "/hr/dashboard.html", icon: "DB", hint: "Live workforce overview" },
    { key: "employees", label: "Employees", href: "/hr/employees.html", icon: "EM", hint: "Directory and people actions" },
    { key: "attendance", label: "Attendance", href: "/hr/attendance.html", icon: "AT", hint: "Hours and presence analytics" },
    { key: "leaves", label: "Leaves", href: "/hr/leaves.html", icon: "LV", hint: "Approve, reject, or hold" },
    { key: "recruitment", label: "Recruitment", href: "/hr/interviews.html", icon: "RC", hint: "Interviews and offers" },
    { key: "projects", label: "Projects", href: "/hr/reports.html#project-insights", icon: "PR", hint: "Project-linked HR insight" },
    { key: "teams", label: "Teams", href: "/hr/reports.html#team-insights", icon: "TM", hint: "Teams readiness and access" },
    { key: "files", label: "Files", href: "/hr/employees.html#employeeDocumentsSection", icon: "FL", hint: "OneDrive-backed documents" },
    { key: "payroll", label: "Payroll", href: "/hr/payroll.html", icon: "PY", hint: "Salary operations" },
    { key: "reports", label: "Reports", href: "/hr/reports.html", icon: "RP", hint: "Exports and analytics" },
    { key: "meetings", label: "Meetings", href: "/hr/interviews.html#meeting-desk", icon: "MT", hint: "Teams interviews and syncs" },
    { key: "notifications", label: "Notifications", href: "/hr/dashboard.html#notifications", icon: "NT", hint: "Realtime workflow stream" },
    { key: "settings", label: "Settings", href: "/hr/settings.html", icon: "ST", hint: "Preferences and integrations" },
  ];

  const quickActions = [
    { label: "Add Employee", action: "employee", type: "action" },
    { label: "Add Attendance", action: "attendance", type: "action" },
    { label: "Add Leave", action: "leave", type: "action" },
    { label: "Add Department", action: "department", type: "action" },
    { label: "Payroll", href: "/hr/payroll.html", type: "link" },
    { label: "Reports", href: "/hr/reports.html", type: "link" },
  ];

  function getUser() {
    return JSON.parse(localStorage.getItem("user") || "null");
  }

  function guard() {
    if (typeof window.requireAuth === "function") {
      window.requireAuth();
    }

    const user = getUser();
    const role = String(user?.role || "").toUpperCase();
    if (!["HR", "ADMIN", "MANAGER"].includes(role)) {
      window.location.href = "/pages/unauthorized.html";
    }
  }

  function statusClass(value = "") {
    return String(value).trim().toLowerCase().replace(/\s+/g, "_");
  }

  function formatDate(value, opts = {}) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", opts);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-IN").format(Number(value || 0));
  }

  function setTheme(mode = "dark") {
    const normalized = mode === "light" ? "light" : "dark";
    document.body.dataset.hrTheme = normalized;
    localStorage.setItem("hrTheme", normalized);
    const themeToggle = document.getElementById("hrThemeToggle");
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", normalized === "light" ? "true" : "false");
      themeToggle.querySelector("[data-theme-label]")?.replaceChildren(document.createTextNode(normalized === "light" ? "Light" : "Dark"));
    }
  }

  function applySavedTheme() {
    const preferred = localStorage.getItem("hrTheme") || (getUser()?.preferences?.darkMode ? "dark" : "dark");
    setTheme(preferred);
  }

  function toast(title, icon = "success") {
    if (window.Swal) {
      Swal.fire({
        toast: true,
        position: "top-end",
        timer: 2600,
        showConfirmButton: false,
        icon,
        title,
        background: "#111827",
        color: "#e2e8f0",
      });
      return;
    }
    window.alert(title);
  }

  async function confirmDialog(options = {}) {
    if (!window.Swal) {
      return window.confirm(options.title || "Continue?");
    }

    const result = await Swal.fire({
      title: options.title || "Are you sure?",
      text: options.text || "",
      icon: options.icon || "question",
      confirmButtonText: options.confirmButtonText || "Continue",
      showCancelButton: true,
      cancelButtonText: options.cancelButtonText || "Cancel",
      reverseButtons: true,
      background: "#0f172a",
      color: "#e2e8f0",
      customClass: {
        popup: "hr-swal-popup",
        confirmButton: "hr-swal-confirm",
        cancelButton: "hr-swal-cancel",
      },
    });
    return result.isConfirmed;
  }

  async function inputDialog(options = {}) {
    if (!window.Swal) {
      return { isConfirmed: false, value: null };
    }

    return Swal.fire({
      title: options.title || "Provide details",
      html: options.html || "",
      input: options.input,
      inputValue: options.inputValue,
      inputPlaceholder: options.inputPlaceholder,
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || "Save",
      cancelButtonText: options.cancelButtonText || "Cancel",
      preConfirm: options.preConfirm,
      background: "#0f172a",
      color: "#e2e8f0",
      customClass: {
        popup: "hr-swal-popup",
        confirmButton: "hr-swal-confirm",
        cancelButton: "hr-swal-cancel",
      },
    });
  }

  function animateCounter(el, value, formatter = (input) => input) {
    if (!el) return;
    const end = Number(value || 0);
    const start = 0;
    const duration = 900;
    const startTime = performance.now();

    function frame(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const current = Math.round(start + (end - start) * progress);
      el.textContent = formatter(current);
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    }

    requestAnimationFrame(frame);
  }

  function createSidebar(pageKey) {
    const grouped = [
      { title: "People Ops", items: sidebarItems.slice(0, 5) },
      { title: "Enterprise", items: sidebarItems.slice(5, 10) },
      { title: "Workspace", items: sidebarItems.slice(10) },
    ];

    return `
      <div class="hr-brand">
        <div class="hr-brand-mark">HR</div>
        <div class="hr-brand-copy">
          <strong>People Pulse</strong>
          <div class="hr-brand-subcopy">Enterprise command layer</div>
        </div>
      </div>
      <div class="hr-sidebar-summary">
        <div>
          <span class="hr-sidebar-summary-label">Mode</span>
          <strong>Realtime</strong>
        </div>
        <div class="hr-sidebar-summary-dot"></div>
      </div>
      ${grouped.map((group) => `
        <section class="hr-sidebar-group">
          <span class="hr-sidebar-group-title">${group.title}</span>
          <nav class="hr-nav">
            ${group.items.map((item) => `
              <a class="hr-nav-link ${pageKey === item.key ? "active" : ""}" href="${item.href}" data-nav="${item.key}">
                <span class="hr-nav-icon">${item.icon}</span>
                <span class="hr-nav-copy">
                  <span>${item.label}</span>
                  <small>${item.hint}</small>
                </span>
                <span class="hr-tooltip">${item.label}</span>
              </a>
            `).join("")}
          </nav>
        </section>
      `).join("")}
      <section class="hr-sidebar-group">
        <span class="hr-sidebar-group-title">Session</span>
        <nav class="hr-nav">
          <a class="hr-nav-link" href="#" id="hrLogoutLink">
            <span class="hr-nav-icon">LO</span>
            <span class="hr-nav-copy">
              <span>Logout</span>
              <small>Securely end session</small>
            </span>
            <span class="hr-tooltip">Logout</span>
          </a>
        </nav>
      </section>
    `;
  }

  function createTopbar(title, description) {
    const user = getUser() || {};
    const isConnectedToTeams = Boolean(user.microsoft?.teamsReady);
    const isConnectedToOutlook = Boolean(user.microsoft?.outlookReady);

    return `
      <div class="hr-topbar-left">
        <button type="button" class="hr-icon-button" id="hrSidebarToggle" aria-label="Toggle sidebar">|||</button>
        <div class="hr-topbar-copy">
          <div class="hr-meta">${description || "HR workspace"}</div>
          <strong>${title}</strong>
        </div>
      </div>
      <div class="hr-topbar-center">
        <label class="hr-search-shell">
          <span>Search</span>
          <input type="search" id="hrGlobalSearch" class="hr-search-input" placeholder="Search employees, payroll, reports..." />
        </label>
      </div>
      <div class="hr-topbar-right">
        <div class="hr-live-status">
          <span class="hr-live-dot"></span>
          <span>Live</span>
        </div>
        <button type="button" class="hr-action-button" id="hrAddNewTrigger">Add New</button>
        <button type="button" class="hr-chip-button" id="hrTeamsButton" data-connected="${isConnectedToTeams ? "1" : "0"}">Teams</button>
        <button type="button" class="hr-chip-button" id="hrOutlookButton" data-connected="${isConnectedToOutlook ? "1" : "0"}">Outlook</button>
        <button type="button" class="hr-chip-button" id="hrThemeToggle" aria-pressed="false">
          <span data-theme-label>Dark</span>
        </button>
        <button type="button" class="hr-icon-button" id="hrNotificationToggle" aria-label="Open notifications">NT</button>
        <div class="hr-profile-menu-wrap">
          <button type="button" class="hr-profile-trigger" id="hrProfileTrigger">
            <img class="hr-avatar" src="${user.profilePhoto || defaultAvatar}" alt="${user.name || "User"}" />
            <div class="hr-profile-meta">
              <strong>${user.name || "HR User"}</strong>
              <div class="hr-meta">${user.role || "HR"}</div>
            </div>
          </button>
          <div class="hr-profile-dropdown hidden" id="hrProfileDropdown">
            <a href="/hr/settings.html">Settings</a>
            <a href="/hr/employees.html">Employees</a>
            <a href="#" id="hrProfileLogoutLink">Logout</a>
          </div>
        </div>
      </div>
    `;
  }

  function createNotificationPanel() {
    return `
      <div class="hr-card-head">
        <div>
          <strong>Realtime Alerts</strong>
          <div class="hr-meta">Socket and workflow updates land here instantly.</div>
        </div>
        <span class="hr-pill" id="hrNotificationCount">0 new</span>
      </div>
      <div class="hr-list" id="hrNotificationList">
        <div class="hr-empty">Loading notifications...</div>
      </div>
    `;
  }

  function createQuickActions() {
    return `
      <button type="button" class="hr-quick-fab" id="hrQuickFab" aria-label="Open quick actions">+</button>
      <div class="hr-quick-panel hidden" id="hrQuickPanel">
        ${quickActions.map((item) => item.type === "link"
          ? `<a class="hr-quick-link" href="${item.href}">${item.label}</a>`
          : `<button type="button" class="hr-quick-link action" data-quick-create="${item.action}">${item.label}</button>`).join("")}
      </div>
    `;
  }

  function ensureBackgroundOrbs() {
    if (document.querySelector(".hr-bg-orbs")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "hr-bg-orbs";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-orb orb3"></div>
    `;
    document.body.prepend(wrapper);
  }

  async function loadNotifications() {
    const panel = document.getElementById("hrNotificationList");
    const counter = document.getElementById("hrNotificationCount");
    if (!panel || !counter) return;

    try {
      const response = await window.API.get("/notifications");
      const items = response.data || [];
      const unread = items.filter((item) => !item.read).length;
      counter.textContent = `${unread} new`;
      panel.innerHTML = items.length
        ? items.slice(0, 8).map((item) => `
            <article class="hr-list-item hr-fade-enter">
              <div>
                <strong>${item.title || item.type || "Notification"}</strong>
                <div class="hr-meta">${item.message || ""}</div>
              </div>
              <span class="hr-status ${statusClass(item.priority || item.type || "pending")}">${item.priority || "Info"}</span>
            </article>
          `).join("")
        : `<div class="hr-empty">No notifications yet.</div>`;
    } catch (error) {
      panel.innerHTML = `<div class="hr-empty">${error.message}</div>`;
    }
  }

  function bindShellEvents() {
    const body = document.body;
    const collapsePreference = localStorage.getItem("hrSidebarCollapsed");
    if (collapsePreference === "1") {
      body.classList.add("sidebar-collapsed");
    }
    if (window.innerWidth <= 900) {
      body.classList.remove("sidebar-collapsed");
    }

    document.getElementById("hrSidebarToggle")?.addEventListener("click", () => {
      if (window.innerWidth <= 900) {
        body.classList.toggle("sidebar-open");
        return;
      }
      body.classList.toggle("sidebar-collapsed");
      localStorage.setItem("hrSidebarCollapsed", body.classList.contains("sidebar-collapsed") ? "1" : "0");
    });

    document.getElementById("hrLogoutLink")?.addEventListener("click", (event) => {
      event.preventDefault();
      if (typeof window.logout === "function") {
        window.logout();
      }
    });

    document.getElementById("hrProfileLogoutLink")?.addEventListener("click", (event) => {
      event.preventDefault();
      if (typeof window.logout === "function") {
        window.logout();
      }
    });

    document.getElementById("hrNotificationToggle")?.addEventListener("click", () => {
      document.getElementById("hrFloatingPanel")?.classList.toggle("hidden");
    });

    document.getElementById("hrProfileTrigger")?.addEventListener("click", () => {
      document.getElementById("hrProfileDropdown")?.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      const dropdown = document.getElementById("hrProfileDropdown");
      const trigger = document.getElementById("hrProfileTrigger");
      if (!dropdown || !trigger) return;
      if (!dropdown.contains(event.target) && !trigger.contains(event.target)) {
        dropdown.classList.add("hidden");
      }
    });

    document.getElementById("hrThemeToggle")?.addEventListener("click", () => {
      const nextTheme = document.body.dataset.hrTheme === "light" ? "dark" : "light";
      setTheme(nextTheme);
    });

    document.getElementById("hrTeamsButton")?.addEventListener("click", () => {
      const connected = document.getElementById("hrTeamsButton").dataset.connected === "1";
      if (!connected) {
        toast("Teams is not connected for this account yet.", "info");
        return;
      }
      window.open("https://teams.microsoft.com", "_blank", "noopener");
    });

    document.getElementById("hrOutlookButton")?.addEventListener("click", () => {
      const connected = document.getElementById("hrOutlookButton").dataset.connected === "1";
      if (!connected) {
        toast("Outlook is not connected for this account yet.", "info");
        return;
      }
      window.open("https://outlook.office.com/mail/", "_blank", "noopener");
    });

    document.getElementById("hrGlobalSearch")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const term = event.currentTarget.value.trim().toLowerCase();
      if (!term) return;
      const route = Object.entries(searchRoutes).find(([key]) => key.includes(term))?.[1] || `/hr/employees.html?search=${encodeURIComponent(term)}`;
      navigate(route);
    });

    document.getElementById("hrQuickFab")?.addEventListener("click", () => {
      document.getElementById("hrQuickPanel")?.classList.toggle("hidden");
    });

    document.getElementById("hrAddNewTrigger")?.addEventListener("click", () => {
      document.getElementById("hrQuickPanel")?.classList.toggle("hidden");
    });

    document.querySelectorAll(".hr-quick-link").forEach((link) => {
      link.addEventListener("click", () => {
        document.getElementById("hrQuickPanel")?.classList.add("hidden");
      });
    });

    document.querySelectorAll("[data-quick-create]").forEach((button) => {
      button.addEventListener("click", () => openQuickCreate(button.dataset.quickCreate));
    });

    document.querySelectorAll("a[href^='/hr/']").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.getAttribute("target")) return;
        event.preventDefault();
        navigate(link.href);
      });
    });
  }

  function getStage() {
    return document.querySelector("[data-hr-stage]") || document.querySelector(".hr-content");
  }

  function storeTransition(target, direction = "forward") {
    try {
      sessionStorage.setItem("hr:transition", JSON.stringify({
        target,
        direction,
        at: Date.now(),
      }));
      sessionStorage.setItem("hr:lastRoute", window.location.pathname + window.location.search + window.location.hash);
    } catch (error) {
      // Ignore session storage issues and keep navigation resilient.
    }
  }

  function playEntryTransition() {
    let transition = null;
    try {
      transition = JSON.parse(sessionStorage.getItem("hr:transition") || "null");
      sessionStorage.removeItem("hr:transition");
    } catch (error) {
      transition = null;
    }

    const stage = getStage();
    if (!stage) return;

    stage.classList.remove("slide-forward-in", "slide-back-in");
    if (!transition || Date.now() - Number(transition.at || 0) > 4000) {
      stage.classList.add("hr-stage-ready");
      return;
    }

    stage.classList.add("hr-stage-ready", transition.direction === "back" ? "slide-back-in" : "slide-forward-in");
    window.setTimeout(() => {
      stage.classList.remove("slide-forward-in", "slide-back-in");
    }, 420);
  }

  function navigate(target, options = {}) {
    const direction = options.direction || "forward";
    const stage = getStage();
    storeTransition(target, direction);
    document.body.classList.add("page-leaving");
    stage?.classList.add(direction === "back" ? "slide-back-out" : "slide-forward-out");
    window.setTimeout(() => {
      window.location.href = target;
    }, 220);
  }

  function navigateBack(fallback = "/hr/reports.html") {
    let target = fallback;
    try {
      target = sessionStorage.getItem("hr:lastRoute") || fallback;
    } catch (error) {
      target = fallback;
    }
    navigate(target, { direction: "back" });
  }

  function initSockets(onRealtime) {
    if (typeof window.connectSocket === "function") {
      window.connectSocket();
    }

    if (typeof window.onSocket === "function") {
      window.onSocket("notification", (payload) => {
        toast(payload.title || "New notification", "info");
        loadNotifications();
        if (typeof onRealtime === "function") onRealtime("notification", payload);
      });
      window.onSocket("hr:leave-updated", (payload) => {
        loadNotifications();
        if (typeof onRealtime === "function") onRealtime("leave", payload);
      });
      window.onSocket("attendance:update", (payload) => {
        if (typeof onRealtime === "function") onRealtime("attendance", payload);
      });
      window.onSocket("hr:recruitment-updated", (payload) => {
        loadNotifications();
        if (typeof onRealtime === "function") onRealtime("recruitment", payload);
      });
    }
  }

  async function openQuickCreate(type) {
    if (type === "employee") {
      await openEmployeeWizard();
      return;
    }
    if (type === "attendance") {
      await openAttendanceWizard();
      return;
    }
    if (type === "leave") {
      await openLeaveWizard();
      return;
    }
    if (type === "department") {
      await openDepartmentWizard();
    }
  }

  async function fetchEmployeeChoices() {
    const response = await window.API.get("/employees?limit=50&page=1");
    return response.data?.items || [];
  }

  async function openEmployeeWizard() {
    const basic = await inputDialog({
      title: "Add Employee • Step 1 of 4",
      html: `
        <input id="wizard-name" class="swal2-input" placeholder="Name" />
        <input id="wizard-email" class="swal2-input" placeholder="Email" />
        <input id="wizard-phone" class="swal2-input" placeholder="Phone" />
        <input id="wizard-dob" class="swal2-input" type="date" />
        <select id="wizard-gender" class="swal2-select">
          <option value="">Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input id="wizard-profile" class="swal2-input" placeholder="Profile image URL" />
      `,
      preConfirm: () => ({
        name: document.getElementById("wizard-name").value,
        email: document.getElementById("wizard-email").value,
        phone: document.getElementById("wizard-phone").value,
        dob: document.getElementById("wizard-dob").value,
        gender: document.getElementById("wizard-gender").value,
        profilePhoto: document.getElementById("wizard-profile").value,
      }),
    });
    if (!basic.isConfirmed) return;

    const company = await inputDialog({
      title: "Add Employee • Step 2 of 4",
      html: `
        <input id="wizard-department" class="swal2-input" placeholder="Department" />
        <select id="wizard-role" class="swal2-select">
          <option value="MEMBER">Team Member</option>
          <option value="TEAM_LEAD">Team Lead</option>
          <option value="MANAGER">Manager</option>
          <option value="HR">HR</option>
          <option value="MARKETING">Marketing</option>
          <option value="SALES">Sales</option>
        </select>
        <input id="wizard-designation" class="swal2-input" placeholder="Designation" />
        <input id="wizard-joining" class="swal2-input" type="date" />
        <input id="wizard-manager" class="swal2-input" placeholder="Reporting manager" />
      `,
      preConfirm: () => ({
        department: document.getElementById("wizard-department").value,
        role: document.getElementById("wizard-role").value,
        designation: document.getElementById("wizard-designation").value,
        joiningDate: document.getElementById("wizard-joining").value,
        reportingManager: document.getElementById("wizard-manager").value,
      }),
    });
    if (!company.isConfirmed) return;

    const account = await inputDialog({
      title: "Add Employee • Step 3 of 4",
      html: `
        <input id="wizard-username" class="swal2-input" placeholder="Username" />
        <input id="wizard-password" class="swal2-input" placeholder="Password" value="Welcome@123" />
        <input id="wizard-access" class="swal2-input" placeholder="Access level comma separated" />
        <select id="wizard-status" class="swal2-select">
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
      `,
      preConfirm: () => ({
        username: document.getElementById("wizard-username").value,
        password: document.getElementById("wizard-password").value,
        permissions: document.getElementById("wizard-access").value,
        status: document.getElementById("wizard-status").value,
      }),
    });
    if (!account.isConfirmed) return;

    const payload = {
      ...basic.value,
      ...company.value,
      ...account.value,
      title: company.value.designation,
      metadata: {
        dob: basic.value.dob,
        gender: basic.value.gender,
        reportingManager: company.value.reportingManager,
      },
      microsoft: {
        outlookEmail: basic.value.email,
        outlookReady: true,
        teamsReady: true,
        calendarReady: true,
        oneDriveReady: true,
      },
    };

    const review = await inputDialog({
      title: "Add Employee • Step 4 of 4",
      html: `
        <div style="text-align:left;padding:0 10px">
          <p><strong>Name:</strong> ${payload.name}</p>
          <p><strong>Email:</strong> ${payload.email}</p>
          <p><strong>Department:</strong> ${payload.department}</p>
          <p><strong>Role:</strong> ${payload.role}</p>
          <p><strong>Designation:</strong> ${payload.designation}</p>
          <p><strong>Joining Date:</strong> ${payload.joiningDate || "-"}</p>
          <p><strong>Status:</strong> ${payload.status}</p>
        </div>
      `,
      confirmButtonText: "Save Employee",
    });
    if (!review.isConfirmed) return;

    await window.API.post("/users", payload);
    toast("Employee added successfully");
    loadNotifications();
  }

  async function openAttendanceWizard() {
    const employees = await fetchEmployeeChoices();
    const result = await inputDialog({
      title: "Add Attendance",
      html: `
        <select id="attendance-employee" class="swal2-select">
          <option value="">Select employee</option>
          ${employees.map((item) => `<option value="${item._id}">${item.name} • ${item.department || "General"}</option>`).join("")}
        </select>
        <input id="attendance-date" class="swal2-input" type="date" />
        <input id="attendance-checkin" class="swal2-input" type="datetime-local" />
        <input id="attendance-checkout" class="swal2-input" type="datetime-local" />
        <select id="attendance-status" class="swal2-select">
          <option value="Present">Present</option>
          <option value="Late">Late</option>
          <option value="Half Day">Half Day</option>
          <option value="Absent">Absent</option>
        </select>
        <input id="attendance-break" class="swal2-input" type="number" step="0.1" placeholder="Break hours" />
      `,
      preConfirm: () => ({
        employeeId: document.getElementById("attendance-employee").value,
        date: document.getElementById("attendance-date").value,
        checkInAt: document.getElementById("attendance-checkin").value,
        checkOutAt: document.getElementById("attendance-checkout").value,
        status: document.getElementById("attendance-status").value,
        breakHours: document.getElementById("attendance-break").value,
      }),
    });
    if (!result.isConfirmed) return;
    await window.API.post("/hr/attendance-entry", result.value);
    toast("Attendance added successfully");
    loadNotifications();
  }

  async function openLeaveWizard() {
    const employees = await fetchEmployeeChoices();
    const result = await inputDialog({
      title: "Add Leave",
      html: `
        <select id="leave-employee" class="swal2-select">
          <option value="">Select employee</option>
          ${employees.map((item) => `<option value="${item._id}">${item.name} • ${item.department || "General"}</option>`).join("")}
        </select>
        <select id="leave-type" class="swal2-select">
          <option value="Casual">Casual</option>
          <option value="Sick">Sick</option>
          <option value="Paid">Paid</option>
          <option value="Emergency">Emergency</option>
          <option value="WFH">WFH</option>
        </select>
        <input id="leave-from" class="swal2-input" type="date" />
        <input id="leave-to" class="swal2-input" type="date" />
        <textarea id="leave-reason" class="swal2-textarea" placeholder="Reason"></textarea>
      `,
      preConfirm: () => ({
        employeeId: document.getElementById("leave-employee").value,
        leaveType: document.getElementById("leave-type").value,
        fromDate: document.getElementById("leave-from").value,
        toDate: document.getElementById("leave-to").value,
        reason: document.getElementById("leave-reason").value,
      }),
    });
    if (!result.isConfirmed) return;
    await window.API.post("/hr/leave-entry", result.value);
    toast("Leave request created");
    loadNotifications();
  }

  async function openDepartmentWizard() {
    const result = await inputDialog({
      title: "Add Department",
      html: `
        <input id="department-name" class="swal2-input" placeholder="Department name" />
        <input id="department-owner" class="swal2-input" placeholder="Department head" />
        <textarea id="department-description" class="swal2-textarea" placeholder="Description"></textarea>
      `,
      preConfirm: () => ({
        name: document.getElementById("department-name").value,
        owner: document.getElementById("department-owner").value,
        description: document.getElementById("department-description").value,
        status: "ACTIVE",
      }),
    });
    if (!result.isConfirmed) return;
    await window.API.post("/departments", result.value);
    toast("Department created");
  }

  function renderSkeletons(target, count = 4) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = Array.from({ length: count }).map(() => `<div class="hr-skeleton"></div>`).join("");
  }

  function ensureShellScaffold() {
    document.body.classList.add("hr-body");

    if (!document.getElementById("hrFloatingPanel")) {
      const floatingPanel = document.createElement("aside");
      floatingPanel.className = "hr-floating-panel hidden";
      floatingPanel.id = "hrFloatingPanel";
      document.body.appendChild(floatingPanel);
    }

    if (document.getElementById("hrSidebar") && document.getElementById("hrNavbar")) {
      return;
    }

    const legacyContainer = document.querySelector(".app-container");
    if (!legacyContainer) return;

    const legacyMain = legacyContainer.querySelector(".main-content") || legacyContainer.querySelector("main") || legacyContainer;
    const legacyContent = legacyMain.querySelector(".content-area") || legacyMain;
    const shell = document.createElement("div");
    const sidebar = document.createElement("aside");
    const main = document.createElement("div");
    const topbar = document.createElement("header");
    const content = document.createElement("main");

    shell.className = "hr-shell";
    sidebar.className = "hr-sidebar";
    sidebar.id = "hrSidebar";
    main.className = "hr-main";
    topbar.className = "hr-topbar";
    topbar.id = "hrNavbar";
    content.className = "hr-content";

    legacyContainer.replaceWith(shell);
    shell.append(sidebar, main);
    main.append(topbar, content);
    content.appendChild(legacyContent);
  }

  function csvDownload(rows = [], fileName = "export.csv") {
    if (!rows.length) {
      toast("No data available to export", "warning");
      return;
    }

    const keys = Object.keys(rows[0]);
    const csv = [
      keys.join(","),
      ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replace(/"/g, "\"\"")}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function bootPage({ pageKey, title, description, onRealtime } = {}) {
    ensureShellScaffold();
    guard();
    applySavedTheme();
    ensureBackgroundOrbs();
    document.getElementById("hrSidebar").innerHTML = createSidebar(pageKey);
    document.getElementById("hrNavbar").innerHTML = createTopbar(title, description);
    document.getElementById("hrFloatingPanel").innerHTML = createNotificationPanel();

    const quickDock = document.createElement("div");
    quickDock.innerHTML = createQuickActions();
    document.body.appendChild(quickDock);

    bindShellEvents();
    playEntryTransition();
    await loadNotifications();
    initSockets(onRealtime);

    if (window.AOS) {
      AOS.init({ once: true, duration: 700 });
    }

    return getUser();
  }

  window.hrApp = {
    animateCounter,
    bootPage,
    confirmDialog,
    csvDownload,
    defaultAvatar,
    formatCurrency,
    formatDate,
    formatNumber,
    getUser,
    inputDialog,
    loadNotifications,
    navigate,
    navigateBack,
    openQuickCreate,
    playEntryTransition,
    renderSkeletons,
    setTheme,
    statusClass,
    toast,
  };
})();
