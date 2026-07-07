const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/emailLogController");

module.exports = createCrudRouter(controller, { roles: ["ADMIN", "MANAGER"] });
