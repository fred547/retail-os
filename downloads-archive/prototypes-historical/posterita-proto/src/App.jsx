import { useState } from "react";

// ═══════════ BRAND TOKENS ═══════════
const T = {
  bg: "#F5F2EA", paper: "#FFFFFF", ink: "#141414", muted: "#6C6F76",
  line: "#E6E2DA", blue: "#1976D2", blueL: "#DCEBFF", blueD: "#1565C0",
  red: "#E53935", redL: "#FFEBEE", green: "#2E7D32", greenL: "#E8F5E9",
  amber: "#F57F17", amberL: "#FFF8E1", purple: "#5E35B1", purpleL: "#EDE7F6",
  teal: "#00838F", tealL: "#E0F7FA", brown: "#5D4037", brownL: "#EFEBE9",
  orange: "#FF6F00", orangeL: "#FFF3E0", pink: "#AD1457", pinkL: "#FCE4EC",
  indigo: "#283593", indigoL: "#E8EAF6", cyan: "#0277BD", cyanL: "#E1F5FE",
  deepGreen: "#00695C", deepGreenL: "#E0F2F1",
  radius: "14px", radiusXl: "24px",
};

// ═══════════ ICONS (comprehensive set) ═══════════
const Icon = ({ name, size = 20, color = T.ink }) => {
  const i = {
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
    gift: <><rect x="3" y="8" width="18" height="4" rx="1" stroke={color} strokeWidth="1.5" fill="none"/><rect x="5" y="12" width="14" height="9" rx="1" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 8v13M7.5 8C6 8 5 6.5 5 5.5S6 3 7.5 3c2 0 4.5 3 4.5 5M16.5 8C18 8 19 6.5 19 5.5S18 3 16.5 3c-2 0-4.5 3-4.5 5" stroke={color} strokeWidth="1.5" fill="none"/></>,
    cart: <><circle cx="9" cy="21" r="1" fill={color}/><circle cx="20" cy="21" r="1" fill={color}/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" stroke={color} strokeWidth="1.5" fill="none"/></>,
    search: <><circle cx="11" cy="11" r="8" stroke={color} strokeWidth="1.5" fill="none"/><path d="M21 21l-4.35-4.35" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M22 4l-10 8L2 4" stroke={color} strokeWidth="1.5" fill="none"/></>,
    globe: <><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke={color} strokeWidth="1.5" fill="none"/></>,
    ai: <><circle cx="12" cy="12" r="3" fill={color} opacity=".3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    cal: <><rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="1.5"/></>,
    plus: <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round"/>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.5" fill="none"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke={color} strokeWidth="1.5" fill="none"/><circle cx="7" cy="7" r="1" fill={color}/></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth="1.5" fill="none"/><circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5" fill="none"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth="1.5" fill="none"/></>,
    phone: <><rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 18h.01" stroke={color} strokeWidth="2" strokeLinecap="round"/></>,
    award: <><circle cx="12" cy="8" r="7" stroke={color} strokeWidth="1.5" fill="none"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" stroke={color} strokeWidth="1.5" fill="none"/></>,
    refresh: <><path d="M23 4v6h-6M1 20v-6h6" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24">{i[name] || i.doc}</svg>;
};

// ═══════════ SHARED COMPONENTS ═══════════
const Btn = ({ children, onClick, variant = "primary", full, small, disabled, icon }) => {
  const s = { primary: { background: T.blue, color: "#fff" }, secondary: { background: T.blueL, color: T.blue }, danger: { background: T.red, color: "#fff" }, ghost: { background: "transparent", color: T.blue, border: `1px solid ${T.line}` }, success: { background: T.green, color: "#fff" }, whatsapp: { background: "#25D366", color: "#fff" }, amber: { background: T.amber, color: "#fff" } };
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      ...s[variant], borderRadius: T.radius, border: s[variant].border || "none",
      padding: small ? "8px 14px" : "13px 24px", fontSize: small ? "12px" : "14px",
      fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", width: full ? "100%" : "auto",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      opacity: disabled ? 0.4 : 1, letterSpacing: "0.3px", transition: "all .15s",
    }}>{icon && <Icon name={icon} size={small ? 16 : 18} color={s[variant].color} />}{children}</button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", large, disabled }) => (
  <div style={{ marginBottom: "16px" }}>
    {label && <div style={{ fontSize: "13px", color: T.muted, marginBottom: "6px", fontWeight: 600 }}>{label}</div>}
    <input type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{ width: "100%", padding: large ? "16px" : "12px", borderRadius: T.radius,
        border: `1.5px solid ${T.line}`, fontSize: large ? "20px" : "15px", fontWeight: large ? 700 : 400,
        background: disabled ? T.bg : T.paper, color: T.ink, outline: "none", boxSizing: "border-box",
      }} />
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

const Pill = ({ label, color, bg }) => (
  <span style={{ padding: "3px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, background: bg || T.bg, color: color || T.muted, textTransform: "capitalize" }}>{label}</span>
);

const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: "6px", padding: "8px 12px", overflowX: "auto" }}>
    {tabs.map((t, idx) => (
      <div key={t} onClick={() => onChange(idx)} style={{
        padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
        background: idx === active ? T.blue : T.paper, color: idx === active ? "#fff" : T.ink,
        whiteSpace: "nowrap", border: `1px solid ${idx === active ? T.blue : T.line}`, cursor: "pointer",
      }}>{t}</div>
    ))}
  </div>
);

const StatCard = ({ label, value, sub, color, icon }) => (
  <Card style={{ flex: 1, padding: "12px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
      {icon && <Icon name={icon} size={14} color={color || T.muted} />}
      <span style={{ fontSize: "11px", color: T.muted, fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ fontSize: "18px", fontWeight: 800, color: color || T.ink }}>{value}</div>
    {sub && <div style={{ fontSize: "11px", color: T.muted }}>{sub}</div>}
  </Card>
);

const WhatsAppMsg = ({ from, children, time = "14:32", isMe }) => (
  <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", margin: "6px 0" }}>
    <div style={{ maxWidth: "80%", background: isMe ? "#DCF8C6" : "#fff", borderRadius: "12px",
      padding: "8px 12px", boxShadow: "0 1px 2px rgba(0,0,0,.08)", border: isMe ? "none" : "1px solid #e8e8e8" }}>
      {from && <div style={{ fontSize: "11px", fontWeight: 700, color: T.blue, marginBottom: "2px" }}>{from}</div>}
      <div style={{ fontSize: "13px", lineHeight: 1.45 }}>{children}</div>
      <div style={{ fontSize: "10px", color: T.muted, textAlign: "right", marginTop: "3px" }}>{time} {isMe && "✓✓"}</div>
    </div>
  </div>
);

const WAButton = ({ children, onClick }) => (
  <button onClick={onClick} style={{ display: "block", width: "100%", padding: "10px", margin: "4px 0",
    background: "transparent", border: `1px solid ${T.blue}`, borderRadius: "20px",
    color: T.blue, fontWeight: 600, fontSize: "13px", cursor: "pointer", textAlign: "center" }}>{children}</button>
);

const SectionHeader = ({ title, action, onAction }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", marginTop: "16px" }}>
    <div style={{ fontSize: "14px", fontWeight: 700 }}>{title}</div>
    {action && <div onClick={onAction} style={{ fontSize: "12px", color: T.blue, fontWeight: 600, cursor: "pointer" }}>{action}</div>}
  </div>
);

const EmptyState = ({ icon, title, sub }) => (
  <div style={{ textAlign: "center", padding: "40px 20px" }}>
    <Icon name={icon} size={40} color={T.muted} />
    <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "12px", color: T.ink }}>{title}</div>
    {sub && <div style={{ fontSize: "12px", color: T.muted, marginTop: "4px" }}>{sub}</div>}
  </div>
);

