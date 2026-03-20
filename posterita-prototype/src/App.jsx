import { useState, createContext, useContext } from 'react'

// ═══════════════════════════════════════════
// NAVIGATION CONTEXT
// ═══════════════════════════════════════════
const NavContext = createContext()
const useNav = () => useContext(NavContext)

// ═══════════════════════════════════════════
// DESIGN TOKENS (from Brand Guidelines)
// ═══════════════════════════════════════════
const T = {
  bg: "#F5F2EA", paper: "#FFF", panel: "#FAFAFA", ink: "#141414",
  muted: "#6C6F76", line: "#E6E2DA", chip: "#f0f0f0",
  blue: "#1976D2", blueL: "#DCEBFF", blueD: "#0D5DB3",
  red: "#E53935", redL: "#FFF1F0",
  green: "#2E7D32", greenL: "#E8F5E9",
  amber: "#F57F17", amberL: "#FFF8E1",
  purple: "#5E35B1", purpleL: "#EDE7F6",
  font: '"Avenir Next","SF Pro Display","Segoe UI",system-ui,sans-serif',
  shSm: "0 1px 2px rgba(0,0,0,.05)", shMd: "0 4px 16px rgba(0,0,0,.08)",
  shLg: "0 24px 70px rgba(0,0,0,.10)", shSheet: "0 24px 80px rgba(0,0,0,.18)",
}

// ═══════════════════════════════════════════
// SAMPLE DATA
// ═══════════════════════════════════════════
const PRODS = [
  { id:"p1", name:"Reef Pro Sandal Navy", price:1290, cat:"Footwear", img:"https://images.unsplash.com/photo-1603487742131-4160ec999306?w=120&h=120&fit=crop" },
  { id:"p2", name:"Canvas Tote Natural", price:650, cat:"Bags", img:"https://images.unsplash.com/photo-1544816155-12df9643f363?w=120&h=120&fit=crop" },
  { id:"p3", name:"Flip Flop Coral M", price:490, cat:"Footwear", img:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=120&h=120&fit=crop" },
  { id:"p4", name:"Beach Hat Straw Wide", price:380, cat:"Accessories", img:"https://images.unsplash.com/photo-1521369909029-2afed882baee?w=120&h=120&fit=crop" },
  { id:"p5", name:"Dive Mask Pro Clear", price:2150, cat:"Gear", img:"https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=120&h=120&fit=crop" },
  { id:"p6", name:"Board Shorts Blue L", price:890, cat:"Apparel", img:"https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop" },
  { id:"p7", name:"Surf Rash Guard White", price:1450, cat:"Apparel", img:"https://images.unsplash.com/photo-1520256862855-398228c41684?w=120&h=120&fit=crop" },
  { id:"p8", name:"Snorkel Set Kids Blue", price:780, cat:"Gear", img:"https://images.unsplash.com/photo-1583394838336-acd977736f90?w=120&h=120&fit=crop" },
]
const CATS = [{id:"all",l:"ALL"},{id:"Footwear",l:"FOOTWEAR"},{id:"Bags",l:"BAGS"},{id:"Accessories",l:"ACCESS."},{id:"Gear",l:"GEAR"},{id:"Apparel",l:"APPAREL"}]
const CART_INIT = [{...PRODS[0],qty:1},{...PRODS[1],qty:2},{...PRODS[2],qty:1}]
const fmt = (v) => `Rs ${v.toLocaleString("en",{minimumFractionDigits:2})}`

// ═══════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════
const Glass = ({children, p="18px", r=16, style:sx, ...rest}) => (
  <div style={{background:"rgba(255,255,255,0.82)",backdropFilter:"blur(14px)",borderRadius:r,padding:p,border:"1px solid rgba(255,255,255,0.6)",boxShadow:T.shSm,...sx}}>
    {children}
  </div>
)

const Badge = ({children, bg, fg}) => (
  <span style={{display:"inline-block",padding:"3px 10px",borderRadius:999,background:bg,color:fg,fontSize:11,fontWeight:800,whiteSpace:"nowrap"}}>{children}</span>
)

const Pill = ({children, active, onClick}) => (
  <button onClick={onClick} style={{height:38,borderRadius:12,border:`1px solid ${active?T.blue:"#d7d7d7"}`,background:active?T.blue:T.paper,color:active?"#fff":T.ink,fontSize:12,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",padding:"0 8px"}}>
    {children}
  </button>
)

const Btn48 = ({children, primary, danger, full, onClick, style:sx}) => (
  <button onClick={onClick} style={{height:48,borderRadius:14,border:primary?"none":"1px solid #d8d8d8",background:primary?T.blue:T.paper,color:primary?"#fff":danger?T.red:"#222",fontSize:12,fontWeight:800,cursor:"pointer",width:full?"100%":"auto",padding:"0 14px",...sx}}>
    {children}
  </button>
)

const Field = ({label, placeholder, value}) => (
  <div style={{marginBottom:10}}>
    {label && <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:".04em",marginBottom:4}}>{label}</div>}
    <div style={{height:42,borderRadius:14,border:`1px solid ${T.line}`,background:T.paper,padding:"0 14px",display:"flex",alignItems:"center",fontSize:14,color:value?T.ink:T.muted}}>{value||placeholder}</div>
  </div>
)

const Section = ({title, children}) => (
  <div>
    <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:".06em",textTransform:"uppercase",marginTop:14,marginBottom:8}}>{title}</div>
    {children}
  </div>
)

const Card = ({children, p="12px", mb=8, onClick}) => (
  <div onClick={onClick} style={{background:T.paper,borderRadius:10,border:"1px solid rgba(0,0,0,.06)",padding:p,marginBottom:mb,boxShadow:T.shSm,cursor:onClick?"pointer":"default"}}>{children}</div>
)

const Row = ({l, r, bold, color}) => (
  <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:bold?18:14,fontWeight:bold?800:400}}>
    <span>{l}</span><strong style={{color:color||T.ink}}>{r}</strong>
  </div>
)

const Avatar = ({name, sz=36}) => (
  <div style={{width:sz,height:sz,borderRadius:"50%",background:T.blueL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*.35,fontWeight:800,color:T.blueD,flexShrink:0}}>
    {name.split(" ").map(w=>w[0]).join("")}
  </div>
)

const Hamburger = ({onClick}) => (
  <div onClick={onClick} style={{width:48,height:48,borderRadius:14,display:"grid",placeItems:"center",cursor:"pointer"}}>
    <div style={{width:18,display:"grid",gap:4}}>
      <span style={{display:"block",height:2,borderRadius:999,background:"#25262a"}}/>
      <span style={{display:"block",height:2,borderRadius:999,background:"#25262a"}}/>
      <span style={{display:"block",height:2,borderRadius:999,background:"#25262a"}}/>
    </div>
  </div>
)

const BackBtn = ({onClick, label="Back"}) => (
  <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:4,fontSize:13,fontWeight:700,color:T.blue,padding:"8px 0",cursor:"pointer",background:"none",border:"none"}}>
    <span style={{fontSize:18}}>&#x2039;</span> {label}
  </button>
)

const BottomNav = ({active="home"}) => {
  const nav = useNav()
  return (
    <div style={{display:"flex",justifyContent:"space-around",padding:"8px 0 6px",background:T.paper,borderTop:`1px solid ${T.line}`}}>
      {[["home","◎","Home"],["pos","◇","POS"],["tasks","≡","Tasks"],["more","⚙","More"]].map(([k,ic,l]) => (
        <div key={k} onClick={()=>{
          if(k==="home") nav("home")
          else if(k==="pos") nav("products")
          else if(k==="tasks") nav("staffops")
          else if(k==="more") nav("settings")
        }} style={{textAlign:"center",cursor:"pointer",minWidth:48}}>
          <div style={{fontSize:18,color:active===k?T.blue:T.muted}}>{ic}</div>
          <div style={{fontSize:9,fontWeight:700,color:active===k?T.blue:T.muted,marginTop:1}}>{l}</div>
        </div>
      ))}
    </div>
  )
}

