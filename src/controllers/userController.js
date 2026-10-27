import User from '../models/User.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Helper: Dynamically compute profile completion and AI metrics
 * based on candidate's filled sections in the User document.
 */
export const computeCandidateStats = (user) => {
  let score = 20; // baseline for account registration

  if (user.avatar) score += 10;
  if (user.headline) score += 10;
  if (user.bio) score += 10;
  if (user.phone) score += 5;
  if (user.location) score += 5;
  if (user.skills && user.skills.length >= 3) score += 15;
  if (user.education && user.education.length >= 1) score += 15;
  if (user.experience && user.experience.length >= 1) score += 10;

  const profileCompletion = Math.min(100, Math.max(20, score));

  // Dynamic AI Match Index based on skills & education strength
  const skillsCount = user.skills?.length || 0;
  const eduCount = user.education?.length || 0;
  const expCount = user.experience?.length || 0;

  let matchIndex = 70;
  matchIndex += Math.min(15, skillsCount * 3);
  matchIndex += Math.min(8, eduCount * 4);
  matchIndex += Math.min(7, expCount * 3.5);
  matchIndex = Math.min(98, Math.round(matchIndex));

  return {
    profileCompletion,
    matchIndex,
    skillsCount,
    educationCount: eduCount,
    experienceCount: expCount,
  };
};

// ==========================================
// 1. USER / CANDIDATE PROFILE OPERATIONS
// ==========================================

/**
 * @route   GET /api/users/profile
 * @desc    Get currently logged-in user's profile with computed stats
 * @access  Private
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -refreshToken');

  if (!user) {
    throw new ApiError(404, 'User profile not found');
  }

  const stats = computeCandidateStats(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profile: user,
        stats,
      },
      'User profile retrieved successfully'
    )
  );
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile (personal info, links, headline, bio, etc.)
 * @access  Private
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const allowedFields = [
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
    'companyProfile',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  // Skills sync (handles string array or object array)
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

  // Education array bulk sync
  if (req.body.education !== undefined && Array.isArray(req.body.education)) {
    user.education = req.body.education.map((edu) => ({
      ...(edu._id && { _id: edu._id }),
      degree: (edu.degree || '').trim(),
      institute: (edu.institute || '').trim(),
      field: (edu.field || user.department || '').trim(),
      startYear: edu.startYear || (edu.graduationYear ? Number(edu.graduationYear) - 4 : undefined),
      endYear: edu.endYear || (edu.graduationYear ? Number(edu.graduationYear) : undefined),
      graduationYear: edu.graduationYear ? String(edu.graduationYear).trim() : '',
      gradeOrCgpa: edu.gradeOrCgpa || edu.cgpa || '',
      cgpa: edu.cgpa || edu.gradeOrCgpa || '',
      status: edu.status || 'Completed',
    }));
  }

  // Experience / Projects array bulk sync
  if (req.body.experience !== undefined && Array.isArray(req.body.experience)) {
    user.experience = req.body.experience.map((exp) => ({
      ...(exp._id && { _id: exp._id }),
      type: exp.type || 'experience',
      title: (exp.title || '').trim(),
      company: (exp.company || '').trim(),
      duration: (exp.duration || '').trim(),
      location: (exp.location || '').trim(),
      startDate: exp.startDate || undefined,
      endDate: exp.endDate || undefined,
      current: exp.current || false,
      description: (exp.description || exp.duration || '').trim(),
      link: (exp.link || '').trim(),
    }));
  }

  if (req.body.resumeFileName || req.body.resumeUrl) {
    user.resumeUploadedAt = new Date();
  }

  user.profileCompleted = true;
  await user.save();

  const updatedUser = await User.findById(user._id).select('-password -refreshToken');
  const stats = computeCandidateStats(updatedUser);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profile: updatedUser,
        stats,
      },
      'User profile updated successfully'
    )
  );
});

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password with old password verification
 * @access  Private
 */
export const changeUserPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters long');
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordMatch = await user.matchPassword(currentPassword);
  if (!isPasswordMatch) {
    throw new ApiError(401, 'Current password does not match');
  }

  user.password = newPassword;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, {}, 'Password updated successfully')
  );
});

