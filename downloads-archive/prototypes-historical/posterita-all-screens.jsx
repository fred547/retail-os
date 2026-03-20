import { useState } from "react";

const C = {
  brand: "#1D9E75", brandL: "#E1F5EE", brandD: "#0F6E56",
  bg: "#F7F6F3", card: "#FFFFFF", bdr: "rgba(0,0,0,0.08)",
  t1: "#1a1a1a", t2: "#6b6b6b", t3: "#999",
  red: "#E24B4A", redL: "#FCEBEB", redD: "#A32D2D",
  amber: "#EF9F27", amberL: "#FAEEDA", amberD: "#854F0B",
  green: "#639922", greenL: "#EAF3DE", greenD: "#3B6D11",
  blue: "#378ADD", blueL: "#E6F1FB", blueD: "#185FA5",
  purple: "#7F77DD", purpleL: "#EEEDFE", purpleD: "#534AB7",
};

const PRODUCTS = [
  { id:1, name:"Reef Sandal Navy", sku:"RF-2847", price:1290, cat:"Sandals", img:"\u{1FA74}", stock:24 },
  { id:2, name:"Canvas Tote Natural", sku:"CT-0412", price:650, cat:"Bags", img:"\u{1F45C}", stock:18 },
  { id:3, name:"Flip Flop Coral M", sku:"FF-1039", price:490, cat:"Flip Flops", img:"\u{1FA74}", stock:42 },
  { id:4, name:"Beach Slide White", sku:"BS-0821", price:890, cat:"Slides", img:"\u{1F45F}", stock:15 },
  { id:5, name:"Leather Sandal Tan", sku:"LS-1122", price:1850, cat:"Sandals", img:"\u{1FA74}", stock:8 },
  { id:6, name:"Straw Hat Natural", sku:"SH-0055", price:450, cat:"Accessories", img:"\u{1F452}", stock:30 },
  { id:7, name:"Swim Short Blue", sku:"SS-0733", price:1150, cat:"Clothing", img:"\u{1FA73}", stock:20 },
  { id:8, name:"Sun Visor Black", sku:"SV-0098", price:350, cat:"Accessories", img:"\u{1F9E2}", stock:35 },
  { id:9, name:"Jelly Sandal Pink", sku:"JS-0441", price:590, cat:"Sandals", img:"\u{1FA74}", stock:50 },
  { id:10, name:"Beach Bag Stripe", sku:"BB-0219", price:780, cat:"Bags", img:"\u{1F45C}", stock:12 },
  { id:11, name:"Espadrille Cream", sku:"ES-0667", price:1490, cat:"Shoes", img:"\u{1F45F}", stock:6 },
  { id:12, name:"Sarong Tropical", sku:"SR-0334", price:520, cat:"Clothing", img:"\u{1F457}", stock:28 },
];
const CATS = ["All","Sandals","Flip Flops","Slides","Shoes","Bags","Clothing","Accessories"];

