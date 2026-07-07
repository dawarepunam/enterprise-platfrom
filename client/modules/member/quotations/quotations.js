document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  const quotations = window.enterpriseStore?.getQuotations?.() || [];
  document.getElementById("quotationCards").innerHTML = quotations.map((quote) => `<article class="list-card"><strong>${escapeQuote(quote.title)}</strong><span class="list-meta">${escapeQuote(quote.client)} • ${escapeQuote(quote.status)}</span></article>`).join("");
});

function escapeQuote(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
