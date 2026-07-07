const PIPELINE_STAGES = ["Applied", "Screening", "Interview", "Technical Round", "Offer Sent", "Hired", "Rejected"];

const recruitmentState = {
  filters: {
    search: "",
    status: "",
    role: "",
  },
  desk: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  await window.hrApp.bootPage({
    pageKey: "recruitment",
    title: "Recruitment",
    description: "Interviews, jobs, offers, and candidate workflow",
    onRealtime: () => loadRecruitmentDesk(),
  });
  bindRecruitmentEvents();
  loadRecruitmentDesk();
});

async function loadRecruitmentDesk() {
  renderLoadingState();

  try {
    const response = await API.get("/hr/recruitment");
    recruitmentState.desk = response.data || {};
    renderRecruitmentDesk(recruitmentState.desk);
  } catch (error) {
    window.hrApp.toast(error.message, "error");
  }
}

function renderLoadingState() {
  window.hrApp.renderSkeletons("#interviewCards", 8);
  window.hrApp.renderSkeletons("#openJobsGrid", 3);
  window.hrApp.renderSkeletons("#pipelineBoard", 6);
  window.hrApp.renderSkeletons("#candidateCardGrid", 4);
  window.hrApp.renderSkeletons("#candidateTableBody", 4);
  window.hrApp.renderSkeletons("#interviewCardGrid", 4);
  window.hrApp.renderSkeletons("#offerLetterList", 3);
  window.hrApp.renderSkeletons("#resumeDatabaseList", 4);
  window.hrApp.renderSkeletons("#recruitmentCalendarList", 4);
}

function bindRecruitmentEvents() {
  document.getElementById("candidateSearch")?.addEventListener("input", (event) => {
    recruitmentState.filters.search = String(event.target.value || "").trim().toLowerCase();
    renderCandidates(recruitmentState.desk?.candidates || []);
  });

  document.getElementById("candidateStatusFilter")?.addEventListener("change", (event) => {
    recruitmentState.filters.status = event.target.value;
    renderCandidates(recruitmentState.desk?.candidates || []);
  });

  document.getElementById("candidateRoleFilter")?.addEventListener("change", (event) => {
    recruitmentState.filters.role = event.target.value;
    renderCandidates(recruitmentState.desk?.candidates || []);
  });

  document.getElementById("postJobBtn")?.addEventListener("click", openJobComposer);
  document.getElementById("addCandidateBtn")?.addEventListener("click", openCandidateComposer);
  document.getElementById("exportRecruitmentBtn")?.addEventListener("click", exportRecruitmentDesk);
}

function renderRecruitmentDesk(data) {
  const metrics = data.metrics || {};
  document.getElementById("interviewCards").innerHTML = [
    ["Total Employees", metrics.totalEmployees],
    ["New Joiners", metrics.newJoiners],
    ["Open Job Positions", metrics.openJobs],
    ["Interviews Scheduled", metrics.interviewsScheduled],
    ["Present Employees", metrics.presentEmployees],
    ["Leave Requests", metrics.leaveRequests],
    ["Payroll Pending", metrics.payrollPending],
    ["Hiring Progress", metrics.hiringProgress, "%"],
  ].map(([label, value, suffix]) => `
    <article class="hr-metric-card">
      <p class="hr-meta">${label}</p>
      <strong>${window.hrApp.formatNumber(value || 0)}${suffix || ""}</strong>
    </article>
  `).join("");

  renderDeskNav(data);
  renderJobs(data.jobs || []);
  renderAnalytics(data);
  renderPipeline(data.candidates || []);
  renderCandidates(data.candidates || []);
  renderInterviewManagement(data.interviews || []);
  renderOfferLetters(data.offers || []);
  renderResumeDatabase(data.candidates || []);
  renderRecruitmentCalendar(data.calendar || []);
}

function renderDeskNav(data) {
  document.getElementById("recruitmentDeskNav").innerHTML = [
    ["Open Jobs", "JB", `${(data.jobs || []).length} live roles`],
    ["Candidates", "CD", `${(data.candidates || []).length} profiles`],
    ["Interview Pipeline", "IP", `${data.metrics?.interviewsScheduled || 0} scheduled`],
    ["Resume Database", "RS", `${(data.candidates || []).length} searchable resumes`],
    ["Hiring Analytics", "AN", `${data.metrics?.selected || 0} selected`],
    ["Offer Letters", "OF", `${(data.offers || []).length} offers`],
    ["Recruitment Calendar", "CL", `${(data.calendar || []).length} planned items`],
  ].map(([label, icon, meta]) => `
    <article class="recruitment-nav-card">
      <span class="recruitment-nav-icon">${icon}</span>
      <strong>${label}</strong>
      <p>${meta}</p>
    </article>
  `).join("");
}

