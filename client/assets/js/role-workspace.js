function normalizeRole(role) {
    const value = String(role || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

    if (value === "TEAMLEAD") return "TEAM_LEAD";
    if (value === "PRODUCTMANAGER") return "PRODUCT_MANAGER";
    if (value === "TEAM_MEMBER" || value === "EMPLOYEE") return "MEMBER";
    if (value === "CALLING_TEAM" || value === "CALLER" || value === "CALLING_EXECUTIVE") return "CALLING";
    if (value === "PM" || value === "PROJECT_MANAGER") return "MANAGER";
    return value;
}

async function initWorkspace({ navbarPath, sidebarPath, requireRole } = {}) {
    if (typeof requireAuth === "function") {
        requireAuth();
    }

    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

    if (requireRole && typeof getCurrentUser === "function") {
        if (user && normalizeRole(user.role) !== normalizeRole(requireRole)) {
            window.location.href = "/pages/unauthorized.html";
            return false;
        }
    }

    if (navbarPath) {
        await loadPartial("navbar", navbarPath);
    }

    if (sidebarPath) {
        await loadPartial("sidebar", sidebarPath);
    }

    await ensureWorkspaceFooter();
    hydrateWorkspaceChrome(user);
    return true;
}

const ENTERPRISE_THEME_OPTIONS = [{
        id: "light",
        label: "Atlas Light",
        description: "Clean white workspace with blue accents",
        colors: ["#ffffff", "#dbeafe", "#93c5fd"],
    },
    {
        id: "ocean",
        label: "Ocean Glass",
        description: "Cool cyan and blue professional surface",
        colors: ["#f0f9ff", "#bfdbfe", "#0ea5e9"],
    },
    {
        id: "forest",
        label: "Forest Mint",
        description: "Green-teal workspace for calmer contrast",
        colors: ["#f0fdf4", "#bbf7d0", "#14b8a6"],
    },
    {
        id: "sunset",
        label: "Sunset Sand",
        description: "Warm neutral cards with amber highlight",
        colors: ["#fffbeb", "#fed7aa", "#f97316"],
    },
    {
        id: "midnight",
        label: "Midnight",
        description: "Dark control room with crisp contrast",
        colors: ["#0f172a", "#1e293b", "#60a5fa"],
    },
];

const ENTERPRISE_THEME_MAP = {
    light: {
        "--primary": "#2563eb",
        "--primary-dark": "#1d4ed8",
        "--secondary": "#64748b",
        "--success": "#16a34a",
        "--warning": "#f59e0b",
        "--danger": "#dc2626",
        "--info": "#0891b2",
        "--bg": "#f8fafc",
        "--surface": "#ffffff",
        "--text": "#0f172a",
        "--muted": "#64748b",
        "--border": "#e2e8f0",
    },
    ocean: {
        "--primary": "#0369a1",
        "--primary-dark": "#075985",
        "--secondary": "#4b5563",
        "--success": "#0f766e",
        "--warning": "#d97706",
        "--danger": "#dc2626",
        "--info": "#0284c7",
        "--bg": "#eef8ff",
        "--surface": "#ffffff",
        "--text": "#082f49",
        "--muted": "#4b6b80",
        "--border": "#cfe3f2",
    },
    forest: {
        "--primary": "#0f766e",
        "--primary-dark": "#115e59",
        "--secondary": "#5f6b65",
        "--success": "#15803d",
        "--warning": "#ca8a04",
        "--danger": "#dc2626",
        "--info": "#0f766e",
        "--bg": "#f2fbf7",
        "--surface": "#ffffff",
        "--text": "#12372f",
        "--muted": "#5c776d",
        "--border": "#d8eee4",
    },
    sunset: {
        "--primary": "#ea580c",
        "--primary-dark": "#c2410c",
        "--secondary": "#7c6f64",
        "--success": "#15803d",
        "--warning": "#d97706",
        "--danger": "#dc2626",
        "--info": "#0f766e",
        "--bg": "#fff8ef",
        "--surface": "#fffdf9",
        "--text": "#431407",
        "--muted": "#7c5f50",
        "--border": "#f3ddc5",
    },
    midnight: {
        "--primary": "#60a5fa",
        "--primary-dark": "#3b82f6",
        "--secondary": "#94a3b8",
        "--success": "#4ade80",
        "--warning": "#fbbf24",
        "--danger": "#f87171",
        "--info": "#38bdf8",
        "--bg": "#0b1120",
        "--surface": "#111c34",
        "--text": "#e5eefc",
        "--muted": "#9fb0cb",
        "--border": "#24314d",
    },
};

function getStoredTheme() {
    const storedTheme = localStorage.getItem("theme") || "light";
    return storedTheme === "midnight" ? "light" : storedTheme;
}

function applyTheme(themeId = "light") {
    const resolvedTheme = ENTERPRISE_THEME_MAP[themeId] ? themeId : "light";
    const root = document.documentElement;
    const tokens = ENTERPRISE_THEME_MAP[resolvedTheme];

    Object.entries(tokens).forEach(([token, value]) => {
        root.style.setProperty(token, value);
    });

    document.body.dataset.theme = resolvedTheme;
    document.body.classList.toggle("dark", resolvedTheme === "midnight");
    localStorage.setItem("theme", resolvedTheme);
    renderThemeMenu();
    return resolvedTheme;
}

function toggleTheme() {
    const currentTheme = getStoredTheme();
    const nextTheme = currentTheme === "midnight" ? "light" : "midnight";
    return applyTheme(nextTheme);
}

function renderThemeMenu() {
    const menu = document.getElementById("themeMenu");
    if (!menu) return;

    const activeTheme = getStoredTheme();
    menu.innerHTML = ENTERPRISE_THEME_OPTIONS
        .map((theme) => {
            const isActive = theme.id === activeTheme;
            const swatch = `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]})`;
            return `
        <button type="button" class="theme-menu-option ${isActive ? "is-active" : ""}" data-theme-option="${theme.id}">
          <span class="theme-swatch" style="background:${swatch};"></span>
          <span class="theme-option-copy">
            <strong>${theme.label}</strong>
            <small>${theme.description}</small>
          </span>
        </button>
      `;
        })
        .join("");
}

function initTheme() {
    applyTheme(getStoredTheme());
}

function closeNavbarPanels(exceptId = "") {
    document.querySelectorAll(".navbar-panel").forEach((panel) => {
        const keepOpen = panel.id === exceptId;
        panel.classList.toggle("hidden", !keepOpen);
        panel.setAttribute("aria-hidden", keepOpen ? "false" : "true");
    });

    document.querySelectorAll("[aria-expanded]").forEach((trigger) => {
        if (!trigger.id) return;
        const targetId =
            trigger.id === "themeToggle" ?
            "themeMenu" :
            trigger.id === "notificationBtn" ?
            "notificationPanel" :
            trigger.id === "quickCreateTrigger" ?
            "quickCreateMenu" :
            trigger.id === "profileMenuTrigger" ?
            "profileMenu" :
            "";

        if (!targetId) return;
        trigger.setAttribute("aria-expanded", targetId === exceptId ? "true" : "false");
    });
}

function toggleNavbarPanel(triggerId, panelId) {
    const panel = document.getElementById(panelId);
    const trigger = document.getElementById(triggerId);
    if (!panel || !trigger) return;

    const shouldOpen = panel.classList.contains("hidden");
    closeNavbarPanels(shouldOpen ? panelId : "");
}

async function loadPartial(elementId, filePath) {
    const response = await fetch(filePath);
    const html = await response.text();
    document.getElementById(elementId).innerHTML = html;
}

async function ensureWorkspaceFooter() {
    let footer = document.getElementById("footer");
    if (!footer) {
        footer = document.createElement("div");
        footer.id = "footer";
        footer.className = "admin-page-footer";
        const shell = document.querySelector(".dashboard-shell, .layout, .enterprise-shell, .generated-layout");
        if (shell) {
            shell.appendChild(footer);
        } else {
            document.body.appendChild(footer);
        }
    }

    if (footer.dataset.loaded) return;
    await loadPartial("footer", "../../../components/footer.html");
    footer.dataset.loaded = "true";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));
}

function formatShortDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function escapeHtml(value = "") {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

function resolveWorkspaceImageSrc(value, fallback = "/assets/images/default-avatar.png") {
    const source = String(value || "").trim();
    if (!source) return fallback;

    const normalized = source.replace(/\\/g, "/");
    if (normalized.startsWith("file://") || /^[a-zA-Z]:\//.test(normalized) || normalized.startsWith("///")) {
        return fallback;
    }

    return source;
}

function statusClass(status) {
    const normalized = String(status || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    switch (normalized) {
        case "active":
        case "approved":
        case "converted":
            return "status-active";
        case "planning":
        case "new":
        case "pending":
            return "status-planning";
        case "on-hold":
        case "rejected":
        case "lost":
        case "overdue":
            return "status-on-hold";
        case "in-review":
        case "contacted":
        case "negotiation":
        case "interested":
            return "status-in-review";
        case "completed":
            return "status-completed";
        default:
            return "status-planning";
    }
}

function priorityClass(priority) {
    const normalized = String(priority || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    if (normalized === "high") return "priority-high";
    if (normalized === "critical") return "priority-critical";
    if (normalized === "low") return "priority-low";
    return "priority-medium";
}

window.initWorkspace = initWorkspace;
window.loadPartial = loadPartial;
window.ensureWorkspaceFooter = ensureWorkspaceFooter;
window.setText = setText;
window.formatCurrency = formatCurrency;
window.formatShortDate = formatShortDate;
window.escapeHtml = escapeHtml;
window.resolveWorkspaceImageSrc = resolveWorkspaceImageSrc;
window.statusClass = statusClass;
window.priorityClass = priorityClass;

function hydrateWorkspaceChrome(user) {
    initTheme();
    if (!user) return;
    const role = normalizeRole(user.role);

    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        sidebar.innerHTML = buildSidebarMarkup(role);
        sidebar.querySelectorAll("a[href]").forEach((link) => {
            if (!link.dataset.boundSidebarNav) {
                link.dataset.boundSidebarNav = "true";
                link.addEventListener("click", () => {
                    if (window.innerWidth <= 1100) {
                        document.body.classList.remove("sidebar-open");
                        document.body.classList.remove("sidebar-dimmed");
                    }
                });
            }
        });
        if (typeof window.setActiveSidebar === "function") {
            window.setActiveSidebar();
        }
    }

    hydrateNavbarMeta(role);

    const avatar = document.getElementById("navbarAvatar");
    if (avatar) {
        avatar.src = resolveWorkspaceImageSrc(user.profilePhoto);
        avatar.onerror = () => {
            avatar.onerror = null;
            avatar.src = "/assets/images/default-avatar.png";
        };
    }

    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn && !themeBtn.dataset.bound) {
        themeBtn.dataset.bound = "true";
        renderThemeMenu();
        themeBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleNavbarPanel("themeToggle", "themeMenu");
        });
    }

    const themeMenu = document.getElementById("themeMenu");
    if (themeMenu && !themeMenu.dataset.bound) {
        themeMenu.dataset.bound = "true";
        themeMenu.addEventListener("click", (event) => {
            const option = event.target.closest("[data-theme-option]");
            if (!option) return;
            applyTheme(option.dataset.themeOption);
            closeNavbarPanels("");
        });
    }

    const quickCreateTrigger = document.getElementById("quickCreateTrigger");
    if (quickCreateTrigger && !quickCreateTrigger.dataset.bound) {
        quickCreateTrigger.dataset.bound = "true";
        quickCreateTrigger.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleNavbarPanel("quickCreateTrigger", "quickCreateMenu");
        });
    }

    const sidebarBtn = document.getElementById("sidebarToggle");
    if (sidebarBtn && !sidebarBtn.dataset.bound) {
        sidebarBtn.dataset.bound = "true";
        sidebarBtn.addEventListener("click", () => {
            if (window.innerWidth <= 1100) {
                document.body.classList.toggle("sidebar-open");
                document.body.classList.toggle("sidebar-dimmed", document.body.classList.contains("sidebar-open"));
            } else {
                document.body.classList.toggle("sidebar-collapsed");
            }
        });
    }

    const profileTrigger = document.getElementById("profileMenuTrigger");
    if (profileTrigger && !profileTrigger.dataset.bound) {
        profileTrigger.dataset.bound = "true";
        profileTrigger.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleNavbarPanel("profileMenuTrigger", "profileMenu");
        });
    }

    if (!document.body.dataset.navbarPanelsBound) {
        document.body.dataset.navbarPanelsBound = "true";
        document.addEventListener("click", (event) => {
            if (window.innerWidth <= 1100 && document.body.classList.contains("sidebar-open")) {
                const clickedInsideSidebar = Boolean(event.target.closest(".sidebar"));
                const clickedSidebarToggle = Boolean(event.target.closest("#sidebarToggle"));
                if (!clickedInsideSidebar && !clickedSidebarToggle) {
                    document.body.classList.remove("sidebar-open");
                    document.body.classList.remove("sidebar-dimmed");
                }
            }

            if (event.target.closest(".navbar-dropdown")) return;
            closeNavbarPanels("");
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeNavbarPanels("");
            }
        });
    }
}

