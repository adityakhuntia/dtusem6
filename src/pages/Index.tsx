import { useState } from 'react';
import { useStore } from '@/store/useStore';
import MasterTracker from '@/components/MasterTracker';
import DailyPlanner from '@/components/DailyPlanner';
import ProgressDashboard from '@/components/ProgressDashboard';
import RevisionTracker from '@/components/RevisionTracker';
import SyllabusImport from '@/components/SyllabusImport';
import { BookOpen, Calendar, BarChart3, RotateCcw, Focus } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'tracker', label: 'Master Tracker', icon: BookOpen },
  { id: 'planner', label: 'Daily Planner', icon: Calendar },
  { id: 'revision', label: 'Revisions', icon: RotateCcw },
] as const;

type Tab = typeof tabs[number]['id'];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { topics, focusMode, toggleFocusMode } = useStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card border-b px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-base font-bold text-foreground">📘 Exam Tracker</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFocusMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                focusMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}
            >
              <Focus size={13} />
              {focusMode ? 'Focus ON' : 'Focus'}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-[53px] z-20 bg-card border-b">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {topics.length === 0 && <SyllabusImport />}

        {activeTab === 'dashboard' && <ProgressDashboard />}
        {activeTab === 'tracker' && (
          <>
            {topics.length > 0 && <SyllabusImport />}
            <MasterTracker />
          </>
        )}
        {activeTab === 'planner' && <DailyPlanner />}
        {activeTab === 'revision' && <RevisionTracker />}
      </main>
    </div>
  );
}
