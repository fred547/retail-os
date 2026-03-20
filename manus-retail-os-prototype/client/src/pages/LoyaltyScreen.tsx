import { useState } from 'react';
import { CUSTOMERS, LOYALTY_CAMPAIGNS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Heart, Users, Gift, Search, Star, Crown, Award } from 'lucide-react';

export default function LoyaltyScreen() {
  const [tab, setTab] = useState<'customers' | 'campaigns'>('customers');
  const [searchQ, setSearchQ] = useState('');
  const filtered = CUSTOMERS.filter(c => !searchQ || c.name.toLowerCase().includes(searchQ.toLowerCase()));
  const tierColors: Record<string, string> = { Bronze: 'text-amber-700 bg-amber-100', Silver: 'text-gray-600 bg-gray-100', Gold: 'text-yellow-600 bg-yellow-100', Platinum: 'text-purple-600 bg-purple-100' };
  const tierIcons: Record<string, React.ReactNode> = { Bronze: <Award size={12} />, Silver: <Star size={12} />, Gold: <Crown size={12} />, Platinum: <Crown size={12} /> };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-border">
        {[{ id: 'customers', label: 'Customers', icon: <Users size={14} /> }, { id: 'campaigns', label: 'Campaigns', icon: <Gift size={14} /> }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors", tab === t.id ? "text-posterita-blue border-b-2 border-posterita-blue" : "text-muted-foreground")}>{t.icon}{t.label}</button>
        ))}
      </div>
      {tab === 'customers' && (
        <div className="flex-1 overflow-y-auto posterita-scroll p-3">
          <div className="relative mb-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search customers..." className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-posterita-blue/30" /></div>
          <div className="space-y-2">
            {filtered.map(c => (
              <div key={c.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-bold text-foreground">{c.name}</p><p className="text-[11px] text-muted-foreground">{c.phone}</p></div>
                  <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", tierColors[c.tier])}>{tierIcons[c.tier]}{c.tier}</span>
                </div>
                <div className="mt-2 flex items-center gap-2"><Heart size={12} className="text-posterita-red" /><span className="text-xs font-extrabold text-foreground">{c.points.toLocaleString()} pts</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'campaigns' && (
        <div className="flex-1 overflow-y-auto posterita-scroll p-3">
          <div className="space-y-2">
            {LOYALTY_CAMPAIGNS.map(camp => (
              <div key={camp.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-foreground">{camp.name}</p>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", camp.status === 'active' ? 'bg-posterita-green/10 text-posterita-green' : 'bg-muted text-muted-foreground')}>{camp.status.toUpperCase()}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Type: {camp.type} \u00b7 {camp.participants} participants</p>
                {camp.startDate && <p className="text-[11px] text-muted-foreground">{camp.startDate} \u2192 {camp.endDate}</p>}
              </div>
            ))}
            <button className="w-full bg-posterita-blue text-white font-bold text-sm py-3 rounded-xl mt-2">Create Campaign</button>
          </div>
        </div>
      )}
    </div>
  );
}
