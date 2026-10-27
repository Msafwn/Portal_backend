import Job from '../models/Job.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Helper: 50-30-20 AI Algorithm Matching for Candidate & Job
 * - Skills Compatibility: 50%
 * - Experience Alignment: 30%
 * - Education Requirement: 20%
 */
export const calculate503020Match = (candidate, job) => {
  if (!candidate || !candidate.skills) {
    return {
      matchPercentage: 75,
      matchedSkills: (job.requiredSkills || []).slice(0, 2).map((s) => s.name),
      missingSkills: (job.requiredSkills || []).slice(2).map((s) => s.name),
      breakdown: {
        skillsScore: 35,
        experienceScore: 23,
        educationScore: 17,
      },
    };
  }

  // 1. Skills Compatibility (50 Points)
  const candidateSkillNames = (candidate.skills || []).map((s) =>
    (typeof s === 'string' ? s : s?.name || '').trim().toLowerCase()
  );

  const matchedSkills = [];
  const missingSkills = [];
  let totalSkillWeight = 0;
  let matchedSkillWeight = 0;

  (job.requiredSkills || []).forEach((reqSkill) => {
    const sName = (reqSkill.name || '').trim().toLowerCase();
    const weight = reqSkill.weight || 1;
    totalSkillWeight += weight;

    const matched = candidateSkillNames.some(
      (cSkill) => cSkill === sName || cSkill.includes(sName) || sName.includes(cSkill)
    );

    if (matched) {
      matchedSkills.push(reqSkill.name);
      matchedSkillWeight += weight;
    } else {
      missingSkills.push(reqSkill.name);
    }
  });

  const skillsRatio = totalSkillWeight > 0 ? matchedSkillWeight / totalSkillWeight : 0.7;
  const skillsScore = Math.round(Math.min(50, Math.max(15, skillsRatio * 50)));

  // 2. Experience Alignment (30 Points)
  const candidateExpCount = candidate.experience?.length || 0;
  const jobExpRequired = job.experienceRequired || job.minExperienceYears || 0;
  const isEntryLevelOrIntern =
    (job.jobType || '').toLowerCase().includes('intern') ||
    (job.jobType || '').toLowerCase().includes('entry') ||
    (job.jobType || '').toLowerCase().includes('trainee');

  let experienceScore = 18;
  if (isEntryLevelOrIntern) {
    experienceScore = candidateExpCount > 0 ? 28 : 24;
  } else {
    if (candidateExpCount >= jobExpRequired && jobExpRequired > 0) {
      experienceScore = 30;
    } else if (candidateExpCount > 0) {
      experienceScore = 22;
    } else {
      experienceScore = 14;
    }
  }

  // 3. Education Requirement (20 Points)
  const candidateEdu = candidate.education || [];
  const hasDegree = candidateEdu.length > 0;
  let educationScore = 12;

  if (hasDegree) {
    const candidateField = (candidateEdu[0]?.field || '').toLowerCase();
    const jobDept = (job.department || '').toLowerCase();

    if (
      candidateField.includes('computer') ||
      candidateField.includes('software') ||
      candidateField.includes('technology') ||
      candidateField.includes('information') ||
      jobDept.includes('information') ||
      jobDept.includes('software')
    ) {
      educationScore = 20;
    } else {
      educationScore = 17;
    }
  }

  const matchPercentage = Math.min(98, Math.max(40, skillsScore + experienceScore + educationScore));

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
    breakdown: {
      skillsScore,
      experienceScore,
      educationScore,
    },
  };
};

/**
 * Helper: Format Salary String for Client
 */
const formatSalaryDisplay = (salaryRange) => {
  if (!salaryRange || (!salaryRange.min && !salaryRange.max)) {
    return 'Competitive Market Salary';
  }
  const curr = salaryRange.currency || 'PKR';
  if (salaryRange.min && salaryRange.max) {
    return `${salaryRange.min.toLocaleString()} - ${salaryRange.max.toLocaleString()} ${curr}`;
  }
  if (salaryRange.min) {
    return `Starting from ${salaryRange.min.toLocaleString()} ${curr}`;
  }
  return `Up to ${salaryRange.max.toLocaleString()} ${curr}`;
};

/**
 * 1. Job Feed: Browse & Filter Vacancies with AI Compatibility Scoring
 * GET /api/jobs
 */
