document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
    requireRole: "MANAGER",
  });
  if (!ready) return;

  await window.managerHub?.ensureManagerMigration?.();
  document.getElementById("locationSharedBy").value = getCurrentUser?.().name || "Manager";
  document.getElementById("locationForm")?.addEventListener("submit", saveLocation);
  document.getElementById("detectLocationBtn")?.addEventListener("click", detectLocation);
  renderLocations();
});

function detectLocation() {
  if (!navigator.geolocation) {
    window.managerHub?.addNotification?.("Location unavailable", "Browser geolocation is not available here.", "warning");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      document.getElementById("locationLat").value = position.coords.latitude.toFixed(4);
      document.getElementById("locationLng").value = position.coords.longitude.toFixed(4);
      window.managerHub?.addNotification?.("Location detected", "Coordinates captured from browser geolocation.", "success");
    },
    () => {
      window.managerHub?.addNotification?.("Location blocked", "Could not read browser location. Use manual entry.", "warning");
    },
  );
}

function saveLocation(event) {
  event.preventDefault();
  const project = (window.managerHub?.getManagerProjects?.() || []).find((item) => item._id === document.getElementById("locationProjectId").value);
  if (!project) return;
  window.managerHub?.addLocation?.({
    projectId: project._id,
    teamId: (window.managerHub?.getManagerTeams?.() || []).find((team) => team.projectId === project._id)?._id || "",
    sharedBy: document.getElementById("locationSharedBy").value.trim(),
    sharedById: getCurrentUser?.()._id || "usr-2",
    latitude: Number(document.getElementById("locationLat").value || 0),
    longitude: Number(document.getElementById("locationLng").value || 0),
    address: document.getElementById("locationAddress").value.trim(),
    note: document.getElementById("locationNote").value.trim(),
  });
  renderLocations();
}

function renderLocations() {
  const projects = window.managerHub?.getManagerProjects?.() || [];
  const locations = window.managerHub?.getLocations?.() || [];
  document.getElementById("locationProjectId").innerHTML = projects.map((project) => `<option value="${project._id}">${escapeHtml(project.projectName)}</option>`).join("");
  document.getElementById("locationMetrics").innerHTML = [
    ["Locations", locations.length, "BR"],
    ["Projects", new Set(locations.map((item) => item.projectId)).size, "PJ"],
    ["Shared Today", locations.filter((item) => formatShortDate(item.createdAt) === formatShortDate(new Date().toISOString())).length, "DL"],
    ["Geo Ready", "Maps Link", "KP"],
  ]
    .map(
      ([label, value, icon]) => `
        <article class="manager-kpi">
          <span class="kpi-icon">${getNavIconSvg(icon)}</span>
          <strong>${escapeHtml(String(value))}</strong>
          <span>${escapeHtml(label)}</span>
        </article>
      `,
    )
    .join("");

  document.getElementById("locationList").innerHTML = locations
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .map(
      (location) => `
        <article class="manager-list-item">
          <div class="manager-row-between">
            <strong>${escapeHtml(location.address || "-")}</strong>
            <span class="manager-badge">${escapeHtml(location.sharedBy || "-")}</span>
          </div>
          <p>${location.latitude}, ${location.longitude}</p>
          <span class="muted-line">${escapeHtml(location.note || "")}</span>
        </article>
      `,
    )
    .join("");
}