const Badge = ({children,color="brand",s}) => {
  const m={brand:[C.brandL,C.brandD],red:[C.redL,C.redD],amber:[C.amberL,C.amberD],green:[C.greenL,C.greenD],blue:[C.blueL,C.blueD],purple:[C.purpleL,C.purpleD],gray:["#F1EFE8","#5F5E5A"]};
  const [bg,fg]=m[color]||m.brand;
  return <span style={{display:"inline-block",padding:s?"2px 7px":"3px 10px",borderRadius:6,background:bg,color:fg,fontSize:s?10:11,fontWeight:500}}>{children}</span>;
};
const Pill = ({active,children,onClick}) => <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,fontSize:12,cursor:"pointer",border:`1px solid ${active?C.brand+"40":C.bdr}`,background:active?C.brandL:"transparent",color:active?C.brandD:C.t3,fontWeight:active?500:400,whiteSpace:"nowrap"}}>{children}</button>;
const Btn = ({children,primary,full,small,onClick,color}) => <button onClick={onClick} style={{padding:small?"8px 14px":"12px 20px",borderRadius:10,fontSize:small?12:13,fontWeight:500,cursor:"pointer",border:primary?"none":`1px solid ${C.bdr}`,background:primary?(color||C.brand):C.bg,color:primary?"#fff":C.t2,width:full?"100%":"auto"}}>{children}</button>;
const Card = ({children,style}) => <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.bdr}`,padding:"14px 16px",...style}}>{children}</div>;
const Row = ({children,style}) => <div style={{display:"flex",alignItems:"center",gap:12,...style}}>{children}</div>;
const Metric = ({label,value,color}) => <div style={{background:C.bg,borderRadius:10,padding:"12px 14px",flex:1}}><div style={{fontSize:10,color:C.t3,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>{label}</div><div style={{fontSize:20,fontWeight:600,color:color||C.t1}}>{value}</div></div>;
const Section = ({label,children}) => <div style={{marginBottom:16}}><div style={{fontSize:10,color:C.t3,textTransform:"uppercase",letterSpacing:0.6,marginBottom:8,fontWeight:500}}>{label}</div>{children}</div>;

const Phone = ({title,children}) => (
  <div style={{width:375,minHeight:700,background:C.bg,borderRadius:32,border:`1px solid ${C.bdr}`,overflow:"hidden",boxShadow:"0 2px 24px rgba(0,0,0,0.06)",flexShrink:0}}>
    <div style={{height:44,background:C.card,display:"flex",alignItems:"center",justifyContent:"center",borderBottom:`1px solid ${C.bdr}`}}><span style={{fontSize:12,color:C.t3,letterSpacing:0.5}}>{title}</span></div>
    <div style={{height:656,overflowY:"auto"}}>{children}</div>
  </div>
);
const Tablet = ({children}) => (
  <div style={{width:"100%",maxWidth:1024,height:680,background:C.bg,borderRadius:20,border:`1px solid ${C.bdr}`,overflow:"hidden",boxShadow:"0 2px 24px rgba(0,0,0,0.06)"}}>
    <div style={{height:36,background:C.card,display:"flex",alignItems:"center",justifyContent:"center",borderBottom:`1px solid ${C.bdr}`}}><span style={{fontSize:11,color:C.t3}}>Posterita Tablet</span></div>
    <div style={{height:644,overflowY:"auto"}}>{children}</div>
  </div>
);
const Browser = ({title,children}) => (
  <div style={{width:"100%",minHeight:520,background:C.card,borderRadius:12,border:`1px solid ${C.bdr}`,overflow:"hidden",boxShadow:"0 2px 20px rgba(0,0,0,0.06)"}}>
    <div style={{height:38,background:C.bg,display:"flex",alignItems:"center",padding:"0 14px",gap:8,borderBottom:`1px solid ${C.bdr}`}}>
      <div style={{display:"flex",gap:5}}>{["#F09595","#FAC775","#97C459"].map((c,i)=><div key={i} style={{width:9,height:9,borderRadius:"50%",background:c}}/>)}</div>
      <div style={{flex:1,display:"flex",justifyContent:"center"}}><div style={{background:C.card,borderRadius:5,padding:"3px 20px",fontSize:10,color:C.t3,border:`1px solid ${C.bdr}`}}>console.posterita.app/{title}</div></div>
    </div>{children}
  </div>
);
const Sidebar = ({active,onNav}) => {
  const items=[{k:"dashboard",l:"Dashboard"},{k:"devices",l:"Devices"},{k:"users",l:"Users & roles"},{k:"capabilities",l:"Capabilities"},{k:"stores",l:"Stores & terminals"},{k:"recon",l:"Reconciliations"},{k:"requests",l:"Requests"},{k:"staffops",l:"Staff ops"},{k:"approvals",l:"Approvals"},{k:"assets",l:"Assets"},{k:"loyalty",l:"Loyalty & consent"},{k:"audit",l:"Audit trail"},{k:"compliance",l:"Data compliance"},{k:"ai",l:"AI task center"}];
  return <div style={{width:180,background:"#FAFAF8",borderRight:`1px solid ${C.bdr}`,padding:"14px 0",flexShrink:0,overflowY:"auto"}}>
    <div style={{padding:"0 14px 14px",fontWeight:600,fontSize:13,color:C.brand}}>Posterita</div>
    {items.map(n=><div key={n.k} onClick={()=>onNav(n.k)} style={{padding:"7px 14px",fontSize:11,cursor:"pointer",color:active===n.k?C.brand:C.t2,background:active===n.k?C.brandL:"transparent",fontWeight:active===n.k?500:400,borderRight:active===n.k?`2px solid ${C.brand}`:"none"}}>{n.l}</div>)}
  </div>;
};

// ===== PRODUCT GRID =====
const ProductGrid = ({cat,setCat,cart,setCart,cols=3,compact}) => {
  const filtered = cat==="All"?PRODUCTS:PRODUCTS.filter(p=>p.cat===cat);
  const add = p => { const e=cart.find(c=>c.id===p.id); if(e) setCart(cart.map(c=>c.id===p.id?{...c,qty:c.qty+1}:c)); else setCart([...cart,{...p,qty:1}]); };
  return <div>
    <div style={{display:"flex",gap:6,overflowX:"auto",padding:"0 0 10px",flexWrap:compact?"wrap":"nowrap"}}>{CATS.map(c=><Pill key={c} active={cat===c} onClick={()=>setCat(c)}>{c}</Pill>)}</div>
    <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:compact?8:10}}>
      {filtered.map(p=><div key={p.id} onClick={()=>add(p)} style={{background:C.card,borderRadius:12,border:`1px solid ${C.bdr}`,padding:compact?"10px":"14px 12px",cursor:"pointer"}}>
        <div style={{fontSize:compact?28:36,textAlign:"center",marginBottom:compact?4:8,filter:"grayscale(0.2)"}}>{p.img}</div>
        <div style={{fontSize:compact?11:12,fontWeight:500,lineHeight:1.3,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
        <div style={{fontSize:10,color:C.t3,marginBottom:compact?2:4}}>{p.sku}</div>
        <Row style={{justifyContent:"space-between",gap:4}}><span style={{fontSize:compact?12:13,fontWeight:600,color:C.brand}}>Rs {p.price.toLocaleString()}</span><span style={{fontSize:9,color:C.t3}}>{p.stock} in stock</span></Row>
      </div>)}
    </div>
  </div>;
};

// ===== CART PANEL =====
const CartPanel = ({cart,setCart,compact}) => {
  const upd=(id,d)=>setCart(cart.map(c=>c.id===id?{...c,qty:Math.max(1,c.qty+d)}:c));
  const rm=id=>setCart(cart.filter(c=>c.id!==id));
  const sub=cart.reduce((s,c)=>s+c.price*c.qty,0);
  const vat=Math.round(sub*0.15);
  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    <div style={{flex:1,overflowY:"auto",padding:compact?"8px":"12px"}}>
      {cart.length===0?<div style={{textAlign:"center",padding:"40px 0",color:C.t3,fontSize:13}}>Scan or tap products</div>:(
        <><div style={{fontSize:10,color:C.t3,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,fontWeight:500}}>Cart - {cart.reduce((s,c)=>s+c.qty,0)} items</div>
        {cart.map(item=><div key={item.id} style={{background:C.bg,borderRadius:10,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:20}}>{item.img}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div><div style={{fontSize:10,color:C.t3}}>Rs {item.price.toLocaleString()} each</div></div>
          <div style={{display:"flex",alignItems:"center",gap:4,background:C.card,borderRadius:6,padding:"3px 6px",border:`1px solid ${C.bdr}`}}>
            <span onClick={()=>item.qty===1?rm(item.id):upd(item.id,-1)} style={{cursor:"pointer",fontSize:14,color:C.t2,width:18,textAlign:"center"}}>-</span>
            <span style={{fontSize:12,fontWeight:500,width:20,textAlign:"center"}}>{item.qty}</span>
            <span onClick={()=>upd(item.id,1)} style={{cursor:"pointer",fontSize:14,color:C.t2,width:18,textAlign:"center"}}>+</span>
          </div>
          <div style={{fontSize:13,fontWeight:600,minWidth:56,textAlign:"right"}}>Rs {(item.price*item.qty).toLocaleString()}</div>
        </div>)}
        <div style={{background:C.purpleL,borderRadius:10,padding:"10px 12px",marginTop:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{fontSize:11,fontWeight:500,color:C.purpleD}}>Loyalty - Marie L. - 420 pts</div><div style={{fontSize:10,color:C.purpleD,opacity:0.7}}>+{Math.round(sub/100)} pts this sale</div></div>
          <Badge color="purple" s>Applied</Badge>
        </div></>
      )}
    </div>
    {cart.length>0&&<div style={{borderTop:`1px solid ${C.bdr}`,padding:compact?"10px":"14px",background:C.card}}>
      <Row style={{justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:C.t3}}>Subtotal</span><span style={{fontSize:11,color:C.t3}}>Rs {sub.toLocaleString()}</span></Row>
      <Row style={{justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:C.t3}}>VAT 15%</span><span style={{fontSize:11,color:C.t3}}>Rs {vat.toLocaleString()}</span></Row>
      <Row style={{justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:16,fontWeight:600}}>Total</span><span style={{fontSize:16,fontWeight:600}}>Rs {(sub+vat).toLocaleString()}</span></Row>
      <div style={{display:"flex",gap:8}}><Btn full>Cash</Btn><Btn full primary>Card / Blink</Btn></div>
      <div style={{textAlign:"center",marginTop:8,fontSize:11,color:C.t3}}>Hold - Split - Refund</div>
    </div>}
  </div>;
};

// ===== PHONE SCREENS =====
const PhoneLogin = () => <Phone title="Posterita"><div style={{padding:"60px 24px",textAlign:"center"}}>
  <div style={{fontSize:28,fontWeight:700,color:C.brand,marginBottom:4}}>Posterita</div>
  <div style={{fontSize:12,color:C.t3,marginBottom:40}}>Funky Fish store operations</div>
  <div style={{textAlign:"left",marginBottom:20}}><div style={{fontSize:11,color:C.t2,marginBottom:6}}>Phone number</div><div style={{background:C.card,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.bdr}`,fontSize:13,color:C.t3}}>+230 5XXX XXXX</div></div>
  <div style={{textAlign:"left",marginBottom:24}}><div style={{fontSize:11,color:C.t2,marginBottom:6}}>PIN</div><div style={{display:"flex",gap:10,justifyContent:"center"}}>{[1,2,3,4].map(i=><div key={i} style={{width:44,height:44,borderRadius:10,border:`2px solid ${C.brand}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:600}}>&#9679;</div>)}</div></div>
  <Btn primary full>Sign in</Btn>
  <div style={{fontSize:11,color:C.t3,marginTop:16}}>Use biometric login</div>
  <div style={{marginTop:40,padding:16,background:C.bg,borderRadius:12}}><div style={{fontSize:11,color:C.t2,marginBottom:8}}>New device? Scan enrollment QR</div><div style={{width:80,height:80,borderRadius:8,border:`2px dashed ${C.bdr}`,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,opacity:0.3}}>QR</div></div>
</div></Phone>;

const PhoneHome = () => <Phone title="Home"><div style={{padding:"20px 16px"}}>
  <div style={{fontSize:18,fontWeight:600}}>Good morning, Sarah</div>
  <div style={{fontSize:12,color:C.t2,marginTop:3,marginBottom:16}}>Grand Baie - Cashier + Supervisor</div>
  <Card style={{background:C.brandL,border:"none",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
    <div style={{width:34,height:34,borderRadius:8,background:C.brand,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:600}}>3</div>
    <div><div style={{fontSize:12,fontWeight:500,color:C.brandD}}>Pending approvals</div><div style={{fontSize:10,color:C.brandD,opacity:0.7}}>2 leave - 1 expense</div></div>
  </Card>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
    {[{i:"\u25CE",l:"POS",s:"Point of sale",c:C.brand},{i:"\u2630",l:"Staff ops",s:"Daily tasks",c:C.blue},{i:"\u2713",l:"Supervisor",s:"Approvals",c:C.purple},{i:"\u25A6",l:"Inventory",s:"Stock & counts",c:C.amber}].map((t,idx)=>
      <Card key={idx} style={{padding:"18px 14px"}}><div style={{width:36,height:36,borderRadius:8,background:t.c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:t.c,marginBottom:10}}>{t.i}</div><div style={{fontSize:14,fontWeight:600}}>{t.l}</div><div style={{fontSize:10,color:C.t3,marginTop:2}}>{t.s}</div></Card>
    )}
  </div>
  <Card><Row style={{justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:11,fontWeight:500,color:C.t2}}>Today</span><Badge color="green" s>Synced</Badge></Row>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>{[["47","Orders"],["Rs 84k","Revenue"],["12","Loyalty"]].map(([v,l],i)=><div key={i}><div style={{fontSize:15,fontWeight:600}}>{v}</div><div style={{fontSize:9,color:C.t3}}>{l}</div></div>)}</div>
  </Card>
</div></Phone>;

const PhonePOS = ({cart,setCart}) => { const [cat,setCat]=useState("All"); return <Phone title="POS - Products"><div style={{padding:"10px 12px"}}>
  <Row style={{marginBottom:10,gap:8}}><div style={{flex:1,background:C.card,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t3,border:`1px solid ${C.bdr}`}}>Search or scan...</div><div style={{width:36,height:36,borderRadius:8,background:C.brand,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14}}>{"\u25A4"}</div></Row>
  <ProductGrid cat={cat} setCat={setCat} cart={cart} setCart={setCart} cols={3} compact/>
  {cart.length>0&&<div style={{position:"sticky",bottom:0,background:C.brand,borderRadius:12,padding:"12px 16px",marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",color:"#fff"}}>
    <span style={{fontSize:13,fontWeight:500}}>{cart.reduce((s,c)=>s+c.qty,0)} items - Rs {cart.reduce((s,c)=>s+c.price*c.qty,0).toLocaleString()}</span>
    <span style={{fontSize:12,fontWeight:600}}>View cart &rarr;</span>
  </div>}
</div></Phone>; };

const PhoneCart = ({cart,setCart}) => <Phone title="POS - Checkout"><CartPanel cart={cart} setCart={setCart} compact/></Phone>;

const PhoneRecon = () => <Phone title="Close till"><div style={{padding:"16px 14px"}}>
  <div style={{fontSize:15,fontWeight:600,marginBottom:2}}>Close till</div><div style={{fontSize:11,color:C.t2,marginBottom:16}}>Shift 08:00-16:30 - Sarah M.</div>
  <Section label="Step 1 - Expected"><Card style={{padding:0,overflow:"hidden"}}>
    {[["Cash sales","Rs 42,350"],["Card / Blink","Rs 67,810"],["Refunds","- Rs 1,290"]].map(([l,v],i)=><Row key={i} style={{justifyContent:"space-between",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}`}}><span style={{fontSize:12,color:C.t2}}>{l}</span><span style={{fontSize:12,fontWeight:500}}>{v}</span></Row>)}
    <Row style={{justifyContent:"space-between",padding:"10px 14px",background:C.brandL}}><span style={{fontSize:12,fontWeight:600,color:C.brandD}}>Expected cash</span><span style={{fontSize:12,fontWeight:600,color:C.brandD}}>Rs 43,350</span></Row>
  </Card></Section>
  <Section label="Step 2 - Count"><Card>{["Rs 2000","Rs 500","Rs 200","Rs 100","Coins"].map((d,i)=><Row key={i} style={{justifyContent:"space-between",padding:"7px 0",borderBottom:i<4?`1px solid ${C.bdr}`:"none"}}><span style={{fontSize:12,color:C.t2}}>{d}</span><div style={{width:70,background:C.bg,borderRadius:6,padding:"5px 8px",textAlign:"right",fontSize:12,border:`1px solid ${C.bdr}`}}>0</div></Row>)}</Card></Section>
  <Section label="Step 3 - Discrepancy"><div style={{background:C.amberL,borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:11,color:C.amberD}}>Complete count above</div></div></Section>
  <Section label="Step 4 - Evidence"><div style={{display:"flex",gap:8,marginBottom:12}}>{["Photo","Bank slip"].map((e,i)=><div key={i} style={{flex:1,background:C.card,borderRadius:10,border:`1.5px dashed ${C.bdr}`,padding:"16px 8px",textAlign:"center",fontSize:11,color:C.t3}}>{e}</div>)}</div><Btn primary full>Submit</Btn></Section>
