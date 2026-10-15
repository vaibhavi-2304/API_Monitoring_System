const mongoose = require("mongoose");

const monitorSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    intervalMinutes: { type: Number, min: 1, max: 1440, default: 1 },
    isActive: { type: Boolean, default: true },
    expectedStatusCode: { type: Number, min: 100, max: 599, default: 200 },
    responseTimeThresholdMs: { type: Number, min: 0, max: 600000, default: 0 },
    consecutiveFailures: { type: Number, min: 0, default: 0 },
    lastAlertAt: { type: Date, default: null },
    lastCheckedAt: { type: Date, default: null },
    nextRunAt: { type: Date, default: null }
  },
  { timestamps: true }
);

monitorSchema.index({ isActive: 1, nextRunAt: 1 });
module.exports = mongoose.model("Monitor", monitorSchema);
