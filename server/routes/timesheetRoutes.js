const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/timesheetController");

module.exports = createCrudRouter(controller, { roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER", "HR"] });