// Phone frame wrapper
const PF = ({children, nav=true, active="home"}) => (
  <div style={{width:"100%",maxWidth:430,margin:"0 auto",background:"linear-gradient(180deg,#1f2733 0%,#0f1218 100%)",borderRadius:38,padding:12,boxShadow:"0 28px 60px rgba(15,17,21,.24)"}}>
    <div style={{background:T.paper,borderRadius:30,minHeight:780,overflow:"hidden",position:"relative",display:"flex",flexDirection:"column"}}>
      <div style={{height:36,padding:"0 16px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,fontWeight:700,color:T.muted,background:T.paper}}>
        <span>09:41</span><span style={{fontWeight:800}}>Posterita POS</span><span style={{fontSize:10}}>●●●</span>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>{children}</div>
      {nav && <BottomNav active={active}/>}
    </div>
  </div>
)

// ═══════════════════════════════════════════
// AUTH FLOW SCREENS
// ═══════════════════════════════════════════
const MWelcome = () => {
  const nav = useNav()
  return (
    <PF nav={false}><div style={{padding:"70px 24px",textAlign:"center"}}>
      <div style={{width:80,height:80,borderRadius:20,background:T.blueL,margin:"0 auto 20px",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:34,fontWeight:800,color:T.blue}}>P</div></div>
      <div style={{fontSize:28,fontWeight:800,letterSpacing:"-.04em"}}>Posterita</div>
      <div style={{fontSize:14,color:T.muted,marginTop:4,marginBottom:36}}>Unified retail operations</div>
      <Btn48 primary full onClick={()=>nav("phone")}>GET STARTED</Btn48>
      <div onClick={()=>nav("login")} style={{marginTop:14,fontSize:13,fontWeight:700,color:T.blue,cursor:"pointer"}}>I have an account — log in</div>
    </div></PF>
  )
}

const MPhone = () => {
  const nav = useNav()
  return (
    <PF nav={false}><div style={{padding:"36px 24px"}}>
      <BackBtn onClick={()=>nav("welcome")}/>
      <div style={{fontSize:20,fontWeight:800,letterSpacing:"-.02em",marginBottom:4}}>Enter your phone number</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:24}}>We will send a verification code via WhatsApp</div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <div style={{background:T.panel,borderRadius:14,padding:"10px 14px",border:`1px solid ${T.line}`,fontSize:15,fontWeight:700}}>+230</div>
        <div style={{flex:1,background:T.panel,borderRadius:14,padding:"10px 14px",border:`1px solid ${T.line}`,fontSize:15,color:T.muted}}>5XXX XXXX</div>
      </div>
      <div style={{fontSize:11,color:T.muted,marginBottom:28}}>OTP will be sent via WhatsApp</div>
      <Btn48 primary full onClick={()=>nav("otp")}>SEND CODE</Btn48>
    </div></PF>
  )
}

const MOTP = () => {
  const nav = useNav()
  return (
    <PF nav={false}><div style={{padding:"36px 24px",textAlign:"center"}}>
      <BackBtn onClick={()=>nav("phone")}/>
      <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Verify your number</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:28}}>6-digit code sent to +230 5823 1102</div>
      <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:28}}>
        {[5,8,3,"","",""].map((d,i) => (
          <div key={i} onClick={()=>nav("profile")} style={{width:44,height:50,borderRadius:12,border:`2px solid ${d!==""?T.blue:T.line}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,background:T.paper,cursor:"pointer"}}>{d}</div>
        ))}
      </div>
      <Btn48 primary full onClick={()=>nav("profile")}>VERIFY</Btn48>
      <div style={{marginTop:12,fontSize:12,color:T.muted}}>Didn't receive it?</div>
      <div style={{fontSize:12,fontWeight:700,color:T.blue,marginTop:4,cursor:"pointer"}}>Resend via WhatsApp</div>
    </div></PF>
  )
}

const MProfile = () => {
  const nav = useNav()
  return (
    <PF nav={false}><div style={{padding:"24px 20px"}}>
      <BackBtn onClick={()=>nav("otp")}/>
      <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Set up your profile</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:20}}>Your team uses this to identify you</div>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:T.blueL,margin:"0 auto 8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,color:T.blue}}>+</div>
        <div style={{fontSize:12,fontWeight:700,color:T.blue}}>Add photo</div>
      </div>
      <Field label="FIRST NAME" placeholder="Enter first name" value="Sarah"/>
      <Field label="LAST NAME" placeholder="Enter last name" value="Martin"/>
      <Field label="EMERGENCY CONTACT" placeholder="Name"/>
      <Field label="EMERGENCY PHONE" placeholder="+230 XXXX XXXX"/>
      <div style={{marginTop:14}}><Btn48 primary full onClick={()=>nav("pin")}>CONTINUE</Btn48></div>
    </div></PF>
  )
}

const MPIN = () => {
  const nav = useNav()
  return (
    <PF nav={false}><div style={{padding:"36px 24px",textAlign:"center"}}>
      <BackBtn onClick={()=>nav("profile")}/>
      <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Create your PIN</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:30}}>4-digit PIN for daily login</div>
      <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:30}}>
        {[1,2,0,0].map((d,i) => <div key={i} style={{width:14,height:14,borderRadius:"50%",background:i<2?T.blue:T.line}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,maxWidth:230,margin:"0 auto"}}>
        {[1,2,3,4,5,6,7,8,9,"",0,"\u232B"].map((n,i) => (
          <div key={i} onClick={n!==""?()=>nav("enroll"):undefined} style={{width:54,height:54,borderRadius:14,background:n!==""?T.paper:"transparent",border:n!==""?`1px solid ${T.line}`:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,cursor:n!==""?"pointer":"default",margin:"0 auto"}}>{n}</div>
        ))}
      </div>
    </div></PF>
  )
}

const MEnroll = () => {
  const nav = useNav()
  return (
    <PF nav={false}><div style={{padding:"30px 20px",textAlign:"center"}}>
      <BackBtn onClick={()=>nav("pin")}/>
      <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Enroll this device</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:24}}>Ask your supervisor for the QR code</div>
      <div onClick={()=>nav("home")} style={{width:200,height:200,borderRadius:20,border:`2px dashed ${T.blue}60`,margin:"0 auto 20px",display:"flex",alignItems:"center",justifyContent:"center",background:`${T.blue}08`,cursor:"pointer"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:44,opacity:.3}}>&#x25A3;</div><div style={{fontSize:12,color:T.muted,marginTop:4}}>Tap to simulate scan</div></div>
      </div>
      <Glass p="12px 16px" r={14}>
        <div style={{fontSize:11,fontWeight:800,color:T.blueD,textAlign:"left"}}>THIS WILL:</div>
        <div style={{fontSize:12,color:T.blueD,lineHeight:1.7,marginTop:4,textAlign:"left"}}>
          {"• Link device to your store"}<br/>
          {"• Download capability profile"}<br/>
          {"• Sync product catalog"}
        </div>
      </Glass>
    </div></PF>
  )
}

const MLogin = () => {
  const nav = useNav()
  return (
    <PF nav={false}><div style={{padding:"44px 24px",textAlign:"center"}}>
      <BackBtn onClick={()=>nav("welcome")}/>
      <div style={{width:56,height:56,borderRadius:16,background:T.blueL,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:24,fontWeight:800,color:T.blue}}>P</div></div>
      <div style={{fontSize:20,fontWeight:800,marginBottom:2}}>Welcome back, Sarah</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:28}}>Enter your PIN</div>
      <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:28}}>
        {[1,2,3,4].map(i => <div key={i} style={{width:12,height:12,borderRadius:"50%",background:i<=2?T.blue:T.line}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,maxWidth:230,margin:"0 auto"}}>
        {[1,2,3,4,5,6,7,8,9,"",0,"\u232B"].map((n,i) => (
          <div key={i} onClick={n!==""?()=>nav("home"):undefined} style={{width:54,height:54,borderRadius:14,background:n!==""?T.paper:"transparent",border:n!==""?`1px solid ${T.line}`:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,cursor:n!==""?"pointer":"default",margin:"0 auto"}}>{n}</div>
        ))}
      </div>
      <div style={{marginTop:20,fontSize:12,fontWeight:700,color:T.blue,cursor:"pointer"}} onClick={()=>nav("home")}>Use biometric</div>
    </div></PF>
  )
}

// ═══════════════════════════════════════════
// HOME + NOTIFICATIONS
// ═══════════════════════════════════════════
const MHome = () => {
  const nav = useNav()
  return (
    <PF active="home"><div style={{padding:"14px 12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,letterSpacing:"-.02em"}}>Good morning, Sarah</div>
          <div style={{fontSize:12,color:T.muted,marginTop:2}}>Grand Baie store · Cashier + Supervisor</div>
        </div>
        <div onClick={()=>nav("notifs")} style={{width:40,height:40,borderRadius:12,background:T.blueL,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative"}}>
          <span style={{fontSize:16}}>🔔</span>
          <span style={{position:"absolute",top:-2,right:-2,width:16,height:16,borderRadius:999,background:T.red,color:"#fff",fontSize:9,fontWeight:800,display:"grid",placeItems:"center"}}>5</span>
        </div>
      </div>
      <div onClick={()=>nav("supervisor")} style={{background:T.blueL,borderRadius:14,padding:"12px 14px",marginTop:12,marginBottom:14,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
        <div style={{width:34,height:34,borderRadius:10,background:T.blue,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:800}}>3</div>
        <div><div style={{fontSize:12,fontWeight:800,color:T.blueD}}>Pending approvals</div><div style={{fontSize:10,color:T.blueD,opacity:.7}}>2 leave · 1 expense</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[["◎","POS","Point of sale",T.blue,"products"],["≡","Staff Ops","Daily tasks","#1565C0","staffops"],["✓","Supervisor","Approvals",T.purple,"supervisor"],["▦","Inventory","Stock & counts",T.amber,"inventory"]].map(([ic,l,s,c,target],i) => (
          <div key={i} onClick={()=>nav(target)} style={{background:T.paper,borderRadius:14,padding:"16px 14px",border:`1px solid rgba(0,0,0,.06)`,boxShadow:T.shSm,cursor:"pointer"}}>
            <div style={{width:40,height:40,borderRadius:12,background:`${c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:c,marginBottom:10}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800}}>{l}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:1}}>{s}</div>
          </div>
        ))}
      </div>
      <Glass p="14px" r={14}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:".04em"}}>TODAY'S SUMMARY</span>
          <Badge bg={T.greenL} fg={T.green}>Synced</Badge>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[["47","Orders"],["Rs 84k","Revenue"],["12","Loyalty"]].map(([v,l],i) => (
            <div key={i}><div style={{fontSize:16,fontWeight:800}}>{v}</div><div style={{fontSize:10,color:T.muted}}>{l}</div></div>
          ))}
        </div>
      </Glass>
    </div></PF>
  )
}

