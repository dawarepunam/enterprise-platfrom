document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  const leads = window.enterpriseStore?.getLeads?.() || [];
  document.getElementById("leadCards").innerHTML = leads.slice(0, 4).map((lead) => `<article class="list-card"><strong>${escapeMember(lead.company)}</strong><span class="list-meta">${escapeMember(lead.status)} • ${escapeMember(lead.source)}</span></article>`).join("");
});

function escapeMember(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