function hydrateNavbarMeta(role) {
    const configs = {
        ADMIN: {
            title: "Admin Workspace",
            description: "Enterprise control",
            notificationsHref: "/modules/admin/notifications/notifications.html",
            meetingsHref: "/modules/admin/chat/chat.html",
            profileHref: "/modules/admin/profile/profile.html",
            settingsHref: "/modules/admin/settings/settings.html",
            securityHref: "/modules/admin/profile/security.html",
            privacyHref: "/modules/admin/profile/privacy.html",
            logoutText: "Exit this admin workspace",
            quickCreateLinks: [
                { selector: "primary", href: "/modules/admin/departments/departments.html", title: "Create Department", copy: "Start a clean org structure", icon: "DP" },
                { selector: "secondary", href: "/modules/admin/users/users.html", title: "Create User", copy: "Onboard a new employee", icon: "US" },
                { selector: "tertiary", href: "/modules/admin/projects/projects.html", title: "Create Project", copy: "Open a delivery flow", icon: "PJ" },
            ],
        },
        MANAGER: {
            title: "Manager Workspace",
            description: "Projects and delivery control",
            notificationsHref: "/modules/manager/notifications/notifications.html",
            meetingsHref: "/modules/manager/meetings/meetings.html",
            profileHref: "/modules/manager/profile/profile.html",
            settingsHref: "/modules/manager/settings/settings.html",
            securityHref: "/modules/manager/settings/settings.html",
            privacyHref: "/modules/manager/settings/settings.html",
            logoutText: "Exit this manager workspace",
            quickCreateLinks: [
                { selector: "primary", href: "/modules/manager/projects/projects.html", title: "Create Project", copy: "Open a delivery plan", icon: "PJ" },
                { selector: "secondary", href: "/modules/manager/tasks/tasks.html", title: "Create Task", copy: "Distribute new work", icon: "TK" },
                { selector: "tertiary", href: "/modules/manager/meetings/meetings.html", title: "Schedule Meeting", copy: "Align the team fast", icon: "MT" },
            ],
        },
        TEAM_LEAD: {
            title: "Team Lead Workspace",
            description: "Reviews and delivery coordination",
            notificationsHref: "/modules/teamlead/notifications/notifications.html",
            meetingsHref: "/modules/collaboration/meetings/meetings.html",
            profileHref: "/modules/teamlead/profile/profile.html",
            settingsHref: "/modules/teamlead/settings/settings.html",
            securityHref: "/modules/teamlead/settings/settings.html",
            privacyHref: "/modules/teamlead/settings/settings.html",
            logoutText: "Exit this lead workspace",
            quickCreateLinks: [
                { selector: "primary", href: "/modules/teamlead/team-tasks/team-tasks.html", title: "Create Task", copy: "Break work into units", icon: "TK" },
                { selector: "secondary", href: "/modules/teamlead/approvals/approvals.html", title: "Review Queue", copy: "Open pending submissions", icon: "RV" },
                { selector: "tertiary", href: "/modules/collaboration/meetings/meetings.html", title: "Schedule Review", copy: "Plan the next sync", icon: "MT" },
            ],
        },
        MEMBER: {
            title: "Member Workspace",
            description: "Daily execution",
            notificationsHref: "/employee/notifications",
            meetingsHref: "/employee/meetings",
            profileHref: "/employee/profile",
            settingsHref: "/employee/settings",
            securityHref: "/employee/settings",
            privacyHref: "/employee/settings",
            logoutText: "Exit this workspace",
            quickCreateLinks: [
                { selector: "primary", href: "/employee/daily-updates", title: "Post Update", copy: "Share progress quickly", icon: "DU" },
                { selector: "secondary", href: "/employee/files", title: "Upload File", copy: "Push deliverables", icon: "UP" },
                { selector: "tertiary", href: "/employee/meetings", title: "Join Meeting", copy: "Open room links", icon: "MT" },
            ],
        },
        MARKETING: {
            title: "Marketing Workspace",
            description: "Lead generation, campaigns and assignment control",
            notificationsHref: "/employee/notifications",
            meetingsHref: "/employee/meetings",
            profileHref: "/employee/profile",
            settingsHref: "/employee/settings",
            securityHref: "/employee/settings",
            privacyHref: "/employee/settings",
            logoutText: "Exit this marketing workspace",
            quickCreateLinks: [
                { selector: "primary", href: "/modules/marketing/dashboard/dashboard.html", title: "Open Dashboard", copy: "Review leads and assignments", icon: "DB" },
                { selector: "secondary", href: "/marketing/lead-assignment", title: "Lead Assignment", copy: "Assign leads to callers", icon: "LA" },
                { selector: "tertiary", href: "/marketing/import-leads", title: "Import Leads", copy: "Upload and map lead files", icon: "IM" },
            ],
        },
        SALES: {
            title: "Sales Workspace",
            description: "Calling queue, follow-ups and conversion flow",
            notificationsHref: "/employee/notifications",
            meetingsHref: "/employee/meetings",
            profileHref: "/employee/profile",
            settingsHref: "/employee/settings",
            securityHref: "/employee/settings",
            privacyHref: "/employee/settings",
            logoutText: "Exit this sales workspace",
            quickCreateLinks: [
                { selector: "primary", href: "/modules/sales/dashboard/dashboard.html", title: "Open Dashboard", copy: "Review assigned leads", icon: "DB" },
                { selector: "secondary", href: "/modules/sales/dashboard/dashboard.html", title: "My Leads", copy: "See realtime assignment queue", icon: "LD" },
                { selector: "tertiary", href: "/login.html", title: "Back To Login", copy: "Switch workspace", icon: "LX" },
            ],
        },
        CLIENT: {
            title: "Client Portal",
            description: "Project visibility",
            notificationsHref: "/modules/client-portal/dashboard/dashboard.html",
            meetingsHref: "/modules/client-portal/messages/messages.html",
            profileHref: "/modules/client-portal/profile/profile.html",
            settingsHref: "/modules/client-portal/settings/settings.html",
            securityHref: "/modules/client-portal/settings/settings.html",
            privacyHref: "/modules/client-portal/settings/settings.html",
            logoutText: "Exit this portal",
            quickCreateLinks: [
                { selector: "primary", href: "/modules/client-portal/approvals/approvals.html", title: "Open Approvals", copy: "Review pending items", icon: "AP" },
                { selector: "secondary", href: "/modules/client-portal/messages/messages.html", title: "Send Message", copy: "Reach your delivery team", icon: "MS" },
                { selector: "tertiary", href: "/modules/client-portal/quotations/quotations.html", title: "View Quotations", copy: "Check commercial items", icon: "QT" },
            ],
        },
        PRODUCT_MANAGER: {
            title: "Product Workspace",
            description: "Requirements, roadmaps and milestones",
            notificationsHref: "/employee/notifications",
            meetingsHref: "/employee/meetings",
            profileHref: "/employee/profile",
            settingsHref: "/employee/settings",
            securityHref: "/employee/settings",
            privacyHref: "/employee/settings",
            logoutText: "Exit this product workspace",
            quickCreateLinks: [
                { selector: "primary", href: "/modules/product/dashboard/dashboard.html", title: "Open Dashboard", copy: "Intake and requirements", icon: "DB" },
                { selector: "secondary", href: "/product-manager/requirements", title: "Requirements", copy: "Gather business needs", icon: "TK" },
                { selector: "tertiary", href: "/product-manager/projects", title: "Products", copy: "Manage product backlog", icon: "PJ" },
            ],
        },
        HR: {
            title: "HR Command Workspace",
            description: "Employees, attendance, leaves and recruitment",
            notificationsHref: "/employee/notifications",
            meetingsHref: "/employee/meetings",
            profileHref: "/employee/profile",
            settingsHref: "/employee/settings",
            securityHref: "/employee/settings",
            privacyHref: "/employee/settings",
            logoutText: "Exit this HR workspace",
            quickCreateLinks: [
                { selector: "primary", href: "/hr/dashboard.html", title: "HR Dashboard", copy: "Live workforce stream", icon: "DB" },
                { selector: "secondary", href: "/hr/employees.html", title: "Employees", copy: "Workforce directory", icon: "US" },
                { selector: "tertiary", href: "/hr/leaves.html", title: "Leaves", copy: "Leave requests desk", icon: "LV" },
            ],
        },
        CALLING: {
            title: "Calling Desk Workspace",
            description: "Assigned leads and calling queue",
            notificationsHref: "/employee/notifications",
            meetingsHref: "/employee/meetings",
            profileHref: "/employee/profile",
            settingsHref: "/employee/settings",
            securityHref: "/employee/settings",
            privacyHref: "/employee/settings",
            logoutText: "Exit this calling workspace",
            quickCreateLinks: [
                { selector: "primary", href: "/modules/calling/dashboard/dashboard.html", title: "Calling Dashboard", copy: "Live dialer queue", icon: "DB" },
                { selector: "secondary", href: "/calling/assigned-leads", title: "Assigned Leads", copy: "Leads queue", icon: "LD" },
                { selector: "tertiary", href: "/calling/meetings", title: "Meetings", copy: "Teams meetings", icon: "MT" },
            ],
        },
    };

    const config = configs[role] || configs.MEMBER;
    setText("navbarPageTitle", config.title);
    setText("navbarPageDescription", config.description);

    const footerLink = document.querySelector(".panel-footer-link");
    if (footerLink) {
        footerLink.href = config.notificationsHref;
    }

    const profileItems = document.querySelectorAll("#profileMenu .profile-menu-item");
    if (profileItems[0] ? .tagName === "A") profileItems[0].setAttribute("href", config.meetingsHref);
    if (profileItems[1] ? .tagName === "A") profileItems[1].setAttribute("href", config.profileHref);
    if (profileItems[2] ? .tagName === "A") profileItems[2].setAttribute("href", config.securityHref);
    if (profileItems[3] ? .tagName === "A") profileItems[3].setAttribute("href", config.privacyHref);
    if (profileItems[4] ? .tagName === "A") profileItems[4].setAttribute("href", config.settingsHref);

    const logoutHint = document.querySelector(".logout-menu-item small");
    if (logoutHint) {
        logoutHint.textContent = config.logoutText;
    }

    const quickCreateTrigger = document.getElementById("quickCreateTrigger");
    const quickCreateMenu = document.getElementById("quickCreateMenu");
    const canUseQuickCreate = role === "ADMIN";
    if (quickCreateTrigger) {
        quickCreateTrigger.classList.toggle("hidden", !canUseQuickCreate);
    }
    if (quickCreateMenu) {
        quickCreateMenu.classList.toggle("hidden", !canUseQuickCreate);
    }
    if (!canUseQuickCreate) return;

    (config.quickCreateLinks || []).forEach((item) => {
        const link = document.querySelector(`[data-quick-action="${item.selector}"]`);
        if (!link) return;
        link.setAttribute("href", item.href);
        const strong = link.querySelector("strong");
        const small = link.querySelector("small");
        const icon = link.querySelector(".menu-item-icon");
        if (strong) strong.textContent = item.title;
        if (small) small.textContent = item.copy;
        if (icon) icon.textContent = item.icon;
    });
}

