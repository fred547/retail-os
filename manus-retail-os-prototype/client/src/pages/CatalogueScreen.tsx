import { useState } from 'react';
import { PRODUCTS, formatRs } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { FileText, Sparkles, Download, Eye, Check, X, Edit3 } from 'lucide-react';

export default function CatalogueScreen() {
  const [tab, setTab] = useState<'products' | 'enrichment' | 'generate'>('products');
  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-border">
        {[{ id: 'products', label: 'Products', icon: <Eye size={14} /> }, { id: 'enrichment', label: 'AI Enrichment', icon: <Sparkles size={14} /> }, { id: 'generate', label: 'Generate PDF', icon: <FileText size={14} /> }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors", tab === t.id ? "text-posterita-blue border-b-2 border-posterita-blue" : "text-muted-foreground")}>{t.icon}{t.label}</button>
        ))}
      </div>
      {tab === 'products' && (
        <div className="flex-1 overflow-y-auto posterita-scroll p-3">
          <div className="grid grid-cols-2 gap-2">
            {PRODUCTS.map(p => (
              <div key={p.id} className="bg-card rounded-xl border border-border p-2 cursor-pointer hover:border-posterita-blue/30 transition-colors">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-1.5"><img src={p.image} alt={p.name} className="w-full h-full object-cover" /></div>
                <p className="text-[11px] font-bold text-foreground truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.sku}</p>
                <p className="text-[11px] font-extrabold text-posterita-blue">{formatRs(p.price)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'enrichment' && (
        <div className="flex-1 overflow-y-auto posterita-scroll p-3">
          <div className="bg-posterita-blue/5 rounded-xl border border-posterita-blue/20 p-3 mb-3">
            <div className="flex items-center gap-2 mb-1"><Sparkles size={14} className="text-posterita-blue" /><span className="text-xs font-bold text-posterita-blue">AI Enrichment Queue</span></div>
            <p className="text-[11px] text-muted-foreground">3 products pending review</p>
          </div>
          {PRODUCTS.slice(0, 3).map(p => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-3 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.sku}</p></div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-posterita-amber/10 text-posterita-amber">PENDING</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 mb-2">
                <p className="text-[10px] font-bold text-muted-foreground mb-1">AI Description</p>
                <p className="text-xs text-foreground italic">"Durable reef sandal with quick-dry navy straps."</p>
              </div>
              <div className="flex gap-1.5">
                <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-posterita-green/10 text-posterita-green text-[11px] font-bold"><Check size={12} />Accept</button>
                <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-posterita-blue/10 text-posterita-blue text-[11px] font-bold"><Edit3 size={12} />Edit</button>
                <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-posterita-red/10 text-posterita-red text-[11px] font-bold"><X size={12} />Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'generate' && (
        <div className="flex-1 p-3">
          <h3 className="text-sm font-extrabold mb-3">Catalogue Templates</h3>
          <div className="space-y-2">
            {[{ name: 'Credit Card', desc: 'Pocket reference cards', icon: '\ud83d\udcb3' }, { name: 'A5 Portrait', desc: 'Showroom sell sheets', icon: '\ud83d\udccb' }, { name: 'Compact Sheet', desc: 'Full catalogue booklet', icon: '\ud83d\udcd6' }, { name: 'Flyer', desc: 'Window display / promo', icon: '\ud83d\udcf0' }].map(tmpl => (
              <button key={tmpl.name} className="w-full flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:border-posterita-blue/30 transition-colors text-left">
                <span className="text-2xl">{tmpl.icon}</span>
                <div className="flex-1"><p className="text-sm font-bold text-foreground">{tmpl.name}</p><p className="text-[11px] text-muted-foreground">{tmpl.desc}</p></div>
                <Download size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
