"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// Triassic shallow-sea scene (client only, no SSR). The GLB creatures are
// streamed from the guarded /api/models route, never from public/.
const TriassicScene = dynamic(() => import("./TriassicScene"), {
  ssr: false,
  loading: () => <div className="triassic-scene triassic-scene--loading" />,
});

const GUMROAD_URL = "https://chenyang84.gumroad.com/l/zcwtre";

/**
 * DiscoveryExperience — the Discovery canvas.
 *
 * The Triassic Sea scene fills the main column with a fixed, auto-playing
 * camera (no mouse control). A title block links into the Triassic Marine
 * archive, and a cover card links through to the Gumroad page.
 */
export default function DiscoveryExperience() {
  return (
    <main className="abyss-main" aria-label="Deep time discovery canvas">
      <TriassicScene className="triassic-scene" />

      <div className="discovery-copy">
        <h1 className="discovery-copy__title">Triassic Marine</h1>
        <p className="discovery-copy__lede">
          <Link href="/archive/triassic-marine" className="discovery-copy__link">
            Explore
          </Link>{" "}
          a sunlit Triassic sea — nothosaurs, ichthyosaurs and their lost world,
          brought back to life in true scale.
        </p>
      </div>

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
