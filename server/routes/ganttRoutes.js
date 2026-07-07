// server/routes/ganttRoutes.js
const createCrudRouter = require('../utils/createCrudRouter');
const ganttController = require('../controllers/ganttController');

module.exports = createCrudRouter(ganttController, {
  roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'MEMBER']
});
