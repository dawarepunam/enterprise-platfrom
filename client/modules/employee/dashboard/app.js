// Employee Dashboard Application Logic

document.addEventListener("DOMContentLoaded", () => {
  initLiveClock();
  initDashboardData();
});

// Live Clock & Date
function initLiveClock() {
  const dateDisplay = document.getElementById("liveDateDisplay");
  const clockDisplay = document.getElementById("liveClockDisplay");

  function updateTime() {
    const now = new Date();

    // Date format: Monday, 1 July 2026
    const opts = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    dateDisplay.innerText = now.toLocaleDateString("en-GB", opts);

    // Time format: 09:46 AM
    clockDisplay.innerText = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  updateTime();
  setInterval(updateTime, 1000);
}

// Fetch and render data
async function initDashboardData() {
  const user = window.getUser
    ? window.getUser()
    : {
        firstName: "Rahul",
        role: "SOFTWARE_DEVELOPER",
        employeeId: "EMP10045",
      };

  // Update User Info
  document.getElementById("userNameDisplay").innerText =
    user.firstName || "Employee";
  document.getElementById("userRoleInfo").innerText = (
    user.role || "Software Developer"
  ).replace("_", " ");
  document.getElementById("userIdInfo").innerText =
    "Employee ID: " + (user.employeeId || "EMP10045");

  // Try fetching real data if APIs exist, fallback to robust mock data.
  try {
    const projRes = await fetch("/api/projects/employee", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    const taskRes = await fetch("/api/tasks?assignedToMe=true&size=20", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    // For now we will just populate mock data immediately since APIs might not cover everything.
    populateMockData();
  } catch (err) {
    populateMockData();
  }
}

function populateMockData() {
  // Timeline Data
  const tlData = [
    { time: "09:00 AM", text: "Check-in", type: "green" },
    {
      time: "11:00 AM",
      text: "Sprint Meeting",
      type: "blue",
      action: "Join",
      icon: "fa-video",
    },
    { time: "01:00 PM", text: "Lunch Break", type: "orange" },
    {
      time: "02:30 PM",
      text: "Client Demo",
      type: "blue",
      action: "Join",
      icon: "fa-video",
    },
    { time: "05:30 PM", text: "Task Review", type: "orange" },
    { time: "06:30 PM", text: "Check-out", type: "red" },
  ];

  const tlContainer = document.getElementById("scheduleTimeline");
  tlContainer.innerHTML = tlData
    .map(
      (item) => `
    <div class="tl-item">
      <div class="tl-dot ${item.type}"></div>
      <div class="tl-time">${item.time}</div>
      <div class="tl-content">
        ${item.text}
        ${
          item.action
            ? `
          <div class="tl-actions">
            <button class="tl-btn" onclick="window.open('https://teams.microsoft.com','_blank')">${item.action}</button>
            <i class="fa ${item.icon} tl-icon"></i>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `,
    )
    .join("");

  // Activity Feed Data
  const actData = [
    {
      title: 'Task "API Integration" assigned to you',
      sub: "By Priya Mehta",
      time: "10 min ago",
      type: "blue",
      icon: "fa-clipboard-check",
    },
    {
      title: "Daily update submitted for CRM Project",
      sub: "",
      time: "10:15 AM",
      type: "green",
      icon: "fa-file-alt",
    },
    {
      title: "Leave request approved",
      sub: "Casual Leave - 2 July 2026",
      time: "Yesterday",
      type: "orange",
      icon: "fa-calendar-check",
    },
    {
      title: "Design Files.zip uploaded in CRM Project",
      sub: "",
      time: "Yesterday",
      type: "purple",
      icon: "fa-file-archive",
    },
    {
      title: "Sprint Meeting scheduled",
      sub: "Today at 11:00 AM",
      time: "Yesterday",
      type: "blue",
      icon: "fa-calendar-plus",
    },
  ];

  const actContainer = document.getElementById("recentActivityList");
  actContainer.innerHTML = actData
    .map(
      (item) => `
    <div class="act-item" onclick="location='/employee/activity-feed'" style="cursor:pointer">
      <div class="act-icon ${item.type}"><i class="fa ${item.icon}"></i></div>
      <div class="act-text">
        <div class="act-title">${item.title}</div>
        ${item.sub ? `<div class="act-sub">${item.sub}</div>` : ""}
      </div>
      <div class="act-time">${item.time}</div>
    </div>
  `,
    )
    .join("");
}