const MNotif = () => {
  const nav = useNav()
  return (
    <PF active="home"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("home")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:14}}>Notifications</div>
      {[{t:"Leave approved",d:"Annual leave 22–24 Apr approved by Amina K.",time:"10m",c:T.green,target:"staffops"},{t:"New task assigned",d:"Restock sandal display — due by 12:00",time:"25m",c:T.blue,target:"staffops"},{t:"Till discrepancy",d:"Grand Baie shift: -Rs 1,240",time:"1h",c:T.red,target:"closetill"},{t:"Sync complete",d:"47 orders pushed, 12 products pulled",time:"2h",c:T.blue,target:"sync"},{t:"Device warning",d:"POS-CP-01 not responding 47 min",time:"3h",c:T.amber,target:"settings"}].map((n,i) => (
        <Card key={i} p="10px 12px" onClick={()=>nav(n.target)}><div style={{display:"flex",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:n.c,marginTop:4,flexShrink:0}}/>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:800}}>{n.t}</div><div style={{fontSize:12,color:T.muted,lineHeight:1.4,marginTop:2}}>{n.d}</div><div style={{fontSize:10,color:T.muted,marginTop:4}}>{n.time} ago</div></div>
        </div></Card>
      ))}
    </div></PF>
  )
}

// ═══════════════════════════════════════════
// POS FLOW
// ═══════════════════════════════════════════
const MProducts = () => {
  const nav = useNav()
  const [cat, setCat] = useState("all")
  const [cart, setCart] = useState(CART_INIT)
  const [showCart, setShowCart] = useState(false)
  const [lastAdded, setLastAdded] = useState(PRODS[2])
  const filtered = cat==="all" ? PRODS : PRODS.filter(p=>p.cat===cat)
  const totalQty = cart.reduce((s,i)=>s+i.qty,0)
  const sub = cart.reduce((s,i)=>s+i.price*i.qty,0)
  const tax = Math.round(sub*.15)
  const total = sub+tax
  const getQ = (id) => { const c = cart.find(i=>i.id===id); return c?c.qty:0 }
  const addP = (p) => {
    setCart(prev => { const e=prev.find(i=>i.id===p.id); if(e) return prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i); return [...prev,{...p,qty:1}] })
    setLastAdded(p)
  }
  const chgQ = (id, d) => { setCart(prev=>prev.map(i=>i.id===id?{...i,qty:i.qty+d}:i).filter(i=>i.qty>0)) }

  return (
    <PF nav={false} active="pos">
      <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:740}}>
        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px 6px",background:T.panel,borderBottom:`1px solid ${T.line}`}}>
          <Hamburger onClick={()=>nav("home")}/>
          <div style={{minWidth:48,textAlign:"center",fontSize:22,fontWeight:800,letterSpacing:"-.02em"}}>{totalQty}X</div>
          <div style={{width:1,alignSelf:"stretch",background:"#e0e0e0"}}/>
          {lastAdded && (
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8,minWidth:0}}>
              <img src={lastAdded.img} alt="" style={{width:44,height:44,borderRadius:10,objectFit:"cover"}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{lastAdded.name}</div>
                <div style={{fontSize:12,fontWeight:800,color:T.blue}}>{fmt(lastAdded.price)}</div>
              </div>
              <button style={{height:40,padding:"0 12px",borderRadius:12,border:`1px solid ${T.line}`,background:T.paper,color:T.red,fontSize:11,fontWeight:800,cursor:"pointer"}}>UNDO</button>
            </div>
          )}
        </div>
        {/* Order type */}
        <div style={{display:"flex",gap:6,padding:"6px 10px",background:T.panel}}>
          {["DINE IN","TAKE AWAY"].map((l,i) => (
            <button key={l} style={{flex:1,height:46,borderRadius:14,fontSize:13,fontWeight:800,border:`1px solid ${i===0?T.blue:"#d8d8d8"}`,background:i===0?T.blue:T.paper,color:i===0?"#fff":"#222",cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        {/* Categories */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,padding:8,background:"#f3f3f3",borderBottom:`1px solid ${T.line}`}}>
          {CATS.map(c => (
            <Pill key={c.id} active={cat===c.id} onClick={()=>setCat(c.id)}>{c.l}</Pill>
          ))}
        </div>
        {/* Search */}
        <div style={{padding:8,background:T.paper,borderBottom:`1px solid ${T.line}`}}>
          <input readOnly placeholder="Search product" style={{height:42,borderRadius:14,border:`1px solid ${T.line}`,background:T.paper,padding:"0 14px",width:"100%",fontFamily:T.font,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        </div>
        {/* Product grid */}
        <div style={{flex:1,overflow:"auto",padding:"8px 6px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,alignContent:"start",background:T.paper}}>
          {filtered.map(p => {
            const q = getQ(p.id)
            return (
              <button key={p.id} onClick={()=>addP(p)} style={{display:"grid",gridTemplateColumns:"56px 1fr",minHeight:68,alignItems:"stretch",border:"1px solid rgba(0,0,0,.06)",borderRadius:10,overflow:"hidden",background:T.paper,position:"relative",boxShadow:T.shSm,cursor:"pointer",textAlign:"left",padding:0}}>
                <img src={p.img} alt="" style={{width:56,height:"100%",objectFit:"cover"}}/>
                <div style={{padding:"7px 8px 7px 6px",minWidth:0,display:"flex",flexDirection:"column",justifyContent:"center",gap:3}}>
                  <div style={{fontSize:13,fontWeight:800,lineHeight:1.2,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.name}</div>
                  <div style={{fontSize:13,fontWeight:800,color:T.blue}}>{fmt(p.price)}</div>
                  {q>0 && <div style={{fontSize:12,color:"#8a8a8a"}}>{q}x in cart</div>}
                </div>
                {q>0 && <span style={{position:"absolute",top:4,right:4,minWidth:22,padding:"2px 6px",borderRadius:999,background:T.blue,color:"#fff",fontSize:11,fontWeight:800,textAlign:"center"}}>{q}</span>}
              </button>
            )
          })}
        </div>
        {/* Bottom buttons */}
        <div style={{display:"grid",gap:6,padding:6,background:T.paper,borderTop:`1px solid ${T.line}`}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
            <Btn48 danger onClick={()=>setCart([])}>CLEAR</Btn48>
            <Btn48>SEARCH</Btn48>
            <Btn48 onClick={()=>nav("history")}>MORE</Btn48>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 2fr",gap:6}}>
            <Btn48>SCAN</Btn48>
            <Btn48 onClick={()=>nav("custsearch")}>CUST</Btn48>
            <button onClick={()=>setShowCart(true)} style={{position:"relative",height:48,borderRadius:14,background:T.blue,color:"#fff",fontSize:16,fontWeight:800,letterSpacing:"-.02em",border:"none",cursor:"pointer"}}>
              MY CART <span style={{fontSize:22,verticalAlign:"middle",marginLeft:4}}>&#x203A;</span>
              {totalQty>0 && <span style={{position:"absolute",right:-8,top:-8,minWidth:24,minHeight:24,padding:"2px 7px",borderRadius:999,background:T.red,color:"#fff",fontSize:12,fontWeight:800,display:"inline-grid",placeItems:"center"}}>{totalQty}</span>}
            </button>
          </div>
        </div>
        {/* Cart sheet */}
        {showCart && (
          <div style={{position:"absolute",inset:"64px 8px 8px",borderRadius:22,background:T.paper,boxShadow:T.shSheet,border:"1px solid rgba(0,0,0,.08)",display:"grid",gridTemplateRows:"auto 1fr auto auto",overflow:"hidden",zIndex:30}}>
            <div style={{padding:16,display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${T.line}`,fontWeight:800,fontSize:18}}>
              <span>Cart ({totalQty})</span>
              <button onClick={()=>setShowCart(false)} style={{width:36,height:36,borderRadius:12,background:"#f5f5f5",fontSize:18,fontWeight:800,border:"none",cursor:"pointer"}}>&#x00D7;</button>
            </div>
            <div style={{overflow:"auto",padding:"8px 0"}}>
              {cart.map(item => (
                <div key={item.id} style={{margin:5,padding:6,borderRadius:10,border:"1px solid rgba(0,0,0,.06)",display:"grid",gridTemplateColumns:"50px 1fr auto",gap:8,alignItems:"start"}}>
                  <img src={item.img} alt="" style={{width:50,height:60,objectFit:"cover",borderRadius:8}}/>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                    <div style={{marginTop:6,fontSize:17,color:T.blue,fontWeight:800,textDecoration:"underline"}}>{fmt(item.price)}</div>
                    <div style={{marginTop:6,fontSize:13,color:"#7c8088"}}>Discount / note / modifiers</div>
                  </div>
                  <div style={{display:"grid",justifyItems:"end",gap:8}}>
                    <button onClick={()=>chgQ(item.id,-item.qty)} style={{width:40,height:40,borderRadius:12,background:"#faf5f5",color:T.red,fontSize:18,fontWeight:900,border:"none",cursor:"pointer"}}>&#x00D7;</button>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:14}}>
                      <button onClick={()=>chgQ(item.id,-1)} style={{width:38,height:38,borderRadius:999,background:"#f2f2f2",fontSize:20,fontWeight:700,border:"none",cursor:"pointer",display:"grid",placeItems:"center"}}>&#x2212;</button>
                      <div style={{minWidth:28,textAlign:"center",fontSize:22,fontWeight:800}}>{item.qty}</div>
                      <button onClick={()=>chgQ(item.id,1)} style={{width:38,height:38,borderRadius:999,background:"#f2f2f2",fontSize:20,fontWeight:700,border:"none",cursor:"pointer",display:"grid",placeItems:"center"}}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:"14px 16px",borderTop:`1px solid ${T.line}`,display:"grid",gap:8}}>
              <Row l="Sub Total" r={fmt(sub)}/><Row l="Tax Total" r={fmt(tax)}/><Row l={`Total (x${totalQty})`} r={fmt(total)} bold/>
            </div>
            <div style={{padding:"14px 16px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Btn48 onClick={()=>{setShowCart(false);nav("holds")}}>HOLD</Btn48>
              <Btn48 primary onClick={()=>{setShowCart(false);nav("payment")}}>PAY</Btn48>
            </div>
          </div>
        )}
      </div>
    </PF>
  )
}

const MProdDetail = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("products")}/>
      <div style={{width:"100%",height:180,borderRadius:14,overflow:"hidden",marginBottom:14}}>
        <img src={PRODS[0].img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
      </div>
      <div style={{fontSize:20,fontWeight:800,letterSpacing:"-.02em"}}>{PRODS[0].name}</div>
      <div style={{fontSize:13,color:T.muted,marginTop:4}}>SKU: {PRODS[0].id.toUpperCase()}-2847 · {PRODS[0].cat}</div>
      <div style={{fontSize:24,fontWeight:800,color:T.blue,marginTop:8,marginBottom:16}}>{fmt(PRODS[0].price)}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        <Glass p="12px" r={12}><div style={{fontSize:11,color:T.muted,fontWeight:800}}>IN STOCK</div><div style={{fontSize:18,fontWeight:800,marginTop:2}}>24</div></Glass>
        <Glass p="12px" r={12}><div style={{fontSize:11,color:T.muted,fontWeight:800}}>SOLD TODAY</div><div style={{fontSize:18,fontWeight:800,marginTop:2}}>3</div></Glass>
      </div>
      <Field label="BARCODE" value="4006381 903284"/><Field label="VAT RATE" value="15% standard"/>
      <div style={{display:"flex",gap:8,marginTop:12}}><Btn48 full onClick={()=>nav("products")}>ADD TO CART</Btn48><Btn48 primary full onClick={()=>nav("products")}>QUICK SALE</Btn48></div>
    </div></PF>
  )
}

const MCustSearch = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("products")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Customer Lookup</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Link customer to this sale</div>
      <Field placeholder="Phone number or name..."/>
      <Section title="RESULTS">
        {[{n:"Marie Laurent",ph:"+230 5921 4433",pts:420},{n:"Marc Ravin",ph:"+230 5784 1102",pts:85}].map((c,i) => (
          <Card key={i} p="10px 12px" onClick={()=>nav("loyalty")}><div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar name={c.n} sz={36}/>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:800}}>{c.n}</div><div style={{fontSize:11,color:T.muted}}>{c.ph} · {c.pts} pts</div></div>
            <Btn48 primary onClick={(e)=>{e.stopPropagation();nav("products")}}>SELECT</Btn48>
          </div></Card>
        ))}
      </Section>
      <div style={{marginTop:14,textAlign:"center",fontSize:13,fontWeight:700,color:T.blue,cursor:"pointer"}}>+ Create new customer</div>
    </div></PF>
  )
}

const MPayment = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("products")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:2}}>Payment</div>
      <div style={{fontSize:13,color:T.muted,marginBottom:16}}>Total: Rs 3,726.50</div>
      {[{l:"CASH",s:"Count and confirm",c:T.green,ic:"$"},{l:"CARD / BLINK",s:"Tap or insert card",c:T.blue,ic:"□"},{l:"SPLIT PAYMENT",s:"Cash + Card",c:T.purple,ic:"÷"}].map((m,i) => (
        <Card key={i} p="14px" onClick={()=>nav("receipt")}><div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:`${m.c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:m.c}}>{m.ic}</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:800}}>{m.l}</div><div style={{fontSize:11,color:T.muted}}>{m.s}</div></div>
          <span style={{fontSize:16,color:T.muted}}>&#x203A;</span>
        </div></Card>
      ))}
      <Section title="QUICK CASH AMOUNTS">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {["EXACT","Rs 4,000","Rs 5,000"].map((a,i) => (
            <div key={i} onClick={()=>nav("receipt")} style={{background:i===0?T.blueL:T.paper,borderRadius:12,padding:"12px",textAlign:"center",fontSize:13,fontWeight:800,border:`1px solid ${i===0?T.blue+"40":T.line}`,color:i===0?T.blueD:T.ink,cursor:"pointer"}}>{a}</div>
          ))}
        </div>
      </Section>
      <div style={{marginTop:12}}><Btn48 primary full onClick={()=>nav("receipt")}>COMPLETE SALE</Btn48></div>
    </div></PF>
  )
}

const MReceipt = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"14px 12px"}}>
      <div style={{textAlign:"center",marginBottom:12}}>
        <div style={{width:48,height:48,borderRadius:14,background:T.greenL,margin:"0 auto 10px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:T.green}}>&#x2713;</div>
        <div style={{fontSize:18,fontWeight:800}}>Sale Complete</div>
        <div style={{fontSize:13,color:T.muted}}>Change due: Rs 458.00</div>
      </div>
      <Glass p="16px" r={14}>
        <div style={{textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:800}}>Funky Fish — Grand Baie</div>
          <div style={{fontSize:11,color:T.muted}}>Receipt #GBR-20260319-047</div>
          <div style={{fontSize:11,color:T.muted}}>19 Mar 2026 · 14:32</div>
        </div>
        <div style={{borderTop:`1px solid ${T.line}`,marginBottom:8,paddingTop:8}}>
          {[["Reef Sandal Navy x1","Rs 1,290.00"],["Canvas Tote x2","Rs 1,300.00"],["Flip Flop Coral x1","Rs 490.00"]].map(([n,p],i) => <Row key={i} l={n} r={p}/>)}
        </div>
        <div style={{borderTop:`1px solid ${T.line}`,paddingTop:8}}>
          <Row l="Subtotal" r="Rs 3,080.00"/><Row l="VAT 15%" r="Rs 462.00"/><Row l="Total" r="Rs 3,542.00" bold/>
        </div>
        <div style={{borderTop:`1px solid ${T.line}`,paddingTop:8,marginTop:4}}>
          <Row l="Paid (Cash)" r="Rs 4,000.00"/><Row l="Change" r="Rs 458.00" color={T.green}/>
        </div>
        <div style={{textAlign:"center",fontSize:11,color:T.purple,fontWeight:800,background:T.purpleL,borderRadius:8,padding:8,marginTop:10}}>
          Loyalty: +31 pts awarded to Marie L. (451 total)
        </div>
      </Glass>
      <div style={{display:"flex",gap:8,marginTop:12}}><Btn48 full>PRINT</Btn48><Btn48 full>WHATSAPP</Btn48></div>
      <div style={{marginTop:6}}><Btn48 primary full onClick={()=>nav("products")}>NEW SALE</Btn48></div>
    </div></PF>
  )
}

const MRefund = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("history")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Process Refund</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:12}}>Search the original order</div>
      <Field placeholder="Order # or scan receipt barcode..."/>
      <Card p="14px">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div><div style={{fontSize:14,fontWeight:800}}>Order #GBR-047</div><div style={{fontSize:11,color:T.muted}}>Today 14:32</div></div>
          <div style={{fontSize:15,fontWeight:800}}>Rs 3,542.00</div>
        </div>
        <div style={{borderTop:`1px solid ${T.line}`,paddingTop:8}}>
          {[{n:"Reef Sandal Navy",p:1290,sel:true},{n:"Canvas Tote",p:650,sel:false},{n:"Flip Flop Coral",p:490,sel:false}].map((it,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<2?`1px solid ${T.line}`:"none"}}>
              <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${it.sel?T.blue:T.line}`,background:it.sel?T.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{it.sel && <span style={{color:"#fff",fontSize:11}}>&#x2713;</span>}</div>
              <div style={{flex:1,fontSize:13,fontWeight:700}}>{it.n}</div>
              <span style={{fontSize:13,fontWeight:800,color:T.blue}}>{fmt(it.p)}</span>
            </div>
          ))}
        </div>
      </Card>
      <Field label="REASON" placeholder="Select reason..."/>
      <Btn48 primary full onClick={()=>nav("receipt")}>REFUND Rs 1,290.00</Btn48>
    </div></PF>
  )
}

const MHolds = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("products")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Held Orders</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:12}}>3 orders on hold</div>
      {[{id:"HOLD-001",c:"Walk-in",t:"Rs 2,180",time:"10m",note:"Checking size"},{id:"HOLD-002",c:"Marie L.",t:"Rs 4,750",time:"25m",note:"Waiting for card"},{id:"HOLD-003",c:"Jean P.",t:"Rs 1,290",time:"1h",note:"Reserved item"}].map((h,i) => (
        <Card key={i} p="14px"><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <div><div style={{fontSize:14,fontWeight:800}}>{h.c}</div><div style={{fontSize:11,color:T.muted}}>{h.id} · {h.time} ago</div></div>
          <div style={{fontSize:16,fontWeight:800}}>{h.t}</div>
        </div><div style={{fontSize:12,color:T.muted,marginBottom:8}}>{h.note}</div>
        <div style={{display:"flex",gap:6}}><Btn48 primary onClick={()=>nav("products")}>RESUME</Btn48><Btn48>CANCEL</Btn48></div></Card>
      ))}
    </div></PF>
  )
}

const MHistory = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("products")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Order History</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:10}}>Today · 47 orders</div>
      <Field placeholder="Search orders..."/>
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        <Btn48 onClick={()=>nav("refund")}>REFUND</Btn48>
        <Btn48 onClick={()=>nav("holds")}>HOLDS</Btn48>
        <Btn48 onClick={()=>nav("opentill")}>OPEN TILL</Btn48>
        <Btn48 onClick={()=>nav("closetill")}>CLOSE TILL</Btn48>
      </div>
      {[["GBR-047","14:32","Rs 3,542","Cash",T.green,"Complete"],["GBR-046","14:15","Rs 890","Blink",T.green,"Complete"],["GBR-045","13:50","Rs 1,290","Cash",T.red,"Refunded"],["GBR-044","13:22","Rs 4,680","Card",T.green,"Complete"],["GBR-043","12:45","Rs 650","Cash",T.green,"Complete"]].map(([id,t,tot,pay,c,st],i) => (
        <Card key={i} p="10px 12px" mb={4} onClick={()=>nav("proddetail")}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:13,fontWeight:800}}>#{id} <span style={{fontWeight:600,color:T.muted}}>· {t}</span></div><div style={{fontSize:11,color:T.muted}}>{pay}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:800}}>{tot}</div><Badge bg={c===T.green?T.greenL:T.redL} fg={c}>{st}</Badge></div>
        </div></Card>
      ))}
    </div></PF>
  )
}

// ═══════════════════════════════════════════
// TILL
// ═══════════════════════════════════════════
const MOpenTill = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("products")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:2}}>Open Till</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Grand Baie · POS-GB-01</div>
      <Glass p="16px" r={14}>
        <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:".06em",marginBottom:8}}>OPENING FLOAT</div>
        {["Rs 2000 notes","Rs 500 notes","Rs 200 notes","Rs 100 notes","Coins"].map((d,i) => (
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<4?`1px solid ${T.line}`:"none"}}>
            <span style={{fontSize:13,fontWeight:700,color:T.muted}}>{d}</span>
            <div style={{width:70,height:38,borderRadius:10,border:`1px solid ${T.line}`,background:T.paper,display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"0 10px",fontSize:14,fontWeight:800}}>0</div>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:12,paddingTop:10,borderTop:`1px solid ${T.line}`}}>
          <span style={{fontSize:16,fontWeight:800}}>Float total</span><span style={{fontSize:16,fontWeight:800}}>Rs 1,000.00</span>
        </div>
      </Glass>
      <div style={{marginTop:14}}><Btn48 primary full onClick={()=>nav("products")}>OPEN TILL SESSION</Btn48></div>
    </div></PF>
  )
}

const MCloseTill = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"12px 10px"}}>
      <BackBtn onClick={()=>nav("products")}/>
      <div style={{fontSize:16,fontWeight:800,marginBottom:2}}>Close Till</div>
      <div style={{fontSize:11,color:T.muted,marginBottom:10}}>Shift 08:00–16:30 · Sarah M.</div>
      <Section title="STEP 1 · EXPECTED TOTALS">
        <Glass p="0" r={12} style={{overflow:"hidden",marginBottom:4}}>
          {[["Cash sales","Rs 42,350.00"],["Card / Blink","Rs 67,810.00"],["Refunds","- Rs 1,290.00"],["Expected cash","Rs 43,350.00",true]].map(([l,v,h],i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",borderBottom:i<3?`1px solid ${T.line}`:"none",background:h?T.blueL:"transparent"}}>
              <span style={{fontSize:12,fontWeight:h?800:600,color:h?T.blueD:T.muted}}>{l}</span>
              <span style={{fontSize:12,fontWeight:800,color:h?T.blueD:T.ink}}>{v}</span>
            </div>
          ))}
        </Glass>
      </Section>
      <Section title="STEP 2 · COUNT CASH">
        <Glass p="10px 12px" r={12} style={{marginBottom:4}}>
          {["Rs 2000","Rs 500","Rs 200","Rs 100","Coins"].map((d,i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<4?`1px solid ${T.line}`:"none"}}>
              <span style={{fontSize:11,fontWeight:700,color:T.muted}}>{d}</span>
              <div style={{width:56,height:32,borderRadius:8,border:`1px solid ${T.line}`,background:T.paper,display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"0 8px",fontSize:12,fontWeight:800}}>0</div>
            </div>
          ))}
        </Glass>
      </Section>
      <Section title="STEP 3 · DISCREPANCY">
        <div style={{background:T.amberL,borderRadius:12,padding:"10px 12px",marginBottom:4}}>
          <div style={{fontSize:11,fontWeight:800,color:T.amber}}>Complete cash count to see discrepancy</div>
        </div>
      </Section>
      <Section title="STEP 4 · EVIDENCE">
        <div style={{display:"flex",gap:6,marginBottom:6}}>
          {[["📷","Till photo"],["📎","Bank slip"],["📄","Z-report"]].map(([ic,l],i) => (
            <div key={i} style={{flex:1,background:T.paper,borderRadius:10,border:`1.5px dashed ${T.line}`,padding:"12px 4px",textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:16}}>{ic}</div><div style={{fontSize:9,fontWeight:700,color:T.muted,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </Section>
      <Btn48 primary full onClick={()=>nav("home")}>SUBMIT RECONCILIATION</Btn48>
    </div></PF>
  )
}

// ═══════════════════════════════════════════
// LOYALTY
// ═══════════════════════════════════════════
const MLoyalty = () => {
  const nav = useNav()
  return (
    <PF active="pos"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("custsearch")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:2}}>Loyalty</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Marie Laurent · +230 5921 4433</div>
      <div style={{background:T.purpleL,borderRadius:14,padding:16,textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:32,fontWeight:800,color:T.purple}}>420</div>
        <div style={{fontSize:13,fontWeight:700,color:T.purple}}>Points balance</div>
      </div>
      <Section title="VOUCHERS">
        {[{n:"Rs 200 off next purchase",exp:"30 Apr",code:"VCH-2847"},{n:"Free tote bag",exp:"15 May",code:"VCH-3102"}].map((v,i) => (
          <Card key={i} p="12px"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:13,fontWeight:800}}>{v.n}</div><div style={{fontSize:11,color:T.muted}}>Exp {v.exp} · {v.code}</div></div>
            <Btn48 primary onClick={()=>nav("products")}>REDEEM</Btn48>
          </div></Card>
        ))}
      </Section>
      <Section title="CONSENT">
        <div style={{background:T.greenL,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:T.green,fontSize:16}}>&#x2713;</span>
          <div style={{fontSize:12,fontWeight:700,color:T.green}}>Marketing consent given 12 Jan 2026</div>
        </div>
      </Section>
    </div></PF>
  )
}

// ═══════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════
const MInventory = () => {
  const nav = useNav()
  return (
    <PF active="tasks"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("home")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Inventory</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Stock counts and requests</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[["▦","Count","Full inventory",T.blue],["□","Barcode","Request barcode",T.amber],["📷","Name Item","New + photo",T.purple],["📊","Stock","Levels & alerts",T.green]].map(([ic,l,s,c],i) => (
          <Card key={i} p="14px">
            <div style={{width:36,height:36,borderRadius:10,background:`${c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:c,marginBottom:8}}>{ic}</div>
            <div style={{fontSize:13,fontWeight:800}}>{l}</div><div style={{fontSize:10,color:T.muted}}>{s}</div>
          </Card>
        ))}
      </div>
      <Section title="ACTIVE COUNTS">
        <div style={{background:T.amberL,borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:13,fontWeight:800,color:T.amber}}>Footwear section</div><div style={{fontSize:10,color:T.amber,opacity:.7}}>24/68 items · 30 min ago</div></div>
          <Badge bg={T.amberL} fg={T.amber}>In progress</Badge>
        </div>
      </Section>
    </div></PF>
  )
}

