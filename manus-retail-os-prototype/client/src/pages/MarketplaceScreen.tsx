import { MARKETPLACE_ITEMS } from '@/lib/mock-data';
import { Star } from 'lucide-react';

export default function MarketplaceScreen() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 bg-gradient-to-r from-posterita-blue to-posterita-teal">
        <h3 className="text-white font-extrabold text-sm">Loyalty Marketplace</h3>
        <p className="text-white/80 text-[11px]">Redeem points for amazing rewards</p>
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll p-3">
        <div className="grid grid-cols-2 gap-2">
          {MARKETPLACE_ITEMS.map(item => (
            <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="aspect-square overflow-hidden"><img src={item.image} alt={item.title} className="w-full h-full object-cover" /></div>
              <div className="p-2">
                <p className="text-[11px] font-bold text-foreground truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.brand}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1"><Star size={10} className="text-posterita-amber fill-posterita-amber" /><span className="text-[11px] font-extrabold text-posterita-blue">{item.points.toLocaleString()} pts</span></div>
                  <span className="text-[9px] text-muted-foreground">{item.redemptions} redeemed</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
