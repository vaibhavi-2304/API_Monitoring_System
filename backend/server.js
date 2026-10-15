require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const checkRoutes = require("./routes/checks");
const monitorRoutes = require("./routes/monitors");
const startMonitorScheduler = require("./services/monitorScheduler");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API Monitoring Dashboard backend is running" });
});

app.use("/api/checks", checkRoutes);
app.use("/api/monitors", monitorRoutes);
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API route not found" });
  }
  res.status(404).send("Page not found");
});

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing. Copy .env.example to .env and configure it.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Dashboard available at http://localhost:${PORT}`);
      startMonitorScheduler();
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