// ==========================================
// 2. EDUCATION SUBDOCUMENTS CRUD
// ==========================================

/**
 * @route   POST /api/users/education
 * @desc    Add a single degree / academic credential to user profile
 * @access  Private
 */
export const addEducation = asyncHandler(async (req, res) => {
  const { degree, institute, field, cgpa, graduationYear, status } = req.body;

  if (!degree || !institute) {
    throw new ApiError(400, 'Degree and Institute are required');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

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

  return res.status(201).json(
    new ApiResponse(201, user.education, 'Education qualification added successfully')
  );
});

/**
 * @route   PUT /api/users/education/:id
 * @desc    Update a specific education entry by subdocument _id
 * @access  Private
 */
export const updateEducation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const eduItem = user.education.id(id);
  if (!eduItem) {
    throw new ApiError(404, 'Education record not found');
  }

  const fields = ['degree', 'institute', 'field', 'cgpa', 'gradeOrCgpa', 'graduationYear', 'startYear', 'endYear', 'status'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      eduItem[f] = req.body[f];
    }
  });

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user.education, 'Education record updated successfully')
  );
});

/**
 * @route   DELETE /api/users/education/:id
 * @desc    Delete education entry by subdocument _id or degree name
 * @access  Private
 */
export const deleteEducation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.education = user.education.filter(
    (item) => item._id?.toString() !== id && item.degree !== id
  );

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user.education, 'Education qualification removed successfully')
  );
});

// ==========================================
// 3. EXPERIENCE & PROJECTS SUBDOCUMENTS CRUD
// ==========================================

/**
 * @route   POST /api/users/experience
 * @desc    Add work experience or capstone project
 * @access  Private
 */
export const addExperience = asyncHandler(async (req, res) => {
  const { type, title, company, duration, description, link, location } = req.body;

  if (!title) {
    throw new ApiError(400, 'Title is required');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.experience.unshift({
    type: type || 'experience',
    title: title.trim(),
    company: company?.trim() || (type === 'project' ? 'Portfolio Project' : 'Company / Organization'),
    duration: duration?.trim() || '2025 – Present',
    description: description?.trim() || 'Hands-on practical deliverables and accomplishments.',
    link: link?.trim() || '',
    location: location?.trim() || '',
  });

  await user.save();

  return res.status(201).json(
    new ApiResponse(201, user.experience, 'Experience / Project record added successfully')
  );
});

/**
 * @route   PUT /api/users/experience/:id
 * @desc    Update experience or project by subdocument _id
 * @access  Private
 */
export const updateExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const expItem = user.experience.id(id);
  if (!expItem) {
    throw new ApiError(404, 'Experience record not found');
  }

  const fields = ['type', 'title', 'company', 'duration', 'location', 'description', 'link', 'current', 'startDate', 'endDate'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      expItem[f] = req.body[f];
    }
  });

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user.experience, 'Experience / Project record updated successfully')
  );
});

/**
 * @route   DELETE /api/users/experience/:id
 * @desc    Delete experience or project by subdocument _id or title
 * @access  Private
 */
export const deleteExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.experience = user.experience.filter(
    (item) => item._id?.toString() !== id && item.title !== id
  );

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user.experience, 'Experience / Project record removed successfully')
  );
});

// ==========================================
// 4. SKILLS MANAGEMENT
// ==========================================

/**
 * @route   PUT /api/users/skills
 * @desc    Sync entire candidate technical skills list
 * @access  Private
 */
export const updateSkills = asyncHandler(async (req, res) => {
  const { skills } = req.body;

  if (!Array.isArray(skills)) {
    throw new ApiError(400, 'Skills must be an array');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.skills = skills.map((s) =>
    typeof s === 'string'
      ? { name: s.trim().toLowerCase(), proficiency: 'Intermediate' }
      : {
          name: (s.name || '').trim().toLowerCase(),
          proficiency: s.proficiency || 'Intermediate',
        }
  );

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user.skills, 'Technical skills updated successfully')
  );
});

/**
 * @route   DELETE /api/users/skills/:skillName
 * @desc    Remove a specific skill by skill name
 * @access  Private
 */
