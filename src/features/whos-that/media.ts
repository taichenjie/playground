/*
 * Where Who's That? photos are served from.
 *
 * Locally the photos sit in public/faces and NEXT_PUBLIC_FACES_BASE_URL is
 * unset. Once they live in Cloudflare R2, set it to the bucket's public URL
 * (e.g. https://faces.example.com) and nothing else changes.
 */

const BASE = (process.env.NEXT_PUBLIC_FACES_BASE_URL ?? "").replace(/\/+$/, "");

/** Full URL for a photo key such as "faces/4494d37b3d06-1c7422b4.webp". */
export const faceUrl = (key: string) => `${BASE}/${key.replace(/^\/+/, "")}`;
