const SalaryStructure = require('../models/SalaryStructure');

exports.getSalaryStructures = async (req, res) => {
  try {
    const structures = await SalaryStructure.find();
    res.status(200).json(structures);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const structure = await SalaryStructure.findByIdAndUpdate(id, updateData, { new: true });
    if (!structure) return res.status(404).json({ message: 'Structure not found' });
    
    // Emit socket event if io is available
    if (req.app.get('io')) {
      req.app.get('io').emit('structureUpdated', structure);
    }

    res.status(200).json(structure);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
