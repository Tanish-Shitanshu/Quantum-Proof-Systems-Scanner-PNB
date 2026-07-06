/**
 * Central frontend configuration.
 *
 * All environment variables are validated here at module load time so the
 * app fails fast with a clear message instead of silently making requests
 * to the wrong URL.
 */

function requireEnv(key: string, fallback: string): string {
  const value = (import.meta.env as Record<string, string>)[key];
  if (!value) {
    console.warn(
      `[config] ${key} is not set in .env — falling back to "${fallback}". ` +
        `Copy .env.example to .env and set the correct value for production.`
    );
    return fallback;
  }
  return value;
}

export const API_BASE_URL: string = requireEnv(
  "VITE_API_URL",
  "http://localhost:8000"
);

/** Convenience helper — avoids repeating the base URL in every component. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