// ═══════════════════════════════════════════
// STAFF OPS
// ═══════════════════════════════════════════
const MStaffOps = () => {
  const nav = useNav()
  return (
    <PF active="tasks"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("home")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:2}}>Staff Ops</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:12}}>Your daily assistant</div>
      <div style={{background:T.greenL,borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:12,fontWeight:800,color:T.green}}>Checked in at 08:02</div><div style={{fontSize:10,color:T.green,opacity:.7}}>Grand Baie</div></div>
        <Btn48>CHECK OUT</Btn48>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14}}>
        {[["📋","Leave",T.blue],["🧾","Expense",T.amber],["📦","Stationery",T.purple],["🚗","Pickup","#546E7A"],["🏷","Cust. Item",T.blue],["🔧","Maint.",T.red]].map(([ic,l,c],i) => (
          <Card key={i} p="10px 6px"><div style={{textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:16}}>{ic}</div><div style={{fontSize:9,fontWeight:800,marginTop:2}}>{l}</div>
          </div></Card>
        ))}
      </div>
      <Section title="MY TASKS">
        {[{t:"Restock sandal display",h:true,d:"By 12:00"},{t:"Clean fitting area",d:"By 14:00"},{t:"Accept delivery #412",h:true,d:"By 16:00"}].map((t,i) => (
          <Card key={i} p="8px 10px" mb={4}><div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${t.h?T.red:T.line}`,flexShrink:0}}/>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:800}}>{t.t}</div><div style={{fontSize:10,color:T.muted}}>{t.d}</div></div>
            {t.h && <Badge bg={T.redL} fg={T.red}>Urgent</Badge>}
          </div></Card>
        ))}
      </Section>
      <Section title="RECENT REQUESTS">
        {[["Annual leave 22–24 Apr","Approved",T.green,T.greenL],["Bus fare Rs 340","Pending",T.amber,T.amberL],["Asset #A-012","Signed",T.blue,T.blueL]].map(([t,s,fg,bg],i) => (
          <Card key={i} p="8px 10px" mb={4}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700}}>{t}</span><Badge bg={bg} fg={fg}>{s}</Badge>
          </div></Card>
        ))}
      </Section>
    </div></PF>
  )
}

// ═══════════════════════════════════════════
// SUPERVISOR
// ═══════════════════════════════════════════
const MSupervisor = () => {
  const nav = useNav()
  return (
    <PF active="tasks"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("home")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:2}}>Supervisor</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:12}}>Approval cockpit</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[["3","Leave",T.blue],["2","Expense",T.amber],["1","Recon",T.red]].map(([v,l,c],i) => (
          <Glass key={i} p="10px" r={12} style={{textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:10,fontWeight:700,color:T.muted}}>{l}</div>
          </Glass>
        ))}
      </div>
      <Section title="APPROVAL QUEUE">
        {[{w:"Ravi P.",ty:"Annual leave",d:"22–26 Apr · 5 days"},{w:"Amina K.",ty:"Expense claim",d:"Rs 2,400 · Transport"},{w:"Jean-Luc",ty:"Sick leave",d:"Today · Dr note attached"},{w:"Sarah M.",ty:"Discrepancy",d:"- Rs 1,240 · Grand Baie"},{w:"Marc D.",ty:"Stationery",d:"Receipt rolls x10"}].map((a,i) => (
          <Card key={i} p="10px 12px">
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div><div style={{fontSize:12,fontWeight:800}}>{a.w} · {a.ty}</div><div style={{fontSize:10,color:T.muted}}>{a.d}</div></div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{padding:"4px 12px",borderRadius:8,background:T.greenL,color:T.green,fontSize:11,fontWeight:800,border:"none",cursor:"pointer"}}>APPROVE</button>
              <button style={{padding:"4px 12px",borderRadius:8,background:T.redL,color:T.red,fontSize:11,fontWeight:800,border:"none",cursor:"pointer"}}>REJECT</button>
              <button style={{padding:"4px 12px",borderRadius:8,background:T.panel,color:T.muted,fontSize:11,fontWeight:800,border:`1px solid ${T.line}`,cursor:"pointer"}}>VIEW</button>
            </div>
          </Card>
        ))}
      </Section>
      <Section title="QUICK ACTIONS">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {[["✓","Checklist"],["⏰","Shifts"],["📋","Tasks"],["⚠","Warning"]].map(([ic,l],i) => (
            <Card key={i} p="10px"><div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <span style={{fontSize:16}}>{ic}</span><span style={{fontSize:12,fontWeight:800}}>{l}</span>
            </div></Card>
          ))}
        </div>
      </Section>
    </div></PF>
  )
}

// ═══════════════════════════════════════════
// SYSTEM SCREENS
// ═══════════════════════════════════════════
const MSyncStatus = () => {
  const nav = useNav()
  return (
    <PF active="more"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("settings")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Sync Status</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Last sync: 2 minutes ago</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        <Glass p="12px" r={12} style={{background:T.greenL}}><div style={{fontSize:11,fontWeight:800,color:T.green}}>OUTBOX</div><div style={{fontSize:22,fontWeight:800,color:T.green}}>0</div><div style={{fontSize:10,color:T.green}}>Pending push</div></Glass>
        <Glass p="12px" r={12} style={{background:T.blueL}}><div style={{fontSize:11,fontWeight:800,color:T.blueD}}>LAST PULL</div><div style={{fontSize:22,fontWeight:800,color:T.blueD}}>2m</div><div style={{fontSize:10,color:T.blueD}}>ago</div></Glass>
      </div>
      <Section title="PUSH LOG (DEVICE TO SERVER)">
        {[["47 orders pushed","14:30"],["12 attendance events","08:05"],["3 leave requests","09:20"]].map(([d,t],i) => (
          <Card key={i} p="8px 10px" mb={4}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700}}>{d}</span><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,color:T.muted}}>{t}</span><Badge bg={T.greenL} fg={T.green}>OK</Badge></div>
          </div></Card>
        ))}
      </Section>
      <Section title="PULL LOG (SERVER TO DEVICE)">
        {[["Products (142 items)","14:28"],["Capabilities","14:28"],["Approval decisions (3)","14:28"]].map(([d,t],i) => (
          <Card key={i} p="8px 10px" mb={4}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700}}>{d}</span><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,color:T.muted}}>{t}</span><Badge bg={T.greenL} fg={T.green}>OK</Badge></div>
          </div></Card>
        ))}
      </Section>
      <Btn48 primary full>FORCE SYNC NOW</Btn48>
    </div></PF>
  )
}

const MPrinter = () => {
  const nav = useNav()
  return (
    <PF active="more"><div style={{padding:"14px 12px"}}>
      <BackBtn onClick={()=>nav("settings")}/>
      <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Printer Setup</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Epson ePOS · Bluetooth / WiFi / USB</div>
      <Section title="CONNECTED">
        <Card p="12px"><div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:12,background:T.greenL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🖨</div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:800}}>Epson TM-T82III</div><div style={{fontSize:11,color:T.muted}}>Bluetooth · Connected</div></div>
          <Badge bg={T.greenL} fg={T.green}>Online</Badge>
        </div></Card>
      </Section>
      <Section title="TEST">
        <div style={{display:"flex",gap:6}}><Btn48>TEST RECEIPT</Btn48><Btn48>TEST LABEL</Btn48></div>
      </Section>
      <Section title="AVAILABLE">
        {[{n:"Epson TM-T82III (2)",c:"WiFi"},{n:"Generic USB",c:"USB"}].map((p,i) => (
          <Card key={i} p="10px 12px" mb={4}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:12,fontWeight:800}}>{p.n}</div><div style={{fontSize:10,color:T.muted}}>{p.c}</div></div>
            <Btn48>CONNECT</Btn48>
          </div></Card>
        ))}
      </Section>
    </div></PF>
  )
}

const MSettings = () => {
  const nav = useNav()
  const items = [
    {l:"Device info",t:"settings"},
    {l:"Printer setup",t:"printer"},
    {l:"Sync status",t:"sync"},
    {l:"Emergency contact",t:"settings"},
    {l:"About Posterita",t:"settings"},
    {l:"Log out",t:"welcome",danger:true},
  ]
  return (
    <PF active="more"><div style={{padding:"14px 12px"}}>
      <div style={{fontSize:18,fontWeight:800,marginBottom:14}}>Settings</div>
      <Glass p="14px" r={14}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Avatar name="Sarah Martin" sz={44}/>
          <div><div style={{fontSize:15,fontWeight:800}}>Sarah Martin</div><div style={{fontSize:12,color:T.muted}}>Cashier + Supervisor · Grand Baie</div></div>
        </div>
      </Glass>
      {items.map((s,i) => (
        <div key={i} onClick={()=>nav(s.t)} style={{padding:"12px 0",borderBottom:`1px solid ${T.line}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
          <span style={{fontSize:14,fontWeight:700,color:s.danger?T.red:T.ink}}>{s.l}</span>
          {!s.danger && <span style={{fontSize:16,color:T.muted}}>&#x203A;</span>}
        </div>
      ))}
      <div style={{marginTop:16,background:T.panel,borderRadius:10,padding:"10px 12px"}}>
        <div style={{fontSize:11,color:T.muted}}>Device: POS-GB-01 · App v2.4.1</div>
        <div style={{fontSize:11,color:T.muted}}>Sync: 2m ago · Outbox: 0 pending</div>
      </div>
    </div></PF>
  )
}