</div></Phone>;

const PhoneStaff = () => <Phone title="Staff ops"><div style={{padding:"16px 14px"}}>
  <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Staff ops</div>
  <div style={{background:C.greenL,borderRadius:10,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:12,fontWeight:500,color:C.greenD}}>Checked in 08:02</div><div style={{fontSize:10,color:C.greenD,opacity:0.7}}>Grand Baie</div></div><Btn primary small color={C.green}>Check out</Btn></div>
  <Section label="Quick actions"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["Leave"],["Expense"],["Stationery"],["Maintenance"],["Bus fare"],["Emergency"]].map(([l],i)=><Card key={i} style={{padding:"12px 10px",cursor:"pointer"}}><span style={{fontSize:11,fontWeight:500}}>{l}</span></Card>)}</div></Section>
  <Section label="Tasks">{[["Restock sandals","12:00",true],["Clean fitting","14:00",false],["Accept delivery","16:00",true]].map(([t,d,u],i)=><Card key={i} style={{marginBottom:6,display:"flex",alignItems:"center",gap:10}}><div style={{width:18,height:18,borderRadius:5,border:`2px solid ${u?C.red:C.bdr}`}}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{t}</div><div style={{fontSize:10,color:C.t3}}>By {d}</div></div>{u&&<Badge color="red" s>Urgent</Badge>}</Card>)}</Section>
  <Section label="Requests">{[["Leave 22-24 Apr","Approved","green"],["Bus fare Rs 340","Pending","amber"]].map(([t,s,c],i)=><Card key={i} style={{marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12}}>{t}</span><Badge color={c} s>{s}</Badge></Card>)}</Section>
