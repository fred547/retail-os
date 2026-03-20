import { useState, useEffect, useRef } from "react";

// ═══════════ BRAND TOKENS ═══════════
const T = {
  bg: "#F5F2EA", paper: "#FFFFFF", ink: "#141414", muted: "#6C6F76",
  line: "#E6E2DA", blue: "#1976D2", blueL: "#DCEBFF", blueD: "#1565C0",
  red: "#E53935", green: "#2E7D32", greenL: "#E8F5E9", amber: "#F57F17",
  amberL: "#FFF8E1", purple: "#5E35B1", purpleL: "#EDE7F6",
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
  };
  return <svg width={size} height={size} viewBox="0 0 24 24">{icons[name]}</svg>;
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

// ═══════════ SCREEN: OWNER ONBOARDING ═══════════
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
    // Step 0: Welcome + Phone
    <div key="phone" style={{ padding: "40px 20px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "32px", fontWeight: 800, color: T.blue, marginBottom: "4px" }}>Posterita</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "40px" }}>Retail OS</div>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>What's your mobile number?</div>
      <Input value={phone} onChange={setPhone} placeholder="+230 5XXX XXXX" large />
      <div style={{ fontSize: "12px", color: T.muted, marginBottom: "30px" }}>We'll send a code via WhatsApp to verify</div>
      <Btn full onClick={() => setStep(1)}>Next →</Btn>
    </div>,
    // Step 1: OTP
    <div key="otp" style={{ padding: "40px 20px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>Enter the code</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "30px" }}>sent to {phone}</div>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "30px" }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ width: "44px", height: "52px", borderRadius: "10px", border: `2px solid ${i < otp.length ? T.blue : T.line}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 800,
            background: i < otp.length ? T.blueL : T.paper, color: T.ink }}>{otp[i] || ""}</div>
        ))}
      </div>
      <Btn full onClick={() => { setOtp("583921"); setTimeout(() => setStep(2), 300); }}>Verify</Btn>
      <div style={{ fontSize: "12px", color: T.blue, marginTop: "16px", cursor: "pointer" }}>Resend via WhatsApp</div>
    </div>,
    // Step 2: Name
    <div key="name" style={{ padding: "40px 20px 20px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px", textAlign: "center" }}>What's your name?</div>
      <Input value={name} onChange={setName} placeholder="Fred" large />
      <div style={{ height: "20px" }} />
      <Btn full onClick={() => setStep(3)} disabled={!name}>Next →</Btn>
    </div>,
    // Step 3: Brand Name
    <div key="brand" style={{ padding: "40px 20px 20px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>What's your brand called?</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "24px", textAlign: "center" }}>This is what customers see</div>
      <Input value={brand} onChange={setBrand} placeholder="Funky Fish" large />
      <div style={{ height: "20px" }} />
      <Btn full onClick={() => setStep(4)} disabled={!brand}>Next →</Btn>
    </div>,
    // Step 4: Location
    <div key="loc" style={{ padding: "40px 20px 20px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>Where's your first store?</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "24px", textAlign: "center" }}>We'll set up your currency and address</div>
      <Input value={location} onChange={setLocation} placeholder="Grand Baie, Mauritius" large />
      <div style={{ height: "20px" }} />
      <Btn full onClick={() => setStep(5)} disabled={!location}>Next →</Btn>
    </div>,
    // Step 5: Category
    <div key="cat" style={{ padding: "30px 20px 20px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", textAlign: "center" }}>What do you sell?</div>
      {["Fashion & Apparel", "Footwear", "Electronics", "Food & Beverage", "Health & Beauty", "Sports & Outdoor", "Home & Living"].map(c => (
        <div key={c} onClick={() => setCategory(c)} style={{
          padding: "14px 16px", borderRadius: T.radius, border: `1.5px solid ${category === c ? T.blue : T.line}`,
          background: category === c ? T.blueL : T.paper, marginBottom: "8px", cursor: "pointer",
          fontWeight: category === c ? 700 : 400, color: category === c ? T.blue : T.ink, fontSize: "14px",
        }}>{c}</div>
      ))}
      <div style={{ height: "12px" }} />
      <Btn full onClick={() => setStep(6)} disabled={!category}>Next →</Btn>
    </div>,
    // Step 6: AI Building
    <div key="ai" style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "40px", marginBottom: "16px" }}>✨</div>
      <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Setting up {brand || "your brand"}</div>
      <div style={{ marginTop: "24px", textAlign: "left" }}>
        {["Creating your store...", "Building products...", "Setting up loyalty..."].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", fontSize: "14px" }}>
            <span style={{ color: T.green, fontWeight: 800 }}>✓</span> {t}
          </div>
        ))}
      </div>
      <div style={{ fontSize: "13px", color: T.muted, marginTop: "20px" }}>AI is generating a starter catalogue.<br/>You'll review each product before it goes live.</div>
      <div style={{ height: "30px" }} />
      <Btn full onClick={() => setStep(7)}>Review Products →</Btn>
    </div>,
    // Step 7: AI Product Review
    <div key="review" style={{ padding: "16px" }}>
      <div style={{ fontSize: "12px", color: T.muted, fontWeight: 600, marginBottom: "4px" }}>PRODUCT {aiReviewIdx + 1} OF {aiProducts.length}</div>
      <div style={{ height: "4px", background: T.line, borderRadius: "2px", marginBottom: "16px" }}>
        <div style={{ height: "100%", background: T.blue, borderRadius: "2px", width: `${((aiReviewIdx + 1) / aiProducts.length) * 100}%`, transition: "width .3s" }} />
      </div>
      <Card style={{ border: `1.5px solid ${T.blue}`, marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
          <span style={{ fontSize: "16px" }}>🤖</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: T.blue }}>AI SUGGESTION</span>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: aiProducts[aiReviewIdx].conf >= 80 ? T.green : T.amber, fontWeight: 700 }}>
            {aiProducts[aiReviewIdx].conf}% confidence
          </span>
        </div>
        <div style={{ fontSize: "17px", fontWeight: 800, marginBottom: "4px" }}>{aiProducts[aiReviewIdx].name}</div>
        <div style={{ fontSize: "15px", fontWeight: 700, color: T.blue, marginBottom: "4px" }}>{aiProducts[aiReviewIdx].price}</div>
        <div style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, color: T.muted, background: T.bg, borderRadius: "8px", padding: "3px 8px", marginBottom: "8px" }}>{aiProducts[aiReviewIdx].cat}</div>
        <div style={{ fontSize: "13px", color: T.muted, lineHeight: 1.4 }}>{aiProducts[aiReviewIdx].desc}</div>
      </Card>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <Btn full variant="success" onClick={() => { setApproved(a => a + 1); aiReviewIdx < aiProducts.length - 1 ? setAiReviewIdx(i => i + 1) : setStep(8); }} icon="check">Accept</Btn>
        <Btn full variant="ghost" onClick={() => { aiReviewIdx < aiProducts.length - 1 ? setAiReviewIdx(i => i + 1) : setStep(8); }}>Skip</Btn>
      </div>
      <Btn full variant="secondary" onClick={() => setStep(8)}>Skip All →</Btn>
      <div style={{ fontSize: "12px", color: T.muted, textAlign: "center", marginTop: "10px" }}>{approvedCount} products approved</div>
    </div>,
    // Step 8: PIN
    <div key="pin" style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>Create your login PIN</div>
      <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginBottom: "30px" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: "18px", height: "18px", borderRadius: "50%",
            background: i < pin.length ? T.blue : T.line }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", maxWidth: "240px", margin: "0 auto" }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map(n => (
          <button key={n} onClick={() => n === "⌫" ? setPin(p => p.slice(0, -1)) : n !== "" && pin.length < 4 && setPin(p => p + n)}
            style={{ width: "64px", height: "64px", borderRadius: "50%", border: "none", fontSize: "22px",
              fontWeight: 700, background: n === "" ? "transparent" : T.bg, cursor: n === "" ? "default" : "pointer",
              margin: "0 auto" }}>{n}</button>
        ))}
      </div>
      {pin.length === 4 && <div style={{ marginTop: "20px" }}><Btn full onClick={() => setStep(9)}>Confirm PIN →</Btn></div>}
    </div>,
    // Step 9: Complete
    <div key="done" style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
      <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "16px" }}>{brand || "Your store"} is ready!</div>
      {[`Account created`, `Brand: ${brand || "Funky Fish"}`, `Store: ${location || "Grand Baie"}`, `${approvedCount} products approved`, "Loyalty program active"].map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", fontSize: "14px", justifyContent: "center" }}>
          <span style={{ color: T.green }}>✓</span> {t}
        </div>
      ))}
      <div style={{ fontSize: "13px", color: T.muted, marginTop: "16px", marginBottom: "24px" }}>You're the owner and admin.<br/>Invite staff from Settings.</div>
      <Btn full onClick={onComplete}>Go to Dashboard →</Btn>
    </div>,
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      {step > 0 && step < 9 && (
        <div onClick={() => setStep(s => s - 1)} style={{ padding: "12px 16px", cursor: "pointer" }}>
          <Icon name="back" />
        </div>
      )}
      {steps[step]}
    </div>
  );
};

