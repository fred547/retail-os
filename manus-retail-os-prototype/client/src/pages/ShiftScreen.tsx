import { SHIFTS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Calendar, Clock } from 'lucide-react';

export default function ShiftScreen() {
  const statusColors: Record<string, string> = { active: 'bg-posterita-green/10 text-posterita-green', scheduled: 'bg-posterita-blue/10 text-posterita-blue', completed: 'bg-muted text-muted-foreground' };
  return (
    <div className="h-full flex flex-col">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3"><Calendar size={16} className="text-posterita-blue" /><span className="text-sm font-extrabold text-foreground">Thursday, 19 March 2026</span></div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-card rounded-xl border border-border p-3 text-center"><div className="w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm bg-posterita-green">{SHIFTS.filter(s => s.status === 'active').length}</div><p className="text-[10px] font-bold text-muted-foreground">Active</p></div>
          <div className="bg-card rounded-xl border border-border p-3 text-center"><div className="w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm bg-posterita-blue">{SHIFTS.filter(s => s.status === 'scheduled').length}</div><p className="text-[10px] font-bold text-muted-foreground">Scheduled</p></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll px-3 pb-3">
        <div className="space-y-2">
          {SHIFTS.map(s => (
            <div key={s.id} className="bg-card rounded-xl border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-foreground">{s.staff}</p>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', statusColors[s.status])}>{s.status.toUpperCase()}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{s.store}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px]"><Clock size={12} className="text-posterita-blue" /><span className="font-semibold text-foreground">{s.start} \u2013 {s.end}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
