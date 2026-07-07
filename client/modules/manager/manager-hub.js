(function managerHubBootstrap() {
  const STORE_KEYS = {
    conversations: "managerConversations",
    messages: "managerMessages",
    calls: "managerCalls",
    meetings: "managerMeetings",
    files: "managerFiles",
    locations: "managerLocations",
    reports: "managerReports",
    timeEntries: "managerTimeEntries",
    worklogs: "managerWorklogs",
    budgets: "managerBudgets",
    rewards: "managerRewards",
    tickets: "managerTickets",
    moods: "managerMoods",
    reviews: "managerReviews",
    kanban: "managerKanbanSnapshots",
    gantt: "managerGanttSnapshots",
    notifications: "managerLiveNotifications",
    auditLogs: "managerAuditLogs",
    init: "managerHubInitializedV2",
  };

  const DEFAULT_MEMBERS = [
    {
      _id: "usr-8",
      name: "Isha Deshmukh",
      email: "isha.member@enterprise.local",
      role: "MEMBER",
      department: "Development",
      status: "ACTIVE",
      skills: ["UI Systems", "Design QA"],
      experience: 4,
      workload: 58,
      attendanceRate: 96,
      performanceScore: 91,
      availability: "Available",
      currentProjects: ["OmniRetail ERP Rollout"],
      phone: "+91 98765 41021",
      profilePhoto: "../../../assets/images/default-avatar.png",
    },
    {
      _id: "usr-9",
      name: "Tanmay Pawar",
      email: "tanmay.member@enterprise.local",
      role: "MEMBER",
      department: "Development",
      status: "ACTIVE",
      skills: ["API", "Node.js", "Socket.IO"],
      experience: 5,
      workload: 71,
      attendanceRate: 94,
      performanceScore: 88,
      availability: "Busy",
      currentProjects: ["OmniRetail ERP Rollout", "FinCore Client Portal"],
      phone: "+91 98765 41022",
      profilePhoto: "../../../assets/images/default-avatar.png",
    },
    {
      _id: "usr-10",
      name: "Sakshi More",
      email: "sakshi.member@enterprise.local",
      role: "MEMBER",
      department: "Support",
      status: "ACTIVE",
      skills: ["Documentation", "Training", "Client Support"],
      experience: 3,
      workload: 42,
      attendanceRate: 98,
      performanceScore: 93,
      availability: "Available",
      currentProjects: ["FinCore Client Portal"],
      phone: "+91 98765 41023",
      profilePhoto: "../../../assets/images/default-avatar.png",
    },
    {
      _id: "usr-11",
      name: "Aftab Shaikh",
      email: "aftab.member@enterprise.local",
      role: "MEMBER",
      department: "Marketing",
      status: "ACTIVE",
      skills: ["Performance Campaigns", "SEO", "Funnel Analytics"],
      experience: 6,
      workload: 63,
      attendanceRate: 92,
      performanceScore: 86,
      availability: "Available",
      currentProjects: ["PixelNest Lead Engine"],
      phone: "+91 98765 41024",
      profilePhoto: "../../../assets/images/default-avatar.png",
    },
  ];

  let managerBootstrapPromise = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch (error) {
      return clone(fallback);
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getCurrentManager() {
    return (typeof getCurrentUser === "function" ? getCurrentUser() : null) || { name: "Manager" };
  }

  function isCurrentManagerAssignment(record = {}) {
    const current = getCurrentManager() || {};
    const currentId = String(current._id || "").trim();
    const currentEmail = String(current.email || "").trim().toLowerCase();
    const currentName = String(current.name || "").trim().toLowerCase();

    const managerId = String(record.managerId || "").trim();
    const managerEmail = String(record.managerEmail || "").trim().toLowerCase();
    const managerName = String(record.manager || "").trim().toLowerCase();

    return Boolean(
      (currentId && managerId && currentId === managerId) ||
      (currentEmail && managerEmail && currentEmail === managerEmail) ||
      (currentName && managerName && currentName === managerName),
    );
  }

  function getEnterpriseUsers() {
    return window.enterpriseStore?.getUsers?.() || [];
  }

  function getEnterpriseProjects() {
    return window.enterpriseStore?.getProjects?.() || [];
  }

  function getEnterpriseTasks() {
    return window.enterpriseStore?.getTasks?.() || [];
  }

  function getEnterpriseTeams() {
    return window.enterpriseStore?.getTeams?.() || [];
  }

  function ensureCollectionSeed(key, fallback) {
    if (localStorage.getItem(STORE_KEYS[key]) == null) {
      write(STORE_KEYS[key], fallback);
    }
  }

  function mergeManagerUsers(members = [], projects = []) {
    const existingUsers = getEnterpriseUsers();
    const currentManager = getCurrentManager();
    const projectNamesByMemberId = new Map();

    projects.forEach((project) => {
      (project.teamMemberIds || []).forEach((memberId) => {
        const key = String(memberId || "");
        if (!key) return;
        const current = projectNamesByMemberId.get(key) || [];
        if (project.projectName && !current.includes(project.projectName)) {
          current.push(project.projectName);
        }
        projectNamesByMemberId.set(key, current);
      });
    });

    const memberMap = new Map(
      members.map((member) => [
        String(member._id),
        {
          ...member,
          role: "MEMBER",
          availability: member.availability || (String(member.currentStatus || "").toLowerCase().includes("hold") ? "On Hold" : "Available"),
          performanceScore: Number(member.productivityScore || member.performanceScore || member.taskCompletionPercentage || 0),
          workload: Number(member.workload || 0),
          attendanceRate: Number(member.attendanceRate || 0),
          currentProjects: projectNamesByMemberId.get(String(member._id)) || [],
        },
      ]),
    );

    if (currentManager?._id) {
      memberMap.set(String(currentManager._id), {
        ...currentManager,
        role: "MANAGER",
        currentProjects: projects.map((project) => project.projectName).filter(Boolean),
      });
    }

    const merged = [];
    const seen = new Set();

    existingUsers.forEach((user) => {
      const key = String(user._id || "");
      if (memberMap.has(key)) {
        merged.push({ ...user, ...memberMap.get(key) });
        seen.add(key);
      } else {
        merged.push(user);
        if (key) seen.add(key);
      }
    });

    memberMap.forEach((user, key) => {
      if (!seen.has(key)) {
        merged.push(user);
      }
    });

    window.enterpriseStore?.saveUsers?.(merged);
  }

  function syncManagerSnapshotToLocal({ projects = [], tasks = [], teams = [], members = [], notifications = [], history = [] } = {}) {
    const normalizedProjects = projects.map((project) => ({
      ...project,
      status: project.status || "Planning",
      teamMemberIds: Array.isArray(project.teamMemberIds) ? project.teamMemberIds : [],
      teamMembers: Array.isArray(project.teamMembers) ? project.teamMembers : [],
    }));

    const normalizedTasks = tasks.map((task) => ({
      ...task,
      status: normalizeTaskStatus(task.status),
      tags: Array.isArray(task.tags) ? task.tags : [],
      attachments: Array.isArray(task.attachments) ? task.attachments : [],
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      estimatedHours: Number(task.metadata?.estimatedHours || task.estimatedHours || 0),
      actualHours: Number(task.metadata?.actualHours || task.actualHours || 0),
    }));

    const normalizedTeams = teams.map((team) => ({
      ...team,
      holdMembers: Array.isArray(team.holdMembers) ? team.holdMembers : [],
      members: Array.isArray(team.members) ? team.members : [],
      memberIds: Array.isArray(team.memberIds) ? team.memberIds : [],
      status: team.status || "Planning",
      managerOwned: true,
    }));

    window.enterpriseStore?.saveProjects?.(normalizedProjects);
    window.enterpriseStore?.saveTasks?.(normalizedTasks);
    window.enterpriseStore?.saveTeams?.(normalizedTeams);
    mergeManagerUsers(members, normalizedProjects);

    const budgets = normalizedProjects.map((project) => {
      const projectTasks = normalizedTasks.filter((task) => String(task.projectId || "") === String(project._id || ""));
      const allocatedBudget = Number(project.budget || 0);
      const progressRatio = Math.max(0, Math.min(1, Number(project.progress || 0) / 100));
      const usedBudget = Math.round(allocatedBudget * progressRatio);
      return {
        _id: `budget-${project._id}`,
        projectId: project._id,
        projectName: project.projectName,
        allocatedBudget,
        usedBudget,
        remainingBudget: Math.max(0, allocatedBudget - usedBudget),
        costPerTask: projectTasks.length ? Math.round(usedBudget / projectTasks.length) : 0,
      };
    });

    const kanban = normalizedTasks.map((task) => ({
      taskId: task._id,
      title: task.title,
      projectId: task.projectId,
      assignee: task.assignee,
      column: normalizeKanbanColumn(task.status),
      priority: task.priority,
      deadline: task.deadline,
    }));

    const gantt = normalizedProjects.map((project) => ({
      projectId: project._id,
      title: project.projectName,
      startDate: project.startDate,
      endDate: project.deadline,
      progress: project.progress,
      dependencies: [],
      milestones: [
        { title: "Planning Freeze", date: project.startDate || project.createdAt || nowIso() },
        { title: "Delivery Target", date: project.deadline || project.dueDate || project.updatedAt || nowIso() },
      ],
    }));

    saveCollection("budgets", budgets);
    saveCollection("kanban", kanban);
    saveCollection("gantt", gantt);
    saveCollection(
      "notifications",
      notifications.map((item) => ({
        _id: item._id,
        title: item.title || "Manager update",
        text: item.message || item.text || "",
        type: String(item.type || "info").toLowerCase(),
        createdAt: item.createdAt || nowIso(),
      })),
    );
    saveCollection(
      "auditLogs",
      history.map((item) => ({
        _id: item._id,
        action: item.actionType || item.title || "History Event",
        actor: item.actor || item.userName || item.projectName || "System",
        entityName: item.title || item.projectName || "",
        entityType: item.entityType || "History",
        note: item.details || item.clientName || "",
        createdAt: item.createdAt || nowIso(),
      })),
    );

    [
      "conversations",
      "messages",
      "calls",
      "meetings",
      "files",
      "locations",
      "reports",
      "timeEntries",
      "worklogs",
      "rewards",
      "tickets",
      "moods",
      "reviews",
    ].forEach((key) => ensureCollectionSeed(key, []));
  }

  async function hydrateManagerFromBackend() {
    if (typeof API?.get !== "function") return false;

    try {
      const [projectsRes, tasksRes, teamsRes, membersRes, notificationsRes, historyRes] = await Promise.all([
        API.get("/manager/projects"),
        API.get("/manager/tasks"),
        API.get("/manager/teams"),
        API.get("/manager/members"),
        API.get("/manager/notifications"),
        API.get("/manager/history"),
      ]);

      syncManagerSnapshotToLocal({
        projects: projectsRes?.data || [],
        tasks: tasksRes?.data || [],
        teams: teamsRes?.data || [],
        members: membersRes?.data || [],
        notifications: notificationsRes?.data || [],
        history: historyRes?.data || [],
      });
      localStorage.setItem(STORE_KEYS.init, "done");
      return true;
    } catch (error) {
      return false;
    }
  }

  function ensureUserSeed() {
    const users = getEnterpriseUsers();
    const names = new Set(users.map((item) => item.name));

    DEFAULT_MEMBERS.forEach((member) => {
      if (!names.has(member.name)) {
        window.enterpriseStore?.upsertUser?.(member);
      }
    });
  }

  async function ensureManagerMigration() {
    if (managerBootstrapPromise) return managerBootstrapPromise;

    managerBootstrapPromise = (async () => {
      const hydrated = await hydrateManagerFromBackend();
      if (hydrated) {
        return true;
      }

      if (localStorage.getItem(STORE_KEYS.init) === "done") return true;

      ensureUserSeed();

      const managerName = getCurrentManager().name || "Neha Patil";
      const users = getEnterpriseUsers().map((user) => {
        if (String(user.role || "").toUpperCase() === "TEAM_LEAD") {
          return {
            ...user,
            role: "MEMBER",
            designation: "Senior Delivery Member",
            availability: "Available",
            workload: Number(user.workload ?? 52),
            attendanceRate: Number(user.attendanceRate ?? 96),
            performanceScore: Number(user.performanceScore ?? 90),
            experience: Number(user.experience ?? 6),
            skills: Array.isArray(user.skills) ? user.skills : ["Delivery Review", "Coordination", "QA"],
            currentProjects: Array.isArray(user.currentProjects) ? user.currentProjects : ["OmniRetail ERP Rollout"],
          };
        }

        if (String(user.role || "").toUpperCase() === "MEMBER") {
          return {
            ...user,
            availability: user.availability || "Available",
            workload: Number(user.workload ?? 55),
            attendanceRate: Number(user.attendanceRate ?? 95),
            performanceScore: Number(user.performanceScore ?? 89),
            experience: Number(user.experience ?? 3),
            skills: Array.isArray(user.skills) ? user.skills : [user.department || "Execution"],
            currentProjects: Array.isArray(user.currentProjects) ? user.currentProjects : [],
          };
        }

        return user;
      });
      window.enterpriseStore?.saveUsers?.(users);

    const roles = (window.enterpriseStore?.getRoles?.() || []).filter((role) => String(role.code || "").toUpperCase() !== "TEAM_LEAD");
    if (roles.length) {
      window.enterpriseStore?.saveRoles?.(roles);
    }

    const projects = getEnterpriseProjects().map((project) => ({
      ...project,
      manager: project.manager || managerName,
      teamLead: undefined,
      teamSize: Number(project.teamSize || 0),
      status: project.status || "Planning",
    }));
    window.enterpriseStore?.saveProjects?.(projects);

    const teams = getEnterpriseTeams().map((team) => ({
      ...team,
      manager: team.manager || managerName,
      teamLead: "",
      managerOwned: true,
      status: team.status || "Active",
      members: Array.isArray(team.members) ? team.members : [],
      holdMembers: Array.isArray(team.holdMembers) ? team.holdMembers : [],
    }));
    window.enterpriseStore?.saveTeams?.(teams);

    const tasks = getEnterpriseTasks().map((task, index) => ({
      ...task,
      lead: "",
      manager: task.manager || managerName,
      status: normalizeTaskStatus(task.status),
      estimatedHours: Number(task.estimatedHours || 6 + index * 2),
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      attachments: Array.isArray(task.attachments) ? task.attachments : [],
      tags: Array.isArray(task.tags) ? task.tags : ["Delivery"],
    }));
    window.enterpriseStore?.saveTasks?.(tasks);

    const attendance = (window.enterpriseStore?.getAttendance?.() || []).map((item) => ({
      ...item,
      role: String(item.role || "").toUpperCase() === "TEAM_LEAD" ? "MEMBER" : item.role,
    }));
    if (attendance.length) window.enterpriseStore?.saveAttendance?.(attendance);

    const expenses = (window.enterpriseStore?.getExpenses?.() || []).map((item) => ({
      ...item,
      employee: item.employee === "Rohan Shinde" ? "Rohan Shinde" : item.employee,
    }));
    if (expenses.length) window.enterpriseStore?.saveExpenses?.(expenses);

    const timesheets = (window.enterpriseStore?.getTimesheets?.() || []).map((item) => ({
      ...item,
      taskTitle: item.employee === "Rohan Shinde" ? "Delivery Review Support" : item.taskTitle,
    }));
    if (timesheets.length) window.enterpriseStore?.saveTimesheets?.(timesheets);

    const baseTeams = teams.length
      ? teams
      : [
          {
            _id: "team-1",
            projectId: "prj-1",
            projectName: "OmniRetail ERP Rollout",
            name: "OmniRetail Delivery Squad",
            manager: managerName,
            department: "Development",
            status: "Active",
            members: ["Priya Joshi", "Isha Deshmukh", "Tanmay Pawar"],
            memberIds: ["usr-4", "usr-8", "usr-9"],
            skills: ["Frontend", "Backend", "QA"],
            holdMembers: [],
          },
          {
            _id: "team-2",
            projectId: "prj-2",
            projectName: "PixelNest Lead Engine",
            name: "PixelNest Growth Pod",
            manager: managerName,
            department: "Marketing",
            status: "Planning",
            members: ["Aftab Shaikh"],
            memberIds: ["usr-11"],
            skills: ["Campaigns", "SEO", "Automation"],
            holdMembers: [],
          },
        ];

    const conversations = baseTeams.map((team) => ({
      _id: `conv-${team._id}`,
      teamId: team._id,
      projectId: team.projectId || "",
      teamName: team.name,
      projectName: team.projectName,
      participants: team.members,
      unreadCount: 0,
      pinnedMessages: [],
      lastMessage: "Manager hub activated for this team.",
      updatedAt: nowIso(),
    }));

    const messages = conversations.flatMap((conversation) => [
      {
        _id: uid("msg"),
        conversationId: conversation._id,
        senderId: "usr-2",
        senderName: managerName,
        type: "text",
        text: `Welcome team. This ${conversation.projectName} channel now includes chat, calls, meetings, files, and location history.`,
        attachments: [],
        reactions: ["👍 3", "🔥 1"],
        createdAt: nowIso(),
        edited: false,
        deleted: false,
        readBy: conversation.participants,
      },
    ]);

    const calls = [
      {
        _id: "call-1",
        teamId: "team-1",
        projectId: "prj-1",
        title: "OmniRetail Daily Voice Sync",
        callerId: "usr-2",
        callerName: managerName,
        participantIds: ["usr-4", "usr-8", "usr-9"],
        participantNames: ["Priya Joshi", "Isha Deshmukh", "Tanmay Pawar"],
        callType: "VOICE",
        status: "Completed",
        startTime: "2026-05-14T08:30:00.000Z",
        endTime: "2026-05-14T08:52:00.000Z",
        duration: 22,
        notes: "Reviewed blockers and reassigned backend API dependencies.",
      },
    ];

    const meetings = [
      {
        _id: "meet-1",
        teamId: "team-1",
        projectId: "prj-1",
        topic: "OmniRetail Weekly Delivery Review",
        agenda: "Milestone health, pending risks, and client review prep.",
        meetingType: "VIDEO",
        status: "Scheduled",
        dateTime: "2026-05-15T11:00:00.000Z",
        participants: ["Priya Joshi", "Isha Deshmukh", "Tanmay Pawar"],
        joinLink: "https://meet.enterprise.local/omniretail-weekly",
        recordingLink: "",
        notes: "",
        decisions: ["Finalize dashboard QA", "Freeze API contract by evening"],
        attendance: [],
      },
    ];

    const files = [
      {
        _id: "file-1",
        projectId: "prj-1",
        teamId: "team-1",
        uploadedBy: managerName,
        uploadedById: "usr-2",
        name: "omni-dashboard-spec-v3.pdf",
        originalName: "Omni Dashboard Spec v3.pdf",
        mimeType: "application/pdf",
        sizeLabel: "2.4 MB",
        storageUrl: "#",
        category: "Specification",
        relatedTo: "Project",
        createdAt: nowIso(),
      },
    ];

    const locations = [
      {
        _id: "loc-1",
        projectId: "prj-3",
        teamId: "",
        sharedBy: "Sakshi More",
        sharedById: "usr-10",
        latitude: 19.9975,
        longitude: 73.7898,
        address: "Nashik, Maharashtra",
        createdAt: nowIso(),
        note: "Client training visit in progress.",
      },
    ];

    const reports = [
      {
        _id: "rep-1",
        title: "Team Productivity Report",
        format: "PDF",
        generatedAt: nowIso(),
        summary: "Active squads are stable. OmniRetail needs tighter deadline control.",
      },
    ];

    const timeEntries = [
      {
        _id: "time-entry-1",
        memberName: "Priya Joshi",
        memberId: "usr-4",
        projectId: "prj-1",
        taskId: "tsk-1",
        taskTitle: "UI Design",
        startedAt: "2026-05-14T04:00:00.000Z",
        endedAt: "2026-05-14T08:30:00.000Z",
        durationMinutes: 270,
        status: "Stopped",
      },
      {
        _id: "time-entry-2",
        memberName: "Tanmay Pawar",
        memberId: "usr-9",
        projectId: "prj-1",
        taskId: "tsk-2",
        taskTitle: "Backend API",
        startedAt: "2026-05-14T05:00:00.000Z",
        endedAt: "2026-05-14T09:15:00.000Z",
        durationMinutes: 255,
        status: "Stopped",
      },
    ];

    const worklogs = [
      {
        _id: "worklog-1",
        memberName: "Priya Joshi",
        taskTitle: "UI Design",
        projectName: "OmniRetail ERP Rollout",
        hoursSpent: 4.5,
        comments: "Dashboard cards and responsive grid refined.",
        date: "2026-05-14",
      },
      {
        _id: "worklog-2",
        memberName: "Tanmay Pawar",
        taskTitle: "Backend API",
        projectName: "OmniRetail ERP Rollout",
        hoursSpent: 4.25,
        comments: "Socket payload validation and auth middleware updated.",
        date: "2026-05-14",
      },
    ];

    const budgets = projects.map((project, index) => ({
      _id: `budget-${project._id}`,
      projectId: project._id,
      projectName: project.projectName,
      allocatedBudget: Number(project.budget || 0),
      usedBudget: Math.round(Number(project.budget || 0) * (0.34 + index * 0.08)),
      remainingBudget: 0,
      costPerTask: 0,
    })).map((item) => ({
      ...item,
      remainingBudget: Math.max(0, item.allocatedBudget - item.usedBudget),
      costPerTask: Math.round(item.usedBudget / Math.max(1, tasks.filter((task) => task.projectId === item.projectId).length)),
    }));

    const rewards = [
      {
        _id: "reward-1",
        memberName: "Sakshi More",
        badge: "Best Collaborator",
        reason: "Consistent client support and strong cross-team updates.",
        createdAt: nowIso(),
      },
      {
        _id: "reward-2",
        memberName: "Priya Joshi",
        badge: "Top Performer",
        reason: "High quality dashboard delivery and review consistency.",
        createdAt: nowIso(),
      },
    ];

    const tickets = [
      {
        _id: "ticket-1",
        title: "CRM sandbox access required",
        type: "Access Request",
        raisedBy: "Tanmay Pawar",
        projectName: "OmniRetail ERP Rollout",
        priority: "High",
        status: "Open",
        createdAt: nowIso(),
      },
      {
        _id: "ticket-2",
        title: "Need client test data refresh",
        type: "Blocker",
        raisedBy: "Sakshi More",
        projectName: "FinCore Client Portal",
        priority: "Medium",
        status: "In Review",
        createdAt: nowIso(),
      },
    ];

    const moods = [
      { _id: "mood-1", memberName: "Priya Joshi", mood: "Happy", note: "Design flow is stable today.", createdAt: nowIso() },
      { _id: "mood-2", memberName: "Tanmay Pawar", mood: "Stressed", note: "Dependency on test environment.", createdAt: nowIso() },
      { _id: "mood-3", memberName: "Sakshi More", mood: "Neutral", note: "Client docs follow-up pending.", createdAt: nowIso() },
    ];

    const reviews = [
      {
        _id: "review-1",
        memberName: "Priya Joshi",
        topic: "Monthly 1-on-1",
        goals: ["Improve delivery velocity without quality loss", "Mentor one junior member"],
        concerns: ["Need earlier API readiness"],
        promotionDiscussion: "Track for senior ownership next quarter.",
        createdAt: nowIso(),
      },
    ];

    const kanban = tasks.map((task) => ({
      taskId: task._id,
      title: task.title,
      projectId: task.projectId,
      assignee: task.assignee,
      column: normalizeKanbanColumn(task.status),
      priority: task.priority,
      deadline: task.deadline,
    }));

    const gantt = projects.map((project) => ({
      projectId: project._id,
      title: project.projectName,
      startDate: project.startDate,
      endDate: project.deadline,
      progress: project.progress,
      dependencies: [],
      milestones: [
        { title: "Planning Freeze", date: project.startDate },
        { title: "Delivery Target", date: project.deadline },
      ],
    }));

    const auditLogs = [
      {
        _id: "audit-1",
        action: "Manager Flow Activated",
        actor: managerName,
        entityType: "Workspace",
        entityName: "Manager Module",
        createdAt: nowIso(),
        note: "Team lead dependency removed from manager delivery flow.",
      },
    ];

    const notifications = [
      {
        _id: "notify-1",
        title: "Manager workspace upgraded",
        text: "Chat, calls, meetings, files, locations, and analytics are ready.",
        type: "success",
        createdAt: nowIso(),
      },
    ];

    write(STORE_KEYS.conversations, conversations);
    write(STORE_KEYS.messages, messages);
    write(STORE_KEYS.calls, calls);
    write(STORE_KEYS.meetings, meetings);
    write(STORE_KEYS.files, files);
    write(STORE_KEYS.locations, locations);
    write(STORE_KEYS.reports, reports);
    write(STORE_KEYS.timeEntries, timeEntries);
    write(STORE_KEYS.worklogs, worklogs);
    write(STORE_KEYS.budgets, budgets);
    write(STORE_KEYS.rewards, rewards);
    write(STORE_KEYS.tickets, tickets);
    write(STORE_KEYS.moods, moods);
    write(STORE_KEYS.reviews, reviews);
    write(STORE_KEYS.kanban, kanban);
    write(STORE_KEYS.gantt, gantt);
      write(STORE_KEYS.auditLogs, auditLogs);
      write(STORE_KEYS.notifications, notifications);
      localStorage.setItem(STORE_KEYS.init, "done");
      return true;
    })();

    return managerBootstrapPromise;
  }

  function normalizeTaskStatus(status) {
    const value = String(status || "").trim().toLowerCase();
    const map = {
      active: "In Progress",
      planning: "To Do",
      pending: "To Do",
      "in review": "In Review",
      completed: "Completed",
      blocked: "Blocked",
      approved: "Completed",
    };
    return map[value] || status || "To Do";
  }

  function normalizeKanbanColumn(status) {
    const normalized = normalizeTaskStatus(status);
    if (normalized === "In Progress") return "In Progress";
    if (normalized === "In Review") return "Review";
    if (normalized === "Completed") return "Completed";
    return "To Do";
  }

  function getCollection(key) {
    ensureManagerMigration();
    return read(STORE_KEYS[key], []);
  }

  function saveCollection(key, value) {
    ensureManagerMigration();
    return clone(write(STORE_KEYS[key], value));
  }

  function upsertCollectionRecord(key, record) {
    const items = getCollection(key);
    const nextRecord = { ...record, _id: record._id || uid(key.slice(0, 3)) };
    const index = items.findIndex((item) => item._id === nextRecord._id);
    if (index >= 0) items[index] = nextRecord;
    else items.unshift(nextRecord);
    saveCollection(key, items);
    return clone(nextRecord);
  }

  function getManagerProjects() {
    ensureManagerMigration();
    const teams = getEnterpriseTeams();
    const tasks = getEnterpriseTasks();
    return getEnterpriseProjects()
      .filter((project) => isCurrentManagerAssignment(project))
      .map((project) => {
      const projectTeams = teams.filter((team) => String(team.projectId || "") === String(project._id));
      const projectTasks = tasks.filter((task) => String(task.projectId || "") === String(project._id));
      return {
        ...project,
        teamSize: projectTeams.reduce((sum, team) => sum + (team.members || []).length, 0),
        openTasks: projectTasks.filter((task) => task.status !== "Completed").length,
        completedTasks: projectTasks.filter((task) => task.status === "Completed").length,
        overdueTasks: projectTasks.filter((task) => task.status !== "Completed" && new Date(task.deadline) < new Date()).length,
      };
    });
  }

  function getManagerMembers() {
    ensureManagerMigration();
    return getEnterpriseUsers().filter((user) => String(user.role || "").toUpperCase() === "MEMBER");
  }

  function getManagerTeams() {
    ensureManagerMigration();
    const projectIds = new Set(getManagerProjects().map((project) => String(project._id)));
    return getEnterpriseTeams()
      .filter((team) => projectIds.has(String(team.projectId || "")) || isCurrentManagerAssignment(team))
      .map((team) => ({
      ...team,
      holdMembers: Array.isArray(team.holdMembers) ? team.holdMembers : [],
    }));
  }

  function getManagerTasks() {
    ensureManagerMigration();
    const projectIds = new Set(getManagerProjects().map((project) => String(project._id)));
    return getEnterpriseTasks()
      .filter((task) => projectIds.has(String(task.projectId || "")) || isCurrentManagerAssignment(task))
      .map((task) => ({
      ...task,
      status: normalizeTaskStatus(task.status),
      tags: Array.isArray(task.tags) ? task.tags : [],
      attachments: Array.isArray(task.attachments) ? task.attachments : [],
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
    }));
  }

  function getConversations() {
    return getCollection("conversations");
  }

  function getMessages(conversationId) {
    return getCollection("messages").filter((message) => message.conversationId === conversationId);
  }

  function saveTeam(team) {
    ensureManagerMigration();
    const nextTeam = {
      ...team,
      teamLead: "",
      managerOwned: true,
      holdMembers: Array.isArray(team.holdMembers) ? team.holdMembers : [],
    };
    window.enterpriseStore?.upsertTeam?.(nextTeam);

    const project = getEnterpriseProjects().find((item) => item._id === nextTeam.projectId);
    if (project) {
      window.enterpriseStore?.upsertProject?.({
        ...project,
        teamId: nextTeam._id,
        teamName: nextTeam.name,
        teamSize: (nextTeam.members || []).length,
      });
    }

    const users = getEnterpriseUsers();
    users.forEach((user) => {
      const isMember = (nextTeam.members || []).includes(user.name);
      if (String(user.role || "").toUpperCase() === "MEMBER" && isMember) {
        window.enterpriseStore?.upsertUser?.({
          ...user,
          teamId: nextTeam._id,
          teamName: nextTeam.name,
          currentProjects: Array.from(new Set([...(user.currentProjects || []), nextTeam.projectName].filter(Boolean))),
        });
      }
    });

    let conversations = getConversations();
    const existing = conversations.find((item) => item.teamId === nextTeam._id);
    const conversation = existing || {
      _id: `conv-${nextTeam._id}`,
      teamId: nextTeam._id,
      projectId: nextTeam.projectId || "",
      teamName: nextTeam.name,
      projectName: nextTeam.projectName || "",
      participants: nextTeam.members || [],
      unreadCount: 0,
      pinnedMessages: [],
      lastMessage: "Team room created by manager.",
      updatedAt: nowIso(),
    };
    if (existing) {
      conversation.teamName = nextTeam.name;
      conversation.projectName = nextTeam.projectName || conversation.projectName;
      conversation.participants = nextTeam.members || [];
      conversation.updatedAt = nowIso();
    }
    conversations = existing
      ? conversations.map((item) => (item._id === conversation._id ? conversation : item))
      : [conversation].concat(conversations);
    saveCollection("conversations", conversations);

    addAuditLog("Team Saved", nextTeam.name, "Team", `${(nextTeam.members || []).length} members aligned by manager.`);
    addNotification("Team created successfully", `${nextTeam.name} is now active for ${nextTeam.projectName}.`, "success");
    return clone(nextTeam);
  }

  function saveTask(task) {
    const team = getManagerTeams().find((item) => String(item.projectId || "") === String(task.projectId || ""));
    const allowedMembers = new Set(team?.members || []);
    const assignee = allowedMembers.size && task.assignee && !allowedMembers.has(task.assignee) ? "" : task.assignee;
    const nextTask = {
      ...task,
      assignee,
      lead: "",
      status: normalizeTaskStatus(task.status),
      updatedAt: nowIso(),
    };
    window.enterpriseStore?.upsertTask?.(nextTask);
    addAuditLog("Task Assigned", nextTask.title, "Task", `Assigned to ${nextTask.assignee || "unassigned"} by manager.`);
    addNotification("Task assigned", `${nextTask.title} updated for ${nextTask.projectName}.`, "success");
    return clone(nextTask);
  }

  function addMessage(payload) {
    const messages = getCollection("messages");
    const conversations = getConversations();
    const message = {
      _id: uid("msg"),
      type: payload.type || "text",
      attachments: payload.attachments || [],
      reactions: [],
      edited: false,
      deleted: false,
      readBy: payload.readBy || [],
      createdAt: nowIso(),
      ...payload,
    };
    saveCollection("messages", [message].concat(messages));
    saveCollection(
      "conversations",
      conversations.map((conversation) =>
        conversation._id === payload.conversationId
          ? {
              ...conversation,
              lastMessage: payload.type === "text" ? payload.text : `${payload.type} shared`,
              updatedAt: message.createdAt,
            }
          : conversation,
      ),
    );
    addNotification("New message received", `${payload.senderName} sent an update in team chat.`, "info");
    return clone(message);
  }

  function addCall(payload) {
    const record = upsertCollectionRecord("calls", {
      duration: 0,
      status: "Scheduled",
      callType: "VOICE",
      ...payload,
      createdAt: payload.createdAt || nowIso(),
    });
    addNotification("Incoming call", `${record.title} is ready for the team.`, "info");
    addAuditLog("Call Logged", record.title, "Call", `${record.callType} room prepared for ${record.projectId || "manager workspace"}.`);
    return record;
  }

  function addMeeting(payload) {
    const record = upsertCollectionRecord("meetings", {
      status: "Scheduled",
      meetingType: "VIDEO",
      participants: [],
      decisions: [],
      attendance: [],
      ...payload,
      createdAt: payload.createdAt || nowIso(),
    });
    addNotification("Meeting scheduled", `${record.topic} is on the calendar.`, "success");
    addAuditLog("Meeting Scheduled", record.topic, "Meeting", `${record.meetingType} meeting saved with permanent history.`);
    return record;
  }

  function addFile(payload) {
    const record = upsertCollectionRecord("files", {
      createdAt: nowIso(),
      relatedTo: "Project",
      ...payload,
    });
    addNotification("File uploaded", `${record.originalName || record.name} is available in file hub.`, "success");
    addAuditLog("File Uploaded", record.originalName || record.name, "File", `Linked to ${record.relatedTo}.`);
    return record;
  }

  function addLocation(payload) {
    const record = upsertCollectionRecord("locations", {
      createdAt: nowIso(),
      ...payload,
    });
    addNotification("Location shared", `${record.sharedBy} shared a live location.`, "info");
    addAuditLog("Location Shared", record.address || "Unknown address", "Location", `Coordinates ${record.latitude}, ${record.longitude}`);
    return record;
  }

  function addReport(payload) {
    return upsertCollectionRecord("reports", {
      generatedAt: nowIso(),
      ...payload,
    });
  }

  function addTimeEntry(payload) {
    const record = upsertCollectionRecord("timeEntries", {
      createdAt: nowIso(),
      status: "Stopped",
      durationMinutes: 0,
      ...payload,
    });
    syncWorklogFromTimeEntry(record);
    return record;
  }

  function syncWorklogFromTimeEntry(entry) {
    const hoursSpent = Math.round(((Number(entry.durationMinutes || 0) / 60) || 0) * 100) / 100;
    if (!hoursSpent) return null;

    return upsertCollectionRecord("worklogs", {
      _id: `worklog-${entry._id}`,
      memberName: entry.memberName,
      taskTitle: entry.taskTitle,
      projectName: getManagerProjects().find((project) => project._id === entry.projectId)?.projectName || "",
      hoursSpent,
      comments: entry.comment || "Generated from timer entry.",
      date: String(entry.endedAt || entry.startedAt || nowIso()).slice(0, 10),
    });
  }

  function addTicket(payload) {
    const record = upsertCollectionRecord("tickets", {
      createdAt: nowIso(),
      status: "Open",
      ...payload,
    });
    addAuditLog("Ticket Raised", record.title, "Ticket", `${record.type} raised by ${record.raisedBy}.`);
    addNotification("Ticket raised", `${record.title} has been submitted.`, "info");
    return record;
  }

  function addMood(payload) {
    return upsertCollectionRecord("moods", {
      createdAt: nowIso(),
      ...payload,
    });
  }

  function addReward(payload) {
    const record = upsertCollectionRecord("rewards", {
      createdAt: nowIso(),
      ...payload,
    });
    addNotification("Reward updated", `${record.badge} awarded to ${record.memberName}.`, "success");
    return record;
  }

  function addReview(payload) {
    const record = upsertCollectionRecord("reviews", {
      createdAt: nowIso(),
      ...payload,
    });
    addAuditLog("1-on-1 Review Saved", record.memberName, "Review", record.topic || "Review session");
    return record;
  }

  function updateKanbanTask(taskId, column) {
    const items = getCollection("kanban");
    const nextItems = items.map((item) => (item.taskId === taskId ? { ...item, column } : item));
    saveCollection("kanban", nextItems);

    const task = getManagerTasks().find((item) => item._id === taskId);
    if (task) {
      const nextStatusMap = {
        "To Do": "To Do",
        "In Progress": "In Progress",
        Review: "In Review",
        Completed: "Completed",
      };
      window.enterpriseStore?.upsertTask?.({
        ...task,
        status: nextStatusMap[column] || task.status,
      });
      addAuditLog("Kanban Status Updated", task.title, "Task", `Moved to ${column}`);
      addNotification("Task board updated", `${task.title} moved to ${column}.`, "success");
    }
  }

  function updateGanttProject(projectId, payload) {
    const items = getCollection("gantt");
    const nextItems = items.map((item) => (item.projectId === projectId ? { ...item, ...payload } : item));
    saveCollection("gantt", nextItems);
    const project = getManagerProjects().find((item) => item._id === projectId);
    if (project) {
      window.enterpriseStore?.upsertProject?.({
        ...project,
        startDate: payload.startDate || project.startDate,
        deadline: payload.endDate || project.deadline,
      });
    }
  }

  function addAuditLog(action, entityName, entityType, note) {
    return upsertCollectionRecord("auditLogs", {
      action,
      actor: getCurrentManager().name || "Manager",
      entityName,
      entityType,
      note,
      createdAt: nowIso(),
    });
  }

  function addNotification(title, text, type) {
    const notification = upsertCollectionRecord("notifications", {
      title,
      text,
      type,
      createdAt: nowIso(),
    });
    if (typeof showToast === "function") {
      showToast(title, type || "info", { description: text, title });
    }
    return notification;
  }

  function removeMemberFromTeam(teamId, memberName) {
    const team = getManagerTeams().find((item) => item._id === teamId);
    if (!team) return null;

    const nextTeam = {
      ...team,
      members: (team.members || []).filter((item) => item !== memberName),
      memberIds: (team.memberIds || []).filter((memberId) => {
        const user = getManagerMembers().find((item) => item._id === memberId);
        return user?.name !== memberName;
      }),
    };
    saveTeam(nextTeam);

    const nextTasks = getManagerTasks().map((task) =>
      String(task.projectId || "") === String(team.projectId || "") && task.assignee === memberName
        ? { ...task, assignee: "", status: "To Do" }
        : task,
    );
    window.enterpriseStore?.saveTasks?.(nextTasks);
    addAuditLog("Member Removed", memberName, "Team Member", `Open tasks were unassigned from ${team.name}.`);
    addNotification("Member removed", `${memberName} was removed from ${team.name}.`, "warning");
    return clone(nextTeam);
  }

  function holdMember(teamId, memberName, reason) {
    const team = getManagerTeams().find((item) => item._id === teamId);
    if (!team) return null;
    const holdMembers = Array.isArray(team.holdMembers) ? team.holdMembers : [];
    const nextTeam = {
      ...team,
      holdMembers: holdMembers.some((item) => item.name === memberName)
        ? holdMembers
        : holdMembers.concat({
            name: memberName,
            reason,
            createdAt: nowIso(),
          }),
    };
    saveTeam(nextTeam);
    addAuditLog("Member On Hold", memberName, "Team Member", reason || "No reason provided");
    addNotification("Member on hold", `${memberName} is now on hold.`, "warning");
    return clone(nextTeam);
  }

  function shiftMember(teamId, memberName, nextProjectId) {
    const teams = getManagerTeams();
    const currentTeam = teams.find((item) => item._id === teamId);
    const targetProject = getManagerProjects().find((project) => project._id === nextProjectId);
    if (!currentTeam || !targetProject) return null;

    const targetTeam =
      teams.find((item) => String(item.projectId || "") === String(nextProjectId)) ||
      {
        _id: uid("team"),
        projectId: targetProject._id,
        projectName: targetProject.projectName,
        name: `${targetProject.projectName} Core Team`,
        manager: getCurrentManager().name || "Manager",
        department: targetProject.department,
        status: "Planning",
        members: [],
        memberIds: [],
        skills: [],
        holdMembers: [],
      };

    saveTeam({
      ...currentTeam,
      members: (currentTeam.members || []).filter((item) => item !== memberName),
      memberIds: (currentTeam.memberIds || []).filter((memberId) => {
        const member = getManagerMembers().find((item) => item._id === memberId);
        return member?.name !== memberName;
      }),
    });

    const shiftedMember = getManagerMembers().find((member) => member.name === memberName);
    const nextTargetMemberIds = Array.from(new Set((targetTeam.memberIds || []).concat(shiftedMember?._id || []).filter(Boolean)));
    const nextTargetMembers = Array.from(new Set((targetTeam.members || []).concat(memberName)));
    saveTeam({
      ...targetTeam,
      members: nextTargetMembers,
      memberIds: nextTargetMemberIds,
      status: "Active",
    });

    addAuditLog("Member Shifted", memberName, "Team Member", `${memberName} moved from ${currentTeam.projectName} to ${targetProject.projectName}.`);
    addNotification("Member shifted", `${memberName} moved to ${targetProject.projectName}.`, "success");
    return clone(targetTeam);
  }

  function getDashboardStats() {
    const projects = getManagerProjects();
    const teams = getManagerTeams();
    const tasks = getManagerTasks();
    const meetings = getCollection("meetings");
    const calls = getCollection("calls");
    const files = getCollection("files");
    const locations = getCollection("locations");
    const members = getManagerMembers();

    return {
      assignedProjects: projects.length,
      pendingProjects: projects.filter((project) => ["Planning", "On Hold"].includes(project.status)).length,
      teamMembers: members.length,
      openTasks: tasks.filter((task) => !["Completed"].includes(task.status)).length,
      completedTasks: tasks.filter((task) => task.status === "Completed").length,
      overdueTasks: tasks.filter((task) => task.status !== "Completed" && new Date(task.deadline) < new Date()).length,
      upcomingMeetings: meetings.filter((item) => new Date(item.dateTime || item.createdAt) >= new Date()).length,
      teamProductivity: members.length
        ? Math.round(members.reduce((sum, member) => sum + Number(member.performanceScore || 0), 0) / members.length)
        : 0,
      activeCalls: calls.filter((item) => item.status === "Live").length,
      sharedFiles: files.length,
      sharedLocations: locations.length,
      activeTeams: teams.filter((team) => team.status !== "Planning").length,
      projects,
      tasks,
      teams,
      meetings,
      calls,
    };
  }

  function getRecommendationSnapshot(projectId = "") {
    const targetProject = getManagerProjects().find((project) => !projectId || project._id === projectId) || getManagerProjects()[0];
    const members = getManagerMembers();
    const keywords = `${targetProject?.department || ""} ${targetProject?.description || ""} ${targetProject?.projectName || ""}`.toLowerCase();
    return members
      .map((member) => {
        const skillMatch = Math.min(
          99,
          40 +
            (member.skills || []).reduce((sum, skill) => sum + (keywords.includes(String(skill).toLowerCase()) ? 18 : 0), 0) +
            Math.max(0, 18 - Math.floor(Number(member.workload || 0) / 10)),
        );
        return {
          memberId: member._id,
          memberName: member.name,
          department: member.department,
          skillMatch,
          availability: member.availability || "Available",
          currentWorkload: Number(member.workload || 0),
          availableHours: Math.max(0, 8 - Math.round((Number(member.workload || 0) / 100) * 8)),
          experience: Number(member.experience || 0),
          performanceScore: Number(member.performanceScore || 0),
          attendanceRate: Number(member.attendanceRate || 0),
          leaveBalance: 8,
          conflictWarning: Number(member.workload || 0) > 80 ? "Potential overload" : "",
          currentProjects: member.currentProjects || [],
        };
      })
      .sort((a, b) => b.skillMatch - a.skillMatch);
  }

  function getWorkloadSnapshot() {
    return getManagerMembers().map((member) => ({
      memberName: member.name,
      totalWorkload: Number(member.workload || 0),
      availableHours: Math.max(0, 8 - Math.round((Number(member.workload || 0) / 100) * 8)),
      conflictWarning: Number(member.workload || 0) > 85 ? "Overloaded" : Number(member.workload || 0) < 35 ? "Underutilized" : "",
      projectSplit: (member.currentProjects || []).map((projectName, index) => ({
        projectName,
        percent: Math.max(20, Math.round((Number(member.workload || 0) / Math.max(1, (member.currentProjects || []).length)) + index * 3)),
      })),
    }));
  }

  function getRiskAlerts() {
    const tasks = getManagerTasks();
    const budgets = getCollection("budgets");
    const moods = getCollection("moods");
    const analytics = getAnalyticsSnapshot();
    const meetings = getCollection("meetings");
    const alerts = [];

    tasks
      .filter((task) => task.status !== "Completed" && new Date(task.deadline || 0) < new Date())
      .forEach((task) => alerts.push({ severity: "high", title: "Task overdue", detail: `${task.title} is overdue in ${task.projectName}.` }));

    analytics
      .filter((row) => row.productivityScore < 75)
      .forEach((row) => alerts.push({ severity: "medium", title: "Low productivity", detail: `${row.memberName} is below target productivity.` }));

    budgets
      .filter((budget) => budget.usedBudget > budget.allocatedBudget * 0.85)
      .forEach((budget) => alerts.push({ severity: "medium", title: "Budget threshold", detail: `${budget.projectName} has consumed more than 85% budget.` }));

    moods
      .filter((mood) => mood.mood === "Stressed")
      .forEach((mood) => alerts.push({ severity: "medium", title: "Team stress signal", detail: `${mood.memberName} marked mood as stressed.` }));

    meetings
      .filter((meeting) => meeting.status === "Scheduled" && new Date(meeting.dateTime || 0) < new Date())
      .forEach((meeting) => alerts.push({ severity: "low", title: "Meeting follow-up", detail: `${meeting.topic} is past scheduled time and needs update.` }));

    return alerts;
  }

  function getBudgetSnapshot() {
    return getCollection("budgets");
  }

  function getLeaderboard() {
    return getAnalyticsSnapshot()
      .map((row) => ({
        ...row,
        rewards: getCollection("rewards").filter((reward) => reward.memberName === row.memberName),
      }))
      .sort((a, b) => b.productivityScore - a.productivityScore);
  }

  function getTimeTrackingSnapshot() {
    const timeEntries = getCollection("timeEntries");
    const worklogs = getCollection("worklogs");
    const tasks = getManagerTasks();
    return {
      timeEntries,
      worklogs,
      totals: {
        estimatedHours: tasks.reduce((sum, task) => sum + Number(task.estimatedHours || 0), 0),
        actualHours: Math.round((worklogs.reduce((sum, item) => sum + Number(item.hoursSpent || 0), 0)) * 100) / 100,
      },
    };
  }

  function getAnalyticsSnapshot() {
    const teams = getManagerTeams();
    const tasks = getManagerTasks();
    const members = getManagerMembers();
    const conversations = getConversations();
    const meetings = getCollection("meetings");

    return members.map((member) => {
      const memberTasks = tasks.filter((task) => task.assignee === member.name);
      const completed = memberTasks.filter((task) => task.status === "Completed").length;
      const onTime = memberTasks.filter((task) => task.status === "Completed" || new Date(task.deadline) >= new Date()).length;
      const linkedTeams = teams.filter((team) => (team.members || []).includes(member.name)).map((team) => team.name);
      const chatActivity = conversations.filter((conversation) => (conversation.participants || []).includes(member.name)).length;
      const attendance = Number(member.attendanceRate || 0);
      return {
        memberName: member.name,
        department: member.department,
        taskCompletionRate: memberTasks.length ? Math.round((completed / memberTasks.length) * 100) : 0,
        onTimeDelivery: memberTasks.length ? Math.round((onTime / memberTasks.length) * 100) : 100,
        qualityScore: Number(member.performanceScore || 0),
        attendanceRate: attendance,
        leaveCount: 1,
        responseTime: `${Math.max(8, 30 - chatActivity * 3)} min`,
        chatActivity,
        meetingAttendance: meetings.length ? Math.min(100, 78 + linkedTeams.length * 7) : 0,
        productivityScore: Math.round((Number(member.performanceScore || 0) + attendance) / 2),
        currentWorkload: Number(member.workload || 0),
        availability: member.availability || "Available",
        linkedTeams,
      };
    });
  }

  function getNotifications() {
    return getCollection("notifications");
  }

  function getAuditLogs() {
    return getCollection("auditLogs");
  }

  window.managerHub = {
    ensureManagerMigration,
    getManagerProjects,
    getManagerMembers,
    getManagerTeams,
    getManagerTasks,
    getConversations,
    getMessages,
    getCalls: () => getCollection("calls"),
    getMeetings: () => getCollection("meetings"),
    getFiles: () => getCollection("files"),
    getLocations: () => getCollection("locations"),
    getReports: () => getCollection("reports"),
    getTimeEntries: () => getCollection("timeEntries"),
    getWorklogs: () => getCollection("worklogs"),
    getBudgets: getBudgetSnapshot,
    getRewards: () => getCollection("rewards"),
    getTickets: () => getCollection("tickets"),
    getMoods: () => getCollection("moods"),
    getReviews: () => getCollection("reviews"),
    getKanban: () => getCollection("kanban"),
    getGantt: () => getCollection("gantt"),
    getNotifications,
    getAuditLogs,
    getDashboardStats,
    getAnalyticsSnapshot,
    getRecommendationSnapshot,
    getWorkloadSnapshot,
    getRiskAlerts,
    getLeaderboard,
    getTimeTrackingSnapshot,
    saveTeam,
    saveTask,
    addMessage,
    addCall,
    addMeeting,
    addFile,
    addLocation,
    addReport,
    addTimeEntry,
    addTicket,
    addMood,
    addReward,
    addReview,
    addNotification,
    addAuditLog,
    updateKanbanTask,
    updateGanttProject,
    removeMemberFromTeam,
    holdMember,
    shiftMember,
  };
})();