// ═══════════════════════════════════════════
// WEB CONSOLE SCREENS
// ═══════════════════════════════════════════
const WebShell = ({active, children, onNav}) => {
  const navItems = [
    {l:"Dashboard",k:"wdash"},
    {l:"Devices",k:"wdevices"},
    {l:"Users & Roles",k:"wdash"},
    {l:"Capabilities",k:"wdash"},
    {l:"Stores",k:"wdash"},
    {l:"Products",k:"wdash"},
    {l:"Reconciliation",k:"wrecon"},
    {l:"Requests",k:"wdash"},
    {l:"Staff Ops",k:"wdash"},
    {l:"Approvals",k:"wdash"},
    {l:"Assets",k:"wdash"},
    {l:"Loyalty",k:"wdash"},
    {l:"Audit Trail",k:"waudit"},
    {l:"Compliance",k:"wdash"},
    {l:"AI Tasks",k:"wdash"},
    {l:"AI Setup",k:"waisetup"},
  ]
  return (
    <div style={{background:T.paper,borderRadius:24,border:"1px solid rgba(255,255,255,.6)",boxShadow:T.shLg,overflow:"hidden",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",minHeight:580}}>
        <div style={{width:200,background:T.bg,borderRight:`1px solid ${T.line}`,padding:"16px 0",flexShrink:0}}>
          <div style={{padding:"0 16px 16px",fontSize:15,fontWeight:800,color:T.blue,letterSpacing:"-.02em",cursor:"pointer"}} onClick={()=>onNav("wdash")}>Posterita</div>
          {navItems.map(n => (
            <div key={n.l} onClick={()=>onNav(n.k)} style={{padding:"7px 16px",fontSize:12,fontWeight:active===n.k?800:600,color:active===n.k?T.blue:T.muted,background:active===n.k?T.blueL:"transparent",borderRight:active===n.k?`3px solid ${T.blue}`:"3px solid transparent",cursor:"pointer"}}>{n.l}</div>
          ))}
        </div>
        <div style={{flex:1,padding:"18px 22px",background:T.bg,overflowY:"auto"}}>{children}</div>
      </div>
    </div>
  )
}

const WMetric = ({l, v, s, c}) => (
  <Glass p="16px 18px" r={16}>
    <div style={{fontSize:11,fontWeight:800,color:T.muted,letterSpacing:".06em",marginBottom:6}}>{l}</div>
    <div style={{fontSize:24,fontWeight:800,color:c||T.ink,letterSpacing:"-.02em"}}>{v}</div>
    {s && <div style={{fontSize:12,color:T.muted,marginTop:4}}>{s}</div>}
  </Glass>
)

const WDash = ({onNav}) => (
  <WebShell active="wdash" onNav={onNav}>
    <div style={{marginBottom:18}}><div style={{fontSize:22,fontWeight:800,letterSpacing:"-.02em"}}>Dashboard</div><div style={{fontSize:13,color:T.muted}}>All stores · Today</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:18}}>
      <WMetric l="TOTAL SALES" v="Rs 312,450" s="+12% vs yesterday" c={T.blue}/>
      <WMetric l="ORDERS" v="183" s="Across 4 stores"/>
      <WMetric l="PENDING" v="7" s="3 leave · 2 expense · 2 recon" c={T.amber}/>
      <WMetric l="DEVICES" v="14 / 16" s="2 stale heartbeat"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <Glass p="18px" r={16}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Reconciliation alerts</div>
        {[["Grand Baie","- Rs 1,240",T.red,T.redL,"Unresolved"],["Port Louis","+ Rs 350",T.amber,T.amberL,"Review"],["Curepipe","Rs 0",T.green,T.greenL,"Clean"],["Flic en Flac","- Rs 680",T.red,T.redL,"Unresolved"]].map(([s,d,fg,bg,st],i) => (
          <div key={i} onClick={()=>onNav("wrecon")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<3?`1px solid ${T.line}`:"none",cursor:"pointer"}}>
            <div><div style={{fontSize:13,fontWeight:700}}>{s}</div><div style={{fontSize:12,color:T.muted}}>{d}</div></div>
            <Badge bg={bg} fg={fg}>{st}</Badge>
          </div>
        ))}
      </Glass>
      <Glass p="18px" r={16}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:12}}>Pending approvals</div>
        {[["Ravi P.","Annual leave","22–26 Apr"],["Amina K.","Expense","Rs 2,400"],["Jean-Luc","Sick leave","Today"]].map(([w,ty,d],i) => (
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<2?`1px solid ${T.line}`:"none"}}>
            <div><div style={{fontSize:13,fontWeight:700}}>{w} · {ty}</div><div style={{fontSize:12,color:T.muted}}>{d}</div></div>
            <div style={{display:"flex",gap:6}}>
              <button style={{padding:"5px 12px",borderRadius:10,background:T.greenL,color:T.green,fontSize:12,fontWeight:800,border:"none",cursor:"pointer"}}>Approve</button>
              <button style={{padding:"5px 12px",borderRadius:10,background:T.redL,color:T.red,fontSize:12,fontWeight:800,border:"none",cursor:"pointer"}}>Reject</button>
            </div>
          </div>
        ))}
      </Glass>
    </div>
  </WebShell>
)

