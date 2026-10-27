import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  sendInterviewInvitationEmail,
  sendCandidateShortlistedEmail,
} from '../utils/emailService.js';

/**
 * Helper: Calculate Skill Match Score between Candidate and Job
 */
const computeMatchScore = (candidateSkills = [], jobRequiredSkills = []) => {
  if (!jobRequiredSkills || jobRequiredSkills.length === 0) {
    return {
      matchPercentage: 80,
      matchedSkills: candidateSkills.map((s) => (typeof s === 'string' ? s : s.name)),
      missingSkills: [],
    };
  }

  const candidateSkillNames = candidateSkills.map((s) =>
    (typeof s === 'string' ? s : s.name || '').trim().toLowerCase()
  );

  const matchedSkills = [];
  const missingSkills = [];

  let totalWeight = 0;
  let matchedWeight = 0;

  jobRequiredSkills.forEach((reqSkill) => {
    const skillName = (reqSkill.name || '').trim().toLowerCase();
    const weight = reqSkill.weight || 1;
    totalWeight += weight;

    const isMatched = candidateSkillNames.some(
      (cs) => cs === skillName || cs.includes(skillName) || skillName.includes(cs)
    );

    if (isMatched) {
      matchedSkills.push(reqSkill.name);
      matchedWeight += weight;
    } else {
      missingSkills.push(reqSkill.name);
    }
  });

  const basePercentage =
    totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 75;

  // Scale realistically between 40% and 98%
  const matchPercentage = Math.min(98, Math.max(40, basePercentage));

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
  };
};

/**
 * 1. Candidate: Apply to a Job
 * POST /api/applications
 */
