const express = require('express');
const router = express.Router();
const claimsAndBenefitsController = require('../controllers/claimsAndBenefitsController');

// Claims
router.get('/claims', claimsAndBenefitsController.getClaims);
router.post('/claims', claimsAndBenefitsController.createClaim);

// Travel
router.get('/travel', claimsAndBenefitsController.getTravelRequests);
router.post('/travel', claimsAndBenefitsController.createTravelRequest);

// Benefits
router.get('/benefits', claimsAndBenefitsController.getBenefits);

// Update Generic Status
router.post('/update-status', claimsAndBenefitsController.updateStatus);

module.exports = router;
