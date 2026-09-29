import Job from '../models/Job.js';
import User from '../models/User.js';
import { calculateMatchScore } from '../utils/matchCalculator.js';

// @desc    Create a new job posting
// @route   POST /api/jobs
// @access  Private (Employer only)
export const createJob = async (req, res) => {
  try {
    const {
      title,
      company,
      description,
      jobType,
      category,
      requiredSkills,
      minExperienceYears,
      educationRequirement,
      location,
      workMode,
      salaryRange,
      deadline,
    } = req.body;

    const job = await Job.create({
      title,
      company: company || req.user.companyProfile?.companyName || req.user.name,
      employer: req.user._id,
      description,
      jobType,
      category,
      requiredSkills,
      minExperienceYears,
      educationRequirement,
      location,
      workMode,
      salaryRange,
      deadline,
    });

    return res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      job,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create job posting',
    });
  }
};

// @desc    Get all jobs with optional smart match scoring for logged-in user
// @route   GET /api/jobs
// @access  Public (User match score added if auth token present)
export const getJobs = async (req, res) => {
  try {
    const { keyword, jobType, workMode, location, category } = req.query;

    const query = { status: 'Open' };

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { company: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (jobType) query.jobType = jobType;
    if (workMode) query.workMode = workMode;
    if (category) query.category = category;
    if (location) query.location = { $regex: location, $options: 'i' };

    const jobs = await Job.find(query)
      .populate('employer', 'name email companyProfile')
      .sort({ createdAt: -1 });

    // If candidate is logged in, attach live match calculation to each job!
    let jobsWithScores = jobs.map((j) => j.toObject());

    if (req.user && req.user.role !== 'employer') {
      const candidate = await User.findById(req.user._id);
      if (candidate) {
        jobsWithScores = jobsWithScores.map((job) => {
          const matchResult = calculateMatchScore(candidate, job);
          return {
            ...job,
            matchPercentage: matchResult.matchPercentage,
            matchedSkills: matchResult.matchedSkills,
            missingSkills: matchResult.missingSkills,
          };
        });

        // Sort by match percentage descending so best matches appear first!
        jobsWithScores.sort(
          (a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0)
        );
      }
    }

    return res.status(200).json({
      success: true,
      count: jobsWithScores.length,
      jobs: jobsWithScores,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch jobs',
    });
  }
};

// @desc    Get single job by ID with candidate match details
// @route   GET /api/jobs/:id
// @access  Public
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      'employer',
      'name email companyProfile'
    );

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const jobObj = job.toObject();

    if (req.user && req.user.role !== 'employer') {
      const candidate = await User.findById(req.user._id);
      if (candidate) {
        const matchResult = calculateMatchScore(candidate, jobObj);
        jobObj.matchPercentage = matchResult.matchPercentage;
        jobObj.matchedSkills = matchResult.matchedSkills;
        jobObj.missingSkills = matchResult.missingSkills;
      }
    }

    return res.status(200).json({
      success: true,
      job: jobObj,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve job details',
    });
  }
};

// @desc    Get all jobs created by the current employer
// @route   GET /api/jobs/employer/my-jobs
// @access  Private (Employer only)
export const getEmployerJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve employer jobs',
    });
  }
};

// @desc    Delete a job
// @route   DELETE /api/jobs/:id
// @access  Private (Employer only)
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this job',
      });
    }

    await job.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete job',
    });
  }
};
