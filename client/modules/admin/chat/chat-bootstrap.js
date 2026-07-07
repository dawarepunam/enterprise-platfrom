document.addEventListener("DOMContentLoaded", async () => {
    const ready = await initWorkspace({
        navbarPath: "../../../components/navbar.html",
        sidebarPath: "../../../components/sidebar.html",
        requireRole: "ADMIN",
    });

    if (!ready) return;
    window.projectChat = new ProjectChat();
});
