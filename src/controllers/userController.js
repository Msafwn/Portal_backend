import User from '../models/User.js';
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

/**
 * @route   GET /api/users/admin/all
 * @desc    Get all users with search, role & status filtering, pagination
 * @access  Private (Admin / Super Admin)
 */
export const getAllUsersAdmin = asyncHandler(async (req, res) => {
  const { search, role, status, department, page = 1, limit = 20 } = req.query;

  const query = {};

  if (role && role !== 'all') query.role = role.toLowerCase();
  if (status && status !== 'all') query.status = status.toLowerCase();
  if (department && department !== 'all') query.department = department;

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { headline: searchRegex },
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

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          total: totalUsers,
          page: pageNum,
          pages: Math.ceil(totalUsers / limitNum),
          limit: limitNum,
        },
      },
      'Users fetched successfully for admin'
    )
  );
});

/**
 * @route   GET /api/users/admin/:id
 * @desc    Get full candidate/user dossier by ID
 * @access  Private (Admin)
 */
export const getUserByIdAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select('-password -refreshToken');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const stats = computeCandidateStats(user);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        stats,
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

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (status !== undefined) user.status = status;
  if (role !== undefined) user.role = role;
  if (banReason !== undefined) user.banReason = banReason;

  await user.save();

  const updatedUser = await User.findById(user._id).select('-password -refreshToken');

  return res.status(200).json(
    new ApiResponse(200, updatedUser, `User status updated to "${user.status}" successfully`)
  );
});

/**
 * @route   DELETE /api/users/admin/:id
 * @desc    Permanently delete user account
 * @access  Private (Admin)
 */
export const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await User.findByIdAndDelete(id);

  return res.status(200).json(
    new ApiResponse(200, {}, 'User account permanently deleted')
  );
});
