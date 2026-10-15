const cron = require("node-cron");
const Monitor = require("../models/Monitor");
const Check = require("../models/Check");
const checkApi = require("./checkApi");
const { sendFailureEmail } = require("./notifications");

let isRunning = false;

function startMonitorScheduler() {
  cron.schedule("* * * * *", async () => {
    if (isRunning) return console.warn("Previous monitoring cycle is still running; skipping this tick.");
    isRunning = true;
    try {
      const dueMonitors = await Monitor.find({ isActive: true, $or: [{ nextRunAt: null }, { nextRunAt: { $lte: new Date() } }] }).sort({ createdAt: 1 });
      for (const monitor of dueMonitors) {
        const previousNextRunAt = monitor.nextRunAt;
        const nextRunAt = new Date(Date.now() + monitor.intervalMinutes * 60 * 1000);
        const reservation = await Monitor.updateOne(
          { _id: monitor._id, isActive: true, nextRunAt: previousNextRunAt },
          { $set: { nextRunAt, lastCheckedAt: new Date() } }
        );
        if (reservation.modifiedCount !== 1) continue;

        let check;
        try {
          check = await checkApi(monitor.url, "scheduled", {
            monitorId: monitor._id,
            expectedStatusCode: monitor.expectedStatusCode,
            responseTimeThresholdMs: monitor.responseTimeThresholdMs
          });
        } catch (error) {
          check = await Check.create({ monitorId: monitor._id, url: monitor.url, status: "DOWN", source: "scheduled", errorMessage: (error.message || "Monitoring error").slice(0, 500), alertMessage: (error.message || "Monitoring error").slice(0, 500) });
        }

        const updated = await Monitor.findById(monitor._id);
        if (!updated) continue;
        if (check.status === "DOWN") {
          updated.consecutiveFailures = (updated.consecutiveFailures || 0) + 1;
          // Send at the second consecutive failure and then no more than once per 30 minutes.
          const shouldAlert = updated.consecutiveFailures >= 2 && (!updated.lastAlertAt || Date.now() - updated.lastAlertAt.getTime() >= 30 * 60 * 1000);
          if (shouldAlert) {
            updated.lastAlertAt = new Date();
            await sendFailureEmail(updated, check);
          }
        } else {
          updated.consecutiveFailures = 0;
        }
        await updated.save();
        console.log(`[monitor] ${check.status} ${monitor.url} (${check.responseTime ?? "—"} ms)`);
      }
    } catch (error) {
      console.error("Scheduler cycle failed:", error.message);
    } finally {
      isRunning = false;
    }
  });
  console.log("Automatic monitor scheduler registered (checks due monitors every minute).");
}
module.exports = startMonitorScheduler;
