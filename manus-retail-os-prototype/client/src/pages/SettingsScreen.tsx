import { Store, Printer, Bell, Shield, Palette, Globe, RefreshCw, Database, ChevronRight } from 'lucide-react';

const SECTIONS = [
  { icon: <Store size={16} />, label: 'Store Profile', desc: 'Name, address, hours, logo' },
  { icon: <Printer size={16} />, label: 'Printers & Devices', desc: 'Receipt printers, scanners, displays' },
  { icon: <Bell size={16} />, label: 'Notifications', desc: 'Push, email, SMS alerts' },
  { icon: <Shield size={16} />, label: 'Security & Roles', desc: 'Permissions, PIN codes, 2FA' },
  { icon: <Palette size={16} />, label: 'Appearance', desc: 'Theme, language, display' },
  { icon: <Globe size={16} />, label: 'Regional', desc: 'Currency, tax, date format' },
  { icon: <RefreshCw size={16} />, label: 'Sync & Offline', desc: 'Offline mode, sync frequency' },
  { icon: <Database size={16} />, label: 'Data & Backup', desc: 'Export, import, cloud backup' },
];

export default function SettingsScreen() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto posterita-scroll p-3">
        <div className="space-y-1">
          {SECTIONS.map(s => (
            <button key={s.label} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-posterita-blue/10 flex items-center justify-center text-posterita-blue">{s.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 border-t border-border text-center">
        <p className="text-[10px] text-muted-foreground">Posterita Retail OS v3.9.0</p>
        <p className="text-[10px] text-muted-foreground">Build 2026.03.19 \u00b7 Mauritius</p>
      </div>
    </div>
  );
}
