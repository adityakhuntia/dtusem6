import { useStore } from '@/store/useStore';
import { format, parseISO, isToday } from 'date-fns';

export default function DailyPlanner() {
  const { dailyPlans, topics, updateDailyPlan, focusMode } = useStore();

  const topicMap = new Map(topics.map(t => [t.id, t]));

  const getTopicName = (id: string) => topicMap.get(id)?.topic || id;

  const plans = focusMode
    ? dailyPlans.filter(p => isToday(parseISO(p.date)))
    : dailyPlans;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Daily Planner {focusMode && <span className="text-xs font-normal text-primary ml-2">Focus Mode</span>}
      </h2>

      <div className="overflow-auto max-h-[70vh] border rounded-lg bg-card">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="table-header border-b">
              {['Date','Day','Topics Planned','Topics Completed','Target h','Actual h','Efficiency','Backlog','Diff','Recovery'].map(h => (
                <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((p, i) => {
              const planned = p.topicsPlanned.length;
              const completed = p.topicsCompleted.length;
              const efficiency = planned > 0 ? Math.round(completed / planned * 100) : 0;
              const backlog = planned - completed;
              const diff = p.totalStudyHours - p.targetHours;
              const isLowEff = planned > 0 && efficiency < 60;
              const dateObj = parseISO(p.date);
              const today = isToday(dateObj);

              return (
                <tr key={p.date} className={`border-b border-border/50 ${today ? 'bg-primary/5 font-medium' : i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs">{format(dateObj, 'MMM d')}</td>
                  <td className="px-2 py-1.5 text-xs">{format(dateObj, 'EEE')}</td>
                  <td className="px-2 py-1.5 max-w-[200px]">
                    <div className="flex flex-wrap gap-0.5">
                      {p.topicsPlanned.slice(0, 4).map(id => (
                        <span key={id} className="text-[10px] bg-muted rounded px-1 py-0.5 truncate max-w-[80px]">{getTopicName(id)}</span>
                      ))}
                      {p.topicsPlanned.length > 4 && <span className="text-[10px] text-muted-foreground">+{p.topicsPlanned.length - 4}</span>}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-xs">{completed}</td>
                  <td className="px-2 py-1.5 text-xs">{p.targetHours}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      className="cell-edit w-14"
                      value={p.totalStudyHours}
                      onChange={e => updateDailyPlan(p.date, 'totalStudyHours', Number(e.target.value))}
                    />
                  </td>
                  <td className={`px-2 py-1.5 text-xs font-medium ${isLowEff ? 'text-[hsl(var(--status-not-started))]' : ''}`}>
                    {planned > 0 ? `${efficiency}%` : '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-xs ${backlog > 2 ? 'text-[hsl(var(--status-not-started))] font-medium' : ''}`}>
                    {backlog > 0 ? backlog : '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-xs font-medium ${diff < 0 ? 'text-[hsl(var(--underperform))]' : diff > 0 ? 'text-[hsl(var(--overperform))]' : ''}`}>
                    {diff > 0 ? `+${diff}` : diff}h
                  </td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">
                    {backlog > 0 ? `+${Math.ceil(backlog * 0.5)}h extra needed` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {plans.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {focusMode ? 'No tasks for today.' : 'Import syllabus to generate daily plans.'}
          </div>
        )}
      </div>
    </div>
  );
}