export const getJobs = asyncHandler(async (req, res) => {
  const {
    search,
    keyword,
    category,
    department,
    jobType,
    workMode,
    location,
    status = 'Open',
    minSalary,
    maxSalary,
    sortBy = 'newest',
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  // Text & Keyword Search
  const searchTerm = search || keyword;
  if (searchTerm && searchTerm.trim()) {
    const regex = new RegExp(searchTerm.trim(), 'i');
    query.$or = [
      { title: regex },
      { company: regex },
      { department: regex },
      { description: regex },
      { 'requiredSkills.name': regex },
    ];
  }

  if (category && category !== 'All' && category !== 'all') {
    query.category = new RegExp(`^${category}$`, 'i');
  }

  if (department && department !== 'All' && department !== 'all') {
    query.department = new RegExp(`^${department}$`, 'i');
  }

  if (jobType && jobType !== 'All' && jobType !== 'all') {
    query.jobType = new RegExp(`^${jobType}$`, 'i');
  }

  if (workMode && workMode !== 'All' && workMode !== 'all') {
    query.workMode = new RegExp(`^${workMode}$`, 'i');
  }

  if (location && location !== 'All' && location !== 'all') {
    query.location = new RegExp(location, 'i');
  }

  if (minSalary) {
    query['salaryRange.min'] = { $gte: Number(minSalary) };
  }
  if (maxSalary) {
    query['salaryRange.max'] = { $lte: Number(maxSalary) };
  }

  // Sort Options
  let sort = { createdAt: -1 };
  if (sortBy === 'oldest') {
    sort = { createdAt: 1 };
  } else if (sortBy === 'deadline') {
    sort = { deadline: 1 };
  } else if (sortBy === 'salary') {
    sort = { 'salaryRange.max': -1 };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Job.countDocuments(query);

  const rawJobs = await Job.find(query)
    .populate('employer', 'name email avatar headline companyName')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // If candidate is logged in, find their applied job IDs for quick tag
  let appliedJobIds = [];
  if (req.user) {
    const applications = await Application.find({ applicant: req.user._id }).select('job');
    appliedJobIds = applications.map((a) => a.job.toString());
  }

  // Enrich jobs with 50-30-20 match calculation
  let enrichedJobs = rawJobs.map((job) => {
    const matchAnalysis = calculate503020Match(req.user, job);
    const isApplied = appliedJobIds.includes(job._id.toString());

    return {
      id: job._id,
      _id: job._id,
      title: job.title,
      company: job.company,
      department: job.department,
      category: job.category,
      jobType: job.jobType,
      employmentType: job.jobType,
      location: job.location,
      workMode: job.workMode,
      description: job.description,
      requiredSkills: (job.requiredSkills || []).map((s) => s.name),
      skills: (job.requiredSkills || []).map((s) => s.name),
      experienceRequired: job.experienceRequired,
      educationRequirement: job.educationRequirement,
      salary: formatSalaryDisplay(job.salaryRange),
      salaryRange: job.salaryRange,
      status: job.status,
      applicantsCount: job.applicantsCount || 0,
      postedTime: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently',
      createdAt: job.createdAt,
      deadline: job.deadline,
      matchPercentage: matchAnalysis.matchPercentage,
      matchedSkills: matchAnalysis.matchedSkills,
      missingSkills: matchAnalysis.missingSkills,
      breakdown: matchAnalysis.breakdown,
      isApplied,
      employer: {
        id: job.employer?._id,
        name: job.employer?.name || job.company,
        avatar: job.employer?.avatar || '',
      },
    };
  });

  // If user requested sort by match score
  if (sortBy === 'match' || sortBy === 'matchPercentage') {
    enrichedJobs.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        jobs: enrichedJobs,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
      'Job feed retrieved successfully'
    )
  );
});

/**
 * 2. Job Details: Comprehensive Vacancy Dossier + 50-30-20 AI Match Breakdown
 * GET /api/jobs/:id
 */
export const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id).populate(
    'employer',
    'name email avatar headline department companyName bio phone location'
  );

  if (!job) {
    throw new ApiError(404, 'Job vacancy not found');
  }

  // Calculate personalized match score
  const matchAnalysis = calculate503020Match(req.user, job);

  // Check if candidate has already submitted application
  let isApplied = false;
  let applicationDetails = null;

  if (req.user) {
    const existingApp = await Application.findOne({
      job: job._id,
      applicant: req.user._id,
    });
    if (existingApp && existingApp.status !== 'Withdrawn') {
      isApplied = true;
      applicationDetails = {
        applicationId: existingApp._id,
        status: existingApp.status,
        appliedAt: existingApp.appliedAt,
        matchScore: existingApp.matchPercentage,
        notes: existingApp.employerNotes,
        interview: existingApp.interview,
      };
    }
  }

  // Fetch up to 3 similar jobs from same department
  const similarJobsRaw = await Job.find({
    _id: { $ne: job._id },
    status: 'Open',
    $or: [{ department: job.department }, { category: job.category }],
  })
    .limit(3)
    .select('title company department location jobType salaryRange requiredSkills createdAt');

  const similarJobs = similarJobsRaw.map((simJob) => {
    const simMatch = calculate503020Match(req.user, simJob);
    return {
      id: simJob._id,
      _id: simJob._id,
      title: simJob.title,
      company: simJob.company,
      department: simJob.department,
      location: simJob.location,
      jobType: simJob.jobType,
      salary: formatSalaryDisplay(simJob.salaryRange),
      matchPercentage: simMatch.matchPercentage,
    };
  });

  const detailedJob = {
    id: job._id,
    _id: job._id,
    title: job.title,
    company: job.company,
    department: job.department,
    category: job.category,
    jobType: job.jobType,
    employmentType: job.jobType,
    location: job.location,
    workMode: job.workMode,
    description: job.description,
    requiredSkills: job.requiredSkills || [],
    skills: (job.requiredSkills || []).map((s) => s.name),
    experienceRequired: job.experienceRequired,
    educationRequirement: job.educationRequirement,
    salary: formatSalaryDisplay(job.salaryRange),
    salaryRange: job.salaryRange,
    status: job.status,
    applicantsCount: job.applicantsCount || 0,
    deadline: job.deadline,
    createdAt: job.createdAt,
    postedTime: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently',
    matchPercentage: matchAnalysis.matchPercentage,
    matchedSkills: matchAnalysis.matchedSkills,
    missingSkills: matchAnalysis.missingSkills,
    breakdown: matchAnalysis.breakdown,
    isApplied,
    application: applicationDetails,
    employer: {
      id: job.employer?._id,
      name: job.employer?.name || job.company,
      email: job.employer?.email || '',
      avatar: job.employer?.avatar || '',
      companyName: job.employer?.companyName || job.company,
      headline: job.employer?.headline || 'Recruiting Partner',
    },
    similarJobs,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, detailedJob, 'Job details retrieved successfully'));
});

