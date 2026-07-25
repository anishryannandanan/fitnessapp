// Base URL of the backend API. When empty, the app runs in demo/mock mode.
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** True when a real backend is configured (enables real auth + data). */
export const HAS_API = API_URL.length > 0;
