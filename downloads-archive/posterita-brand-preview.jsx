import { useState } from "react";

// ====== POSTERITA DESIGN TOKENS ======
// Directly from the brand guideline
const T = {
  bg: "#F5F2EA",
  paper: "#FFFFFF",
  panel: "#FAFAFA",
  ink: "#141414",
  muted: "#6C6F76",
  line: "#E6E2DA",
  blue: "#1976D2",
  blueL: "#DCEBFF",
  blueD: "#0D5DB3",
  red: "#E53935",
  redL: "#FFF1F0",
  green: "#2E7D32",
  greenL: "#E8F5E9",
  amber: "#F57F17",
  amberL: "#FFF8E1",
  purple: "#5E35B1",
  purpleL: "#EDE7F6",
  font: '"Avenir Next", "SF Pro Display", "Segoe UI", system-ui, sans-serif',
  shadowSm: "0 1px 2px rgba(0,0,0,0.05)",
  shadowLg: "0 24px 70px rgba(0,0,0,0.10)",
  shadowSheet: "0 24px 80px rgba(0,0,0,0.18)",
};

// ====== SAMPLE DATA ======
const products = [
  { id: "1", name: "Reef Pro Sandal Navy", price: 1290, cat: "Footwear", img: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=120&h=120&fit=crop" },
  { id: "2", name: "Canvas Tote Natural", price: 650, cat: "Bags", img: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=120&h=120&fit=crop" },
  { id: "3", name: "Flip Flop Coral M", price: 490, cat: "Footwear", img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=120&h=120&fit=crop" },
  { id: "4", name: "Beach Hat Straw Wide", price: 380, cat: "Accessories", img: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=120&h=120&fit=crop" },
  { id: "5", name: "Dive Mask Pro Clear", price: 2150, cat: "Gear", img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=120&h=120&fit=crop" },
  { id: "6", name: "Board Shorts Blue L", price: 890, cat: "Apparel", img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop" },
  { id: "7", name: "Surf Rash Guard", price: 1450, cat: "Apparel", img: "https://images.unsplash.com/photo-1520256862855-398228c41684?w=120&h=120&fit=crop" },
  { id: "8", name: "Snorkel Set Kids", price: 780, cat: "Gear", img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=120&h=120&fit=crop" },
];

const categories = [
  { id: "all", label: "ALL" },
  { id: "Footwear", label: "FOOTWEAR" },
  { id: "Bags", label: "BAGS" },
  { id: "Accessories", label: "ACCESSORIES" },
  { id: "Gear", label: "GEAR" },
  { id: "Apparel", label: "APPAREL" },
  { id: "more", label: "MORE ..." },
];

function formatMoney(cents) {
  return `Rs ${cents.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

// ====== PHONE: PRODUCT SELECTION ======
function PhonePOS() {
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState([
    { ...products[0], qty: 1 },
    { ...products[1], qty: 2 },
  ]);
  const [showCart, setShowCart] = useState(false);
  const [lastAdded, setLastAdded] = useState(products[1]);

  const filtered = cat === "all" ? products : products.filter((p) => p.cat === cat);
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.15);
  const total = subtotal + tax;

  const addToCart = (p) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...p, qty: 1 }];
    });
    setLastAdded(p);
  };

  const changeQty = (id, delta) => {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0));
  };

  const getQty = (id) => {
    const item = cart.find((i) => i.id === id);
    return item ? item.qty : 0;
  };

  return (
    <div style={{ width: 420, background: "linear-gradient(180deg, #1f2733 0%, #0f1218 100%)", borderRadius: 38, padding: 12, boxShadow: "0 28px 60px rgba(15,17,21,0.24)", flexShrink: 0 }}>
      <div style={{ background: T.paper, borderRadius: 30, minHeight: 820, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
        {/* Status bar */}
        <div style={{ height: 36, padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700, color: T.muted, background: T.paper }}>
          <span>09:41</span>
          <span>Posterita POS</span>
        </div>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 6px", background: T.panel, borderBottom: `1px solid ${T.line}` }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center" }}>
            <div style={{ width: 18, display: "grid", gap: 4 }}>
              <span style={{ display: "block", height: 2, borderRadius: 999, background: "#25262a" }} />
              <span style={{ display: "block", height: 2, borderRadius: 999, background: "#25262a" }} />
              <span style={{ display: "block", height: 2, borderRadius: 999, background: "#25262a" }} />
            </div>
          </div>
          <div style={{ minWidth: 48, textAlign: "center", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{totalQty}X</div>
          <div style={{ width: 1, alignSelf: "stretch", background: "#e0e0e0" }} />
          {lastAdded && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <img src={lastAdded.img} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lastAdded.name}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.blue }}>{formatMoney(lastAdded.price)}</div>
              </div>
              <button style={{ height: 40, padding: "0 12px", borderRadius: 12, border: `1px solid ${T.line}`, background: T.paper, color: T.red, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>UNDO</button>
            </div>
          )}
        </div>

        {/* Order type */}
        <div style={{ display: "flex", gap: 6, padding: "6px 10px", background: T.panel }}>
          {["DINE IN", "TAKE AWAY"].map((label, i) => (
            <button key={label} style={{ flex: 1, height: 46, borderRadius: 14, fontSize: 13, fontWeight: 800, border: `1px solid ${i === 0 ? T.blue : "#d8d8d8"}`, background: i === 0 ? T.blue : T.paper, color: i === 0 ? "#fff" : "#222", cursor: "pointer" }}>{label}</button>
          ))}
        </div>

        {/* Categories */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: 8, background: "#f3f3f3", borderBottom: `1px solid ${T.line}` }}>
          {categories.map((c) => (
            <button key={c.id} onClick={() => c.id !== "more" && setCat(c.id)} style={{ height: 38, borderRadius: 12, border: `1px solid ${cat === c.id ? T.blue : "#d7d7d7"}`, background: cat === c.id ? T.blue : T.paper, color: cat === c.id ? "#fff" : T.ink, fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 8px" }}>{c.label}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: 8, background: T.paper, borderBottom: `1px solid ${T.line}` }}>
          <input type="text" placeholder="Search product" readOnly style={{ height: 42, borderRadius: 14, border: `1px solid ${T.line}`, background: T.paper, padding: "0 14px", width: "100%", fontFamily: T.font, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, alignContent: "start", background: T.paper }}>
          {filtered.map((p) => {
            const qty = getQty(p.id);
            return (
              <button key={p.id} onClick={() => addToCart(p)} style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", minHeight: 68, alignItems: "stretch", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, overflow: "hidden", background: T.paper, position: "relative", boxShadow: T.shadowSm, cursor: "pointer", textAlign: "left", padding: 0 }}>
                <img src={p.img} alt="" style={{ width: 56, height: "100%", objectFit: "cover" }} />
                <div style={{ padding: "7px 8px 7px 6px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.blue }}>{formatMoney(p.price)}</div>
                  {qty > 0 && <div style={{ fontSize: 12, color: "#8a8a8a" }}>{qty}x in cart</div>}
                </div>
                {qty > 0 && (
                  <span style={{ position: "absolute", top: 4, right: 4, minWidth: 22, padding: "2px 6px", borderRadius: 999, background: T.blue, color: "#fff", fontSize: 11, fontWeight: 800, textAlign: "center" }}>{qty}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom buttons */}
        <div style={{ display: "grid", gap: 6, padding: 6, background: T.paper, borderTop: `1px solid ${T.line}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {["CLEAR", "SEARCH", "MORE"].map((label) => (
              <button key={label} style={{ height: 48, borderRadius: 14, border: "1px solid #d8d8d8", background: T.paper, fontSize: 12, fontWeight: 800, color: label === "CLEAR" ? T.red : "#222", cursor: "pointer" }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 6 }}>
            <button style={{ height: 48, borderRadius: 14, border: "1px solid #d8d8d8", background: T.paper, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>SCAN</button>
            <button style={{ height: 48, borderRadius: 14, border: "1px solid #d8d8d8", background: T.paper, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>CUST</button>
            <button onClick={() => setShowCart(true)} style={{ position: "relative", height: 48, borderRadius: 14, background: T.blue, color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", border: "none", cursor: "pointer" }}>
              MY CART <span style={{ fontSize: 22, verticalAlign: "middle", marginLeft: 4 }}>›</span>
              {totalQty > 0 && (
                <span style={{ position: "absolute", right: -8, top: -8, minWidth: 24, minHeight: 24, padding: "2px 7px", borderRadius: 999, background: T.red, color: "#fff", fontSize: 12, fontWeight: 800, display: "inline-grid", placeItems: "center" }}>{totalQty}</span>
              )}
            </button>
          </div>
        </div>

        {/* Cart overlay */}
        {showCart && (
          <div style={{ position: "absolute", inset: "64px 8px 8px", borderRadius: 22, background: T.paper, boxShadow: T.shadowSheet, border: "1px solid rgba(0,0,0,0.08)", display: "grid", gridTemplateRows: "auto 1fr auto auto", overflow: "hidden", zIndex: 30 }}>
            <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.line}`, fontWeight: 800, fontSize: 18 }}>
              <span>Cart ({totalQty})</span>
              <button onClick={() => setShowCart(false)} style={{ width: 36, height: 36, borderRadius: 12, background: "#f5f5f5", fontSize: 18, fontWeight: 800, border: "none", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ overflow: "auto", padding: "8px 0" }}>
              {cart.map((item) => (
                <div key={item.id} style={{ margin: 5, padding: 6, borderRadius: 10, border: "1px solid rgba(0,0,0,0.06)", display: "grid", gridTemplateColumns: "50px 1fr auto", gap: 8, alignItems: "start" }}>
                  <img src={item.img} alt="" style={{ width: 50, height: 60, objectFit: "cover", borderRadius: 8 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                    <div style={{ marginTop: 6, fontSize: 17, color: T.blue, fontWeight: 800, textDecoration: "underline" }}>{formatMoney(item.price)}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: "#7c8088" }}>Discount / note / modifiers appear here</div>
                  </div>
                  <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                    <button onClick={() => changeQty(item.id, -item.qty)} style={{ width: 40, height: 40, borderRadius: 12, background: "#faf5f5", color: T.red, fontSize: 18, fontWeight: 900, border: "none", cursor: "pointer" }}>×</button>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                      <button onClick={() => changeQty(item.id, -1)} style={{ width: 38, height: 38, borderRadius: 999, background: "#f2f2f2", fontSize: 20, fontWeight: 700, border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>−</button>
                      <div style={{ minWidth: 28, textAlign: "center", fontSize: 22, fontWeight: 800 }}>{item.qty}</div>
                      <button onClick={() => changeQty(item.id, 1)} style={{ width: 38, height: 38, borderRadius: 999, background: "#f2f2f2", fontSize: 20, fontWeight: 700, border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.line}`, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>Sub Total</span><strong>{formatMoney(subtotal)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>Tax Total</span><strong>{formatMoney(tax)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800 }}><span>Total (x{totalQty})</span><strong>{formatMoney(total)}</strong></div>
            </div>
            <div style={{ padding: "14px 16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button style={{ height: 52, borderRadius: 14, fontSize: 14, fontWeight: 800, border: "1px solid #d8d8d8", background: T.paper, cursor: "pointer" }}>HOLD</button>
              <button style={{ height: 52, borderRadius: 14, fontSize: 14, fontWeight: 800, background: T.blue, color: "#fff", border: `1px solid ${T.blue}`, cursor: "pointer" }}>PAY</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ====== TABLET: SPLIT VIEW ======
function TabletPOS() {
  const cart = [
    { ...products[0], qty: 1 },
    { ...products[1], qty: 2 },
    { ...products[2], qty: 1 },
  ];
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.15);
  const total = subtotal + tax;

  return (
    <div style={{ background: "#f8f8f8", borderRadius: 28, border: "1px solid rgba(0,0,0,0.06)", boxShadow: T.shadowLg, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "62% 38%", minHeight: 600 }}>
        {/* Left: Products */}
        <div style={{ display: "grid", gridTemplateRows: "auto auto auto 1fr auto", borderRight: "1px solid #d8d8d8", background: T.paper }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 4px", background: T.panel, borderBottom: `1px solid ${T.line}` }}>
            <div style={{ width: 40, height: 40, display: "grid", placeItems: "center" }}>
              <div style={{ width: 16, display: "grid", gap: 3 }}>
                <span style={{ display: "block", height: 2, borderRadius: 999, background: "#25262a" }} />
                <span style={{ display: "block", height: 2, borderRadius: 999, background: "#25262a" }} />
                <span style={{ display: "block", height: 2, borderRadius: 999, background: "#25262a" }} />
              </div>
            </div>
            <div style={{ minWidth: 40, textAlign: "center", fontSize: 20, fontWeight: 800 }}>{totalQty}X</div>
            <div style={{ width: 1, alignSelf: "stretch", background: "#e0e0e0" }} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <img src={products[2].img} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{products[2].name}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.blue }}>{formatMoney(products[2].price)}</div>
              </div>
              <button style={{ height: 28, padding: "0 10px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.paper, color: T.red, fontSize: 10, fontWeight: 800, cursor: "pointer" }}>UNDO</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, padding: "4px 8px", background: T.panel }}>
            {["DINE IN", "TAKE AWAY"].map((l, i) => (
              <button key={l} style={{ flex: 1, height: 32, borderRadius: 10, fontSize: 12, fontWeight: 800, border: `1px solid ${i === 0 ? T.blue : "#d8d8d8"}`, background: i === 0 ? T.blue : T.paper, color: i === 0 ? "#fff" : "#222", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: "5px 8px", background: "#f0f0f0", borderBottom: `1px solid ${T.line}` }}>
            {categories.slice(0, 7).map((c, i) => (
              <button key={c.id} style={{ height: 32, borderRadius: 10, border: `1px solid ${i === 0 ? T.blue : "#d7d7d7"}`, background: i === 0 ? T.blue : T.paper, color: i === 0 ? "#fff" : T.ink, fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 6px" }}>{c.label}</button>
            ))}
          </div>
          <div style={{ overflow: "auto", padding: 4, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, alignContent: "start", background: T.paper }}>
            {products.map((p) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr", minHeight: 54, border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, overflow: "hidden", background: T.paper, boxShadow: T.shadowSm }}>
                <img src={p.img} alt="" style={{ width: 48, height: "100%", objectFit: "cover" }} />
                <div style={{ padding: "5px 6px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.blue }}>{formatMoney(p.price)}</div>
                  <div style={{ fontSize: 10, color: "#8a8a8a" }}>Tap to add</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, padding: 4, background: T.paper, borderTop: `1px solid ${T.line}` }}>
            {["CLEAR", "SEARCH", "MORE", "SCAN"].map((l) => (
              <button key={l} style={{ flex: 1, height: 34, borderRadius: 10, border: "1px solid #d8d8d8", background: T.paper, fontSize: 11, fontWeight: 800, color: l === "CLEAR" ? T.red : "#222", cursor: "pointer" }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto auto", background: T.paper }}>
          <div style={{ padding: "12px 14px 8px", textAlign: "center", fontWeight: 800, fontSize: 16, borderBottom: `1px solid ${T.line}` }}>Cart ({totalQty})</div>
          <div style={{ overflow: "auto", borderTop: "1px solid #e6e6e6", borderBottom: "1px solid #e6e6e6" }}>
            {cart.map((item) => (
              <div key={item.id} style={{ padding: "8px 10px 4px", borderBottom: "1px solid #f0f0f0", display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                  <div style={{ marginTop: 2, fontSize: 15, color: T.blue, fontWeight: 800 }}>{formatMoney(item.price)} × {item.qty}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#7c8088", paddingBottom: 4 }}>Tap line for edit dialog</div>
                </div>
                <button style={{ width: 28, height: 28, borderRadius: 8, background: "#faf5f5", color: T.red, fontSize: 16, fontWeight: 900, border: "none", cursor: "pointer", marginTop: 2 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 12px", display: "grid", gap: 5, borderTop: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>Sub Total</span><strong>{formatMoney(subtotal)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>Tax Total</span><strong>{formatMoney(tax)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800 }}><span>Total (x{totalQty})</span><strong>{formatMoney(total)}</strong></div>
          </div>
          <div style={{ padding: "10px 12px 12px", display: "grid", gap: 8 }}>
            <button style={{ height: 44, borderRadius: 14, fontSize: 14, fontWeight: 800, border: "1px solid #d8d8d8", background: T.paper, cursor: "pointer" }}>HOLD</button>
            <button style={{ height: 44, borderRadius: 14, fontSize: 14, fontWeight: 800, background: T.blue, color: "#fff", border: `1px solid ${T.blue}`, cursor: "pointer" }}>PAY</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== WEB CONSOLE: DASHBOARD ======
function WebDashboard() {
  return (
    <div style={{ background: T.paper, borderRadius: 24, border: `1px solid rgba(255,255,255,0.6)`, boxShadow: T.shadowLg, overflow: "hidden" }}>
      <div style={{ display: "flex", minHeight: 480 }}>
        {/* Sidebar */}
        <div style={{ width: 200, background: T.bg, borderRight: `1px solid ${T.line}`, padding: "16px 0" }}>
          <div style={{ padding: "0 16px 16px", fontSize: 15, fontWeight: 800, color: T.blue, letterSpacing: "-0.02em" }}>Posterita</div>
          {["Dashboard", "Devices", "Users & Roles", "Stores", "Products", "Reconciliation", "Approvals", "Staff Ops", "Loyalty", "Audit Trail", "AI Tasks"].map((item, i) => (
            <div key={item} style={{ padding: "8px 16px", fontSize: 13, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? T.blue : T.muted, background: i === 0 ? T.blueL : "transparent", borderRight: i === 0 ? `3px solid ${T.blue}` : "3px solid transparent", cursor: "pointer" }}>{item}</div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "20px 24px", background: T.bg }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Dashboard</div>
            <div style={{ fontSize: 13, color: T.muted }}>All stores · Today</div>
          </div>

          {/* Metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "TOTAL SALES", value: "Rs 312,450", sub: "+12% vs yesterday", color: T.blue },
              { label: "ORDERS", value: "183", sub: "Across 4 stores" },
              { label: "PENDING", value: "7", sub: "3 leave · 2 expense · 2 recon", color: T.amber },
              { label: "DEVICES", value: "14 / 16", sub: "2 stale heartbeat" },
            ].map((m) => (
              <div key={m.label} style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(14px)", borderRadius: 16, padding: "16px 18px", border: `1px solid rgba(255,255,255,0.6)`, boxShadow: T.shadowSm }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: "0.06em", marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: m.color || T.ink, letterSpacing: "-0.02em" }}>{m.value}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Two panels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(14px)", borderRadius: 16, padding: 18, border: `1px solid rgba(255,255,255,0.6)` }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Reconciliation alerts</div>
              {[
                { store: "Grand Baie", diff: "- Rs 1,240", status: "Unresolved", color: T.red, bg: T.redL },
                { store: "Port Louis", diff: "+ Rs 350", status: "Under review", color: T.amber, bg: T.amberL },
                { store: "Curepipe", diff: "Rs 0", status: "Clean", color: T.green, bg: T.greenL },
                { store: "Flic en Flac", diff: "- Rs 680", status: "Unresolved", color: T.red, bg: T.redL },
              ].map((r, i) => (
                <div key={r.store} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 3 ? `1px solid ${T.line}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.store}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{r.diff}</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: r.bg, color: r.color, fontSize: 11, fontWeight: 800 }}>{r.status}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(14px)", borderRadius: 16, padding: 18, border: `1px solid rgba(255,255,255,0.6)` }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Pending approvals</div>
              {[
                { who: "Ravi P.", type: "Annual leave", detail: "22–26 Apr · 5 days" },
                { who: "Amina K.", type: "Expense claim", detail: "Rs 2,400 · Transport" },
                { who: "Jean-Luc M.", type: "Sick leave", detail: "Today · Doctor's note" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${T.line}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{a.who} · {a.type}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{a.detail}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ padding: "5px 12px", borderRadius: 10, background: T.greenL, color: T.green, fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer" }}>Approve</button>
                    <button style={{ padding: "5px 12px", borderRadius: 10, background: T.redL, color: T.red, fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer" }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== MAIN PREVIEW ======
export default function BrandPreview() {
  const [view, setView] = useState("phone");

  return (
    <div style={{ fontFamily: T.font, color: T.ink }}>
      {/* View switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          ["phone", "Phone POS"],
          ["tablet", "Tablet split"],
          ["web", "Web console"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 14,
              border: `1px solid ${view === key ? T.ink : T.line}`,
              background: view === key ? T.ink : T.paper,
              color: view === key ? "#fff" : T.ink,
              fontFamily: T.font,
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Screens */}
      {view === "phone" && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <PhonePOS />
        </div>
      )}

      {view === "tablet" && <TabletPOS />}

      {view === "web" && <WebDashboard />}

      <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 16, border: `1px solid ${T.line}`, background: "rgba(255,255,255,0.82)", fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
        <strong style={{ color: T.ink }}>Brand direction preview</strong> — 3 screens using the Posterita design tokens. Phone POS matches your existing ProductActivity layout exactly (hamburger, cart count, last-added, undo, order type, category chips, 2-col product grid, bottom action bar, cart sheet overlay). Tap products to add, open MY CART to see the sheet. Tablet shows the 62/38 split view. Web console shows glassmorphism cards on warm canvas.
      </div>
    </div>
  );
}
