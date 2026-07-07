const meetingState = { rooms: [], meetings: [] };

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({
    navbarPath: "../../../components/navbar.html",
    sidebarPath: "../../../components/sidebar.html",
  });
  if (!ready) return;
  document.getElementById("startMeetingBtn").addEventListener("click", startFirstMeeting);
  await loadMeetingData();
});

async function loadMeetingData() {
  try {
    const [roomsResponse, meetingsResponse] = await Promise.all([
      apiRequest("/chat/rooms/my"),
      apiRequest("/meetings"),
    ]);
    meetingState.rooms = roomsResponse.data || [];
    meetingState.meetings = meetingsResponse.data || [];
  } catch (error) {
    meetingState.rooms = [];
    meetingState.meetings = [];
  }

  renderMeetingCenter();
}

function renderMeetingCenter() {
  document.getElementById("meetingCount").textContent = meetingState.meetings.length;
  document.getElementById("liveCount").textContent = meetingState.meetings.filter((item) => item.status === "LIVE").length;
  document.getElementById("teamCount").textContent = meetingState.rooms.length;
  document.getElementById("teamRooms").innerHTML = meetingState.rooms.length
    ? meetingState.rooms.map((room) => `<article class="list-card"><strong>${escapeMeeting(room.teamName)}</strong><span class="list-meta">${escapeMeeting(room.projectName || "No project linked")}</span></article>`).join("")
    : '<p class="empty-state">No team rooms assigned.</p>';
  document.getElementById("meetingLog").innerHTML = meetingState.meetings.length
    ? meetingState.meetings.map((meeting) => `<article class="list-card"><strong>${escapeMeeting(meeting.title)}</strong><span class="list-meta">${escapeMeeting(meeting.status)} • ${meeting.meetingType}</span></article>`).join("")
    : '<p class="empty-state">No meeting history available yet.</p>';
}

async function startFirstMeeting() {
  const target = meetingState.rooms[0];
  if (!target) return;
  await apiRequest("/meetings/start", {
    method: "POST",
    body: { teamId: target.teamId, title: `${target.teamName} Sync`, meetingType: "VIDEO" },
  });
  await loadMeetingData();
}

function escapeMeeting(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