// ═══════════ SCREEN: OWNER ONBOARDING (10 steps from §6) ═══════════
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

  const aiProducts = [
    { name: "Classic Reef Sandal Navy", price: "Rs 1,290", cat: "Footwear", conf: 85, desc: "Durable reef sandal with quick-dry navy straps." },
    { name: "Canvas Tote Natural", price: "Rs 650", cat: "Accessories", conf: 78, desc: "Lightweight canvas tote for everyday beach-to-street use." },
    { name: "Board Short Tropical", price: "Rs 990", cat: "Menswear", conf: 72, desc: "Quick-dry board shorts with vibrant tropical print." },
    { name: "Flip Flop Coral M", price: "Rs 490", cat: "Footwear", conf: 90, desc: "Essential coral flip-flop in men's sizing." },
    { name: "Surf Wax Coconut", price: "Rs 180", cat: "Accessories", conf: 65, desc: "Tropical coconut-scented surf wax bar." },
    { name: "Bikini Set Ocean Blue", price: "Rs 1,450", cat: "Womenswear", conf: 70, desc: "Two-piece ocean blue bikini set with adjustable straps." },
  ];

  const steps = [
    <div key="phone" style={{ padding: "40px 20px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "32px", fontWeight: 800, color: T.blue, marginBottom: "4px" }}>Posterita</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "40px" }}>Retail OS</div>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>What's your mobile number?</div>
      <Input value={phone} onChange={setPhone} placeholder="+230 5XXX XXXX" large />
      <div style={{ fontSize: "12px", color: T.muted, marginBottom: "30px" }}>We'll send a code via WhatsApp to verify</div>
      <Btn full onClick={() => setStep(1)}>Next →</Btn>
    </div>,
    <div key="otp" style={{ padding: "40px 20px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>Enter the code</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "30px" }}>sent to {phone}</div>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "30px" }}>
        {[0,1,2,3,4,5].map(idx => (
          <div key={idx} style={{ width: "44px", height: "52px", borderRadius: "10px", border: `2px solid ${idx < otp.length ? T.blue : T.line}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 800,
            background: idx < otp.length ? T.blueL : T.paper, color: T.ink }}>{otp[idx] || ""}</div>
        ))}
      </div>
      <Btn full onClick={() => { setOtp("583921"); setTimeout(() => setStep(2), 300); }}>Verify</Btn>
      <div style={{ fontSize: "12px", color: T.blue, marginTop: "16px", cursor: "pointer" }}>Resend via WhatsApp</div>
    </div>,
    <div key="name" style={{ padding: "40px 20px 20px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px", textAlign: "center" }}>What's your name?</div>
      <Input value={name} onChange={setName} placeholder="Fred" large />
      <div style={{ height: "20px" }} />
      <Btn full onClick={() => setStep(3)} disabled={!name}>Next →</Btn>
    </div>,
    <div key="brand" style={{ padding: "40px 20px 20px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>What's your brand called?</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "24px", textAlign: "center" }}>This is what customers see</div>
      <Input value={brand} onChange={setBrand} placeholder="Funky Fish" large />
      <div style={{ height: "20px" }} />
      <Btn full onClick={() => setStep(4)} disabled={!brand}>Next →</Btn>
    </div>,
    <div key="loc" style={{ padding: "40px 20px 20px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>Where's your first store?</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "24px", textAlign: "center" }}>We'll set up your currency and address</div>
      <Input value={location} onChange={setLocation} placeholder="Grand Baie, Mauritius" large />
      <div style={{ height: "20px" }} />
      <Btn full onClick={() => setStep(5)} disabled={!location}>Next →</Btn>
    </div>,
    <div key="cat" style={{ padding: "30px 20px 20px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", textAlign: "center" }}>What do you sell?</div>
      {["Fashion & Apparel","Footwear","Electronics","Food & Beverage","Health & Beauty","Sports & Outdoor","Home & Living"].map(c => (
        <div key={c} onClick={() => setCategory(c)} style={{
          padding: "14px 16px", borderRadius: T.radius, border: `1.5px solid ${category === c ? T.blue : T.line}`,
          background: category === c ? T.blueL : T.paper, marginBottom: "8px", cursor: "pointer",
          fontWeight: category === c ? 700 : 400, color: category === c ? T.blue : T.ink, fontSize: "14px",
        }}>{c}</div>
      ))}
      <div style={{ height: "12px" }} />
      <Btn full onClick={() => setStep(6)} disabled={!category}>Next →</Btn>
    </div>,
    <div key="ai" style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "40px", marginBottom: "16px" }}>✨</div>
      <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Setting up {brand || "your brand"}</div>
      <div style={{ marginTop: "24px", textAlign: "left" }}>
        {["Creating your store...","Building products...","Setting up loyalty..."].map((t, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", fontSize: "14px" }}>
            <span style={{ color: T.green, fontWeight: 800 }}>✓</span> {t}
          </div>
        ))}
      </div>
      <div style={{ fontSize: "13px", color: T.muted, marginTop: "20px" }}>AI is generating a starter catalogue.<br/>You'll review each product before it goes live.</div>
      <div style={{ height: "30px" }} />
      <Btn full onClick={() => setStep(7)}>Review Products →</Btn>
    </div>,
    <div key="review" style={{ padding: "16px" }}>
      <div style={{ fontSize: "12px", color: T.muted, fontWeight: 600, marginBottom: "4px" }}>PRODUCT {aiReviewIdx + 1} OF {aiProducts.length}</div>
      <div style={{ height: "4px", background: T.line, borderRadius: "2px", marginBottom: "16px" }}>
        <div style={{ height: "100%", background: T.blue, borderRadius: "2px", width: `${((aiReviewIdx + 1) / aiProducts.length) * 100}%`, transition: "width .3s" }} />
      </div>
      <Card style={{ border: `1.5px solid ${T.blue}`, marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
          <span style={{ fontSize: "16px" }}>🤖</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: T.blue }}>AI SUGGESTION</span>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: aiProducts[aiReviewIdx].conf >= 80 ? T.green : T.amber, fontWeight: 700 }}>{aiProducts[aiReviewIdx].conf}% confidence</span>
        </div>
        <div style={{ fontSize: "17px", fontWeight: 800, marginBottom: "4px" }}>{aiProducts[aiReviewIdx].name}</div>
        <div style={{ fontSize: "15px", fontWeight: 700, color: T.blue, marginBottom: "4px" }}>{aiProducts[aiReviewIdx].price}</div>
        <div style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, color: T.muted, background: T.bg, borderRadius: "8px", padding: "3px 8px", marginBottom: "8px" }}>{aiProducts[aiReviewIdx].cat}</div>
        <div style={{ fontSize: "13px", color: T.muted, lineHeight: 1.4 }}>{aiProducts[aiReviewIdx].desc}</div>
      </Card>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <Btn full variant="success" onClick={() => { setApproved(a => a + 1); aiReviewIdx < aiProducts.length - 1 ? setAiReviewIdx(n => n + 1) : setStep(8); }} icon="check">Accept</Btn>
        <Btn full variant="ghost" onClick={() => { aiReviewIdx < aiProducts.length - 1 ? setAiReviewIdx(n => n + 1) : setStep(8); }}>Skip</Btn>
      </div>
      <Btn full variant="secondary" onClick={() => setStep(8)}>Skip All →</Btn>
      <div style={{ fontSize: "12px", color: T.muted, textAlign: "center", marginTop: "10px" }}>{approvedCount} products approved</div>
    </div>,
    <div key="pin" style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>Create your login PIN</div>
      <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginBottom: "30px" }}>
        {[0,1,2,3].map(idx => <div key={idx} style={{ width: "18px", height: "18px", borderRadius: "50%", background: idx < pin.length ? T.blue : T.line }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", maxWidth: "240px", margin: "0 auto" }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map(n => (
          <button key={n} onClick={() => n === "⌫" ? setPin(p => p.slice(0,-1)) : n !== "" && pin.length < 4 && setPin(p => p + n)}
            style={{ width: "64px", height: "64px", borderRadius: "50%", border: "none", fontSize: "22px",
              fontWeight: 700, background: n === "" ? "transparent" : T.bg, cursor: n === "" ? "default" : "pointer", margin: "0 auto" }}>{n}</button>
        ))}
      </div>
      {pin.length === 4 && <div style={{ marginTop: "20px" }}><Btn full onClick={() => setStep(9)}>Confirm PIN →</Btn></div>}
    </div>,
    <div key="done" style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
      <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "16px" }}>{brand || "Your store"} is ready!</div>
      {[`Account created`,`Brand: ${brand || "Funky Fish"}`,`Store: ${location || "Grand Baie"}`,`${approvedCount} products approved`,"Loyalty program active"].map((t, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", fontSize: "14px", justifyContent: "center" }}>
          <span style={{ color: T.green }}>✓</span> {t}
        </div>
      ))}
      <div style={{ fontSize: "13px", color: T.muted, marginTop: "16px", marginBottom: "24px" }}>You're the owner and admin.<br/>Invite staff from Settings.</div>
      <Btn full onClick={onComplete}>Go to Dashboard →</Btn>
    </div>,
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      {step > 0 && step < 9 && <div onClick={() => setStep(s => s - 1)} style={{ padding: "12px 16px", cursor: "pointer" }}><Icon name="back" /></div>}
      {steps[step]}
    </div>
  );
};

// ═══════════ SCREEN: LOGIN ═══════════
const LoginScreen = ({ onLogin, isOwner }) => {
  const [pin, setPin] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const staff = [{ name: "Sarah M.", role: "Cashier", avatar: "👩‍💼" },{ name: "Ravi P.", role: "Cashier", avatar: "👨‍💼" },{ name: "Amina K.", role: "Supervisor", avatar: "👩‍💻" }];

  if (isOwner) return (
    <div style={{ padding: "60px 20px", textAlign: "center", background: T.bg, minHeight: "100%" }}>
      <div style={{ fontSize: "14px", color: T.muted, marginBottom: "4px" }}>Welcome back</div>
      <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "4px" }}>Fred</div>
      <div style={{ fontSize: "14px", color: T.blue, fontWeight: 600, marginBottom: "40px" }}>Funky Fish</div>
      <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "20px" }}>Enter your PIN</div>
      <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginBottom: "30px" }}>
        {[0,1,2,3].map(idx => <div key={idx} style={{ width: "18px", height: "18px", borderRadius: "50%", background: idx < pin.length ? T.blue : T.line }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", maxWidth: "240px", margin: "0 auto" }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map(n => (
          <button key={n} onClick={() => { if (n === "⌫") setPin(p => p.slice(0,-1)); else if (n !== "" && pin.length < 4) { const np = pin + n; setPin(np); if (np.length === 4) setTimeout(() => onLogin("owner"), 300); }}}
            style={{ width: "64px", height: "64px", borderRadius: "50%", border: "none", fontSize: "22px", fontWeight: 700, background: n === "" ? "transparent" : T.paper, cursor: n === "" ? "default" : "pointer", margin: "0 auto" }}>{n}</button>
        ))}
      </div>
      <div style={{ fontSize: "13px", color: T.blue, marginTop: "20px", cursor: "pointer" }}>Use biometric ▸</div>
    </div>
  );

  return (
    <div style={{ padding: "30px 20px", background: T.bg, minHeight: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "12px", color: T.muted }}>Grand Baie · POS-GB-01</div>
        <div style={{ fontSize: "16px", fontWeight: 800, color: T.blue }}>Funky Fish</div>
      </div>
      <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Who's logging in?</div>
      {staff.map(s => (
        <Card key={s.name} onClick={() => setSelectedStaff(s.name)} style={{ marginBottom: "8px", border: `1.5px solid ${selectedStaff === s.name ? T.blue : T.line}`, background: selectedStaff === s.name ? T.blueL : T.paper }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>{s.avatar}</span>
            <div><div style={{ fontSize: "14px", fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: "12px", color: T.muted }}>{s.role}</div></div>
          </div>
        </Card>
      ))}
      {selectedStaff && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px" }}>Enter PIN</div>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginBottom: "20px" }}>
            {[0,1,2,3].map(idx => <div key={idx} style={{ width: "16px", height: "16px", borderRadius: "50%", background: idx < pin.length ? T.blue : T.line }} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxWidth: "200px", margin: "0 auto" }}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map(n => (
              <button key={n} onClick={() => { if (n === "⌫") setPin(p => p.slice(0,-1)); else if (n !== "" && pin.length < 4) { const np = pin + n; setPin(np); if (np.length === 4) setTimeout(() => onLogin("staff"), 300); }}}
                style={{ width: "52px", height: "52px", borderRadius: "50%", border: "none", fontSize: "18px", fontWeight: 700, background: n === "" ? "transparent" : T.paper, cursor: n === "" ? "default" : "pointer", margin: "0 auto" }}>{n}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════ SCREEN: HOME DASHBOARD ═══════════
const HomeScreen = ({ role, onNavigate }) => {
  const tiles = {
    owner: [
      { id: "pos", icon: "pos", label: "POS", color: T.blue },
      { id: "inventory", icon: "inventory", label: "Inventory", color: T.amber },
      { id: "barcode-store", icon: "barcode", label: "Barcode\nMy Store", color: T.purple },
      { id: "loyalty", icon: "loyalty", label: "Loyalty", color: T.red, badge: 3 },
      { id: "marketplace", icon: "gift", label: "Redeem\nMarket", color: T.pink },
      { id: "catalogue", icon: "printer", label: "Catalogue", color: T.green },
      { id: "procurement", icon: "cart", label: "Procure", color: T.cyan, badge: 4 },
      { id: "vendors", icon: "globe", label: "Vendors", color: T.deepGreen },
      { id: "logistics", icon: "truck", label: "Logistics", color: T.orange, badge: 2 },
      { id: "warehouse", icon: "warehouse", label: "Warehouse", color: T.brown, badge: 1 },
      { id: "staff", icon: "staff", label: "Staff Ops", color: T.teal },
      { id: "shift", icon: "shift", label: "Shifts", color: T.pink },
      { id: "chat", icon: "chat", label: "AI Chat", color: T.blue },
      { id: "cash-collect", icon: "dollar", label: "Cash\nCollection", color: T.green },
      { id: "whatsapp", icon: "whatsapp", label: "WhatsApp", color: "#25D366" },
      { id: "settings", icon: "settings", label: "Settings", color: T.muted },
    ],
    staff: [
      { id: "pos", icon: "pos", label: "POS", color: T.blue },
      { id: "inventory", icon: "inventory", label: "Inventory", color: T.amber },
      { id: "staff", icon: "staff", label: "Staff Ops", color: T.teal },
      { id: "shift", icon: "shift", label: "Shifts", color: T.pink },
      { id: "chat", icon: "chat", label: "AI Chat", color: T.blue },
    ],
  };
  const items = tiles[role] || tiles.owner;

  return (
    <div style={{ background: T.bg, minHeight: "100%", padding: "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "13px", color: T.muted }}>Grand Baie Store</div>
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
  const [view, setView] = useState("grid");
  const [loyaltyPhone, setLoyaltyPhone] = useState("");
  const [customerLinked, setCustomerLinked] = useState(false);
  const products = [
    { id: 1, name: "Reef Sandal Navy", price: 1290, cat: "Footwear", stock: 12 },
    { id: 2, name: "Canvas Tote Natural", price: 650, cat: "Accessories", stock: 8 },
    { id: 3, name: "Board Short Tropical", price: 990, cat: "Menswear", stock: 3 },
    { id: 4, name: "Flip Flop Coral M", price: 490, cat: "Footwear", stock: 24 },
    { id: 5, name: "Bikini Set Ocean", price: 1450, cat: "Womenswear", stock: 6 },
    { id: 6, name: "Surf Wax Coconut", price: 180, cat: "Accessories", stock: 0 },
  ];
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const addToCart = (p) => { if (p.stock === 0) return; setCart(c => { const ex = c.find(x => x.id === p.id); return ex ? c.map(x => x.id === p.id ? {...x, qty: x.qty+1} : x) : [...c, {...p, qty: 1}]; }); };

  if (view === "receipt") return (
    <div style={{ background: T.bg, minHeight: "100%", padding: "16px" }}>
      <Card style={{ textAlign: "center", fontFamily: "monospace", fontSize: "12px", lineHeight: 1.6 }}>
        <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "4px" }}>Funky Fish — Grand Baie</div>
        <div>Receipt #GBR-20260319-047</div>
        <div style={{ fontSize: "11px", color: T.muted }}>19 Mar 2026 · 14:32</div>
        <div style={{ borderTop: `1px dashed ${T.line}`, margin: "8px 0" }} />
        {cart.map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between" }}><span>{c.name} ×{c.qty}</span><span>Rs {(c.price*c.qty).toLocaleString()}</span></div>)}
        <div style={{ borderTop: `1px dashed ${T.line}`, margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px" }}><span>TOTAL</span><span>Rs {total.toLocaleString()}</span></div>
        {customerLinked && <div style={{ background: T.greenL, borderRadius: "8px", padding: "8px", marginTop: "8px", fontSize: "11px", color: T.green, fontWeight: 700 }}>✓ {Math.floor(total / 100)} loyalty points earned</div>}
        <div style={{ margin: "16px auto", width: "120px", height: "120px", background: T.ink, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="qr" size={80} color="#fff" /></div>
        <div style={{ fontSize: "11px", color: T.muted }}>Scan to earn loyalty points<br/>or get your digital receipt</div>
      </Card>
      <div style={{ marginTop: "12px" }}><Btn full onClick={() => { setView("grid"); setCart([]); setCustomerLinked(false); }}>New Sale</Btn></div>
      <div style={{ marginTop: "8px" }}><Btn full variant="ghost" onClick={onBack}>← Back to Home</Btn></div>
    </div>
  );

  if (view === "loyalty") return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Link Customer" onBack={() => setView("grid")} />
      <div style={{ padding: "16px" }}>
        <Input label="Customer phone" value={loyaltyPhone} onChange={setLoyaltyPhone} placeholder="+230 5XXX XXXX" />
        <Btn full onClick={() => { setCustomerLinked(true); setView("grid"); }}>Look Up</Btn>
        {loyaltyPhone.length > 5 && (
          <Card style={{ marginTop: "16px", border: `1.5px solid ${T.purple}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: T.purpleL, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="loyalty" size={20} color={T.purple} /></div>
              <div><div style={{ fontSize: "14px", fontWeight: 700 }}>Marie Laurent</div><div style={{ fontSize: "20px", fontWeight: 800, color: T.purple }}>420 pts</div></div>
            </div>
            <div style={{ marginTop: "8px", fontSize: "12px", color: T.muted }}>2 active vouchers · Member since Jan 2026</div>
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <TopBar title="POS" subtitle="Grand Baie" onBack={onBack}
        right={<div onClick={() => setView("loyalty")} style={{ cursor: "pointer", padding: "4px 10px", background: customerLinked ? T.greenL : T.purpleL, borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: customerLinked ? T.green : T.purple }}>{customerLinked ? "✓ Marie · 420pts" : "Link Customer"}</div>} />
      <TabBar tabs={["ALL","Footwear","Menswear","Womenswear","Accessories"]} active={0} onChange={() => {}} />
      <div style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {products.map(p => (
            <Card key={p.id} onClick={() => addToCart(p)} style={{ padding: "10px", opacity: p.stock === 0 ? 0.4 : 1, borderBottom: `3px solid ${p.stock >= 10 ? T.green : p.stock > 0 ? T.amber : T.red}` }}>
              <div style={{ height: "50px", background: T.bg, borderRadius: "8px", marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🏷️</div>
              <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.2, marginBottom: "2px" }}>{p.name}</div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: T.blue }}>Rs {p.price.toLocaleString()}</div>
              <div style={{ fontSize: "10px", color: p.stock > 0 ? T.muted : T.red }}>{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</div>
            </Card>
          ))}
        </div>
      </div>
      {cart.length > 0 && (
        <div style={{ padding: "12px", background: T.paper, borderTop: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: T.muted }}>{cart.reduce((s,c) => s+c.qty, 0)} items</span>
            <span style={{ fontSize: "18px", fontWeight: 800 }}>Rs {total.toLocaleString()}</span>
          </div>
          <Btn full onClick={() => setView("receipt")}>Pay — Rs {total.toLocaleString()}</Btn>
        </div>
      )}
    </div>
  );
};

// ═══════════ SCREEN: LOYALTY ═══════════
const LoyaltyScreen = ({ onBack }) => {
  const [tab, setTab] = useState(0);
  const [custDetail, setCustDetail] = useState(null);
  const customers = [
    { name: "Marie Laurent", phone: "+230 5423 9978", pts: 2340, lifetime: 4120, status: "active", since: "Jan 2026", vouchers: 2, source: "pos" },
    { name: "Jean-Pierre Cotte", phone: "+230 5712 0041", pts: 890, lifetime: 1540, status: "active", since: "Feb 2026", vouchers: 0, source: "whatsapp" },
    { name: "Priya Naidoo", phone: "+230 5819 3342", pts: 150, lifetime: 150, status: "active", since: "Mar 2026", vouchers: 1, source: "qr_scan" },
  ];
  const campaigns = [
    { name: "Summer Flash Sale", type: "voucher", status: "active", reach: 245, reward: "Rs 500 off (min Rs 2,000)" },
    { name: "Join Loyalty Survey", type: "survey", status: "active", reach: 180, reward: "20 bonus points" },
    { name: "Easter Weekend Bonus", type: "points_bonus", status: "draft", reach: 0, reward: "2× points on all purchases" },
  ];
  const vouchers = [
    { code: "FUNKY500", type: "Fixed Discount", value: "Rs 500 off", status: "active", assigned: "Marie Laurent", expires: "15 Apr 2026" },
    { code: "SUMMER20", type: "Percent Discount", value: "20% off", status: "active", assigned: "All members", expires: "30 Apr 2026" },
    { code: "FREEHAT", type: "Free Item", value: "Free Bucket Hat", status: "redeemed", assigned: "Jean-Pierre", expires: "10 Mar 2026" },
  ];

  if (custDetail) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title={custDetail.name} subtitle={custDetail.phone} onBack={() => setCustDetail(null)} right={<Pill label={custDetail.status} color={T.green} bg={T.greenL} />} />
      <div style={{ padding: "16px" }}>
        <Card style={{ background: `linear-gradient(135deg, ${T.purple}, #7B1FA2)`, border: "none", marginBottom: "12px" }}>
          <div style={{ color: "#fff" }}><div style={{ fontSize: "12px", opacity: .7 }}>LOYALTY BALANCE</div><div style={{ fontSize: "28px", fontWeight: 800 }}>{custDetail.pts.toLocaleString()} pts</div><div style={{ fontSize: "12px", opacity: .7 }}>Lifetime: {custDetail.lifetime.toLocaleString()} pts · {custDetail.vouchers} vouchers</div></div>
        </Card>
        <SectionHeader title="Points History" />
        {[{ desc: "Purchase #GBR-047", pts: "+31", date: "19 Mar", type: "order_earn" },{ desc: "Purchase #GBR-039", pts: "+28", date: "17 Mar", type: "order_earn" },{ desc: "Signup bonus", pts: "+100", date: "12 Jan", type: "campaign_award" },{ desc: "Voucher FUNKY500 issued", pts: "—", date: "10 Jan", type: "voucher" }].map((t, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.line}`, fontSize: "13px" }}>
            <div><div style={{ fontWeight: 600 }}>{t.desc}</div><div style={{ fontSize: "11px", color: T.muted }}>{t.date} · {t.type}</div></div>
            <div style={{ fontWeight: 700, color: t.pts.startsWith("+") ? T.green : T.muted }}>{t.pts}</div>
          </div>
        ))}
        <SectionHeader title="AI Insights" />
        <Card style={{ border: `1.5px solid ${T.blue}`, background: T.blueL + "44" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}><Icon name="ai" size={16} color={T.blue} /><span style={{ fontSize: "12px", fontWeight: 700, color: T.blue }}>AI AUGMENTATION</span></div>
          {[{ platform: "LinkedIn", match: "Marie Laurent, Store Manager @ Intermart Ltd", conf: 88, status: "confirmed" },{ platform: "Facebook", match: "Marie D.", conf: 72, status: "discovered" }].map((a, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderTop: idx > 0 ? `1px solid ${T.line}` : "none" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: a.status === "confirmed" ? T.greenL : T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: a.status === "confirmed" ? T.green : T.muted }}>{a.status === "confirmed" ? "✓" : "○"}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: "12px", fontWeight: 700 }}>{a.platform}</div><div style={{ fontSize: "11px", color: T.muted }}>{a.match}</div></div>
              <span style={{ fontSize: "10px", color: a.conf >= 80 ? T.green : T.amber, fontWeight: 700 }}>{a.conf}%</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Loyalty Program" subtitle="Funky Fish" onBack={onBack} />
      <TabBar tabs={["Customers","Campaigns","Vouchers","Config"]} active={tab} onChange={setTab} />
      <div style={{ padding: "12px" }}>
        {tab === 0 && <>{customers.map(c => (
          <Card key={c.phone} onClick={() => setCustDetail(c)} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: T.purpleL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: T.purple }}>{c.name[0]}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: "11px", color: T.muted }}>{c.phone} · via {c.source}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: "14px", fontWeight: 800, color: T.purple }}>{c.pts.toLocaleString()}</div><div style={{ fontSize: "10px", color: T.muted }}>pts</div></div>
            </div>
          </Card>
        ))}</>}
        {tab === 1 && <>{campaigns.map((c, idx) => (
          <Card key={idx} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "6px" }}><div style={{ fontSize: "14px", fontWeight: 700 }}>{c.name}</div><Pill label={c.status} color={c.status === "active" ? T.green : T.muted} bg={c.status === "active" ? T.greenL : T.bg} /></div>
            <div style={{ fontSize: "12px", color: T.muted }}>{c.type} · Reach: {c.reach} · {c.reward}</div>
          </Card>
        ))}<Btn full variant="secondary" icon="plus">New Campaign</Btn></>}
        {tab === 2 && <>{vouchers.map((v, idx) => (
          <Card key={idx} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}><div style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 800, color: T.blue }}>{v.code}</div><Pill label={v.status} color={v.status === "active" ? T.green : T.blue} bg={v.status === "active" ? T.greenL : T.blueL} /></div>
            <div style={{ fontSize: "12px", color: T.muted }}>{v.type} · {v.value}</div><div style={{ fontSize: "11px", color: T.muted }}>{v.assigned} · Exp: {v.expires}</div>
          </Card>
        ))}</>}
        {tab === 3 && <Card>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Points Configuration</div>
          {[{ label: "Points per Rs 100", value: "1 pt" },{ label: "Signup bonus", value: "100 pts" },{ label: "Survey reward", value: "20 pts" },{ label: "Min points per txn", value: "1 pt" },{ label: "Expiry", value: "Disabled" },{ label: "Currency", value: "MUR" }].map((r, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${T.line}`, fontSize: "13px" }}><span style={{ color: T.muted }}>{r.label}</span><span style={{ fontWeight: 700 }}>{r.value}</span></div>
          ))}
        </Card>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: MARKETPLACE ═══════════
const MarketplaceScreen = ({ onBack }) => {
  const [selected, setSelected] = useState(null);
  const [redeemed, setRedeemed] = useState(false);
  const items = [
    { id: 1, title: "Free Bucket Hat", brand: "Funky Fish", pts: 500, retail: "Rs 450", img: "🎩", featured: true, commission: "10%", stock: "14 left" },
    { id: 2, title: "Beach Towel XL", brand: "Funky Fish", pts: 800, retail: "Rs 750", img: "🏖️", featured: false, commission: "10%", stock: "8 left" },
    { id: 3, title: "10% off Helmet", brand: "Yadea Motors", pts: 300, retail: "Rs 500 discount", img: "⛑️", featured: false, commission: "10%", stock: "Unlimited" },
    { id: 4, title: "Free Oil Change", brand: "Yadea Motors", pts: 1200, retail: "Rs 1,100", img: "🔧", featured: true, commission: "8%", stock: "20 left" },
  ];

  if (redeemed) return (
    <div style={{ background: T.bg, minHeight: "100%", padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "48px", marginTop: "40px" }}>🎉</div><div style={{ fontSize: "20px", fontWeight: 800, marginTop: "12px" }}>Redeemed!</div>
      <div style={{ fontSize: "14px", color: T.muted, marginTop: "8px" }}>{selected?.title} from {selected?.brand}</div>
      <Card style={{ marginTop: "20px", textAlign: "left" }}>
        {[{ l: "Points spent", v: `-${selected?.pts}`, c: T.red },{ l: `Commission (${selected?.commission})`, v: `${Math.round(selected?.pts * 0.1)} pts`, c: T.amber },{ l: "Merchant receives", v: `${selected?.pts - Math.round(selected?.pts * 0.1)} pts`, c: T.green }].map((r, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", borderBottom: idx < 2 ? `1px solid ${T.line}` : "none" }}><span>{r.l}</span><span style={{ fontWeight: 700, color: r.c }}>{r.v}</span></div>
        ))}
      </Card>
      <div style={{ marginTop: "20px" }}><Btn full onClick={() => { setRedeemed(false); setSelected(null); }}>Back to Marketplace</Btn></div>
    </div>
  );

  if (selected) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title={selected.title} subtitle={selected.brand} onBack={() => setSelected(null)} />
      <div style={{ padding: "16px" }}>
        <div style={{ textAlign: "center", fontSize: "60px", padding: "20px 0" }}>{selected.img}</div>
        <div style={{ textAlign: "center", fontSize: "24px", fontWeight: 800, color: T.purple }}>{selected.pts} pts</div>
        <div style={{ textAlign: "center", fontSize: "13px", color: T.muted }}>Retail value: {selected.retail}</div>
        <Card style={{ marginTop: "16px" }}>
          {[{ l: "Brand", v: selected.brand },{ l: "Commission", v: selected.commission },{ l: "Availability", v: selected.stock }].map((r, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: idx > 0 ? `1px solid ${T.line}` : "none", fontSize: "13px" }}><span style={{ color: T.muted }}>{r.l}</span><span style={{ fontWeight: 600 }}>{r.v}</span></div>
          ))}
        </Card>
        <div style={{ marginTop: "16px" }}><Btn full onClick={() => setRedeemed(true)} icon="gift">Redeem for {selected.pts} pts</Btn></div>
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Redemption Marketplace" subtitle="Spend points across brands" onBack={onBack} right={<Btn small variant="secondary" icon="plus">List Item</Btn>} />
      <div style={{ padding: "12px" }}>
        {items.map(it => (
          <Card key={it.id} onClick={() => setSelected(it)} style={{ marginBottom: "8px", borderLeft: it.featured ? `4px solid ${T.pink}` : "none" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ fontSize: "28px" }}>{it.img}</div>
              <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ fontSize: "13px", fontWeight: 700 }}>{it.title}</span>{it.featured && <Pill label="Featured" color={T.pink} bg={T.pinkL} />}</div><div style={{ fontSize: "11px", color: T.muted }}>{it.brand} · {it.stock}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: "15px", fontWeight: 800, color: T.purple }}>{it.pts}</div><div style={{ fontSize: "10px", color: T.muted }}>pts</div></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: PROCUREMENT ═══════════
const ProcurementScreen = ({ onBack }) => {
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState(null);
  const sourcing = [
    { ref: "SRC-2026-042", title: "Summer sandals collection", status: "quoting", qty: 500, target: "$3.00/unit", rfqs: 3, deadline: "15 Apr 2026" },
    { ref: "SRC-2026-043", title: "Surfboard accessories", status: "sourcing", qty: 200, target: "$5.00/unit", rfqs: 0, deadline: "30 Apr 2026" },
    { ref: "SRC-2026-038", title: "Winter jackets batch", status: "ordered", qty: 300, target: "$12.00/unit", rfqs: 2, deadline: "01 Mar 2026" },
  ];
  const rfqs = [
    { ref: "RFQ-042-01", vendor: "Shenzhen Star Electronics", status: "responded", sent: "5 Mar", quoted: "$2.80/unit", delivery: "FOB", lead: "25 days" },
    { ref: "RFQ-042-02", vendor: "Guangzhou Happy Footwear", status: "responded", sent: "5 Mar", quoted: "$3.10/unit", delivery: "CIF", lead: "30 days" },
    { ref: "RFQ-042-03", vendor: "Mumbai Sole Traders", status: "sent", sent: "6 Mar", quoted: "—", delivery: "FOB", lead: "—" },
  ];
  const pos = [
    { ref: "PO-2026-019", vendor: "Shenzhen Star", status: "approved", total: "$1,400.00", rate: "45.50", created: "12 Mar" },
    { ref: "PO-2026-016", vendor: "Yadea International", status: "completed", total: "$8,200.00", rate: "44.80", created: "28 Feb" },
    { ref: "PO-2026-020", vendor: "Guangzhou Happy", status: "pending", total: "$620.00", rate: "45.50", created: "18 Mar" },
  ];

  if (detail) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title={detail.ref} subtitle={detail.title} onBack={() => setDetail(null)} />
      <div style={{ padding: "16px" }}>
        <Pill label={detail.status} color={T.purple} bg={T.purpleL} />
        <Card style={{ marginTop: "12px", marginBottom: "12px" }}><div style={{ fontSize: "14px", fontWeight: 700 }}>{detail.title}</div><div style={{ fontSize: "13px", color: T.muted }}>Qty: {detail.qty} · Target: {detail.target} · Due: {detail.deadline}</div></Card>
        <SectionHeader title="AI Vendor Suggestions" />
        <Card style={{ border: `1.5px solid ${T.blue}`, background: T.blueL + "44", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}><Icon name="ai" size={16} color={T.blue} /><span style={{ fontSize: "12px", fontWeight: 700, color: T.blue }}>AI PROPOSALS</span></div>
          {[{ name: "Shenzhen Star", reason: "Supplied similar in CNTR-2026-008.", conf: 92, existing: true },{ name: "Guangzhou Happy", reason: "Alibaba top-rated. MOQ 200.", conf: 78 },{ name: "Mumbai Sole", reason: "Competitive pricing for leather.", conf: 65 }].map((v, idx) => (
            <div key={idx} style={{ padding: "8px 0", borderTop: idx > 0 ? `1px solid ${T.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ fontSize: "12px", fontWeight: 700 }}>{idx+1}. {v.name}</span>{v.existing && <Pill label="Existing" color={T.green} bg={T.greenL} />}<span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: v.conf >= 80 ? T.green : T.amber }}>{v.conf}%</span></div>
              <div style={{ fontSize: "11px", color: T.muted, marginTop: "2px" }}>{v.reason}</div>
            </div>
          ))}
        </Card>
        <SectionHeader title={`RFQs (${detail.rfqs})`} action="+ New RFQ" />
        {rfqs.map(r => (
          <Card key={r.ref} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><div><div style={{ fontSize: "13px", fontWeight: 700 }}>{r.vendor}</div><div style={{ fontSize: "11px", color: T.muted }}>{r.ref} · Sent {r.sent}</div></div><Pill label={r.status} color={r.status === "responded" ? T.teal : T.purple} bg={r.status === "responded" ? T.tealL : T.purpleL} /></div>
            {r.quoted !== "—" && <div style={{ fontSize: "12px", fontWeight: 700, color: T.blue, marginTop: "4px" }}>{r.quoted} · {r.delivery} · {r.lead}</div>}
            {r.status === "responded" && <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><Btn small variant="success">Accept → PO</Btn><Btn small variant="ghost">Reject</Btn></div>}
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Procurement" subtitle="Sourcing → RFQ → PO" onBack={onBack} />
      <TabBar tabs={["Sourcing","RFQs","Purchase Orders"]} active={tab} onChange={setTab} />
      <div style={{ padding: "12px" }}>
        {tab === 0 && <>{sourcing.map(s => (
          <Card key={s.ref} onClick={() => setDetail(s)} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}><div style={{ fontSize: "11px", fontWeight: 700, color: T.blue }}>{s.ref}</div><Pill label={s.status} color={s.status === "quoting" ? T.purple : s.status === "ordered" ? T.blue : T.amber} bg={s.status === "quoting" ? T.purpleL : s.status === "ordered" ? T.blueL : T.amberL} /></div>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>{s.title}</div><div style={{ fontSize: "12px", color: T.muted }}>Qty: {s.qty} · Target: {s.target} · {s.rfqs} RFQs</div>
          </Card>
        ))}<Btn full variant="secondary" icon="plus">New Sourcing Requirement</Btn></>}
        {tab === 1 && <>{rfqs.map(r => (
          <Card key={r.ref} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}><div><div style={{ fontSize: "13px", fontWeight: 700 }}>{r.vendor}</div><div style={{ fontSize: "11px", color: T.muted }}>{r.ref} · Sent {r.sent}</div></div><Pill label={r.status} color={r.status === "responded" ? T.teal : T.purple} bg={r.status === "responded" ? T.tealL : T.purpleL} /></div>
            {r.quoted !== "—" && <div style={{ fontSize: "13px", fontWeight: 700, color: T.blue, marginTop: "4px" }}>{r.quoted} · {r.delivery} · {r.lead}</div>}
          </Card>
        ))}</>}
        {tab === 2 && <>{pos.map(p => (
          <Card key={p.ref} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}><div style={{ fontSize: "11px", fontWeight: 700, color: T.blue }}>{p.ref}</div><Pill label={p.status} color={p.status === "approved" ? T.green : p.status === "completed" ? T.blue : T.amber} bg={p.status === "approved" ? T.greenL : p.status === "completed" ? T.blueL : T.amberL} /></div>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>{p.vendor}</div><div style={{ fontSize: "12px", color: T.muted }}>{p.total} USD · Rate: {p.rate} MUR · {p.created}</div>
          </Card>
        ))}</>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: VENDORS ═══════════
const VendorsScreen = ({ onBack }) => {
  const [detail, setDetail] = useState(null);
  const vendors = [
    { name: "Shenzhen Star Electronics", country: "CN", status: "verified", terms: "Net 30", reg: "91440300MA5EX", orders: 5 },
    { name: "Guangzhou Happy Footwear", country: "CN", status: "unverified", terms: "Prepaid", reg: "—", orders: 0 },
    { name: "Mumbai Sole Traders", country: "IN", status: "pending", terms: "Net 45", reg: "U51909MH2020", orders: 1 },
    { name: "Yadea International", country: "CN", status: "verified", terms: "Net 60", reg: "91320500MA1M", orders: 8 },
  ];

  if (detail) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title={detail.name} subtitle={`${detail.country} · ${detail.terms}`} onBack={() => setDetail(null)} right={<Pill label={detail.status} color={detail.status === "verified" ? T.green : T.amber} bg={detail.status === "verified" ? T.greenL : T.amberL} />} />
      <div style={{ padding: "16px" }}>
        <Card style={{ marginBottom: "12px" }}>
          {[{ l: "Payment Terms", v: detail.terms },{ l: "Registration #", v: detail.reg },{ l: "Country", v: detail.country },{ l: "Total Orders", v: detail.orders }].map((r, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: idx > 0 ? `1px solid ${T.line}` : "none", fontSize: "13px" }}><span style={{ color: T.muted }}>{r.l}</span><span style={{ fontWeight: 600 }}>{r.v}</span></div>
          ))}
        </Card>
        <SectionHeader title="AI Verification" />
        <Card style={{ border: `1.5px solid ${detail.status === "verified" ? T.green : T.amber}`, background: detail.status === "verified" ? T.greenL + "44" : T.amberL + "44" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}><Icon name="shield" size={16} color={detail.status === "verified" ? T.green : T.amber} /><span style={{ fontSize: "12px", fontWeight: 700, color: detail.status === "verified" ? T.green : T.amber }}>{detail.status === "verified" ? "✓ VERIFIED" : "VERIFICATION PENDING"}</span></div>
          {detail.status === "verified" ? [{ src: "Company Registry", data: `Reg #: ${detail.reg}`, auth: true },{ src: "Tax Authority (VAT)", data: "VAT registered — Active", auth: true },{ src: "News (3 mentions)", data: "No negative findings", auth: false }].map((a, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "start", gap: "8px", padding: "8px 0", borderTop: idx > 0 ? `1px solid ${T.line}` : "none" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: a.auth ? T.greenL : T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: a.auth ? T.green : T.muted }}>{a.auth ? "✓" : "○"}</div>
              <div><div style={{ fontSize: "12px", fontWeight: 700 }}>{a.src}</div><div style={{ fontSize: "11px", color: T.muted }}>{a.data}</div></div>
            </div>
          )) : <div style={{ fontSize: "12px", color: T.muted }}>AI verification in progress. Checking government registries.</div>}
        </Card>
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Vendors" subtitle="Directory & Verification" onBack={onBack} right={<Btn small variant="secondary" icon="plus">Add</Btn>} />
      <div style={{ padding: "12px" }}>
        {vendors.map(v => (
          <Card key={v.name} onClick={() => setDetail(v)} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: v.status === "verified" ? T.greenL : T.amberL, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="shield" size={18} color={v.status === "verified" ? T.green : T.amber} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{v.name}</div><div style={{ fontSize: "11px", color: T.muted }}>{v.country} · {v.terms} · {v.orders} orders</div></div>
              <Pill label={v.status} color={v.status === "verified" ? T.green : T.amber} bg={v.status === "verified" ? T.greenL : T.amberL} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: WHATSAPP ═══════════
const WhatsAppScreen = ({ onBack }) => {
  const [at, setAt] = useState(0);
  const templates = [
    { name: "loyalty_welcome", title: "Welcome", msgs: [{ from: "Funky Fish", text: "🎉 Welcome to Funky Fish Loyalty, Marie!\n\nYou've earned 100 bonus points just for joining.\n\nYour balance: 100 pts", btns: ["My Points","Browse Catalogue","Store Info"] }] },
    { name: "points_earned", title: "Points", msgs: [{ from: "Funky Fish", text: "Thanks for your purchase, Marie! 🛍️\n\nYou earned 31 points.\nBalance: 451 points.\n\nOrder #GBR-20260319-047\nTotal: Rs 3,542", btns: ["View Receipt","My Points","Vouchers"] }] },
    { name: "voucher_issued", title: "Voucher", msgs: [{ from: "Funky Fish", text: "🎁 You've unlocked a voucher:\n\nRs 500 OFF\nCode: FUNKY500\nValid until: 15 Apr 2026\nMin spend: Rs 2,000", btns: ["View My Vouchers","Browse Catalogue"] }] },
    { name: "digital_receipt", title: "Receipt", msgs: [{ from: "Funky Fish", text: "📄 Digital receipt — Grand Baie\n\nOrder #GBR-047 · 19 Mar 2026\n\n• Reef Sandal Navy ×1 — Rs 1,290\n• Canvas Tote ×2 — Rs 1,300\n• Flip Flop Coral ×1 — Rs 490\n\nTotal: Rs 3,542\nPaid: Cash", btns: ["My Points","Rate Visit"] }] },
    { name: "receipt_scan_new", title: "QR Scan", msgs: [{ isMe: true, text: "RECEIPT GBR-20260319-047" },{ from: "Funky Fish", text: "Thanks for shopping at Funky Fish! 🏄\n\nJoin our loyalty program!\n\n🎁 Join now and get:\n• 31 points for this order\n• 100 bonus points for signing up", btns: ["Join Now (+131 pts)","No Thanks"] }] },
    { name: "redeem_catalog", title: "Redeem", msgs: [{ isMe: true, text: "REDEEM" },{ from: "Funky Fish", text: "🎁 Redemption Marketplace\n\nYour balance: 2,340 pts\n\nAvailable items:", btns: ["Free Bucket Hat (500 pts)","Beach Towel XL (800 pts)","10% off Helmet (300 pts)","More items..."] }] },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="WhatsApp Templates" subtitle="Customer message preview" onBack={onBack} />
      <TabBar tabs={templates.map(t => t.title)} active={at} onChange={setAt} />
      <div style={{ padding: "12px", background: "#ECE5DD", minHeight: "400px", borderRadius: `${T.radiusXl} ${T.radiusXl} 0 0`, margin: "8px 12px 0" }}>
        <div style={{ textAlign: "center", fontSize: "10px", color: T.muted, background: "#fff8", borderRadius: "8px", padding: "4px 12px", display: "inline-block", marginBottom: "12px" }}>Today</div>
        {templates[at].msgs.map((m, idx) => (
          <WhatsAppMsg key={idx} from={m.from} isMe={m.isMe}>{m.text}{m.btns && <div style={{ marginTop: "8px", borderTop: "1px solid #e8e8e8", paddingTop: "6px" }}>{m.btns.map(b => <WAButton key={b}>{b}</WAButton>)}</div>}</WhatsAppMsg>
        ))}
      </div>
      <div style={{ padding: "8px 12px", fontSize: "10px", color: T.muted, textAlign: "center" }}>Template: <code>{templates[at].name}</code></div>
    </div>
  );
};

// ═══════════ SCREEN: AI CHAT ═══════════
const AIChatScreen = ({ onBack }) => {
  const [msgs, setMsgs] = useState([{ from: "ai", text: "Hi Fred! Ask me anything about your store operations." }]);
  const [input, setInput] = useState("");
  const queries = [
    { q: "What were sales yesterday?", a: "Yesterday (18 Mar) at Grand Baie:\n• Revenue: Rs 38,420\n• Orders: 19\n• Top product: Reef Sandal Navy (7 sold)\n• Loyalty points awarded: 384" },
    { q: "How many sandals in stock?", a: "Sandal stock at Grand Baie:\n• Reef Sandal Navy: 12 units\n• Flip Flop Coral M: 24 units\n• Beach Sandal Classic: 8 units\nTotal: 44 across 3 SKUs" },
    { q: "Procurement status?", a: "📋 Pipeline:\n• Sourcing: 1 (Surfboard accessories)\n• Quoting: 1 (Summer sandals — 3 RFQs)\n• Ordered: 1 (Winter jackets — PO approved)\n\nShenzhen Star quoted $2.80/unit — best price." },
  ];
  const send = () => {
    if (!input.trim()) return;
    const q = input; setMsgs(m => [...m, { from: "user", text: q }]); setInput("");
    const match = queries.find(x => q.toLowerCase().includes(x.q.toLowerCase().split(" ")[2]));
    setTimeout(() => setMsgs(m => [...m, { from: "ai", text: match ? match.a : "Let me look that up in your system..." }]), 600);
  };
  return (
    <div style={{ background: T.bg, minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <TopBar title="AI Assistant" onBack={onBack} />
      <div style={{ flex: 1, padding: "12px", overflowY: "auto" }}>
        {msgs.map((m, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", marginBottom: "8px" }}>
            <div style={{ maxWidth: "85%", background: m.from === "user" ? T.blue : T.paper, color: m.from === "user" ? "#fff" : T.ink, borderRadius: "16px", padding: "10px 14px", fontSize: "13px", lineHeight: 1.5, whiteSpace: "pre-line", border: m.from === "ai" ? `1px solid ${T.line}` : "none" }}>
              {m.from === "ai" && <div style={{ fontSize: "10px", fontWeight: 700, color: T.blue, marginBottom: "4px" }}>🤖 Posterita AI</div>}{m.text}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
          {queries.map(q => <div key={q.q} onClick={() => setInput(q.q)} style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "11px", background: T.paper, border: `1px solid ${T.line}`, cursor: "pointer", color: T.blue, fontWeight: 600 }}>{q.q}</div>)}
        </div>
      </div>
      <div style={{ padding: "12px", background: T.paper, borderTop: `1px solid ${T.line}`, display: "flex", gap: "8px" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask anything..." style={{ flex: 1, padding: "10px 14px", borderRadius: "20px", border: `1px solid ${T.line}`, fontSize: "14px", outline: "none" }} />
        <Btn small onClick={send}>Send</Btn>
      </div>
    </div>
  );
};

// ═══════════ SCREEN: INVENTORY ═══════════
const InventoryScreen = ({ onBack }) => {
  const [phase, setPhase] = useState("start");
  const [scanned, setScanned] = useState([]);
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Inventory Count" subtitle="Full Count · Grand Baie" onBack={onBack} />
      {phase === "start" && <div style={{ padding: "20px" }}>
        <Card style={{ textAlign: "center", marginBottom: "12px" }}><Icon name="barcode" size={40} color={T.amber} /><div style={{ fontSize: "16px", fontWeight: 800, marginTop: "10px" }}>Scan Shelf QR to Start</div><div style={{ fontSize: "13px", color: T.muted, marginTop: "6px" }}>Dual-scan verification: 2 devices scan each shelf independently.</div></Card>
        <Btn full onClick={() => setPhase("scanning")}>📷 Simulate Shelf Scan</Btn>
      </div>}
      {phase === "scanning" && <div style={{ padding: "16px" }}>
        <Card style={{ background: T.amberL, border: `1.5px solid ${T.amber}`, marginBottom: "12px" }}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ fontSize: "11px", fontWeight: 700, color: T.amber }}>SHELF OPEN</div><div style={{ fontSize: "14px", fontWeight: 800 }}>GB-001-003A</div><div style={{ marginLeft: "auto", fontSize: "12px", color: T.muted }}>Scan 1 of 2</div></div></Card>
        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Scanned ({scanned.length})</div>
        {scanned.map((s, idx) => <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.line}`, fontSize: "13px" }}><span>{s.name}</span><span style={{ fontWeight: 700 }}>×{s.qty}</span></div>)}
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <Btn full variant="secondary" onClick={() => setScanned(s => [...s, { name: `Reef Sandal ${["Navy","Black","Tan","White"][s.length % 4]}`, qty: Math.floor(Math.random()*10)+1 }])}>📷 Scan Product</Btn>
          <Btn full variant="success" onClick={() => setPhase("closed")} disabled={scanned.length === 0}>Close Shelf</Btn>
        </div>
      </div>}
      {phase === "closed" && <div style={{ padding: "20px", textAlign: "center" }}>
        <div style={{ fontSize: "40px" }}>✅</div><div style={{ fontSize: "16px", fontWeight: 800 }}>Shelf GB-001-003A Closed</div><div style={{ fontSize: "13px", color: T.muted }}>{scanned.length} products · Scan 1 complete</div>
        <Card style={{ marginTop: "16px", background: T.amberL }}><div style={{ fontSize: "13px", fontWeight: 700, color: T.amber }}>⏳ Waiting for Scan 2</div><div style={{ fontSize: "12px", color: T.muted, marginTop: "4px" }}>Another device needs to scan independently</div></Card>
        <div style={{ marginTop: "16px" }}><Btn full onClick={() => { setPhase("start"); setScanned([]); }}>Next Shelf →</Btn></div>
      </div>}
    </div>
  );
};

// ═══════════ SCREEN: BARCODE MY STORE ═══════════
const BarcodeStoreScreen = ({ onBack }) => {
  const [step, setStep] = useState(0);
  const [approved, setApproved] = useState(0);
  const aiNames = ["Men's Canvas Slip-On Blue","Beach Flip-Flop Yellow","Reef Sandal Black","Surf Short Green"];
  const steps = [
    <div key="prep" style={{ padding: "20px", textAlign: "center" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>📦</div><div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Barcode My Store</div><div style={{ fontSize: "13px", color: T.muted, lineHeight: 1.5, marginBottom: "20px" }}>Go shelf by shelf. We'll photograph, identify with AI, and generate barcodes.</div><Btn full onClick={() => setStep(1)}>Start →</Btn></div>,
    <div key="photo" style={{ padding: "20px", textAlign: "center" }}><Card style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}><div style={{ textAlign: "center" }}><Icon name="camera" size={40} color={T.muted} /><div style={{ fontSize: "13px", color: T.muted, marginTop: "8px" }}>Tap to photograph products</div></div></Card><Btn full onClick={() => setStep(2)}>📷 Capture & Send to AI</Btn></div>,
    <div key="ai" style={{ padding: "16px" }}><div style={{ fontSize: "12px", color: T.muted, marginBottom: "4px" }}>AI IDENTIFIED</div>
      {aiNames.map((n, idx) => (
        <Card key={idx} style={{ marginBottom: "8px", border: `1.5px solid ${T.purple}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "20px" }}>📷</span><div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{n}</div><div style={{ fontSize: "11px", color: T.muted }}>Category: Footwear</div></div>
            <div style={{ display: "flex", gap: "6px" }}><div onClick={() => setApproved(a => a+1)} style={{ width: "28px", height: "28px", borderRadius: "50%", background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="check" size={14} color={T.green} /></div></div>
          </div>
        </Card>
      ))}
      <Btn full icon="printer" onClick={() => setStep(3)}>Print Labels ({approved || aiNames.length})</Btn>
    </div>,
    <div key="done" style={{ padding: "20px", textAlign: "center" }}><div style={{ fontSize: "40px" }}>🏷️</div><div style={{ fontSize: "18px", fontWeight: 800, marginTop: "8px" }}>Labels Ready!</div><div style={{ fontSize: "13px", color: T.muted, marginTop: "4px" }}>Labels in shelf walking order</div><div style={{ marginTop: "16px" }}><Btn full onClick={onBack}>Done</Btn></div></div>,
  ];
  return <div style={{ background: T.bg, minHeight: "100%" }}><TopBar title="Barcode My Store" onBack={onBack} />{steps[step]}</div>;
};

// ═══════════ SCREEN: LOGISTICS ═══════════
const LogisticsScreen = ({ onBack }) => {
  const [active, setActive] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const shipments = [{ id: "SHP-001", dest: "Grand Baie Store", packages: 3, cod: 3542 },{ id: "SHP-002", dest: "Marie Laurent", packages: 1, cod: 89000 }];
  const deliverySteps = [{ title: "Scan Packages", icon: "qr" },{ title: "Photo at Delivery", icon: "camera" },{ title: "Collect Payment", icon: "dollar" },{ title: "Recipient Signature", icon: "edit" },{ title: "Confirm Delivery", icon: "check" }];

  if (active) return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title={active.id} subtitle={active.dest} onBack={() => { setActive(null); setStepIdx(0); }} />
      <div style={{ padding: "12px" }}>
        {deliverySteps.map((s, idx) => (
          <Card key={idx} onClick={() => idx === stepIdx ? setStepIdx(j => j+1) : null} style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px", opacity: idx > stepIdx ? 0.4 : 1, border: `1.5px solid ${idx === stepIdx ? T.blue : idx < stepIdx ? T.green : T.line}`, background: idx < stepIdx ? T.greenL : T.paper }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: idx < stepIdx ? T.green : idx === stepIdx ? T.blue : T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx < stepIdx ? <Icon name="check" size={18} color="#fff" /> : <Icon name={s.icon} size={18} color={idx === stepIdx ? "#fff" : T.muted} />}</div>
            <div><div style={{ fontSize: "13px", fontWeight: 700 }}>{s.title}</div><div style={{ fontSize: "11px", color: T.muted }}>{idx < stepIdx ? "Completed" : idx === stepIdx ? "Tap to complete" : "Pending"}</div></div>
          </Card>
        ))}
        {stepIdx >= deliverySteps.length && <div style={{ textAlign: "center", padding: "20px" }}><div style={{ fontSize: "40px" }}>✅</div><div style={{ fontSize: "16px", fontWeight: 800, marginTop: "8px" }}>Delivery Complete!</div><div style={{ marginTop: "12px" }}><Btn full onClick={() => { setActive(null); setStepIdx(0); }}>Back</Btn></div></div>}
      </div>
    </div>
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Logistics" subtitle="Driver Dashboard" onBack={onBack} />
      <div style={{ padding: "12px" }}>
        <Card style={{ marginBottom: "12px", background: `linear-gradient(135deg, ${T.orange}, #E65100)`, border: "none" }}><div style={{ color: "#fff" }}><div style={{ fontSize: "12px", opacity: .7 }}>CASH IN VEHICLE</div><div style={{ fontSize: "22px", fontWeight: 800 }}>Rs 0</div></div></Card>
        {shipments.map(s => (
          <Card key={s.id} onClick={() => setActive(s)} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><div><div style={{ fontSize: "14px", fontWeight: 800 }}>{s.id}</div><div style={{ fontSize: "12px", color: T.muted }}>{s.dest} · {s.packages} pkg</div></div>{s.cod > 0 && <div style={{ background: T.greenL, borderRadius: "8px", padding: "4px 8px", fontSize: "11px", fontWeight: 700, color: T.green }}>COD Rs {s.cod.toLocaleString()}</div>}</div>
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
      <TopBar title="Cash Collection" onBack={onBack} />
      {step === 0 && <div style={{ padding: "16px" }}>
        <Card style={{ marginBottom: "12px" }}><div style={{ fontSize: "12px", color: T.muted, fontWeight: 600 }}>TILL CLOSED · 19 Mar 2026</div><div style={{ fontSize: "22px", fontWeight: 800, marginTop: "4px" }}>Rs 47,200</div><div style={{ fontSize: "12px", color: T.muted }}>Cash for collection</div></Card>
        <Btn full onClick={() => setStep(1)}>Declare Ready for Collection</Btn>
      </div>}
      {step === 1 && <div style={{ padding: "20px", textAlign: "center" }}>
        <div style={{ width: "140px", height: "140px", background: T.ink, borderRadius: "16px", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="qr" size={100} color="#fff" /></div>
        <div style={{ fontSize: "16px", fontWeight: 800 }}>Collection QR Ready</div><div style={{ fontSize: "13px", color: T.muted }}>Rs 47,200 · Show to driver</div>
        <div style={{ marginTop: "16px" }}><Btn full variant="success" onClick={() => setStep(2)}>Simulate: Driver Scans</Btn></div>
      </div>}
      {step === 2 && <div style={{ padding: "20px", textAlign: "center" }}>
        <div style={{ fontSize: "40px" }}>✅</div><div style={{ fontSize: "18px", fontWeight: 800 }}>Cash Collected</div><div style={{ fontSize: "14px", color: T.muted }}>Rs 47,200 · Driver: Jean-Pierre</div>
        <div style={{ marginTop: "16px" }}><Btn full onClick={onBack}>Done</Btn></div>
      </div>}
    </div>
  );
};

// ═══════════ SCREEN: CONTAINER RECEIVING ═══════════
const ContainerScreen = ({ onBack }) => {
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState([]);
  const docs = ["Commercial Invoice","Packing List","Bill of Lading","Import Permit","Insurance Certificate","Customs Declaration"];
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Container Receiving" subtitle="CNTR-2026-015" onBack={onBack} />
      {step === 0 && <div style={{ padding: "16px" }}>
        <Card style={{ marginBottom: "12px" }}><div style={{ fontSize: "12px", color: T.muted }}>SUPPLIER</div><div style={{ fontSize: "14px", fontWeight: 700 }}>Yadea International</div><div style={{ fontSize: "12px", color: T.muted }}>Sea freight · PO-2026-016</div></Card>
        <SectionHeader title="Document Vault" />
        {docs.map(d => <div key={d} onClick={() => setUploaded(u => u.includes(d) ? u : [...u, d])} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", marginBottom: "4px", background: T.paper, borderRadius: T.radius, border: `1px solid ${T.line}`, cursor: "pointer" }}><Icon name="doc" size={18} color={uploaded.includes(d) ? T.green : T.muted} /><span style={{ fontSize: "13px", fontWeight: uploaded.includes(d) ? 700 : 400, color: uploaded.includes(d) ? T.green : T.ink }}>{d}</span>{uploaded.includes(d) && <span style={{ marginLeft: "auto", fontSize: "11px", color: T.green }}>✓</span>}</div>)}
        <div style={{ marginTop: "12px" }}><Btn full onClick={() => setStep(1)} disabled={uploaded.length < 2}>Proceed to Inspection →</Btn></div>
      </div>}
      {step === 1 && <div style={{ padding: "16px" }}>
        <SectionHeader title="Inspect Packages" />
        {["PKG-01 · Scooter parts","PKG-02 · Helmets","PKG-03 · Yadea M6"].map((p, idx) => (
          <Card key={idx} style={{ marginBottom: "8px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{p}</div><Pill label={idx < 2 ? "Inspected" : "Pending"} color={idx < 2 ? T.green : T.amber} bg={idx < 2 ? T.greenL : T.amberL} /></div></Card>
        ))}
        <Btn full variant="success" onClick={() => setStep(2)}>Release PKG-01 to Store</Btn>
      </div>}
      {step === 2 && <div style={{ padding: "20px", textAlign: "center" }}><div style={{ fontSize: "40px" }}>📦 → 🏪</div><div style={{ fontSize: "16px", fontWeight: 800 }}>PKG-01 Released</div><div style={{ fontSize: "13px", color: T.muted }}>Sent to Grand Baie Store</div><Card style={{ marginTop: "16px", textAlign: "left" }}><div style={{ fontSize: "12px", color: T.muted }}>SELL NOW, COST LATER</div><div style={{ fontSize: "13px", marginTop: "4px" }}>Products available in POS with selling prices. Cost allocated when container is fully processed.</div></Card><div style={{ marginTop: "16px" }}><Btn full onClick={onBack}>Done</Btn></div></div>}
    </div>
  );
};

// ═══════════ SCREEN: STAFF OPS ═══════════
const StaffOpsScreen = ({ onBack }) => {
  const [tab, setTab] = useState(0);
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Staff Operations" subtitle="Grand Baie" onBack={onBack} />
      <TabBar tabs={["Leave","Expenses","Attendance","Tasks"]} active={tab} onChange={setTab} />
      <div style={{ padding: "12px" }}>
        {tab === 0 && <>{[{ dates: "21–22 Mar", type: "Annual", status: "approved" },{ dates: "5 Apr", type: "Sick", status: "pending" }].map((l, idx) => (
          <Card key={idx} style={{ marginBottom: "8px" }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontSize: "13px", fontWeight: 700 }}>{l.dates}</div><div style={{ fontSize: "11px", color: T.muted }}>{l.type} leave</div></div><Pill label={l.status} color={l.status === "approved" ? T.green : T.amber} bg={l.status === "approved" ? T.greenL : T.amberL} /></div></Card>
        ))}<Card style={{ background: T.blueL }}><div style={{ fontSize: "12px", fontWeight: 700, color: T.blue }}>LEAVE BALANCE</div><div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "13px" }}><span>Annual: 12d</span><span>Sick: 8d</span><span>Used: 3d</span></div></Card></>}
        {tab === 1 && <>{[{ desc: "Taxi to warehouse", amount: "Rs 450", status: "pending" },{ desc: "Printer ink", amount: "Rs 1,200", status: "approved" }].map((e, idx) => (
          <Card key={idx} style={{ marginBottom: "8px" }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{e.desc}</div><div style={{ textAlign: "right" }}><div style={{ fontSize: "14px", fontWeight: 800 }}>{e.amount}</div><Pill label={e.status} color={e.status === "approved" ? T.green : T.amber} bg={e.status === "approved" ? T.greenL : T.amberL} /></div></div></Card>
        ))}</>}
        {tab === 2 && <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>Today's Attendance</div>
          <div style={{ display: "flex", justifyContent: "space-around" }}><div><div style={{ fontSize: "20px", fontWeight: 800, color: T.green }}>08:02</div><div style={{ fontSize: "11px", color: T.muted }}>Time In</div></div><div><div style={{ fontSize: "20px", fontWeight: 800, color: T.muted }}>—</div><div style={{ fontSize: "11px", color: T.muted }}>Time Out</div></div></div>
          <div style={{ fontSize: "11px", color: T.muted, marginTop: "8px" }}>Scanned via QR · Shift: Morning 08:00-16:00</div>
        </Card>}
        {tab === 3 && <>{[{ task: "Restock Zone 3", priority: "high", status: "in_progress" },{ task: "Count back-room", priority: "medium", status: "pending" },{ task: "Update price tags", priority: "low", status: "completed" }].map((t, idx) => (
          <Card key={idx} style={{ marginBottom: "8px", borderLeft: `4px solid ${t.priority === "high" ? T.red : t.priority === "medium" ? T.amber : T.green}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: "13px", fontWeight: 700, textDecoration: t.status === "completed" ? "line-through" : "none" }}>{t.task}</div><Pill label={t.status.replace("_"," ")} color={t.status === "completed" ? T.green : t.status === "in_progress" ? T.blue : T.amber} bg={t.status === "completed" ? T.greenL : t.status === "in_progress" ? T.blueL : T.amberL} /></div>
          </Card>
        ))}</>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: SHIFTS ═══════════
const ShiftScreen = ({ onBack }) => {
  const [tab, setTab] = useState(0);
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Shift Planning" subtitle="Week of 17 Mar 2026" onBack={onBack} />
      <TabBar tabs={["My Shifts","All Shifts","Holidays"]} active={tab} onChange={setTab} />
      <div style={{ padding: "12px" }}>
        {tab === 0 && <>{[{ day: "Mon 17", shift: "Morning Cashier", time: "08:00–16:00", status: "approved" },{ day: "Tue 18", shift: "Morning Cashier", time: "08:00–16:00", status: "approved" },{ day: "Wed 19", shift: "Morning Cashier", time: "08:00–16:00", status: "approved" },{ day: "Thu 20", shift: "Afternoon Cashier", time: "14:00–22:00", status: "pending" }].map((s, idx) => (
          <Card key={idx} style={{ marginBottom: "8px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: "13px", fontWeight: 700 }}>{s.day} — {s.shift}</div><div style={{ fontSize: "11px", color: T.muted }}>{s.time}</div></div><Pill label={s.status} color={s.status === "approved" ? T.green : T.amber} bg={s.status === "approved" ? T.greenL : T.amberL} /></div></Card>
        ))}<Btn full variant="secondary" icon="plus">Request Shift for Fri–Sun</Btn></>}
        {tab === 1 && <>{[{ name: "Morning Cashier", time: "08:00–16:00", filled: "2/2" },{ name: "Afternoon Cashier", time: "14:00–22:00", filled: "1/2" },{ name: "Morning Supervisor", time: "08:00–16:00", filled: "1/1" }].map((s, idx) => (
          <Card key={idx} style={{ marginBottom: "8px" }}><div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontSize: "13px", fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: "11px", color: T.muted }}>{s.time}</div></div><span style={{ fontSize: "12px", fontWeight: 700, color: s.filled.startsWith("2/2") || s.filled.startsWith("1/1") ? T.green : T.amber }}>{s.filled}</span></div></Card>
        ))}</>}
        {tab === 2 && <>{[{ date: "1 Jan", name: "New Year's Day" },{ date: "1 Feb", name: "Abolition of Slavery" },{ date: "26 Feb", name: "Maha Shivaratree" },{ date: "12 Mar", name: "National Day" },{ date: "1 May", name: "Labour Day" }].map((h, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.line}`, fontSize: "13px" }}><div><span style={{ fontWeight: 700 }}>{h.date}</span> — {h.name}</div><Pill label="✓" color={T.green} bg={T.greenL} /></div>
        ))}</>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: CATALOGUE ═══════════
const CatalogueScreen = ({ onBack }) => {
  const [tab, setTab] = useState(0);
  const products = [
    { name: "Reef Sandal Navy", price: 1290, cat: "Footwear", enriched: true, barcode: "RF-SND-NVY-001" },
    { name: "Canvas Tote Natural", price: 650, cat: "Accessories", enriched: true, barcode: "CV-TOT-NAT-001" },
    { name: "Board Short Tropical", price: 990, cat: "Menswear", enriched: false, barcode: "BD-SHT-TRP-001" },
    { name: "Flip Flop Coral M", price: 490, cat: "Footwear", enriched: true, barcode: "FF-CRL-M-001" },
    { name: "Bikini Set Ocean", price: 1450, cat: "Womenswear", enriched: false, barcode: "BK-SET-OCN-001" },
  ];
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Product Catalogue" subtitle="Funky Fish" onBack={onBack} right={<Btn small variant="secondary" icon="ai">AI Enrich</Btn>} />
      <TabBar tabs={["Products","PDF Catalogue","Enrichment Queue"]} active={tab} onChange={setTab} />
      <div style={{ padding: "12px" }}>
        {tab === 0 && <>{products.map((p, idx) => (
          <Card key={idx} style={{ marginBottom: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><div style={{ width: "44px", height: "44px", background: T.bg, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🏷️</div><div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: "11px", color: T.muted }}>{p.cat} · {p.barcode} · Rs {p.price.toLocaleString()}</div></div>{p.enriched && <Pill label="AI ✓" color={T.blue} bg={T.blueL} />}</div></Card>
        ))}</>}
        {tab === 1 && <div style={{ textAlign: "center", padding: "20px" }}><div style={{ fontSize: "60px" }}>📄</div><div style={{ fontSize: "16px", fontWeight: 800, marginTop: "12px" }}>Generate PDF Catalogue</div><div style={{ fontSize: "13px", color: T.muted, marginTop: "8px", marginBottom: "20px" }}>{products.filter(p => p.enriched).length} products ready</div><Btn full icon="printer">Generate PDF</Btn><div style={{ marginTop: "8px" }}><Btn full variant="whatsapp" icon="whatsapp">Share via WhatsApp</Btn></div></div>}
        {tab === 2 && <>{products.filter(p => !p.enriched).map((p, idx) => (
          <Card key={idx} style={{ marginBottom: "8px", border: `1.5px solid ${T.amber}` }}><div style={{ display: "flex", alignItems: "center", gap: "10px" }}><Icon name="ai" size={20} color={T.amber} /><div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: "11px", color: T.muted }}>Needs: description, specs</div></div><Btn small variant="secondary">Enrich</Btn></div></Card>
        ))}</>}
      </div>
    </div>
  );
};

// ═══════════ SCREEN: SETTINGS ═══════════
const SettingsScreen = ({ onBack }) => {
  const sections = [
    { icon: "staff", label: "Store Info", sub: "Grand Baie · Funky Fish · MUR" },
    { icon: "users", label: "Staff & Invites", sub: "3 staff · Invite via WhatsApp" },
    { icon: "phone", label: "Devices", sub: "2 enrolled · POS-GB-01, POS-GB-02" },
    { icon: "loyalty", label: "Loyalty Config", sub: "1pt per Rs 100 · 100 signup bonus" },
    { icon: "printer", label: "Printers", sub: "Epson T-M30 · Zebra ZD230" },
    { icon: "shield", label: "Security", sub: "PIN policy · Device revocation" },
    { icon: "globe", label: "Brands", sub: "Funky Fish · Add another brand" },
    { icon: "dollar", label: "Billing", sub: "Pro plan · Next: 1 Apr 2026" },
  ];
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Settings" onBack={onBack} />
      <div style={{ padding: "12px" }}>
        {sections.map((s, idx) => (
          <Card key={idx} style={{ marginBottom: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "12px" }}><div style={{ width: "36px", height: "36px", borderRadius: "10px", background: T.blueL, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={s.icon} size={18} color={T.blue} /></div><div style={{ flex: 1 }}><div style={{ fontSize: "14px", fontWeight: 700 }}>{s.label}</div><div style={{ fontSize: "11px", color: T.muted }}>{s.sub}</div></div></div></Card>
        ))}
        <div style={{ marginTop: "20px", textAlign: "center" }}><div style={{ fontSize: "11px", color: T.muted }}>Posterita Retail OS v3.8</div><div style={{ fontSize: "10px", color: T.line, marginTop: "4px" }}>8 roles · 41 sections · Offline-first</div></div>
      </div>
    </div>
  );
};

// ═══════════ MAIN APP ═══════════
export default function App() {
  const [screen, setScreen] = useState("start");
  const [role, setRole] = useState("owner");

  const phoneFrame = (children) => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100vh",
      background: "#E8E4DB", padding: "20px", fontFamily: "'SF Pro Display', 'Helvetica Neue', sans-serif" }}>
      <div style={{ width: "375px", minHeight: "812px", background: T.bg, borderRadius: "40px",
        boxShadow: "0 25px 60px rgba(0,0,0,.18)", overflow: "hidden", position: "relative",
        border: "8px solid #1a1a1a" }}>
        <div style={{ height: "34px", background: T.paper, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ width: "80px", height: "5px", background: "#1a1a1a", borderRadius: "3px" }} />
        </div>
        <div style={{ height: "calc(812px - 34px)", overflowY: "auto" }}>{children}</div>
      </div>
      <div style={{ marginLeft: "24px", maxWidth: "220px", position: "sticky", top: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 800, color: T.ink, marginBottom: "4px" }}>Posterita Retail OS</div>
        <div style={{ fontSize: "12px", color: T.muted, marginBottom: "16px" }}>Clickable Prototype v3.8</div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: T.muted, marginBottom: "8px" }}>QUICK JUMP — 22 SCREENS</div>
        {[
          ["start", "🚀 Start Screen"],["onboarding", "📱 Owner Onboarding"],["login-owner", "🔑 Owner Login"],["login-staff", "👤 Staff Login"],
          ["home", "🏠 Home Dashboard"],["pos", "💳 POS + Receipt QR"],["loyalty", "❤️ Loyalty Program"],["marketplace", "🎁 Redeem Marketplace"],
          ["procurement", "🛒 Procurement Pipeline"],["vendors", "🌐 Vendors + AI Verify"],["catalogue", "📖 Catalogue + AI"],
          ["whatsapp", "💬 WhatsApp Templates"],["chat", "🤖 AI Chat"],["inventory", "📦 Inventory Count"],["barcode-store", "🏷️ Barcode My Store"],
          ["logistics", "🚚 Logistics / Driver"],["cash-collect", "💰 Cash Collection"],["warehouse", "🏭 Container Receiving"],
          ["staff", "👥 Staff Operations"],["shift", "⏰ Shift Planning"],["settings", "⚙️ Settings"],
        ].map(([id, label]) => (
          <div key={id} onClick={() => { setScreen(id); if (id === "home") setRole("owner"); }}
            style={{ padding: "5px 10px", fontSize: "11px", cursor: "pointer", borderRadius: "8px",
              background: screen === id ? T.blueL : "transparent", color: screen === id ? T.blue : T.ink,
              fontWeight: screen === id ? 700 : 400, marginBottom: "1px" }}>{label}</div>
        ))}
        <div style={{ marginTop: "16px", padding: "10px", background: T.paper, borderRadius: T.radius, border: `1px solid ${T.line}` }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: T.muted, marginBottom: "6px" }}>ROLE SWITCH</div>
          {["owner","staff"].map(r => (
            <div key={r} onClick={() => { setRole(r); setScreen("home"); }} style={{ padding: "4px 8px", fontSize: "11px", cursor: "pointer", borderRadius: "6px",
              background: role === r ? T.blueL : "transparent", color: role === r ? T.blue : T.muted, fontWeight: role === r ? 700 : 400, textTransform: "capitalize", marginBottom: "2px" }}>{r}</div>
          ))}
        </div>
      </div>
    </div>
  );

  const goHome = () => setScreen("home");
  const nav = (s) => setScreen(s);
  const screens = {
    "start": <div style={{ padding: "80px 24px", textAlign: "center", background: `linear-gradient(180deg, ${T.paper} 0%, ${T.bg} 100%)`, minHeight: "100%" }}>
      <div style={{ fontSize: "42px", fontWeight: 900, color: T.blue, letterSpacing: "-1px" }}>Posterita</div>
      <div style={{ fontSize: "14px", color: T.muted, marginBottom: "60px", letterSpacing: "3px" }}>RETAIL OS</div>
      <Btn full onClick={() => setScreen("onboarding")}>Get Started</Btn>
      <div style={{ marginTop: "12px" }}><Btn full variant="ghost" onClick={() => setScreen("login-owner")}>I have an account</Btn></div>
      <div style={{ marginTop: "40px" }}><div style={{ fontSize: "11px", color: T.muted, marginBottom: "8px" }}>STAFF? TAP BELOW</div><Btn full variant="secondary" onClick={() => setScreen("login-staff")}>Staff Login</Btn></div>
    </div>,
    "onboarding": <OnboardingScreen onComplete={goHome} />,
    "login-owner": <LoginScreen isOwner onLogin={() => setScreen("home")} />,
    "login-staff": <LoginScreen onLogin={() => { setRole("staff"); setScreen("home"); }} />,
    "home": <HomeScreen role={role} onNavigate={nav} />,
    "pos": <POSScreen onBack={goHome} />,
    "loyalty": <LoyaltyScreen onBack={goHome} />,
    "marketplace": <MarketplaceScreen onBack={goHome} />,
    "procurement": <ProcurementScreen onBack={goHome} />,
    "vendors": <VendorsScreen onBack={goHome} />,
    "whatsapp": <WhatsAppScreen onBack={goHome} />,
    "chat": <AIChatScreen onBack={goHome} />,
    "inventory": <InventoryScreen onBack={goHome} />,
    "barcode-store": <BarcodeStoreScreen onBack={goHome} />,
    "logistics": <LogisticsScreen onBack={goHome} />,
    "cash-collect": <CashCollectionScreen onBack={goHome} />,
    "warehouse": <ContainerScreen onBack={goHome} />,
    "staff": <StaffOpsScreen onBack={goHome} />,
    "shift": <ShiftScreen onBack={goHome} />,
    "catalogue": <CatalogueScreen onBack={goHome} />,
    "settings": <SettingsScreen onBack={goHome} />,
  };

  return phoneFrame(screens[screen] || screens.start);
}
