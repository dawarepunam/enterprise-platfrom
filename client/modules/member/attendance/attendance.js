let attendanceData = null;

document.addEventListener("DOMContentLoaded", async () => {
  const ready = await initWorkspace({ navbarPath: "../../../components/navbar.html", sidebarPath: "../../../components/sidebar.html", requireRole: "MEMBER" });
  if (!ready) return;
  document.getElementById("checkInBtn")?.addEventListener("click", () => submitAttendance("check-in"));
  document.getElementById("checkOutBtn")?.addEventListener("click", () => submitAttendance("check-out"));
  await loadAttendance();
});

async function loadAttendance() {
  attendanceData = await window.memberWorkflow.loadMemberData();
  document.getElementById("attendanceCards").innerHTML = (attendanceData.attendance || []).length
    ? attendanceData.attendance
        .map(
          (item) => `
            <article class="list-card">
              <strong>${escapeHtml(item.date || "-")}</strong>
              <span class="list-meta">${escapeHtml(item.status || "Present")} • ${Number(item.hours || 0)} hours</span>
              <span class="status-note">Check in ${window.memberWorkflow.formatDateTime(item.checkInAt)} • Check out ${window.memberWorkflow.formatDateTime(item.checkOutAt)}</span>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">No attendance records yet.</p>';
}

async function submitAttendance(mode) {
  try {
    const selfieUrl = await readSelectedFileAsDataUrl("attendanceSelfie");
    const location = await getBrowserLocation();
    const payload = {
      status: document.getElementById("attendanceStatus").value,
      selfieUrl,
      location,
      locationLabel: document.getElementById("attendanceLocationLabel").value.trim() || location.label,
      deviceInfo: navigator.userAgent,
    };

    await apiRequest(`/attendance/${mode}`, {
      method: mode === "check-in" ? "POST" : "PUT",
      body: payload,
    });
    showToast?.(mode === "check-in" ? "Attendance checked in successfully." : "Attendance checked out successfully.", "success", { title: "Attendance Saved" });
    await loadAttendance();
  } catch (error) {
    showToast?.(error.message || "Unable to save attendance.", "error", { title: "Attendance Failed" });
  }
}

async function readSelectedFileAsDataUrl(inputId) {
  const file = document.getElementById(inputId)?.files?.[0];
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read selfie file"));
    reader.readAsDataURL(file);
  });
}

async function getBrowserLocation() {
  if (!navigator.geolocation) {
    return { label: "Browser location unavailable" };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
        }),
      () => resolve({ label: "Location permission denied" }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
