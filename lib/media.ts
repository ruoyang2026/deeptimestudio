/**
 * Media base URL for large static assets (hero video, poster, sample PDF).
 *
 * Default: served from Next `public/` (counts toward Vercel Deployment Storage).
 * Set NEXT_PUBLIC_MEDIA_URL (e.g. an R2 / Blob public URL, no trailing slash)
 * to move them out of the deployment with zero code changes.
 */
export const MEDIA_BASE =
  process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/$/, "") ?? "";

export function media(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${MEDIA_BASE}${p}`;
}
