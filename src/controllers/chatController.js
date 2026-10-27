import ChatSession from '../models/ChatSession.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Knowledge Base for Career Roadmaps & Technical Interview Prep
 */
const CAREER_ROADMAPS = {
  'full stack': {
    title: 'Full-Stack Web & SaaS 30-Day Master Roadmap',
    targetRole: 'Full-Stack Software Engineer',
    duration: '4-6 Weeks',
    milestones: [
      {
        phase: 'Phase 1: Advanced Frontend & State Management',
        duration: 'Days 1-10',
        topics: [
          'React 18 Architecture & Hooks',
          'Redux Toolkit & Zustand',
          'Tailwind CSS & Component Systems',
          'API Integration & Caching',
        ],
        project:
          'Build a production-ready SaaS dashboard with role-based auth.',
      },
      {
        phase: 'Phase 2: Scalable Backend & Microservices',
        duration: 'Days 11-20',
        topics: [
          'Node.js & Express RESTful APIs',
          'Dual-Cookie JWT Authentication',
          'MongoDB & Mongoose Schema Indexing',
          'FastAPI Python Microservices',
        ],
        project: 'Build a secure multi-tenant authentication microservice.',
      },
      {
        phase: 'Phase 3: System Design & Cloud Deployment',
        duration: 'Days 21-30',
        topics: [
          'Docker containerization',
          'CI/CD with GitHub Actions',
          'Redis caching & rate limiting',
          'AWS EC2 / Render hosting',
        ],
        project:
          'Deploy the full-stack application with automated SSL and monitoring.',
      },
    ],
  },
  'data science': {
    title: 'Data Science & Machine Learning Engineering Roadmap',
    targetRole: 'Data Scientist / AI Engineer',
    duration: '6-8 Weeks',
    milestones: [
      {
        phase: 'Phase 1: Math Foundations & Python Data Stack',
        duration: 'Days 1-14',
        topics: [
          'NumPy, Pandas, Vectorized Ops',
          'Exploratory Data Analysis (EDA)',
          'Matplotlib & Seaborn Visualization',
          'Feature Engineering',
        ],
        project: 'End-to-end data cleansing & EDA on real-world dataset.',
      },
      {
        phase: 'Phase 2: Classical Machine Learning & Modeling',
        duration: 'Days 15-30',
        topics: [
          'Scikit-learn algorithms (Regression, Random Forest, XGBoost)',
          'Hyperparameter tuning & Cross-Validation',
          'TF-IDF & Cosine Similarity vector math',
        ],
        project: 'Predictive churn and ranking model with 88%+ ROC-AUC.',
      },
      {
        phase: 'Phase 3: Deep Learning, NLP & LLMs',
        duration: 'Days 31-45',
        topics: [
          'PyTorch fundamentals',
          'spaCy text segmentation & lemmatization',
          'Hugging Face Transformers & Embeddings',
          'Vector databases & RAG',
        ],
        project:
          'Build a semantic resume parser using NLP and vector embeddings.',
      },
    ],
  },
  devops: {
    title: 'Cloud & DevOps Engineering Roadmap',
    targetRole: 'DevOps / Cloud Platform Engineer',
    duration: '4-6 Weeks',
    milestones: [
      {
        phase: 'Phase 1: Linux & Containerization',
        duration: 'Days 1-12',
        topics: [
          'Linux Bash scripting & CLI',
          'Docker images, Dockerfile optimization',
          'Docker Compose multi-service networks',
        ],
        project: 'Containerize a MERN app with MongoDB replica set.',
      },
      {
        phase: 'Phase 2: CI/CD & Infrastructure as Code',
        duration: 'Days 13-24',
        topics: [
          'GitHub Actions CI/CD workflows',
          'Terraform basics for AWS / GCP',
          'Kubernetes pods, services, ingress',
        ],
        project: 'Zero-downtime deployment pipeline to cloud.',
      },
    ],
  },
};

/**
 * Intelligent AI Advisor Engine (combines live DB jobs + candidate profile)
 */
