// server/routes/calendarRoutes.js
const createCrudRouter = require('../utils/createCrudRouter');
const calendarController = require('../controllers/calendarController');

module.exports = createCrudRouter(calendarController, {
  roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'MEMBER']
});
