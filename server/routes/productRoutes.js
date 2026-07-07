const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// 1. Dashboard & Analytics
router.get('/dashboard-stats', productController.getDashboardStats);

// 2. PM Queue
router.get('/queue', productController.getQueue);

// 3. Workspace (Requirement CRUD)
router.route('/requirement/:id')
  .get(productController.getRequirement)
  .put(productController.updateRequirement);

// Features
router.route('/requirement/:id/features')
  .post(productController.addFeature);
router.route('/requirement/:id/features/:itemId')
  .put(productController.updateFeature)
  .delete(productController.deleteFeature);

// Dependencies
router.route('/requirement/:id/dependencies')
  .post(productController.addDependency);
router.route('/requirement/:id/dependencies/:itemId')
  .delete(productController.deleteDependency);

// Budget Items
router.route('/requirement/:id/budget')
  .post(productController.addBudget);
router.route('/requirement/:id/budget/:itemId')
  .put(productController.updateBudget)
  .delete(productController.deleteBudget);

// Timeline Phases
router.route('/requirement/:id/timeline')
  .post(productController.addTimeline);
router.route('/requirement/:id/timeline/:itemId')
  .put(productController.updateTimeline)
  .delete(productController.deleteTimeline);

// Resources
router.route('/requirement/:id/resources')
  .post(productController.addResource);
router.route('/requirement/:id/resources/:itemId')
  .put(productController.updateResource)
  .delete(productController.deleteResource);

// Risks
router.route('/requirement/:id/risks')
  .post(productController.addRisk);
router.route('/requirement/:id/risks/:itemId')
  .put(productController.updateRisk)
  .delete(productController.deleteRisk);

// Stakeholders
router.route('/requirement/:id/stakeholders')
  .post(productController.addStakeholder);
router.route('/requirement/:id/stakeholders/:itemId')
  .put(productController.updateStakeholder)
  .delete(productController.deleteStakeholder);

// Documents
router.route('/requirement/:id/documents')
  .post(productController.addDocument);
router.route('/requirement/:id/documents/:itemId')
  .put(productController.updateDocument)
  .delete(productController.deleteDocument);

// Meetings
router.route('/requirement/:id/meetings')
  .post(productController.addMeeting);
router.route('/requirement/:id/meetings/:itemId')
  .put(productController.updateMeeting)
  .delete(productController.deleteMeeting);

// Change Requests
router.route('/requirement/:id/change-requests')
  .post(productController.addChangeRequest);
router.route('/requirement/:id/change-requests/:itemId')
  .put(productController.updateChangeRequest);

// --- REQUIREMENT FREEZE & PROJECT CREATION ---
router.post('/requirement/:id/freeze', productController.freezeRequirement);
router.post('/requirement/:id/generate-project', productController.generateProject);

// --- PM ASSIGNMENT ---
router.post('/requirement/:id/assign-pm', productController.assignProjectManager);

module.exports = router;