/**
 * 3. Employer: Post New Job Vacancy
 * POST /api/jobs
 */
export const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    company,
    description,
    overview,
    department = 'Information Technology',
    category = 'Software Development',
    jobType,
    employmentType,
    roleTarget,
    location,
    workMode = 'On-site',
    requiredSkills,
    skillsRequired,
    skills,
    experienceRequired = 0,
    educationRequirement = "Bachelor's Degree in Relevant Discipline",
    qualifications,
    requirements,
    perks,
    salaryRange,
    salary,
    totalSeats = 1,
    deadline,
  } = req.body;

  if (!title || (!description && !overview) || !location) {
    throw new ApiError(400, 'Title, description/overview, and location are required');
  }

  // Support various skill payload keys
  const incomingSkills = requiredSkills || skillsRequired || skills || [];
  let formattedSkills = [];
  if (Array.isArray(incomingSkills)) {
    formattedSkills = incomingSkills.map((s) => {
      if (typeof s === 'string') {
        return { name: s.trim().toLowerCase(), weight: 3, mandatory: false };
      }
      return {
        name: (s.name || '').trim().toLowerCase(),
        weight: Number(s.weight) || 3,
        mandatory: Boolean(s.mandatory),
      };
    });
  }

  if (formattedSkills.length === 0) {
    throw new ApiError(400, 'At least one required skill must be specified');
  }

  // Parse salary range if string provided
  let parsedSalaryRange = salaryRange;
  if (!parsedSalaryRange && salary) {
    const rawSal = String(salary).replace(/,/g, '');
    const matches = rawSal.match(/\d+/g);
    if (matches && matches.length >= 2) {
      parsedSalaryRange = {
        min: Number(matches[0]),
        max: Number(matches[1]),
        currency: 'PKR',
        isNegotiable: false,
      };
    } else if (matches && matches.length === 1) {
      parsedSalaryRange = {
        min: Number(matches[0]),
        max: Number(matches[0]),
        currency: 'PKR',
        isNegotiable: false,
      };
    } else {
      parsedSalaryRange = { currency: 'PKR', isNegotiable: true };
    }
  }

  const companyName = company || req.user.companyProfile?.companyName || req.user.companyName || req.user.name || 'Hiring Enterprise';
  const finalJobType = jobType || employmentType || roleTarget || 'Full-Time';
  const finalDescription = (description || overview || `${title} position at ${companyName}`).trim();

  const job = await Job.create({
    title: title.trim(),
    company: companyName.trim(),
    employer: req.user._id,
    description: finalDescription,
    overview: (overview || finalDescription).trim(),
    department: department.trim(),
    category: category.trim(),
    jobType: finalJobType,
    location: location.trim(),
    workMode,
    requiredSkills: formattedSkills,
    experienceRequired: Number(experienceRequired) || 0,
    educationRequirement: (qualifications || educationRequirement).trim(),
    qualifications: (qualifications || educationRequirement).trim(),
    requirements: Array.isArray(requirements) ? requirements : [],
    perks: Array.isArray(perks) ? perks : [],
    totalSeats: Number(totalSeats) || 1,
    filledSeats: 0,
    salaryRange: parsedSalaryRange || { currency: 'PKR', isNegotiable: true },
    deadline: deadline ? new Date(deadline) : undefined,
    status: 'Open',
    applicantsCount: 0,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, job, 'Job vacancy created and published successfully!'));
});

