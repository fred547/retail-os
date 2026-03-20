import { DELIVERIES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Truck, MapPin, Clock, CheckCircle } from 'lucide-react';

export default function LogisticsScreen() {
  const statusColors: Record<string, string> = { 'in-transit': 'bg-posterita-blue/10 text-posterita-blue', pending: 'bg-posterita-amber/10 text-posterita-amber', delivered: 'bg-posterita-green/10 text-posterita-green' };
  const statusIcons: Record<string, React.ReactNode> = { 'in-transit': <Truck size={14} />, pending: <Clock size={14} />, delivered: <CheckCircle size={14} /> };
  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-3 gap-2 p-3">
        {[{ label: 'In Transit', count: DELIVERIES.filter(d => d.status === 'in-transit').length, color: 'bg-posterita-blue' }, { label: 'Pending', count: DELIVERIES.filter(d => d.status === 'pending').length, color: 'bg-posterita-amber' }, { label: 'Delivered', count: DELIVERIES.filter(d => d.status === 'delivered').length, color: 'bg-posterita-green' }].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <div className={cn('w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm', s.color)}>{s.count}</div>
            <p className="text-[10px] font-bold text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll px-3 pb-3">
        <div className="space-y-2">
          {DELIVERIES.map(d => (
            <div key={d.id} className="bg-card rounded-xl border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">{statusIcons[d.status]}<p className="text-sm font-bold text-foreground">{d.type}</p></div>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', statusColors[d.status])}>{d.status.replace('-', ' ').toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1"><MapPin size={12} /><span>{d.from}</span><span>\u2192</span><span>{d.to}</span></div>
              <div className="flex items-center gap-3 text-[11px]"><span className="font-semibold text-foreground">{d.items} items</span>{d.driver && <span className="text-muted-foreground">Driver: {d.driver}</span>}{d.eta && <span className="text-posterita-blue font-bold">ETA {d.eta}</span>}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
