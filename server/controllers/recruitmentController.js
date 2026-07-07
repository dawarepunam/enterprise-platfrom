const JobPosting = require('../models/JobPosting');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');

// JOBS
exports.getJobs = async (req, res) => {
  try {
    const jobs = await JobPosting.find().populate('postedBy', 'name').sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createJob = async (req, res) => {
  try {
    const job = new JobPosting(req.body);
    await job.save();
    if (req.app.get('io')) {
      req.app.get('io').emit('jobAdded', job);
    }
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await JobPosting.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// CANDIDATES
exports.getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find().populate('jobApplied', 'title department').sort({ createdAt: -1 });
    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const candidate = new Candidate(req.body);
    await candidate.save();
    if (req.app.get('io')) {
      req.app.get('io').emit('candidateAdded', candidate);
    }
    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateCandidateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    
    const candidate = await Candidate.findByIdAndUpdate(id, { stage }, { new: true });
    
    if (req.app.get('io')) {
      req.app.get('io').emit('stageChanged', { candidateId: id, newStage: stage });
    }
    
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// INTERVIEWS
exports.getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find().sort({ scheduledAt: 1 });
    res.status(200).json(interviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.scheduleInterview = async (req, res) => {
  try {
    const interview = new Interview(req.body);
    await interview.save();
    if (req.app.get('io')) {
      req.app.get('io').emit('interviewScheduled', interview);
    }
    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateInterviewStatus = async (req, res) => {
  try {
    const interview = await Interview.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.status(200).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
