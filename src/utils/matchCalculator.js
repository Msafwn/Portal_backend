/**
 * Smart Career Role Match AI Job System
 * Core Matching Algorithm (Proposal Document - Page 3 Specification):
 * - Skill Match: 50%
 * - Experience Match: 30%
 * - Education Match: 20%
 * Total Match Score: 100%
 */

export const calculateMatchScore = (candidate, job) => {
  if (!job) {
    return {
      matchPercentage: 0,
      matchedSkills: [],
      missingSkills: [],
      breakdown: { skillScore: 0, experienceScore: 0, educationScore: 0 },
    };
  }

  // ----------------------------------------------------
  // 1. Skill Match Calculation (50% Weight)
  // ----------------------------------------------------
  const candidateSkills = (candidate?.skills || []).map((s) =>
    (typeof s === 'string' ? s : s.name || '').trim().toLowerCase()
  );

  const requiredSkills = job.requiredSkills || [];
  let skillScore = 0;
  const matchedSkills = [];
  const missingSkills = [];

  if (requiredSkills.length === 0) {
    skillScore = 50; // default full if no specific skill required
  } else {
    let totalWeight = 0;
    let earnedWeight = 0;

    requiredSkills.forEach((req) => {
      const reqName = (typeof req === 'string' ? req : req.name || '')
        .trim()
        .toLowerCase();
      const weight = req.weight || 1;
      totalWeight += weight;

      const isMatched = candidateSkills.some(
        (cSkill) =>
          cSkill === reqName ||
          cSkill.includes(reqName) ||
          reqName.includes(cSkill)
      );

      const skillDisplayName = typeof req === 'string' ? req : req.name;

      if (isMatched) {
        earnedWeight += weight;
        matchedSkills.push(skillDisplayName);
      } else {
        missingSkills.push(skillDisplayName);
      }
    });

    const ratio = totalWeight > 0 ? earnedWeight / totalWeight : 0;
    skillScore = ratio * 50;
  }

  // ----------------------------------------------------
  // 2. Experience Match Calculation (30% Weight)
  // ----------------------------------------------------
  const requiredExpYears =
    job.experienceRequired !== undefined
      ? job.experienceRequired
      : job.minExperienceYears || 0;

  let candidateExpYears = 0;
  if (Array.isArray(candidate?.experience) && candidate.experience.length > 0) {
    // If each entry represents roughly 1 year or has start/end date
    candidateExpYears = candidate.experience.length;
  } else if (typeof candidate?.totalExperienceYears === 'number') {
    candidateExpYears = candidate.totalExperienceYears;
  }

  let experienceScore = 0;
  if (requiredExpYears === 0) {
    experienceScore = 30; // Fresher / Entry roles award full points
  } else if (candidateExpYears >= requiredExpYears) {
    experienceScore = 30;
  } else {
    experienceScore = (candidateExpYears / requiredExpYears) * 30;
  }

  // ----------------------------------------------------
  // 3. Education Match Calculation (20% Weight)
  // ----------------------------------------------------
  let educationScore = 0;
  const candidateEducation = candidate?.education || [];
  const requiredEdu = (job.educationRequirement || '').toLowerCase();

  if (candidateEducation.length > 0) {
    if (!requiredEdu || requiredEdu.includes('any') || requiredEdu.includes('degree')) {
      educationScore = 20;
    } else {
      const jobDept = (job.department || '').toLowerCase();
      const hasMatchingDegree = candidateEducation.some((edu) => {
        const deg = (edu.degree || '').toLowerCase();
        const field = (edu.field || '').toLowerCase();
        
        // Universal degree levels
        const hasGeneralDegree =
          deg.includes('bachelor') ||
          deg.includes('master') ||
          deg.includes('bs') ||
          deg.includes('ms') ||
          deg.includes('be') ||
          deg.includes('bba') ||
          deg.includes('mba') ||
          deg.includes('mbbs') ||
          deg.includes('pharm') ||
          deg.includes('bds');

        // Medical & Healthcare Field Check
        if (jobDept.includes('med') || jobDept.includes('health') || jobDept.includes('pharm')) {
          return (
            deg.includes('mbbs') ||
            deg.includes('pharm') ||
            deg.includes('bds') ||
            deg.includes('nurs') ||
            field.includes('med') ||
            field.includes('health') ||
            field.includes('pharm') ||
            hasGeneralDegree
          );
        }

        // Engineering & Construction Field Check
        if (jobDept.includes('eng') || jobDept.includes('civil') || jobDept.includes('mech') || jobDept.includes('elect')) {
          return (
            deg.includes('be') ||
            deg.includes('b.e') ||
            field.includes('eng') ||
            field.includes('civil') ||
            field.includes('mech') ||
            field.includes('elect') ||
            hasGeneralDegree
          );
        }

        // Business & Finance Field Check
        if (jobDept.includes('bus') || jobDept.includes('fin') || jobDept.includes('acc') || jobDept.includes('mkt')) {
          return (
            deg.includes('bba') ||
            deg.includes('mba') ||
            deg.includes('acca') ||
            deg.includes('ca') ||
            field.includes('bus') ||
            field.includes('fin') ||
            field.includes('acc') ||
            field.includes('econ') ||
            hasGeneralDegree
          );
        }

        // IT / Computer Science Fallback
        return (
          field.includes('computer') ||
          field.includes('software') ||
          field.includes('it') ||
          field.includes('data') ||
          hasGeneralDegree
        );
      });
      educationScore = hasMatchingDegree ? 20 : 15;
    }
  } else {
    // For students whose degree is in progress
    if (candidate?.role === 'student') {
      educationScore = 18;
    } else {
      educationScore = 10;
    }
  }

  // ----------------------------------------------------
  // Final Score Aggregation (Total 100%)
  // ----------------------------------------------------
  const totalScore = Math.min(
    100,
    Math.max(0, Math.round(skillScore + experienceScore + educationScore))
  );

  return {
    matchPercentage: totalScore,
    matchedSkills,
    missingSkills,
    breakdown: {
      skillScore: Math.round(skillScore),
      experienceScore: Math.round(experienceScore),
      educationScore: Math.round(educationScore),
    },
  };
};

export default calculateMatchScore;
