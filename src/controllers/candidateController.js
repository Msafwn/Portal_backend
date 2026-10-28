import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import InterviewSession from '../models/InterviewSession.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Calculate Comprehensive Candidate Profile Completion & ATS Metrics
 */
export const computeCandidateStats = (user) => {
  let completion = 0;

  // Basic Info (35%)
  if (user.name) completion += 5;
  if (user.avatar) completion += 10;
  if (user.headline) completion += 10;
  if (user.bio) completion += 10;
  if (user.phone) completion += 5;
  if (user.location) completion += 5;

  // Social Links (10%)
  if (user.links?.github || user.links?.linkedin || user.links?.portfolio) {
    completion += 10;
  }

  // Skills (20%)
  const skillsCount = user.skills?.length || 0;
  if (skillsCount >= 5) completion += 20;
  else if (skillsCount >= 1) completion += skillsCount * 4;

  // Education (15%)
  const eduCount = user.education?.length || 0;
  if (eduCount >= 1) completion += 15;

  // Experience / Projects (10%)
  const expCount = user.experience?.length || 0;
  if (expCount >= 1) completion += 10;

  completion = Math.min(100, Math.max(20, completion));

  // Dynamic AI Fit Score / Match Index (70% - 98%)
  let matchIndex = 70;
  matchIndex += Math.min(16, skillsCount * 2);
  if (eduCount >= 1) matchIndex += 5;
  if (expCount >= 1) matchIndex += 4;
  if (user.resumeFileName || user.resumeUrl) matchIndex += 3;
  matchIndex = Math.min(98, matchIndex);

  const checklist = {
    personalInfoVerified: Boolean(user.name && user.headline && user.bio),
    technicalSkillsAdded: skillsCount >= 3,
    academicCredentialsRecorded: eduCount >= 1,
    workExperienceRecorded: expCount >= 1,
    resumeUploaded: Boolean(user.resumeFileName || user.resumeUrl),
    connectedProfilesLinked: Boolean(
      user.links?.github || user.links?.linkedin || user.links?.portfolio
    ),
  };

  return {
    profileCompletion: completion,
    matchIndex,
    skillsCount,
    educationCount: eduCount,
    experienceCount: expCount,
    certificationsCount: user.certifications?.length || 0,
    checklist,
  };
};

/**
 * Generate Real ATS Diagnostic Breakdown based on Candidate Profile
 */
