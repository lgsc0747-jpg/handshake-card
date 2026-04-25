// Environment-aware Turnstile site key resolution.
// Dev (localhost) and preview (lovable.app) use Cloudflare's always-pass test key;
// production hosts use the real key. This prevents 110200 hostname errors during dev.

export const CF_TEST_SITE_KEY = "1x00000000000000000000AA";
export const PROD_SITE_KEY = "0x4AAAAAADCjpQiKqCjVRmYL";

export type TurnstileEnv = "dev" | "preview" | "prod";

export function detectEnvironment(hostname?: string): TurnstileEnv {
  const h = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase();
  if (!h || h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.")) return "dev";
  if (h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com")) return "preview";
  return "prod";
}

export function getTurnstileSiteKey(): string {
  const env = detectEnvironment();
  return env === "prod" ? PROD_SITE_KEY : CF_TEST_SITE_KEY;
}

export function currentHostname(): string {
  return typeof window !== "undefined" ? window.location.hostname : "";
}