// ═══════════ SCREEN: LOGIN ═══════════
const LoginScreen = ({ onLogin, isOwner }) => {
  const [pin, setPin] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const staff = [
    { name: "Sarah M.", role: "Cashier", avatar: "👩‍💼" },
    { name: "Ravi P.", role: "Cashier", avatar: "👨‍💼" },
    { name: "Amina K.", role: "Supervisor", avatar: "👩‍💻" },
  ];

  if (isOwner) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", background: T.bg, minHeight: "100%" }}>
        <div style={{ fontSize: "14px", color: T.muted, marginBottom: "4px" }}>Welcome back</div>
        <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "4px" }}>Fred</div>
        <div style={{ fontSize: "14px", color: T.blue, fontWeight: 600, marginBottom: "40px" }}>Funky Fish</div>
        <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "20px" }}>Enter your PIN</div>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginBottom: "30px" }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width: "18px", height: "18px", borderRadius: "50%", background: i < pin.length ? T.blue : T.line }} />)}
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
  }

  return (
    <div style={{ padding: "30px 20px", background: T.bg, minHeight: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ fontSize: "12px", color: T.muted }}>Grand Baie · POS-GB-01</div>
        <div style={{ fontSize: "16px", fontWeight: 800, color: T.blue }}>Funky Fish</div>
      </div>
      <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Who's logging in?</div>
      {staff.map(s => (
        <Card key={s.name} onClick={() => setSelectedStaff(s.name)} style={{
          marginBottom: "8px", border: `1.5px solid ${selectedStaff === s.name ? T.blue : T.line}`,
          background: selectedStaff === s.name ? T.blueL : T.paper,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>{s.avatar}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: "12px", color: T.muted }}>{s.role}</div>
            </div>
          </div>
        </Card>
      ))}
      {selectedStaff && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px" }}>Enter PIN</div>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginBottom: "20px" }}>
            {[0,1,2,3].map(i => <div key={i} style={{ width: "16px", height: "16px", borderRadius: "50%", background: i < pin.length ? T.blue : T.line }} />)}
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

// ═══════════ SCREEN: HOME ═══════════
const HomeScreen = ({ role, onNavigate }) => {
  const tiles = {
    owner: [
      { id: "pos", icon: "pos", label: "POS", color: T.blue, badge: 0 },
      { id: "inventory", icon: "inventory", label: "Inventory", color: T.amber, badge: 0 },
      { id: "barcode-store", icon: "barcode", label: "Barcode\nMy Store", color: T.purple, badge: 0 },
      { id: "loyalty", icon: "loyalty", label: "Loyalty", color: T.red, badge: 3 },
      { id: "catalogue", icon: "printer", label: "Catalogue", color: T.green, badge: 0 },
      { id: "logistics", icon: "truck", label: "Logistics", color: "#FF6F00", badge: 2 },
      { id: "warehouse", icon: "warehouse", label: "Warehouse", color: "#5D4037", badge: 1 },
      { id: "staff", icon: "staff", label: "Staff Ops", color: "#00838F", badge: 0 },
      { id: "shift", icon: "shift", label: "Shifts", color: "#AD1457", badge: 0 },
      { id: "chat", icon: "chat", label: "AI Chat", color: T.blue, badge: 0 },
      { id: "cash-collect", icon: "dollar", label: "Cash\nCollection", color: T.green, badge: 0 },
      { id: "settings", icon: "settings", label: "Settings", color: T.muted, badge: 0 },
    ],
    staff: [
      { id: "pos", icon: "pos", label: "POS", color: T.blue },
      { id: "inventory", icon: "inventory", label: "Inventory", color: T.amber },
      { id: "staff", icon: "staff", label: "Staff Ops", color: "#00838F" },
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
  const [showReceipt, setShowReceipt] = useState(false);
  const [showLoyalty, setShowLoyalty] = useState(false);
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
  const addToCart = (p) => {
    if (p.stock === 0) return;
    setCart(c => { const ex = c.find(x => x.id === p.id); return ex ? c.map(x => x.id === p.id ? {...x, qty: x.qty + 1} : x) : [...c, {...p, qty: 1}]; });
  };

  if (showReceipt) {
    return (
      <div style={{ background: T.bg, minHeight: "100%", padding: "16px" }}>
        <Card style={{ textAlign: "center", fontFamily: "monospace", fontSize: "12px", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "4px" }}>Funky Fish — Grand Baie</div>
          <div>Receipt #GBR-20260319-047</div>
          <div style={{ fontSize: "11px", color: T.muted }}>19 Mar 2026 · 14:32</div>
          <div style={{ borderTop: `1px dashed ${T.line}`, margin: "8px 0" }} />
          {cart.map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{c.name} ×{c.qty}</span><span>Rs {(c.price * c.qty).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px dashed ${T.line}`, margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px" }}>
            <span>TOTAL</span><span>Rs {total.toLocaleString()}</span>
          </div>
          {customerLinked && (
            <div style={{ background: T.greenL, borderRadius: "8px", padding: "8px", marginTop: "8px", fontSize: "11px", color: T.green, fontWeight: 700 }}>
              ✓ {Math.floor(total / 100)} loyalty points earned
            </div>
          )}
          <div style={{ margin: "16px auto", width: "120px", height: "120px", background: T.ink, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="qr" size={80} color="#fff" />
          </div>
          <div style={{ fontSize: "11px", color: T.muted }}>Scan to earn loyalty points<br/>or get your digital receipt</div>
          <div style={{ fontSize: "10px", color: T.line, marginTop: "8px" }}>Posterita Retail OS</div>
        </Card>
        <div style={{ marginTop: "12px" }}>
          <Btn full onClick={() => { setShowReceipt(false); setCart([]); setCustomerLinked(false); }}>New Sale</Btn>
        </div>
        <div style={{ marginTop: "8px" }}>
          <Btn full variant="ghost" onClick={onBack}>← Back to Home</Btn>
        </div>
      </div>
    );
  }

  if (showLoyalty) {
    return (
      <div style={{ background: T.bg, minHeight: "100%", padding: "16px" }}>
        <TopBar title="Link Customer" onBack={() => setShowLoyalty(false)} />
        <div style={{ padding: "16px" }}>
          <Input label="Customer phone" value={loyaltyPhone} onChange={setLoyaltyPhone} placeholder="+230 5XXX XXXX" />
          <Btn full onClick={() => { setCustomerLinked(true); setShowLoyalty(false); }}>Look Up</Btn>
          {loyaltyPhone.length > 5 && (
            <Card style={{ marginTop: "16px", border: `1.5px solid ${T.purple}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: T.purpleL, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="loyalty" size={20} color={T.purple} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>Marie Laurent</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: T.purple }}>420 pts</div>
                </div>
              </div>
              <div style={{ marginTop: "8px", fontSize: "12px", color: T.muted }}>2 active vouchers</div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <TopBar title="POS" subtitle="Grand Baie" onBack={onBack}
        right={<div onClick={() => setShowLoyalty(true)} style={{ cursor: "pointer", padding: "4px 10px", background: customerLinked ? T.greenL : T.purpleL, borderRadius: "20px", fontSize: "11px", fontWeight: 700, color: customerLinked ? T.green : T.purple }}>{customerLinked ? "✓ Marie · 420pts" : "Link Customer"}</div>} />
      <div style={{ display: "flex", gap: "6px", padding: "8px 12px", overflowX: "auto" }}>
        {["ALL", "Footwear", "Menswear", "Womenswear", "Accessories"].map((c, i) => (
          <div key={c} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
            background: i === 0 ? T.blue : T.paper, color: i === 0 ? "#fff" : T.ink,
            whiteSpace: "nowrap", border: `1px solid ${i === 0 ? T.blue : T.line}` }}>{c}</div>
        ))}
      </div>
      <div style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {products.map(p => (
            <Card key={p.id} onClick={() => addToCart(p)} style={{
              padding: "10px", opacity: p.stock === 0 ? 0.4 : 1,
              borderBottom: `3px solid ${p.stock >= 10 ? T.green : p.stock > 0 ? T.amber : T.red}`,
            }}>
              <div style={{ height: "50px", background: T.bg, borderRadius: "8px", marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🏷️</div>
              <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.2, marginBottom: "2px" }}>{p.name}</div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: T.blue }}>Rs {p.price.toLocaleString()}</div>
            </Card>
          ))}
        </div>
      </div>
      {cart.length > 0 && (
        <div style={{ padding: "12px", background: T.paper, borderTop: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: T.muted }}>{cart.reduce((s, c) => s + c.qty, 0)} items</span>
            <span style={{ fontSize: "18px", fontWeight: 800 }}>Rs {total.toLocaleString()}</span>
          </div>
          <Btn full onClick={() => setShowReceipt(true)}>Pay — Rs {total.toLocaleString()}</Btn>
        </div>
      )}
    </div>
  );
};

// ═══════════ SCREEN: WHATSAPP TEMPLATES ═══════════
const WhatsAppScreen = ({ onBack }) => {
  const [activeTemplate, setActiveTemplate] = useState(0);
  const templates = [
    { name: "loyalty_welcome", title: "Welcome to Loyalty", msgs: [
      { from: "Funky Fish", text: "🎉 Welcome to Funky Fish Loyalty, Marie!\n\nYou've earned 100 bonus points just for joining.\n\nYour balance: 100 pts\n\nScan the QR on your next receipt to earn more points!", btns: ["My Points", "Browse Catalogue", "Store Info"] },
    ]},
    { name: "points_earned", title: "Points Earned", msgs: [
      { from: "Funky Fish", text: "Thanks for your purchase at Grand Baie, Marie! 🛍️\n\nYou earned 31 points on this order.\nYour balance: 451 points.\n\nOrder #GBR-20260319-047\nTotal: Rs 3,542", btns: ["View Receipt", "My Points", "Vouchers"] },
    ]},
    { name: "voucher_issued", title: "Voucher Issued", msgs: [
      { from: "Funky Fish", text: "🎁 Great news, Marie!\n\nYou've unlocked a voucher:\n\n*Rs 500 OFF your next purchase*\nCode: FUNKY500\nValid until: 15 Apr 2026\nMin spend: Rs 2,000\n\nShow this at checkout!", btns: ["View My Vouchers", "Browse Catalogue"] },
    ]},
    { name: "voucher_expiring", title: "Voucher Expiring", msgs: [
      { from: "Funky Fish", text: "⏰ Heads up, Marie!\n\nYour Rs 500 voucher (FUNKY500) expires in 3 days.\n\nDon't miss out — use it before 15 Apr!\n\nMin spend: Rs 2,000", btns: ["View Voucher", "Find Store"] },
    ]},
    { name: "digital_receipt", title: "Digital Receipt", msgs: [
      { from: "Funky Fish", text: "📄 Your digital receipt from Grand Baie\n\nOrder #GBR-20260319-047\n19 Mar 2026 · 14:32\n\n• Reef Sandal Navy ×1 — Rs 1,290\n• Canvas Tote ×2 — Rs 1,300\n• Flip Flop Coral ×1 — Rs 490\n\nSubtotal: Rs 3,080\nVAT 15%: Rs 462\n*Total: Rs 3,542*\nPaid: Cash", btns: ["My Points", "Rate Your Visit"] },
    ]},
    { name: "survey_invite", title: "Survey Invite", msgs: [
      { from: "Funky Fish", text: "📋 Hi Marie! Got 2 minutes?\n\nComplete our quick survey and earn *20 bonus points*!\n\nTap below to start:", btns: ["Start Survey (+20 pts)", "Not Now"] },
    ]},
    { name: "receipt_scan_new", title: "Receipt QR (New Customer)", msgs: [
      { isMe: true, text: "RECEIPT GBR-20260319-047" },
      { from: "Funky Fish", text: "Thanks for shopping at Funky Fish Grand Baie! 🏄\n\nJoin our loyalty program and earn points on every purchase!\n\n🎁 Join now and we'll add:\n• *31 points* for this order\n• *100 bonus points* for signing up", btns: ["Join Now (+131 pts)", "Store Info", "No Thanks"] },
    ]},
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
        <div style={{ textAlign: "center", fontSize: "10px", color: T.muted, background: "#fff8", borderRadius: "8px", padding: "4px 12px", display: "inline-block", marginBottom: "12px" }}>
          Today
        </div>
        {templates[activeTemplate].msgs.map((m, i) => (
          <WhatsAppMsg key={i} from={m.from} isMe={m.isMe} time="14:32">
            <div style={{ whiteSpace: "pre-line" }}>{m.text}</div>
            {m.btns && (
              <div style={{ marginTop: "8px", borderTop: "1px solid #e8e8e8", paddingTop: "6px" }}>
                {m.btns.map(b => <WAButton key={b}>{b}</WAButton>)}
              </div>
            )}
          </WhatsAppMsg>
        ))}
      </div>
      <div style={{ padding: "8px 12px", fontSize: "10px", color: T.muted, textAlign: "center" }}>
        Template: <code style={{ fontSize: "10px" }}>{templates[activeTemplate].name}</code> · Requires Meta approval
      </div>
    </div>
  );
};

// ═══════════ SCREEN: AI CHAT ═══════════
const AIChatScreen = ({ onBack }) => {
  const [msgs, setMsgs] = useState([
    { from: "ai", text: "Hi Fred! I'm your AI assistant. Ask me anything about your store operations." },
  ]);
  const [input, setInput] = useState("");
  const queries = [
    { q: "What were sales yesterday?", a: "Yesterday (18 Mar) at Grand Baie:\n• Revenue: Rs 38,420\n• Orders: 19\n• Avg transaction: Rs 2,022\n• Top product: Reef Sandal Navy (7 sold)\n• Loyalty points awarded: 384" },
    { q: "How many sandals in stock?", a: "Sandal stock at Grand Baie:\n• Reef Sandal Navy: 12 units\n• Flip Flop Coral M: 24 units\n• Beach Sandal Classic: 8 units\n\nTotal: 44 sandals across 3 SKUs" },
    { q: "Approve Amina's leave", a: "✅ Done! I've approved Amina K.'s leave request for 21–22 March.\n\nShe'll get a notification. Sarah and Ravi are both available those days, so Grand Baie has coverage." },
  ];
  const send = () => {
    if (!input.trim()) return;
    const q = input;
    setMsgs(m => [...m, { from: "user", text: q }]);
    setInput("");
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
            <div key={q.q} onClick={() => { setInput(q.q); }} style={{
              padding: "6px 12px", borderRadius: "20px", fontSize: "11px", background: T.paper,
              border: `1px solid ${T.line}`, cursor: "pointer", color: T.blue, fontWeight: 600 }}>{q.q}</div>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px", background: T.paper, borderTop: `1px solid ${T.line}`, display: "flex", gap: "8px" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything..." style={{ flex: 1, padding: "10px 14px", borderRadius: "20px", border: `1px solid ${T.line}`, fontSize: "14px", outline: "none" }} />
        <Btn small onClick={send}>Send</Btn>
      </div>
    </div>
  );
};

// ═══════════ SCREEN: INVENTORY COUNT ═══════════
const InventoryScreen = ({ onBack }) => {
  const [phase, setPhase] = useState("start"); // start, scanning, closed
  const [scanned, setScanned] = useState([]);
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Inventory Count" subtitle="Full Count · Grand Baie" onBack={onBack} />
      {phase === "start" && (
        <div style={{ padding: "20px" }}>
          <Card style={{ textAlign: "center", marginBottom: "12px" }}>
            <Icon name="barcode" size={40} color={T.amber} />
            <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "10px" }}>Scan Shelf QR to Start</div>
            <div style={{ fontSize: "13px", color: T.muted, marginTop: "6px" }}>Point camera at shelf barcode</div>
          </Card>
          <Btn full onClick={() => setPhase("scanning")}>📷 Simulate Shelf Scan</Btn>
        </div>
      )}
      {phase === "scanning" && (
        <div style={{ padding: "16px" }}>
          <Card style={{ background: T.amberL, border: `1.5px solid ${T.amber}`, marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: T.amber }}>SHELF OPEN</div>
              <div style={{ fontSize: "14px", fontWeight: 800 }}>GB-001-003A</div>
              <div style={{ marginLeft: "auto", fontSize: "12px", color: T.muted }}>Scan 1 of 2</div>
            </div>
          </Card>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Scanned Products ({scanned.length})</div>
          {scanned.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.line}`, fontSize: "13px" }}>
              <span>{s.name}</span><span style={{ fontWeight: 700 }}>×{s.qty}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <Btn full variant="secondary" onClick={() => setScanned(s => [...s, { name: `Product ${s.length + 1}`, qty: Math.floor(Math.random() * 10) + 1 }])}>📷 Scan Product</Btn>
            <Btn full variant="success" onClick={() => setPhase("closed")} disabled={scanned.length === 0}>Close Shelf</Btn>
          </div>
        </div>
      )}
      {phase === "closed" && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>✅</div>
          <div style={{ fontSize: "16px", fontWeight: 800 }}>Shelf GB-001-003A Closed</div>
          <div style={{ fontSize: "13px", color: T.muted, marginTop: "4px" }}>{scanned.length} products · Scan 1 complete</div>
          <Card style={{ marginTop: "16px", background: T.amberL }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: T.amber }}>⏳ Waiting for Scan 2</div>
            <div style={{ fontSize: "12px", color: T.muted, marginTop: "4px" }}>Another device needs to independently scan this shelf for dual verification</div>
          </Card>
          <div style={{ marginTop: "16px" }}><Btn full onClick={() => { setPhase("start"); setScanned([]); }}>Next Shelf →</Btn></div>
        </div>
      )}
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

  const aiNames = ["Men's Canvas Slip-On Blue", "Beach Flip-Flop Yellow", "Reef Sandal Black", "Surf Short Green"];

  const steps = [
    <div key="prep" style={{ padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "40px", marginBottom: "12px" }}>📦</div>
      <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>Barcode My Store</div>
      <div style={{ fontSize: "13px", color: T.muted, lineHeight: 1.5, marginBottom: "20px" }}>Go shelf by shelf. Group similar items. We'll photograph, identify with AI, and generate barcodes.</div>
      <Btn full onClick={() => setStep(1)}>Start →</Btn>
    </div>,
    <div key="shelf" style={{ padding: "20px" }}>
      <Card style={{ textAlign: "center", marginBottom: "16px" }}>
        <Icon name="qr" size={40} color={T.purple} />
        <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "8px" }}>Scan Shelf QR</div>
        <div style={{ fontSize: "12px", color: T.muted, marginTop: "4px" }}>Or a carton box, display rack, table...</div>
      </Card>
      <Btn full onClick={() => setStep(2)}>📷 Scan Shelf GB-001-001A</Btn>
      <div style={{ marginTop: "8px" }}><Btn full variant="ghost" onClick={() => setStep(2)}>No QR — Create Shelf Manually</Btn></div>
    </div>,
    <div key="count" style={{ padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "14px", fontWeight: 700, color: T.blue, marginBottom: "4px" }}>Shelf GB-001-001A</div>
      <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "20px" }}>How many different products?</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", maxWidth: "280px", margin: "0 auto" }}>
        {[1,2,3,4,5,6,7,"8+"].map(n => (
          <button key={n} onClick={() => { setProductCount(typeof n === "number" ? n : 8); setStep(3); }}
            style={{ width: "60px", height: "60px", borderRadius: "14px", border: `2px solid ${T.line}`, background: T.paper,
              fontSize: "20px", fontWeight: 800, cursor: "pointer", margin: "0 auto" }}>{n}</button>
        ))}
      </div>
    </div>,
    <div key="photo" style={{ padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "12px", color: T.muted, marginBottom: "4px" }}>PRODUCT {photosCapt + 1} OF {productCount || 4}</div>
      <div style={{ fontSize: "14px", fontWeight: 700, color: T.blue, marginBottom: "12px" }}>Shelf GB-001-001A</div>
      <Card style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
        {photosCapt < (productCount || 4) ? (
          <div style={{ textAlign: "center" }}>
            <Icon name="camera" size={40} color={T.muted} />
            <div style={{ fontSize: "13px", color: T.muted, marginTop: "8px" }}>Tap to photograph this product</div>
          </div>
        ) : <div style={{ color: T.green, fontWeight: 800, fontSize: "16px" }}>✓ All photos captured</div>}
      </Card>
      <Btn full onClick={() => {
        if (photosCapt < (productCount || 4) - 1) setPhotosCapt(p => p + 1);
        else setStep(4);
      }}>📷 {photosCapt < (productCount || 4) - 1 ? "Capture & Next" : "Done — Enter Quantities"}</Btn>
    </div>,
    <div key="qty" style={{ padding: "20px" }}>
      <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: "12px" }}>Enter Quantities</div>
      {Array.from({ length: productCount || 4 }, (_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div style={{ width: "44px", height: "44px", background: T.bg, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📷</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", color: T.muted }}>Product {i + 1}</div>
            <input type="number" defaultValue={Math.floor(Math.random() * 15) + 1} style={{ width: "60px", padding: "6px", borderRadius: "8px", border: `1px solid ${T.line}`, fontSize: "14px", fontWeight: 700 }} />
          </div>
          <div><input placeholder="Rs" style={{ width: "70px", padding: "6px", borderRadius: "8px", border: `1px solid ${T.line}`, fontSize: "13px" }} /></div>
        </div>
      ))}
      <Btn full onClick={() => setStep(5)}>Send to AI →</Btn>
    </div>,
    <div key="ai-review" style={{ padding: "16px" }}>
      <div style={{ fontSize: "12px", color: T.muted, marginBottom: "4px" }}>AI IDENTIFIED · {reviewIdx + 1} of {productCount || 4}</div>
      <Card style={{ border: `1.5px solid ${T.purple}`, marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
          <span style={{ fontSize: "14px" }}>🤖</span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: T.purple }}>AI SUGGESTION</span>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: T.green, fontWeight: 700 }}>72%</span>
        </div>
        <div style={{ height: "80px", background: T.bg, borderRadius: "8px", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>📷</div>
        <div style={{ fontSize: "15px", fontWeight: 800 }}>{aiNames[reviewIdx] || "Unidentified Product"}</div>
        <div style={{ fontSize: "12px", color: T.muted }}>Category: Footwear · Shelf: GB-001-001A</div>
      </Card>
      <div style={{ display: "flex", gap: "8px" }}>
        <Btn full variant="success" onClick={() => {
          setApproved(a => a + 1);
          reviewIdx < (productCount || 4) - 1 ? setReviewIdx(i => i + 1) : setStep(6);
        }} icon="check">Accept</Btn>
        <Btn full variant="ghost" onClick={() => reviewIdx < (productCount || 4) - 1 ? setReviewIdx(i => i + 1) : setStep(6)}>Skip</Btn>
      </div>
    </div>,
    <div key="print" style={{ padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "40px", marginBottom: "8px" }}>🏷️</div>
      <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "4px" }}>Labels Ready!</div>
      <div style={{ fontSize: "13px", color: T.muted, marginBottom: "20px" }}>{approved} products · Labels in shelf walking order</div>
      <Btn full icon="printer">Print All Labels</Btn>
      <div style={{ marginTop: "8px" }}><Btn full variant="ghost" onClick={onBack}>Done</Btn></div>
    </div>,
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Barcode My Store" onBack={onBack} />
      {steps[step]}
    </div>
  );
};

// ═══════════ SCREEN: LOGISTICS / DELIVERY ═══════════
const LogisticsScreen = ({ onBack }) => {
  const [activeShipment, setActiveShipment] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const shipments = [
    { id: "SHP-001", dest: "Grand Baie Store", type: "Standard Parcel", packages: 3, status: "assigned", cod: 3542 },
    { id: "SHP-002", dest: "Marie Laurent (customer)", type: "Motorcycle Handover", packages: 1, status: "assigned", cod: 89000 },
  ];
  const deliverySteps = [
    { type: "scan", title: "Scan Packages", icon: "qr" },
    { type: "photo", title: "Photo at Delivery", icon: "camera" },
    { type: "payment", title: "Collect Payment — Rs 3,542", icon: "dollar" },
    { type: "signature", title: "Recipient Signature", icon: "edit" },
    { type: "confirm", title: "Confirm Delivery", icon: "check" },
  ];

  if (activeShipment) {
    return (
      <div style={{ background: T.bg, minHeight: "100%" }}>
        <TopBar title={activeShipment.id} subtitle={activeShipment.dest} onBack={() => setActiveShipment(null)} />
        <div style={{ padding: "12px" }}>
          {deliverySteps.map((s, i) => (
            <Card key={i} onClick={() => i === stepIdx ? setStepIdx(j => j + 1) : null} style={{
              marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px",
              opacity: i > stepIdx ? 0.4 : 1, border: `1.5px solid ${i === stepIdx ? T.blue : i < stepIdx ? T.green : T.line}`,
              background: i < stepIdx ? T.greenL : T.paper,
            }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px",
                background: i < stepIdx ? T.green : i === stepIdx ? T.blue : T.bg,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i < stepIdx ? <Icon name="check" size={18} color="#fff" /> : <Icon name={s.icon} size={18} color={i === stepIdx ? "#fff" : T.muted} />}
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: i < stepIdx ? T.green : T.ink }}>{s.title}</div>
                <div style={{ fontSize: "11px", color: T.muted }}>{i < stepIdx ? "Completed" : i === stepIdx ? "Tap to complete" : "Pending"}</div>
              </div>
            </Card>
          ))}
          {stepIdx >= deliverySteps.length && (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ fontSize: "40px" }}>✅</div>
              <div style={{ fontSize: "16px", fontWeight: 800, marginTop: "8px" }}>Delivery Complete!</div>
              <div style={{ marginTop: "12px" }}><Btn full onClick={() => { setActiveShipment(null); setStepIdx(0); }}>Back to Shipments</Btn></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Logistics" subtitle="Driver Dashboard" onBack={onBack} />
      <div style={{ padding: "12px" }}>
        <Card style={{ marginBottom: "12px", background: `linear-gradient(135deg, #FF6F00, #E65100)`, border: "none" }}>
          <div style={{ color: "#fff" }}>
            <div style={{ fontSize: "12px", opacity: .7 }}>CASH IN VEHICLE</div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>Rs 0</div>
            <div style={{ fontSize: "11px", opacity: .7 }}>0 deliveries completed today</div>
          </div>
        </Card>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>Assigned Shipments</div>
        {shipments.map(s => (
          <Card key={s.id} onClick={() => setActiveShipment(s)} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 800 }}>{s.id}</div>
                <div style={{ fontSize: "12px", color: T.muted }}>{s.dest}</div>
                <div style={{ fontSize: "11px", color: T.blue, fontWeight: 600 }}>{s.type} · {s.packages} pkg</div>
              </div>
              {s.cod > 0 && <div style={{ background: T.greenL, borderRadius: "8px", padding: "4px 8px", fontSize: "11px", fontWeight: 700, color: T.green }}>COD Rs {s.cod.toLocaleString()}</div>}
            </div>
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
      {step === 0 && (
        <div style={{ padding: "16px" }}>
          <Card style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: T.muted, fontWeight: 600 }}>TILL CLOSED · 19 Mar 2026</div>
            <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "4px" }}>Rs 47,200</div>
            <div style={{ fontSize: "12px", color: T.muted }}>Cash for collection (float retained: Rs 2,000)</div>
          </Card>
          <Input label="Amount in security bag" value="47,200" onChange={() => {}} />
          <Input label="Bag seal number" value="" onChange={() => {}} placeholder="Enter seal #" />
          <Btn full icon="camera" variant="secondary">📷 Photo of Sealed Bag</Btn>
          <div style={{ marginTop: "12px" }}><Btn full onClick={() => setStep(1)}>Declare Ready for Collection</Btn></div>
        </div>
      )}
      {step === 1 && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ width: "140px", height: "140px", background: T.ink, borderRadius: "16px", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="qr" size={100} color="#fff" />
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800 }}>Collection QR Ready</div>
          <div style={{ fontSize: "13px", color: T.muted, marginTop: "4px" }}>Grand Baie · Rs 47,200</div>
          <div style={{ fontSize: "12px", color: T.muted, marginTop: "8px" }}>Show this to the driver when they arrive.<br/>Both of you will sign on the phone.</div>
          <Card style={{ marginTop: "16px", background: T.amberL, border: `1px solid ${T.amber}` }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: T.amber }}>⏳ Waiting for driver...</div>
          </Card>
          <div style={{ marginTop: "16px" }}><Btn full variant="success" onClick={() => setStep(2)}>Simulate: Driver Scans QR</Btn></div>
        </div>
      )}
      {step === 2 && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>✅</div>
          <div style={{ fontSize: "18px", fontWeight: 800 }}>Cash Collected</div>
          <div style={{ fontSize: "14px", color: T.muted, marginTop: "4px" }}>Rs 47,200 · Driver: Jean-Pierre</div>
          <Card style={{ marginTop: "16px", textAlign: "left" }}>
            <div style={{ fontSize: "12px", color: T.muted, marginBottom: "8px" }}>SIGNATURES</div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1, height: "60px", background: T.bg, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: T.muted }}>Store Manager ✓</div>
              <div style={{ flex: 1, height: "60px", background: T.bg, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: T.muted }}>Driver ✓</div>
            </div>
          </Card>
          <div style={{ marginTop: "16px" }}><Btn full onClick={onBack}>Done</Btn></div>
        </div>
      )}
    </div>
  );
};