export const applyToJob = asyncHandler(async (req, res) => {
  const {
    jobId,
    coverNote = '',
    resumeUrl,
    matchPercentage: clientMatchPercentage,
    matchedSkills: clientMatchedSkills,
    missingSkills: clientMissingSkills,
  } = req.body;

  if (!jobId) {
    throw new ApiError(400, 'Job ID is required to submit an application');
  }

  // 1. Verify Job exists and is active
  const job = await Job.findById(jobId);
  if (!job) {
    throw new ApiError(404, 'Job vacancy not found');
  }

  if (job.status === 'Closed') {
    throw new ApiError(400, 'This job position is closed and no longer accepting applications');
  }

  // 2. Prevent duplicate application
  const existingApp = await Application.findOne({
    job: jobId,
    applicant: req.user.id,
  });

  if (existingApp) {
    if (existingApp.status === 'Withdrawn') {
      // Re-activate previously withdrawn application
      existingApp.status = 'Pending';
      existingApp.coverNote = coverNote || existingApp.coverNote;
      existingApp.appliedAt = new Date();
      await existingApp.save();

      await Job.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });

      return res
        .status(200)
        .json(new ApiResponse(200, existingApp, 'Application re-submitted successfully'));
    }

    throw new ApiError(400, 'You have already submitted an application for this role');
  }

  // 3. Compute or verify match percentage
  const user = await User.findById(req.user.id);
  let matchPercentage = clientMatchPercentage;
  let matchedSkills = clientMatchedSkills;
  let missingSkills = clientMissingSkills;

  if (!matchPercentage || matchPercentage <= 0) {
    const matchAnalysis = computeMatchScore(user?.skills || [], job.requiredSkills || []);
    matchPercentage = matchAnalysis.matchPercentage;
    matchedSkills = matchAnalysis.matchedSkills;
    missingSkills = matchAnalysis.missingSkills;
  }

  // 4. Create new Application
  const application = await Application.create({
    job: jobId,
    applicant: req.user.id,
    matchPercentage: Math.min(100, Math.max(0, Number(matchPercentage) || 75)),
    matchedSkills: Array.isArray(matchedSkills) ? matchedSkills : [],
    missingSkills: Array.isArray(missingSkills) ? missingSkills : [],
    coverNote: coverNote.trim(),
    resumeUrl: resumeUrl || user?.resumeUrl || '',
    status: 'Pending',
    appliedAt: new Date(),
  });

  // 5. Increment job applicant count
  await Job.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });

  // 6. Notify Employer if recruiter user is assigned
  if (job.employer) {
    try {
      await Notification.create({
        recipient: job.employer,
        sender: req.user.id,
        title: 'New Applicant Received 🚀',
        message: `${req.user.name || 'A candidate'} applied for "${job.title}" with a ${matchPercentage}% match score.`,
        type: 'job_match',
        link: `/employer/applicants?jobId=${job._id}`,
        metadata: {
          applicationId: application._id,
          jobId: job._id,
          applicantName: req.user.name,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to send notification to employer:', notifErr.message);
    }
  }

  const populatedApp = await Application.findById(application._id)
    .populate('job', 'title company department location workMode jobType status')
    .populate('applicant', 'name email avatar headline');

  return res
    .status(201)
    .json(new ApiResponse(201, populatedApp, 'Application submitted successfully!'));
});

/**
 * 2. Candidate: Retrieve My Submitted Applications
 * GET /api/applications/my
 */
export const getMyApplications = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;

  const query = { applicant: req.user.id };

  if (status && status !== 'all' && status !== 'All') {
    if (status === 'active' || status === 'Active') {
      query.status = { $in: ['Pending', 'Under Review', 'Reviewed', 'Shortlisted', 'Interview Scheduled'] };
    } else {
      query.status = new RegExp(`^${status}$`, 'i');
    }
  }

  const applications = await Application.find(query)
    .populate({
      path: 'job',
      select: 'title company department location workMode jobType status salaryRange deadline employer',
    })
    .sort({ appliedAt: -1, createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  // In-memory search if search query provided
  let filtered = applications;
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    filtered = applications.filter((app) => {
      const titleMatch = app.job?.title?.toLowerCase().includes(term);
      const companyMatch = app.job?.company?.toLowerCase().includes(term);
      const deptMatch = app.job?.department?.toLowerCase().includes(term);
      return titleMatch || companyMatch || deptMatch;
    });
  }

  // Format applications to match frontend expectations
  const formattedList = filtered.map((app) => {
    const job = app.job || {};
    const isShortlisted = (app.status || '').toLowerCase().includes('shortlist');
    const isInterview = (app.status || '').toLowerCase().includes('interview');
    const isRejected = (app.status || '').toLowerCase().includes('reject');

    let statusVariant = 'blue';
    if (isShortlisted) statusVariant = 'emerald';
    else if (isInterview) statusVariant = 'purple';
    else if (isRejected) statusVariant = 'rose';

    return {
      id: app._id,
      applicationId: app._id,
      jobId: job._id,
      jobTitle: job.title || 'Role Title',
      company: job.company || 'Company Name',
      department: job.department || 'Technology',
      location: job.location || 'Remote',
      workMode: job.workMode || 'On-site',
      jobType: job.jobType || 'Full-Time',
      jobStatus: job.status || 'Open',
      matchScore: app.matchPercentage || 80,
      matchPercentage: app.matchPercentage || 80,
      matchedSkills: app.matchedSkills || [],
      missingSkills: app.missingSkills || [],
      appliedDate: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recently',
      appliedAt: app.appliedAt || app.createdAt,
      status: app.status || 'Pending',
      statusVariant,
      coverNote: app.coverNote || '',
      note:
        app.employerNotes ||
        (isShortlisted
          ? 'Congratulations! Your profile has been shortlisted for the next recruitment stage.'
          : isInterview
          ? 'Interview scheduled with hiring team.'
          : isRejected
          ? 'Position closed or candidate requirements not aligned.'
          : 'Application received and currently under recruiter review.'),
      employerNotes: app.employerNotes || '',
      resumeUrl: app.resumeUrl || '',
      interview: app.interview || null,
    };
  });

  // Calculate summary metrics for candidate dashboard
  const totalCount = await Application.countDocuments({ applicant: req.user.id });
  const activeCount = await Application.countDocuments({
    applicant: req.user.id,
    status: { $in: ['Pending', 'Under Review', 'Reviewed', 'Shortlisted', 'Interview Scheduled'] },
  });
  const shortlistedCount = await Application.countDocuments({
    applicant: req.user.id,
    status: 'Shortlisted',
  });
  const interviewCount = await Application.countDocuments({
    applicant: req.user.id,
    status: 'Interview Scheduled',
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        applications: formattedList,
        meta: {
          total: totalCount,
          active: activeCount,
          shortlisted: shortlistedCount,
          interview: interviewCount,
        },
      },
      'Candidate applications retrieved successfully'
    )
  );
});

