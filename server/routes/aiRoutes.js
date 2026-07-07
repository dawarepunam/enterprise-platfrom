const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/aiController");

module.exports = createCrudRouter(controller);
