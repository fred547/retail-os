import { useState, useEffect, useRef } from "react";

// ═══════════ BRAND TOKENS ═══════════
const T = {
  bg: "#F5F2EA", paper: "#FFFFFF", ink: "#141414", muted: "#6C6F76",
  line: "#E6E2DA", blue: "#1976D2", blueL: "#DCEBFF", blueD: "#1565C0",
  red: "#E53935", green: "#2E7D32", greenL: "#E8F5E9", amber: "#F57F17",
  amberL: "#FFF8E1", purple: "#5E35B1", purpleL: "#EDE7F6",
  teal: "#00838F", tealL: "#E0F7FA", orange: "#FF6F00", orangeL: "#FFF3E0",
  brown: "#5D4037", brownL: "#EFEBE9", pink: "#AD1457", pinkL: "#FCE4EC",
  radius: "14px", radiusXl: "24px",
};

// ═══════════ ICONS ═══════════
const Icon = ({ name, size = 20, color = T.ink }) => {
  const icons = {
    back: <path d="M15 19l-7-7 7-7" strokeWidth="2" stroke={color} fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    pos: <><rect x="3" y="3" width="18" height="18" rx="3" fill={color} opacity=".12"/><path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 15h4" stroke={color} strokeWidth="1.5" fill="none"/></>,
    inventory: <><rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M3 9h18M9 9v10" stroke={color} strokeWidth="1.5"/></>,
    loyalty: <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color}/>,
    staff: <><circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.5" fill="none"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.5" fill="none"/></>,
    chat: <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth="1.5" fill="none"/></>,
    truck: <><rect x="1" y="3" width="15" height="13" rx="1" stroke={color} strokeWidth="1.5" fill="none"/><path d="M16 8h4l3 3v5h-7V8zM5.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke={color} strokeWidth="1.5" fill="none"/></>,
    warehouse: <><path d="M3 21V9l9-6 9 6v12" stroke={color} strokeWidth="1.5" fill="none"/><rect x="8" y="13" width="8" height="8" stroke={color} strokeWidth="1.5" fill="none"/></>,
    barcode: <><path d="M3 5v-2h4M3 19v2h4M17 5V3h4v2M17 21v-2h4v2M7 7v10M11 7v10M15 7v6M9 7v10M13 7v10" stroke={color} strokeWidth="1.5" fill="none"/></>,
    qr: <><rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth="1.5" fill="none"/><rect x="14" y="14" width="4" height="4" stroke={color} strokeWidth="1.5" fill="none"/></>,
    camera: <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="1.5" fill="none"/><circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.5" fill="none"/></>,
    check: <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    x: <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>,
    edit: <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="1.5" fill="none"/>,
    dollar: <><line x1="12" y1="1" x2="12" y2="23" stroke={color} strokeWidth="1.5"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke={color} strokeWidth="1.5" fill="none"/></>,
    whatsapp: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill={color}/>,
    star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color}/>,
    printer: <><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke={color} strokeWidth="1.5" fill="none"/><rect x="6" y="14" width="12" height="8" stroke={color} strokeWidth="1.5" fill="none"/></>,
    doc: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth="1.5" fill="none"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="1.5"/></>,
    shift: <><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 6v6l4 2" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/></>,
    settings: <><circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="1.5" fill="none"/></>,
    cart: <><circle cx="9" cy="21" r="1" fill={color}/><circle cx="20" cy="21" r="1" fill={color}/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" stroke={color} strokeWidth="1.5" fill="none"/></>,
    gift: <><rect x="3" y="8" width="18" height="4" stroke={color} strokeWidth="1.5" fill="none"/><rect x="5" y="12" width="14" height="8" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 8v12M3 10h18M7.5 8a2.5 2.5 0 010-5C9 3 12 8 12 8M16.5 8a2.5 2.5 0 000-5C15 3 12 8 12 8" stroke={color} strokeWidth="1.5" fill="none"/></>,
    chart: <><path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth="2" strokeLinecap="round"/></>,
    search: <><circle cx="11" cy="11" r="8" stroke={color} strokeWidth="1.5" fill="none"/><path d="M21 21l-4.35-4.35" stroke={color} strokeWidth="1.5"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M22 6l-10 7L2 6" stroke={color} strokeWidth="1.5" fill="none"/></>,
    globe: <><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke={color} strokeWidth="1.5" fill="none"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.5" fill="none"/><path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" fill="none"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24">{icons[name] || icons.doc}</svg>;
};

// ═══════════ SHARED COMPONENTS ═══════════
const Btn = ({ children, onClick, variant = "primary", full, small, disabled, icon }) => {
  const styles = {
    primary: { background: T.blue, color: "#fff" },
    secondary: { background: T.blueL, color: T.blue },
    danger: { background: T.red, color: "#fff" },
    ghost: { background: "transparent", color: T.blue, border: `1px solid ${T.line}` },
    success: { background: T.green, color: "#fff" },
    whatsapp: { background: "#25D366", color: "#fff" },
    amber: { background: T.amber, color: "#fff" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      ...styles[variant], borderRadius: T.radius, border: styles[variant].border || "none",
      padding: small ? "8px 14px" : "13px 24px", fontSize: small ? "12px" : "14px",
      fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", width: full ? "100%" : "auto",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      opacity: disabled ? 0.4 : 1, letterSpacing: "0.3px", transition: "all .15s",
    }}>
      {icon && <Icon name={icon} size={small ? 16 : 18} color={styles[variant].color} />}
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", large }) => (
  <div style={{ marginBottom: "16px" }}>
    {label && <div style={{ fontSize: "13px", color: T.muted, marginBottom: "6px", fontWeight: 600 }}>{label}</div>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: large ? "16px" : "12px", borderRadius: T.radius,
        border: `1.5px solid ${T.line}`, fontSize: large ? "20px" : "15px", fontWeight: large ? 700 : 400,
        background: T.paper, color: T.ink, outline: "none", boxSizing: "border-box",
      }}
    />
  </div>
);

const Card = ({ children, onClick, style }) => (
  <div onClick={onClick} style={{
    background: T.paper, borderRadius: T.radiusXl, padding: "16px",
    border: `1px solid ${T.line}`, cursor: onClick ? "pointer" : "default",
    transition: "all .15s", ...style,
  }}>{children}</div>
);

const Badge = ({ count, color = T.red }) => count > 0 ? (
  <span style={{ background: color, color: "#fff", borderRadius: "99px", padding: "2px 7px",
    fontSize: "11px", fontWeight: 800, minWidth: "18px", textAlign: "center", display: "inline-block" }}>{count}</span>
) : null;

const TopBar = ({ title, onBack, right, subtitle }) => (
  <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", background: T.paper,
    borderBottom: `1px solid ${T.line}`, position: "sticky", top: 0, zIndex: 10 }}>
    {onBack && <div onClick={onBack} style={{ cursor: "pointer", marginRight: "12px" }}><Icon name="back" /></div>}
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "16px", fontWeight: 800, color: T.ink }}>{title}</div>
      {subtitle && <div style={{ fontSize: "11px", color: T.muted }}>{subtitle}</div>}
    </div>
    {right}
  </div>
);

const WhatsAppMsg = ({ from, children, time = "14:32", isMe }) => (
  <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: "8px" }}>
    <div style={{ maxWidth: "85%", background: isMe ? "#DCF8C6" : "#fff", borderRadius: "12px",
      padding: "8px 12px", fontSize: "12px", lineHeight: 1.5, boxShadow: "0 1px 1px #0001" }}>
      {from && <div style={{ fontSize: "11px", fontWeight: 700, color: "#075E54", marginBottom: "2px" }}>{from}</div>}
      {children}
      <div style={{ fontSize: "9px", color: "#999", textAlign: "right", marginTop: "4px" }}>{time}</div>
    </div>
  </div>
);

const WAButton = ({ children, onClick }) => (
  <div onClick={onClick} style={{ textAlign: "center", color: "#00A5F4", fontSize: "12px", fontWeight: 600, padding: "6px", cursor: "pointer", borderTop: "1px solid #e8e8e8" }}>{children}</div>
);

const StatusPill = ({ status, color }) => (
  <span style={{ background: color + "18", color, fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "99px" }}>{status}</span>
);

const ProgressBar = ({ value, max, color = T.blue }) => (
  <div style={{ height: "6px", background: T.line, borderRadius: "3px", overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: "3px", transition: "width .3s" }} />
  </div>
);

const ListRow = ({ left, title, sub, right, onClick }) => (
  <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: `1px solid ${T.line}`, cursor: onClick ? "pointer" : "default" }}>
    {left}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "14px", fontWeight: 600, color: T.ink }}>{title}</div>
      {sub && <div style={{ fontSize: "11px", color: T.muted, marginTop: "2px" }}>{sub}</div>}
    </div>
    {right}
  </div>
);

