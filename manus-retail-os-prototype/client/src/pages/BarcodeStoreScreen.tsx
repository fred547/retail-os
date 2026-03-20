import { cn } from '@/lib/utils';
import { CheckCircle, Camera } from 'lucide-react';

const STEPS = [
  { num: 1, label: 'Scan Shelf QR', desc: 'Identify the shelf section', done: true },
  { num: 2, label: 'Count Products', desc: 'Enter quantity on shelf', done: true },
  { num: 3, label: 'Photo Each Product', desc: 'Capture front & back images', done: false, current: true },
  { num: 4, label: 'Review & Create', desc: 'AI generates product details', done: false },
  { num: 5, label: 'Print Labels', desc: 'Print barcode stickers', done: false },
];

export default function BarcodeStoreScreen() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 bg-posterita-blue">
        <h3 className="text-white font-extrabold text-sm">Barcode My Store</h3>
        <p className="text-white/80 text-[11px]">Guided shelf-by-shelf product creation</p>
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll p-3">
        <div className="space-y-2">
          {STEPS.map(s => (
            <div key={s.num} className={cn('bg-card rounded-xl border p-3', s.current ? 'border-posterita-blue' : 'border-border')}>
              <div className="flex items-center gap-3">
                {s.done ? <CheckCircle size={20} className="text-posterita-green flex-shrink-0" /> : <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', s.current ? 'bg-posterita-blue text-white' : 'bg-muted text-muted-foreground')}>{s.num}</div>}
                <div className="flex-1">
                  <p className={cn('text-sm font-bold', s.done ? 'text-posterita-green' : s.current ? 'text-posterita-blue' : 'text-foreground')}>{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                </div>
              </div>
              {s.current && <button className="w-full mt-2 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-posterita-blue text-white text-sm font-bold"><Camera size={14} />Start Capturing</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