/**
 * 3.1 AI-Powered Job Description & Skill Extraction
 * POST /api/jobs/ai-generate-description
 */
export const generateJobDescriptionAi = asyncHandler(async (req, res) => {
  const { title, department, targetRole, skills, companyName } = req.body;

  try {
    const pythonUrl = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${pythonUrl}/api/jobs/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || 'Software Engineer',
        department: department || 'Computer Science & IT',
        target_role: targetRole || 'fresh_graduate',
        skills: Array.isArray(skills) ? skills : [],
        company_name: companyName || req.user?.companyProfile?.companyName || req.user?.companyName || req.user?.name || 'TechLogix Global',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json(new ApiResponse(200, data, 'AI Job Description generated successfully!'));
    }
  } catch (err) {
    console.warn('Python AI service note:', err.message);
  }

  // Fast Fallback
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        title: title || 'Software Engineer',
        department: department || 'Computer Science & IT',
        overview: `We are looking for an ambitious ${title || 'Software Engineer'} to join our high-impact team at ${companyName || 'TechLogix Global'}.`,
        responsibilities: [
          'Architect and deliver production-grade software features adhering to best practices.',
          'Collaborate closely with cross-functional product and engineering leads.',
          'Author unit and integration tests to ensure reliable platform performance.',
          'Troubleshoot edge cases and optimize continuous delivery pipelines.',
        ],
        qualifications: "Bachelor's degree in relevant discipline or demonstrable project portfolio.",
        suggestedSkills: ['React.js', 'Node.js', 'Python', 'Docker', 'SQL'],
        salaryGuidance: 'PKR 90,000 - 150,000 / month based on technical background',
        perks: [
          'Flexible Hybrid / Remote Schedule',
          'Comprehensive Health & OPD Insurance',
          'Annual Performance Bonus & Appraisal',
          'Paid Certifications & Professional Upskilling',
        ],
      },
      'Template generated (fallback mode)'
    )
  );
});

/**
 * 4. Employer: Modify Existing Job Vacancy
 * PUT /api/jobs/:id
 */
