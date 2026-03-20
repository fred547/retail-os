import { useState } from 'react';
import { useStore } from '@/lib/store';
import { PRODUCTS, CATEGORIES, CUSTOMERS, formatRs } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Search, Plus, Minus, Trash2, User, X, ShoppingBag, CreditCard, Banknote, QrCode, Receipt } from 'lucide-react';

export default function POSScreen() {
  const { surface, cart, addToCart, removeFromCart, updateCartQty, clearCart, cartCustomer, setCartCustomer } = useStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [customerSearch, setCustomerSearch] = useState(false);

  const isTablet = surface === 'tablet';
  const filteredProducts = PRODUCTS.filter(p => {
    const matchCat = !activeCategory || p.category === activeCategory;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  if (showReceipt) {
    return (
      <div className="p-4 flex flex-col items-center">
        <div className="w-full max-w-xs bg-white rounded-xl border border-border p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="text-lg font-extrabold text-foreground">Payment Complete</h3>
          <p className="text-sm text-muted-foreground mt-1">Sale #1048</p>
          <div className="border-t border-dashed border-border my-4" />
          {cart.map(item => (
            <div key={item.id} className="flex justify-between text-xs py-1">
              <span className="text-foreground font-medium">{item.qty}x {item.name}</span>
              <span className="font-bold">{formatRs(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-border my-4" />
          <div className="flex justify-between text-sm font-extrabold">
            <span>Total</span>
            <span>{formatRs(cartTotal)}</span>
          </div>
          {cartCustomer && <p className="text-xs text-posterita-blue font-semibold mt-2">+{Math.floor(cartTotal / 10)} loyalty points earned</p>}
          <button onClick={() => { clearCart(); setShowReceipt(false); setShowPayment(false); setShowCart(false); }} className="w-full mt-4 bg-posterita-blue text-white font-bold text-sm py-3 rounded-xl">New Sale</button>
        </div>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold">Payment</h3>
          <button onClick={() => setShowPayment(false)} className="p-2 rounded-lg hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <p className="text-sm text-muted-foreground">Total Due</p>
          <p className="text-3xl font-extrabold text-foreground">{formatRs(cartTotal)}</p>
          {cartCustomer && <p className="text-xs text-posterita-blue font-semibold mt-1">{cartCustomer} \u00b7 +{Math.floor(cartTotal / 10)} pts</p>}
        </div>
        <div className="space-y-2">
          {[{ icon: <Banknote size={18} />, label: 'Cash', color: 'bg-posterita-green' },
            { icon: <CreditCard size={18} />, label: 'Card (Blink)', color: 'bg-posterita-blue' },
            { icon: <QrCode size={18} />, label: 'Juice / MCB QR', color: 'bg-posterita-teal' },
          ].map(method => (
            <button key={method.label} onClick={() => setShowReceipt(true)} className={cn("w-full flex items-center gap-3 p-4 rounded-xl text-white font-bold text-sm", method.color)}>
              {method.icon}
              <span>Pay with {method.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const ProductGrid = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products or scan..." className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-posterita-blue/30" />
        </div>
      </div>
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto posterita-scroll">
        <button onClick={() => setActiveCategory(null)} className={cn("px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors", !activeCategory ? "bg-posterita-blue text-white" : "bg-card border border-border text-foreground")}>All</button>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={cn("px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1", activeCategory === cat.id ? "bg-posterita-blue text-white" : "bg-card border border-border text-foreground")}>
            <span>{cat.emoji}</span>{cat.name}
          </button>
        ))}
      </div>
      <div className={cn("flex-1 overflow-y-auto posterita-scroll px-3 pb-3", isTablet ? "grid grid-cols-4 gap-2 auto-rows-min" : "grid grid-cols-3 gap-2 auto-rows-min")}>
        {filteredProducts.map(product => (
          <button key={product.id} onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, sku: product.sku, image: product.image })} className="bg-card rounded-xl border border-border p-2 hover:border-posterita-blue/30 hover:shadow-sm transition-all text-left group">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-1.5">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <p className="text-[11px] font-bold text-foreground leading-tight truncate">{product.name}</p>
            <p className="text-[11px] font-extrabold text-posterita-blue">{formatRs(product.price)}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const CartPanel = ({ embedded = false }: { embedded?: boolean }) => (
    <div className={cn("flex flex-col h-full", !embedded && "p-4")}>
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-extrabold">Cart ({cartCount})</h3>
        {!embedded && <button onClick={() => setShowCart(false)} className="p-1.5 rounded-lg hover:bg-accent"><X size={16} /></button>}
        {cart.length > 0 && <button onClick={clearCart} className="text-[11px] font-bold text-posterita-red">Clear</button>}
      </div>
      <div className="px-3 mb-2">
        {cartCustomer ? (
          <div className="flex items-center gap-2 bg-posterita-blue/10 rounded-lg px-3 py-2">
            <User size={14} className="text-posterita-blue" />
            <span className="text-xs font-bold text-posterita-blue flex-1">{cartCustomer}</span>
            <button onClick={() => setCartCustomer(null)}><X size={12} className="text-posterita-blue" /></button>
          </div>
        ) : (
          <button onClick={() => setCustomerSearch(!customerSearch)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-posterita-blue/30">
            <User size={14} /> Link Customer
          </button>
        )}
        {customerSearch && !cartCustomer && (
          <div className="mt-1 bg-card border border-border rounded-lg shadow-lg">
            {CUSTOMERS.slice(0, 4).map(c => (
              <button key={c.id} onClick={() => { setCartCustomer(c.name); setCustomerSearch(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent text-xs">
                <span className="font-bold">{c.name}</span>
                <span className="text-muted-foreground">{c.tier}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll px-3">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag size={32} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground font-semibold">Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-2 bg-card rounded-lg border border-border p-2">
                {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate">{item.name}</p>
                  <p className="text-[11px] font-extrabold text-posterita-blue">{formatRs(item.price * item.qty)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center"><Minus size={12} /></button>
                  <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                  <button onClick={() => updateCartQty(item.id, item.qty + 1)} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center"><Plus size={12} /></button>
                  <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-posterita-red"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="px-3 py-3 border-t border-border">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-bold text-muted-foreground">Total</span>
            <span className="text-lg font-extrabold text-foreground">{formatRs(cartTotal)}</span>
          </div>
          <button onClick={() => setShowPayment(true)} className="w-full bg-posterita-blue text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2">
            <Receipt size={16} /> Charge {formatRs(cartTotal)}
          </button>
        </div>
      )}
    </div>
  );

  if (isTablet) {
    return (
      <div className="h-full flex">
        <div className="flex-[62] border-r border-border flex flex-col min-h-0"><ProductGrid /></div>
        <div className="flex-[38] flex flex-col min-h-0"><CartPanel embedded /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative" style={{ minHeight: '100%', height: '100%' }}>
      {showCart ? <CartPanel /> : (
        <>
          <ProductGrid />
          {cartCount > 0 && (
            <button onClick={() => setShowCart(true)} className="absolute bottom-4 left-4 right-4 bg-posterita-blue text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg">
              <ShoppingBag size={16} /> View Cart ({cartCount}) \u00b7 {formatRs(cartTotal)}
            </button>
          )}
        </>
      )}
    </div>
  );
}
