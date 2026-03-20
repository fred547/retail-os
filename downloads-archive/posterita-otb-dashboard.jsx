import { useState } from "react";

const COLORS = {
  bg: "#F5F2EA",
  paper: "#FFFFFF",
  ink: "#141414",
  muted: "#6C6F76",
  line: "#E6E2DA",
  blue: "#1976D2",
  blueLight: "#DCEBFF",
  blueDark: "#0D5DB3",
  red: "#E53935",
  redLight: "#FFF1F0",
  green: "#2E7D32",
  greenLight: "#E8F5E9",
  amber: "#F57F17",
  amberLight: "#FFF8E1",
  purple: "#5E35B1",
  purpleLight: "#EDE7F6",
};

const font = `"Avenir Next", "SF Pro Display", "Segoe UI", system-ui, sans-serif`;

// Mock data
const stockCoverData = {
  stores: [
    { name: "Grand Baie", sandals: 4.2, accessories: 1.8, apparel: 5.1, overall: 3.7 },
    { name: "Port Louis", sandals: 2.1, accessories: 3.4, apparel: 7.8, overall: 4.4 },
    { name: "Flic en Flac", sandals: 0.8, accessories: 2.9, apparel: 4.2, overall: 2.6 },
    { name: "Curepipe", sandals: 5.5, accessories: 6.2, apparel: 3.1, overall: 4.9 },
  ],
  warehouse: { sandals: 8.2, accessories: 4.1, apparel: 6.0, overall: 6.1 },
  warehouseCapacity: { sandals: 2.4, accessories: 1.8, apparel: 2.1 },
};

const otbData = {
  planName: "Jul–Dec 2026",
  categories: [
    { name: "Sandals", budget: 2000000, committed: 1350000, actual: 820000, months: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], monthlyBudget: [400, 350, 300, 350, 300, 300], monthlyCommitted: [380, 340, 280, 200, 100, 50], monthlyActual: [395, 325, 100, 0, 0, 0] },
    { name: "Accessories", budget: 800000, committed: 420000, actual: 310000, months: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], monthlyBudget: [150, 130, 120, 140, 130, 130], monthlyCommitted: [145, 125, 100, 50, 0, 0], monthlyActual: [148, 120, 42, 0, 0, 0] },
    { name: "Apparel", budget: 1200000, committed: 750000, actual: 480000, months: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], monthlyBudget: [250, 200, 180, 200, 190, 180], monthlyCommitted: [240, 195, 170, 100, 45, 0], monthlyActual: [245, 190, 45, 0, 0, 0] },
  ],
};

const pipelineData = [
  { poRef: "PO-2026-018", vendor: "Shenzhen Star Electronics", category: "Sandals", units: 500, cost: 150000, status: "confirmed", eta: "Apr 12", monthIdx: 1, progress: 0.7 },
  { poRef: "PO-2026-022", vendor: "Mumbai Sole Traders", category: "Accessories", units: 300, cost: 65000, status: "in_transit", eta: "Apr 28", monthIdx: 1.5, progress: 0.85 },
  { poRef: "PO-2026-025", vendor: "Guangzhou Happy Footwear", category: "Sandals", units: 800, cost: 280000, status: "production", eta: "Jun 3", monthIdx: 3, progress: 0.35 },
  { poRef: "PO-2026-028", vendor: "Jakarta Craft Co", category: "Apparel", units: 450, cost: 190000, status: "confirmed", eta: "May 15", monthIdx: 2.5, progress: 0.5 },
  { poRef: "PO-2026-031", vendor: "Shenzhen Star Electronics", category: "Sandals", units: 600, cost: 180000, status: "draft", eta: "Jul 20", monthIdx: 4.5, progress: 0.1 },
];

const projectedStock = [
  { month: "Mar", units: 1400, cover: 3.5 },
  { month: "Apr", units: 1900, cover: 4.8 },
  { month: "May", units: 1500, cover: 3.8 },
  { month: "Jun", units: 2300, cover: 5.8 },
  { month: "Jul", units: 1900, cover: 4.8 },
  { month: "Aug", units: 1500, cover: 3.8 },
];

