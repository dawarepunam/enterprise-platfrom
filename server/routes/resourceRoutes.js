// server/routes/resourceRoutes.js
const createCrudRouter = require('../utils/createCrudRouter');
const resourceController = require('../controllers/resourceController');

module.exports = createCrudRouter(resourceController, {
  roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']
});
