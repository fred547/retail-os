import { cn } from '@/lib/utils';
import { MessageCircle, Radio, QrCode } from 'lucide-react';

const CONVERSATIONS = [
  { id: 'w1', name: 'Marie Dupont', avatar: '\ud83d\udc69', lastMsg: 'Is the Reef Pro Sandal available in size 40?', time: '10:23', unread: 2 },
  { id: 'w2', name: 'Jean-Pierre R.', avatar: '\ud83d\udc68', lastMsg: 'My order was delivered, thank you!', time: '09:45', unread: 0 },
  { id: 'w3', name: 'Aisha Patel', avatar: '\ud83d\udc69', lastMsg: 'When does the summer sale start?', time: 'Yesterday', unread: 1 },
  { id: 'w4', name: 'Raj Doorgakant', avatar: '\ud83d\udc68', lastMsg: 'Can I return the sunglasses?', time: 'Yesterday', unread: 0 },
];

export default function WhatsAppScreen() {
  const totalUnread = CONVERSATIONS.reduce((a, c) => a + c.unread, 0);
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 bg-[#25D366] flex items-center justify-between">
        <div className="flex items-center gap-2"><MessageCircle size={16} className="text-white" /><span className="text-white font-extrabold text-sm">WhatsApp Business</span></div>
        {totalUnread > 0 && <span className="bg-white text-[#25D366] text-[10px] font-bold px-2 py-0.5 rounded-full">{totalUnread} unread</span>}
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll">
        {CONVERSATIONS.map(c => (
          <button key={c.id} className="w-full flex items-center gap-3 px-3 py-3 border-b border-border hover:bg-accent/50 transition-colors text-left">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center text-lg">{c.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between"><p className="text-sm font-bold text-foreground">{c.name}</p><span className={cn('text-[10px]', c.unread > 0 ? 'text-[#25D366] font-bold' : 'text-muted-foreground')}>{c.time}</span></div>
              <p className="text-[11px] text-muted-foreground truncate">{c.lastMsg}</p>
            </div>
            {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-border space-y-2">
        <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-bold"><Radio size={14} />Broadcast Message</button>
        <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm font-bold"><QrCode size={14} />Registration QR</button>
      </div>
    </div>
  );
}
