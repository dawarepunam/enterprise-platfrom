const express = require('express');
const router = express.Router();
const salaryStructureController = require('../controllers/salaryStructureController');

router.get('/', salaryStructureController.getSalaryStructures);
router.put('/:id', salaryStructureController.updateSalaryStructure);

module.exports = router;
