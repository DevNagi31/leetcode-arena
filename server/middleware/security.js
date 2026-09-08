const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Rate limiting keyed by account rather than by IP address.
 *
 * This app is aimed at university students, who overwhelmingly sit behind
 * campus NAT and therefore share a single public IP. A per-IP budget is
 * effectively a per-campus budget: loading the dashboard alone fires roughly
 * eight requests, so a handful of students on the same network would exhaust
 * an IP-wide allowance and lock out everyone else on it.
 *
 * Signed-in traffic is therefore counted per user. Anonymous traffic still
 * falls back to the IP, which is all we have to go on.
 */

/** Collapse an IPv6 address to its /64 prefix so a single client can't rotate
 *  through the addresses it has been delegated to multiply its allowance. */
const normalizeIp = (ip) => {
  if (!ip) return 'unknown';
  const addr = ip.replace(/^::ffff:/, '');       // IPv4-mapped IPv6
  if (!addr.includes(':')) return addr;          // plain IPv4
  return addr.split(':').slice(0, 4).join(':') + '::/64';
};

const ipKey = (req) => `ip:${normalizeIp(req.ip)}`;

/** Key by the authenticated user when the token checks out, else by IP. */
const userOrIpKey = (req) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token && process.env.JWT_SECRET) {
    try {
      // Verified, not merely decoded — otherwise anyone could mint a token
      // with an arbitrary userId and get a fresh bucket on demand.
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.userId) return `user:${decoded.userId}`;
    } catch {
      /* invalid or expired — fall through to the IP */
    }
  }
  return ipKey(req);
};

// General API limiter. Generous per user, because a single screen legitimately
// makes several calls and users click around quickly.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 300,
  keyGenerator: userOrIpKey,
  message: 'Too many requests, please try again in a few minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth limiter: protects individual accounts from password guessing.
 *
 * Keyed by the email being targeted rather than the source IP. At five
 * attempts per IP, the first few failed logins on a campus network locked out
 * every other student behind it — a self-inflicted denial of service on
 * exactly the audience this app is for. Per-account keying still stops
 * brute-forcing any one account, while the IP-wide ceiling above continues to
 * bound a distributed attempt.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 10,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : null;
    return email ? `auth:${email}` : ipKey(req);
  },
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

module.exports = {
  apiLimiter,
  authLimiter,
  // exported for tests
  userOrIpKey,
  normalizeIp,
};
