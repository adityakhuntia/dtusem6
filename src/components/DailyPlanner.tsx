import { useStore } from '@/store/useStore';
import { format, parseISO, isToday, isBefore, startOfDay } from 'date-fns';
import { ChevronDown, ChevronRight, Check, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DailyPlanner() {
  const { dailyPlans, topics, updateDailyPlan, focusMode, markTopicDone, redistributeBacklog } = useStore();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const topicMap = new Map(topics.map(t => [t.id, t]));
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  // In focus mode, show only today
  const plans = focusMode
    ? dailyPlans.filter(p => isToday(parseISO(p.date)))
    : dailyPlans;

  // Auto-expand today in focus mode
  useEffect(() => {
    if (focusMode) {
      setExpandedDay(todayStr);
    }
  }, [focusMode, todayStr]);

  const toggleExpand = (date: string) => {
    setExpandedDay(prev => prev === date ? null : date);
  };

  const toggleTopicComplete = (date: string, topicId: string) => {
    const plan = dailyPlans.find(p => p.date === date);
    if (!plan) return;
    const completed = plan.topicsCompleted.includes(topicId)
      ? plan.topicsCompleted.filter(id => id !== topicId)
      : [...plan.topicsCompleted, topicId];
    updateDailyPlan(date, 'topicsCompleted', completed);
    if (!plan.topicsCompleted.includes(topicId)) {
      markTopicDone(topicId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Daily Planner {focusMode && <span className="text-xs font-normal text-primary ml-2">Focus Mode</span>}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={redistributeBacklog}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition"
            title="Move missed topics from past days to future days"
          >
            <RefreshCw size={12} /> Redistribute Backlog
          </button>
          <div className="text-xs text-muted-foreground">
            {topics.length} topics across {dailyPlans.length} days
          </div>
        </div>
      </div>

      {plans.length === 0 && (
        <div className="bg-card border rounded-lg text-center py-12 text-muted-foreground text-sm">
          {focusMode ? 'No tasks for today.' : 'Import syllabus to generate daily plans.'}
        </div>
      )}

      <div className="space-y-2">
        {plans.map(p => {
          const planned = p.topicsPlanned.length;
          const completed = p.topicsCompleted.length;
          const efficiency = planned > 0 ? Math.round(completed / planned * 100) : 0;
          const backlog = Math.max(0, planned - completed);
          const diff = p.totalStudyHours - p.targetHours;
          const isLowEff = planned > 0 && efficiency < 60;
          const dateObj = parseISO(p.date);
          const isTodayDate = isToday(dateObj);
          const isPast = isBefore(dateObj, today) && !isTodayDate;
          const isExpanded = expandedDay === p.date || (focusMode && isTodayDate);

          const topicsByCourse: Record<string, typeof topics> = {};
          p.topicsPlanned.forEach(id => {
            const t = topicMap.get(id);
            if (t) {
              if (!topicsByCourse[t.course]) topicsByCourse[t.course] = [];
              topicsByCourse[t.course].push(t);
            }
          });

          const targetHours = p.topicsPlanned.reduce((sum, id) => {
            const t = topicMap.get(id);
            return sum + (t?.estimatedTime || 0);
          }, 0);

          return (
            <div key={p.date} className={`bg-card border rounded-lg overflow-hidden ${isTodayDate ? 'ring-2 ring-primary' : ''}`}>
              <button
                onClick={() => toggleExpand(p.date)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition text-left"
              >
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                </div>
                <div className="flex-shrink-0 w-16">
                  <div className={`text-sm font-semibold ${isTodayDate ? 'text-primary' : 'text-foreground'}`}>{format(dateObj, 'MMM d')}</div>
                  <div className="text-[10px] text-muted-foreground">{format(dateObj, 'EEEE')}</div>
                </div>
                <div className="flex-1 flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">{planned} topics</span>
                  <span className="text-muted-foreground">~{targetHours}h target</span>
                  {completed > 0 && <span className="text-[hsl(var(--status-done))] font-medium">{completed} done</span>}
                  {isPast && backlog > 0 && <span className="text-[hsl(var(--status-not-started))] font-medium">{backlog} backlog</span>}
                  {planned > 0 && (
                    <span className={`font-medium ${isLowEff && isPast ? 'text-[hsl(var(--status-not-started))]' : 'text-muted-foreground'}`}>
                      {efficiency}% eff.
                    </span>
                  )}
                </div>
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full bg-[hsl(var(--status-done))] rounded-full transition-all" style={{ width: `${planned > 0 ? (completed / planned * 100) : 0}%` }} />
                </div>
                <div className="w-20 flex-shrink-0">
                  <input
                    type="number"
                    className="cell-edit w-14 text-xs"
                    value={p.totalStudyHours}
                    placeholder="0h"
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateDailyPlan(p.date, 'totalStudyHours', Number(e.target.value))}
                  />
                </div>
                {p.totalStudyHours > 0 && (
                  <span className={`text-xs font-medium flex-shrink-0 ${diff < 0 ? 'text-[hsl(var(--underperform))]' : 'text-[hsl(var(--overperform))]'}`}>
                    {diff > 0 ? '+' : ''}{diff}h
                  </span>
                )}
              </button>

              {isExpanded && (
                <div className="border-t px-4 py-3 space-y-3">
                  {Object.keys(topicsByCourse).length === 0 && (
                    <div className="text-xs text-muted-foreground">No topics assigned for this day.</div>
                  )}
                  {Object.entries(topicsByCourse).map(([course, courseTopics]) => (
                    <div key={course}>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">{course}</div>
                      <div className="space-y-0.5">
                        {courseTopics.map(t => {
                          const isDone = p.topicsCompleted.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-muted/40 transition ${isDone ? 'opacity-60' : ''}`}
                              onClick={() => toggleTopicComplete(p.date, t.id)}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition ${isDone ? 'bg-[hsl(var(--status-done))] border-[hsl(var(--status-done))]' : 'border-border'}`}>
                                {isDone && <Check size={10} className="text-primary-foreground" />}
                              </div>
                              <span className={`flex-1 ${isDone ? 'line-through' : ''}`}>{t.topic}</span>
                              <span className="text-[10px] text-muted-foreground">{t.unit}</span>
                              <span className="text-[10px] text-muted-foreground">{t.estimatedTime}h</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                t.difficulty === 'Hard' ? 'status-not-started' : t.difficulty === 'Easy' ? 'status-done' : 'status-progress'
                              }`}>{t.difficulty}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {backlog > 0 && isPast && (
                    <div className="text-xs text-[hsl(var(--status-not-started))] bg-[hsl(var(--status-not-started-bg))] rounded px-2 py-1.5">
                      ⚠ Recovery needed: ~{Math.ceil(backlog * 0.5)}h extra tomorrow to catch up on {backlog} topics
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