// ═══════════ SCREEN: CONTAINER RECEIVING ═══════════
const ContainerScreen = ({ onBack }) => {
  const [step, setStep] = useState(0);
  const docs = ["Commercial Invoice", "Packing List", "Bill of Lading", "Import Permit", "Insurance Certificate", "Customs Declaration"];
  const [uploaded, setUploaded] = useState([]);
  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <TopBar title="Container Receiving" subtitle="CNTR-2026-015" onBack={onBack} />
      {step === 0 && (
        <div style={{ padding: "16px" }}>
          <Card style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: T.muted }}>SUPPLIER</div>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>Yadea International</div>
            <div style={{ fontSize: "12px", color: T.muted, marginTop: "4px" }}>Sea freight · Arrived 19 Mar 2026</div>
          </Card>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>Document Vault</div>
          {docs.map(d => (
            <div key={d} onClick={() => setUploaded(u => u.includes(d) ? u : [...u, d])} style={{
              display: "flex", alignItems: "center", gap: "10px", padding: "10px", marginBottom: "4px",
              background: T.paper, borderRadius: T.radius, border: `1px solid ${T.line}`, cursor: "pointer" }}>
              <Icon name="doc" size={18} color={uploaded.includes(d) ? T.green : T.muted} />
              <span style={{ fontSize: "13px", fontWeight: uploaded.includes(d) ? 700 : 400, color: uploaded.includes(d) ? T.green : T.ink }}>{d}</span>
              {uploaded.includes(d) && <span style={{ marginLeft: "auto", fontSize: "11px", color: T.green }}>✓ Uploaded</span>}
            </div>
          ))}
          <div style={{ marginTop: "12px" }}><Btn full onClick={() => setStep(1)} disabled={uploaded.length < 2}>Proceed to Inspection →</Btn></div>
        </div>
      )}
      {step === 1 && (
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Inspect Packages</div>
          {["PKG-01 · Carton (Scooter parts)", "PKG-02 · Carton (Helmets)", "PKG-03 · Vehicle (Yadea M6)"].map((p, i) => (
            <Card key={i} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>{p}</div>
                  <div style={{ fontSize: "11px", color: T.muted }}>{i === 0 ? "Good condition" : i === 1 ? "Minor dent on corner" : "Pending inspection"}</div>
                </div>
                <div style={{ padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700,
                  background: i < 2 ? T.greenL : T.amberL, color: i < 2 ? T.green : T.amber }}>
                  {i < 2 ? "Inspected" : "Pending"}
                </div>
              </div>
            </Card>
          ))}
          <div style={{ fontSize: "12px", color: T.muted, marginTop: "8px", lineHeight: 1.5 }}>
            💡 Inspected packages can be released to stores immediately — don't wait for the full container.
          </div>
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <Btn full variant="success" onClick={() => setStep(2)}>Release PKG-01 to Store</Btn>
            <Btn full variant="secondary" icon="camera">Inspect PKG-03</Btn>
          </div>
        </div>
      )}
      {step === 2 && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>📦 → 🏪</div>
          <div style={{ fontSize: "16px", fontWeight: 800 }}>PKG-01 Released</div>
          <div style={{ fontSize: "13px", color: T.muted, marginTop: "4px" }}>Sent to Grand Baie Store via logistics</div>
          <Card style={{ marginTop: "16px", textAlign: "left" }}>
            <div style={{ fontSize: "12px", color: T.muted }}>SELL NOW, COST LATER</div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>Products are available in POS with selling prices. Cost allocation will be calculated when the full container is processed.</div>
          </Card>
          <div style={{ marginTop: "16px" }}><Btn full onClick={onBack}>Done</Btn></div>
        </div>
      )}
    </div>
  );
};

