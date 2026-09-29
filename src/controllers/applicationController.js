import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { calculateMatchScore } from '../utils/matchCalculator.js';

// @desc    Apply to a job
// @route   POST /api/applications/:jobId
// @access  Private (Candidates: Student / Grad / Professional)
export const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverNote, resumeUrl } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'Open') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications',
      });
    }

    // Check for duplicate application
    const existingApp = await Application.findOne({
      job: jobId,
      applicant: req.user._id,
    });

    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job',
      });
    }

    // Calculate match score
    const candidate = await User.findById(req.user._id);
    const matchResult = calculateMatchScore(candidate, job);

    const application = await Application.create({
      job: jobId,
      applicant: req.user._id,
      matchPercentage: matchResult.matchPercentage,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      coverNote,
      resumeUrl: resumeUrl || candidate.resumeUrl,
    });

    // Update applicants count
    job.applicantsCount = (job.applicantsCount || 0) + 1;
    await job.save();

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit application',
    });
  }
};

// @desc    Get logged in user applications
// @route   GET /api/applications/my-applications
// @access  Private (Candidate)
export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .populate('job', 'title company location workMode jobType status')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications',
    });
  }
};

// @desc    Get applicants for a specific job (Ranked by Match Score)
// @route   GET /api/applications/job/:jobId
// @access  Private (Employer only)
export const getJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view applicants for this job',
      });
    }

    // Sorted by match percentage descending so best candidates come first!
    const applicants = await Application.find({ job: jobId })
      .populate(
        'applicant',
        'name email phone location headline skills education experience resumeUrl'
      )
      .sort({ matchPercentage: -1 });

    return res.status(200).json({
      success: true,
      count: applicants.length,
      jobTitle: job.title,
      applicants,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch applicants',
    });
  }
};

// @desc    Update application status (Shortlist, Reject, etc.)
// @route   PUT /api/applications/:id/status
// @access  Private (Employer only)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, employerNotes } = req.body;

    const application = await Application.findById(id).populate('job');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Verify employer owns the job
    if (application.job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this application',
      });
    }

    if (status) application.status = status;
    if (employerNotes !== undefined) application.employerNotes = employerNotes;

    await application.save();

    return res.status(200).json({
      success: true,
      message: `Application marked as ${status}`,
      application,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update application status',
    });
  }
};
