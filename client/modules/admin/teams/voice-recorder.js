(function registerVoiceRecorder() {
  const workspace = window.TeamsWorkspace;
  if (!workspace) return;

  let mediaRecorder = null;
  let mediaStream = null;
  let chunks = [];
  let startedAt = 0;
  let tickInterval = null;

  function resetRecorderUI() {
    document.getElementById("recorderDock").hidden = true;
    document.getElementById("recordingPreview").removeAttribute("src");
    document.getElementById("recordingTime").textContent = "00:00";
    document.getElementById("sendRecordingBtn").disabled = true;
  }

  async function stopTracks() {
    mediaStream?.getTracks?.().forEach((track) => track.stop());
    mediaStream = null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const trigger = document.getElementById("voiceRecordBtn");
    const cancel = document.getElementById("cancelRecordingBtn");
    const send = document.getElementById("sendRecordingBtn");
    const preview = document.getElementById("recordingPreview");

    trigger?.addEventListener("click", async () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        return;
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      startedAt = Date.now();
      document.getElementById("recorderDock").hidden = false;
      document.getElementById("recordingLabel").textContent = "Recording voice note...";

      tickInterval = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const ss = String(elapsed % 60).padStart(2, "0");
        document.getElementById("recordingTime").textContent = `${mm}:${ss}`;
      }, 1000);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        window.clearInterval(tickInterval);
        await stopTracks();
        const blob = new Blob(chunks, { type: "audio/webm" });
        preview.src = URL.createObjectURL(blob);
        send.disabled = false;
        send.dataset.blobUrl = preview.src;
        send.__recordedBlob = blob;
        document.getElementById("recordingLabel").textContent = "Voice note ready to send";
      };

      mediaRecorder.start();
    });

    cancel?.addEventListener("click", async () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      await stopTracks();
      resetRecorderUI();
    });

    send?.addEventListener("click", async () => {
      const blob = send.__recordedBlob;
      if (!blob) return;
      const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
      await window.TeamsFileUpload.uploadSelectedFile(file, { fileCategory: "voice-note", messageType: "VOICE" });
      resetRecorderUI();
    });
  });
})();
