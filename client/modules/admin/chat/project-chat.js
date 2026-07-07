class ProjectChat {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentRoom = null;
        this.rooms = [];
        this.onlineUsers = new Set();
        this.typingUsers = new Set();
        this.messageBuffer = [];
        this.roomInsights = new Map();
        this.isConnected = false;
        this.voiceCall = null;
        this.typingStopTimer = null;
        this.pendingReadIds = new Set();
        this.readFlushTimer = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingStream = null;
        this.recordingStartedAt = 0;
        this.recordingTimer = null;
        this.voiceDraft = null;
        this.pendingAttachment = null;
        this.cameraStream = null;
        this.directRoomResolved = false;
        this.roomRefreshTimer = null;
        this.queryParams = new URLSearchParams(window.location.search);
        this.pendingAutoAction = this.queryParams.get("autostart") || "";

        this.DOM = {
            roomList: document.getElementById("roomList"),
            messageList: document.getElementById("messageList"),
            messageInput: document.getElementById("messageInput"),
            messageForm: document.getElementById("messageForm"),
            typingIndicator: document.getElementById("typingIndicator"),
            socketStatus: document.getElementById("socketStatus"),
            roomStatus: document.getElementById("roomStatus"),
            activeRoomName: document.getElementById("activeRoomName"),
            activeRoomMeta: document.getElementById("activeRoomMeta"),
            roomProjectName: document.getElementById("roomProjectName"),
            roomParticipantCount: document.getElementById("roomParticipantCount"),
            roomMessageCount: document.getElementById("roomMessageCount"),
            roomCount: document.getElementById("roomCount"),
            emojiBtn: document.getElementById("emojiBtn"),
            attachBtn: document.getElementById("attachBtn"),
            attachmentMenu: document.getElementById("attachmentMenu"),
            voiceNoteBtn: document.getElementById("voiceNoteBtn"),
            fileForm: document.getElementById("fileForm"),
            fileInput: document.getElementById("fileInput"),
            cameraInput: document.getElementById("cameraInput"),
            fileCaption: document.getElementById("fileCaption"),
            cancelFileBtn: document.getElementById("cancelFileBtn"),
            sendAttachmentBtn: document.getElementById("sendAttachmentBtn"),
            composerModal: document.getElementById("composerModal"),
            composerPreview: document.getElementById("composerPreview"),
            composerTitle: document.getElementById("composerTitle"),
            closeComposerBtn: document.getElementById("closeComposerBtn"),
            codeLanguageField: document.getElementById("codeLanguageField"),
            codeLanguageInput: document.getElementById("codeLanguageInput"),
            codeSnippetField: document.getElementById("codeSnippetField"),
            codeSnippetInput: document.getElementById("codeSnippetInput"),
            roomSearchInput: document.getElementById("roomSearchInput"),
            eventFeed: document.getElementById("eventFeed"),
            startCallBtn: document.getElementById("startCallBtn"),
            startMeetingBtn: document.getElementById("startMeetingBtn"),
            startMicrosoftMeetingBtn: document.getElementById("startMicrosoftMeetingBtn"),
            sendMicrosoftMailBtn: document.getElementById("sendMicrosoftMailBtn"),
            shareOneDriveBtn: document.getElementById("shareOneDriveBtn"),
            voiceRecorderPanel: document.getElementById("voiceRecorderPanel"),
            recordingStatus: document.getElementById("recordingStatus"),
            recordingTime: document.getElementById("recordingTime"),
            recordingPreview: document.getElementById("recordingPreview"),
            cancelRecordingBtn: document.getElementById("cancelRecordingBtn"),
            sendRecordingBtn: document.getElementById("sendRecordingBtn"),
        };

        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        this.attachEventListeners();
        this.connectSocket();
        this.startRoomRefreshLoop();
    }

    async loadCurrentUser() {
        const userData = localStorage.getItem("user");
        this.currentUser = JSON.parse(userData || "{}");
    }

    attachEventListeners() {
        this.DOM.messageForm?.addEventListener("submit", (event) => this.handleSendMessage(event));
        this.DOM.emojiBtn?.addEventListener("click", () => this.insertEmoji("😊"));
        this.DOM.attachBtn?.addEventListener("click", (event) => this.toggleAttachmentMenu(event));
        this.DOM.attachmentMenu?.addEventListener("click", (event) => this.handleAttachmentOption(event));
        this.DOM.fileInput?.addEventListener("change", () => this.handleSelectedFile("file"));
        this.DOM.cameraInput?.addEventListener("change", () => this.handleSelectedFile("camera"));
        this.DOM.cancelFileBtn?.addEventListener("click", () => this.closeComposerModal());
        this.DOM.closeComposerBtn?.addEventListener("click", () => this.closeComposerModal());
        this.DOM.sendAttachmentBtn?.addEventListener("click", () => this.sendPendingAttachment());
        this.DOM.roomSearchInput?.addEventListener("input", (event) => this.searchRooms(event.target.value));
        this.DOM.messageInput?.addEventListener("input", () => this.handleTyping());
        this.DOM.messageInput?.addEventListener("blur", () => this.handleTypingStop());
        this.DOM.startCallBtn?.addEventListener("click", () => this.handleStartCall());
        this.DOM.startMeetingBtn?.addEventListener("click", () => this.handleStartMeeting());
        this.DOM.startMicrosoftMeetingBtn?.addEventListener("click", () => this.handleStartMicrosoftMeeting());
        this.DOM.sendMicrosoftMailBtn?.addEventListener("click", () => this.handleSendMicrosoftMail());
        this.DOM.shareOneDriveBtn?.addEventListener("click", () => this.handleShareOneDriveFile());
        this.DOM.voiceNoteBtn?.addEventListener("click", () => this.toggleVoiceRecording());
        this.DOM.cancelRecordingBtn?.addEventListener("click", () => this.resetVoiceDraft());
        this.DOM.sendRecordingBtn?.addEventListener("click", () => this.sendVoiceDraft());
        document.addEventListener("click", (event) => this.handleOutsideClick(event));
        document.addEventListener("keydown", (event) => this.handleGlobalKeydown(event));
        window.addEventListener("focus", () => this.refreshRooms({ silent: true }));
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                this.refreshRooms({ silent: true });
            }
        });
    }

    connectSocket() {
        try {
            this.socket = getSocket();
            if (!this.socket) {
                this.updateStatus("Error", "Socket connection failed");
                return;
            }

            this.socket.on("connect", () => this.handleSocketConnect());
            this.socket.on("disconnect", () => this.handleSocketDisconnect());
            this.socket.on("connected", (data) => this.handleConnectionSuccess(data));
            this.socket.on("chat:message", (message) => this.handleNewMessage(message));
            this.socket.on("chat:typing", (data) => this.handleUserTyping(data));
            this.socket.on("chat:typing:stop", (data) => this.handleUserTypingStop(data));
            this.socket.on("presence:changed", (data) => this.handlePresenceChange(data));
            this.socket.on("chat:messages:read", (data) => this.handleMessagesRead(data));
            this.socket.on("chat:error", (error) => this.handleSocketError(error));
            this.socket.on("chat:room:created", (room) => this.handleRoomCreated(room));
            this.socket.on("chat:rooms:sync", (payload) => this.handleRoomsSync(payload.rooms || []));

            this.voiceCall = new ProjectVoiceCall({
                socket: this.socket,
                getCurrentUser: () => this.currentUser,
                getRoomContext: () => this.currentRoom,
                onEvent: (message) => this.addEventLog(message),
            });

            this.updateStatus("Connecting", "Establishing socket connection...");
        } catch (error) {
            console.error("Socket connection error:", error);
            this.updateStatus("Error", "Failed to connect socket");
        }
    }

    handleSocketConnect() {
        this.isConnected = true;
    }

    handleSocketDisconnect() {
        this.isConnected = false;
        this.onlineUsers.clear();
        this.updateStatus("Disconnected", "Lost connection to server");
        this.renderRoomList();
    }

    handleConnectionSuccess(data) {
        this.rooms = data.rooms || [];
        this.onlineUsers = new Set((data.onlineUsers || []).map((user) => String(user.userId)));
        this.initializeRoomInsights(this.rooms);
        this.updateStatus("Connected", "Realtime delivery channel is ready");
        this.renderRoomList();
        this.ensureDirectRoomFromQuery();
        this.refreshRooms({ silent: true, autoSelectNew: true });

        const defaultRoom = this.resolveDefaultRoomFromQuery() || this.rooms[0] || null;
        if (defaultRoom) {
            this.selectRoom(defaultRoom);
        }
    }

    resolveDefaultRoomFromQuery() {
        const requestedRoomId = this.queryParams.get("roomId");
        if (requestedRoomId) {
            const roomMatch = this.rooms.find((room) => room.roomId === requestedRoomId);
            if (roomMatch) return roomMatch;
        }

        const requestedProjectId = this.queryParams.get("projectId");
        if (requestedProjectId) {
            const projectMatch = this.rooms.find((room) => String(room.projectId || "") === String(requestedProjectId));
            if (projectMatch) return projectMatch;
        }

        const requestedProjectName = String(this.queryParams.get("projectName") || "").trim().toLowerCase();
        if (requestedProjectName) {
            const projectNameMatch = this.rooms.find((room) => String(room.projectName || "").trim().toLowerCase() === requestedProjectName);
            if (projectNameMatch) return projectNameMatch;
        }

        return null;
    }

    async ensureDirectRoomFromQuery() {
        const directUserId = this.queryParams.get("directUserId");
        if (!directUserId || this.directRoomResolved) return;
        this.directRoomResolved = true;

        try {
            const response = await fetch(`/api/chat/direct/${encodeURIComponent(directUserId)}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (!response.ok) {
                throw new Error("Unable to open direct chat");
            }

            const result = await response.json();
            this.handleRoomCreated(result.data, { autoSelect: true });
        } catch (error) {
            console.error("Direct room open error:", error);
            this.addEventLog("Failed to open the selected user chat", "error");
        }
    }

    handleRoomCreated(room, options = {}) {
        if (!room?.roomId) return;

        const existingIndex = this.rooms.findIndex((item) => item.roomId === room.roomId);
        if (existingIndex >= 0) {
            this.rooms[existingIndex] = { ...this.rooms[existingIndex], ...room };
        } else {
            this.rooms.unshift(room);
        }

        this.initializeRoomInsights([room]);
        this.renderRoomList();

        const requestedRoomId = this.queryParams.get("roomId");
        const requestedDirectUserId = this.queryParams.get("directUserId");
        const shouldAutoSelect = options.autoSelect ||
            requestedRoomId === room.roomId ||
            requestedDirectUserId === room.directMeta?.otherUserId;

        if (shouldAutoSelect) {
            this.selectRoom(room);
        }

        if (this.socket?.connected) {
            this.socket.emit("chat:rooms:refresh");
        }
    }

    handleRoomsSync(rooms) {
        if (!Array.isArray(rooms)) return;

        const previousIds = new Set(this.rooms.map((room) => room.roomId));
        this.rooms = rooms.map((room) => {
            const existing = this.rooms.find((item) => item.roomId === room.roomId);
            return existing ? { ...existing, ...room } : room;
        });

        this.initializeRoomInsights(this.rooms);

        if (this.currentRoom?.roomId) {
            const refreshedCurrentRoom = this.rooms.find((room) => room.roomId === this.currentRoom.roomId);
            if (refreshedCurrentRoom) {
                this.currentRoom = refreshedCurrentRoom;
                this.updateRoomUI(refreshedCurrentRoom);
            }
        }

        this.renderRoomList();

        const newRoom = this.rooms.find((room) => !previousIds.has(room.roomId));
        if (!this.currentRoom && newRoom) {
            this.selectRoom(newRoom);
        }
    }

    initializeRoomInsights(rooms) {
        rooms.forEach((room) => {
            if (!this.roomInsights.has(room.roomId)) {
                this.roomInsights.set(room.roomId, {
                    lastMessageText: "No messages yet",
                    lastMessageAt: null,
                    unreadCount: 0,
                });
            }
        });
    }

    handleNewMessage(message) {
        if (!message?.roomId) return;

        const exists = this.messageBuffer.some((item) => String(item._id) === String(message._id));
        if (this.currentRoom?.roomId === message.roomId) {
            if (!exists) {
                this.messageBuffer.push(message);
                this.renderMessage(message);
                this.updateRoomMessageCount(message.roomId);
            }

            if (!this.isOwnMessage(message)) {
                this.queueReadReceipt(message._id);
            }

            this.scrollToBottom();
        } else {
            this.incrementUnreadForRoom(message.roomId);
        }

        this.updateRoomInsightFromMessage(message, this.currentRoom?.roomId === message.roomId);
        this.renderRoomList();
    }

    handleUserTyping(data) {
        if (!data?.roomId || String(data.userId) === String(this.currentUser?._id)) return;
        if (this.currentRoom?.roomId !== data.roomId) return;
        this.typingUsers.add(String(data.userId));
        this.renderTypingIndicator();
    }

    handleUserTypingStop(data) {
        if (!data?.roomId) return;
        this.typingUsers.delete(String(data.userId));
        this.renderTypingIndicator();
    }

    handlePresenceChange(data) {
        const userId = String(data.userId || "");
        if (!userId) return;

        if (String(data.status).toUpperCase() === "ONLINE") {
            this.onlineUsers.add(userId);
        } else {
            this.onlineUsers.delete(userId);
        }

        this.renderRoomList();
        this.renderVisibleReceiptStates();
        this.addEventLog(`${data.name} came ${String(data.status || "").toLowerCase()}`);
    }

    handleMessagesRead(data) {
        if (!data?.roomId || !Array.isArray(data.messageIds)) return;

        let changed = false;
        this.messageBuffer = this.messageBuffer.map((message) => {
            if (message.roomId !== data.roomId) return message;
            if (!data.messageIds.includes(String(message._id))) return message;

            const currentReadBy = Array.isArray(message.readBy) ? message.readBy.map(String) : [];
            if (currentReadBy.includes(String(data.readByUserId))) {
                return message;
            }

            changed = true;
            return {
                ...message,
                readBy: [...currentReadBy, String(data.readByUserId)],
            };
        });

        if (changed && this.currentRoom?.roomId === data.roomId) {
            this.renderVisibleReceiptStates();
        }
    }

    handleSocketError(error) {
        this.addEventLog(`Error: ${error.message}`, "error");
    }

    handleSendMessage(event) {
        event.preventDefault();
        if (!this.currentRoom) {
            alert("Please select a room first");
            return;
        }

        const text = this.DOM.messageInput.value.trim();
        if (!text) return;

        this.socket.emit("chat:message:send", {
            roomId: this.currentRoom.roomId,
            text,
            messageType: text.includes("```") ? "CODE" : "TEXT",
            codeLanguage: text.includes("```") ? "text" : "",
        });

        this.DOM.messageInput.value = "";
        this.handleTypingStop();
    }

    insertEmoji(emoji) {
        if (!this.DOM.messageInput) return;
        const currentValue = this.DOM.messageInput.value || "";
        this.DOM.messageInput.value = `${currentValue}${currentValue ? " " : ""}${emoji}`;
        this.DOM.messageInput.focus();
    }

    handleTyping() {
        if (!this.currentRoom) return;
        this.socket.emit("chat:typing", { roomId: this.currentRoom.roomId });
        window.clearTimeout(this.typingStopTimer);
        this.typingStopTimer = window.setTimeout(() => this.handleTypingStop(), 900);
    }

    handleTypingStop() {
        window.clearTimeout(this.typingStopTimer);
        if (!this.currentRoom) return;
        this.socket.emit("chat:typing:stop", { roomId: this.currentRoom.roomId });
    }

    handleStartCall() {
        if (!this.currentRoom) {
            alert("Please select a room first");
            return;
        }
        this.voiceCall?.startCall(this.currentRoom);
    }

    async handleStartMeeting() {
        if (!this.currentRoom) {
            alert("Please select a room first");
            return;
        }

        if (!this.currentRoom.teamId) {
            alert("Meetings are available only for team rooms");
            return;
        }

        try {
            const response = await fetch("/api/meetings/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    teamId: this.currentRoom.teamId,
                    title: `${this.currentRoom.teamName} Live Meeting`,
                    meetingType: "VIDEO",
                }),
            });

            if (!response.ok) {
                throw new Error("Meeting start failed");
            }

            const result = await response.json();
            const joinUrl = result?.data?.microsoft?.joinUrl || result?.data?.microsoft?.webLink || "";
            this.addEventLog(`Meeting started for ${this.currentRoom.teamName}`);
            if (joinUrl) {
                window.open(joinUrl, "_blank", "noopener");
            }
        } catch (error) {
            console.error("Meeting start error:", error);
            this.addEventLog("Failed to start meeting", "error");
        }
    }

    async handleStartMicrosoftMeeting() {
        if (!this.currentRoom) {
            alert("Please select a room first");
            return;
        }

        const title = window.prompt("Teams meeting title", `${this.getRoomDisplayName(this.currentRoom)} Microsoft sync`);
        if (title === null) return;

        const start = new Date(Date.now() + 10 * 60 * 1000);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        const payload = {
            title,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            module: "admin-chat",
            description: `Meeting launched from chat room ${this.getRoomDisplayName(this.currentRoom)}.`,
        };

        if (this.currentRoom.teamId) {
            payload.teamId = this.currentRoom.teamId;
        } else if (this.currentRoom.directMeta?.otherUserId) {
            payload.targetUserId = this.currentRoom.directMeta.otherUserId;
        } else {
            const participantIds = this.getRoomParticipants(this.currentRoom)
                .map((participant) => participant.userId)
                .filter((id) => String(id) !== String(this.currentUser?._id));
            payload.participantUserIds = participantIds;
        }

        try {
            const response = await fetch("/api/microsoft/meetings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Microsoft Teams meeting could not be created");
            }

            const joinUrl = result?.data?.joinUrl || result?.data?.meeting?.microsoft?.joinUrl || "";
            if (joinUrl) {
                window.open(joinUrl, "_blank", "noopener");
            }
            this.addEventLog(`Microsoft Teams meeting created for ${this.getRoomDisplayName(this.currentRoom)}`);
        } catch (error) {
            console.error("Microsoft Teams meeting error:", error);
            this.addEventLog(error.message || "Failed to create Microsoft Teams meeting", "error");
        }
    }

    async handleSendMicrosoftMail() {
        if (!this.currentRoom) {
            alert("Please select a room first");
            return;
        }

        const subject = window.prompt("Outlook subject", `${this.getRoomDisplayName(this.currentRoom)} update`);
        if (subject === null) return;
        const body = window.prompt("Outlook message", `Hello team,\n\nUpdate from admin room ${this.getRoomDisplayName(this.currentRoom)}.`);
        if (body === null) return;

        const payload = {
            subject,
            body,
            module: "admin-chat",
        };

        if (this.currentRoom.teamId) {
            payload.teamId = this.currentRoom.teamId;
        } else if (this.currentRoom.directMeta?.otherUserId) {
            payload.targetUserId = this.currentRoom.directMeta.otherUserId;
        } else {
            payload.participantUserIds = this.getRoomParticipants(this.currentRoom)
                .map((participant) => participant.userId)
                .filter((id) => String(id) !== String(this.currentUser?._id));
        }

        try {
            const response = await fetch("/api/microsoft/mail/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Microsoft Outlook mail could not be sent");
            }

            this.addEventLog(`Microsoft Outlook mail sent for ${this.getRoomDisplayName(this.currentRoom)}`);
        } catch (error) {
            console.error("Microsoft Outlook error:", error);
            this.addEventLog(error.message || "Failed to send Microsoft Outlook mail", "error");
        }
    }

    async handleShareOneDriveFile() {
        if (!this.currentRoom) {
            alert("Please select a room first");
            return;
        }

        const input = document.createElement("input");
        input.type = "file";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("module", "admin-chat");
            formData.append("roomId", this.currentRoom.roomId || "");
            if (this.currentRoom.teamId) {
                formData.append("teamId", this.currentRoom.teamId);
                formData.append("folderPath", this.currentRoom.projectName || this.currentRoom.teamName || "ChatShares");
            } else {
                formData.append("folderPath", `DirectChats/${this.getRoomDisplayName(this.currentRoom)}`);
            }

            try {
                const response = await fetch("/api/microsoft/onedrive/upload", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    body: formData,
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "OneDrive upload failed");
                }

                const shareUrl = result?.data?.shareUrl || result?.data?.webUrl || "";
                await fetch(`/api/chat/rooms/${this.currentRoom.roomId}/files`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    body: JSON.stringify({
                        name: result?.data?.file?.name || file.name,
                        url: shareUrl,
                        mimeType: file.type,
                        size: file.size,
                        caption: `Shared from Microsoft OneDrive`,
                        fileCategory: "onedrive",
                    }),
                });

                this.addEventLog(`OneDrive file shared in ${this.getRoomDisplayName(this.currentRoom)}`);
                if (shareUrl) {
                    window.open(shareUrl, "_blank", "noopener");
                }
            } catch (error) {
                console.error("OneDrive share error:", error);
                this.addEventLog(error.message || "Failed to upload file to OneDrive", "error");
            }
        };
        input.click();
    }

    toggleAttachmentMenu(event) {
        event?.stopPropagation?.();
        if (!this.DOM.attachmentMenu) return;
        const shouldShow = this.DOM.attachmentMenu.hidden;
        this.DOM.attachmentMenu.hidden = !shouldShow;
        this.DOM.attachBtn?.setAttribute("aria-expanded", shouldShow ? "true" : "false");
    }

    handleOutsideClick(event) {
        if (!this.DOM.attachmentMenu?.hidden) {
            const menuWrap = this.DOM.attachmentMenu.closest(".attachment-menu-wrap");
            if (menuWrap && !menuWrap.contains(event.target)) {
                this.closeAttachmentMenu();
            }
        }
        if (event.target?.dataset?.closeModal === "true") {
            this.closeComposerModal();
        }
    }

    handleGlobalKeydown(event) {
        if (event.key === "Escape") {
            this.closeAttachmentMenu();
            this.closeComposerModal();
            this.resetVoiceDraft();
        }
    }

    closeAttachmentMenu() {
        if (!this.DOM.attachmentMenu) return;
        this.DOM.attachmentMenu.hidden = true;
        this.DOM.attachBtn?.setAttribute("aria-expanded", "false");
    }

    async handleAttachmentOption(event) {
        const option = event.target.closest(".attachment-option");
        if (!option) return;

        if (!this.currentRoom) {
            alert("Please select a room first");
            return;
        }

        const action = option.dataset.action;
        this.closeAttachmentMenu();

        switch (action) {
            case "image":
                this.pickFile({
                    input: this.DOM.fileInput,
                    accept: "image/*",
                    category: "image",
                    title: "Preview image",
                });
                break;
            case "document":
                this.pickFile({
                    input: this.DOM.fileInput,
                    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt",
                    category: "document",
                    title: "Preview document",
                });
                break;
            case "archive":
                this.pickFile({
                    input: this.DOM.fileInput,
                    accept: ".zip,.rar,.7z",
                    category: "archive",
                    title: "Preview archive",
                });
                break;
            case "camera":
                await this.openCameraCapture();
                break;
            case "video":
                this.pickFile({
                    input: this.DOM.fileInput,
                    accept: "video/*",
                    category: "video",
                    title: "Preview video",
                });
                break;
            case "audio":
                this.pickFile({
                    input: this.DOM.fileInput,
                    accept: "audio/*",
                    category: "audio",
                    title: "Preview audio file",
                });
                break;
            case "location":
                await this.prepareLiveLocation();
                break;
            case "code":
                this.prepareCodeSnippet();
                break;
            default:
                break;
        }
    }

    pickFile({ input, accept, category, title }) {
        if (!input) return;
        input.value = "";
        input.accept = accept || "";
        input.dataset.category = category || "file";
        input.dataset.title = title || "Preview attachment";
        input.click();
    }

    async openCameraCapture() {
        if (!navigator.mediaDevices?.getUserMedia) {
            this.pickFile({
                input: this.DOM.cameraInput,
                accept: "image/*",
                category: "camera",
                title: "Preview camera capture",
            });
            return;
        }

        try {
            this.stopCameraStream();
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
            });
            this.pendingAttachment = {
                kind: "camera-stream",
                title: "Capture photo from camera",
            };
            this.DOM.fileCaption.value = "";
            this.renderComposerPreview();
            this.openComposerModal();
        } catch (error) {
            console.error("Camera access error:", error);
            this.addEventLog("Camera access was denied, so file picker opened instead", "error");
            this.pickFile({
                input: this.DOM.cameraInput,
                accept: "image/*",
                category: "camera",
                title: "Preview camera capture",
            });
        }
    }

    async handleSelectedFile(source = "file") {
        const input = source === "camera" ? this.DOM.cameraInput : this.DOM.fileInput;
        const file = input?.files?.[0];
        if (!file) return;

        const category = input.dataset.category || this.resolveCategoryFromMime(file);
        const previewUrl = URL.createObjectURL(file);
        this.pendingAttachment = {
            kind: "file",
            file,
            previewUrl,
            title: input.dataset.title || "Preview attachment",
            category,
            mimeType: file.type || "",
        };

        this.DOM.fileCaption.value = "";
        this.DOM.codeLanguageInput && (this.DOM.codeLanguageInput.value = "");
        this.DOM.codeSnippetInput && (this.DOM.codeSnippetInput.value = "");
        this.renderComposerPreview();
        this.openComposerModal();
    }

    resolveCategoryFromMime(file) {
        const mime = String(file?.type || "").toLowerCase();
        if (mime.startsWith("image/")) return "image";
        if (mime.startsWith("video/")) return "video";
        if (mime.startsWith("audio/")) return "audio";
        return "document";
    }

    async prepareLiveLocation() {
        if (!navigator.geolocation) {
            this.addEventLog("Browser location is not available here", "error");
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                });
            });

            const latitude = Number(position.coords.latitude);
            const longitude = Number(position.coords.longitude);
            this.pendingAttachment = {
                kind: "location",
                title: "Preview live location",
                location: {
                    latitude,
                    longitude,
                    label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                },
            };
            this.DOM.fileCaption.value = "Current location";
            this.renderComposerPreview();
            this.openComposerModal();
        } catch (error) {
            console.error("Location access error:", error);
            this.addEventLog("Location permission was denied", "error");
        }
    }

    prepareCodeSnippet() {
        this.pendingAttachment = {
            kind: "code",
            title: "Send code snippet",
        };
        this.DOM.fileCaption.value = "";
        if (this.DOM.codeLanguageInput) this.DOM.codeLanguageInput.value = "javascript";
        if (this.DOM.codeSnippetInput) this.DOM.codeSnippetInput.value = "";
        this.renderComposerPreview();
        this.openComposerModal();
        this.DOM.codeSnippetInput?.focus();
    }

    openComposerModal() {
        if (this.DOM.composerModal) {
            this.DOM.composerModal.hidden = false;
        }
    }

    closeComposerModal() {
        this.stopCameraStream();
        if (this.pendingAttachment?.previewUrl) {
            URL.revokeObjectURL(this.pendingAttachment.previewUrl);
        }
        this.pendingAttachment = null;
        if (this.DOM.composerModal) {
            this.DOM.composerModal.hidden = true;
        }
        if (this.DOM.fileInput) this.DOM.fileInput.value = "";
        if (this.DOM.cameraInput) this.DOM.cameraInput.value = "";
        if (this.DOM.fileCaption) this.DOM.fileCaption.value = "";
        if (this.DOM.codeLanguageInput) this.DOM.codeLanguageInput.value = "";
        if (this.DOM.codeSnippetInput) this.DOM.codeSnippetInput.value = "";
        if (this.DOM.composerPreview) this.DOM.composerPreview.innerHTML = "";
        if (this.DOM.sendAttachmentBtn) this.DOM.sendAttachmentBtn.textContent = "Send";
        this.toggleComposerFields(false);
    }

    toggleComposerFields(showCode) {
        this.DOM.codeLanguageField?.classList.toggle("hidden", !showCode);
        this.DOM.codeSnippetField?.classList.toggle("hidden", !showCode);
    }

    renderComposerPreview() {
        if (!this.pendingAttachment || !this.DOM.composerPreview) return;

        const attachment = this.pendingAttachment;
        if (this.DOM.composerTitle) {
            this.DOM.composerTitle.textContent = attachment.title || "Preview attachment";
        }
        if (this.DOM.sendAttachmentBtn) {
            this.DOM.sendAttachmentBtn.textContent = attachment.kind === "camera-stream" ? "Capture Photo" : "Send";
        }

        if (attachment.kind === "file") {
            this.toggleComposerFields(false);
            this.DOM.composerPreview.innerHTML = this.renderFileComposerPreview(attachment);
            return;
        }

        if (attachment.kind === "camera-stream") {
            this.toggleComposerFields(false);
            this.DOM.composerPreview.innerHTML = `
                <article class="composer-file-card composer-camera-card">
                    <video id="cameraPreview" autoplay playsinline muted></video>
                    <p>Live preview is ready. Capture a photo, then send it to this room.</p>
                </article>
            `;
            window.setTimeout(() => {
                const preview = document.getElementById("cameraPreview");
                if (preview && this.cameraStream) {
                    preview.srcObject = this.cameraStream;
                }
            }, 0);
            return;
        }

        if (attachment.kind === "location") {
            this.toggleComposerFields(false);
            const location = attachment.location;
            this.DOM.composerPreview.innerHTML = `
                <article class="composer-location-card">
                    <strong>📍 Current Location</strong>
                    <p>${this.escapeHtml(location.label)}</p>
                    <a href="https://maps.google.com/?q=${location.latitude},${location.longitude}" target="_blank" rel="noopener">Open in Google Maps</a>
                </article>
            `;
            return;
        }

        if (attachment.kind === "code") {
            this.toggleComposerFields(true);
            this.DOM.composerPreview.innerHTML = `
                <article class="composer-code-card">
                    <strong>Code snippet</strong>
                    <p>Paste clean code, choose language, then send it as a formatted message card.</p>
                </article>
            `;
        }
    }

    renderFileComposerPreview(attachment) {
        const { file, previewUrl, category, mimeType } = attachment;
        const info = `
            <small>${this.escapeHtml(file.name)} | ${this.formatFileSize(file.size)} | ${this.escapeHtml(category)}</small>
        `;

        if (String(mimeType).startsWith("image/")) {
            return `
                <div class="composer-file-card">
                    <img src="${previewUrl}" alt="${this.escapeHtml(file.name)}" />
                    ${info}
                </div>
            `;
        }

        if (String(mimeType).startsWith("video/")) {
            return `
                <div class="composer-file-card">
                    <video controls src="${previewUrl}"></video>
                    ${info}
                </div>
            `;
        }

        if (String(mimeType).startsWith("audio/")) {
            return `
                <div class="composer-file-card">
                    <audio controls src="${previewUrl}"></audio>
                    ${info}
                </div>
            `;
        }

        return `
            <article class="composer-file-card">
                <strong>${this.escapeHtml(file.name)}</strong>
                <p>${this.escapeHtml(this.describeCategory(category))}</p>
                ${info}
            </article>
        `;
    }

    describeCategory(category) {
        const map = {
            image: "Image attachment",
            document: "Document attachment",
            archive: "Archive attachment",
            camera: "Camera capture",
            video: "Video attachment",
            audio: "Audio attachment",
        };
        return map[category] || "File attachment";
    }

    async sendPendingAttachment() {
        if (!this.currentRoom || !this.pendingAttachment) return;

        try {
            let sent = false;
            if (this.pendingAttachment.kind === "camera-stream") {
                await this.captureCameraPhoto();
            } else if (this.pendingAttachment.kind === "location") {
                sent = this.sendLocationAttachment();
            } else if (this.pendingAttachment.kind === "code") {
                sent = this.sendCodeAttachment();
            } else {
                await this.uploadPendingFile();
                sent = true;
            }
            if (sent) {
                this.closeComposerModal();
            }
        } catch (error) {
            console.error("Attachment send error:", error);
            this.addEventLog("Failed to send attachment", "error");
        }
    }

    async captureCameraPhoto() {
        const preview = document.getElementById("cameraPreview");
        if (!preview) {
            throw new Error("Camera preview is not ready");
        }

        const canvas = document.createElement("canvas");
        canvas.width = preview.videoWidth || 1280;
        canvas.height = preview.videoHeight || 720;
        const context = canvas.getContext("2d");
        context.drawImage(preview, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, "image/jpeg", 0.92);
        });

        if (!blob) {
            throw new Error("Failed to capture photo");
        }

        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
        });

        this.stopCameraStream();
        this.pendingAttachment = {
            kind: "file",
            file,
            previewUrl: URL.createObjectURL(file),
            title: "Preview camera capture",
            category: "camera",
            mimeType: file.type,
        };
        this.renderComposerPreview();
        this.addEventLog("Camera photo captured");
    }

    sendLocationAttachment() {
        const { location } = this.pendingAttachment || {};
        if (!location) return false;

        this.socket.emit("chat:message:send", {
            roomId: this.currentRoom.roomId,
            text: this.DOM.fileCaption?.value?.trim() || "Current location",
            messageType: "LOCATION",
            location,
        });
        this.addEventLog("Live location shared");
        return true;
    }

    sendCodeAttachment() {
        const text = this.DOM.codeSnippetInput?.value?.trim() || "";
        if (!text) {
            alert("Please paste code before sending");
            return false;
        }

        this.socket.emit("chat:message:send", {
            roomId: this.currentRoom.roomId,
            text,
            messageType: "CODE",
            codeLanguage: this.DOM.codeLanguageInput?.value?.trim() || "text",
        });
        this.addEventLog("Code snippet shared");
        return true;
    }

    async uploadPendingFile() {
        const { file, category } = this.pendingAttachment || {};
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("caption", this.DOM.fileCaption?.value || "");
        formData.append("fileCategory", category || this.resolveCategoryFromMime(file));

        let messageType = "FILE";
        if (String(file.type || "").startsWith("audio/")) {
            messageType = "VOICE";
        }
        formData.append("messageType", messageType);

        const response = await fetch(`/api/chat/rooms/${this.currentRoom.roomId}/files`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error("File upload failed");
        }

        this.addEventLog(`${file.name} shared`);
    }

    async toggleVoiceRecording() {
        if (this.mediaRecorder?.state === "recording") {
            this.stopVoiceRecording();
            return;
        }

        if (!this.currentRoom) {
            alert("Please select a room first");
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            alert("Voice note recording is not supported in this browser");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.recordingStream = stream;
            this.recordedChunks = [];
            const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm")
                ? "audio/webm"
                : "";
            this.mediaRecorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);

            this.mediaRecorder.addEventListener("dataavailable", (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            });

            this.mediaRecorder.addEventListener("stop", () => this.handleRecordingStopped());
            this.mediaRecorder.start();
            this.recordingStartedAt = Date.now();
            this.startRecordingTimer();
            this.setRecordingState("Recording voice note...");
            this.DOM.voiceNoteBtn?.classList.add("recording");
            this.DOM.voiceNoteBtn?.setAttribute("aria-pressed", "true");
            this.DOM.recordingPreview?.removeAttribute("src");
            this.DOM.sendRecordingBtn?.setAttribute("disabled", "disabled");
        } catch (error) {
            console.error("Voice recording error:", error);
            this.addEventLog("Microphone access was denied", "error");
        }
    }

    stopVoiceRecording() {
        if (this.mediaRecorder?.state === "recording") {
            this.mediaRecorder.stop();
        }
    }

    handleRecordingStopped() {
        this.stopRecordingTimer();
        this.stopRecordingTracks();

        const durationSeconds = Math.max(1, Math.round((Date.now() - this.recordingStartedAt) / 1000));
        const blob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder?.mimeType || "audio/webm",
        });

        this.voiceDraft = {
            blob,
            durationSeconds,
            fileName: `voice-note-${Date.now()}.webm`,
        };

        const previewUrl = URL.createObjectURL(blob);
        this.setRecordingState("Preview voice note before sending");
        if (this.DOM.recordingPreview) {
            this.DOM.recordingPreview.src = previewUrl;
        }
        this.DOM.sendRecordingBtn?.removeAttribute("disabled");
        this.DOM.voiceNoteBtn?.classList.remove("recording");
        this.DOM.voiceNoteBtn?.setAttribute("aria-pressed", "false");
        this.mediaRecorder = null;
    }

    startRecordingTimer() {
        this.stopRecordingTimer();
        this.updateRecordingDuration();
        this.recordingTimer = window.setInterval(() => this.updateRecordingDuration(), 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            window.clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    updateRecordingDuration() {
        if (!this.DOM.recordingTime) return;
        const seconds = Math.max(0, Math.floor((Date.now() - this.recordingStartedAt) / 1000));
        this.DOM.recordingTime.textContent = this.formatClock(seconds);
    }

    setRecordingState(text) {
        if (this.DOM.voiceRecorderPanel) {
            this.DOM.voiceRecorderPanel.hidden = false;
        }
        if (this.DOM.recordingStatus) {
            this.DOM.recordingStatus.textContent = text;
        }
    }

    stopRecordingTracks() {
        if (this.recordingStream) {
            this.recordingStream.getTracks().forEach((track) => track.stop());
            this.recordingStream = null;
        }
    }

    stopCameraStream() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach((track) => track.stop());
            this.cameraStream = null;
        }
    }

    resetVoiceDraft() {
        this.stopRecordingTimer();
        this.stopRecordingTracks();
        if (this.mediaRecorder?.state === "recording") {
            this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;
        this.recordedChunks = [];

        if (this.voiceDraft) {
            this.voiceDraft = null;
        }

        if (this.DOM.recordingPreview?.src) {
            URL.revokeObjectURL(this.DOM.recordingPreview.src);
            this.DOM.recordingPreview.removeAttribute("src");
        }

        if (this.DOM.voiceRecorderPanel) {
            this.DOM.voiceRecorderPanel.hidden = true;
        }
        if (this.DOM.recordingTime) {
            this.DOM.recordingTime.textContent = "00:00";
        }
        this.DOM.voiceNoteBtn?.classList.remove("recording");
        this.DOM.voiceNoteBtn?.setAttribute("aria-pressed", "false");
        this.DOM.sendRecordingBtn?.setAttribute("disabled", "disabled");
    }

    async sendVoiceDraft() {
        if (!this.currentRoom || !this.voiceDraft) return;

        const formData = new FormData();
        formData.append("file", new File([this.voiceDraft.blob], this.voiceDraft.fileName, {
            type: this.voiceDraft.blob.type || "audio/webm",
        }));
        formData.append("caption", "Voice note");
        formData.append("messageType", "VOICE");
        formData.append("fileCategory", "voice-note");
        formData.append("voiceDurationSeconds", String(this.voiceDraft.durationSeconds));

        try {
            const response = await fetch(`/api/chat/rooms/${this.currentRoom.roomId}/files`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Voice note upload failed");
            }

            this.addEventLog("Voice note sent");
            this.resetVoiceDraft();
        } catch (error) {
            console.error("Voice note send error:", error);
            this.addEventLog("Failed to send voice note", "error");
        }
    }

    selectRoom(room) {
        this.currentRoom = room;
        this.typingUsers.clear();
        this.clearUnreadForRoom(room.roomId);
        this.loadRoomMessages(room.roomId);
        this.updateRoomUI(room);
        this.renderRoomList();
        this.maybeRunAutoAction();
    }

    startRoomRefreshLoop() {
        this.stopRoomRefreshLoop();
        this.roomRefreshTimer = window.setInterval(() => {
            this.refreshRooms({ silent: true });
        }, 15000);
    }

    stopRoomRefreshLoop() {
        if (this.roomRefreshTimer) {
            window.clearInterval(this.roomRefreshTimer);
            this.roomRefreshTimer = null;
        }
    }

    async refreshRooms(options = {}) {
        const { silent = false, autoSelectNew = false } = options;

        if (!localStorage.getItem("token")) return;

        try {
            if (this.socket?.connected) {
                this.socket.emit("chat:rooms:refresh");
                return;
            }

            const response = await fetch("/api/chat/rooms/my", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to refresh rooms");
            }

            const result = await response.json();
            const previousIds = new Set(this.rooms.map((room) => room.roomId));
            this.rooms = Array.isArray(result.data) ? result.data : [];
            this.initializeRoomInsights(this.rooms);

            if (this.currentRoom?.roomId) {
                const refreshedCurrentRoom = this.rooms.find((room) => room.roomId === this.currentRoom.roomId);
                if (refreshedCurrentRoom) {
                    this.currentRoom = refreshedCurrentRoom;
                    this.updateRoomUI(refreshedCurrentRoom);
                }
            }

            this.renderRoomList();

            if (autoSelectNew) {
                const newRoom = this.rooms.find((room) => !previousIds.has(room.roomId));
                if (newRoom) {
                    this.selectRoom(newRoom);
                }
            }
        } catch (error) {
            console.error("Room refresh error:", error);
            if (!silent) {
                this.addEventLog("Failed to refresh rooms", "error");
            }
        }
    }

    maybeRunAutoAction() {
        if (!this.pendingAutoAction || !this.currentRoom) return;

        const action = String(this.pendingAutoAction).toLowerCase();
        this.pendingAutoAction = "";

        if (action === "call") {
            window.setTimeout(() => this.handleStartCall(), 250);
        }
    }

    async loadRoomMessages(roomId) {
        try {
            const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to load messages");
            }

            const result = await response.json();
            const messages = result.data?.messages || [];
            this.messageBuffer = messages;
            this.DOM.messageList.innerHTML = "";

            if (!messages.length) {
                this.renderEmptyState("No messages yet. Start the conversation!");
            } else {
                messages.forEach((message) => this.renderMessage(message));
                const lastMessage = messages[messages.length - 1];
                this.updateRoomInsightFromMessage(lastMessage, true);
            }

            this.renderTypingIndicator();
            this.renderVisibleReceiptStates();
            this.scrollToBottom();
        } catch (error) {
            console.error("Load messages error:", error);
            this.addEventLog("Failed to load message history", "error");
        }
    }

    renderEmptyState(text) {
        this.DOM.messageList.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>${this.escapeHtml(text)}</p>
            </div>
        `;
    }

    updateRoomUI(room) {
        const participantCount = this.getRoomParticipants(room).length;
        this.DOM.activeRoomName.textContent = this.getRoomDisplayName(room);
        this.DOM.activeRoomMeta.textContent = `${this.getRoomSubtitle(room)} | ${participantCount} participants`;
        this.DOM.roomProjectName.textContent = this.getRoomSubtitle(room);
        this.DOM.roomParticipantCount.textContent = String(participantCount);
        this.DOM.roomMessageCount.textContent = String(this.messageBuffer.length);
        if (this.DOM.startMeetingBtn) {
            this.DOM.startMeetingBtn.disabled = !room.teamId;
        }
    }

    updateRoomMessageCount(roomId) {
        const insight = this.roomInsights.get(roomId);
        if (insight) {
            insight.lastMessageAt = new Date().toISOString();
        }
        if (this.currentRoom?.roomId === roomId && this.DOM.roomMessageCount) {
            this.DOM.roomMessageCount.textContent = String(this.messageBuffer.length);
        }
    }

    searchRooms(query) {
        const normalized = String(query || "").toLowerCase();
        const filtered = this.rooms.filter((room) => {
            const text = [
                this.getRoomDisplayName(room),
                this.getRoomSubtitle(room),
                ...(room.participants || []).map((participant) => participant.name),
            ].join(" ").toLowerCase();
            return text.includes(normalized);
        });

        this.renderRoomList(filtered);
    }

    renderRoomList(list = this.rooms) {
        if (!this.DOM.roomList) return;
        this.DOM.roomList.innerHTML = "";
        this.DOM.roomCount.textContent = `${list.length} ${list.length === 1 ? "room" : "rooms"}`;
        list.forEach((room) => this.renderRoomItem(room));
    }

    renderRoomItem(room) {
        const insight = this.roomInsights.get(room.roomId) || {};
        const participants = this.getRoomParticipants(room);
        const onlineCount = participants.filter((participant) => this.onlineUsers.has(String(participant.userId))).length;
        const initials = this.getInitials(this.getRoomDisplayName(room) || this.getRoomSubtitle(room) || "TR");
        const div = document.createElement("button");
        div.className = "room-item";
        div.type = "button";
        div.dataset.roomId = room.roomId;

        if (this.currentRoom?.roomId === room.roomId) {
            div.classList.add("active");
        }

        div.innerHTML = `
            <span class="room-avatar">${this.escapeHtml(initials)}</span>
            <span class="room-copy">
                <span class="room-title-row">
                    <strong>${this.escapeHtml(this.getRoomDisplayName(room))}</strong>
                    <small>${this.escapeHtml(this.formatRoomTimestamp(insight.lastMessageAt))}</small>
                </span>
                <span class="room-project">${this.escapeHtml(this.getRoomSubtitle(room))}</span>
                <span class="room-snippet">${this.escapeHtml(insight.lastMessageText || "No messages yet")}</span>
            </span>
            <span class="room-meta">
                <span class="presence-pill">${onlineCount} online</span>
                ${insight.unreadCount ? `<span class="unread-pill">${insight.unreadCount}</span>` : ""}
            </span>
        `;

        div.addEventListener("click", () => this.selectRoom(room));
        this.DOM.roomList.appendChild(div);
    }

    renderMessage(message) {
        if (!this.DOM.messageList) return;

        if (this.DOM.messageList.querySelector(".empty-state")) {
            this.DOM.messageList.innerHTML = "";
        }

        const isOwn = this.isOwnMessage(message);
        const div = document.createElement("article");
        div.className = `message ${isOwn ? "own" : "other"}`;
        div.dataset.messageId = message._id;

        div.innerHTML = `
            <div class="message-body">
                <div class="message-sender">
                    <span class="message-avatar">${this.escapeHtml(this.getInitials(message.senderName || "U"))}</span>
                    <span>
                        <strong>${this.escapeHtml(message.senderName || "Unknown user")}</strong>
                        <span class="message-role">${this.escapeHtml(message.senderRole || "MEMBER")}</span>
                    </span>
                </div>
                ${this.renderMessageBody(message)}
                <div class="message-footer">
                    <time class="message-time" title="${new Date(message.createdAt).toLocaleString()}">
                        ${this.formatTime(message.createdAt)}
                    </time>
                    <span class="message-receipt">${isOwn ? this.renderReceiptLabel(message) : ""}</span>
                </div>
            </div>
        `;

        this.DOM.messageList.appendChild(div);
    }

    renderMessageBody(message) {
        if (message.messageType === "FILE") {
            const mimeType = String(message.mimeType || "");
            const category = String(message.metadata?.fileCategory || "").toLowerCase();

            if (mimeType.startsWith("image/")) {
                return `
                    <div class="message-file">
                        <strong>${this.escapeHtml(message.fileName || "Image")}</strong>
                        <img src="${message.fileUrl}" alt="${this.escapeHtml(message.fileName || "Image")}" />
                        ${message.text ? `<p>${this.escapeHtml(message.text)}</p>` : ""}
                    </div>
                `;
            }

            if (mimeType.startsWith("video/")) {
                return `
                    <div class="message-file">
                        <strong>${this.escapeHtml(message.fileName || "Video")}</strong>
                        <video controls src="${message.fileUrl}"></video>
                        ${message.text ? `<p>${this.escapeHtml(message.text)}</p>` : ""}
                        <small>${this.formatFileSize(message.fileSize)}</small>
                    </div>
                `;
            }

            if (mimeType.startsWith("audio/")) {
                return `
                    <div class="message-file">
                        <strong>${this.escapeHtml(message.fileName || "Audio")}</strong>
                        <audio controls src="${message.fileUrl}"></audio>
                        ${message.text ? `<p>${this.escapeHtml(message.text)}</p>` : ""}
                    </div>
                `;
            }

            return `
                <div class="message-file">
                    <strong>${this.escapeHtml(category ? `${category.toUpperCase()} Attachment` : "File Attachment")}</strong>
                    <a href="${message.fileUrl}" target="_blank" rel="noopener">
                        File: ${this.escapeHtml(message.fileName || "Open file")}
                    </a>
                    ${message.text ? `<p>${this.escapeHtml(message.text)}</p>` : ""}
                    <small>${this.formatFileSize(message.fileSize)}</small>
                </div>
            `;
        }

        if (message.messageType === "VOICE") {
            return `
                <article class="call-card voice-note-card">
                    <strong>Voice Note</strong>
                    <p>${this.escapeHtml(message.text || "Audio message")}</p>
                    <p><audio controls src="${message.fileUrl || "#"}"></audio></p>
                    <small>${this.formatVoiceDuration(message)}</small>
                </article>
            `;
        }

        if (message.messageType === "LOCATION" && message.location) {
            const latitude = Number(message.location.latitude || 0).toFixed(5);
            const longitude = Number(message.location.longitude || 0).toFixed(5);
            return `
                <article class="call-card">
                    <strong>Shared Location</strong>
                    <p>${this.escapeHtml(message.location.label || `${latitude}, ${longitude}`)}</p>
                    <p><a href="https://maps.google.com/?q=${latitude},${longitude}" target="_blank" rel="noopener">Open in Maps</a></p>
                </article>
            `;
        }

        if (message.messageType === "CODE") {
            return `<pre class="call-card"><code>${this.escapeHtml(message.text || "")}</code></pre>`;
        }

        if (message.messageType === "SYSTEM" && message.callData?.type === "VOICE_CALL") {
            return `
                <article class="call-card">
                    <strong>Voice Call</strong>
                    <p>${this.escapeHtml((message.callData.participantNames || []).join(", ") || "Room participants")}</p>
                    <small>Status: ${this.escapeHtml(message.callData.status || "ENDED")} | Duration: ${this.formatDuration(message.callData.duration || 0)}</small>
                </article>
            `;
        }

        return `<p>${this.escapeHtml(message.text || "")}</p>`;
    }

    renderTypingIndicator() {
        if (!this.DOM.typingIndicator) return;
        if (this.typingUsers.size === 0) {
            this.DOM.typingIndicator.innerHTML = "";
            return;
        }

        const names = Array.from(this.typingUsers)
            .map((userId) => this.findParticipantName(userId))
            .join(", ");

        this.DOM.typingIndicator.innerHTML = `
            <span class="typing-dots">
                <span></span><span></span><span></span>
            </span>
            ${this.escapeHtml(names || "Someone")} ${this.typingUsers.size === 1 ? "is" : "are"} typing...
        `;
    }

    renderVisibleReceiptStates() {
        if (!this.DOM.messageList) return;
        this.DOM.messageList.querySelectorAll(".message[data-message-id]").forEach((node) => {
            const message = this.messageBuffer.find((item) => String(item._id) === node.dataset.messageId);
            if (!message || !this.isOwnMessage(message)) return;
            const label = node.querySelector(".message-receipt");
            if (label) {
                label.innerHTML = this.renderReceiptLabel(message);
            }
        });
    }

    renderReceiptLabel(message) {
        const status = this.getReceiptState(message);
        const labels = {
            SENT: "✓ Sent",
            DELIVERED: "✓✓ Delivered",
            SEEN: "✓✓ Seen",
        };
        const className = `receipt-pill ${status.toLowerCase()}`;
        return `<span class="${className}">${labels[status]}</span>`;
    }

    getReceiptState(message) {
        const readBy = new Set((message.readBy || []).map(String));
        const recipients = this.getRoomParticipants(this.currentRoom).filter((participant) =>
            String(participant.userId) !== String(this.currentUser?._id));
        const seenCount = recipients.filter((participant) => readBy.has(String(participant.userId))).length;

        if (seenCount > 0) {
            return "SEEN";
        }

        const hasOnlineRecipient = recipients.some((participant) => this.onlineUsers.has(String(participant.userId)));
        if (hasOnlineRecipient) {
            return "DELIVERED";
        }

        return "SENT";
    }

    addEventLog(message, type = "info") {
        if (!this.DOM.eventFeed || !message) return;
        const div = document.createElement("div");
        div.className = `event-log ${type}`;
        div.innerHTML = `
            <span>${this.escapeHtml(message)}</span>
            <span class="event-time">${this.formatTime(new Date())}</span>
        `;
        this.DOM.eventFeed.insertBefore(div, this.DOM.eventFeed.firstChild);

        while (this.DOM.eventFeed.children.length > 8) {
            this.DOM.eventFeed.removeChild(this.DOM.eventFeed.lastChild);
        }
    }

    updateStatus(status, message) {
        if (this.DOM.socketStatus) {
            this.DOM.socketStatus.textContent = status;
        }
        if (this.DOM.roomStatus) {
            this.DOM.roomStatus.textContent = message;
        }
    }

    queueReadReceipt(messageId) {
        if (!messageId || !this.currentRoom) return;
        this.pendingReadIds.add(String(messageId));

        if (this.readFlushTimer) return;
        this.readFlushTimer = window.setTimeout(() => this.flushReadReceipts(), 250);
    }

    async flushReadReceipts() {
        const messageIds = Array.from(this.pendingReadIds);
        this.pendingReadIds.clear();
        this.readFlushTimer = null;

        if (!messageIds.length || !this.currentRoom) return;

        try {
            await fetch(`/api/chat/rooms/${this.currentRoom.roomId}/read`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ messageIds }),
            });
        } catch (error) {
            console.error("Read receipt update failed:", error);
        }
    }

    updateRoomInsightFromMessage(message, isActiveRoom) {
        if (!message?.roomId) return;
        const insight = this.roomInsights.get(message.roomId) || {
            lastMessageText: "No messages yet",
            lastMessageAt: null,
            unreadCount: 0,
        };

        insight.lastMessageText = this.getMessagePreview(message);
        insight.lastMessageAt = message.createdAt;
        if (isActiveRoom) {
            insight.unreadCount = 0;
        }

        this.roomInsights.set(message.roomId, insight);
    }

    incrementUnreadForRoom(roomId) {
        const insight = this.roomInsights.get(roomId) || {
            lastMessageText: "No messages yet",
            lastMessageAt: null,
            unreadCount: 0,
        };
        insight.unreadCount += 1;
        this.roomInsights.set(roomId, insight);
    }

    clearUnreadForRoom(roomId) {
        const insight = this.roomInsights.get(roomId);
        if (insight) {
            insight.unreadCount = 0;
        }
    }

    getMessagePreview(message) {
        if (message.messageType === "FILE") {
            const category = message.metadata?.fileCategory ? `${message.metadata.fileCategory} ` : "";
            return `${message.senderName}: shared ${category}${message.fileName || "file"}`;
        }
        if (message.messageType === "VOICE") {
            return `${message.senderName}: sent a voice note`;
        }
        if (message.messageType === "LOCATION") {
            return `${message.senderName}: shared live location`;
        }
        if (message.messageType === "CODE") {
            return `${message.senderName}: shared a code snippet`;
        }
        if (message.messageType === "SYSTEM") {
            return message.text || "System activity";
        }
        return `${message.senderName}: ${message.text || "New message"}`;
    }

    getRoomParticipants(room = this.currentRoom) {
        return Array.isArray(room?.participants) ? room.participants : [];
    }

    getRoomDisplayName(room = this.currentRoom) {
        if (room?.roomType === "DIRECT") {
            return room.directMeta?.otherUserName || room.teamName || "Direct chat";
        }
        return room?.teamName || "Room";
    }

    getRoomSubtitle(room = this.currentRoom) {
        if (room?.roomType === "DIRECT") {
            const role = room.directMeta?.otherUserRole || "USER";
            const department = room.directMeta?.otherUserDepartment || "";
            return department ? `${role} | ${department}` : role;
        }
        return room?.projectName || "No project linked yet";
    }

    findParticipantName(userId) {
        const participant = this.getRoomParticipants().find((item) => String(item.userId) === String(userId));
        return participant?.name || "Someone";
    }

    isOwnMessage(message) {
        return String(message.senderId) === String(this.currentUser?._id);
    }

    scrollToBottom() {
        window.setTimeout(() => {
            if (this.DOM.messageList) {
                this.DOM.messageList.scrollTop = this.DOM.messageList.scrollHeight;
            }
        }, 0);
    }

    formatTime(date) {
        const value = new Date(date);
        const now = new Date();
        if (value.toDateString() === now.toDateString()) {
            return value.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
            });
        }

        return value.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    }

    formatRoomTimestamp(date) {
        if (!date) return "Just now";
        const value = new Date(date);
        const now = new Date();
        if (value.toDateString() === now.toDateString()) {
            return value.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return value.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
        });
    }

    formatFileSize(bytes) {
        if (!bytes) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const index = Math.floor(Math.log(bytes) / Math.log(k));
        return `${Math.round((bytes / Math.pow(k, index)) * 100) / 100} ${sizes[index]}`;
    }

    formatDuration(seconds) {
        const totalSeconds = Math.max(0, Number(seconds || 0));
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const remainingSeconds = String(totalSeconds % 60).padStart(2, "0");
        return `${hours}:${minutes}:${remainingSeconds}`;
    }

    formatClock(seconds) {
        const total = Math.max(0, Number(seconds || 0));
        const minutes = String(Math.floor(total / 60)).padStart(2, "0");
        const remaining = String(total % 60).padStart(2, "0");
        return `${minutes}:${remaining}`;
    }

    formatVoiceDuration(message) {
        return `Duration ${this.formatClock(message.metadata?.voiceDurationSeconds || 0)}`;
    }

    getInitials(value) {
        return String(value || "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "NA";
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text == null ? "" : String(text);
        return div.innerHTML;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.__projectChatAutoInit === false) {
        return;
    }
    window.projectChat = new ProjectChat();
});

window.ProjectChat = ProjectChat;
