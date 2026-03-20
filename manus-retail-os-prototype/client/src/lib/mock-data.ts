// ============================================================
// Posterita Retail OS — Mock Data
// Warm Workspace design · Posterita brand tokens
// ============================================================

export const ROLES = [
  { id: 'owner', label: 'Owner', icon: '👑', color: '#1976D2' },
  { id: 'purchaser', label: 'Purchaser', icon: '📋', color: '#0097A7' },
  { id: 'merchandiser', label: 'Merchandiser', icon: '🏷️', color: '#7B1FA2' },
  { id: 'accountant', label: 'Accountant', icon: '📊', color: '#388E3C' },
  { id: 'supervisor', label: 'Supervisor', icon: '🔑', color: '#F57C00' },
  { id: 'cashier', label: 'Cashier', icon: '💳', color: '#D32F2F' },
  { id: 'driver', label: 'Driver', icon: '🚛', color: '#5D4037' },
  { id: 'staff', label: 'Staff', icon: '👤', color: '#616161' },
] as const;

export const CATEGORIES = [
  { id: 'sandals', name: 'Sandals', emoji: '🩴' },
  { id: 'sneakers', name: 'Sneakers', emoji: '👟' },
  { id: 'clothing', name: 'Clothing', emoji: '👕' },
  { id: 'accessories', name: 'Accessories', emoji: '🕶️' },
  { id: 'bags', name: 'Bags', emoji: '👜' },
  { id: 'hats', name: 'Hats', emoji: '🧢' },
  { id: 'watches', name: 'Watches', emoji: '⌚' },
  { id: 'swimwear', name: 'Swimwear', emoji: '🩱' },
];

