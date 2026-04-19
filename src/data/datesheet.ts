// Exam datesheet — single source of truth for exam dates and course mapping.
// Add or edit entries here to update the planner, countdown, and dashboard.

export interface ExamEntry {
  code: string;        // Short code shown in UI (e.g. "MMS")
  name: string;        // Full subject name
  date: string;        // ISO yyyy-MM-dd
  // Aliases / keywords used to match a topic's `course` string to this exam.
  // Matching is case-insensitive and uses substring checks.
  aliases: string[];
}

// Year is intentionally explicit so the schedule does not silently shift.
const YEAR = 2026;

export const DATESHEET: ExamEntry[] = [
  {
    code: 'MMS',
    name: 'Mathematical Modelling and Simulation',
    date: `${YEAR}-05-04`,
    aliases: ['mms', 'mathematical modelling', 'modelling and simulation', 'mathematical modeling'],
  },
  {
    code: 'DWDM',
    name: 'Data Warehousing & Data Mining',
    date: `${YEAR}-05-07`,
    aliases: ['dwdm', 'data warehousing', 'data mining', 'warehous'],
  },
  {
    code: 'HU',
    name: 'Engineering Economics',
    date: `${YEAR}-05-09`,
    aliases: ['hu', 'engg economics', 'engineering economics', 'economics'],
  },
  {
    code: 'BT',
    name: 'Genomics and Proteomics',
    date: `${YEAR}-05-13`,
    aliases: ['bt', 'genomics', 'proteomics', 'biotech'],
  },
  {
    code: 'QIT',
    name: 'Quantum Information Theory',
    date: `${YEAR}-05-14`,
    aliases: ['qit', 'quantum information', 'quantum'],
  },
  {
    code: 'FE',
    name: 'Financial Engineering',
    date: `${YEAR}-05-20`,
    aliases: ['fe', 'financial engineering', 'finance'],
  },
];

export const FIRST_EXAM_DATE = DATESHEET.reduce(
  (min, e) => (e.date < min ? e.date : min),
  DATESHEET[0].date,
);

export const LAST_EXAM_DATE = DATESHEET.reduce(
  (max, e) => (e.date > max ? e.date : max),
  DATESHEET[0].date,
);

/**
 * Match a topic's `course` field to an exam in the datesheet.
 * Returns null if no match is found.
 */
export function matchExamForCourse(course: string): ExamEntry | null {
  if (!course) return null;
  const normalized = course.toLowerCase().trim();
  // Prefer exact code match first.
  const codeMatch = DATESHEET.find(e => e.code.toLowerCase() === normalized);
  if (codeMatch) return codeMatch;
  // Then alias substring match.
  for (const exam of DATESHEET) {
    if (exam.aliases.some(a => normalized.includes(a) || a.includes(normalized))) {
      return exam;
    }
  }
  return null;
}