const WDevices = ({onNav}) => (
  <WebShell active="wdevices" onNav={onNav}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{fontSize:20,fontWeight:800}}>Devices</div><Btn48 primary>+ ENROLL DEVICE</Btn48></div>
    <Glass p="0" r={16} style={{overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 80px 70px 60px 70px 60px",padding:"8px 14px",background:T.bg,fontSize:10,fontWeight:800,color:T.muted,letterSpacing:".04em",borderBottom:`1px solid ${T.line}`}}>
        {["DEVICE","STORE","USER","PROFILE","STATUS","BATT","SYNC",""].map(h=><span key={h}>{h}</span>)}
      </div>
      {[["POS-GB-01","Grand Baie","Sarah M.","POS","Online","84%","2m",T.green],["POS-GB-02","Grand Baie","Ravi P.","POS","Online","61%","5m",T.green],["SUP-PL-01","Port Louis","Amina K.","Super","Online","92%","1m",T.green],["POS-CP-01","Curepipe","Jean-Luc","POS","Stale","23%","47m",T.amber],["POS-PL-02","Port Louis","—","—","Offline","—","3d",T.red],["POS-FF-01","Flic en Flac","Lisa T.","POS","Online","77%","3m",T.green]].map(([n,s,u,p,st,b,sy,c],i) => (
        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 80px 70px 60px 70px 60px",padding:"8px 14px",fontSize:12,alignItems:"center",borderBottom:`1px solid ${T.line}`}}>
          <span style={{fontWeight:800}}>{n}</span><span style={{color:T.muted}}>{s}</span><span style={{color:T.muted}}>{u}</span>
          <Badge bg={p==="—"?"#EDECE8":T.blueL} fg={p==="—"?T.muted:T.blueD}>{p}</Badge>
          <Badge bg={c===T.green?T.greenL:c===T.amber?T.amberL:T.redL} fg={c}>{st}</Badge>
          <span style={{color:T.muted}}>{b}</span><span style={{color:T.muted}}>{sy}</span>
          <span style={{color:T.red,fontSize:11,fontWeight:800,cursor:"pointer"}}>Revoke</span>
        </div>
      ))}
    </Glass>
  </WebShell>
)

const WRecon = ({onNav}) => (
  <WebShell active="wrecon" onNav={onNav}>
    <div style={{fontSize:20,fontWeight:800,marginBottom:14}}>Reconciliation Review</div>
    <Glass p="20px" r={16}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <div><div style={{fontSize:16,fontWeight:800}}>Grand Baie — Sarah M.</div><div style={{fontSize:12,color:T.muted}}>Today 16:32 · Shift 08:00–16:30</div></div>
        <Badge bg={T.redL} fg={T.red}>- Rs 1,240</Badge>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
        {[["EXPECTED","Rs 43,350",T.bg,T.ink],["COUNTED","Rs 42,110",T.bg,T.ink],["DISCREPANCY","- Rs 1,240",T.redL,T.red]].map(([l,v,bg,c],i) => (
          <div key={i} style={{background:bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:10,fontWeight:800,color:T.muted,letterSpacing:".06em"}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c,marginTop:4}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:12,fontWeight:800,marginBottom:4}}>Cashier's note</div>
      <div style={{background:T.bg,borderRadius:10,padding:"10px 14px",fontSize:13,color:T.muted,marginBottom:14,lineHeight:1.6}}>
        "Processing error — cash entered as card"
      </div>
      <div style={{fontSize:12,fontWeight:800,marginBottom:6}}>Evidence</div>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {["Till photo","Bank deposit slip","Daily Z-report"].map(e => (
          <span key={e} style={{background:T.bg,borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,color:T.blue,cursor:"pointer",border:`1px solid ${T.line}`}}>{e} ↗</span>
        ))}
      </div>
      <div style={{borderTop:`1px solid ${T.line}`,paddingTop:14,display:"flex",gap:8,alignItems:"flex-end"}}>
        <div style={{flex:1}}><div style={{fontSize:10,fontWeight:800,color:T.muted,marginBottom:4}}>RESOLUTION</div><div style={{background:T.bg,borderRadius:10,padding:"8px 12px",fontSize:12,border:`1px solid ${T.line}`,color:T.muted}}>Accepted / Adjusted / HR referral...</div></div>
        <div style={{flex:1}}><div style={{fontSize:10,fontWeight:800,color:T.muted,marginBottom:4}}>MANAGER NOTE</div><div style={{background:T.bg,borderRadius:10,padding:"8px 12px",fontSize:12,border:`1px solid ${T.line}`,color:T.muted}}>Add note...</div></div>
        <Btn48 primary>RESOLVE</Btn48>
      </div>
    </Glass>
  </WebShell>
)

const WAudit = ({onNav}) => (
  <WebShell active="waudit" onNav={onNav}>
    <div style={{fontSize:20,fontWeight:800,marginBottom:14}}>Audit Trail</div>
    <Glass p="0" r={16} style={{overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"50px 1fr 120px 2fr 100px",padding:"8px 14px",background:T.bg,fontSize:10,fontWeight:800,color:T.muted,letterSpacing:".04em",borderBottom:`1px solid ${T.line}`}}>
        {["TIME","USER","ACTION","DETAIL","STORE"].map(h=><span key={h}>{h}</span>)}
      </div>
      {[["14:32","Sarah M.","order.create","#GBR-047","Grand Baie",T.blue],["14:15","Ravi P.","order.create","#GBR-046","Grand Baie",T.blue],["13:55","Amina K.","leave.approve","Marc D.","Port Louis",T.green],["13:50","Sarah M.","order.refund","#REF-012","Grand Baie",T.amber],["13:22","System","device.stale","POS-CP-01","Curepipe",T.red],["13:00","Jean-Luc","till.open","Session","Curepipe",T.blue],["12:45","Lisa T.","attendance.in","Check in","Flic en Flac",T.green]].map(([t,u,a,d,s,c],i) => (
        <div key={i} style={{display:"grid",gridTemplateColumns:"50px 1fr 120px 2fr 100px",padding:"8px 14px",fontSize:12,alignItems:"center",borderBottom:`1px solid ${T.line}`}}>
          <span style={{color:T.muted,fontWeight:700}}>{t}</span>
          <span style={{fontWeight:800}}>{u}</span>
          <Badge bg={c===T.green?T.greenL:c===T.amber?T.amberL:c===T.red?T.redL:T.blueL} fg={c}>{a}</Badge>
          <span style={{color:T.muted}}>{d}</span>
          <span style={{color:T.muted}}>{s}</span>
        </div>
      ))}
    </Glass>
  </WebShell>
)

const WAISetup = ({onNav}) => (
  <WebShell active="waisetup" onNav={onNav}>
    <div style={{fontSize:20,fontWeight:800,marginBottom:14}}>AI Agent Setup</div>
    <div style={{background:T.amberL,borderRadius:12,padding:"10px 14px",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:800,color:T.amber}}>Configure which actions AI agents can auto-execute vs require approval.</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <Glass p="16px" r={16}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:10,color:T.green}}>Auto-execute</div>
        {["Create tasks","Assign requests","Trigger sync jobs","Generate summaries","Draft schedules","Prepare discrepancy cases"].map((a,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<5?`1px solid ${T.line}`:"none"}}>
            <div style={{width:18,height:18,borderRadius:5,background:T.green,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:10}}>✓</span></div>
            <span style={{fontSize:13,fontWeight:700}}>{a}</span>
          </div>
        ))}
      </Glass>
      <Glass p="16px" r={16}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:10,color:T.amber}}>Requires manager approval</div>
        {["Issue penalties/warnings","Payroll-impacting actions","Destructive deletions","Terminal revocation","Mass customer comms","Finance overrides"].map((a,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<5?`1px solid ${T.line}`:"none"}}>
            <div style={{width:18,height:18,borderRadius:5,background:T.amber,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:10}}>!</span></div>
            <span style={{fontSize:13,fontWeight:700}}>{a}</span>
          </div>
        ))}
      </Glass>
    </div>
  </WebShell>
)

