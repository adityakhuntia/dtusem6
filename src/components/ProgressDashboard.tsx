import { useStore } from '@/store/useStore';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import { FIRST_EXAM_DATE } from '@/data/datesheet';

function ProgressBar({ value, max, label, color = 'bg-primary' }: { value: number; max: number; label: string; color?: string }) {
  const pct = max > 0 ? Math.round(value / max * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground">{value}/{max} ({pct}%)</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProgressDashboard() {
  const { topics, dailyPlans } = useStore();

  const total = topics.length;
  const done = topics.filter(t => t.status === 'Done').length;
  const inProgress = topics.filter(t => t.status === 'In Progress').length;
  const notStarted = topics.filter(t => t.status === 'Not Started').length;

  const courses = [...new Set(topics.map(t => t.course))];
  const courseStats = courses.map(c => {
    const ct = topics.filter(t => t.course === c);
    return { course: c, total: ct.length, done: ct.filter(t => t.status === 'Done').length };
  });

  const units = [...new Set(topics.map(t => `${t.course}|${t.unit}`))];
  const unitsDone = units.filter(u => {
    const [course, unit] = u.split('|');
    return topics.filter(t => t.course === course && t.unit === unit).every(t => t.status === 'Done');
  }).length;

  const examDate = parseISO(FIRST_EXAM_DATE);
  const today = new Date();
  const daysLeft = Math.max(0, differenceInCalendarDays(examDate, today));
  const remaining = total - done;
  const topicsPerDay = daysLeft > 0 ? (remaining / daysLeft).toFixed(1) : '∞';

  // Consistency score
  const pastPlans = dailyPlans.filter(p => parseISO(p.date) < today && p.topicsPlanned.length > 0);
  const consistencyDays = pastPlans.filter(p => p.topicsCompleted.length >= p.topicsPlanned.length * 0.5).length;
  const consistencyScore = pastPlans.length > 0 ? Math.round(consistencyDays / pastPlans.length * 100) : 100;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Progress Dashboard</h2>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Completion', value: `${total > 0 ? Math.round(done / total * 100) : 0}%`, sub: `${done}/${total} topics` },
          { label: 'Days Left', value: String(daysLeft), sub: `${topicsPerDay} topics/day` },
          { label: 'In Progress', value: String(inProgress), sub: `${notStarted} not started` },
          { label: 'Consistency', value: `${consistencyScore}%`, sub: `${consistencyDays}/${pastPlans.length} days` },
        ].map(m => (
          <div key={m.label} className="bg-card border rounded-lg p-3">
            <div className="text-xs text-muted-foreground">{m.label}</div>
            <div className="text-2xl font-bold text-foreground">{m.value}</div>
            <div className="text-xs text-muted-foreground">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <ProgressBar value={done} max={total} label="Overall Completion" color="bg-[hsl(var(--status-done))]" />
        <ProgressBar value={unitsDone} max={units.length} label="Units Completed" color="bg-primary" />
      </div>

      {/* Per-course */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">By Course</h3>
        {courseStats.map(cs => (
          <ProgressBar key={cs.course} value={cs.done} max={cs.total} label={cs.course} color="bg-primary" />
        ))}
      </div>

      {/* Burn-down */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Burn-down</h3>
        <div className="flex items-end gap-1 h-24">
          {dailyPlans.map((p, i) => {
            const cumulativeDone = dailyPlans.slice(0, i + 1).reduce((s, dp) => s + dp.topicsCompleted.length, 0);
            const remainAtDay = total - cumulativeDone;
            const h = total > 0 ? (remainAtDay / total * 100) : 0;
            const isPast = parseISO(p.date) < today;
            return (
              <div key={p.date} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t transition-all ${isPast ? 'bg-primary' : 'bg-muted'}`}
                  style={{ height: `${h}%` }}
                  title={`${format(parseISO(p.date), 'MMM d')}: ${remainAtDay} remaining`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>Apr 13</span>
          <span>May 5</span>
        </div>
      </div>
    </div>
  );
}
