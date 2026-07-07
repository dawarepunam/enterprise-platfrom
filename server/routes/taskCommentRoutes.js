const createCrudRouter = require("../utils/createCrudRouter");
const createCrudController = require("../utils/createCrudController");

module.exports = createCrudRouter(createCrudController("taskComments"), { roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"] });