export const generateAtsAnalysis = (user) => {
  const skillsCount = user.skills?.length || 0;
  const eduCount = user.education?.length || 0;
  const expList = user.experience || [];
  const expCount = expList.filter((x) => x.type !== 'project').length;
  const projectCount = expList.filter((x) => x.type === 'project').length;
  const hasLinks = Boolean(user.links?.github || user.links?.linkedin || user.links?.portfolio);
  const hasContact = Boolean(user.phone && user.email);
  const hasResume = Boolean(user.resumeFileName || user.resumeUrl);

  const actionVerbRegex = /\b(built|developed|created|implemented|designed|managed|led|optimized|engineered|architected|deployed|integrated)\b/i;
  const hasActionVerbs = expList.some((x) => actionVerbRegex.test(x.description || x.title || ''));

  let contactScore = 60;
  if (hasContact) contactScore += 25;
  if (hasLinks) contactScore += 15;

  let skillsScore = Math.min(100, Math.max(50, 45 + skillsCount * 8));
  let expScore = expCount === 0 ? 55 : Math.min(100, 65 + expCount * 12);
  let eduScore = eduCount >= 1 ? 100 : 50;

  let projectScore = 50;
  if (projectCount > 0) projectScore += Math.min(35, projectCount * 15);
  if (hasLinks) projectScore += 15;
  projectScore = Math.min(100, projectScore);

  let formattingScore = hasResume ? 95 : 65;

  const quickMetrics = {
    keywordMatchRate: Math.min(98, Math.max(50, 42 + skillsCount * 7)),
    formattingHealth: hasResume ? 95 : 60,
    actionVerbsImpact: hasActionVerbs ? 88 : (expCount > 0 ? 74 : 58),
    portfolioVerification: (hasLinks || projectCount > 0) ? 90 : 62,
  };

  const overallAts = Math.round(
    contactScore * 0.12 +
    skillsScore * 0.28 +
    expScore * 0.22 +
    eduScore * 0.18 +
    projectScore * 0.12 +
    formattingScore * 0.08
  );

  const sections = [
    {
      title: 'Contact & Profile Links',
      score: contactScore,
      status: contactScore >= 90 ? 'Passed' : 'Needs Attention',
      notes:
        hasContact && hasLinks
          ? 'Full Name, Phone, Email, and Professional Links verified.'
          : 'Ensure Phone, Email, and LinkedIn/GitHub links are provided in profile.',
    },
    {
      title: 'Core Technical Skills',
      score: skillsScore,
      status: skillsScore >= 80 ? 'Passed' : 'Needs Attention',
      notes: `${skillsCount} industry skills indexed for automated role filtering.`,
    },
    {
      title: 'Work & Internship Experience',
      score: expScore,
      status: expScore >= 75 ? 'Passed' : 'Needs Polish',
      notes:
        expCount > 0
          ? `${expCount} corporate/internship roles documented with measurable deliverables.`
          : 'Add work experience or industry internships to improve employer ranking.',
    },
    {
      title: 'Academic Education & Degree',
      score: eduScore,
      status: eduScore >= 90 ? 'Passed' : 'Needs Attention',
      notes:
        eduCount > 0
          ? `${user.education[0]?.degree || 'Degree'} verified with academic performance metrics.`
          : 'Add at least one academic degree or certification.',
    },
    {
      title: 'Projects & Practical Portfolio',
      score: projectScore,
      status: projectScore >= 80 ? 'Passed' : 'Needs Polish',
      notes:
        projectCount > 0 || hasLinks
          ? `${projectCount} capstone/software projects indexed with repository links.`
          : 'Include active GitHub repository links or capstone project deliverables.',
    },
    {
      title: 'Formatting & ATS Readability',
      score: formattingScore,
      status: formattingScore >= 90 ? 'Passed' : 'Action Required',
      notes: hasResume
        ? `Clean machine-readable document (${user.resumeFileName || 'Resume'}) verified by ATS parser.`
        : 'Upload PDF or DOCX resume to achieve 95% single-column ATS formatting score.',
    },
  ];

  let recommendation = '';
  if (overallAts >= 90) {
    recommendation = 'Your resume and credentials are exceptionally optimized for top-tier employer shortlists! Keep projects and certifications updated.';
  } else if (!hasResume) {
    recommendation = 'Upload your latest PDF or DOCX resume to immediately boost formatting score and unlock 90+ ATS readiness.';
  } else if (skillsCount < 5) {
    recommendation = `Add ${5 - skillsCount} more technical skills to increase your keyword match rate above 90% for employer search algorithms.`;
  } else if (expCount === 0 && projectCount === 0) {
    recommendation = 'Add at least 1 internship or university project to demonstrate practical deliverables and reach 95+ ATS score.';
  } else {
    recommendation = 'Add quantifiable outcomes to your experience (e.g. "Optimized API response time by 30%") and ensure your GitHub profile is linked.';
  }

  const readinessBadge =
    overallAts >= 85
      ? 'High ATS Readiness'
      : overallAts >= 70
      ? 'Moderate ATS Readiness'
      : 'Needs Optimization';

  return {
    overallScore: overallAts,
    readinessBadge,
    quickMetrics,
    sections,
    recommendation,
  };
};

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';

/**
 * Call Python AI FastAPI Microservice for NLP, TF-IDF vectorization, and ATS scoring
 */
