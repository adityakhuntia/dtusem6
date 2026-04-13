import { useStore } from '@/store/useStore';
import { format, parseISO, isBefore, isToday } from 'date-fns';

export default function RevisionTracker() {
  const { revisions } = useStore();
  const today = new Date();

  const isOverdue = (dateStr: string, done: boolean) => {
    if (done || !dateStr) return false;
    return isBefore(parseISO(dateStr), today) && !isToday(parseISO(dateStr));
  };

  const isDue = (dateStr: string, done: boolean) => {
    if (done || !dateStr) return false;
    return isToday(parseISO(dateStr));
  };

  const nextRevisionDue = (r: typeof revisions[0]) => {
    if (!r.revision1Done) return r.revision1;
    if (!r.revision2Done) return r.revision2;
    if (!r.revision3Done) return r.revision3;
    return 'All done';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Revision Tracker</h2>

      <div className="overflow-auto max-h-[70vh] border rounded-lg bg-card">
        <table className="w-full text-sm border-collapse min-w-[800px]">
          <thead>
            <tr className="table-header border-b">
              {['Topic','Course','Last Studied','Rev 1 (+1d)','Rev 2 (+3d)','Rev 3 (+7d)','Next Due'].map(h => (
                <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {revisions.map((r, i) => {
              const next = nextRevisionDue(r);
              const nextOverdue = typeof next === 'string' && next !== 'All done' && isOverdue(next, false);
              return (
                <tr key={r.topicId} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-2 py-1.5 text-xs font-medium max-w-[200px] truncate">{r.topic}</td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{r.course}</td>
                  <td className="px-2 py-1.5 text-xs">{r.lastStudied ? format(parseISO(r.lastStudied), 'MMM d') : '—'}</td>
                  {[
                    { date: r.revision1, done: r.revision1Done },
                    { date: r.revision2, done: r.revision2Done },
                    { date: r.revision3, done: r.revision3Done },
                  ].map((rev, idx) => (
                    <td key={idx} className={`px-2 py-1.5 text-xs ${rev.done ? 'text-[hsl(var(--status-done))]' : isOverdue(rev.date, rev.done) ? 'text-[hsl(var(--status-not-started))] font-medium' : isDue(rev.date, rev.done) ? 'text-[hsl(var(--status-progress))] font-medium' : ''}`}>
                      {rev.date ? format(parseISO(rev.date), 'MMM d') : '—'}
                      {rev.done && ' ✓'}
                      {isOverdue(rev.date, rev.done) && ' ⚠'}
                    </td>
                  ))}
                  <td className={`px-2 py-1.5 text-xs font-medium ${nextOverdue ? 'text-[hsl(var(--status-not-started))]' : ''}`}>
                    {next === 'All done' ? <span className="text-[hsl(var(--status-done))]">✓ Done</span> : format(parseISO(next), 'MMM d')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {revisions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Complete topics to start tracking revisions.</div>
        )}
      </div>
    </div>
  );
}
