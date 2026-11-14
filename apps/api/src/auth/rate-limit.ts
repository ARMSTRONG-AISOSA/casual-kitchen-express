import type { BetterAuthRateLimitStorage } from "@better-auth/core";
import { DurableObject } from "cloudflare:workers";

/**
 * Sign-in rate limiting (architecture.md 12.2): one Durable Object per key (Better Auth's key is
 * the caller's IP address and the path). A Durable Object handles one request at a time, so the
 * check and the count happen in one step and simultaneous attempts can't slip past the limit.
 * Counts live in memory: if the object is evicted, the window simply starts again.
 */
export class AuthRateLimiter extends DurableObject {
  private count = 0;
  private windowStart = 0;

  consume(window: number, max: number): { allowed: boolean; retryAfter: number | null } {
    const now = Date.now();
    if (now - this.windowStart >= window * 1000) {
      this.windowStart = now;
      this.count = 0;
    }
    if (this.count >= max) {
      return {
        allowed: false,
        retryAfter: Math.ceil((this.windowStart + window * 1000 - now) / 1000),
      };
    }
    this.count += 1;
    return { allowed: true, retryAfter: null };
  }
}

export const rateLimitStorage = (env: Env): BetterAuthRateLimitStorage => ({
  consume: (key, rule) => env.AUTH_RATE_LIMITER.getByName(key).consume(rule.window, rule.max),
});
