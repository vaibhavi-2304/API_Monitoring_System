async function sendFailureEmail(monitor, check) {
  // Email is optional. Configure SMTP_* variables to enable it; in-dashboard alerts work without SMTP.
  if (!process.env.SMTP_HOST || !process.env.ALERT_EMAIL_TO) return;
  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } : undefined
    });
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || process.env.ALERT_EMAIL_TO,
      to: process.env.ALERT_EMAIL_TO,
      subject: `[API Monitor] Failure detected: ${monitor.url}`,
      text: `A monitored endpoint failed.\nURL: ${monitor.url}\nStatus: ${check.status}\nHTTP status: ${check.statusCode ?? "No response"}\nResponse time: ${check.responseTime ?? "—"} ms\nReason: ${check.errorMessage || "Unknown error"}\nTime: ${check.createdAt?.toISOString() || new Date().toISOString()}`
    });
  } catch (error) {
    console.error("Failure email could not be sent:", error.message);
  }
}
module.exports = { sendFailureEmail };
