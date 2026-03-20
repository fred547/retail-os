import { useState, useRef, useEffect } from 'react';
import { CHAT_MESSAGES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Send, Bot } from 'lucide-react';

interface Msg { id: string; role: string; text: string }

export default function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>(CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Msg = { id: `m${Date.now()}`, role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const aiMsg: Msg = { id: `m${Date.now() + 1}`, role: 'ai', text: `Based on your query "${userMsg.text}", here\'s what I found: Your Port Louis Central store is performing well today with Rs 47,850 in sales across 23 transactions. Would you like a detailed breakdown?` };
      setMessages(prev => [...prev, aiMsg]);
      setTyping(false);
    }, 800);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 bg-posterita-blue flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Bot size={16} className="text-white" /></div>
        <div><p className="text-white font-bold text-sm">Posterita AI</p><p className="text-white/70 text-[10px]">Your retail assistant</p></div>
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll p-3">
        <div className="space-y-3">
          {messages.map(m => (
            <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'ai' && <div className="w-6 h-6 rounded-full bg-posterita-blue/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1"><Bot size={12} className="text-posterita-blue" /></div>}
              <div className={cn('max-w-[80%] rounded-2xl px-3 py-2', m.role === 'user' ? 'bg-posterita-blue text-white rounded-br-md' : 'bg-card border border-border text-foreground rounded-bl-md')}>
                <p className="text-[13px] leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
          {typing && <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-posterita-blue/10 flex items-center justify-center"><Bot size={12} className="text-posterita-blue" /></div><div className="bg-card border border-border rounded-2xl rounded-bl-md px-3 py-2"><div className="flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" /><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.15s' }} /><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.3s' }} /></div></div></div>}
          <div ref={endRef} />
        </div>
      </div>
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask about your business..." className="flex-1 px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-posterita-blue/30" />
          <button onClick={handleSend} className="w-10 h-10 rounded-xl bg-posterita-blue text-white flex items-center justify-center"><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
