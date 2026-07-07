document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "CLIENT" });
  if (!ready) return;
  const quotations = window.enterpriseStore?.getClientSnapshot?.().quotations || [];
  document.getElementById("quotationCards").innerHTML = quotations.map((quote) => `<article class="list-card"><strong>${escapePortalQuote(quote.title)}</strong><span class="list-meta">${escapePortalQuote(quote.status)} • ${escapePortalQuote(quote.client)}</span></article>`).join("");
});

function escapePortalQuote(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
