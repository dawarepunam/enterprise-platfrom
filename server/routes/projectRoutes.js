const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");

// List all projects
router.get("/", projectController.getAllProjects);

// List projects assigned to the logged-in employee
router.get("/employee", authMiddleware, projectController.getMemberProjects);
// Legacy alias retained for compatibility
router.get("/member", authMiddleware, projectController.getMemberProjects);

// Create a new project
router.post("/", projectController.create);

// Get project details
router.get("/:id", projectController.get);

// Update project
router.put("/:id", projectController.update);

// Delete project
router.delete("/:id", projectController.delete);

module.exports = router;
