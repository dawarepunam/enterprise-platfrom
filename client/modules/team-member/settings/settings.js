const moduleConfig = {
  title: "Team Member Settings",
  description: "Manage account preferences, privacy and active sessions.",
};

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof requireAuth === "function") {
    requireAuth();
  }

  await loadComponent("navbar", "../../../components/navbar.html");
  await loadComponent("sidebar", "../../../components/sidebar.html");
  renderModuleShell();
});

function renderModuleShell() {
  const now = new Date().toLocaleString("en-IN");
  document.getElementById("moduleTitle").textContent = moduleConfig.title;
  document.getElementById("moduleDescription").textContent = moduleConfig.description;
  document.getElementById("moduleTimestamp").textContent = now;
}

async function loadComponent(elementId, filePath) {
  const response = await fetch(filePath);
  const html = await response.text();
  document.getElementById(elementId).innerHTML = html;
}
