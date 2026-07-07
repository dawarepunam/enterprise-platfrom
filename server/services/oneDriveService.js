const path = require("path");
const Team = require("../models/Team");
const Project = require("../models/Project");
const {
  ensureOneDriveFolder,
  uploadBufferToOneDrive,
  hasMicrosoftGraphConfig,
} = require("./microsoftGraphService");

function sanitizeSegment(value, fallback) {
  return String(value || fallback || "")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "-");
}

function buildProjectFolderPath({ clientName, projectName }) {
  return [sanitizeSegment(clientName, "Client"), sanitizeSegment(projectName, "Project")]
    .filter(Boolean)
    .join("/");
}

async function resolveFolderContext({ projectId, teamId, clientName, projectName } = {}) {
  const project = projectId ? await Project.findById(projectId) : null;
  const team = teamId ? await Team.findById(teamId) : null;

  const derivedClient = clientName || project?.clientName || "Client";
  const derivedProject = projectName || project?.projectName || team?.projectName || team?.name || "Project";
  const folderPath =
    team?.collaboration?.oneDriveFolder ||
    project?.microsoft?.oneDriveFolder ||
    buildProjectFolderPath({ clientName: derivedClient, projectName: derivedProject });

  return { project, team, folderPath, clientName: derivedClient, projectName: derivedProject };
}

async function ensureCollaborationFolder(context = {}) {
  const resolved = await resolveFolderContext(context);

  if (!hasMicrosoftGraphConfig()) {
    return {
      provider: "local-fallback",
      folderPath: path.posix.join("CRM", resolved.folderPath),
      folderId: "",
      shareUrl: "",
      webUrl: "",
      connected: false,
    };
  }

  const folder = await ensureOneDriveFolder(resolved.folderPath);
  return { ...folder, connected: true };
}

async function uploadCollaborationFile({ buffer, fileName, mimeType, size, ...context }) {
  const resolved = await resolveFolderContext(context);
  const folder = await ensureCollaborationFolder(context);

  if (!hasMicrosoftGraphConfig()) {
    return {
      provider: "local-fallback",
      fileId: "",
      fileName,
      mimeType,
      size,
      webUrl: "",
      shareUrl: "",
      folderPath: folder.folderPath,
      connected: false,
    };
  }

  const upload = await uploadBufferToOneDrive({
    buffer,
    fileName,
    folderPath: resolved.folderPath,
    mimeType,
  });

  return { ...upload, connected: true };
}

module.exports = {
  buildProjectFolderPath,
  ensureCollaborationFolder,
  uploadCollaborationFile,
};