export const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) {
    throw new ApiError(404, 'Job vacancy not found');
  }

  // Security check: Only job owner or admin can update
  if (
    job.employer.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Unauthorized to modify this job vacancy');
  }

  const {
    title,
    company,
    description,
    department,
    category,
    jobType,
    location,
    workMode,
    requiredSkills,
    experienceRequired,
    educationRequirement,
    salaryRange,
    status,
    deadline,
    totalSeats,
    salary,
    overview,
    requirements,
    qualifications,
    perks,
  } = req.body;

  if (title) job.title = title.trim();
  if (company) job.company = company.trim();
  if (description) job.description = description.trim();
  if (overview) job.overview = overview.trim();
  if (department) job.department = department.trim();
  if (category) job.category = category.trim();
  if (jobType) job.jobType = jobType;
  if (location) job.location = location.trim();
  if (workMode) job.workMode = workMode;
  if (totalSeats !== undefined) job.totalSeats = Number(totalSeats) || 1;
  if (experienceRequired !== undefined) job.experienceRequired = Number(experienceRequired);
  if (educationRequirement) job.educationRequirement = educationRequirement.trim();
  if (qualifications) job.qualifications = qualifications.trim();
  if (Array.isArray(requirements)) job.requirements = requirements;
  if (Array.isArray(perks)) job.perks = perks;

  if (salaryRange) {
    job.salaryRange = salaryRange;
  } else if (salary) {
    const rawSal = String(salary).replace(/,/g, '');
    const matches = rawSal.match(/\d+/g);
    if (matches && matches.length >= 2) {
      job.salaryRange = {
        min: Number(matches[0]),
        max: Number(matches[1]),
        currency: 'PKR',
        isNegotiable: false,
      };
    } else if (matches && matches.length === 1) {
      job.salaryRange = {
        min: Number(matches[0]),
        max: Number(matches[0]),
        currency: 'PKR',
        isNegotiable: false,
      };
    }
  }

  if (status) {
    job.status = status === 'Active' ? 'Open' : status;
  }
  if (deadline) job.deadline = new Date(deadline);

  if (Array.isArray(requiredSkills)) {
    job.requiredSkills = requiredSkills.map((s) => {
      if (typeof s === 'string') {
        return { name: s.trim().toLowerCase(), weight: 3, mandatory: false };
      }
      return {
        name: (s.name || '').trim().toLowerCase(),
        weight: Number(s.weight) || 3,
        mandatory: Boolean(s.mandatory),
      };
    });
  }

  await job.save();

  return res
    .status(200)
    .json(new ApiResponse(200, job, 'Job vacancy updated successfully'));
});

/**
 * 5. Employer / Admin: Delete or Close Job Vacancy
 * DELETE /api/jobs/:id
 */
export const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id);
  if (!job) {
    throw new ApiError(404, 'Job vacancy not found');
  }

  if (
    job.employer.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new ApiError(403, 'Unauthorized to delete this job vacancy');
  }

  // Soft delete / close status or delete
  job.status = 'Closed';
  await job.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Job marked as Closed successfully'));
});

/**
 * 6. Employer: Retrieve My Posted Jobs with Metrics
 * GET /api/jobs/employer/my-jobs
 */
export const getEmployerMyJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ employer: req.user._id }).sort({ createdAt: -1 });

  const formattedJobs = jobs.map((job) => ({
    id: job._id,
    _id: job._id,
    title: job.title,
    company: job.company,
    department: job.department,
    jobType: job.jobType,
    roleTarget: job.jobType,
    location: job.location,
    workMode: job.workMode,
    status: job.status === 'Open' ? 'Active' : job.status,
    totalSeats: job.totalSeats || 2,
    filledSeats: job.filledSeats || 0,
    applicantsCount: job.applicantsCount || 0,
    salary: formatSalaryDisplay(job.salaryRange),
    salaryRange: job.salaryRange,
    skillsRequired: (job.requiredSkills || []).map((s) => s.name),
    overview: job.overview || job.description,
    description: job.description,
    requirements: job.requirements || [],
    qualifications: job.qualifications || job.educationRequirement,
    perks: job.perks || [],
    postedDate: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently',
    createdAt: job.createdAt,
    deadline: job.deadline,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        jobs: formattedJobs,
        totalCount: jobs.length,
        activeCount: jobs.filter((j) => j.status === 'Open').length,
        closedCount: jobs.filter((j) => j.status === 'Closed').length,
      },
      'Employer vacancies retrieved successfully'
    )
  );
});

/**
 * 7. Metadata: Distinct Filters for Feed Dropdowns
 * GET /api/jobs/meta/filters
 */
export const getJobFiltersMeta = asyncHandler(async (req, res) => {
  const [departments, categories, jobTypes, locations, workModes] = await Promise.all([
    Job.distinct('department', { status: 'Open' }),
    Job.distinct('category', { status: 'Open' }),
    Job.distinct('jobType', { status: 'Open' }),
    Job.distinct('location', { status: 'Open' }),
    Job.distinct('workMode', { status: 'Open' }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        departments: departments.length ? departments : ['Information Technology', 'Software Engineering', 'Data Science'],
        categories: categories.length ? categories : ['Software Development', 'AI & Machine Learning', 'Cloud & DevOps'],
        jobTypes: jobTypes.length ? jobTypes : ['Full-Time', 'Internship', 'Entry-Level', 'Part-Time'],
        locations: locations.length ? locations : ['Islamabad', 'Lahore', 'Karachi', 'Remote'],
        workModes: workModes.length ? workModes : ['On-site', 'Remote', 'Hybrid'],
      },
      'Job filter metadata retrieved successfully'
    )
  );
});