function renderJobs(jobs) {
  document.getElementById("openJobsGrid").innerHTML = jobs.length ? jobs.map((job) => `
    <article class="job-card">
      <div class="hr-card-head">
        <div>
          <strong>${escapeHtml(job.title)}</strong>
          <div class="hr-meta">${escapeHtml(job.department)} | ${escapeHtml(job.location)}</div>
        </div>
        <span class="hr-status ${window.hrApp.statusClass(job.status)}">${escapeHtml(job.status)}</span>
      </div>
      <div class="job-card-meta">
        <span class="job-meta-pill">${window.hrApp.formatNumber(job.applicants || 0)} Applicants</span>
        <span class="job-meta-pill">${window.hrApp.formatNumber(job.shortlisted || 0)} Shortlisted</span>
        <span class="job-meta-pill">Deadline ${escapeHtml(job.deadlineLabel || "Open")}</span>
      </div>
      <p>${escapeHtml(job.description || "No role summary added yet.")}</p>
      <div class="job-card-actions">
        <button class="hr-btn primary" type="button" onclick="focusRecruitmentRole('${escapeAttribute(job.title)}')">View Applicants</button>
        <button class="hr-btn" type="button" onclick="editRecruitmentJob('${escapeAttribute(job.id)}')">Edit Job</button>
        <button class="hr-btn danger" type="button" onclick="closeRecruitmentJob('${escapeAttribute(job.id)}')">Close Hiring</button>
      </div>
    </article>
  `).join("") : `<div class="hr-empty">No open jobs posted yet.</div>`;
}

function renderAnalytics(data) {
  document.getElementById("hiringAnalyticsGrid").innerHTML = [
    ["Applications", data.metrics?.applications],
    ["Selected", data.metrics?.selected],
    ["Rejected", data.metrics?.rejected],
    ["Pending", data.metrics?.pending],
  ].map(([label, value]) => `
    <article class="analytics-chip">
      <div class="hr-meta">${label}</div>
      <strong>${window.hrApp.formatNumber(value || 0)}</strong>
    </article>
  `).join("");

  document.getElementById("departmentHiringList").innerHTML = (data.departmentHiring || []).length
    ? data.departmentHiring.map((item) => `
      <article class="dept-progress-item">
        <div class="dept-progress-top">
          <strong>${escapeHtml(item.label)}</strong>
          <span class="hr-meta">${item.value} candidates</span>
        </div>
        <div class="dept-progress-bar"><span style="width:${Number(item.percentage || 0)}%"></span></div>
      </article>
    `).join("")
    : `<div class="hr-empty">No department analytics yet.</div>`;
}

function renderPipeline(candidates) {
  document.getElementById("pipelineBoard").innerHTML = PIPELINE_STAGES.map((stage) => {
    const stageCandidates = candidates.filter((candidate) => candidate.status === stage);
    return `
      <section class="pipeline-column">
        <div class="pipeline-column-head">
          <strong>${stage}</strong>
          <span class="hr-pill">${stageCandidates.length}</span>
        </div>
        ${stageCandidates.length ? stageCandidates.map((candidate) => `
          <article class="pipeline-card">
            <strong>${escapeHtml(candidate.name)}</strong>
            <p>${escapeHtml(candidate.position)} | ${escapeHtml(String(candidate.experience || 0))} yrs</p>
            <div class="pipeline-actions">
              <button class="hr-btn" type="button" onclick="viewCandidateProfile('${escapeAttribute(candidate.id)}')">View</button>
              <button class="hr-btn primary" type="button" onclick="moveCandidateStage('${escapeAttribute(candidate.id)}')">Move Stage</button>
            </div>
          </article>
        `).join("") : `<div class="hr-empty">No candidates in this stage.</div>`}
      </section>
    `;
  }).join("");
}