// ═══════════ MAIN APP ═══════════
export default function App() {
  const [screen, setScreen] = useState("start"); // start, onboarding, login-owner, login-staff, home, ...
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
        <div style={{ height: "calc(812px - 34px)", overflowY: "auto" }}>
          {children}
        </div>
      </div>
      <div style={{ marginLeft: "24px", maxWidth: "220px", position: "sticky", top: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 800, color: T.ink, marginBottom: "8px" }}>Posterita Retail OS</div>
        <div style={{ fontSize: "12px", color: T.muted, marginBottom: "16px" }}>Clickable Prototype v3.7</div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: T.muted, marginBottom: "8px" }}>QUICK JUMP</div>
        {[
          ["start", "🚀 Start Screen"],
          ["onboarding", "📱 Owner Onboarding"],
          ["login-owner", "🔑 Owner Login"],
          ["login-staff", "👤 Staff Login"],
          ["home", "🏠 Home Dashboard"],
          ["pos", "💳 POS + Receipt QR"],
          ["whatsapp", "💬 WhatsApp Templates"],
          ["chat", "🤖 AI Chat"],
          ["inventory", "📦 Inventory Count"],
          ["barcode-store", "🏷️ Barcode My Store"],
          ["logistics", "🚚 Logistics / Driver"],
          ["cash-collect", "💰 Cash Collection"],
          ["warehouse", "🏭 Container Receiving"],
        ].map(([id, label]) => (
          <div key={id} onClick={() => { setScreen(id); if (id === "home") setRole("owner"); }}
            style={{ padding: "6px 10px", fontSize: "12px", cursor: "pointer", borderRadius: "8px",
              background: screen === id ? T.blueL : "transparent", color: screen === id ? T.blue : T.ink,
              fontWeight: screen === id ? 700 : 400, marginBottom: "2px" }}>{label}</div>
        ))}
      </div>
    </div>
  );

  const goHome = () => setScreen("home");
  const nav = (s) => setScreen(s);

  const screens = {
    "start": (
      <div style={{ padding: "80px 24px", textAlign: "center", background: `linear-gradient(180deg, ${T.paper} 0%, ${T.bg} 100%)`, minHeight: "100%" }}>
        <div style={{ fontSize: "42px", fontWeight: 900, color: T.blue, letterSpacing: "-1px" }}>Posterita</div>
        <div style={{ fontSize: "14px", color: T.muted, marginBottom: "60px", letterSpacing: "3px" }}>RETAIL OS</div>
        <Btn full onClick={() => setScreen("onboarding")}>Get Started</Btn>
        <div style={{ marginTop: "12px" }}><Btn full variant="ghost" onClick={() => setScreen("login-owner")}>I have an account</Btn></div>
        <div style={{ marginTop: "40px" }}>
          <div style={{ fontSize: "11px", color: T.muted, marginBottom: "8px" }}>STAFF? TAP BELOW</div>
          <Btn full variant="secondary" onClick={() => setScreen("login-staff")}>Staff Login</Btn>
        </div>
      </div>
    ),
    "onboarding": <OnboardingScreen onComplete={goHome} />,
    "login-owner": <LoginScreen isOwner onLogin={() => setScreen("home")} />,
    "login-staff": <LoginScreen onLogin={() => { setRole("staff"); setScreen("home"); }} />,
    "home": <HomeScreen role={role} onNavigate={nav} />,
    "pos": <POSScreen onBack={goHome} />,
    "whatsapp": <WhatsAppScreen onBack={goHome} />,
    "chat": <AIChatScreen onBack={goHome} />,
    "inventory": <InventoryScreen onBack={goHome} />,
    "barcode-store": <BarcodeStoreScreen onBack={goHome} />,
    "logistics": <LogisticsScreen onBack={goHome} />,
    "cash-collect": <CashCollectionScreen onBack={goHome} />,
    "warehouse": <ContainerScreen onBack={goHome} />,
  };

  return phoneFrame(screens[screen] || screens.start);
}
