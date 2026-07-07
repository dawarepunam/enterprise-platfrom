(function registerTeamsChat() {
  const workspace = window.TeamsWorkspace;
  if (!workspace) return;

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("messageComposer");
    const input = document.getElementById("messageInput");
    if (!form || !input) return;

    input.addEventListener("input", () => {
      if (!workspace.state.activeTeam?.roomId) return;
      emitSocket("chat:typing", { roomId: workspace.state.activeTeam.roomId });
      window.clearTimeout(window.__teamsTypingTimer);
      window.__teamsTypingTimer = window.setTimeout(() => {
        emitSocket("chat:typing:stop", { roomId: workspace.state.activeTeam.roomId });
      }, 900);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!workspace.state.activeTeam || !workspace.state.activeChannel) {
        showToast?.("Select a team and channel before sending a message.", "warning");
        return;
      }

      const text = input.value.trim();
      if (!text) return;

      await apiRequest("/messages", {
        method: "POST",
        body: {
          teamId: workspace.state.activeTeam._id,
          channelId: workspace.state.activeChannel._id,
          messageType: "TEXT",
          text,
        },
      });

      emitSocket("chat:typing:stop", { roomId: workspace.state.activeTeam.roomId });
      input.value = "";
      await workspace.selectChannel(workspace.state.activeChannel._id);
    });
  });
})();