function renderCandidates(candidates) {
  const filtered = filterCandidates(candidates);
  document.getElementById("candidateTableCount").textContent = `${filtered.length} candidates`;

  const statusFilter = document.getElementById("candidateStatusFilter");
  const roleFilter = document.getElementById("candidateRoleFilter");
  if (statusFilter) {
    statusFilter.innerHTML = `<option value="">All Stages</option>${PIPELINE_STAGES.map((stage) => `<option value="${stage}">${stage}</option>`).join("")}`;
    statusFilter.value = recruitmentState.filters.status;
  }
  if (roleFilter) {
    roleFilter.innerHTML = `<option value="">All Roles</option>${[...new Set(candidates.map((item) => item.position).filter(Boolean))].map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join("")}`;
    roleFilter.value = recruitmentState.filters.role;
  }

  document.getElementById("candidateCardGrid").innerHTML = filtered.length ? filtered.slice(0, 6).map((candidate) => `
    <article class="candidate-card">
      <div class="candidate-card-head">
        <div class="candidate-info">
          <span class="candidate-avatar">${escapeHtml(candidate.initials || initials(candidate.name))}</span>
          <div>
            <strong>${escapeHtml(candidate.name)}</strong>
            <div class="hr-meta">${escapeHtml(candidate.email)}</div>
            <p>${escapeHtml(candidate.position)} | ${escapeHtml(candidate.location || "Location pending")}</p>
          </div>
        </div>
        <span class="hr-status ${window.hrApp.statusClass(candidate.status)}">${escapeHtml(candidate.status)}</span>
      </div>
      <div class="candidate-meta-row">
        <span class="candidate-tag">${escapeHtml(String(candidate.experience || 0))} Years</span>
        <span class="candidate-tag">${escapeHtml(candidate.expectedSalary || "Salary TBD")}</span>
        <span class="candidate-tag">${escapeHtml(candidate.education || "Education TBD")}</span>
      </div>
      <p>${escapeHtml((candidate.skills || []).join(", "))}</p>
      <div class="candidate-card-actions">
        <button class="hr-btn" type="button" onclick="viewCandidateProfile('${escapeAttribute(candidate.id)}')">View Profile</button>
        <button class="hr-btn primary" type="button" onclick="scheduleCandidateInterview('${escapeAttribute(candidate.id)}')">Schedule Interview</button>
        <button class="hr-btn" type="button" onclick="sendCandidateEmail('${escapeAttribute(candidate.id)}')">Send Email</button>
      </div>
    </article>
  `).join("") : `<div class="hr-empty">No candidates matched the current filters.</div>`;

  document.getElementById("candidateTableBody").innerHTML = filtered.length ? filtered.map((candidate) => `
    <tr>
      <td>
        <strong>${escapeHtml(candidate.name)}</strong><br />
        <span class="hr-meta">${escapeHtml(candidate.email)} | ${escapeHtml(candidate.phone || "Phone pending")}</span>
      </td>
      <td>${escapeHtml(candidate.position)}</td>
      <td>${escapeHtml(String(candidate.experience || 0))} Years</td>
      <td>${escapeHtml((candidate.skills || []).slice(0, 3).join(", "))}</td>
      <td><span class="hr-status ${window.hrApp.statusClass(candidate.status)}">${escapeHtml(candidate.status)}</span></td>
      <td><button class="hr-btn" type="button" onclick="previewResume('${escapeAttribute(candidate.id)}')">Preview</button></td>
      <td>
        <div class="hr-button-row">
          <button class="hr-btn" type="button" onclick="viewCandidateProfile('${escapeAttribute(candidate.id)}')">View</button>
          <button class="hr-btn primary" type="button" onclick="moveCandidateStage('${escapeAttribute(candidate.id)}')">Move Stage</button>
          <button class="hr-btn danger" type="button" onclick="rejectCandidate('${escapeAttribute(candidate.id)}')">Reject</button>
          <button class="hr-btn success" type="button" onclick="hireCandidate('${escapeAttribute(candidate.id)}')">Hire</button>
        </div>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="7">No candidates available.</td></tr>`;
}

function renderInterviewManagement(interviews) {
  document.getElementById("interviewCardGrid").innerHTML = interviews.length ? interviews.map((interview) => `
    <article class="interview-card">
      <div class="hr-card-head">
        <div>
          <strong>${escapeHtml(interview.candidateName)}</strong>
          <div class="hr-meta">${escapeHtml(interview.position || "Interview")} | ${escapeHtml(interview.department || "-")}</div>
        </div>
        <span class="hr-status ${window.hrApp.statusClass(interview.status)}">${escapeHtml(interview.status)}</span>
      </div>
      <p class="hr-meta">${window.hrApp.formatDate(interview.scheduledAt, { dateStyle: "full", timeStyle: "short" })}</p>
      <p>${escapeHtml(interview.notes || "Candidate discussion and evaluation flow.")}</p>
      <div class="hr-button-row">
        <button class="hr-btn primary" data-interview-join="${interview._id}">Join Teams Meeting</button>
        <button class="hr-btn" data-interview-calendar="${interview._id}">Add To Calendar</button>
        <button class="hr-btn warning" data-interview-reschedule="${interview._id}">Reschedule</button>
        <button class="hr-btn danger" data-interview-cancel="${interview._id}">Cancel</button>
        <button class="hr-btn" data-offer-email="${escapeAttribute(interview.email || "")}" data-offer-name="${escapeAttribute(interview.candidateName || "")}">Send Offer Letter</button>
      </div>
    </article>
  `).join("") : `<div class="hr-empty">No interviews scheduled yet.</div>`;

  bindInterviewActions();
}

function renderOfferLetters(offers) {
  document.getElementById("offerLetterList").innerHTML = offers.length ? offers.map((offer) => `
    <article class="offer-card">
      <div class="offer-card-head">
        <div>
          <strong>${escapeHtml(offer.candidateName)}</strong>
          <div class="hr-meta">${escapeHtml(offer.designation)} | Joining ${window.hrApp.formatDate(offer.joiningDate, { dateStyle: "medium" })}</div>
        </div>
        <span class="hr-status ${window.hrApp.statusClass(offer.status)}">${escapeHtml(offer.status)}</span>
      </div>
      <div class="offer-meta-row">
        <span class="offer-meta-pill">${escapeHtml(offer.department || "-")}</span>
        <span class="offer-meta-pill">${escapeHtml(offer.salary || "As discussed")}</span>
        <span class="offer-meta-pill">${escapeHtml(offer.manager || "HR Team")}</span>
      </div>
      <div class="hr-button-row">
        <button class="hr-btn" type="button" onclick="downloadOfferLetter('${escapeAttribute(offer.id)}')">Download PDF</button>
        <button class="hr-btn primary" type="button" onclick="sendOfferAgain('${escapeAttribute(offer.candidateId)}')">Send Email</button>
        <button class="hr-btn success" type="button" onclick="markOfferAccepted('${escapeAttribute(offer.id)}')">Accept Offer</button>
      </div>
    </article>
  `).join("") : `<div class="hr-empty">No offer letters generated yet.</div>`;
}

function renderResumeDatabase(candidates) {
  document.getElementById("resumeFilterRow").innerHTML = [
    `Skill: ${buildTopValue(candidates.map((item) => (item.skills || [])[0]).filter(Boolean))}`,
    `Experience: ${buildTopValue(candidates.map((item) => `${item.experience || 0} Years`))}`,
    `Location: ${buildTopValue(candidates.map((item) => item.location))}`,
    `Role: ${buildTopValue(candidates.map((item) => item.position))}`,
    `Education: ${buildTopValue(candidates.map((item) => item.education))}`,
  ].map((label) => `<span class="job-meta-pill">${escapeHtml(label)}</span>`).join("");

  document.getElementById("resumeDatabaseList").innerHTML = candidates.length ? candidates.slice(0, 6).map((candidate) => `
    <article class="resume-entry">
      <div class="resume-entry-head">
        <div>
          <strong>${escapeHtml(candidate.position)}</strong>
          <div class="hr-meta">${escapeHtml(candidate.name)} | ${escapeHtml(candidate.location || "Location pending")}</div>
        </div>
        <button class="hr-btn" type="button" onclick="previewResume('${escapeAttribute(candidate.id)}')">Resume</button>
      </div>
      <p>${escapeHtml(String(candidate.experience || 0))} years | ${escapeHtml(candidate.education || "Education TBD")}</p>
      <div class="candidate-meta-row">${(candidate.skills || []).slice(0, 4).map((skill) => `<span class="candidate-tag">${escapeHtml(skill)}</span>`).join("")}</div>
    </article>
  `).join("") : `<div class="hr-empty">No resumes available yet.</div>`;
}

function renderRecruitmentCalendar(calendarItems) {
  document.getElementById("recruitmentCalendarList").innerHTML = calendarItems.length ? calendarItems.map((item) => `
    <article class="calendar-entry">
      <div class="calendar-entry-head">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <div class="hr-meta">${window.hrApp.formatDate(item.when, { dateStyle: "medium", timeStyle: "short" })}</div>
        </div>
        <span class="hr-status ${window.hrApp.statusClass(item.type)}">${escapeHtml(item.type)}</span>
      </div>
      <p>${escapeHtml(item.copy || "")}</p>
      <div class="hr-button-row">
        <button class="hr-btn" type="button" onclick="openCalendarAction('${escapeAttribute(item.id)}')">Open</button>
      </div>
    </article>
  `).join("") : `<div class="hr-empty">No recruitment calendar items yet.</div>`;
}

function bindInterviewActions() {
  document.querySelectorAll("[data-interview-join]").forEach((button) => {
    button.addEventListener("click", async () => {
      const response = await API.get(`/hr/interviews/${button.dataset.interviewJoin}/join`);
      window.open(response.data.joinUrl, "_blank", "noopener");
    });
  });

  document.querySelectorAll("[data-interview-calendar]").forEach((button) => {
    button.addEventListener("click", async () => {
      await API.post(`/hr/interviews/${button.dataset.interviewCalendar}/calendar`, {});
      window.hrApp.toast("Calendar event created");
      loadRecruitmentDesk();
    });
  });

  document.querySelectorAll("[data-interview-reschedule]").forEach((button) => {
    button.addEventListener("click", async () => {
      const result = await window.hrApp.inputDialog({
        title: "Reschedule Interview",
        input: "datetime-local",
      });
      if (!result.isConfirmed || !result.value) return;
      await apiRequest(`/hr/interviews/${button.dataset.interviewReschedule}`, "PATCH", {
        status: "RESCHEDULED",
        scheduledAt: new Date(result.value).toISOString(),
      });
      window.hrApp.toast("Interview rescheduled");
      loadRecruitmentDesk();
    });
  });

  document.querySelectorAll("[data-interview-cancel]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = await window.hrApp.confirmDialog({
        title: "Cancel this interview?",
        text: "This will update the interview status immediately.",
        confirmButtonText: "Cancel interview",
        icon: "warning",
      });
      if (!confirmed) return;
      await apiRequest(`/hr/interviews/${button.dataset.interviewCancel}`, "PATCH", { status: "CANCELLED" });
      window.hrApp.toast("Interview cancelled");
      loadRecruitmentDesk();
    });
  });

  document.querySelectorAll("[data-offer-email]").forEach((button) => {
    button.addEventListener("click", async () => {
      await API.post("/hr/offer-letter", {
        toEmail: button.dataset.offerEmail,
        recipientName: button.dataset.offerName,
        subject: "Offer Letter from HR",
        message: `Dear ${button.dataset.offerName}, your interview has moved to the offer stage. Please review the shared details and connect with the HR team.`,
      });
      window.hrApp.toast("Offer letter sent");
    });
  });
}

