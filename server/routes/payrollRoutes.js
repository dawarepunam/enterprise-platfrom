const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

// Using /api/payroll prefix in app.js
router.get('/dashboard-stats', payrollController.getDashboardStats);
router.get('/processed', payrollController.getProcessedPayroll);
router.post('/download-payslip', require('../controllers/payslipController').downloadPayslip); // Using payslip controller here as per requirements

module.exports = router;
