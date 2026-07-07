const PerformanceReview = require('../models/PerformanceReview');
const { getIo } = require('../sockets');

// @desc    Get all reviews
// @route   GET /api/performance
// @access  Public/Private
exports.getReviews = async (req, res, next) => {
  try {
    const statusFilter = req.query.status;
    let query = {};
    if (statusFilter) {
      query.status = statusFilter;
    }
    const reviews = await PerformanceReview.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard metrics
// @route   GET /api/performance/metrics
// @access  Public/Private
exports.getMetrics = async (req, res, next) => {
  try {
    const total = await PerformanceReview.countDocuments();
    const pending = await PerformanceReview.countDocuments({ status: 'Pending' });
    const completed = await PerformanceReview.countDocuments({ status: 'Completed' });
    
    // Calculate avg rating of completed
    const completedReviews = await PerformanceReview.find({ status: 'Completed' });
    let totalRating = 0;
    completedReviews.forEach(r => totalRating += r.rating);
    const avgRating = completed > 0 ? (totalRating / completed).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        active: total,
        pending,
        completed,
        avgRating
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Manager Rating
// @route   PUT /api/performance/:id/rate
// @access  Public/Private
exports.submitRating = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { technicalSkills, communication, leadership, innovation, teamWork, remarks } = req.body;
    
    const avg = (technicalSkills + communication + leadership + innovation + teamWork) / 5;

    const review = await PerformanceReview.findByIdAndUpdate(
      id,
      {
        technicalSkills,
        communication,
        leadership,
        innovation,
        teamWork,
        remarks,
        rating: avg,
        status: 'Completed'
      },
      { new: true, runValidators: true }
    );

    if (!review) {
      res.status(404);
      throw new Error('Review not found');
    }

    // Emit Socket.IO event
    getIo().emit('reviewSubmitted', review);

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed Initial Data
// @route   POST /api/performance/seed
// @access  Public
exports.seedReviews = async (req, res, next) => {
  try {
    await PerformanceReview.deleteMany();
    const mockData = [
      { employeeName: 'Rahul Sharma', employeeId: 'EMP001', department: 'Sales', managerName: 'Amit Verma', rating: 0, status: 'Pending' },
      { employeeName: 'Priya Patel', employeeId: 'EMP002', department: 'Marketing', managerName: 'Sneha Singh', rating: 4.2, status: 'In Progress' },
      { employeeName: 'Arjun Mehta', employeeId: 'EMP003', department: 'Development', managerName: 'Vikram Joshi', rating: 4.8, status: 'Completed' },
      { employeeName: 'Neha Gupta', employeeId: 'EMP004', department: 'HR', managerName: 'Pooja Sharma', rating: 4.7, status: 'Completed' }
    ];
    const created = await PerformanceReview.insertMany(mockData);
    
    // Notify clients that data has refreshed
    getIo().emit('dataSeeded', 'performance');

    res.status(201).json({ success: true, count: created.length, data: created });
  } catch (error) {
    next(error);
  }
};
