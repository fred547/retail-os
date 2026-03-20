import { create } from 'zustand';

export type Role = 'owner' | 'purchaser' | 'merchandiser' | 'accountant' | 'supervisor' | 'cashier' | 'driver' | 'staff';
export type Surface = 'phone' | 'tablet' | 'web';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  sku: string;
}

export interface AppState {
  // Navigation
  currentScreen: string;
  previousScreen: string;
  role: Role;
  surface: Surface;
  sidebarOpen: boolean;

  // POS
  cart: CartItem[];
  cartCustomer: string | null;

  // Actions
  navigate: (screen: string) => void;
  setRole: (role: Role) => void;
  setSurface: (surface: Surface) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, 'qty'>) => void;
  removeFromCart: (id: string) => void;
  updateCartQty: (id: string, qty: number) => void;
  clearCart: () => void;
  setCartCustomer: (name: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  currentScreen: 'home',
  previousScreen: 'home',
  role: 'owner',
  surface: 'phone',
  sidebarOpen: true,

  cart: [],
  cartCustomer: null,

  navigate: (screen) => set((s) => ({ currentScreen: screen, previousScreen: s.currentScreen })),
  setRole: (role) => set({ role, currentScreen: 'home' }),
  setSurface: (surface) => set({ surface }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addToCart: (item) => set((s) => {
    const existing = s.cart.find((c) => c.id === item.id);
    if (existing) {
      return { cart: s.cart.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) };
    }
    return { cart: [...s.cart, { ...item, qty: 1 }] };
  }),
  removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),
  updateCartQty: (id, qty) => set((s) => ({
    cart: qty <= 0 ? s.cart.filter((c) => c.id !== id) : s.cart.map((c) => c.id === id ? { ...c, qty } : c)
  })),
  clearCart: () => set({ cart: [], cartCustomer: null }),
  setCartCustomer: (name) => set({ cartCustomer: name }),
}));
