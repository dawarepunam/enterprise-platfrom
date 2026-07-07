function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapePdfText(value = "") {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildManagerReportData(project, detail) {
  const completedTasks = detail.tasks.filter((task) => ["Completed", "Approved"].includes(task.status)).length;
  const pendingTasks = detail.tasks.length - completedTasks;

  return {
    title: `${project.projectName} Manager Report`,
    summary: [
      ["Project", project.projectName],
      ["Client", project.clientName || "-"],
      ["Department", project.department || "-"],
      ["Priority", project.priority || "-"],
      ["Status", project.status || "-"],
      ["Progress", `${Number(project.progress || 0)}%`],
      ["Start Date", formatDate(project.startDate)],
      ["Due Date", formatDate(project.deadline)],
      ["Estimated Completion", formatDate(project.estimatedCompletionDate)],
      ["Team Members", String(detail.teamMembers.length)],
      ["Total Tasks", String(detail.tasks.length)],
      ["Completed Tasks", String(completedTasks)],
      ["Pending Tasks", String(pendingTasks)],
      ["Files Uploaded", String(detail.files.length)],
      ["Meetings", String(detail.meetings.length)],
    ],
    productivity: detail.teamMembers.map((member) => ({
      memberName: member.name,
      role: member.role || "MEMBER",
      completedTasks: member.completedTasks || 0,
      assignedTasks: member.assignedTasks || 0,
      hoursWorked: member.hoursWorked || 0,
      performanceScore: member.performanceScore || 0,
    })),
    timeline: detail.timeline.slice(0, 20).map((item) => ({
      type: item.type,
      title: item.title,
      date: formatDate(item.createdAt),
      meta: item.meta || "",
    })),
  };
}

function buildCsvBuffer(reportData) {
  const rows = [["Section", "Label", "Value"]];
  reportData.summary.forEach(([label, value]) => rows.push(["Summary", label, value]));
  reportData.productivity.forEach((item) => {
    rows.push(["Productivity", `${item.memberName} (${item.role})`, `Completed ${item.completedTasks}/${item.assignedTasks}, Hours ${item.hoursWorked}, Score ${item.performanceScore}%`]);
  });
  reportData.timeline.forEach((item) => rows.push(["Timeline", `${item.date} - ${item.type}`, `${item.title} ${item.meta}`.trim()]));

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  return Buffer.from(csv, "utf8");
}

function buildPdfBuffer(reportData) {
  const textLines = [
    reportData.title,
    "",
    ...reportData.summary.map(([label, value]) => `${label}: ${value}`),
    "",
    "Team Productivity",
    ...reportData.productivity.map((item) => `${item.memberName} (${item.role}) - ${item.completedTasks}/${item.assignedTasks} tasks, ${item.hoursWorked}h, ${item.performanceScore}%`),
    "",
    "Timeline",
    ...reportData.timeline.map((item) => `${item.date} - ${item.type}: ${item.title} ${item.meta}`.trim()),
  ];

  const content = textLines
    .slice(0, 55)
    .map((line, index) => `BT /F1 11 Tf 50 ${780 - index * 13} Td (${escapePdfText(line)}) Tj ET`)
    .join("\n");

  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObject(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function buildExportPayload({ project, detail, format }) {
  const reportData = buildManagerReportData(project, detail);
  return {
    reportData,
    buffer: format === "pdf" ? buildPdfBuffer(reportData) : buildCsvBuffer(reportData),
    contentType: format === "pdf" ? "application/pdf" : "application/vnd.ms-excel",
    extension: format === "pdf" ? "pdf" : "csv",
  };
}

module.exports = {
  buildExportPayload,
  buildManagerReportData,
};
