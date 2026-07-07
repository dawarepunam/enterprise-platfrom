const createCrudController = require("../utils/createCrudController");
const createCrudRouter = require("../utils/createCrudRouter");

module.exports = createCrudRouter(createCrudController("clients"), {
  roles: ["ADMIN", "MANAGER", "PRODUCT_MANAGER", "MARKETING", "SALES"],
});
