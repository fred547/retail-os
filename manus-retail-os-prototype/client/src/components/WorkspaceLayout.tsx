// ============================================================
// Posterita Retail OS — Warm Workspace Layout
// Sidebar-driven workspace with surface switcher (Phone/Tablet/Web)
// Design: Posterita brand tokens, warm sand palette
// ============================================================

import { useState } from 'react';
import { useStore, type Surface } from '@/lib/store';
import { ROLE_SCREENS, SCREEN_META, ROLES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Monitor, Tablet, Smartphone,
  PanelLeftClose, PanelLeft
} from 'lucide-react';

// Screen imports
import HomeScreen from '@/pages/HomeScreen';
import POSScreen from '@/pages/POSScreen';
import InventoryScreen from '@/pages/InventoryScreen';
import LoyaltyScreen from '@/pages/LoyaltyScreen';
import CatalogueScreen from '@/pages/CatalogueScreen';
import ProcurementScreen from '@/pages/ProcurementScreen';
import MarketplaceScreen from '@/pages/MarketplaceScreen';
import WarehouseScreen from '@/pages/WarehouseScreen';
import LogisticsScreen from '@/pages/LogisticsScreen';
import StaffScreen from '@/pages/StaffScreen';
import ShiftScreen from '@/pages/ShiftScreen';
import AccountantScreen from '@/pages/AccountantScreen';
import CashCollectScreen from '@/pages/CashCollectScreen';
import BarcodeStoreScreen from '@/pages/BarcodeStoreScreen';
import ChatScreen from '@/pages/ChatScreen';
import WhatsAppScreen from '@/pages/WhatsAppScreen';
import SettingsScreen from '@/pages/SettingsScreen';

const SCREEN_COMPONENTS: Record<string, React.FC> = {
  home: HomeScreen,
  pos: POSScreen,
  inventory: InventoryScreen,
  loyalty: LoyaltyScreen,
  catalogue: CatalogueScreen,
  procurement: ProcurementScreen,
  marketplace: MarketplaceScreen,
  warehouse: WarehouseScreen,
  logistics: LogisticsScreen,
  staff: StaffScreen,
  shift: ShiftScreen,
  accountant: AccountantScreen,
  'cash-collect': CashCollectScreen,
  'barcode-store': BarcodeStoreScreen,
  chat: ChatScreen,
  whatsapp: WhatsAppScreen,
  settings: SettingsScreen,
};

const SURFACE_OPTIONS: { id: Surface; label: string; icon: React.ReactNode }[] = [
  { id: 'phone', label: 'Phone', icon: <Smartphone size={15} /> },
  { id: 'tablet', label: 'Tablet', icon: <Tablet size={15} /> },
  { id: 'web', label: 'Web Console', icon: <Monitor size={15} /> },
];

export default function WorkspaceLayout() {
  const { currentScreen, role, surface, sidebarOpen, navigate, setRole, setSurface, setSidebarOpen } = useStore();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const availableScreens = ROLE_SCREENS[role] || ROLE_SCREENS.owner;
  const CurrentComponent = SCREEN_COMPONENTS[currentScreen] || HomeScreen;
  const currentMeta = SCREEN_META[currentScreen] || SCREEN_META.home;
  const currentRoleData = ROLES.find(r => r.id === role) || ROLES[0];

  return (
    <div className="h-screen flex bg-posterita-canvas overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full flex flex-col border-r border-border bg-sidebar overflow-hidden"
            style={{ minWidth: 0 }}
          >
            {/* Logo */}
            <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-posterita-blue flex items-center justify-center text-white font-black text-sm">P</div>
              <div>
                <div className="font-extrabold text-sm tracking-tight text-foreground">Posterita</div>
                <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Retail OS v3.9</div>
              </div>
            </div>

            {/* Role Selector */}
            <div className="px-3 py-3 border-b border-border">
              <div className="relative">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <span className="text-lg">{currentRoleData.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground">{currentRoleData.label}</div>
                    <div className="text-[10px] text-muted-foreground">Port Louis Central</div>
                  </div>
                  <ChevronRight size={14} className={cn("text-muted-foreground transition-transform", roleDropdownOpen && "rotate-90")} />
                </button>
                {roleDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                    {ROLES.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setRole(r.id as any); setRoleDropdownOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors",
                          role === r.id && "bg-accent"
                        )}
                      >
                        <span className="text-base">{r.icon}</span>
                        <span className="text-sm font-semibold">{r.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto posterita-scroll py-2 px-2">
              <div className="text-[10px] font-extrabold text-muted-foreground tracking-widest uppercase px-3 py-2">Modules</div>
              {availableScreens.map(screenId => {
                const meta = SCREEN_META[screenId];
                if (!meta) return null;
                const isActive = currentScreen === screenId;
                return (
                  <button
                    key={screenId}
                    onClick={() => navigate(screenId)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 mb-0.5",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold"
                        : "text-sidebar-foreground/70 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <span className="text-base w-6 text-center">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{meta.label}</div>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-posterita-blue" />}
                  </button>
                );
              })}
            </nav>

            {/* Surface Switcher */}
            <div className="px-3 py-3 border-t border-border">
              <div className="text-[10px] font-extrabold text-muted-foreground tracking-widest uppercase px-1 mb-2">Surface</div>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {SURFACE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSurface(opt.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all",
                      surface === opt.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.icon}
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-lg">{currentMeta.icon}</span>
            <div>
              <h1 className="text-sm font-extrabold text-foreground leading-tight">{currentMeta.label}</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">{currentMeta.description}</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Surface switcher in top bar */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {SURFACE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSurface(opt.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                  surface === opt.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Role badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-posterita-blue/10 text-xs font-bold text-posterita-blue">
            <span>{currentRoleData.icon}</span>
            <span>{currentRoleData.label}</span>
          </div>
        </header>

        {/* Screen Content */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen + surface}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {surface === 'phone' ? (
                <PhoneFrame>
                  <CurrentComponent />
                </PhoneFrame>
              ) : surface === 'tablet' ? (
                <TabletFrame>
                  <CurrentComponent />
                </TabletFrame>
              ) : (
                <div className="h-full overflow-y-auto posterita-scroll p-6">
                  <CurrentComponent />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-start justify-center pt-8 pb-4 overflow-y-auto">
      <div className="w-[375px] h-[812px] rounded-[2.5rem] border-[8px] border-foreground/10 bg-card shadow-2xl overflow-hidden relative flex-shrink-0">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-foreground/10 rounded-b-2xl z-50" />
        {/* Status bar */}
        <div className="h-12 bg-posterita-blue flex items-end justify-between px-6 pb-1">
          <span className="text-[10px] font-bold text-white/80">9:41</span>
          <span className="text-[10px] font-bold text-white/80">●●● ▶</span>
        </div>
        {/* Content — min-h ensures flex children fill space */}
        <div className="h-[calc(100%-48px)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto posterita-scroll min-h-0">
            <div className="h-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabletFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-start justify-center pt-6 pb-4 overflow-y-auto">
      <div className="w-[1024px] max-w-[95vw] h-[700px] rounded-2xl border-[6px] border-foreground/10 bg-card shadow-2xl overflow-hidden relative flex-shrink-0">
        <div className="h-8 bg-posterita-blue flex items-center justify-between px-6">
          <span className="text-[10px] font-bold text-white/80">9:41 AM</span>
          <span className="text-[10px] font-bold text-white/80">Posterita POS — Port Louis Central</span>
          <span className="text-[10px] font-bold text-white/80">●●● 87%</span>
        </div>
        <div className="h-[calc(100%-32px)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto posterita-scroll min-h-0">
            <div className="h-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
