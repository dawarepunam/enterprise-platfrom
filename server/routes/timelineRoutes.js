// server/routes/timelineRoutes.js
const createCrudRouter = require('../utils/createCrudRouter');
const timelineController = require('../controllers/timelineController');

module.exports = createCrudRouter(timelineController, {
  roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'MEMBER']
});