/**
 * 3. Employer / Admin: Retrieve Applicants for a Specific Job
 * GET /api/applications/job/:jobId
 */
export const getJobApplicants = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { status, sortBy = 'matchScore', order = 'desc' } = req.query;

  const job = await Job.findById(jobId);
  if (!job) {
    throw new ApiError(404, 'Job vacancy not found');
  }

  // Ensure user is authorized to view applicants (job creator or admin)
  if (
    job.employer.toString() !== req.user.id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'You are not authorized to view applicants for this position');
  }

  const query = { job: jobId };
  if (status && status !== 'all' && status !== 'All') {
    query.status = new RegExp(`^${status}$`, 'i');
  }

  const sortOption = {};
  if (sortBy === 'matchScore' || sortBy === 'matchPercentage') {
    sortOption.matchPercentage = order === 'asc' ? 1 : -1;
  } else if (sortBy === 'appliedDate' || sortBy === 'date') {
    sortOption.appliedAt = order === 'asc' ? 1 : -1;
  } else {
    sortOption.createdAt = -1;
  }

  const applications = await Application.find(query)
    .populate({
      path: 'applicant',
      select: 'name email avatar headline bio phone location department skills education experience resumeUrl resumeFileName',
    })
    .sort(sortOption);

  const applicantsList = applications.map((app) => {
    const cand = app.applicant || {};
    return {
      id: app._id,
      applicationId: app._id,
      applicantId: cand._id,
      name: cand.name || 'Candidate',
      email: cand.email || '',
      phone: cand.phone || '',
      avatar: cand.avatar || '',
      headline: cand.headline || 'Aspiring Professional',
      department: cand.department || job.department || 'Technology',
      location: cand.location || 'Pakistan',
      skills: (cand.skills || []).map((s) => (typeof s === 'string' ? s : s.name)),
      education: cand.education || [],
      experience: cand.experience || [],
      resumeUrl: app.resumeUrl || cand.resumeUrl || '',
      resumeFileName: cand.resumeFileName || 'Resume.pdf',
      matchScore: app.matchPercentage || 75,
      matchedSkills: app.matchedSkills || [],
      missingSkills: app.missingSkills || [],
      status: app.status || 'Pending',
      coverNote: app.coverNote || '',
      employerNotes: app.employerNotes || '',
      appliedAt: app.appliedAt || app.createdAt,
      appliedDate: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recent',
      interview: app.interview || null,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        job: {
          id: job._id,
          title: job.title,
          company: job.company,
          department: job.department,
          applicantsCount: applicantsList.length,
        },
        applicants: applicantsList,
      },
      'Job applicants retrieved successfully'
    )
  );
});

/**
 * 4. Employer / Admin: Retrieve All Applicants across all posted jobs
 * GET /api/applications/employer/all
 */
