import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Topic, DailyPlan, RevisionEntry, Status, Priority, Difficulty } from './types';
import { format, addDays, parseISO, isAfter, startOfDay } from 'date-fns';
import { DATESHEET, FIRST_EXAM_DATE, LAST_EXAM_DATE, matchExamForCourse } from '@/data/datesheet';

function getScheduleBounds() {
  const now = startOfDay(new Date());
  const lastExam = parseISO(LAST_EXAM_DATE);
  // Start = today (or first exam date if today is before any planning makes sense), end = last exam.
  // We use today as start so the planner only ever shows actionable days going forward.
  const start = now < parseISO(FIRST_EXAM_DATE)
    ? now // start planning from today even if it's before the first exam
    : now;

  // If the entire exam cycle is over, fall back to a 30-day forward window so the UI isn't empty.
  if (isAfter(now, lastExam)) {
    return {
      startDate: format(now, 'yyyy-MM-dd'),
      examDate: format(addDays(now, 30), 'yyyy-MM-dd'),
    };
  }

  return {
    startDate: format(start, 'yyyy-MM-dd'),
    examDate: format(lastExam, 'yyyy-MM-dd'),
  };
}


function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function generateDates(): string[] {
  const { startDate, examDate } = getScheduleBounds();
  const dates: string[] = [];
  let current = parseISO(startDate);
  const end = parseISO(examDate);
  while (!isAfter(current, end)) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 1);
  }
  return dates;
}

interface AppState {
  topics: Topic[];
  dailyPlans: DailyPlan[];
  revisions: RevisionEntry[];
  focusMode: boolean;