export const deleteSkill = asyncHandler(async (req, res) => {
  const { skillName } = req.params;
  const target = decodeURIComponent(skillName).trim().toLowerCase();

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.skills = user.skills.filter((s) => s.name.toLowerCase() !== target);

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, user.skills, `Skill "${target}" removed successfully`)
  );
});

// ==========================================
// 5. RESUME & ATS METADATA
// ==========================================

/**
 * @route   POST /api/users/resume
 * @desc    Upload / synchronize resume metadata and calculate ATS score
 * @access  Private
 */
export const updateResume = asyncHandler(async (req, res) => {
  const { resumeFileName, resumeFileSize, resumeUrl } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (resumeFileName) user.resumeFileName = resumeFileName;
  if (resumeFileSize) user.resumeFileSize = resumeFileSize;
  if (resumeUrl) user.resumeUrl = resumeUrl;
  user.resumeUploadedAt = new Date();

  await user.save();

  // Simulated ATS match score calibration
  const skillsCount = user.skills?.length || 0;
  const atsScore = Math.min(96, Math.max(78, 80 + Math.floor(skillsCount * 1.5)));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        resumeFileName: user.resumeFileName,
        resumeFileSize: user.resumeFileSize,
        resumeUrl: user.resumeUrl,
        resumeUploadedAt: user.resumeUploadedAt,
        atsScore,
      },
      'Candidate resume synchronized with ATS scoring engine'
    )
  );
});

// ==========================================
// 6. ADMIN USER MANAGEMENT (SUPER ADMIN)
// ==========================================

// ==========================================
// 6. ADMIN USER MANAGEMENT (SUPER ADMIN)
// ==========================================

const getRoleLabel = (role = '') => {
  switch (role.toLowerCase()) {
    case 'student':
      return 'Student (Internships & Scholarships)';
    case 'fresh_graduate':
      return 'Fresh Graduate (Entry-Level)';
    case 'experienced':
      return 'Experienced Professional';
    case 'professional':
      return 'Licensed Professional / Healthcare';
    case 'employer':
      return 'Corporate Employer';
    case 'admin':
      return 'System Administrator';
    case 'super_admin':
      return 'Super Administrator';
    default:
      return 'Candidate';
  }
};

/**
 * @route   GET /api/users/admin/all
 * @desc    Get all users with search, role & status filtering, pagination, and KPI aggregates
 * @access  Private (Admin / Super Admin)
 */