export const getEmployerAllApplications = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  // 1. Find all jobs posted by this employer
  const employerJobs = await Job.find({ employer: req.user.id }).select(
    '_id title company department applicantsCount status'
  );

  const jobIds = employerJobs.map((j) => j._id);

  if (jobIds.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          applicants: [],
          stats: {
            totalApplicants: 0,
            shortlisted: 0,
            interviewScheduled: 0,
          },
        },
        'No jobs posted yet'
      )
    );
  }

  // 2. Fetch applications for these jobs
  const query = { job: { $in: jobIds } };
  if (status && status !== 'all' && status !== 'All') {
    query.status = new RegExp(`^${status}$`, 'i');
  }

  const applications = await Application.find(query)
    .populate('job', 'title company department status')
    .populate(
      'applicant',
      'name email avatar headline bio phone location department skills education experience resumeUrl resumeFileName'
    )
    .sort({ matchPercentage: -1, appliedAt: -1 });

  let filtered = applications;
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    filtered = applications.filter((app) => {
      const nameMatch = app.applicant?.name?.toLowerCase().includes(term);
      const emailMatch = app.applicant?.email?.toLowerCase().includes(term);
      const jobMatch = app.job?.title?.toLowerCase().includes(term);
      return nameMatch || emailMatch || jobMatch;
    });
  }

  const formattedApplicants = filtered.map((app) => {
    const cand = app.applicant || {};
    const job = app.job || {};
    const score = app.matchPercentage || 75;
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(cand.name || 'Candidate')}&background=0D8ABC&color=fff`;

    const eduStr =
      cand.education && cand.education.length > 0
        ? `${cand.education[0].degree || 'Degree'} (${cand.education[0].institute || 'University'})`
        : cand.department || 'Graduate';

    const expStr =
      cand.experience && cand.experience.length > 0
        ? `${cand.experience[0].title || 'Experience'} at ${cand.experience[0].company || 'Company'}`
        : 'Fresh Graduate';

    return {
      id: app._id.toString(),
      applicationId: app._id.toString(),
      applicantId: cand._id?.toString(),
      name: cand.name || 'Candidate',
      email: cand.email || '',
      phone: cand.phone || '+92 (300) 123-4567',
      avatar: cand.avatar || fallbackAvatar,
      headline: cand.headline || 'Professional Practitioner',
      department: cand.department || job.department || 'Technology',
      jobId: job._id?.toString(),
      jobTitle: job.title || 'Role',
      appliedJobId: job._id?.toString(),
      appliedJobTitle: job.title || 'Position',
      roleTarget: job.roleTarget || job.jobType || 'Entry-Level',
      company: job.company || 'Company',
      matchScore: score,
      scoreBreakdown: {
        technical: Math.round(score * 0.5),
        experience: Math.round(score * 0.3),
        softSkills: Math.round(score * 0.2),
      },
      matchedSkills: app.matchedSkills || [],
      missingSkills: app.missingSkills || [],
      status: app.status || 'Under Review',
      coverNote: app.coverNote || '',
      employerNotes: app.employerNotes || '',
      resumeUrl: app.resumeUrl || cand.resumeUrl || '',
      education: eduStr,
      experienceYears: expStr,
      appliedAt: app.appliedAt || app.createdAt,
      appliedDate: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recent',
      interview: app.interview || null,
    };
  });

  const totalApplicants = applications.length;
  const shortlisted = applications.filter((a) => a.status === 'Shortlisted').length;
  const interviewScheduled = applications.filter((a) => a.status === 'Interview Scheduled').length;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        applicants: formattedApplicants,
        stats: {
          totalApplicants,
          shortlisted,
          interviewScheduled,
        },
      },
      'Employer applicants pool retrieved successfully'
    )
  );
});

/**
 * 5. Retrieve Single Application by ID
 * GET /api/applications/:id
 */
export const getApplicationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const application = await Application.findById(id)
    .populate('job')
    .populate(
      'applicant',
      'name email avatar headline bio phone location department skills education experience resumeUrl resumeFileName links'
    );

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  // Authorization check: only applicant, job employer, or admin can view
  const isApplicant = application.applicant?._id?.toString() === req.user.id.toString();
  const isEmployer = application.job?.employer?.toString() === req.user.id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isApplicant && !isEmployer && !isAdmin) {
    throw new ApiError(403, 'You are not authorized to view this application dossier');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, application, 'Application details retrieved successfully'));
});

/**
 * 6. Employer / Admin: Update Application Status
 * PATCH /api/applications/:id/status
 */
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, employerNotes = '', rejectionReason = '' } = req.body;

  const validStatuses = [
    'Pending',
    'Under Review',
    'Reviewed',
    'Shortlisted',
    'Interview Scheduled',
    'Accepted',
    'Rejected',
    'Withdrawn',
  ];

  if (!status || !validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status. Allowed values: ${validStatuses.join(', ')}`
    );
  }

  const application = await Application.findById(id)
    .populate('job', 'title company employer')
    .populate('applicant', 'name email phone');

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  // Ensure user is the employer or admin
  const isEmployer = application.job?.employer?.toString() === req.user.id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isEmployer && !isAdmin) {
    throw new ApiError(403, 'Only the recruiting employer or admin can update this application status');
  }

  application.status = status;
  if (employerNotes) application.employerNotes = employerNotes.trim();
  if (rejectionReason) application.rejectionReason = rejectionReason.trim();

  await application.save();

  // Create in-app notification for Candidate
  try {
    let notifTitle = `Application Status Update: ${status}`;
    let notifMsg = `Your application for "${application.job?.title}" at ${application.job?.company} has been updated to "${status}".`;

    if (status === 'Shortlisted') {
      notifTitle = 'Congratulations! You are Shortlisted ⭐';
      notifMsg = `Great news! Your application for "${application.job?.title}" at ${application.job?.company} has been shortlisted by the recruiting team.`;
    } else if (status === 'Accepted') {
      notifTitle = 'Offer Extended / Application Accepted 🎉';
      notifMsg = `Congratulations! Your application for "${application.job?.title}" has been accepted.`;
    } else if (status === 'Interview Scheduled') {
      notifTitle = 'Interview Scheduled 🗓️';
      notifMsg = `An interview has been scheduled for "${application.job?.title}". Check your applications portal for date & details.`;
    }

    if (employerNotes) {
      notifMsg += ` Note from recruiter: "${employerNotes}"`;
    }

    await Notification.create({
      recipient: application.applicant?._id || application.applicant,
      sender: req.user.id,
      title: notifTitle,
      message: notifMsg,
      type: 'application_status',
      link: '/applications',
      metadata: {
        applicationId: application._id,
        jobId: application.job?._id,
        status,
      },
    });
  } catch (err) {
    console.warn('Failed to notify candidate of status change:', err.message);
  }

  // Real-time Email on Shortlisted
  if (status === 'Shortlisted' && application.applicant?.email) {
    try {
      await sendCandidateShortlistedEmail({
        to: application.applicant.email,
        candidateName: application.applicant.name || 'Candidate',
        jobTitle: application.job?.title || 'Selected Role',
        company: application.job?.company || 'Recruiting Company',
      });
    } catch (shortlistErr) {
      console.warn('Shortlist email dispatch error:', shortlistErr.message);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, application, `Application status updated to ${status}`));
});

