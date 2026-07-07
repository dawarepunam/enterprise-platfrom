// server/routes/riskRoutes.js
const createCrudRouter = require('../utils/createCrudRouter');
const riskController = require('../controllers/riskController');

module.exports = createCrudRouter(riskController, {
  roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']
});
