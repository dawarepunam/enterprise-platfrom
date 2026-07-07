const mongoose = require('mongoose');

const FeatureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  complexity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  estimatedHours: { type: Number, default: 0 },
  owner: { type: String, default: 'Unassigned' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Deferred'], default: 'Pending' },
  description: String,
  acceptanceCriteria: String,
  dependencies: [{ type: String }],
  comments: [{
    text: String,
    author: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

const DependencySchema = new mongoose.Schema({
  sourceFeatureId: { type: mongoose.Schema.Types.ObjectId },
  targetFeatureId: { type: mongoose.Schema.Types.ObjectId },
  type: { type: String, enum: ['Blocks', 'Is Blocked By', 'Relates To'], default: 'Relates To' }
});

const BudgetItemSchema = new mongoose.Schema({
  category: { type: String, required: true }, // e.g., Development, Design, QA
  estimatedCost: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  variance: { type: Number, default: 0 },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
});

const TimelinePhaseSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., Discovery, Analysis, Development
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed', 'Delayed'], default: 'Not Started' },
  dependencies: [{ type: String }],
  assignedResources: [{ type: String }]
});

const ResourceSchema = new mongoose.Schema({
  role: { type: String, required: true },
  name: { type: String },
  allocationPercentage: { type: Number, default: 100 },
  status: { type: String, enum: ['Available', 'Busy', 'Overloaded'], default: 'Available' }
});

const RiskSchema = new mongoose.Schema({
  type: { type: String, enum: ['Budget Risk', 'Timeline Risk', 'Technical Risk', 'Resource Risk', 'Client Risk'], required: true },
  description: { type: String, required: true },
  probability: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  impact: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  score: { type: Number, default: 0 }, // Calculated
  mitigation: String,
  owner: String,
  history: [{
    action: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

const StakeholderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true }, // e.g., Client Owner, Decision Maker
  email: String,
  phone: String,
  interactions: [{
    date: Date,
    notes: String
  }]
});

const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String }, // BRD, SRS, Proposal
  url: { type: String, required: true },
  uploadedBy: String,
  uploadedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
  approvalStatus: { type: String, enum: ['Draft', 'Pending', 'Approved', 'Rejected'], default: 'Draft' }
});

const MeetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  agenda: String,
  attendees: [{ type: String }],
  mom: String, // Minutes of Meeting
  actionItems: [{
    task: String,
    assignee: String,
    dueDate: Date,
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
  }]
});

const ApprovalSchema = new mongoose.Schema({
  stage: { type: String, required: true }, // e.g., Timeline Approval, Budget Approval, Client Approval
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  approvedBy: String,
  approvedAt: Date,
  comments: String
});

const ChangeRequestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['Pending', 'Impact Analysis', 'Approved', 'Rejected'], default: 'Pending' },
  affectedFeatures: [{ type: mongoose.Schema.Types.ObjectId }],
  budgetImpact: { type: Number, default: 0 },
  timelineImpactDays: { type: Number, default: 0 },
  requestedBy: String,
  requestedAt: { type: Date, default: Date.now },
  approvedBy: String,
  approvedAt: Date
});

const ProductRequirementSchema = new mongoose.Schema({
  sourceReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'DepartmentReview', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Populated upon Freeze
  
  // Basic Details from Review
  title: { type: String, required: true },
  client: { type: String },
  company: { type: String },
  department: { type: String },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  
  // Core Requirement Content
  businessRequirements: String,
  functionalRequirements: String,
  technicalRequirements: String,
  nonFunctionalRequirements: String,
  acceptanceCriteria: String,
  
  // Module Arrays
  features: [FeatureSchema],
  dependencies: [DependencySchema],
  budgetItems: [BudgetItemSchema],
  timelinePhases: [TimelinePhaseSchema],
  resources: [ResourceSchema],
  risks: [RiskSchema],
  stakeholders: [StakeholderSchema],
  documents: [DocumentSchema],
  meetings: [MeetingSchema],
  approvals: [ApprovalSchema],
  changeRequests: [ChangeRequestSchema],
  
  // Status and Meta
  status: { 
    type: String, 
    enum: ['PM Queue', 'Analysis', 'Planning', 'Client Review', 'Frozen', 'Project Created', 'Rejected', 'Archived'], 
    default: 'PM Queue' 
  },
  frozenAt: Date,
  assignedPm: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  auditLog: [{
    action: String,
    user: String,
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Middleware to calculate Risk Score
ProductRequirementSchema.pre('save', async function() {
  if (this.isModified('risks')) {
    this.risks.forEach(risk => {
      let pScore = risk.probability === 'High' ? 3 : risk.probability === 'Medium' ? 2 : 1;
      let iScore = risk.impact === 'High' ? 3 : risk.impact === 'Medium' ? 2 : 1;
      risk.score = pScore * iScore;
    });
  }
});

module.exports = mongoose.model('ProductRequirement', ProductRequirementSchema);
