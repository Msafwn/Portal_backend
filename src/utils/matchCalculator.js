export const calculateMatchScore = (candidate, job) => {
  if (!job || !job.requiredSkills || job.requiredSkills.length === 0) {
    return {
      matchPercentage: 100,
      matchedSkills: [],
      missingSkills: [],
      breakdown: { skillScore: 100, experienceBonus: 0 },
    };
  }

  const candidateSkills = (candidate.skills || []).map((s) =>
    (typeof s === 'string' ? s : s.name || '').trim().toLowerCase()
  );

  let totalWeight = 0;
  let earnedWeight = 0;
  const matchedSkills = [];
  const missingSkills = [];

  job.requiredSkills.forEach((req) => {
    const reqName = (req.name || '').trim().toLowerCase();
    const weight = req.weight || 1;
    totalWeight += weight;

    const isMatched = candidateSkills.some(
      (cSkill) =>
        cSkill === reqName ||
        cSkill.includes(reqName) ||
        reqName.includes(cSkill)
    );

    if (isMatched) {
      earnedWeight += weight;
      matchedSkills.push(req.name);
    } else {
      missingSkills.push(req.name);
    }
  });

  const skillMatchRatio = totalWeight > 0 ? earnedWeight / totalWeight : 0;
  let rawScore = skillMatchRatio * 85;

  const minExp = job.minExperienceYears || 0;
  let candidateExpYears = 0;
  if (candidate.experience && candidate.experience.length > 0) {
    candidateExpYears = candidate.experience.length;
  }

  if (minExp === 0) {
    rawScore += 15;
  } else if (candidateExpYears >= minExp) {
    rawScore += 15;
  } else {
    rawScore += (candidateExpYears / minExp) * 15;
  }

  const matchPercentage = Math.min(100, Math.max(0, Math.round(rawScore)));

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
  };
};
