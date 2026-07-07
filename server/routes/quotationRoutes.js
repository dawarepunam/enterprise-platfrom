const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/quotationController");

module.exports = createCrudRouter(controller, { roles: ["ADMIN", "MANAGER", "SALES", "CLIENT"] });
