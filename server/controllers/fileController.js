const collaborationController = require("./collaborationController");
const hrController = require("./hrController");
const createCrudController = require("../utils/createCrudController");
const File = require("../models/File");
const { logAction } = require("../utils/auditLogger");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadMiddleware = multer({ limits: { fileSize: 10 * 1024 * 1024 } }).fields([
  { name: "file", maxCount: 1 },
  { name: "files", maxCount: 20 },
]);
const baseController = createCrudController("files");

function getUploadedFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat().filter(Boolean);
  }
  return [];
}

function safeName(name = "file") {
  return String(name || "file").replace(/[^\w.\- ()]/g, "_").slice(0, 180);
}

async function uploadPersonalFiles(req, res) {
  const files = getUploadedFiles(req);
  if (!files.length) {
    return res.status(400).json({ success: false, message: "Please attach a file." });
  }

  const folder = req.body.folder || req.body.category || "My Files";
  const targetDir = path.join(__dirname, "../uploads/employee", String(req.user._id));
  fs.mkdirSync(targetDir, { recursive: true });

  const saved = [];
  for (const file of files) {
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(file.originalname)}`;
    fs.writeFileSync(path.join(targetDir, storedName), file.buffer);
    const url = `/uploads/employee/${encodeURIComponent(String(req.user._id))}/${encodeURIComponent(storedName)}`;
    const record = await File.create({
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,
      name: file.originalname,
      url,
      mimeType: file.mimetype,
      size: file.size,
      module: req.body.module || "employee-files",
      entityType: req.body.entityType || "employee",
      entityId: req.body.entityId || String(req.user._id),
      provider: "local-storage",
      metadata: {
        folder,
        source: req.body.source || "files",
      },
    });
    saved.push(record);
  }

  res.status(201).json({
    success: true,
    message: `${saved.length} file${saved.length === 1 ? "" : "s"} uploaded`,
    data: saved.length === 1 ? saved[0] : saved,
    files: saved,
    urls: saved.map((item) => item.url),
  });
}

async function upload(req, res, next) {
  if (req.body.teamId) {
    req.file = getUploadedFiles(req)[0];
    return collaborationController.uploadTeamFile(req, res, next);
  }
  
  if (req.body.projectId) {
    req.file = getUploadedFiles(req)[0];
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    try {
      const targetDir = path.join(__dirname, "../uploads/projects", String(req.body.projectId));
      fs.mkdirSync(targetDir, { recursive: true });
      const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(req.file.originalname)}`;
      fs.writeFileSync(path.join(targetDir, storedName), req.file.buffer);
      const newFile = await File.create({
        name: req.file.originalname,
        projectId: req.body.projectId,
        uploadedBy: req.user._id,
        uploadedByName: req.user.name,
        size: req.file.size,
        mimeType: req.file.mimetype,
        url: `/uploads/projects/${encodeURIComponent(String(req.body.projectId))}/${encodeURIComponent(storedName)}`,
        provider: "local-storage",
        module: req.body.module || "project-documents",
        metadata: {
          folder: req.body.folder || req.body.category || "Project Assets",
          source: req.body.source || "project-manager-documents",
        },
      });
      await logAction(req.user ? req.user._id : null, "UPLOADED_FILE", "Projects", `Uploaded file ${newFile.name}`);
      return res.status(201).json({ success: true, data: newFile });
    } catch(e) {
      return res.status(500).json({ success: false, message: "Upload failed" });
    }
  }

  if (req.body.employeeId || req.body.entityId) {
    req.file = getUploadedFiles(req)[0];
    return hrController.uploadEmployeeFile(req, res, next);
  }

  return uploadPersonalFiles(req, res);
}

module.exports = {
  ...baseController,
  upload,
  uploadMiddleware,
};
