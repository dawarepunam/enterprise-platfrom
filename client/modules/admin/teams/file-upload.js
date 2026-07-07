(function registerTeamsFileUpload() {
  const workspace = window.TeamsWorkspace;
  if (!workspace) return;

  async function uploadSelectedFile(file, overrides = {}) {
    if (!workspace.state.activeTeam || !workspace.state.activeChannel) {
      showToast?.("Select a team and channel before sharing files.", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("teamId", workspace.state.activeTeam._id);
    formData.append("channelId", workspace.state.activeChannel._id);
    formData.append("clientName", workspace.state.activeTeam.clientName || "");
    formData.append("fileCategory", overrides.fileCategory || "");
    formData.append("caption", overrides.caption || "");
    formData.append("messageType", overrides.messageType || "FILE");

    const result = await apiRequest("/files/upload", {
      method: "POST",
      body: formData,
      isFormData: true,
    });

    showToast?.(result.message || "File uploaded successfully.", "success");
    await workspace.selectTeam(workspace.state.activeTeam._id);
  }

  window.TeamsFileUpload = {
    uploadSelectedFile,
  };

  document.addEventListener("DOMContentLoaded", () => {
    const attachButton = document.getElementById("attachFileBtn");
    const cameraButton = document.getElementById("cameraCaptureBtn");
    const fileInput = document.getElementById("fileInput");
    const cameraInput = document.getElementById("cameraInput");

    attachButton?.addEventListener("click", () => fileInput?.click());
    cameraButton?.addEventListener("click", () => cameraInput?.click());

    fileInput?.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      await uploadSelectedFile(file, { fileCategory: "document" });
      fileInput.value = "";
    });

    cameraInput?.addEventListener("change", async () => {
      const file = cameraInput.files?.[0];
      if (!file) return;
      await uploadSelectedFile(file, { fileCategory: "camera-capture", messageType: "IMAGE" });
      cameraInput.value = "";
    });
  });
})();