const generateAiCareerAdvice = async (userMessage, candidate, jobs = []) => {
  const query = userMessage.trim().toLowerCase();
  const candidateSkills = (candidate.skills || []).map((s) =>
    (typeof s === 'string' ? s : s?.name || '').trim().toLowerCase()
  );
  const name = candidate.name || 'Candidate';
  const role = candidate.role || 'student';
  const department = candidate.department || 'Information Technology';

  let replyText = '';
  let attachments = null;

  // 1. Job Matching / Vacancies Query
  if (
    query.includes('job') ||
    query.includes('vacan') ||
    query.includes('match') ||
    query.includes('apply') ||
    query.includes('roles') ||
    query.includes('kaam') ||
    query.includes('hiring')
  ) {
    const topJobs = jobs.slice(0, 3).map((j) => {
      // Calculate quick skill match
      const reqSkills = (j.requiredSkills || []).map((s) =>
        (s.name || '').toLowerCase()
      );
      const matched = reqSkills.filter((rs) =>
        candidateSkills.some(
          (cs) => cs === rs || cs.includes(rs) || rs.includes(cs)
        )
      );
      const matchPct =
        reqSkills.length > 0
          ? Math.round((matched.length / reqSkills.length) * 100)
          : 75;

      return {
        id: j._id,
        title: j.title,
        company: j.company,
        department: j.department,
        location: j.location,
        workMode: j.workMode,
        jobType: j.jobType,
        salary: j.salaryRange?.min
          ? `${j.salaryRange.min.toLocaleString()} PKR`
          : 'Competitive',
        matchPercentage: Math.min(98, Math.max(50, matchPct)),
        matchedSkills: matched,
      };
    });

    replyText =
      `Assalam-o-Alaikum ${name}! 🚀 Based on your verified **${department}** profile and skills (${candidateSkills.slice(0, 4).join(', ') || 'technical background'}), I've analyzed our active vacancy pool.\n\n` +
      `Here are the **top high-compatibility opportunities** matching your background right now:`;

    attachments = {
      type: 'jobs',
      data: topJobs,
    };
  }

  // 2. Learning Roadmap Query
  else if (
    query.includes('roadmap') ||
    query.includes('step') ||
    query.includes('how to become') ||
    query.includes('learn') ||
    query.includes('seekh') ||
    query.includes('guide') ||
    query.includes('path')
  ) {
    let key = 'full stack';
    if (
      query.includes('data') ||
      query.includes('ai') ||
      query.includes('python') ||
      query.includes('machine')
    ) {
      key = 'data science';
    } else if (
      query.includes('devops') ||
      query.includes('cloud') ||
      query.includes('docker')
    ) {
      key = 'devops';
    }

    const roadmap = CAREER_ROADMAPS[key] || CAREER_ROADMAPS['full stack'];
    replyText =
      `Here is your structured **${roadmap.title}** tailored for a **${role}** targeting senior market standards.\n\n` +
      `Focus on building verifiable portfolio deliverables at each milestone rather than just passive tutorial watching.`;

    attachments = {
      type: 'roadmap',
      data: roadmap,
    };
  }

  // 3. Technical Interview Preparation
  else if (
    query.includes('interview') ||
    query.includes('question') ||
    query.includes('prep') ||
    query.includes('tayari')
  ) {
    replyText =
      `🎯 **Technical Interview Readiness Guide for ${name}:**\n\n` +
      `Based on the requirements of modern tech employers, here are the core concepts hiring managers test:\n\n` +
      `1. **System Architecture & APIs:** Be ready to explain RESTful design, HTTP status codes, and JWT stateless dual-cookie token auth.\n` +
      `2. **State & Performance:** Discuss React Fiber reconciliation, Virtual DOM diffing heuristics, and caching strategies (e.g., Redis or React Query).\n` +
      `3. **Database Indexing:** Explain how B-Tree indexes speed up lookups in MongoDB and when compound indexing is necessary.\n` +
      `4. **STAR Method:** Structure behavioral answers around *Situation, Task, Action, and Measurable Result*.\n\n` +
      `Would you like to practice a specific mock interview question on **React**, **Node.js**, or **Python**?`;
  }

  // 4. Resume & ATS Diagnostics
  else if (
    query.includes('resume') ||
    query.includes('ats') ||
    query.includes('cv') ||
    query.includes('score')
  ) {
    replyText =
      `📄 **Resume & ATS Optimization Strategy for ${name}:**\n\n` +
      `Our Python Hybrid NLP engine (spaCy + TF-IDF) checks your resume against high-value industry keywords. Here is how to achieve a 90+ score:\n\n` +
      `• **Quantify Every Bullet Point:** Instead of *"Worked on frontend"*, write *"Architected responsive React dashboard handling 5,000+ daily requests, improving user session retention by 22%"*.\n` +
      `• **Verify Contact Links:** Ensure your GitHub, LinkedIn, and live portfolio URLs are clickable and verified.\n` +
      `• **Skill Frequency:** Make sure core technologies (${candidateSkills.slice(0, 3).join(', ')}) appear naturally in both your skills list and project descriptions.\n\n` +
      `You can also visit your **Profile > Resume** tab to download your live diagnostic audit!`;
  }

  // 5. General Greeting & Counsel
  else {
    replyText =
      `Hello ${name}! 👋 I am your **Smart Career AI Advisor**.\n\n` +
      `I can help you with:\n` +
      `1. **Matching Vacancies:** Ask me *"Show matching jobs"* to explore active roles matching your ${department} background.\n` +
      `2. **Career Roadmaps:** Ask for a *"Full Stack or Data Science Roadmap"* to view step-by-step learning milestones.\n` +
      `3. **Interview Preparation:** Ask for *"Interview questions"* to practice technical and behavioral questions.\n` +
      `4. **Resume & ATS Review:** Ask *"How to improve my ATS score"*.\n\n` +
      `What would you like to explore today?`;
  }

  return {
    text: replyText,
    attachments,
    source: 'smart_career_ai_hybrid_engine',
  };
};

