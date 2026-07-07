const express = require('express');
const router = express.Router();
const payslipController = require('../controllers/payslipController');

router.post('/generate', payslipController.generatePayslips);
// Additional routes like get all payslips could be added here
// router.get('/', payslipController.getAllPayslips);

module.exports = router;
