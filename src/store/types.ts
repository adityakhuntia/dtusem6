export type Status = 'Not Started' | 'In Progress' | 'Done';
export type Priority = 'High' | 'Medium' | 'Low';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Topic {
  id: string;
  course: string;
  unit: string;
  unitTitle: string;
  topic: string;
  status: Status;
  priority: Priority;
  difficulty: Difficulty;
  estimatedTime: number;
  actualTime: number;
  revisionCount: number;
  lastRevisedDate: string;
  notes: string;
}

export interface DailyPlan {
  date: string;
  topicsPlanned: string[];
  topicsCompleted: string[];
  totalStudyHours: number;
  targetHours: number;
  recoveryPlan: string;
}

export interface RevisionEntry {
  topicId: string;
  topic: string;
  course: string;
  lastStudied: string;
  revision1: string;
  revision2: string;
  revision3: string;
  revision1Done: boolean;
  revision2Done: boolean;
  revision3Done: boolean;
}
