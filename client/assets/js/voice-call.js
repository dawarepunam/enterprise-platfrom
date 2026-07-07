class ProjectVoiceCall {
  constructor(options = {}) {
    this.socket = options.socket || null;
    this.getCurrentUser = options.getCurrentUser || (() => ({}));
    this.getRoomContext = options.getRoomContext || (() => null);
    this.onHistoryMessage = options.onHistoryMessage || (() => {});
    this.onEvent = options.onEvent || (() => {});
    this.onStateChange = options.onStateChange || (() => {});

    this.currentCall = null;
    this.pendingIncoming = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteAudio = null;
    this.callTimer = null;
    this.callStartedAt = null;
    this.isMuted = false;

    this.ensureUi();
    this.attachSocketListeners();
  }

  attachSocketListeners() {
    if (!this.socket) return;

    this.socket.on("call:incoming", (payload) => this.handleIncoming(payload));
    this.socket.on("call:initiated", (payload) => this.handleInitiated(payload));
    this.socket.on("call:accepted", (payload) => this.handleAccepted(payload));
    this.socket.on("call:rejected", (payload) => this.handleRejected(payload));
    this.socket.on("call:ended", (payload) => this.handleEnded(payload));
    this.socket.on("call:missed", (payload) => this.handleMissed(payload));
    this.socket.on("call:webrtc:signal", (payload) => this.handleSignal(payload));
    this.socket.on("call:error", (payload) => this.handleError(payload));
    this.socket.on("chat:message", (message) => {
      if (message?.callData?.type === "VOICE_CALL") {
        this.onHistoryMessage(message);
      }
    });
  }

  ensureUi() {
    this.root = document.createElement("div");
    this.root.className = "voice-call-layer";
    this.root.innerHTML = `
      <section class="voice-call-modal" data-call-modal="incoming" hidden>
        <p class="voice-call-kicker">Incoming Voice Call</p>
        <h3 id="voiceIncomingName">Someone is calling</h3>
        <p id="voiceIncomingMeta">Accept to start live audio.</p>
        <div class="voice-call-actions">
          <button type="button" class="btn btn-primary" data-call-action="accept">Accept</button>
          <button type="button" class="btn ghost-btn" data-call-action="reject">Reject</button>
        </div>
      </section>
      <section class="voice-call-modal voice-call-live" data-call-modal="active" hidden>
        <p class="voice-call-kicker">Voice Call</p>
        <h3 id="voiceActiveName">Connecting...</h3>
        <p id="voiceActiveMeta">Preparing microphone</p>
        <strong id="voiceCallDuration">00:00:00</strong>
        <div class="voice-call-actions">
          <button type="button" class="btn ghost-btn" data-call-action="mute">Mute</button>
          <button type="button" class="btn btn-primary" data-call-action="end">End Call</button>
        </div>
      </section>
      <audio autoplay playsinline id="voiceRemoteAudio"></audio>
    `;

    document.body.appendChild(this.root);
    this.remoteAudio = this.root.querySelector("#voiceRemoteAudio");
    this.root.querySelector('[data-call-action="accept"]').addEventListener("click", () => this.acceptIncoming());
    this.root.querySelector('[data-call-action="reject"]').addEventListener("click", () => this.rejectIncoming());
    this.root.querySelector('[data-call-action="mute"]').addEventListener("click", () => this.toggleMute());
    this.root.querySelector('[data-call-action="end"]').addEventListener("click", () => this.endCurrentCall());
  }

  async startCall(context = this.getRoomContext()) {
    if (!this.socket || !context?.roomId) {
      this.notify("Call unavailable", "Select a valid room before starting a call.");
      return;
    }

    const currentUser = this.getCurrentUser();
    const recipients = (context.participants || [])
      .filter((participant) => String(participant.userId) !== String(currentUser._id))
      .map((participant) => String(participant.userId));

    if (!recipients.length) {
      this.notify("No recipients", "No other members are available in this room.");
      return;
    }

    try {
      await this.ensureLocalStream();
      this.currentCall = {
        callId: "",
        roomId: context.roomId,
        participantIds: recipients,
        participantNames: (context.participants || [])
          .filter((participant) => recipients.includes(String(participant.userId)))
          .map((participant) => participant.name),
        initiatorId: String(currentUser._id),
        acceptedBy: "",
        direction: "outgoing",
      };
      this.showActiveCall(`${this.currentCall.participantNames.join(", ") || "Team room"}`, "Calling...");
      this.socket.emit("call:initiate", {
        roomId: context.roomId,
        targetUserId: recipients[0],
        participantIds: recipients.slice(1),
      });
      this.onEvent("Calling team room...");
    } catch (error) {
      this.cleanupCall();
      this.notify("Microphone blocked", error.message || "Please allow microphone access to place a call.");
    }
  }

  handleIncoming(payload = {}) {
    const context = this.getRoomContext();
    if (context?.roomId && payload.roomId && payload.roomId !== context.roomId) return;

    this.pendingIncoming = payload;
    this.root.querySelector("#voiceIncomingName").textContent = `${payload.callerName || "Someone"} is calling`;
    this.root.querySelector("#voiceIncomingMeta").textContent = `${payload.callType === "GROUP" ? "Group" : "Voice"} call for ${payload.participantNames?.join(", ") || "this room"}`;
    this.setModalState("incoming");
    this.onEvent(`${payload.callerName || "Someone"} started a voice call.`);
  }

  handleInitiated(payload = {}) {
    if (!this.currentCall) return;
    this.currentCall.callId = String(payload.callId || "");
    this.currentCall.participantIds = payload.participantIds || this.currentCall.participantIds;
    this.currentCall.participantNames = payload.participantNames || this.currentCall.participantNames;
    this.showActiveCall(this.currentCall.participantNames.join(", ") || "Team room", "Ringing...");
  }

  async acceptIncoming() {
    if (!this.pendingIncoming) return;

    try {
      await this.ensureLocalStream();
      this.currentCall = {
        callId: String(this.pendingIncoming.callId || ""),
        roomId: this.pendingIncoming.roomId,
        participantIds: [String(this.pendingIncoming.callerId)],
        participantNames: [this.pendingIncoming.callerName || "Caller"],
        initiatorId: String(this.pendingIncoming.callerId || ""),
        direction: "incoming",
      };
      this.socket.emit("call:accept", { callId: this.currentCall.callId });
      this.pendingIncoming = null;
      this.showActiveCall(this.currentCall.participantNames[0], "Connecting...");
    } catch (error) {
      this.notify("Microphone blocked", error.message || "Unable to access microphone.");
    }
  }

  rejectIncoming() {
    if (!this.pendingIncoming) return;
    this.socket.emit("call:reject", { callId: this.pendingIncoming.callId });
    this.pendingIncoming = null;
    this.setModalState(null);
  }

  async handleAccepted(payload = {}) {
    if (!this.currentCall || String(payload.callId) !== String(this.currentCall.callId)) return;

    this.currentCall.acceptedBy = String(payload.acceptedBy || "");
    this.callStartedAt = payload.startTime ? new Date(payload.startTime) : new Date();
    this.startTimer();
    this.showActiveCall(payload.acceptedByName || this.currentCall.participantNames[0] || "Connected", "Live audio connected");

    if (String(this.getCurrentUser()._id) === String(this.currentCall.initiatorId) && this.currentCall.acceptedBy) {
      await this.ensurePeerConnection(this.currentCall.acceptedBy);
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket.emit("call:signal", {
        callId: this.currentCall.callId,
        roomId: this.currentCall.roomId,
        targetUserId: this.currentCall.acceptedBy,
        type: "offer",
        data: offer,
      });
    }
  }

  handleRejected(payload = {}) {
    if (!this.matchesCurrentCall(payload.callId)) return;
    this.notify("Call declined", payload.message || `${payload.rejectedByName || "A participant"} rejected the call.`);
    this.cleanupCall();
  }

  handleEnded(payload = {}) {
    if (!this.matchesCurrentCall(payload.callId)) return;
    this.notify("Call ended", `${payload.endedByName || "A participant"} ended the call.`);
    this.cleanupCall();
  }

  handleMissed(payload = {}) {
    if (!this.matchesCurrentCall(payload.callId) && String(this.pendingIncoming?.callId) !== String(payload.callId)) return;
    this.notify("Missed call", payload.message || "The call was missed.");
    this.pendingIncoming = null;
    this.cleanupCall();
  }

  async handleSignal(payload = {}) {
    if (!this.matchesCurrentCall(payload.callId)) return;

    const fromUserId = String(payload.fromUserId || "");
    await this.ensurePeerConnection(fromUserId);

    if (payload.type === "offer") {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.callStartedAt = this.callStartedAt || new Date();
      this.startTimer();
      this.showActiveCall(this.currentCall.participantNames[0] || "Connected", "Live audio connected");
      this.socket.emit("call:signal", {
        callId: this.currentCall.callId,
        roomId: this.currentCall.roomId,
        targetUserId: fromUserId,
        type: "answer",
        data: answer,
      });
      return;
    }

    if (payload.type === "answer") {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data));
      return;
    }

    if (payload.type === "ice-candidate" && payload.data) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.data));
      } catch (error) {
        console.warn("ICE candidate skipped", error);
      }
    }
  }

  handleError(payload = {}) {
    this.notify("Call error", payload.message || "Voice call failed.");
  }

  async ensurePeerConnection(targetUserId) {
    if (this.peerConnection) return this.peerConnection;

    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    this.localStream?.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    this.peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams || [];
      if (remoteStream && this.remoteAudio) {
        this.remoteAudio.srcObject = remoteStream;
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !this.currentCall?.callId) return;
      this.socket.emit("call:signal", {
        callId: this.currentCall.callId,
        roomId: this.currentCall.roomId,
        targetUserId,
        type: "ice-candidate",
        data: event.candidate,
      });
    };

    return this.peerConnection;
  }

  async ensureLocalStream() {
    if (this.localStream) return this.localStream;
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return this.localStream;
  }

  toggleMute() {
    if (!this.localStream) return;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });
    const muteBtn = this.root.querySelector('[data-call-action="mute"]');
    muteBtn.textContent = this.isMuted ? "Unmute" : "Mute";
  }

  endCurrentCall() {
    if (this.currentCall?.callId) {
      this.socket.emit("call:end", { callId: this.currentCall.callId });
    }
    this.cleanupCall();
  }

  startTimer() {
    window.clearInterval(this.callTimer);
    this.callTimer = window.setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - (this.callStartedAt?.getTime() || Date.now())) / 1000));
      const hours = String(Math.floor(elapsed / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
      const seconds = String(elapsed % 60).padStart(2, "0");
      this.root.querySelector("#voiceCallDuration").textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
  }

  showActiveCall(title, meta) {
    this.root.querySelector("#voiceActiveName").textContent = title || "Voice call";
    this.root.querySelector("#voiceActiveMeta").textContent = meta || "Preparing audio";
    this.setModalState("active");
    this.onStateChange({ inCall: true, muted: this.isMuted });
  }

  setModalState(state) {
    this.root.querySelector('[data-call-modal="incoming"]').hidden = state !== "incoming";
    this.root.querySelector('[data-call-modal="active"]').hidden = state !== "active";
  }

  matchesCurrentCall(callId) {
    return Boolean(this.currentCall?.callId && String(this.currentCall.callId) === String(callId));
  }

  cleanupCall() {
    window.clearInterval(this.callTimer);
    this.callTimer = null;
    this.callStartedAt = null;
    this.pendingIncoming = null;
    this.currentCall = null;
    this.isMuted = false;

    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
    }

    const muteBtn = this.root.querySelector('[data-call-action="mute"]');
    muteBtn.textContent = "Mute";
    this.root.querySelector("#voiceCallDuration").textContent = "00:00:00";
    this.setModalState(null);
    this.onStateChange({ inCall: false, muted: false });
  }

  notify(title, message) {
    if (typeof showToast === "function") {
      showToast(message, "info", { title });
    }
    this.onEvent(message);
  }
}

window.ProjectVoiceCall = ProjectVoiceCall;