export const getAllUsersAdmin = asyncHandler(async (req, res) => {
  const { search, role, status, department, page = 1, limit = 50 } = req.query;

  const query = {};

  if (role && role !== 'all' && role !== 'ALL') {
    query.role = role.toLowerCase();
  }
  if (status && status !== 'all' && status !== 'ALL') {
    query.status = status.toLowerCase();
  }
  if (department && department !== 'all' && department !== 'ALL') {
    query.department = department;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { headline: searchRegex },
      { location: searchRegex },
      { 'skills.name': searchRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const totalUsers = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password -refreshToken')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Fetch application counts for these users in batch
  const userIds = users.map((u) => u._id);
  const applicationCounts = await Application.aggregate([
    { $match: { applicant: { $in: userIds } } },
    { $group: { _id: '$applicant', count: { $sum: 1 } } },
  ]);

  const appCountMap = new Map();
  applicationCounts.forEach((ac) => {
    appCountMap.set(ac._id.toString(), ac.count);
  });

  // Enrich user models into Candidate Roster items
  const candidates = users.map((user) => {
    const stats = computeCandidateStats(user);
    const appCount = appCountMap.get(user._id.toString()) || 0;

    const primaryEdu = user.education && user.education.length > 0 ? user.education[0] : null;
    const institutionStr = primaryEdu?.institute || 'National Higher Education';
    const cgpaStr = primaryEdu?.gradeOrCgpa || primaryEdu?.cgpa || '3.70 / 4.0';

    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar:
        user.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0284c7&color=fff`,
      role: user.role,
      roleLabel: getRoleLabel(user.role),
      discipline: user.department || 'Computer Science & IT',
      targetRole: user.headline || 'Full-Stack Software Practitioner',
      institution: institutionStr,
      cgpa: cgpaStr,
      skills: (user.skills || []).map((s) => (typeof s === 'string' ? s : s.name)),
      matchScore: stats.matchIndex,
      profileCompletion: stats.profileCompletion,
      applicationsCount: appCount,
      status: user.status || 'active',
      banReason: user.banReason || '',
      joinedDate: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Recent',
      phone: user.phone || '+92 (300) 123-4567',
      city: user.location || 'Islamabad, Pakistan',
      bio: user.bio || '',
      education: user.education || [],
      experience: user.experience || [],
      resumeUrl: user.resumeUrl || '',
      resumeFileName: user.resumeFileName || 'Candidate_Resume.pdf',
      links: user.links || {},
    };
  });

  // Global KPI Summary for Admin Dashboard & Candidates Page
  const totalCandidates = await User.countDocuments({
    role: { $in: ['student', 'fresh_graduate', 'experienced', 'professional'] },
  });
  const activeCount = await User.countDocuments({
    role: { $in: ['student', 'fresh_graduate', 'experienced', 'professional'] },
    status: 'active',
  });
  const bannedCount = await User.countDocuments({
    role: { $in: ['student', 'fresh_graduate', 'experienced', 'professional'] },
    status: 'banned',
  });
  const totalApplications = await Application.countDocuments();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        candidates,
        users: candidates,
        kpis: {
          totalCandidates,
          activeCount,
          bannedCount,
          pendingCount: Math.max(0, totalCandidates - activeCount - bannedCount),
          totalApplications,
          avgMatchScore: 88,
        },
        pagination: {
          total: totalUsers,
          page: pageNum,
          pages: Math.ceil(totalUsers / limitNum),
          limit: limitNum,
        },
      },
      'Admin candidates and user roster retrieved successfully'
    )
  );
});

/**
 * @route   GET /api/users/admin/:id
 * @desc    Get full candidate/user dossier by ID including their application history
 * @access  Private (Admin)
 */
export const getUserByIdAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select('-password -refreshToken');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const stats = computeCandidateStats(user);

  // Fetch applications submitted by this candidate
  const applications = await Application.find({ applicant: id })
    .populate('job', 'title company department location status')
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        stats,
        applications,
      },
      'User dossier retrieved successfully'
    )
  );
});

/**
 * @route   PUT /api/users/admin/:id/status
 * @desc    Update user status (active, pending, banned) or role
 * @access  Private (Admin)
 */
export const updateUserStatusByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, role, banReason } = req.body;

  const updateFields = {};
  if (status !== undefined) updateFields.status = status;
  if (role !== undefined) updateFields.role = role;
  if (banReason !== undefined) updateFields.banReason = banReason;
  if (status === 'active') updateFields.banReason = '';

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true }
  ).select('-password -refreshToken');

  if (!updatedUser) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json(
    new ApiResponse(200, updatedUser, `User status updated to "${updatedUser.status}" successfully`)
  );
});

/**
 * @route   POST /api/users/admin/bulk-status
 * @desc    Bulk update multiple candidates status (active / banned)
 * @access  Private (Admin)
 */
export const bulkUpdateUserStatusByAdmin = asyncHandler(async (req, res) => {
  const { ids, status, banReason = '' } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'Please provide an array of user IDs');
  }

  if (!['active', 'banned', 'pending'].includes(status)) {
    throw new ApiError(400, 'Invalid status value');
  }

  const updateFields = { status };
  if (banReason) updateFields.banReason = banReason;
  if (status === 'active') updateFields.banReason = '';

  const result = await User.updateMany(
    { _id: { $in: ids } },
    { $set: updateFields }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { modifiedCount: result.modifiedCount },
      `${result.modifiedCount} user accounts set to ${status}`
    )
  );
});

/**
 * @route   POST /api/users/admin/:id/ai-evaluate
 * @desc    Trigger Real-time Python Microservice ATS & NLP analysis on candidate
 * @access  Private (Admin)
 */
export const evaluateCandidateAiByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'Candidate not found');
  }

  try {
    const pythonUrl = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';
    const pyRes = await fetch(`${pythonUrl}/api/evaluate-candidate-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        headline: user.headline || '',
        bio: user.bio || '',
        department: user.department || 'Information Technology',
        role: user.role || 'student',
        skills: user.skills || [],
        education: user.education || [],
        experience: user.experience || [],
      }),
    });

    if (pyRes.ok) {
      const pyJson = await pyRes.json();
      const aiData = pyJson?.data || pyJson;
      return res.status(200).json(
        new ApiResponse(200, { candidateId: user._id, aiData }, 'AI Candidate Evaluation completed via Python microservice')
      );
    }
  } catch (err) {
    console.warn('Python AI service note:', err.message);
  }

  const stats = computeCandidateStats(user);
  return res.status(200).json(
    new ApiResponse(200, { candidateId: user._id, stats }, 'Default candidate AI metrics calculated')
  );
});