export const PRODUCTS = [
  { id: 'p1', name: 'Reef Pro Sandal Navy', sku: 'YDMUSTART01', price: 1290, category: 'sandals', image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=200&h=200&fit=crop' },
  { id: 'p2', name: 'Island Breeze Flip Flop', sku: 'YDMUSTART02', price: 590, category: 'sandals', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=200&h=200&fit=crop' },
  { id: 'p3', name: 'Coastal Runner White', sku: 'YDMUSTART03', price: 2490, category: 'sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop' },
  { id: 'p4', name: 'Urban Trail Sneaker', sku: 'YDMUSTART04', price: 1890, category: 'sneakers', image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=200&h=200&fit=crop' },
  { id: 'p5', name: 'Tropical Print Tee', sku: 'YDMUSTART05', price: 790, category: 'clothing', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop' },
  { id: 'p6', name: 'Linen Beach Shirt', sku: 'YDMUSTART06', price: 1490, category: 'clothing', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&h=200&fit=crop' },
  { id: 'p7', name: 'Aviator Sunglasses', sku: 'YDMUSTART07', price: 990, category: 'accessories', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop' },
  { id: 'p8', name: 'Woven Beach Tote', sku: 'YDMUSTART08', price: 1690, category: 'bags', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200&h=200&fit=crop' },
  { id: 'p9', name: 'Straw Sun Hat', sku: 'YDMUSTART09', price: 690, category: 'hats', image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=200&h=200&fit=crop' },
  { id: 'p10', name: 'Dive Watch Steel', sku: 'YDMUSTART10', price: 4990, category: 'watches', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop' },
  { id: 'p11', name: 'Board Shorts Palm', sku: 'YDMUSTART11', price: 890, category: 'swimwear', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop' },
  { id: 'p12', name: 'Canvas Backpack Khaki', sku: 'YDMUSTART12', price: 1990, category: 'bags', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop' },
];

export const STORES = [
  { id: 's1', name: 'Port Louis Central', address: 'Caudan Waterfront, Port Louis', status: 'open' },
  { id: 's2', name: 'Grand Baie Beach', address: 'Sunset Boulevard, Grand Baie', status: 'open' },
  { id: 's3', name: 'Flic en Flac', address: 'Pasadena Village, Flic en Flac', status: 'closed' },
];

export const CUSTOMERS = [
  { id: 'c1', name: 'Marie Dupont', phone: '+230 5712 3456', points: 2450, tier: 'Gold' },
  { id: 'c2', name: 'Jean-Pierre Ramgoolam', phone: '+230 5798 1234', points: 890, tier: 'Silver' },
  { id: 'c3', name: 'Aisha Patel', phone: '+230 5701 5678', points: 5200, tier: 'Platinum' },
  { id: 'c4', name: 'Raj Doorgakant', phone: '+230 5745 9012', points: 320, tier: 'Bronze' },
  { id: 'c5', name: 'Sophie Leclerc', phone: '+230 5723 3456', points: 1100, tier: 'Silver' },
];

export const STAFF_MEMBERS = [
  { id: 'st1', name: 'Priya Naidoo', role: 'cashier', store: 'Port Louis Central', avatar: '👩', status: 'on-shift' },
  { id: 'st2', name: 'Kevin Morel', role: 'supervisor', store: 'Port Louis Central', avatar: '👨', status: 'on-shift' },
  { id: 'st3', name: 'Fatima Jeetoo', role: 'cashier', store: 'Grand Baie Beach', avatar: '👩', status: 'off-shift' },
  { id: 'st4', name: 'Yannick Pilot', role: 'driver', store: 'Port Louis Central', avatar: '👨', status: 'on-delivery' },
  { id: 'st5', name: 'Anita Doorgakant', role: 'merchandiser', store: 'Grand Baie Beach', avatar: '👩', status: 'on-shift' },
];

export const DASHBOARD_STATS = {
  todaySales: 47850,
  todayTransactions: 23,
  avgBasket: 2080,
  topProduct: 'Reef Pro Sandal Navy',
  activeCustomers: 156,
  loyaltySignups: 8,
  inventoryAlerts: 3,
  pendingDeliveries: 5,
};

export const SALES_CHART_DATA = [
  { day: 'Mon', sales: 32000 },
  { day: 'Tue', sales: 41000 },
  { day: 'Wed', sales: 28000 },
  { day: 'Thu', sales: 47850 },
  { day: 'Fri', sales: 0 },
  { day: 'Sat', sales: 0 },
  { day: 'Sun', sales: 0 },
];

export const INVENTORY_ITEMS = [
  { id: 'i1', product: 'Reef Pro Sandal Navy', sku: 'YDMUSTART01', stock: 24, min: 10, max: 50, status: 'ok' },
  { id: 'i2', product: 'Island Breeze Flip Flop', sku: 'YDMUSTART02', stock: 8, min: 10, max: 40, status: 'low' },
  { id: 'i3', product: 'Coastal Runner White', sku: 'YDMUSTART03', stock: 3, min: 5, max: 30, status: 'critical' },
  { id: 'i4', product: 'Tropical Print Tee', sku: 'YDMUSTART05', stock: 45, min: 15, max: 60, status: 'ok' },
  { id: 'i5', product: 'Aviator Sunglasses', sku: 'YDMUSTART07', stock: 12, min: 8, max: 25, status: 'ok' },
  { id: 'i6', product: 'Straw Sun Hat', sku: 'YDMUSTART09', stock: 2, min: 5, max: 20, status: 'critical' },
];

export const DELIVERIES = [
  { id: 'd1', type: 'Standard Parcel', from: 'Port Louis Central', to: 'Grand Baie Beach', status: 'in-transit', driver: 'Yannick Pilot', items: 3, eta: '14:30' },
  { id: 'd2', type: 'Inter-Store Transfer', from: 'Flic en Flac', to: 'Port Louis Central', status: 'pending', driver: null, items: 12, eta: null },
  { id: 'd3', type: 'Customer Delivery', from: 'Grand Baie Beach', to: 'Trou aux Biches', status: 'delivered', driver: 'Yannick Pilot', items: 1, eta: null },
];

export const PROCUREMENT_ITEMS = [
  { id: 'pr1', title: 'Summer Sandals Collection 2026', vendor: 'Reef International', status: 'quoting', value: 45000, currency: 'USD' },
  { id: 'pr2', title: 'Beach Accessories Restock', vendor: 'Island Traders Co.', status: 'ordered', value: 12500, currency: 'USD' },
  { id: 'pr3', title: 'Premium Watch Line', vendor: 'Swiss Direct', status: 'sourcing', value: 89000, currency: 'EUR' },
];

export const LOYALTY_CAMPAIGNS = [
  { id: 'lc1', name: 'Summer Double Points', type: 'multiplier', status: 'active', startDate: '2026-03-01', endDate: '2026-03-31', participants: 234 },
  { id: 'lc2', name: 'Birthday Bonus 500pts', type: 'bonus', status: 'active', startDate: '2026-01-01', endDate: '2026-12-31', participants: 45 },
  { id: 'lc3', name: 'Refer a Friend', type: 'referral', status: 'draft', startDate: null, endDate: null, participants: 0 },
];

export const SHIFTS = [
  { id: 'sh1', staff: 'Priya Naidoo', store: 'Port Louis Central', date: '2026-03-19', start: '08:00', end: '16:00', status: 'active' },
  { id: 'sh2', staff: 'Kevin Morel', store: 'Port Louis Central', date: '2026-03-19', start: '08:00', end: '16:00', status: 'active' },
  { id: 'sh3', staff: 'Fatima Jeetoo', store: 'Grand Baie Beach', date: '2026-03-19', start: '10:00', end: '18:00', status: 'scheduled' },
  { id: 'sh4', staff: 'Yannick Pilot', store: 'Port Louis Central', date: '2026-03-19', start: '07:00', end: '15:00', status: 'active' },
];

export const CHAT_MESSAGES = [
  { id: 'm1', role: 'user', text: 'What were total sales at Grand Baie yesterday?' },
  { id: 'm2', role: 'ai', text: 'Grand Baie Beach recorded Rs 38,450 in total sales yesterday across 18 transactions. The average basket was Rs 2,136. Top seller was the Reef Pro Sandal Navy (5 units).' },
  { id: 'm3', role: 'user', text: 'Compare that to Port Louis' },
  { id: 'm4', role: 'ai', text: 'Port Louis Central had Rs 52,100 across 24 transactions yesterday (avg basket Rs 2,171). Grand Baie was 26% lower in revenue but had a similar average basket size. Port Louis had more foot traffic.' },
];

export const MARKETPLACE_ITEMS = [
  { id: 'mk1', title: 'Free Reef Sandal', points: 1500, brand: 'Island Surf Co.', image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=200&h=200&fit=crop', redemptions: 23 },
  { id: 'mk2', title: '20% Off Beach Tote', points: 500, brand: 'Tropical Bags', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200&h=200&fit=crop', redemptions: 67 },
  { id: 'mk3', title: 'Free Coffee Voucher', points: 200, brand: 'Café Mauritius', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&h=200&fit=crop', redemptions: 145 },
  { id: 'mk4', title: 'Spa Day Pass', points: 5000, brand: 'Island Wellness', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&h=200&fit=crop', redemptions: 8 },
];

// Navigation structure per role
export const ROLE_SCREENS: Record<string, string[]> = {
  owner: ['home', 'pos', 'inventory', 'loyalty', 'catalogue', 'procurement', 'marketplace', 'warehouse', 'logistics', 'staff', 'shift', 'accountant', 'cash-collect', 'barcode-store', 'chat', 'whatsapp', 'settings'],
  purchaser: ['home', 'procurement', 'warehouse', 'catalogue', 'inventory', 'chat', 'settings'],
  merchandiser: ['home', 'catalogue', 'inventory', 'warehouse', 'barcode-store', 'procurement', 'chat', 'settings'],
  accountant: ['home', 'accountant', 'cash-collect', 'procurement', 'inventory', 'chat', 'settings'],
  supervisor: ['home', 'pos', 'inventory', 'staff', 'shift', 'cash-collect', 'logistics', 'chat', 'settings'],
  cashier: ['home', 'pos', 'loyalty', 'chat'],
  driver: ['home', 'logistics', 'cash-collect', 'chat'],
  staff: ['home', 'pos', 'inventory', 'chat'],
};

export const SCREEN_META: Record<string, { label: string; icon: string; description: string }> = {
  home: { label: 'Dashboard', icon: '🏠', description: 'Overview & KPIs' },
  pos: { label: 'Point of Sale', icon: '💳', description: 'Ring up transactions' },
  inventory: { label: 'Inventory', icon: '📦', description: 'Stock levels & counts' },
  loyalty: { label: 'Loyalty', icon: '❤️', description: 'Customer rewards' },
  catalogue: { label: 'Catalogue', icon: '📄', description: 'Product catalogue & enrichment' },
  procurement: { label: 'Procurement', icon: '📧', description: 'Sourcing & purchase orders' },
  marketplace: { label: 'Marketplace', icon: '🎁', description: 'Loyalty redemption marketplace' },
  warehouse: { label: 'Warehouse', icon: '🏭', description: 'Container receiving & inspection' },
  logistics: { label: 'Logistics', icon: '🚛', description: 'Deliveries & tracking' },
  staff: { label: 'Staff', icon: '👥', description: 'Team management' },
  shift: { label: 'Shifts', icon: '⏰', description: 'Shift planning & clock-in' },
  accountant: { label: 'Accounting', icon: '📊', description: 'Financial reports & reconciliation' },
  'cash-collect': { label: 'Cash Collection', icon: '💰', description: 'Daily cash reconciliation' },
  'barcode-store': { label: 'Barcode My Store', icon: '🏷️', description: 'Shelf scanning & product creation' },
  chat: { label: 'AI Assistant', icon: '🤖', description: 'Ask anything about your business' },
  whatsapp: { label: 'WhatsApp', icon: '💬', description: 'Customer messaging' },
  settings: { label: 'Settings', icon: '⚙️', description: 'App configuration' },
};

export function formatRs(amount: number): string {
  return `Rs ${amount.toLocaleString()}`;
}
