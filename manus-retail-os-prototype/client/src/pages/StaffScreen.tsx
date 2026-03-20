import { STAFF_MEMBERS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Users, UserPlus } from 'lucide-react';

export default function StaffScreen() {
  const statusColors: Record<string, string> = { 'on-shift': 'bg-posterita-green/10 text-posterita-green', 'off-shift': 'bg-muted text-muted-foreground', 'on-delivery': 'bg-posterita-blue/10 text-posterita-blue' };
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2"><Users size={16} className="text-posterita-blue" /><span className="text-sm font-extrabold text-foreground">{STAFF_MEMBERS.length} Team Members</span></div>
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-posterita-blue text-white text-xs font-bold"><UserPlus size={12} />Add</button>
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll px-3 pb-3">
        <div className="space-y-2">
          {STAFF_MEMBERS.map(s => (
            <div key={s.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-posterita-blue/10 flex items-center justify-center text-lg">{s.avatar}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{s.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{s.role} \u00b7 {s.store}</p>
              </div>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', statusColors[s.status])}>{s.status.replace('-', ' ').toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