function getNavIconSvg(iconKey) {
    const icons = {
        DB: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13h8V3H3v10Z"></path><path d="M13 21h8v-6h-8v6Z"></path><path d="M13 11h8V3h-8v8Z"></path><path d="M3 21h8v-6H3v6Z"></path></svg>',
        DP: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 10h6"></path><path d="M9 14h6"></path></svg>',
        US: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M19 8v6"></path><path d="M22 11h-6"></path></svg>',
        PM: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 1 0-16 0"></path><circle cx="12" cy="7" r="4"></circle><path d="M8 21v-2"></path><path d="M16 21v-2"></path><path d="M9 12h6"></path></svg>',
        CL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"></path><path d="M8 9h8"></path><path d="M8 13h5"></path></svg>',
        PJ: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18"></path><path d="M6 3h12l2 4H4l2-4Z"></path><path d="M5 7v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7"></path></svg>',
        AS: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>',
        TK: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M9 9h8"></path><path d="M9 13h8"></path><path d="M9 17h5"></path></svg>',
        AP: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7v6c0 5 3.5 7.74 8 9 4.5-1.26 8-4 8-9V7l-8-4Z"></path><path d="m9 12 2 2 4-4"></path></svg>',
        CM: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"></path></svg>',
        TM: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        TT: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="m3 6 1 1 2-2"></path><path d="m3 12 1 1 2-2"></path><path d="m3 18 1 1 2-2"></path></svg>',
        RV: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 12 5 5"></path><path d="m7 17 15-15"></path></svg>',
        CH: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"></path></svg>',
        AT: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18"></path></svg>',
        LV: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10Z"></path></svg>',
        DU: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V10"></path><path d="m7 15 5 5 5-5"></path><path d="M5 4h14"></path></svg>',
        TS: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l4 2"></path></svg>',
        EX: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1v22"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
        UP: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M20 16.74V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.26"></path></svg>',
        RP: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"></path><path d="M15 3v6h6"></path><path d="M10 13h4"></path><path d="M10 17h4"></path></svg>',
        RL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 7.74-8 9-4.5-1.26-8-4-8-9V7l8-4Z"></path><path d="M9.5 12.5 11 14l3.5-4"></path></svg>',
        DG: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10"></path><path d="M7 12h10"></path><path d="M7 16h6"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>',
        BR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
        SH: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path></svg>',
        HD: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18"></path><path d="m8 15 2 2 5-5"></path></svg>',
        AL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="M9 12l2 2 4-4"></path></svg>',
        LH: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5l3 2"></path><circle cx="12" cy="12" r="9"></circle></svg>',
        TP: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h11v11"></path><path d="M16 8 5 19"></path><path d="M5 9V5h4"></path><path d="M15 19h4v-4"></path></svg>',
        AR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"></path><path d="M1 8h22"></path><path d="M10 12h4"></path><path d="M12 8v8"></path></svg>',
        PC: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><rect x="4" y="4" width="11" height="11" rx="2"></rect></svg>',
        BK: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V7h18v12a2 2 0 0 1-2 2Z"></path><path d="M3 7V5a2 2 0 0 1 2-2h11l5 5v-1"></path><path d="M9 14h6"></path></svg>',
        IE: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 5-5 5 5"></path><path d="M12 2v14"></path><path d="m17 17-5 5-5-5"></path><path d="M12 22V8"></path></svg>',
        RB: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path></svg>',
        ER: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
        BD: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V3"></path><path d="M4 4h10l-1.5 3L14 10H4"></path><path d="M14 4h6v6h-6"></path></svg>',
        ST: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="m4.93 4.93 2.83 2.83"></path><path d="m16.24 16.24 2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="m4.93 19.07 2.83-2.83"></path><path d="m16.24 7.76 2.83-2.83"></path><circle cx="12" cy="12" r="3"></circle></svg>',
        AN: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>',
        NT: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"></path><path d="M10 21h4"></path></svg>',
        PR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 1 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        MT: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"></path><path d="m18 9 4-3v12l-4-3"></path></svg>',
        CP: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18"></path><path d="M7 3v4"></path><path d="M17 3v4"></path><rect x="3" y="7" width="18" height="14" rx="2"></rect><path d="M8 12h8"></path></svg>',
        RI: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17 9 11l4 4 8-8"></path><path d="M14 7h7v7"></path></svg>',
        CQ: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92V19a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.11 3.18 2 2 0 0 1 4.1 1h2.08a2 2 0 0 1 2 1.72l.36 2.57a2 2 0 0 1-.57 1.72L6.65 8.35a16 16 0 0 0 9 9l1.34-1.32a2 2 0 0 1 1.72-.57l2.57.36A2 2 0 0 1 22 16.92Z"></path></svg>',
        DL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7 9 18l-5-5"></path></svg>',
        KP: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20"></path><path d="M2 12h20"></path><circle cx="12" cy="12" r="8"></circle></svg>',
        PG: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18"></path><path d="M12 3v18"></path><circle cx="12" cy="12" r="9"></circle></svg>',
        QT: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"></path><path d="M8 9h8"></path><path d="M8 13h5"></path></svg>',
        MS: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"></path><path d="m22 6-10 7L2 6"></path></svg>',
        LX: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path></svg>',
    };

    return icons[iconKey] || icons.ST;
}

