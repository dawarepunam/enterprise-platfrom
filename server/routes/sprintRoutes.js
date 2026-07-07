// server/routes/sprintRoutes.js
const createCrudRouter = require('../utils/createCrudRouter');
const sprintController = require('../controllers/sprintController');

module.exports = createCrudRouter(sprintController, {
  roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']
});