</div></Phone>;

const PhoneSup = () => <Phone title="Supervisor"><div style={{padding:"16px 14px"}}>
  <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Approvals</div>
  <div style={{display:"flex",gap:6,marginBottom:14}}>{[["Leave",2,"blue"],["Expense",1,"amber"],["Recon",1,"red"],["Tasks",3,"purple"]].map(([l,n,c],i)=><div key={i} style={{flex:1,background:C.bg,borderRadius:8,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:600}}>{n}</div><div style={{fontSize:9,color:C.t3}}>{l}</div></div>)}</div>
  {[{w:"Ravi P.",t:"Annual leave",d:"22-26 Apr",c:"blue"},{w:"Amina K.",t:"Expense",d:"Rs 2,400",c:"amber"},{w:"Jean-Luc",t:"Sick leave",d:"Today",c:"red"},{w:"Sarah M.",t:"Discrepancy",d:"-Rs 1,240",c:"red"}].map((r,i)=><Card key={i} style={{marginBottom:8}}>
    <Row style={{justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,fontWeight:500}}>{r.w}</span><Badge color={r.c} s>{r.t}</Badge></Row>
    <div style={{fontSize:11,color:C.t2,marginBottom:10}}>{r.d}</div>
    <Row style={{gap:6}}><Btn small primary>Approve</Btn><Btn small primary color={C.red}>Reject</Btn><Btn small>Note</Btn></Row>
  </Card>)}
  <Section label="Quick actions"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["Checklist"],["Create shift"],["Warning"],["Report"]].map(([l],i)=><Card key={i} style={{padding:"12px 10px",cursor:"pointer"}}><span style={{fontSize:11,fontWeight:500}}>{l}</span></Card>)}</div></Section>
