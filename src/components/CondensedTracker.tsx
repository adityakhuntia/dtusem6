import { useStore } from '@/store/useStore';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

type StatusColor = 'status-done' | 'status-progress' | 'status-not-started';

function statusBadge(status: string): StatusColor {
  if (status === 'Done') return 'status-done';
  if (status === 'In Progress') return 'status-progress';
  return 'status-not-started';
}

export default function CondensedTracker() {
  const { topics, focusMode, dailyPlans } = useStore();
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  // In focus mode, only show topics planned for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPlan = dailyPlans.find(p => p.date === todayStr);
  const todayTopicIds = new Set(todayPlan?.topicsPlanned || []);
  
  const filteredTopics = focusMode
    ? topics.filter(t => todayTopicIds.has(t.id))
    : topics;

  // Build hierarchy: course -> unit -> topics
  const courses = [...new Set(filteredTopics.map(t => t.course))];

  const toggleCourse = (c: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  const toggleUnit = (key: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Condensed View
          {focusMode && <span className="text-xs font-normal text-primary ml-2">Focus Mode</span>}
        </h2>
        <div className="text-xs text-muted-foreground">{filteredTopics.length} topics</div>
      </div>

      {filteredTopics.length === 0 && (
        <div className="bg-card border rounded-lg text-center py-12 text-muted-foreground text-sm">
          {focusMode ? 'No topics for today.' : 'No topics yet.'}
        </div>
      )}

      <div className="space-y-1">
        {courses.map(course => {
          const courseTopics = filteredTopics.filter(t => t.course === course);
          const courseDone = courseTopics.filter(t => t.status === 'Done').length;
          const coursePct = Math.round(courseDone / courseTopics.length * 100);
          const isCourseOpen = expandedCourses.has(course);

          const units = [...new Set(courseTopics.map(t => t.unit))];

          return (
            <div key={course} className="bg-card border rounded-lg overflow-hidden">
              {/* Course header */}
              <button
                onClick={() => toggleCourse(course)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition text-left"
              >
                {isCourseOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                <span className="font-semibold text-sm flex-1 text-foreground">{course}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{courseDone}/{courseTopics.length}</span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[hsl(var(--status-done))] rounded-full transition-all" style={{ width: `${coursePct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-8 text-right">{coursePct}%</span>
                </div>
              </button>

              {/* Units */}
              {isCourseOpen && (
                <div className="border-t">
                  {units.map(unit => {
                    const unitKey = `${course}|${unit}`;
                    const unitTopics = courseTopics.filter(t => t.unit === unit);
                    const unitDone = unitTopics.filter(t => t.status === 'Done').length;
                    const unitTitle = unitTopics[0]?.unitTitle || '';
                    const isUnitOpen = expandedUnits.has(unitKey);

                    return (
                      <div key={unitKey}>
                        <button
                          onClick={() => toggleUnit(unitKey)}
                          className="w-full flex items-center gap-3 px-6 py-2 hover:bg-muted/20 transition text-left border-b border-border/30"
                        >
                          {isUnitOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                          <span className="text-xs font-medium text-foreground">{unit}</span>
                          <span className="text-xs text-muted-foreground flex-1 truncate">{unitTitle}</span>
                          <span className="text-[10px] text-muted-foreground">{unitDone}/{unitTopics.length}</span>
                        </button>

                        {isUnitOpen && (
                          <div className="bg-muted/10">
                            {unitTopics.map(t => (
                              <div key={t.id} className="flex items-center gap-2 px-10 py-1.5 text-xs border-b border-border/20">
                                <span className={`inline-block w-2 h-2 rounded-full ${statusBadge(t.status)}`} />
                                <span className={`flex-1 ${t.status === 'Done' ? 'line-through opacity-60' : ''}`}>{t.topic}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusBadge(t.status)}`}>{t.status}</span>
                                <span className="text-muted-foreground w-8 text-right">{t.estimatedTime}h</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