/**
 * 7. Employer: Schedule Interview for Application
 * POST /api/applications/:id/schedule-interview
 */
export const scheduleInterview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, time, mode = 'Online', meetingLink = '', notes = '' } = req.body;

  if (!date || !time) {
    throw new ApiError(400, 'Interview date and time are required');
  }

  const application = await Application.findById(id)
    .populate('job', 'title company employer')
    .populate('applicant', 'name email phone');

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  const isEmployer = application.job?.employer?.toString() === req.user.id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isEmployer && !isAdmin) {
    throw new ApiError(403, 'Unauthorized to schedule interview for this candidate');
  }

  application.status = 'Interview Scheduled';
  application.interview = {
    date,
    time,
    mode,
    meetingLink,
    notes,
  };
  if (notes) {
    application.employerNotes = notes;
  }

  await application.save();

  // 1. In-app notification for candidate
  try {
    await Notification.create({
      recipient: application.applicant?._id || application.applicant,
      sender: req.user.id,
      title: 'Interview Scheduled 🗓️',
      message: `Your interview for "${application.job?.title}" at ${application.job?.company} is confirmed for ${date} at ${time} (${mode}).`,
      type: 'interview_result',
      link: '/applications',
      metadata: {
        applicationId: application._id,
        jobId: application.job?._id,
        interview: application.interview,
      },
    });
  } catch (err) {
    console.warn('Failed to notify candidate of interview in-app:', err.message);
  }

  // 2. Real-time Email Notification via Gmail SMTP
  try {
    const candidateEmail = application.applicant?.email;
    const candidateName = application.applicant?.name || 'Candidate';
    const jobTitle = application.job?.title || 'Selected Role';
    const companyName = application.job?.company || 'Recruiting Company';

    if (candidateEmail) {
      await sendInterviewInvitationEmail({
        to: candidateEmail,
        candidateName,
        jobTitle,
        company: companyName,
        date,
        time,
        mode,
        meetingLink,
        notes,
      });
    }
  } catch (emailErr) {
    console.warn('Real email dispatch failed (non-blocking):', emailErr.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      application,
      `Interview scheduled successfully for ${date} at ${time}`
    )
  );
});

