(function registerVideoCall() {
  const workspace = window.TeamsWorkspace;
  if (!workspace) return;

  async function startPreview(kind) {
    const video = document.getElementById("localVideoPreview");
    const panel = document.getElementById("mediaPreviewPanel");
    const title = document.getElementById("previewTitle");
    const copy = document.getElementById("previewCopy");

    let stream;
    if (kind === "audio") {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      title.textContent = "Audio call ready";
      copy.textContent = "Microphone access granted. Share the room update to notify participants.";
    } else {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      video.srcObject = stream;
      title.textContent = "Video call preview";
      copy.textContent = "Camera preview is live. You can continue while Teams meeting links handle full-room sessions.";
    }

    panel.hidden = false;

    if (workspace.state.activeTeam && workspace.state.activeChannel) {
      await apiRequest("/messages", {
        method: "POST",
        body: {
          teamId: workspace.state.activeTeam._id,
          channelId: workspace.state.activeChannel._id,
          messageType: "SYSTEM",
          text: `${getCurrentUser()?.name || "User"} started a ${kind === "audio" ? "audio" : "video"} call preview.`,
        },
      });
      await workspace.selectChannel(workspace.state.activeChannel._id);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("audioCallBtn")?.addEventListener("click", () => startPreview("audio"));
    document.getElementById("videoCallBtn")?.addEventListener("click", () => startPreview("video"));
  });
})();