function buildSidebarMarkup(role) {
    const adminSections = typeof window.getAdminModuleRegistry === "function" ?
        (window.ADMIN_MODULE_SECTIONS || []).map((section) => ({
            label: section.label,
            links: section.items.map((item) => ({
                href: item.href,
                icon: item.icon,
                label: item.title,
                status: item.status,
                note: item.section || section.label,
            })),
        })) :
        null;

    const configs = {
        ADMIN: {
            title: "Admin Command",
            subtitle: "Enterprise CRM, control tower and delivery operations",
            sections: adminSections || [{
                label: "Core Flow",
                links: [
                    { href: "/modules/admin/dashboard/dashboard.html", icon: "DB", label: "Dashboard", status: "ready" },
                    { href: "/modules/admin/departments/departments.html", icon: "DP", label: "Departments", status: "ready" },
                    { href: "/modules/admin/users/users.html", icon: "US", label: "Users", status: "ready" },
                    { href: "/modules/admin/crm/crm.html", icon: "CL", label: "Clients", status: "ready" },
                    { href: "/modules/admin/projects/projects.html", icon: "PJ", label: "Projects", status: "ready" },
                ],
            }, ],
        },
        MANAGER: {
            title: "Manager Command",
            subtitle: "Projects, Microsoft collaboration and delivery control",
            sections: [{
                    label: "Main Navigation",
                    links: [
                        ["/modules/manager/dashboard/dashboard.html", "DB", "Dashboard"],
                        ["/modules/manager/projects/projects.html", "PJ", "Assigned Projects"],
                        ["/modules/manager/team/team.html", "TM", "Users"],
                        ["/modules/manager/tasks/tasks.html", "TK", "Tasks"],
                        ["/modules/manager/meetings/meetings.html", "MT", "Meetings"],
                        ["/modules/manager/files/files.html", "UP", "Files"],
                        ["/modules/manager/reports/reports.html", "RP", "Reports"],
                        ["/modules/manager/flow-gallery/flow-gallery.html", "PG", "Flow Gallery"],
                        ["/modules/manager/daily-updates/daily-updates.html", "DU", "Daily Updates"],
                        ["/modules/manager/notifications/notifications.html", "NT", "Notifications"],
                        ["/modules/manager/history/history.html", "LH", "Work History"],
                    ],
                },
                {
                    label: "Microsoft Collaboration",
                    links: [
                        ["/modules/manager/teams/teams.html", "MS", "Microsoft Teams"],
                        ["/modules/manager/files/files.html", "BK", "OneDrive"],
                        ["/modules/manager/mailbox/mailbox.html", "MS", "Outlook Mail"],
                        ["/modules/manager/calendar/calendar.html", "CP", "Outlook Calendar"],
                    ],
                },
                {
                    label: "Account Settings",
                    links: [
                        ["/modules/manager/profile/profile.html", "PR", "Profile"],
                        ["/modules/manager/settings/settings.html", "RL", "Privacy & Preferences"],
                        ["/modules/manager/settings/settings.html", "AP", "Security & Access"],
                        ["/modules/manager/settings/settings.html", "ST", "Settings"],
                    ],
                },
            ],
        },
        TEAM_LEAD: {
            title: "Team Lead Workspace",
            subtitle: "Break work, review output and run delivery",
            sections: [{
                    label: "Lead Flow",
                    links: [
                        ["/modules/teamlead/dashboard/dashboard.html", "DB", "Dashboard"],
                        ["/modules/teamlead/team-tasks/team-tasks.html", "TT", "Team Tasks"],
                        ["/modules/teamlead/approvals/approvals.html", "RV", "Reviews"],
                        ["/modules/collaboration/chat/chat.html", "CH", "Chat"],
                        ["/modules/collaboration/meetings/meetings.html", "MT", "Meetings"],
                    ],
                },
                {
                    label: "Workspace",
                    links: [
                        ["/modules/teamlead/notifications/notifications.html", "NT", "Notifications"],
                        ["/modules/teamlead/task-templates/task-templates.html", "TP", "Templates"],
                        ["/modules/teamlead/profile/profile.html", "PR", "Profile"],
                        ["/modules/teamlead/settings/settings.html", "ST", "Settings"],
                    ],
                },
            ],
        },
        MEMBER: {
            title: "Member Workspace",
            subtitle: "Projects, collaboration and daily execution",
            sections: [{
                    label: "My Work",
                    links: [
                        ["/employee/dashboard", "DB", "Dashboard"],
                        ["/employee/projects", "PJ", "My Projects"],
                        ["/employee/tasks", "TK", "My Tasks"],
                        ["/employee/daily-updates", "DU", "Daily Updates"],
                        ["/employee/reports", "RP", "Reports"],
                        ["/employee/meetings", "MT", "Meetings"],
                        ["/employee/files", "UP", "Files & Media"],
                        ["/employee/notifications", "NT", "Notifications"],
                        ["/employee/reports", "RP", "Reports"],
                        ["/employee/shift-history", "LH", "Work History"],
                    ],
                },
                {
                    label: "Microsoft & Account",
                    links: [
                        ["/employee/chat", "CH", "Project Workspace"],
                        ["/employee/chat", "MS", "Microsoft Teams"],
                        ["/employee/files", "BK", "OneDrive"],
                        ["/employee/meetings", "MS", "Outlook Mail"],
                        ["/employee/attendance", "CP", "Outlook Calendar"],
                        ["/employee/profile", "PR", "Profile"],
                        ["/employee/settings", "ST", "Settings"],
                    ],
                },
            ],
        },
        MARKETING: {
            title: "Marketing Workspace",
            subtitle: "Lead generation and assignment flow",
            sections: [{
                    label: "Core",
                    links: [
                        ["/modules/marketing/dashboard/dashboard.html", "DB", "Dashboard"],
                        ["/marketing/lead-assignment", "LA", "Lead Assignment"],
                        ["/marketing/import-leads", "IM", "Import Leads"],
                    ],
                },
                {
                    label: "Workspace",
                    links: [
                        ["/employee/chat", "CH", "Chat"],
                        ["/employee/meetings", "MT", "Meetings"],
                        ["/employee/notifications", "NT", "Notifications"],
                        ["/employee/profile", "PR", "Profile"],
                        ["/employee/settings", "ST", "Settings"],
                    ],
                },
            ],
        },
        SALES: {
            title: "Sales Workspace",
            subtitle: "Assigned leads and follow-up flow",
            sections: [{
                    label: "Core",
                    links: [
                        ["/modules/sales/dashboard/dashboard.html", "DB", "Dashboard"],
                        ["/modules/sales/dashboard/dashboard.html", "LD", "My Leads"],
                    ],
                },
                {
                    label: "Workspace",
                    links: [
                        ["/employee/chat", "CH", "Chat"],
                        ["/employee/meetings", "MT", "Meetings"],
                        ["/employee/notifications", "NT", "Notifications"],
                    ],
                },
            ],
        },
        CLIENT: {
            title: "Client Portal",
            subtitle: "Progress, quotations and approvals",
            sections: [{
                    label: "Portal",
                    links: [
                        ["/modules/client-portal/dashboard/dashboard.html", "DB", "Dashboard"],
                        ["/modules/client-portal/project-progress/project-progress.html", "PG", "Progress"],
                        ["/modules/client-portal/quotations/quotations.html", "QT", "Quotations"],
                        ["/modules/client-portal/approvals/approvals.html", "AP", "Approvals"],
                    ],
                },
                {
                    label: "Workspace",
                    links: [
                        ["/modules/client-portal/messages/messages.html", "MS", "Messages"],
                        ["/modules/client-portal/profile/profile.html", "PR", "Profile"],
                        ["/modules/client-portal/settings/settings.html", "ST", "Settings"],
                    ],
                },
            ],
        },
    };

    const config = configs[role] || configs.MEMBER;
    const sectionsMarkup = config.sections
        .map(
            (section) => `
        <div class="sidebar-section">
          <span class="sidebar-label">${section.label}</span>
          ${section.links
            .map((link) => {
              const href = Array.isArray(link) ? link[0] : link.href;
              const icon = Array.isArray(link) ? link[1] : link.icon;
              const label = Array.isArray(link) ? link[2] : link.label;
              const status = Array.isArray(link) ? "" : link.status;
              const note = Array.isArray(link) ? "" : link.note;

              return `
                <a href="${href}" class="enterprise-link">
                  <span class="nav-icon">${getNavIconSvg(icon)}</span>
                  <span class="sidebar-group-meta">
                    <span>${label}</span>
                    ${note ? `<small>${note}</small>` : ""}
                  </span>
                  ${status ? `<span class="nav-badge ${status}">${status}</span>` : ""}
                </a>
              `;
            })
            .join("")}
        </div>
      `,
    )
    .join("");

  const onDashboard = window.location.pathname.includes("/dashboard/admin") || window.location.pathname.endsWith("/dashboard.html");
  const backBtnHtml = !onDashboard ? `
    <div class="sidebar-section" style="padding-bottom: 0; margin-bottom: 10px;">
      <a href="javascript:history.back()" class="enterprise-link back-link" style="background: rgba(37, 99, 235, 0.1); color: #1e40af; margin-bottom: 0; border: 1px solid rgba(37, 99, 235, 0.2); font-weight: 700;">
        <span class="nav-icon" style="transform: scaleX(-1); display: inline-block;">➔</span>
        <span>Back</span>
      </a>
    </div>
  ` : "";

  return `
    <aside class="sidebar" id="sidebarMenu">
      <div class="sidebar-header">
        <strong>${config.title}</strong>
        <span>${config.subtitle}</span>
      </div>
      ${backBtnHtml}
      ${sectionsMarkup}
      <div class="sidebar-section">
        <span class="sidebar-label">Account</span>
        <a href="#" onclick="logout()" class="logout-link"><span class="nav-icon">${getNavIconSvg("LX")}</span><span>Logout</span></a>
      </div>
    </aside>
  `;
}

window.ENTERPRISE_THEME_OPTIONS = ENTERPRISE_THEME_OPTIONS;
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;
window.closeNavbarPanels = closeNavbarPanels;
window.toggleNavbarPanel = toggleNavbarPanel;