const Payroll = require('../models/Payroll');
const SalaryStructure = require('../models/SalaryStructure');

exports.getDashboardStats = async (req, res) => {
  try {
    const currentMonth = req.query.month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Aggregation logic for stats
    const processedCount = await Payroll.countDocuments({ status: 'Processed', month: currentMonth });
    const pendingCount = await Payroll.countDocuments({ status: 'Pending', month: currentMonth });
    
    const totalSalaryAggr = await Payroll.aggregate([
      { $match: { month: currentMonth } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } }
    ]);
    const totalSalary = totalSalaryAggr.length > 0 ? totalSalaryAggr[0].total : 0;

    res.status(200).json({
      month: currentMonth,
      processedPayroll: processedCount,
      pendingPayroll: pendingCount,
      totalSalary
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getProcessedPayroll = async (req, res) => {
  try {
    const payrolls = await Payroll.find({ status: 'Processed' }).populate('employeeId', 'name email');
    res.status(200).json(payrolls);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
