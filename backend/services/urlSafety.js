const dns = require("dns").promises;
const net = require("net");

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase().split("%")[0];
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    if (net.isIP(mapped) === 4) return isPrivateIPv4(mapped);
    return true;
  }
  return false;
}

function isPrivateAddress(address) {
  const version = net.isIP(address);
  if (version === 4) return isPrivateIPv4(address);
  if (version === 6) return isPrivateIPv6(address);
  return true;
}

async function validatePublicHttpUrl(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.length > 2048) {
    throw new Error("Please provide a valid URL (maximum 2048 characters).");
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL. Include http:// or https://.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URLs containing embedded credentials are not allowed.");
  }
  if (!parsed.hostname) throw new Error("URL hostname is required.");

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Local and private network destinations are not allowed.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Local and private network destinations are not allowed.");
    return parsed.href;
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("The hostname could not be resolved.");
  }

  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("The hostname resolves to a local or private network address and is not allowed.");
  }

  return parsed.href;
}

module.exports = { validatePublicHttpUrl };
