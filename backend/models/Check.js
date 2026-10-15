const mongoose = require("mongoose");

const checkSchema = new mongoose.Schema(
  {
    monitorId: { type: mongoose.Schema.Types.ObjectId, ref: "Monitor", default: null, index: true },
    url: { type: String, required: true, index: true },
    statusCode: { type: Number, default: null },
    responseTime: { type: Number, default: null },
    status: { type: String, enum: ["UP", "DOWN"], required: true },
    source: { type: String, enum: ["manual", "scheduled"], default: "manual" },
    errorMessage: { type: String, default: null },
    alertMessage: { type: String, default: null },
    responseValidation: { type: String, enum: ["valid-json", "invalid-json", null], default: null }
  },
  { timestamps: true }
);

checkSchema.index({ createdAt: -1 });
checkSchema.index({ url: 1, createdAt: -1 });
module.exports = mongoose.model("Check", checkSchema);
