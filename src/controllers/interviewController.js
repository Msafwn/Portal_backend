import InterviewSession from '../models/InterviewSession.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Save or update an interview session
 * @route   POST /api/interviews/save
 * @access  Private
 */
export const saveInterviewSession = asyncHandler(async (req, res) => {
  const { sessionId, role, questions, answers, status } = req.body;

  if (!role || !role.title) {
    throw new ApiError(400, 'Role title is required to save interview session');
  }

  let session;
  if (sessionId) {
    session = await InterviewSession.findOne({
      _id: sessionId,
      user: req.user._id,
    });
  }

  if (session) {
    // Update existing session
    if (role) session.role = role;
    if (questions && Array.isArray(questions)) session.questions = questions;
    if (answers) session.answers = answers;
    if (status) session.status = status;
    await session.save();
  } else {
    // Create new session
    session = await InterviewSession.create({
      user: req.user._id,
      role,
      questions: questions || [],
      answers: answers || {},
      status: status || 'in_progress',
      totalQuestions: questions ? questions.length : 10,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, session, 'Interview session saved successfully'));
});

/**
 * @desc    Get all interview sessions for the logged-in candidate
 * @route   GET /api/interviews/my-history
 * @access  Private
 */
export const getMyInterviews = asyncHandler(async (req, res) => {
  const interviews = await InterviewSession.find({ user: req.user._id })
    .sort({ updatedAt: -1 })
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, interviews, 'Interview history retrieved successfully')
    );
});

/**
 * @desc    Get single interview session detail
 * @route   GET /api/interviews/:id
 * @access  Private
 */
export const getInterviewById = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!session) {
    throw new ApiError(404, 'Interview session not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, session, 'Interview session found'));
});

/**
 * @desc    Delete an interview session
 * @route   DELETE /api/interviews/:id
 * @access  Private
 */
export const deleteInterview = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!session) {
    throw new ApiError(404, 'Interview session not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Interview session deleted successfully'));
});
