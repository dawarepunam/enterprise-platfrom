// server/routes/documentRoutes.js
const createCrudRouter = require('../utils/createCrudRouter');
const documentController = require('../controllers/documentController');

module.exports = createCrudRouter(documentController, {
  roles: ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'MEMBER']
});