function getCoverStatus(val, min = 3, max = 6) {
  if (val < 2) return { label: "CRITICAL", color: COLORS.red, bg: COLORS.redLight, icon: "●" };
  if (val < min) return { label: "LOW", color: COLORS.amber, bg: COLORS.amberLight, icon: "▲" };
  if (val > max) return { label: "OVER", color: COLORS.purple, bg: COLORS.purpleLight, icon: "■" };
  return { label: "OK", color: COLORS.green, bg: COLORS.greenLight, icon: "✓" };
}

function CoverCell({ value }) {
  const s = getCoverStatus(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: font, fontWeight: 700, fontSize: 14, color: COLORS.ink }}>{value.toFixed(1)}</span>
      <span style={{ fontSize: 10, fontWeight: 800, fontFamily: font, color: s.color, background: s.bg, padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5 }}>{s.icon}</span>
    </div>
  );
}

function TabButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: font, fontSize: 13, fontWeight: active ? 800 : 600,
        color: active ? "#fff" : COLORS.ink,
        background: active ? COLORS.blue : "transparent",
        border: active ? "none" : `1.5px solid ${COLORS.line}`,
        borderRadius: 8, padding: "8px 18px", cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {label}
    </button>
  );
}

function StockCoverView() {
  const categories = ["sandals", "accessories", "apparel", "overall"];
  const labels = ["Sandals", "Accessories", "Apparel", "Overall"];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: COLORS.muted }}>Target range:</span>
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: COLORS.blue, background: COLORS.blueLight, padding: "3px 10px", borderRadius: 6 }}>3 – 6 months</span>
        <span style={{ fontFamily: font, fontSize: 11, color: COLORS.muted, marginLeft: "auto" }}>Based on 3-month rolling sales average</span>
      </div>

      {/* Heatmap table */}
      <div style={{ background: COLORS.paper, borderRadius: 12, border: `1px solid ${COLORS.line}`, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px repeat(4, 1fr)", borderBottom: `1px solid ${COLORS.line}`, background: "#FAFAF7" }}>
          <div style={{ padding: "10px 16px", fontFamily: font, fontWeight: 800, fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>Store</div>
          {labels.map(l => (
            <div key={l} style={{ padding: "10px 16px", fontFamily: font, fontWeight: 800, fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
          ))}
        </div>
        {stockCoverData.stores.map((store, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "140px repeat(4, 1fr)", borderBottom: `1px solid ${COLORS.line}`, alignItems: "center" }}>
            <div style={{ padding: "12px 16px", fontFamily: font, fontWeight: 700, fontSize: 14, color: COLORS.ink }}>{store.name}</div>
            {categories.map(c => (
              <div key={c} style={{ padding: "12px 16px" }}>
                <CoverCell value={store[c]} />
              </div>
            ))}
          </div>
        ))}
        {/* Warehouse row */}
        <div style={{ display: "grid", gridTemplateColumns: "140px repeat(4, 1fr)", background: COLORS.blueLight + "44", alignItems: "center" }}>
          <div style={{ padding: "12px 16px", fontFamily: font, fontWeight: 800, fontSize: 14, color: COLORS.blueDark }}>WAREHOUSE</div>
          {categories.map(c => (
            <div key={c} style={{ padding: "12px 16px" }}>
              <CoverCell value={stockCoverData.warehouse[c]} />
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { icon: "●", label: "Critical (<2mo)", color: COLORS.red, bg: COLORS.redLight },
          { icon: "▲", label: "Low (<3mo)", color: COLORS.amber, bg: COLORS.amberLight },
          { icon: "✓", label: "Healthy (3–6mo)", color: COLORS.green, bg: COLORS.greenLight },
          { icon: "■", label: "Overstock (>6mo)", color: COLORS.purple, bg: COLORS.purpleLight },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, fontFamily: font, color: l.color, background: l.bg, padding: "2px 6px", borderRadius: 4 }}>{l.icon}</span>
            <span style={{ fontFamily: font, fontSize: 12, color: COLORS.muted }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Warehouse distribution capacity */}
      <div style={{ marginTop: 20, background: COLORS.paper, borderRadius: 12, border: `1px solid ${COLORS.line}`, padding: 20 }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14, color: COLORS.ink, marginBottom: 12 }}>Warehouse Distribution Capacity</div>
        <div style={{ fontFamily: font, fontSize: 13, color: COLORS.muted, marginBottom: 14 }}>Based on combined store sales velocity — how long warehouse stock can supply all stores:</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {Object.entries(stockCoverData.warehouseCapacity).map(([cat, months]) => {
            const s = getCoverStatus(months);
            return (
              <div key={cat} style={{ flex: "1 1 120px", background: s.bg, borderRadius: 10, padding: 14, textAlign: "center" }}>
                <div style={{ fontFamily: font, fontWeight: 800, fontSize: 22, color: s.color }}>{months.toFixed(1)}<span style={{ fontSize: 12, fontWeight: 600 }}> mo</span></div>
                <div style={{ fontFamily: font, fontWeight: 700, fontSize: 12, color: COLORS.ink, textTransform: "capitalize", marginTop: 4 }}>{cat}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OTBPlanView() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: COLORS.ink }}>{otbData.planName}</span>
        <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: COLORS.green, background: COLORS.greenLight, padding: "3px 8px", borderRadius: 6 }}>ACTIVE</span>
        <span style={{ fontFamily: font, fontSize: 12, color: COLORS.muted, marginLeft: "auto" }}>Currency: MUR (×1,000)</span>
      </div>

      {otbData.categories.map((cat, ci) => {
        const remaining = cat.budget - cat.committed;
        const pctUsed = (cat.committed / cat.budget) * 100;
        const barColor = pctUsed > 90 ? COLORS.red : pctUsed > 75 ? COLORS.amber : COLORS.blue;
        return (
          <div key={ci} style={{ background: COLORS.paper, borderRadius: 12, border: `1px solid ${COLORS.line}`, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontFamily: font, fontWeight: 800, fontSize: 16, color: COLORS.ink }}>{cat.name}</span>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: font, fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>BUDGET</div>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: COLORS.ink }}>Rs {(cat.budget / 1000).toFixed(0)}K</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: font, fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>COMMITTED</div>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: barColor }}>Rs {(cat.committed / 1000).toFixed(0)}K</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: font, fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>REMAINING OTB</div>
                  <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: COLORS.green }}>Rs {(remaining / 1000).toFixed(0)}K</div>
                </div>
              </div>
            </div>

            {/* Budget bar */}
            <div style={{ height: 8, borderRadius: 4, background: COLORS.line, marginBottom: 14, position: "relative", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, background: COLORS.muted + "55", width: `${(cat.actual / cat.budget) * 100}%`, position: "absolute" }} />
              <div style={{ height: "100%", borderRadius: 4, background: barColor, width: `${pctUsed}%`, position: "absolute", opacity: 0.35 }} />
              <div style={{ height: "100%", borderRadius: 4, background: barColor, width: `${(cat.actual / cat.budget) * 100}%`, position: "absolute" }} />
            </div>

            {/* Monthly breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
              {cat.months.map((m, mi) => {
                const b = cat.monthlyBudget[mi];
                const c = cat.monthlyCommitted[mi];
                const a = cat.monthlyActual[mi];
                const fill = b > 0 ? (c / b) * 100 : 0;
                const isPast = mi < 3;
                return (
                  <div key={mi} style={{ background: isPast ? "#FAFAF7" : COLORS.paper, borderRadius: 8, padding: "8px 6px", textAlign: "center", border: `1px solid ${COLORS.line}` }}>
                    <div style={{ fontFamily: font, fontWeight: 800, fontSize: 11, color: isPast ? COLORS.muted : COLORS.ink, marginBottom: 4 }}>{m}</div>
                    <div style={{ height: 32, background: COLORS.line, borderRadius: 4, position: "relative", overflow: "hidden", marginBottom: 4 }}>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${fill}%`, background: fill > 95 ? COLORS.amber : COLORS.blue, borderRadius: 4, opacity: 0.7, transition: "height 0.5s" }} />
                    </div>
                    <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: COLORS.muted }}>
                      {c}K / {b}K
                    </div>
                    {a > 0 && (
                      <div style={{ fontFamily: font, fontSize: 9, fontWeight: 600, color: COLORS.green, marginTop: 2 }}>
                        actual: {a}K
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineView() {
  const [selectedCat, setSelectedCat] = useState("All");
  const filteredPipeline = selectedCat === "All" ? pipelineData : pipelineData.filter(p => p.category === selectedCat);
  const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const statusColors = {
    draft: { color: COLORS.muted, bg: "#F0F0EE", label: "Draft" },
    confirmed: { color: COLORS.blue, bg: COLORS.blueLight, label: "Confirmed" },
    production: { color: COLORS.amber, bg: COLORS.amberLight, label: "In Production" },
    in_transit: { color: COLORS.green, bg: COLORS.greenLight, label: "In Transit" },
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["All", "Sandals", "Accessories", "Apparel"].map(c => (
          <button
            key={c}
            onClick={() => setSelectedCat(c)}
            style={{
              fontFamily: font, fontSize: 12, fontWeight: selectedCat === c ? 800 : 600,
              color: selectedCat === c ? "#fff" : COLORS.ink,
              background: selectedCat === c ? COLORS.blue : "transparent",
              border: selectedCat === c ? "none" : `1.5px solid ${COLORS.line}`,
              borderRadius: 8, padding: "6px 14px", cursor: "pointer",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Timeline header */}
      <div style={{ background: COLORS.paper, borderRadius: 12, border: `1px solid ${COLORS.line}`, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", padding: "0 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", borderBottom: `1px solid ${COLORS.line}`, paddingTop: 10, paddingBottom: 10 }}>
            {months.map((m, i) => (
              <div key={m} style={{ fontFamily: font, fontWeight: 800, fontSize: 12, color: i === 0 ? COLORS.blue : COLORS.muted, textAlign: "center", textTransform: "uppercase", letterSpacing: 1 }}>
                {m}{i === 0 && " ←NOW"}
              </div>
            ))}
          </div>
        </div>

        {/* PO cards on timeline */}
        {filteredPipeline.map((po, i) => {
          const sc = statusColors[po.status];
          const leftPct = (po.monthIdx / 5.5) * 100;
          return (
            <div key={i} style={{ position: "relative", padding: "8px 16px", borderBottom: `1px solid ${COLORS.line}` }}>
              {/* Timeline track */}
              <div style={{ position: "absolute", top: 0, bottom: 0, left: 16, right: 16 }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: COLORS.line }} />
                {/* ETA marker */}
                <div style={{ position: "absolute", top: "50%", transform: "translate(-50%, -50%)", left: `${leftPct}%`, width: 10, height: 10, borderRadius: "50%", background: sc.color, border: `2px solid ${COLORS.paper}`, boxShadow: `0 0 0 2px ${sc.color}44`, zIndex: 2 }} />
              </div>

              {/* PO card */}
              <div style={{
                position: "relative", zIndex: 3,
                marginLeft: `${Math.max(leftPct - 12, 0)}%`,
                display: "inline-block",
                background: `${sc.bg}`,
                borderRadius: 10,
                padding: "10px 14px",
                border: `1.5px solid ${sc.color}33`,
                maxWidth: 220,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: font, fontWeight: 800, fontSize: 13, color: COLORS.ink }}>{po.poRef}</span>
                  <span style={{ fontFamily: font, fontWeight: 700, fontSize: 10, color: sc.color, background: sc.color + "18", padding: "1px 6px", borderRadius: 4 }}>{sc.label}</span>
                </div>
                <div style={{ fontFamily: font, fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>{po.vendor}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: COLORS.ink }}>{po.units} units</span>
                  <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: COLORS.blue }}>Rs {(po.cost / 1000).toFixed(0)}K</span>
                  <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: sc.color }}>ETA {po.eta}</span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 3, borderRadius: 2, background: COLORS.line, marginTop: 8 }}>
                  <div style={{ height: "100%", borderRadius: 2, background: sc.color, width: `${po.progress * 100}%`, transition: "width 0.5s" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Projected stock chart (simplified bar representation) */}
      <div style={{ marginTop: 20, background: COLORS.paper, borderRadius: 12, border: `1px solid ${COLORS.line}`, padding: 20 }}>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: 14, color: COLORS.ink, marginBottom: 4 }}>
          Projected Stock — {selectedCat === "All" ? "All Categories" : selectedCat}
        </div>
        <div style={{ fontFamily: font, fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>
          Forecasted stock level accounting for sales velocity and incoming POs
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
          {projectedStock.map((m, i) => {
            const maxUnits = 2500;
            const h = (m.units / maxUnits) * 100;
            const cs = getCoverStatus(m.cover);
            return (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: cs.color, marginBottom: 4 }}>{m.cover.toFixed(1)}mo</div>
                <div style={{
                  height: `${h}%`,
                  background: `linear-gradient(180deg, ${cs.color}44 0%, ${cs.color}22 100%)`,
                  borderRadius: "6px 6px 0 0",
                  border: `1.5px solid ${cs.color}66`,
                  borderBottom: "none",
                  position: "relative",
                  minHeight: 20,
                  transition: "height 0.5s",
                }}>
                  <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, fontFamily: font, fontSize: 10, fontWeight: 700, color: cs.color }}>{m.units}</div>
                </div>
                <div style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: i === 0 ? COLORS.blue : COLORS.muted, marginTop: 6, borderTop: `2px solid ${COLORS.line}`, paddingTop: 4 }}>{m.month}</div>
              </div>
            );
          })}
        </div>
        {/* Target zone indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "center" }}>
          <div style={{ width: 24, height: 3, background: COLORS.green, borderRadius: 2 }} />
          <span style={{ fontFamily: font, fontSize: 11, color: COLORS.muted }}>Target zone: 3–6 months</span>
          <div style={{ width: 24, height: 3, background: COLORS.amber, borderRadius: 2, marginLeft: 12 }} />
          <span style={{ fontFamily: font, fontSize: 11, color: COLORS.muted }}>Below target</span>
        </div>
      </div>
    </div>
  );
}

export default function OTBDashboard() {
  const [activeTab, setActiveTab] = useState("cover");

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", padding: "20px 24px", fontFamily: font }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 22, color: COLORS.ink, letterSpacing: -0.5 }}>Merchandise Planning</div>
          <div style={{ fontFamily: font, fontSize: 13, color: COLORS.muted, fontWeight: 600, marginTop: 2 }}>OTB & Stock Cover — Funky Fish · All Stores</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: COLORS.muted }}>March 2026</div>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green }} />
          <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: COLORS.green }}>Live</span>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total OTB Budget", value: "Rs 4.0M", sub: "Jul–Dec 2026", color: COLORS.blue },
          { label: "Committed", value: "Rs 2.5M", sub: "63% utilized", color: COLORS.amber },
          { label: "Remaining OTB", value: "Rs 1.5M", sub: "Available to buy", color: COLORS.green },
          { label: "Avg Stock Cover", value: "3.9 mo", sub: "Target: 3–6mo", color: COLORS.green },
        ].map((card, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(14px)",
            borderRadius: 12,
            border: `1px solid ${COLORS.line}`,
            padding: 16,
          }}>
            <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{card.label}</div>
            <div style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: card.color, marginTop: 4 }}>{card.value}</div>
            <div style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: COLORS.muted, marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <TabButton active={activeTab === "cover"} label="Stock Cover" onClick={() => setActiveTab("cover")} />
        <TabButton active={activeTab === "otb"} label="OTB Plan" onClick={() => setActiveTab("otb")} />
        <TabButton active={activeTab === "pipeline"} label="Goods Pipeline" onClick={() => setActiveTab("pipeline")} />
      </div>

      {/* Tab content */}
      {activeTab === "cover" && <StockCoverView />}
      {activeTab === "otb" && <OTBPlanView />}
      {activeTab === "pipeline" && <PipelineView />}
    </div>
  );
}