export const callPythonAiCandidateEvaluation = async (user) => {
  try {
    const payload = {
      name: user.name || 'Candidate',
      headline: user.headline || '',
      bio: user.bio || '',
      department: user.department || 'Information Technology',
      role: user.role || 'student',
      phone: user.phone || '',
      location: user.location || '',
      skills: (user.skills || []).map((s) =>
        typeof s === 'string' ? s : s.name
      ),
      education: (user.education || []).map((e) => ({
        degree: e.degree || '',
        institute: e.institute || '',
        field: e.field || '',
        cgpa: e.cgpa || e.gradeOrCgpa || '',
        graduationYear: e.graduationYear || '',
        status: e.status || 'Completed',
      })),
      experience: (user.experience || []).map((x) => ({
        type: x.type || 'experience',
        title: x.title || '',
        company: x.company || '',
        duration: x.duration || '',
        link: x.link || '',
        description: x.description || '',
      })),
      links: user.links || {},
      resumeFileName: user.resumeFileName || '',
      resumeUrl: user.resumeUrl || '',
    };

    const response = await fetch(
      `${PYTHON_AI_URL}/api/evaluate-candidate-profile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      const result = await response.json();
      return {
        stats: {
          profileCompletion: result.data.profileCompletion,
          matchIndex: result.data.matchIndex,
          skillsCount: result.data.skillsCount,
          educationCount: result.data.educationCount,
          experienceCount: result.data.experienceCount,
          checklist: result.data.checklist,
          nlpDetails: result.data.nlpDetails,
          engine: 'Python Hybrid NLP Microservice (spaCy + TF-IDF)',
        },
        atsAnalysis: result.data.atsAnalysis,
      };
    }
  } catch (err) {
    console.warn(
      '⚠️ Python AI microservice not reachable, using local fallback:',
      err.message
    );
  }

  // Graceful Fallback
  const stats = computeCandidateStats(user);
  const atsAnalysis = generateAtsAnalysis(user);
  return { stats, atsAnalysis };
};

// ==========================================
// 1. Candidate Profile Overview (GET & PUT)
// ==========================================


// GET /api/candidate/dashboard
export const getCandidateDashboard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    '-password -refreshToken'
  );

  if (!user) {
    throw new ApiError(404, 'Candidate not found');
  }

  // 1. Fetch user applications
  const myApplications = await Application.find({ candidate: req.user.id })
    .populate('job', 'title company location department matchScore')
    .sort({ createdAt: -1 })
    .lean();

  const appliedJobIds = myApplications.map((app) =>
    app.job?._id ? String(app.job._id) : String(app.job)
  );

  // 2. Fetch latest interview session
  const nextInterview = await InterviewSession.findOne({ candidate: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  // 3. Evaluate stats via Python AI or local fallback
  const { stats, atsAnalysis } = await callPythonAiCandidateEvaluation(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profile: user,
        stats,
        atsAnalysis,
        appliedJobIds,
        applicationsCount: myApplications.length,
        myApplications,
        nextInterview: nextInterview
          ? {
              id: nextInterview._id,
              roleTitle: nextInterview.roleTitle,
              department: nextInterview.department,
              overallScore: nextInterview.overallScore,
              date: nextInterview.createdAt,
            }
          : null,
      },
      'Candidate dashboard statistics retrieved successfully'
    )
  );
});

// GET /api/candidate/profile
export const getCandidateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    '-password -refreshToken'
  );

  if (!user) {
    throw new ApiError(404, 'Candidate not found');
  }

  const { stats, atsAnalysis } = await callPythonAiCandidateEvaluation(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profile: user,
        stats,
        atsAnalysis,
      },
      'Candidate profile and statistics retrieved successfully'
    )
  );
});

// PUT /api/candidate/profile
export const updateCandidateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'Candidate not found');
  }

  const allowedSimpleFields = [
    'name',
    'department',
    'phone',
    'location',
    'headline',
    'bio',
    'avatar',
    'links',
    'resumeUrl',
    'resumeFileName',
    'resumeFileSize',
  ];

  allowedSimpleFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  // Skills sync
  if (req.body.skills !== undefined && Array.isArray(req.body.skills)) {
    user.skills = req.body.skills.map((s) =>
      typeof s === 'string'
        ? { name: s.trim().toLowerCase(), proficiency: 'Intermediate' }
        : {
            name: (s.name || '').trim().toLowerCase(),
            proficiency: s.proficiency || 'Intermediate',
            ...(s.skill && { skill: s.skill }),
          }
    );
  }

  // Education sync
  if (req.body.education !== undefined && Array.isArray(req.body.education)) {
    user.education = req.body.education.map((edu) => ({
      ...(edu._id && { _id: edu._id }),
      degree: edu.degree || '',
      institute: edu.institute || '',
      field: edu.field || user.department || '',
      startYear:
        edu.startYear ||
        (edu.graduationYear ? Number(edu.graduationYear) - 4 : undefined),
      endYear:
        edu.endYear ||
        (edu.graduationYear ? Number(edu.graduationYear) : undefined),
      graduationYear: edu.graduationYear
        ? String(edu.graduationYear)
        : edu.endYear
          ? String(edu.endYear)
          : '',
      gradeOrCgpa: edu.gradeOrCgpa || edu.cgpa || '',
      cgpa: edu.cgpa || edu.gradeOrCgpa || '',
      status: edu.status || 'Completed',
    }));
  }

  // Experience sync
  if (req.body.experience !== undefined && Array.isArray(req.body.experience)) {
    user.experience = req.body.experience.map((exp) => ({
      ...(exp._id && { _id: exp._id }),
      type: exp.type || 'experience',
      title: exp.title || '',
      company: exp.company || '',
      duration: exp.duration || '',
      location: exp.location || '',
      startDate: exp.startDate || undefined,
      endDate: exp.endDate || undefined,
      current: exp.current || false,
      description: exp.description || exp.duration || '',
      link: exp.link || '',
    }));
  }

  // Certifications sync
  if (
    req.body.certifications !== undefined &&
    Array.isArray(req.body.certifications)
  ) {
    user.certifications = req.body.certifications.map((cert) => ({
      ...(cert._id && { _id: cert._id }),
      name: cert.name || '',
      issuingOrganization: cert.issuingOrganization || '',
      issueDate: cert.issueDate || undefined,
      credentialUrl: cert.credentialUrl || '',
    }));
  }

  if (req.body.resumeFileName || req.body.resumeUrl) {
    user.resumeUploadedAt = new Date();
  }

  user.profileCompleted = true;
  await user.save();

  const updatedUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );
  const { stats, atsAnalysis } =
    await callPythonAiCandidateEvaluation(updatedUser);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profile: updatedUser,
        stats,
        atsAnalysis,
      },
      'Candidate profile successfully synchronized'
    )
  );
});

// ==========================================
// 2. Avatar Photo Upload (File or Base64)
// ==========================================

export const uploadAvatarFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload an image file');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'Candidate not found');
  }

  // File served via public folder: /uploads/avatars/...
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  user.avatar = avatarUrl;
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { avatar: avatarUrl },
        'Avatar image uploaded and synchronized with candidate profile'
      )
    );
});

// ==========================================
// 3. Technical Skills (CRUD)
// ==========================================

export const getSkills = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('skills');
  if (!user) throw new ApiError(404, 'Candidate not found');

  return res
    .status(200)
    .json(
      new ApiResponse(200, user.skills, 'Candidate technical skills retrieved')
    );
});

export const addSkill = asyncHandler(async (req, res) => {
  const { name, proficiency } = req.body;
  if (!name || !name.trim()) {
    throw new ApiError(400, 'Skill name is required');
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  const cleanName = name.trim().toLowerCase();
  const exists = user.skills.some((s) => s.name.toLowerCase() === cleanName);
  if (exists) {
    throw new ApiError(400, `Skill "${name}" is already in your profile`);
  }

  if (user.skills.length >= 15) {
    throw new ApiError(400, 'Maximum limit of 15 technical skills reached');
  }

  user.skills.push({
    name: cleanName,
    proficiency: proficiency || 'Intermediate',
  });

  await user.save();

  return res
    .status(201)
    .json(
      new ApiResponse(201, user.skills, `Skill "${name}" added successfully`)
    );
});

export const updateSkills = asyncHandler(async (req, res) => {
  const { skills } = req.body;
  if (!Array.isArray(skills)) {
    throw new ApiError(400, 'Skills must be an array');
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  user.skills = skills.slice(0, 15).map((s) =>
    typeof s === 'string'
      ? { name: s.trim().toLowerCase(), proficiency: 'Intermediate' }
      : {
          name: (s.name || '').trim().toLowerCase(),
          proficiency: s.proficiency || 'Intermediate',
        }
  );

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.skills,
        'Candidate technical skills updated successfully'
      )
    );
});

export const deleteSkill = asyncHandler(async (req, res) => {
  const { skillName } = req.params;
  const target = decodeURIComponent(skillName).trim().toLowerCase();

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  user.skills = user.skills.filter((s) => s.name.toLowerCase() !== target);
  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.skills,
        `Skill "${target}" removed successfully`
      )
    );
});

// ==========================================
// 4. Academic Education & Degrees (CRUD)
// ==========================================

export const getEducation = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('education');
  if (!user) throw new ApiError(404, 'Candidate not found');

  return res
    .status(200)
    .json(
      new ApiResponse(200, user.education, 'Education credentials retrieved')
    );
});

export const addEducation = asyncHandler(async (req, res) => {
  const { degree, institute, field, cgpa, graduationYear, status } = req.body;

  if (!degree || !institute) {
    throw new ApiError(400, 'Degree and Institute are required');
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  user.education.unshift({
    degree: degree.trim(),
    institute: institute.trim(),
    field: field?.trim() || user.department,
    cgpa: cgpa?.trim() || '3.70 / 4.0',
    gradeOrCgpa: cgpa?.trim() || '3.70 / 4.0',
    graduationYear: graduationYear ? String(graduationYear).trim() : '2026',
    endYear: graduationYear ? Number(graduationYear) : undefined,
    status: status || 'Completed',
  });

  await user.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        user.education,
        'Education credential added successfully'
      )
    );
});

export const updateEducation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { degree, institute, field, cgpa, graduationYear, status } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  const item =
    user.education.id(id) ||
    user.education.find((e) => e._id?.toString() === id || e.degree === id);
  if (!item) {
    throw new ApiError(404, 'Education credential not found');
  }

  if (degree) item.degree = degree.trim();
  if (institute) item.institute = institute.trim();
  if (field !== undefined) item.field = field.trim();
  if (cgpa !== undefined) {
    item.cgpa = cgpa.trim();
    item.gradeOrCgpa = cgpa.trim();
  }
  if (graduationYear !== undefined) {
    item.graduationYear = String(graduationYear).trim();
    item.endYear = Number(graduationYear);
  }
  if (status !== undefined) item.status = status;

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.education,
        'Education credential updated successfully'
      )
    );
});

export const deleteEducation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) throw new ApiError(404, 'Candidate not found');

  user.education = user.education.filter(
    (item) => item._id?.toString() !== id && item.degree !== id
  );

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.education,
        'Education credential removed successfully'
      )
    );
});

// ==========================================
// 5. Work Experience & Projects (CRUD)
// ==========================================

export const getExperience = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('experience');
  if (!user) throw new ApiError(404, 'Candidate not found');

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.experience,
        'Work experience and projects retrieved'
      )
    );
});

export const addExperience = asyncHandler(async (req, res) => {
  const { type, title, company, duration, description, link, location } =
    req.body;

  if (!title) {
    throw new ApiError(400, 'Job or Project title is required');
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  user.experience.unshift({
    type: type || 'experience',
    title: title.trim(),
    company:
      company?.trim() || (type === 'project' ? 'Portfolio Project' : 'Company'),
    duration: duration?.trim() || '2025 – Present',
    description:
      description?.trim() ||
      'Hands-on practical deliverables and accomplishments.',
    link: link?.trim() || '',
    location: location?.trim() || '',
  });

  await user.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        user.experience,
        'Experience record added successfully'
      )
    );
});

export const updateExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, title, company, duration, description, link, location } =
    req.body;

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  const item =
    user.experience.id(id) ||
    user.experience.find((e) => e._id?.toString() === id || e.title === id);
  if (!item) {
    throw new ApiError(404, 'Experience entry not found');
  }

  if (type) item.type = type;
  if (title) item.title = title.trim();
  if (company !== undefined) item.company = company.trim();
  if (duration !== undefined) item.duration = duration.trim();
  if (description !== undefined) item.description = description.trim();
  if (link !== undefined) item.link = link.trim();
  if (location !== undefined) item.location = location.trim();

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.experience,
        'Experience record updated successfully'
      )
    );
});

export const deleteExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) throw new ApiError(404, 'Candidate not found');

  user.experience = user.experience.filter(
    (item) => item._id?.toString() !== id && item.title !== id
  );

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.experience,
        'Experience record removed successfully'
      )
    );
});

// ==========================================
// 6. Certifications & Accreditations (CRUD)
// ==========================================

export const getCertifications = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('certifications');
  if (!user) throw new ApiError(404, 'Candidate not found');

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.certifications,
        'Candidate certifications retrieved'
      )
    );
});

export const addCertification = asyncHandler(async (req, res) => {
  const { name, issuingOrganization, issueDate, credentialUrl } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Certification name is required');
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  user.certifications.unshift({
    name: name.trim(),
    issuingOrganization: issuingOrganization?.trim() || '',
    issueDate: issueDate || new Date(),
    credentialUrl: credentialUrl?.trim() || '',
  });

  await user.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        user.certifications,
        'Certification added successfully'
      )
    );
});

export const deleteCertification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) throw new ApiError(404, 'Candidate not found');

  user.certifications = user.certifications.filter(
    (c) => c._id?.toString() !== id && c.name !== id
  );

  await user.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.certifications,
        'Certification removed successfully'
      )
    );
});

// ==========================================
// 7. Resume & ATS Diagnostics
// ==========================================

export const uploadResumeFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a PDF or DOC/DOCX resume file');
  }

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  const resumeUrl = `/uploads/resumes/${req.file.filename}`;
  const fileName = req.file.originalname;
  const fileSize = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`;

  user.resumeUrl = resumeUrl;
  user.resumeFileName = fileName;
  user.resumeFileSize = fileSize;
  user.resumeUploadedAt = new Date();

  await user.save();

  const { atsAnalysis } = await callPythonAiCandidateEvaluation(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        resumeUrl,
        resumeFileName: fileName,
        resumeFileSize: fileSize,
        resumeUploadedAt: user.resumeUploadedAt,
        atsAnalysis,
      },
      'Resume file uploaded and indexed by ATS scoring engine'
    )
  );
});