  setTopics: (topics: Topic[]) => void;
  updateTopic: (id: string, field: keyof Topic, value: any) => void;
  addTopic: (topic: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  importSyllabus: (text: string) => void;

  updateDailyPlan: (date: string, field: keyof DailyPlan, value: any) => void;
  initDailyPlans: () => void;
  autoDistribute: () => void;
  redistributeBacklog: () => void;

  markTopicDone: (topicId: string) => void;
  markTopicsForRevision: (topicIds: string[]) => number;
  bulkMarkForRevisionByName: (items: { courseHint: string; topic: string }[]) => { matched: number; missed: { courseHint: string; topic: string }[] };
  toggleFocusMode: () => void;
}

function parseSyllabus(text: string): Partial<Topic>[] {
  const topics: Partial<Topic>[] = [];
  let currentCourse = '';
  let currentUnit = '';
  let currentUnitTitle = '';
  let unitNum = 0;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---' || trimmed === '# 📘 Syllabus Tracker') continue;

    const courseMatch = trimmed.match(/^#\s+(.+?)$/);
    if (courseMatch && !trimmed.startsWith('##')) {
      currentCourse = courseMatch[1].replace(/^#\s*/, '');
      unitNum = 0;
      continue;
    }

    const unitMatch = trimmed.match(/^##\s+(Unit\s*\d+):?\s*(.+)/i);
    if (unitMatch) {
      unitNum++;
      currentUnit = `Unit ${unitNum}`;
      currentUnitTitle = unitMatch[2];
      continue;
    }

    const subheadMatch = trimmed.match(/^###\s+(.+)/);
    if (subheadMatch) {
      currentUnitTitle = subheadMatch[1];
      continue;
    }

    const topicMatch = trimmed.match(/^-\s+(.+)/);
    if (topicMatch && currentCourse) {
      topics.push({
        course: currentCourse,
        unit: currentUnit,
        unitTitle: currentUnitTitle,
        topic: topicMatch[1],
      });
    }
  }
  return topics;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      topics: [],
      dailyPlans: [],
      revisions: [],
      focusMode: false,

      setTopics: (topics) => set({ topics }),

      updateTopic: (id, field, value) => set(state => ({
        topics: state.topics.map(t => t.id === id ? { ...t, [field]: value } : t),
      })),

      addTopic: (partial) => set(state => ({
        topics: [...state.topics, {
          id: generateId(),
          course: partial.course || '',
          unit: partial.unit || '',
          unitTitle: partial.unitTitle || '',
          topic: partial.topic || '',
          status: 'Not Started' as Status,
          priority: 'Medium' as Priority,
          difficulty: 'Medium' as Difficulty,
          estimatedTime: 1,
          actualTime: 0,
          revisionCount: 0,
          lastRevisedDate: '',
          notes: '',
          ...partial,
        }],
      })),

      deleteTopic: (id) => set(state => ({
        topics: state.topics.filter(t => t.id !== id),
        revisions: state.revisions.filter(r => r.topicId !== id),
      })),

      importSyllabus: (text) => {
        const parsed = parseSyllabus(text);
        const newTopics: Topic[] = parsed.map(p => ({
          id: generateId(),
          course: p.course || '',
          unit: p.unit || '',
          unitTitle: p.unitTitle || '',
          topic: p.topic || '',
          status: 'Not Started' as Status,
          priority: 'Medium' as Priority,
          difficulty: 'Medium' as Difficulty,
          estimatedTime: 1,
          actualTime: 0,
          revisionCount: 0,
          lastRevisedDate: '',
          notes: '',
        }));
        set({ topics: newTopics });
        get().initDailyPlans();
        get().autoDistribute();
      },

      initDailyPlans: () => {
        const dates = generateDates();
        const existing = get().dailyPlans;
        const existingMap = new Map(existing.map(p => [p.date, p]));
        const plans = dates.map(date => existingMap.get(date) || {
          date,
          topicsPlanned: [],
          topicsCompleted: [],
          totalStudyHours: 0,
          targetHours: 8,
          recoveryPlan: '',
        });
        set({ dailyPlans: plans });
      },

      autoDistribute: () => {
        const { topics } = get();
        const dates = generateDates();
        if (dates.length === 0) return;

        const maxHoursPerDay = 9;
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

        // Build empty plans for every date in the schedule window.
        const plans: DailyPlan[] = dates.map(date => ({
          date,
          topicsPlanned: [],
          topicsCompleted: [],
          totalStudyHours: 0,
          targetHours: 8,
          recoveryPlan: '',
        }));
        const planMap = new Map(plans.map(p => [p.date, p]));
        const dayHours = new Map<string, number>(dates.map(d => [d, 0]));

        const unitNum = (t: Topic) => {
          const m = t.unit.match(/(\d+)/);
          return m ? parseInt(m[1]) : 0;
        };
        const difficultyOrder: Record<string, number> = { Hard: 0, Medium: 1, Easy: 2 };

        // Group not-done topics by their matched exam (earliest exam first).
        const sortedExams = [...DATESHEET].sort((a, b) => a.date.localeCompare(b.date));
        const notDone = topics.filter(t => t.status !== 'Done');

        // Topics whose course doesn't match any exam — schedule them last, across the whole window.
        const unmatched: Topic[] = [];

        // Track the day index pointer per exam so we round-robin within its window.
        for (const exam of sortedExams) {
          const examTopics = notDone.filter(t => {
            const matched = matchExamForCourse(t.course);
            return matched?.code === exam.code;
          });
          if (examTopics.length === 0) continue;

          // Hardest + highest unit first within the course (so foundations get more revision time).
          examTopics.sort((a, b) => {
            const dDiff = (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1);
            if (dDiff !== 0) return dDiff;
            return unitNum(b) - unitNum(a);
          });

          // Available study days for this exam: from today (inclusive) up to the day BEFORE the exam.
          // Exam day itself is reserved as a light/no-study day.
          const windowDays = dates.filter(d => d >= today && d < exam.date);
          // If we're already past the exam, skip — user can't study for it anymore.
          if (windowDays.length === 0) continue;

          // Distribute by always picking the least-loaded day in this exam's window.
          for (const topic of examTopics) {
            const est = topic.estimatedTime || 1;
            // Find least-loaded day with capacity.
            let bestDay: string | null = null;
            let bestHours = Infinity;
            for (const d of windowDays) {
              const h = dayHours.get(d)!;
              if (h + est <= maxHoursPerDay && h < bestHours) {
                bestHours = h;
                bestDay = d;
              }
            }
            // If no day has capacity, pick the absolute least-loaded day (overflow).
            if (!bestDay) {
              for (const d of windowDays) {
                const h = dayHours.get(d)!;
                if (h < bestHours) {
                  bestHours = h;
                  bestDay = d;
                }
              }
            }
            if (!bestDay) continue;
            planMap.get(bestDay)!.topicsPlanned.push(topic.id);
            dayHours.set(bestDay, (dayHours.get(bestDay) || 0) + est);
          }
        }

        // Collect unmatched topics.
        for (const t of notDone) {
          if (!matchExamForCourse(t.course)) unmatched.push(t);
        }
        // Spread unmatched across all future days, least-loaded first.
        const futureDays = dates.filter(d => d >= today);
        for (const topic of unmatched) {
          const est = topic.estimatedTime || 1;
          let bestDay: string | null = null;
          let bestHours = Infinity;
          for (const d of futureDays) {
            const h = dayHours.get(d)!;
            if (h < bestHours) {
              bestHours = h;
              bestDay = d;
            }
          }
          if (!bestDay) continue;
          planMap.get(bestDay)!.topicsPlanned.push(topic.id);
          dayHours.set(bestDay, (dayHours.get(bestDay) || 0) + est);
        }

        // Set targetHours per day to actual planned load (min 6 to keep a baseline goal).
        for (const p of plans) {
          const h = dayHours.get(p.date) || 0;
          p.targetHours = h > 0 ? Math.max(6, Math.ceil(h)) : 6;
        }

        set({ dailyPlans: plans });
      },

      // Redistribute missed/incomplete topics from past days (before today) into future days (after today)
      redistributeBacklog: () => {
        const { dailyPlans, topics } = get();
        if (dailyPlans.length < 2) return;

        const topicMap = new Map(topics.map(t => [t.id, t]));
        const getPlannedHours = (topicIds: string[]) =>
          topicIds.reduce((sum, id) => sum + (topicMap.get(id)?.estimatedTime || 1), 0);

        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const sortedPlans = [...dailyPlans].sort((a, b) => a.date.localeCompare(b.date));

        // Past = strictly before today; Future = strictly after today; Today is untouched
        const pastPlans = sortedPlans.filter(p => p.date < today);
        const futurePlans = sortedPlans.filter(p => p.date > today);

        if (pastPlans.length === 0 || futurePlans.length === 0) return;

        // Deep clone all plans for mutation
        const updatedPlans = sortedPlans.map(plan => ({
          ...plan,
          topicsPlanned: [...plan.topicsPlanned],
          topicsCompleted: [...plan.topicsCompleted],
        }));
        const updatedMap = new Map(updatedPlans.map(p => [p.date, p]));

        // 1. Collect backlog from all past dates
        const backlogTopicIds: string[] = [];
        for (const pastPlan of pastPlans) {
          const plan = updatedMap.get(pastPlan.date)!;
          const missedIds = plan.topicsPlanned.filter(id => {
            if (plan.topicsCompleted.includes(id)) return false;
            const topic = topicMap.get(id);
            return !!topic && topic.status !== 'Done';
          });
          if (missedIds.length === 0) continue;
          backlogTopicIds.push(...missedIds);
          // Remove missed topics from past day's plan
          plan.topicsPlanned = plan.topicsPlanned.filter(id => !missedIds.includes(id));
        }

        const uniqueBacklog = [...new Set(backlogTopicIds)];
        if (uniqueBacklog.length === 0) return;

        // 2. Build load tracker for future days only
        const futureDates = futurePlans.map(p => p.date);
        const futureLoads = new Map(
          futureDates.map(date => {
            const plan = updatedMap.get(date)!;
            return [date, {
              hours: getPlannedHours(plan.topicsPlanned),
              plannedIds: new Set(plan.topicsPlanned),
            }];
          })
        );

        // 3. Distribute backlog evenly across future days using least-loaded-first
        let movedAny = false;
        for (const topicId of uniqueBacklog) {
          const estimatedTime = topicMap.get(topicId)?.estimatedTime || 1;

          // Find least-loaded future day that doesn't already have this topic
          let bestDate: string | null = null;
          let bestHours = Infinity;
          for (const date of futureDates) {
            const load = futureLoads.get(date)!;
            if (!load.plannedIds.has(topicId) && load.hours < bestHours) {
              bestHours = load.hours;
              bestDate = date;
            }
          }

          if (!bestDate) continue;

          const plan = updatedMap.get(bestDate)!;
          plan.topicsPlanned.push(topicId);
          const load = futureLoads.get(bestDate)!;
          load.plannedIds.add(topicId);
          load.hours += estimatedTime;
          movedAny = true;
        }

        if (!movedAny) return;

        // 4. Update target hours and persist
        const finalPlans = dailyPlans.map(original => {
          const updated = updatedMap.get(original.date);
          if (!updated) return original;
          return {
            ...updated,
            targetHours: updated.topicsPlanned.length > 0
              ? Math.max(updated.targetHours, getPlannedHours(updated.topicsPlanned))
              : updated.targetHours,
          };
        });

        set({ dailyPlans: finalPlans });
      },

      updateDailyPlan: (date, field, value) => set(state => ({
        dailyPlans: state.dailyPlans.map(p => p.date === date ? { ...p, [field]: value } : p),
      })),

      markTopicDone: (topicId) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        set(state => {
          const topics = state.topics.map(t =>
            t.id === topicId ? { ...t, status: 'Done' as Status, lastRevisedDate: today, revisionCount: t.revisionCount + 1 } : t
          );
          const existing = state.revisions.find(r => r.topicId === topicId);
          const topic = topics.find(t => t.id === topicId)!;
          const revisions = existing
            ? state.revisions.map(r => r.topicId === topicId ? {
              ...r,
              lastStudied: today,
              revision1: format(addDays(parseISO(today), 1), 'yyyy-MM-dd'),
              revision2: format(addDays(parseISO(today), 3), 'yyyy-MM-dd'),
              revision3: format(addDays(parseISO(today), 7), 'yyyy-MM-dd'),
            } : r)
            : [...state.revisions, {
              topicId,
              topic: topic.topic,
              course: topic.course,
              lastStudied: today,
              revision1: format(addDays(parseISO(today), 1), 'yyyy-MM-dd'),
              revision2: format(addDays(parseISO(today), 3), 'yyyy-MM-dd'),
              revision3: format(addDays(parseISO(today), 7), 'yyyy-MM-dd'),
              revision1Done: false,
              revision2Done: false,
              revision3Done: false,
            }];
          return { topics, revisions };
        });
      },

      markTopicsForRevision: (topicIds) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const idSet = new Set(topicIds);
        let count = 0;
        set(state => {
          const topics = state.topics.map(t => {
            if (!idSet.has(t.id)) return t;
            count++;
            return {
              ...t,
              status: 'Done' as Status,
              lastRevisedDate: today,
              revisionCount: Math.max(1, t.revisionCount),
            };
          });
          // Build/update revision entries with the spaced-repetition schedule.
          const existingByTopic = new Map(state.revisions.map(r => [r.topicId, r]));
          const todayDate = parseISO(today);
          for (const id of topicIds) {
            const topic = topics.find(t => t.id === id);
            if (!topic) continue;
            existingByTopic.set(id, {
              topicId: id,
              topic: topic.topic,
              course: topic.course,
              lastStudied: today,
              revision1: format(addDays(todayDate, 1), 'yyyy-MM-dd'),
              revision2: format(addDays(todayDate, 3), 'yyyy-MM-dd'),
              revision3: format(addDays(todayDate, 7), 'yyyy-MM-dd'),
              revision1Done: false,
              revision2Done: false,
              revision3Done: false,
            });
          }
          return { topics, revisions: Array.from(existingByTopic.values()) };
        });
        return count;
      },

      bulkMarkForRevisionByName: (items) => {
        const { topics } = get();
        const norm = (s: string) =>
          s.toLowerCase()
            .replace(/[^a-z0-9 ]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const matchedIds: string[] = [];
        const missed: { courseHint: string; topic: string }[] = [];

        for (const item of items) {
          const topicNorm = norm(item.topic);
          const courseHintNorm = norm(item.courseHint);
          // Score each topic: must include topic name; bonus if course matches hint.
          let bestId: string | null = null;
          let bestScore = -1;
          for (const t of topics) {
            const tNorm = norm(t.topic);
            if (!tNorm.includes(topicNorm) && !topicNorm.includes(tNorm)) continue;
            const courseMatch = norm(t.course).includes(courseHintNorm) || courseHintNorm.includes(norm(t.course));
            const score = (courseMatch ? 100 : 0) + Math.min(topicNorm.length, tNorm.length);
            if (score > bestScore) {
              bestScore = score;
              bestId = t.id;
            }
          }
          if (bestId && !matchedIds.includes(bestId)) {
            matchedIds.push(bestId);
          } else if (!bestId) {
            missed.push(item);
          }
        }

        const matched = get().markTopicsForRevision(matchedIds);
        return { matched, missed };
      },

      toggleFocusMode: () => set(state => ({ focusMode: !state.focusMode })),
    }),
    { name: 'exam-tracker-storage' }
  )
);