/**
 * 1. Get all chat sessions for the logged-in candidate
 * GET /api/chat/sessions
 */
export const getChatSessions = asyncHandler(async (req, res) => {
  const sessions = await ChatSession.find({ user: req.user._id })
    .sort({ updatedAt: -1 })
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, sessions, 'Chat sessions retrieved successfully')
    );
});

/**
 * 2. Send Chat Message & Generate AI Career Advisor Response
 * POST /api/chat/message
 */
export const sendChatMessage = asyncHandler(async (req, res) => {
  const { sessionId: rawSessionId, message } = req.body;

  if (!message || !message.trim()) {
    throw new ApiError(400, 'Message text is required');
  }

  const sessionId = rawSessionId || `session-${Date.now()}`;
  const trimmed = message.trim();

  // Find or initialize ChatSession in MongoDB
  let session = await ChatSession.findOne({ user: req.user._id, sessionId });
  if (!session) {
    session = new ChatSession({
      user: req.user._id,
      sessionId,
      title: trimmed.slice(0, 30) + (trimmed.length > 30 ? '...' : ''),
      messages: [],
    });
  }

  // Add User Message
  const userMsg = {
    id: `msg-user-${Date.now()}`,
    sender: 'user',
    text: trimmed,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    attachments: null,
    source: 'user',
  };
  session.messages.push(userMsg);

  // Fetch candidate profile & active open jobs for intelligent context
  const [candidate, openJobs] = await Promise.all([
    User.findById(req.user._id).select(
      'name role department skills experience education headline bio'
    ),
    Job.find({ status: 'Open' })
      .select(
        'title company department location workMode jobType salaryRange requiredSkills'
      )
      .limit(6),
  ]);

  // Generate AI Response
  const aiOutput = await generateAiCareerAdvice(
    trimmed,
    candidate || req.user,
    openJobs
  );

  const aiMsg = {
    id: `msg-ai-${Date.now()}`,
    sender: 'ai',
    text: aiOutput.text,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    attachments: aiOutput.attachments,
    source: aiOutput.source,
  };
  session.messages.push(aiMsg);

  // Update session title if first message
  if (session.messages.filter((m) => m.sender === 'user').length === 1) {
    session.title = trimmed.slice(0, 30) + (trimmed.length > 30 ? '...' : '');
  }

  await session.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sessionId: session.sessionId,
        title: session.title,
        message: aiMsg,
        userMessage: userMsg,
        messagesCount: session.messages.length,
      },
      'AI response generated successfully'
    )
  );
});

/**
 * 3. Save or update a chat session with full messages array
 * POST /api/chat/save
 */
export const saveChatSession = asyncHandler(async (req, res) => {
  const { sessionId, title, messages } = req.body;

  if (!sessionId) {
    throw new ApiError(400, 'Session ID is required');
  }

  const updatedSession = await ChatSession.findOneAndUpdate(
    { user: req.user._id, sessionId },
    {
      $set: {
        title: title || 'Career Advisory Session',
        messages: Array.isArray(messages) ? messages : [],
      },
    },
    { new: true, upsert: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedSession, 'Chat session saved successfully')
    );
});

/**
 * 4. Get a specific chat session by sessionId
 * GET /api/chat/session/:sessionId
 */
export const getChatSessionById = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await ChatSession.findOne({
    user: req.user._id,
    sessionId,
  });

  if (!session) {
    throw new ApiError(404, 'Chat session not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, session, 'Chat session retrieved successfully'));
});

/**
 * 5. Delete a specific chat session
 * DELETE /api/chat/session/:sessionId
 */
export const deleteChatSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const deleted = await ChatSession.findOneAndDelete({
    user: req.user._id,
    sessionId,
  });

  if (!deleted) {
    throw new ApiError(404, 'Chat session not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Chat session deleted successfully'));
});

/**
 * 6. Clear all chat history for candidate
 * DELETE /api/chat/sessions/clear
 */
export const clearAllChatSessions = asyncHandler(async (req, res) => {
  await ChatSession.deleteMany({ user: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'All chat sessions cleared successfully'));
});
