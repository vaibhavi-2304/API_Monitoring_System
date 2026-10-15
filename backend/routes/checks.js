const express = require("express");
const Check = require("../models/Check");
const Monitor = require("../models/Monitor");
const checkApi = require("../services/checkApi");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const result = await checkApi(req.body?.url, "manual", { validateJson: req.body?.validateJson === true });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const status = /URL|hostname|private|HTTP|credentials|characters|resolve/i.test(error.message) ? 400 : 500;
    res.status(status).json({ message: error.message || "Unable to check URL" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const daysRaw = Number.parseInt(req.query.days, 10);
    const days = Number.isFinite(daysRaw) ? Math.min(90, Math.max(1, daysRaw)) : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [totalChecks, successfulChecks, failedChecks, average, uptime, latestFailures, monitorCount] = await Promise.all([
      Check.countDocuments({}),
      Check.countDocuments({ status: "UP" }),
      Check.countDocuments({ status: "DOWN" }),
      Check.aggregate([{ $match: { responseTime: { $ne: null } } }, { $group: { _id: null, average: { $avg: "$responseTime" } } }]),
      Check.aggregate([{ $match: { createdAt: { $gte: since }, source: "scheduled" } }, { $group: { _id: null, total: { $sum: 1 }, successful: { $sum: { $cond: [{ $eq: ["$status", "UP"] }, 1, 0] } } } }]),
      Check.find({ status: "DOWN", createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(10).lean(),
      Monitor.countDocuments({ isActive: true })
    ]);
    const periodTotal = uptime.length ? uptime[0].total : 0;
    const periodSuccess = uptime.length ? uptime[0].successful : 0;
    res.json({ success: true, data: {
      totalChecks, successfulChecks, failedChecks,
      averageResponseTime: average.length ? Math.round(average[0].average) : null,
      uptimePercentage: periodTotal ? Math.round((periodSuccess / periodTotal) * 10000) / 100 : null,
      uptimePeriodDays: days, activeMonitors: monitorCount,
      recentFailures: latestFailures
    } });
  } catch {
    res.status(500).json({ message: "Unable to load dashboard statistics" });
  }
});

router.get("/", async (req, res) => {
  try {
    const requested = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requested) ? Math.min(200, Math.max(1, requested)) : 100;
    const filter = {};
    if (req.query.status && ["UP", "DOWN"].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.source && ["manual", "scheduled"].includes(req.query.source)) filter.source = req.query.source;
    if (req.query.url) filter.url = { $regex: String(req.query.url).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const checks = await Check.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, data: checks });
  } catch {
    res.status(500).json({ message: "Unable to load check history" });
  }
});

module.exports = router;
