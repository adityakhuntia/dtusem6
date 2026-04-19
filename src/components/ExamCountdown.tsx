import { DATESHEET } from '@/data/datesheet';
import { differenceInCalendarDays, parseISO, format, startOfDay } from 'date-fns';
import { CalendarClock } from 'lucide-react';

export default function ExamCountdown() {
  const today = startOfDay(new Date());
  const sorted = [...DATESHEET].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock size={14} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Exam Datesheet</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {sorted.map(exam => {
          const dateObj = parseISO(exam.date);
          const daysLeft = differenceInCalendarDays(dateObj, today);
          const isPast = daysLeft < 0;
          const isToday = daysLeft === 0;
          const isUrgent = daysLeft >= 0 && daysLeft <= 3;

          return (
            <div
              key={exam.code}
              className={`rounded-md border px-2 py-2 ${
                isPast
                  ? 'bg-muted/40 opacity-60'
                  : isToday
                    ? 'bg-[hsl(var(--status-not-started-bg))] border-[hsl(var(--status-not-started))]'
                    : isUrgent
                      ? 'bg-[hsl(var(--status-progress-bg))] border-[hsl(var(--status-progress))]'
                      : 'bg-background'
              }`}
              title={exam.name}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-sm font-bold text-foreground">{exam.code}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(dateObj, 'MMM d')}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{exam.name}</div>
              <div
                className={`text-xs font-semibold mt-0.5 ${
                  isPast
                    ? 'text-muted-foreground'
                    : isToday
                      ? 'text-[hsl(var(--status-not-started))]'
                      : isUrgent
                        ? 'text-[hsl(var(--status-progress))]'
                        : 'text-primary'
                }`}
              >
                {isPast
                  ? 'Done'
                  : isToday
                    ? 'Today!'
                    : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
