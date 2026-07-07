const express = require('express');
const router = express.Router();
const recruitmentController = require('../controllers/recruitmentController');

// Jobs
router.get('/jobs', recruitmentController.getJobs);
router.post('/jobs', recruitmentController.createJob);
router.put('/jobs/:id', recruitmentController.updateJob);

// Candidates
router.get('/candidates', recruitmentController.getCandidates);
router.post('/candidates', recruitmentController.createCandidate);
router.put('/candidates/:id/stage', recruitmentController.updateCandidateStage);

// Interviews
router.get('/interviews', recruitmentController.getInterviews);
router.post('/interviews', recruitmentController.scheduleInterview);
router.put('/interviews/:id/status', recruitmentController.updateInterviewStatus);

module.exports = router;
