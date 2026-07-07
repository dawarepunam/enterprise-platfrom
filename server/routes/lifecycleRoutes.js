const express = require('express');
const router = express.Router();
const lifecycleController = require('../controllers/lifecycleController');

// Onboarding
router.get('/onboarding', lifecycleController.getOnboardingList);

// Assets
router.get('/assets', lifecycleController.getAssets);
router.post('/assets', lifecycleController.createAsset);

// Exits
router.get('/exits', lifecycleController.getExitRecords);
router.post('/exits', lifecycleController.initiateExit);
router.put('/exits/:id', lifecycleController.updateExitStatus);

module.exports = router;