// ═══════════ SCREEN: ONBOARDING ═══════════
const OnboardingScreen = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("+230 ");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [aiReviewIdx, setAiReviewIdx] = useState(0);
  const [approvedCount, setApproved] = useState(0);
  const [pin, setPin] = useState("");

  const cats = ["Fashion & Apparel", "Footwear", "Electronics", "Food & Beverage", "Health & Beauty", "Sports & Outdoor", "Home & Living"];
  const aiProducts = [
    { name: "Beach Sandal Classic", price: "Rs 890", cat: "Footwear", desc: "Essential open-toe sandal for the tropical lifestyle." },
    { name: "Reef Pro Sandal Navy", price: "Rs 1,290", cat: "Footwear", desc: "Durable reef sandal with reinforced grip sole." },
    { name: "Flip Flop Coral M", price: "Rs 490", cat: "Footwear", desc: "Lightweight flip flop in vibrant coral." },
    { name: "Canvas Tote Natural", price: "Rs 650", cat: "Bags", desc: "Reusable canvas tote, perfect for beach or market." },
    { name: "UV Protection Sunglasses", price: "Rs 1,450", cat: "Accessories", desc: "Polarized lenses with UV400 protection." },
    { name: "Surf Rash Guard", price: "Rs 2,100", cat: "Apparel", desc: "Quick-dry, UPF 50+ sun protection for water sports." },
  ];
  const setupSteps = [
    { label: "Creating your store...", done: true }, { label: "Building products...", done: step >= 7 },
    { label: "Setting up loyalty...", done: step >= 7 },
  ];

  const steps = [
    // Step 0: Phone
    <div key={0} style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>Welcome to Posterita</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "24px" }}>What's your mobile number?</div>
      <Input large value={phone} onChange={setPhone} placeholder="+230 5XXX XXXX" />
      <div style={{ fontSize: "11px", color: T.muted, marginBottom: "20px" }}>We'll send a code via WhatsApp</div>
      <Btn full onClick={() => setStep(1)}>Next →</Btn>
    </div>,
    // Step 1: OTP
    <div key={1} style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Enter the code</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "20px" }}>sent to {phone}</div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "24px" }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ width: "40px", height: "48px", borderRadius: "10px", border: `2px solid ${otp.length > i ? T.blue : T.line}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 800, background: T.paper }}>
            {otp[i] || ""}
          </div>
        ))}
      </div>
      <Btn full onClick={() => { setOtp("583921"); setTimeout(() => setStep(2), 300); }}>Verify</Btn>
      <div style={{ fontSize: "11px", color: T.blue, marginTop: "12px", cursor: "pointer" }}>Resend via WhatsApp</div>
    </div>,
    // Step 2: Name
    <div key={2} style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "20px" }}>What's your name?</div>
      <Input large value={name} onChange={setName} placeholder="Your name" />
      <Btn full onClick={() => { setName(name || "Fred"); setStep(3); }}>Next →</Btn>
    </div>,
    // Step 3: Brand
    <div key={3} style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>What's your brand called?</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "20px" }}>This is what customers see</div>
      <Input large value={brand} onChange={setBrand} placeholder="Brand name" />
      <Btn full onClick={() => { setBrand(brand || "Funky Fish"); setStep(4); }}>Next →</Btn>
    </div>,
    // Step 4: Location
    <div key={4} style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Where's your first store?</div>
      <Input large value={location} onChange={setLocation} placeholder="e.g. Grand Baie, Mauritius" />
      <Btn full onClick={() => { setLocation(location || "Grand Baie, Mauritius"); setStep(5); }}>Next →</Btn>
    </div>,
    // Step 5: Category
    <div key={5} style={{ padding: "24px 20px" }}>
      <div style={{ fontSize: "18px", fontWeight: 800, textAlign: "center", marginBottom: "20px" }}>What do you sell?</div>
      {cats.map(c => (
        <div key={c} onClick={() => { setCategory(c); setStep(6); }} style={{
          padding: "14px 16px", borderRadius: T.radius, border: `1.5px solid ${category === c ? T.blue : T.line}`,
          marginBottom: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
          background: category === c ? T.blueL : T.paper,
        }}>{c}</div>
      ))}
    </div>,
    // Step 6: AI Building
    <div key={6} style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "32px", marginBottom: "8px" }}>✨</div>
      <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "4px" }}>Setting up {brand || "Funky Fish"}</div>
      <div style={{ marginTop: "24px" }}>
        {setupSteps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", justifyContent: "center" }}>
            <span style={{ color: s.done ? T.green : T.muted }}>{s.done ? "✓" : "⟳"}</span>
            <span style={{ fontSize: "14px", color: s.done ? T.ink : T.muted }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: "12px", color: T.muted, marginTop: "20px" }}>AI is generating a starter catalogue</div>
      <div style={{ marginTop: "24px" }}><Btn full onClick={() => setStep(7)}>Continue</Btn></div>
    </div>,
    // Step 7: AI Product Review
    <div key={7} style={{ padding: "16px" }}>
      {aiReviewIdx < aiProducts.length ? (
        <>
          <div style={{ fontSize: "12px", color: T.muted, textAlign: "center", marginBottom: "8px" }}>PRODUCT REVIEW ({aiReviewIdx + 1} of {aiProducts.length})</div>
          <Card style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", color: T.blue, fontWeight: 700, marginBottom: "8px" }}>🤖 AI Suggestion</div>
            <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: "4px" }}>{aiProducts[aiReviewIdx].name}</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: T.green, marginBottom: "4px" }}>{aiProducts[aiReviewIdx].price}</div>
            <StatusPill status={aiProducts[aiReviewIdx].cat} color={T.blue} />
            <div style={{ fontSize: "13px", color: T.muted, marginTop: "8px", fontStyle: "italic" }}>"{aiProducts[aiReviewIdx].desc}"</div>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <Btn full variant="success" onClick={() => { setApproved(a => a+1); setAiReviewIdx(i => i+1); }}>✓ Accept</Btn>
            <Btn full variant="ghost" onClick={() => setAiReviewIdx(i => i+1)}>✗ Skip</Btn>
          </div>
          <div style={{ textAlign: "center", marginTop: "12px" }}>
            <span onClick={() => setAiReviewIdx(aiProducts.length)} style={{ fontSize: "12px", color: T.muted, cursor: "pointer" }}>Skip All →</span>
          </div>
          <div style={{ marginTop: "12px" }}><ProgressBar value={aiReviewIdx} max={aiProducts.length} color={T.green} /></div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>{approvedCount} products approved</div>
          <div style={{ marginTop: "16px" }}><Btn full onClick={() => setStep(8)}>Create PIN →</Btn></div>
        </div>
      )}
    </div>,
    // Step 8: Create PIN
    <div key={8} style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "20px" }}>Create your login PIN</div>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "24px" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: "16px", height: "16px", borderRadius: "50%", background: pin.length > i ? T.blue : T.line }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,60px)", gap: "10px", justifyContent: "center" }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map(n => (
          <button key={n} onClick={() => {
            if (n === "⌫") setPin(p => p.slice(0,-1));
            else if (n !== "" && pin.length < 4) { const np = pin + n; setPin(np); if (np.length === 4) setTimeout(() => setStep(9), 300); }
          }} style={{ width: "60px", height: "60px", borderRadius: "50%", border: "none", background: n === "" ? "transparent" : T.paper,
            fontSize: "20px", fontWeight: 700, cursor: n === "" ? "default" : "pointer", boxShadow: n === "" ? "none" : "0 1px 3px #0001" }}>
            {n}
          </button>
        ))}
      </div>
    </div>,
    // Step 9: Complete
    <div key={9} style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
      <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: "4px" }}>{brand || "Funky Fish"} is ready!</div>
      <div style={{ marginTop: "20px", textAlign: "left" }}>
        {["Account created", `Brand: ${brand || "Funky Fish"}`, `Store: ${location || "Grand Baie"}`, `${approvedCount} products approved`, "Loyalty program active"].map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", fontSize: "14px" }}>
            <span style={{ color: T.green }}>✓</span>{s}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "20px" }}><Btn full onClick={onComplete}>Go to Dashboard →</Btn></div>
    </div>,
  ];
  return <div style={{ background: T.bg, minHeight: "100%" }}>{steps[step]}</div>;
};

// ═══════════ SCREEN: LOGIN ═══════════
const LoginScreen = ({ onLogin, isOwner }) => {
  const [pin, setPin] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const staff = [{ name: "Sarah M.", role: "Cashier" }, { name: "Ravi P.", role: "Cashier" }, { name: "Amina K.", role: "Supervisor" }];

  const pinPad = (onComplete) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,56px)", gap: "8px", justifyContent: "center" }}>
      {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map(n => (
        <button key={n} onClick={() => { if (n === "⌫") setPin(p => p.slice(0,-1)); else if (n !== "" && pin.length < 4) { const np = pin + n; setPin(np); if (np.length === 4) setTimeout(onComplete, 300); }}}
          style={{ width: "56px", height: "56px", borderRadius: "50%", border: "none", background: n === "" ? "transparent" : T.paper,
            fontSize: "18px", fontWeight: 700, cursor: n === "" ? "default" : "pointer", boxShadow: n === "" ? "none" : "0 1px 3px #0001" }}>{n}</button>
      ))}
    </div>
  );

  if (isOwner) return (
    <div style={{ background: T.bg, minHeight: "100%", padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "13px", color: T.muted }}>Welcome back, Fred</div>
      <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: "24px" }}>Funky Fish</div>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "24px" }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width: "14px", height: "14px", borderRadius: "50%", background: pin.length > i ? T.blue : T.line }} />)}
      </div>
      {pinPad(() => onLogin("owner"))}
      <div style={{ fontSize: "12px", color: T.blue, marginTop: "16px", cursor: "pointer" }}>Use biometric ▸</div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%", padding: "24px 20px" }}>
      <div style={{ fontSize: "12px", color: T.muted, textAlign: "center" }}>Grand Baie · POS-GB-01</div>
      <div style={{ fontSize: "18px", fontWeight: 800, textAlign: "center", marginBottom: "20px" }}>Funky Fish</div>
      {!selectedStaff ? (
        <>
          <div style={{ fontSize: "14px", color: T.muted, textAlign: "center", marginBottom: "12px" }}>Who's logging in?</div>
          {staff.map(s => (
            <Card key={s.name} onClick={() => setSelectedStaff(s)} style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: T.blueL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: T.blue }}>{s.name[0]}</div>
              <div><div style={{ fontWeight: 700, fontSize: "14px" }}>{s.name}</div><div style={{ fontSize: "11px", color: T.muted }}>{s.role}</div></div>
            </Card>
          ))}
        </>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>Enter PIN for {selectedStaff.name}</div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "24px" }}>
            {[0,1,2,3].map(i => <div key={i} style={{ width: "14px", height: "14px", borderRadius: "50%", background: pin.length > i ? T.blue : T.line }} />)}
          </div>
          {pinPad(() => onLogin("staff"))}
        </div>
      )}
    </div>
  );
};

// ═══════════ SCREEN: HOME ═══════════
const HomeScreen = ({ role, onNavigate }) => {
  const tiles = {
    owner: [
      { id: "pos", icon: "pos", label: "POS", color: T.blue, badge: 0 },
      { id: "inventory", icon: "inventory", label: "Inventory", color: T.amber, badge: 0 },
      { id: "barcode-store", icon: "barcode", label: "Barcode\nMy Store", color: T.purple, badge: 0 },
      { id: "loyalty", icon: "loyalty", label: "Loyalty", color: T.red, badge: 3 },
      { id: "catalogue", icon: "printer", label: "Catalogue", color: T.green, badge: 0 },
      { id: "logistics", icon: "truck", label: "Logistics", color: T.orange, badge: 2 },
      { id: "warehouse", icon: "warehouse", label: "Warehouse", color: T.brown, badge: 1 },
      { id: "procurement", icon: "mail", label: "Procurement", color: "#0277BD", badge: 4 },
      { id: "marketplace", icon: "gift", label: "Marketplace", color: T.purple, badge: 0 },
      { id: "staff", icon: "staff", label: "Staff Ops", color: T.teal, badge: 0 },
      { id: "shift", icon: "shift", label: "Shifts", color: T.pink, badge: 0 },
      { id: "chat", icon: "chat", label: "AI Chat", color: T.blue, badge: 0 },
      { id: "cash-collect", icon: "dollar", label: "Cash\nCollection", color: T.green, badge: 0 },
      { id: "accountant", icon: "chart", label: "Financials", color: "#37474F", badge: 0 },
      { id: "settings", icon: "settings", label: "Settings", color: T.muted, badge: 0 },
    ],
    purchaser: [
      { id: "procurement", icon: "mail", label: "Procurement", color: "#0277BD", badge: 4 },
      { id: "warehouse", icon: "warehouse", label: "Warehouse", color: T.brown, badge: 1 },
      { id: "inventory", icon: "inventory", label: "Inventory", color: T.amber },
      { id: "chat", icon: "chat", label: "AI Chat", color: T.blue },
      { id: "settings", icon: "settings", label: "Settings", color: T.muted },
    ],
    merchandiser: [
      { id: "warehouse", icon: "warehouse", label: "Warehouse", color: T.brown, badge: 1 },
      { id: "inventory", icon: "inventory", label: "Inventory", color: T.amber },
      { id: "barcode-store", icon: "barcode", label: "Barcode\nMy Store", color: T.purple },
      { id: "catalogue", icon: "printer", label: "Catalogue", color: T.green },
      { id: "procurement", icon: "mail", label: "Procurement", color: "#0277BD", badge: 2 },
      { id: "chat", icon: "chat", label: "AI Chat", color: T.blue },
      { id: "settings", icon: "settings", label: "Settings", color: T.muted },
    ],
    accountant: [
      { id: "accountant", icon: "chart", label: "Financials", color: "#37474F" },
      { id: "procurement", icon: "mail", label: "PO Reports", color: "#0277BD" },
      { id: "loyalty", icon: "loyalty", label: "Loyalty\nLiability", color: T.red },
      { id: "settings", icon: "settings", label: "Settings", color: T.muted },
    ],
    supervisor: [
      { id: "pos", icon: "pos", label: "POS", color: T.blue },
      { id: "inventory", icon: "inventory", label: "Inventory", color: T.amber },
      { id: "shift", icon: "shift", label: "Shifts", color: T.pink },
      { id: "staff", icon: "staff", label: "Staff Ops", color: T.teal },
      { id: "logistics", icon: "truck", label: "Logistics", color: T.orange },
      { id: "chat", icon: "chat", label: "AI Chat", color: T.blue },
    ],
    staff: [
      { id: "pos", icon: "pos", label: "POS", color: T.blue },
      { id: "inventory", icon: "inventory", label: "Inventory", color: T.amber },
      { id: "staff", icon: "staff", label: "Staff Ops", color: T.teal },
      { id: "chat", icon: "chat", label: "AI Chat", color: T.blue },
    ],
  };
  const items = tiles[role] || tiles.owner;
  const roleLabel = { owner: "Owner", purchaser: "Purchaser", merchandiser: "Merchandiser", accountant: "Accountant", supervisor: "Supervisor", staff: "Cashier" }[role] || "Owner";

  return (
    <div style={{ background: T.bg, minHeight: "100%", padding: "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "13px", color: T.muted }}>Grand Baie Store · <span style={{ color: T.blue, fontWeight: 600 }}>{roleLabel}</span></div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Funky Fish</div>
        </div>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "16px" }}>F</div>
      </div>
      <Card style={{ marginBottom: "16px", background: `linear-gradient(135deg, ${T.blue}, ${T.blueD})`, border: "none" }}>
        <div style={{ color: "#fff" }}>
          <div style={{ fontSize: "12px", opacity: .7 }}>TODAY'S SALES</div>
          <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "4px" }}>Rs 47,280</div>
          <div style={{ fontSize: "12px", opacity: .7, marginTop: "2px" }}>23 orders · Avg Rs 2,056</div>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
        {items.map(t => (
          <Card key={t.id} onClick={() => onNavigate(t.id)} style={{ textAlign: "center", padding: "16px 8px", position: "relative" }}>
            {t.badge > 0 && <div style={{ position: "absolute", top: "8px", right: "8px" }}><Badge count={t.badge} /></div>}
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: t.color + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              <Icon name={t.icon} size={22} color={t.color} />
            </div>
            <div style={{ fontSize: "11px", fontWeight: 700, lineHeight: 1.3, whiteSpace: "pre-line" }}>{t.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: POS ═══════════
const POSScreen = ({ onBack }) => {
  const [cart, setCart] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState("");
  const [customerLinked, setCustomerLinked] = useState(false);

  const products = [
    { id: 1, name: "Reef Sandal Navy", price: 1290, cat: "Footwear" }, { id: 2, name: "Flip Flop Coral M", price: 490, cat: "Footwear" },
    { id: 3, name: "Beach Sandal Classic", price: 890, cat: "Footwear" }, { id: 4, name: "Canvas Tote Natural", price: 650, cat: "Bags" },
    { id: 5, name: "UV Sunglasses Pro", price: 1450, cat: "Accessories" }, { id: 6, name: "Surf Rash Guard", price: 2100, cat: "Apparel" },
    { id: 7, name: "Reef Pro Sandal Black", price: 1290, cat: "Footwear" }, { id: 8, name: "Beach Hat Wide", price: 780, cat: "Accessories" },
  ];
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const addToCart = (p) => {
    if (showReceipt) return;
    setCart(c => { const ex = c.find(x => x.id === p.id); return ex ? c.map(x => x.id === p.id ? {...x, qty: x.qty + 1} : x) : [...c, {...p, qty: 1}]; });
  };

  if (showReceipt) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Receipt" onBack={() => { setShowReceipt(false); setCart([]); setCustomerLinked(false); setShowLoyalty(false); setLoyaltyPhone(""); }} />
      <div style={{ padding: "16px" }}>
        <Card>
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "16px", fontWeight: 800 }}>Funky Fish</div>
            <div style={{ fontSize: "11px", color: T.muted }}>Grand Baie · 19 Mar 2026 · 14:32</div>
            <div style={{ fontSize: "10px", color: T.muted }}>Order #GBR-20260319-047</div>
          </div>
          <div style={{ borderTop: `1px dashed ${T.line}`, paddingTop: "12px" }}>
            {cart.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span>{c.name} ×{c.qty}</span><span style={{ fontWeight: 700 }}>Rs {(c.price * c.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px dashed ${T.line}`, marginTop: "8px", paddingTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: T.muted }}><span>Subtotal</span><span>Rs {(total / 1.15).toFixed(0)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: T.muted }}><span>VAT 15%</span><span>Rs {(total - total / 1.15).toFixed(0)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800, marginTop: "4px" }}><span>Total</span><span>Rs {total.toLocaleString()}</span></div>
          </div>
          {customerLinked && (
            <div style={{ marginTop: "12px", padding: "8px 12px", background: T.greenL, borderRadius: T.radius, fontSize: "12px", color: T.green }}>
              ✓ {Math.floor(total / 100)} loyalty points awarded to +230 5823 1102
            </div>
          )}
          <div style={{ marginTop: "12px", textAlign: "center", padding: "12px", background: T.bg, borderRadius: T.radius }}>
            <div style={{ fontSize: "10px", color: T.muted, marginBottom: "4px" }}>SCAN FOR LOYALTY</div>
            <div style={{ width: "80px", height: "80px", margin: "0 auto", background: T.ink, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="qr" size={48} color="#fff" />
            </div>
          </div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
          <Btn full variant="ghost" icon="printer">Print</Btn>
          <Btn full variant="whatsapp" icon="whatsapp">Send</Btn>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <TopBar title="Point of Sale" subtitle="Grand Baie · Till 1" onBack={onBack} right={
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {!customerLinked && <Btn small variant="ghost" onClick={() => setShowLoyalty(true)} icon="loyalty">Loyalty</Btn>}
          {customerLinked && <StatusPill status="✓ Marie D." color={T.green} />}
        </div>
      } />
      {showLoyalty && !customerLinked && (
        <div style={{ padding: "12px 16px", background: T.amberL, borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Link loyalty customer</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input value={loyaltyPhone} onChange={e => setLoyaltyPhone(e.target.value)} placeholder="+230 5XXX XXXX" style={{ flex: 1, padding: "8px 12px", borderRadius: T.radius, border: `1px solid ${T.line}`, fontSize: "13px" }} />
            <Btn small onClick={() => { setCustomerLinked(true); setShowLoyalty(false); }}>Link</Btn>
          </div>
        </div>
      )}
      <div style={{ flex: 1, padding: "12px", overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
          {products.map(p => (
            <Card key={p.id} onClick={() => addToCart(p)} style={{ padding: "12px", position: "relative" }}>
              <div style={{ width: "100%", height: "60px", background: T.blueL, borderRadius: "8px", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="barcode" size={24} color={T.blue} />
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.3, marginBottom: "4px" }}>{p.name}</div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: T.green }}>Rs {p.price.toLocaleString()}</div>
              {cart.find(c => c.id === p.id) && (
                <div style={{ position: "absolute", top: "6px", right: "6px" }}><Badge count={cart.find(c => c.id === p.id).qty} color={T.blue} /></div>
              )}
            </Card>
          ))}
        </div>
      </div>
      {cart.length > 0 && (
        <div style={{ padding: "12px 16px", background: T.paper, borderTop: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "11px", color: T.muted }}>{cart.reduce((s,c) => s+c.qty, 0)} items</div>
            <div style={{ fontSize: "18px", fontWeight: 800 }}>Rs {total.toLocaleString()}</div>
          </div>
          <Btn onClick={() => setShowReceipt(true)}>Checkout →</Btn>
        </div>
      )}
    </div>
  );
};

// ═══════════ SCREEN: WHATSAPP ═══════════
const WhatsAppScreen = ({ onBack }) => {
  const [activeTemplate, setActiveTemplate] = useState(0);
  const templates = [
    { name: "loyalty_welcome", title: "Welcome to Loyalty", msgs: [{ from: "Funky Fish", text: "🎉 Welcome to Funky Fish Loyalty, Marie!\n\nYou've earned 100 bonus points just for joining.\n\nYour balance: 100 pts\n\nScan the QR on your next receipt to earn more points!", btns: ["My Points", "Browse Catalogue", "Store Info"] }] },
    { name: "points_earned", title: "Points Earned", msgs: [{ from: "Funky Fish", text: "Thanks for your purchase at Grand Baie, Marie! 🛍️\n\nYou earned 31 points on this order.\nYour balance: 451 points.\n\nOrder #GBR-20260319-047\nTotal: Rs 3,542", btns: ["View Receipt", "My Points", "Vouchers"] }] },
    { name: "voucher_issued", title: "Voucher Issued", msgs: [{ from: "Funky Fish", text: "🎁 Great news, Marie!\n\nYou've unlocked a voucher:\n\n*Rs 500 OFF your next purchase*\nCode: FUNKY500\nValid until: 15 Apr 2026\nMin spend: Rs 2,000", btns: ["View My Vouchers", "Browse Catalogue"] }] },
    { name: "digital_receipt", title: "Digital Receipt", msgs: [{ from: "Funky Fish", text: "📄 Your digital receipt from Grand Baie\n\nOrder #GBR-20260319-047\n19 Mar 2026 · 14:32\n\n• Reef Sandal Navy ×1 — Rs 1,290\n• Canvas Tote ×2 — Rs 1,300\n\nTotal: Rs 3,542\nPaid: Cash", btns: ["My Points", "Rate Your Visit"] }] },
    { name: "receipt_scan_new", title: "Receipt QR (New)", msgs: [{ isMe: true, text: "RECEIPT GBR-20260319-047" }, { from: "Funky Fish", text: "Thanks for shopping at Funky Fish! 🏄\n\nJoin our loyalty program!\n🎁 Join now and get:\n• 31 points for this order\n• 100 bonus points for signing up", btns: ["Join Now (+131 pts)", "No Thanks"] }] },
    { name: "marketplace_redeem", title: "Marketplace Redeem", msgs: [{ isMe: true, text: "REDEEM" }, { from: "Funky Fish", text: "🎁 Redeem your points!\n\nYour balance: 2,340 pts\n\nTop items available:", btns: ["Beach Hat — 500 pts", "Tote Bag — 300 pts", "Gift Card Rs 200 — 800 pts"] }] },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="WhatsApp Templates" subtitle="Customer message preview" onBack={onBack} />
      <div style={{ display: "flex", gap: "6px", padding: "8px 12px", overflowX: "auto" }}>
        {templates.map((t, i) => (
          <div key={i} onClick={() => setActiveTemplate(i)} style={{
            padding: "6px 12px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
            background: i === activeTemplate ? "#25D366" : T.paper, color: i === activeTemplate ? "#fff" : T.ink,
            whiteSpace: "nowrap", border: `1px solid ${i === activeTemplate ? "#25D366" : T.line}`, cursor: "pointer",
          }}>{t.title}</div>
        ))}
      </div>
      <div style={{ padding: "12px", background: "#ECE5DD", minHeight: "400px", borderRadius: `${T.radiusXl} ${T.radiusXl} 0 0`, margin: "8px 12px 0" }}>
        <div style={{ textAlign: "center", fontSize: "10px", color: T.muted, background: "#fff8", borderRadius: "8px", padding: "4px 12px", display: "inline-block", marginBottom: "12px" }}>Today</div>
        {templates[activeTemplate].msgs.map((m, i) => (
          <WhatsAppMsg key={i} from={m.from} isMe={m.isMe}><div style={{ whiteSpace: "pre-line" }}>{m.text}</div>
            {m.btns && <div style={{ marginTop: "8px", borderTop: "1px solid #e8e8e8", paddingTop: "6px" }}>{m.btns.map(b => <WAButton key={b}>{b}</WAButton>)}</div>}
          </WhatsAppMsg>
        ))}
      </div>
      <div style={{ padding: "8px 12px", fontSize: "10px", color: T.muted, textAlign: "center" }}>Template: <code style={{ fontSize: "10px" }}>{templates[activeTemplate].name}</code> · Requires Meta approval</div>
    </div>
  );
};

// ═══════════ SCREEN: AI CHAT ═══════════
const AIChatScreen = ({ onBack }) => {
  const [msgs, setMsgs] = useState([{ from: "ai", text: "Hi Fred! I'm your AI assistant. Ask me anything about your store operations." }]);
  const [input, setInput] = useState("");
  const queries = [
    { q: "What were sales yesterday?", a: "Yesterday (18 Mar) at Grand Baie:\n• Revenue: Rs 38,420\n• Orders: 19\n• Avg transaction: Rs 2,022\n• Top product: Reef Sandal Navy (7 sold)\n• Loyalty points awarded: 384" },
    { q: "How many sandals in stock?", a: "Sandal stock at Grand Baie:\n• Reef Sandal Navy: 12 units\n• Flip Flop Coral M: 24 units\n• Beach Sandal Classic: 8 units\n\nTotal: 44 sandals across 3 SKUs" },
    { q: "Suggest vendors for sandals", a: "🤖 AI Vendor Suggestions:\n\n1. ✓ Shenzhen Star Electronics (existing)\n   Last order: 3 months ago. Good quality.\n\n2. ○ Guangzhou Happy Footwear (new)\n   Alibaba top-rated. MOQ: 200. $2.50-4.00/unit\n\n3. ○ Mumbai Sole Traders (new)\n   Competitive pricing. MOQ: 500. $1.80-3.20/unit\n\nWant me to create an RFQ?" },
  ];
  const send = () => {
    if (!input.trim()) return;
    const q = input; setMsgs(m => [...m, { from: "user", text: q }]); setInput("");
    const match = queries.find(x => q.toLowerCase().includes(x.q.toLowerCase().split(" ")[2]));
    setTimeout(() => setMsgs(m => [...m, { from: "ai", text: match ? match.a : "Let me look that up... I found the relevant data in your system. Here's a summary based on your current permissions." }]), 600);
  };
  return (
    <div style={{ background: T.bg, minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <TopBar title="AI Assistant" subtitle="Ask anything about your operations" onBack={onBack} />
      <div style={{ flex: 1, padding: "12px", overflowY: "auto" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", marginBottom: "8px" }}>
            <div style={{ maxWidth: "85%", background: m.from === "user" ? T.blue : T.paper, color: m.from === "user" ? "#fff" : T.ink,
              borderRadius: "16px", padding: "10px 14px", fontSize: "13px", lineHeight: 1.5, whiteSpace: "pre-line",
              border: m.from === "ai" ? `1px solid ${T.line}` : "none" }}>
              {m.from === "ai" && <div style={{ fontSize: "10px", fontWeight: 700, color: T.blue, marginBottom: "4px" }}>🤖 Posterita AI</div>}
              {m.text}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
          {queries.map(q => (
            <div key={q.q} onClick={() => setInput(q.q)} style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "11px", background: T.paper, border: `1px solid ${T.line}`, cursor: "pointer", color: T.blue, fontWeight: 600 }}>{q.q}</div>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px", background: T.paper, borderTop: `1px solid ${T.line}`, display: "flex", gap: "8px" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask anything..." style={{ flex: 1, padding: "10px 14px", borderRadius: "20px", border: `1px solid ${T.line}`, fontSize: "14px", outline: "none" }} />
        <Btn small onClick={send}>Send</Btn>
      </div>
    </div>
  );
};

// ═══════════ SCREEN: INVENTORY COUNT ═══════════
const InventoryScreen = ({ onBack }) => {
  const [phase, setPhase] = useState("start");
  const [scanned, setScanned] = useState([]);
  const shelves = [{ id: "A1", name: "Shelf A1 — Footwear", expected: 36 }, { id: "A2", name: "Shelf A2 — Bags", expected: 18 }, { id: "B1", name: "Shelf B1 — Accessories", expected: 24 }];

  if (phase === "start") return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Inventory Count" subtitle="Grand Baie" onBack={onBack} />
      <div style={{ padding: "16px" }}>
        <Card style={{ marginBottom: "12px", background: T.amberL, border: `1px solid ${T.amber}33` }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: T.amber, marginBottom: "4px" }}>DUAL-SCAN REQUIRED</div>
          <div style={{ fontSize: "12px", color: T.muted }}>Every shelf needs 2 independent scans that must match. Scan-only — no manual entry.</div>
        </Card>
        <Btn full onClick={() => setPhase("scanning")} icon="barcode">Start Full Count</Btn>
        <div style={{ marginTop: "8px" }}><Btn full variant="ghost" onClick={() => setPhase("scanning")}>Spot Check</Btn></div>
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Shelves</div>
          {shelves.map(s => (
            <Card key={s.id} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: "13px", fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: "11px", color: T.muted }}>Expected: {s.expected} items</div></div>
              <StatusPill status="Pending" color={T.muted} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Scanning — Shelf A1" subtitle="Scan 1 of 2 · Footwear" onBack={() => setPhase("start")} />
      <div style={{ padding: "16px" }}>
        <div style={{ textAlign: "center", padding: "24px", background: T.paper, borderRadius: T.radiusXl, border: `2px dashed ${T.blue}`, marginBottom: "16px" }}>
          <Icon name="barcode" size={48} color={T.blue} />
          <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "8px", color: T.blue }}>Scan product barcode</div>
          <div style={{ fontSize: "11px", color: T.muted }}>Point camera at barcode or use Bluetooth scanner</div>
        </div>
        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Scanned ({scanned.length})</div>
        {scanned.length === 0 && <div style={{ fontSize: "12px", color: T.muted, textAlign: "center", padding: "16px" }}>No items scanned yet</div>}
        {scanned.map((s, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.line}`, fontSize: "13px" }}>
            <span>{s.name}</span><span style={{ fontWeight: 700 }}>×{s.qty}</span>
          </div>
        ))}
        <div style={{ marginTop: "16px" }}>
          <Btn full variant="secondary" onClick={() => setScanned(s => [...s, { name: "Reef Sandal Navy", qty: 1 }])}>📸 Simulate Scan</Btn>
        </div>
        {scanned.length > 0 && <div style={{ marginTop: "8px" }}><Btn full variant="success" onClick={() => setPhase("start")}>Complete Scan 1 ✓</Btn></div>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: BARCODE MY STORE ═══════════
const BarcodeStoreScreen = ({ onBack }) => {
  const [step, setStep] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [photosCapt, setPhotosCapt] = useState(0);
  const [quantities, setQuantities] = useState([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [approved, setApproved] = useState(0);
  const steps = ["Walk & Snap", "AI Identifies", "Review & Approve", "Print Labels"];

  if (step === 0) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Barcode My Store" subtitle="Guided first-time barcoding" onBack={onBack} />
      <div style={{ padding: "16px" }}>
        <Card style={{ marginBottom: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📸</div>
          <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: "4px" }}>Walk Your Store</div>
          <div style={{ fontSize: "13px", color: T.muted }}>Take photos of every product. AI will identify them, suggest names and prices, and generate barcodes.</div>
        </Card>
        <div style={{ marginBottom: "16px" }}>{steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: T.blueL, color: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 }}>{i + 1}</div>
            <span style={{ fontSize: "13px" }}>{s}</span>
          </div>
        ))}</div>
        <Btn full onClick={() => setStep(1)} icon="camera">Start Capturing</Btn>
      </div>
    </div>
  );
  if (step === 1) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Capture Products" subtitle={`${photosCapt} photos taken`} onBack={() => setStep(0)} />
      <div style={{ padding: "16px" }}>
        <div style={{ textAlign: "center", padding: "40px", background: "#000", borderRadius: T.radiusXl, marginBottom: "16px" }}>
          <div style={{ color: "#fff", fontSize: "14px", opacity: 0.7 }}>Camera viewfinder</div>
          <div style={{ marginTop: "20px" }}><Btn variant="ghost" small onClick={() => setPhotosCapt(p => p + 1)} style={{ color: "#fff" }}>📸 Snap</Btn></div>
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {Array(Math.min(photosCapt, 4)).fill(0).map((_, i) => (
            <div key={i} style={{ width: "50px", height: "50px", borderRadius: "8px", background: T.blueL, display: "flex", alignItems: "center", justifyContent: "center" }}>📷</div>
          ))}
        </div>
        {photosCapt > 0 && <Btn full onClick={() => setStep(2)}>Done — Send to AI ({photosCapt} photos)</Btn>}
      </div>
    </div>
  );
  if (step === 2) {
    const aiItems = [{ name: "Reef Sandal Navy", price: "Rs 1,290", conf: 92 }, { name: "Canvas Tote Natural", price: "Rs 650", conf: 87 }, { name: "UV Sunglasses Pro", price: "Rs 1,450", conf: 78 }];
    if (reviewIdx >= aiItems.length) return (
      <div style={{ background: T.bg, minHeight: "100%", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>🏷️</div>
        <div style={{ fontSize: "18px", fontWeight: 800 }}>{approved} products ready for labels</div>
        <div style={{ marginTop: "16px" }}><Btn full onClick={() => setStep(3)} icon="printer">Print Labels</Btn></div>
      </div>
    );
    const item = aiItems[reviewIdx];
    return (
      <div style={{ background: T.bg, minHeight: "100%" }}>
        <TopBar title="AI Review" subtitle={`${reviewIdx + 1} of ${aiItems.length}`} onBack={() => setStep(1)} />
        <div style={{ padding: "16px" }}>
          <Card style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: T.blue, marginBottom: "8px" }}>🤖 AI Identified · {item.conf}% confidence</div>
            <div style={{ fontSize: "16px", fontWeight: 800 }}>{item.name}</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: T.green, marginTop: "4px" }}>{item.price}</div>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <Btn full variant="success" onClick={() => { setApproved(a => a + 1); setReviewIdx(i => i + 1); }}>✓ Accept</Btn>
            <Btn full variant="ghost" onClick={() => setReviewIdx(i => i + 1)}>✗ Skip</Btn>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Print Labels" onBack={() => setStep(2)} />
      <div style={{ padding: "16px", textAlign: "center" }}>
        <Card style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>🖨️</div>
          <div style={{ fontSize: "16px", fontWeight: 800 }}>Ready to print {approved} labels</div>
          <div style={{ fontSize: "12px", color: T.muted, marginTop: "4px" }}>Labels include: barcode, product name, price, QR code</div>
        </Card>
        <Btn full icon="printer">Print All Labels</Btn>
        <div style={{ marginTop: "8px" }}><Btn full variant="ghost" onClick={onBack}>Done</Btn></div>
      </div>
    </div>
  );
};

// ═══════════ SCREEN: LOGISTICS ═══════════
const LogisticsScreen = ({ onBack }) => {
  const [activeShipment, setActiveShipment] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const shipments = [
    { id: "SHP-001", to: "Quatre Bornes", items: 3, status: "In Transit", driver: "Ravi P.", cod: "Rs 2,450" },
    { id: "SHP-002", to: "Port Louis", items: 1, status: "Ready", driver: null, cod: null },
    { id: "SHP-003", to: "Curepipe", items: 5, status: "Delivered", driver: "Ravi P.", cod: "Rs 5,100" },
  ];
  const deliverySteps = ["Pickup from store", "In transit", "Arrive at destination", "Customer handover", "Cash collected"];

  if (activeShipment) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title={activeShipment.id} subtitle={`To: ${activeShipment.to}`} onBack={() => setActiveShipment(null)} />
      <div style={{ padding: "16px" }}>
        <Card style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>Delivery Progress</div>
          {deliverySteps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: i <= stepIdx ? T.green : T.line, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, flexShrink: 0 }}>{i <= stepIdx ? "✓" : i + 1}</div>
              <div style={{ fontSize: "13px", color: i <= stepIdx ? T.ink : T.muted, fontWeight: i === stepIdx ? 700 : 400, paddingTop: "3px" }}>{s}</div>
            </div>
          ))}
        </Card>
        {activeShipment.cod && <Card style={{ marginBottom: "12px", background: T.amberL, border: `1px solid ${T.amber}33` }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: T.amber }}>💰 COD: {activeShipment.cod}</div>
          <div style={{ fontSize: "11px", color: T.muted }}>Collect cash on delivery</div>
        </Card>}
        {stepIdx < deliverySteps.length - 1 && <Btn full onClick={() => setStepIdx(s => s + 1)}>Complete: {deliverySteps[stepIdx + 1]}</Btn>}
        {stepIdx === deliverySteps.length - 1 && <Btn full variant="success">✓ Delivery Complete</Btn>}
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Logistics" subtitle="Deliveries & packages" onBack={onBack} />
      <div style={{ padding: "16px" }}>
        {shipments.map(s => (
          <Card key={s.id} onClick={() => { setActiveShipment(s); setStepIdx(s.status === "Delivered" ? 4 : s.status === "In Transit" ? 1 : 0); }} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>{s.id}</div>
                <div style={{ fontSize: "12px", color: T.muted }}>{s.to} · {s.items} items</div>
                {s.driver && <div style={{ fontSize: "11px", color: T.muted }}>Driver: {s.driver}</div>}
              </div>
              <StatusPill status={s.status} color={s.status === "Delivered" ? T.green : s.status === "In Transit" ? T.blue : T.amber} />
            </div>
            {s.cod && <div style={{ fontSize: "11px", color: T.amber, fontWeight: 600, marginTop: "6px" }}>💰 COD: {s.cod}</div>}
          </Card>
        ))}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: CASH COLLECTION ═══════════
const CashCollectionScreen = ({ onBack }) => {
  const [step, setStep] = useState(0);
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Cash Collection" subtitle="Store → Safe transport" onBack={onBack} />
      <div style={{ padding: "16px" }}>
        {step === 0 && <>
          <Card style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>End-of-Day Cash</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}><span>Till total</span><span style={{ fontWeight: 700 }}>Rs 47,280</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}><span>Card payments</span><span style={{ fontWeight: 700 }}>-Rs 18,960</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}><span>COD received</span><span style={{ fontWeight: 700 }}>+Rs 7,550</span></div>
            <div style={{ borderTop: `1px solid ${T.line}`, marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 800 }}><span>Cash to collect</span><span style={{ color: T.green }}>Rs 35,870</span></div>
          </Card>
          <Btn full onClick={() => setStep(1)}>Prepare Collection Bag</Btn>
        </>}
        {step === 1 && <>
          <Card style={{ marginBottom: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🏷️</div>
            <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: "4px" }}>Seal & Label Bag</div>
            <div style={{ fontSize: "13px", color: T.muted }}>Bag #CB-GB-20260319</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: T.green, marginTop: "8px" }}>Rs 35,870</div>
          </Card>
          <Btn full onClick={() => setStep(2)}>Confirm Sealed ✓</Btn>
        </>}
        {step === 2 && <>
          <Card style={{ marginBottom: "16px", textAlign: "center", background: T.greenL, border: `1px solid ${T.green}33` }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: T.green }}>Collection Ready</div>
            <div style={{ fontSize: "13px", color: T.muted, marginTop: "4px" }}>Bag #CB-GB-20260319 · Rs 35,870</div>
            <div style={{ fontSize: "12px", color: T.muted, marginTop: "4px" }}>Waiting for driver pickup</div>
          </Card>
          <Btn full variant="ghost" onClick={onBack}>Back to Home</Btn>
        </>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: CONTAINER / WAREHOUSE ═══════════
const ContainerScreen = ({ onBack }) => {
  const [step, setStep] = useState(0);
  const docs = [{ name: "Bill of Lading", type: "bill_of_lading", status: "✓" }, { name: "Packing List", type: "packing_list", status: "✓" }, { name: "Commercial Invoice", type: "commercial_invoice", status: "⟳" }];
  const [uploaded, setUploaded] = useState([]);
  const items = [{ name: "Reef Sandal Navy", expected: 120, received: 118, status: "accept" }, { name: "Flip Flop Coral M", expected: 200, received: 200, status: "accept" }, { name: "UV Sunglasses Pro", expected: 50, received: 47, status: "claim" }];

  if (step === 0) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Warehouse" subtitle="Container receiving" onBack={onBack} />
      <div style={{ padding: "16px" }}>
        <Card onClick={() => setStep(1)} style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: "14px", fontWeight: 700 }}>CNTR-2026-008</div><div style={{ fontSize: "12px", color: T.muted }}>Shenzhen Star · 370 items · Arrived today</div></div>
            <StatusPill status="Pending" color={T.amber} />
          </div>
        </Card>
        <Card style={{ marginBottom: "8px", opacity: 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: "14px", fontWeight: 700 }}>CNTR-2026-007</div><div style={{ fontSize: "12px", color: T.muted }}>Guangzhou Supply · 580 items · 12 Mar</div></div>
            <StatusPill status="Complete" color={T.green} />
          </div>
        </Card>
      </div>
    </div>
  );
  if (step === 1) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="CNTR-2026-008" subtitle="Document vault" onBack={() => setStep(0)} />
      <div style={{ padding: "16px" }}>
        {docs.map(d => (
          <Card key={d.name} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon name="doc" size={18} color={T.blue} />
              <div><div style={{ fontSize: "13px", fontWeight: 700 }}>{d.name}</div><div style={{ fontSize: "10px", color: T.muted }}>{d.type}</div></div>
            </div>
            <span style={{ color: d.status === "✓" ? T.green : T.amber }}>{d.status}</span>
          </Card>
        ))}
        <Btn full variant="secondary" onClick={() => setUploaded(u => [...u, "doc_" + u.length])} icon="camera" style={{ marginTop: "8px" }}>Upload Document</Btn>
        <div style={{ marginTop: "12px" }}><Btn full onClick={() => setStep(2)}>Start Inspection →</Btn></div>
      </div>
    </div>
  );
  if (step === 2) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Inspection" subtitle="CNTR-2026-008" onBack={() => setStep(1)} />
      <div style={{ padding: "16px" }}>
        {items.map(it => (
          <Card key={it.name} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700 }}>{it.name}</div>
                <div style={{ fontSize: "12px", color: T.muted }}>Expected: {it.expected} · Received: {it.received}</div>
              </div>
              <StatusPill status={it.status === "accept" ? "Accept" : "Claim"} color={it.status === "accept" ? T.green : T.red} />
            </div>
            {it.status === "claim" && <div style={{ marginTop: "6px", fontSize: "11px", color: T.red }}>Short {it.expected - it.received} units — file claim with vendor</div>}
          </Card>
        ))}
        <Btn full onClick={() => setStep(3)} style={{ marginTop: "8px" }}>Complete Inspection →</Btn>
      </div>
    </div>
  );
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Release to Stores" subtitle="CNTR-2026-008" onBack={() => setStep(2)} />
      <div style={{ padding: "16px" }}>
        <Card style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Allocation</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}><span>Grand Baie</span><span style={{ fontWeight: 700 }}>220 items</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}><span>Quatre Bornes</span><span style={{ fontWeight: 700 }}>145 items</span></div>
        </Card>
        <Card style={{ marginBottom: "16px", background: T.amberL, border: `1px solid ${T.amber}33` }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: T.amber }}>LANDED COST</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "4px" }}><span>FOB</span><span>$4,200</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><span>Freight</span><span>$680</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><span>Duty 15%</span><span>$732</span></div>
          <div style={{ borderTop: `1px solid ${T.amber}44`, marginTop: "4px", paddingTop: "4px", display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700 }}><span>Total landed</span><span>$5,612</span></div>
        </Card>
        <Btn full variant="success" onClick={onBack}>Release Stock ✓</Btn>
      </div>
    </div>
  );
};

// ═══════════ SCREEN: LOYALTY ═══════════ (NEW v3.8)
const LoyaltyScreen = ({ onBack }) => {
  const [tab, setTab] = useState("wallets");
  const wallets = [
    { name: "Marie Dupont", phone: "+230 5823 1102", pts: 2340, lifetime: 4800, tier: "Gold" },
    { name: "Jean-Luc R.", phone: "+230 5710 4456", pts: 890, lifetime: 1200, tier: "Silver" },
    { name: "Nadia S.", phone: "+230 5915 8823", pts: 3120, lifetime: 5600, tier: "Gold" },
  ];
  const transactions = [
    { type: "earn", customer: "Marie D.", pts: "+31", order: "#047", time: "14:32" },
    { type: "earn", customer: "Jean-Luc R.", pts: "+18", order: "#046", time: "13:15" },
    { type: "redeem", customer: "Nadia S.", pts: "-500", voucher: "FUNKY500", time: "12:40" },
    { type: "earn", customer: "Marie D.", pts: "+42", order: "#045", time: "11:20" },
    { type: "campaign", customer: "All Gold", pts: "+100", note: "March Bonus", time: "09:00" },
  ];
  const vouchers = [
    { code: "FUNKY500", type: "Rs 500 OFF", status: "Active", redeemed: 3, issued: 12, expires: "15 Apr" },
    { code: "SUMMER20", type: "20% OFF", status: "Active", redeemed: 7, issued: 25, expires: "30 Apr" },
    { code: "WELCOME", type: "Rs 200 OFF", status: "Auto", redeemed: 18, issued: 42, expires: "Ongoing" },
  ];
  const tabs = [["wallets", "Wallets"], ["txn", "Transactions"], ["vouchers", "Vouchers"], ["config", "Config"]];

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Loyalty Program" subtitle="Funky Fish · 127 members" onBack={onBack} />
      <div style={{ display: "flex", gap: "4px", padding: "8px 12px", overflowX: "auto" }}>
        {tabs.map(([id, label]) => (
          <div key={id} onClick={() => setTab(id)} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
            background: tab === id ? T.red : T.paper, color: tab === id ? "#fff" : T.ink, border: `1px solid ${tab === id ? T.red : T.line}`, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</div>
        ))}
      </div>
      <div style={{ padding: "12px 16px" }}>
        {tab === "wallets" && <>
          <Card style={{ marginBottom: "12px", background: `linear-gradient(135deg, ${T.red}, #C62828)`, border: "none" }}>
            <div style={{ color: "#fff" }}>
              <div style={{ fontSize: "11px", opacity: .7 }}>TOTAL POINTS IN CIRCULATION</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>42,680 pts</div>
              <div style={{ fontSize: "11px", opacity: .7 }}>Liability: $426.80 · 127 wallets</div>
            </div>
          </Card>
          {wallets.map(w => (
            <Card key={w.phone} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{w.name}</div>
                  <div style={{ fontSize: "11px", color: T.muted }}>{w.phone}</div>
                  <div style={{ fontSize: "11px", color: T.muted }}>Lifetime: {w.lifetime.toLocaleString()} pts</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: T.red }}>{w.pts.toLocaleString()}</div>
                  <StatusPill status={w.tier} color={w.tier === "Gold" ? T.amber : T.muted} />
                </div>
              </div>
            </Card>
          ))}
        </>}
        {tab === "txn" && transactions.map((tx, i) => (
          <ListRow key={i}
            left={<div style={{ width: "32px", height: "32px", borderRadius: "50%", background: tx.type === "earn" ? T.greenL : tx.type === "redeem" ? "#FFEBEE" : T.purpleL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>{tx.type === "earn" ? "↑" : tx.type === "redeem" ? "↓" : "🎯"}</div>}
            title={tx.customer}
            sub={tx.order || tx.voucher || tx.note}
            right={<div style={{ textAlign: "right" }}><div style={{ fontSize: "14px", fontWeight: 700, color: tx.type === "earn" || tx.type === "campaign" ? T.green : T.red }}>{tx.pts}</div><div style={{ fontSize: "10px", color: T.muted }}>{tx.time}</div></div>}
          />
        ))}
        {tab === "vouchers" && vouchers.map(v => (
          <Card key={v.code} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>{v.code}</div>
                <div style={{ fontSize: "12px", color: T.muted }}>{v.type} · Expires: {v.expires}</div>
                <div style={{ fontSize: "11px", color: T.muted }}>Redeemed: {v.redeemed}/{v.issued}</div>
              </div>
              <StatusPill status={v.status} color={v.status === "Active" ? T.green : T.blue} />
            </div>
            <div style={{ marginTop: "6px" }}><ProgressBar value={v.redeemed} max={v.issued} color={T.red} /></div>
          </Card>
        ))}
        {tab === "config" && <>
          <Card style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>Points Configuration</div>
            {[["Points per Rs 100 spent", "1 point"], ["Welcome bonus", "100 points"], ["Survey bonus", "20 points"], ["Points per currency unit", "Rs 100 = 1 pt"], ["1 Posterita Point", "$0.01 USD"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderBottom: `1px solid ${T.line}` }}><span style={{ color: T.muted }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Consent Status</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}><span>Consented</span><span style={{ fontWeight: 700, color: T.green }}>98 (77%)</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><span>Pending</span><span style={{ fontWeight: 700, color: T.amber }}>29 (23%)</span></div>
            <div style={{ marginTop: "8px" }}><ProgressBar value={98} max={127} color={T.green} /></div>
          </Card>
        </>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: CATALOGUE ═══════════ (NEW v3.8)
const CatalogueScreen = ({ onBack }) => {
  const [view, setView] = useState("grid");
  const [enriching, setEnriching] = useState(false);
  const products = [
    { name: "Reef Sandal Navy", price: "Rs 1,290", enriched: true, catReady: true, img: "🥿" },
    { name: "Flip Flop Coral M", price: "Rs 490", enriched: true, catReady: true, img: "🩴" },
    { name: "Canvas Tote Natural", price: "Rs 650", enriched: false, catReady: false, img: "👜" },
    { name: "UV Sunglasses Pro", price: "Rs 1,450", enriched: true, catReady: true, img: "🕶️" },
    { name: "Surf Rash Guard", price: "Rs 2,100", enriched: false, catReady: false, img: "👕" },
    { name: "Beach Hat Wide", price: "Rs 780", enriched: false, catReady: false, img: "👒" },
  ];
  const enriched = products.filter(p => p.enriched).length;

  if (enriching) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="AI Enrichment" subtitle="Processing 3 products..." onBack={() => setEnriching(false)} />
      <div style={{ padding: "16px" }}>
        {products.filter(p => !p.enriched).map((p, i) => (
          <Card key={p.name} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>{p.img}</span>
                <div><div style={{ fontSize: "13px", fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: "11px", color: T.muted }}>{p.price}</div></div>
              </div>
              <span style={{ fontSize: "14px" }}>{i === 0 ? "✓" : i === 1 ? "⟳" : "⏳"}</span>
            </div>
            {i === 0 && <div style={{ marginTop: "8px", padding: "8px", background: T.greenL, borderRadius: "8px", fontSize: "11px", color: T.green }}>
              ✓ AI generated: short desc, long desc, features, tags, marketing copy
            </div>}
          </Card>
        ))}
        <div style={{ marginTop: "12px" }}><Btn full variant="success" onClick={() => setEnriching(false)}>Review Suggestions →</Btn></div>
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Catalogue" subtitle={`${enriched}/${products.length} enriched`} onBack={onBack} right={
        <div style={{ display: "flex", gap: "6px" }}>
          {["grid", "list"].map(v => <div key={v} onClick={() => setView(v)} style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, background: view === v ? T.blueL : "transparent", color: view === v ? T.blue : T.muted, cursor: "pointer" }}>{v === "grid" ? "⊞" : "☰"}</div>)}
        </div>
      } />
      <div style={{ padding: "12px 16px" }}>
        <div style={{ marginBottom: "12px" }}><ProgressBar value={enriched} max={products.length} color={T.green} /></div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <Btn small variant="secondary" onClick={() => setEnriching(true)}>🤖 AI Enrich All</Btn>
          <Btn small variant="ghost" icon="printer">PDF Catalogue</Btn>
        </div>
        <div style={view === "grid" ? { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" } : {}}>
          {products.map(p => (
            <Card key={p.name} style={{ marginBottom: view === "list" ? "8px" : 0, padding: "12px" }}>
              <div style={view === "list" ? { display: "flex", alignItems: "center", gap: "12px" } : { textAlign: "center" }}>
                <span style={{ fontSize: view === "list" ? "24px" : "32px" }}>{p.img}</span>
                <div style={view === "list" ? {} : { marginTop: "6px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: T.green }}>{p.price}</div>
                  <div style={{ marginTop: "4px" }}>
                    {p.enriched ? <StatusPill status="✓ Enriched" color={T.green} /> : <StatusPill status="Needs AI" color={T.amber} />}
                    {p.catReady && <span style={{ marginLeft: "4px" }}><StatusPill status="📄 Ready" color={T.blue} /></span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card style={{ marginTop: "12px", background: T.purpleL, border: `1px solid ${T.purple}33` }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: T.purple }}>LABEL PRINTING</div>
          <div style={{ fontSize: "11px", color: T.muted, marginTop: "4px" }}>Print barcode + QR labels for all catalogue-ready products</div>
          <div style={{ marginTop: "8px" }}><Btn small variant="ghost" icon="printer">Print {enriched} Labels</Btn></div>
        </Card>
      </div>
    </div>
  );
};

// ═══════════ SCREEN: STAFF OPS ═══════════ (NEW v3.8)
const StaffOpsScreen = ({ onBack }) => {
  const [tab, setTab] = useState("attendance");
  const tabs = [["attendance", "Attendance"], ["leave", "Leave"], ["expenses", "Expenses"]];

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Staff Operations" subtitle="Grand Baie" onBack={onBack} />
      <div style={{ display: "flex", gap: "4px", padding: "8px 12px" }}>
        {tabs.map(([id, label]) => (
          <div key={id} onClick={() => setTab(id)} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
            background: tab === id ? T.teal : T.paper, color: tab === id ? "#fff" : T.ink, border: `1px solid ${tab === id ? T.teal : T.line}`, cursor: "pointer" }}>{label}</div>
        ))}
      </div>
      <div style={{ padding: "12px 16px" }}>
        {tab === "attendance" && <>
          <Card style={{ marginBottom: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: T.muted }}>TODAY · 19 MAR 2026</div>
            <div style={{ fontSize: "20px", fontWeight: 800, marginTop: "4px" }}>3 / 4 checked in</div>
            <div style={{ marginTop: "8px" }}><ProgressBar value={3} max={4} color={T.green} /></div>
          </Card>
          {[{ name: "Sarah M.", role: "Cashier", in: "08:02", out: null, status: "checked_in" },
            { name: "Ravi P.", role: "Cashier", in: "07:58", out: null, status: "checked_in" },
            { name: "Amina K.", role: "Supervisor", in: "08:15", out: null, status: "checked_in" },
            { name: "Devi N.", role: "Cashier", in: null, out: null, status: "absent" }].map(s => (
            <ListRow key={s.name}
              left={<div style={{ width: "36px", height: "36px", borderRadius: "50%", background: s.status === "checked_in" ? T.greenL : "#FFEBEE", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px", color: s.status === "checked_in" ? T.green : T.red }}>{s.name[0]}</div>}
              title={s.name} sub={`${s.role}${s.in ? ` · In: ${s.in}` : ""}`}
              right={<StatusPill status={s.status === "checked_in" ? "Present" : "Absent"} color={s.status === "checked_in" ? T.green : T.red} />}
            />
          ))}
          <Card style={{ marginTop: "12px", textAlign: "center", background: T.blueL, border: `1px solid ${T.blue}33` }}>
            <Icon name="qr" size={32} color={T.blue} />
            <div style={{ fontSize: "12px", fontWeight: 700, color: T.blue, marginTop: "6px" }}>QR Attendance Station</div>
            <div style={{ fontSize: "11px", color: T.muted }}>Staff scan to check in/out</div>
          </Card>
        </>}
        {tab === "leave" && <>
          {[{ name: "Amina K.", type: "Annual Leave", dates: "21-22 Mar", status: "Pending", days: 2 },
            { name: "Sarah M.", type: "Sick Leave", dates: "15 Mar", status: "Approved", days: 1 },
            { name: "Ravi P.", type: "Annual Leave", dates: "1-3 Apr", status: "Pending", days: 3 }].map((l, i) => (
            <Card key={i} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{l.name}</div>
                  <div style={{ fontSize: "12px", color: T.muted }}>{l.type} · {l.dates} · {l.days} day{l.days > 1 ? "s" : ""}</div>
                </div>
                <StatusPill status={l.status} color={l.status === "Approved" ? T.green : T.amber} />
              </div>
              {l.status === "Pending" && <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <Btn small variant="success">Approve</Btn><Btn small variant="ghost">Decline</Btn>
              </div>}
            </Card>
          ))}
        </>}
        {tab === "expenses" && <>
          {[{ desc: "Cleaning supplies", amount: "Rs 450", by: "Amina K.", date: "18 Mar", status: "Pending" },
            { desc: "Printer paper roll", amount: "Rs 280", by: "Sarah M.", date: "17 Mar", status: "Approved" },
            { desc: "Transport for delivery", amount: "Rs 600", by: "Ravi P.", date: "16 Mar", status: "Approved" }].map((e, i) => (
            <Card key={i} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{e.desc}</div>
                  <div style={{ fontSize: "12px", color: T.muted }}>{e.by} · {e.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{e.amount}</div>
                  <StatusPill status={e.status} color={e.status === "Approved" ? T.green : T.amber} />
                </div>
              </div>
            </Card>
          ))}
          <Btn full variant="secondary" style={{ marginTop: "8px" }}>+ New Expense Claim</Btn>
        </>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: SHIFTS ═══════════ (NEW v3.8)
const ShiftsScreen = ({ onBack }) => {
  const days = ["Mon 17", "Tue 18", "Wed 19", "Thu 20", "Fri 21", "Sat 22", "Sun 23"];
  const shifts = { "Mon 17": [{ staff: "Sarah", slot: "08:00-16:00" }, { staff: "Ravi", slot: "08:00-16:00" }, { staff: "Amina", slot: "10:00-18:00" }],
    "Tue 18": [{ staff: "Sarah", slot: "08:00-16:00" }, { staff: "Ravi", slot: "12:00-20:00" }, { staff: "Devi", slot: "08:00-16:00" }],
    "Wed 19": [{ staff: "Sarah", slot: "08:00-16:00" }, { staff: "Ravi", slot: "08:00-16:00" }, { staff: "Amina", slot: "10:00-18:00" }] };
  const holidays = ["01 Jan — New Year's", "01 Feb — Abolition of Slavery", "12 Mar — National Day"];

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Shift Planning" subtitle="Week of 17 Mar 2026" onBack={onBack} />
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "16px" }}>
          {days.map(d => (
            <div key={d} style={{ minWidth: "56px", textAlign: "center", padding: "8px 6px", borderRadius: T.radius,
              background: d === "Wed 19" ? T.blue : T.paper, color: d === "Wed 19" ? "#fff" : T.ink,
              border: `1px solid ${d === "Wed 19" ? T.blue : T.line}`, fontSize: "11px", fontWeight: 700 }}>{d}</div>
          ))}
        </div>
        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Wed 19 · Today</div>
        {(shifts["Wed 19"] || []).map((s, i) => (
          <Card key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: T.blueL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: T.blue, fontSize: "13px" }}>{s.staff[0]}</div>
              <div><div style={{ fontSize: "13px", fontWeight: 700 }}>{s.staff}</div></div>
            </div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: T.blue, background: T.blueL, padding: "4px 10px", borderRadius: "8px" }}>{s.slot}</div>
          </Card>
        ))}
        <Card style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>📅 Upcoming Public Holidays</div>
          {holidays.map(h => <div key={h} style={{ fontSize: "12px", color: T.muted, padding: "4px 0" }}>• {h}</div>)}
        </Card>
        <div style={{ marginTop: "12px" }}><Btn full variant="secondary">+ Create Shift Template</Btn></div>
      </div>
    </div>
  );
};

// ═══════════ SCREEN: SETTINGS ═══════════ (NEW v3.8)
const SettingsScreen = ({ onBack }) => {
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Settings" onBack={onBack} />
      <div style={{ padding: "16px" }}>
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "18px" }}>F</div>
            <div><div style={{ fontSize: "16px", fontWeight: 800 }}>Fred</div><div style={{ fontSize: "12px", color: T.muted }}>Owner · +230 5823 1102</div></div>
          </div>
        </Card>
        <div style={{ fontSize: "12px", fontWeight: 700, color: T.muted, marginBottom: "8px" }}>STORE</div>
        <Card style={{ marginBottom: "12px" }}>
          {[["Store", "Grand Baie"], ["Brand", "Funky Fish"], ["Terminal", "POS-GB-01"], ["Currency", "MUR (Rs)"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.line}`, fontSize: "13px" }}>
              <span style={{ color: T.muted }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </Card>
        <div style={{ fontSize: "12px", fontWeight: 700, color: T.muted, marginBottom: "8px" }}>DEVICE</div>
        <Card style={{ marginBottom: "12px" }}>
          {[["Device ID", "dev_a8f3c2"], ["Enrolled", "12 Mar 2026"], ["Last sync", "2 min ago"], ["App version", "3.8.0"], ["Printer", "Epson TM-T82III + Zebra ZD421"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.line}`, fontSize: "13px" }}>
              <span style={{ color: T.muted }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </Card>
        <div style={{ fontSize: "12px", fontWeight: 700, color: T.muted, marginBottom: "8px" }}>TEAM</div>
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Staff (4 members)</div>
          {["Sarah M. — Cashier", "Ravi P. — Cashier", "Amina K. — Supervisor", "Devi N. — Cashier"].map(s => (
            <div key={s} style={{ fontSize: "12px", padding: "6px 0", borderBottom: `1px solid ${T.line}` }}>{s}</div>
          ))}
          <div style={{ marginTop: "8px" }}><Btn small variant="secondary">+ Invite Staff</Btn></div>
        </Card>
        <Btn full variant="danger">Sign Out</Btn>
      </div>
    </div>
  );
};

// ═══════════ SCREEN: PROCUREMENT ═══════════ (NEW v3.8)
const ProcurementScreen = ({ onBack }) => {
  const [tab, setTab] = useState("pipeline");
  const [detail, setDetail] = useState(null);
  const tabs = [["pipeline", "Pipeline"], ["rfq", "RFQs"], ["po", "Orders"], ["vendors", "Vendors"]];

  const pipeline = [
    { id: "SRC-042", title: "Summer sandals collection", status: "quoting", qty: 500, rfqs: 3, responses: 2 },
    { id: "SRC-041", title: "Sunglasses restocking", status: "ordered", qty: 200, po: "PO-2026-018" },
    { id: "SRC-040", title: "Canvas tote bags", status: "sourcing", qty: 300, aiVendors: 3 },
  ];
  const rfqs = [
    { ref: "RFQ-042-01", vendor: "Shenzhen Star", status: "responded", total: "$2,250", score: 4.2 },
    { ref: "RFQ-042-02", vendor: "Guangzhou Happy", status: "responded", total: "$1,980", score: 3.8 },
    { ref: "RFQ-042-03", vendor: "Mumbai Sole", status: "sent", total: "—" },
  ];
  const pos = [
    { ref: "PO-2026-018", vendor: "Shenzhen Star", total: "$4,200", status: "approved", items: 5 },
    { ref: "PO-2026-017", vendor: "Guangzhou Supply", total: "$6,800", status: "received", items: 8 },
  ];
  const vendors = [
    { name: "Shenzhen Star Electronics", country: "CN", verified: true, orders: 12 },
    { name: "Guangzhou Happy Footwear", country: "CN", verified: false, orders: 0 },
    { name: "Mumbai Sole Traders", country: "IN", verified: false, orders: 0 },
  ];

  if (detail) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title={detail.ref || detail.id} subtitle="RFQ Comparison" onBack={() => setDetail(null)} />
      <div style={{ padding: "16px" }}>
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Quote Comparison</div>
          {rfqs.filter(r => r.status === "responded").map(r => (
            <div key={r.ref} style={{ padding: "10px", marginBottom: "8px", background: T.bg, borderRadius: T.radius }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>{r.vendor}</div>
                  <div style={{ fontSize: "11px", color: T.muted }}>{r.ref}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: T.green }}>{r.total}</div>
                  <div style={{ fontSize: "11px", color: T.amber }}>★ {r.score}/5</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <Btn small variant="success">Accept → PO</Btn>
                <Btn small variant="ghost">Reject</Btn>
              </div>
            </div>
          ))}
        </Card>
        <Card style={{ background: T.blueL, border: `1px solid ${T.blue}33` }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: T.blue }}>📧 INBOUND EMAIL</div>
          <div style={{ fontSize: "11px", color: T.muted, marginTop: "4px" }}>Vendor replies to procurement-funkfish@mail.posterita.com are auto-captured and matched to this RFQ</div>
        </Card>
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Procurement" subtitle="Sourcing → RFQ → PO → Receive" onBack={onBack} />
      <div style={{ display: "flex", gap: "4px", padding: "8px 12px", overflowX: "auto" }}>
        {tabs.map(([id, label]) => (
          <div key={id} onClick={() => setTab(id)} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
            background: tab === id ? "#0277BD" : T.paper, color: tab === id ? "#fff" : T.ink, border: `1px solid ${tab === id ? "#0277BD" : T.line}`, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</div>
        ))}
      </div>
      <div style={{ padding: "12px 16px" }}>
        {tab === "pipeline" && <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", overflowX: "auto" }}>
            {[["Sourcing", 1, T.amber], ["Quoting", 1, T.blue], ["Ordered", 1, T.green], ["Receiving", 0, T.muted]].map(([s, c, col]) => (
              <Card key={s} style={{ minWidth: "80px", textAlign: "center", padding: "10px", flex: "none" }}>
                <div style={{ fontSize: "20px", fontWeight: 800, color: col }}>{c}</div>
                <div style={{ fontSize: "10px", color: T.muted }}>{s}</div>
              </Card>
            ))}
          </div>
          {pipeline.map(p => (
            <Card key={p.id} onClick={() => setDetail(p)} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{p.id}</div>
                  <div style={{ fontSize: "12px", color: T.muted }}>{p.title}</div>
                  <div style={{ fontSize: "11px", color: T.muted }}>Qty: {p.qty}{p.rfqs ? ` · ${p.rfqs} RFQs · ${p.responses} replies` : ""}{p.aiVendors ? ` · ${p.aiVendors} AI suggestions` : ""}</div>
                </div>
                <StatusPill status={p.status} color={p.status === "quoting" ? T.blue : p.status === "ordered" ? T.green : T.amber} />
              </div>
            </Card>
          ))}
          <Btn full variant="secondary" style={{ marginTop: "8px" }}>+ New Sourcing Requirement</Btn>
        </>}
        {tab === "rfq" && rfqs.map(r => (
          <Card key={r.ref} onClick={() => setDetail(r)} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>{r.ref}</div>
                <div style={{ fontSize: "12px", color: T.muted }}>{r.vendor}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>{r.total}</div>
                <StatusPill status={r.status} color={r.status === "responded" ? T.green : T.blue} />
              </div>
            </div>
          </Card>
        ))}
        {tab === "po" && pos.map(p => (
          <Card key={p.ref} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>{p.ref}</div>
                <div style={{ fontSize: "12px", color: T.muted }}>{p.vendor} · {p.items} items</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>{p.total}</div>
                <StatusPill status={p.status} color={p.status === "approved" ? T.green : p.status === "received" ? T.blue : T.amber} />
              </div>
            </div>
          </Card>
        ))}
        {tab === "vendors" && <>
          {vendors.map(v => (
            <Card key={v.name} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{v.name}</div>
                  <div style={{ fontSize: "11px", color: T.muted }}>{v.country} · {v.orders} orders</div>
                </div>
                {v.verified ? <StatusPill status="✓ Verified" color={T.green} /> : <StatusPill status="⚠ Unverified" color={T.amber} />}
              </div>
              {!v.verified && <div style={{ marginTop: "6px", fontSize: "11px", color: T.blue, cursor: "pointer" }}>🤖 Run AI Verification</div>}
            </Card>
          ))}
          <Btn full variant="secondary" style={{ marginTop: "8px" }}>+ Add Vendor</Btn>
        </>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: MARKETPLACE ═══════════ (NEW v3.8)
const MarketplaceScreen = ({ onBack }) => {
  const [tab, setTab] = useState("catalog");
  const catalog = [
    { title: "Beach Hat Wide", pts: 500, retail: "$5.00", merchant: "Funky Fish", featured: false, redeemed: 12, max: null },
    { title: "Canvas Tote Natural", pts: 300, retail: "$3.00", merchant: "Funky Fish", featured: true, redeemed: 28, max: 50 },
    { title: "Gift Card Rs 200", pts: 800, retail: "$8.00", merchant: "Posterita", featured: true, redeemed: 45, max: null },
    { title: "Flip Flop Coral M", pts: 250, retail: "$2.50", merchant: "Funky Fish", featured: false, redeemed: 5, max: 20 },
  ];
  const transactions = [
    { customer: "Marie D.", item: "Canvas Tote", pts: 300, comm: 30, status: "fulfilled", time: "14:20" },
    { customer: "Jean-Luc R.", item: "Gift Card Rs 200", pts: 800, comm: 80, status: "pending", time: "13:45" },
    { customer: "Nadia S.", item: "Beach Hat", pts: 500, comm: 50, status: "fulfilled", time: "11:30" },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Redemption Marketplace" subtitle="Points → Products" onBack={onBack} />
      <div style={{ display: "flex", gap: "4px", padding: "8px 12px" }}>
        {[["catalog", "Catalog"], ["txn", "Redemptions"], ["stats", "Stats"]].map(([id, label]) => (
          <div key={id} onClick={() => setTab(id)} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
            background: tab === id ? T.purple : T.paper, color: tab === id ? "#fff" : T.ink, border: `1px solid ${tab === id ? T.purple : T.line}`, cursor: "pointer" }}>{label}</div>
        ))}
      </div>
      <div style={{ padding: "12px 16px" }}>
        {tab === "catalog" && <>
          {catalog.map(c => (
            <Card key={c.title} style={{ marginBottom: "8px", position: "relative" }}>
              {c.featured && <div style={{ position: "absolute", top: "8px", right: "8px" }}><StatusPill status="★ Featured" color={T.amber} /></div>}
              <div style={{ fontSize: "14px", fontWeight: 700 }}>{c.title}</div>
              <div style={{ fontSize: "11px", color: T.muted }}>{c.merchant} · Retail: {c.retail}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: T.purple }}>{c.pts} pts</div>
                <div style={{ fontSize: "11px", color: T.muted }}>{c.redeemed} redeemed{c.max ? ` / ${c.max}` : ""}</div>
              </div>
              {c.max && <div style={{ marginTop: "4px" }}><ProgressBar value={c.redeemed} max={c.max} color={T.purple} /></div>}
            </Card>
          ))}
          <Btn full variant="secondary" style={{ marginTop: "8px" }}>+ List Product in Marketplace</Btn>
        </>}
        {tab === "txn" && transactions.map((tx, i) => (
          <Card key={i} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>{tx.customer}</div>
                <div style={{ fontSize: "12px", color: T.muted }}>{tx.item} · {tx.time}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: T.purple }}>-{tx.pts} pts</div>
                <StatusPill status={tx.status} color={tx.status === "fulfilled" ? T.green : T.amber} />
              </div>
            </div>
            <div style={{ marginTop: "4px", fontSize: "10px", color: T.muted }}>Commission: {tx.comm} pts (${ (tx.comm * 0.01).toFixed(2) }) · Merchant receives: {tx.pts - tx.comm} pts</div>
          </Card>
        ))}
        {tab === "stats" && <>
          <Card style={{ marginBottom: "12px", background: `linear-gradient(135deg, ${T.purple}, #4527A0)`, border: "none" }}>
            <div style={{ color: "#fff" }}>
              <div style={{ fontSize: "11px", opacity: .7 }}>MARKETPLACE REVENUE (COMMISSION)</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>$16.00</div>
              <div style={{ fontSize: "11px", opacity: .7 }}>160 commission pts · 90 redemptions this month</div>
            </div>
          </Card>
          <Card style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Commission Tiers</div>
            {[["Standard (10%)", "Default for all merchants"], ["Volume (8%)", ">500 redemptions/month"], ["Premium (15%)", "Featured placement"]].map(([t, d]) => (
              <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.line}`, fontSize: "12px" }}>
                <span style={{ fontWeight: 600 }}>{t}</span><span style={{ color: T.muted }}>{d}</span>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Points Burned</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: T.red }}>14,400 pts</div>
            <div style={{ fontSize: "11px", color: T.muted }}>$144.00 liability reduced this month</div>
          </Card>
        </>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: ACCOUNTANT / FINANCIALS ═══════════ (NEW v3.8)
const AccountantScreen = ({ onBack }) => {
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Financials" subtitle="Cost reports & analytics" onBack={onBack} />
      <div style={{ padding: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          {[["Revenue", "Rs 1.42M", T.green, "↑ 12%"], ["COGS", "Rs 680K", T.red, "↓ 3%"], ["Margin", "52.1%", T.blue, "↑ 2.1pp"], ["Loyalty Liability", "$426.80", T.amber, "42,680 pts"]].map(([label, val, col, sub]) => (
            <Card key={label} style={{ textAlign: "center", padding: "12px" }}>
              <div style={{ fontSize: "10px", color: T.muted, fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: col, marginTop: "4px" }}>{val}</div>
              <div style={{ fontSize: "10px", color: T.muted }}>{sub}</div>
            </Card>
          ))}
        </div>
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>Container Cost Summary</div>
          {[{ ref: "CNTR-2026-008", fob: "$4,200", landed: "$5,612", margin: "48%" }, { ref: "CNTR-2026-007", fob: "$6,800", landed: "$8,940", margin: "51%" }].map(c => (
            <div key={c.ref} style={{ padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ fontWeight: 700 }}>{c.ref}</span>
                <span style={{ fontWeight: 700 }}>Landed: {c.landed}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: T.muted }}>
                <span>FOB: {c.fob}</span><span>Margin: {c.margin}</span>
              </div>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>PO Spending</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}><span>This month</span><span style={{ fontWeight: 700 }}>$11,000</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}><span>Last month</span><span style={{ fontWeight: 700 }}>$8,200</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}><span>Outstanding POs</span><span style={{ fontWeight: 700, color: T.amber }}>$4,200</span></div>
        </Card>
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Exchange Rates (Locked)</div>
          {[["USD → MUR", "45.50", "Locked on PO-018"], ["CNY → MUR", "6.23", "Locked on PO-017"], ["EUR → MUR", "49.80", "Manual entry"]].map(([pair, rate, note]) => (
            <div key={pair} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.line}`, fontSize: "12px" }}>
              <span style={{ fontWeight: 600 }}>{pair}</span><div style={{ textAlign: "right" }}><span style={{ fontWeight: 700 }}>{rate}</span><div style={{ fontSize: "10px", color: T.muted }}>{note}</div></div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Marketplace Commission</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}><span>This month revenue</span><span style={{ fontWeight: 700, color: T.green }}>$16.00</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}><span>Points burned</span><span style={{ fontWeight: 700, color: T.red }}>14,400 pts</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}><span>Net liability change</span><span style={{ fontWeight: 700, color: T.green }}>-$144.00</span></div>
        </Card>
      </div>
    </div>
  );
};

