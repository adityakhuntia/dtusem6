import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Topic, DailyPlan, RevisionEntry, Status, Priority, Difficulty } from './types';
import { format, addDays, parseISO, differenceInCalendarDays, isAfter } from 'date-fns';

const START_DATE = '2025-04-13';
const EXAM_DATE = '2025-05-05';

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function generateDates(): string[] {
  const dates: string[] = [];
  let current = parseISO(START_DATE);
  const end = parseISO(EXAM_DATE);
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

  markTopicDone: (topicId: string) => void;
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
        const coverageDays = Math.min(16, dates.length);
        const revisionDays = dates.length - coverageDays;

        const notDone = topics.filter(t => t.status !== 'Done');
        // Sort: Hard first, then Medium, then Easy for balanced distribution
        const sorted = [...notDone].sort((a, b) => {
          const dOrder: Record<string, number> = { Hard: 0, Medium: 1, Easy: 2 };
          return (dOrder[a.difficulty] ?? 1) - (dOrder[b.difficulty] ?? 1);
        });

        // Interleave hard and easy
        const hard = sorted.filter(t => t.difficulty === 'Hard');
        const medium = sorted.filter(t => t.difficulty === 'Medium');
        const easy = sorted.filter(t => t.difficulty === 'Easy');
        const interleaved: Topic[] = [];
        const maxLen = Math.max(hard.length, medium.length, easy.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < hard.length) interleaved.push(hard[i]);
          if (i < medium.length) interleaved.push(medium[i]);
          if (i < easy.length) interleaved.push(easy[i]);
        }

        const maxHoursPerDay = 9;
        const plans = generateDates().map(date => ({
          date,
          topicsPlanned: [] as string[],
          topicsCompleted: [] as string[],
          totalStudyHours: 0,
          targetHours: 8,
          recoveryPlan: '',
        }));

        let topicIdx = 0;
        for (let dayIdx = 0; dayIdx < coverageDays && topicIdx < interleaved.length; dayIdx++) {
          let hoursUsed = 0;
          while (topicIdx < interleaved.length && hoursUsed + interleaved[topicIdx].estimatedTime <= maxHoursPerDay) {
            plans[dayIdx].topicsPlanned.push(interleaved[topicIdx].id);
            hoursUsed += interleaved[topicIdx].estimatedTime;
            topicIdx++;
          }
          plans[dayIdx].targetHours = Math.max(hoursUsed, 8);
        }

        // Distribute remaining topics if any
        while (topicIdx < interleaved.length) {
          for (let dayIdx = 0; dayIdx < coverageDays && topicIdx < interleaved.length; dayIdx++) {
            plans[dayIdx].topicsPlanned.push(interleaved[topicIdx].id);
            topicIdx++;
          }
        }

        // Revision days: mark for revision
        const doneTopics = topics.filter(t => t.status === 'Done');
        for (let dayIdx = coverageDays; dayIdx < dates.length; dayIdx++) {
          const revIdx = dayIdx - coverageDays;
          const chunk = Math.ceil(doneTopics.length / revisionDays);
          const start = revIdx * chunk;
          plans[dayIdx].topicsPlanned = doneTopics.slice(start, start + chunk).map(t => t.id);
          plans[dayIdx].targetHours = 8;
        }

        set({ dailyPlans: plans });
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

      toggleFocusMode: () => set(state => ({ focusMode: !state.focusMode })),
    }),
    { name: 'exam-tracker-storage' }
  )
);
