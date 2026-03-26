import express from "express";
import healthRoutes from "./routes/health";
import whatsappRoutes from "./routes/whatsapp";
import monitorRoutes from "./routes/monitor";
import mraRoutes from "./routes/mra";
import { startCronJobs } from "./cron";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

// Middleware
app.use(express.json());

// CORS — allow Vercel web console to call this backend
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Routes
app.use(healthRoutes);
app.use(whatsappRoutes);
app.use(monitorRoutes);
app.use(mraRoutes);

// Root
app.get("/", (_req, res) => {
  res.json({
    service: "posterita-backend",
    docs: "https://web.posterita.com/platform",
    endpoints: [
      "GET  /health",
      "GET  /webhook/whatsapp (Meta verification)",
      "POST /webhook/whatsapp (incoming messages)",
      "GET  /monitor/errors",
      "GET  /monitor/sync",
      "GET  /monitor/accounts",
    ],
  });
});

// Start
app.listen(PORT, () => {
  console.log(`[posterita-backend] Running on port ${PORT}`);
  console.log(`[posterita-backend] Environment: ${process.env.NODE_ENV || "development"}`);

  // Start background cron jobs
  startCronJobs();
});