function filterCandidates(candidates) {
  return candidates.filter((candidate) => {
    const matchesSearch = !recruitmentState.filters.search || [
      candidate.name,
      candidate.email,
      candidate.position,
      candidate.location,
      ...(candidate.skills || []),
    ].join(" ").toLowerCase().includes(recruitmentState.filters.search);
    const matchesStatus = !recruitmentState.filters.status || candidate.status === recruitmentState.filters.status;
    const matchesRole = !recruitmentState.filters.role || candidate.position === recruitmentState.filters.role;
    return matchesSearch && matchesStatus && matchesRole;
  });
}

function findCandidate(id) {
  return (recruitmentState.desk?.candidates || []).find((candidate) => candidate.id === id);
}

function findOffer(id) {
  return (recruitmentState.desk?.offers || []).find((offer) => offer.id === id);
}

function buildTopValue(items) {
  const counts = items.reduce((acc, item) => {
    const key = String(item || "").trim();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : "N/A";
}

function initials(name = "") {
  return String(name)
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function escapeAttribute(value = "") {
  return String(value).replace(/'/g, "&#39;");
}

function inferDepartmentFromRole(role) {
  const value = String(role || "").toLowerCase();
  if (value.includes("hr")) return "HR";
  if (value.includes("sales")) return "Sales";
  if (value.includes("marketing")) return "Marketing";
  return "Development";
}

async function openJobComposer() {
  const result = await window.hrApp.inputDialog({
    title: "Post New Job",
    html: `
      <input id="job-title" class="swal2-input" placeholder="Job title" />
      <input id="job-department" class="swal2-input" placeholder="Department" />
      <input id="job-location" class="swal2-input" placeholder="Location" />
      <input id="job-openings" class="swal2-input" placeholder="Openings" type="number" min="1" />
      <input id="job-deadline" class="swal2-input" type="date" />
      <textarea id="job-description" class="swal2-textarea" placeholder="Role description"></textarea>
    `,
    preConfirm: () => ({
      title: document.getElementById("job-title").value,
      department: document.getElementById("job-department").value,
      location: document.getElementById("job-location").value,
      openings: document.getElementById("job-openings").value,
      deadline: document.getElementById("job-deadline").value,
      description: document.getElementById("job-description").value,
    }),
  });
  if (!result.isConfirmed) return;

  await API.post("/hr/recruitment/jobs", result.value);
  window.hrApp.toast("Job posted successfully");
  loadRecruitmentDesk();
}

async function openCandidateComposer() {
  const jobs = recruitmentState.desk?.jobs || [];
  const result = await window.hrApp.inputDialog({
    title: "Add Candidate",
    html: `
      <input id="candidate-name" class="swal2-input" placeholder="Candidate name" />
      <input id="candidate-email" class="swal2-input" placeholder="Email" />
      <input id="candidate-phone" class="swal2-input" placeholder="Phone" />
      <input id="candidate-role" class="swal2-input" placeholder="Applied position" />
      <input id="candidate-experience" class="swal2-input" placeholder="Experience (years)" type="number" min="0" />
      <input id="candidate-location" class="swal2-input" placeholder="Location" />
      <input id="candidate-education" class="swal2-input" placeholder="Education" />
      <input id="candidate-salary" class="swal2-input" placeholder="Expected salary" />
      <input id="candidate-skills" class="swal2-input" placeholder="Skills comma separated" />
      <input id="candidate-resume" class="swal2-input" placeholder="Resume file name" />
      <select id="candidate-job" class="swal2-select">
        <option value="">Link to job</option>
        ${jobs.map((job) => `<option value="${escapeHtml(job.id)}">${escapeHtml(job.title)}</option>`).join("")}
      </select>
      <textarea id="candidate-notes" class="swal2-textarea" placeholder="Notes"></textarea>
    `,
    preConfirm: () => {
      const selectedJobId = document.getElementById("candidate-job").value;
      const selectedJob = jobs.find((job) => job.id === selectedJobId);
      return {
        name: document.getElementById("candidate-name").value,
        email: document.getElementById("candidate-email").value,
        phone: document.getElementById("candidate-phone").value,
        position: document.getElementById("candidate-role").value,
        experience: document.getElementById("candidate-experience").value,
        location: document.getElementById("candidate-location").value,
        education: document.getElementById("candidate-education").value,
        expectedSalary: document.getElementById("candidate-salary").value,
        skills: document.getElementById("candidate-skills").value,
        resumeFileName: document.getElementById("candidate-resume").value,
        notes: document.getElementById("candidate-notes").value,
        jobId: selectedJobId,
        department: selectedJob?.department || inferDepartmentFromRole(document.getElementById("candidate-role").value),
      };
    },
  });
  if (!result.isConfirmed) return;

  await API.post("/hr/recruitment/candidates", result.value);
  window.hrApp.toast("Candidate added successfully");
  loadRecruitmentDesk();
}

function exportRecruitmentDesk() {
  const rows = (recruitmentState.desk?.candidates || []).map((candidate) => ({
    Name: candidate.name,
    Email: candidate.email,
    Phone: candidate.phone,
    Position: candidate.position,
    Department: candidate.department,
    Experience: candidate.experience,
    Status: candidate.status,
    Skills: (candidate.skills || []).join(", "),
  }));
  window.hrApp.csvDownload(rows, "recruitment-desk.csv");
}

async function viewCandidateProfile(id) {
  const response = await API.get(`/hr/recruitment/candidates/${id}`);
  const candidate = response.data || {};
  await window.hrApp.inputDialog({
    title: candidate.name || "Candidate profile",
    html: `
      <div style="text-align:left;padding:0 12px">
        <p><strong>Position:</strong> ${escapeHtml(candidate.position || "-")}</p>
        <p><strong>Email:</strong> ${escapeHtml(candidate.email || "-")}</p>
        <p><strong>Phone:</strong> ${escapeHtml(candidate.phone || "-")}</p>
        <p><strong>Skills:</strong> ${escapeHtml((candidate.skills || []).join(", "))}</p>
        <p><strong>Education:</strong> ${escapeHtml(candidate.education || "-")}</p>
        <p><strong>Experience:</strong> ${escapeHtml(String(candidate.experience || 0))} years</p>
        <p><strong>Expected Salary:</strong> ${escapeHtml(candidate.expectedSalary || "-")}</p>
        <p><strong>Applied Date:</strong> ${escapeHtml(window.hrApp.formatDate(candidate.appliedDate, { dateStyle: "medium" }))}</p>
        <p><strong>Resume:</strong> ${escapeHtml(candidate.resume?.fileName || "-")}</p>
        <p><strong>Interview History:</strong> ${escapeHtml(candidate.interviewId?.status || "No interview linked yet")}</p>
        <p><strong>Notes:</strong> ${escapeHtml(candidate.notes || "No notes")}</p>
      </div>
    `,
    confirmButtonText: "Close",
  });
}

async function previewResume(id) {
  const candidate = findCandidate(id);
  if (!candidate) return;
  await window.hrApp.inputDialog({
    title: `${candidate.name} Resume`,
    html: `
      <div style="text-align:left;padding:0 12px">
        <p><strong>Resume File:</strong> ${escapeHtml(candidate.resume || "Not uploaded")}</p>
        <p><strong>Skills:</strong> ${escapeHtml((candidate.skills || []).join(", "))}</p>
        <p><strong>Experience:</strong> ${escapeHtml(String(candidate.experience || 0))} years</p>
        <p><strong>Role Fit:</strong> ${escapeHtml(candidate.position || "-")}</p>
      </div>
    `,
    confirmButtonText: "Close",
  });
}

async function moveCandidateStage(id) {
  const candidate = findCandidate(id);
  if (!candidate) return;
  const result = await Swal.fire({
    title: "Move Candidate Stage",
    input: "select",
    inputOptions: PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage] = stage;
      return acc;
    }, {}),
    inputValue: candidate.status,
    showCancelButton: true,
    background: "#0f172a",
    color: "#e2e8f0",
  });
  if (!result.isConfirmed || !result.value) return;

  await apiRequest(`/hr/recruitment/candidates/${id}/stage`, "PATCH", { status: result.value });
  window.hrApp.toast("Candidate stage updated");
  loadRecruitmentDesk();
}

async function scheduleCandidateInterview(id) {
  const candidate = findCandidate(id);
  if (!candidate) return;
  const result = await window.hrApp.inputDialog({
    title: "Schedule Interview",
    html: `
      <input id="interview-time" class="swal2-input" type="datetime-local" />
      <input id="interview-duration" class="swal2-input" type="number" min="15" value="45" placeholder="Duration (minutes)" />
      <textarea id="interview-notes" class="swal2-textarea" placeholder="Notes"></textarea>
    `,
    preConfirm: () => ({
      startDateTime: document.getElementById("interview-time").value,
      durationMinutes: document.getElementById("interview-duration").value,
      notes: document.getElementById("interview-notes").value,
    }),
  });
  if (!result.isConfirmed || !result.value?.startDateTime) return;

  await API.post(`/hr/recruitment/candidates/${id}/interview`, {
    startDateTime: new Date(result.value.startDateTime).toISOString(),
    durationMinutes: Number(result.value.durationMinutes || 45),
    notes: result.value.notes,
    title: `${candidate.position} Interview`,
    description: `Interview scheduled for ${candidate.name}`,
  });
  window.hrApp.toast("Interview scheduled successfully");
  loadRecruitmentDesk();
}

async function sendCandidateEmail(id) {
  const candidate = findCandidate(id);
  if (!candidate) return;
  await API.post(`/hr/recruitment/candidates/${id}/email`, {
    subject: `Update regarding ${candidate.position}`,
    message: `Hello ${candidate.name}, this is an update from the recruitment desk regarding your ${candidate.position} application.`,
  });
  window.hrApp.toast("Candidate email sent");
}

async function rejectCandidate(id) {
  const candidate = findCandidate(id);
  if (!candidate) return;
  const confirmed = await window.hrApp.confirmDialog({
    title: "Reject candidate?",
    text: "This will move the candidate out of the active pipeline.",
    confirmButtonText: "Reject",
    icon: "warning",
  });
  if (!confirmed) return;

  await apiRequest(`/hr/recruitment/candidates/${id}/reject`, "PATCH", { notes: "Rejected by HR from recruitment desk." });
  window.hrApp.toast("Candidate rejected");
  loadRecruitmentDesk();
}

async function hireCandidate(id) {
  const candidate = findCandidate(id);
  if (!candidate) return;
  await API.post(`/hr/recruitment/candidates/${id}/hire`, {});
  window.hrApp.toast("Candidate moved to employees successfully");
  loadRecruitmentDesk();
}

function focusRecruitmentRole(role) {
  recruitmentState.filters.role = role;
  const roleFilter = document.getElementById("candidateRoleFilter");
  if (roleFilter) roleFilter.value = role;
  renderCandidates(recruitmentState.desk?.candidates || []);
}

async function editRecruitmentJob(id) {
  const job = (recruitmentState.desk?.jobs || []).find((item) => item.id === id);
  if (!job) return;
  const result = await window.hrApp.inputDialog({
    title: "Edit Job",
    html: `
      <input id="edit-job-title" class="swal2-input" value="${escapeAttribute(job.title)}" placeholder="Job title" />
      <input id="edit-job-department" class="swal2-input" value="${escapeAttribute(job.department || "")}" placeholder="Department" />
      <input id="edit-job-location" class="swal2-input" value="${escapeAttribute(job.location || "")}" placeholder="Location" />
      <input id="edit-job-openings" class="swal2-input" type="number" min="1" value="${escapeAttribute(job.openings || 1)}" placeholder="Openings" />
      <input id="edit-job-deadline" class="swal2-input" type="date" value="${job.deadline ? new Date(job.deadline).toISOString().slice(0, 10) : ""}" />
      <textarea id="edit-job-description" class="swal2-textarea" placeholder="Description">${escapeHtml(job.description || "")}</textarea>
    `,
    preConfirm: () => ({
      title: document.getElementById("edit-job-title").value,
      department: document.getElementById("edit-job-department").value,
      location: document.getElementById("edit-job-location").value,
      openings: document.getElementById("edit-job-openings").value,
      deadline: document.getElementById("edit-job-deadline").value,
      description: document.getElementById("edit-job-description").value,
    }),
  });
  if (!result.isConfirmed) return;

  await API.put(`/hr/recruitment/jobs/${id}`, result.value);
  window.hrApp.toast("Job updated");
  loadRecruitmentDesk();
}

async function closeRecruitmentJob(id) {
  const confirmed = await window.hrApp.confirmDialog({
    title: "Close hiring for this role?",
    text: "The job will stop appearing as open in the recruitment desk.",
    confirmButtonText: "Close hiring",
    icon: "warning",
  });
  if (!confirmed) return;

  await apiRequest(`/hr/recruitment/jobs/${id}/close`, "PATCH", {});
  window.hrApp.toast("Hiring closed");
  loadRecruitmentDesk();
}

function openCalendarAction(id) {
  const item = (recruitmentState.desk?.calendar || []).find((entry) => entry.id === id);
  if (!item) return;
  window.hrApp.toast(`${item.title} opened`);
}

function downloadOfferLetter(id) {
  const offer = findOffer(id);
  if (!offer) return;
  window.hrApp.csvDownload([{
    Candidate: offer.candidateName,
    Designation: offer.designation,
    Department: offer.department,
    Salary: offer.salary,
    JoiningDate: window.hrApp.formatDate(offer.joiningDate, { dateStyle: "medium" }),
    Manager: offer.manager,
    Status: offer.status,
  }], `${offer.candidateName.replace(/\s+/g, "_")}_offer_letter.csv`);
}

async function sendOfferAgain(candidateId) {
  const candidate = findCandidate(candidateId);
  if (!candidate) return;
  await API.post(`/hr/recruitment/candidates/${candidateId}/offer`, {
    designation: candidate.position,
    department: candidate.department,
    salary: candidate.expectedSalary,
    subject: `Offer Letter for ${candidate.position}`,
    message: `Dear ${candidate.name}, your offer for ${candidate.position} in ${candidate.department} is ready for review.`,
  });
  window.hrApp.toast("Offer email sent");
  loadRecruitmentDesk();
}

async function markOfferAccepted(id) {
  await apiRequest(`/hr/recruitment/offers/${id}/accept`, "PATCH", {});
  window.hrApp.toast("Offer marked as accepted");
  loadRecruitmentDesk();
}

window.viewCandidateProfile = viewCandidateProfile;
window.previewResume = previewResume;
window.moveCandidateStage = moveCandidateStage;
window.scheduleCandidateInterview = scheduleCandidateInterview;
window.sendCandidateEmail = sendCandidateEmail;
window.rejectCandidate = rejectCandidate;
window.hireCandidate = hireCandidate;
window.focusRecruitmentRole = focusRecruitmentRole;
window.editRecruitmentJob = editRecruitmentJob;
window.closeRecruitmentJob = closeRecruitmentJob;
window.openCalendarAction = openCalendarAction;
window.downloadOfferLetter = downloadOfferLetter;
window.sendOfferAgain = sendOfferAgain;
window.markOfferAccepted = markOfferAccepted;
