(function registerLocationShare() {
  const workspace = window.TeamsWorkspace;
  if (!workspace) return;

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("shareLocationBtn")?.addEventListener("click", async () => {
      if (!workspace.state.activeTeam || !workspace.state.activeChannel) {
        showToast?.("Select a team and channel before sharing your location.", "warning");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await apiRequest("/messages", {
            method: "POST",
            body: {
              teamId: workspace.state.activeTeam._id,
              channelId: workspace.state.activeChannel._id,
              messageType: "LOCATION",
              text: "Shared current location",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });
          showToast?.("Location shared successfully.", "success");
          await workspace.selectChannel(workspace.state.activeChannel._id);
        },
        (error) => {
          showToast?.(error.message || "Unable to access location.", "error");
        },
      );
    });
  });
})();
