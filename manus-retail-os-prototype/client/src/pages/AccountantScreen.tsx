import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, FileText, Download, DollarSign, Percent, Receipt, PiggyBank } from 'lucide-react';

const KPIS = [
  { label: 'Revenue MTD', value: 'Rs 847,500', icon: <DollarSign size={14} />, color: 'text-posterita-green' },
  { label: 'Expenses MTD', value: 'Rs 312,000', icon: <Receipt size={14} />, color: 'text-posterita-red' },
  { label: 'Net Profit', value: 'Rs 535,500', icon: <PiggyBank size={14} />, color: 'text-posterita-blue' },
  { label: 'Margin', value: '63.2%', icon: <Percent size={14} />, color: 'text-posterita-amber' },
];
const STORE_REVENUE = [
  { name: 'Port Louis Central', revenue: 520000, pct: 61 },
  { name: 'Grand Baie Beach', revenue: 245000, pct: 29 },
  { name: 'Flic en Flac', revenue: 82500, pct: 10 },
];
const REPORTS = ['Daily Sales Summary', 'Weekly P&L', 'Monthly Revenue Report', 'Tax Summary Q1', 'Cash Flow Statement', 'Inventory Valuation'];

export default function AccountantScreen() {
  const [tab, setTab] = useState<'overview' | 'reports'>('overview');
  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-border">
        {[{ id: 'overview', label: 'Overview', icon: <TrendingUp size={14} /> }, { id: 'reports', label: 'Reports', icon: <FileText size={14} /> }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={cn('flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors', tab === t.id ? 'text-posterita-blue border-b-2 border-posterita-blue' : 'text-muted-foreground')}>{t.icon}{t.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll p-3">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {KPIS.map(k => (
                <div key={k.label} className="bg-card rounded-xl border border-border p-3">
                  <div className={cn('mb-1', k.color)}>{k.icon}</div>
                  <p className="text-lg font-extrabold text-foreground">{k.value}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{k.label}</p>
                </div>
              ))}
            </div>
            <h3 className="text-xs font-extrabold text-foreground mb-2">Revenue by Store</h3>
            <div className="space-y-2">
              {STORE_REVENUE.map(s => (
                <div key={s.name} className="bg-card rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-1"><p className="text-sm font-bold">{s.name}</p><span className="text-xs font-extrabold text-posterita-blue">{s.pct}%</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-posterita-blue rounded-full" style={{ width: `${s.pct}%` }} /></div>
                  <p className="text-[11px] text-muted-foreground mt-1">Rs {s.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === 'reports' && (
          <div className="space-y-2">
            {REPORTS.map(r => (
              <button key={r} className="w-full flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:border-posterita-blue/30 transition-colors text-left">
                <FileText size={16} className="text-posterita-blue" />
                <span className="flex-1 text-sm font-bold text-foreground">{r}</span>
                <Download size={14} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
