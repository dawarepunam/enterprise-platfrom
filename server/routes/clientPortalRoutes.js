const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/clientPortalController");

module.exports = createCrudRouter(controller);