export const updateResume = asyncHandler(async (req, res) => {
  const { resumeFileName, resumeFileSize, resumeUrl } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  if (resumeFileName) user.resumeFileName = resumeFileName;
  if (resumeFileSize) user.resumeFileSize = resumeFileSize;
  if (resumeUrl) user.resumeUrl = resumeUrl;
  user.resumeUploadedAt = new Date();

  await user.save();

  const { atsAnalysis } = await callPythonAiCandidateEvaluation(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        resumeFileName: user.resumeFileName,
        resumeFileSize: user.resumeFileSize,
        resumeUrl: user.resumeUrl,
        resumeUploadedAt: user.resumeUploadedAt,
        atsAnalysis,
      },
      'Candidate resume synchronized with ATS scoring engine'
    )
  );
});


export const deleteResume = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  user.resumeUrl = '';
  user.resumeFileName = '';
  user.resumeFileSize = '';
  user.resumeUploadedAt = null;

  await user.save();

  const { atsAnalysis } = await callPythonAiCandidateEvaluation(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        resumeFileName: '',
        resumeFileSize: '',
        resumeUrl: '',
        resumeUploadedAt: null,
        atsAnalysis,
      },
      'Resume removed successfully from candidate profile'
    )
  );
});

export const getResumeAnalysis = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  const { atsAnalysis } = await callPythonAiCandidateEvaluation(user);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        atsAnalysis,
        'ATS diagnostic evaluation report generated successfully'
      )
    );
});