// ═══════════════════════════════════════════
// MAIN APP — ROUTER
// ═══════════════════════════════════════════
const SCREENS = {
  // Auth
  welcome: MWelcome, phone: MPhone, otp: MOTP, profile: MProfile,
  pin: MPIN, enroll: MEnroll, login: MLogin,
  // Home
  home: MHome, notifs: MNotif,
  // POS
  products: MProducts, proddetail: MProdDetail, custsearch: MCustSearch,
  payment: MPayment, receipt: MReceipt, refund: MRefund, holds: MHolds, history: MHistory,
  // Till
  opentill: MOpenTill, closetill: MCloseTill,
  // Loyalty
  loyalty: MLoyalty,
  // Inventory
  inventory: MInventory,
  // Staff
  staffops: MStaffOps,
  // Supervisor
  supervisor: MSupervisor,
  // System
  sync: MSyncStatus, printer: MPrinter, settings: MSettings,
}

const WEB_SCREENS = {
  wdash: WDash, wdevices: WDevices, wrecon: WRecon, waudit: WAudit, waisetup: WAISetup,
}

export default function App() {
  const [screen, setScreen] = useState("welcome")
  const [mode, setMode] = useState("mobile") // mobile or web

  const navigate = (target) => {
    if (target.startsWith("w")) {
      setMode("web")
      setScreen(target)
    } else {
      setMode("mobile")
      setScreen(target)
    }
  }

  const MobileComp = SCREENS[screen]
  const WebComp = WEB_SCREENS[screen]

  return (
    <NavContext.Provider value={navigate}>
      <div style={{fontFamily:T.font,color:T.ink,minHeight:"100vh",padding:"16px"}}>
        {/* Mode switcher */}
        <div style={{maxWidth:1200,margin:"0 auto",marginBottom:16}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{fontSize:18,fontWeight:800,color:T.blue,letterSpacing:"-.02em",marginRight:12}}>Posterita Prototype</div>
            {[["mobile","📱 Phone App"],["web","💻 Web Console"]].map(([k,l]) => (
              <button key={k} onClick={()=>{setMode(k);setScreen(k==="mobile"?"welcome":"wdash")}} style={{height:38,padding:"0 16px",borderRadius:12,border:`1px solid ${mode===k?T.ink:T.line}`,background:mode===k?T.ink:T.paper,color:mode===k?"#fff":T.ink,fontFamily:T.font,fontSize:13,fontWeight:800,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          {mode === "mobile" && (
            <div style={{display:"flex",gap:4,marginTop:10,flexWrap:"wrap"}}>
              {[
                ["Auth",["welcome","phone","otp","profile","pin","enroll","login"]],
                ["Home",["home","notifs"]],
                ["POS",["products","proddetail","custsearch","payment","receipt","refund","holds","history"]],
                ["Till",["opentill","closetill"]],
                ["Loyalty",["loyalty"]],
                ["Inventory",["inventory"]],
                ["Staff",["staffops"]],
                ["Supervisor",["supervisor"]],
                ["System",["sync","printer","settings"]],
              ].map(([group, screens]) => (
                <div key={group} style={{display:"flex",gap:2,alignItems:"center",marginRight:6}}>
                  <span style={{fontSize:10,fontWeight:800,color:T.muted,marginRight:2}}>{group}:</span>
                  {screens.map(s => (
                    <button key={s} onClick={()=>setScreen(s)} style={{padding:"3px 8px",borderRadius:6,border:"none",background:screen===s?T.blue:T.blueL,color:screen===s?"#fff":T.blueD,fontFamily:T.font,fontSize:10,fontWeight:700,cursor:"pointer"}}>{s}</button>
                  ))}
                </div>
              ))}
            </div>
          )}
          {mode === "web" && (
            <div style={{display:"flex",gap:4,marginTop:10}}>
              {Object.keys(WEB_SCREENS).map(s => (
                <button key={s} onClick={()=>setScreen(s)} style={{padding:"4px 10px",borderRadius:8,border:"none",background:screen===s?T.blue:T.blueL,color:screen===s?"#fff":T.blueD,fontFamily:T.font,fontSize:11,fontWeight:700,cursor:"pointer"}}>{s.replace("w","")}</button>
              ))}
            </div>
          )}
        </div>

        {/* Screen */}
        {mode === "mobile" && MobileComp && (
          <div style={{display:"flex",justifyContent:"center"}}>
            <MobileComp />
          </div>
        )}
        {mode === "web" && WebComp && (
          <WebComp onNav={navigate} />
        )}
      </div>
    </NavContext.Provider>
  )
}