/**
 * 8. Candidate: Withdraw an Application
 * DELETE /api/applications/:id
 */
export const withdrawApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const application = await Application.findById(id);
  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  if (application.applicant.toString() !== req.user.id.toString()) {
    throw new ApiError(403, 'You can only withdraw your own applications');
  }

  if (application.status === 'Accepted') {
    throw new ApiError(400, 'Cannot withdraw an already accepted job application');
  }

  application.status = 'Withdrawn';
  await application.save();

  // Decrement job applicant counter
  await Job.findByIdAndUpdate(application.job, { $inc: { applicantsCount: -1 } });

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Application withdrawn successfully'));
});

/**
 * 9. Employer / Admin: Trigger Real-time Python AI ATS Evaluation on Applicant
 * POST /api/applications/:id/ai-ats-evaluation
 */
export const evaluateApplicantATS = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const application = await Application.findById(id)
    .populate('job')
    .populate('applicant');

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  const job = application.job;
  const candidate = application.applicant;

  // Prepare profile payload for Python microservice
  try {
    const pythonUrl = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';
    const pyRes = await fetch(`${pythonUrl}/api/evaluate-candidate-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: candidate?.name || 'Applicant',
        headline: candidate?.headline || '',
        bio: candidate?.bio || '',
        department: candidate?.department || job?.department || 'Information Technology',
        role: candidate?.role || 'student',
        skills: candidate?.skills || application.matchedSkills || [],
        education: candidate?.education || [],
        experience: candidate?.experience || [],
      }),
    });

    if (pyRes.ok) {
      const pyJson = await pyRes.json();
      const aiData = pyJson?.data || pyJson;
      if (aiData?.atsScore) {
        application.matchPercentage = aiData.atsScore;
        await application.save();
      }

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            applicationId: application._id,
            aiData,
            updatedMatchScore: application.matchPercentage,
          },
          'AI ATS Evaluation completed via Python microservice'
        )
      );
    }
  } catch (pyErr) {
    console.warn('Python AI ATS microservice note:', pyErr.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        applicationId: application._id,
        updatedMatchScore: application.matchPercentage,
        matchedSkills: application.matchedSkills,
        missingSkills: application.missingSkills,
      },
      'ATS details retrieved from stored application'
    )
  );
});


