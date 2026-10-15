const Check = require("../models/Check");
const { validatePublicHttpUrl } = require("./urlSafety");

async function checkApi(rawUrl, source = "manual", options = {}) {
  const url = await validatePublicHttpUrl(rawUrl);
  const start = Date.now();
  const timeoutMs = Math.max(1000, Number(process.env.REQUEST_TIMEOUT_MS) || 10000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "API-Monitoring-Dashboard/2.0" }
    });
    const responseText = await response.text();
    const responseTime = Date.now() - start;
    const expectedStatusCode = options.expectedStatusCode == null ? null : Number(options.expectedStatusCode);
    const threshold = Number(options.responseTimeThresholdMs || 0);
    const problems = [];
    const statusMatches = expectedStatusCode == null ? (response.status >= 200 && response.status < 300) : response.status === expectedStatusCode;
    if (!statusMatches) problems.push(expectedStatusCode == null ? `Endpoint returned HTTP ${response.status}` : `Expected HTTP ${expectedStatusCode}, received ${response.status}`);
    if (threshold > 0 && responseTime > threshold) problems.push(`Response time ${responseTime} ms exceeded threshold ${threshold} ms`);

    let responseValidation = null;
    if (options.validateJson) {
      try {
        JSON.parse(responseText);
      } catch {
        problems.push("Response body is not valid JSON");
        responseValidation = "invalid-json";
      }
      if (responseValidation !== "invalid-json") responseValidation = "valid-json";
    }

    return await Check.create({
      monitorId: options.monitorId || null,
      url,
      statusCode: response.status,
      responseTime,
      status: problems.length ? "DOWN" : "UP",
      source,
      errorMessage: problems.length ? problems.join("; ") : null,
      alertMessage: problems.length ? problems.join("; ") : null,
      responseValidation
    });
  } catch (error) {
    const responseTime = Date.now() - start;
    const message = error.name === "TimeoutError" || error.name === "AbortError"
      ? `Request timed out after ${timeoutMs} ms`
      : (error.message || "Network request failed").slice(0, 500);
    return await Check.create({
      monitorId: options.monitorId || null,
      url,
      statusCode: null,
      responseTime,
      status: "DOWN",
      source,
      errorMessage: message,
      alertMessage: message
    });
  }
}

module.exports = checkApi;