/**
 * @route   DELETE /api/users/admin/:id
 * @desc    Permanently delete user account and associated applications
 * @access  Private (Admin)
 */
export const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await Promise.all([
    User.findByIdAndDelete(id),
    Application.deleteMany({ applicant: id }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {}, 'User account and applications permanently purged')
  );
});

// =======================================================
// ADMIN EMPLOYER & CORPORATE VERIFICATION CONTROLLERS
// =======================================================

const DEFAULT_ENTERPRISES = [
  {
    name: 'Ali Raza Khan',
    email: 'ali.raza@systemsltd.com',
    password: 'password123',
    role: 'employer',
    phone: '+92 42 111 797 836',
    location: 'Lahore, Punjab',
    headline: 'Head of Talent Acquisition',
    bio: 'Premier global technology consulting firm providing enterprise digital transformation and cloud modernization services.',
    companyProfile: {
      companyName: 'Systems Limited',
      industry: 'Computer Science & IT',
      logo: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120',
      website: 'https://www.systemsltd.com',
      description: 'Premier global technology consulting firm providing enterprise digital transformation and cloud modernization services.',
      companySize: '1000+ Employees',
      tagline: 'Leading Digital Transformation in Pakistan & Global Markets',
      logoInitials: 'SL',
      ntnNumber: 'NTN-0814920-3',
      secpRegNumber: 'SECP-0019284',
      headquarters: 'Lahore, Punjab',
      verificationStatus: 'verified',
      verifiedDate: 'Jan 10, 2026',
      submittedDate: 'Jan 05, 2026',
      rejectionReason: '',
      documents: [
        { name: 'SECP Certificate of Incorporation', verified: true, fileUrl: '' },
        { name: 'FBR NTN Active Taxpayer Profile', verified: true, fileUrl: '' },
        { name: 'Corporate Domain Verification (systemsltd.com)', verified: true, fileUrl: '' },
      ],
    },
  },
  {
    name: 'Dr. Mansoor Ahmed',
    email: 'hr.medical@shifa.com.pk',
    password: 'password123',
    role: 'employer',
    phone: '+92 51 846 3000',
    location: 'Islamabad, ICT',
    headline: 'Director Medical Staffing',
    bio: 'JCI-accredited tertiary care medical healthcare system delivering compassionate patient care, surgical residencies, and clinical research.',
    companyProfile: {
      companyName: 'Shifa International Hospitals Ltd',
      industry: 'Medical & Healthcare',
      logo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=120',
      website: 'https://www.shifa.com.pk',
      description: 'JCI-accredited tertiary care medical healthcare system delivering compassionate patient care, surgical residencies, and clinical research.',
      companySize: '500-1000 Employees',
      tagline: 'Compassion, Quality & Medical Excellence',
      logoInitials: 'SIH',
      ntnNumber: 'NTN-1483921-9',
      secpRegNumber: 'SECP-0048192',
      headquarters: 'Islamabad, ICT',
      verificationStatus: 'verified',
      verifiedDate: 'Feb 02, 2026',
      submittedDate: 'Jan 28, 2026',
      rejectionReason: '',
      documents: [
        { name: 'PMDC / PMC Hospital Accreditation', verified: true, fileUrl: '' },
        { name: 'SECP Registration Certificate', verified: true, fileUrl: '' },
        { name: 'FBR Tax Compliance Certificate', verified: true, fileUrl: '' },
      ],
    },
  },
  {
    name: 'Engr. Khurram Shah',
    email: 'khurram.shah@descon.com',
    password: 'password123',
    role: 'employer',
    phone: '+92 42 3592 1000',
    location: 'Lahore, Punjab',
    headline: 'Corporate HR Manager',
    bio: 'Leading industrial conglomerate with operations in engineering, industrial manufacturing, and mega infrastructure projects.',
    companyProfile: {
      companyName: 'Descon Engineering Limited',
      industry: 'Engineering & Construction',
      logo: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120',
      website: 'https://www.descon.com',
      description: 'Leading industrial conglomerate with operations in engineering, industrial manufacturing, and mega infrastructure projects.',
      companySize: '1000+ Employees',
      tagline: 'Engineering Excellence Across Asia & the Middle East',
      logoInitials: 'DEL',
      ntnNumber: 'NTN-0710384-2',
      secpRegNumber: 'SECP-0038102',
      headquarters: 'Lahore, Punjab',
      verificationStatus: 'pending',
      verifiedDate: '',
      submittedDate: 'Apr 04, 2026',
      rejectionReason: '',
      documents: [
        { name: 'Pakistan Engineering Council (PEC) License', verified: true, fileUrl: '' },
        { name: 'FBR Active Tax Certificate', verified: true, fileUrl: '' },
        { name: 'Corporate Board Resolution Letter', verified: false, fileUrl: '' },
      ],
    },
  },
  {
    name: 'Mariam Siddiqui',
    email: 'careers@hbl.com',
    password: 'password123',
    role: 'employer',
    phone: '+92 21 111 111 425',
    location: 'Karachi, Sindh',
    headline: 'VP Talent Strategy & Recruitment',
    bio: 'Pakistan’s largest commercial banking network fostering technological innovation in retail, Islamic, and investment banking.',
    companyProfile: {
      companyName: 'Habib Bank Limited (HBL)',
      industry: 'Business & Finance',
      logo: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=120',
      website: 'https://www.hbl.com',
      description: 'Pakistan’s largest commercial banking network fostering technological innovation in retail, Islamic, and investment banking.',
      companySize: '1000+ Employees',
      tagline: 'Enabling Dreams across Pakistan and Overseas',
      logoInitials: 'HBL',
      ntnNumber: 'NTN-0659201-5',
      secpRegNumber: 'SECP-0004910',
      headquarters: 'Karachi, Sindh',
      verificationStatus: 'verified',
      verifiedDate: 'Jan 15, 2026',
      submittedDate: 'Jan 02, 2026',
      rejectionReason: '',
      documents: [
        { name: 'State Bank of Pakistan (SBP) Banking License', verified: true, fileUrl: '' },
        { name: 'SECP Listed Corporation Certificate', verified: true, fileUrl: '' },
        { name: 'FBR Tier-1 Tax Compliance Profile', verified: true, fileUrl: '' },
      ],
    },
  },
  {
    name: 'Sarah Tariq',
    email: 'recruiter@techlogix.com',
    password: 'password123',
    role: 'employer',
    phone: '+92 42 3571 5000',
    location: 'Lahore, Punjab',
    headline: 'Senior Technical Recruiter',
    bio: 'Global technology company providing software development, cloud computing architectures, and digital enablement.',
    companyProfile: {
      companyName: 'TechLogix Global Solutions',
      industry: 'Computer Science & IT',
      logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120',
      website: 'https://www.techlogix.com',
      description: 'Global technology company providing software development, cloud computing architectures, and digital enablement.',
      companySize: '200-500 Employees',
      tagline: 'Delivering High-Impact Digital Engineering',
      logoInitials: 'TGS',
      ntnNumber: 'NTN-1192840-7',
      secpRegNumber: 'SECP-0027194',
      headquarters: 'Lahore, Punjab',
      verificationStatus: 'verified',
      verifiedDate: 'Feb 14, 2026',
      submittedDate: 'Feb 01, 2026',
      rejectionReason: '',
      documents: [
        { name: 'PSEB Registered IT Exporter Certificate', verified: true, fileUrl: '' },
        { name: 'FBR NTN Verified Profile', verified: true, fileUrl: '' },
        { name: 'Corporate Banking Reference Letter', verified: true, fileUrl: '' },
      ],
    },
  },
];

