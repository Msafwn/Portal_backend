import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Skill from '../models/Skill.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import SecurityAlert from '../models/SecurityAlert.js';
import LoginHistory from '../models/LoginHistory.js';

const seedData = async () => {
  try {
    await connectDB();

    console.log('🧹 [Viva Seeder] Clearing existing database collections...');
    await User.deleteMany();
    await Job.deleteMany();
    await Application.deleteMany();
    await Skill.deleteMany();
    await Notification.deleteMany();
    await AuditLog.deleteMany();
    await SecurityAlert.deleteMany();
    await LoginHistory.deleteMany();

    // =========================================================================
    // 1. SEED MULTI-DISCIPLINARY SKILLS TAXONOMY
    // =========================================================================
    console.log('🌱 [1/6] Seeding Multi-Disciplinary Skills Taxonomy...');
    const skillsList = [
      // Technology & AI
      { name: 'python', category: 'Data Science & AI', aliases: ['py'] },
      { name: 'pytorch', category: 'Data Science & AI', aliases: ['torch'] },
      { name: 'fastapi', category: 'Backend', aliases: ['fast-api'] },
      {
        name: 'transformers',
        category: 'Data Science & AI',
        aliases: ['huggingface', 'nlp'],
      },
      { name: 'react', category: 'Frontend', aliases: ['reactjs', 'react.js'] },
      { name: 'node.js', category: 'Backend', aliases: ['node', 'nodejs'] },
      {
        name: 'express.js',
        category: 'Backend',
        aliases: ['express', 'expressjs'],
      },
      { name: 'mongodb', category: 'Database', aliases: ['mongo'] },
      { name: 'javascript', category: 'Frontend', aliases: ['js', 'es6'] },
      { name: 'typescript', category: 'Frontend', aliases: ['ts'] },
      {
        name: 'docker',
        category: 'DevOps & Cloud',
        aliases: ['containerization'],
      },
      { name: 'kubernetes', category: 'DevOps & Cloud', aliases: ['k8s'] },
      { name: 'tailwind css', category: 'Frontend', aliases: ['tailwind'] },
      {
        name: 'git',
        category: 'DevOps & Cloud',
        aliases: ['github', 'version control'],
      },
      {
        name: 'rest api',
        category: 'Backend',
        aliases: ['apis', 'restful api'],
      },
      // Healthcare & Medicine
      {
        name: 'patient triage',
        category: 'Healthcare',
        aliases: ['triage', 'emergency triage'],
      },
      {
        name: 'emergency medicine',
        category: 'Healthcare',
        aliases: ['er care', 'acute care'],
      },
      {
        name: 'clinical pharmacology',
        category: 'Healthcare',
        aliases: ['pharmacology', 'drug interaction'],
      },
      {
        name: 'icu protocols',
        category: 'Healthcare',
        aliases: ['intensive care', 'critical care'],
      },
      {
        name: 'cardiology',
        category: 'Healthcare',
        aliases: ['cardiac care', 'ecg interpretation'],
      },
      // Engineering & Construction
      {
        name: 'autocad',
        category: 'Engineering',
        aliases: ['cad', 'computer-aided design'],
      },
      {
        name: 'etabs',
        category: 'Engineering',
        aliases: ['structural analysis'],
      },
      {
        name: 'sap2000',
        category: 'Engineering',
        aliases: ['finite element analysis'],
      },
      {
        name: 'seismic design',
        category: 'Engineering',
        aliases: ['earthquake engineering'],
      },
      {
        name: 'project estimation',
        category: 'Engineering',
        aliases: ['cost estimation', 'boq'],
      },
      // Business, Finance & Accounting
      {
        name: 'financial modeling',
        category: 'Finance',
        aliases: ['dcf modeling', 'lbo'],
      },
      {
        name: 'ms excel (advanced)',
        category: 'Finance',
        aliases: ['excel', 'vlookup', 'pivots'],
      },
      {
        name: 'ifrs reporting',
        category: 'Finance',
        aliases: ['ifrs', 'gaap reporting'],
      },
      {
        name: 'financial analysis',
        category: 'Finance',
        aliases: ['ratio analysis', 'variance analysis'],
      },
    ];
    await Skill.insertMany(skillsList);

    // =========================================================================
    // 2. SEED USERS (Admin, Employers, Candidates across 4 Disciplines)
    // =========================================================================
    console.log(
      '🌱 [2/6] Seeding Demo Users (Admin, 4 Employers, 5 Diverse Candidates)...'
    );

    // 2.1 Super Admin
    const adminUser = await User.create({
      name: 'System Super Admin',
      email: 'safwanarshad782@gmail.com',
      password: 'password123',
      role: 'admin',
      phone: '+92 300 0000001',
      location: 'Islamabad, Pakistan',
      headline: 'Chief Systems Architect & Security Officer',
      bio: 'Full platform administrative control, audit logs supervision, AI ATS weights tuning, and security alerts.',
      profileCompleted: true,
      status: 'active',
    });

    // 2.2 Employers
    const techEmployer = await User.create({
      name: 'TechLogix HR Recruiter',
      email: 'recruiter@techlogix.com',
      password: 'password123',
      role: 'employer',
      phone: '+92 300 1234567',
      location: 'Lahore, Pakistan',
      companyProfile: {
        companyName: 'TechLogix Global Solutions',
        industry: 'Information Technology',
        website: 'https://techlogix.com',
        description:
          'Pioneering AI-driven digital transformation, cloud native engineering, and enterprise software.',
        companySize: '250-500 Employees',
        tagline: 'Empowering Enterprise Intelligence',
        totalSeatsQuota: 20,
        filledSeatsCount: 8,
      },
      profileCompleted: true,
      status: 'active',
    });

    const medicalEmployer = await User.create({
      name: 'Dr. Tariq Mahmood (HR Medical Director)',
      email: 'careers@shifa.com.pk',
      password: 'password123',
      role: 'employer',
      phone: '+92 51 8463000',
      location: 'Islamabad, Pakistan',
      companyProfile: {
        companyName: 'Shifa International Hospital',
        industry: 'Healthcare & Medical Sciences',
        website: 'https://shifa.com.pk',
        description:
          'JCI-accredited tertiary care medical center dedicated to clinical excellence and compassionate healthcare.',
        companySize: '1,000+ Healthcare Professionals',
        tagline: 'Excellence in Healthcare Delivery',
        totalSeatsQuota: 15,
        filledSeatsCount: 5,
      },
      profileCompleted: true,
      status: 'active',
    });

    const engineeringEmployer = await User.create({
      name: 'Descon Talent Acquisition',
      email: 'hr@descon.com',
      password: 'password123',
      role: 'employer',
      phone: '+92 42 35923721',
      location: 'Lahore, Pakistan',
      companyProfile: {
        companyName: 'Descon Engineering',
        industry: 'Engineering & Construction',
        website: 'https://descon.com',
        description:
          'Multi-national engineering conglomerate specializing in infrastructure, oil & gas, and energy EPC projects.',
        companySize: '5,000+ Employees',
        tagline: 'Engineering the Future',
        totalSeatsQuota: 12,
        filledSeatsCount: 3,
      },
      profileCompleted: true,
      status: 'active',
    });

    const financeEmployer = await User.create({
      name: 'HBL Strategic Talent Team',
      email: 'talent@hbl.com',
      password: 'password123',
      role: 'employer',
      phone: '+92 21 111111425',
      location: 'Karachi, Pakistan',
      companyProfile: {
        companyName: 'Habib Bank Limited (HBL)',
        industry: 'Banking & Financial Services',
        website: 'https://hbl.com',
        description:
          "Pakistan's largest commercial bank pioneering fintech solutions, investment banking, and retail financial services.",
        companySize: '10,000+ Employees',
        tagline: 'Where Dreams Meet Capital',
        totalSeatsQuota: 25,
        filledSeatsCount: 10,
      },
      profileCompleted: true,
      status: 'active',
    });

    // 2.3 Candidates across Target Segments
    // Candidate 1: Student (Computer Science / AI)
    const candidateHamza = await User.create({
      name: 'Syed Hamza Ali',
      email: 'hamza.ali@fast.nu.edu.pk',
      password: 'password123',
      role: 'student',
      phone: '+92 300 5544332',
      location: 'Islamabad, Pakistan',
      headline: 'BS Computer Science (AI Major) | PyTorch & NLP Enthusiast',
      bio: 'Final year CS student focusing on Large Language Models, Transformer architectures, and high-performance Python FastAPI microservices.',
      skills: [
        { name: 'python', proficiency: 'Expert' },
        { name: 'pytorch', proficiency: 'Expert' },
        { name: 'transformers', proficiency: 'Expert' },
        { name: 'fastapi', proficiency: 'Expert' },
        { name: 'git', proficiency: 'Intermediate' },
        { name: 'docker', proficiency: 'Intermediate' },
      ],
      education: [
        {
          degree: 'BS Computer Science (Artificial Intelligence)',
          institute: 'FAST-NUCES Islamabad',
          startYear: 2022,
          endYear: 2026,
          gradeOrCgpa: '3.82 CGPA',
        },
      ],
      experience: [
        {
          title: 'AI Research Intern',
          company: 'National Center of AI (NCAI)',
          location: 'Islamabad',
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-09-01'),
          current: false,
          description:
            'Implemented semantic search pipelines and vector embeddings in Python.',
        },
      ],
      profileCompleted: true,
      status: 'active',
    });

    // Candidate 2: Fresh Graduate (Software Engineering / Web)
    const candidateZainab = await User.create({
      name: 'Zainab Fatima',
      email: 'zainab.fatima@nust.edu.pk',
      password: 'password123',
      role: 'fresh_graduate',
      phone: '+92 321 9876543',
      location: 'Islamabad, Pakistan',
      headline: 'Fresh Graduate Software Engineer | Full Stack MERN Developer',
      bio: 'Graduated from NUST SEECS with solid hands-on experience in React.js, Node.js, Express, and MongoDB. Passionate about performant user interfaces.',
      skills: [
        { name: 'react', proficiency: 'Expert' },
        { name: 'node.js', proficiency: 'Expert' },
        { name: 'mongodb', proficiency: 'Expert' },
        { name: 'express.js', proficiency: 'Expert' },
        { name: 'javascript', proficiency: 'Expert' },
        { name: 'tailwind css', proficiency: 'Expert' },
        { name: 'rest api', proficiency: 'Expert' },
      ],
      education: [
        {
          degree: 'BS Software Engineering',
          institute: 'NUST SEECS Islamabad',
          startYear: 2021,
          endYear: 2025,
          gradeOrCgpa: '3.75 CGPA',
        },
      ],
      experience: [
        {
          title: 'Full Stack Developer Intern',
          company: 'Systems Limited',
          location: 'Lahore',
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-09-01'),
          current: false,
          description:
            'Developed reusable React dashboard components and Node.js authentication endpoints.',
        },
      ],
      profileCompleted: true,
      status: 'active',
    });

    // Candidate 3: Experienced (Civil / Structural Engineering)
    const candidateBilal = await User.create({
      name: 'Engr. Bilal Tariq',
      email: 'bilal.tariq@gmail.com',
      password: 'password123',
      role: 'experienced',
      phone: '+92 333 4455667',
      location: 'Lahore, Pakistan',
      headline:
        'Senior Structural Design Engineer (PE) | ETABS & AutoCAD Specialist',
      bio: 'PEC-registered professional civil engineer with 4+ years of structural modeling, seismic mitigation analysis, and industrial high-rise design.',
      skills: [
        { name: 'autocad', proficiency: 'Expert' },
        { name: 'etabs', proficiency: 'Expert' },
        { name: 'sap2000', proficiency: 'Expert' },
        { name: 'seismic design', proficiency: 'Expert' },
        { name: 'project estimation', proficiency: 'Intermediate' },
      ],
      education: [
        {
          degree: 'BS Civil Engineering',
          institute: 'UET Lahore',
          startYear: 2017,
          endYear: 2021,
          gradeOrCgpa: '3.65 CGPA',
        },
      ],
      experience: [
        {
          title: 'Structural Design Engineer',
          company: 'NESPAK Pvt Ltd',
          location: 'Lahore',
          startDate: new Date('2021-09-01'),
          current: true,
          description:
            'Led structural stress modeling for high-rise commercial structures using ETABS and SAP2000.',
        },
      ],
      profileCompleted: true,
      status: 'active',
    });

    // Candidate 4: Professional (Healthcare / Doctor)
    const candidateAyesha = await User.create({
      name: 'Dr. Ayesha Khan (MBBS, FCPS-I)',
      email: 'dr.ayesha@shifa.com.pk',
      password: 'password123',
      role: 'professional',
      phone: '+92 301 7766554',
      location: 'Rawalpindi / Islamabad, Pakistan',
      headline: 'Medical Officer & Critical Care Resident | Emergency Medicine',
      bio: 'PMC-certified Medical Officer with 2+ years of acute trauma management, clinical pharmacology, patient triage, and ICU care.',
      skills: [
        { name: 'patient triage', proficiency: 'Expert' },
        { name: 'emergency medicine', proficiency: 'Expert' },
        { name: 'clinical pharmacology', proficiency: 'Expert' },
        { name: 'icu protocols', proficiency: 'Expert' },
        { name: 'cardiology', proficiency: 'Intermediate' },
      ],
      education: [
        {
          degree: 'MBBS (Bachelor of Medicine & Bachelor of Surgery)',
          institute: 'Rawalpindi Medical University (RMU)',
          startYear: 2018,
          endYear: 2023,
          gradeOrCgpa: 'Distinction in Pharmacology',
        },
      ],
      experience: [
        {
          title: 'Resident Medical Officer (ER & ICU)',
          company: 'Holy Family Hospital',
          location: 'Rawalpindi',
          startDate: new Date('2023-11-01'),
          current: true,
          description:
            'Managed trauma emergencies, patient resuscitation, and critical ICU life-support monitoring.',
        },
      ],
      profileCompleted: true,
      status: 'active',
    });

    // Candidate 5: Student (Finance & Accounting)
    const candidateMaryam = await User.create({
      name: 'Maryam Noor',
      email: 'maryam.noor@iba.edu.pk',
      password: 'password123',
      role: 'student',
      phone: '+92 312 8899001',
      location: 'Karachi, Pakistan',
      headline: 'BBA Finance & Accounting Senior | Financial Modeling & IFRS',
      bio: 'Enthusiastic finance student preparing for CFA Level 1. Strong competency in DCF financial valuation, advanced Excel formulas, and IFRS financial statements.',
      skills: [
        { name: 'financial modeling', proficiency: 'Expert' },
        { name: 'ms excel (advanced)', proficiency: 'Expert' },
        { name: 'ifrs reporting', proficiency: 'Intermediate' },
        { name: 'financial analysis', proficiency: 'Expert' },
      ],
      education: [
        {
          degree: 'BBA (Honors) in Finance',
          institute: 'IBA Karachi',
          startYear: 2022,
          endYear: 2026,
          gradeOrCgpa: '3.70 CGPA',
        },
      ],
      experience: [],
      profileCompleted: true,
      status: 'active',
    });

    // =========================================================================
    // 3. SEED REALISTIC MULTI-DISCIPLINARY JOBS
    // =========================================================================
    console.log(
      '🌱 [3/6] Seeding Multi-Discipline Jobs across Tech, Healthcare, Engineering & Finance...'
    );

    // Job 1: AI / NLP Engineer (Tech)
    const jobAi = await Job.create({
      title: 'Associate AI & NLP Engineer',
      company: 'TechLogix Global Solutions',
      employer: techEmployer._id,
      department: 'Information Technology',
      category: 'Data Science & AI',
      description:
        'Join our core generative AI squad to research, fine-tune, and deploy transformer-based NLP models. You will build resilient Python microservices with FastAPI, implement semantic retrieval engines, and optimize vector similarity matching.',
      jobType: 'entry_level',
      requiredSkills: [
        { name: 'python', weight: 4, mandatory: true },
        { name: 'pytorch', weight: 4, mandatory: true },
        { name: 'fastapi', weight: 3, mandatory: true },
        { name: 'transformers', weight: 3, mandatory: false },
        { name: 'docker', weight: 2, mandatory: false },
      ],
      experienceRequired: 0,
      minExperienceYears: 0,
      educationRequirement:
        'BS Computer Science, Software Engineering or Data Science',
      location: 'Islamabad / Hybrid',
      workMode: 'Hybrid',
      salaryRange: {
        min: 95000,
        max: 140000,
        currency: 'PKR',
        isNegotiable: true,
      },
      applicantsCount: 1,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    // Job 2: Full Stack MERN Developer (Tech)
    const jobMern = await Job.create({
      title: 'Full Stack MERN Developer',
      company: 'TechLogix Global Solutions',
      employer: techEmployer._id,
      department: 'Information Technology',
      category: 'Software Development',
      description:
        'We are seeking a proactive Full Stack MERN Engineer to architect modern responsive user interfaces in React.js and develop scalable RESTful microservices in Node.js, Express, and MongoDB.',
      jobType: 'full_time',
      requiredSkills: [
        { name: 'react', weight: 4, mandatory: true },
        { name: 'node.js', weight: 4, mandatory: true },
        { name: 'mongodb', weight: 3, mandatory: true },
        { name: 'express.js', weight: 3, mandatory: true },
        { name: 'javascript', weight: 2, mandatory: true },
        { name: 'tailwind css', weight: 2, mandatory: false },
      ],
      experienceRequired: 1,
      minExperienceYears: 1,
      educationRequirement: 'BSCS / BSSE or equivalent practical degree',
      location: 'Lahore (Gulberg III)',
      workMode: 'Hybrid',
      salaryRange: {
        min: 110000,
        max: 160000,
        currency: 'PKR',
        isNegotiable: true,
      },
      applicantsCount: 1,
      deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    // Job 3: Senior Structural Design Engineer (Engineering)
    const jobCivil = await Job.create({
      title: 'Senior Structural Design Engineer',
      company: 'Descon Engineering',
      employer: engineeringEmployer._id,
      department: 'Engineering & Construction',
      category: 'Civil & Structural Engineering',
      description:
        'Seeking an experienced Structural Design Engineer to oversee structural finite-element modeling, seismic analysis, and civil load estimation for industrial and high-rise commercial structures.',
      jobType: 'experienced',
      requiredSkills: [
        { name: 'autocad', weight: 4, mandatory: true },
        { name: 'etabs', weight: 4, mandatory: true },
        { name: 'sap2000', weight: 3, mandatory: true },
        { name: 'seismic design', weight: 3, mandatory: true },
        { name: 'project estimation', weight: 2, mandatory: false },
      ],
      experienceRequired: 3,
      minExperienceYears: 3,
      educationRequirement:
        "Bachelor's or Master's in Civil Engineering (PEC Registered)",
      location: 'Lahore (Ferozepur Road)',
      workMode: 'On-site',
      salaryRange: {
        min: 240000,
        max: 320000,
        currency: 'PKR',
        isNegotiable: true,
      },
      applicantsCount: 1,
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    // Job 4: Resident Medical Officer (Healthcare)
    const jobMedical = await Job.create({
      title: 'Resident Medical Officer (Emergency & ICU)',
      company: 'Shifa International Hospital',
      employer: medicalEmployer._id,
      department: 'Healthcare & Medical Sciences',
      category: 'Clinical Medicine',
      description:
        'Shifa International Hospital invites applications from dedicated Medical Officers to oversee patient triage, emergency life-saving interventions, acute trauma management, and ICU rounds.',
      jobType: 'full_time',
      requiredSkills: [
        { name: 'patient triage', weight: 4, mandatory: true },
        { name: 'emergency medicine', weight: 4, mandatory: true },
        { name: 'clinical pharmacology', weight: 3, mandatory: true },
        { name: 'icu protocols', weight: 3, mandatory: true },
      ],
      experienceRequired: 1,
      minExperienceYears: 1,
      educationRequirement:
        'MBBS with valid PM&DC / PMC Permanent Registration',
      location: 'Islamabad (H-8/4)',
      workMode: 'On-site',
      salaryRange: {
        min: 140000,
        max: 185000,
        currency: 'PKR',
        isNegotiable: false,
      },
      applicantsCount: 1,
      deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    // Job 5: Financial Planning & Accounting Intern (Finance)
    const jobFinance = await Job.create({
      title: 'Financial Planning & Accounting Intern',
      company: 'Habib Bank Limited (HBL)',
      employer: financeEmployer._id,
      department: 'Banking & Financial Services',
      category: 'Corporate Finance',
      description:
        'Join the Financial Planning & Analysis (FP&A) team at HBL Tower. Excellent opportunity for finance majors to work on discounted cash flow financial models, variance reporting, and management budgeting.',
      jobType: 'internship',
      requiredSkills: [
        { name: 'financial modeling', weight: 4, mandatory: true },
        { name: 'ms excel (advanced)', weight: 3, mandatory: true },
        { name: 'ifrs reporting', weight: 2, mandatory: false },
        { name: 'financial analysis', weight: 3, mandatory: true },
      ],
      experienceRequired: 0,
      minExperienceYears: 0,
      educationRequirement:
        'Enrolled in BBA Finance / BS Accounting / ACMA / ACCA student',
      location: 'Karachi (HBL Plaza, I.I. Chundrigar)',
      workMode: 'On-site',
      salaryRange: {
        min: 45000,
        max: 60000,
        currency: 'PKR',
        isNegotiable: false,
      },
      applicantsCount: 1,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    // Job 6: Trainee Frontend Developer (Tech)
    await Job.create({
      title: 'Junior React.js Trainee',
      company: 'TechLogix Global Solutions',
      employer: techEmployer._id,
      department: 'Information Technology',
      category: 'Frontend Engineering',
      description:
        'Fast-track trainee opportunity for fresh graduates. Mentorship by senior architects on modern React 19, TypeScript, and state management.',
      jobType: 'trainee',
      requiredSkills: [
        { name: 'react', weight: 4, mandatory: true },
        { name: 'javascript', weight: 3, mandatory: true },
        { name: 'tailwind css', weight: 2, mandatory: false },
        { name: 'git', weight: 2, mandatory: false },
      ],
      experienceRequired: 0,
      minExperienceYears: 0,
      educationRequirement: 'Fresh Graduate in CS / IT / Software Engineering',
      location: 'Lahore / Remote',
      workMode: 'Remote',
      salaryRange: {
        min: 55000,
        max: 75000,
        currency: 'PKR',
        isNegotiable: false,
      },
      applicantsCount: 0,
      deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    // =========================================================================
    // 4. SEED APPLICATIONS WITH 50-30-20 BREAKDOWN & LIVE PIPELINE STATUSES
    // =========================================================================
    console.log(
      '🌱 [4/6] Seeding Live Applications (Shortlisted, Interview Scheduled, Under Review)...'
    );

    // 4.1 Syed Hamza Ali -> Associate AI & NLP Engineer (INTERVIEW SCHEDULED)
    const interviewDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const appHamza = await Application.create({
      job: jobAi._id,
      applicant: candidateHamza._id,
      matchPercentage: 94,
      matchedSkills: ['python', 'pytorch', 'fastapi', 'transformers', 'git'],
      missingSkills: ['docker'],
      status: 'Interview Scheduled',
      coverNote:
        'I have developed custom fine-tuning scripts for HuggingFace Transformers and built low-latency FastAPI inference microservices. Looking forward to discussing this role!',
      employerNotes:
        'Outstanding technical score (50/50). Interview scheduled for technical architecture round.',
      interview: {
        date: interviewDate,
        time: '11:00 AM PKT',
        mode: 'Google Meet (Video Call)',
        meetingLink: 'https://meet.google.com/xyz-recruiter-session',
        notes: 'Technical Competency & AI Architecture Evaluation (Round 1)',
      },
      appliedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    });

    // 4.2 Zainab Fatima -> Full Stack MERN Developer (SHORTLISTED)
    const appZainab = await Application.create({
      job: jobMern._id,
      applicant: candidateZainab._id,
      matchPercentage: 89,
      matchedSkills: [
        'react',
        'node.js',
        'mongodb',
        'express.js',
        'javascript',
        'tailwind css',
      ],
      missingSkills: [],
      status: 'Shortlisted',
      coverNote:
        'With hands-on experience in MERN stack architecture, I have built production-grade dashboards with JWT authentication and clean UI/UX.',
      employerNotes:
        'Top candidate for our MERN team. Added to shortlist for upcoming screening round.',
      appliedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    });

    // 4.3 Engr. Bilal Tariq -> Senior Structural Design Engineer (REVIEWED / UNDER REVIEW)
    await Application.create({
      job: jobCivil._id,
      applicant: candidateBilal._id,
      matchPercentage: 85,
      matchedSkills: ['autocad', 'etabs', 'sap2000', 'seismic design'],
      missingSkills: ['project estimation'],
      status: 'Reviewed',
      coverNote:
        'PEC registered engineer with 4+ years modeling complex seismic loads for high-rise commercial structures in ETABS.',
      employerNotes: 'Strong portfolio of industrial structural blueprints.',
      appliedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    // 4.4 Dr. Ayesha Khan -> Resident Medical Officer (SHORTLISTED)
    await Application.create({
      job: jobMedical._id,
      applicant: candidateAyesha._id,
      matchPercentage: 92,
      matchedSkills: [
        'patient triage',
        'emergency medicine',
        'clinical pharmacology',
        'icu protocols',
      ],
      missingSkills: [],
      status: 'Shortlisted',
      coverNote:
        'Certified Medical Officer with extensive trauma resuscitation and ICU monitoring experience. Prepared for immediate rotational shifts.',
      employerNotes:
        'Credentials verified with PM&DC. Recommended for medical panel interview.',
      appliedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    });

    // 4.5 Maryam Noor -> Financial Planning & Accounting Intern (PENDING)
    await Application.create({
      job: jobFinance._id,
      applicant: candidateMaryam._id,
      matchPercentage: 90,
      matchedSkills: [
        'financial modeling',
        'ms excel (advanced)',
        'financial analysis',
      ],
      missingSkills: ['ifrs reporting'],
      status: 'Pending',
      coverNote:
        'IBA BBA Senior with top grades in Corporate Finance and practical DCF financial modeling experience.',
      appliedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    });

    // =========================================================================
    // 5. SEED IN-APP NOTIFICATIONS
    // =========================================================================
    console.log(
      '🌱 [5/6] Seeding In-App Notifications for Candidates & Employers...'
    );

    // Notification for Hamza (Interview confirmed)
    await Notification.create({
      recipient: candidateHamza._id,
      sender: techEmployer._id,
      title: 'Interview Scheduled 🗓️',
      message: `Your interview for "Associate AI & NLP Engineer" at TechLogix Global Solutions is confirmed for ${interviewDate} at 11:00 AM PKT (Google Meet).`,
      type: 'interview_result',
      link: '/applications',
      metadata: {
        applicationId: appHamza._id,
        jobId: jobAi._id,
        interview: appHamza.interview,
      },
    });

    // Notification for Zainab (Shortlisted)
    await Notification.create({
      recipient: candidateZainab._id,
      sender: techEmployer._id,
      title: 'Congratulations! You are Shortlisted ⭐',
      message: `Great news! Your application for "Full Stack MERN Developer" has been shortlisted by the TechLogix recruiting team.`,
      type: 'application_status',
      link: '/applications',
      metadata: {
        applicationId: appZainab._id,
        jobId: jobMern._id,
        status: 'Shortlisted',
      },
    });

    // Notification for TechLogix Recruiter (New applicant alert)
    await Notification.create({
      recipient: techEmployer._id,
      sender: candidateHamza._id,
      title: 'Top AI Match Applicant Received 🚀',
      message:
        'Syed Hamza Ali applied for "Associate AI & NLP Engineer" with a 94% match score.',
      type: 'job_match',
      link: '/employer/candidates',
      metadata: {
        applicationId: appHamza._id,
        jobId: jobAi._id,
        applicantName: candidateHamza.name,
      },
    });

    // =========================================================================
    // 6. SEED AUDIT LOGS & SECURITY SENTINEL DATA
    // =========================================================================
    console.log(
      '🌱 [6/6] Seeding Security Sentinel Logs & Admin Audit Trail...'
    );

    const auditLogsData = [
      {
        action: 'AI ATS Engine Evaluation Completed',
        category: 'Matching Engine',
        detail:
          'Computed 50-30-20 semantic ontology match for candidate Syed Hamza Ali (94% score).',
        type: 'success',
        severity: 'success',
        actor: 'Smart Career AI Engine',
        actorRole: 'system',
        ipAddress: '127.0.0.1',
        location: 'Islamabad, PK',
        device: 'Python Microservice (FastAPI / Spacy)',
        status: 'Completed',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        action: 'Official Interview Invitation Dispatched',
        category: 'Email Dispatcher',
        detail:
          'Dispatched Google Meet interview invitation to candidate email via Gmail SMTP (TLS Port 465).',
        type: 'info',
        severity: 'info',
        actor: 'TechLogix HR Recruiter',
        actorRole: 'employer',
        ipAddress: '192.168.1.104',
        location: 'Lahore, PK',
        device: 'Chrome 122 (Windows 11)',
        status: 'Delivered',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
      },
      {
        action: 'Super Admin Security Audit Verified',
        category: 'Security Sentinel',
        detail:
          'Admin console initiated JWT role authorization integrity check. All access tokens verified.',
        type: 'success',
        severity: 'success',
        actor: 'System Super Admin',
        actorRole: 'admin',
        ipAddress: '127.0.0.1',
        location: 'Islamabad, PK',
        device: 'Admin Dashboard (Windows / Chrome)',
        status: 'Verified',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
      },
      {
        action: 'Candidate Shortlisted for Interview',
        category: 'Recruiter Workflow',
        detail:
          'Recruiter marked Zainab Fatima as Shortlisted for Full Stack MERN Developer.',
        type: 'success',
        severity: 'success',
        actor: 'TechLogix HR Recruiter',
        actorRole: 'employer',
        ipAddress: '192.168.1.104',
        location: 'Lahore, PK',
        device: 'Employer Portal (Chrome / Windows)',
        status: 'Completed',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
      },
    ];
    await AuditLog.insertMany(auditLogsData);

    // Seed Security Alerts
    await SecurityAlert.create({
      title: 'Real-time AI Match Engine Operational',
      severity: 'Low',
      category: 'System Health',
      source: 'AI Microservice Heartbeat',
      target: 'Matching Engine',
      description:
        'Role matching pipeline is operating at normal latency (48ms average response time).',
      ipAddress: '127.0.0.1',
      resolved: false,
    });

    // Seed Login History
    await LoginHistory.create({
      user: adminUser._id,
      email: adminUser.email,
      role: 'admin',
      ipAddress: '127.0.0.1',
      location: 'Islamabad, PK',
      device: 'Admin Console (Chrome / Windows)',
      status: 'Success',
      loginTime: new Date(),
    });

    console.log(
      '\n================================================================'
    );
    console.log(
      '🎉 [VIVA DEMO PREP] DATABASE SEEDED SUCCESSFULLY WITH 100% LIVE DATA!'
    );
    console.log(
      '================================================================'
    );
    console.log(`
┌──────────────────────┬────────────────────────────────┬──────────────┐
│ Role                 │ Email                          │ Password     │
├──────────────────────┼────────────────────────────────┼──────────────┤
│ 👑 Super Admin       │ safwanarshad782@gmail.com      │ password123  │
│ 🏢 Tech Employer     │ recruiter@techlogix.com        │ password123  │
│ 🏥 Medical Employer  │ careers@shifa.com.pk           │ password123  │
│ 🏗️ Engr Employer    │ hr@descon.com                  │ password123  │
│ 🏦 Finance Employer  │ talent@hbl.com                 │ password123  │
│ 🎓 Student (CS/AI)   │ hamza.ali@fast.nu.edu.pk       │ password123  │
│ 🚀 Fresh Grad (SE)   │ zainab.fatima@nust.edu.pk      │ password123  │
│ 💼 Experienced Civil │ bilal.tariq@gmail.com          │ password123  │
│ 🩺 Doctor (Medicine) │ dr.ayesha@shifa.com.pk         │ password123  │
│ 📊 Student (Finance) │ maryam.noor@iba.edu.pk         │ password123  │
└──────────────────────┴────────────────────────────────┴──────────────┘
    `);
    console.log('Summary:');
    console.log(
      ' • 6 Multi-Disciplinary Jobs Seeded (Tech, Medical, Civil, Finance)'
    );
    console.log(
      ' • 5 Submitted Applications (Shortlisted, Interview Scheduled, Under Review)'
    );
    console.log(' • 3 Live In-App Notifications with Calendar Details');
    console.log(' • 4 Audit & Security Sentinel Logs Ready for /admin/logs\n');

    process.exit(0);
  } catch (error) {
    console.error(`❌ [Viva Seeder Error]: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

seedData();
