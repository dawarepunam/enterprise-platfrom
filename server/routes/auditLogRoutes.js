const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/auditLogController");

module.exports = createCrudRouter(controller);
