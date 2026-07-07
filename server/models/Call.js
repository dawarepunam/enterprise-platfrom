const mongoose = require("mongoose");

const callSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true,
    },
    roomId: {
        type: String,
        required: true,
        index: true,
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        default: null,
        index: true,
    },
    callerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    callerName: {
        type: String,
        required: true,
    },
    callerRole: {
        type: String,
        trim: true,
        default: "MEMBER",
    },
    participantIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }, ],
    participantNames: [{
        type: String,
    }, ],
    callType: {
        type: String,
        enum: ["ONE_TO_ONE", "GROUP"],
        default: "ONE_TO_ONE",
    },
    status: {
        type: String,
        enum: ["INITIATED", "RINGING", "ACTIVE", "ENDED", "REJECTED", "MISSED"],
        default: "INITIATED",
        index: true,
    },
    startedAt: {
        type: Date,
        default: null,
    },
    endedAt: {
        type: Date,
        default: null,
    },
    duration: {
        type: Number,
        default: 0, // in seconds
    },
    recordingUrl: {
        type: String,
        default: "",
    },
    notes: {
        type: String,
        default: "",
    },
    metadata: {
        mediaDevices: String,
        connectionQuality: String,
        audioCodec: String,
    },
}, { timestamps: true });

// Calculate duration before saving
callSchema.pre("save", async function() {
    if (this.startedAt && this.endedAt) {
        this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    }
});

module.exports = mongoose.models.Call || mongoose.model("Call", callSchema);
