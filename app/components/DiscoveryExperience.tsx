"use client";

import dynamic from "next/dynamic";

// Triassic shallow-sea scene (client only, no SSR). The GLB creatures are
// streamed from the guarded /api/models route, never from public/.
const TriassicScene = dynamic(() => import("./TriassicScene"), {
  ssr: false,
  loading: () => <div className="triassic-scene triassic-scene--loading" />,
});

const GUMROAD_URL = "https://chenyang84.gumroad.com/l/avfmpy";

/**
 * DiscoveryExperience — the Discovery canvas.
 *
 * The Triassic Sea scene fills the main column with a fixed, auto-playing
 * camera (no mouse control). A single cover card links through to the Gumroad
 * page, carried over from the former Cretaceous tab.
 */
export default function DiscoveryExperience() {
  return (
    <main className="abyss-main" aria-label="Deep time discovery canvas">
      <TriassicScene className="triassic-scene" />
      <a
        className="discovery-card"
        href={GUMROAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Explore the collection — open the Gumroad page in a new tab"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="discovery-card__cover"
          src="/discovery/card-cretaceous.webp"
          alt="Explore the collection cover"
          loading="eager"
          decoding="async"
        />
        <span className="discovery-card__explore">Explore</span>
      </a>
    </main>
  );
}
