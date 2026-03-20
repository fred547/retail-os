import { cn } from '@/lib/utils';
import { Banknote, QrCode } from 'lucide-react';

const COLLECTIONS = [
  { id: 'cc1', store: 'Port Louis Central', declared: 52400, collected: 52400, deposited: 22100, status: 'deposited' },
  { id: 'cc2', store: 'Grand Baie Beach', declared: 38150, collected: 8150, deposited: 0, status: 'collected' },
  { id: 'cc3', store: 'Flic en Flac', declared: 17850, collected: 0, deposited: 0, status: 'pending' },
];
const statusColors: Record<string, string> = { pending: 'bg-posterita-amber/10 text-posterita-amber', collected: 'bg-posterita-blue/10 text-posterita-blue', deposited: 'bg-posterita-green/10 text-posterita-green' };

export default function CashCollectScreen() {
  const totals = { declared: COLLECTIONS.reduce((a, c) => a + c.declared, 0), collected: COLLECTIONS.reduce((a, c) => a + c.collected, 0), deposited: COLLECTIONS.reduce((a, c) => a + c.deposited, 0) };
  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-3 gap-2 p-3">
        {[{ label: 'Declared', value: totals.declared, color: 'text-foreground' }, { label: 'Collected', value: totals.collected, color: 'text-posterita-blue' }, { label: 'Deposited', value: totals.deposited, color: 'text-posterita-green' }].map(t => (
          <div key={t.label} className="bg-card rounded-xl border border-border p-2 text-center">
            <p className={cn('text-sm font-extrabold', t.color)}>Rs {t.value.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll px-3 pb-3">
        <div className="space-y-2">
          {COLLECTIONS.map(c => (
            <div key={c.id} className="bg-card rounded-xl border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Banknote size={14} className="text-posterita-green" /><p className="text-sm font-bold text-foreground">{c.store}</p></div>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', statusColors[c.status])}>{c.status.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs font-extrabold">Rs {c.declared.toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Declared</p></div>
                <div><p className="text-xs font-extrabold text-posterita-blue">Rs {c.collected.toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Collected</p></div>
                <div><p className="text-xs font-extrabold text-posterita-green">Rs {c.deposited.toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Deposited</p></div>
              </div>
              {c.status === 'pending' && <button className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-posterita-blue text-white text-xs font-bold"><QrCode size={12} />Generate Collection QR</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