// ═══════════ MAIN APP ═══════════
export default function PosteritaPrototype() {
  const [screen, setScreen] = useState("start");
  const [role, setRole] = useState("owner");

  const phoneFrame = (children) => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "start", padding: "20px", minHeight: "100vh", background: "#E8E4DC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "390px", display: "flex", flexDirection: "column" }}>
        {/* Role + Screen Nav */}
        <div style={{ background: T.paper, borderRadius: "16px 16px 0 0", padding: "8px 12px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: T.blue }}>POSTERITA v3.8</div>
          <select value={role} onChange={e => { setRole(e.target.value); setScreen("home"); }} style={{ fontSize: "10px", padding: "3px 6px", borderRadius: "6px", border: `1px solid ${T.line}`, fontWeight: 700, background: T.paper }}>
            {["owner", "purchaser", "merchandiser", "accountant", "supervisor", "staff"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        {/* Quick Nav */}
        <div style={{ background: T.paper, padding: "4px 8px", borderBottom: `1px solid ${T.line}`, display: "flex", gap: "4px", overflowX: "auto" }}>
          {[["start", "🚀"], ["onboarding", "📱"], ["home", "🏠"], ["pos", "💳"], ["inventory", "📦"], ["loyalty", "❤️"], ["catalogue", "📄"],
            ["procurement", "📧"], ["marketplace", "🎁"], ["warehouse", "🏭"], ["logistics", "🚛"], ["staff", "👥"], ["shift", "⏰"],
            ["chat", "🤖"], ["accountant", "📊"], ["cash-collect", "💰"], ["barcode-store", "🏷️"], ["settings", "⚙️"], ["whatsapp", "💬"]
          ].map(([id, emoji]) => (
            <div key={id} onClick={() => { setScreen(id); if (id === "home") setRole(role); }} style={{
              padding: "3px 8px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
              background: screen === id ? T.blueL : "transparent", border: screen === id ? `1px solid ${T.blue}33` : "1px solid transparent",
            }} title={id}>{emoji}</div>
          ))}
        </div>
        {/* Screen */}
        <div style={{ height: "700px", overflowY: "auto", background: T.bg, borderRadius: "0 0 16px 16px", boxShadow: "0 4px 24px #0002" }}>
          {({
            start: (
              <div style={{ padding: "40px 24px", textAlign: "center", background: T.bg, minHeight: "100%" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🐠</div>
                <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "4px" }}>Posterita</div>
                <div style={{ fontSize: "14px", color: T.muted, marginBottom: "8px" }}>Retail OS v3.8</div>
                <div style={{ fontSize: "11px", color: T.muted, marginBottom: "32px" }}>8 roles · 41 sections · 21 screens</div>
                <Btn full onClick={() => setScreen("onboarding")}>Get Started</Btn>
                <div style={{ marginTop: "12px" }}><Btn full variant="ghost" onClick={() => setScreen("login-owner")}>I have an account</Btn></div>
                <div style={{ marginTop: "8px" }}>
                  <Btn full variant="secondary" onClick={() => setScreen("login-staff")}>Staff Login</Btn>
                </div>
              </div>
            ),
            onboarding: <OnboardingScreen onComplete={() => setScreen("home")} />,
            "login-owner": <LoginScreen isOwner onLogin={() => setScreen("home")} />,
            "login-staff": <LoginScreen onLogin={() => { setRole("staff"); setScreen("home"); }} />,
            home: <HomeScreen role={role} onNavigate={s => setScreen(s)} />,
            pos: <POSScreen onBack={() => setScreen("home")} />,
            whatsapp: <WhatsAppScreen onBack={() => setScreen("home")} />,
            chat: <AIChatScreen onBack={() => setScreen("home")} />,
            inventory: <InventoryScreen onBack={() => setScreen("home")} />,
            "barcode-store": <BarcodeStoreScreen onBack={() => setScreen("home")} />,
            logistics: <LogisticsScreen onBack={() => setScreen("home")} />,
            "cash-collect": <CashCollectionScreen onBack={() => setScreen("home")} />,
            warehouse: <ContainerScreen onBack={() => setScreen("home")} />,
            loyalty: <LoyaltyScreen onBack={() => setScreen("home")} />,
            catalogue: <CatalogueScreen onBack={() => setScreen("home")} />,
            staff: <StaffOpsScreen onBack={() => setScreen("home")} />,
            shift: <ShiftsScreen onBack={() => setScreen("home")} />,
            settings: <SettingsScreen onBack={() => setScreen("home")} />,
            procurement: <ProcurementScreen onBack={() => setScreen("home")} />,
            marketplace: <MarketplaceScreen onBack={() => setScreen("home")} />,
            accountant: <AccountantScreen onBack={() => setScreen("home")} />,
          })[screen] || <div style={{ padding: "40px", textAlign: "center", color: T.muted }}>Screen not found</div>}
        </div>
      </div>
    </div>
  );

  return phoneFrame();
}
