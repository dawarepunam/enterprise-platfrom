document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "CLIENT" });
  if (!ready) return;
  const projects = window.enterpriseStore?.getClientSnapshot?.().projects || [];
  document.getElementById("projectCards").innerHTML = projects.map((project) => `<article class="list-card"><strong>${escapeProgress(project.projectName)}</strong><span class="list-meta">${escapeProgress(project.status)} • ${project.progress || 0}% complete</span></article>`).join("");
});

function escapeProgress(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
