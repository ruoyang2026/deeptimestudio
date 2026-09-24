import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

// Streams the Triassic GLB models from assets/triassic/ (deliberately OUTSIDE
// public/ so they are never served as static files). Only whitelisted names are
// reachable, only from same-origin pages, and never cached by shared caches.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_DIR = path.join(process.cwd(), "assets", "triassic");
const ALLOWED = new Set([
  "Nothosaurus_Sp.glb",
  "diver.glb",
  "Mixosaurus1.glb",
  "Mixosaurus2.glb",
  "Sinosaurosphargis.glb",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } },
) {
  const name = params.name;
  if (!ALLOWED.has(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Same-origin guard: block direct navigation, hotlinking and third parties.
  // Browsers send Sec-Fetch-Site on every subresource request; the page's own
  // fetch/XHR reports "same-origin". A pasted URL reports "none".
  const origin = request.nextUrl.origin;
  const referer = request.headers.get("referer") ?? "";
  const secFetchSite = request.headers.get("sec-fetch-site");
  const sameOrigin =
    secFetchSite === "same-origin" ||
    (referer !== "" && referer.startsWith(origin));
  if (!sameOrigin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const file = path.join(MODEL_DIR, name);
  try {
    const info = await stat(file);
    const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Length": String(info.size),
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
