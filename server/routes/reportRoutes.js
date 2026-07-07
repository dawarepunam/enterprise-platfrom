const express = require("express");
const controller = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const createCrudRouter = require("../utils/createCrudRouter");

const router = express.Router();

router.use(authMiddleware);

// Specific Employee Export Routes
router.get("/tasks", controller.getTasksReport);
router.get("/attendance", controller.getAttendanceReport);
router.get("/leaves", controller.getLeavesReport);
router.get("/performance", controller.getPerformanceReport);
router.get("/timesheets", controller.getTimesheetsReport);

// Generic CRUD mapped via util (Restricted)
const genericRouter = createCrudRouter(controller, { roles: ["ADMIN", "MANAGER", "MARKETING"] });
router.use("/", genericRouter);

module.exports = router;
