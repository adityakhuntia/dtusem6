import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { parseISO, format, startOfDay } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { DATESHEET, matchExamForCourse } from '@/data/datesheet';

// Distinct HSL palette using design tokens where possible, with fallbacks
const COURSE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--status-done, 142 71% 45%))',
  'hsl(265 85% 60%)',
  'hsl(20 90% 55%)',
  'hsl(190 85% 50%)',
  'hsl(330 80% 60%)',
  'hsl(50 95% 55%)',
];

export default function DailyProgressChart() {
  const { topics, dailyPlans } = useStore();
  const [view, setView] = useState<'overall' | 'perCourse'>('overall');

  const today = startOfDay(new Date());

  const courses = useMemo(
    () => Array.from(new Set(topics.map(t => t.course))).sort(),
    [topics]
  );

  const topicMap = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics]);

  // Build sorted plans within scope (only days that have planned or completed activity, or are <= today)
  const sortedPlans = useMemo(
    () => [...dailyPlans].sort((a, b) => a.date.localeCompare(b.date)),
    [dailyPlans]
  );

  // ============ OVERALL: cumulative completion vs plan + daily completed bars ============
  const overallData = useMemo(() => {
    const totalTopics = topics.length;
    let cumPlanned = 0;
    let cumCompleted = 0;

    return sortedPlans.map(p => {
      cumPlanned += p.topicsPlanned.length;
      cumCompleted += p.topicsCompleted.length;
      const isPast = parseISO(p.date) <= today;
      return {
        date: p.date,
        label: format(parseISO(p.date), 'MMM d'),
        completedToday: p.topicsCompleted.length,
        plannedToday: p.topicsPlanned.length,
        cumCompleted: isPast ? cumCompleted : null,
        cumPlanned,
        totalTopics,
        completionPct: totalTopics > 0 && isPast ? Math.round((cumCompleted / totalTopics) * 100) : null,
      };
    });
  }, [sortedPlans, topics, today]);

  // ============ PER COURSE: stacked daily completion + cumulative line per course ============
  const perCourseData = useMemo(() => {
    return sortedPlans.map(p => {
      const row: Record<string, any> = {
        date: p.date,
        label: format(parseISO(p.date), 'MMM d'),
      };
      for (const c of courses) row[c] = 0;
      for (const tid of p.topicsCompleted) {
        const t = topicMap.get(tid);
        if (t) row[t.course] = (row[t.course] || 0) + 1;
      }
      return row;
    });
  }, [sortedPlans, courses, topicMap]);

  const cumulativePerCourseData = useMemo(() => {
    const cum: Record<string, number> = {};
    for (const c of courses) cum[c] = 0;
    return sortedPlans.map(p => {
      for (const tid of p.topicsCompleted) {
        const t = topicMap.get(tid);
        if (t) cum[t.course] = (cum[t.course] || 0) + 1;
      }
      const isPast = parseISO(p.date) <= today;
      const row: Record<string, any> = {
        date: p.date,
        label: format(parseISO(p.date), 'MMM d'),
      };
      for (const c of courses) row[c] = isPast ? cum[c] : null;
      return row;
    });
  }, [sortedPlans, courses, topicMap, today]);

  // Course totals for context
  const courseTotals = useMemo(() => {
    const m: Record<string, { total: number; done: number }> = {};
    for (const c of courses) m[c] = { total: 0, done: 0 };
    for (const t of topics) {
      if (!m[t.course]) m[t.course] = { total: 0, done: 0 };
      m[t.course].total++;
      if (t.status === 'Done') m[t.course].done++;
    }
    return m;
  }, [topics, courses]);

  // Exam reference lines
  const examMarkers = useMemo(() => {
    const planDates = new Set(sortedPlans.map(p => p.date));
    return DATESHEET.filter(e => planDates.has(e.date));
  }, [sortedPlans]);

  if (topics.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6 text-center text-sm text-muted-foreground">
        Import your syllabus to see progress charts.
      </div>
    );
  }

  if (sortedPlans.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6 text-center text-sm text-muted-foreground">
        No daily plans yet. Generate a plan in the Daily Planner.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Daily Progress</h2>
        <div className="inline-flex bg-muted rounded-md p-0.5 text-xs">
          <button
            onClick={() => setView('overall')}
            className={`px-3 py-1.5 rounded ${
              view === 'overall' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Overall
          </button>
          <button
            onClick={() => setView('perCourse')}
            className={`px-3 py-1.5 rounded ${
              view === 'perCourse' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Per Course
          </button>
        </div>
      </div>

      {view === 'overall' && (
        <>
          {/* Cumulative completion line */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Cumulative Completion</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Topics completed vs. topics planned over time. Exam dates marked.
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overallData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="cumPlanned"
                    name="Planned (cum)"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumCompleted"
                    name="Completed (cum)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                  {examMarkers.map(e => (
                    <ReferenceLine
                      key={e.code}
                      x={format(parseISO(e.date), 'MMM d')}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="2 4"
                      label={{ value: e.code, position: 'top', fontSize: 9, fill: 'hsl(var(--destructive))' }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily completed vs planned bars */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Daily Topics: Planned vs Completed</h3>
            <p className="text-xs text-muted-foreground mb-3">Per-day bar comparison.</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overallData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="plannedToday" name="Planned" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="completedToday" name="Completed" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {view === 'perCourse' && (
        <>
          {/* Course totals chips */}
          <div className="flex flex-wrap gap-2">
            {courses.map((c, i) => {
              const ct = courseTotals[c];
              const pct = ct.total > 0 ? Math.round((ct.done / ct.total) * 100) : 0;
              return (
                <div
                  key={c}
                  className="flex items-center gap-2 bg-card border rounded-md px-2.5 py-1.5 text-xs"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: COURSE_COLORS[i % COURSE_COLORS.length] }}
                  />
                  <span className="font-medium text-foreground truncate max-w-[180px]">{c}</span>
                  <span className="text-muted-foreground">
                    {ct.done}/{ct.total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cumulative per course line chart */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Cumulative Completion per Course</h3>
            <p className="text-xs text-muted-foreground mb-3">Topics completed over time, broken down by course.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativePerCourseData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {courses.map((c, i) => (
                    <Line
                      key={c}
                      type="monotone"
                      dataKey={c}
                      stroke={COURSE_COLORS[i % COURSE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls={false}
                    />
                  ))}
                  {examMarkers.map(e => (
                    <ReferenceLine
                      key={e.code}
                      x={format(parseISO(e.date), 'MMM d')}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="2 4"
                      label={{ value: e.code, position: 'top', fontSize: 9, fill: 'hsl(var(--destructive))' }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily stacked bars per course */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Daily Topics Completed per Course</h3>
            <p className="text-xs text-muted-foreground mb-3">Stacked: see how much of each course you covered each day.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perCourseData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {courses.map((c, i) => (
                    <Bar
                      key={c}
                      dataKey={c}
                      stackId="completed"
                      fill={COURSE_COLORS[i % COURSE_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
