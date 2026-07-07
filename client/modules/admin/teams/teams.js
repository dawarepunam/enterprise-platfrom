const TEAMS_WEB_URL = "https://teams.microsoft.com";
const ONEDRIVE_WEB_URL = "https://onedrive.live.com";

async function initTeamsIntegrationPage() {
  const ready = await bootAdminPage({
    moduleKey: "teams-collaboration",
    pageTitle: "Microsoft Teams Integration",
    pageDescription: "Launch Microsoft Teams from the CRM",
  });

  if (!ready) return;

  document.getElementById("openTeamsBtn").addEventListener("click", () => {
    window.open("https://teams.microsoft.com", "_blank");
  });

  document.getElementById("openOneDriveBtn").addEventListener("click", () => {
    window.open("https://onedrive.live.com", "_blank");
  });

  document.querySelectorAll(".teams-feature-card").forEach((card) => {
    card.addEventListener("click", () => {
      const targetUrl = card.querySelector("h3")?.textContent === "OneDrive Storage" ? ONEDRIVE_WEB_URL : TEAMS_WEB_URL;
      window.open(targetUrl, "_blank");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTeamsIntegrationPage().catch((error) => {
    console.error(error);
    showToast?.(error.message || "Unable to load the Microsoft Teams integration page.", "error");
  });
});
