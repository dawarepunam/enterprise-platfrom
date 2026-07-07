document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "CLIENT" });
  if (!ready) return;
  const messages = [
    "Delivery team shared the latest sprint summary.",
    "Quotation revision needs your review before scope expansion.",
    "Monthly progress report is available for download.",
  ];
  document.getElementById("messageCards").innerHTML = messages.map((item) => `<article class="list-card"><strong>Portal message</strong><span class="list-meta">${item}</span></article>`).join("");
});