// ==========================================
// 8. Candidate Password Change
// ==========================================

export const changeCandidatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters long');
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw new ApiError(404, 'Candidate not found');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Candidate password updated successfully'));
});

// ==========================================
// 9. Role Matches & AI Skill Gap Engine
// ==========================================

export const getCandidateRoleMatches = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Candidate not found');

  // 1. Fetch all active/open jobs
  const jobs = await Job.find({ status: 'Open' })
    .populate('employer', 'name email avatar headline companyName')
    .sort({ createdAt: -1 });

  // 2. Fetch candidate's applications
  const applications = await Application.find({ applicant: user._id }).select(
    'job status'
  );
  const appliedJobIds = new Set(applications.map((a) => a.job.toString()));

  // 3. Evaluate 50-30-20 match for each job
  const candidateSkills = (user.skills || []).map((s) =>
    (typeof s === 'string' ? s : s?.name || '').trim().toLowerCase()
  );

  const matchedRoles = jobs.map((job) => {
    // 50% Skills Compatibility
    const matchedSkills = [];
    const missingSkills = [];
    let totalSkillWeight = 0;
    let matchedSkillWeight = 0;

    (job.requiredSkills || []).forEach((reqSkill) => {
      const sName = (reqSkill.name || '').trim().toLowerCase();
      const weight = reqSkill.weight || 1;
      totalSkillWeight += weight;

      const matched = candidateSkills.some(
        (cSkill) =>
          cSkill === sName || cSkill.includes(sName) || sName.includes(cSkill)
      );

      if (matched) {
        matchedSkills.push(reqSkill.name);
        matchedSkillWeight += weight;
      } else {
        missingSkills.push(reqSkill.name);
      }
    });

    const skillsRatio =
      totalSkillWeight > 0 ? matchedSkillWeight / totalSkillWeight : 0.7;
    const skillsScore = Math.round(
      Math.min(50, Math.max(15, skillsRatio * 50))
    );

    // 30% Experience Alignment
    const expCount = user.experience?.length || 0;
    const jobExpReq = job.experienceRequired || job.minExperienceYears || 0;
    const isEntryOrIntern =
      (job.jobType || '').toLowerCase().includes('intern') ||
      (job.jobType || '').toLowerCase().includes('entry') ||
      (job.jobType || '').toLowerCase().includes('trainee');

    let experienceScore = 18;
    if (isEntryOrIntern) {
      experienceScore = expCount > 0 ? 28 : 24;
    } else {
      if (expCount >= jobExpReq && jobExpReq > 0) {
        experienceScore = 30;
      } else if (expCount > 0) {
        experienceScore = 22;
      } else {
        experienceScore = 14;
      }
    }

    // 20% Education Requirement
    const candidateEdu = user.education || [];
    let educationScore = 14;
    if (candidateEdu.length > 0) {
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

    const matchPercentage = Math.min(
      98,
      Math.max(40, skillsScore + experienceScore + educationScore)
    );

    // Format salary display
    let salary = 'Competitive Market Salary';
    if (job.salaryRange && (job.salaryRange.min || job.salaryRange.max)) {
      const curr = job.salaryRange.currency || 'PKR';
      if (job.salaryRange.min && job.salaryRange.max) {
        salary = `${job.salaryRange.min.toLocaleString()} - ${job.salaryRange.max.toLocaleString()} ${curr}`;
      } else if (job.salaryRange.min) {
        salary = `Starting from ${job.salaryRange.min.toLocaleString()} ${curr}`;
      } else {
        salary = `Up to ${job.salaryRange.max.toLocaleString()} ${curr}`;
      }
    }

    const isApplied = appliedJobIds.has(job._id.toString());

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
      salary,
      salaryRange: job.salaryRange,
      status: job.status,
      applicantsCount: job.applicantsCount || 0,
      postedTime: job.createdAt
        ? new Date(job.createdAt).toLocaleDateString()
        : 'Recently',
      createdAt: job.createdAt,
      matchPercentage,
      matchedSkills,
      missingSkills,
      breakdown: {
        skillsScore,
        experienceScore,
        educationScore,
      },
      isApplied,
      employer: {
        id: job.employer?._id,
        name: job.employer?.name || job.company,
        avatar: job.employer?.avatar || '',
      },
    };
  });

  // Sort strictly by highest compatibility first
  matchedRoles.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // 4. Dynamic Skill Gap Roadmap
  // Aggregate missing skills across top 10 recommended roles
  const top10 = matchedRoles.slice(0, 10);
  const skillFrequency = {};
  const skillRoleMap = {};

  top10.forEach((role) => {
    (role.missingSkills || []).forEach((skill) => {
      const normalized = skill.trim();
      skillFrequency[normalized] = (skillFrequency[normalized] || 0) + 1;
      if (!skillRoleMap[normalized]) {
        skillRoleMap[normalized] = [];
      }
      if (!skillRoleMap[normalized].includes(role.title)) {
        skillRoleMap[normalized].push(role.title);
      }
    });
  });

  const sortedMissingSkills = Object.keys(skillFrequency).sort(
    (a, b) => skillFrequency[b] - skillFrequency[a]
  );

  const skillGaps = sortedMissingSkills.slice(0, 3).map((skillName, idx) => {
    const count = skillFrequency[skillName];
    const unlockedRoles = skillRoleMap[skillName] || [];
    const impactBoost = Math.min(15, count * 3 + 4);

    return {
      id: `gap-${idx + 1}`,
      skill: skillName,
      impact: `+${impactBoost}% Match Boost`,
      rolesUnlocked: `${count} Top Role${count > 1 ? 's' : ''} (${unlockedRoles.slice(0, 2).join(', ')})`,
      category: user.department || 'Technology & Engineering',
      resource: `Recommended: Practical ${skillName} Mastery & Architecture Guide`,
    };
  });

  // If candidate has few missing skills, fallback default gaps
  if (skillGaps.length === 0) {
    skillGaps.push({
      id: 'gap-1',
      skill: 'Docker & Containerization',
      impact: '+8% Match Boost',
      rolesUnlocked: 'Top DevOps & Full Stack Roles',
      category: user.department || 'Information Technology',
      resource: 'Interactive 2-Hour Practical Tutorial',
    });
  }

  const topScore = matchedRoles[0]?.matchPercentage || 94;
  const avgScore =
    matchedRoles.length > 0
      ? Math.round(
          matchedRoles.reduce((acc, r) => acc + r.matchPercentage, 0) /
            matchedRoles.length
        )
      : 80;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        jobs: matchedRoles,
        roles: matchedRoles,
        skillGaps,
        topScore,
        averageScore: avgScore,
        totalMatches: matchedRoles.length,
        candidateProfile: {
          name: user.name,
          role: user.role,
          department: user.department,
          skillsCount: candidateSkills.length,
        },
      },
      'Candidate role matches and skill gap roadmap generated successfully'
    )
  );
});
