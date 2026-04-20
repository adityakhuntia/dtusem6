import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { DATESHEET, matchExamForCourse, ExamEntry, LAST_EXAM_DATE } from '@/data/datesheet';
import {
  parseISO,
  format,
  startOfDay,
  startOfWeek,
  addDays,
  differenceInCalendarDays,
  isBefore,
  isSameDay,
} from 'date-fns';
import { CalendarRange, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type DayKind = 'past' | 'exam' | 'study' | 'gap' | 'today';

interface DayCell {
  date: Date;
  iso: string;
  inRange: boolean;          // whether the day falls in [today, lastExam]
  kind: DayKind;
  exam?: ExamEntry;          // set when kind === 'exam'
  primarySubject?: ExamEntry; // dominant subject planned that day (for study days)
  topicsCount: number;
  hours: number;
}

export default function ExamSchedule() {
  const { topics, dailyPlans } = useStore();

  const cells = useMemo<DayCell[]>(() => {
    const today = startOfDay(new Date());
    const lastExam = parseISO(LAST_EXAM_DATE);

    // Build the calendar grid: align start to the Monday of the week containing today,
    // and end on the Sunday of the week containing the last exam.
    const gridStart = startOfWeek(today, { weekStartsOn: 1 });
    const gridEnd = addDays(startOfWeek(lastExam, { weekStartsOn: 1 }), 6);
    const totalDays = differenceInCalendarDays(gridEnd, gridStart) + 1;

    const examByDate = new Map(DATESHEET.map(e => [e.date, e]));
    const topicMap = new Map(topics.map(t => [t.id, t]));
    const planByDate = new Map(dailyPlans.map(p => [p.date, p]));

    const out: DayCell[] = [];
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(gridStart, i);
      const iso = format(date, 'yyyy-MM-dd');
      const inRange = !isBefore(date, today) && !isBefore(lastExam, date) || isSameDay(date, today);
      const isPast = isBefore(date, today) && !isSameDay(date, today);
      const isToday = isSameDay(date, today);
      const exam = examByDate.get(iso);

      // Tally planned topics by subject for this day.
      const plan = planByDate.get(iso);
      const subjectHours = new Map<string, number>();
      let topicsCount = 0;
      let totalHours = 0;
      if (plan) {
        for (const tid of plan.topicsPlanned) {
          const t = topicMap.get(tid);
          if (!t) continue;
          topicsCount++;
          const matched = matchExamForCourse(t.course);
          const key = matched?.code || '__other__';
          const h = t.estimatedTime || 1;
          subjectHours.set(key, (subjectHours.get(key) || 0) + h);
          totalHours += h;
        }
      }

      // Find dominant subject (highest hours).
      let primarySubject: ExamEntry | undefined;
      if (subjectHours.size > 0) {
        let bestKey = '';
        let bestVal = -1;
        for (const [k, v] of subjectHours) {
          if (v > bestVal) {
            bestVal = v;
            bestKey = k;
          }
        }
        primarySubject = DATESHEET.find(e => e.code === bestKey);
      }

      let kind: DayKind;
      if (exam) kind = 'exam';
      else if (isPast) kind = 'past';
      else if (isToday) kind = 'today';
      else if (topicsCount > 0) kind = 'study';
      else kind = 'gap';

      out.push({
        date,
        iso,
        inRange,
        kind,
        exam,
        primarySubject,
        topicsCount,
        hours: totalHours,
      });
    }
    return out;
  }, [topics, dailyPlans]);

  // Split into weeks (rows of 7).
  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const [open, setOpen] = useState(false);

  // Summary for the collapsed header: next upcoming exam.
  const today = startOfDay(new Date());
  const upcoming = DATESHEET
    .map(e => ({ exam: e, days: differenceInCalendarDays(parseISO(e.date), today) }))
    .filter(x => x.days >= 0)
    .sort((a, b) => a.days - b.days)[0];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="bg-card border rounded-lg">
      <CollapsibleTrigger className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/40 transition rounded-lg">
        <CalendarRange size={14} className="text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">Exam Schedule Map</h3>
        {upcoming && !open && (
          <span className="text-[11px] text-muted-foreground truncate">
            · Next:{' '}
            <span className="font-semibold text-foreground">{upcoming.exam.code}</span>{' '}
            in {upcoming.days}d ({format(parseISO(upcoming.exam.date), 'MMM d')})
          </span>
        )}
        <ChevronDown
          size={14}
          className={`ml-auto text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 pt-1">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayLabels.map(d => (
            <div key={d} className="text-[10px] text-muted-foreground text-center font-medium">
              {d}
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map(cell => (
                <DayCellView key={cell.iso} cell={cell} />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Subjects
          </div>
          {DATESHEET.map(e => (
            <div key={e.code} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `hsl(var(--${e.colorVar}))` }}
              />
              <span className="text-[11px] text-foreground font-medium">{e.code}</span>
              <span className="text-[10px] text-muted-foreground">
                ({format(parseISO(e.date), 'MMM d')})
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 ml-auto">
            <LegendSwatch label="Exam day" type="exam" />
            <LegendSwatch label="Gap" type="gap" />
            <LegendSwatch label="Past" type="past" />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DayCellView({ cell }: { cell: DayCell }) {
  const { date, kind, exam, primarySubject, topicsCount, hours } = cell;
  const dayNum = format(date, 'd');
  const monthLabel = dayNum === '1' ? format(date, 'MMM') : null;

  // Base classes
  let classes =
    'relative aspect-square min-h-[44px] rounded-md border flex flex-col items-center justify-center text-[10px] font-medium transition cursor-default';
  let style: React.CSSProperties = {};
  let title = format(date, 'EEEE, MMM d');
  let mainContent: React.ReactNode = dayNum;
  let subContent: React.ReactNode = null;

  if (kind === 'exam' && exam) {
    classes += ' text-white border-transparent shadow-sm font-bold ring-2 ring-foreground/20';
    style.background = `repeating-linear-gradient(45deg, hsl(var(--${exam.colorVar})), hsl(var(--${exam.colorVar})) 6px, hsl(var(--${exam.colorVar}) / 0.7) 6px, hsl(var(--${exam.colorVar}) / 0.7) 12px)`;
    subContent = <span className="text-[9px] leading-none mt-0.5">{exam.code}</span>;
    title = `EXAM: ${exam.name} — ${title}`;
  } else if (kind === 'past') {
    classes += ' bg-muted/40 text-muted-foreground border-transparent opacity-60';
  } else if (kind === 'gap') {
    classes += ' bg-background text-muted-foreground border-dashed';
  } else if (kind === 'today' || kind === 'study') {
    if (primarySubject) {
      classes += ' text-foreground border-transparent';
      style.backgroundColor = `hsl(var(--${primarySubject.colorVar}) / 0.18)`;
      style.borderLeft = `3px solid hsl(var(--${primarySubject.colorVar}))`;
      subContent = (
        <span className="text-[9px] leading-none mt-0.5 font-semibold" style={{ color: `hsl(var(--${primarySubject.colorVar}))` }}>
          {primarySubject.code}
        </span>
      );
      title = `${primarySubject.code} study day — ${topicsCount} topic${topicsCount === 1 ? '' : 's'}, ~${hours}h`;
    } else {
      classes += ' bg-background text-foreground border-dashed';
      subContent = topicsCount > 0
        ? <span className="text-[9px] leading-none mt-0.5 text-muted-foreground">{topicsCount}t</span>
        : null;
    }
    if (kind === 'today') {
      classes += ' ring-2 ring-primary';
      title = `TODAY — ${title}`;
    }
  }

  return (
    <div className={classes} style={style} title={title}>
      {monthLabel && (
        <span className="absolute top-0.5 left-1 text-[8px] text-muted-foreground font-bold uppercase">
          {monthLabel}
        </span>
      )}
      <span className="leading-none">{mainContent}</span>
      {subContent}
    </div>
  );
}

function LegendSwatch({ label, type }: { label: string; type: 'exam' | 'gap' | 'past' }) {
  let style: React.CSSProperties = {};
  let cls = 'w-3 h-3 rounded-sm border';
  if (type === 'exam') {
    style.background = 'repeating-linear-gradient(45deg, hsl(var(--foreground)), hsl(var(--foreground)) 3px, hsl(var(--foreground) / 0.5) 3px, hsl(var(--foreground) / 0.5) 6px)';
    cls += ' border-transparent';
  } else if (type === 'gap') {
    cls += ' border-dashed bg-background';
  } else {
    cls += ' bg-muted/40 border-transparent';
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={cls} style={style} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
