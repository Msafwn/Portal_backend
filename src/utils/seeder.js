import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Skill from '../models/Skill.js';

const seedData = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing data...');
    await User.deleteMany();
    await Job.deleteMany();
    await Application.deleteMany();
    await Skill.deleteMany();

    console.log('🌱 Seeding Skills taxonomy...');
    const skills = await Skill.insertMany([
      { name: 'react', category: 'Frontend', aliases: ['reactjs', 'react.js'] },
      { name: 'node.js', category: 'Backend', aliases: ['node', 'nodejs'] },
      {
        name: 'express.js',
        category: 'Backend',
        aliases: ['express', 'expressjs'],
      },
      { name: 'mongodb', category: 'Database', aliases: ['mongo'] },
      { name: 'javascript', category: 'Frontend', aliases: ['js', 'es6'] },
      { name: 'python', category: 'Data Science & AI', aliases: ['py'] },
      { name: 'docker', category: 'DevOps & Cloud', aliases: [] },
      { name: 'tailwind css', category: 'Frontend', aliases: ['tailwind'] },
      { name: 'git', category: 'DevOps & Cloud', aliases: ['github'] },
      {
        name: 'rest api',
        category: 'Backend',
        aliases: ['apis', 'restful api'],
      },
    ]);

    console.log('🌱 Seeding Sample Users...');

    const employer = await User.create({
      name: 'TechLogix HR',
      email: 'recruiter@techlogix.com',
      password: 'password123',
      role: 'employer',
      phone: '+92 300 1234567',
      location: 'Lahore, Pakistan',
      companyProfile: {
        companyName: 'TechLogix Global Solutions',
        industry: 'Information Technology',
        website: 'https://techlogix.example.com',
        description: 'Leading software development and IT consulting firm.',
        companySize: '50-200 Employees',
      },
      profileCompleted: true,
    });

    const student = await User.create({
      name: 'Obaid Mushtaq',
      email: 'obaid@example.com',
      password: 'password123',
      role: 'student',
      phone: '+92 301 9876543',
      location: 'Sahiwal, Pakistan',
      headline: 'BSCS Final Year Student | Frontend React Enthusiast',
      bio: 'Enthusiastic computer science student passionate about modern web UI and full stack development.',
      skills: [
        { name: 'react', proficiency: 'Intermediate' },
        { name: 'javascript', proficiency: 'Intermediate' },
        { name: 'tailwind css', proficiency: 'Expert' },
        { name: 'git', proficiency: 'Intermediate' },
      ],
      education: [
        {
          degree: 'BS Computer Science',
          institute: 'Barani Institute of Sciences, Sahiwal',
          startYear: 2023,
          endYear: 2027,
          gradeOrCgpa: '3.6 CGPA',
        },
      ],
      experience: [],
      profileCompleted: true,
    });

    const professional = await User.create({
      name: 'Muhammad Safwan',
      email: 'safwan@example.com',
      password: 'password123',
      role: 'professional',
      phone: '+92 302 5558888',
      location: 'Lahore, Pakistan',
      headline: 'Senior Full Stack MERN Developer',
      bio: 'Full Stack engineer with 2+ years of experience building scalable web applications and REST APIs.',
      skills: [
        { name: 'react', proficiency: 'Expert' },
        { name: 'node.js', proficiency: 'Expert' },
        { name: 'express.js', proficiency: 'Expert' },
        { name: 'mongodb', proficiency: 'Expert' },
        { name: 'javascript', proficiency: 'Expert' },
        { name: 'rest api', proficiency: 'Expert' },
        { name: 'docker', proficiency: 'Intermediate' },
      ],
      education: [
        {
          degree: 'BS Computer Science',
          institute: 'Barani Institute of Sciences, Sahiwal',
          startYear: 2023,
          endYear: 2027,
          gradeOrCgpa: '3.8 CGPA',
        },
      ],
      experience: [
        {
          title: 'Full Stack Web Developer',
          company: 'SoftSol Technologies',
          location: 'Lahore',
          startDate: new Date('2024-01-01'),
          current: true,
          description: 'Building microservices and React dashboards.',
        },
      ],
      profileCompleted: true,
    });

    console.log('🌱 Seeding Sample Jobs...');
    const job1 = await Job.create({
      title: 'Full Stack MERN Developer',
      company: 'TechLogix Global Solutions',
      employer: employer._id,
      description:
        'We are seeking a talented Full Stack MERN Developer to build and maintain high-performance web applications. You will be responsible for creating robust RESTful APIs in Node.js/Express and dynamic interfaces in React.',
      jobType: 'Full-Time',
      category: 'Software Development',
      requiredSkills: [
        { name: 'react', weight: 3, mandatory: true },
        { name: 'node.js', weight: 3, mandatory: true },
        { name: 'mongodb', weight: 2, mandatory: true },
        { name: 'express.js', weight: 2, mandatory: false },
        { name: 'docker', weight: 1, mandatory: false },
      ],
      minExperienceYears: 1,
      educationRequirement: 'BSCS / BSSE or equivalent degree',
      location: 'Lahore (Gulberg III)',
      workMode: 'Hybrid',
      salaryRange: {
        min: 80000,
        max: 130000,
        currency: 'PKR',
        isNegotiable: true,
      },
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const job2 = await Job.create({
      title: 'Frontend React.js Intern',
      company: 'TechLogix Global Solutions',
      employer: employer._id,
      description:
        'Great opportunity for students and fresh graduates to gain hands-on industry experience building modern React web interfaces. Mentorship and stipend provided.',
      jobType: 'Internship',
      category: 'Frontend Development',
      requiredSkills: [
        { name: 'react', weight: 3, mandatory: true },
        { name: 'javascript', weight: 2, mandatory: true },
        { name: 'tailwind css', weight: 1, mandatory: false },
        { name: 'git', weight: 1, mandatory: false },
      ],
      minExperienceYears: 0,
      educationRequirement: 'Current BSCS / BSSE student or Fresh Graduate',
      location: 'Remote / Sahiwal',
      workMode: 'Remote',
      salaryRange: {
        min: 30000,
        max: 45000,
        currency: 'PKR',
        isNegotiable: false,
      },
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    console.log('✅ Database Seeded Successfully!');
    console.log(`
--- Test Accounts Created ---
1. Employer:     recruiter@techlogix.com  / password123
2. Student:      obaid@example.com        / password123
3. Professional: safwan@example.com       / password123
-----------------------------
    `);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding Error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
