const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/uploadController");

module.exports = createCrudRouter(controller, { roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER", "MARKETING", "SALES"] });
