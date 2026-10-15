const express = require("express");
const mongoose = require("mongoose");
const Monitor = require("../models/Monitor");
const Check = require("../models/Check");
const { validatePublicHttpUrl } = require("../services/urlSafety");

const router = express.Router();

function parseMonitorSettings(body, defaults = {}) {
  const intervalMinutes = Number(body.intervalMinutes ?? defaults.intervalMinutes ?? 1);
  const expectedStatusCode = Number(body.expectedStatusCode ?? defaults.expectedStatusCode ?? 200);
  const responseTimeThresholdMs = Number(body.responseTimeThresholdMs ?? defaults.responseTimeThresholdMs ?? 0);
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 1440) throw new Error("Interval must be a whole number from 1 to 1440 minutes.");
  if (!Number.isInteger(expectedStatusCode) || expectedStatusCode < 100 || expectedStatusCode > 599) throw new Error("Expected HTTP status must be a whole number from 100 to 599.");
  if (!Number.isFinite(responseTimeThresholdMs) || responseTimeThresholdMs < 0 || responseTimeThresholdMs > 600000) throw new Error("Response-time threshold must be between 0 and 600000 ms. Use 0 to disable it.");
  return { intervalMinutes, expectedStatusCode, responseTimeThresholdMs };
}

router.get("/", async (_req, res) => {
  try {
    const monitors = await Monitor.find().sort({ createdAt: -1 }).lean();
    const urls = monitors.map((m) => m.url);
    const latest = urls.length ? await Check.aggregate([
      { $match: { url: { $in: urls }, source: "scheduled" } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$url", status: { $first: "$status" }, responseTime: { $first: "$responseTime" }, createdAt: { $first: "$createdAt" } } }
    ]) : [];
    const byUrl = new Map(latest.map((item) => [item._id, item]));
    res.json({ success: true, data: monitors.map((m) => ({ ...m, latestCheck: byUrl.get(m.url) || null })) });
  } catch {
    res.status(500).json({ message: "Unable to load monitors" });
  }
});

router.post("/", async (req, res) => {
  try {
    const url = await validatePublicHttpUrl(req.body?.url);
    const settings = parseMonitorSettings(req.body || {});
    const existing = await Monitor.findOne({ url });
    if (existing) return res.status(409).json({ message: "This URL is already registered as a monitor." });
    const monitor = await Monitor.create({ url, ...settings, isActive: true, nextRunAt: new Date() });
    res.status(201).json({ success: true, data: monitor });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to register monitor" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid monitor ID." });
    const monitor = await Monitor.findById(req.params.id);
    if (!monitor) return res.status(404).json({ message: "Monitor not found." });
    const updates = {};
    if (req.body?.url !== undefined) {
      const url = await validatePublicHttpUrl(req.body.url);
      const duplicate = await Monitor.findOne({ url, _id: { $ne: monitor._id } });
      if (duplicate) return res.status(409).json({ message: "Another monitor already uses this URL." });
      updates.url = url;
      updates.nextRunAt = new Date();
    }
    if (typeof req.body?.isActive === "boolean") updates.isActive = req.body.isActive;
    if (["intervalMinutes", "expectedStatusCode", "responseTimeThresholdMs"].some((key) => req.body?.[key] !== undefined)) {
      Object.assign(updates, parseMonitorSettings(req.body, monitor.toObject()));
      updates.nextRunAt = new Date();
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide a monitor setting to update." });
    Object.assign(monitor, updates);
    await monitor.save();
    res.json({ success: true, data: monitor });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to update monitor" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid monitor ID." });
    const monitor = await Monitor.findByIdAndDelete(req.params.id);
    if (!monitor) return res.status(404).json({ message: "Monitor not found." });
    res.json({ success: true, message: "Monitor deleted. Existing history was retained." });
  } catch {
    res.status(500).json({ message: "Unable to delete monitor" });
  }
});

router.get("/:id/history.csv", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).send("Invalid monitor ID");
    const monitor = await Monitor.findById(req.params.id).lean();
    if (!monitor) return res.status(404).send("Monitor not found");
    const checks = await Check.find({ url: monitor.url }).sort({ createdAt: -1 }).limit(10000).lean();
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [["timestamp", "url", "status", "http_status", "response_time_ms", "source", "error"], ...checks.map(c => [c.createdAt?.toISOString(), c.url, c.status, c.statusCode, c.responseTime, c.source, c.errorMessage])];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="monitor-history-${req.params.id}.csv"`);
    res.send(rows.map(row => row.map(escape).join(",")).join("\r\n"));
  } catch {
    res.status(500).send("Unable to export history");
  }
});

module.exports = router;