/**
 * @route   GET /api/users/admin/employers
 * @desc    Get all corporate employers, KYC status, and vacancies count
 * @access  Private (Admin / Super Admin)
 */
export const getAllEmployersAdmin = asyncHandler(async (req, res) => {
  let employers = await User.find({ role: 'employer' }).select('-password -refreshToken').lean();

  // If no employers exist yet, bootstrap standard Pakistani enterprises
  if (!employers || employers.length === 0) {
    try {
      for (const ent of DEFAULT_ENTERPRISES) {
        await User.create(ent);
      }
      employers = await User.find({ role: 'employer' }).select('-password -refreshToken').lean();
    } catch (seedErr) {
      console.warn('Employer bootstrap note:', seedErr.message);
    }
  }

  const employerIds = employers.map((e) => e._id);

  // Aggregate active jobs count for all employers in one query
  const jobCounts = await Job.aggregate([
    { $match: { employer: { $in: employerIds } } },
    {
      $group: {
        _id: '$employer',
        totalJobs: { $sum: 1 },
        activeJobs: {
          $sum: {
            $cond: [{ $in: ['$status', ['Open', 'Active', 'open', 'active']] }, 1, 0],
          },
        },
      },
    },
  ]);

  const jobCountMap = {};
  jobCounts.forEach((j) => {
    jobCountMap[j._id.toString()] = j.activeJobs || j.totalJobs || 0;
  });

  const formattedEmployers = employers.map((emp) => {
    const cp = emp.companyProfile || {};
    const defaultDocList = [
      { name: 'SECP Certificate of Incorporation', verified: cp.verificationStatus === 'verified' },
      { name: 'FBR NTN Active Taxpayer Profile', verified: cp.verificationStatus === 'verified' },
      { name: 'Corporate Domain Verification', verified: cp.verificationStatus === 'verified' },
    ];

    const activeJobs = jobCountMap[emp._id.toString()] !== undefined
      ? jobCountMap[emp._id.toString()]
      : (cp.activeJobsCount || (cp.verificationStatus === 'verified' ? 8 : 0));

    return {
      id: emp._id.toString(),
      _id: emp._id.toString(),
      name: cp.companyName || emp.name,
      industry: cp.industry || emp.department || 'Computer Science & IT',
      logo:
        cp.logo ||
        emp.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(cp.companyName || emp.name)}&background=0284c7&color=fff`,
      recruiterName: emp.name,
      recruiterRole: emp.headline || 'Head of Talent Acquisition',
      recruiterEmail: emp.email,
      recruiterPhone: emp.phone || '+92 42 111 797 836',
      ntnNumber: cp.ntnNumber || 'NTN-0814920-3',
      secpRegNumber: cp.secpRegNumber || 'SECP-0019284',
      website: cp.website || 'https://www.systemsltd.com',
      headquarters: cp.headquarters || emp.location || 'Lahore, Punjab',
      activeJobsCount: activeJobs,
      verificationStatus: cp.verificationStatus || (emp.status === 'banned' ? 'suspended' : 'verified'),
      verifiedDate: cp.verifiedDate || (cp.verificationStatus === 'verified' ? 'Jan 10, 2026' : undefined),
      submittedDate: cp.submittedDate || (emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'Recent'),
      rejectionReason: cp.rejectionReason || '',
      documents: Array.isArray(cp.documents) && cp.documents.length > 0 ? cp.documents : defaultDocList,
      description: cp.description || emp.bio || 'Premier corporate organization operating in Pakistan.',
    };
  });

  // Calculate live global KPI metrics
  const totalCount = formattedEmployers.length;
  const verifiedCount = formattedEmployers.filter((e) => e.verificationStatus === 'verified').length;
  const pendingCount = formattedEmployers.filter((e) => e.verificationStatus === 'pending').length;
  const suspendedCount = formattedEmployers.filter((e) => e.verificationStatus === 'suspended').length;
  const totalActiveJobs = formattedEmployers.reduce((acc, curr) => acc + (curr.activeJobsCount || 0), 0);

  const kpis = {
    totalEmployers: totalCount,
    verifiedCount,
    pendingCount,
    suspendedCount,
    totalActiveJobs,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        employers: formattedEmployers,
        kpis,
      },
      'Admin employers and corporate verification records retrieved successfully'
    )
  );
});

/**
 * @route   GET /api/users/admin/employers/:id
 * @desc    Get detailed employer dossier including posted jobs
 * @access  Private (Admin / Super Admin)
 */
export const getEmployerByIdAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employer = await User.findOne({ _id: id, role: 'employer' })
    .select('-password -refreshToken')
    .lean();

  if (!employer) {
    throw new ApiError(404, 'Employer account not found');
  }

  // Fetch all jobs posted by this employer
  const jobs = await Job.find({ employer: id }).sort({ createdAt: -1 }).lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        employer,
        jobs,
        activeJobsCount: jobs.filter((j) => ['Open', 'Active', 'open', 'active'].includes(j.status)).length,
      },
      'Employer dossier retrieved successfully'
    )
  );
});

/**
 * @route   PUT /api/users/admin/employers/:id/verification
 * @desc    Approve (verify), pend, or suspend an employer corporate account
 * @access  Private (Admin / Super Admin)
 */
export const updateEmployerVerificationAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { verificationStatus, rejectionReason = '' } = req.body;

  if (!['verified', 'pending', 'suspended'].includes(verificationStatus)) {
    throw new ApiError(400, 'Invalid verification status');
  }

  const user = await User.findOne({ _id: id, role: 'employer' });
  if (!user) {
    throw new ApiError(404, 'Employer account not found');
  }

  const cp = user.companyProfile || {};
  cp.verificationStatus = verificationStatus;
  cp.rejectionReason = verificationStatus === 'suspended' ? rejectionReason : '';
  if (verificationStatus === 'verified') {
    cp.verifiedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  user.companyProfile = cp;
  user.status = verificationStatus === 'suspended' ? 'banned' : 'active';
  if (verificationStatus === 'suspended') {
    user.banReason = rejectionReason || 'Corporate verification suspended';
  } else {
    user.banReason = '';
  }

  await user.save({ validateBeforeSave: false });

  const updatedEmployer = await User.findById(id).select('-password -refreshToken');

  return res.status(200).json(
    new ApiResponse(
      200,
      updatedEmployer,
      `Employer verification status updated to "${verificationStatus}" successfully`
    )
  );
});

/**
 * @route   POST /api/users/admin/employers/bulk-verification
 * @desc    Bulk verify or suspend multiple corporate employers
 * @access  Private (Admin / Super Admin)
 */
export const bulkUpdateEmployerVerificationAdmin = asyncHandler(async (req, res) => {
  const { ids, verificationStatus, rejectionReason = '' } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'Please provide an array of employer IDs');
  }

  if (!['verified', 'pending', 'suspended'].includes(verificationStatus)) {
    throw new ApiError(400, 'Invalid verification status');
  }

  const updateDoc = {
    'companyProfile.verificationStatus': verificationStatus,
    status: verificationStatus === 'suspended' ? 'banned' : 'active',
  };

  if (verificationStatus === 'verified') {
    updateDoc['companyProfile.verifiedDate'] = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    updateDoc['companyProfile.rejectionReason'] = '';
    updateDoc.banReason = '';
  } else if (verificationStatus === 'suspended') {
    updateDoc['companyProfile.rejectionReason'] = rejectionReason || 'Batch compliance suspension';
    updateDoc.banReason = rejectionReason || 'Batch compliance suspension';
  }

  const result = await User.updateMany(
    { _id: { $in: ids }, role: 'employer' },
    { $set: updateDoc }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { modifiedCount: result.modifiedCount },
      `Successfully updated ${result.modifiedCount} employers to status "${verificationStatus}"`
    )
  );
});

/**
 * @route   DELETE /api/users/admin/employers/:id
 * @desc    Permanently delete employer corporate account and posted jobs
 * @access  Private (Admin / Super Admin)
 */
export const deleteEmployerAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employer = await User.findOne({ _id: id, role: 'employer' });
  if (!employer) {
    throw new ApiError(404, 'Employer account not found');
  }

  await Promise.all([
    User.findByIdAndDelete(id),
    Job.deleteMany({ employer: id }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {}, 'Employer corporate account and all posted vacancies permanently deleted')
  );
});