</div></Phone>;

const PhoneInv = () => <Phone title="Inventory"><div style={{padding:"16px 14px"}}>
  <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Inventory</div>
  <Section label="Active count"><Card>
    <Row style={{justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,fontWeight:500}}>Monthly count Mar 2026</span><Badge color="amber" s>In progress</Badge></Row>
    <div style={{fontSize:11,color:C.t2,marginBottom:8}}>42 / 128 items</div>
    <div style={{height:4,background:C.bg,borderRadius:2}}><div style={{width:"33%",height:4,background:C.brand,borderRadius:2}}/></div>
  </Card></Section>
  <Section label="Actions"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["Scan barcode"],["Barcode request"],["Name item (photo)"],["New count"]].map(([l],i)=><Card key={i} style={{padding:"12px 10px",cursor:"pointer"}}><span style={{fontSize:11,fontWeight:500}}>{l}</span></Card>)}</div></Section>
  <Section label="Stock events">{[["Delivery #412","+48","green"],["Count adj sandals","-3","red"],["Transfer Port Louis","-12","amber"]].map(([t,v,c],i)=><Card key={i} style={{marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12}}>{t}</span><Badge color={c} s>{v}</Badge></Card>)}</Section>
</div></Phone>;

const PhoneSettings = () => <Phone title="Settings"><div style={{padding:"16px 14px"}}>
  <div style={{fontSize:15,fontWeight:600,marginBottom:14}}>Settings</div>
  <Card style={{marginBottom:10}}><Row style={{gap:12}}><div style={{width:40,height:40,borderRadius:20,background:C.brandL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500,fontSize:14,color:C.brandD}}>SM</div><div><div style={{fontSize:13,fontWeight:500}}>Sarah Martin</div><div style={{fontSize:11,color:C.t3}}>Cashier + Supervisor</div></div></Row></Card>
  <Section label="Device">{[["Device","POS-GB-01"],["Store","Grand Baie"],["Profile","POS Terminal"],["Version","2.4.1"],["Last sync","2m ago"]].map(([l,v],i)=><Row key={i} style={{justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.bdr}`}}><span style={{fontSize:12,color:C.t2}}>{l}</span><span style={{fontSize:12}}>{v}</span></Row>)}</Section>
  <Section label="Printer"><Card style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:12,fontWeight:500}}>Epson TM-T20III</div><div style={{fontSize:10,color:C.t3}}>Bluetooth</div></div><Badge color="green" s>Connected</Badge></Card></Section>
  <Section label="Sync"><Card><Row style={{justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:C.t2}}>Outbox</span><Badge color="green" s>0 pending</Badge></Row><Row style={{justifyContent:"space-between"}}><span style={{fontSize:11,color:C.t2}}>Last push</span><span style={{fontSize:11}}>5m ago</span></Row></Card></Section>
  <div style={{marginTop:16}}><Btn full>Sign out</Btn></div>
</div></Phone>;

// ===== TABLET =====
const TabletPOS = ({cart,setCart}) => { const [cat,setCat]=useState("All"); return <Tablet><div style={{display:"flex",height:644}}>
  <div style={{flex:1,borderRight:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column"}}>
    <div style={{padding:"12px 16px",background:C.card,borderBottom:`1px solid ${C.bdr}`,display:"flex",gap:8}}>
      <div style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t3,border:`1px solid ${C.bdr}`}}>Search or scan barcode...</div>
      <div style={{width:36,height:36,borderRadius:8,background:C.brand,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14}}>{"\u25A4"}</div>
      <div style={{width:36,height:36,borderRadius:8,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,border:`1px solid ${C.bdr}`,cursor:"pointer"}}>{"\u2302"}</div>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"10px 16px"}}><ProductGrid cat={cat} setCat={setCat} cart={cart} setCart={setCart} cols={4}/></div>
  </div>
  <div style={{width:340,display:"flex",flexDirection:"column",background:C.card}}>
    <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:600}}>Checkout</span><span style={{fontSize:11,color:C.t3}}>Till open - Sarah M.</span></div>
    <CartPanel cart={cart} setCart={setCart} compact/>
  </div>
</div></Tablet>; };

// ===== WEB SCREENS =====
const WDash = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <Row style={{justifyContent:"space-between",marginBottom:18}}><div><div style={{fontSize:16,fontWeight:600}}>Dashboard</div><div style={{fontSize:11,color:C.t2}}>All stores - Today</div></div></Row>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:20}}><Metric label="Sales" value="Rs 312k" color={C.brand}/><Metric label="Orders" value="183"/><Metric label="Approvals" value="7" color={C.amber}/><Metric label="Devices" value="14/16"/></div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
    <Card><div style={{fontSize:12,fontWeight:500,marginBottom:10}}>Reconciliation</div>{[["Grand Baie","-Rs 1,240","red"],["Port Louis","+Rs 350","amber"],["Curepipe","Rs 0","green"],["Flic en Flac","-Rs 80","amber"]].map(([s,d,c],i)=><Row key={i} style={{justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.bdr}`}}><span style={{fontSize:11}}>{s}</span><Badge color={c} s>{d}</Badge></Row>)}</Card>
    <Card><div style={{fontSize:12,fontWeight:500,marginBottom:10}}>Approvals</div>{[["Ravi P.","Leave 22-26 Apr"],["Amina K.","Expense Rs 2,400"],["Jean-Luc","Sick leave"]].map(([w,d],i)=><Row key={i} style={{justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.bdr}`}}><div><div style={{fontSize:11,fontWeight:500}}>{w}</div><div style={{fontSize:10,color:C.t3}}>{d}</div></div><Row style={{gap:4}}><div style={{padding:"3px 8px",borderRadius:5,background:C.greenL,color:C.greenD,fontSize:10,fontWeight:500,cursor:"pointer"}}>OK</div><div style={{padding:"3px 8px",borderRadius:5,background:C.redL,color:C.redD,fontSize:10,fontWeight:500,cursor:"pointer"}}>No</div></Row></Row>)}</Card>
  </div>
</div>;

const WDev = () => {const devs=[["POS-GB-01","Grand Baie","Sarah M.","POS","Online","84%","2m","green"],["POS-GB-02","Grand Baie","Ravi P.","POS","Online","61%","5m","green"],["SUP-PL-01","Port Louis","Amina K.","Sup","Online","92%","1m","green"],["POS-CP-01","Curepipe","Jean-Luc","POS","Stale","23%","47m","amber"],["POS-FF-01","Flic en Flac","Priya D.","POS","Online","71%","3m","green"],["POS-PL-02","Port Louis","\u2014","None","Offline","\u2014","3d","red"]];
return <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <Row style={{justifyContent:"space-between",marginBottom:16}}><div style={{fontSize:16,fontWeight:600}}>Devices</div><Btn primary small>+ Enroll</Btn></Row>
  <Card style={{padding:0,overflow:"hidden"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 70px 65px 50px 50px 60px",padding:"8px 14px",background:C.bg,fontSize:9,color:C.t3,textTransform:"uppercase",letterSpacing:0.5,borderBottom:`1px solid ${C.bdr}`}}>{["Device","Store","User","Profile","Status","Bat","Sync",""].map(h=><span key={h}>{h}</span>)}</div>
    {devs.map(([n,s,u,p,st,b,ls,c],i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 70px 65px 50px 50px 60px",padding:"8px 14px",fontSize:11,alignItems:"center",borderBottom:`1px solid ${C.bdr}`}}>
      <span style={{fontWeight:500}}>{n}</span><span style={{color:C.t2}}>{s}</span><span style={{color:C.t2}}>{u}</span><Badge color={p==="None"?"gray":"blue"} s>{p}</Badge><Badge color={c} s>{st}</Badge><span style={{color:C.t2,fontSize:10}}>{b}</span><span style={{color:C.t2,fontSize:10}}>{ls}</span><span style={{fontSize:10,color:C.red,cursor:"pointer"}}>Revoke</span>
    </div>)}
  </Card>
</div>};

const WUsers = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <Row style={{justifyContent:"space-between",marginBottom:16}}><div style={{fontSize:16,fontWeight:600}}>Users & roles</div><Btn primary small>+ Invite</Btn></Row>
  <Card style={{padding:0,overflow:"hidden"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 90px 70px 50px",padding:"8px 14px",background:C.bg,fontSize:9,color:C.t3,textTransform:"uppercase",borderBottom:`1px solid ${C.bdr}`}}>{["Name","Phone","Store","Role","Status",""].map(h=><span key={h}>{h}</span>)}</div>
    {[["Sarah Martin","+230 5842 1234","Grand Baie","Cashier+Sup","Active","green"],["Ravi Patel","+230 5921 5678","Grand Baie","Cashier","Active","green"],["Amina Khan","+230 5763 9012","Port Louis","Supervisor","Active","green"],["Jean-Luc M.","+230 5654 3456","Curepipe","Cashier","Active","green"],["Priya Dev","+230 5845 7890","Flic en Flac","Cashier","On leave","amber"]].map(([n,p,s,r,st,c],i)=>
      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 90px 70px 50px",padding:"8px 14px",fontSize:11,alignItems:"center",borderBottom:`1px solid ${C.bdr}`}}><span style={{fontWeight:500}}>{n}</span><span style={{color:C.t2}}>{p}</span><span style={{color:C.t2}}>{s}</span><Badge color="blue" s>{r}</Badge><Badge color={c} s>{st}</Badge><span style={{color:C.blue,fontSize:10,cursor:"pointer"}}>Edit</span></div>
    )}
  </Card>
</div>;

const WRecon = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <div style={{fontSize:16,fontWeight:600,marginBottom:16}}>Reconciliation</div>
  <Card style={{marginBottom:14}}>
    <Row style={{justifyContent:"space-between",marginBottom:14}}><div><div style={{fontSize:13,fontWeight:600}}>Grand Baie - Sarah M.</div><div style={{fontSize:11,color:C.t2}}>Today 16:32</div></div><Badge color="red">-Rs 1,240</Badge></Row>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}><Metric label="Expected" value="Rs 43,350"/><Metric label="Counted" value="Rs 42,110"/><div style={{background:C.redL,borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:10,color:C.redD,textTransform:"uppercase"}}>Discrepancy</div><div style={{fontSize:20,fontWeight:600,color:C.redD}}>-Rs 1,240</div></div></div>
    <div style={{fontSize:12,fontWeight:500,marginBottom:6}}>Note</div>
    <div style={{background:C.bg,borderRadius:8,padding:"8px 12px",fontSize:11,color:C.t2,marginBottom:12}}>"Customer paid Rs 1,200 cash, processed as card."</div>
    <Row style={{gap:6,marginBottom:14}}>{["Till photo","Bank slip"].map((e,i)=><div key={i} style={{background:C.bg,borderRadius:6,padding:"6px 12px",fontSize:10,color:C.blue,border:`1px solid ${C.bdr}`,cursor:"pointer"}}>{e}</div>)}</Row>
    <Row style={{borderTop:`1px solid ${C.bdr}`,paddingTop:12,gap:8}}><div style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 12px",fontSize:11,border:`1px solid ${C.bdr}`,color:C.t3}}>Accepted / Adjusted / HR...</div><Btn primary small>Resolve</Btn></Row>
  </Card>
</div>;

const WLoyalty = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <div style={{fontSize:16,fontWeight:600,marginBottom:16}}>Loyalty & consent</div>
  <Card style={{marginBottom:14}}><div style={{fontSize:12,fontWeight:500,marginBottom:10}}>Wallet lookup</div>
    <Row style={{gap:8,marginBottom:14}}><div style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 12px",fontSize:12,border:`1px solid ${C.bdr}`,color:C.t3}}>+230 5XXX XXXX</div><Btn primary small>Search</Btn></Row>
    <Card style={{background:C.purpleL,border:`1px solid ${C.purple}30`}}>
      <Row style={{justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:13,fontWeight:600,color:C.purpleD}}>Marie Laurent</div><div style={{fontSize:11,color:C.purpleD}}>+230 5842 9988</div></div><div style={{fontSize:22,fontWeight:600,color:C.purpleD}}>420 pts</div></Row>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[["Lifetime","2,840"],["Vouchers","2"],["Consent","Granted"]].map(([l,v],i)=><div key={i} style={{background:"rgba(255,255,255,0.5)",borderRadius:6,padding:"6px 8px"}}><div style={{fontSize:9,color:C.purpleD,opacity:0.7}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:C.purpleD}}>{v}</div></div>)}
      </div>
    </Card>
  </Card>
</div>;

const WAudit = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <div style={{fontSize:16,fontWeight:600,marginBottom:16}}>Audit trail</div>
  <Row style={{gap:6,marginBottom:14}}>{["All","Auth","Orders","Approvals","Devices","Loyalty"].map(f=><Badge key={f} color="gray">{f}</Badge>)}</Row>
  <Card style={{padding:0,overflow:"hidden"}}>
    <div style={{display:"grid",gridTemplateColumns:"130px 1fr 100px 100px 80px",padding:"8px 14px",background:C.bg,fontSize:9,color:C.t3,textTransform:"uppercase",borderBottom:`1px solid ${C.bdr}`}}>{["Time","Action","Actor","Target","Store"].map(h=><span key={h}>{h}</span>)}</div>
    {[["16:32","recon.submit","Sarah M.","RECON-847","Grand Baie"],["16:30","till.close","Sarah M.","TILL-294","Grand Baie"],["16:28","order.refund","Ravi P.","ORD-4821","Grand Baie"],["16:15","loyalty.award","System","Marie +30","Grand Baie"],["15:50","leave.approve","Amina K.","Ravi leave","Port Louis"],["14:20","product.create","Amina K.","PRD-992","Port Louis"]].map(([ts,act,a,t,s],i)=>
      <div key={i} style={{display:"grid",gridTemplateColumns:"130px 1fr 100px 100px 80px",padding:"7px 14px",fontSize:11,alignItems:"center",borderBottom:`1px solid ${C.bdr}`}}><span style={{color:C.t3,fontFamily:"monospace",fontSize:10}}>{ts}</span><span style={{fontWeight:500}}>{act}</span><span style={{color:C.t2}}>{a}</span><span style={{color:C.t2}}>{t}</span><span style={{color:C.t2}}>{s}</span></div>
    )}
  </Card>
</div>;

const WAI = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <div style={{fontSize:16,fontWeight:600,marginBottom:16}}>AI task center</div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}><Metric label="Active" value="3" color={C.blue}/><Metric label="Awaiting" value="1" color={C.amber}/><Metric label="Done today" value="12" color={C.green}/></div>
  <Section label="Pending approval"><Card style={{marginBottom:10}}>
    <Row style={{justifyContent:"space-between",marginBottom:8}}><div><div style={{fontSize:12,fontWeight:500}}>Mass WhatsApp - loyalty promo</div><div style={{fontSize:10,color:C.t3}}>Manus - 2,400 recipients</div></div><Badge color="amber">Needs approval</Badge></Row>
    <Row style={{gap:6}}><Btn primary small>Approve</Btn><Btn small>Review</Btn><Btn small primary color={C.red}>Reject</Btn></Row>
  </Card></Section>
  <Section label="Recent">{[["Summarized discrepancies","Auto","green","12m"],["Created 3 tasks","Auto","green","45m"],["Payroll draft","Queued","blue","1h"],["Flagged refund pattern","Auto","amber","2h"]].map(([t,s,c,d],i)=><Card key={i} style={{marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:11,fontWeight:500}}>{t}</div><div style={{fontSize:10,color:C.t3}}>{d} ago</div></div><Badge color={c} s>{s}</Badge></Card>)}</Section>
</div>;

const WStores = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <Row style={{justifyContent:"space-between",marginBottom:16}}><div style={{fontSize:16,fontWeight:600}}>Stores & terminals</div><Btn primary small>+ Add store</Btn></Row>
  {[{n:"Grand Baie",t:3,p:2,s:4,ok:true},{n:"Port Louis",t:2,p:2,s:3,ok:true},{n:"Curepipe",t:2,p:1,s:2,ok:false},{n:"Flic en Flac",t:1,p:1,s:2,ok:true}].map((st,i)=><Card key={i} style={{marginBottom:10}}>
    <Row style={{justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:13,fontWeight:600}}>{st.n}</div><Badge color={st.ok?"green":"amber"} s>{st.ok?"Normal":"1 stale"}</Badge></Row>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}><div style={{fontSize:11,color:C.t2}}>Terminals: <strong>{st.t}</strong></div><div style={{fontSize:11,color:C.t2}}>Printers: <strong>{st.p}</strong></div><div style={{fontSize:11,color:C.t2}}>Staff: <strong>{st.s}</strong></div><span style={{fontSize:10,color:C.blue,cursor:"pointer"}}>Manage</span></div>
  </Card>)}
</div>;

const WCaps = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <Row style={{justifyContent:"space-between",marginBottom:16}}><div style={{fontSize:16,fontWeight:600}}>Capabilities</div><Btn primary small>+ Create</Btn></Row>
  {[{n:"POS Cashier",m:["POS","Loyalty","Recon"],u:6},{n:"Supervisor",m:["POS","Loyalty","Recon","Staff","Supervisor","Inventory"],u:3},{n:"Inventory",m:["Inventory","Staff"],u:2}].map((p,i)=><Card key={i} style={{marginBottom:10}}>
    <Row style={{justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:13,fontWeight:600}}>{p.n}</div><span style={{fontSize:10,color:C.blue,cursor:"pointer"}}>Edit</span></Row>
    <Row style={{gap:4,marginBottom:8,flexWrap:"wrap"}}>{p.m.map(m=><Badge key={m} color="brand" s>{m}</Badge>)}</Row>
    <div style={{fontSize:11,color:C.t2}}>{p.u} users assigned</div>
  </Card>)}
</div>;

const WAssets = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <Row style={{justifyContent:"space-between",marginBottom:16}}><div style={{fontSize:16,fontWeight:600}}>Assets & maintenance</div><Btn primary small>+ Register</Btn></Row>
  <Section label="Open tickets">{[["AC unit Grand Baie","Sarah M. - photo","red","High"],["Shelf #3 Port Louis","Broken bracket","amber","Medium"]].map(([t,d,c,p],i)=><Card key={i} style={{marginBottom:8,display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:12,fontWeight:500}}>{t}</div><div style={{fontSize:10,color:C.t2}}>{d}</div></div><Badge color={c} s>{p}</Badge></Card>)}</Section>
  <Section label="Acceptances">{[["Scanner #12","Jean-Luc - signed"],["Cash drawer #8","Priya - signed"]].map(([t,d],i)=><Card key={i} style={{marginBottom:8,display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:12,fontWeight:500}}>{t}</div><div style={{fontSize:10,color:C.t2}}>{d}</div></div><Badge color="green" s>Accepted</Badge></Card>)}</Section>
</div>;

const WRequests = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <div style={{fontSize:16,fontWeight:600,marginBottom:16}}>Requests</div>
  <Row style={{gap:6,marginBottom:14}}>{["All","Stationery","Pickup","Customer item"].map(f=><Badge key={f} color="gray">{f}</Badge>)}</Row>
  {[["Stationery - receipt paper","Sarah M. Grand Baie","Pending","amber"],["Pickup - return box","Ravi P. Grand Baie","Scheduled","blue"],["Customer item - special sandal","Amina K. Port Louis","Processing","purple"],["Stationery - tags, bags","Jean-Luc Curepipe","Delivered","green"]].map(([t,d,s,c],i)=><Card key={i} style={{marginBottom:8,display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:12,fontWeight:500}}>{t}</div><div style={{fontSize:10,color:C.t2}}>{d}</div></div><Badge color={c} s>{s}</Badge></Card>)}
</div>;

const WComp = () => <div style={{flex:1,padding:"18px 22px",overflowY:"auto"}}>
  <div style={{fontSize:16,fontWeight:600,marginBottom:4}}>Data compliance</div>
  <div style={{fontSize:11,color:C.t2,marginBottom:16}}>Mauritius DPA 2017</div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}><Metric label="Consents" value="2,847" color={C.green}/><Metric label="Deletions" value="0"/><Metric label="Opt-outs" value="3" color={C.amber}/></div>
  <Section label="Deletion requests"><Card><div style={{fontSize:12,color:C.t3,textAlign:"center",padding:"20px 0"}}>None pending</div></Card></Section>
  <Section label="Consent audit"><Row style={{gap:8}}><div style={{flex:1,background:C.bg,borderRadius:8,padding:"8px 12px",fontSize:12,border:`1px solid ${C.bdr}`,color:C.t3}}>Phone number...</div><Btn primary small>Audit</Btn></Row></Section>
</div>;

// ===== MAIN =====
export default function App() {
  const [view,setView]=useState("phone");
  const [ps,setPs]=useState("home");
  const [ws,setWs]=useState("dashboard");
  const [cart,setCart]=useState([{...PRODUCTS[0],qty:1},{...PRODUCTS[1],qty:2}]);
  const phoneMap = {login:<PhoneLogin/>,home:<PhoneHome/>,products:<PhonePOS cart={cart} setCart={setCart}/>,cart:<PhoneCart cart={cart} setCart={setCart}/>,recon:<PhoneRecon/>,staffops:<PhoneStaff/>,supervisor:<PhoneSup/>,inventory:<PhoneInv/>,settings:<PhoneSettings/>};
  const webMap = {dashboard:<WDash/>,devices:<WDev/>,users:<WUsers/>,capabilities:<WCaps/>,stores:<WStores/>,recon:<WRecon/>,requests:<WRequests/>,staffops:<WDash/>,approvals:<WDash/>,assets:<WAssets/>,loyalty:<WLoyalty/>,audit:<WAudit/>,compliance:<WComp/>,ai:<WAI/>};
  return <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",WebkitFontSmoothing:"antialiased"}}>
    <div style={{display:"flex",gap:6,marginBottom:16}}>{[["phone","Phone"],["tablet","Tablet landscape"],["web","Web console"]].map(([k,l])=>
      <button key={k} onClick={()=>setView(k)} style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",background:view===k?C.brand:C.bg,color:view===k?"#fff":C.t2,border:`1px solid ${view===k?C.brand:C.bdr}`}}>{l}</button>
    )}</div>
    {view==="phone"&&<><div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}}>{[["login","Login"],["home","Home"],["products","Products"],["cart","Checkout"],["recon","Close till"],["staffops","Staff ops"],["supervisor","Supervisor"],["inventory","Inventory"],["settings","Settings"]].map(([k,l])=><Pill key={k} active={ps===k} onClick={()=>setPs(k)}>{l}</Pill>)}</div><div style={{display:"flex",justifyContent:"center"}}>{phoneMap[ps]}</div></>}
    {view==="tablet"&&<TabletPOS cart={cart} setCart={setCart}/>}
    {view==="web"&&<Browser title={ws}><div style={{display:"flex",minHeight:480}}><Sidebar active={ws} onNav={setWs}/>{webMap[ws]}</div></Browser>}
  </div>;
}
