const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/taskUpdateController");

module.exports = createCrudRouter(controller, { roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER", "CLIENT"] });
