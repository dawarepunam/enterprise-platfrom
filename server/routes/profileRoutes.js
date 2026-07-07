const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/profileController");

module.exports = createCrudRouter(controller);
