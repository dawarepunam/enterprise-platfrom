document.addEventListener("DOMContentLoaded", async () => {
  await loadPartial("navbar", "../../components/navbar.html");
  renderNotifications();
});

function renderNotifications() {
  const snapshot = window.enterpriseStore?.getEnterpriseOverview?.();
  const notifications = [
    { title: "Task review waiting", detail: "Team lead has a member submission pending.", level: "normal" },
    { title: "Quotation approval needed", detail: `${snapshot?.summary?.pendingQuotations || 0} quotations need decision.`, level: "critical" },
    { title: "Lead pipeline updated", detail: `${snapshot?.summary?.totalLeads || 0} leads are active in the CRM flow.`, level: "normal" },
    { title: "Realtime room connected", detail: "Team chat, file share and meetings are available.", level: "normal" },
  ];

  document.getElementById("totalAlerts").textContent = notifications.length;
  document.getElementById("unreadAlerts").textContent = notifications.length - 1;
  document.getElementById("criticalAlerts").textContent = notifications.filter((item) => item.level === "critical").length;
  document.getElementById("notificationFeed").innerHTML = notifications
    .map((item) => `<article class="list-card"><strong>${escapeNotif(item.title)}</strong><span class="list-meta">${escapeNotif(item.detail)}</span></article>`)
    .join("");
}

async function loadPartial(id, path) {
  const response = await fetch(path);
  document.getElementById(id).innerHTML = await response.text();
}

function escapeNotif(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
