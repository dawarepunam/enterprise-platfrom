(function registerScreenShare() {
  const workspace = window.TeamsWorkspace;
  if (!workspace) return;

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("screenShareBtn")?.addEventListener("click", async () => {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        showToast?.("Screen sharing is not supported in this browser.", "warning");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const video = document.getElementById("localVideoPreview");
      video.srcObject = stream;
      document.getElementById("mediaPreviewPanel").hidden = false;
      document.getElementById("previewTitle").textContent = "Screen sharing preview";
      document.getElementById("previewCopy").textContent = "Your current screen is ready to broadcast during live collaboration.";

      if (workspace.state.activeTeam && workspace.state.activeChannel) {
        await apiRequest("/messages", {
          method: "POST",
          body: {
            teamId: workspace.state.activeTeam._id,
            channelId: workspace.state.activeChannel._id,
            messageType: "SYSTEM",
            text: `${getCurrentUser()?.name || "User"} started screen sharing.`,
          },
        });
        await workspace.selectChannel(workspace.state.activeChannel._id);
      }
    });
  });
})();
