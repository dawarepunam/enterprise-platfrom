const controller = require("../controllers/communicationLogController");
const createCrudRouter = require("../utils/createCrudRouter");

module.exports = createCrudRouter(controller, { roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER", "MARKETING", "SALES", "HR", "CLIENT"] });
