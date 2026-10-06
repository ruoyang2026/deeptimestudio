"use client";

import { useState } from "react";

// Static hosting for the sea demo build (pack_demo.py output). Override with
// NEXT_PUBLIC_DEMO_URL when the bucket/subdomain is ready. English forced.
// Note: R2 custom domains serve exact keys only (no index documents),
// so the iframe must request /index.html explicitly.
// NEXT_PUBLIC_DEMO_URL when the bucket/subdomain is ready. English forced.
const DEMO_BASE =
  process.env.NEXT_PUBLIC_DEMO_URL ?? "https://demo.deep-time-studio.com";
const DEMO_URL = `${DEMO_BASE.replace(/\/$/, "")}/index.html`;

export default function DemoFrame() {
  const [ready, setReady] = useState(false);
  return (
    <main className="demo-main" aria-label="Interactive Triassic sea demo">
      {!ready ? (
        <p className="demo-loading">Diving into the Triassic ocean…</p>
      ) : null}
      <iframe
        className="demo-frame"
        src={`${DEMO_URL}?lang=en`}
        title="Interactive Triassic sea demo"
        allow="fullscreen"
        onLoad={() => setReady(true)}
      />
    </main>
  );
}
